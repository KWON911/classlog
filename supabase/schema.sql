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

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  date date not null,
  status text not null check (status in ('결석', '지각', '조퇴', '결과')),
  reason_category text not null check (reason_category in ('질병', '미인정', '인정', '기타')),
  note text,
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
