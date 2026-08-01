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
