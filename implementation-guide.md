# Complete Implementation Guide

## 1. Stripe Payment Processing Setup

### Step 1: Get Stripe API Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create account if needed
3. Get your API keys:
   - Test mode: `sk_test_...` (for development)
   - Live mode: `sk_live_...` (for production)
4. Get webhook signing secret from Webhooks section

### Step 2: Add Stripe Environment Variables
Add to your Vercel environment variables:
```env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
SITE_URL=https://your-domain.vercel.app
```

### Step 3: Install Stripe Package
```bash
npm install stripe formidable
```

### Step 4: Set Up Stripe Webhook
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.vercel.app/api/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

### Step 5: Use Payment Features
```javascript
// In your invoice page, add payment button
async function payInvoice(invoiceId) {
    const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            invoice_id: invoiceId,
            success_url: window.location.origin + '/payment-success',
            cancel_url: window.location.href
        })
    });
    
    const { checkout_url } = await response.json();
    window.location.href = checkout_url; // Redirect to Stripe
}
```

## 2. File Upload Implementation

### Step 1: Create Storage Buckets in Supabase
Go to Supabase Storage and create these buckets:
- `work-orders` - For work order attachments
- `invoices` - For invoice documents
- `rfps` - For RFP documents
- `bids` - For bid proposals
- `profiles` - For user avatars
- `assets` - For asset images
- `documents` - For general documents

Set bucket policies:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view their own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### Step 2: Include File Upload Component
Add to any HTML page where you need uploads:
```html
<!-- Include the file upload component -->
<script src="/file-upload-component.js"></script>

<!-- Create upload container -->
<div id="work-order-uploads"></div>

<script>
// Initialize file uploader
const uploader = new FileUploadManager({
    entityType: 'work_order',
    entityId: 'work-order-id-here',
    acceptedTypes: 'image/*,.pdf',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    onUploadComplete: (files) => {
        console.log('Files uploaded:', files);
        // Update your UI or form
    }
});

// Initialize and create widget
uploader.initialize().then(() => {
    uploader.createUploadWidget('work-order-uploads');
});

// Get uploaded file URLs when submitting form
const fileUrls = uploader.getUploadedFileUrls();
</script>
```

## 3. Client Portal Data Migration

### Update Client Portal to Use Live Data

Replace hardcoded data in `client-portal.html`:

```javascript
// Add to the top of client-portal.html after Supabase init
async function fetchDashboardData() {
    try {
        // Get user's client ID
        const { data: { user } } = await supabase.auth.getUser();
        const { data: clientUser } = await supabase
            .from('client_users')
            .select('client_id')
            .eq('user_id', user.id)
            .single();
        
        if (!clientUser) return null;
        
        // Fetch all data in parallel
        const [workOrders, invoices, locations, assets] = await Promise.all([
            supabase.from('work_orders')
                .select('*')
                .eq('client_id', clientUser.client_id)
                .order('created_at', { ascending: false }),
            
            supabase.from('invoices')
                .select('*')
                .eq('client_id', clientUser.client_id)
                .order('created_at', { ascending: false }),
            
            supabase.from('locations')
                .select('*')
                .eq('client_id', clientUser.client_id),
            
            supabase.from('assets')
                .select('*')
                .in('location_id', locations.data?.map(l => l.id) || [])
        ]);
        
        return {
            workOrders: workOrders.data,
            invoices: invoices.data,
            locations: locations.data,
            assets: assets.data
        };
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return null;
    }
}

// Update getDashboardContent function
function getDashboardContent() {
    fetchDashboardData().then(data => {
        if (!data) return;
        
        // Update dashboard metrics
        document.getElementById('total-work-orders').textContent = data.workOrders.length;
        document.getElementById('pending-invoices').textContent = 
            data.invoices.filter(i => i.status === 'pending').length;
        document.getElementById('total-locations').textContent = data.locations.length;
        document.getElementById('total-assets').textContent = data.assets.length;
        
        // Update charts and tables with real data
        updateDashboardCharts(data);
    });
}
```

## 4. Subcontractor Portal Integration

### Update Subcontractor Portal (`subcontractor-portal.html`)

```javascript
// Add authentication check
window.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = '/portal-login.html';
        return;
    }
    
    // Load user profile
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (profile.role !== 'subcontractor' && profile.role !== 'admin') {
        alert('Access denied');
        window.location.href = '/portal-login.html';
        return;
    }
    
    // Initialize portal with user data
    initializeSubcontractorPortal(user, profile);
});

// Fetch RFPs for bidding
async function fetchAvailableRFPs() {
    const { data: rfps, error } = await supabase
        .from('rfps')
        .select(`
            *,
            location:locations!location_id(name, address),
            bids(count)
        `)
        .eq('status', 'open')
        .order('due_date', { ascending: true });
    
    return rfps || [];
}

// Submit a bid
async function submitBid(rfpId, bidData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const response = await fetch('/api/rfps/bids', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
        },
        body: JSON.stringify({
            rfp_id: rfpId,
            total_amount: bidData.total,
            cost_breakdown: {
                labor: bidData.laborCost,
                materials: bidData.materialsCost,
                overhead: bidData.overhead
            },
            executive_summary: bidData.summary,
            timeline: bidData.timeline,
            submit: true
        })
    });
    
    if (response.ok) {
        showToast('Bid submitted successfully!', 'success');
        closeBidModal();
        refreshRFPList();
    }
}

// Get assigned work orders
async function fetchAssignedWorkOrders() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: workOrders, error } = await supabase
        .from('work_orders')
        .select(`
            *,
            location:locations!location_id(name, address),
            client:clients!client_id(company_name)
        `)
        .eq('assigned_to', user.id)
        .order('scheduled_date', { ascending: true });
    
    return workOrders || [];
}

// Update work order status
async function updateWorkOrderStatus(workOrderId, status) {
    const response = await fetch(`/api/work-orders?id=${workOrderId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
        },
        body: JSON.stringify({ status })
    });
    
    if (response.ok) {
        showToast('Status updated successfully!', 'success');
        refreshWorkOrdersList();
    }
}
```

## 5. Testing Everything

### Test Checklist

#### Authentication
- [ ] Login with different roles (client, admin, subcontractor)
- [ ] Password reset functionality
- [ ] Session timeout after 30 minutes
- [ ] Logout functionality

#### Work Orders
- [ ] Create new work order
- [ ] Assign to technician
- [ ] Update status
- [ ] Add photos/documents
- [ ] View history

#### RFPs & Bidding
- [ ] Create RFP (admin)
- [ ] View open RFPs (subcontractor)
- [ ] Submit bid
- [ ] Evaluate bids (admin)
- [ ] Award contract

#### Payments
- [ ] Create invoice
- [ ] Generate payment link
- [ ] Process payment via Stripe
- [ ] View payment history
- [ ] Process refund (admin)

#### File Uploads
- [ ] Upload images to work order
- [ ] Upload PDF documents
- [ ] Delete uploaded files
- [ ] View file thumbnails

#### Notifications
- [ ] Receive work order assignment notification
- [ ] Receive payment notification
- [ ] Mark notifications as read
- [ ] Clear all notifications

## 6. Deployment Checklist

### Environment Variables (Vercel)
```env
# Supabase
SUPABASE_URL=https://uokmehjqcxmcoavnszid.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Site
SITE_URL=https://your-domain.vercel.app
```

### Database Setup
1. Run `complete-database-schema.sql` in Supabase SQL editor
2. Create storage buckets
3. Set up RLS policies
4. Create initial admin user

### Monitoring
1. Set up Supabase alerts
2. Configure Stripe webhooks
3. Set up error logging (Sentry/LogRocket)
4. Monitor API performance

## 7. Security Checklist

- [ ] All API endpoints require authentication
- [ ] Row Level Security enabled on all tables
- [ ] File upload size limits enforced
- [ ] CORS properly configured
- [ ] Environment variables secure
- [ ] No hardcoded credentials
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Rate limiting on APIs

## Support & Troubleshooting

### Common Issues

1. **Auth not working**: Check Supabase Auth settings and email templates
2. **Payments failing**: Verify Stripe keys and webhook configuration
3. **Files not uploading**: Check storage bucket permissions
4. **Notifications not showing**: Verify notification preferences in database

### Debug Commands
```javascript
// Check current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Check user profile
const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
console.log('User profile:', profile);

// Test API endpoint
fetch('/api/work-orders', {
    headers: {
        'Authorization': `Bearer ${session.access_token}`
    }
}).then(r => r.json()).then(console.log);
```