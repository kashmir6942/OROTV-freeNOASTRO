-- Delete the "Welcome to ONN?!" announcement from the database
DELETE FROM announcements 
WHERE title = 'Welcome to ONN?!' 
  AND message LIKE '%Enjoy watching your favorite channels%';
