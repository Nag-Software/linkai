-- ============================================================
-- Migration 010: Add artist_type and medium energy level
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Extend admin_energy_level to include 'medium'
--    Drop old check constraint and recreate with new values
-- ─────────────────────────────────────────────────────────────
alter table artists drop constraint if exists artists_admin_energy_level_check;

alter table artists
  add constraint artists_admin_energy_level_check
    check (admin_energy_level in ('high', 'medium', 'low', 'uncertain'));

-- ─────────────────────────────────────────────────────────────
-- 2. Artist type (admin-set classification)
-- ─────────────────────────────────────────────────────────────
alter table artists
  add column if not exists admin_type text
    check (admin_type in ('headliner', 'konferansier', 'klubbkomiker', 'open_mic'));
