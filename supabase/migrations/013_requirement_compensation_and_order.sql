alter table show_requirements
  add column if not exists lineup_position integer,
  add column if not exists compensation_type text
    check (compensation_type in ('fixed', 'percent')),
  add column if not exists compensation_amount integer,
  add column if not exists compensation_percent numeric(5, 2);

update show_requirements current_req
set lineup_position = ordered.position
from (
  select id, row_number() over (partition by show_id order by created_at, id) as position
  from show_requirements
) ordered
where current_req.id = ordered.id
  and current_req.lineup_position is null;

alter table show_requirements
  alter column lineup_position set default 1;

alter table show_requirements
  alter column lineup_position set not null;

do $$
begin
  alter table show_requirements
    add constraint show_requirements_lineup_position_check
    check (lineup_position > 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table show_requirements
    add constraint show_requirements_compensation_amount_check
    check (compensation_amount is null or compensation_amount >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table show_requirements
    add constraint show_requirements_compensation_percent_check
    check (compensation_percent is null or (compensation_percent >= 0 and compensation_percent <= 100));
exception
  when duplicate_object then null;
end $$;

create index if not exists show_requirements_show_id_lineup_position_idx
  on show_requirements(show_id, lineup_position);