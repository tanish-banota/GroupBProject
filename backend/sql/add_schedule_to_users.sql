-- Run once in the same Supabase project where create_users.sql was applied.
alter table public.users
  add column selected_courses jsonb not null default '[]'::jsonb
    check (jsonb_typeof(selected_courses) = 'array'),
  add column scheduled_sections jsonb not null default '[]'::jsonb
    check (jsonb_typeof(scheduled_sections) = 'array');

-- The existing owner-only SELECT and UPDATE RLS policies still apply.
grant update (selected_courses, scheduled_sections) on public.users to authenticated;
