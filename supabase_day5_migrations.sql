-- ============================================
-- SAFEYAK DAY 5 - DATABASE MIGRATIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: CREATE NEW TABLES
-- ============================================

-- Reputation table (Yakarma-like XP system)
CREATE TABLE IF NOT EXISTS reputation (
  author_hash TEXT PRIMARY KEY,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_score ON reputation(score DESC);

-- Moderator notes table
CREATE TABLE IF NOT EXISTS mod_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  mod_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_notes_post_id ON mod_notes(post_id);

-- Votes table (if not exists)
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_hash TEXT NOT NULL,
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_hash)
);

CREATE INDEX IF NOT EXISTS idx_votes_post_id ON votes(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_hash ON votes(user_hash);

-- Bookmarks table (if not exists)
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_hash)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_hash ON bookmarks(user_hash);

-- ============================================
-- PART 2: ADD COLUMNS TO POSTS TABLE
-- ============================================

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bookmarks_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- ============================================
-- PART 3: RPC FUNCTIONS
-- ============================================

-- Increment reputation
CREATE OR REPLACE FUNCTION increment_reputation(
  p_hash TEXT,
  p_points INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO reputation (author_hash, score)
  VALUES (p_hash, p_points)
  ON CONFLICT (author_hash)
  DO UPDATE SET 
    score = reputation.score + p_points,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Get reputation
CREATE OR REPLACE FUNCTION get_reputation(p_hash TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER;
BEGIN
  SELECT score INTO v_score
  FROM reputation
  WHERE author_hash = p_hash;
  
  RETURN COALESCE(v_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Cast vote (with reputation updates)
CREATE OR REPLACE FUNCTION cast_vote(
  p_post_id UUID,
  p_user_hash TEXT,
  p_new_vote INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_old_vote INTEGER;
  v_post_author TEXT;
BEGIN
  -- Get old vote if exists
  SELECT vote INTO v_old_vote
  FROM votes
  WHERE post_id = p_post_id AND user_hash = p_user_hash;
  
  -- Get post author
  SELECT author_hash INTO v_post_author
  FROM posts
  WHERE id = p_post_id;
  
  -- Insert or update vote
  INSERT INTO votes (post_id, user_hash, vote)
  VALUES (p_post_id, p_user_hash, p_new_vote)
  ON CONFLICT (post_id, user_hash)
  DO UPDATE SET vote = p_new_vote;
  
  -- Update post score
  UPDATE posts
  SET 
    score = (SELECT COALESCE(SUM(vote), 0) FROM votes WHERE post_id = p_post_id),
    upvotes = (SELECT COUNT(*) FROM votes WHERE post_id = p_post_id AND vote = 1),
    downvotes = (SELECT COUNT(*) FROM votes WHERE post_id = p_post_id AND vote = -1)
  WHERE id = p_post_id;
  
  -- Update reputation for post author
  IF v_old_vote IS NULL AND p_new_vote = 1 THEN
    -- New upvote: +1 reputation
    PERFORM increment_reputation(v_post_author, 1);
  ELSIF v_old_vote IS NULL AND p_new_vote = -1 THEN
    -- New downvote: no reputation change
    NULL;
  ELSIF v_old_vote = -1 AND p_new_vote = 1 THEN
    -- Changed from downvote to upvote: +1 reputation
    PERFORM increment_reputation(v_post_author, 1);
  ELSIF v_old_vote = 1 AND p_new_vote = -1 THEN
    -- Changed from upvote to downvote: -1 reputation
    PERFORM increment_reputation(v_post_author, -1);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Toggle bookmark
CREATE OR REPLACE FUNCTION toggle_bookmark(
  p_post_id UUID,
  p_user_hash TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Toggle bookmark
  IF EXISTS (SELECT 1 FROM bookmarks WHERE post_id = p_post_id AND user_hash = p_user_hash) THEN
    DELETE FROM bookmarks WHERE post_id = p_post_id AND user_hash = p_user_hash;
  ELSE
    INSERT INTO bookmarks (post_id, user_hash) VALUES (p_post_id, p_user_hash);
  END IF;
  
  -- Update bookmark count
  UPDATE posts
  SET bookmarks_count = (SELECT COUNT(*) FROM bookmarks WHERE post_id = p_post_id)
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- Add moderator note
CREATE OR REPLACE FUNCTION add_mod_note(
  p_post_id UUID,
  p_note TEXT,
  p_mod_hash TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO mod_notes (post_id, note, mod_hash)
  VALUES (p_post_id, p_note, p_mod_hash);
END;
$$ LANGUAGE plpgsql;

-- Moderator: Hide post
CREATE OR REPLACE FUNCTION mod_hide_post(p_post_id UUID)
RETURNS VOID AS $$
DECLARE
  v_author TEXT;
BEGIN
  -- Get post author
  SELECT author_hash INTO v_author FROM posts WHERE id = p_post_id;
  
  -- Update post
  UPDATE posts
  SET is_hidden = TRUE
  WHERE id = p_post_id;
  
  -- Deduct reputation
  PERFORM increment_reputation(v_author, -10);
END;
$$ LANGUAGE plpgsql;

-- Moderator: Blur post
CREATE OR REPLACE FUNCTION mod_blur_post(p_post_id UUID)
RETURNS VOID AS $$
DECLARE
  v_author TEXT;
BEGIN
  -- Get post author
  SELECT author_hash INTO v_author FROM posts WHERE id = p_post_id;
  
  -- Update post
  UPDATE posts
  SET is_blurred = TRUE
  WHERE id = p_post_id;
  
  -- Deduct reputation
  PERFORM increment_reputation(v_author, -5);
END;
$$ LANGUAGE plpgsql;

-- Moderator: Lock thread
CREATE OR REPLACE FUNCTION mod_lock_post(p_post_id UUID)
RETURNS VOID AS $$
DECLARE
  v_author TEXT;
BEGIN
  -- Get post author
  SELECT author_hash INTO v_author FROM posts WHERE id = p_post_id;
  
  -- Update post
  UPDATE posts
  SET locked = TRUE
  WHERE id = p_post_id;
  
  -- Deduct reputation
  PERFORM increment_reputation(v_author, -15);
END;
$$ LANGUAGE plpgsql;

-- Get profile stats
CREATE OR REPLACE FUNCTION get_profile_stats(p_hash TEXT)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'reputation', COALESCE((SELECT score FROM reputation WHERE author_hash = p_hash), 0),
    'post_count', COALESCE((SELECT COUNT(*) FROM posts WHERE author_hash = p_hash), 0),
    'comment_count', COALESCE((SELECT COUNT(*) FROM comments WHERE author_hash = p_hash), 0),
    'upvotes_received', COALESCE((
      SELECT SUM(upvotes) FROM posts WHERE author_hash = p_hash
    ), 0),
    'bookmarks_received', COALESCE((
      SELECT SUM(bookmarks_count) FROM posts WHERE author_hash = p_hash
    ), 0),
    'joined_at', COALESCE((
      SELECT MIN(created_at) FROM posts WHERE author_hash = p_hash
    ), NOW())
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Get zone activity (for heatmap)
CREATE OR REPLACE FUNCTION get_zone_activity()
RETURNS TABLE(
  zone TEXT,
  post_count BIGINT,
  trending_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.zone,
    COUNT(*) as post_count,
    -- Trending score: posts in last 24h weighted by recency
    SUM(
      CASE 
        WHEN p.created_at > NOW() - INTERVAL '1 hour' THEN 10
        WHEN p.created_at > NOW() - INTERVAL '6 hours' THEN 5
        WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 2
        ELSE 1
      END
    )::NUMERIC as trending_score
  FROM posts p
  WHERE p.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY p.zone
  ORDER BY trending_score DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 4: TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Update comment count when comment is added
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts
  SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = NEW.post_id)
  WHERE id = NEW.post_id;
  
  -- Award reputation to post author for receiving a comment
  PERFORM increment_reputation(
    (SELECT author_hash FROM posts WHERE id = NEW.post_id),
    2
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_count
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_count();

-- Award reputation when post passes moderation
CREATE OR REPLACE FUNCTION award_moderation_reputation()
RETURNS TRIGGER AS $$
BEGIN
  -- If post is created and not hidden, award reputation
  IF NEW.is_hidden = FALSE AND NEW.is_blurred = FALSE THEN
    PERFORM increment_reputation(NEW.author_hash, 10);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_moderation_reputation
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION award_moderation_reputation();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify everything was created:

-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('reputation', 'mod_notes', 'votes', 'bookmarks');

-- Check posts columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'posts' 
AND column_name IN ('score', 'upvotes', 'downvotes', 'bookmarks_count', 'comment_count');

-- Check RPC functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'increment_reputation', 'get_reputation', 'cast_vote', 
  'toggle_bookmark', 'add_mod_note', 'mod_hide_post', 
  'mod_blur_post', 'mod_lock_post', 'get_profile_stats', 
  'get_zone_activity'
);

-- ============================================
-- DONE! Ready for Phase 2
-- ============================================
