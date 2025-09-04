-- Create work_orders table
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    client_location TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'standard', 'urgent', 'emergency')),
    service_category TEXT NOT NULL,
    service_type TEXT,
    description TEXT,
    scheduled_date DATE,
    scheduled_time TEXT,
    checklist JSONB,
    photos TEXT[],
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_order_number ON work_orders(order_number);

-- Enable Row Level Security
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now
CREATE POLICY "Enable all operations for work_orders" ON work_orders
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create a function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'WO-' || TO_CHAR(NOW(), 'YYYY-') || LPAD(NEXTVAL('work_order_sequence')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Create a sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS work_order_sequence START 1;

-- Insert sample work orders
INSERT INTO work_orders (order_number, client_location, priority, service_category, service_type, description, scheduled_date, status)
VALUES 
    ('WO-2024-00001', 'Seattle Downtown', 'standard', 'hvac', 'Maintenance', 'Regular HVAC maintenance', '2024-01-15', 'in_progress'),
    ('WO-2024-00002', 'Bellevue Main St', 'urgent', 'plumbing', 'Repair', 'Plumbing leak repair needed', '2024-01-18', 'pending')
ON CONFLICT (order_number) DO NOTHING;