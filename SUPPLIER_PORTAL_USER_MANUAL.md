# Hey Spruce Supplier Portal - User Manual

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Complete Workflow Guide](#complete-workflow-guide)
4. [RFPs & Bid Management](#rfps--bid-management)
5. [Quote Management](#quote-management)
6. [Work Order Management](#work-order-management)
7. [Invoice & Payment Processing](#invoice--payment-processing)
8. [Vendor & Subcontractor Management](#vendor--subcontractor-management)
9. [Preventative Maintenance](#preventative-maintenance)
10. [Settings & Configuration](#settings--configuration)

---

## 1. Getting Started

### Accessing the Portal
- **URL**: Your dedicated portal URL (e.g., https://your-company.useopenwrench.com)
- **Login**: Use your email and password
- **First Time Setup**: Complete profile and Stripe onboarding

### Navigation Overview
The left sidebar follows the natural workflow:
1. **RFPs & Bid Requests** - New service requests
2. **Quotes & Proposals** - Quote management
3. **Work Orders** - Active jobs
4. **Invoices & Payments** - Financial management

---

## 2. Dashboard Overview

### Key Metrics
The dashboard displays real-time metrics:
- **Active Work Orders**: Currently in progress
- **Pending Quotes**: Awaiting client approval
- **Monthly Revenue**: Total earnings this month
- **Completed Jobs**: Finished work orders

### Pipeline Overview
Visual representation of work order stages:
- **New (5)** - Newly created work orders
- **Scheduled (8)** - Assigned and scheduled
- **In Progress (3)** - Currently being worked on
- **Review (2)** - Pending review/approval
- **Completed (12)** - Finished work orders

**Tip**: Click any pipeline number to filter work orders by that stage.

### Recent Activity Feed
- Real-time updates on all operations
- New RFPs, bid awards, work order updates
- Payment notifications

---

## 3. Complete Workflow Guide

### Service Lifecycle
```
Client Request → RFP → Vendor Bids → Quote → Work Order → Completion → Invoice → Payment
```

### Step-by-Step Process

#### Step 1: RFP Arrives
1. New service request appears in **RFPs & Bid Requests**
2. Review requirements and budget
3. Click **"Send to Bidders"** to invite vendors

#### Step 2: Manage Bids
1. Select qualified vendors from your network
2. Set bid deadline
3. Vendors submit competitive bids
4. Compare all bids side-by-side

#### Step 3: Create Quote
1. Select winning bid
2. Adjust platform fee (default 15%)
3. Add any additional costs
4. Send quote to client for approval

#### Step 4: Execute Work Order
1. Approved quote converts to work order
2. Assign technician or vendor
3. Track progress through completion
4. Generate invoice upon completion

---

## 4. RFPs & Bid Management

### Viewing RFPs

#### Incoming RFPs Tab
Shows new service requests from clients.

**Table Columns**:
- **RFP #**: Unique identifier
- **Client**: Requesting client
- **Service Type**: Category of work
- **Location**: Service location
- **Budget Range**: Client's budget
- **Deadline**: Response deadline
- **Status**: New, Bidding Open, Closed
- **Actions**: View, Send to Bidders

#### Sending RFP to Vendors

1. Click **"Send to Bidders"** button
2. **Select Vendors**:
   - Check vendors qualified for the service
   - System shows ratings and specializations
   - Preferred vendors marked with star
3. **Set Parameters**:
   - Bid submission deadline
   - Special requirements
   - Additional instructions
4. Click **"Send to Selected Vendors"**

### Managing Bids

#### Viewing Submitted Bids
1. Click **"View Bids"** on an RFP
2. See all submitted bids with:
   - Company information
   - Price and timeline
   - Ratings and verification status
   - Expandable detailed breakdown

#### Bid Details Include:
- **Company Information**:
  - License number
  - Insurance coverage
  - Years of experience
  - Completed jobs count
- **Cost Breakdown**:
  - Labor costs (itemized by role)
  - Materials & parts (with quantities)
  - Additional costs
  - Total bid amount
- **Availability**: When work can be performed

#### Selecting a Bid
1. Click **"Select"** on chosen bid
2. **Review Selection**:
   - Bid amount
   - Platform fee (adjustable)
   - Processing fee (optional)
   - Total client cost
3. Click **"Confirm Selection"**
4. Quote automatically generated for client

---

## 5. Quote Management

### Quote Types

#### Client Quotes
Quotes sent to clients for approval.

**Features**:
- Track approval status
- Set expiration dates
- Include terms and conditions
- Digital signature capture

#### Vendor Quotes
Quotes received from subcontractors.

**Management**:
- Compare multiple quotes
- Track validity periods
- Convert to work orders

### Proposal Builder
Create comprehensive service proposals.

**Components**:
- Service description
- Detailed pricing
- Timeline
- Terms and conditions
- Supporting documents

### Platform Fee Management
- **Default**: 15% of service cost
- **Adjustable**: Can be modified per quote
- **Calculation**: Automatic with live updates
- **Display**: Transparent to all parties

---

## 6. Work Order Management

### Creating Work Orders

#### Method 1: Quick Create
1. Click **"+ Create Work Order"**
2. Fill required fields:
   - Client/Location
   - Priority level
   - Service category & type
   - Description
   - Requested date
3. Choose assignment method:
   - **Auto-Assign**: System selects best available
   - **Specific Vendor**: Choose from list
   - **Request Bids**: Get multiple quotes

#### Method 2: From Approved Quote
- Automatically creates work order
- Pre-populated with quote details
- Immediate assignment to selected vendor

### Work Order Views

#### List View
Traditional table format with filters:
- Status filter
- Date range
- Location
- Priority
- Assigned vendor

#### Calendar View
Visual scheduling interface:
- **Month View**: Overview of all work orders
- **Week View**: Detailed weekly schedule
- **Day View**: Hour-by-hour timeline

**Features**:
- Drag-and-drop rescheduling
- Color-coded by status
- Click to view details

### Work Order Lifecycle

#### Status Progression
1. **Scheduled**: Initial state
2. **Tech En Route**: Technician dispatched
3. **In Progress**: Work started
4. **Completed**: Work finished
5. **Invoiced**: Invoice generated

#### Check-In/Check-Out Process

**Check-In**:
1. Tech clicks **"Check In"** upon arrival
2. System records arrival time
3. Status updates to "In Progress"

**Check-Out & Completion**:
1. Click **"Check Out"** when finished
2. Complete work summary:
   - Work performed description
   - Parts & materials used
   - Labor hours
   - Photos (optional)
3. Capture customer signature
4. Generate invoice automatically

### Sub-Status Tracking
Detailed progress indicators:
- Parts Ordered
- Waiting for Approval
- Tech Working
- Quality Check
- Ready for Invoice

---

## 7. Invoice & Payment Processing

### Automatic Invoice Generation

When work order is completed:
1. **Invoice Details**:
   - Auto-generated invoice number
   - Work order reference
   - Service details
   - Date and duration

2. **Cost Breakdown**:
   - Labor (hours × rate)
   - Parts & materials
   - Platform fee
   - Subtotal and total

3. **Delivery Options**:
   - Email to client
   - Copy to accounting
   - Request immediate payment

### Invoice Management

**Features**:
- View all invoices
- Track payment status
- Send payment reminders
- Export for accounting
- Generate reports

**Payment Status**:
- Pending
- Partially Paid
- Paid
- Overdue

---

## 8. Vendor & Subcontractor Management

### Subcontractor Portal

#### Adding Subcontractors
1. Click **"+ Add Subcontractor"**
2. Enter company details:
   - Business name
   - Services offered
   - Insurance information
   - License numbers
3. Set platform fee percentage
4. Send Stripe onboarding invite

#### Managing Subcontractors
- Track performance metrics
- View work history
- Manage payment terms
- Update contact information
- Set preferred vendor status

### Bid Management

#### Viewing Vendor Bids
1. Navigate to work order
2. Click **"View Bids"** under Subcontractor section
3. Review expandable bid cards showing:
   - Company profile
   - Detailed cost breakdown
   - Availability
   - Past performance

#### Bid Comparison Features
- Side-by-side comparison
- Sort by price, rating, or response time
- Filter by verified vendors
- View complete bid breakdowns

---

## 9. Preventative Maintenance

### Setting Up Recurring Services

1. Click **"+ Preventative Maintenance"**
2. **Configure Service**:
   - Service type (HVAC, plumbing, etc.)
   - Frequency (weekly to annual)
   - Location and assets
   - Start date and time preference

3. **Assignment Method**:

   **Direct Assignment**:
   - Select specific vendor/tech
   - Set fixed price
   - Configure platform fee
   
   **Request Bids**:
   - Define requirements
   - Set maximum budget
   - Specify bid deadline
   - Select vendor requirements

4. **Additional Settings**:
   - Service description
   - Maintenance checklist
   - Budget per service
   - Auto-approval option

### Managing Recurring Work Orders
- View schedule calendar
- Modify frequency
- Update assigned vendors
- Track completion rates
- Analyze cost trends

---

## 10. Settings & Configuration

### Platform Settings

#### Fee Configuration
- Default platform fee percentage
- Service-specific fees
- Processing fee options
- Vendor-specific rates

#### Notification Preferences
- Email notifications
- SMS alerts
- In-app notifications
- Notification categories:
  - New RFPs
  - Bid updates
  - Work order changes
  - Payment notifications

#### Integration Settings
- Stripe configuration
- Supabase database
- Email service
- SMS gateway

### User Management
- Add team members
- Set role permissions
- Manage access levels
- Track user activity

---

## Quick Reference

### Keyboard Shortcuts
- `Alt + N`: New work order
- `Alt + R`: View RFPs
- `Alt + W`: Work orders list
- `Alt + I`: Invoices
- `Esc`: Close modal

### Common Actions

#### Converting RFP to Work Order
1. RFPs → Select RFP → Send to Bidders
2. View Bids → Select Bid
3. Adjust fees → Confirm
4. Quote sent to client
5. Upon approval → Work order created

#### Completing Work Order
1. Work Orders → Select order
2. Start → Check In
3. Complete work
4. Check Out → Fill completion form
5. Generate Invoice

#### Processing Payments
1. Invoices → Select invoice
2. Record payment
3. Update status
4. Send receipt

---

## Troubleshooting

### Common Issues

**Bids Not Showing**
- Check vendor invitation was sent
- Verify bid deadline hasn't passed
- Ensure vendors are active

**Invoice Not Generating**
- Confirm work order is marked complete
- Check all required fields are filled
- Verify customer signature if required

**Calendar Not Loading**
- Refresh the page
- Check date filters
- Verify work orders have scheduled dates

### Support Resources
- In-app help tooltips
- Email support: support@heyspruce.com
- Documentation: /docs
- Video tutorials: /tutorials

---

## Best Practices

### For Efficient Operations

1. **Daily Tasks**:
   - Review new RFPs each morning
   - Check work order pipeline
   - Process pending invoices
   - Respond to vendor bids

2. **Weekly Tasks**:
   - Review preventative maintenance schedules
   - Analyze bid win rates
   - Check payment status
   - Update vendor ratings

3. **Monthly Tasks**:
   - Generate financial reports
   - Review platform fee revenue
   - Evaluate vendor performance
   - Plan preventative maintenance

### Tips for Success

- **Competitive Bidding**: Always invite 3+ vendors for better pricing
- **Documentation**: Take photos before/after work
- **Communication**: Update work order status in real-time
- **Efficiency**: Use bulk actions when available
- **Quality**: Always get customer signatures

---

## Appendix

### Status Definitions

**RFP Status**:
- **New**: Just received, not yet reviewed
- **Bidding Open**: Sent to vendors for bids
- **Bidding Closed**: Deadline passed
- **Awarded**: Vendor selected

**Work Order Status**:
- **Scheduled**: Assigned and scheduled
- **In Progress**: Currently being worked
- **On Hold**: Temporarily paused
- **Completed**: Work finished
- **Cancelled**: Order cancelled

**Invoice Status**:
- **Draft**: Not yet sent
- **Sent**: Delivered to client
- **Viewed**: Client has viewed
- **Paid**: Payment received
- **Overdue**: Past due date

### Platform Limits
- Maximum vendors per RFP: 20
- Bid validity period: 30 days
- Invoice due period: Net 30 (configurable)
- File upload size: 10MB per file
- Signature pad resolution: 400x150px

---

*Last Updated: January 2025*
*Version: 1.0*
*© Hey Spruce - Integrated Facilities Management Platform*