-- 20260715_short_term_accommodation_focus.sql
-- Align short-term listings with hotels and temporary accommodation providers.

BEGIN;

-- Normalize short-term listings that do not match accommodation criteria.
UPDATE public.properties
SET rental_type = 'monthly'
WHERE rental_type IN ('daily', 'weekly')
  AND (
    property_category <> 'hospitality'
    OR property_type NOT IN ('hotel', 'guest-house', 'lodge', 'resort', 'serviced-apartment')
  );

-- Ensure hospitality_info carries room-type and booking-availability keys used by the new module.
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
