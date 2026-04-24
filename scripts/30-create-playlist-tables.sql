-- Create streaming categories table
CREATE TABLE IF NOT EXISTS streaming_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create streaming channels table
CREATE TABLE IF NOT EXISTS streaming_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  stream_url TEXT NOT NULL,
  license_key VARCHAR(255),
  category_id UUID REFERENCES streaming_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlists table
CREATE TABLE IF NOT EXISTS streaming_playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  m3u8_content TEXT,
  mpd_content TEXT,
  share_url VARCHAR(255) UNIQUE,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO streaming_categories (name, description) VALUES
  ('Entertainment', 'Entertainment channels'),
  ('News', 'News and current affairs'),
  ('Sports', 'Sports channels'),
  ('Movies', 'Movie channels'),
  ('Music', 'Music channels'),
  ('Kids', 'Children content')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_streaming_channels_category ON streaming_channels(category_id);
CREATE INDEX IF NOT EXISTS idx_streaming_channels_active ON streaming_channels(is_active);
CREATE INDEX IF NOT EXISTS idx_playlist_channels_playlist ON playlist_channels(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_channels_channel ON playlist_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_streaming_playlists_share_url ON streaming_playlists(share_url);
