-- ============================================================
-- Migration 001: Initial Schema
-- Run this in Supabase SQL editor or via supabase db push
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Enable UUID extension
-- ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- 5.1 profiles
-- ─────────────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid references auth.users(id) on delete cascade unique not null,
  email           text not null,
  full_name       text,
  role            text not null default 'artist'
                    check (role in ('owner', 'admin', 'staff', 'artist')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.2 artists
-- ─────────────────────────────────────────────────────────────
create table if not exists artists (
  id                  uuid primary key default gen_random_uuid(),
  auth_user_id        uuid references auth.users(id) on delete set null,
  full_name           text not null,
  stage_name          text,
  email               text not null,
  phone               text,
  profile_image_url   text,
  bio                 text,
  category            text[],
  language            text,
  social_links        jsonb,
  consent_ai_research boolean not null default false,

  status              text not null default 'pending_review'
                        check (status in ('pending_review', 'approved', 'rejected', 'inactive', 'flagged')),

  admin_score         integer,
  admin_energy_level  text check (admin_energy_level in ('high', 'low', 'uncertain')),
  admin_tags          text[],
  admin_notes         text,

  is_flagged          boolean not null default false,
  flag_reason         text,
  flagged_at          timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.3 artist_ai_assessments
-- ─────────────────────────────────────────────────────────────
create table if not exists artist_ai_assessments (
  id                    uuid primary key default gen_random_uuid(),
  artist_id             uuid not null references artists(id) on delete cascade,

  ai_score_suggestion   integer,
  ai_energy_suggestion  text check (ai_energy_suggestion in ('high', 'low', 'uncertain')),
  ai_experience_level   text,
  ai_confidence         text check (ai_confidence in ('low', 'medium', 'high')),
  ai_tags_suggestion    text[],

  ai_summary            text,
  ai_reasoning          text,
  ai_uncertainties      text,
  ai_sources            jsonb,

  ai_status             text not null default 'pending'
                          check (ai_status in ('pending', 'completed', 'failed')),
  ai_last_checked_at    timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.4 artist_availability
-- ─────────────────────────────────────────────────────────────
create table if not exists artist_availability (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists(id) on delete cascade,
  available_date date not null,
  created_at    timestamptz not null default now(),
  unique (artist_id, available_date)
);

-- ─────────────────────────────────────────────────────────────
-- 5.5 shows
-- ─────────────────────────────────────────────────────────────
create table if not exists shows (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  slug                text unique not null,
  description         text,
  date                date not null,
  start_time          time,
  end_time            time,

  venue_name          text,
  venue_address       text,

  capacity            integer,
  -- stored in smallest currency unit, e.g. 25000 = 250 NOK
  ticket_price        integer,
  currency            text not null default 'NOK',

  poster_url          text,
  status              text not null default 'draft'
                        check (status in ('draft', 'booking', 'fullbooked', 'published', 'completed', 'cancelled')),

  stripe_product_id   text,
  stripe_price_id     text,

  published_at        timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.6 show_requirements
-- ─────────────────────────────────────────────────────────────
create table if not exists show_requirements (
  id             uuid primary key default gen_random_uuid(),
  show_id        uuid not null references shows(id) on delete cascade,

  role_name      text not null,
  quantity       integer not null,
  min_score      integer,
  energy_level   text not null default 'any'
                   check (energy_level in ('high', 'low', 'any', 'uncertain')),
  required_tags  text[],

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.7 booking_offers
-- ─────────────────────────────────────────────────────────────
create table if not exists booking_offers (
  id                    uuid primary key default gen_random_uuid(),
  show_id               uuid not null references shows(id) on delete cascade,
  artist_id             uuid not null references artists(id) on delete cascade,
  show_requirement_id   uuid not null references show_requirements(id) on delete cascade,

  token                 text unique not null default encode(gen_random_bytes(32), 'hex'),
  status                text not null default 'sent'
                          check (status in ('sent', 'accepted', 'declined', 'expired', 'filled_by_other', 'cancelled')),

  fee_amount            integer,
  currency              text not null default 'NOK',

  sent_at               timestamptz,
  responded_at          timestamptz,
  expires_at            timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.8 confirmed_spots
-- ─────────────────────────────────────────────────────────────
create table if not exists confirmed_spots (
  id                    uuid primary key default gen_random_uuid(),
  show_id               uuid not null references shows(id) on delete cascade,
  artist_id             uuid not null references artists(id) on delete cascade,
  show_requirement_id   uuid not null references show_requirements(id) on delete cascade,
  booking_offer_id      uuid references booking_offers(id) on delete set null,

  fee_amount            integer,
  currency              text not null default 'NOK',

  status                text not null default 'confirmed'
                          check (status in ('confirmed', 'cancelled', 'completed', 'paid')),

  confirmed_at          timestamptz,
  cancelled_at          timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.9 customers
-- ─────────────────────────────────────────────────────────────
create table if not exists customers (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null,
  name                text,
  phone               text,
  marketing_consent   boolean not null default false,
  stripe_customer_id  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.10 orders
-- ─────────────────────────────────────────────────────────────
create table if not exists orders (
  id                            uuid primary key default gen_random_uuid(),
  show_id                       uuid references shows(id) on delete set null,
  customer_id                   uuid references customers(id) on delete set null,

  stripe_checkout_session_id    text unique,
  stripe_payment_intent_id      text,
  stripe_customer_id            text,

  amount_total                  integer,
  currency                      text not null default 'NOK',
  status                        text not null default 'pending'
                                  check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),

  buyer_email                   text,
  buyer_name                    text,

  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.11 tickets
-- ─────────────────────────────────────────────────────────────
create table if not exists tickets (
  id              uuid primary key default gen_random_uuid(),
  show_id         uuid not null references shows(id) on delete cascade,
  order_id        uuid not null references orders(id) on delete cascade,
  customer_id     uuid references customers(id) on delete set null,

  ticket_code     text unique not null default encode(gen_random_bytes(16), 'hex'),
  status          text not null default 'valid'
                    check (status in ('valid', 'used', 'refunded', 'cancelled')),

  checked_in_at   timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 5.12 artist_payouts
-- ─────────────────────────────────────────────────────────────
create table if not exists artist_payouts (
  id                  uuid primary key default gen_random_uuid(),
  artist_id           uuid not null references artists(id) on delete cascade,
  confirmed_spot_id   uuid references confirmed_spots(id) on delete set null,
  show_id             uuid references shows(id) on delete set null,

  amount              integer not null,
  currency            text not null default 'NOK',
  status              text not null default 'pending'
                        check (status in ('pending', 'approved', 'paid', 'cancelled')),

  payout_method       text,
  payout_reference    text,
  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  paid_at             timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- 5.13 artist_invoices
-- ─────────────────────────────────────────────────────────────
create table if not exists artist_invoices (
  id                  uuid primary key default gen_random_uuid(),
  artist_id           uuid not null references artists(id) on delete cascade,
  show_id             uuid references shows(id) on delete set null,
  confirmed_spot_id   uuid references confirmed_spots(id) on delete set null,

  invoice_number      text,
  amount              integer,
  currency            text not null default 'NOK',
  status              text not null default 'draft'
                        check (status in ('draft', 'submitted', 'approved', 'paid', 'rejected')),

  file_url            text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  submitted_at        timestamptz,
  approved_at         timestamptz,
  paid_at             timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- 5.15 email_logs
-- ─────────────────────────────────────────────────────────────
create table if not exists email_logs (
  id              uuid primary key default gen_random_uuid(),

  recipient_email text not null,
  subject         text,
  template_name   text,
  resend_email_id text,

  status          text not null default 'pending'
                    check (status in ('pending', 'sent', 'failed')),
  error_message   text,

  payload         jsonb,

  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- 5.16 marketing_tasks
-- ─────────────────────────────────────────────────────────────
create table if not exists marketing_tasks (
  id            uuid primary key default gen_random_uuid(),
  show_id       uuid not null references shows(id) on delete cascade,

  task_key      text check (task_key in (
                  'publish_event_page',
                  'activate_ticket_sales',
                  'upload_poster',
                  'create_facebook_event',
                  'share_facebook_groups',
                  'send_calendar_partners',
                  'schedule_email'
                )),
  label         text,
  is_completed  boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_profiles_auth_user_id on profiles(auth_user_id);
create index if not exists idx_artists_auth_user_id on artists(auth_user_id);
create index if not exists idx_artists_status on artists(status);
create index if not exists idx_artist_ai_assessments_artist_id on artist_ai_assessments(artist_id);
create index if not exists idx_artist_availability_artist_id on artist_availability(artist_id);
create index if not exists idx_shows_slug on shows(slug);
create index if not exists idx_shows_status on shows(status);
create index if not exists idx_shows_date on shows(date);
create index if not exists idx_show_requirements_show_id on show_requirements(show_id);
create index if not exists idx_booking_offers_token on booking_offers(token);
create index if not exists idx_booking_offers_artist_id on booking_offers(artist_id);
create index if not exists idx_booking_offers_show_id on booking_offers(show_id);
create index if not exists idx_confirmed_spots_show_id on confirmed_spots(show_id);
create index if not exists idx_confirmed_spots_artist_id on confirmed_spots(artist_id);
create index if not exists idx_orders_stripe_checkout_session_id on orders(stripe_checkout_session_id);
create index if not exists idx_orders_show_id on orders(show_id);
create index if not exists idx_tickets_ticket_code on tickets(ticket_code);
create index if not exists idx_tickets_order_id on tickets(order_id);
create index if not exists idx_artist_payouts_artist_id on artist_payouts(artist_id);
create index if not exists idx_artist_invoices_artist_id on artist_invoices(artist_id);
create index if not exists idx_marketing_tasks_show_id on marketing_tasks(show_id);

-- ─────────────────────────────────────────────────────────────
-- Auto-update updated_at trigger
-- ─────────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'artists', 'artist_ai_assessments',
    'shows', 'show_requirements', 'booking_offers',
    'confirmed_spots', 'customers', 'orders', 'tickets',
    'artist_payouts', 'artist_invoices', 'marketing_tasks'
  ]
  loop
    execute format(
      'create trigger trg_%s_updated_at before update on %s
       for each row execute function update_updated_at()',
      t, t
    );
  end loop;
end;
$$;
