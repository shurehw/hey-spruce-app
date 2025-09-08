# ✅ Create Demo Accounts - Final Steps

Your test user works perfectly! Now create the demo accounts exactly the same way:

## In Supabase Dashboard → Authentication → Users

### 1. Create Client Demo Account
- Click **"Invite user"** or **"New user"**
- **Email:** `demo.client@heyspruce.com`
- **Password:** `demo123`
- ✅ **Auto Confirm Email** (IMPORTANT!)
- Click Create

### 2. Create Admin Demo Account
- Click **"Invite user"** or **"New user"**
- **Email:** `demo.admin@heyspruce.com`
- **Password:** `demo123`
- ✅ **Auto Confirm Email** (IMPORTANT!)
- Click Create

### 3. Create Subcontractor Demo Account
- Click **"Invite user"** or **"New user"**
- **Email:** `demo.sub@heyspruce.com`
- **Password:** `demo123`
- ✅ **Auto Confirm Email** (IMPORTANT!)
- Click Create

## After Creating Auth Users, Run This SQL:

```sql
-- Get the new user IDs
SELECT id, email FROM auth.users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');

-- Insert user profiles
INSERT INTO users (id, email, name, role)
SELECT 
    id, 
    email,
    CASE 
        WHEN email = 'demo.client@heyspruce.com' THEN 'Demo Client'
        WHEN email = 'demo.admin@heyspruce.com' THEN 'Demo Admin'
        WHEN email = 'demo.sub@heyspruce.com' THEN 'Demo Subcontractor'
    END as name,
    CASE 
        WHEN email = 'demo.client@heyspruce.com' THEN 'client'
        WHEN email = 'demo.admin@heyspruce.com' THEN 'admin'
        WHEN email = 'demo.sub@heyspruce.com' THEN 'client'  -- Use 'client' role for subcontractor
    END as role
FROM auth.users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com')
ON CONFLICT (id) DO UPDATE 
SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- Verify
SELECT email, name, role FROM users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');
```

## Test Each Account

1. Open `test-login.html`
2. Test each demo account to confirm they work
3. Then go to https://openwrench-portal.vercel.app/portal-login

## Success!
Once done, you'll have:
- ✅ Test account: test@example.com / test123
- ✅ Client demo: demo.client@heyspruce.com / demo123
- ✅ Admin demo: demo.admin@heyspruce.com / demo123
- ✅ Subcontractor demo: demo.sub@heyspruce.com / demo123