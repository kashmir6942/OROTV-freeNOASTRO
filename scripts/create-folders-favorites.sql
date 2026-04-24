-- Create user_favorites table to store favorite channels
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_session TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_session, channel_id)
);

-- Create user_folders table for organizing channels
CREATE TABLE IF NOT EXISTS public.user_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_session TEXT NOT NULL,
    folder_name TEXT NOT NULL,
    folder_color TEXT DEFAULT '#3B82F6',
    folder_icon TEXT DEFAULT 'folder',
    folder_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_session, folder_name)
);

-- Create folder_channels junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.folder_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES public.user_folders(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    channel_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(folder_id, channel_id)
);

-- Create user_collections table for curated channel collections
CREATE TABLE IF NOT EXISTS public.user_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_session TEXT NOT NULL,
    collection_name TEXT NOT NULL,
    collection_description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    share_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collection_channels junction table
CREATE TABLE IF NOT EXISTS public.collection_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES public.user_collections(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    channel_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, channel_id)
);

-- Create watch_parties table for shared viewing sessions
CREATE TABLE IF NOT EXISTS public.watch_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_code TEXT UNIQUE NOT NULL,
    host_session TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    party_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_viewers INTEGER DEFAULT 10,
    current_viewers INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create watch_party_participants table
CREATE TABLE IF NOT EXISTS public.watch_party_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID REFERENCES public.watch_parties(id) ON DELETE CASCADE,
    user_session TEXT NOT NULL,
    username TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(party_id, user_session)
);

-- Enable RLS on all tables
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_favorites
CREATE POLICY "Users can manage their own favorites" ON public.user_favorites
    FOR ALL USING (TRUE);

-- Create RLS policies for user_folders
CREATE POLICY "Users can manage their own folders" ON public.user_folders
    FOR ALL USING (TRUE);

-- Create RLS policies for folder_channels
CREATE POLICY "Users can manage folder channels" ON public.folder_channels
    FOR ALL USING (TRUE);

-- Create RLS policies for user_collections
CREATE POLICY "Users can manage their collections" ON public.user_collections
    FOR ALL USING (TRUE);

CREATE POLICY "Public collections are readable" ON public.user_collections
    FOR SELECT USING (is_public = TRUE);

-- Create RLS policies for collection_channels
CREATE POLICY "Users can manage collection channels" ON public.collection_channels
    FOR ALL USING (TRUE);

-- Create RLS policies for watch_parties
CREATE POLICY "Anyone can read active watch parties" ON public.watch_parties
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can create watch parties" ON public.watch_parties
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Hosts can update their parties" ON public.watch_parties
    FOR UPDATE USING (TRUE);

-- Create RLS policies for watch_party_participants
CREATE POLICY "Anyone can join watch parties" ON public.watch_party_participants
    FOR ALL USING (TRUE);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_session ON public.user_favorites(user_session);
CREATE INDEX IF NOT EXISTS idx_user_folders_session ON public.user_folders(user_session);
CREATE INDEX IF NOT EXISTS idx_folder_channels_folder ON public.folder_channels(folder_id);
CREATE INDEX IF NOT EXISTS idx_collections_session ON public.user_collections(user_session);
CREATE INDEX IF NOT EXISTS idx_collections_share ON public.user_collections(share_code);
CREATE INDEX IF NOT EXISTS idx_watch_parties_code ON public.watch_parties(party_code);
CREATE INDEX IF NOT EXISTS idx_watch_parties_active ON public.watch_parties(is_active);
