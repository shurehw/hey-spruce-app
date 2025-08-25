@echo off
echo Killing any existing node processes...
taskkill /F /IM node.exe 2>nul

echo Starting server...
start /B node server-final.js

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo.
echo Testing API endpoints...
echo.

echo Testing Health Check:
curl -s http://localhost:3000/api/health | python -m json.tool

echo.
echo Creating a vendor:
curl -s -X POST http://localhost:3000/api/vendors -H "Content-Type: application/json" -d "{\"name\":\"Test Vendor\",\"email\":\"vendor@test.com\"}" | python -m json.tool

echo.
echo Creating an invoice:
curl -s -X POST http://localhost:3000/api/invoices -H "Content-Type: application/json" -d "{\"invoice_number\":\"INV-001\",\"vendor\":{\"name\":\"Test Vendor\",\"email\":\"vendor@test.com\"},\"customer\":{\"name\":\"Customer\",\"email\":\"customer@test.com\"},\"items\":[{\"description\":\"Service\",\"quantity\":1,\"price\":100}],\"tax_rate\":0.08}" | python -m json.tool

echo.
echo Testing webhook:
curl -s -X POST http://localhost:3000/api/webhooks/stripe -H "stripe-signature: test" -H "Content-Type: application/json" -d "{\"type\":\"payment_intent.succeeded\",\"data\":{\"object\":{\"id\":\"pi_test\"}}}"

echo.
echo.
echo Server is running! Access the web interface at: http://localhost:3000
echo Press Ctrl+C to stop the server
pause >nul