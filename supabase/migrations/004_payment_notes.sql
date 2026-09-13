-- DONNA — 메모2를 누적 결제내역 메모(히스토리)로 전환
-- Supabase 대시보드 > SQL Editor 에서 전체를 붙여넣고 Run 하세요.
-- Idempotent: 여러 번 실행해도 안전합니다.

-- 단일 텍스트였던 memo2는 폐기하고, 매번 새 행으로 쌓이는 이력 테이블로 대체한다.
alter table public.member_notes drop column if exists memo2;

create table if not exists public.member_payment_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) <= 30),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists member_payment_notes_user_id_idx on public.member_payment_notes (user_id);

-- 관리자만 조회 가능. 회원 본인은 절대 조회할 수 없다.
-- 쓰기는 서버 API(/api/admin/members/[id]/payment-notes)가 service role로만 처리한다 (추가만 가능, 수정/삭제 없음).
alter table public.member_payment_notes enable row level security;

drop policy if exists "member_payment_notes_select_admin" on public.member_payment_notes;
create policy "member_payment_notes_select_admin" on public.member_payment_notes
  for select using (public.is_admin());
