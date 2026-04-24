-- Add security columns to phcorner_usernames table
ALTER TABLE phcorner_usernames 
ADD COLUMN IF NOT EXISTS failed_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_attempt_at timestamp with time zone;

-- Create index for better performance on token lookups
CREATE INDEX IF NOT EXISTS idx_phcorner_token_hash ON phcorner_usernames(token_hash);

-- Function to reset failed attempts after 24 hours
CREATE OR REPLACE FUNCTION reset_failed_attempts()
RETURNS void AS $$
BEGIN
  UPDATE phcorner_usernames 
  SET failed_attempts = 0, is_locked = false, locked_at = NULL
  WHERE locked_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to increment failed attempts and lock if needed
CREATE OR REPLACE FUNCTION increment_failed_attempts(token_hash_param text)
RETURNS boolean AS $$
DECLARE
  current_attempts integer;
BEGIN
  -- Update failed attempts and last attempt time
  UPDATE phcorner_usernames 
  SET 
    failed_attempts = failed_attempts + 1,
    last_attempt_at = NOW()
  WHERE token_hash = token_hash_param
  RETURNING failed_attempts INTO current_attempts;
  
  -- Lock if 3 or more failed attempts
  IF current_attempts >= 3 THEN
    UPDATE phcorner_usernames 
    SET is_locked = true, locked_at = NOW()
    WHERE token_hash = token_hash_param;
    RETURN true; -- Token is now locked
  END IF;
  
  RETURN false; -- Token is not locked yet
END;
$$ LANGUAGE plpgsql;

-- Function to reset attempts on successful login
CREATE OR REPLACE FUNCTION reset_attempts_on_success(token_hash_param text)
RETURNS void AS $$
BEGIN
  UPDATE phcorner_usernames 
  SET failed_attempts = 0, is_locked = false, locked_at = NULL, last_attempt_at = NOW()
  WHERE token_hash = token_hash_param;
END;
$$ LANGUAGE plpgsql;
