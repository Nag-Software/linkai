-- ============================================================
-- Migration 020: Show marketing designs image-only constraint
-- ============================================================

delete from show_marketing_designs
where file_type <> 'image';

alter table show_marketing_designs
  drop constraint if exists show_marketing_designs_file_type_check;

alter table show_marketing_designs
  add constraint show_marketing_designs_file_type_check
  check (file_type = 'image');
