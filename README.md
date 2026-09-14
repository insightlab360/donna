# DONNA (나의 비서 도나)

개인 일정, 회사 업무, 개인 프로젝트의 할 일을 한곳에서 관리하는 개인 비서형 생산성 웹앱입니다.

- Google 로그인 전용 (사용자별 데이터 완전 분리)
- 오늘의 할 일 / 캘린더 / 프로젝트 진행률 관리
- 접속 시 "오늘의 할 일" 브리핑 팝업
- 평일 오전 8:30(Asia/Seoul) Gmail 알림 자동 발송 (이용중인 회원에게만)
- Google Calendar는 전혀 사용하지 않는, 앱 자체 캘린더
- 회원 이용신청 → 관리자 승인 → 승인기간 동안 이용하는 멤버십 구조
- 수동 결제 확인, 결제/환불 이력, 무제한 회원, 관리자 콘솔(`/admin`)
- 관리자에게 문의하기 (개인 Gmail 비노출, Resend 발신 주소로만 발송)

## 기술 스택

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS 4
- Supabase (PostgreSQL + Auth, Google OAuth)
- Resend (이메일 발송)
- Vercel Cron (평일 오전 8:30 알림 스케줄러)

---

## 1. 로컬 개발 시작하기

### 사전 준비물

- Node.js 18 이상
- Supabase 계정 (무료)
- Google Cloud 계정 (무료, OAuth Client 발급용)
- Resend 계정 (무료, 이메일 발송용)

### 설치

```bash
npm install
```

### 환경변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 아래 값을 채워주세요. (이 프로젝트에서는 이미 로컬 미리보기용 더미 값이 든 `.env.local`이 만들어져 있습니다 — 아래 2~4단계를 따라 실제 값으로 교체해야 로그인/이메일이 동작합니다.)

| 변수 | 설명 | 어디서 발급하나요 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase 대시보드 > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon(public) key | Supabase 대시보드 > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 키 (RLS 우회, Cron에서만 사용) | Supabase 대시보드 > Project Settings > API |
| `RESEND_API_KEY` | 이메일 발송용 API 키 | resend.com > API Keys |
| `EMAIL_FROM` | 일반 알림(오늘의 할 일, 승인, 만료 안내) 발신 주소 | 도메인 인증 전에는 `onboarding@resend.dev` 사용 |
| `SUPPORT_EMAIL_FROM` | 문의 답변 메일 발신 주소 | 관리자 개인 Gmail이 아닌 이 주소로만 발송됩니다 |
| `ADMIN_NOTIFICATION_EMAIL` | 새 문의 등록 시 내부 알림을 받을 주소(선택) | 서버에서만 사용, `NEXT_PUBLIC_`로 만들지 않습니다 |
| `CRON_SECRET` | Cron 요청 인증용 임의의 긴 문자열 | 직접 생성 (예: 32자 랜덤 문자열) |

**주의**: `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트(브라우저) 코드에서 사용하지 않습니다. 이 프로젝트에서는 `src/lib/supabase/server.ts`의 `createAdminClient()`와 서버 API 라우트(`/api/admin/*`, `/api/cron/*`, `/api/me/*`)에서만 서버 사이드로 사용합니다. `ADMIN_NOTIFICATION_EMAIL`과 관리자 개인 Gmail 주소는 어떤 API 응답·HTML·클라이언트 번들에도 포함되지 않습니다 — 문의 답변은 항상 `SUPPORT_EMAIL_FROM` 주소로만 발송됩니다.

### 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 접속

### 빌드 / 린트

```bash
npm run build
npm run lint
```

---

## 2. Supabase 설정 (단계별)

### 2-1. 프로젝트 생성

1. https://supabase.com 접속 후 로그인/회원가입
2. **New Project** 클릭
3. 프로젝트 이름(예: `donna`), 데이터베이스 비밀번호, 리전(가까운 지역, 예: Northeast Asia (Seoul) 있으면 선택) 입력 후 **Create new project**
4. 몇 분 정도 프로비저닝을 기다립니다.

### 2-2. API 키 확인

1. 좌측 메뉴 **Project Settings > API**
2. **Project URL** → `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`에 붙여넣기
3. **anon public** 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 붙여넣기
4. **service_role** 키 (Reveal 클릭) → `SUPABASE_SERVICE_ROLE_KEY`에 붙여넣기 (절대 공개 저장소에 커밋하지 마세요)

### 2-3. 데이터베이스 스키마 생성

1. 좌측 메뉴 **SQL Editor** > **New query**
2. 이 저장소의 [`supabase/schema.sql`](supabase/schema.sql) 파일 내용을 전체 복사해서 붙여넣고 **Run**
3. 새 쿼리를 하나 더 만들어 [`supabase/migrations/002_membership.sql`](supabase/migrations/002_membership.sql) 내용을 붙여넣고 **Run**
4. 새 쿼리를 하나 더 만들어 [`supabase/migrations/003_member_notes.sql`](supabase/migrations/003_member_notes.sql) 내용을 붙여넣고 **Run** (세 파일 모두 순서대로 실행해야 합니다)

`schema.sql`에는 다음이 포함됩니다.
- `projects`, `tasks`, `notification_logs` 테이블 + 인덱스
- `tasks.due_date` 자동 계산 트리거 (기간 일정은 종료일, 단일 일정은 해당 날짜)
- `updated_at` 자동 갱신 트리거
- 모든 테이블에 대한 Row Level Security(RLS): `user_id = auth.uid()` 조건으로 완전한 사용자별 데이터 분리

`002_membership.sql`에는 다음이 포함됩니다 (자세한 내용은 아래 "회원/결제 운영 가이드" 참고).
- `profiles`, `membership_history`, `payment_history`, `refund_history`, `admin_history`, `audit_logs`, `support_inquiries` 테이블
- Google 로그인 시 `profiles` 행을 자동 생성하는 트리거, `is_admin()`/`is_super_admin()` 헬퍼 함수
- 각 테이블의 RLS 정책 (본인 또는 관리자만 조회, 쓰기는 서버 API에서만)
- 기존 사용자를 `active + unlimited + role user`로 자동 이전하는 idempotent 마이그레이션

### 2-4. Google 로그인 연동 (Supabase 쪽 설정)

Supabase 쪽 설정은 3단계 "Google OAuth 발급" 완료 후 진행합니다 (아래 3단계 참고). 아래는 순서 요약입니다.

1. Supabase 대시보드 > **Authentication > Providers > Google**
2. **Enable Sign in with Google** 켜기
3. 3단계에서 발급받은 **Client ID**, **Client Secret** 입력 후 저장
4. Supabase가 알려주는 **Callback URL** (예: `https://xxxx.supabase.co/auth/v1/callback`)을 복사해두었다가 Google Cloud Console 설정에 사용

### 2-5. Redirect URL 허용 목록

**Authentication > URL Configuration**에서:
- **Site URL**: 로컬 개발 시 `http://localhost:3000`, 배포 후에는 실제 Vercel 도메인으로 변경
- **Redirect URLs**에 아래 두 개를 추가
  - `http://localhost:3000/auth/callback`
  - `https://your-vercel-domain.vercel.app/auth/callback` (배포 후)

---

## 3. Google OAuth Client 발급 (단계별, 초보자용)

1. https://console.cloud.google.com 접속 후 로그인
2. 상단 프로젝트 선택 드롭다운 > **새 프로젝트** > 이름 입력(예: `donna`) 후 만들기
3. 좌측 메뉴 **API 및 서비스 > OAuth 동의 화면**
   - User Type: **외부(External)** 선택 후 만들기
   - 앱 이름: `DONNA`, 사용자 지원 이메일: 본인 이메일, 개발자 연락처: 본인 이메일 입력 후 저장하고 계속 (스코프, 테스트 사용자 단계는 기본값으로 계속 진행해도 됩니다)
4. 좌측 메뉴 **API 및 서비스 > 사용자 인증 정보(Credentials)**
5. **사용자 인증 정보 만들기 > OAuth 클라이언트 ID** 클릭
   - 애플리케이션 유형: **웹 애플리케이션**
   - 이름: `donna-web` (임의)
   - **승인된 리디렉션 URI**에 Supabase의 Callback URL을 붙여넣기 (2-4단계에서 복사한 `https://xxxx.supabase.co/auth/v1/callback`)
   - 만들기 클릭
6. 생성되면 **클라이언트 ID**와 **클라이언트 보안 비밀(Client Secret)**이 표시됩니다. 이 두 값을 복사해서 Supabase **Authentication > Providers > Google**의 Client ID / Client Secret 칸에 붙여넣고 저장하세요.

이제 Google 로그인이 동작합니다. 로컬에서 `npm run dev` 실행 후 `http://localhost:3000/login`에서 "Google로 로그인" 버튼을 눌러 테스트하세요.

---

## 4. Gmail 알림 발송 설정 (Resend)

이메일은 Gmail API가 아니라 **Resend**라는 이메일 발송 서비스를 통해 사용자의 Gmail(로그인한 Google 계정 이메일) 받은편지함으로 전송됩니다.

1. https://resend.com 접속 후 회원가입/로그인
2. 좌측 메뉴 **API Keys > Create API Key** > 이름 입력 후 생성
3. 생성된 키를 `.env.local`의 `RESEND_API_KEY`에 붙여넣기
4. 발신 이메일: 자체 도메인을 인증하지 않았다면 `RESEND_FROM_EMAIL="DONNA <onboarding@resend.dev>"` 그대로 사용 (테스트/개인 사용에 충분합니다). 나중에 본인 도메인이 있다면 Resend **Domains** 메뉴에서 도메인을 인증하고 `RESEND_FROM_EMAIL`을 `DONNA <notify@yourdomain.com>` 형태로 바꿀 수 있습니다.

---

## 5. 평일 오전 8:30 Cron 설정

`vercel.json`에 이미 아래와 같이 설정되어 있습니다.

```json
{
  "crons": [
    { "path": "/api/cron/daily-digest", "schedule": "30 23 * * 0-4" }
  ]
}
```

Vercel Cron은 UTC 기준으로 동작하므로, **UTC 일 23:30 (일~목)** 이 **Asia/Seoul 기준 월~금 오전 8:30**과 정확히 일치합니다. Vercel에 배포하면 별도 설정 없이 자동으로 동작합니다 (Vercel 프로젝트에 `CRON_SECRET` 환경변수만 등록되어 있으면 됩니다 — 7단계 참고).

### 로컬에서 수동 테스트

브라우저가 닫혀 있어도 동작해야 하는 기능이라 로컬 dev 서버에서도 직접 호출해 확인할 수 있습니다.

```bash
curl -H "Authorization: Bearer local-dev-secret" http://localhost:3000/api/cron/daily-digest
```

(`local-dev-secret`은 `.env.local`의 `CRON_SECRET` 값과 동일해야 합니다.) 응답으로 처리된 사용자 수와 각 사용자의 발송 상태(`sent`/`skipped_no_tasks`/`already_processed`/`failed`)가 JSON으로 반환됩니다.

### 중복 발송 방지

`notification_logs` 테이블에 `(user_id, notification_date)` 유니크 제약이 걸려 있어, 같은 사용자에게 같은 날짜에 API가 여러 번 호출되어도 이미 처리된 경우 `already_processed`로 건너뜁니다.

---

## 6. 로컬 개발 워크플로 요약

1. `npm install`
2. `.env.local`에 실제 Supabase / Resend / Cron 값 입력
3. Supabase SQL Editor에서 `supabase/schema.sql`, `supabase/migrations/002_membership.sql`, `supabase/migrations/003_member_notes.sql` 순서대로 실행
4. Google OAuth Client 발급 후 Supabase Google Provider에 등록
5. SQL로 본인 계정을 super_admin으로 지정 (12단계 참고)
6. `npm run dev` → `http://localhost:3000`에서 Google 로그인 테스트
7. 할 일/프로젝트 생성, 캘린더, 오늘의 할 일 팝업 동작 확인
8. `/admin`에서 회원 승인/연장/환불, `/admin/inquiries`에서 문의 답변 확인
9. `curl`로 `/api/cron/daily-digest` 호출해 이메일 발송 확인

---

## 7. Vercel 배포 방법

### 사전 준비: Git 저장소

로컬에 Git이 없다면 먼저 설치하세요: https://git-scm.com/download/win

```bash
git init
git add .
git commit -m "Initial commit"
```

GitHub에 새 저장소를 만든 뒤:

```bash
git remote add origin https://github.com/<사용자명>/<저장소명>.git
git branch -M main
git push -u origin main
```

### Vercel 프로젝트 생성

1. https://vercel.com 접속 후 GitHub 계정으로 로그인
2. **Add New > Project** > 방금 만든 GitHub 저장소 선택 > Import
3. Framework Preset은 Next.js가 자동 감지됩니다.
4. **Environment Variables**에 아래 값을 모두 등록 (Production/Preview/Development 전체 체크 권장)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `SUPPORT_EMAIL_FROM`
   - `ADMIN_NOTIFICATION_EMAIL` (선택)
   - `CRON_SECRET`
5. **Deploy** 클릭

### 배포 후 추가 설정

- Supabase **Authentication > URL Configuration**의 Site URL / Redirect URLs에 실제 Vercel 도메인 추가 (`https://your-app.vercel.app/auth/callback`)
- Google Cloud Console의 OAuth 클라이언트에는 변경 사항 없음 (리디렉션은 Supabase Callback URL 하나로 고정되어 있습니다)
- 이후 배포는 `git push origin main`으로만 진행합니다.

---

## 8. Database Schema

### `projects`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | 소유자 (auth.users 참조) |
| name | text | 프로젝트명 |
| work_type | text | 개인 / 회사 / 개인프로젝트 |
| start_date | date | 시작일 (선택) |
| end_date | date | 마감일 (선택) |
| status | text | 예정 / 진행중 / 완료 / 보류 / 드랍 |
| created_at, updated_at | timestamptz | |

### `tasks`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | 소유자 |
| work_type | text | 개인 / 회사 / 개인프로젝트 |
| title | text | 할 일 제목 |
| project_id | uuid \| null | 상위 프로젝트 (선택) |
| date_mode | text | date / datetime / date_range / datetime_range |
| start_date | date | |
| start_time | time \| null | |
| end_date | date \| null | 기간 일정일 때만 |
| end_time | time \| null | 기간+시간일 때만 |
| due_date | date | **자동 계산** (트리거) — 단일: start_date, 기간: end_date |
| status | text | 예정 / 진행중 / 완료 / 보류 / 드랍 |
| created_at, updated_at | timestamptz | |

### `notification_logs`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | |
| notification_date | date | 발송 대상 날짜 (Asia/Seoul 기준) |
| sent_at | timestamptz \| null | |
| status | text | sent / skipped / failed |
| task_count | integer | 발송된 할 일 개수 |

`(user_id, notification_date, kind)` 유니크 제약으로 중복 발송을 방지합니다 (`kind`는 `daily_digest` 또는 `expiry_warning`).

### `profiles`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK, auth.users 참조 |
| email, name | text | Google 로그인 시 자동 저장 |
| role | text | user / admin / super_admin |
| membership_status | text \| null | null(미신청) / pending / active / suspended / expired |
| unlimited | boolean | true면 access_end_at 무시 |
| access_start_at, access_end_at | date \| null | 이용기간 |
| trial_used | boolean | 무료체험 1회 제한 |
| applied_at | timestamptz \| null | 이용신청 시각 |

### `payment_history` (덮어쓰지 않음, 매 결제/연장마다 새 행)
| 컬럼 | 설명 |
|---|---|
| is_trial, months | 체험 여부, 결제 개월 수 |
| payment_method, bank_name, depositor_name, paid_at | 결제 정보 |
| expected_amount, paid_amount, refunded_amount | 금액 (원) |
| payment_status | pending / paid / cancelled / refunded / partially_refunded / not_required / waived |
| memo, confirmed_by, confirmed_at | 관리자 전용 (사용자에게 노출 안 됨) |

### `membership_history` / `refund_history` / `admin_history` / `audit_logs`
승인·연장·기간변경·무제한·중지/재개·환불·관리자 권한 변경의 모든 이력을 남깁니다. `audit_logs`는 secret/token/password를 저장하지 않고 변경 전/후 데이터 스냅샷만 기록합니다.

### `support_inquiries`
| 컬럼 | 설명 |
|---|---|
| category | 이용신청/결제/이용기간/이용중지/환불/기타 |
| subject, message | 사용자 작성 |
| status | pending / answered / closed |
| admin_reply, replied_at, replied_by | 관리자 답변 (SUPPORT_EMAIL_FROM으로 메일 발송) |

---

## 9. 주요 기능 설명

- **인증**: Supabase Auth + Google OAuth. 미들웨어(`src/proxy.ts`)가 모든 페이지 요청에서 세션을 확인하고, 비로그인 사용자는 `/login`으로 리다이렉트합니다.
- **데이터 동기화**: `src/lib/data-context.tsx`의 React Context가 로그인 세션 동안 tasks/projects를 한 번 불러온 뒤, 모든 생성/수정/삭제가 이 Context의 상태를 즉시 갱신합니다. Dashboard, Calendar, Tasks, Projects, 오늘의 할 일 팝업이 모두 같은 Context를 구독하므로 한 화면에서 수정하면 다른 화면에도 즉시 반영됩니다.
- **캘린더**: 완전히 자체 구현된 월간/주간 캘린더(`src/components/calendar`)이며 Google Calendar API를 사용하지 않습니다. 일정을 클릭하면 페이지 이동 없이 Drawer가 열립니다.
- **오늘의 할 일 팝업**: `src/components/today/TodayPopupProvider.tsx`가 세션당 하루 1회 자동으로 팝업을 띄우고(`sessionStorage` 사용), Dashboard의 "오늘의 할 일 보기" 버튼으로 언제든 다시 열 수 있습니다. Header/Content(스크롤)/Footer(고정)가 구조적으로 분리되어 있어 목록이 길어도 닫기 버튼이 가려지지 않습니다.
- **프로젝트 진행률**: `완료 / 전체 × 100`으로 자동 계산되며 (`src/lib/tasks-logic.ts`의 `computeProjectStats`), 프로젝트 카드/상세 Drawer에서 실시간으로 반영됩니다.
- **이메일 알림**: `src/app/api/cron/daily-digest/route.ts`가 Vercel Cron에 의해 평일 오전 8:30(KST)에 호출되어, **이용중(active 또는 unlimited)인 회원**만 대상으로 오늘 할 일(완료/드랍 제외)이 있는 사용자에게 이메일을 발송합니다. 같은 배치에서 이용기간이 지난 `active` 회원을 자동으로 `expired`로 전환하고, 종료 7일 전인 회원에게는 별도 안내 메일을 보냅니다.
- **회원/멤버십**: Google 로그인 → `이용신청하기` → 관리자 승인 → 이용기간 동안 정상 이용, 이 흐름을 `src/app/(app)/layout.tsx`가 서버에서 매 요청마다 판별해 적절한 화면(신청/대기/중지/종료/정상)을 보여줍니다. 가격·기간 정책은 `src/lib/membership/config.ts` 한 곳에서만 관리합니다.
- **관리자 콘솔**: `/admin`(회원관리·문의관리·관리자 관리)은 `role`이 admin/super_admin인 사용자만 접근 가능하며, 실제 승인/연장/환불/권한 변경은 모두 서버 API(`/api/admin/*`)가 service role로 처리합니다 (`src/lib/membership/actions.ts`).
- **문의하기**: 설정 화면과 이용제한 화면에서 mailto 없이 앱 내 Modal로 문의를 등록하고(`support_inquiries`), 관리자가 `/admin/inquiries`에서 답변하면 `SUPPORT_EMAIL_FROM` 주소로 이메일이 발송됩니다.

---

## 10. 보안

- 모든 테이블에 Row Level Security 적용. tasks/projects/notification_logs는 `auth.uid() = user_id`, profiles/payment_history 등 회원 관련 테이블은 "본인 또는 `is_admin()`"만 조회 가능
- role, membership_status, 이용기간, unlimited, 결제 상태 등은 RLS상 사용자 쓰기 정책이 아예 없습니다 — 오직 서버 API가 `SUPABASE_SERVICE_ROLE_KEY`로만 변경할 수 있고, 각 API는 호출 전 `requireAdmin()`/`requireSuperAdmin()`으로 role을 검증합니다 (`src/lib/auth/admin.ts`)
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 (API 라우트에서만 사용, 클라이언트 번들에 절대 포함되지 않음)
- 관리자 개인 Gmail은 어디에도 노출되지 않습니다 — 모든 자동 발신은 `EMAIL_FROM`/`SUPPORT_EMAIL_FROM` 고정 주소를 사용하고, `ADMIN_NOTIFICATION_EMAIL`은 서버에서만 읽는 내부 알림 수신용입니다 (`NEXT_PUBLIC_` 접두사 없음)
- 모든 비밀 값은 `.env.local`(로컬) / Vercel 환경변수(배포)로 관리, 코드에 하드코딩하지 않음
- Cron API는 `CRON_SECRET`을 통한 Bearer 토큰 인증 필요
- 최소 1명의 super_admin을 항상 유지하도록 `setRole()`이 마지막 super_admin의 강등을 차단합니다

---

## 11. 트러블슈팅

- **로그인 후 무한 리다이렉트**: Supabase Authentication > URL Configuration의 Redirect URLs에 현재 도메인의 `/auth/callback`이 등록되어 있는지 확인하세요.
- **이메일이 오지 않음**: `RESEND_API_KEY`가 올바른지, 오늘 날짜에 예정/진행중/보류 상태의 할 일이 실제로 있는지, 회원이 active/unlimited 상태인지, `notification_logs` 테이블에 이미 `sent`/`skipped` 기록이 있어 중복 방지로 건너뛴 것은 아닌지 확인하세요.
- **다른 사용자의 데이터가 보임**: RLS가 비활성화되어 있지 않은지 Supabase Table Editor에서 확인하세요 (`supabase/schema.sql`, `supabase/migrations/002_membership.sql`을 다시 실행하면 정책이 재생성됩니다).
- **로그인은 되는데 앱이 안 열림 / "이용신청하기" 화면만 보임**: 정상입니다 — `002_membership.sql`을 아직 실행하지 않았거나, 신규 가입 사용자라 아직 이용신청을 하지 않은 상태입니다. 기존 사용자는 마이그레이션이 `active + unlimited`로 자동 전환합니다.
- **`/admin`에 접근이 안 됨**: 해당 계정의 `profiles.role`이 `admin` 또는 `super_admin`인지 Supabase Table Editor에서 확인하세요. 최초 super_admin은 SQL로 직접 지정해야 합니다 (아래 참고).

---

## 12. 회원/결제 운영 가이드

### 가격 정책 변경

`src/lib/membership/config.ts`의 `MEMBERSHIP_CONFIG` 값만 바꾸면 승인/연장 화면의 예상금액 계산, 이메일, 검증 로직에 전부 즉시 반영됩니다. 코드 다른 곳에 가격을 하드코딩하지 마세요.

```ts
export const MEMBERSHIP_CONFIG = {
  monthlyPrice: 3000, // 월 이용료(원)
  trialDays: 7,       // 무료체험 일수
  minMonths: 1,       // 최소 결제 개월
  maxMonths: 24,      // 최대 결제 개월
  currency: "KRW",
};
```

### 결제 확인 절차 (PG 연동 없음, 수동 확인)

1. `/admin/members`에서 대상 회원 클릭 → 우측 Drawer
2. `pending` 상태면 **승인**, `active`/`expired` 상태면 **연장** 클릭
3. 유료 선택 시 결제수단/은행/입금자/입금일시/입금금액을 입력하고 **결제 확인 완료** 체크
4. 예상금액과 실제 입금금액이 다르면 관리자 메모 입력이 필수이며, 체크박스가 없으면 승인 버튼이 비활성화됩니다
5. 승인/연장 시 회원에게 `[DONNA] 이용이 승인되었습니다` 메일이 자동 발송됩니다

### 환불/취소

결제 이력 목록의 **환불/취소** 버튼 → 전액/부분 선택, 이용기간 처리(유지/조정/즉시종료) 선택, 메모 입력 후 처리합니다. 기존 결제 기록은 삭제되지 않고 `refunded_amount`/`payment_status`만 갱신되며, `refund_history`에 상세가 남습니다.

### 무제한 회원

Drawer의 **무제한 전환**으로 즉시 무제한 처리할 수 있습니다. 무제한을 해제할 때는 반드시 새 이용기간(개월 수 또는 종료일)을 입력해야 합니다.

### 최초 super_admin 지정

앱 안에서는 절대 지정할 수 없습니다 — Supabase SQL Editor에서 딱 한 번 직접 실행하세요.

```sql
update public.profiles set role = 'super_admin' where email = '본인의 Gmail 주소';
```

### 관리자 추가/해제

super_admin으로 로그인 후 `/admin/admins`에서 이름/Gmail로 검색해 **admin으로 추가**하거나, 기존 관리자를 **권한 해제**할 수 있습니다. super_admin은 admin으로만 강등 가능하고(자기 자신 제외), 마지막 남은 super_admin은 강등/해제할 수 없습니다.

### 문의관리

`/admin/inquiries`에서 이름/Gmail/문의유형/상태로 검색·필터링하고, 문의를 클릭해 Drawer에서 답변을 작성하면 `SUPPORT_EMAIL_FROM` 주소로 사용자에게 답변 메일이 발송됩니다. 관리자의 실제 Gmail 주소는 발신자, 회신 주소, 어디에도 노출되지 않습니다.

---

## 13. 야간 자동 유지보수 (Google Sheet + GitHub Actions)

매일 밤 Google Sheet에 적어둔 개선항목을 Claude Code가 자동으로 검토·구현하고, lint/typecheck/test/build가 모두 통과할 때만 `main`에 반영하는 자동화입니다. 내 PC가 꺼져 있어도 GitHub Actions가 실행하므로 동작합니다.

### 13-1. 동작 방식

- **실행 시각**: 매일 19:00 Asia/Seoul (KST). GitHub Actions cron은 UTC 기준이라 `.github/workflows/nightly-maintenance.yml`에 `cron: "0 10 * * *"`로 등록되어 있습니다 (KST는 서머타임이 없어 항상 `KST - 9시간` = UTC로 고정 변환하면 됩니다).
  - **시각을 바꾸려면**: 위 워크플로 파일의 `cron` 값 한 줄만 수정하면 됩니다. 관리 지점은 이 한 곳뿐입니다.
- **Google Sheet 컬럼**: `날짜 | 개선항목 | 작업대상 | 결과 | 비고` (1행은 헤더, 2행부터 데이터).
- **처리 대상 조건**: 날짜 ≤ 실행일, 작업대상 = `YES`(대소문자 무관), 결과가 비어 있음. 이미 `완료`/`실패`/`승인대기`가 적힌 행은 다시 처리하지 않습니다.
- **행마다 독립적으로 처리**하며, 한 행의 처리를 시작하기 전에 항상 `origin/main`으로 작업 트리를 초기화합니다 — 한 행이 실패해도 다음 행에 영향을 주지 않습니다.
- 행별 처리 순서: Claude Code가 개선항목을 분석·구현 → `npm run lint` / `npm run typecheck` / `npm test` / `npm run build` 실행 → 모두 통과해야 `main`에 커밋·푸시 → Google Sheet의 `결과`/`비고`를 갱신.
- 한 번 실행에서 처리하는 행 수는 기본 5개로 제한됩니다 (`MAINTENANCE_MAX_ROWS` 환경변수 또는 수동 실행 시 `max_rows` 입력으로 조절).

### 13-2. 결과 값

| 결과 | 의미 |
| --- | --- |
| `완료` | 코드가 구현되고 lint/typecheck/test/build를 모두 통과해 `main`에 반영됨 |
| `실패` | 구현 실패, 또는 lint/typecheck/test/build 중 하나라도 실패 — `main`에는 반영되지 않음. 비고에 실패 원인이 짧게 기록됨 |
| `승인대기` | DB 스키마/RLS/인덱스 변경, destructive 작업, 모호한 요구사항 등 자동 실행이 금지된 작업 — `main`에는 반영하지 않고 `maintenance/pending/row-*` 브랜치에 변경 내용(migration 파일 등)만 올려둡니다. 비고에 필요한 DB 변경 내용/목적/영향/다음 작업과 브랜치 이름이 기록됩니다 |

`승인대기` 행을 처리하려면: 비고에 적힌 브랜치를 확인 → `supabase/migrations/`에 생성된 SQL을 검토 → 문제 없으면 Supabase SQL Editor에서 직접 실행 → 필요하면 해당 브랜치의 코드 변경을 새 Sheet 행으로 다시 요청하거나 직접 병합하세요. **migration 파일은 자동으로 생성될 수 있지만 절대 자동 실행되지 않습니다.**

### 13-3. 안전장치

- DB 스키마 변경, RLS 완화, destructive 작업(데이터 삭제 등), 모호한 요구사항, 대규모 구조 변경은 Claude Code에게 애초에 "구현하지 말고 승인대기로 보고"하도록 지시합니다.
- 그와 별개로, `supabase/migrations/`·`supabase/schema.sql` 변경이나 `ALTER TABLE`/`DROP`/`DELETE FROM`/`CREATE POLICY` 등 위험 키워드가 diff에 있으면 Claude가 뭐라고 보고했든 자동으로 `승인대기`로 강등시키는 별도 검사(`scripts/maintenance/riskyDiff.ts`)가 한 번 더 돌아갑니다.
- Claude Code 실행 단계에는 Supabase service role key 등 앱 시크릿을 전달하지 않습니다(빌드/테스트 단계에서만 사용). 또한 파일 읽기/쓰기/검색 도구만 허용하고 임의 명령 실행(Bash)은 막아둡니다.
- `.env`, API 키, service role key 등은 커밋되지 않습니다 — GitHub Secrets로만 관리합니다.
- 같은 워크플로가 겹쳐 실행되지 않도록 GitHub Actions `concurrency` 설정과 Sheet의 "처리중" 임시 마커로 이중 방지합니다.

### 13-4. 설정하기 (처음 한 번, 직접 해야 함)

**1) Google Sheet 만들기**

1. Google Sheets에서 새 스프레드시트 생성
2. 1행에 헤더 입력: `날짜 | 개선항목 | 작업대상 | 결과 | 비고`
3. 시트 이름(하단 탭 이름, 기본값 `Sheet1`)과 URL의 스프레드시트 ID(`https://docs.google.com/spreadsheets/d/이 부분/edit`)를 메모해두세요.

**2) Google Cloud 서비스 계정 만들기**

1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트 생성(또는 기존 프로젝트 선택)
2. 좌측 메뉴 **APIs & Services > Library**에서 "Google Sheets API" 검색 후 **Enable**
3. **APIs & Services > Credentials > Create Credentials > Service Account** 로 서비스 계정 생성 (이름은 자유롭게, 예: `donna-maintenance-bot`)
4. 생성된 서비스 계정 클릭 → **Keys** 탭 → **Add Key > Create new key > JSON** 선택 → JSON 키 파일이 다운로드됩니다. 이 파일은 절대 커밋하지 마세요.
5. JSON 파일 안의 `client_email` 값을 복사해서, 1)에서 만든 Google Sheet를 **공유(Share)** → 이 이메일 주소를 **편집자(Editor)** 권한으로 추가하세요. (서비스 계정도 하나의 "사용자"처럼 시트에 접근 권한을 부여해야 합니다.)

**3) GitHub Secrets 등록**

저장소 **Settings > Secrets and variables > Actions > New repository secret** 에서 아래 값들을 등록하세요.

| Secret 이름 | 값 |
| --- | --- |
| `GOOGLE_SHEET_ID` | 1)에서 메모한 스프레드시트 ID |
| `GOOGLE_SHEET_NAME` | 1)에서 메모한 시트 탭 이름 (예: `Sheet1`) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | 2)에서 다운로드한 JSON 키 파일의 **전체 내용을 그대로 복사해서 붙여넣기** |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/)에서 발급한 API 키 |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`과 동일한 값 (빌드에 필요) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 〃 |
| `SUPABASE_SERVICE_ROLE_KEY` | 〃 |
| `RESEND_API_KEY` | 〃 |
| `EMAIL_FROM` | 〃 |
| `SUPPORT_EMAIL_FROM` | 〃 |
| `ADMIN_NOTIFICATION_EMAIL` | 〃 |
| `CRON_SECRET` | 〃 |

**4) 저장소 설정 확인**

**Settings > Actions > General > Workflow permissions**에서 **"Read and write permissions"**가 선택되어 있어야 합니다 (자동으로 `main`에 커밋/푸시하려면 필요). `main` 브랜치에 브랜치 보호 규칙(필수 리뷰 등)이 걸려 있으면 자동 푸시가 막힐 수 있으니, 이 봇의 푸시만 예외 처리하거나 보호 규칙을 조정하세요.

**5) 테스트**

1. 위 설정을 마친 뒤, GitHub 저장소의 **Actions** 탭 → **Nightly maintenance** 워크플로 → **Run workflow**로 수동 실행
2. 처음에는 `dry_run`을 `true`로 켜고 실행 — 실제 커밋/Sheet 기록 없이 어떤 행이 대상인지 로그로만 확인됩니다
3. 문제 없으면 `dry_run`을 `false`로 다시 실행하거나, 다음날 19:00 KST 자동 실행을 기다리세요

### 13-5. 로컬에서 테스트

```bash
# .env.local 에 위 표의 값들을 채운 뒤
npm run maintenance -- --dry-run
```

`--dry-run`을 빼면 실제로 Claude Code를 실행하고 Sheet에 결과를 기록하며, 통과 시 로컬 `git`으로 커밋·푸시까지 수행합니다 — 로컬에서 실제 실행할 때는 이 점을 꼭 인지하세요.

### 13-6. 알려진 한계

- 실행 도중 GitHub Actions 러너가 강제 종료되는 등 예외적인 상황에서는 해당 행이 `처리중` 상태로 멈출 수 있습니다. 이 경우 Sheet에서 `결과` 칸을 비워주면 다음 실행에서 다시 처리 대상이 됩니다.
- 한 번 실행에서 처리하는 행 수(기본 5개)를 넘는 분량은 다음 실행(다음날 19:00 또는 수동 실행)에서 이어서 처리됩니다.
