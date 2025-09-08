# Demo Account Setup Guide for Hey Spruce Portal

## Prerequisites
You need access to your Supabase project dashboard with admin privileges.

## Step 1: Create Authentication Users

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User** → **Create new user**
4. Create each user with these details:

### Demo Client Account
- Email: `demo.client@heyspruce.com`
- Password: `demo123`
- ✅ Check "Auto Confirm Email"

### Demo Admin Account
- Email: `demo.admin@heyspruce.com`
- Password: `demo123`
- ✅ Check "Auto Confirm Email"

### Demo Subcontractor Account
- Email: `demo.sub@heyspruce.com`
- Password: `demo123`
- ✅ Check "Auto Confirm Email"

## Step 2: Get User IDs

After creating the auth users, run this query in SQL Editor to get their IDs:

```sql
SELECT id, email, created_at 
FROM auth.users 
WHERE email IN (
  'demo.client@heyspruce.com', 
  'demo.admin@heyspruce.com', 
  'demo.sub@heyspruce.com'
);
```

Copy the IDs from the results.

## Step 3: Create User Profiles

Replace the UUIDs below with the actual IDs from Step 2, then run:

```sql
-- Insert user profiles (replace UUIDs with actual values from Step 2)
INSERT INTO users (id, email, full_name, role, company_name)
VALUES 
  ('paste-client-id-here', 'demo.client@heyspruce.com', 'Demo Client User', 'client', 'Demo Property Management'),
  ('paste-admin-id-here', 'demo.admin@heyspruce.com', 'Demo Admin User', 'admin', 'Hey Spruce Admin'),
  ('paste-sub-id-here', 'demo.sub@heyspruce.com', 'Demo Subcontractor', 'subcontractor', 'Demo Landscaping Co')
ON CONFLICT (id) DO UPDATE
SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name;
```

## Step 4: Verify Setup

Run this query to confirm everything is set up:

```sql
SELECT u.email, u.full_name, u.role, u.company_name, 
       au.email_confirmed_at, au.last_sign_in_at
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE u.email IN (
  'demo.client@heyspruce.com', 
  'demo.admin@heyspruce.com', 
  'demo.sub@heyspruce.com'
);
```

## Troubleshooting

### Error: "Failed to create user"
- Make sure you're using a valid email format
- Check if the email already exists in auth.users
- Ensure your Supabase project allows new user registration

### Error: "Column does not exist"
First check your table structure:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';
```

If the users table doesn't exist or has different columns, create it:
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Error: "Duplicate key value"
The user already exists. You can either:
1. Delete the existing user and recreate
2. Update the existing user with:
```sql
UPDATE users 
SET full_name = 'Demo Client User', 
    role = 'client', 
    company_name = 'Demo Property Management'
WHERE email = 'demo.client@heyspruce.com';
```

## Testing the Demo Accounts

Once setup is complete, test the accounts at:
https://openwrench-portal.vercel.app/portal-login

1. Click on the demo credentials to auto-fill
2. Select the appropriate portal (Client/Admin/Subcontractor)
3. Click "Sign In"

## Alternative: Use Test Accounts

If you can't create the demo accounts, you can create test accounts with any email:

1. In Supabase Dashboard → Authentication → Users
2. Create a user with any email you control
3. Use a simple password like `test123`
4. Run the SQL to create the user profile with appropriate role

Example:
```sql
INSERT INTO users (id, email, full_name, role, company_name)
SELECT id, email, 'Test User', 'client', 'Test Company'
FROM auth.users 
WHERE email = 'your-test-email@example.com';
```