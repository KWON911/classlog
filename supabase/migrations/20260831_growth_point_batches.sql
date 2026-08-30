-- 선택 학생 일괄 상벌점 — growth_points에 "어떤 일괄 작업으로 만들어졌는지"만 덧붙인다.
-- 기존 데이터를 지우거나 옮기지 않는다(추가 전용 마이그레이션, drop table 없음).
-- 이미 있는 기록은 source가 null이므로 앱에서 'individual'로 해석한다.

alter table growth_points
  add column if not exists source text not null default 'individual';

alter table growth_points
  add column if not exists batch_id text;

-- 개별 기록은 batch_id가 null이고, 일괄 기록은 같은 batch_id를 공유한다.
-- 체크는 두 값이 어긋난 행(예: source=bulk인데 batch_id 없음)을 막는다.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'growth_points_source_batch_check'
  ) then
    alter table growth_points
      add constraint growth_points_source_batch_check check (
        (source = 'individual' and batch_id is null)
        or (source = 'bulk' and batch_id is not null)
      );
  end if;
end $$;

-- 일괄 기록 조회/취소는 항상 batch_id 한 건을 통째로 다룬다.
create index if not exists growth_points_batch_idx
  on growth_points (batch_id)
  where batch_id is not null;

-- RLS 정책은 그대로 둔다 — teacher_id + 학생 소유 확인이 일괄 insert의 모든 행에도
-- 그대로 적용되므로(with check는 행마다 평가된다) 남의 학생 id를 섞어 보내면
-- 그 insert 문 전체가 실패한다.
