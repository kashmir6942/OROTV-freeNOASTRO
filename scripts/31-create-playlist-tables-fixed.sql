-- Create streaming categories table
CREATE TABLE IF NOT EXISTS streaming_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create streaming channels table
CREATE TABLE IF NOT EXISTS streaming_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    stream_url TEXT NOT NULL,
    license_key TEXT,
    category_id UUID REFERENCES streaming_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create streaming playlists table
CREATE TABLE IF NOT EXISTS streaming_playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    m3u8_content TEXT,
    mpd_content TEXT,
    share_url TEXT UNIQUE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlist channels junction table
CREATE TABLE IF NOT EXISTS playlist_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES streaming_playlists(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES streaming_channels(id) ON DELETE CASCADE,
    channel_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(playlist_id, channel_id)
);

-- Insert default categories
INSERT INTO streaming_categories (name, description) VALUES
    ('Entertainment', 'General entertainment channels'),
    ('Movies', 'Movie channels and content'),
    ('Sports', 'Sports and athletic content'),
    ('News', 'News and current affairs'),
    ('Kids', 'Children and family content'),
    ('Lifestyle', 'Lifestyle and reality shows'),
    ('Documentary', 'Educational and documentary content'),
    ('Religious', 'Religious and spiritual content'),
    ('Educational', 'Educational and learning content'),
    ('Music', 'Music videos and concerts')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_streaming_channels_category_id ON streaming_channels(category_id);
CREATE INDEX IF NOT EXISTS idx_streaming_channels_is_active ON streaming_channels(is_active);
CREATE INDEX IF NOT EXISTS idx_playlist_channels_playlist_id ON playlist_channels(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_channels_channel_id ON playlist_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_streaming_playlists_share_url ON streaming_playlists(share_url);
CREATE INDEX IF NOT EXISTS idx_streaming_playlists_is_public ON streaming_playlists(is_public);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_streaming_categories_updated_at ON streaming_categories;
CREATE TRIGGER update_streaming_categories_updated_at
    BEFORE UPDATE ON streaming_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_streaming_channels_updated_at ON streaming_channels;
CREATE TRIGGER update_streaming_channels_updated_at
    BEFORE UPDATE ON streaming_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_streaming_playlists_updated_at ON streaming_playlists;
CREATE TRIGGER update_streaming_playlists_updated_at
    BEFORE UPDATE ON streaming_playlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
