-- Fixed column references and ensured tables exist before inserting
-- Insert default stream status for common channels (only after table is created)
INSERT INTO stream_status (channel_id, channel_name, is_failed, custom_message) VALUES
('a2z', 'A2Z', FALSE, 'Technical Difficulties - Please try again later'),
('gma', 'GMA', FALSE, 'Technical Difficulties - Please try again later'),
('abs-cbn', 'ABS-CBN', FALSE, 'Technical Difficulties - Please try again later'),
('tv5', 'TV5', FALSE, 'Technical Difficulties - Please try again later'),
('pbo', 'PBO', FALSE, 'Technical Difficulties - Please try again later'),
('net25', 'NET25', FALSE, 'Technical Difficulties - Please try again later'),
('untv', 'UNTV', FALSE, 'Technical Difficulties - Please try again later'),
('ptv', 'PTV', FALSE, 'Technical Difficulties - Please try again later'),
('gma-news-tv', 'GMA News TV', FALSE, 'Technical Difficulties - Please try again later'),
('cnn-philippines', 'CNN Philippines', FALSE, 'Technical Difficulties - Please try again later')
ON CONFLICT (channel_id) DO NOTHING;

-- Insert default announcement
INSERT INTO announcements (title, message, type, is_active, show_on_home, created_by) VALUES
('Welcome to ONN?!', 'Enjoy watching your favorite channels! Report any issues using the report button.', 'info', TRUE, TRUE, 'system')
ON CONFLICT DO NOTHING;

-- Insert some sample channel replacements for testing
INSERT INTO channel_replacements (original_channel_id, replacement_channel_id, replacement_url, is_active, priority, created_by) VALUES
('a2z', 'a2z-backup', 'https://backup-stream-url.com/a2z', FALSE, 1, 'system'),
('gma', 'gma-backup', 'https://backup-stream-url.com/gma', FALSE, 1, 'system')
ON CONFLICT DO NOTHING;
