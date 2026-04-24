-- Create database functions for session tracking

-- Function to start a session
CREATE OR REPLACE FUNCTION start_session(p_token_id UUID, p_session_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Insert new session record
  INSERT INTO active_sessions (token_id, session_id, started_at, last_heartbeat)
  VALUES (p_token_id, p_session_id, NOW(), NOW())
  ON CONFLICT (session_id) DO UPDATE SET
    started_at = NOW(),
    last_heartbeat = NOW();
    
  -- Update current usage count for the token
  UPDATE access_tokens 
  SET current_usage = (
    SELECT COUNT(*) 
    FROM active_sessions 
    WHERE token_id = p_token_id
  )
  WHERE id = p_token_id;
END;
$$ LANGUAGE plpgsql;

-- Function to end a session
CREATE OR REPLACE FUNCTION end_session(p_session_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_token_id UUID;
BEGIN
  -- Get token_id before deleting
  SELECT token_id INTO v_token_id 
  FROM active_sessions 
  WHERE session_id = p_session_id;
  
  -- Delete the session
  DELETE FROM active_sessions WHERE session_id = p_session_id;
  
  -- Update current usage count for the token
  IF v_token_id IS NOT NULL THEN
    UPDATE access_tokens 
    SET current_usage = (
      SELECT COUNT(*) 
      FROM active_sessions 
      WHERE token_id = v_token_id
    )
    WHERE id = v_token_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update session heartbeat
CREATE OR REPLACE FUNCTION update_session_heartbeat(p_session_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE active_sessions 
  SET last_heartbeat = NOW()
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset token usage (cumulative counter)
CREATE OR REPLACE FUNCTION reset_token_usage(token_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE access_tokens 
  SET used_count = 0
  WHERE id = token_id;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup stale sessions (older than 2 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  affected_tokens UUID[];
BEGIN
  -- Get tokens that will be affected
  SELECT ARRAY_AGG(DISTINCT token_id) INTO affected_tokens
  FROM active_sessions 
  WHERE last_heartbeat < NOW() - INTERVAL '2 minutes';
  
  -- Delete stale sessions
  DELETE FROM active_sessions 
  WHERE last_heartbeat < NOW() - INTERVAL '2 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Update current usage for affected tokens
  IF affected_tokens IS NOT NULL THEN
    UPDATE access_tokens 
    SET current_usage = (
      SELECT COUNT(*) 
      FROM active_sessions 
      WHERE active_sessions.token_id = access_tokens.id
    )
    WHERE id = ANY(affected_tokens);
  END IF;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
