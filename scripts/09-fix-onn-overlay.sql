-- Disable the "Welcome to ONN" announcement popup to prevent UI blocking
-- This ensures the default announcement loads as a banner only, not as an intrusive overlay
UPDATE announcements 
SET show_popup = false, show_on_home = true, priority = 1
WHERE title = 'Welcome to ONN?!' AND created_by = 'system';
