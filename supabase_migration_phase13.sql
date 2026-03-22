-- Run this in your Supabase SQL Editor to update the teams table for Phase 13

-- Add new evaluation columns
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS deployment_status text CHECK (deployment_status IN ('live', 'slow', 'down', 'pending')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS response_time integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS score integer DEFAULT 0;

-- (Optional) If you want to reset all scores to 0 to start fresh
-- UPDATE teams SET score = 0, deployment_status = 'pending', response_time = 0;
