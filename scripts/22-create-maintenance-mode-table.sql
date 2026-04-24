-- Create maintenance_mode table with custom color support
CREATE TABLE IF NOT EXISTS maintenance_mode (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active BOOLEAN DEFAULT false,
    title TEXT NOT NULL DEFAULT 'Scheduled Maintenance',
    message TEXT NOT NULL DEFAULT 'We are currently performing scheduled maintenance. Please check back soon.',
    custom_color TEXT DEFAULT '#ef4444', -- Default red color
    estimated_duration TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default maintenance record if none exists
INSERT INTO maintenance_mode (is_active, title, message, custom_color) 
SELECT false, 'Scheduled Maintenance', 'We are currently performing scheduled maintenance. Please check back soon.', '#ef4444'
WHERE NOT EXISTS (SELECT 1 FROM maintenance_mode);

-- Enable RLS (Row Level Security)
ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to maintenance" ON maintenance_mode 
  FOR SELECT USING (true);

-- Allow full access for admin operations
CREATE POLICY "Allow admin full access to maintenance" ON maintenance_mode 
  FOR ALL USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_mode_active ON maintenance_mode(is_active);
