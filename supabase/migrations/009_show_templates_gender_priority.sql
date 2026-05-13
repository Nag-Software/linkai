-- ============================================================
-- Migration 009: Show templates, artist gender, booking priority
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Artist gender
-- ─────────────────────────────────────────────────────────────
alter table artists
  add column if not exists gender text
    check (gender in ('male', 'female', 'other'));

-- ─────────────────────────────────────────────────────────────
-- 2. Required gender on show requirements
-- ─────────────────────────────────────────────────────────────
alter table show_requirements
  add column if not exists required_gender text not null default 'any'
    check (required_gender in ('male', 'female', 'any'));

-- ─────────────────────────────────────────────────────────────
-- 3. Mark a show as a reusable template
-- ─────────────────────────────────────────────────────────────
alter table shows
  add column if not exists is_template boolean not null default false;

-- ─────────────────────────────────────────────────────────────
-- 4. Index: quickly find template shows
-- ─────────────────────────────────────────────────────────────
create index if not exists shows_is_template_idx on shows (is_template) where is_template = true;
