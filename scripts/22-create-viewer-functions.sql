-- Create function to increment viewers count
CREATE OR REPLACE FUNCTION increment_viewers(token_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE access_tokens 
  SET viewers = COALESCE(viewers, 0) + 1
  WHERE id = token_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to decrement viewers count (prevent negative values)
CREATE OR REPLACE FUNCTION decrement_viewers(token_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE access_tokens 
  SET viewers = GREATEST(COALESCE(viewers, 0) - 1, 0)
  WHERE id = token_id_param;
END;
$$ LANGUAGE plpgsql;

-- Add function to reset viewers for a specific token
CREATE OR REPLACE FUNCTION reset_viewers(token_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE access_tokens 
  SET viewers = 0
  WHERE id = token_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset all viewers to zero
CREATE OR REPLACE FUNCTION reset_all_viewers()
RETURNS VOID AS $$
BEGIN
  UPDATE access_tokens SET viewers = 0;
END;
$$ LANGUAGE plpgsql;
