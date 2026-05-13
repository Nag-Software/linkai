-- Change admin_type from single text to text[] to support multiple types per artist
ALTER TABLE artists
  DROP COLUMN IF EXISTS admin_type;

ALTER TABLE artists
  ADD COLUMN admin_type text[] DEFAULT NULL;