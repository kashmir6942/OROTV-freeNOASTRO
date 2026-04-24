-- Fix viewer tracking system by consolidating to a single, reliable approach
-- This script resolves conflicts between different tracking systems

-- First, drop conflicting functions from previous scripts
DROP FUNCTION IF EXISTS increment_viewers(INTEGER);
DROP FUNCTION IF EXISTS decrement_viewers(INTEGER);
DROP FUNCTION IF EXISTS reset_viewers(INTEGER);
DROP FUNCTION IF EXISTS increment_viewers(UUID);
DROP FUNCTION IF EXISTS decrement_viewers(UUID);
DROP FUNCTION IF EXISTS reset_viewers(UUID);
DROP FUNCTION IF EXISTS reset_all_viewers();

-- Ensure we have the correct table structure
-- Add current_viewers column to access_tokens if it doesn't exist
ALTER TABLE access_tokens ADD COLUMN IF NOT EXISTS current_viewers INTEGER DEFAULT 0;

-- Create reliable viewer tracking functions using UUID (matching access_tokens table)
CREATE OR REPLACE FUNCTION increment_viewers(token_id_param UUID)
RETURNS void AS $$
BEGIN
  -- Increment viewers count, ensuring it never goes below 1 when someone is watching
  UPDATE access_tokens 
  SET viewers = COALESCE(viewers, 0) + 1,
      current_viewers = COALESCE(current_viewers, 0) + 1
  WHERE id = token_id_param;
  
  -- Log the increment for debugging
  RAISE NOTICE 'Incremented viewers for token: %, new count: %', token_id_param, (SELECT current_viewers FROM access_tokens WHERE id = token_id_param);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_viewers(token_id_param UUID)
RETURNS void AS $$
BEGIN
  -- Decrement viewers count, ensuring it never goes below 0
  UPDATE access_tokens 
  SET viewers = GREATEST(COALESCE(viewers, 0) - 1, 0),
      current_viewers = GREATEST(COALESCE(current_viewers, 0) - 1, 0)
  WHERE id = token_id_param;
  
  -- Log the decrement for debugging
  RAISE NOTICE 'Decremented viewers for token: %, new count: %', token_id_param, (SELECT current_viewers FROM access_tokens WHERE id = token_id_param);
END;
$$ LANGUAGE plpgsql;

-- Create function to reset viewers for a specific token
CREATE OR REPLACE FUNCTION reset_viewers(token_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE access_tokens 
  SET viewers = 0,
      current_viewers = 0
  WHERE id = token_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset all viewers to zero (useful for maintenance)
CREATE OR REPLACE FUNCTION reset_all_viewers()
RETURNS void AS $$
BEGIN
  UPDATE access_tokens 
  SET viewers = 0,
      current_viewers = 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to get top viewed channels for admin panel
CREATE OR REPLACE FUNCTION get_top_viewed_channels(limit_count INTEGER DEFAULT 5)
RETURNS TABLE(
  channel_id TEXT,
  current_viewers BIGINT,
  token_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(cr.replacement_channel_id, t.channel_id) as channel_id,
    SUM(COALESCE(at.current_viewers, 0)) as current_viewers,
    COUNT(at.id) as token_count
  FROM access_tokens at
  JOIN tokens t ON t.token_hash = at.token_hash
  LEFT JOIN channel_replacements cr ON cr.original_channel_id = t.channel_id AND cr.is_active = true
  WHERE at.current_viewers > 0
  GROUP BY COALESCE(cr.replacement_channel_id, t.channel_id)
  ORDER BY current_viewers DESC, token_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update channel analytics based on current viewer counts
CREATE OR REPLACE FUNCTION update_channel_analytics_from_tokens()
RETURNS void AS $$
DECLARE
    channel_record RECORD;
    today_date DATE := CURRENT_DATE;
BEGIN
    -- Loop through channels with active viewers
    FOR channel_record IN 
        SELECT 
            COALESCE(cr.replacement_channel_id, t.channel_id) as channel_id,
            SUM(COALESCE(at.current_viewers, 0)) as current_viewers
        FROM access_tokens at
        JOIN tokens t ON t.token_hash = at.token_hash
        LEFT JOIN channel_replacements cr ON cr.original_channel_id = t.channel_id AND cr.is_active = true
        WHERE at.current_viewers > 0
        GROUP BY COALESCE(cr.replacement_channel_id, t.channel_id)
    LOOP
        -- Update or insert analytics record
        INSERT INTO channel_analytics (
            channel_id, 
            date, 
            total_viewers, 
            peak_viewers, 
            unique_viewers,
            view_count,
            updated_at
        )
        VALUES (
            channel_record.channel_id,
            today_date,
            channel_record.current_viewers,
            channel_record.current_viewers,
            channel_record.current_viewers,
            1,
            NOW()
        )
        ON CONFLICT (channel_id, date) 
        DO UPDATE SET
            total_viewers = GREATEST(channel_analytics.total_viewers, channel_record.current_viewers),
            peak_viewers = GREATEST(channel_analytics.peak_viewers, channel_record.current_viewers),
            view_count = channel_analytics.view_count + 1,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Reset all current viewer counts to start fresh
UPDATE access_tokens SET viewers = 0, current_viewers = 0;

-- Create index for better performance on viewer queries
CREATE INDEX IF NOT EXISTS idx_access_tokens_current_viewers ON access_tokens(current_viewers) WHERE current_viewers > 0;
