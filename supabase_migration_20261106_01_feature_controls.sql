-- ==============================================================================
-- HACKARENA PRODUCTION MIGRATION — PRE-HACKATHON FEATURE CONTROLS (v7 FINAL)
-- Filename: supabase_migration_20261106_01_feature_controls.sql
-- Target Project: hackarena (cehtoekiyzjrwcgurupo)
-- Engine: PostgreSQL 17.11 (ap-south-1)
--
-- Safety & Architectural Guarantees:
-- 1. Strictly Additive DDL. No DROP TABLE or destructive operations.
-- 2. Column additions with DEFAULT values assign defaults to existing rows:
--    - public.settings: feature_config_initialized = false (Legacy Mode active).
--    - public.teams: event_id = 1, isolating historical records from future events.
-- 3. checkpoint_logs uses ON DELETE SET NULL (never CASCADE) + immutable team_name
--    to preserve checkpoint audit history permanently if a team is deleted.
-- 4. teams.id verified as UUID; team_id foreign key matches UUID type exactly.
-- 5. process_team_checkpoint PostgreSQL RPC guarantees single-transaction atomicity:
--    - Acquires row-level exclusive locks: SELECT ... FOR UPDATE on settings and team.
--    - Serializes concurrent event resets and checkpoint evaluations.
--    - Validates sequential checkpoint progression (must be next expected checkpoint).
--    - Enforces strike policy in database: 1st missed = warning (0 strikes);
--      subsequent missed = strike only when feature_strikes_enabled is true.
--    - Uses INSERT ... ON CONFLICT DO NOTHING RETURNING id for race-free deduplication.
--    - Protects teams.status: keeps checkpoint_status separate; never overwrites 'disqualified'.
--    - Hardened SECURITY DEFINER with fixed search_path = public, pg_temp.
--    - Executable strictly by service_role; all permissions revoked from public, anon, authenticated.
-- 6. teams_public view isolates events via WHERE t.event_id = s.event_id with
--    database-level CASE masking and zero changes to existing security policies.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. SETTINGS TABLE: Add Feature Control & Multi-Event Columns
-- ------------------------------------------------------------------------------
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS feature_config_initialized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feature_checkpoints_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_strikes_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_scoring_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS commit_interval_hours integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS configuration_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_id integer NOT NULL DEFAULT 1;

-- Add validation constraint for commit interval (3, 4, 6, 8, or 12 hours)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_commit_interval_hours'
  ) THEN
    ALTER TABLE public.settings
      ADD CONSTRAINT check_commit_interval_hours
      CHECK (commit_interval_hours IN (3, 4, 6, 8, 12));
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TEAMS TABLE: Add Event Isolation & Checkpoint Tracking Columns
-- ------------------------------------------------------------------------------
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS event_id integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_processed_checkpoint integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkpoint_status text NOT NULL DEFAULT 'on_track',
  ADD COLUMN IF NOT EXISTS checkpoints_missed integer NOT NULL DEFAULT 0;

-- ------------------------------------------------------------------------------
-- 3. CHECKPOINT LOGS TABLE: Audit History with Safe Foreign Key Strategy
-- ------------------------------------------------------------------------------
-- ON DELETE SET NULL preserves audit rows even if a team record is deleted.
-- team_name is captured redundantly so team identity is never lost.
CREATE TABLE IF NOT EXISTS public.checkpoint_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  team_name text NOT NULL DEFAULT 'Unknown Team',
  event_id integer NOT NULL DEFAULT 1,
  checkpoint_number integer NOT NULL,
  status text NOT NULL, -- 'on_track' | 'warning' | 'missed'
  strike_issued boolean NOT NULL DEFAULT false,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_team_checkpoint UNIQUE (team_id, event_id, checkpoint_number)
);

ALTER TABLE public.checkpoint_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.checkpoint_logs FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.checkpoint_logs TO service_role;
ALTER TABLE public.checkpoint_logs OWNER TO postgres;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC CHECKPOINT RPC: Single-Transaction Evaluation & Strike Execution
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_team_checkpoint(
  p_team_id uuid,
  p_event_id integer,
  p_checkpoint_number integer,
  p_checkpoint_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.settings%ROWTYPE;
  v_team public.teams%ROWTYPE;
  v_expected_checkpoint integer;
  v_final_cp_status text;
  v_strike_to_apply integer;
  v_inserted_log_id uuid;
  v_updated_team public.teams%ROWTYPE;
BEGIN
  -- 1. Input Validation
  IF p_team_id IS NULL THEN
    RAISE EXCEPTION 'p_team_id cannot be null';
  END IF;

  IF p_checkpoint_number IS NULL OR p_checkpoint_number < 1 THEN
    RAISE EXCEPTION 'Invalid checkpoint_number: %', p_checkpoint_number;
  END IF;

  IF p_checkpoint_status NOT IN ('on_track', 'missed', 'warning') THEN
    RAISE EXCEPTION 'Invalid checkpoint_status: %; must be on_track or missed', p_checkpoint_status;
  END IF;

  -- 2. Fetch & Lock Active Settings (FOR UPDATE prevents concurrent event reset race condition)
  SELECT * INTO v_settings 
  FROM public.settings 
  WHERE id = 1 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settings row not found in public.settings';
  END IF;

  IF NOT v_settings.feature_config_initialized THEN
    RAISE EXCEPTION 'Event configuration is not initialized for active event %', v_settings.event_id;
  END IF;

  IF NOT v_settings.feature_checkpoints_enabled THEN
    RAISE EXCEPTION 'Commit checkpoints are disabled for event %', v_settings.event_id;
  END IF;

  IF v_settings.cron_frozen THEN
    RAISE EXCEPTION 'Cron tracking is frozen; checkpoint processing is not permitted';
  END IF;

  IF v_settings.timer_status != 'running' THEN
    RAISE EXCEPTION 'Checkpoint processing not permitted when timer status is % (must be running)', v_settings.timer_status;
  END IF;

  IF p_event_id != v_settings.event_id THEN
    RAISE EXCEPTION 'Provided event_id % does not match active event %', p_event_id, v_settings.event_id;
  END IF;

  -- 3. Fetch & Lock Team (FOR UPDATE serializes checkpoint evaluation for this team)
  SELECT * INTO v_team 
  FROM public.teams 
  WHERE id = p_team_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team with id % not found in public.teams', p_team_id;
  END IF;

  IF v_team.event_id != v_settings.event_id THEN
    RAISE EXCEPTION 'Team belongs to event %, but active event is %', v_team.event_id, v_settings.event_id;
  END IF;

  -- 4. Validate Sequential Checkpoint Progression
  v_expected_checkpoint := v_team.last_processed_checkpoint + 1;
  IF p_checkpoint_number != v_expected_checkpoint THEN
    IF p_checkpoint_number <= v_team.last_processed_checkpoint THEN
      -- Already processed in a prior transaction
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'message', 'Checkpoint already evaluated for this team.'
      );
    ELSE
      RAISE EXCEPTION 'Invalid checkpoint progression. Expected checkpoint %, but received %', v_expected_checkpoint, p_checkpoint_number;
    END IF;
  END IF;

  -- 5. Enforce Strike Policy inside Database
  IF p_checkpoint_status = 'on_track' THEN
    v_final_cp_status := 'on_track';
    v_strike_to_apply := 0;
  ELSE
    -- Missed checkpoint evaluation
    IF v_team.checkpoints_missed = 0 THEN
      -- First missed checkpoint: Warning only, ZERO strikes
      v_final_cp_status := 'warning';
      v_strike_to_apply := 0;
    ELSE
      -- Subsequent missed checkpoint: Strike only if strike system is enabled
      v_final_cp_status := 'missed';
      IF v_settings.feature_strikes_enabled THEN
        v_strike_to_apply := 1;
      ELSE
        v_strike_to_apply := 0;
      END IF;
    END IF;
  END IF;

  -- 6. Atomic Deduplication via INSERT ... ON CONFLICT DO NOTHING RETURNING id
  INSERT INTO public.checkpoint_logs (
    team_id,
    team_name,
    event_id,
    checkpoint_number,
    status,
    strike_issued,
    evaluated_at
  ) VALUES (
    v_team.id,
    v_team.team_name,
    v_settings.event_id,
    p_checkpoint_number,
    v_final_cp_status,
    (v_strike_to_apply > 0),
    now()
  )
  ON CONFLICT (team_id, event_id, checkpoint_number) DO NOTHING
  RETURNING id INTO v_inserted_log_id;

  -- If no row was returned, the checkpoint was already recorded concurrently
  IF v_inserted_log_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'message', 'Checkpoint already evaluated for this team.'
    );
  END IF;

  -- 7. Atomically Update Team Checkpoint Tracking and Strikes
  -- CRITICAL RULE: Preserve existing team status! Keep checkpoint_status separate.
  -- Never overwrite 'disqualified'. Only set 'inactive' if strikes >= 3.
  UPDATE public.teams
  SET
    last_processed_checkpoint = p_checkpoint_number,
    checkpoint_status = v_final_cp_status,
    checkpoints_missed = CASE 
      WHEN v_final_cp_status = 'on_track' THEN checkpoints_missed 
      ELSE checkpoints_missed + 1 
    END,
    strike_count = strike_count + v_strike_to_apply,
    status = CASE
      WHEN status = 'disqualified' THEN 'disqualified'
      WHEN v_settings.feature_strikes_enabled AND (strike_count + v_strike_to_apply) >= 3 THEN 'inactive'
      ELSE status
    END,
    updated_at = now()
  WHERE id = v_team.id
  RETURNING * INTO v_updated_team;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'checkpoint_number', p_checkpoint_number,
    'new_strike_count', v_updated_team.strike_count,
    'new_status', v_updated_team.status,
    'checkpoint_status', v_updated_team.checkpoint_status,
    'checkpoints_missed', v_updated_team.checkpoints_missed
  );
END;
$$;

-- Grant execution strictly to service_role and set postgres owner
REVOKE ALL ON FUNCTION public.process_team_checkpoint FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_team_checkpoint TO service_role;
ALTER FUNCTION public.process_team_checkpoint OWNER TO postgres;

-- ------------------------------------------------------------------------------
-- 5. PUBLIC VIEW: Event Isolation & Security Masking
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.teams_public
WITH (security_invoker = false) AS
SELECT
  t.id,
  t.team_name,
  t.repo_url,
  t.deployment_url,
  t.last_push,
  t.status,
  CASE 
    WHEN s.feature_strikes_enabled = false THEN NULL 
    ELSE t.strike_count 
  END AS strike_count,
  t.category,
  t.problem_statement,
  t.deployment_status,
  t.response_time,
  CASE 
    WHEN s.feature_scoring_enabled = false THEN NULL 
    ELSE t.score 
  END AS score,
  t.created_at
FROM public.teams t
CROSS JOIN (
  SELECT event_id, feature_strikes_enabled, feature_scoring_enabled 
  FROM public.settings 
  WHERE id = 1
) s
WHERE t.event_id = s.event_id;

-- ------------------------------------------------------------------------------
-- 6. PERMISSIONS & OWNERSHIP: Preserve Phase 2 Security Hardening
-- ------------------------------------------------------------------------------
ALTER VIEW public.teams_public OWNER TO postgres;
REVOKE ALL PRIVILEGES ON TABLE public.teams_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.teams_public TO anon, authenticated;

COMMIT;
