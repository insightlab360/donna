-- DONNA — 성능/확장성 점검에 따른 인덱스 추가
-- Supabase 대시보드 > SQL Editor 에서 전체를 붙여넣고 Run 하세요.
-- Idempotent: 여러 번 실행해도 안전합니다. 기존 데이터/인덱스는 건드리지 않습니다 (추가만 합니다).

-- ============================================================
-- tasks — 사용자 범위 + 기간(due_date/start_date) 조회에 쓰이는 복합 인덱스.
-- 캘린더의 "현재 화면에 걸치는 일정만" 조회(start_date <= 기간끝 AND due_date >= 기간시작)와
-- Task 목록/대시보드의 "사용자 소유 + 기간" 조회를 함께 지원한다.
-- (단일 컬럼 tasks_user_id_idx / tasks_due_date_idx는 이미 존재 — 삭제하지 않고 유지)
-- ============================================================
create index if not exists tasks_user_id_due_date_idx on public.tasks (user_id, due_date);
create index if not exists tasks_user_id_start_date_idx on public.tasks (user_id, start_date);

-- ============================================================
-- profiles — 만료 배치(cron)가 "active 이면서 access_end_at이 지난" 행을
-- 한 번의 UPDATE ... WHERE로 찾을 때 쓰는 복합 인덱스.
-- ============================================================
create index if not exists profiles_membership_status_access_end_at_idx
  on public.profiles (membership_status, access_end_at);

-- ============================================================
-- audit_logs — 최신순 조회/페이지네이션 대비. actor_id / (target_table, target_id)는
-- 이미 인덱스가 있으므로 created_at만 추가한다.
-- ============================================================
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ============================================================
-- 검토했지만 추가하지 않은 인덱스 (실제 쿼리 패턴에 없어 과잉 인덱스로 판단):
--  - tasks.status        : 서버 쿼리에서 status로 필터링하는 곳이 없음 (클라이언트에서만 필터링)
--  - profiles.role       : 이미 profiles_role_idx 존재
--  - notification_logs   : (user_id, notification_date, kind) unique 제약이 이미 복합 인덱스 역할을 함
-- ============================================================
