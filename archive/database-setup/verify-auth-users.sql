-- Run this in Supabase SQL Editor to verify the auth users exist and are confirmed

-- Check if the demo users exist in auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
        ELSE '❌ NOT Confirmed - This will prevent login!'
    END as email_status,
    last_sign_in_at,
    CASE 
        WHEN last_sign_in_at IS NOT NULL THEN '✅ Has logged in before'
        ELSE '❌ Never logged in'
    END as login_status
FROM auth.users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com')
ORDER BY email;

-- If users don't exist or email is not confirmed, that's the problem
-- To confirm emails manually:
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com')
AND email_confirmed_at IS NULL;

-- Verify the update
SELECT email, email_confirmed_at FROM auth.users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');