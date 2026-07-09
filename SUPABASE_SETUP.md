# Supabase Setup Guide for CAMRENT

## Quick Setup

Your backend is now fully configured to use Supabase. Follow these steps to complete the setup:

### Step 1: Create Tables in Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **zsxriivzjzdshvukmoqa**
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy all SQL from `server/supabase-schema.sql`
6. Paste it into the SQL Editor
7. Click **Run**

The schema will create:
- **users** — User accounts (tenants, landlords, admins)
- **properties** — Rental listings with images, location, pricing
- **favorites** — User's favorite properties
- **inquiries** — Tenant inquiries to landlords

### Step 2: Verify Setup

Run the verification script:
```bash
npm run verify:supabase
```

Expected output:
```
✅ Supabase connection successful
✅ Table: users (ready)
✅ Table: properties (ready)
✅ Table: favorites (ready)
✅ Table: inquiries (ready)
```

### Step 3: Start Backend

```bash
npm run dev
```

Your backend API is now live on `http://localhost:5000`

---

## API Endpoints (All Using Supabase)

### Authentication
- `POST /api/auth/register` — Create new user
- `POST /api/auth/login` — User login
- `POST /api/auth/refresh` — Refresh access token
- `GET /api/auth/profile` — Get logged-in user's profile

### Properties
- `GET /api/properties` — List all active properties
- `GET /api/properties/:id` — Get single property
- `POST /api/properties` — Create property (landlords only)
- `PUT /api/properties/:id` — Update property (landlords only)
- `DELETE /api/properties/:id` — Delete property

### Favorites
- `POST /api/favorites` — Add property to favorites
- `DELETE /api/favorites/:propertyId` — Remove from favorites
- `GET /api/favorites` — Get user's favorites
- `GET /api/favorites/check/:propertyId` — Check if favorited

### Inquiries
- `POST /api/inquiries` — Send inquiry to landlord
- `GET /api/inquiries/tenant` — Get tenant's inquiries
- `GET /api/inquiries/landlord` — Get landlord's inquiries
- `PUT /api/inquiries/:id/respond` — Respond to inquiry
- `PUT /api/inquiries/:id/close` — Close inquiry

### Admin
- `GET /api/admin/dashboard` — Admin statistics
- `GET /api/admin/landlords` — List all landlords
- `PUT /api/admin/verify/:id` — Verify/reject landlord
- `GET /api/admin/users` — List all users
- `PUT /api/admin/users/:id/ban` — Ban/unban user
- `DELETE /api/admin/properties/:id` — Delete property

---

## Architecture

```
CAMRENT Backend (Express)
       ↓
Supabase Client (@supabase/supabase-js)
       ↓
Supabase REST API
       ↓
PostgreSQL Database (Supabase Hosted)
```

All API calls go through Supabase REST API, which enforces Row-Level Security (RLS) policies defined in the schema.

---

## Troubleshooting

### Tables not found
- Check that SQL was executed successfully in Supabase SQL Editor
- Verify table names appear in Supabase **Table Editor** (left sidebar)

### "Cannot read property '_id' of undefined"
- User token is invalid or expired
- Make sure `Authorization: Bearer <token>` header is sent with requests

### Port 5000 already in use
```bash
# On Windows
netstat -ano | findstr :5000
# Kill the process
taskkill /PID <PID> /F
```

### Connection refused
- Check that `.env` has correct Supabase URL and keys
- Verify network connectivity to `https://zsxriivzjzdshvukmoqa.supabase.co`

---

## Security Notes

- All data is stored in Postgres (Supabase-hosted)
- Row-Level Security (RLS) policies protect data access
- JWT tokens expire after 15 minutes (access) / 7 days (refresh)
- Passwords are hashed with bcrypt before storage
- API keys are stored in `.env` and never exposed to frontend

---

For more information, see:
- [Supabase Docs](https://supabase.com/docs)
- [CAMRENT README](../../README.md)
