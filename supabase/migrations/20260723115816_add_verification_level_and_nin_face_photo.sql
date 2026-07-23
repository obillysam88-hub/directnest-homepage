/*
# Add verification_level and nin_face_photo_url for OCR fallback

## Summary
Adds `verification_level` ('auto' or 'manual') to track whether KYC used
OCR auto-extraction or manual entry with crop-face tool. Adds
`nin_face_photo_url` to store the cropped face image used for face matching.

## Modified Tables

### verified_users
- `verification_level` (text, nullable): 'auto' if OCR succeeded, 'manual' if user entered manually

### kyc_attempts
- `verification_level` (text, nullable): same as above
- `nin_face_photo_url` (text, nullable): URL of the cropped face from the NIN slip

## Security
- No new tables. Existing RLS policies cover the new columns.
*/

ALTER TABLE verified_users ADD COLUMN IF NOT EXISTS verification_level text;
ALTER TABLE kyc_attempts ADD COLUMN IF NOT EXISTS verification_level text;
ALTER TABLE kyc_attempts ADD COLUMN IF NOT EXISTS nin_face_photo_url text;
