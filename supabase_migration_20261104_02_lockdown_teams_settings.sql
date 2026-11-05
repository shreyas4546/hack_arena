-- ==============================================================================
-- HACKARENA PRODUCTION SECURITY MIGRATION - PHASE 2
-- Phase 2: Base Table Access Lockdown, Settings Hardening & Default Privileges
-- Filename: supabase_migration_20261104_02_lockdown_teams_settings.sql
-- Target Project: hackarena (cehtoekiyzjrwcgurupo)
-- Engine: PostgreSQL 17.11 (ap-south-1)
--
-- CAUTION: Apply this migration ONLY AFTER:
-- 1. Phase 1 migration has been executed in the database.
-- 2. Compatible application code (fix/security-hardening) has been deployed and verified.
--
-- Objective:
-- 1. Remove permissive anonymous SELECT, INSERT, and UPDATE policies on public.teams.
-- 2. Implement ownership-scoped RLS SELECT on public.teams (auth.uid() = auth_user_id).
-- 3. Revoke all direct base-table DML, TRUNCATE, and administrative privileges from anon and authenticated.
-- 4. Remove permissive anonymous UPDATE policy on public.settings.
-- 5. Revoke DML & TRUNCATE privileges on public.settings from anon and authenticated.
-- 6. Harden default privileges in public schema for future tables/views.
-- 7. Preserve required read operations for live leaderboard, countdown timer, and
--    participant self-inspection.
-- 8. Preserve full administrative access for service_role and postgres.
--
-- Security Recovery Guidance (In case of application issues):
-- DO NOT re-create permissive anonymous UPDATE/INSERT policies or restore broad table grants.
-- If an issue occurs:
-- 1. Diagnose and fix the application route (ensure server routes use service-role access).
-- 2. Keep base-table privacy protections and teams_public view active.
-- 3. Never restore anonymous write access or public exposure of auth_user_id and participant PII.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- PRE-FLIGHT ASSERTIONS (Fail-Closed)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_col_count integer;
  v_sensitive_col_count integer;
  v_teams_policy_count integer;
  v_settings_policy_count integer;
  v_table_owner text;
BEGIN
  -- 1. Verify existence of required tables and views
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
    RAISE EXCEPTION 'Pre-flight Failed: Table public.teams does not exist.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') THEN
    RAISE EXCEPTION 'Pre-flight Failed: Table public.settings does not exist.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'teams_public') THEN
    RAISE EXCEPTION 'Pre-flight Failed: View public.teams_public does not exist. Apply Phase 1 migration first.';
  END IF;

  -- 2. Verify table & view owners are postgres
  SELECT pg_get_userbyid(relowner) INTO v_table_owner FROM pg_class WHERE relname = 'teams' AND relnamespace = 'public'::regnamespace;
  IF v_table_owner <> 'postgres' THEN
    RAISE EXCEPTION 'Pre-flight Failed: Table public.teams owner is %, expected postgres.', v_table_owner;
  END IF;

  SELECT pg_get_userbyid(relowner) INTO v_table_owner FROM pg_class WHERE relname = 'settings' AND relnamespace = 'public'::regnamespace;
  IF v_table_owner <> 'postgres' THEN
    RAISE EXCEPTION 'Pre-flight Failed: Table public.settings owner is %, expected postgres.', v_table_owner;
  END IF;

  SELECT viewowner INTO v_table_owner FROM pg_views WHERE schemaname = 'public' AND viewname = 'teams_public';
  IF v_table_owner <> 'postgres' THEN
    RAISE EXCEPTION 'Pre-flight Failed: View public.teams_public owner is %, expected postgres.', v_table_owner;
  END IF;

  -- 3. Verify teams_public has exactly the 13 approved public columns
  SELECT count(*) INTO v_col_count FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teams_public';
  IF v_col_count <> 13 THEN
    RAISE EXCEPTION 'Pre-flight Failed: View public.teams_public has % columns, expected exactly 13.', v_col_count;
  END IF;

  -- 4. Verify no sensitive columns exist in teams_public
  SELECT count(*) INTO v_sensitive_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'teams_public'
    AND column_name IN ('auth_user_id', 'team_leader_name', 'participant_names', 'judge_score', 'github_usernames', 'updated_at');
  IF v_sensitive_col_count > 0 THEN
    RAISE EXCEPTION 'Pre-flight Failed: View public.teams_public contains sensitive columns! Aborting.';
  END IF;

  -- 5. Exact assertion of expected policies on public.teams
  -- 5.1 Assert "Allow public read access on teams"
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teams'
      AND policyname = 'Allow public read access on teams'
      AND cmd = 'SELECT'
      AND permissive = 'PERMISSIVE'
      AND roles = '{public}'::name[]
      AND qual = 'true'
      AND with_check IS NULL
  ) THEN
    RAISE EXCEPTION 'Pre-flight Failed: Policy "Allow public read access on teams" on public.teams does not match expected definition.';
  END IF;

  -- 5.2 Assert "Allow anon update on teams"
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teams'
      AND policyname = 'Allow anon update on teams'
      AND cmd = 'UPDATE'
      AND permissive = 'PERMISSIVE'
      AND roles = '{public}'::name[]
      AND qual = 'true'
      AND with_check = 'true'
  ) THEN
    RAISE EXCEPTION 'Pre-flight Failed: Policy "Allow anon update on teams" on public.teams does not match expected definition.';
  END IF;

  -- 5.3 Assert "Allow anon insert on teams"
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teams'
      AND policyname = 'Allow anon insert on teams'
      AND cmd = 'INSERT'
      AND permissive = 'PERMISSIVE'
      AND roles = '{public}'::name[]
      AND qual IS NULL
      AND with_check = 'true'
  ) THEN
    RAISE EXCEPTION 'Pre-flight Failed: Policy "Allow anon insert on teams" on public.teams does not match expected definition.';
  END IF;

  -- 5.4 Verify no unexpected additional policies exist on public.teams
  SELECT count(*) INTO v_teams_policy_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teams';
  IF v_teams_policy_count <> 3 THEN
    RAISE EXCEPTION 'Pre-flight Failed: Unexpected number of policies on public.teams (found %, expected 3). Aborting.', v_teams_policy_count;
  END IF;

  -- 6. Exact assertion of expected policies on public.settings
  -- 6.1 Assert "Allow public read access on settings"
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'settings'
      AND policyname = 'Allow public read access on settings'
      AND cmd = 'SELECT'
      AND permissive = 'PERMISSIVE'
      AND roles = '{public}'::name[]
      AND qual = 'true'
      AND with_check IS NULL
  ) THEN
    RAISE EXCEPTION 'Pre-flight Failed: Policy "Allow public read access on settings" on public.settings does not match expected definition.';
  END IF;

  -- 6.2 Assert "Allow anon update on settings"
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'settings'
      AND policyname = 'Allow anon update on settings'
      AND cmd = 'UPDATE'
      AND permissive = 'PERMISSIVE'
      AND roles = '{public}'::name[]
      AND qual = 'true'
      AND with_check = 'true'
  ) THEN
    RAISE EXCEPTION 'Pre-flight Failed: Policy "Allow anon update on settings" on public.settings does not match expected definition.';
  END IF;

  -- 6.3 Verify no unexpected additional policies exist on public.settings
  SELECT count(*) INTO v_settings_policy_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings';
  IF v_settings_policy_count <> 2 THEN
    RAISE EXCEPTION 'Pre-flight Failed: Unexpected number of policies on public.settings (found %, expected 2). Aborting.', v_settings_policy_count;
  END IF;

  -- 7. Verify required database roles exist
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') OR
     NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') OR
     NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'Pre-flight Failed: One or more required Supabase roles (anon, authenticated, service_role) do not exist.';
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- PART 1: SECURE public.teams BASE TABLE
-- ------------------------------------------------------------------------------

-- Ensure Row Level Security is enabled
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 1.1 Drop confirmed unsafe and overly permissive policies on public.teams
DROP POLICY "Allow public read access on teams" ON public.teams;
DROP POLICY "Allow anon update on teams" ON public.teams;
DROP POLICY "Allow anon insert on teams" ON public.teams;

-- 1.2 Create Ownership-Scoped SELECT policy for Authenticated Participants
-- Allows logged-in participants to read their own team record (including leader & member names)
DROP POLICY IF EXISTS "Participants view own team" ON public.teams;
CREATE POLICY "Participants view own team"
ON public.teams FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- 1.3 Revoke excessive table privileges on public.teams
-- Remove all permissions from PUBLIC and anon (blocks direct PostgREST table access)
REVOKE ALL PRIVILEGES ON TABLE public.teams FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.teams FROM anon;

-- Remove write, truncate, and administrative permissions from authenticated
REVOKE ALL PRIVILEGES ON TABLE public.teams FROM authenticated;

-- Grant strictly SELECT on public.teams to authenticated (constrained by RLS above)
GRANT SELECT ON TABLE public.teams TO authenticated;

-- Ensure service_role retains full access for server-side API routes & cron monitor
GRANT ALL PRIVILEGES ON TABLE public.teams TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.teams TO postgres;


-- ------------------------------------------------------------------------------
-- PART 2: SECURE public.settings TABLE
-- ------------------------------------------------------------------------------

-- Ensure Row Level Security is enabled
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 2.1 Drop confirmed unsafe anonymous UPDATE policy on public.settings
DROP POLICY "Allow anon update on settings" ON public.settings;

-- 2.2 Ensure public read access policy is intact on public.settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'Allow public read access on settings'
  ) THEN
    CREATE POLICY "Allow public read access on settings"
    ON public.settings FOR SELECT
    TO public
    USING (true);
  END IF;
END $$;

-- 2.3 Revoke excessive write & DML privileges on public.settings
REVOKE ALL PRIVILEGES ON TABLE public.settings FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.settings FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.settings FROM authenticated;

-- Grant strictly SELECT on public.settings to anon and authenticated
GRANT SELECT ON TABLE public.settings TO anon, authenticated;

-- Ensure service_role retains full access for admin route updates
GRANT ALL PRIVILEGES ON TABLE public.settings TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.settings TO postgres;


-- ------------------------------------------------------------------------------
-- PART 3: VERIFY AND PRESERVE public.teams_public VIEW
-- ------------------------------------------------------------------------------

-- Ensure view permissions are strictly allowlisted for public reads
REVOKE ALL PRIVILEGES ON TABLE public.teams_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.teams_public TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- PART 4: HARDEN DEFAULT PRIVILEGES FOR FUTURE TABLES & VIEWS
-- ------------------------------------------------------------------------------
-- Prevent future tables created in public schema by postgres or supabase_admin
-- from automatically granting broad privileges (arwdDxtm) to anon and authenticated.
-- Future public views must receive explicit GRANT SELECT statements.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;

COMMIT;
