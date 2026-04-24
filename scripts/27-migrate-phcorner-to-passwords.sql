-- Migrate PHCorner usernames table to include password functionality
-- Add password column if it doesn't exist
ALTER TABLE phcorner_usernames 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Update existing records to have empty password initially
UPDATE phcorner_usernames 
SET password = '' 
WHERE password IS NULL;
