-- Add password column to phcorner_usernames table
ALTER TABLE phcorner_usernames 
ADD COLUMN password TEXT;

-- Create index for faster lookups
CREATE INDEX idx_phcorner_usernames_token_hash ON phcorner_usernames(token_hash);
