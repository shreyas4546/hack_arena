-- ==============================================================================
-- HACKARENA PRODUCTION SECURITY MIGRATION - PHASE 1
-- Phase 1: Additive Restricted Public View
-- Filename: supabase_migration_20261104_01_create_teams_public_view.sql
-- Target Project: hackarena (cehtoekiyzjrwcgurupo)
-- Engine: PostgreSQL 17.11 (ap-south-1)
--
-- Objective:
-- Expose strictly approved public leaderboard columns through a dedicated view
-- without altering base-table permissions or breaking existing application traffic.
--
-- Security Properties:
-- 1. Standard Owner Privilege View: Configured with security_invoker = false.
--    This ensures that when base-table access is subsequently locked down in
--    Phase 2, anonymous callers can still read public leaderboard data via the
--    view without requiring direct SELECT permissions on private base-table columns.
-- 2. Physical Column Omission: auth_user_id, team_leader_name, participant_names,
--    judge_score, github_usernames, and updated_at are completely omitted.
-- 3. Strict Privilege Allowlisting: In PostgreSQL 17, default table privileges include
--    MAINTAIN in addition to standard DML. All privileges are revoked from PUBLIC,
--    anon, and authenticated first, and then strictly SELECT is granted.
--
-- Recovery Guidance (Pre-Phase 2 only):
-- If the application deployment fails BEFORE Phase 2 is applied, the application
-- may be rolled back to the previous code version, and this view may be removed:
--   DROP VIEW IF EXISTS public.teams_public;
-- Note: Do NOT drop this view while the updated application code is deployed.
-- ==============================================================================

BEGIN;

-- Pre-flight validation: Ensure base table, owner, and required columns exist
DO $$
DECLARE
  v_table_owner text;
  v_required_col_count integer;
BEGIN
  -- 1. Check table existence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'teams'
  ) THEN
    RAISE EXCEPTION 'Pre-flight Check Failed: Base table public.teams does not exist.';
  END IF;

  -- 2. Check table owner is postgres
  SELECT pg_get_userbyid(relowner) INTO v_table_owner
  FROM pg_class
  WHERE relname = 'teams' AND relnamespace = 'public'::regnamespace;

  IF v_table_owner <> 'postgres' THEN
    RAISE EXCEPTION 'Pre-flight Check Failed: Table public.teams owner is %, expected postgres.', v_table_owner;
  END IF;

  -- 3. Check all 13 required public columns exist on base table
  SELECT count(*) INTO v_required_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'teams'
    AND column_name IN (
      'id', 'team_name', 'repo_url', 'deployment_url', 'last_push',
      'status', 'strike_count', 'category', 'problem_statement',
      'deployment_status', 'response_time', 'score', 'created_at'
    );

  IF v_required_col_count <> 13 THEN
    RAISE EXCEPTION 'Pre-flight Check Failed: Base table public.teams is missing one or more required public columns (found % of 13).', v_required_col_count;
  END IF;

  -- 4. Verify target API roles exist
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') OR
     NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE EXCEPTION 'Pre-flight Check Failed: Roles anon and/or authenticated do not exist.';
  END IF;
END $$;

-- 1. Create or replace the restricted public view (strictly 13 columns)
CREATE OR REPLACE VIEW public.teams_public
WITH (security_invoker = false) AS
SELECT
  id,
  team_name,
  repo_url,
  deployment_url,
  last_push,
  status,
  strike_count,
  category,
  problem_statement,
  deployment_status,
  response_time,
  score,
  created_at
FROM public.teams;

-- 2. Ensure view ownership belongs to postgres
ALTER VIEW public.teams_public OWNER TO postgres;

-- 3. Strip all privileges on the view from public roles (including MAINTAIN in PostgreSQL 17)
REVOKE ALL PRIVILEGES
ON TABLE public.teams_public
FROM PUBLIC, anon, authenticated;

-- 4. Grant strictly SELECT privileges on the view to public API roles
GRANT SELECT
ON TABLE public.teams_public
TO anon, authenticated;

COMMIT;
