-- Fix for foreign key constraint error
-- Check and drop existing tables if they have wrong types

-- First, drop tables that depend on locations
DROP TABLE IF EXISTS rfps CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS assets CASCADE;

-- Now drop and recreate locations with correct type
DROP TABLE IF EXISTS locations CASCADE;

-- Recreate locations table with UUID type
CREATE TABLE locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    active_work_orders INTEGER DEFAULT 0,
    total_assets INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now create RFPs table with proper foreign key
CREATE TABLE rfps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rfp_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location_id UUID REFERENCES locations(id),
    location_name TEXT,
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    due_date DATE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled')),
    requirements JSONB,
    attachments TEXT[],
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the rest of the tables
CREATE TABLE quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number TEXT UNIQUE NOT NULL,
    rfp_id UUID REFERENCES rfps(id),
    work_order_id UUID,
    client_name TEXT,
    location_id UUID REFERENCES locations(id),
    type TEXT CHECK (type IN ('client', 'subcontractor')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    line_items JSONB,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    valid_until DATE,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    work_order_id UUID,
    quote_id UUID REFERENCES quotes(id),
    client_name TEXT NOT NULL,
    location_id UUID REFERENCES locations(id),
    amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
    payment_terms TEXT,
    line_items JSONB,
    notes TEXT,
    paid_date DATE,
    payment_method TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcontractors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    specialization TEXT[],
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    total_jobs INTEGER DEFAULT 0,
    active_jobs INTEGER DEFAULT 0,
    insurance_verified BOOLEAN DEFAULT false,
    license_number TEXT,
    license_expiry DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    location_id UUID REFERENCES locations(id),
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    warranty_expiry DATE,
    last_maintenance DATE,
    next_maintenance DATE,
    maintenance_schedule TEXT,
    status TEXT DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'repair', 'retired')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_techs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    specialization TEXT[],
    certification TEXT[],
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'on_site', 'off_duty', 'vacation')),
    current_jobs INTEGER DEFAULT 0,
    completed_jobs INTEGER DEFAULT 0,
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    hire_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    size BIGINT,
    url TEXT,
    category TEXT,
    description TEXT,
    tags TEXT[],
    uploaded_by TEXT,
    shared_with TEXT[],
    version INTEGER DEFAULT 1,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_order_id UUID,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    location_id UUID REFERENCES locations(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    response TEXT,
    responded_by TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER,
    category TEXT NOT NULL,
    allocated_amount DECIMAL(10,2) NOT NULL,
    spent_amount DECIMAL(10,2) DEFAULT 0,
    remaining_amount DECIMAL(10,2) GENERATED ALWAYS AS (allocated_amount - spent_amount) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(year, month, category)
);

-- Enable Row Level Security for all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfps ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_techs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now - tighten in production)
CREATE POLICY "Enable all for locations" ON locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for rfps" ON rfps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for quotes" ON quotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for subcontractors" ON subcontractors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for assets" ON assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for field_techs" ON field_techs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for feedback" ON feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for budgets" ON budgets FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rfps_status ON rfps(status);
CREATE INDEX IF NOT EXISTS idx_rfps_due_date ON rfps(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_next_maintenance ON assets(next_maintenance);

-- Insert sample data for testing
INSERT INTO locations (name, address, city, state, zip, contact_name, contact_phone, active_work_orders, total_assets) VALUES
    ('Seattle Downtown', '1234 Main Street', 'Seattle', 'WA', '98101', 'John Manager', '(206) 555-0101', 12, 24),
    ('Bellevue Main St', '5678 Commerce Ave', 'Bellevue', 'WA', '98004', 'Sarah Director', '(425) 555-0102', 8, 18),
    ('Tacoma Pacific Ave', '9876 Pacific Avenue', 'Tacoma', 'WA', '98402', 'Mike Supervisor', '(253) 555-0103', 5, 15)
ON CONFLICT DO NOTHING;

-- Sample RFPs (will now work with proper UUID references)
INSERT INTO rfps (rfp_number, title, description, location_name, budget_min, budget_max, due_date, status) VALUES
    ('RFP-2024-001', 'Kitchen Renovation', 'Complete kitchen renovation including HVAC and plumbing', 'Seattle Downtown', 50000, 75000, CURRENT_DATE + INTERVAL '20 days', 'open'),
    ('RFP-2024-002', 'Office HVAC Upgrade', 'Replace aging HVAC system with energy-efficient model', 'Bellevue Main St', 30000, 45000, CURRENT_DATE + INTERVAL '25 days', 'open')
ON CONFLICT (rfp_number) DO NOTHING;

-- Sample Invoices
INSERT INTO invoices (invoice_number, client_name, amount, total_amount, due_date, status) VALUES
    ('INV-2024-001', 'Seattle Downtown', 5200.00, 5200.00, CURRENT_DATE + INTERVAL '15 days', 'paid'),
    ('INV-2024-002', 'Bellevue Main St', 3800.00, 3800.00, CURRENT_DATE + INTERVAL '20 days', 'pending'),
    ('INV-2024-003', 'Tacoma Pacific Ave', 2400.00, 2400.00, CURRENT_DATE - INTERVAL '5 days', 'overdue')
ON CONFLICT (invoice_number) DO NOTHING;

-- Sample Subcontractors
INSERT INTO subcontractors (company_name, contact_name, email, specialization, rating, active_jobs, status) VALUES
    ('ABC HVAC Services', 'John Smith', 'john@abchvac.com', ARRAY['HVAC', 'Ventilation'], 4.9, 8, 'active'),
    ('Elite Plumbing Co.', 'Sarah Johnson', 'sarah@eliteplumbing.com', ARRAY['Plumbing', 'Pipefitting'], 4.7, 12, 'active'),
    ('ProElectric Solutions', 'Mike Williams', 'mike@proelectric.com', ARRAY['Electrical', 'Lighting'], 4.8, 6, 'active')
ON CONFLICT DO NOTHING;

-- Sample Field Techs
INSERT INTO field_techs (name, email, phone, specialization, status, current_jobs, rating) VALUES
    ('Mike Rodriguez', 'mike.r@hwood.com', '(206) 555-0201', ARRAY['HVAC', 'Refrigeration'], 'available', 3, 4.8),
    ('Lisa Chen', 'lisa.c@hwood.com', '(206) 555-0202', ARRAY['Electrical', 'Controls'], 'on_site', 1, 4.9),
    ('Tom Anderson', 'tom.a@hwood.com', '(206) 555-0203', ARRAY['Plumbing', 'HVAC'], 'available', 2, 4.7)
ON CONFLICT (email) DO NOTHING;

-- Sample Assets
INSERT INTO assets (asset_id, name, type, manufacturer, model, last_maintenance, next_maintenance, status) VALUES
    ('HVAC-001', 'Rooftop HVAC Unit #1', 'HVAC', 'Carrier', '50TCQ', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days', 'operational'),
    ('PLUMB-005', 'Main Water Pump', 'Plumbing', 'Grundfos', 'CR32', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE + INTERVAL '5 days', 'operational'),
    ('ELEC-003', 'Backup Generator', 'Electrical', 'Caterpillar', 'C15', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '75 days', 'operational')
ON CONFLICT (asset_id) DO NOTHING;