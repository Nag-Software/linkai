-- ============================================================
-- Migration 017: Use artists.category as the single role source
-- ============================================================

create or replace function normalize_artist_role_value(input text)
returns text
language sql
immutable
as $$
  select case lower(btrim(coalesce(input, '')))
    when 'headliner' then 'headliner'
    when 'headline' then 'headliner'
    when 'hoved' then 'headliner'
    when 'hovednavn' then 'headliner'
    when 'top' then 'headliner'
    when 'topper' then 'headliner'
    when 'konferansier' then 'konferansier'
    when 'konferanse' then 'konferansier'
    when 'konferans' then 'konferansier'
    when 'mc' then 'konferansier'
    when 'vert' then 'konferansier'
    when 'host' then 'konferansier'
    when 'standup' then 'stand-up'
    when 'stand-up' then 'stand-up'
    when 'klubbkomiker' then 'stand-up'
    when 'klubb' then 'stand-up'
    when 'support' then 'stand-up'
    when 'supporting' then 'stand-up'
    when 'opener' then 'stand-up'
    when 'oppvarmer' then 'stand-up'
    when 'spot' then 'stand-up'
    when 'open mic' then 'open mic'
    when 'openmic' then 'open mic'
    when 'open-mic' then 'open mic'
    when 'open_mic' then 'open mic'
    else null
  end
$$;

create or replace function normalize_artist_role_array(input text[])
returns text[]
language sql
immutable
as $$
  with normalized as (
    select normalize_artist_role_value(value) as value
    from unnest(coalesce(input, array[]::text[])) as raw(value)
  )
  select case
    when exists(select 1 from normalized where value is not null)
      then array(select distinct value from normalized where value is not null order by value)
    else null
  end
$$;

update artists
set
  category = coalesce(
    normalize_artist_role_array(admin_type),
    normalize_artist_role_array(category)
  ),
  updated_at = now()
where admin_type is not null
   or category is not null;

alter table artists
  drop column if exists admin_type;

drop function if exists normalize_artist_role_array(text[]);
drop function if exists normalize_artist_role_value(text);
