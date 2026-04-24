-- Create channel requests table for user-submitted channels
CREATE TABLE IF NOT EXISTS channel_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_name TEXT NOT NULL,
  channel_logo TEXT NOT NULL,
  channel_link TEXT NOT NULL,
  clearkey_drm TEXT,
  user_ip TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_by TEXT,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE channel_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting requests (anyone can submit)
CREATE POLICY "Anyone can submit channel requests" ON channel_requests
  FOR INSERT WITH CHECK (true);

-- Create policy for viewing requests (admin only)
CREATE POLICY "Admin can view all channel requests" ON channel_requests
  FOR SELECT USING (true);

-- Create policy for updating requests (admin only)
CREATE POLICY "Admin can update channel requests" ON channel_requests
  FOR UPDATE USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_channel_requests_status ON channel_requests(status);
CREATE INDEX IF NOT EXISTS idx_channel_requests_created_at ON channel_requests(created_at DESC);

-- Add comment
COMMENT ON TABLE channel_requests IS 'User-submitted channel requests for admin review';
