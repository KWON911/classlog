-- Apply this migration to existing projects after the schema baseline.
-- It removes only app data through the guarded reset function; auth.users is untouched.

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
    raise exception 'Administrator privileges are required.' using errcode = '42501';
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
    raise exception 'Administrator privileges are required.' using errcode = '42501';
  end if;

  if target_teacher_id is null then
    raise exception 'Select an account to reset.';
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
