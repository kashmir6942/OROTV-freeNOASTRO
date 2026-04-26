-- Create user_ratings table for Light TV
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT DEFAULT 'Anonymous',
  username TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  satisfaction_comment TEXT,
  complaint TEXT,
  issues TEXT[] DEFAULT '{}',
  features_to_add TEXT,
  user_ip TEXT DEFAULT 'unknown',
  user_agent TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_ratings_created_at ON user_ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rating ON user_ratings(rating);

-- Enable Row Level Security
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert ratings (public submissions)
CREATE POLICY "Anyone can submit ratings" ON user_ratings
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read ratings (for admin viewing)
CREATE POLICY "Anyone can read ratings" ON user_ratings
  FOR SELECT
  USING (true);

-- Grant permissions
GRANT INSERT, SELECT ON user_ratings TO anon;
GRANT INSERT, SELECT ON user_ratings TO authenticated;
