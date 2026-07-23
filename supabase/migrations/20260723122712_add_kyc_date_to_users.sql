ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kyc_date timestamptz;
