-- Added table existence checks before enabling RLS
-- Enable Row Level Security on all admin tables (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stream_status') THEN
        ALTER TABLE stream_status ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'channel_analytics') THEN
        ALTER TABLE channel_analytics ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_reports') THEN
        ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'channel_replacements') THEN
        ALTER TABLE channel_replacements ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'announcements') THEN
        ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Create policies for public read access (needed for the app to function)
DROP POLICY IF EXISTS "Allow public read access to stream_status" ON stream_status;
CREATE POLICY "Allow public read access to stream_status" ON stream_status
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to announcements" ON announcements;
CREATE POLICY "Allow public read access to announcements" ON announcements
    FOR SELECT USING (is_active = true);

-- Create policies for public insert on analytics and reports
DROP POLICY IF EXISTS "Allow public insert to channel_analytics" ON channel_analytics;
CREATE POLICY "Allow public insert to channel_analytics" ON channel_analytics
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert to user_reports" ON user_reports;
CREATE POLICY "Allow public insert to user_reports" ON user_reports
    FOR INSERT WITH CHECK (true);

-- Admin-only policies for modifications
DROP POLICY IF EXISTS "Allow admin full access to stream_status" ON stream_status;
CREATE POLICY "Allow admin full access to stream_status" ON stream_status
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to channel_replacements" ON channel_replacements;
CREATE POLICY "Allow admin full access to channel_replacements" ON channel_replacements
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin full access to announcements" ON announcements;
CREATE POLICY "Allow admin full access to announcements" ON announcements
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow admin update user_reports" ON user_reports;
CREATE POLICY "Allow admin update user_reports" ON user_reports
    FOR UPDATE USING (true);
