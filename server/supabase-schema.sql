-- CAMRENT Supabase Schema
-- This SQL creates all required tables for the backend to work seamlessly with Supabase

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
  property_type TEXT NOT NULL CHECK (property_type IN (
    'studio', 'apartment', 'house', 'villa',
    'office', 'shop', 'warehouse',
    'hotel', 'guest-house', 'lodge', 'resort', 'serviced-apartment', 'airbnb-unit', 'holiday-home',
    'commercial'
  )),
  property_category TEXT NOT NULL DEFAULT 'residential' CHECK (property_category IN ('residential', 'commercial', 'hospitality')),
  rental_type TEXT NOT NULL DEFAULT 'monthly' CHECK (rental_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  pricing JSONB NOT NULL DEFAULT '{"daily":0,"weekly":0,"monthly":0,"yearly":0,"currency":"XAF"}'::jsonb,
  hospitality_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  residential_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  listing_status TEXT NOT NULL DEFAULT 'available' CHECK (listing_status IN ('available', 'taken')),
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
CREATE INDEX IF NOT EXISTS idx_properties_property_category ON public.properties(property_category);
CREATE INDEX IF NOT EXISTS idx_properties_rental_type ON public.properties(rental_type);
CREATE INDEX IF NOT EXISTS idx_properties_listing_status ON public.properties(listing_status);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_amenities_gin ON public.properties USING GIN (amenities);
CREATE INDEX IF NOT EXISTS idx_properties_pricing_gin ON public.properties USING GIN (pricing);
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

-- Create basic RLS policies (allow all for now - configure stricter policies later)
-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can register" ON public.users
  FOR INSERT TO anon, authenticated
  WITH CHECK (role IN ('tenant', 'landlord'));

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (true);

-- Properties policies
CREATE POLICY "Anyone can view active properties" ON public.properties
  FOR SELECT USING (is_active = true);

CREATE POLICY "Landlords can create properties" ON public.properties
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Landlords can update own properties" ON public.properties
  FOR UPDATE USING (true);

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR SELECT USING (true);

CREATE POLICY "Users can create favorites" ON public.favorites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own favorites" ON public.favorites
  FOR DELETE USING (true);

-- Inquiries policies
CREATE POLICY "Users can view own inquiries" ON public.inquiries
  FOR SELECT USING (true);

CREATE POLICY "Users can create inquiries" ON public.inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update inquiries" ON public.inquiries
  FOR UPDATE USING (true);

-- Grant public access to tables (needed for anon/authenticated roles via Data API)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.inquiries TO anon, authenticated;

-- Enable Supabase Realtime for landlord and tenant live notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'properties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inquiries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inquiries;
  END IF;
END $$;
