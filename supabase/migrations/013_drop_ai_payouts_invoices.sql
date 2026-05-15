-- Drop AI assessment, artist payout, and invoice tables.
-- Payouts and invoices are tracked in Stripe instead.
-- AI assessment is no longer used.

drop table if exists artist_ai_assessments cascade;
drop table if exists artist_payouts cascade;
drop table if exists artist_invoices cascade;

-- Also drop the consent_ai_research column from artists since AI assessment is removed.
alter table artists drop column if exists consent_ai_research;
