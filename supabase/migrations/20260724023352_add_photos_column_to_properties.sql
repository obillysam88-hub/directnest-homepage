/*
# Add photos jsonb column to properties

1. Schema
- Add `photos` jsonb column to `properties` table to store array of photo objects
  with url, category, and is_cover fields.
- Idempotent: only adds if not present.
2. Security
- No RLS changes needed; table already has policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'photos'
  ) THEN
    ALTER TABLE properties ADD COLUMN photos jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
