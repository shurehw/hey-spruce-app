-- Insert profiles for ALL demo accounts
-- Run this after creating the auth users in Supabase Dashboard

-- First, verify all auth users exist
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com', 'test@example.com')
ORDER BY email;

-- Insert all demo user profiles
INSERT INTO users (id, email, name, role)
SELECT 
    id, 
    email,
    CASE 
        WHEN email = 'demo.client@heyspruce.com' THEN 'Demo Client'
        WHEN email = 'demo.admin@heyspruce.com' THEN 'Demo Admin'
        WHEN email = 'demo.sub@heyspruce.com' THEN 'Demo Subcontractor'
        WHEN email = 'test@example.com' THEN 'Test User'
    END as name,
    CASE 
        WHEN email = 'demo.client@heyspruce.com' THEN 'client'
        WHEN email = 'demo.admin@heyspruce.com' THEN 'admin'
        WHEN email = 'demo.sub@heyspruce.com' THEN 'client'  -- Using 'client' for subcontractor due to constraint
        WHEN email = 'test@example.com' THEN 'client'
    END as role
FROM auth.users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com', 'test@example.com')
ON CONFLICT (id) DO UPDATE 
SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- Verify all profiles were created
SELECT email, name, role, created_at 
FROM users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com', 'test@example.com')
ORDER BY email;

-- Success message
SELECT '✅ All demo accounts are ready!' as status;
SELECT 'Test at: https://openwrench-portal.vercel.app/portal-login' as url;