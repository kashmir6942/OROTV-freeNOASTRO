-- Updated to use tokenno format and proper SHA256 hashes
-- Add permanent tokens for admin and permanent access
INSERT INTO access_tokens (token_hash, token_number, expires_at, user_ip, user_agent, is_permanent, used_count, created_at) VALUES 
(encode(sha256('permanent'::bytea), 'hex'), 0, NULL, '127.0.0.1', 'permanent-access', true, 0, NOW()),
(encode(sha256('salvadoronlyadminpanel'::bytea), 'hex'), 999, NULL, '127.0.0.1', 'admin-access', true, 0, NOW())
ON CONFLICT (token_hash) DO NOTHING;

-- Add admin session entries
INSERT INTO user_sessions (session_id, user_ip, user_agent, last_token_generated, created_at) VALUES 
('permanent-session', '127.0.0.1', 'permanent-access', NOW(), NOW()),
('admin-session', '127.0.0.1', 'admin-access', NOW(), NOW())
ON CONFLICT (session_id) DO NOTHING;
