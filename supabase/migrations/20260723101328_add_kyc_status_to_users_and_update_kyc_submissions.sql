/*
# Add KYC status to users table and update KYC submissions schema

## Summary
This migration adds KYC verification tracking columns to the existing users table
and adds new columns to landlord_kyc_submissions to support the simplified
NIN/BVN KYC flow (single ID type selection, ID photo, selfie with ID, full name on ID).

## 1. users table (modified — columns added, no data lost)
New columns:
- `kyc_status` (text, default 'unverified') — unverified | pending | approved | rejected
- `is_verified` (boolean, default false) — true when kyc_status = 'approved'
- `id_type` (text) — 'NIN' or 'BVN' (which ID type the user selected)
- `id_number` (text) — the 11-digit NIN or BVN number
- `full_name_on_id` (text) — full name as it appears on the ID

## 2. landlord_kyc_submissions table (modified — columns added)
New columns:
- `id_type` (text) — 'NIN' or 'BVN'
- `id_number` (text) — 11-digit number
- `id_photo_url` (text) — photo of the ID document
- `selfie_with_id_url` (text) — selfie holding the ID
- `full_name_on_id` (text) — full name as on the ID

## 3. Security
- RLS already enabled on both tables. No new tables created.
- Existing anon + authenticated policies remain unchanged.
- No data is lost — all new columns are nullable or have safe defaults.
*/

-- ============================================================
-- 1. Add KYC tracking columns to users table
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_type text,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS full_name_on_id text;

-- ============================================================
-- 2. Add new columns to landlord_kyc_submissions
-- ============================================================
ALTER TABLE landlord_kyc_submissions
  ADD COLUMN IF NOT EXISTS id_type text,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS id_photo_url text,
  ADD COLUMN IF NOT EXISTS selfie_with_id_url text,
  ADD COLUMN IF NOT EXISTS full_name_on_id text;

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_id_type ON landlord_kyc_submissions(id_type);