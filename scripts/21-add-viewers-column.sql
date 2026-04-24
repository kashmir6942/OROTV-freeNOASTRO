-- Add viewers column to access_tokens table
ALTER TABLE access_tokens 
ADD COLUMN IF NOT EXISTS viewers INTEGER DEFAULT 0;

-- Update existing tokens to have 0 viewers
UPDATE access_tokens SET viewers = 0 WHERE viewers IS NULL;

-- Create index for better performance on viewers queries
CREATE INDEX IF NOT EXISTS idx_access_tokens_viewers ON access_tokens(viewers);
