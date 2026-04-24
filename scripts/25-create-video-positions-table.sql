-- Create video positions table for tracking user video progress
CREATE TABLE IF NOT EXISTS video_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_session TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  position REAL NOT NULL DEFAULT 0,
  duration REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_session, channel_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_positions_session_channel 
ON video_positions(user_session, channel_id);

-- Create function to update timestamp on position updates
CREATE OR REPLACE FUNCTION update_video_position_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
DROP TRIGGER IF EXISTS update_video_positions_timestamp ON video_positions;
CREATE TRIGGER update_video_positions_timestamp
  BEFORE UPDATE ON video_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_video_position_timestamp();

-- Function to upsert video position
CREATE OR REPLACE FUNCTION upsert_video_position(
  p_user_session TEXT,
  p_channel_id TEXT,
  p_position REAL,
  p_duration REAL DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO video_positions (user_session, channel_id, position, duration)
  VALUES (p_user_session, p_channel_id, p_position, p_duration)
  ON CONFLICT (user_session, channel_id)
  DO UPDATE SET
    position = EXCLUDED.position,
    duration = COALESCE(EXCLUDED.duration, video_positions.duration),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
