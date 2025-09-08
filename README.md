# Hey Spruce Portal System

A comprehensive multi-portal system for Hey Spruce property management platform.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to production
npm run deploy:prod
```

## 📁 Project Structure

```
/
├── api/                 # API endpoints (serverless functions)
├── scripts/             # JavaScript files (UI components, features)
├── styles/              # CSS stylesheets
├── mobile-app/          # Mobile application (PWA)
├── docs/                # Documentation
├── archive/             # Archived files (SQL, old versions)
├── email-templates/     # Email templates
├── public/              # Static assets
├── uploads/             # User uploads
└── utils/               # Utility functions
```

## 🌐 Main Portals

- **Client Portal** (`client-portal.html`) - For property owners
- **Supplier Portal** (`supplier-portal.html`) - For suppliers/vendors
- **Subcontractor Portal** (`subcontractor-portal.html`) - For subcontractors
- **Login** (`portal-login.html`) - Unified login page

## 🔧 Configuration

1. Copy `.env.example` to `.env`
2. Add your API keys and configuration
3. Update `vercel.json` for deployment settings

## 📚 Documentation

- Setup guides in `/docs/setup/`
- API documentation in `/docs/api/`
- User manuals in `/docs/user-manuals/`

## 🚀 Deployment

The app is deployed on Vercel:
- Production: https://heyspruceapp.vercel.app

## 🛠️ Technologies

- Frontend: HTML5, CSS3, JavaScript (Vanilla)
- Backend: Node.js (Serverless Functions)
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth
- Payments: Stripe
- Hosting: Vercel

## 📱 Features

- ✅ Global search (Ctrl+K)
- ✅ Breadcrumb navigation
- ✅ Responsive design
- ✅ PWA support
- ✅ Real-time notifications
- ✅ File uploads
- ✅ Payment processing
- ✅ Multi-role authentication

## 🔐 Environment Variables

Required environment variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `APP_URL`

## 📞 Support

For issues or questions, contact: support@heyspruce.com