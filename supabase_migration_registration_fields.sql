-- Migration: Add detailed team registration fields
-- Execute this in the Supabase SQL Editor.

-- Add new columns for Team Leader and Participants array
-- (Note: 'category' and 'problem_statement' already exist natively in the schema)
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS team_leader_name TEXT,
ADD COLUMN IF NOT EXISTS participant_names JSONB DEFAULT '[]'::jsonb;
