create extension if not exists pgcrypto;

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  number integer not null,
  name text not null,
  gender text,
  birthdate text,
  student_phone text,
  address text,
  father_name text,
  father_phone text,
  mother_name text,
  mother_phone text,
  emergency_contact text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  category text not null check (category in ('생활지도', '학습', '진로', '학부모상담', '기타')),
  content text not null,
  record_date date not null,
  created_at timestamptz not null default now()
);

alter table students enable row level security;
alter table records enable row level security;

create policy "teachers manage own students" on students
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "teachers manage own records" on records
  for all
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s
      where s.id = student_id
        and s.teacher_id = auth.uid()
    )
  );

create table if not exists yorok_columns (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  label text not null,
  type text not null check (type in ('text', 'checkbox')),
  position integer not null,
  created_at timestamptz not null default now()
);

alter table yorok_columns enable row level security;

create policy "teachers manage own yorok columns" on yorok_columns
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create table if not exists yorok_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (student_id)
);

alter table yorok_entries enable row level security;

create policy "teachers manage own yorok entries" on yorok_entries
  for all
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s
      where s.id = student_id
        and s.teacher_id = auth.uid()
    )
  );

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  date date not null,
  status text not null check (status in ('결석', '지각', '조퇴', '결과')),
  reason_category text not null check (reason_category in ('질병', '미인정', '인정', '기타')),
  note text,
  neis_entered boolean not null default false,
  document_received boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

alter table attendance enable row level security;

create policy "teachers manage own attendance" on attendance
  for all
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s
      where s.id = student_id
        and s.teacher_id = auth.uid()
    )
  );

-- Migration for a project where attendance already existed before the NEIS
-- 입력 여부 / 증빙서류 수령 여부 tracking feature: the create table above is a
-- no-op there (create table if not exists doesn't add columns to an
-- existing table), so run this separately in the Supabase SQL editor. Safe
-- to re-run and safe against existing data — both columns are NOT NULL
-- with a DEFAULT, so existing rows are backfilled automatically, no data
-- is dropped.
alter table attendance
  add column if not exists neis_entered boolean not null default false;

alter table attendance
  add column if not exists document_received boolean not null default false;

create table if not exists seating_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  plan_date date not null,
  rows integer not null,
  columns integer not null,
  teacher_direction text not null default 'north' check (teacher_direction in ('north', 'south')),
  seats jsonb not null,
  assignments jsonb not null,
  separations jsonb not null,
  gender_balance boolean not null default false,
  avoid_past_neighbors boolean not null default false,
  avoid_previous_seats boolean not null default false,
  previous_seat_history_scope text not null default 'latest3'
    check (previous_seat_history_scope in ('latest1', 'latest3', 'currentSemester', 'all')),
  created_at timestamptz not null default now()
);

alter table seating_plans enable row level security;

create policy "teachers manage own seating plans" on seating_plans
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- Migration for a project where seating_plans already existed before the
-- "이전에 앉았던 자리 피하기" feature: the create table above is a no-op there
-- (create table if not exists doesn't add columns to an existing table), so
-- run this separately in the Supabase SQL editor. Safe to re-run and safe
-- against existing data — both columns are NOT NULL with a DEFAULT, so
-- existing rows are backfilled automatically, no data is dropped.
alter table seating_plans
  add column if not exists avoid_previous_seats boolean not null default false;

alter table seating_plans
  add column if not exists previous_seat_history_scope text not null default 'latest3';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'seating_plans_previous_seat_history_scope_check'
  ) then
    alter table seating_plans
      add constraint seating_plans_previous_seat_history_scope_check
      check (previous_seat_history_scope in ('latest1', 'latest3', 'currentSemester', 'all'));
  end if;
end $$;

-- One row per teacher: the school/class NEIS uses to look up the home
-- page's weekly timetable and meal cards. teacher_id is the primary key
-- (not a separate id column) since this is a 1:1 settings row, not a list.
create table if not exists school_settings (
  teacher_id uuid primary key references auth.users(id) default auth.uid(),
  office_code text not null,
  school_code text not null,
  school_name text not null,
  school_year text not null,
  grade text not null,
  class_name text not null,
  updated_at timestamptz not null default now()
);

alter table school_settings enable row level security;

create policy "teachers manage own school settings" on school_settings
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- Administrator-only account data management. Authentication accounts are never
-- deleted: this only removes the application's teacher-scoped data.
create or replace function public.is_classlog_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and lower(email) = 'dosung83@gmail.com'
  );
$$;

revoke all on function public.is_classlog_admin() from public;
revoke all on function public.is_classlog_admin() from anon;
revoke all on function public.is_classlog_admin() from authenticated;

create or replace function public.list_managed_accounts()
returns table (
  teacher_id uuid,
  email text,
  student_count bigint,
  record_count bigint,
  attendance_count bigint,
  seating_plan_count bigint,
  has_school_settings boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_classlog_admin() then
    raise exception '관리자만 계정 목록을 조회할 수 있습니다.' using errcode = '42501';
  end if;

  return query
  select
    users.id,
    users.email::text,
    (select count(*) from public.students where students.teacher_id = users.id),
    (select count(*) from public.records where records.teacher_id = users.id),
    (select count(*) from public.attendance where attendance.teacher_id = users.id),
    (select count(*) from public.seating_plans where seating_plans.teacher_id = users.id),
    exists (select 1 from public.school_settings where school_settings.teacher_id = users.id)
  from auth.users as users
  order by users.email;
end;
$$;

revoke all on function public.list_managed_accounts() from public;
revoke all on function public.list_managed_accounts() from anon;
grant execute on function public.list_managed_accounts() to authenticated;

create or replace function public.reset_managed_account(target_teacher_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_classlog_admin() then
    raise exception '관리자만 계정 데이터를 초기화할 수 있습니다.' using errcode = '42501';
  end if;

  if target_teacher_id is null then
    raise exception '초기화할 계정을 선택해 주세요.';
  end if;

  delete from public.attendance where teacher_id = target_teacher_id;
  delete from public.records where teacher_id = target_teacher_id;
  delete from public.seating_plans where teacher_id = target_teacher_id;
  delete from public.school_settings where teacher_id = target_teacher_id;
  delete from public.students where teacher_id = target_teacher_id;
end;
$$;

revoke all on function public.reset_managed_account(uuid) from public;
revoke all on function public.reset_managed_account(uuid) from anon;
grant execute on function public.reset_managed_account(uuid) to authenticated;

-- 학급 성장정원(/apps/growth-garden)의 상점/벌점 기록.
-- 앱은 기본적으로 mock(localStorage)으로 동작하므로, 이 블록을 실행한 뒤
-- src/lib/growth-garden/constants.ts의 GROWTH_GARDEN_DATA_SOURCE를 'supabase'로
-- 바꿔야 실제로 이 테이블을 쓰기 시작한다.
create table if not exists growth_points (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  -- 상점/벌점. TS의 GrowthPointType 유니온과 항상 함께 바꿀 것.
  type text not null check (type in ('merit', 'demerit')),
  -- 항상 양수. 부호는 type이 결정한다(집계 로직은 src/lib/growth-garden/growth.ts).
  amount integer not null check (amount > 0),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists growth_points_student_created_idx
  on growth_points (student_id, created_at desc);

alter table growth_points enable row level security;

create policy "teachers manage own growth points" on growth_points
  for all
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s
      where s.id = student_id
        and s.teacher_id = auth.uid()
    )
  );

-- 학급 성장정원의 보상 기록(월별 리포트에서 지급).
-- 상벌점(growth_points)과 완전히 분리된 테이블이다 — 보상을 지급해도 성장 포인트는
-- 차감되지 않는다. 기존 테이블은 건드리지 않고 추가만 한다.

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  -- 'class'는 학급 전체 보상, 'student'는 개인 보상.
  scope text not null check (scope in ('class', 'student')),
  -- 개인 보상일 때만 학생을 참조한다(학생 이름은 저장하지 않는다).
  student_id uuid references students(id) on delete cascade,
  year integer not null check (year between 2000 and 2200),
  month integer not null check (month between 1 and 12),
  title text not null,
  description text,
  awarded_on date not null default current_date,
  created_at timestamptz not null default now(),
  -- scope와 student_id가 어긋난 행이 생기지 않게 DB에서도 막는다.
  constraint rewards_scope_student_ck check (
    (scope = 'class' and student_id is null) or (scope = 'student' and student_id is not null)
  )
);

create index if not exists rewards_month_idx on rewards (teacher_id, year, month);

alter table rewards enable row level security;

drop policy if exists "teachers manage own rewards" on rewards;

-- records/growth_points와 같은 패턴: 본인 소유 + 개인 보상이면 그 학생이 본인 학생인지 확인.
create policy "teachers manage own rewards" on rewards
  for all
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and (
      student_id is null
      or exists (
        select 1 from students s
        where s.id = student_id
          and s.teacher_id = auth.uid()
      )
    )
  );

-- 월간 성장상(월별 리포트에서 교사가 직접 선정).
-- growth_points·rewards와 마찬가지로 성장 포인트와 완전히 분리된 기록이다 —
-- 수상하거나 취소해도 학생 점수와 상벌점 기록에는 아무 영향이 없다.
-- 한 달에 여러 명을 선정할 수 있으므로 (student, year, month)에 unique를 걸지 않는다.

create table if not exists monthly_awards (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  student_id uuid not null references students(id) on delete cascade,
  year integer not null check (year between 2000 and 2200),
  month integer not null check (month between 1 and 12),
  -- 선정 시점의 월간 성장값을 남겨 둔다(이후 기록이 바뀌어도 수상 근거가 보존된다).
  monthly_growth integer not null,
  title text not null,
  reward_title text not null,
  reward_description text,
  awarded_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists monthly_awards_month_idx on monthly_awards (teacher_id, year, month);

alter table monthly_awards enable row level security;

drop policy if exists "teachers manage own monthly awards" on monthly_awards;

-- records/growth_points/rewards와 같은 패턴: 본인 소유 + 그 학생이 본인 학생인지 확인.
create policy "teachers manage own monthly awards" on monthly_awards
  for all
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from students s
      where s.id = student_id
        and s.teacher_id = auth.uid()
    )
  );
