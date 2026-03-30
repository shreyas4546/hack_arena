-- Migration: Add auth_user_id to teams table to link with Supabase Auth
-- Execute this in the Supabase SQL Editor.

ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_auth_user_id ON public.teams(auth_user_id);
