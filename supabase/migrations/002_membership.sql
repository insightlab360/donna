-- DONNA — membership / admin / payment / support migration
-- Supabase 대시보드 > SQL Editor 에서 전체를 붙여넣고 Run 하세요.
-- Idempotent: 여러 번 실행해도 안전합니다.

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles — 1 row per auth.users, membership + role 상태
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'user' check (role in ('user', 'admin', 'super_admin')),
  -- null = 아직 이용신청을 하지 않은 신규 사용자
  membership_status text check (membership_status in ('pending', 'active', 'suspended', 'expired')),
  unlimited boolean not null default false,
  access_start_at date,
  access_end_at date,
  trial_used boolean not null default false,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_membership_status_idx on public.profiles (membership_status);
create index if not exists profiles_role_idx on public.profiles (role);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Google 로그인으로 auth.users에 새 행이 생기면 profiles를 자동 생성한다.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 권한 확인 함수 (security definer로 RLS 재귀 문제 회피)
-- ============================================================
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'super_admin'
  );
$$;

-- ============================================================
-- membership_history — 승인/연장/중지/무제한 등 이용기간 변경 이력
-- ============================================================
create table if not exists public.membership_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (
    action in (
      'apply', 'approve', 'extend', 'change_period', 'unlimited_grant', 'unlimited_revoke',
      'suspend', 'resume', 'refund_adjust', 'expire'
    )
  ),
  previous_status text,
  new_status text,
  previous_end_at date,
  new_end_at date,
  note text,
  performed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists membership_history_user_id_idx on public.membership_history (user_id);

-- ============================================================
-- payment_history — 수동 결제 확인 기록 (덮어쓰지 않고 매번 새 행)
-- ============================================================
create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  is_trial boolean not null default false,
  months integer,
  payment_method text,
  bank_name text,
  depositor_name text,
  paid_at timestamptz,
  expected_amount integer,
  paid_amount integer,
  refunded_amount integer not null default 0,
  payment_status text not null default 'pending' check (
    payment_status in ('pending', 'paid', 'cancelled', 'refunded', 'partially_refunded', 'not_required', 'waived')
  ),
  memo text,
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_history_user_id_idx on public.payment_history (user_id);

drop trigger if exists payment_history_touch_updated_at on public.payment_history;
create trigger payment_history_touch_updated_at
  before update on public.payment_history
  for each row execute function public.touch_updated_at();

-- ============================================================
-- refund_history — 환불/부분환불 상세 (payment_history 1건에 여러 건 가능)
-- ============================================================
create table if not exists public.refund_history (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payment_history (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  refund_amount integer not null,
  refund_type text not null check (refund_type in ('full', 'partial')),
  period_adjustment text not null check (period_adjustment in ('keep', 'adjust', 'immediate_end')),
  new_access_end_at date,
  memo text,
  performed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists refund_history_user_id_idx on public.refund_history (user_id);
create index if not exists refund_history_payment_id_idx on public.refund_history (payment_id);

-- ============================================================
-- admin_history — 관리자 권한 부여/해제 이력
-- ============================================================
create table if not exists public.admin_history (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('grant_admin', 'revoke_admin', 'grant_super_admin', 'revoke_super_admin')),
  previous_role text,
  new_role text,
  performed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists admin_history_target_user_id_idx on public.admin_history (target_user_id);

-- ============================================================
-- audit_logs — 관리자 주요 작업 before/after 스냅샷 (secret/token 저장 금지)
-- ============================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  action text not null,
  target_table text,
  target_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_target_idx on public.audit_logs (target_table, target_id);

-- ============================================================
-- support_inquiries — 관리자에게 문의하기
-- ============================================================
create table if not exists public.support_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('이용신청', '결제', '이용기간', '이용중지', '환불', '기타')),
  subject text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'answered', 'closed')),
  admin_reply text,
  replied_at timestamptz,
  replied_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists support_inquiries_user_id_idx on public.support_inquiries (user_id);
create index if not exists support_inquiries_status_idx on public.support_inquiries (status);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.membership_history enable row level security;
alter table public.payment_history enable row level security;
alter table public.refund_history enable row level security;
alter table public.admin_history enable row level security;
alter table public.audit_logs enable row level security;
alter table public.support_inquiries enable row level security;

-- profiles: 본인 또는 관리자만 조회 가능. role/membership_status/이용기간 등은
-- 클라이언트에서 직접 쓸 수 없다 — 전부 서버 라우트가 service role로 변경한다.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

-- membership_history / payment_history / refund_history: 관리자만 직접 조회 가능.
-- 사용자 본인의 "내 이용정보"/"내 결제이력"은 민감 컬럼(메모, 확인자 등)을
-- 제외하고 서버 라우트(/api/me/*)가 내려준다.
drop policy if exists "membership_history_select_admin" on public.membership_history;
create policy "membership_history_select_admin" on public.membership_history
  for select using (public.is_admin());

drop policy if exists "payment_history_select_admin" on public.payment_history;
create policy "payment_history_select_admin" on public.payment_history
  for select using (public.is_admin());

drop policy if exists "refund_history_select_admin" on public.refund_history;
create policy "refund_history_select_admin" on public.refund_history
  for select using (public.is_admin());

-- admin_history / audit_logs: super_admin만 조회 가능.
drop policy if exists "admin_history_select_super_admin" on public.admin_history;
create policy "admin_history_select_super_admin" on public.admin_history
  for select using (public.is_super_admin());

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin" on public.audit_logs
  for select using (public.is_admin());

-- support_inquiries: 본인 문의는 본인이, 전체는 관리자가 조회 가능.
-- 등록은 사용자가 직접, 답변은 서버 라우트(이메일 발송과 함께)로만 기록한다.
drop policy if exists "support_inquiries_select" on public.support_inquiries;
create policy "support_inquiries_select" on public.support_inquiries
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "support_inquiries_insert_own" on public.support_inquiries;
create policy "support_inquiries_insert_own" on public.support_inquiries
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- 기존 사용자 마이그레이션 (idempotent) — 기존 DONNA 사용자는 계속 막힘없이
-- 이용할 수 있도록 active + unlimited + role user로 시작한다.
-- ============================================================
insert into public.profiles (id, email, name, role, membership_status, unlimited)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  'user',
  'active',
  true
from auth.users u
on conflict (id) do nothing;

-- ============================================================
-- notification_logs 확장 — 종료 7일전 알림도 같은 표로 중복 방지 관리
-- ============================================================
alter table public.notification_logs add column if not exists kind text not null default 'daily_digest';

alter table public.notification_logs drop constraint if exists notification_logs_user_id_notification_date_key;
alter table public.notification_logs drop constraint if exists notification_logs_user_date_kind_key;
alter table public.notification_logs add constraint notification_logs_user_date_kind_key unique (user_id, notification_date, kind);

-- ============================================================
-- 최초 super_admin 지정 — 아래 줄의 이메일을 본인 것으로 바꾸고 주석 해제 후
-- 이 파일과는 별도로 한 번만 직접 실행하세요. (자동 실행되지 않습니다.)
-- ============================================================
-- update public.profiles set role = 'super_admin' where email = 'you@example.com';
