-- general_folders — single shared row holding the global asset-folder links
-- shown in the "תיקיות כלליות" section of the הפקות tab.
-- Run once in the Supabase SQL editor.

create table if not exists public.general_folders (
  id          text primary key default 'main',
  videos      text,
  images      text,
  logos       text,
  graphics    text,
  canva_posts text
);

-- seed the single row the app upserts into (id = 'main')
insert into public.general_folders (id)
values ('main')
on conflict (id) do nothing;
