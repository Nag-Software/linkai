-- ============================================================
-- Migration 014: Remove tracking events
-- ============================================================

drop policy if exists "Admins manage tracking events" on tracking_events;

drop table if exists tracking_events;
