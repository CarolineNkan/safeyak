-- SQL for creating the posts table in Supabase
-- Run this in the Supabase SQL Editor

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone TEXT NOT NULL,
  body TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  author_hash TEXT,
  is_hidden BOOLEAN DEFAULT FALSE
);

-- Create an index on zone for faster queries
CREATE INDEX idx_posts_zone ON posts(zone);

-- Create an index on created_at for sorting
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
