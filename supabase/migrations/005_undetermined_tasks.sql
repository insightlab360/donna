-- DONNA — 할 일에 "기한 미정" 지원 추가
-- Supabase 대시보드 > SQL Editor 에서 전체를 붙여넣고 Run 하세요.
-- Idempotent: 여러 번 실행해도 안전합니다.
-- (프로젝트는 이미 start_date/end_date가 nullable이라 별도 변경이 필요 없습니다.)

alter table public.tasks alter column start_date drop not null;
alter table public.tasks alter column due_date drop not null;

alter table public.tasks drop constraint if exists tasks_date_mode_check;
alter table public.tasks add constraint tasks_date_mode_check
  check (date_mode in ('date', 'datetime', 'date_range', 'datetime_range', 'none'));

create or replace function public.set_task_due_date()
returns trigger as $$
begin
  if new.date_mode = 'none' then
    new.due_date := null;
  elsif new.date_mode in ('date_range', 'datetime_range') then
    new.due_date := coalesce(new.end_date, new.start_date);
  else
    new.due_date := new.start_date;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;
