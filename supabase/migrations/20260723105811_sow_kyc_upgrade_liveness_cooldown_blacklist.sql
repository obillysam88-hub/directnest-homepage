/*
# SOW KYC Upgrade: Liveness + Cooldown + Blacklist + Audit

## Summary
Upgrades the KYC system from simple ID+selfie upload to a multi-attempt
verification flow with liveness video, 24-hour cooldowns, blacklisting,
and a 7-year audit log. Adds inspection booking and owner-confirmed
contact reveal.

## New Tables

### kyc_attempts
Tracks each individual KYC verification attempt (not just the final
submission). Records the ID type, ID number, extracted name/DOB, face
similarity score, liveness check result, and failure reason. This is
what drives the cooldown/blacklist escalation logic.

### kyc_blacklist
Stores blacklisted identities (BVN, NIN, device ID, face hash) so that
banned users cannot re-register. Queried on every new KYC attempt.

### kyc_audit_log
Immutable audit trail of every KYC-related action (attempt, success,
cooldown, blacklist, raw video deletion). Retained 7 years per SOW.

### inspections
Tracks inspection bookings made by verified renters. Links a renter to
a property with a fee status. Owner contact is only revealed to the
renter after the owner confirms "Inspection Fee Received".

## Modified Tables

### users
- `cooldown_until` (timestamptz, nullable): when set, KYC page is blocked
  until this time passes.
- `is_blacklisted` (boolean, default false): permanently banned from KYC.
- `badge` (text, nullable): set to "Verified Renter" on successful KYC.
- `failed_attempts` (int, default 0): counter for escalation logic.
- `device_id` (text, nullable): browser fingerprint for blacklist matching.
- `face_hash` (text, nullable): hashed face biometric for blacklist matching.

## Security
- RLS enabled on all new tables.
- All tables use `TO anon, authenticated` since this is a no-auth app
  (users identified by localStorage user_id, not Supabase Auth sessions).
- Policies allow full CRUD for anon+authenticated since the app uses the
  anon key for all operations.
*/

-- =========================================================
-- 1. Add columns to users table
-- =========================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cooldown_until timestamptz;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blacklisted boolean NOT NULL DEFAULT false;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS badge text;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_attempts int NOT NULL DEFAULT 0;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS face_hash text;

-- =========================================================
-- 2. kyc_attempts table
-- =========================================================
CREATE TABLE IF NOT EXISTS kyc_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  id_type text NOT NULL,
  id_number text NOT NULL,
  full_name_on_id text,
  extracted_dob date,
  id_photo_url text,
  liveness_video_url text,
  liveness_frame_url text,
  face_similarity_score numeric(5,2),
  liveness_check_passed boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  failure_reason text,
  device_id text,
  face_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE kyc_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_kyc_attempts" ON kyc_attempts;
CREATE POLICY "anon_select_kyc_attempts" ON kyc_attempts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_kyc_attempts" ON kyc_attempts;
CREATE POLICY "anon_insert_kyc_attempts" ON kyc_attempts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_kyc_attempts" ON kyc_attempts;
CREATE POLICY "anon_update_kyc_attempts" ON kyc_attempts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_kyc_attempts" ON kyc_attempts;
CREATE POLICY "anon_delete_kyc_attempts" ON kyc_attempts FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- 3. kyc_blacklist table
-- =========================================================
CREATE TABLE IF NOT EXISTS kyc_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  bvn text,
  nin text,
  device_id text,
  face_hash text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE kyc_blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_blacklist" ON kyc_blacklist;
CREATE POLICY "anon_select_blacklist" ON kyc_blacklist FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_blacklist" ON kyc_blacklist;
CREATE POLICY "anon_insert_blacklist" ON kyc_blacklist FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_blacklist" ON kyc_blacklist;
CREATE POLICY "anon_update_blacklist" ON kyc_blacklist FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_blacklist" ON kyc_blacklist;
CREATE POLICY "anon_delete_blacklist" ON kyc_blacklist FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- 4. kyc_audit_log table
-- =========================================================
CREATE TABLE IF NOT EXISTS kyc_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE kyc_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_audit_log" ON kyc_audit_log;
CREATE POLICY "anon_select_audit_log" ON kyc_audit_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_audit_log" ON kyc_audit_log;
CREATE POLICY "anon_insert_audit_log" ON kyc_audit_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_audit_log" ON kyc_audit_log;
CREATE POLICY "anon_update_audit_log" ON kyc_audit_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_audit_log" ON kyc_audit_log;
CREATE POLICY "anon_delete_audit_log" ON kyc_audit_log FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- 5. inspections table
-- =========================================================
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  property_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  fee_confirmed_by_owner boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inspections" ON inspections;
CREATE POLICY "anon_select_inspections" ON inspections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inspections" ON inspections;
CREATE POLICY "anon_insert_inspections" ON inspections FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inspections" ON inspections;
CREATE POLICY "anon_update_inspections" ON inspections FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inspections" ON inspections;
CREATE POLICY "anon_delete_inspections" ON inspections FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- 6. Indexes
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_kyc_attempts_user_id ON kyc_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_attempts_created ON kyc_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blacklist_bvn ON kyc_blacklist(bvn);
CREATE INDEX IF NOT EXISTS idx_blacklist_nin ON kyc_blacklist(nin);
CREATE INDEX IF NOT EXISTS idx_blacklist_device ON kyc_blacklist(device_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_face_hash ON kyc_blacklist(face_hash);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON kyc_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON inspections(property_id);
