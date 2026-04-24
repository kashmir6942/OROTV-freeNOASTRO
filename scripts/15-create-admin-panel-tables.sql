-- Fix admin panel tables to work with existing schema
-- This script ensures the existing tables have the correct structure for the admin panel

-- The announcements table already exists, but we need to check if it has all required columns
-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'announcements' AND column_name = 'priority') THEN
        ALTER TABLE announcements ADD COLUMN priority INTEGER DEFAULT 1;
    END IF;
    
    -- Add show_popup column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'announcements' AND column_name = 'show_popup') THEN
        ALTER TABLE announcements ADD COLUMN show_popup BOOLEAN DEFAULT false;
    END IF;
    
    -- Add auto_dismiss_seconds column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'announcements' AND column_name = 'auto_dismiss_seconds') THEN
        ALTER TABLE announcements ADD COLUMN auto_dismiss_seconds INTEGER;
    END IF;
    
    -- Add target_audience column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'announcements' AND column_name = 'target_audience') THEN
        ALTER TABLE announcements ADD COLUMN target_audience TEXT DEFAULT 'all';
    END IF;
END $$;

-- The maintenance_mode table already exists and has the correct structure

-- Insert default maintenance record if none exists
INSERT INTO maintenance_mode (is_active, title, message) 
SELECT false, 'Scheduled Maintenance', 'We are currently performing scheduled maintenance. Please check back soon.'
WHERE NOT EXISTS (SELECT 1 FROM maintenance_mode);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority DESC);

-- Enable RLS (Row Level Security) if not already enabled
DO $$
BEGIN
    -- Check if RLS is already enabled for announcements
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE c.relname = 'announcements' AND n.nspname = 'public' AND c.relrowsecurity = true) THEN
        ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Check if RLS is already enabled for maintenance_mode
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
                   WHERE c.relname = 'maintenance_mode' AND n.nspname = 'public' AND c.relrowsecurity = true) THEN
        ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create policies for public access (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to announcements" ON announcements;
DROP POLICY IF EXISTS "Allow public read access to maintenance" ON maintenance_mode;
DROP POLICY IF EXISTS "Allow admin full access to announcements" ON announcements;
DROP POLICY IF EXISTS "Allow admin full access to maintenance" ON maintenance_mode;

-- Create new policies
CREATE POLICY "Allow public read access to announcements" ON announcements 
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read access to maintenance" ON maintenance_mode 
  FOR SELECT USING (true);

-- Allow full access for admin operations
CREATE POLICY "Allow admin full access to announcements" ON announcements 
  FOR ALL USING (true);

CREATE POLICY "Allow admin full access to maintenance" ON maintenance_mode 
  FOR ALL USING (true);
