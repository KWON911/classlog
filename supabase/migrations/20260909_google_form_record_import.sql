-- Google Form 응답을 Classlog 생활기록으로 한 번만 가져오는 추가 전용 migration.

create table if not exists public.google_form_record_imports (
  source_response_id text primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  imported_record_count integer not null check (imported_record_count > 0),
  imported_at timestamptz not null default now()
);

alter table public.google_form_record_imports enable row level security;

-- 이 추적 테이블은 브라우저에 노출하지 않는다. 서버의 service_role RPC만 사용한다.
revoke all on table public.google_form_record_imports from anon, authenticated;

create or replace function public.import_google_form_record(
  p_teacher_id uuid,
  p_response_id text,
  p_student_names text[],
  p_content text,
  p_record_date date
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  normalized_names text[];
  matched_count integer;
  import_created boolean;
begin
  if nullif(btrim(p_response_id), '') is null then
    raise exception 'response ID is required';
  end if;

  if nullif(btrim(p_content), '') is null then
    raise exception 'record content is required';
  end if;

  select array_agg(name order by name)
  into normalized_names
  from (
    select distinct btrim(name) as name
    from unnest(p_student_names) as input(name)
    where nullif(btrim(name), '') is not null
  ) as names;

  if coalesce(cardinality(normalized_names), 0) <> cardinality(p_student_names) then
    raise exception 'student names must be non-empty and unique';
  end if;

  select count(*)
  into matched_count
  from public.students
  where teacher_id = p_teacher_id
    and name = any(normalized_names);

  if matched_count <> cardinality(normalized_names) then
    raise exception 'one or more student names could not be matched';
  end if;

  insert into public.google_form_record_imports (
    source_response_id,
    teacher_id,
    imported_record_count
  ) values (
    btrim(p_response_id),
    p_teacher_id,
    cardinality(normalized_names)
  )
  on conflict (source_response_id) do nothing
  returning true into import_created;

  if not coalesce(import_created, false) then
    return jsonb_build_object('status', 'duplicate', 'importedCount', 0);
  end if;

  insert into public.records (student_id, teacher_id, category, content, record_date)
  select id, p_teacher_id, '생활지도', btrim(p_content), p_record_date
  from public.students
  where teacher_id = p_teacher_id
    and name = any(normalized_names);

  return jsonb_build_object('status', 'imported', 'importedCount', cardinality(normalized_names));
end;
$$;

revoke all on function public.import_google_form_record(uuid, text, text[], text, date) from public;
grant execute on function public.import_google_form_record(uuid, text, text[], text, date) to service_role;
