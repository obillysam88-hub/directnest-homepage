/*
# Link KYC submissions to users table

Adds a nullable user_id FK to landlord_kyc_submissions so the admin
dashboard can promote the linked user to kyc_status='approved' when
a submission is approved. Nullable so existing rows are not lost.
*/

ALTER TABLE landlord_kyc_submissions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_id
  ON landlord_kyc_submissions(user_id);
