-- Insert the permanent token for admin access
INSERT INTO access_tokens (
    token_hash,
    token_number,
    expires_at,
    user_ip,
    user_agent,
    is_permanent,
    used_count
) VALUES (
    '356a192b7913b04c54574d18c28d46e6395428ab',  -- SHA256 hash of 'permanent'
    0,
    '2099-12-31 23:59:59+00',  -- Far future date
    'admin',
    'admin',
    TRUE,
    0
) ON CONFLICT (token_hash) DO NOTHING;
