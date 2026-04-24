-- Fixed table creation order and column references
-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS channel_replacements CASCADE;
DROP TABLE IF EXISTS user_reports CASCADE;
DROP TABLE IF EXISTS channel_analytics CASCADE;
DROP TABLE IF EXISTS stream_status CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;

-- Create stream_status table for managing channel failures and technical difficulties
CREATE TABLE stream_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id TEXT NOT NULL UNIQUE,
    channel_name TEXT NOT NULL,
    is_failed BOOLEAN DEFAULT FALSE,
    custom_message TEXT DEFAULT 'Technical Difficulties - Please try again later',
    custom_image_url TEXT,
    failed_at TIMESTAMP WITH TIME ZONE,
    updated_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channel_analytics table for proper usage tracking
CREATE TABLE channel_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    view_count INTEGER DEFAULT 0,
    last_viewed TIMESTAMP WITH TIME ZONE,
    user_ip TEXT,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_reports table for automatic error reporting
CREATE TABLE user_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    user_ip TEXT,
    user_agent TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channel_replacements table for backup channels
CREATE TABLE channel_replacements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_channel_id TEXT NOT NULL,
    replacement_channel_id TEXT NOT NULL,
    replacement_url TEXT NOT NULL,
    replacement_key TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcements table for system announcements
CREATE TABLE announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- info, warning, error, success
    is_active BOOLEAN DEFAULT TRUE,
    show_on_home BOOLEAN DEFAULT FALSE,
    created_by TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_stream_status_channel_id ON stream_status(channel_id);
CREATE INDEX idx_stream_status_is_failed ON stream_status(is_failed);
CREATE INDEX idx_channel_analytics_channel_id ON channel_analytics(channel_id);
CREATE INDEX idx_channel_analytics_created_at ON channel_analytics(created_at);
CREATE INDEX idx_user_reports_channel_id ON user_reports(channel_id);
CREATE INDEX idx_user_reports_is_resolved ON user_reports(is_resolved);
CREATE INDEX idx_channel_replacements_original ON channel_replacements(original_channel_id);
CREATE INDEX idx_channel_replacements_active ON channel_replacements(is_active);
CREATE INDEX idx_announcements_active ON announcements(is_active);
CREATE INDEX idx_announcements_expires ON announcements(expires_at);
