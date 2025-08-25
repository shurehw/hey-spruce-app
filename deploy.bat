@echo off
echo ====================================
echo   OpenWrench Stripe Deployment
echo ====================================
echo.

echo This will deploy your app to Vercel.
echo Make sure you have:
echo   1. Logged in to Vercel (vercel login)
echo   2. Your environment variables ready
echo.

echo Press any key to start deployment...
pause >nul

echo.
echo Starting deployment...
vercel --yes

echo.
echo ====================================
echo Deployment complete!
echo.
echo Next steps:
echo 1. Set environment variables in Vercel dashboard
echo 2. Run 'vercel --prod' for production deployment
echo 3. Update Stripe webhook URLs
echo.
echo Check DEPLOY.md for detailed instructions
echo ====================================
pause