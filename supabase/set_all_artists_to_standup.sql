-- Set all existing artists to the shared stand-up category.
-- Run in Supabase SQL Editor when you want to normalize the current dataset.

begin;

update artists
set
  category = array['stand-up']::text[],
  admin_type = array['stand-up']::text[],
  updated_at = now()
where category is distinct from array['stand-up']::text[]
   or admin_type is distinct from array['stand-up']::text[];

commit;

-- Optional verification
select id, full_name, stage_name, category, admin_type
from artists
order by created_at desc;
