# 🚀 CAMRENT Supabase Setup Guide

## Quick Start (5 minutes)

### Step 1: Log into Supabase Dashboard
Go to: https://app.supabase.com/

If not already logged in, sign in with your account credentials.

### Step 2: Select Your Project
Project name: `zsxriivzjzdshvukmoqa`

Or click here: https://app.supabase.com/project/zsxriivzjzdshvukmoqa

### Step 3: Open SQL Editor
Left sidebar → **SQL Editor** → **New Query**

### Step 4: Create Tables
Copy the SQL below and paste into the SQL editor, then click **Run**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('tenant', 'landlord', 'admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  documents JSONB DEFAULT '[]'::jsonb,
  profile_image TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  location JSONB NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  property_type TEXT NOT NULL CHECK (property_type IN ('studio', 'apartment', 'house', 'villa', 'commercial')),
  bedrooms INT DEFAULT 0,
  bathrooms INT DEFAULT 0,
  area DECIMAL(10, 2) DEFAULT 0,
  landlord_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_approved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  views INT DEFAULT 0,
  inquiries INT DEFAULT 0,
  available_from TIMESTAMPTZ,
  contact_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id BIGINT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, property_id)
);

-- Inquiries table
CREATE TABLE IF NOT EXISTS public.inquiries (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  tenant_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  landlord_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id BIGINT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'closed')),
  tenant_contact JSONB NOT NULL,
  landlord_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON public.properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON public.properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_is_approved ON public.properties(is_approved);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON public.favorites(property_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_tenant_id ON public.inquiries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_landlord_id ON public.inquiries(landlord_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_property_id ON public.inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can view active properties" ON public.properties
  FOR SELECT USING (is_active = true);

CREATE POLICY "Landlords can create properties" ON public.properties
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Landlords can update own properties" ON public.properties
  FOR UPDATE USING (true);

CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR SELECT USING (true);

CREATE POLICY "Users can create favorites" ON public.favorites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own favorites" ON public.favorites
  FOR DELETE USING (true);

CREATE POLICY "Users can view own inquiries" ON public.inquiries
  FOR SELECT USING (true);

CREATE POLICY "Users can create inquiries" ON public.inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update inquiries" ON public.inquiries
  FOR UPDATE USING (true);

-- Grant public access to tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.inquiries TO anon, authenticated;
```

### Step 5: Verify Tables Created
After SQL runs successfully, you should see 4 tables in the **Table Editor** (left sidebar):
- ✅ users
- ✅ properties
- ✅ favorites
- ✅ inquiries

### Step 6: Back to Terminal
Return to terminal and run:
```bash
npm run setup:db
```

This will insert the sample user "Billions" and verify the setup.

---

## Sample Login Credentials

After setup, you can login with:
- **Email:** noeltebei478@gmail.com
- **Password:** TestPassword123!
- **Role:** Tenant

---

## Troubleshooting

**"Permission denied" when running SQL?**
→ Make sure you're logged in with an account that owns the project

**"Table already exists" error?**
→ This is normal! The SQL uses `IF NOT EXISTS`, so it won't fail

**"RLS policy violation" error when testing?**
→ The policies allow all operations for now (they're basic). You can configure stricter policies later.

---

## Next Steps

1. Create the tables in Supabase (SQL above)
2. Run `npm run setup:db` to insert sample data
3. Run `npm run dev` to start backend
4. Test API endpoints

For API documentation, see [SUPABASE_SETUP.md](../SUPABASE_SETUP.md)
