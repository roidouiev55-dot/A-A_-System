-- personal_notes — single shared row holding the dashboard "פתקית אישית" free text.
-- One row, id = 'main', a single `content` column. Run once in the Supabase SQL editor.

create table if not exists public.personal_notes (
  id         text primary key default 'main',
  content    text default '',
  updated_at timestamptz default now()
);

-- seed the single row the app upserts into (id = 'main')
insert into public.personal_notes (id, content)
values ('main', '')
on conflict (id) do nothing;
