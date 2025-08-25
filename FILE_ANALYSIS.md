# Project File Analysis

## CORE PRODUCTION FILES ✅ (Keep)
### Main Application
- `server.js` - Main Express server
- `index.js` - Application entry point
- `package.json` & `package-lock.json` - Dependencies
- `vercel.json` - Deployment configuration
- `openwrench-client.js` - API integration

### Core HTML Pages (Currently Used)
- `client-portal.html` - Main client interface (includes service calendar)
- `supplier-portal.html` - Main supplier interface (includes work order calendar)
- `proposal-response.html` - Proposal approval system
- `index.html` - Landing page

### Essential API Routes
- `api/proposal-response.js` - Handles proposal approvals & creates work orders
- `api/send-proposal.js` - Email proposal system
- `api/payment-simple.js` - Payment processing
- `api/invoices-simple.js` - Invoice management
- `api/vendors.js` - Vendor management with email
- `api/webhooks-simple.js` - Webhook handling
- `api/connect.js` - Connection management

### Utilities
- `utils/` folder - PDF generation, Stripe, database, upload utilities
- `public/hey-spruce-logo.png` - Brand logo

## DUPLICATE/REDUNDANT FILES 🔄 (Can Remove)
### Duplicate HTML Files
- `analytics-dashboard.html` vs `analytics-dashboard-fixed.html` - Keep fixed version
- `dashboard.html` vs `dashboard-branded.html` - Keep branded version
- `public/client-portal.html` - Duplicate of root `client-portal.html`
- `public/supplier-portal.html` - Duplicate of root `supplier-portal.html`
- `public/connect.html` - Duplicate of root `connect.html`
- `public/index.html` - Duplicate of root `index.html`

### Unused HTML Pages
- `proposal-builder.html` - Functionality integrated into supplier-portal.html
- `proposal-dashboard.html` - Functionality integrated into supplier-portal.html  
- `proposal-pricing.html` - Functionality integrated into supplier-portal.html
- `work-order-detail.html` - Functionality integrated into supplier-portal.html
- `work-orders-advanced.html` - Functionality integrated into supplier-portal.html
- `connect.html` - Simple connection page, could be integrated
- `navigation-test.html` - Test file

### Duplicate API Files
- `api/invoices.js` vs `api/invoices-simple.js` - Keep simple version
- `api/payment.js` vs `api/payment-simple.js` - Keep simple version
- `api/webhooks.js` vs `api/webhooks-simple.js` - Keep simple version
- `api/vendors-simple.js` vs `api/vendors.js` - Keep full version (has email)
- `api/vendors-stripe-email.js` - Functionality in vendors.js

### Unused API Files
- `api/proposals.js` - Functionality integrated into proposal-response.js
- `api/openwrench-integration.js` - Basic integration, functionality in openwrench-client.js
- `api/vendor-auto-email.js` - Functionality integrated into vendors.js
- `api/webhook-handler.js` - Functionality in webhooks-simple.js
- `api/[...slug].js` - Catch-all, not used
- `api/index.js` - Not used

## TEST FILES 🧪 (Can Remove in Production)
- `test-*.js` files (12 files) - All test scripts
- `test-*.sh` - Shell test scripts
- `test-*.html` - Test HTML templates
- `test-*.pdf` - Test PDF files

## DEVELOPMENT/DEPLOYMENT FILES 📝 (Keep)
- All `.md` files - Documentation (9 files)
- `deploy.bat` & `run-and-test.bat` - Deployment scripts
- `server-final.js` & `start-server.js` - Alternative server configurations

## SEPARATE NEXT.JS PROJECT 🚫 (Can Remove)
- Entire `supplier-portal/` directory - This is a separate Next.js project that's not being used
- The functionality has been integrated into the main `supplier-portal.html` file

## EMPTY/UNUSED
- `nul` - Empty file
- `uploads/` - Directory for uploads (keep structure)

## RECOMMENDATIONS

### HIGH PRIORITY REMOVALS (Safe to delete immediately):
1. **Duplicate public files**: `public/*.html` files
2. **Unused HTML pages**: proposal-builder.html, proposal-dashboard.html, etc.
3. **Test files**: All test-*.* files  
4. **Next.js project**: Entire supplier-portal/ directory
5. **Duplicate API files**: Keep only the working versions
6. **Empty file**: nul

### FILES TO KEEP:
- Core server files (server.js, index.js, package.json, vercel.json)
- Main HTML interfaces (client-portal.html, supplier-portal.html, proposal-response.html, index.html)
- Working API routes (proposal-response.js, send-proposal.js, payment-simple.js, etc.)
- Utilities and documentation
- Brand assets (logo)

This cleanup would reduce the project from ~150+ files to ~30-40 essential files.