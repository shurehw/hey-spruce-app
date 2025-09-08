-- Setup user profile for your test user
-- First, get the test user's ID
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'test@example.com';

-- Insert user profile for test user (replace the ID with actual value from above)
INSERT INTO users (id, email, name, role)
SELECT 
    id, 
    email, 
    'Test User',
    'client'  -- or 'admin' if you want to test admin features
FROM auth.users 
WHERE email = 'test@example.com'
ON CONFLICT (id) DO UPDATE 
SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- Verify it worked
SELECT * FROM users WHERE email = 'test@example.com';

-- Now you can login with test@example.com / test123