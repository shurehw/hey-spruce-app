# Directory Cleanup and Organization Plan

## Current Structure Analysis

### 🔴 Files to DELETE (Not needed)
- `sub.html` - Empty/test file
- `test-sub.html` - Test file
- `test-subcontractor.html` - Test file
- `test-email-template.html` - Test file
- `subcontractor-simple.html` - Replaced by main portal
- `supplier-signup.html` - Old/unused
- `test-login.html` - Test file
- `index.html` - Minimal placeholder
- `proposal-response.html` - Standalone, not integrated
- `email-preview.html` - Test/preview file
- `start-local.js` - Unused starter
- `deploy.bat` - Windows-specific, using Vercel now
- `run-and-test.bat` - Old test script

### 📁 Files to ARCHIVE (SQL/Database Setup)
Move to `/archive/database-setup/`:
- All `.sql` files (30+ files)
- `create-demo-users.js`
- `create-supabase-table.js`
- `supabase-setup.sql`
- Database documentation files

### 📚 Files to ORGANIZE in `/docs/`
- All `.md` documentation files
- `supplier-manual.html`
- Setup guides and manuals

### ✅ CORE FILES to KEEP in root
1. **Main Application Files:**
   - `client-portal.html`
   - `supplier-portal.html`
   - `subcontractor-portal.html`
   - `portal-login.html`

2. **Configuration:**
   - `.env`
   - `.env.example`
   - `.env.production`
   - `vercel.json`
   - `package.json`
   - `package-lock.json`
   - `.gitignore`

3. **Server:**
   - `server-local.js`
   - `spruce-client.js`
   - `sw.js` (service worker)
   - `manifest.json`

4. **Authentication:**
   - `auth-config.js`

### 📂 Existing Folders (Keep organized)
- `/api/` - API endpoints ✅
- `/scripts/` - JavaScript files ✅
- `/styles/` - CSS files ✅
- `/mobile-app/` - Mobile app files ✅
- `/node_modules/` - Dependencies ✅
- `/.git/` - Git repository ✅
- `/.vercel/` - Vercel config ✅

### 📂 New Folder Structure
```
/openwrench-stripe/
├── /api/                    # API endpoints
├── /scripts/                # JavaScript files
├── /styles/                 # CSS files
├── /mobile-app/             # Mobile application
├── /docs/                   # All documentation
│   ├── setup/              # Setup guides
│   ├── api/                # API documentation
│   └── user-manuals/       # User manuals
├── /archive/                # Archived files
│   ├── database-setup/     # SQL files
│   ├── test-files/         # Test HTML/JS
│   └── old-versions/       # Previous versions
├── /public/                 # Public assets
├── /uploads/                # User uploads
├── /utils/                  # Utility functions
├── /email-templates/        # Email templates
└── [core files in root]    # Main HTML, config files

## File Categories Summary

### 🗑️ To Delete (13 files)
- Test files: 7
- Old/unused: 6

### 📦 To Archive (40+ files)
- SQL files: 30+
- Database setup: 5+
- Old implementations: 5+

### 📁 To Organize (15+ files)
- Documentation: 15+ .md files
- Manuals: 2 HTML files

### ✅ Keep in Root (15 files)
- Core portals: 4
- Config: 7
- Server: 4

## Benefits After Cleanup
1. **Cleaner root directory** - Only essential files
2. **Better organization** - Related files grouped
3. **Easier navigation** - Clear folder structure
4. **Reduced confusion** - No duplicate/test files
5. **Professional structure** - Production-ready layout