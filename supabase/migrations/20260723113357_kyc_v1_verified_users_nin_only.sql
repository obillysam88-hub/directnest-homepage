/*
# KYC v1: verified_users table + kyc_attempts rate limiting

## Summary
Creates the `verified_users` table for storing successfully verified users
with their NIN hash, name, and verification status. Updates the existing
`kyc_attempts` table to support NIN-only rate limiting (1 attempt per NIN
per 24 hours). The existing `kyc_blacklist` table already has `nin_hash`
via the `nin` column — we add a dedicated `nin_hash` column for the sha256
hashed NIN used in the new flow.

## New Tables

### verified_users
Stores users who have passed KYC verification. Contains:
- user_id (uuid, references users)
- nin_hash (text, sha256 of the NIN — never store raw NIN)
- full_name (text, extracted from OCR)
- status (text, 'verified')
- verified_at (timestamptz)

## Modified Tables

### kyc_attempts
- Add `nin_hash` (text, nullable): sha256 hash of the NIN for rate-limit queries
  without exposing the raw NIN.

### kyc_blacklist
- Add `nin_hash` (text, nullable): sha256 hash of the NIN for blacklist checks.

## Security
- RLS enabled on verified_users.
- TO anon, authenticated (no-auth app, uses anon key).
*/

-- =========================================================
-- 1. verified_users table
-- =========================================================
CREATE TABLE IF NOT EXISTS verified_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  nin_hash text NOT NULL,
  full_name text NOT NULL,
  status text NOT NULL DEFAULT 'verified',
  verified_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE verified_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_verified_users" ON verified_users;
CREATE POLICY "anon_select_verified_users" ON verified_users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_verified_users" ON verified_users;
CREATE POLICY "anon_insert_verified_users" ON verified_users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_verified_users" ON verified_users;
CREATE POLICY "anon_update_verified_users" ON verified_users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_verified_users" ON verified_users;
CREATE POLICY "anon_delete_verified_users" ON verified_users FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- 2. Add nin_hash to kyc_attempts
-- =========================================================
ALTER TABLE kyc_attempts ADD COLUMN IF NOT EXISTS nin_hash text;

-- =========================================================
-- 3. Add nin_hash to kyc_blacklist
-- =========================================================
ALTER TABLE kyc_blacklist ADD COLUMN IF NOT EXISTS nin_hash text;

-- =========================================================
-- 4. Indexes
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_verified_users_user_id ON verified_users(user_id);
CREATE INDEX IF NOT EXISTS idx_verified_users_nin_hash ON verified_users(nin_hash);
CREATE INDEX IF NOT EXISTS idx_kyc_attempts_nin_hash ON kyc_attempts(nin_hash);
CREATE INDEX IF NOT EXISTS idx_kyc_attempts_attempt_at ON kyc_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_blacklist_nin_hash ON kyc_blacklist(nin_hash);
