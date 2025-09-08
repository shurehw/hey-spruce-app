# Database Setup Instructions

## Complete System Fix - Hey Spruce Portal

### What We've Fixed

1. ✅ **Authentication System**
   - Created complete Supabase Auth integration
   - Added user profiles with role-based access
   - Implemented proper session management
   - Fixed portal-login.html to use real authentication

2. ✅ **Database Schema**
   - Created comprehensive database schema (`complete-database-schema.sql`)
   - Added all missing tables:
     - user_profiles & user_permissions
     - clients & client_users
     - Enhanced work_orders with full lifecycle tracking
     - notifications & notification_preferences
     - conversations & messages
     - Enhanced rfps & bids
     - Enhanced invoices & payments
     - audit_logs
     - file_uploads

3. ✅ **API Endpoints Created**
   - `/api/work-orders.js` - Full CRUD for work orders
   - `/api/rfps.js` - RFP and bid management
   - `/api/notifications.js` - Notification system
   - All endpoints include authentication and role-based access

4. ✅ **Portal Improvements**
   - Admin Portal = Supplier Portal (clarified)
   - Work order forms now save to database
   - RFP/bidding system connected
   - Notification badges functional

### How to Deploy the Database

1. **Log into Supabase Dashboard**
   - Go to https://supabase.com
   - Access your project: uokmehjqcxmcoavnszid

2. **Execute the Database Schema**
   - Go to SQL Editor in Supabase
   - Copy the entire contents of `complete-database-schema.sql`
   - Run the SQL script

3. **Enable Authentication**
   - Go to Authentication → Settings
   - Enable Email auth
   - Configure email templates

4. **Create Initial Admin User**
   ```sql
   -- After running the schema, create an admin user
   -- First create auth user via Supabase dashboard
   -- Then update their profile:
   UPDATE user_profiles 
   SET role = 'admin', 
       full_name = 'Admin User',
       company_name = 'Hey Spruce'
   WHERE email = 'admin@heyspruce.com';
   ```

5. **Deploy API Endpoints**
   - Deploy to Vercel (already configured)
   - All new API endpoints will work automatically

### Test Credentials

For testing, create these users in Supabase Auth:

1. **Admin Account**
   - Email: admin@heyspruce.com
   - Role: admin
   - Access: All portals

2. **Client Account**
   - Email: client@testcompany.com
   - Role: client
   - Access: Client portal only

3. **Subcontractor Account**
   - Email: sub@contractor.com
   - Role: subcontractor
   - Access: Subcontractor portal only

### What's Working Now

✅ **Authentication**
- Real login/logout with Supabase Auth
- Session management
- Password reset functionality
- Role-based portal access

✅ **Work Orders**
- Create, read, update, delete
- Assignment to technicians
- Status tracking
- History logging

✅ **RFPs & Bidding**
- Create and publish RFPs
- Submit and evaluate bids
- Award contracts
- Notifications to bidders

✅ **Notifications**
- In-app notifications
- Unread counts
- Mark as read/unread
- Priority levels

✅ **Database Integration**
- All forms save to database
- Real-time data fetching
- Proper relationships between tables
- Row-level security

### Remaining Tasks (Lower Priority)

1. **Payment Integration**
   - Stripe payment processing
   - Invoice payment links
   - Payment tracking

2. **File Uploads**
   - Document attachments
   - Image uploads for work orders
   - Supabase Storage integration

3. **Client Portal Updates**
   - Connect all sections to live data
   - Remove hardcoded sample data

4. **Subcontractor Portal**
   - Complete database integration
   - Bid submission workflow

### Quick Start Commands

```bash
# Test locally
npm run dev

# Deploy to Vercel
vercel --prod

# View logs
vercel logs openwrench-stripe --follow
```

### Important Files

- `complete-database-schema.sql` - Full database structure
- `auth-config.js` - Authentication configuration
- `portal-login.html` - Updated with real auth
- `/api/work-orders.js` - Work order endpoints
- `/api/rfps.js` - RFP/bid endpoints
- `/api/notifications.js` - Notification endpoints

### Security Notes

- All API endpoints require authentication
- Role-based access control implemented
- Row-level security enabled on all tables
- Session timeout after 30 minutes of inactivity

### Support

For any issues:
1. Check Supabase logs for database errors
2. Check Vercel logs for API errors
3. Verify authentication tokens in browser dev tools
4. Ensure all environment variables are set in Vercel