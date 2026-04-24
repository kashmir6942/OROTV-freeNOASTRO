-- Function to increment channel view count atomically
CREATE OR REPLACE FUNCTION increment_channel_views(
    p_channel_id TEXT,
    p_channel_name TEXT,
    p_user_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    current_count INTEGER;
BEGIN
    -- Insert or update channel analytics
    INSERT INTO channel_analytics (channel_id, channel_name, view_count, last_viewed, user_ip, user_agent, session_id)
    VALUES (p_channel_id, p_channel_name, 1, NOW(), p_user_ip, p_user_agent, p_session_id)
    ON CONFLICT (channel_id) 
    DO UPDATE SET 
        view_count = channel_analytics.view_count + 1,
        last_viewed = NOW(),
        user_ip = COALESCE(p_user_ip, channel_analytics.user_ip),
        user_agent = COALESCE(p_user_agent, channel_analytics.user_agent),
        session_id = COALESCE(p_session_id, channel_analytics.session_id);
    
    -- Get current count
    SELECT view_count INTO current_count 
    FROM channel_analytics 
    WHERE channel_id = p_channel_id;
    
    RETURN current_count;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-report channel errors
CREATE OR REPLACE FUNCTION auto_report_channel_error(
    p_channel_id TEXT,
    p_channel_name TEXT,
    p_error_type TEXT,
    p_error_message TEXT,
    p_user_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    report_id UUID;
BEGIN
    -- Insert error report
    INSERT INTO user_reports (channel_id, channel_name, error_type, error_message, user_ip, user_agent)
    VALUES (p_channel_id, p_channel_name, p_error_type, p_error_message, p_user_ip, p_user_agent)
    RETURNING id INTO report_id;
    
    -- Auto-mark stream as failed if too many errors
    UPDATE stream_status 
    SET is_failed = TRUE, 
        failed_at = NOW(),
        custom_message = 'Stream temporarily unavailable due to technical issues'
    WHERE channel_id = p_channel_id 
    AND (
        SELECT COUNT(*) 
        FROM user_reports 
        WHERE channel_id = p_channel_id 
        AND created_at > NOW() - INTERVAL '5 minutes'
        AND is_resolved = FALSE
    ) >= 3;
    
    RETURN report_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get channel replacement
CREATE OR REPLACE FUNCTION get_channel_replacement(p_channel_id TEXT)
RETURNS TABLE(
    replacement_id TEXT,
    replacement_url TEXT,
    replacement_key TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.replacement_channel_id,
        cr.replacement_url,
        cr.replacement_key
    FROM channel_replacements cr
    WHERE cr.original_channel_id = p_channel_id
    AND cr.is_active = TRUE
    ORDER BY cr.priority ASC, cr.created_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
