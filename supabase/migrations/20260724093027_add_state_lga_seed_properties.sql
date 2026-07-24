/*
# Add state/lga columns, unique constraint on fingerprint_id, and seed 12 Nigerian listings

1. Schema
- Add `state` (text) column to `properties` for the Nigerian state (e.g. "Lagos").
- Add `lga` (text) column to `properties` for the local government area (e.g. "Eti-Osa").
- Both columns are nullable so existing rows are unaffected.
- Add a UNIQUE constraint on `fingerprint_id` so we can use ON CONFLICT for idempotent seeding.
2. Seed Data
- Insert 12 realistic placeholder property listings covering:
  - 3 Residential (Lekki Lagos, Gwarimpa Abuja, Enugu)
  - 3 Shops (Onitsha Anambra, Ikeja Lagos, Awka Anambra)
  - 3 Hotels (Asaba Delta, Awka Anambra, Calabar Cross River)
  - 3 Shortlet (Wuse Abuja, Port Harcourt Rivers, Ikeja Lagos)
- Each row has: title, property_type, state, lga, address, price, bedrooms,
  bathrooms, description, image_urls (jsonb with one Unsplash URL), fingerprint_id.
- Uses ON CONFLICT (fingerprint_id) DO NOTHING to stay idempotent.
3. Security
- No RLS changes. Existing anon+authenticated public policies already cover
  the new columns and seed rows.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'state'
  ) THEN
    ALTER TABLE properties ADD COLUMN state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'lga'
  ) THEN
    ALTER TABLE properties ADD COLUMN lga text;
  END IF;
END $$;

-- Add unique constraint on fingerprint_id if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_fingerprint_id_key'
  ) THEN
    ALTER TABLE properties ADD CONSTRAINT properties_fingerprint_id_key UNIQUE (fingerprint_id);
  END IF;
END $$;

INSERT INTO properties
  (title, description, property_type, state, lga, address, price, bedrooms, bathrooms, image_urls, fingerprint_id, status)
VALUES
  -- Residential
  (
    '2-Bedroom Flat in Lekki',
    'Modern 2-bedroom flat in a serene Lekki neighbourhood. Spacious living room, fitted kitchen, ample parking, and 24/7 security. Perfect for young professionals or small families.',
    'Residential', 'Lagos', 'Eti-Osa', 'Lekki Phase 1, Lagos', 2500000, 2, 2,
    '["https://images.unsplash.com/photo-1560448204-e02ea11c3a0c?w=800&q=80"]'::jsonb,
    'DN-RS-001', 'approved'
  ),
  (
    '3-Bedroom Duplex in Gwarimpa',
    'Well-finished 3-bedroom duplex in Gwarimpa Estate, Abuja. En-suite rooms, BQ, large compound with parking for 4 cars. Close to the city centre and major amenities.',
    'Residential', 'FCT Abuja', 'Gwarimpa', 'Gwarimpa Estate, Abuja', 4500000, 3, 4,
    '["https://images.unsplash.com/photo-1568605114967-8130f81a6abd?w=800&q=80"]'::jsonb,
    'DN-RS-002', 'approved'
  ),
  (
    '1-Bedroom Self-Contain in Enugu',
    'Neat and affordable 1-bedroom self-contain in a secure compound in Enugu. Tiled floors, prepaid meter, and water supply. Ideal for students or single professionals.',
    'Residential', 'Enugu', 'Enugu North', 'Independence Layout, Enugu', 600000, 1, 1,
    '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"]'::jsonb,
    'DN-RS-003', 'approved'
  ),
  -- Shops
  (
    'Shop Space in Onitsha Main Market',
    'Prime shop space in the bustling Onitsha Main Market, Anambra. High foot traffic, ideal for wholesale or retail trading. Secure lock-up with roller shutter.',
    'Shop', 'Anambra', 'Onitsha South', 'Onitsha Main Market, Anambra', 1800000, 0, 1,
    '["https://images.unsplash.com/photo-1567521464026-f36351f19519?w=800&q=80"]'::jsonb,
    'DN-SH-001', 'approved'
  ),
  (
    'Boutique Space in Ikeja',
    'Elegant boutique space on a busy Ikeja high street, Lagos. Large display window, air-conditioned interior, and dedicated parking. Perfect for fashion or lifestyle brands.',
    'Shop', 'Lagos', 'Ikeja', 'Allen Avenue, Ikeja, Lagos', 2200000, 0, 1,
    '["https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80"]'::jsonb,
    'DN-SH-002', 'approved'
  ),
  (
    'Kiosk in Awka',
    'Compact kiosk in a high-traffic area of Awka, Anambra. Suitable for snacks, airtime, or small retail. Secure and well-positioned near a major bus stop.',
    'Shop', 'Anambra', 'Awka South', 'Aroma Junction, Awka', 350000, 0, 0,
    '["https://images.unsplash.com/photo-1556761175-5949bf10a5b3?w=800&q=80"]'::jsonb,
    'DN-SH-003', 'approved'
  ),
  -- Hotels
  (
    '3-Star Hotel in Asaba',
    'Well-running 3-star hotel in Asaba, Delta State. 24 en-suite rooms, restaurant, conference room, and ample parking. Steady occupancy and trained staff.',
    'Hotel', 'Delta', 'Oshimili South', 'DBS Road, Asaba, Delta', 350000000, 24, 24,
    '["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80"]'::jsonb,
    'DN-HT-001', 'approved'
  ),
  (
    'Budget Hotel in Awka',
    'Clean and affordable budget hotel in Awka, Anambra. 16 rooms with standard facilities, 24-hour power, and a small bar area. Popular with travellers and civil servants.',
    'Hotel', 'Anambra', 'Awka South', 'Enugu-Onitsha Expressway, Awka', 120000000, 16, 16,
    '["https://images.unsplash.com/photo-1551882547-ff40c63f5d51?w=800&q=80"]'::jsonb,
    'DN-HT-002', 'approved'
  ),
  (
    'Resort Hotel in Calabar',
    'Scenic resort hotel in Calabar, Cross River. 40 rooms with river views, swimming pool, restaurant, and event lawn. A turnkey hospitality investment in a tourism hub.',
    'Hotel', 'Cross River', 'Calabar South', 'Marina Resort Road, Calabar', 550000000, 40, 40,
    '["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80"]'::jsonb,
    'DN-HT-003', 'approved'
  ),
  -- Shortlet
  (
    '1-Bedroom Shortlet in Wuse',
    'Furnished 1-bedroom shortlet apartment in Wuse 2, Abuja. Fast WiFi, smart TV, 24/7 power, and daily housekeeping. Walking distance to restaurants and malls.',
    'Shortlet', 'FCT Abuja', 'Wuse', 'Wuse 2, Abuja', 95000, 1, 1,
    '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80"]'::jsonb,
    'DN-SL-001', 'approved'
  ),
  (
    'Studio Apartment in Port Harcourt',
    'Modern studio apartment for short stays in Port Harcourt, Rivers. Compact kitchenette, comfortable work desk, and secure parking. Great for business travellers.',
    'Shortlet', 'Rivers', 'Port Harcourt', 'GRA Phase 2, Port Harcourt', 75000, 0, 1,
    '["https://images.unsplash.com/photo-1493809842364-78817addbb9f?w=800&q=80"]'::jsonb,
    'DN-SL-002', 'approved'
  ),
  (
    '2-Bedroom Shortlet in Ikeja',
    'Stylish 2-bedroom shortlet in Ikeja, Lagos. Fully furnished with modern appliances, fast internet, and a balcony with city views. Perfect for weekend getaways or business trips.',
    'Shortlet', 'Lagos', 'Ikeja', 'GRA Ikeja, Lagos', 130000, 2, 2,
    '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80"]'::jsonb,
    'DN-SL-003', 'approved'
  )
ON CONFLICT (fingerprint_id) DO NOTHING;
