alter table public.coloring_page_overrides
  add column if not exists line_art_url text check (
    line_art_url is null
    or line_art_url ~ '^/'
    or line_art_url ~* '^https?://'
  ),
  add column if not exists card_bg_color text;
