# 개발자 가이드

> 기획자가 만든 화면을 **넘겨받아 실제 제품에 태우는 사람**을 위한 문서입니다.
>
> - 폴더 전체 지도: [`GUIDE.md`](./GUIDE.md)
> - 기획자용: [`START-HERE.md`](./START-HERE.md)

---

## 0. 30초 요약

```bash
npm install
npm run dev          # localhost:5173 — 첫 화면이 화면 목록(/screens)
npm test -- --run    # 1747건
npm run build        # dist/
```

**이건 평범한 React 19 + TypeScript + Vite 프로젝트입니다.** 특별한 런타임도, 자체 프레임워크도 없습니다.
넘겨받은 화면은 그냥 `.tsx` 파일이라 **복사해서 여러분 저장소에 붙이면 동작**합니다.

---

## 1. 무엇을 받았나

|                                    | 무엇                                                   | 여러분에게    |
| ---------------------------------- | ------------------------------------------------------ | ------------- |
| `src/pages/`                       | 화면 코드 (화면당 3파일)                               | **가져갈 것** |
| `src/components/ui/`               | 디자인 시스템 부품 37종                                | **가져갈 것** |
| `src/tokens/` · `src/styles/`      | 색·크기·타이포 토큰                                    | **가져갈 것** |
| `src/lib/`                         | `cn`(className 조합) · `router`(60줄) · `useFocusTrap` | 선택          |
| `docs/` · `.claude/` · `pipeline/` | 생성 규약·에이전트·산출물                              | 두고 가도 됨  |

### 화면 하나 = 3파일

| 파일         | 무엇                                           | 여러분이 할 일                       |
| ------------ | ---------------------------------------------- | ------------------------------------ |
| `X.tsx`      | **뼈대** — 레이아웃·상호작용                   | 그대로 쓴다                          |
| `X.data.ts`  | **도메인** — 타입·샘플 데이터·라벨·단위 포맷터 | **여기를 실제 API 로 갈아끼운다**    |
| `X.test.tsx` | 동작 테스트                                    | 그대로 가져가면 회귀 방어가 따라온다 |

이 분리가 이 키트의 핵심입니다. **뼈대는 도메인을 모릅니다.**

---

## 2. 샘플 데이터를 실제 API 로 바꾸기

`.data.ts` 는 **정적 배열 + 타입 + 포맷터**입니다. 뼈대는 그 타입만 알고 있습니다.

```ts
// StudentListPage.data.ts — 지금
export interface Student {
  id: string;
  name: string;
  progress: number; /* … */
}
export const STUDENTS: Student[] = [/* 샘플 12건 */];
```

**바꾸는 방법 세 가지** — 뼈대를 고치지 않는 순서대로:

### ① 타입만 남기고 데이터를 밖에서 주입 (권장)

```tsx
// 페이지 시그니처에 데이터를 받는 prop 을 하나 추가
export function StudentListPage({ students = STUDENTS, ...nav }: Props) {
```

샘플이 기본값으로 남아 Storybook·테스트가 그대로 돌고, 실제 앱에서는 API 결과를 넘깁니다.

### ② `.data.ts` 안에서 fetch

간단한 화면이면 `.data.ts` 를 훅으로 바꿉니다. 뼈대의 import 만 바뀝니다.

### ③ 서버 컴포넌트/로더로 (Next.js 등)

`.tsx` 를 그 프레임워크 규약에 맞게 감싸고 데이터를 props 로 내립니다.

> **`X.tsx` 안에서 직접 fetch 하지 마세요.** 뼈대가 도메인을 알게 되는 순간
> 다른 서비스에 재사용할 수 없게 됩니다 — 이 키트의 유일한 구조적 약속입니다.

### 로딩·에러는 이미 규격이 있습니다

`docs/DESIGN-dashboard.md` §D8 이 시간 기준까지 정해 뒀습니다.

```
< 0.1s  표시하지 않는다
< 1s    표시자를 넣지 않는다 (오히려 방해)
1~10s   스켈레톤(표·타일처럼 구조가 있는 곳) / 스피너(단일 모듈)
> 10s   진행률
```

- **갱신(refetch)은 스켈레톤으로 되돌리지 마세요** — 이전 렌더를 낮은 불투명도로 유지합니다. 레이아웃이 튀고 포커스가 사라집니다.
- **빈 상태 ≠ 에러.** `EmptyState` 를 에러에 재사용하지 마세요.

---

## 3. 우리 프로젝트에 이식하기

### 통째로 옮길 때

```bash
bash install.sh <대상 프로젝트 경로>
```

`SETUP.md` 에 체크리스트가 있습니다.

### 손으로 옮길 때 — 이 순서를 지키세요

1. **토큰 먼저** — `tokens/` + `src/tokens/_generated.css` + `src/styles/tokens.css`
2. `src/lib/cn.ts`
3. `src/components/ui/` (필요한 것만 골라도 되지만 서로 참조합니다 — 아래 참조)
4. 화면

### ⚠️ Tailwind v4 설정이 필수입니다

`src/styles/tokens.css` 가 진입점이고 **`@import "tailwindcss" source(none)` + `@source`** 로
스캔 대상을 명시합니다. 자동 탐지를 끈 이유는 `.md` 문서 속 "나쁜 예시" 클래스까지
실제 CSS 로 컴파일되던 문제 때문입니다.

**새 소스 디렉토리를 만들면 `@source` 에 등록하세요.** 빠뜨리면 그 폴더의 클래스가 **통째로 사라집니다.**

### 컴포넌트 의존 관계

대부분 독립이지만 몇 개는 서로 씁니다:

```
StatGrid  → StatTile → Tag
Modal · SideSheet · Tooltip · Dropdown · DatePicker → @floating-ui/react
Chart → recharts
Gnb → useFocusTrap
```

`src/components/ui/index.ts` 배럴에서 import 하세요 — 개별 경로는 내부 구조입니다.

---

## 4. 규칙 — 어기면 조용히 깨지는 것들

빌드는 통과하는데 **배포에서만 깨지는** 종류라 특히 조심해야 합니다.

| 규칙                                                              | 어기면                                                                                         |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **클래스를 문자열로 조립하지 않는다** — `` `grid-cols-${n}` `` ❌ | Tailwind 스캔이 놓쳐 **배포 CSS 에서 그 규칙이 통째로 사라진다.** 완전한 문자열을 맵에 적을 것 |
| 차트 색은 `CHART_SERIES_COLORS[i]` 배열 상수                      | 같은 이유 (`` `var(--color-chart-series-${i})` `` ❌)                                          |
| 새 소스 디렉토리는 `@source` 에 등록                              | 그 폴더 클래스가 전부 사라진다                                                                 |
| 토큰 수정 후 `npm run build:tokens`                               | `_generated.css` 가 안 바뀌어 반영되지 않는다                                                  |
| 색은 **semantic 토큰만** (`bg-surface`), primitive 직접 사용 금지 | 브랜드 교체 시 안 따라온다                                                                     |
| 타이포는 **프리셋 27종만** (24 + `metric-*` 3)                    | 시각 언어가 갈라진다                                                                           |
| 경계선은 **`outline` + 음수 offset**(`border` 아님)               | 레이아웃이 1px 씩 밀린다                                                                       |
| `cn()` 은 **클래스를 병합하지 않는다**                            | 같은 속성을 두 갈래에서 방출하면 승자를 CSS 순서가 정한다                                      |

> 앞의 두 개는 저장 시 훅이 잡아 줍니다(hex/rgb 하드코딩·story 누락).
> **나머지는 잡히지 않으니** 직접 지켜야 합니다.

### 표는 `%` 가 아니라 px 로 폭을 잡습니다

`<colgroup>` 의 `w-[N%]` 는 **의도적 예외**입니다(`%` 는 4px 그리드와 무관한 축).
`sticky left-*` 를 쓰는 열이 있으면 **앞 열 폭의 누적합**이라 폭을 고칠 때 함께 고쳐야 합니다.

---

## 5. 검사 도구

```bash
npm run typecheck          # tsc -b (project references 구성이라 -b 필요)
npm run lint               # eslint
npm test -- --run          # vitest 1747건
npm run build              # 토큰 빌드 + tsc + vite build
npm run storybook          # 컴포넌트 37종 문서 (localhost:6006)
npm run check:consistency  # ⭐ 슬롯 일관성
```

### `check:consistency` 를 꼭 돌려 보세요

규칙 목록으로는 **못 잡는 종류**를 잡습니다 — 같은 자리에 다른 값이 쓰였는지 **빈도로** 찾습니다.

실제 사례: 하단 바의 버튼(`size="large"` 48px)을 헤더로 옮기면서 크기를 그대로 뒀는데,
헤더에 버튼을 두는 **14개 화면이 전부 기본값(40px)** 이었습니다.
그런데 "헤더 버튼은 medium" 이라는 규칙은 **문서 어디에도 없었습니다** — 관행일 뿐이었죠.

소수파가 **정당한 예외**라면 이유를 코드 주석에 남기세요. 검사기가 인정하고 통과시킵니다.

### 테스트가 통과해도 화면은 이상할 수 있습니다

**jsdom 에는 레이아웃이 없어** 폭·간격·겹침이 전부 0 으로 계산됩니다.
실제 픽셀은 `/inspect <경로>`(Claude Code 안에서)가 브라우저를 띄워 좌표로 측정합니다.

---

## 6. 컴포넌트를 새로 만들 때

`src/components/ui/` 에 없는 부품이 필요하면:

1. **`docs/DESIGN.md` §26 을 먼저 보세요** — Skeleton·ProgressBar·Breadcrumb 등
   **9종의 규격이 이미 있습니다.** 유추는 마지막 수단입니다.
2. 컴포넌트 1개 = **4파일** — `.tsx` / `.stories.tsx` / `.test.tsx` / `index.ts` + 배럴 등록
3. Named export (`export function Button() {}`), props 인터페이스는 `interface ButtonProps`
4. Claude Code 를 쓴다면 **`/new-component <요구>`** 가 설계(`ux-designer`) → 구현(`component-builder`)
   → 게이트(`design-qa`) 순서를 태워 줍니다

### 테스트는 동작을 검증하세요

렌더 여부만 보면 **화면이 통째로 빠져도 통과**합니다. 필터·검색·모달·전환·계산을 검증하세요.
클래스 검사는 `className.split(/\s+/)` 배열에 `toContain` 으로 — 문자열 부분 일치는 버그를 놓칩니다.

---

## 7. 배포

`vercel.json` 에 SPA 리라이트가 들어 있습니다.

```bash
npm run build
vercel deploy
```

라우터는 `src/lib/router.ts` 의 **History API 위 60줄짜리 최소 구현**입니다.
react-router 를 넣지 않은 이유는 **가져다 쓰는 쪽에 라우터 선택을 강요하지 않기** 위해서입니다.
여러분 프로젝트에 이식할 때 **그 파일을 지우고 `useLocation`/`useNavigate` 로 갈아끼우면 끝**입니다.

지원: pathname 구독 · pushState 이동 · 뒤로/앞으로 · 쿼리스트링
미지원: 중첩 라우트 · 경로 파라미터(`/members/:id`) · 로더 · 전환 애니메이션

---

## 8. 알아 둘 한계

| 항목                   | 상태                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ |
| **다크 모드**          | 없습니다. 라이트 전용이고 토큰에 다크 값을 넣지 않았습니다(구조만 보존)        |
| **밀도(compact) 모드** | `DESIGN-dashboard.md` §D10 이 **이름만** 정했습니다. 전환 구현은 없습니다      |
| **표 정렬 UI**         | `Table` 에 정렬 어포던스가 없습니다                                            |
| **고정 열(sticky)**    | 지원하지만 폭 누적합을 손으로 맞춰야 합니다                                    |
| **모바일**             | **데스크톱 관리자 화면 전용**입니다. 브레이크포인트는 992/588 뿐               |
| **i18n**               | 없습니다. 문구가 `.data.ts` 와 뼈대에 한국어로 들어 있습니다                   |
| **라이브 리전**        | `Toast`·`SelectionBar` 에만 있습니다. 필터 결과 건수 공지는 미구현(WCAG 4.1.3) |

`docs/DESIGN-dashboard.md` **§D13("이 문서가 규정하지 않는 것")** 에 더 정확한 목록이 있습니다.

---

## 9. 더 읽을 것

| 문서                         | 언제                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `docs/design-core.md`        | **상시** — 색·타이포·간격·경계선 핵심                                            |
| `docs/DESIGN.md`             | 컴포넌트 수치 (§0 셸 · §7 표 · §26 신규 부품 · §28 차트 · §29 폼 · §30 InfoList) |
| `docs/DESIGN-dashboard.md`   | 지표·차트 화면 (§D3 타일 · §D6 수치 · §D7 차트 색 · §D8 데이터 상태)             |
| `docs/token-architecture.md` | 토큰을 추가·수정할 때                                                            |
| `docs/screen-templates.md`   | 화면을 새로 만들 때                                                              |
| `docs/HANDOFF.md`            | 이 저장소의 현재 상태·미결 사항                                                  |
