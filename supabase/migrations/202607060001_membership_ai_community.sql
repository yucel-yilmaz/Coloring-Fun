create extension if not exists pgcrypto;

create type public.app_role as enum ('parent', 'moderator', 'admin');
create type public.age_band as enum ('3-5', '6-8', '9-12');
create type public.ai_provider as enum ('openai', 'gemini');
create type public.connection_status as enum ('pending', 'ready', 'invalid');
create type public.job_status as enum (
  'queued', 'prompt_moderation', 'generating', 'processing',
  'image_moderation', 'quality_check', 'completed', 'failed', 'blocked', 'cancelled'
);
create type public.artwork_status as enum (
  'private', 'submitted', 'under_review', 'published', 'changes_requested',
  'rejected', 'withdrawn', 'taken_down', 'archived'
);
create type public.skill_version_status as enum ('draft', 'published', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'parent',
  display_name text not null default '',
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 40),
  age_band public.age_band not null,
  avatar_key text not null default 'sun',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index child_profiles_parent_idx on public.child_profiles(parent_id);

create table public.ai_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider public.ai_provider not null,
  model text not null,
  secret_ciphertext text not null,
  secret_iv text not null,
  secret_tag text not null,
  key_version integer not null default 1,
  masked_hint text not null,
  status public.connection_status not null default 'pending',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_connections_user_idx on public.ai_connections(user_id);

create table public.ai_skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null,
  active_version_id uuid,
  created_at timestamptz not null default now()
);

create table public.ai_skill_versions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.ai_skills(id) on delete cascade,
  version integer not null,
  status public.skill_version_status not null default 'draft',
  system_template text not null,
  negative_template text not null default '',
  provider_overrides jsonb not null default '{}'::jsonb,
  quality_rules jsonb not null default '{}'::jsonb,
  change_note text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(skill_id, version)
);
alter table public.ai_skills
  add constraint ai_skills_active_version_fk
  foreign key (active_version_id) references public.ai_skill_versions(id) on delete set null;

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  child_profile_id uuid not null references public.child_profiles(id) on delete cascade,
  connection_id uuid not null references public.ai_connections(id) on delete cascade,
  provider public.ai_provider not null,
  model text not null,
  status public.job_status not null default 'queued',
  progress integer not null default 0 check (progress between 0 and 100),
  request jsonb not null,
  skill_snapshot jsonb not null default '{}'::jsonb,
  compiled_prompt text,
  artwork_id uuid,
  attempt_count integer not null default 0,
  error_code text,
  error_message text,
  lease_until timestamptz,
  worker_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index generation_jobs_user_idx on public.generation_jobs(user_id, created_at desc);
create index generation_jobs_queue_idx on public.generation_jobs(status, lease_until, created_at);

create table public.artworks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  child_profile_id uuid references public.child_profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 100),
  subject text not null default '',
  category text not null default 'animals',
  age_band public.age_band,
  difficulty text check (difficulty in ('easy', 'medium', 'detailed')),
  source text not null check (source in ('generated', 'colored')),
  status public.artwork_status not null default 'private',
  moderation_status text not null default 'passed',
  generation_job_id uuid references public.generation_jobs(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.generation_jobs
  add constraint generation_jobs_artwork_fk foreign key (artwork_id) references public.artworks(id) on delete set null;
create index artworks_owner_idx on public.artworks(owner_id, created_at desc);
create index artworks_public_idx on public.artworks(status, published_at desc);

create table public.artwork_assets (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  kind text not null check (kind in ('source', 'processed', 'mask', 'thumbnail', 'colored')),
  bucket text not null,
  storage_path text not null,
  mime_type text not null,
  width integer,
  height integer,
  byte_size bigint not null default 0,
  sha256 text,
  created_at timestamptz not null default now(),
  unique(artwork_id, kind)
);

create table public.publication_submissions (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  rights_confirmed boolean not null check (rights_confirmed),
  status public.artwork_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  decided_at timestamptz
);
create index submissions_status_idx on public.publication_submissions(status, submitted_at);

create table public.moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.publication_submissions(id) on delete cascade,
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('automatic', 'manual')),
  decision text not null,
  reason_code text,
  note text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  unique(artwork_id, reporter_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role in ('moderator', 'admin')); $$;

create or replace function public.claim_generation_job(p_worker_id text)
returns setof public.generation_jobs language plpgsql security definer set search_path = public
as $$
declare claimed_id uuid;
begin
  select id into claimed_id from public.generation_jobs
  where (status = 'queued' or (status not in ('completed','failed','blocked','cancelled') and lease_until < now()))
  order by created_at for update skip locked limit 1;
  if claimed_id is null then return; end if;
  update public.generation_jobs
    set worker_id = p_worker_id, lease_until = now() + interval '5 minutes', updated_at = now()
    where id = claimed_id;
  return query select * from public.generation_jobs where id = claimed_id;
end $$;

create or replace function public.publish_skill_version(p_skill_id uuid, p_version_id uuid, p_actor_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists(select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'admin required';
  end if;
  update public.ai_skill_versions set status = 'archived'
    where skill_id = p_skill_id and status = 'published';
  update public.ai_skill_versions set status = 'published', published_at = now()
    where id = p_version_id and skill_id = p_skill_id;
  if not found then raise exception 'version not found'; end if;
  update public.ai_skills set active_version_id = p_version_id where id = p_skill_id;
end $$;

revoke execute on function public.claim_generation_job(text) from public, anon, authenticated;
grant execute on function public.claim_generation_job(text) to service_role;
revoke execute on function public.publish_skill_version(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_skill_version(uuid, uuid, uuid) to service_role;

insert into public.ai_skills(slug, name, kind) values
  ('coloring-page-generator', 'Boyama Sayfası Üretici', 'generation'),
  ('age-adapter', 'Yaş Uyarlayıcı', 'prompt'),
  ('scene-composer', 'Sahne Bestecisi', 'prompt'),
  ('prompt-safety-guard', 'Prompt Güvenliği', 'safety'),
  ('line-art-cleaner', 'Çizgi Temizleyici', 'processing'),
  ('colorability-evaluator', 'Boyanabilirlik Değerlendirici', 'quality'),
  ('content-metadata-generator', 'İçerik Meta Verisi', 'metadata')
on conflict (slug) do nothing;

do $$
declare
  skill_record record;
  new_version_id uuid;
  template_text text;
  rules jsonb;
begin
  for skill_record in
    select id, slug from public.ai_skills
    where slug <> 'coloring-page-generator' and active_version_id is null
  loop
    template_text := case skill_record.slug
      when 'age-adapter' then 'Age adaptation: for {{ageBand}}, use few large regions at 3-5, balanced medium regions at 6-8, and controlled extra detail at 9-12. Never create tiny trapped spaces.'
      when 'scene-composer' then 'Scene composition: use {{sceneDensity}} around {{subject}}. Keep the main subject centered, fully visible and separated from background objects.'
      when 'prompt-safety-guard' then 'Safety: make the scene gentle, fictional and non-frightening. Do not depict real children, personal data, violence, sexual content, hateful symbols, branded characters or copyrighted logos.'
      when 'line-art-cleaner' then 'Line-art requirements: use continuous {{lineWeight}} black contours, close every intended fill region, remove gray pixels, shadows, texture, captions and decorative borders.'
      when 'colorability-evaluator' then 'Quality target: every major white area must be enclosed by strong black boundaries and remain large enough for a child using a paint bucket.'
      when 'content-metadata-generator' then 'Metadata intent: describe the result using the generic subject {{subject}} and never include a child nickname or personal information.'
      else 'Apply safe printable coloring-page rules for {{subject}}.'
    end;
    rules := case when skill_record.slug = 'colorability-evaluator'
      then '{"minimumScore":75,"maxRetries":1}'::jsonb else '{}'::jsonb end;
    insert into public.ai_skill_versions(skill_id, version, status, system_template, quality_rules, change_note, published_at)
      values(skill_record.id, 1, 'published', template_text, rules, 'Başlangıç skill sürümü', now())
      returning id into new_version_id;
    update public.ai_skills set active_version_id = new_version_id where id = skill_record.id;
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.child_profiles enable row level security;
alter table public.ai_connections enable row level security;
alter table public.ai_skills enable row level security;
alter table public.ai_skill_versions enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.artworks enable row level security;
alter table public.artwork_assets enable row level security;
alter table public.publication_submissions enable row level security;
alter table public.moderation_reviews enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy child_profiles_owner on public.child_profiles for all using (parent_id = auth.uid() or public.is_staff()) with check (parent_id = auth.uid() or public.is_staff());
create policy jobs_owner_select on public.generation_jobs for select using (user_id = auth.uid() or public.is_staff());
create policy artworks_read on public.artworks for select using (owner_id = auth.uid() or status = 'published' or public.is_staff());
create policy assets_read on public.artwork_assets for select using (
  exists(select 1 from public.artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or a.status = 'published' or public.is_staff()))
);
create policy skills_staff_read on public.ai_skills for select using (public.is_staff());
create policy skill_versions_staff_read on public.ai_skill_versions for select using (public.is_staff());
create policy submissions_owner_read on public.publication_submissions for select using (submitted_by = auth.uid() or public.is_staff());
create policy reviews_staff_read on public.moderation_reviews for select using (public.is_staff());
create policy reports_owner_read on public.reports for select using (reporter_id = auth.uid() or public.is_staff());
create policy audit_staff_read on public.audit_logs for select using (public.is_staff());

insert into storage.buckets(id, name, public) values
  ('private-sources', 'private-sources', false),
  ('private-artworks', 'private-artworks', false),
  ('public-artworks', 'public-artworks', true)
on conflict (id) do nothing;

create policy private_storage_owner_read on storage.objects for select using (
  bucket_id in ('private-sources','private-artworks') and (storage.foldername(name))[1] = auth.uid()::text
);
create policy public_artworks_read on storage.objects for select using (bucket_id = 'public-artworks');

do $$
declare skill_uuid uuid; version_uuid uuid;
begin
  select id into skill_uuid from public.ai_skills where slug = 'coloring-page-generator';
  insert into public.ai_skill_versions(
    skill_id, version, status, system_template, negative_template, quality_rules, change_note, published_at
  ) values (
    skill_uuid, 1, 'published',
    'Create a printable black and white coloring page for a child aged {{ageBand}}. Subject: {{subject}}. {{customIdea}} Composition: {{sceneDensity}}. Difficulty: {{difficulty}}. Use {{lineWeight}} solid black outlines, pure white background, large closed regions, no text, no color, no gray, no shading, no hatching, no border and no signature. Keep every shape easy to fill with a paint bucket.',
    'color, grayscale, shadows, gradients, texture, cross-hatching, text, watermark, logo, photorealism, frightening content, thin broken lines, open contours',
    '{"minimumScore":75,"maxRetries":1}'::jsonb,
    'Başlangıç boyama sayfası skill sürümü', now()
  ) returning id into version_uuid;
  update public.ai_skills set active_version_id = version_uuid where id = skill_uuid;
end $$;
