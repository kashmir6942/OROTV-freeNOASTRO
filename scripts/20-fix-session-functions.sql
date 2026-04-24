-- Drop existing functions if they exist to avoid conflicts
DROP FUNCTION IF EXISTS increment_token_usage(uuid);
DROP FUNCTION IF EXISTS decrement_token_usage(uuid);
DROP FUNCTION IF EXISTS cleanup_stale_sessions();

-- Create function to increment current usage when a session starts
CREATE OR REPLACE FUNCTION increment_token_usage(token_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE access_tokens 
    SET current_usage = COALESCE(current_usage, 0) + 1
    WHERE id = token_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to decrement current usage when a session ends
CREATE OR REPLACE FUNCTION decrement_token_usage(token_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE access_tokens 
    SET current_usage = GREATEST(COALESCE(current_usage, 0) - 1, 0)
    WHERE id = token_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup stale sessions (older than 2 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS integer AS $$
DECLARE
    cleaned_count integer;
BEGIN
    -- Get count of sessions to be cleaned
    SELECT COUNT(*) INTO cleaned_count
    FROM active_sessions 
    WHERE last_heartbeat < NOW() - INTERVAL '2 minutes';
    
    -- Update token usage counts for stale sessions
    UPDATE access_tokens 
    SET current_usage = GREATEST(COALESCE(current_usage, 0) - 1, 0)
    WHERE id IN (
        SELECT DISTINCT token_id 
        FROM active_sessions 
        WHERE last_heartbeat < NOW() - INTERVAL '2 minutes'
    );
    
    -- Delete stale sessions
    DELETE FROM active_sessions 
    WHERE last_heartbeat < NOW() - INTERVAL '2 minutes';
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;
