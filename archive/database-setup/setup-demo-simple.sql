-- Simple SQL script to set up demo users
-- Run this AFTER creating auth users in Supabase Dashboard

-- First, check if auth users exist
SELECT id, email FROM auth.users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');

-- If the above returns 3 rows, continue with this:

-- Create or update user profiles
INSERT INTO users (id, email, full_name, role, company_name)
VALUES 
  -- Replace these UUIDs with actual IDs from the query above
  ('YOUR-CLIENT-UUID-HERE', 'demo.client@heyspruce.com', 'Demo Client User', 'client', 'Demo Property Management'),
  ('YOUR-ADMIN-UUID-HERE', 'demo.admin@heyspruce.com', 'Demo Admin User', 'admin', 'Hey Spruce Admin'),
  ('YOUR-SUB-UUID-HERE', 'demo.sub@heyspruce.com', 'Demo Subcontractor', 'subcontractor', 'Demo Landscaping Co')
ON CONFLICT (id) DO UPDATE
SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  company_name = EXCLUDED.company_name;

-- Alternative: If you want to auto-insert based on existing auth users
-- (Run this if auth users already exist)
DO $$
DECLARE
  client_id UUID;
  admin_id UUID;
  sub_id UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO client_id FROM auth.users WHERE email::text = 'demo.client@heyspruce.com';
  SELECT id INTO admin_id FROM auth.users WHERE email::text = 'demo.admin@heyspruce.com';
  SELECT id INTO sub_id FROM auth.users WHERE email::text = 'demo.sub@heyspruce.com';
  
  -- Insert client profile if ID exists
  IF client_id IS NOT NULL THEN
    INSERT INTO users (id, email, full_name, role, company_name)
    VALUES (client_id, 'demo.client@heyspruce.com', 'Demo Client User', 'client', 'Demo Property Management')
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, company_name = EXCLUDED.company_name;
    
    RAISE NOTICE 'Client profile created/updated';
  END IF;
  
  -- Insert admin profile if ID exists
  IF admin_id IS NOT NULL THEN
    INSERT INTO users (id, email, full_name, role, company_name)
    VALUES (admin_id, 'demo.admin@heyspruce.com', 'Demo Admin User', 'admin', 'Hey Spruce Admin')
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, company_name = EXCLUDED.company_name;
    
    RAISE NOTICE 'Admin profile created/updated';
  END IF;
  
  -- Insert subcontractor profile if ID exists
  IF sub_id IS NOT NULL THEN
    INSERT INTO users (id, email, full_name, role, company_name)
    VALUES (sub_id, 'demo.sub@heyspruce.com', 'Demo Subcontractor', 'subcontractor', 'Demo Landscaping Co')
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, company_name = EXCLUDED.company_name;
    
    RAISE NOTICE 'Subcontractor profile created/updated';
  END IF;
  
  -- Create demo properties for client
  IF client_id IS NOT NULL THEN
    -- Property 1
    INSERT INTO properties (owner_id, address, type, size, status)
    VALUES (client_id, '123 Demo Street, Demo City, DC 12345', 'commercial', 5000, 'active')
    ON CONFLICT DO NOTHING;
    
    -- Property 2
    INSERT INTO properties (owner_id, address, type, size, status)
    VALUES (client_id, '456 Test Avenue, Test Town, TT 67890', 'residential', 2500, 'active')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Demo properties created';
  END IF;
  
  -- Create demo work order
  IF client_id IS NOT NULL AND sub_id IS NOT NULL THEN
    INSERT INTO work_orders (
      property_id,
      client_id,
      assigned_vendor_id,
      title,
      description,
      status,
      priority,
      service_type,
      scheduled_date
    )
    SELECT 
      p.id,
      client_id,
      sub_id,
      'Lawn Maintenance',
      'Weekly lawn mowing and trimming',
      'in_progress',
      'normal',
      'landscaping',
      NOW() + INTERVAL '2 days'
    FROM properties p
    WHERE p.owner_id = client_id
    LIMIT 1;
    
    RAISE NOTICE 'Demo work order created';
  END IF;
END $$;

-- Verify the setup
SELECT 'Setup complete! Created users:' as message;
SELECT email, full_name, role, company_name FROM users 
WHERE email IN ('demo.client@heyspruce.com', 'demo.admin@heyspruce.com', 'demo.sub@heyspruce.com');