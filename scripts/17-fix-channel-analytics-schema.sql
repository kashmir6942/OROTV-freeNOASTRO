-- Drop the existing channel_analytics table and recreate with proper structure
DROP TABLE IF EXISTS channel_analytics CASCADE;

-- Create the correct channel_analytics table structure
CREATE TABLE channel_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  total_viewers INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_watch_time INTEGER DEFAULT 0, -- in seconds
  unique_viewers INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  last_viewed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, date)
);

-- Create viewer_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS viewer_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL,
  user_ip TEXT NOT NULL,
  user_agent TEXT,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_channel_analytics_date ON channel_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_channel_analytics_channel_date ON channel_analytics(channel_id, date);
CREATE INDEX IF NOT EXISTS idx_viewer_sessions_channel_active ON viewer_sessions(channel_id, is_active);
CREATE INDEX IF NOT EXISTS idx_viewer_sessions_heartbeat ON viewer_sessions(last_heartbeat);

-- Enable RLS
ALTER TABLE channel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewer_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read to channel_analytics" ON channel_analytics FOR SELECT USING (true);
CREATE POLICY "Allow public insert to channel_analytics" ON channel_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to channel_analytics" ON channel_analytics FOR UPDATE USING (true);
CREATE POLICY "Allow public insert to viewer_sessions" ON viewer_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update own viewer_sessions" ON viewer_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public read to viewer_sessions" ON viewer_sessions FOR SELECT USING (true);

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
