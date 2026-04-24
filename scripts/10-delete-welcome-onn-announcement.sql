-- Delete the "Welcome to ONN?!" announcement that's blocking the UI
DELETE FROM announcements 
WHERE title = 'Welcome to ONN?!' 
  AND message LIKE '%Enjoy watching your favorite channels%'
  AND created_by = 'system';

-- Verify deletion
SELECT * FROM announcements WHERE title = 'Welcome to ONN?!';
