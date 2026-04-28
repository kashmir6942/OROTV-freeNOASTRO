-- Add channel_number column to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_number INTEGER;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_channels_channel_number ON channels(channel_number);

-- Auto-populate existing rows with sequential numbers based on creation order
UPDATE channels 
SET channel_number = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num 
  FROM channels
) AS subquery
WHERE channels.id = subquery.id AND channels.channel_number IS NULL;
