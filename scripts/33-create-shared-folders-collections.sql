-- Create shared folders table
CREATE TABLE IF NOT EXISTS public.shared_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code text UNIQUE NOT NULL,
  name text NOT NULL,
  color text NOT NULL,
  icon text NOT NULL,
  channel_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text,
  created_at timestamptz DEFAULT now(),
  views integer DEFAULT 0
);

-- Create shared collections table
CREATE TABLE IF NOT EXISTS public.shared_collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  channel_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ui_style text DEFAULT 'grid',
  custom_text text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  views integer DEFAULT 0
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_shared_folders_share_code ON public.shared_folders(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_collections_share_code ON public.shared_collections(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_folders_created_at ON public.shared_folders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_collections_created_at ON public.shared_collections(created_at DESC);

-- Enable RLS
ALTER TABLE public.shared_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_collections ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read shared content
CREATE POLICY "Anyone can view shared folders" ON public.shared_folders
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view shared collections" ON public.shared_collections
  FOR SELECT USING (true);

-- Allow anyone to increment views
CREATE POLICY "Anyone can update folder views" ON public.shared_folders
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can update collection views" ON public.shared_collections
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Function to increment folder views
CREATE OR REPLACE FUNCTION increment_folder_views(p_share_code text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.shared_folders
  SET views = views + 1
  WHERE share_code = p_share_code;
END;
$$;

-- Function to increment collection views
CREATE OR REPLACE FUNCTION increment_collection_views(p_share_code text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.shared_collections
  SET views = views + 1
  WHERE share_code = p_share_code;
END;
$$;
