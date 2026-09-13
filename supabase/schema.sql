-- DONNA (나의 비서 도나) — Supabase schema
-- Supabase 대시보드 > SQL Editor 에서 전체를 붙여넣고 Run 하세요.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  work_type text not null default '회사' check (work_type in ('개인', '회사', '개인프로젝트')),
  start_date date,
  end_date date,
  status text not null default '예정' check (status in ('예정', '진행중', '완료', '보류', '드랍')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  work_type text not null default '회사' check (work_type in ('개인', '회사', '개인프로젝트')),
  title text not null,
  project_id uuid references public.projects (id) on delete set null,
  date_mode text not null check (date_mode in ('date', 'datetime', 'date_range', 'datetime_range')),
  start_date date not null,
  start_time time,
  end_date date,
  end_time time,
  due_date date not null,
  status text not null default '예정' check (status in ('예정', '진행중', '완료', '보류', '드랍')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists tasks_due_date_idx on public.tasks (due_date);

-- due_date is derived, not user-entered: single dates use start_date,
-- range tasks use end_date. Enforced here so it's always correct
-- regardless of which client wrote the row.
create or replace function public.set_task_due_date()
returns trigger as $$
begin
  if new.date_mode in ('date_range', 'datetime_range') then
    new.due_date := coalesce(new.end_date, new.start_date);
  else
    new.due_date := new.start_date;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_set_due_date on public.tasks;
create trigger tasks_set_due_date
  before insert or update on public.tasks
  for each row execute function public.set_task_due_date();

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- notification_logs — prevents duplicate 8:30am emails per user/day
-- ---------------------------------------------------------------------------
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_date date not null,
  sent_at timestamptz,
  status text not null check (status in ('sent', 'skipped', 'failed')),
  task_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, notification_date)
);

create index if not exists notification_logs_user_id_idx on public.notification_logs (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — every table is scoped strictly to auth.uid()
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.notification_logs enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

-- notification_logs is written by the cron job using the service role key,
-- which bypasses RLS entirely. Users may only ever read their own history.
drop policy if exists "notification_logs_select_own" on public.notification_logs;
create policy "notification_logs_select_own" on public.notification_logs
  for select using (auth.uid() = user_id);
