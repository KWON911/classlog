create table if not exists plant_cycles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) default auth.uid(),
  cycle_number integer not null check (cycle_number > 0),
  flower_type text not null check (flower_type in ('tulip', 'sunflower', 'daisy', 'cosmos', 'rose', 'lily')),
  completed_at timestamptz not null,
  completion_threshold integer not null check (completion_threshold > 0),
  created_at timestamptz not null default now(),
  unique (teacher_id, student_id, cycle_number)
);

alter table plant_cycles enable row level security;

create policy "teachers manage own plant cycles" on plant_cycles
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and exists (
    select 1 from students s where s.id = student_id and s.teacher_id = auth.uid()
  ));
