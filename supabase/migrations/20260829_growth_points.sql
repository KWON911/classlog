-- 학급 성장정원(/growth-garden)의 상점/벌점 기록 테이블.
-- 기존 프로젝트에 이어 붙이는 마이그레이션 — 기존 테이블을 건드리거나 지우지 않는다.
-- 실행 후 src/lib/growth-garden/constants.ts의 GROWTH_GARDEN_DATA_SOURCE를
-- 'supabase'로 바꾸면 앱이 mock(localStorage) 대신 이 테이블을 쓴다.

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

-- records와 같은 패턴: 본인 소유 + 그 학생이 실제로 본인 학생인지까지 확인한다.
-- 재실행 시 policy already exists 오류가 나므로 먼저 지운다.
drop policy if exists "teachers manage own growth points" on growth_points;

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
