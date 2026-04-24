-- Remove stream status tables
DROP TABLE IF EXISTS stream_status CASCADE;
DROP TABLE IF EXISTS channel_status CASCADE;

-- Create viewer tracking table
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

-- Create channel analytics table
CREATE TABLE IF NOT EXISTS channel_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  total_viewers INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_watch_time INTEGER DEFAULT 0, -- in seconds
  unique_viewers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, date)
);

-- Create user reports table for automatic error reporting
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'playback_error',
  description TEXT,
  error_details JSONB,
  user_ip TEXT NOT NULL,
  user_agent TEXT,
  status TEXT DEFAULT 'pending', -- pending, investigating, resolved
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create announcements table for global announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, warning, maintenance, success
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=critical
  show_popup BOOLEAN DEFAULT false,
  auto_dismiss_seconds INTEGER, -- null = manual dismiss only
  target_audience TEXT DEFAULT 'all', -- all, premium, free
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create maintenance mode table
CREATE TABLE IF NOT EXISTS maintenance_mode (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active BOOLEAN DEFAULT false,
  title TEXT DEFAULT 'Scheduled Maintenance',
  message TEXT DEFAULT 'We are currently performing scheduled maintenance. Please check back soon.',
  estimated_duration TEXT,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default maintenance record
INSERT INTO maintenance_mode (is_active, title, message) 
VALUES (false, 'Scheduled Maintenance', 'We are currently performing scheduled maintenance. Please check back soon.')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_viewer_sessions_channel_active ON viewer_sessions(channel_id, is_active);
CREATE INDEX IF NOT EXISTS idx_viewer_sessions_heartbeat ON viewer_sessions(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_channel_analytics_date ON channel_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, priority DESC);

-- Enable RLS
ALTER TABLE viewer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a public streaming service)
CREATE POLICY "Allow public read access to announcements" ON announcements FOR SELECT USING (is_active = true);
CREATE POLICY "Allow public read access to maintenance" ON maintenance_mode FOR SELECT USING (true);
CREATE POLICY "Allow public insert to viewer_sessions" ON viewer_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update own viewer_sessions" ON viewer_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public insert to user_reports" ON user_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read to channel_analytics" ON channel_analytics FOR SELECT USING (true);
