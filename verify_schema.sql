-- Verify that the posts table has all required columns
-- Run this in Supabase SQL Editor to check your schema

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'posts'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid)
-- zone (text)
-- body (text)
-- votes (integer)
-- created_at (timestamp with time zone)
-- author_hash (text)
-- is_hidden (boolean)
-- is_blurred (boolean)  ← Must exist
-- moderation_reason (text)  ← Must exist
