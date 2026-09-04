# AX Consulting Agent

제조 혁신·AI 도입 컨설팅을 위한 지능형 에이전트. 등록된 과제(문제)를
자동 평가(AX)하고, 5단계 PBL 진단 인터뷰를 진행하며, 게이트 승인과
KPI 트래킹, 최종 임원 보고서 자동 생성까지 컨설팅 사이클 전 과정을
지원한다.

- **Next.js 16** (App Router · Turbopack) + React 19 + TypeScript
- **Supabase**: Auth (매직링크) · Postgres (RLS 전 활성화) · Storage
- **Anthropic Claude Opus 5**: adaptive thinking, `tool_use` 구조화 출력, SSE 스트리밍
- **Tailwind CSS v4**, 라이트/다크 자동 대응

---

## 워크플로우

```
로그인(매직링크) → 자동 프로필 프로비저닝
    ↓
과제 등록
    ↓
AX 자동 평가 (5축 × 20점 = 100점 · rule/ai/review_needed 판정)
    ↓
PBL Stage 1~5  (스트리밍 인터뷰 + 산출물 버전 관리)
    │   1  문제 정의
    │   2  데이터·프로세스 진단
    │   3  솔루션 설계
    │   4  PoC 계획
    │   5  실행 로드맵
    ↓
Gate 5  (자동 체크리스트 · 관리자 승인/반려)
    ↓
최종 보고서  (Executive Summary + 전체 통합 · Markdown 다운로드)
    +
KPI 트래킹 · 파일 첨부 · 알림 · 초대/사용자/회사 관리
```

---

## 로컬 개발

### 요구 사항
- Node.js 20+
- Supabase 프로젝트 (Storage 버킷은 마이그레이션이 자동 생성)
- Anthropic API 키 (Claude Opus 5 접근 필요)

### 환경 변수 (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
ANTHROPIC_API_KEY=<sk-ant-...>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 실행

```bash
npm install
npm run dev
# http://localhost:3000
```

### 헬스 체크

```
GET /health
```

env 4종과 Supabase 연결 상태를 JSON으로 반환한다.

---

## Supabase 설정

### 인증

Supabase Dashboard → **Authentication → URL Configuration**에서:
- **Site URL**: `http://localhost:3000` (프로덕션에서는 실제 도메인)
- **Redirect URLs**: `http://localhost:3000/**`

기본 Supabase 이메일 발송이면 개발 중엔 충분하다. 프로덕션에서는
SMTP 설정을 권장한다.

### 데이터베이스 · Storage

스키마·정책·시드·Storage 버킷은 모두 마이그레이션(`supabase/migrations/`
또는 MCP `apply_migration`)으로 관리한다. 주요 마이그레이션:

- `initial_schema` — 13개 도메인 테이블(companies, users, tasks, ax_evaluations,
  pbl_stages, pbl_chat_messages, pbl_outputs, gates, kpi_records, reports,
  notifications, invitations, task_files) 및 RLS
- `harden_definer_functions` — SECURITY DEFINER 함수 search_path 고정 및
  anon EXECUTE 회수
- `seed_default_company` — 초기 sandbox 회사
- `invitations_update_policy`, `users_update_policy` — 취소·역할 갱신용 정책
- `task_files_storage_bucket` — 25 MiB private 버킷 + storage.objects RLS

---

## 첫 로그인과 자동 프로비저닝

1. `/login`에서 이메일 입력 → 매직링크 수신
2. 링크 클릭 → `/auth/callback` 에서 세션 교환
3. **[lib/auth/provision.ts](lib/auth/provision.ts)** 가 프로필을 자동 생성:
   - **DB의 첫 사용자** → `super_admin`, sandbox 회사에 자동 부착
   - **초대(`invitations`) 매칭** → 초대의 role·company_id 승계 + `used_at` 마킹
   - **매칭 없음** → 즉시 signOut, 안내 화면

---

## 역할 · 권한

| Role | 권한 요약 |
|---|---|
| `super_admin` | 전체 회사·사용자·과제 접근, 회사 생성, Gate 검토 |
| `company_admin` | 자기 회사 사용자·과제 관리, 초대 발급, Gate 검토 |
| `process_owner` | 자기 회사 과제 등록·진행 |
| `member` | 자기 회사 과제 참여 |

권한은 모두 **RLS**에서 강제한다. API 라우트는 얇은 검증만 하고
데이터베이스가 최종 결정한다.

---

## 프로젝트 구조

```
app/
  page.tsx                            랜딩
  login/, auth/callback/, auth/signout/
  dashboard/                          통계 카드 · 최근 과제 · 관리자 네비
  tasks/                              과제 CRUD · 상세 · PBL · Gate · Reports · KPI · Files
    new/                              등록 폼 (server action)
    [id]/
      page.tsx                        상세: 정보 · AX 평가 · Stage 진행 · Gate · 보고서 · KPI · 첨부
      pbl/[stage]/                    스트리밍 인터뷰 UI + finalize
      gate/                           체크리스트 · 승인 요청 · 검토
      reports/                        생성 · 목록 · Markdown 렌더 · 다운로드
      kpis/                           카테고리별 진행률 · 인라인 측정값
  notifications/                      알림 목록 · 읽음 처리
  admin/
    invitations/, users/, companies/  관리자 페이지
  api/
    health/, notifications/, invitations/, companies/, users/,
    tasks/[id]/                       evaluate · pbl/[stage]/{chat,finalize} · gate/*
                                      · reports/generate · files · kpis
    task-files/[id]/                  삭제 · 다운로드(서명 URL)
    kpi-records/[id]/                 측정값 갱신 · 삭제
lib/
  supabase/                           browser · SSR · service role · proxy 세션
  anthropic.ts                        SDK 클라이언트 + DEFAULT_MODEL
  auth/provision.ts                   최초 로그인 프로비저닝
  ax/evaluator.ts                     5축 자동 평가 (tool_use)
  pbl/                                stage-prompts · session · finalize
  gates/generate.ts                   체크리스트 자동 생성
  kpi/extract.ts                      산출물 → KPI 추출
  reports/                            Executive Summary + Markdown 조립 + 렌더러
  notifications/create.ts             service-role 팬아웃
proxy.ts                              Next.js 16 규약 · 세션 리프레시 + 인증 리다이렉트
types/supabase.ts                     생성된 DB 타입
```

---

## Claude 사용 규칙

- 기본 모델: **`claude-opus-5`** (adaptive thinking)
- 구조화된 출력은 **`tool_use` + strict JSON schema**로 강제:
  - AX 평가, Stage 산출물 정리, Gate 체크리스트, KPI 추출, Executive Summary
- 스트리밍은 SSE로 클라이언트에 전달 (`/api/tasks/[id]/pbl/[stage]/chat`)
- `server-only` 가드로 클라이언트 번들에 SDK가 실려나가지 않도록 방지

---

## 주의

- `AGENTS.md`는 `next dev`가 자동으로 다시 생성한다. 커밋 시 삭제된 채로
  올리지 말 것.
- `.env.local`은 `.gitignore`에 포함되어 있으므로 커밋되지 않는다.
- 라이선스: 사내용 (별도 공개 라이선스 미부여)
