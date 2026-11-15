-- Run in the SQL editor of the Supabase project used by the frontend.
-- Supabase Auth owns auth.users; this table stores app-visible profile data.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

revoke all on public.users from anon, authenticated;
grant select on public.users to authenticated;
grant update (display_name) on public.users to authenticated;

create policy "Users can read their own profile"
  on public.users for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.users for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create schema if not exists app_private;
revoke all on schema app_private from public;

create function app_private.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 100),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

revoke all on function app_private.create_user_profile() from public;

create trigger create_user_profile_after_signup
  after insert on auth.users
  for each row execute function app_private.create_user_profile();

-- Cover accounts that were created before this table existed.
insert into public.users (id, display_name, avatar_url)
select
  id,
  left(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'), 100),
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;
