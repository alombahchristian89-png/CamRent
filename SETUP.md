# 🚀 Quick Setup Guide

## Prerequisites
- Node.js 16+ 
- Supabase project
- Cloudinary account (free tier works)

## 1. Backend Setup
```bash
cd server
npm install
```

Create `.env` file:
```env
PORT=5000
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project-ref.supabase.co:5432/postgres?sslmode=require
NODE_ENV=development
```

## 2. Database Setup
```bash
# Create core tables in Supabase
npm run bootstrap:db

# Verify table access
npm run verify:supabase
```

## 3. Start Backend
```bash
npm run dev
# Server runs on http://localhost:5000
```

## 4. Frontend Setup
```bash
cd client
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

## 5. Test Accounts
After seeding, use these accounts to test:

**Admin**: admin@camrent.com / admin123
**Tenant**: tenant@camrent.com / tenant123  
**Landlord**: landlord@camrent.com / landlord123
**Pending Landlord**: peter@camrent.com / landlord123

## 6. Test Features
- Browse properties as tenant
- Save favorites
- Contact landlords
- List properties as verified landlord
- Verify pending landlord as admin
- Manage users and properties as admin

## Troubleshooting
- Ensure Supabase credentials and DB URL are valid
- Check Cloudinary credentials
- Verify all environment variables are set
- Check browser console for errors

## Production Deployment
- Set `NODE_ENV=production`
- Use production Supabase credentials
- Configure CORS properly
- Build frontend: `npm run build`
