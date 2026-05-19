create table if not exists show_artist_booking_exclusions (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (show_id, artist_id)
);

alter table show_artist_booking_exclusions enable row level security;

create policy "Admins manage show artist booking exclusions"
  on show_artist_booking_exclusions for all
  using (is_admin());

create index if not exists idx_show_artist_booking_exclusions_show_id
  on show_artist_booking_exclusions(show_id);

create index if not exists idx_show_artist_booking_exclusions_artist_id
  on show_artist_booking_exclusions(artist_id);