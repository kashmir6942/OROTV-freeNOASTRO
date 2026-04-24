-- Add missing auto_dismiss_seconds column to announcements table
ALTER TABLE announcements 
ADD COLUMN auto_dismiss_seconds INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN announcements.auto_dismiss_seconds IS 'Number of seconds after which the announcement should auto-dismiss. NULL means manual dismiss only.';
