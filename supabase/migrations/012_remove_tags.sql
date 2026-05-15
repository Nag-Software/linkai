-- Remove tag columns from artists, artist_ai_assessments, and show_requirements

ALTER TABLE artists DROP COLUMN IF EXISTS admin_tags;
ALTER TABLE artist_ai_assessments DROP COLUMN IF EXISTS ai_tags_suggestion;
ALTER TABLE show_requirements DROP COLUMN IF EXISTS required_tags;
