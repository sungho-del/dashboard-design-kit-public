# 프로젝트: 대시보드 디자인 시스템 (아임웹 Clay 클론)

> 아임웹 관리자 대시보드의 디자인 시스템 **Clay**를 토큰부터 최종 페이지까지 재현해,
> 기획자·개발자가 바로 가져다 쓸 수 있는 대시보드 규칙 + 컴포넌트 라이브러리를 만든다.
> **데스크톱 관리자 화면이 기준이다** (모바일 앱 아님).

> 개발자 인계: `DEVELOPERS.md` · **폴더 사용 지도: `GUIDE.md`** (무엇이 어디 있고 언제 무엇을 부르는가)
> 프로젝트 개요·문서 지도: `README.md` · 새 프로젝트 셋업: `SETUP.md` (전역 준비 §0 · 기존 프로젝트 이식 `bash install.sh <경로>`)
> **⚡ 세션 시작 시 먼저 읽을 것 — 현재 작업 상태: `docs/HANDOFF.md`** (어디까지 왔나 · 미결 결정 · 다음 할 일)
> 진행 맥락·결정 기록: `docs/PROGRESS.md` · 상시 참조할 핵심 디자인 규칙: `docs/design-core.md`

## 기술 스택

- 프론트엔드: React 19 + TypeScript 5.x
- 스타일링: Tailwind v4 + CSS custom properties (디자인 토큰)
- 토큰 빌드: Style Dictionary (tokens/*.json → CSS 자동 생성)
- 빌드: Vite 6
- UI 문서화: Storybook 8
- 테스트: Vitest + @storybook/test
- 아이콘: **lucide-react** — 크기 16/20/24, **`strokeWidth={1.2}`** 고정(Clay 아이콘 스트로크 규격). 상세: `docs/DESIGN_참고.md` §8
- 차트: **Recharts 3.10.1** — 규격은 `docs/DESIGN.md` §28. ⚠️ 계열색은 **`CHART_SERIES_COLORS[i]` 배열 상수로만** 참조한다. `` `var(--color-chart-series-${i})` `` 처럼 조립하면 Tailwind 스캔이 놓쳐 배포 CSS 에서 변수가 사라진다

## 디렉토리 구조

- `tokens/primitive/` — 원시 스케일(slate·blue·coral-red… / radius·text·shadow). 브랜드 교체 시 여기만 수정
- `tokens/semantic/` — 컴포넌트가 쓰는 의미 토큰(action-primary, text-sub…). 구조: `docs/token-architecture.md`
- `src/tokens/_generated.css` — Style Dictionary가 자동 생성 (직접 수정 금지)
- `src/styles/tokens.css` — Tailwind 진입 계층. `@import "tailwindcss"` + `_generated.css` 재수출 + `@font-face` + **타이포 프리셋 27종(`@utility`)**. **수기 편집이 허용된 유일한 CSS**
- `public/fonts/` — Pretendard woff2 4종(400/500/600/700)
- `src/index.css` — 전역 진입. `styles/tokens.css`만 import
- `src/components/ui/` — 디자인 시스템 UI 컴포넌트 **37종**. 배럴 `index.ts`에 등록해 `import { Button } from "@/components/ui"` 로 쓴다
  `AppShell` `Avatar` `Button` `Card` `Chart` `Checkbox` `DataTableShell` `DatePicker` `Divider` `Dropdown` `EmptyState` `FormField` `Gnb` `IconButton` `InfoList` `Input` `Modal` `PageHeader` `Pagination` `ProgressBar` `Radio` `SegmentedControl` `Select` `SelectionBar` `SideSheet` `Skeleton` `Spinner` `StatGrid` `StatTile` `Switch` `Table` `Tabs` `Tag` `Textarea` `TextButton` `Toast` `Tooltip`
  버튼 계열 variant는 `Button/variants.ts`를 공유한다 (Button·IconButton 동일 규격)
  ⚠️ `FormField`는 **`Input`·`Textarea`·`Select` 전용**이다. `Switch`·`Checkbox`·`Radio`는 루트가 이미 `<label>`이라 감싸면 라벨이 중첩된다 — 자체 `label`·`description` prop을 쓴다
- `src/pages/` — 조립된 화면 **39종** + GNB 구성 `gnbSections.tsx`(여러 페이지 공유). 네 갈래다:
  - **템플릿 4종**(루트, 이커머스) — `OrderListPage`(목록형) · `ProductFormPage`(폼형) · `OrderDetailPage`(상세형) · `DashboardPage`(통계형). 화면 생성기가 변형해 쓰는 원본. 경로 `/_template/*`
  - **차트온 4종**(루트, 병·의원 예약 — 첫 리허설 생성물) — `ClinicStatusPage` · `ReservationListPage` · `ReservationDetailPage` · `PatientFormPage`. 경로 `/_charton/*`
  - `src/pages/babycube/` **28종** — 실전 기획서(`pipeline/01-service-brief.json`)로 Stage 5 가 생성. **원본 route 그대로**(`/` · `/members` · …)
  - `src/pages/classon/` **2종** — 두 번째 리허설 생성물. 경로 `/_classon/*` · 저장소 색인 `ScreenIndexPage`(`/screens`)가 전체 목록을 연다
    모든 화면이 `{navOpen, onNavOpenChange, activeNav, onNavSelect}` props를 받는다. `src/App.tsx`는 **전역 Provider + 경로→화면 조회 맵만**(173줄). 화면마다 URL 이 있고, 라우터는 `src/lib/router.ts` 의 최소 구현이다 — **GNB 항목 id 가 곧 경로**라 별도 매핑표를 두지 않는다(한쪽만 고치면 조용히 어긋난다)
    **GNB 구성·로고 슬롯을 페이지 파일에 두지 말 것** — `App → 페이지 → App` 순환 참조가 되고, 한 페이지에만 넘기면 나머지 화면에서 로고가 사라진다. 반드시 `gnbSections.tsx`의 `GNB_SECTIONS`·`GNB_LOGO_SLOTS`를 가져다 쓴다
- **페이지는 3파일** — `.tsx`(뼈대) + `.data.ts`(도메인) + `.test.tsx`. **stories는 만들지 않는다**(앱 화면이지 디자인 시스템 컴포넌트가 아니다). 페이지 테스트는 **동작**(필터·모달·전환·계산)을 검증할 것 — 렌더 여부만 보면 화면이 통째로 빠져도 통과한다
- ⚠️ **페이지는 템플릿이다 — 뼈대와 도메인을 섞지 말 것.**
  `*.tsx`에는 레이아웃·상호작용·범용 유틸만, `*.data.ts`에는 타입·샘플 데이터·라벨·단위 포맷터를 둔다.
  각 파일 상단의 **구조 계약 주석**(화면 유형 · 갈아끼울 것 · 그대로 두는 것 · 뼈대가 데이터에 기대하는 계약)이 곧 화면 생성기가 읽는 지도이므로, 페이지를 고치면 그 주석도 함께 고친다.
  단위 포맷터(`won` 등)가 여러 `.data.ts`에 중복되는 것은 **의도된 것**이다 — 단위는 도메인이라(원·kg·시간) 공용화하면 서비스 교체 시 뼈대를 고쳐야 한다
  폼 화면은 **간격을 직접 지정하지 않는다** — `AppShell` gap-6(카드 24) · `CardBody` gap-5(필드 20) · `FormField` gap-1.5(라벨↔입력 6)가 실측 규격을 이미 준다. 상세: `docs/DESIGN.md` §29
- `src/lib/cn.ts` — className 조합 유틸. **클래스 병합을 하지 않으므로** 같은 CSS 속성의 클래스를 두 곳에서 방출하지 말 것
- `src/lib/` — 유틸리티
- `pipeline/` — 파이프라인 단계 산출물 (규약: `docs/pipeline-architecture.md`)
- `docs/schemas/` — 파이프라인 산출물 JSON 스키마 (service-brief · screen-plan)
- `_plan/` — 기획서 입력 위치 (파이프라인 트리거의 입력)

CSS 로딩 체인: `src/index.css` → `src/styles/tokens.css` → `src/tokens/_generated.css`

## 디자인 시스템 규칙

### 토큰 사용 (절대 규칙)

- 하드코딩된 색상값(hex, rgb, hsl) 사용 금지. 반드시 semantic 토큰 유틸리티(`bg-surface`, `text-text-sub`) 또는 `var(--color-*)` 사용.
- **색상은 Semantic만 사용** — Primitive(`bg-slate-900`, `var(--color-blue-500)` 등) 직접 사용 금지. 구조: `docs/token-architecture.md`
- ⚠️ **Primary는 파랑이 아니라 near-black**(`action-primary` = `#15181e`). 파랑(`action-accent` `#00b9ff`)은 링크·강조 전용이며 주 버튼에 쓰지 않는다. 레거시 `#1a6dff`는 폐기된 색 — 절대 금지.
- **스페이싱은 Tailwind 유틸리티 그대로**: `p-2`(8) `gap-3`(12) `p-4`(16) `gap-6`(24). `--spacing: 4px` 기반 4px 그리드라 Clay 스케일과 일치한다. 임의 `p-[15px]` 금지.
- **타이포는 프리셋 27종만**(일반 24 + 수치 전용 `metric-*` 3): `heading-2xlarge-bold` · `body-medium` · `label-medium-bold` · `metric-large` 등 (`src/styles/tokens.css`의 `@utility`). Tailwind 기본 `text-sm`·`text-base` 류와 임의 `text-[15px]` **금지**. 목록은 `docs/design-core.md`.
- **경계선·포커스는 `outline` + 음수 offset**으로 그린다(`border` 아님). 기본 `outline:1px solid border; offset:-1px` → focus `2px / -2px / focus`. 레이아웃 밀림 방지를 위한 필수 규칙.
- 컨트롤 높이는 **48/40/32/28** 체계를 따른다 (`--size-control-*`).
- ⚠️ **무언가를 옮기거나 새로 만들 때는 그 자리의 기존 사례를 먼저 확인한다.**
  "이 슬롯을 쓰는 다른 화면은 무슨 값을 쓰나?" — `grep` 으로 답을 보고 나서 쓴다.
  하단 바의 `size="large"` 를 헤더로 그대로 옮겨 14곳이 기본값인 자리에 혼자 48px 이
  된 적이 있다. `npm run check:consistency` 가 이런 불일치를 찾는다
- 사용 맥락(언제 무엇을): `docs/DESIGN_참고.md` · **컴포넌트 상세 수치: `docs/DESIGN.md` — 구현 전 반드시 해당 섹션 Read**
- **대시보드 화면을 만들 때는 `docs/DESIGN-dashboard.md` 를 먼저 Read**. 지표 타일·타일 그리드·수치 타이포(`metric-*`)·증감 표현·차트 색 역할 4종(정체성/순서/극성/약화)·데이터 상태가 거기 있다. ⚠️ **차트는 `surface`(흰 카드) 위에만 놓는다** — 계열 5(`#fe5868`)가 `surface-sub` 에서 명암비 3:1 을 통과하지 못한다

### Style Dictionary 규칙

- 토큰 원본은 `tokens/*.json`만 수정. `src/tokens/_generated.css`는 자동 생성이므로 절대 직접 수정 금지.
- 예외: 토큰 체계로 표현할 수 없는 `@theme` 값(폰트 패밀리 등)은 `src/styles/tokens.css`에 수기로 추가한다.
- 토큰 변경 후 반드시 `npm run build:tokens` 실행.
- 상세 가이드: `docs/style-dictionary-guide.md`

### Tailwind 스캔 범위 (주의)

`src/styles/tokens.css`는 `@import "tailwindcss" source(none)` + `@source` 로 스캔 대상을 **명시 지정**한다
(현재 `src/` · `index.html` · `.storybook`). 자동 탐지가 `.md` 문서까지 읽어서 **문서에 적은 "나쁜 예시"가
실제 CSS 규칙으로 컴파일되던 문제**를 막기 위한 것이다.

- ⚠️ **새 소스 디렉토리를 만들면 `@source`에도 등록할 것.** 빠뜨리면 그 파일의 클래스가 **통째로 사라진다.**
- `@theme` 변수는 **소스에서 실제로 발견된 것만** 출력된다. 토큰 검증은 반드시 해당 유틸리티를 쓰는 화면을 렌더해 확인할 것.

### Storybook 규칙

- 모든 컴포넌트는 반드시 `.stories.tsx` 파일을 함께 생성할 것.
- Story 포맷: CSF3 + TypeScript + `satisfies Meta<typeof Component>`
- 모든 story에 `tags: ['autodocs']` 포함.
- `parameters.design.url`에 해당 Figma 프레임 URL 연결.
- 모든 variant에 대한 개별 story 생성.
- 최소 1개의 play function 포함.

## 컴포넌트 규칙

- 컴포넌트 1개 = 4개 파일: `.tsx` / `.stories.tsx` / `.test.tsx` / `index.ts`
- Named export만: `export function Button() {}`
- Props 인터페이스: `interface ButtonProps {}`
- 전체 네이밍 규칙(파일·토큰·Figma·ID): `docs/naming-conventions.md`

## 파이프라인 트리거 (필수)

- 사용자가 **"프로젝트 작업 진행 시작"** 이라고 입력하면 → `/run-pipeline` 실행 (기획서는 `_plan/`에서 읽음, 체크포인트 방식). 규약: `docs/pipeline-architecture.md`
- **대시보드 제작 경로는 Stage 1 → 5 직행이다.** 기획서를 분석해 화면 목록을 뽑고(1), 그것을 React 화면 코드로 만든다(5). 그 사이 브랜드·Figma 단계는 이 폴더에 없다

## 에이전트 위임 규칙

- 기획서 분석/서비스 분석 요청 → `@agent-service-analyzer`에 위임 (파이프라인 Stage 1)
- **화면·페이지 생성 요청** (기획서 화면을 코드로) → `@agent-screen-builder`에 위임 (파이프라인 Stage 5). 템플릿 4종을 도메인에 맞게 변형한다. **계획서 승인 후 생성** — 카탈로그: `docs/screen-templates.md`
- **새 UI 컴포넌트가 필요할 때** (기존 37종으로 안 되는 부품) → **2인 팀으로 나눈다**
  1. `@agent-ux-designer` — 필요성 판정·anatomy·상태·상호작용·접근성 **설계만**(코드 안 씀). **만들지 않는 판단이 기본값**
  2. `@agent-component-builder` — 그 명세를 **구현만**(설계 안 바꿈). 4파일 + 배럴 + 검증
     커맨드 `/new-component <요구>` 가 이 순서를 태운다. 규격: `DESIGN.md` §26
- 디자인 감사/토큰 검증 요청 → `@agent-design-reviewer`에 위임
- **화면을 만든 뒤 시각 점검** → `@agent-ui-inspector`에 위임 (`/inspect <경로>`). 실제 브라우저로 띄워 겹침·잘림·간격·**같은 종류 값이 이웃해 섞여 읽힘**을 측정한다. ⚠️ **jsdom 에는 레이아웃이 없어 테스트가 이런 결함을 못 잡는다**
- 컴포넌트 구현 완료 후 품질 게이트 → `@agent-design-qa`에 위임 (타입·린트·테스트·빌드·Storybook·토큰·파일 구조·접근성 8항목. 검사 전용, 파일 수정 안 함)

> 브랜드(2a·2b·3)·Figma(4) 에이전트는 **이 폴더에서 삭제했다**.
> 실제로 돌리면 문서 표류로 빌드가 깨지는 상태였고, 대시보드 제작 경로(**Stage 1 → 5**)는
> 그 단계를 거치지 않는다. 브랜드 색을 입히는 기능이 필요해지면 그때 복구한다.

커맨드: `/run-pipeline` `/analyze-plan` **`/build-screens`** `/new-component` `/inspect` `/build-tokens` `/design-audit`

## 빌드 및 테스트 명령어

- `npm run build:tokens` — Style Dictionary 빌드 (tokens/*.json → CSS)
- `npm run dev` — 개발 서버
- `npm run build` — 프로덕션 빌드 (토큰 빌드 포함)
- `npm run storybook` — Storybook (http://localhost:6006)
- `npm run build-storybook` — Storybook 정적 빌드 (design-qa 검사 항목)
- `npm test` — Vitest (`npm test -- --run` 으로 단발 실행)
- `npm run lint` — ESLint
- `npm run format` — Prettier 전체 포맷 (저장 시 훅이 파일 단위로도 실행)
- `npm run reset:project` — **새 프로젝트 시작**: 데모 화면 34종(babycube · classon · 차트온)과 BabyCube GNB·로고를 걷어내고 템플릿 4종만 남긴다. `--dry` 미리보기 · `--yes` 무확인 · 이미 리셋된 폴더에서는 **멈춰서** 사용자 화면을 덮지 않는다(강행은 `--force`). 갈아끼울 깨끗한 원본은 `scripts/reset-project/*.tpl`
- `npm run typecheck` — tsc -b (project references 구성이라 `-b` 필요)

## 자동 실행 훅 (`.claude/settings.json`)

- **차단**: `.env` / `package-lock.json` / `.git` 쓰기 (`protect-files.mjs`, PreToolUse)
- **자동 검사**: 파일 저장 시 hex·rgb·hsl 하드코딩 감지 (`check-design-tokens.mjs`). **spacing·Tailwind 기본 클래스는 잡지 못하므로 직접 확인할 것**
- **자동 검사**: story 파일 존재 여부 (`check-story-exists.mjs`)
- **자동 포맷**: 저장 시 prettier 실행
