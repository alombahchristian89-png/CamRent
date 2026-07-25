-- CAMRENT full database init
-- Generated for one-time run in Supabase SQL Editor


-- ===== BEGIN supabase-schema.sql =====

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
  reset_password_token TEXT,
  reset_password_expires TIMESTAMPTZ,
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

-- ===== END supabase-schema.sql =====


-- ===== BEGIN src\utils\adminPortalSchema.sql =====

-- Admin portal support tables and columns for Supabase

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('verification_approved', 'verification_rejected', 'account_suspended', 'account_activated', 'admin_info')),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  admin_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('approve', 'reject', 'edit', 'delete', 'suspend', 'activate', 'role_update')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'verification', 'property', 'inquiry')),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON public.audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can create audit logs" ON public.audit_logs;
CREATE POLICY "Admins can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.notifications TO anon, authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO anon, authenticated;

-- ===== END src\utils\adminPortalSchema.sql =====


-- ===== BEGIN migrations\20260701_add_rental_metadata_columns.sql =====

-- 20260701_add_rental_metadata_columns.sql
-- Promote rental metadata from contact_info JSONB into first-class columns.

BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_category TEXT,
  ADD COLUMN IF NOT EXISTS rental_type TEXT,
  ADD COLUMN IF NOT EXISTS pricing JSONB DEFAULT '{"daily":0,"weekly":0,"monthly":0,"yearly":0,"currency":"XAF"}'::jsonb,
  ADD COLUMN IF NOT EXISTS hospitality_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS residential_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS listing_status TEXT DEFAULT 'available';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_property_category_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_property_category_check
      CHECK (property_category IN ('residential', 'commercial', 'hospitality'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_rental_type_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_rental_type_check
      CHECK (rental_type IN ('daily', 'weekly', 'monthly', 'yearly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_listing_status_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_listing_status_check
      CHECK (listing_status IN ('available', 'taken'));
  END IF;
END $$;

UPDATE public.properties
SET
  property_category = COALESCE(
    NULLIF(contact_info->>'propertyCategory', ''),
    CASE
      WHEN property_type IN ('hotel', 'guest-house', 'lodge', 'resort', 'serviced-apartment', 'airbnb-unit', 'holiday-home') THEN 'hospitality'
      WHEN property_type IN ('office', 'shop', 'warehouse', 'commercial') THEN 'commercial'
      ELSE 'residential'
    END
  ),
  rental_type = COALESCE(NULLIF(contact_info->>'rentalType', ''), 'monthly'),
  listing_status = COALESCE(
    NULLIF(contact_info->>'listingStatus', ''),
    'available'
  ),
  pricing = COALESCE(
    contact_info->'pricing',
    jsonb_build_object(
      'daily', 0,
      'weekly', 0,
      'monthly', CASE WHEN COALESCE(contact_info->>'rentalType', 'monthly') = 'monthly' THEN COALESCE(price, 0) ELSE 0 END,
      'yearly', CASE WHEN COALESCE(contact_info->>'rentalType', 'monthly') = 'yearly' THEN COALESCE(price, 0) ELSE 0 END,
      'currency', 'XAF'
    )
  ),
  hospitality_info = COALESCE(contact_info->'hospitalityInfo', '{}'::jsonb),
  residential_info = COALESCE(contact_info->'residentialInfo', '{}'::jsonb)
WHERE
  property_category IS NULL
  OR rental_type IS NULL
  OR listing_status IS NULL
  OR pricing IS NULL
  OR hospitality_info IS NULL
  OR residential_info IS NULL;

UPDATE public.properties
SET pricing = jsonb_set(COALESCE(pricing, '{}'::jsonb), ARRAY[rental_type], to_jsonb(COALESCE(price, 0)), true)
WHERE
  (pricing->>rental_type IS NULL OR COALESCE((pricing->>rental_type)::numeric, 0) = 0)
  AND COALESCE(price, 0) > 0;

UPDATE public.properties
SET
  property_category = COALESCE(property_category, 'residential'),
  rental_type = COALESCE(rental_type, 'monthly'),
  listing_status = COALESCE(listing_status, 'available'),
  pricing = COALESCE(pricing, '{"daily":0,"weekly":0,"monthly":0,"yearly":0,"currency":"XAF"}'::jsonb),
  hospitality_info = COALESCE(hospitality_info, '{}'::jsonb),
  residential_info = COALESCE(residential_info, '{}'::jsonb);

ALTER TABLE public.properties
  ALTER COLUMN property_category SET DEFAULT 'residential',
  ALTER COLUMN property_category SET NOT NULL,
  ALTER COLUMN rental_type SET DEFAULT 'monthly',
  ALTER COLUMN rental_type SET NOT NULL,
  ALTER COLUMN listing_status SET DEFAULT 'available',
  ALTER COLUMN listing_status SET NOT NULL,
  ALTER COLUMN pricing SET DEFAULT '{"daily":0,"weekly":0,"monthly":0,"yearly":0,"currency":"XAF"}'::jsonb,
  ALTER COLUMN pricing SET NOT NULL,
  ALTER COLUMN hospitality_info SET DEFAULT '{}'::jsonb,
  ALTER COLUMN hospitality_info SET NOT NULL,
  ALTER COLUMN residential_info SET DEFAULT '{}'::jsonb,
  ALTER COLUMN residential_info SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_property_category ON public.properties(property_category);
CREATE INDEX IF NOT EXISTS idx_properties_rental_type ON public.properties(rental_type);
CREATE INDEX IF NOT EXISTS idx_properties_listing_status ON public.properties(listing_status);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_amenities_gin ON public.properties USING GIN (amenities);
CREATE INDEX IF NOT EXISTS idx_properties_pricing_gin ON public.properties USING GIN (pricing);

COMMIT;

-- ===== END migrations\20260701_add_rental_metadata_columns.sql =====


-- ===== BEGIN migrations\20260707_add_activity_logs.sql =====

create table if not exists activity_logs (
  id bigserial primary key,
  actor_user_id bigint,
  target_user_id bigint,
  action_type text not null,
  entity_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_created_at on activity_logs (created_at desc);
create index if not exists idx_activity_logs_actor_user_id on activity_logs (actor_user_id);
create index if not exists idx_activity_logs_target_user_id on activity_logs (target_user_id);

-- ===== END migrations\20260707_add_activity_logs.sql =====


-- ===== BEGIN migrations\20260715_short_term_accommodation_focus.sql =====

-- 20260715_short_term_accommodation_focus.sql
-- Align short-term listings with hotels and temporary accommodation providers.

BEGIN;

UPDATE public.properties
SET rental_type = 'monthly'
WHERE rental_type IN ('daily', 'weekly')
  AND (
    property_category <> 'hospitality'
    OR property_type NOT IN ('hotel', 'guest-house', 'lodge', 'resort', 'serviced-apartment')
  );

UPDATE public.properties
SET hospitality_info = jsonb_set(
  jsonb_set(
    COALESCE(hospitality_info, '{}'::jsonb),
    '{roomTypes}',
    COALESCE(
      CASE
        WHEN jsonb_typeof(hospitality_info->'roomTypes') = 'array' THEN hospitality_info->'roomTypes'
        ELSE NULL
      END,
      to_jsonb(ARRAY[initcap(replace(property_type, '-', ' '))])
    ),
    true
  ),
  '{bookingAvailability}',
  jsonb_build_object(
    'instantBooking', COALESCE((hospitality_info->'bookingAvailability'->>'instantBooking')::boolean, false),
    'minimumStayNights', GREATEST(COALESCE((hospitality_info->'bookingAvailability'->>'minimumStayNights')::int, 1), 1),
    'maximumStayNights', GREATEST(COALESCE((hospitality_info->'bookingAvailability'->>'maximumStayNights')::int, 30), 1)
  ),
  true
)
WHERE property_category = 'hospitality';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'properties_short_term_accommodation_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_short_term_accommodation_check
      CHECK (
        rental_type NOT IN ('daily', 'weekly')
        OR (
          property_category = 'hospitality'
          AND property_type IN ('hotel', 'guest-house', 'lodge', 'resort', 'serviced-apartment')
          AND jsonb_typeof(COALESCE(hospitality_info->'roomTypes', '[]'::jsonb)) = 'array'
          AND jsonb_array_length(COALESCE(hospitality_info->'roomTypes', '[]'::jsonb)) > 0
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_properties_hospitality_info_gin
  ON public.properties USING GIN (hospitality_info);

COMMIT;

-- ===== END migrations\20260715_short_term_accommodation_focus.sql =====

