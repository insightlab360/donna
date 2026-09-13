-- DONNA — 할 일 / 프로젝트 진행 메모 (사용자 본인 소유, 누적 기록)
-- Supabase 대시보드 > SQL Editor 에서 전체를 붙여넣고 Run 하세요.
-- Idempotent: 여러 번 실행해도 안전합니다.

create table if not exists public.task_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_notes_task_id_idx on public.task_notes (task_id);
create index if not exists task_notes_user_id_idx on public.task_notes (user_id);

drop trigger if exists task_notes_touch_updated_at on public.task_notes;
create trigger task_notes_touch_updated_at
  before update on public.task_notes
  for each row execute function public.touch_updated_at();

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_notes_project_id_idx on public.project_notes (project_id);
create index if not exists project_notes_user_id_idx on public.project_notes (user_id);

drop trigger if exists project_notes_touch_updated_at on public.project_notes;
create trigger project_notes_touch_updated_at
  before update on public.project_notes
  for each row execute function public.touch_updated_at();

-- 본인 소유 데이터 — tasks/projects와 동일한 RLS 패턴 (auth.uid() = user_id).
alter table public.task_notes enable row level security;
alter table public.project_notes enable row level security;

drop policy if exists "task_notes_select_own" on public.task_notes;
create policy "task_notes_select_own" on public.task_notes
  for select using (auth.uid() = user_id);
drop policy if exists "task_notes_insert_own" on public.task_notes;
create policy "task_notes_insert_own" on public.task_notes
  for insert with check (auth.uid() = user_id);
drop policy if exists "task_notes_update_own" on public.task_notes;
create policy "task_notes_update_own" on public.task_notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "task_notes_delete_own" on public.task_notes;
create policy "task_notes_delete_own" on public.task_notes
  for delete using (auth.uid() = user_id);

drop policy if exists "project_notes_select_own" on public.project_notes;
create policy "project_notes_select_own" on public.project_notes
  for select using (auth.uid() = user_id);
drop policy if exists "project_notes_insert_own" on public.project_notes;
create policy "project_notes_insert_own" on public.project_notes
  for insert with check (auth.uid() = user_id);
drop policy if exists "project_notes_update_own" on public.project_notes;
create policy "project_notes_update_own" on public.project_notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "project_notes_delete_own" on public.project_notes;
create policy "project_notes_delete_own" on public.project_notes
  for delete using (auth.uid() = user_id);
