/*
# Add legal docs, inspection fee, and amenities to properties

## Summary
Adds three new columns to the existing `properties` table to support the
upgraded "List Property" page for verified users:

1. `legal_docs_url` (text, nullable) — URL to the uploaded C of O / R of O / Deed
   document in Supabase Storage. Required for verification.
2. `inspection_fee` (numeric, default 0) — Fee paid directly to the owner for
   property inspection. Capped at ₦100,000 by the frontend.
3. `amenities` (jsonb, default '[]') — JSON array of selected amenity strings
   (e.g. ["WiFi","Parking","Borehole"]).

## Modified Tables
### properties
- Added `legal_docs_url` (text, nullable)
- Added `inspection_fee` (numeric, default 0)
- Added `amenities` (jsonb, default '[]')

## Security
- No RLS policy changes. Existing anon+authenticated CRUD policies already
  cover the new columns.

## Notes
- No data is lost — all additions are additive.
- `legal_docs_url` is nullable so existing rows remain valid; the frontend
  enforces it as required for new submissions.
*/

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS legal_docs_url text;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS inspection_fee numeric NOT NULL DEFAULT 0;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS amenities jsonb NOT NULL DEFAULT '[]'::jsonb;
