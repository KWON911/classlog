-- 월별 공동 목표와 한번 해금하면 유지되는 정원 장식 이력.
-- 추가 전용 migration: 기존 성장 기록이나 테이블은 수정하지 않는다.

create table if not exists class_goals (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  year integer not null check (year between 2000 and 2200),
  month integer not null check (month between 1 and 12),
  target_point integer not null check (target_point > 0),
  milestones jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, year, month)
);

create index if not exists class_goals_teacher_year_month_idx
  on class_goals (teacher_id, year, month);

alter table class_goals enable row level security;

create policy "teachers manage own class goals" on class_goals
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create table if not exists class_garden_unlocks (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  decoration_type text not null check (decoration_type in (
    'stone_path', 'bench', 'pond', 'birdhouse',
    'big_tree', 'bridge', 'fence', 'garden_lamp'
  )),
  year integer not null check (year between 2000 and 2200),
  month integer not null check (month between 1 and 12),
  milestone_point integer not null check (milestone_point > 0),
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (teacher_id, decoration_type),
  unique (teacher_id, year, month, milestone_point)
);

create index if not exists class_garden_unlocks_teacher_unlocked_idx
  on class_garden_unlocks (teacher_id, unlocked_at);

create index if not exists class_garden_unlocks_teacher_month_idx
  on class_garden_unlocks (teacher_id, year, month);

alter table class_garden_unlocks enable row level security;

create policy "teachers manage own class garden unlocks" on class_garden_unlocks
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());
