-- Create function to update channel analytics with current viewer counts
CREATE OR REPLACE FUNCTION update_channel_analytics()
RETURNS void AS $$
DECLARE
    channel_record RECORD;
    current_viewers INTEGER;
    today_date DATE := CURRENT_DATE;
BEGIN
    -- Loop through all channels that have active viewers
    FOR channel_record IN 
        SELECT DISTINCT channel_id 
        FROM viewer_sessions 
        WHERE is_active = true 
        AND last_heartbeat >= NOW() - INTERVAL '5 minutes'
    LOOP
        -- Count current active viewers for this channel
        SELECT COUNT(*) INTO current_viewers
        FROM viewer_sessions
        WHERE channel_id = channel_record.channel_id
        AND is_active = true
        AND last_heartbeat >= NOW() - INTERVAL '5 minutes';

        -- Update or insert analytics record
        INSERT INTO channel_analytics (
            channel_id, 
            date, 
            total_viewers, 
            peak_viewers, 
            unique_viewers,
            updated_at
        )
        VALUES (
            channel_record.channel_id,
            today_date,
            current_viewers,
            current_viewers,
            current_viewers,
            NOW()
        )
        ON CONFLICT (channel_id, date) 
        DO UPDATE SET
            total_viewers = GREATEST(channel_analytics.total_viewers, current_viewers),
            peak_viewers = GREATEST(channel_analytics.peak_viewers, current_viewers),
            unique_viewers = (
                SELECT COUNT(DISTINCT user_ip)
                FROM viewer_sessions
                WHERE channel_id = channel_record.channel_id
                AND session_start::date = today_date
            ),
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old viewer sessions
CREATE OR REPLACE FUNCTION cleanup_old_viewer_sessions()
RETURNS void AS $$
BEGIN
    -- Mark sessions as inactive if no heartbeat for 10 minutes
    UPDATE viewer_sessions 
    SET is_active = false, 
        session_end = COALESCE(session_end, last_heartbeat)
    WHERE is_active = true 
    AND last_heartbeat < NOW() - INTERVAL '10 minutes';
    
    -- Delete very old sessions (older than 7 days)
    DELETE FROM viewer_sessions 
    WHERE session_start < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
