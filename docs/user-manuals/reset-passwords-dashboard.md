# Reset Demo Passwords in Supabase Dashboard

Since the SQL shows the emails are confirmed but login still fails with "Invalid login credentials", the passwords need to be reset.

## Steps to Reset Passwords:

1. **Go to Supabase Dashboard**
   - Navigate to **Authentication** → **Users**

2. **For each demo user** (demo.client@, demo.admin@, demo.sub@):
   - Click the **three dots menu** (⋮) on the right
   - Select **"Reset password"**
   - Enter new password: `demo123`
   - Click **"Update"** or **"Save"**

3. **Alternative Method - Send Magic Link**:
   - Click the three dots menu (⋮)
   - Select **"Send magic link"**
   - This sends a passwordless login link (if email is configured)

4. **Nuclear Option - Delete and Recreate**:
   - Delete the user (three dots → Delete)
   - Click **"New user"** or **"Invite"**
   - Email: demo.client@heyspruce.com
   - Password: demo123
   - ✅ Auto Confirm Email
   - Click Create

## Quick Test After Reset:

Open `test-login.html` again and click "Test Login" to verify it works.

## Important Notes:

- The password field in Supabase Dashboard might show dots/asterisks even if no password is set
- Make sure you're in the correct Supabase project (uokmehjqcxmcoavnszid)
- The password must be at least 6 characters (demo123 is fine)

## If Still Not Working:

Try creating a completely new test user:
1. Create user with email: test@example.com
2. Password: test123
3. Auto confirm email
4. Test login with this user first

If the test user works but demo users don't, there might be an issue with how the demo users were created initially.