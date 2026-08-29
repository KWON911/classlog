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
