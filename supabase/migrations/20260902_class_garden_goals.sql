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

drop policy if exists "teachers manage own class goals" on class_goals;

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

drop policy if exists "teachers manage own class garden unlocks" on class_garden_unlocks;

create policy "teachers manage own class garden unlocks" on class_garden_unlocks
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- 여러 탭/기기에서 동시에 목표를 편집해도 영구 해금 이력을 덮어쓰지 못하게
-- DB 저장 경계에서 최신 unlock 행과 목표 JSON을 같은 트랜잭션 안에서 검증한다.
create or replace function enforce_class_goal_unlock_history()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  unlocked_count integer;
begin
  -- 같은 교사의 goal/unlock 쓰기를 직렬화해 두 테이블 사이의 write skew를 막는다.
  perform pg_advisory_xact_lock(hashtextextended(new.teacher_id::text, 0));

  if tg_op = 'INSERT' then
    select count(distinct decoration_type)
      into unlocked_count
      from class_garden_unlocks
      where teacher_id = new.teacher_id;

    if 8 - unlocked_count < 3 then
      raise exception using
        errcode = '23514',
        message = '새 공동 목표에는 사용하지 않은 장식이 3개 이상 필요합니다.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(new.milestones) as new_milestone
      join class_garden_unlocks as unlocked
        on unlocked.teacher_id = new.teacher_id
       and unlocked.decoration_type = new_milestone->>'decorationType'
    ) then
      raise exception using
        errcode = '23514',
        message = '이미 해금된 장식은 새 공동 목표에 다시 사용할 수 없습니다.';
    end if;
  end if;

  if tg_op = 'UPDATE' and (
    exists (
      select 1
      from jsonb_array_elements(old.milestones) as old_milestone
      join class_garden_unlocks as unlocked
        on unlocked.teacher_id = new.teacher_id
       and unlocked.decoration_type = old_milestone->>'decorationType'
      where not exists (
        select 1
        from jsonb_array_elements(new.milestones) as new_milestone
        where new_milestone->>'decorationType' = old_milestone->>'decorationType'
          and (new_milestone->>'point')::integer = (old_milestone->>'point')::integer
      )
    )
    or exists (
      select 1
      from jsonb_array_elements(new.milestones) as new_milestone
      join class_garden_unlocks as unlocked
        on unlocked.teacher_id = new.teacher_id
       and unlocked.decoration_type = new_milestone->>'decorationType'
      where not exists (
        select 1
        from jsonb_array_elements(old.milestones) as old_milestone
        where old_milestone->>'decorationType' = new_milestone->>'decorationType'
          and (old_milestone->>'point')::integer = (new_milestone->>'point')::integer
      )
    )
  ) then
    raise exception using
      errcode = '23514',
      message = '이미 해금된 단계의 점수와 장식은 변경하거나 삭제할 수 없습니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists class_goals_preserve_unlock_history on class_goals;
drop trigger if exists class_goals_validate_new_unlock_history on class_goals;
drop trigger if exists class_goals_validate_updated_unlock_history on class_goals;

-- UPSERT는 충돌 여부를 판단하기 전에 BEFORE INSERT trigger를 실행하므로,
-- 실제 신규 행에만 적용되도록 INSERT 검증은 AFTER로 분리한다.
create trigger class_goals_validate_new_unlock_history
  after insert on class_goals
  for each row execute function enforce_class_goal_unlock_history();

create trigger class_goals_validate_updated_unlock_history
  before update on class_goals
  for each row execute function enforce_class_goal_unlock_history();

create or replace function enforce_class_garden_unlock_goal_history()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  goal_milestones jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.teacher_id::text, 0));

  select milestones
    into goal_milestones
    from class_goals
    where teacher_id = new.teacher_id
      and year = new.year
      and month = new.month
    for update;

  if goal_milestones is null or not exists (
    select 1
    from jsonb_array_elements(goal_milestones) as milestone
    where milestone->>'decorationType' = new.decoration_type
      and (milestone->>'point')::integer = new.milestone_point
  ) then
    raise exception using
      errcode = '23514',
      message = '현재 공동 목표와 일치하는 단계만 해금할 수 있습니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists class_garden_unlocks_validate_goal_history on class_garden_unlocks;

create trigger class_garden_unlocks_validate_goal_history
  before insert on class_garden_unlocks
  for each row execute function enforce_class_garden_unlock_goal_history();
