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
