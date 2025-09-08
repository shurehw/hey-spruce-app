#!/bin/bash

# Vercel Environment Variables Setup Script
# Run this script to add all required environment variables to your Vercel project

echo "Setting up environment variables for Vercel..."

# Required Supabase variables (already in your code)
vercel env add SUPABASE_URL production <<< "https://uokmehjqcxmcoavnszid.supabase.co"
vercel env add SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVva21laGpxY3htY29hdm5zemlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NzgzNzksImV4cCI6MjA1MjQ1NDM3OX0.VmJTh44H1VCCRhLQFPMiXomWNQOQzLqvxqxQw0JX9qo"

# You need to get this from Supabase dashboard
echo ""
echo "IMPORTANT: You need to get the SERVICE_ROLE_KEY from:"
echo "https://supabase.com/dashboard/project/uokmehjqcxmcoavnszid/settings/api"
echo ""
echo "Enter your SUPABASE_SERVICE_ROLE_KEY:"
read SERVICE_ROLE_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "$SERVICE_ROLE_KEY"

echo ""
echo "Environment variables added successfully!"
echo "Now redeploying..."
vercel --prod --yes

echo "Setup complete! Test your deployment at:"
echo "https://openwrench-portal.vercel.app/api/health"