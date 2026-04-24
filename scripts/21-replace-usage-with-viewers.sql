-- Replace complex session tracking with simple viewers count
-- Drop existing session tracking functions and tables
DROP FUNCTION IF EXISTS start_session(text);
DROP FUNCTION IF EXISTS end_session(text);
DROP FUNCTION IF EXISTS cleanup_stale_sessions();
DROP TABLE IF EXISTS active_sessions;

-- Add simple viewers column to tokens table
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS current_viewers INTEGER DEFAULT 0;

-- Create simple functions for viewer tracking
CREATE OR REPLACE FUNCTION increment_viewers(token_id_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE tokens 
  SET current_viewers = GREATEST(current_viewers + 1, 1)
  WHERE id = token_id_param;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_viewers(token_id_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE tokens 
  SET current_viewers = GREATEST(current_viewers - 1, 0)
  WHERE id = token_id_param;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_viewers(token_id_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE tokens 
  SET current_viewers = 0
  WHERE id = token_id_param;
END;
$$ LANGUAGE plpgsql;

-- Reset all current viewers to 0
UPDATE tokens SET current_viewers = 0;
