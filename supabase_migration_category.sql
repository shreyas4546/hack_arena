-- Migration to add category and problem_statement to teams table
-- Added on 2026-03-23

ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS problem_statement text;
