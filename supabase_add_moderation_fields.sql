-- Add moderation fields to the posts table
-- Run this in the Supabase SQL Editor

ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_blurred BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- Update the Post interface in lib/posts.ts to match
