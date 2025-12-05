-- Migration: Add is_hidden column to comments table
-- Date: 2025-12-05
-- Purpose: Allow comments to be completely hidden (not just blurred) for severe violations

-- Add is_hidden column to comments table
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Create index for performance when filtering hidden comments
CREATE INDEX IF NOT EXISTS idx_comments_is_hidden ON comments(is_hidden);

-- Update lock_if_toxic function to count both blurred AND hidden comments
CREATE OR REPLACE FUNCTION lock_if_toxic(post_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Count toxic comments (blurred OR hidden)
  IF (
    SELECT COUNT(*) 
    FROM comments 
    WHERE comments.post_id = lock_if_toxic.post_id 
    AND (is_blurred = TRUE OR is_hidden = TRUE)
  ) >= 3 THEN
    -- Lock the thread
    UPDATE posts 
    SET locked = TRUE 
    WHERE id = lock_if_toxic.post_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'comments' 
  AND column_name = 'is_hidden';
