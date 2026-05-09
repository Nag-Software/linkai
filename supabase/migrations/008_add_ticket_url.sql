-- Migration 008: Add ticket_url to shows
-- Allows shows to link to an external ticketing URL (fallback / alternative to Stripe checkout)
alter table shows add column if not exists ticket_url text;
