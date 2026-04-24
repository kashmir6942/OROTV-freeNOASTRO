-- Create active sessions table for real-time usage tracking
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID REFERENCES access_tokens(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_active_sessions_token_id ON active_sessions(token_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON active_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_active ON active_sessions(is_active);

-- Function to start a session
CREATE OR REPLACE FUNCTION start_session(p_token_id UUID, p_session_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Insert new session
  INSERT INTO active_sessions (token_id, session_id)
  VALUES (p_token_id, p_session_id)
  ON CONFLICT (session_id) DO UPDATE SET
    last_heartbeat = NOW(),
    is_active = true;
    
  -- Update token's current usage count
  UPDATE access_tokens 
  SET current_usage = (
    SELECT COUNT(*) 
    FROM active_sessions 
    WHERE token_id = p_token_id AND is_active = true
  )
  WHERE id = p_token_id;
END;
$$ LANGUAGE plpgsql;

-- Function to end a session
CREATE OR REPLACE FUNCTION end_session(p_session_id TEXT)
RETURNS VOID AS $$
DECLARE
  p_token_id UUID;
BEGIN
  -- Get token_id and mark session as inactive
  UPDATE active_sessions 
  SET is_active = false 
  WHERE session_id = p_session_id AND is_active = true
  RETURNING token_id INTO p_token_id;
  
  -- Update token's current usage count if token_id was found
  IF p_token_id IS NOT NULL THEN
    UPDATE access_tokens 
    SET current_usage = (
      SELECT COUNT(*) 
      FROM active_sessions 
      WHERE token_id = p_token_id AND is_active = true
    )
    WHERE id = p_token_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update session heartbeat
CREATE OR REPLACE FUNCTION update_session_heartbeat(p_session_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE active_sessions 
  SET last_heartbeat = NOW()
  WHERE session_id = p_session_id AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup stale sessions (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS VOID AS $$
DECLARE
  affected_tokens UUID[];
BEGIN
  -- Get affected token IDs before cleanup
  SELECT ARRAY_AGG(DISTINCT token_id) INTO affected_tokens
  FROM active_sessions 
  WHERE is_active = true 
    AND last_heartbeat < NOW() - INTERVAL '5 minutes';
  
  -- Mark stale sessions as inactive
  UPDATE active_sessions 
  SET is_active = false 
  WHERE is_active = true 
    AND last_heartbeat < NOW() - INTERVAL '5 minutes';
  
  -- Update usage counts for affected tokens
  IF affected_tokens IS NOT NULL THEN
    UPDATE access_tokens 
    SET current_usage = (
      SELECT COUNT(*) 
      FROM active_sessions 
      WHERE token_id = access_tokens.id AND is_active = true
    )
    WHERE id = ANY(affected_tokens);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add current_usage column to access_tokens if it doesn't exist
ALTER TABLE access_tokens 
ADD COLUMN IF NOT EXISTS current_usage INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for active_sessions
CREATE POLICY "Allow all operations on active_sessions" ON active_sessions
FOR ALL USING (true);
