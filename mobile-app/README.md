# Hey Spruce Mobile Apps

This directory contains the mobile applications for the Hey Spruce facility management platform.

## 📱 Apps Included

### 1. **Client Portal App** (`client-app.html`)
**Target Users:** Restaurant managers, facility owners, property managers

**Key Features:**
- 📊 Dashboard with work order overview and quick stats
- 📋 Work order management and tracking
- 💬 Real-time messaging with vendors
- 📍 Location management across multiple properties  
- 🔔 Push notifications for updates and emergencies
- ⭐ Quality review and approval workflow
- 📱 Offline capability for viewing work orders

### 2. **Field Tech App** (`subcontractor-app.html`)
**Target Users:** Technicians, subcontractors, field workers

**Key Features:**
- ⏰ Clock in/out with GPS tracking
- 📋 Job assignment and management
- 📸 Photo documentation (before/after)
- ✍️ Digital signatures for job completion
- 🚨 Emergency dispatch button
- 💰 Earnings tracking and job history
- 📍 GPS location verification
- 🔔 Urgent job notifications with sound/vibration
- 📱 Works offline with background sync

### 3. **Supplier Portal** (Web-only)
**Target Users:** Vendors, suppliers, service companies
- Remains as web-based admin interface for comprehensive management

## 🚀 Quick Start

1. **Launch Apps:**
   ```bash
   # Open the app launcher
   open index.html
   
   # Or directly access apps:
   open client-app.html      # For clients
   open subcontractor-app.html  # For field technicians
   ```

2. **Install as PWA:**
   - Open any app in a modern browser
   - Look for "Install App" prompt or menu option
   - Add to home screen for native-like experience

## 🔧 Technical Architecture

### **Progressive Web App (PWA) Features:**
- ✅ Service Worker for offline functionality
- ✅ Web App Manifest for native app experience
- ✅ Push notifications via Web Push API
- ✅ Background sync for data synchronization
- ✅ Add to home screen capability
- ✅ Splash screen and app icons

### **Real-time Communication:**
```javascript
// WebSocket connection for live updates
const syncService = new RealTimeSyncService();
syncService.connect(userId, userType);

// Push notifications
const notificationService = new NotificationService();
await notificationService.subscribe(userType);
```

### **Offline Capabilities:**
- 💾 IndexedDB for local data storage
- 🔄 Background sync when connection restored
- 📱 Cached resources for offline usage
- ⚡ Optimistic UI updates

## 📂 File Structure

```
mobile-app/
├── index.html                 # App launcher/selector
├── client-app.html           # Client portal mobile app
├── subcontractor-app.html    # Field technician app
├── sw.js                     # Service Worker
├── push-notifications.js     # Notification service
├── client-manifest.json      # Client app manifest
├── subcontractor-manifest.json # Field app manifest
├── package.json              # Dependencies and scripts
├── capacitor.config.ts       # Capacitor config (for native builds)
└── README.md                 # This file
```

## 🔔 Push Notifications

### **Client App Notifications:**
- 📋 Work order assigned/completed
- 💰 Quote received
- 🚨 Emergency response updates
- ✅ Quality review requests

### **Field Tech App Notifications:**
- 🔧 New job assignments
- 🚨 Urgent job alerts (with vibration)
- 💰 Payment received confirmations
- ❌ Job cancellations

### **Notification Actions:**
- Quick accept/decline buttons
- Direct call to dispatch
- View work order details
- Emergency acknowledgment

## 📱 Device Features Used

### **Client App:**
- 🔔 Push notifications
- 📱 Add to home screen
- 🔄 Background sync
- 📱 Responsive design

### **Field Tech App:**
- 📸 Camera access for documentation
- 📍 GPS location services
- ⏰ Background app refresh
- 📳 Vibration for urgent alerts
- 🔊 Audio notifications
- ✍️ Touch/stylus input for signatures

## 🛠️ Development Setup

### **Prerequisites:**
```bash
npm install -g @ionic/cli
npm install -g @capacitor/cli
```

### **Install Dependencies:**
```bash
npm install
```

### **Development Server:**
```bash
# Client app
npm run client:serve

# Subcontractor app  
npm run subcontractor:serve

# Or serve both
npm start
```

### **Build for Production:**
```bash
# Build client app
npm run client:build

# Build subcontractor app
npm run subcontractor:build

# Sync with Capacitor
npm run sync
```

## 📱 Native App Builds (Optional)

### **iOS Build:**
```bash
ionic capacitor add ios
ionic capacitor sync ios
ionic capacitor open ios
```

### **Android Build:**
```bash
ionic capacitor add android
ionic capacitor sync android
ionic capacitor open android
```

## 🔐 Security Features

- 🔒 HTTPS required for all features
- 🎫 JWT token authentication
- 📍 Location access only when needed
- 📸 Photos encrypted in transit
- 🔐 Secure Web Push encryption

## 🌐 Browser Support

### **Fully Supported:**
- ✅ Chrome/Chromium (Android/Desktop)
- ✅ Safari (iOS/macOS)
- ✅ Firefox (Android/Desktop)
- ✅ Edge (Windows/Android)

### **Features by Platform:**
| Feature | iOS Safari | Chrome Android | Desktop |
|---------|------------|----------------|---------|
| PWA Install | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ✅ |
| Camera Access | ✅ | ✅ | ✅* |
| GPS Location | ✅ | ✅ | ✅* |
| Background Sync | ❌** | ✅ | ✅ |

*With user permission
**Limited support in iOS

## 🚀 Deployment

### **Web Deployment:**
1. Build apps: `npm run build`
2. Deploy to web server with HTTPS
3. Ensure service worker is served with correct headers
4. Configure Web Push VAPID keys

### **App Store Deployment (Optional):**
1. Build native apps using Capacitor
2. Follow platform-specific submission guidelines
3. Configure deep linking and push certificates

## 📊 Analytics & Monitoring

### **Tracked Events:**
- App installs and usage
- Push notification engagement
- Offline usage patterns
- Feature adoption rates
- Performance metrics

### **Error Monitoring:**
- Service worker errors
- Push notification failures
- Offline sync issues
- Camera/GPS permission denials

## 🔧 Customization

### **Themes:**
- Client app: Green theme (#10b981)
- Field app: Orange/blue theme (#f59e0b / #3b82f6)
- Customizable via CSS variables

### **Branding:**
- Update app names in manifest files
- Replace icons in `/icons/` directory
- Modify splash screens and colors

## 📞 Support

- **Emergency Support:** Available 24/7 in both apps
- **Technical Issues:** Contact development team
- **Feature Requests:** Submit via supplier portal

## 🔄 Updates

Apps auto-update via service worker when new versions are deployed. Users receive update notifications and can refresh to get latest features.

---

**Built with:** Progressive Web App technologies, Ionic components, Capacitor for native features, and Web Push for notifications.