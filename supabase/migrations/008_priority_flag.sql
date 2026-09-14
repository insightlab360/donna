-- DONNA — 프로젝트/Task 우선순위 표시 기능
-- Supabase 대시보드 > SQL Editor 에서 전체를 붙여넣고 Run 하세요.
-- Idempotent: 여러 번 실행해도 안전합니다.
-- ⚠️ 승인 전까지 실행하지 마세요 — 관리자 승인 후에만 적용합니다.

alter table public.projects add column if not exists priority boolean not null default false;
alter table public.tasks add column if not exists priority boolean not null default false;
