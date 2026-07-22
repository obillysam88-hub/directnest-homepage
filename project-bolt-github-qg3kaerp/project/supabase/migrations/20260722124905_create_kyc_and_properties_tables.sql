/*
# Create KYC submissions and properties tables

## Purpose
Stores landlord KYC verification submissions and property listings for the Directnest
marketplace. Both tables use a "pending -> approved/rejected" review workflow that the
admin dashboard reads and updates. No sign-in is required to submit (single-tenant,
public-write model), so policies are scoped to anon + authenticated.

## 1. New Tables

### landlord_kyc_submissions
- id (uuid, PK)
- full_name (text, not null)
- phone (text, not null)
- email (text, not null)
- nin (text, not null) — 11-digit National ID number
- bvn (text, not null) — 11-digit Bank Verification Number
- id_front_url (text) — Supabase Storage URL for front of ID
- id_back_url (text) — Supabase Storage URL for back of ID
- proof_of_ownership_url (text) — Supabase Storage URL for proof of ownership
- liveness_video_url (text) — Supabase Storage URL for 5-second liveness video
- status (text, default 'pending') — pending | approved | rejected
- admin_note (text) — optional note from admin during review
- created_at (timestamptz, default now())
- reviewed_at (timestamptz) — set when admin acts

### properties
- id (uuid, PK)
- title (text, not null)
- description (text)
- property_type (text, not null)
- bedrooms (int, default 0)
- bathrooms (int, default 0)
- address (text, not null)
- lat (double precision) — map pin latitude
- lng (double precision) — map pin longitude
- annual_rent (numeric, default 0)
- legal_fee (numeric, default 0)
- caution_fee (numeric, default 0)
- image_urls (jsonb, default '[]') — array of Supabase Storage URLs (5-20 images)
- fingerprint_id (text) — unique property fingerprint ID
- status (text, default 'pending') — pending | approved | rejected
- admin_note (text)
- created_at (timestamptz, default now())
- reviewed_at (timestamptz)

## 2. Storage Buckets
- kyc-documents (public) — for ID photos, proof of ownership, liveness videos
- property-images (public) — for property listing photos

## 3. Security (RLS)
- Both tables enable RLS.
- anon + authenticated can INSERT (public submission form, no sign-in).
- anon + authenticated can SELECT (so the marketplace and admin dashboard can read).
- anon + authenticated can UPDATE (so the admin dashboard can approve/reject).
- DELETE is disabled to preserve submission history.
- Storage buckets are public for read; writes allowed for anon + authenticated.
*/

-- ─── landlord_kyc_submissions ─────────────────────────────
CREATE TABLE IF NOT EXISTS landlord_kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  nin text NOT NULL,
  bvn text NOT NULL,
  id_front_url text,
  id_back_url text,
  proof_of_ownership_url text,
  liveness_video_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE landlord_kyc_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_kyc" ON landlord_kyc_submissions;
CREATE POLICY "anon_select_kyc" ON landlord_kyc_submissions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_kyc" ON landlord_kyc_submissions;
CREATE POLICY "anon_insert_kyc" ON landlord_kyc_submissions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_kyc" ON landlord_kyc_submissions;
CREATE POLICY "anon_update_kyc" ON landlord_kyc_submissions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ─── properties ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  property_type text NOT NULL,
  bedrooms int NOT NULL DEFAULT 0,
  bathrooms int NOT NULL DEFAULT 0,
  address text NOT NULL,
  lat double precision,
  lng double precision,
  annual_rent numeric NOT NULL DEFAULT 0,
  legal_fee numeric NOT NULL DEFAULT 0,
  caution_fee numeric NOT NULL DEFAULT 0,
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  fingerprint_id text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_properties" ON properties;
CREATE POLICY "anon_select_properties" ON properties FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_properties" ON properties;
CREATE POLICY "anon_insert_properties" ON properties FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_properties" ON properties;
CREATE POLICY "anon_update_properties" ON properties FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ─── Storage buckets ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow anon + authenticated to upload and read
DROP POLICY IF EXISTS "anon_upload_kyc_docs" ON storage.objects;
CREATE POLICY "anon_upload_kyc_docs" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id IN ('kyc-documents', 'property-images'));

DROP POLICY IF EXISTS "anon_read_kyc_docs" ON storage.objects;
CREATE POLICY "anon_read_kyc_docs" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('kyc-documents', 'property-images'));

DROP POLICY IF EXISTS "anon_update_kyc_docs" ON storage.objects;
CREATE POLICY "anon_update_kyc_docs" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id IN ('kyc-documents', 'property-images'));

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_kyc_status ON landlord_kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_created ON properties(created_at DESC);
