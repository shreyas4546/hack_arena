-- Run this in your Supabase SQL Editor to fix the scoring system

-- 1. Fix score column type: change from integer to real (supports decimals like 8.4)
ALTER TABLE teams ALTER COLUMN score TYPE real USING score::real;

-- 2. Add judge_score column if it doesn't exist (used by the Judging Matrix)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS judge_score real DEFAULT NULL;
