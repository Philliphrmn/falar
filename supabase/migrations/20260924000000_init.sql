-- Einstellungen pro Nutzer (Tagesziel, Sprechtempo)
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  daily_goal_xp integer not null default 30 check (daily_goal_xp between 10 and 200),
  speech_rate real not null default 0.9 check (speech_rate between 0.5 and 1.5),
  updated_at timestamptz not null default now()
);

-- Abgeschlossene Lektionen
create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  best_score integer not null default 0 check (best_score between 0 and 100),
  times_completed integer not null default 0,
  last_completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Wiederholung (Leitner-Boxen) pro Vokabel / Satz
create table public.review_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  box integer not null default 1 check (box between 1 and 6),
  due_at timestamptz not null default now(),
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index review_items_due_idx on public.review_items (user_id, due_at);

-- XP pro Tag (für Tagesziel und Streak)
create table public.activity_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  xp integer not null default 0,
  lessons integer not null default 0,
  primary key (user_id, day)
);

alter table public.user_settings enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.review_items enable row level security;
alter table public.activity_days enable row level security;

create policy "own settings" on public.user_settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own lesson progress" on public.lesson_progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own review items" on public.review_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own activity" on public.activity_days for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
