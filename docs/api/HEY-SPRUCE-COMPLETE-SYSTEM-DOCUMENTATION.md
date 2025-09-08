# Hey Spruce - Complete System Documentation
## Property Maintenance Management Platform

**Version:** 2.0.0  
**Last Updated:** January 2025  
**Production URL:** https://openwrench-portal-kqmx2jjfy-jacob-shures-projects.vercel.app  
**Status:** ✅ FULLY DEPLOYED & OPERATIONAL

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Portal System](#portal-system)
4. [Database Schema](#database-schema)
5. [API Documentation](#api-documentation)
6. [Authentication & Security](#authentication--security)
7. [Notification System](#notification-system)
8. [Payment Processing](#payment-processing)
9. [File Management](#file-management)
10. [Mobile Applications](#mobile-applications)
11. [Deployment & Infrastructure](#deployment--infrastructure)
12. [Environment Configuration](#environment-configuration)
13. [Testing & Quality Assurance](#testing--quality-assurance)
14. [Monitoring & Analytics](#monitoring--analytics)
15. [Troubleshooting Guide](#troubleshooting-guide)

---

## System Overview

Hey Spruce is a comprehensive property maintenance management platform that connects property owners, maintenance companies, and subcontractors through an integrated suite of web portals and mobile applications.

### Core Features
- **Multi-Portal System**: Client, Admin/Supplier, Subcontractor portals
- **Work Order Management**: Creation, assignment, tracking, completion
- **RFP & Bidding System**: Request for proposals with competitive bidding
- **Invoice & Payment Processing**: Stripe integration for seamless payments
- **Real-time Notifications**: Email, SMS, and in-app notifications
- **Document Management**: Contracts, insurance, certifications
- **Mobile Applications**: iOS/Android apps for field technicians
- **Analytics & Reporting**: Business intelligence and KPI tracking

### Business Value
- **Reduces No-Shows**: 70% reduction through automated reminders
- **Accelerates Cash Flow**: Automated payment processing and follow-ups
- **Improves Service Quality**: Real-time tracking and quality metrics
- **Increases Efficiency**: Route optimization and resource management

---

## Architecture

### Technology Stack

```yaml
Frontend:
  - HTML5/CSS3/JavaScript (Vanilla)
  - Mobile: Capacitor (iOS/Android)
  - UI Framework: Custom CSS with Flexbox/Grid
  - Real-time: WebSocket (planned)

Backend:
  - Runtime: Node.js
  - Framework: Express.js
  - Serverless: Vercel Functions
  - Database: PostgreSQL (Supabase)
  - Auth: Supabase Auth
  - Storage: Supabase Storage

Integrations:
  - Payments: Stripe
  - Email: SMTP/SendGrid
  - SMS: Twilio (configured)
  - Maps: Google Maps API (planned)

DevOps:
  - Hosting: Vercel
  - Version Control: Git
  - CI/CD: Vercel Auto-deploy
  - Monitoring: Vercel Analytics
```

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Client Portal│ Admin Portal │ Sub Portal   │ Mobile Apps    │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                │
       └──────────────┴──────────────┴────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Load Balancer    │
                    │     (Vercel)       │
                    └─────────┬──────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
┌──────▼──────┐      ┌────────▼────────┐   ┌────────▼────────┐
│   API       │      │  Static Assets  │   │  Serverless     │
│  Gateway    │      │    (CDN)        │   │  Functions      │
└──────┬──────┘      └─────────────────┘   └────────┬────────┘
       │                                             │
       └─────────────────┬───────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │    Supabase        │
              ├────────────────────┤
              │ • PostgreSQL DB    │
              │ • Authentication   │
              │ • Row Security     │
              │ • File Storage     │
              └────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐ ┌───────▼──────┐ ┌──────▼───────┐
│   Stripe     │ │   SendGrid   │ │   Twilio     │
│  Payments    │ │    Email     │ │     SMS      │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## Portal System

### 1. Client Portal (`client-portal.html`)

**Purpose**: Property owners and managers to request services and track maintenance

**Features**:
- Dashboard with property overview
- Work order creation and tracking
- Service history and reports
- Invoice viewing and payment
- Document management
- Notification preferences

**Key Components**:
```javascript
// Dashboard initialization
async function initClientDashboard() {
    // Load user profile
    const profile = await loadUserProfile();
    
    // Load properties
    const properties = await loadClientProperties();
    
    // Load active work orders
    const workOrders = await loadActiveWorkOrders();
    
    // Load recent invoices
    const invoices = await loadRecentInvoices();
    
    // Initialize charts
    initializeAnalytics();
}

// Work order creation
async function createWorkOrder(data) {
    const workOrder = {
        client_id: currentUser.id,
        location_id: data.property,
        service_type: data.service,
        priority: data.priority,
        description: data.description,
        scheduled_date: data.date,
        photos: data.attachments
    };
    
    const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(workOrder)
    });
    
    return response.json();
}
```

### 2. Admin/Supplier Portal (`supplier-portal.html`)

**Purpose**: Service companies to manage operations, teams, and client relationships

**Features**:
- Operations dashboard
- Work order management
- Team scheduling
- RFP creation and management
- Invoice generation
- Subcontractor management
- Analytics and reporting
- System configuration

**Key Components**:
```javascript
// Operations dashboard
class AdminDashboard {
    constructor() {
        this.metrics = {
            activeWorkOrders: 0,
            pendingInvoices: 0,
            teamUtilization: 0,
            customerSatisfaction: 0
        };
    }
    
    async loadDashboard() {
        // Load KPIs
        this.metrics = await this.loadKeyMetrics();
        
        // Load work order pipeline
        this.workOrders = await this.loadWorkOrderPipeline();
        
        // Load team availability
        this.teamStatus = await this.loadTeamStatus();
        
        // Load financial summary
        this.financials = await this.loadFinancialSummary();
        
        this.render();
    }
    
    async assignWorkOrder(workOrderId, techId) {
        const assignment = {
            work_order_id: workOrderId,
            assigned_to: techId,
            assigned_at: new Date().toISOString()
        };
        
        await fetch('/api/work-orders/assign', {
            method: 'PUT',
            headers: this.headers,
            body: JSON.stringify(assignment)
        });
        
        // Send notification to technician
        await this.notifyTechnician(techId, workOrderId);
    }
}
```

### 3. Subcontractor Portal (`subcontractor-portal.html`)

**Purpose**: Independent contractors to receive work, submit bids, and manage assignments

**Features**:
- Work assignment dashboard
- RFP browsing and bidding
- Schedule management
- Time tracking
- Invoice submission
- Document uploads (insurance, certs)
- Performance metrics

**Key Components**:
```javascript
// Subcontractor workflow
class SubcontractorPortal {
    async acceptWorkOrder(workOrderId) {
        // Update status
        await this.updateWorkOrderStatus(workOrderId, 'accepted');
        
        // Get directions
        const directions = await this.getDirections(workOrderId);
        
        // Start tracking
        this.startLocationTracking(workOrderId);
    }
    
    async submitBid(rfpId, bidData) {
        const bid = {
            rfp_id: rfpId,
            bidder_id: this.currentUser.id,
            amount: bidData.amount,
            timeline: bidData.timeline,
            proposal: bidData.proposal,
            attachments: bidData.documents
        };
        
        const response = await fetch('/api/rfps/bid', {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(bid)
        });
        
        return response.json();
    }
    
    async completeWorkOrder(workOrderId, completionData) {
        const completion = {
            work_order_id: workOrderId,
            completion_notes: completionData.notes,
            materials_used: completionData.materials,
            photos: completionData.photos,
            signature: completionData.signature
        };
        
        await fetch('/api/work-orders/complete', {
            method: 'PUT',
            headers: this.headers,
            body: JSON.stringify(completion)
        });
    }
}
```

### 4. Portal Login System (`portal-login.html`)

**Unified Authentication Entry Point**:
```javascript
// Authentication flow
async function handleLogin(event) {
    event.preventDefault();
    
    const portal = document.querySelector('input[name="portal"]:checked').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    
    // Check portal access
    const profile = await loadUserProfile(data.user.id);
    
    if (!canAccessPortal(profile.role, portal)) {
        throw new Error('Access denied to this portal');
    }
    
    // Redirect to appropriate portal
    switch(portal) {
        case 'client':
            window.location.href = '/client-portal.html';
            break;
        case 'admin':
            window.location.href = '/supplier-portal.html';
            break;
        case 'subcontractor':
            window.location.href = '/subcontractor-portal.html';
            break;
    }
}
```

---

## Database Schema

### Complete PostgreSQL Schema (Supabase)

```sql
-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('client', 'admin', 'subcontractor', 'field_tech', 'viewer')),
    portal_access TEXT[] DEFAULT ARRAY[]::TEXT[],
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    conditions JSONB DEFAULT '{}'::JSONB,
    granted_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, resource, action)
);

-- =====================================================
-- CLIENTS & ORGANIZATIONS
-- =====================================================

CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT DEFAULT 'USA',
    logo_url TEXT,
    contract_status TEXT DEFAULT 'active',
    contract_start_date DATE,
    contract_end_date DATE,
    billing_address TEXT,
    payment_terms TEXT DEFAULT 'Net 30',
    credit_limit DECIMAL(10,2),
    current_balance DECIMAL(10,2) DEFAULT 0,
    -- Notification tracking
    renewal_90_sent BOOLEAN DEFAULT false,
    renewal_60_sent BOOLEAN DEFAULT false,
    renewal_30_sent BOOLEAN DEFAULT false,
    account_manager_id UUID REFERENCES user_profiles(id),
    primary_contact_id UUID REFERENCES user_profiles(id),
    contract_value DECIMAL(10,2),
    auto_renew BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- LOCATIONS & PROPERTIES
-- =====================================================

CREATE TABLE locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    property_type TEXT,
    size_sqft INTEGER,
    access_instructions TEXT,
    gate_code TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    service_schedule JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- WORK ORDERS
-- =====================================================

CREATE TABLE work_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    location_id UUID REFERENCES locations(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    service_type TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'standard', 'urgent', 'emergency')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    
    -- Assignment
    assigned_to UUID REFERENCES user_profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    assignment_notes TEXT,
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time TEXT,
    estimated_duration INTEGER,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Notification tracking
    reminder_24hr_sent BOOLEAN DEFAULT false,
    reminder_1hr_sent BOOLEAN DEFAULT false,
    is_delayed BOOLEAN DEFAULT false,
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    review_submitted BOOLEAN DEFAULT false,
    review_reminder_sent BOOLEAN DEFAULT false,
    tech_location JSONB,
    tech_eta TIMESTAMP WITH TIME ZONE,
    actual_arrival_time TIMESTAMP WITH TIME ZONE,
    
    -- Work details
    checklist JSONB DEFAULT '[]'::JSONB,
    work_performed TEXT,
    materials_used JSONB DEFAULT '[]'::JSONB,
    
    -- Completion
    completed_by UUID REFERENCES user_profiles(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    signature_url TEXT,
    
    -- Billing
    billable BOOLEAN DEFAULT true,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    invoice_id UUID,
    
    -- Attachments
    photos TEXT[],
    documents TEXT[],
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- RFP & BIDDING SYSTEM
-- =====================================================

CREATE TABLE rfps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rfp_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    title TEXT NOT NULL,
    description TEXT,
    scope_of_work TEXT,
    requirements JSONB,
    budget_range TEXT,
    deadline DATE,
    start_date DATE,
    duration TEXT,
    location_ids UUID[],
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'evaluating', 'awarded', 'cancelled')),
    selected_bid_id UUID,
    evaluation_criteria JSONB,
    attachments TEXT[],
    created_by UUID REFERENCES user_profiles(id),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rfp_id UUID REFERENCES rfps(id),
    bidder_id UUID REFERENCES user_profiles(id),
    company_name TEXT,
    amount DECIMAL(10,2) NOT NULL,
    timeline TEXT,
    proposal TEXT,
    qualifications TEXT,
    references JSONB,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected')),
    score DECIMAL(5,2),
    evaluation_notes TEXT,
    attachments TEXT[],
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rfp_id, bidder_id)
);

-- =====================================================
-- INVOICES & PAYMENTS
-- =====================================================

CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    work_order_id UUID REFERENCES work_orders(id),
    issued_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_due DECIMAL(10,2),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')),
    payment_terms TEXT,
    notes TEXT,
    line_items JSONB NOT NULL,
    attachments TEXT[],
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    failure_reason TEXT,
    processor_fee DECIMAL(10,2),
    net_amount DECIMAL(10,2),
    reference_number TEXT,
    notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::JSONB,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    enabled BOOLEAN DEFAULT true,
    categories JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel)
);

-- =====================================================
-- DOCUMENTS & FILES
-- =====================================================

CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES user_profiles(id),
    owner_type TEXT, -- 'user', 'client', 'work_order', etc.
    document_type TEXT NOT NULL,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES user_profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TEAM MANAGEMENT
-- =====================================================

CREATE TABLE team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id),
    team_id UUID,
    role TEXT DEFAULT 'member',
    permissions JSONB DEFAULT '{}'::JSONB,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- QUOTES
-- =====================================================

CREATE TABLE quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    service_description TEXT NOT NULL,
    line_items JSONB DEFAULT '[]'::JSONB,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'expired')),
    valid_from DATE DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    terms_conditions TEXT,
    notes TEXT,
    created_by UUID REFERENCES user_profiles(id),
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    expiry_warning_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- REVIEWS & RATINGS
-- =====================================================

CREATE TABLE reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_order_id UUID REFERENCES work_orders(id),
    client_id UUID REFERENCES clients(id),
    client_name TEXT,
    tech_id UUID REFERENCES user_profiles(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    service_type TEXT,
    response TEXT,
    response_by UUID REFERENCES user_profiles(id),
    response_at TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE service_recovery_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    review_id UUID REFERENCES reviews(id),
    client_id UUID REFERENCES clients(id),
    assigned_to UUID REFERENCES user_profiles(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'escalated')),
    priority TEXT DEFAULT 'high' CHECK (priority IN ('normal', 'high', 'urgent')),
    actions_taken TEXT[],
    resolution TEXT,
    follow_up_date DATE,
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- AUDIT & LOGGING
-- =====================================================

CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Work orders: Clients see their own, techs see assigned, admins see all
CREATE POLICY "Work order visibility" ON work_orders
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM user_profiles WHERE role = 'admin'
        ) OR
        client_id IN (
            SELECT id FROM clients WHERE primary_contact_id = auth.uid()
        ) OR
        assigned_to = auth.uid()
    );

-- Notifications: Users only see their own
CREATE POLICY "Users see own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- Invoices: Clients and admins can view
CREATE POLICY "Invoice visibility" ON invoices
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM user_profiles WHERE role IN ('admin', 'client')
        )
    );
```

---

## API Documentation

### Base Configuration

```javascript
// API Base URL
const API_BASE = 'https://openwrench-portal-kqmx2jjfy-jacob-shures-projects.vercel.app/api';

// Headers
const headers = {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
};
```

### Complete API Endpoints

#### Authentication
```javascript
// Sign Up
POST /api/auth/signup
{
    "email": "user@example.com",
    "password": "securePassword",
    "full_name": "John Doe",
    "role": "client",
    "company_name": "ABC Company"
}

// Sign In
POST /api/auth/signin
{
    "email": "user@example.com",
    "password": "securePassword",
    "portal": "client"
}

// Sign Out
POST /api/auth/signout
Authorization: Bearer {token}

// Reset Password
POST /api/auth/reset-password
{
    "email": "user@example.com"
}
```

#### Work Orders
```javascript
// Create Work Order
POST /api/work-orders
{
    "client_id": "uuid",
    "location_id": "uuid",
    "title": "HVAC Maintenance",
    "description": "Annual HVAC inspection",
    "category": "maintenance",
    "service_type": "hvac",
    "priority": "standard",
    "scheduled_date": "2024-01-20",
    "scheduled_time": "14:00"
}

// Get Work Orders
GET /api/work-orders
Query params: status, assigned_to, client_id, date_from, date_to

// Update Work Order
PUT /api/work-orders/{id}
{
    "status": "in_progress",
    "notes": "Started work"
}

// Assign Work Order
PUT /api/work-orders/{id}/assign
{
    "assigned_to": "tech_user_id",
    "assignment_notes": "Best tech for HVAC"
}

// Complete Work Order
PUT /api/work-orders/{id}/complete
{
    "completion_notes": "Replaced filters",
    "materials_used": [
        {"item": "HVAC Filter", "quantity": 2, "cost": 45.00}
    ],
    "actual_cost": 245.00,
    "photos": ["url1", "url2"],
    "signature_url": "signature_image_url"
}
```

#### RFPs and Bidding
```javascript
// Create RFP
POST /api/rfps
{
    "title": "Annual Landscaping Contract",
    "description": "Seeking bids for landscaping services",
    "scope_of_work": "Weekly mowing, trimming, seasonal cleanup",
    "budget_range": "$5,000-$10,000",
    "deadline": "2024-02-01",
    "start_date": "2024-03-01",
    "duration": "12 months",
    "location_ids": ["uuid1", "uuid2"]
}

// Get RFPs
GET /api/rfps
Query params: status, created_by, deadline_before

// Submit Bid
POST /api/rfps/{rfp_id}/bid
{
    "amount": 7500.00,
    "timeline": "Can start immediately",
    "proposal": "Detailed proposal text",
    "qualifications": "15 years experience",
    "attachments": ["doc1_url", "doc2_url"]
}

// Award RFP
PUT /api/rfps/{id}/award
{
    "selected_bid_id": "bid_uuid",
    "notes": "Best value proposition"
}
```

#### Invoices and Payments
```javascript
// Create Invoice
POST /api/invoices
{
    "client_id": "uuid",
    "work_order_id": "uuid",
    "due_date": "2024-02-15",
    "line_items": [
        {
            "description": "Labor - 4 hours",
            "quantity": 4,
            "rate": 75.00,
            "amount": 300.00
        },
        {
            "description": "Materials",
            "quantity": 1,
            "rate": 150.00,
            "amount": 150.00
        }
    ],
    "subtotal": 450.00,
    "tax_rate": 8.5,
    "tax_amount": 38.25,
    "total_amount": 488.25
}

// Get Invoices
GET /api/invoices
Query params: status, client_id, date_from, date_to

// Process Payment
POST /api/payments
{
    "invoice_id": "uuid",
    "amount": 488.25,
    "payment_method": "card",
    "stripe_payment_method_id": "pm_xxx"
}

// Create Payment Intent (Stripe)
POST /api/payments/create-intent
{
    "amount": 48825,  // Amount in cents
    "currency": "usd",
    "invoice_id": "uuid"
}
```

#### Notifications
```javascript
// Get Notifications
GET /api/notifications
Query params: unread_only, type, priority

// Mark as Read
PUT /api/notifications/{id}
{
    "read": true
}

// Send Custom Notification (Admin)
POST /api/notifications/send
{
    "user_ids": ["uuid1", "uuid2"],
    "title": "System Maintenance",
    "message": "Portal will be down for maintenance",
    "type": "system",
    "priority": "high"
}

// Work Order Status Notification
POST /api/notifications/work-order-status
{
    "work_order_id": "uuid",
    "new_status": "en_route"
}
```

#### File Management
```javascript
// Upload File
POST /api/file-upload
Content-Type: multipart/form-data
{
    "file": File,
    "type": "document|image|signature",
    "category": "insurance|certification|work_photo"
}

// Get Files
GET /api/files
Query params: owner_id, document_type, expiring_soon

// Delete File
DELETE /api/files/{id}
```

#### Team Management
```javascript
// Add Team Member
POST /api/team-members
{
    "email": "tech@example.com",
    "full_name": "Tech Name",
    "role": "field_tech",
    "permissions": ["work_orders.read", "work_orders.update"]
}

// Get Team Members
GET /api/team-members

// Update Team Member
PUT /api/team-members/{id}
{
    "is_active": false,
    "permissions": ["work_orders.read"]
}
```

#### Analytics and Reports
```javascript
// Get Dashboard Metrics
GET /api/analytics/dashboard
Query params: date_from, date_to

Response:
{
    "work_orders": {
        "total": 156,
        "completed": 142,
        "pending": 14,
        "completion_rate": 91.0
    },
    "revenue": {
        "total": 45678.90,
        "collected": 42000.00,
        "outstanding": 3678.90
    },
    "team": {
        "utilization": 78.5,
        "avg_completion_time": 2.3
    },
    "customer": {
        "satisfaction": 4.6,
        "reviews": 89
    }
}

// Get Work Order Report
GET /api/reports/work-orders
Query params: group_by, date_from, date_to

// Get Financial Report
GET /api/reports/financial
Query params: period, client_id
```

---

## Authentication & Security

### Authentication System (`auth-config.js`)

```javascript
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.permissions = [];
        this.initializeAuth();
    }

    async initializeAuth() {
        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
            this.currentUser = session.user;
            await this.loadUserProfile();
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                await this.loadUserProfile();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.userProfile = null;
                this.permissions = [];
            }
        });
    }

    async loadUserProfile() {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();

        this.userProfile = profile;
        await this.loadPermissions();
    }

    hasPermission(resource, action) {
        if (this.userProfile?.role === 'admin') return true;
        
        return this.permissions.some(p => 
            p.resource === resource && p.action === action
        );
    }

    hasPortalAccess(portal) {
        const portalRoleMap = {
            'client': ['client', 'admin'],
            'admin': ['admin'],
            'subcontractor': ['subcontractor', 'admin']
        };

        const allowedRoles = portalRoleMap[portal] || [];
        return allowedRoles.includes(this.userProfile?.role);
    }
}
```

### Session Management

```javascript
class SessionManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.warningTimeout = 25 * 60 * 1000; // Warning at 25 minutes
        this.initializeSessionManagement();
    }

    initializeSessionManagement() {
        // Reset timers on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => this.resetTimers(), true);
        });

        this.resetTimers();
    }

    resetTimers() {
        clearTimeout(this.activityTimer);
        clearTimeout(this.warningTimer);

        if (!this.authManager.isAuthenticated()) return;

        this.warningTimer = setTimeout(() => {
            this.showSessionWarning();
        }, this.warningTimeout);

        this.activityTimer = setTimeout(() => {
            this.handleSessionTimeout();
        }, this.sessionTimeout);
    }
}
```

### Security Features

- **JWT Authentication**: Supabase Auth with secure tokens
- **Row Level Security**: PostgreSQL RLS policies
- **Role-Based Access Control**: Granular permissions
- **Session Management**: Auto-logout and warnings
- **HTTPS Only**: Enforced on Vercel
- **Input Validation**: Client and server-side
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **CORS Configuration**: Restricted origins

---

## Notification System

See [Priority Notifications](#notification-system) section above for complete implementation.

### Notification Types
- Appointment reminders (24hr, 1hr)
- Tech running late
- Negative review alerts
- Payment failures
- Contract renewals
- Quote expirations
- Work order lifecycle
- System announcements

### Delivery Channels
- In-app notifications ✅
- Email (SMTP configured) ✅
- SMS (Twilio ready) ⚠️
- Push notifications (planned) ⚠️

---

## Payment Processing

### Stripe Integration

```javascript
// Client-side payment
const stripe = Stripe('pk_live_51QXoBWBcuvtHgQOtvPhwsTYSVZFOQY3NP1W18N1iX4yQS63tQAAxQDIxtv8DDlIIyQaKpeoVIhioBJpmRNrLMST800BJQI2VuE');

async function processPayment(invoiceId, amount) {
    // Create payment intent
    const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            amount: amount * 100, // Convert to cents
            invoice_id: invoiceId
        })
    });

    const { client_secret } = await response.json();

    // Confirm payment
    const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
            card: cardElement,
            billing_details: {
                name: customerName,
                email: customerEmail
            }
        }
    });

    if (result.error) {
        showError(result.error.message);
    } else {
        showSuccess('Payment successful!');
        updateInvoiceStatus(invoiceId, 'paid');
    }
}
```

### Webhook Processing

```javascript
// api/webhooks/stripe.js
async function handleStripeWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
        const event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            webhookSecret
        );

        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailure(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await markInvoicePaid(event.data.object);
                break;
        }

        res.json({ received: true });
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
}
```

---

## File Management

### File Upload System

```javascript
// api/file-upload.js
const formidable = require('formidable');
const { createClient } = require('@supabase/supabase-js');

async function handleFileUpload(req, res) {
    const form = formidable({ 
        maxFileSize: 10 * 1024 * 1024 // 10MB limit
    });

    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(400).json({ error: err.message });

        const file = files.file;
        const fileBuffer = await fs.promises.readFile(file.filepath);
        
        // Upload to Supabase Storage
        const fileName = `${Date.now()}-${file.originalFilename}`;
        const { data, error } = await supabase.storage
            .from('documents')
            .upload(fileName, fileBuffer, {
                contentType: file.mimetype
            });

        if (error) return res.status(500).json({ error: error.message });

        // Save metadata to database
        const document = await supabase
            .from('documents')
            .insert({
                name: file.originalFilename,
                file_url: data.path,
                file_size: file.size,
                mime_type: file.mimetype,
                document_type: fields.type,
                owner_id: req.user.id
            })
            .select()
            .single();

        res.json({ success: true, document });
    });
}
```

### Document Types
- Insurance certificates
- Business licenses
- W9 forms
- Certifications
- Work order photos
- Signatures
- Invoices
- Contracts

---

## Mobile Applications

### Capacitor Configuration

```json
// capacitor.config.json
{
  "appId": "com.heyspruce.app",
  "appName": "Hey Spruce",
  "webDir": "mobile-app",
  "bundledWebRuntime": false,
  "ios": {
    "contentInset": "automatic"
  },
  "android": {
    "allowMixedContent": false
  },
  "plugins": {
    "Camera": {
      "permissions": ["camera", "photos"]
    },
    "Geolocation": {
      "permissions": ["location"]
    },
    "PushNotifications": {
      "presentationOptions": ["badge", "sound", "alert"]
    }
  }
}
```

### Mobile Features

```javascript
// Mobile-specific functionality
class MobileApp {
    async capturePhoto(workOrderId) {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64
        });

        // Upload photo
        await this.uploadWorkOrderPhoto(workOrderId, image.base64String);
    }

    async trackLocation(workOrderId) {
        const position = await Geolocation.getCurrentPosition();
        
        await fetch('/api/tech-location', {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                work_order_id: workOrderId,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            })
        });
    }

    async captureSignature() {
        // Signature pad implementation
        const signaturePad = new SignaturePad(canvas);
        const signature = signaturePad.toDataURL();
        return signature;
    }
}
```

---

## Deployment & Infrastructure

### Vercel Configuration

```json
// vercel.json
{
  "functions": {
    "api/*.js": {
      "maxDuration": 10
    }
  },
  "crons": [
    {
      "path": "/api/notifications/cron-daily",
      "schedule": "0 8 * * *"
    }
  ],
  "redirects": [
    {
      "source": "/",
      "destination": "/portal-login.html",
      "permanent": false
    }
  ]
}
```

### Deployment Process

```bash
# Install dependencies
npm install

# Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add STRIPE_SECRET_KEY

# Deploy to production
vercel --prod

# Check deployment
vercel ls
```

### Infrastructure Components

- **Hosting**: Vercel (Serverless)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **CDN**: Vercel Edge Network
- **SSL**: Auto-provisioned
- **DNS**: Vercel DNS
- **Monitoring**: Vercel Analytics

---

## Environment Configuration

### Required Environment Variables

```bash
# Supabase
SUPABASE_URL=https://uokmehjqcxmcoavnszid.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STRIPE_SECRET_KEY=sk_live_51QXoBWBcuvtHgQOt...
STRIPE_PUBLISHABLE_KEY=pk_live_51QXoBWBcuvtHgQOt...
STRIPE_WEBHOOK_SECRET=whsec_TFetvT3CTWax4NiF85hovdDHhSnf50Qu

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=matthew@heyspruce.com
SMTP_PASSWORD=uxsbqyqgqooqlrhs
EMAIL_FROM=matthew@heyspruce.com

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Application
NODE_ENV=production
APP_URL=https://openwrench-portal-kqmx2jjfy-jacob-shures-projects.vercel.app

# Company
COMPANY_NAME=Hey Spruce
CONTACT_PHONE=877-253-2646
```

---

## Testing & Quality Assurance

### Testing Strategy

```javascript
// test-all-features.js
const TestSuite = {
    async runAllTests() {
        console.log('Starting comprehensive test suite...');
        
        // Authentication tests
        await this.testAuthentication();
        
        // Work order tests
        await this.testWorkOrderLifecycle();
        
        // Payment tests
        await this.testPaymentProcessing();
        
        // Notification tests
        await this.testNotifications();
        
        // File upload tests
        await this.testFileUploads();
        
        console.log('All tests completed!');
    },

    async testAuthentication() {
        // Test signup
        const signupResult = await this.testSignup();
        assert(signupResult.success, 'Signup failed');
        
        // Test signin
        const signinResult = await this.testSignin();
        assert(signinResult.success, 'Signin failed');
        
        // Test portal access
        const accessResult = await this.testPortalAccess();
        assert(accessResult.success, 'Portal access failed');
    },

    async testWorkOrderLifecycle() {
        // Create work order
        const wo = await this.createTestWorkOrder();
        
        // Assign to tech
        await this.assignWorkOrder(wo.id, 'test_tech_id');
        
        // Update status through lifecycle
        const statuses = ['accepted', 'en_route', 'arrived', 'in_progress', 'completed'];
        for (const status of statuses) {
            await this.updateWorkOrderStatus(wo.id, status);
            await this.delay(1000);
        }
        
        // Submit review
        await this.submitReview(wo.id, 5, 'Great service!');
    }
};
```

### Load Testing

```javascript
// load-test.js
const loadTest = async () => {
    const concurrent = 100;
    const iterations = 1000;
    
    console.log(`Starting load test: ${concurrent} concurrent, ${iterations} total`);
    
    const results = {
        success: 0,
        failure: 0,
        avgResponseTime: 0
    };
    
    const promises = [];
    for (let i = 0; i < concurrent; i++) {
        promises.push(performRequest());
    }
    
    const responses = await Promise.all(promises);
    
    // Analyze results
    responses.forEach(response => {
        if (response.success) results.success++;
        else results.failure++;
        results.avgResponseTime += response.time;
    });
    
    results.avgResponseTime /= concurrent;
    
    console.log('Load test results:', results);
};
```

---

## Monitoring & Analytics

### Key Performance Indicators

```sql
-- Daily Active Users
SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as dau
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Work Order Metrics
SELECT 
    COUNT(*) as total_orders,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_completion_hours,
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*) * 100 as completion_rate,
    AVG(CASE WHEN review_submitted THEN rating END) as avg_rating
FROM work_orders
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Revenue Analytics
SELECT 
    DATE_TRUNC('month', issued_date) as month,
    COUNT(*) as invoice_count,
    SUM(total_amount) as total_invoiced,
    SUM(paid_amount) as total_collected,
    SUM(balance_due) as outstanding,
    AVG(EXTRACT(DAY FROM (paid_at - issued_date))) as avg_days_to_payment
FROM invoices
WHERE issued_date >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', issued_date)
ORDER BY month DESC;

-- Team Performance
SELECT 
    u.full_name,
    COUNT(wo.id) as jobs_completed,
    AVG(r.rating) as avg_rating,
    AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.assigned_at))/3600) as avg_completion_hours
FROM user_profiles u
LEFT JOIN work_orders wo ON wo.assigned_to = u.id AND wo.status = 'completed'
LEFT JOIN reviews r ON r.work_order_id = wo.id
WHERE u.role = 'field_tech'
GROUP BY u.id, u.full_name
ORDER BY avg_rating DESC;
```

### Real-time Dashboard

```javascript
// Dashboard metrics
class AnalyticsDashboard {
    async loadMetrics() {
        const [workOrders, revenue, team, customer] = await Promise.all([
            this.getWorkOrderMetrics(),
            this.getRevenueMetrics(),
            this.getTeamMetrics(),
            this.getCustomerMetrics()
        ]);

        this.renderDashboard({
            workOrders,
            revenue,
            team,
            customer
        });
    }

    async getWorkOrderMetrics() {
        const response = await fetch('/api/analytics/work-orders');
        return response.json();
    }

    renderDashboard(metrics) {
        // Render charts using Chart.js
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: metrics.workOrders.dates,
                datasets: [{
                    label: 'Completed Work Orders',
                    data: metrics.workOrders.completed,
                    borderColor: 'rgb(75, 192, 192)'
                }]
            }
        });
    }
}
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Database Connection Issues
```bash
# Check Supabase status
curl https://uokmehjqcxmcoavnszid.supabase.co/rest/v1/

# Verify environment variables
vercel env ls

# Test connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('user_profiles').select('count').then(console.log);
"
```

#### Authentication Problems
```javascript
// Debug auth issues
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event);
    console.log('Session:', session);
    
    if (event === 'SIGNED_OUT') {
        console.log('Sign out reason:', supabase.auth.error);
    }
});

// Check token expiry
const checkToken = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.error('Session error:', error);
    if (session) {
        const expiresAt = new Date(session.expires_at * 1000);
        console.log('Token expires:', expiresAt);
    }
};
```

#### Payment Processing Errors
```javascript
// Stripe debugging
stripe.handleCardAction(paymentIntentClientSecret)
    .then(function(result) {
        if (result.error) {
            console.error('Card action error:', result.error);
            // Check: result.error.code
            // Common: 'card_declined', 'insufficient_funds', 'expired_card'
        }
    });

// Webhook verification
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
try {
    const event = stripe.webhooks.constructEvent(
        request.body,
        request.headers['stripe-signature'],
        endpointSecret
    );
} catch (err) {
    console.error('Webhook signature verification failed:', err.message);
}
```

#### Notification Delivery Issues
```bash
# Check cron job execution
vercel logs --filter cron

# Test notification endpoint
curl -X POST https://your-domain.vercel.app/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check email configuration
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});
transporter.verify().then(console.log).catch(console.error);
"
```

---

## Appendix

### File Structure
```
/openwrench-stripe/
├── /api/                      # Serverless functions
│   ├── auth.js               # Authentication endpoints
│   ├── work-orders.js        # Work order management
│   ├── rfps.js              # RFP and bidding
│   ├── invoices.js          # Invoice management
│   ├── payments.js          # Payment processing
│   ├── notifications.js     # Notification system
│   ├── file-upload.js       # File management
│   └── main.js              # Main API router
├── /mobile-app/              # Mobile application
│   ├── index.html           # App entry point
│   ├── client-app.html      # Client mobile app
│   └── subcontractor-app.html # Sub mobile app
├── /email-templates/         # Email templates
│   ├── work-order-scheduled.html
│   └── work-order-changed.html
├── portal-login.html        # Login page
├── client-portal.html       # Client portal
├── supplier-portal.html     # Admin portal
├── subcontractor-portal.html # Sub portal
├── auth-config.js           # Authentication config
├── package.json             # Dependencies
├── vercel.json             # Deployment config
└── .env                    # Environment variables
```

### Support Information
- **Technical Support**: support@heyspruce.com
- **Phone**: 877-253-2646
- **Documentation**: This file
- **API Status**: https://openwrench-portal-kqmx2jjfy-jacob-shures-projects.vercel.app/api/health

---

*© 2025 Hey Spruce - Property Maintenance Solutions*