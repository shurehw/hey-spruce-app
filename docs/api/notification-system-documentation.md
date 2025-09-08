# Hey Spruce Notification System Documentation

## Current Notification Implementation

### Notification Types Currently Implemented

#### 1. **Work Order Notifications** (`type: 'work_order'`)
- **New Work Order Created** - Sent to assigned subcontractor
  - Title: "New Work Order Assignment"
  - Message: Details about the work order
  - Priority: Based on work order priority
  - Action URL: Link to work order details

- **Work Order Status Changed** - Sent to relevant parties
  - Title: "Work Order Status Update"
  - Message: Status change details
  - Data: Includes work_order_id, old_status, new_status

- **Work Order Reassigned** - Sent to new assignee
  - Title: "Work Order Reassigned to You"
  - Message: Assignment details
  - Priority: Standard or urgent based on WO priority

#### 2. **RFP/Bidding Notifications** (`type: 'rfp'`)
- **New RFP Published** - Sent to all eligible subcontractors
  - Title: "New RFP Available"
  - Message: RFP title and brief description
  - Action URL: Link to RFP details page
  - Priority: Normal

- **New Bid Received** - Sent to RFP creator/admin
  - Title: "New Bid Submitted"
  - Message: Bidder name and RFP title
  - Data: Includes rfp_id, bid_id, bidder_name
  - Priority: Normal

- **Bid Awarded** - Sent to winning subcontractor
  - Title: "Congratulations! Your Bid Was Selected"
  - Message: RFP details and next steps
  - Data: Includes rfp_id, bid_amount
  - Priority: High

#### 3. **Invoice/Payment Notifications** (`type: 'invoice'`)
- **Payment Received** - Sent to invoice creator
  - Title: "Payment Received"
  - Message: Payment amount and invoice number
  - Data: Includes invoice_id, payment_amount, payment_method
  - Priority: Normal

- **Invoice Submitted** - Sent to client/admin
  - Title: "New Invoice Submitted"
  - Message: Invoice details and amount
  - Action URL: Link to invoice review
  - Priority: Normal

- **Invoice Overdue** - Sent to client
  - Title: "Invoice Overdue"
  - Message: Overdue invoice details
  - Priority: High

#### 4. **System Notifications** (`type: 'system'`)
- **General System Updates**
  - Maintenance announcements
  - Feature updates
  - Policy changes
  - Priority: Varies (low to urgent)

#### 5. **Message Notifications** (`type: 'message'`)
- **New Direct Message**
- **New Group Message**
- **Message in Work Order Thread**
- Priority: Normal

### Notification Types NOT Yet Implemented (But Needed)

#### 6. **User Management Notifications** (`type: 'user'`)
- **New User Registration** ❌
  - To: Admin
  - Title: "New User Registration"
  - Message: "{user_name} has registered for {portal_type} access"
  - Data: user_id, email, company_name, role
  - Priority: Normal

- **User Account Activated** ❌
  - To: User
  - Title: "Account Activated"
  - Message: "Your account has been activated. You can now access the portal."

- **User Role Changed** ❌
  - To: User
  - Title: "Your Role Has Been Updated"
  - Message: "Your role has been changed to {new_role}"

- **Password Reset Request** ❌
  - To: User
  - Title: "Password Reset Requested"
  - Priority: High

#### 7. **Location/Property Notifications** (`type: 'location'`)
- **New Location Added** ❌
  - To: Relevant subcontractors
  - Title: "New Property Added to Your Service Area"
  - Message: Property details and address
  - Data: location_id, address, client_name

- **Location Service Schedule Changed** ❌
  - To: Assigned subcontractors
  - Title: "Service Schedule Updated"
  - Message: New schedule details

#### 8. **Equipment/Asset Notifications** (`type: 'equipment'`)
- **Equipment Maintenance Due** ❌
  - To: Property manager, assigned tech
  - Title: "Equipment Maintenance Required"
  - Priority: High

- **Equipment Failure Reported** ❌
  - To: Admin, assigned tech
  - Title: "Equipment Failure Alert"
  - Priority: Urgent

#### 9. **Document Notifications** (`type: 'document'`)
- **Document Expiring** ❌
  - To: Subcontractor
  - Title: "Document Expiring Soon"
  - Message: "Your {document_type} expires in {days} days"
  - Priority: High

- **Document Uploaded** ❌
  - To: Admin
  - Title: "New Document Uploaded"
  - Message: "{user_name} uploaded {document_type}"

#### 10. **Team Management Notifications** (`type: 'team'`)
- **New Team Member Added** ❌
  - To: Team members
  - Title: "New Team Member"
  - Message: "{member_name} has joined your team"

- **Team Member Removed** ❌
  - To: Removed member
  - Title: "Team Access Removed"

### Notification Channels

#### Currently Implemented:
1. **In-App Notifications** ✅
   - Stored in database
   - Real-time badge updates
   - Notification center in portal

#### Partially Implemented:
2. **Email Notifications** ⚠️
   - Code structure exists
   - Not fully integrated with email service
   - Needs SMTP/SendGrid configuration

3. **Push Notifications** ⚠️
   - Placeholder code exists
   - Needs integration with push service
   - Mobile app integration pending

#### Not Implemented:
4. **SMS Notifications** ❌
   - Twilio dependency installed
   - No implementation code

5. **WebSocket Real-time** ❌
   - For instant notification delivery
   - WS dependency installed but not configured

### Notification Preferences System

Users can configure preferences per channel:
```javascript
notification_preferences: {
    email: {
        enabled: true,
        categories: {
            work_orders: true,
            invoices: true,
            rfps: true,
            messages: true,
            system: true
        }
    },
    sms: {
        enabled: false,
        categories: {...}
    },
    push: {
        enabled: true,
        categories: {...}
    }
}
```

### Priority Levels
- **low** - Informational, no immediate action needed
- **normal** - Standard notifications (default)
- **high** - Important, requires attention soon
- **urgent** - Critical, immediate action required

### Database Schema Support
The `notifications` table includes:
- `user_id` - Recipient
- `type` - Notification category
- `title` - Header text
- `message` - Body content
- `data` - JSON additional data
- `read` - Read status
- `read_at` - Timestamp when read
- `priority` - Urgency level
- `action_url` - Where to navigate when clicked
- `created_at` - Timestamp

### API Endpoints
- `GET /api/notifications` - Fetch user notifications
- `POST /api/notifications` - Create notification (admin only)
- `PUT /api/notifications` - Mark as read/unread
- `DELETE /api/notifications` - Delete notifications

### Implementation Status Summary

✅ **Fully Implemented:**
- Work Order notifications
- RFP/Bid notifications
- Invoice/Payment notifications
- In-app notification system
- Notification preferences structure
- Database schema

⚠️ **Partially Implemented:**
- Email notifications (structure only)
- Push notifications (placeholder)
- System notifications

❌ **Not Implemented:**
- New user registration notifications
- Location/property notifications
- Equipment/asset notifications
- Document expiry notifications
- Team management notifications
- SMS notifications
- Real-time WebSocket delivery

### Recommended Next Steps

1. **Immediate Priority:**
   - Implement new user registration notifications
   - Add location/property change notifications
   - Complete email integration with SendGrid

2. **Secondary Priority:**
   - Add document expiry tracking and notifications
   - Implement equipment maintenance alerts
   - Add team management notifications

3. **Future Enhancements:**
   - WebSocket real-time delivery
   - SMS notifications via Twilio
   - Push notifications for mobile app
   - Notification templates system
   - Bulk notification scheduling