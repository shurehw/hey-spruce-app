@echo off
echo Setting up environment variables for Vercel...
echo.

REM Add Supabase URL
echo Adding SUPABASE_URL...
echo https://uokmehjqcxmcoavnszid.supabase.co | vercel env add SUPABASE_URL production

REM Add Supabase Anon Key
echo Adding SUPABASE_ANON_KEY...
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVva21laGpxY3htY29hdm5zemlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NzgzNzksImV4cCI6MjA1MjQ1NDM3OX0.VmJTh44H1VCCRhLQFPMiXomWNQOQzLqvxqxQw0JX9qo | vercel env add SUPABASE_ANON_KEY production

echo.
echo IMPORTANT: You need the SERVICE_ROLE_KEY from Supabase
echo Visit: https://supabase.com/dashboard/project/uokmehjqcxmcoavnszid/settings/api
echo.
set /p SERVICE_KEY=Enter your SUPABASE_SERVICE_ROLE_KEY: 
echo %SERVICE_KEY% | vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo.
echo Environment variables added! Redeploying...
vercel --prod --yes

echo.
echo Setup complete! Test at: https://openwrench-portal.vercel.app/api/health
pause