-- Categories are now data-driven: admins can create new ones from the catalog UI.
-- Relax the fixed category allow-list to a safe slug format so new categories are accepted,
-- while still preventing arbitrary/unsafe values.

alter table public.coloring_page_overrides
  drop constraint if exists coloring_page_overrides_category_check;

alter table public.coloring_page_overrides
  add constraint coloring_page_overrides_category_check
  check (category is null or category ~ '^[a-z0-9-]{2,24}$');
