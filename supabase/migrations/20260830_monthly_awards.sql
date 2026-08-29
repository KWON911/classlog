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
