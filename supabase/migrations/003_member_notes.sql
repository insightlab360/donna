-- DONNA — 관리자 전용 회원 메모
-- Supabase 대시보드 > SQL Editor 에서 전체를 붙여넣고 Run 하세요.
-- Idempotent: 여러 번 실행해도 안전합니다.

create table if not exists public.member_notes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  memo1 text check (char_length(memo1) <= 5),
  memo2 text check (char_length(memo2) <= 30),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

drop trigger if exists member_notes_touch_updated_at on public.member_notes;
create trigger member_notes_touch_updated_at
  before update on public.member_notes
  for each row execute function public.touch_updated_at();

-- 관리자만 조회 가능. 회원 본인은 절대 조회할 수 없다 (row-owner select policy 없음).
-- 쓰기는 서버 API(/api/admin/members/[id]/notes)가 service role로만 처리한다.
alter table public.member_notes enable row level security;

drop policy if exists "member_notes_select_admin" on public.member_notes;
create policy "member_notes_select_admin" on public.member_notes
  for select using (public.is_admin());
