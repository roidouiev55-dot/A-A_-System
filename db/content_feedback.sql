-- content_feedback — every approve/reject the user makes in the "מאמן התוכן"
-- (Content Trainer) tab. This is the training data: newest rows per brand are
-- fed back into the Gemini prompt so suggestions improve over time.
-- Run once in the Supabase SQL editor.

create table if not exists public.content_feedback (
  id           uuid primary key default gen_random_uuid(),
  brand        text not null,                 -- WN / MX / BG / WB
  content_type text,                          -- suggested content type (label)
  suggestion   text,                          -- the full suggestion shown
  decision     text not null,                 -- 'approved' | 'rejected'
  note         text,                          -- optional free-text note
  created_at   timestamptz not null default now()
);

-- fast "last 10 for this brand" lookups the prompt builder makes
create index if not exists content_feedback_brand_created_idx
  on public.content_feedback (brand, created_at desc);
