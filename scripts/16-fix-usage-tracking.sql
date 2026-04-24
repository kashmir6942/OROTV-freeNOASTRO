-- Create decrement function for token usage
CREATE OR REPLACE FUNCTION decrement_token_usage(token_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE access_tokens 
  SET used_count = GREATEST(used_count - 1, 0)
  WHERE id = token_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset usage count for a specific token
CREATE OR REPLACE FUNCTION reset_token_usage(token_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE access_tokens 
  SET used_count = 0
  WHERE id = token_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get current active sessions count for a token
CREATE OR REPLACE FUNCTION get_active_token_sessions(token_hash_param TEXT)
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_count
    FROM viewer_sessions vs
    JOIN access_tokens at ON vs.token_hash = at.token_hash
    WHERE at.token_hash = token_hash_param
    AND vs.is_active = true
    AND vs.last_heartbeat >= NOW() - INTERVAL '5 minutes';
    
    RETURN COALESCE(active_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Add a button in admin panel to reset usage counts
-- This will be handled in the admin panel UI
