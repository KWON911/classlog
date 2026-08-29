-- 학급 성장정원의 성장 기준 설정(교사별 1행).
-- 기본값은 코드(constants/growthSettings.ts)에만 두고 DB에 중복 저장하지 않는다 —
-- 행이 없으면 앱이 기본값을 쓴다. 이 표는 "교사가 바꾼 값"만 담는다.
-- 기존 테이블은 건드리지 않고 추가만 한다.

create table if not exists growth_settings (
  -- school_settings와 같은 1:1 설정 레코드라 teacher_id 자체가 기본키다.
  teacher_id uuid primary key references auth.users(id) default auth.uid(),
  -- 개인 식물 단계 기준(7개)과 학급 정원 단계 기준(6개). 단계 이름·색은 코드에 있고
  -- 여기에는 기준 점수만 순서대로 담는다.
  personal_thresholds integer[] not null,
  garden_thresholds integer[] not null,
  updated_at timestamptz not null default now()
);

alter table growth_settings enable row level security;

drop policy if exists "teachers manage own growth settings" on growth_settings;

create policy "teachers manage own growth settings" on growth_settings
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());
