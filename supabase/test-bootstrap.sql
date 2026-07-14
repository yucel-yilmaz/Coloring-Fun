create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create function auth.role() returns text language sql stable as $$ select 'service_role'::text $$;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null
);
create function storage.foldername(name text) returns text[] language sql immutable
as $$ select string_to_array(name, '/') $$;
