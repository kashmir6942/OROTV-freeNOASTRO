-- Create comprehensive viewer analytics functions
-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_top_viewed_channels(integer);
DROP FUNCTION IF EXISTS get_channel_viewer_stats();
DROP FUNCTION IF EXISTS get_real_time_analytics();

-- Create function to get real-time channel viewer statistics
CREATE OR REPLACE FUNCTION get_channel_viewer_stats()
RETURNS TABLE (
    channel_id text,
    current_viewers bigint,
    token_count bigint,
    peak_viewers integer,
    total_views bigint,
    last_activity timestamp with time zone
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(at.current_channel, 'unknown') as channel_id,
        COUNT(CASE WHEN at.current_viewers > 0 THEN 1 END) as current_viewers,
        COUNT(*) as token_count,
        COALESCE(MAX(ca.peak_viewers), 0) as peak_viewers,
        COALESCE(SUM(ca.view_count), 0) as total_views,
        MAX(at.created_at) as last_activity
    FROM access_tokens at
    LEFT JOIN channel_analytics ca ON ca.channel_id = at.current_channel
    WHERE at.current_channel IS NOT NULL 
    AND at.current_channel != ''
    AND (at.expires_at > NOW() OR at.is_permanent = true)
    GROUP BY at.current_channel
    ORDER BY current_viewers DESC, token_count DESC;
END;
$$;

-- Create function to get top viewed channels with limit
CREATE OR REPLACE FUNCTION get_top_viewed_channels(limit_count integer DEFAULT 10)
RETURNS TABLE (
    channel_id text,
    current_viewers bigint,
    token_count bigint,
    peak_viewers integer,
    total_views bigint,
    last_activity timestamp with time zone
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_channel_viewer_stats()
    ORDER BY current_viewers DESC, total_views DESC, token_count DESC
    LIMIT limit_count;
END;
$$;

-- Create function to get real-time analytics summary
CREATE OR REPLACE FUNCTION get_real_time_analytics()
RETURNS TABLE (
    total_active_viewers bigint,
    total_active_channels bigint,
    peak_channel_id text,
    peak_channel_viewers bigint,
    total_tokens bigint
) 
LANGUAGE plpgsql
AS $$
DECLARE
    stats_record RECORD;
BEGIN
    -- Get aggregated statistics
    SELECT 
        COALESCE(SUM(CASE WHEN current_viewers > 0 THEN current_viewers ELSE 0 END), 0) as total_viewers,
        COUNT(CASE WHEN current_viewers > 0 THEN 1 END) as active_channels,
        COUNT(*) as total_tokens
    INTO stats_record
    FROM get_channel_viewer_stats();
    
    -- Get peak channel
    SELECT 
        cvs.channel_id,
        cvs.current_viewers
    INTO peak_channel_id, peak_channel_viewers
    FROM get_channel_viewer_stats() cvs
    WHERE cvs.current_viewers > 0
    ORDER BY cvs.current_viewers DESC, cvs.total_views DESC
    LIMIT 1;
    
    -- Return results
    total_active_viewers := stats_record.total_viewers;
    total_active_channels := stats_record.active_channels;
    total_tokens := stats_record.total_tokens;
    
    -- If no peak channel found, set defaults
    IF peak_channel_id IS NULL THEN
        peak_channel_id := 'N/A';
        peak_channel_viewers := 0;
    END IF;
    
    RETURN NEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_channel_viewer_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_viewed_channels(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_real_time_analytics() TO anon, authenticated;
