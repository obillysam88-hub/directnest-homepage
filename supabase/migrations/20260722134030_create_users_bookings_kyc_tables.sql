/*
# Create users, bookings, kyc_documents tables and extend properties

## Summary
This migration creates three new tables (users, bookings, kyc_documents) for the
Directnest property platform and extends the existing properties table with
additional columns (price, location, images, owner_id). All new tables have
Row Level Security enabled with anon+authenticated access since the app
currently has no sign-in screen.

## 1. properties table (modified — columns added, no data lost)
New columns added to the existing properties table:
- `price` (numeric, default 0) — listing price of the property
- `location` (text, nullable) — human-readable location string
- `images` (text[], default '{}') — array of image URLs
- `owner_id` (uuid, nullable, FK → users.id ON DELETE SET NULL) — the property owner

## 2. users table (new)
- `id` (uuid, primary key, default gen_random_uuid())
- `email` (text, unique, not null)
- `full_name` (text, nullable)
- `phone` (text, nullable)
- `role` (text, default 'user') — e.g. 'user', 'admin', 'landlord'
- `created_at` (timestamptz, default now())

## 3. bookings table (new)
- `id` (uuid, primary key, default gen_random_uuid())
- `property_id` (uuid, not null, FK → properties.id ON DELETE CASCADE)
- `user_id` (uuid, not null, FK → users.id ON DELETE CASCADE)
- `check_in` (date, not null)
- `check_out` (date, not null)
- `status` (text, default 'pending') — e.g. 'pending', 'confirmed', 'cancelled'
- `created_at` (timestamptz, default now())

## 4. kyc_documents table (new)
- `id` (uuid, primary key, default gen_random_uuid())
- `user_id` (uuid, not null, FK → users.id ON DELETE CASCADE)
- `document_type` (text, not null) — e.g. 'id_front', 'id_back', 'proof_of_ownership'
- `document_url` (text, not null) — URL to the uploaded document
- `status` (text, default 'pending') — e.g. 'pending', 'approved', 'rejected'
- `created_at` (timestamptz, default now())

## 5. Foreign Keys
- properties.owner_id → users.id (ON DELETE SET NULL)
- bookings.property_id → properties.id (ON DELETE CASCADE)
- bookings.user_id → users.id (ON DELETE CASCADE)
- kyc_documents.user_id → users.id (ON DELETE CASCADE)

## 6. Security (RLS)
- RLS enabled on users, bookings, kyc_documents (properties already has RLS).
- Policies: anon + authenticated CRUD on all tables (app has no sign-in screen yet).
- When auth is added later, these policies should be tightened to ownership checks.
*/

-- ============================================================
-- 1. Extend existing properties table with new columns
-- ============================================================
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- ============================================================
-- 2. Create users table
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Now add owner_id FK to properties (depends on users table existing)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 3. Create bookings table
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in date NOT NULL,
  check_out date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Create kyc_documents table
-- ============================================================
CREATE TABLE IF NOT EXISTS kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. Enable RLS on all new tables
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS Policies — users table
-- ============================================================
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 7. RLS Policies — bookings table
-- ============================================================
DROP POLICY IF EXISTS "anon_select_bookings" ON bookings;
CREATE POLICY "anon_select_bookings" ON bookings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bookings" ON bookings;
CREATE POLICY "anon_insert_bookings" ON bookings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bookings" ON bookings;
CREATE POLICY "anon_update_bookings" ON bookings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bookings" ON bookings;
CREATE POLICY "anon_delete_bookings" ON bookings FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 8. RLS Policies — kyc_documents table
-- ============================================================
DROP POLICY IF EXISTS "anon_select_kyc_documents" ON kyc_documents;
CREATE POLICY "anon_select_kyc_documents" ON kyc_documents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_kyc_documents" ON kyc_documents;
CREATE POLICY "anon_insert_kyc_documents" ON kyc_documents FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_kyc_documents" ON kyc_documents;
CREATE POLICY "anon_update_kyc_documents" ON kyc_documents FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_kyc_documents" ON kyc_documents;
CREATE POLICY "anon_delete_kyc_documents" ON kyc_documents FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 9. RLS Policies — properties table (ensure policies exist)
-- ============================================================
DROP POLICY IF EXISTS "anon_select_properties" ON properties;
CREATE POLICY "anon_select_properties" ON properties FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_properties" ON properties;
CREATE POLICY "anon_insert_properties" ON properties FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_properties" ON properties;
CREATE POLICY "anon_update_properties" ON properties FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_properties" ON properties;
CREATE POLICY "anon_delete_properties" ON properties FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 10. Indexes for frequently queried columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
