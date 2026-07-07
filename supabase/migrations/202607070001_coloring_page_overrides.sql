create table if not exists public.coloring_page_overrides (
  page_id text primary key,
  title text check (title is null or char_length(title) between 1 and 100),
  category text check (category is null or category in ('animals', 'dinos', 'vehicles', 'people', 'places', 'space')),
  hidden boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.coloring_page_overrides enable row level security;

drop policy if exists coloring_page_overrides_staff_read on public.coloring_page_overrides;
drop policy if exists coloring_page_overrides_staff_write on public.coloring_page_overrides;

create policy coloring_page_overrides_staff_read on public.coloring_page_overrides
  for select using (public.is_staff());

create policy coloring_page_overrides_staff_write on public.coloring_page_overrides
  for all using (public.is_staff()) with check (public.is_staff());
