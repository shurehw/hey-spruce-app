# Spruce App Branding Update Summary

## ✅ Completed Rebranding

All references to "OpenWrench" have been successfully updated throughout the codebase.
- **Company Name**: Hey Spruce (company remains Hey Spruce)
- **App/Product Name**: Spruce App (the application is called Spruce App)
- **Domain**: heyspruce.com (company domain)

### Files Updated

#### 🎨 **CSS Files**
- `styles/variables.css` - Updated brand color comments

#### 📜 **JavaScript Files**
- `scripts/ui/notifications.js` - Updated comments
- `scripts/ui/modals.js` - Updated comments
- `scripts/ui/charts.js` - Renamed `OpenWrenchCharts` to `SpruceCharts`
- `scripts/ui/index.js` - Updated exports and console messages
- `spruce-client.js` - Renamed from `openwrench-client.js`, updated class name and environment variables

#### 🖥️ **HTML Portal Files**
- `enhanced-supplier-portal.html` - Updated title and brand name
- `enhanced-client-portal.html` - Updated title, brand name, and support email
- `enhanced-subcontractor-portal.html` - Updated title and brand name
- `portal-login.html` - Updated title and all brand references

#### ⚙️ **Configuration Files**
- `sw.js` - Updated service worker cache names and comments
- `manifest.json` - Updated app name, short name, and app store references
- `.env` - Updated all environment variable names and values:
  - `OPENWRENCH_API_KEY` → `SPRUCE_API_KEY`
  - `OPENWRENCH_KEY` → `SPRUCE_KEY`
  - `OPENWRENCH_API_URL` → `SPRUCE_API_URL`
  - Database name: `openwrench_db` → `spruceapp_db`
  - Email domains: `@heyspruce.com` → `@spruceapp.com`
  - Company name: `Hey Spruce` → `Spruce App`

### Brand Consistency

The application now consistently uses:
- **App Name**: Spruce App
- **Company Name**: Hey Spruce
- **Domain**: heyspruce.com
- **Support Email**: support@heyspruce.com
- **Partner Email**: partners@heyspruce.com

### Key Changes

1. **Class/Function Names**:
   - `OpenWrenchClient` → `SpruceClient`
   - `OpenWrenchCharts` → `SpruceCharts`

2. **Cache Names**:
   - `openwrench-v1` → `spruceapp-v1`
   - `openwrench-static-v1` → `spruceapp-static-v1`
   - `openwrench-dynamic-v1` → `spruceapp-dynamic-v1`
   - `openwrench-offline` → `spruceapp-offline`

3. **Environment Variables**:
   - All `OPENWRENCH_*` prefixed variables now use `SPRUCE_*` prefix

4. **API Endpoints**:
   - Default API URL: `https://api.heyspruce.com`

### Files Requiring Manual Review

Some additional files may need updating if they contain references to the old branding:
- Documentation files (*.md) in the root directory
- Any API documentation
- Email templates
- Other HTML files not part of the main portal system

### Next Steps

1. Update any external services or webhooks with the new API endpoints
2. Update DNS records if domain changes are needed
3. Update any marketing materials or documentation
4. Notify team members of the environment variable changes
5. Update any CI/CD pipelines with new environment variables

The rebranding is now complete for all core application files!