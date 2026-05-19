-- ============================================================
-- Migration 019: Show marketing designs
-- ============================================================

insert into storage.buckets (id, name, public)
values ('show-marketing-designs', 'show-marketing-designs', true)
on conflict (id) do nothing;

create table if not exists show_marketing_designs (
  id          uuid primary key default gen_random_uuid(),
  show_id     uuid not null references shows(id) on delete cascade,

  label       text,
  file_url    text not null,
  file_path   text not null,
  file_name   text not null,
  mime_type   text not null,
  file_type   text not null check (file_type = 'image'),
  file_size   bigint,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table show_marketing_designs enable row level security;

alter table shows
  add column if not exists selected_marketing_design_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shows_selected_marketing_design_id_fkey'
  ) then
    alter table shows
      add constraint shows_selected_marketing_design_id_fkey
      foreign key (selected_marketing_design_id)
      references show_marketing_designs(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_show_marketing_designs_show_id on show_marketing_designs(show_id);
create index if not exists idx_shows_selected_marketing_design_id on shows(selected_marketing_design_id);

create policy "Admins manage show marketing designs"
  on show_marketing_designs for all
  using (is_admin());

create policy "Public read show-marketing-designs"
  on storage.objects for select
  using (bucket_id = 'show-marketing-designs');

create policy "Admin manages show-marketing-designs"
  on storage.objects for all
  using (bucket_id = 'show-marketing-designs' and is_admin());