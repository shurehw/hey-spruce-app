// Script to create demo users in Supabase
// Run this with: node create-demo-users.js

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://uokmehjqcxmcoavnszid.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // You'll need to set this

// Initialize Supabase client with service key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE');

async function createDemoUsers() {
    console.log('Creating demo users...');
    
    const demoUsers = [
        {
            email: 'demo.client@heyspruce.com',
            password: 'demo123',
            full_name: 'Demo Client',
            role: 'client',
            company_name: 'Demo Property Management'
        },
        {
            email: 'demo.admin@heyspruce.com',
            password: 'demo123',
            full_name: 'Demo Admin',
            role: 'admin',
            company_name: 'Hey Spruce Admin'
        },
        {
            email: 'demo.sub@heyspruce.com',
            password: 'demo123',
            full_name: 'Demo Subcontractor',
            role: 'subcontractor',
            company_name: 'Demo Landscaping Co'
        }
    ];

    for (const user of demoUsers) {
        try {
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: {
                    full_name: user.full_name,
                    role: user.role,
                    company_name: user.company_name
                }
            });

            if (authError) {
                console.error(`Error creating ${user.email}:`, authError.message);
                continue;
            }

            console.log(`✓ Created auth user: ${user.email}`);

            // Create user profile
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    company_name: user.company_name,
                    created_at: new Date().toISOString()
                });

            if (profileError) {
                console.error(`Error creating profile for ${user.email}:`, profileError.message);
            } else {
                console.log(`✓ Created profile for: ${user.email}`);
            }

        } catch (error) {
            console.error(`Failed to create ${user.email}:`, error.message);
        }
    }

    console.log('\nDemo users creation complete!');
    console.log('\nYou can now login with:');
    console.log('Client: demo.client@heyspruce.com / demo123');
    console.log('Admin: demo.admin@heyspruce.com / demo123');
    console.log('Subcontractor: demo.sub@heyspruce.com / demo123');
}

// Run if this file is executed directly
if (require.main === module) {
    createDemoUsers().then(() => process.exit(0));
}

module.exports = { createDemoUsers };