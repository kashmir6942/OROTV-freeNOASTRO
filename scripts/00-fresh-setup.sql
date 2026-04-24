-- Clean database setup script - creates all required tables
-- Run this to set up the database from scratch

-- 1. Core access token management
CREATE TABLE IF NOT EXISTS access_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    token_number INTEGER NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_ip TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    is_permanent BOOLEAN DEFAULT FALSE,
    used_count INTEGER DEFAULT 0,
    current_viewers INTEGER DEFAULT 0,
    viewers INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    user_ip TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    last_token_generated TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Streaming channels
CREATE TABLE IF NOT EXISTS streaming_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id TEXT NOT NULL UNIQUE,
    channel_name TEXT NOT NULL,
    channel_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Channel analytics
CREATE TABLE IF NOT EXISTS channel_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id TEXT NOT NULL UNIQUE,
    channel_name TEXT NOT NULL,
    view_count INTEGER DEFAULT 0,
    current_viewers INTEGER DEFAULT 0,
    last_viewed TIMESTAMP WITH TIME ZONE,
    user_ip TEXT,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Stream status tracking
CREATE TABLE IF NOT EXISTS stream_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id TEXT NOT NULL UNIQUE,
    channel_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    is_failed BOOLEAN DEFAULT FALSE,
    failed_at TIMESTAMP WITH TIME ZONE,
    custom_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channel_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. User reports
CREATE TABLE IF NOT EXISTS user_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    error_type TEXT,
    error_message TEXT,
    user_ip TEXT,
    user_agent TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Channel replacements
CREATE TABLE IF NOT EXISTS channel_replacements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_channel_id TEXT NOT NULL,
    replacement_channel_id TEXT NOT NULL,
    replacement_url TEXT,
    replacement_key TEXT,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Active sessions
CREATE TABLE IF NOT EXISTS active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    token_id UUID REFERENCES access_tokens(id) ON DELETE CASCADE,
    user_ip TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Video positions (watch history)
CREATE TABLE IF NOT EXISTS video_positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    position_seconds INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    theme TEXT DEFAULT 'light',
    auto_dismiss BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. User accounts
CREATE TABLE IF NOT EXISTS user_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Playlists
CREATE TABLE IF NOT EXISTS streaming_playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Playlist channels
CREATE TABLE IF NOT EXISTS playlist_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES streaming_playlists(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Channel requests
CREATE TABLE IF NOT EXISTS channel_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_accounts(id) ON DELETE SET NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Shared collections
CREATE TABLE IF NOT EXISTS shared_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Shared folders
CREATE TABLE IF NOT EXISTS shared_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID REFERENCES shared_collections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. User folders
CREATE TABLE IF NOT EXISTS user_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Folder channels
CREATE TABLE IF NOT EXISTS folder_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id UUID REFERENCES user_folders(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. User collections
CREATE TABLE IF NOT EXISTS user_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. Collection channels
CREATE TABLE IF NOT EXISTS collection_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID REFERENCES user_collections(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. Watch parties
CREATE TABLE IF NOT EXISTS watch_parties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    room_code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. Watch party participants
CREATE TABLE IF NOT EXISTS watch_party_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    watch_party_id UUID REFERENCES watch_parties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. Tokens table (alternate naming)
CREATE TABLE IF NOT EXISTS tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    token_number INTEGER NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    current_viewers INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 25. PhCorner usernames
CREATE TABLE IF NOT EXISTS phcorner_usernames (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT,
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 26. Viewer sessions
CREATE TABLE IF NOT EXISTS viewer_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    channel_id TEXT,
    viewers INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 27. Maintenance mode
CREATE TABLE IF NOT EXISTS maintenance_mode (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT FALSE,
    message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_tokens_token_hash ON access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires_at ON access_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_access_tokens_user_ip ON access_tokens(user_ip);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_ip_agent ON user_sessions(user_ip, user_agent);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_channel_analytics_channel_id ON channel_analytics(channel_id);
CREATE INDEX IF NOT EXISTS idx_stream_status_channel_id ON stream_status(channel_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_channel_id ON user_reports(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_replacements_original ON channel_replacements(original_channel_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON active_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_streaming_playlists_user_id ON streaming_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_parties_room_code ON watch_parties(room_code);
CREATE INDEX IF NOT EXISTS idx_phcorner_usernames_username ON phcorner_usernames(username);
