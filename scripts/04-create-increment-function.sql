-- Create atomic increment function for token usage
CREATE OR REPLACE FUNCTION increment_token_usage(token_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE access_tokens 
  SET used_count = used_count + 1 
  WHERE id = token_id;
END;
$$ LANGUAGE plpgsql;
