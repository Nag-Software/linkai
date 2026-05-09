-- ============================================================
-- Migration 002: RLS Policies
-- ============================================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table artists enable row level security;
alter table artist_ai_assessments enable row level security;
alter table artist_availability enable row level security;
alter table shows enable row level security;
alter table show_requirements enable row level security;
alter table booking_offers enable row level security;
alter table confirmed_spots enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table tickets enable row level security;
alter table artist_payouts enable row level security;
alter table artist_invoices enable row level security;
alter table tracking_events enable row level security;
alter table email_logs enable row level security;
alter table marketing_tasks enable row level security;

-- ─────────────────────────────────────────────────────────────
-- Helper: check if current user has an admin/staff/owner role
-- ─────────────────────────────────────────────────────────────
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles
    where auth_user_id = auth.uid()
      and role in ('admin', 'owner', 'staff')
  );
$$;

-- Helper: get artist.id linked to current user
create or replace function my_artist_id()
returns uuid language sql security definer as $$
  select id from artists where auth_user_id = auth.uid() limit 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────
create policy "Users can view own profile"
  on profiles for select
  using (auth_user_id = auth.uid());

create policy "Admins can view all profiles"
  on profiles for select
  using (is_admin());

create policy "Users can update own profile"
  on profiles for update
  using (auth_user_id = auth.uid());

create policy "System can insert profile (service role)"
  on profiles for insert
  with check (true);  -- enforced via service-role only

-- ─────────────────────────────────────────────────────────────
-- artists
-- ─────────────────────────────────────────────────────────────
create policy "Artist can view own record"
  on artists for select
  using (auth_user_id = auth.uid());

create policy "Admins can view all artists"
  on artists for select
  using (is_admin());

create policy "Artist can update own record"
  on artists for update
  using (auth_user_id = auth.uid());

create policy "System insert artists"
  on artists for insert
  with check (true);

create policy "Admins can update any artist"
  on artists for update
  using (is_admin());

-- ─────────────────────────────────────────────────────────────
-- artist_ai_assessments
-- ─────────────────────────────────────────────────────────────
create policy "Artist can view own assessment"
  on artist_ai_assessments for select
  using (artist_id = my_artist_id());

create policy "Admins can view all assessments"
  on artist_ai_assessments for select
  using (is_admin());

create policy "System manages assessments"
  on artist_ai_assessments for all
  with check (true);  -- service role only

-- ─────────────────────────────────────────────────────────────
-- artist_availability
-- ─────────────────────────────────────────────────────────────
create policy "Artist manages own availability"
  on artist_availability for all
  using (artist_id = my_artist_id());

create policy "Admins view all availability"
  on artist_availability for select
  using (is_admin());

-- ─────────────────────────────────────────────────────────────
-- shows — public read for published shows
-- ─────────────────────────────────────────────────────────────
create policy "Anyone can view published shows"
  on shows for select
  using (status in ('published', 'fullbooked', 'completed'));

create policy "Admins manage shows"
  on shows for all
  using (is_admin());

-- ─────────────────────────────────────────────────────────────
-- show_requirements
-- ─────────────────────────────────────────────────────────────
create policy "Admins manage requirements"
  on show_requirements for all
  using (is_admin());

-- ─────────────────────────────────────────────────────────────
-- booking_offers
-- ─────────────────────────────────────────────────────────────
create policy "Artist can view own offers"
  on booking_offers for select
  using (artist_id = my_artist_id());

create policy "Admins manage all offers"
  on booking_offers for all
  using (is_admin());

-- ─────────────────────────────────────────────────────────────
-- confirmed_spots
-- ─────────────────────────────────────────────────────────────
create policy "Artist can view own confirmed spots"
  on confirmed_spots for select
  using (artist_id = my_artist_id());

create policy "Admins manage confirmed spots"
  on confirmed_spots for all
  using (is_admin());

-- ─────────────────────────────────────────────────────────────
-- customers / orders / tickets — admin only via RLS
-- Public purchases go through service-role (webhook handler)
-- ─────────────────────────────────────────────────────────────
create policy "Admins manage customers"
  on customers for all
  using (is_admin());

create policy "Admins manage orders"
  on orders for all
  using (is_admin());

create policy "Admins manage tickets"
  on tickets for all
  using (is_admin());

-- ─────────────────────────────────────────────────────────────
-- artist_payouts
-- ─────────────────────────────────────────────────────────────
create policy "Artist can view own payouts"
  on artist_payouts for select
  using (artist_id = my_artist_id());

create policy "Admins manage payouts"
  on artist_payouts for all
  using (is_admin());

-- ─────────────────────────────────────────────────────────────
-- artist_invoices
-- ─────────────────────────────────────────────────────────────
create policy "Artist manages own invoices"
  on artist_invoices for all
  using (artist_id = my_artist_id());

create policy "Admins manage invoices"
  on artist_invoices for all
  using (is_admin());

-- ─────────────────────────────────────────────────────────────
-- tracking_events / email_logs / marketing_tasks — admin only
-- ─────────────────────────────────────────────────────────────
create policy "Admins manage tracking events"
  on tracking_events for all
  using (is_admin());

create policy "Admins manage email logs"
  on email_logs for all
  using (is_admin());

create policy "Admins manage marketing tasks"
  on marketing_tasks for all
  using (is_admin());
