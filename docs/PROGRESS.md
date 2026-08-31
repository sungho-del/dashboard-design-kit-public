# PROGRESS.md — 진행 기록

> "무엇을·왜 그렇게 결정했고·무엇이 남았나"를 한눈에 보는 맥락 복구용 기록.
> 상세 규칙은 각 문서(design-core / token-architecture / DESIGN / DESIGN_참고)에 있다.
> 최종 갱신: 2026-08-19

## 목표

아임웹 관리자 대시보드의 디자인 시스템 **Clay**를 재현해, 기획자·개발자가 바로 가져다 쓸 수 있는
**대시보드 규칙 + 컴포넌트 라이브러리 + 조립된 최종 페이지**를 만든다.

## 진행 상황

| Phase | 내용                                  | 상태                 |
| ----- | ------------------------------------- | -------------------- |
| 0     | 환경 복구 · 레퍼런스 격리             | ✅ 완료              |
| 1     | Clay 토큰 전면 이식                   | ✅ 완료 (289개)      |
| 2     | 문서 재작성                           | ✅ 완료              |
| 3     | 기반 컴포넌트 8종                     | ✅ 완료 (테스트 95)  |
| 4     | 복합 컴포넌트 12종                    | ✅ 완료 (테스트 368) |
| 5     | 폼 컴포넌트 4종 `[유추]`              | ✅ 완료 (테스트 440) |
| 6     | 레이아웃 셸 (AppShell·GNB·PageHeader) | ✅ 완료 (테스트 519) |
| 7     | 차트 (토큰 + Recharts + §28 문서)     | ✅ 완료              |
| 8     | 페이지 조립 4종                       | 🔵 1/4 (대시보드)    |

## 레퍼런스 분석 결과 (Phase 0)

`_reference/vhf535763542.imweb.me/` — 아임웹 관리자 저장본 386파일 / 53MB.

| 파일                                              | 정체                                                                         | 가치            |
| ------------------------------------------------- | ---------------------------------------------------------------------------- | --------------- |
| `design-system/clay/vars.css`                     | **Clay 토큰 정본** 637줄 (라이트·다크 2벌)                                   | ⭐ 최상         |
| `brand-admin/_astro/gnb.BZBi7U3h.css`             | **Clay 컴포넌트 번들** (이름은 GNB지만 Button·Toast·Tabs·Pagination 등 전체) | ⭐ 최상         |
| `brand-admin/_astro/container.BuDZObdr.css`       | 실제 GNB 사이드바 (클래스명 가독)                                            | ⭐ 최상         |
| `brand-admin/_astro/client-provider.hjDLpAAS.css` | 앱 레이어 (Table·Card·Modal 레이아웃)                                        | 높음            |
| `css/site/admin/dashboard.css`                    | 레거시 532KB — Bootstrap 3 + Material Admin(2015)                            | 치수·정보구조만 |
| `admin.html`                                      | **게스트 리다이렉트 페이지 — 실제 마크업 없음(React CSR)**                   | 낮음            |

**중요**: 아임웹은 스트랭글러 패턴으로 마이그레이션 중이다. 신규 화면은 Astro + Clay,
레거시 화면은 `dashboard.css`가 남아 있고 경계면만 Clay 토큰이 침투했다.

## 핵심 결정 (왜 그렇게 했나)

- **Clay 토큰으로 전면 교체** — 기존 프로젝트는 모바일 커머스(375px, `#2962FF`) 기준이라 데스크톱 대시보드와 전제가 전부 달랐다. 병존은 토큰 어휘가 두 벌이 되어 컴포넌트마다 선택 규칙이 필요해지므로 폐기.
- **색상만 2층, 치수는 1층** — Clay 자체가 그 구조다. 치수에 의미층(`spacing-sm/md`)을 덧대면 아임웹 실측 수치와 1:1 대조가 불가능해져 클론 정확도가 떨어진다.
- **`--spacing: 4px` 단일 토큰** — Clay의 space 스케일(0/2/4/6/8/10/12/16/20/24…)이 Tailwind 기본 스케일과 정확히 일치함을 확인. 단일 값만 재정의해 전 스케일을 px 고정으로 재현했다. 개별 spacing 토큰 22개가 불필요해짐.
- **Pretendard 단일화** — Clay 원본은 본문에 아임웹 독점 폰트 `imweb Sans`를 쓰지만 재배포 라이선스가 불명확. Pretendard(OFL)는 Clay도 이미 heading에 쓰고 있어 시각차가 작다. `--font-base`/`--font-large` 토큰은 남겨 나중에 교체 가능하게 유지.
- **라이트 테마만** — 실제 아임웹 관리자가 `data-clay-theme="light-only"` 고정 운영. 다크 값은 `vars.css` 343~462줄에 있으므로 semantic 세트만 추가하면 전환 가능하도록 구조는 보존.
- **타이포는 `@utility` 프리셋 24종** — Clay가 `.clay-body-medium` 같은 프리셋 클래스로 쓰므로 동일 방식. `text-text-sub` 같은 어색한 유틸 조합을 피하는 효과도 있다.
- **커스텀 Style Dictionary transform 2개** — ① `name/clay`: 기본 `name/kebab`(lodash)이 `text.2xsmall`을 `--text-2-xsmall`로 쪼개는 문제 해결 ② `css/clay`: `size/rem` 제외해 px 고정 유지.
- **레퍼런스를 `src/` 밖으로 격리** — `tsconfig`의 `include:["src"]`와 Tailwind v4 자동 스캔이 53MB를 훑어 빌드 오염·오탐 클래스 위험. `_reference/`로 이동하고 eslint·prettier에서 제외.
- **Recharts 채택** — 아임웹 원본은 Chart.js/Morris.js를 쓰지만 canvas 기반이라 React 래핑과 토큰 연동에 추가 작업이 필요. Recharts는 선언형이라 디자인 토큰 주입이 쉽다.
- **lucide-react 채택** — Clay는 아이콘을 인라인 SVG로 렌더링하고 `--clay-border-icon: 1.2px` 스트로크 토큰을 갖는다. lucide는 stroke 기반이라 `strokeWidth={1.2}`로 이 규격을 그대로 재현할 수 있고, 크기를 16/20/24로 자유 지정하며, 트리쉐이킹으로 사용한 아이콘만 번들에 들어간다(검증: 4개 사용 시 +5.1kB).

## Phase 3 결정

- **`cn()`은 의존성 없이 자체 구현** — clsx·tailwind-merge를 쓰지 않는다. 이 시스템은 그대로 가져다 쓰는 것이 목적이라 의존성을 최소화한다. 대신 **클래스 병합을 하지 않으므로** 같은 CSS 속성의 클래스를 두 곳에서 방출하지 않도록 주의해야 한다(아래 함정 기록).
- **버튼 계열 variant를 `Button/variants.ts`로 공유** — Clay 명세상 IconButton의 variant·상태 전이가 Button과 완전히 동일하다. 8 variant × 5 상태를 두 번 쓰지 않도록 base·radius·spinner 크기까지 함께 분리했다.
- **`ref`를 모든 인터랙티브 컴포넌트에 노출** — React 19는 ref를 일반 prop으로 받는다. 앞으로 만들 Modal·Tooltip·Dropdown이 앵커 참조를 요구하므로 Button·IconButton·TextButton·Input에 일괄 추가했다.
- **배럴 `src/components/ui/index.ts` 신설** — 사용처가 `import { Button, Tag } from "@/components/ui"` 한 줄로 쓰도록. 컴포넌트 추가 시 등록 필수.
- **Avatar 이니셜 색은 `text-text`(near-black)** — 배경 `surface-avatar`가 slate-300(`#bcc0c6`)이라 흰 글자는 명암비 **1.83:1**로 WCAG AA 미달. near-black은 **9.7:1**로 AAA까지 통과한다.
- **IconButton은 아이콘 크기를 자식 svg에 강제**(`[&>svg]:size-6`) — 사용처가 size를 따로 맞추지 않아도 Clay 규격(large 24 / 나머지 16)이 지켜진다.

## Phase 4 결정

- **포지셔닝은 `@floating-ui/react`** — 아임웹 원본이 쓰는 것과 같은 계열이다(`admin.html`에 `floating-ui-dom@1.0.1` 로드). 화면 경계 반전·스크롤 추종·화살표 위치를 모두 처리하면서 헤드리스라 디자인은 100% 우리 토큰으로 유지된다.
- **DatePicker는 `react-day-picker` v10 래핑** — 레퍼런스 CSS에 `rdp-*` 클래스와 `--rdp-day_button-height: 40px`가 그대로 남아 있어 원본과 동일한 선택이다. v10도 같은 변수명을 유지함을 확인해 §17 수치를 그대로 옮겼다.
- **rdp 기본 CSS는 import하지 않고 `classNames` 전면 주입** — CSS를 안 들이면 `--rdp-*` 변수는 아무도 읽지 않는 죽은 변수라 "변수만 재정의" 전략은 성립하지 않는다. 반대로 import하면 `--rdp-accent-color: blue` 하드코딩과 `.rdp-disabled { opacity: .5 }`(§17의 "opacity 1 강제"와 충돌)를 전부 상쇄해야 한다.
- **Dropdown은 포커스 트랩이 아니라 roving focus** — `useListNavigation`으로 활성 아이템만 `tabIndex=0`. `FloatingFocusManager`는 `modal={false}` + `initialFocus={-1}`로 두어 포커스 복원 역할만 맡긴다(마우스로 열면 포커스가 트리거에 남고, 키보드로 열면 첫 아이템으로 간다).
- **Dropdown 아이템의 비활성은 `aria-disabled`** — 네이티브 `disabled`를 쓰면 스크린리더가 항목을 읽지 못한다. `useListNavigation`은 `aria-disabled`를 보고 건너뛴다.
- **z-index 층 정리** — Dropdown은 `--z-sidesheet`(헤더 위·모달 아래), Tooltip과 DatePicker 팝오버는 자신을 띄운 레이어(모달 포함) 위에 떠야 하므로 각각 `--z-toast`·`--z-modal`.
- **오버레이 공용 `lib/useFocusTrap.ts`** — Modal·SideSheet가 공유. 초기 포커스는 첫 요소가 아니라 **컨테이너 자신**에 준다(스크린리더가 제목 대신 닫기 버튼 이름부터 읽는 것을 막기 위해). 포커스 복원 effect의 deps는 `[open]` 하나만 — `onClose`를 섞으면 부모 리렌더마다 재실행돼 포커스가 되돌아간다.
- **Table zebra는 Context로 전달** — `TableHead`가 같은 컨텍스트를 `zebra:false`로 덮어 헤더가 줄무늬를 타지 않는다.
- **Pagination 축약 로직은 `range.ts`로 분리** — 감춰지는 페이지가 1개뿐이면 `…` 대신 그 번호를 노출해, 목록 길이가 현재 페이지 위치와 무관하게 일정하다.
- **Card 기본은 그림자 없음** — `outline-1 -outline-offset-1 outline-border`. `elevated`일 때만 `shadow-card`(이때는 보더 제거). 카드 제목 기본은 `heading-medium-bold`(16) — 18로 하면 섹션 제목(20)과 위계가 겹쳐 `design-core.md` 표를 이에 맞춰 수정했다.
- **Toast는 Provider + `useToast()` 훅** — Context를 `useToast.ts`에 분리했다. Provider 파일이 컴포넌트 외 값을 export하면 `react-refresh/only-export-components`에 걸리고 HMR 때 토스트 상태가 날아간다.

## 목록 화면 조합에서 확정된 것 (2026-08-18)

Phase 4까지의 컴포넌트로 주문 관리 화면을 조립해 검증했다(`src/App.tsx`). 이때 정정한 3가지는 **레퍼런스 실측이 정본**이며, Phase 8 페이지 조립의 기준이 된다.

- **테이블은 `Card`로 감싸지 않는다.** Card의 `p-6`와 셀의 `first:pl-6`가 겹쳐 테이블 좌우만 48px이 되고 제목(24px)과 어긋난다. §7-1 테이블 셸 구조를 쓴다 — 툴바 `p-6` · **테이블 wrapper 패딩 0** + `overflow-auto` · pagination `px-6`. 셀의 24px가 곧 컨테이너 가장자리 정렬이라 zebra가 좌우 끝까지 꽉 찬다.
- **모든 셀은 좌측 정렬.** 금액 컬럼만 우측 정렬하지 않는다 — 신규 Clay 테이블 CSS에 `text-align: right`가 0개(center 7 · left 2)이고, 레거시 `.table-data`는 컬럼이 아니라 표 전체를 우측 정렬하는 통계표 전용 변형이다. (`DESIGN_참고.md` §7에 잘못 적혀 있던 "숫자 컬럼 우측 정렬"을 정정했다 — 실측이 아니라 일반 관행을 옮긴 것이었다.)
- **`colgroup`으로 컬럼 폭을 비율(%) 배분한다.** `table-fixed`라 폭을 지정하지 않으면 균등 분배되고, 한 컬럼만 `auto`로 두면 화면이 넓어질 때 그 컬럼이 남는 공간을 독식해 다른 컬럼과 멀어진다.

→ 이 셸 구조는 Phase 6 또는 8에서 **`DataTableShell` 컴포넌트로 추출**할 것. 원본도 같은 셸이 5개 파일에 중복 정의돼 있었다.

## Phase 5 결정

- **네이티브 `<input>`을 `sr-only`로 두고 시각 표현만 커스텀** — Checkbox·Radio·Switch 공통. 폼 제출·키보드·스크린리더 동작이 그대로 따라오므로 `role="checkbox"` 수동 구현을 피한다.
- **포커스 링을 위한 래퍼 한 겹** — §26의 포커스는 `outline 2px / offset +2`인데 경계선 규칙도 `outline + 음수 offset`이라 한 요소에서 같은 속성이 충돌한다. 래퍼가 링만, 안쪽 요소가 경계선만 그리도록 분리했다.
- **checked는 CSS로, 나머지 상태는 JS로** — `checked`는 `group-has-[:checked]`로 읽어 제어/비제어·`form.reset()` 모두에서 표현이 실제 값과 일치한다. `indeterminate`·`disabled`·`invalid`는 사용처가 명시적으로 넘기는 값이라 JS 분기.
- **Radio는 "테두리 + 가운데 점"** `[유추]` — "검은 원 + 흰 점"은 Checkbox 선택 상태(검은 사각형 + 흰 체크)와 20px에서 실루엣이 거의 같아진다. 색만이 아니라 형태로도 구분되게 했다.
- **Switch disabled에 `action-primary-disabled`를 쓰지 않는다** — slate-tint-5라 정상 꺼짐(tint-15)보다 밝아져 on/off 명암이 뒤집힌다. 켜짐 `action-primary-tonal` / 꺼짐 `action-primary-tonal-disabled`로 한 단계 낮춰 표현한다.
- **Select는 virtual focus** — `aria-activedescendant`를 쓰려면 DOM 포커스가 트리거에 남아야 해서 `useListNavigation({ virtual: true })`. Dropdown과 달리 `FloatingFocusManager`를 쓰지 않는다(포커스가 나간 적이 없고, focus manager가 가져가면 활성 옵션 추적이 깨진다).
- **Select 패널 padding은 §5-2의 16이 아니라 §11의 6** — §5-2의 16은 컬럼 구분선을 가진 다중 컬럼 검색 패널의 값이다. 단일 옵션 리스트에 쓰면 40px 옵션 둘레 여백이 과해져 트리거보다 패널이 커 보인다.

## Phase 6 결정

- **GNB 축소 모드는 Tailwind v4 코어 컨테이너 쿼리 변형으로 구현** — `@container` + `@max-[60px]:` / `@max-[200px]:`. 별도 플러그인·`<style>` 없이 컴파일된다.
  - **임계값이 그대로 맞는 이유**: 컨테이너 쿼리의 `width`는 **content box**를 잰다. wrapper가 `px-3`(24)를 가지므로 실제 질의값은 확장 224−24=**200**, 축소 60−24=**36**이다. 원본 CSS의 두 번째 임계값이 정확히 `200px`인 것이 이 해석을 뒷받침한다.
  - 소스 순서 검증: `hidden`·`pl-2`·`bg-action-primary-tonal`·`hover:bg-*`가 모두 `@max-*` 변형보다 앞에 출력되므로 동일 명시도에서 컨테이너 쿼리 분기가 항상 이긴다.
- **AppShell은 사이드바를 래퍼로 감싸지 않는다** — GNB 축소가 `position:absolute` + 부모 `min-width:60`에 의존하므로(§0) 중간 래퍼가 끼면 깨진다. "넘기는 노드가 자기 폭·`h-dvh`·`shrink-0`을 책임진다"가 계약이다.
- **PageHeader 하단선은 border가 아니라 inset 그림자** — border를 쓰면 `min-height: 72`가 실제 73px이 된다.
- **DataTableShell은 `isEmpty`일 때 푸터·더보기도 함께 숨긴다** — 빈 상태 아래 페이지 번호가 남으면 어색하고, 모든 사용처가 `{!isEmpty && <Pagination/>}` 보일러플레이트를 반복하게 된다.
- **semantic 토큰 3개 신설** — `text-highlight`(blue-600) · `text-promotion`(pink-500) · `icon-highlight`(blue-600). Clay에는 `surface-highlight-*`만 있고 짝이 되는 텍스트 토큰이 없어, 정보성 태그와 GNB `new` 배지가 primitive를 직접 참조해야 하는 문제가 있었다. **Clay 원본에 없는 우리 확장이다.**

## 함정 기록 (재발 방지)

- **토큰 키 충돌**: Style Dictionary는 모든 소스를 deep merge한다. semantic의 leaf `color.overlay`가 primitive 그룹 `color.overlay.{light,strong,toast}`를 덮어써 참조 3개가 깨졌다 → primitive를 `color.dim.*`으로 개명해 해결. **새 토큰 추가 시 primitive 그룹명과 semantic 토큰명이 겹치지 않는지 확인할 것.**
- **폐기된 색**: 레거시 `#1a6dff`(구 브랜드 블루, `dashboard.css`에 137회), `gnb.css`의 `--clay-color-semantic-*`(imBlue·raspberry·mango·mint) 세트 — 정의만 있고 참조하는 컴포넌트가 없는 마이그레이션 잔재. slate tint 값도 정본과 미세하게 다르다.
- **Tailwind v4 트리쉐이킹**: `@theme` 변수는 실제 사용된 것만 CSS에 출력된다. 토큰 검증은 반드시 해당 유틸리티를 쓰는 화면을 렌더해서 확인할 것.
- **`cn()`은 클래스 병합을 하지 않는다**: 같은 CSS 속성의 클래스를 base와 size 양쪽에서 방출하면 승자가 스타일시트 순서에 좌우된다. 해결책 2가지 — ① 한쪽에서만 방출(TextButton의 gap을 size로 몰아넣은 사례) ② 조건 분기로 상호배타 방출(Input의 hover outline). 상태 우선순위가 필요하면 **variant를 겹쳐 명시도를 높인다**(`focus-within:hover:outline-focus`, `disabled:data-[loading=true]:*`).
- **`text-highlight` 토큰이 없다**: Clay에 `surface-highlight-{primary,secondary}`는 있지만 짝이 되는 텍스트 토큰이 없어, 정보성(파랑) 태그는 `text-accent`와 조합하거나 custom tone으로 우회해야 한다. Clay 자체의 갭이다.
- **`<input>`은 flex 안에서 축소되지 않는다**: 기본 `min-width: auto` 때문에 `flex-1`을 줘도 기본 폭(~180px)만큼 버틴다. 반드시 `min-w-0`을 함께 줄 것.
- **지연 마운트는 초기 포커스를 유실시킨다**: SideSheet가 `mounted`를 effect에서 켜자 `useFocusTrap`의 초기 포커스 effect가 더 먼저 돌아 컨테이너 ref가 `null`이었다. 처음부터 열린 채 렌더하면 통과하고 **트리거로 여는 실제 경로에서만 깨져** 놓치기 쉽다. → 열기는 **렌더 중 상태 조정**(`if (open && !mounted) setMounted(true)`)으로 같은 커밋에 DOM을 올릴 것.
- **transition은 시작·끝 값이 같은 프레임에 계산되면 걸리지 않는다**: 진입 애니메이션은 마운트 후 `requestAnimationFrame`(SideSheet는 이중 rAF) 뒤에 최종 상태로 바꿔야 재생된다.
- **zebra 위에서는 hover 명시도가 부족하다**: `hover:bg-*`(0,2,0)로는 `odd:bg-*`(0,2,0)를 이기지 못한다. `odd:hover:`/`even:hover:`로 겹쳐 (0,3,0)으로 올릴 것.
- **`line-clamp`는 테이블 셀에 직접 걸면 안 된다**: `display:-webkit-box`가 표 레이아웃을 깨므로 셀 내부 `<span>`에 건다.
- **react-day-picker도 클래스를 병합하지 않는다**: 수식자 클래스를 `className.join(" ")`으로 단순 연결하므로 `cn()`과 같은 문제가 생긴다. 게다가 **range 모드는 범위 안 모든 날에 `selected`가 붙는다** — 중간 날 스타일은 `data-selected:` variant로 특이도를 눌러야 이긴다.
- **rdp range의 첫 클릭은 `{from: d, to: d}`를 돌려준다**: "from·to가 다 찼는가"로 완료를 판정하면 첫 클릭에서 팝오버가 닫혀 종료일을 고를 수 없다. 선택 횟수를 세서 "시작 → 종료" 흐름을 구분할 것.
- **floating-ui `focusItemOnOpen: 'auto'`는 Enter로 열면 마지막 항목을 활성화한다**: 내부적으로 "끝으로 가는 키가 아니면 max index"로 판정하는데 Enter가 여기 걸린다. Select 류는 `false`로 두고 열 때 활성 항목을 직접 지정할 것(선택값이 있으면 그 항목, 없으면 첫 항목).
- **listbox를 래퍼와 스크롤러로 쪼개지 말 것**: `overflow-hidden` 래퍼 + 내부 스크롤러로 나누면 `role="listbox"`와 `role="option"` 사이에 익명 div가 끼어 소유 관계가 끊긴다. `overflow-y: auto`만 줘도 `overflow-x`가 auto로 계산돼 radius 클리핑은 유지된다.
- **`getReferenceProps()` 밖에 onKeyDown을 두지 말 것**: listNavigation·typeahead 핸들러를 덮어써 키보드가 죽는다.
- **`<label>` 안의 설명은 접근성 이름에 섞인다**: `aria-labelledby`로 이름을 라벨 텍스트에 고정하고 설명은 `aria-describedby`로만 전달할 것.
- **jsdom에는 레이아웃이 없다**: `offsetParent`·`getComputedStyle`로 가시성을 거르면 모든 요소가 "안 보임"으로 판정된다. 포커스 트랩의 focusable 필터는 마크업 속성(`disabled`·`aria-hidden`·`tabindex="-1"`)만으로 판단할 것. `ResizeObserver`도 존재 여부를 가드해야 한다.

## 검증 상태 (Phase 0~2)

| 항목                    | 결과                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `npm install`           | ✅ 324 패키지. **기존 rollup 네이티브 바이너리 누락 이슈 해소됨**                                 |
| `npm run build:tokens`  | ✅ 289개 토큰 생성                                                                                |
| `npm run build`         | ✅ 통과                                                                                           |
| `npm run typecheck`     | ✅ 통과                                                                                           |
| `npm run lint`          | ✅ 통과 (`_reference` 제외 설정 후)                                                               |
| `npm test -- --run`     | ✅ 5/5 통과                                                                                       |
| 실렌더 검증             | ✅ `bg-surface-sub`·`text-text-sub`·`rounded-medium`·`shadow-popover`·타이포 프리셋 CSS 생성 확인 |
| semantic→primitive 참조 | ✅ `var()` 링크 유지 (`--color-action-primary: var(--color-slate-900)`)                           |

## 남은 것 · 알려진 제약

- **최종 대시보드 페이지는 "재현"이 아니라 "설계"다.** `admin.html`에 실제 마크업이 없어(React CSR) 화면 조립은 확보한 정보구조 + Clay 규격으로 재구성한다. 픽셀 동일은 토큰·컴포넌트 레벨까지만 보장된다.
- **원본에 없는 컴포넌트 9종**은 Clay 규격에서 유추 설계한다 — Checkbox·Radio·Switch·중앙 Modal·Card·Avatar·Divider·Skeleton·Breadcrumb. 지침은 `DESIGN.md` §26.
- `Button.tsx`가 아직 구 토큰(`bg-primary`·`text-sm`)을 사용 중 — Phase 3에서 Clay 8variant×4size로 재작성 예정.
- `docs/mobile-frames.md`는 모바일 앱 전용 문서라 이 프로젝트와 무관 — 정리 여부 미정.
- ~~아이콘 세트 미정~~ → **lucide-react 1.31.0 채택·설치 완료**.

---

## Phase 6 후속 — 셸 결함 2건 수정 (2026-08-18)

### ① GNB 세로 붕괴 — 슬롯에 `flex-1`을 붙이면 세로로 자란다

`App.tsx`가 사이트 선택기 래퍼에 `flex-1`을 줬는데, 이 슬롯은 GNB wrapper(`flex-col`)의
**직접 자식**이라 `flex: 1 1 0%`가 세로로 작동했다. 스크롤 영역도 `flex-1`이라 둘이
높이를 50:50으로 나눠 갖고 메뉴가 화면 아래로 밀렸다.

- 레퍼런스 `.gnb_commonMenuHeaderItem`의 `flex: 1`은 **래퍼가 아니라 안쪽 텍스트**에 걸린 값이다(가로 말줄임용).
- `Gnb.stories.tsx`가 `header` 슬롯을 한 번도 쓰지 않아 스토리에서 드러나지 않았다.
- **재발 방지**: `Gnb`가 header 슬롯을 블록 래퍼로 한 겹 감싼다. 래퍼가 flex 아이템이 되면
  안쪽 flex 값은 무력해진다. 세로 리듬은 컨테이너가 지킨다는 계약.

> 교훈: 슬롯 컴포넌트에 **가로 문맥 감각으로 클래스를 넘기지 말 것.** 슬롯의 부모 축을 먼저 확인한다.

### ② `outline` + 음수 offset은 자손 배경에 덮인다

`outline-offset: -1px`는 경계선을 **박스 안쪽 1px 띠**에 그린다. `DataTableShell`은 그 띠를
자손이 불투명 배경으로 덮는 유일한 컨테이너다 — `<thead>`/`<th>`의 `bg-surface`,
`<tr>`의 zebra 배경이 좌우 끝까지 차기 때문(줄무늬가 가장자리까지 가야 한다는 §7 의도).
그 결과 **표 구간에서만 좌우 세로선이 지워졌다.**

- 근거: 선이 사라진 구간 = 불투명 배경 자손이 있는 구간(헤더행+본문행)과 정확히 일치.
  배경이 없는 툴바·푸터 구간에서는 선이 살아 있었다.
- **해결**: 경계선을 `::after` 오버레이로 이관. 배치 자손이라 표 배경보다 뒤에 그려진다.
  `after:z-3`으로 sticky thead(`z-2`)보다 위에 둔다.
- `Card`는 자식에 배경이 없어 같은 문제가 없다 → **그대로 둔다.**

> 규칙 보강: `outline` + 음수 offset 위에 **full-bleed 배경 자손이 오면 오버레이로 전환**할 것.

### ③ GNB 여백을 레퍼런스 CSS와 전수 대조

`container.BuDZObdr.css`의 `.gnb_*` 규칙 전부를 추출해 구현과 1:1 대조했다. 결과는 일치.

| 레퍼런스 규칙                     | 값                                          | 구현   |
| --------------------------------- | ------------------------------------------- | ------ |
| `.gnb_wrapper`                    | gap 24 · padding 16/12 · width 224          | ✅     |
| `.gnb_header` + `.gnb_headerLogo` | height 28 · pl 8 · mb 16                    | ✅     |
| `.gnb_itemWrapper` (섹션 ul)      | gap 4                                       | ✅     |
| `.gnb_itemHeader` (섹션 라벨)     | height 28 · padding-inline 8/2              | ✅     |
| `.gnb_itemBase`                   | padding 4/8 · radius small → 높이 32        | ✅     |
| `.gnb_item_small` (depth2)        | padding-inline 36/12 · padding-block 2 → 28 | ✅     |
| `.gnb_itemSubWrapper`             | gap 4 · pt 4 · pb 16                        | ✅     |
| `.gnb_itemDivider`                | 축소 전용 · margin 4/24                     | ✅     |
| `.gnb_commonMenuHeader`           | padding-block 2 · min-height 32             | 수정함 |

**어긋났던 곳은 사이트 선택기 하나.** `.gnb_itemBase`와 합성되는 요소라
`padding-inline: 8` · `radius: small` · hover가 있어야 하는데 빠져 있었다.
`px-2`가 없어 아래 메뉴 아이콘(역시 `px-2`)과 **좌측 정렬이 어긋나던 상태**였다.

> **레퍼런스에는 섹션 사이 여백 규칙이 아예 없다.** 섹션 구분은 오직 28px 라벨 행이 담당하고,
> 축소 모드에서만 그 자리를 1px 구분선(`margin: 4 0 24`)이 대신한다.
> 지금 밀도가 원본 그대로이며, 더 띄우려면 원본 이탈이 된다.

### ④ 섹션 사이 여백 16 — 원본 이탈을 명시적으로 선택 (B안)

③에서 "레퍼런스에 섹션 간 여백 규칙이 없다"를 확인한 뒤, 사용자가 **B안(여백 추가)** 을 택했다.

- `<nav>`에 `flex flex-col gap-4`(16) — 섹션 사이에만 걸리므로 첫 섹션 앞에는 붙지 않는다.
- **축소 모드는 `@max-[60px]:gap-0`으로 되돌린다.** 축소 시엔 라벨이 사라지고 구분선이
  자기 여백(`margin: 4 0 24`)을 갖는데, 여기에 16을 더하면 이중 여백이 되어 원본과 어긋난다.
- 오버라이드 성립 근거: 빌드 CSS에서 `.gap-4`(23073) < `@max-[60px]:gap-0`(56343) — 컨테이너
  쿼리 규칙이 뒤에 온다. 명시도가 같으므로 순서가 승자를 정한다. `pl-2 @max-[60px]:pl-0`과 같은 패턴.
- `DESIGN.md` §23-3에 `[확장]` 표시로 기록. Gnb 테스트에 잠금.

> 이제 GNB에서 원본과 다른 곳은 **이 한 줄뿐이다.** 브랜드 교체·재이식 시 되돌릴 지점이 명확하다.

### ⑤ 축소 GNB 좌측 기준선·여백 통일 `[확장]`

축소(60px) 상태에서 로고만 왼쪽으로 튀고 로고 아래 여백만 유독 넓었다.

- **좌측**: 원본은 축소 시 `padding-inline-start: 0`으로 되돌린다. 그건 원본 축소 심볼이
  36×36(`.gnb_headerLogoPartnerSmall`)이라 content box(60−12×2=36)를 꽉 채워 저절로
  가운데 오기 때문이다. 우리 심볼은 그보다 작아 그대로 두면 아이콘 열(`px-2` → x=20)보다
  8px 왼쪽으로 튄다. → `@max-[60px]:pl-0`을 **제거**해 좌측 기준선을 아이콘과 공유한다.
- **세로**: `margin-block-end: 16`을 축소 시 지운다(`@max-[60px]:mb-0`). 남기면 로고 아래만
  16+24=40이 되어 나머지 블록 간격(24)과 어긋난다.
- 사이트 선택기의 텍스트·chevron이 60px 밖으로 삐져나오고 있었다 → `@max-[60px]:hidden`.
  남는 20px 배지가 아이콘 열과 정확히 같은 자리(x=20~40)에 선다.

### ⑥ GNB 접기 토글 위치 — `PageHeader.leading` 신설

토글이 `actions`에 있어 '내보내기·주문 등록' 업무 액션과 한 덩어리로 읽혔고,
조작 대상(좌측 GNB)과 화면 반대편에 있었다.

- **레퍼런스에는 데스크톱 접기 버튼 CSS가 없다.** `.gnb_closeButton`은 모바일 드로어 닫기,
  `.gnb_headerCollapseContainer`는 축소용 **로고** 컨테이너다. 즉 이 배치는 근거가 없는
  우리 판단이었다 — `Gnb`의 "원본에서도 토글은 PageHeader 쪽에 있다"는 주석은 **오기**였다.
- `PageHeader`에 `leading` 슬롯을 추가했다(뒤로가기 버튼보다도 앞). **화면 골격을 조작하는
  컨트롤 자리**이며, 업무 액션과 분리한다는 계약을 prop 문서에 박아뒀다.
- 아이콘도 상태를 반영하게 바꿨다: `PanelLeftClose` ↔ `PanelLeftOpen` (기존엔 `ChevronsLeft` 고정).

### ⑦ 축소 구분선 대칭 · 토글을 GNB 하단으로 (⑥ 재조정)

**구분선** — 원본은 `margin: 4 0 24`(라벨 행 28을 그대로 대체하려는 계산)인데,
아이템이 32 높이에 아이콘 20이라 상하 6씩 자체 여백을 갖는다. 그래서 **눈에 보이는
간격이 위 10 / 아래 30**이 되어 선이 위 그룹에 붙고 아래 아이콘만 밀려 보였다.
→ `my-3`(12/12)로 대칭. 시각 간격 18/18. `[확장]`

**토글 위치** — ⑥에서 `PageHeader.leading`에 뒀으나 사용자 지시로 **GNB 하단 내장**으로 바꿨다.

- `onOpenChange`를 넘기면 사이드바 하단에 토글이 자동으로 붙는다. 조작 대상 안에 있어 응집도가 높다.
- 좌측 기준선: 래퍼 `px-3`(12) + `pl-0.5`(2) + IconButton small의 아이콘 인셋(6) = **20**.
  메뉴 아이콘(`px-2` → 12+8=20)과 같은 열. 축소(content box 36)에서도 같은 계산이라 모드가 바뀌어도 안 흔들린다.
- **`PageHeader.leading`은 되돌렸다.** 이 컨트롤 하나 때문에 만든 슬롯이라, 쓰는 데 없이
  남겨두면 "여기에 업무 액션을 넣어도 되나" 하는 오용을 부른다. 필요해지면 다시 추가한다.

**사이트 선택기 제거** — 샘플 콘텐츠라 `App.tsx`에서만 뺐다. `Gnb`의 `header` 슬롯(§23-5)은 그대로 둔다.

---

## Phase 6.5 — 갭 메우기 (2026-08-19)

DESIGN.md 규격 대비 미구현 2종 + 기존 컴포넌트 규격 누락 5건을 채웠다.

| 항목           | 규격                                     | 산출물                                           |
| -------------- | ---------------------------------------- | ------------------------------------------------ |
| Textarea       | §26 `[유추]` (§5 준용 + min-height 별도) | 신규                                             |
| SelectionBar   | §25 실측                                 | 신규                                             |
| 부착형 버튼    | §5-1 실측                                | `InputGroup` · `InputAttachedButton`             |
| 표 세로 구분선 | §7                                       | `Table dividers`                                 |
| 툴팁 닫기 버튼 | §12                                      | `Tooltip closable`                               |
| 검색 결과 없음 | §16                                      | `EmptyState size="search"`                       |
| 개수 셀렉트    | §8                                       | `PaginationSizeSelect` + `Select panelMaxHeight` |

### 함정 ①: `cn()` 무병합이 만든 **보이지 않는** 상태 버그

`Input`의 `disabled` 가 화면에서 전혀 적용되지 않고 있었다.

```
fieldBaseClasses  → "bg-surface" · "outline-1 -outline-offset-1 outline-border"   (무조건)
disabled && ...   → "bg-field-disabled outline-0"                                 (추가)
```

둘 다 소재 클래스라 명시도가 `(0,1,0)`으로 동률 → **스타일시트 순서가 승자**를 정했고,
빌드 CSS에서 `.bg-surface`(27009) > `.bg-field-disabled`(26731), `.outline-1`(39930) >
`.outline-0`(39865)이라 **활성 상태와 똑같이 흰 배경 + 1px 경계선**으로 그려졌다.
`invalid` 도 같은 구조였다.

- **테스트가 못 잡은 이유**: className 문자열만 검사했다(`toContain("outline-1")`).
  런타임 className 에는 두 클래스가 **모두** 들어 있으므로 통과한다.
- **해결**: base 에서 bg/outline 을 빼고 `disabled ? … : …` 완전 배타 분기로 전환(Textarea 와 동일 형태).
  회귀 테스트는 "동시에 나오지 않는다"(`not.toContain`)로 잠갔다.

> **교훈: 상태 스타일은 `toContain` 으로 검증하면 안 된다.** 있어야 할 것이 있는지가 아니라
> **없어야 할 것이 없는지**를 봐야 한다. 문자열 포함 검사는 부분 일치도 통과시킨다 —
> 실제로 `toContain("text-text-secondary")` 가 `text-text-secondary-hover` 에도 걸려
> SelectionBar 색상 변경을 놓쳤다.

### 함정 ②: 내가 틀린 근거를 문서에 박을 뻔했다

§5-1 3면 경계선을 원본대로 inset box-shadow 3개로 넣었는데 빌드 CSS 에서 안 보이길래
"Tailwind 가 이 arbitrary 값을 컴파일하지 않는다"고 결론 내리고 `border` 로 바꾼 뒤
그 근거를 `DESIGN.md` 에 적었다. **틀렸다.**

Tailwind 는 색을 `var(--tw-shadow-color, <색>)` 로 감싸 출력하므로
`inset 0 1px 0 var(--color-border)` 로 검색하면 안 나온다. 실제 출력은
`inset 0 1px 0 var(--tw-shadow-color,var(--color-border))` 다. **검색 문자열이 틀렸을 뿐
규칙은 정상 생성되고 있었다.** 원본 방식(inset box-shadow 3개)으로 되돌리고 문서를 정정했다.

> **교훈: "CSS 가 생성되지 않았다"고 결론 내리기 전에 Tailwind 의 실제 출력 형태를 확인할 것.**
> 이 오진 때문에 §24 PageHeader 하단선까지 깨진 줄 알고 한참 헤맸다(멀쩡했다).

### 원본 해석 ③: §25 버튼 글자색

원본은 아이콘만 `icon-on`(흰색) ↔ `icon-secondary-hover`(어두움)로 뒤집고 글자색은
`text-secondary`(어두움) 그대로다. 모순이 아니라 **원본 버튼이 아이콘 전용**이라
그 색이 화면에 드러나지 않기 때문이다(`width: fit-content` + svg 전용 규칙만 존재).
텍스트 라벨을 쓰는 우리는 라벨에도 같은 반전을 적용했다. §25 표에 `[확장]`으로 명시.

### 규격 모호성 해소: §5-1 "40 × 56"

높이·폭 중 무엇인지 모호해 원본 `.sjcokig` 로 재확인 — **height 40 × width 56**,
필드 **우측** 부착. 타이포도 14/20/600 이라 `label-medium-bold`(행간 24)가 아니라
**`body-medium-bold`**(행간 20)가 맞다.

### 문서 드리프트 정정

타이포 프리셋을 **25종**이라고 7곳에 적어놨으나 원본 Clay·우리 구현 모두 **24종**이고
이름까지 1:1 일치한다(교차 대조 완료). 전부 24종으로 통일했다.

### 검증

typecheck · lint · **625 테스트** · build · build-storybook 전부 통과.

---

## 미결 2건 해소 (2026-08-19 · 두 번째 세션)

Phase 6.5에서 발견해 **사용자 답변을 기다리던 2건**을 승인받아 처리했다. 이제 미결은 없다.

### ① Tailwind 스캔 범위 제한 — A안 채택

자동 소스 탐지에 확장자 제한이 없어 `.md` 문서까지 소스로 읽었고, 그 결과
**"이렇게 쓰지 마라"고 적어 둔 예시가 실제 CSS 규칙으로 컴파일**되고 있었다.
`src/styles/tokens.css`를 `source(none)` + `@source` 3줄(`src/` · `index.html` · `.storybook`)로 바꿨다.

**A안은 누락 시 클래스가 통째로 사라지므로 빌드 CSS 전후 대조가 필수 조건이었다.**

| 항목          | Before  | After   |
| ------------- | ------- | ------- |
| CSS 크기      | 63.8 kB | 58.0 kB |
| 클래스 셀렉터 | 653     | 581     |
| 신규 생성     | —       | **0개** |

사라진 72개가 전부 문서발임을 확인했고(아래 함정 참고), 목표물은 실측으로 소거됐다 —
`.bg-[#22c55e]` · `.p-[15px]` · `.text-[15px]` · `.gap-[10px]` 모두 dist·Storybook 양쪽 **0건**,
하드코딩 색 arbitrary 클래스 잔존 **0건**.

**Storybook 경로 해석 검증**: `@source`는 CSS 파일 기준 상대 경로라 빌드 컨텍스트가 다른
Storybook에서 어긋날 수 있다는 게 유일한 위험이었다. 셀렉터 집합을 dist와 양방향 diff한 결과
**563 = 563, 차집합 0/0**으로 완전히 동일했다. 위험 없음이 증명됐다.

### ② DatePicker disabled 버그 — Input과 같은 사고

`triggerBaseClasses`가 `bg-surface`·`outline-1 -outline-offset-1 outline-border`를 무조건 방출하고
disabled에서 `bg-field-disabled outline-0`을 덧붙여, 명시도 (0,1,0) 동률로 **스타일시트 순서에 져서
비활성 트리거가 활성과 똑같이 렌더**되고 있었다. `triggerDisabledClasses` / `triggerEnabledClasses`
완전 배타 분기로 전환하고 `not.toContain` 회귀 테스트 2개로 잠갔다.

- **텍스트·아이콘 색은 원래 정상이었다** (`tone()` · `text-icon-disabled`가 이미 분기 처리).
  살아남은 건 `cursor-not-allowed` 하나뿐이라 **"커서만 바뀌고 모양은 그대로"** 인 상태였다.

### 함정: 클래스 사용 여부를 **부분 문자열**로 판정하면 안 된다

제거된 72개를 단순 문자열 포함으로 훑었더니 **19개가 "소스에서 사용 중"으로 잡혔다.
클래스 경계(`(?<![\w-])X(?![\w-])`)를 강제하니 6개로 줄었고, 그마저 전부 오탐이었다.**

```
ring            ← "string" 에 걸림 (52개 파일 전체 오탐)
rounded         ← "rounded-medium"          heading-medium ← "heading-medium-bold"
left-1          ← "left-1/2"                opacity-75     ← "hover:opacity-75"
underline       ← Tabs.tsx 주석 산문 "(underline)" — 클래스가 아님
```

경계를 강제하고도 남는 후보는 **"실사용 형태(variant·소수점 포함)가 빌드 CSS에 살아 있는가"** 로
한 번 더 걸러야 한다. Phase 6.5의 "상태 스타일 테스트에 `toContain`을 쓰지 말라"와 **같은 뿌리**다.

### 게이트에서 함께 드러난 것 (미처리 · 이번 변경과 무관)

1. **`.h-[400px]` 죽은 규칙 1개가 아직 생성된다.** 출처는 `EmptyState.tsx:49`의 JSDoc 주석
   "임의값(`h-[400px]`)이 필요 없다". ①이 잡은 것과 **완전히 같은 유형**(문서용 반례가 CSS로 컴파일)이지만
   `.md`가 아니라 `.tsx` 주석이라 `@source "../"` 범위 안에 남는다. 색상이 아니고 1개뿐이다.
2. **`SegmentedControl.tsx:87-88`의 `min-w-[54px]` · `min-w-[60px]`** — CLAUDE.md의 "임의값 금지"에
   걸리는 **기존 코드**다. 공교롭게 위 EmptyState 주석이 해법을 적어두고 있다 (v4 소수 배수 → `min-w-13.5` · `min-w-15`).
3. `Gnb.stories.tsx:120`의 `w-[114px]` — 스토리 전용 임의 폭.

### 검증

typecheck · lint · **627 테스트**(+2) · build · build-storybook · Storybook CSS 실물 대조 —
`@agent-design-qa` 8항목 **PASS 8 / FAIL 0**.

---

## Phase 7a — 차트 토큰 (2026-08-19)

`tokens/primitive/chart-palette.json`(50) + `tokens/semantic/chart.json`(10) 신설. **총 60토큰 추가**
(`_generated.css` 353개). Clay 토큰 정본에 차트 색이 **0건**이고 원본은 Chart.js가 로드만 돼 있어
(`new Chart(` 호출·`<canvas>` 0건) **시각 언어의 선례가 없다** — 우리가 설계로 채운 영역이다.

### 계열 단계를 500이 아니라 800/600으로 정한 이유 → ⚠️ **아래 Phase 7b 에서 뒤집힘**

> 이 조합(skyblue-800 …)은 **명암비만 보고 고른 것이라 색 구분성 검증에서 FAIL 했다.**
> 아래 "Phase 7b — 팔레트 재선정"이 최종이다. 이 절은 경위를 남기기 위해 보존한다.

원본 팔레트의 대표 단계는 500이지만, **흰 배경에서 WCAG 1.4.11(비텍스트 3:1)을 통과하지 못한다.**
차트의 선·막대는 "정보 전달에 필수적인 그래픽 객체"라 이 기준의 대상이다.

| 계열      | 500  | 600      | 700  | 800      | 채택 |
| --------- | ---- | -------- | ---- | -------- | ---- |
| skyblue   | 1.96 | 3.04     | 3.88 | **5.44** | 800  |
| mint      | 1.80 | 2.50     | 3.62 | **5.48** | 800  |
| mango     | 1.93 | 2.40     | 2.76 | **4.98** | 800  |
| grape     | 4.35 | **5.68** | 6.86 | 8.29     | 600  |
| raspberry | 3.08 | **4.53** | 5.70 | 7.59     | 600  |

전 계열이 3:1을 넘는 최소 단계는 **800뿐**이지만(mango가 노랑이라 가장 늦게 통과), 그러면 grape·raspberry가
과하게 어두워진다. **명암비를 4.98~5.68 한 구간에 모아** 다섯 색의 무게감을 고르게 맞추는 조합을 택했다.
area fill 은 같은 계열 `100` — 원본에 이미 10단계가 다 있어 새 값을 발명하지 않았다.

### 정정: "area fill 은 기존 tint 재사용" 은 틀린 전제였다

`vars.css` 의 `*-tint-5/10/15/20` 은 **Clay 시맨틱 색**(성공·경고·위험)용이고
**차트 팔레트 5계열에는 대응하는 tint 가 아예 없다.** 이름이 비슷해 보여 같은 것으로 착각했으나 값이 다르다.

```
mint-500 #00dba3  ≠  neonGreen #00e600      raspberry-500 #fe5868  ≠  coralRed #ff4040
skyblue-500 #85bdff ≠ blue #00b9ff          grape-500 #9a4bff      ≠  neonPurple #cd28fd
```

### 이 팔레트는 명도로 계열을 구분할 수 없다

같은 단계 안에서 **계열끼리의 명암비가 전 단계에서 1.00~1.07**이다. 색상(hue)으로만 구분되게 설계돼 있어
**흑백 인쇄·전색맹 사용자에게는 5계열이 한 덩어리로 보인다.** 토큰으로는 해결되지 않는 문제이므로,
7b 에서 **색 외의 구분 수단**(직접 레이블 · 마커 모양 · 대시 패턴)을 반드시 함께 설계해야 한다.

### 관찰: semantic 만 트리쉐이킹되고 참조 대상은 남는다

빌드 후 배포 CSS 를 확인하니 `--color-chart-*` 는 **0건**인데
그것이 참조하던 primitive **10개는 그대로 들어갔다**(`--color-skyblue-800` 등).

```
--color-chart-series-1: var(--color-skyblue-800);   ← 사용처 없어 제거됨
--color-skyblue-800: #4c6c91;                       ← 남음 (아무도 참조하지 않는 고아 변수)
```

7a 만 끝낸 중간 상태의 부작용이라 **7b 에서 컴포넌트가 `var(--color-chart-series-N)` 을 쓰면 해소된다.**
→ **7b 완료 후 배포 CSS 에 `--color-chart-*` 가 실제로 나오는지 반드시 재확인할 것.**

### 검증

`build:tokens` · typecheck · lint · **627 테스트** · build 통과. semantic→primitive `var()` 참조 링크 유지 확인.

---

## Phase 7b — 차트 컴포넌트 + 팔레트 재선정 (2026-08-19)

### 팔레트가 뒤집힌 경위 — 명암비를 맞췄더니 색 구분성이 죽었다

7a 에서 확정한 조합을 색각이상 검증기에 넣자 **FAIL** 이 나왔다.

```
[FAIL] Chroma floor    #4c6c91(skyblue-800) 채도 0.07 — 회색으로 읽힘
[FAIL] Normal-vision   #00785a ↔ #4c6c91 ΔE 12.0 (기준 15) — 정상 시각으로도 구분 난이
[WARN] CVD separation  #99650a ↔ #00785a ΔE 7.7 (protan)
```

원인은 명확하다. **3:1 명암비를 맞추려고 800 단계까지 어둡게 내리니 색들이 다 탁해져 서로 닮아버렸다.**
7a 에서 "계열 간 명암비가 1.00~1.07 이라 명도로 구분되지 않는다"고 관찰까지 해놓고도,
그것이 **색상(hue) 구분마저 위태롭게 한다는 데까지는 이르지 못했다.**

### 전수 탐색으로 다시 골랐다

5계열 × 10단계 = 10만 조합에 **계열 순서 순열(120)까지** 얹어 검증기를 돌렸다.
결과는 단호했다 — **skyblue 램프는 어느 단계도 쓸 수 없다.**

| 램프        | 쓸 수 있는 단계    | 비고                                      |
| ----------- | ------------------ | ----------------------------------------- |
| **skyblue** | **없음**           | 밝은 쪽 명암비 미달 · 어두운 쪽 채도 붕괴 |
| **slate**   | **없음**           | 무채색이라 채도 하한 미달                 |
| mint        | 700, 800           |                                           |
| mango       | **800 하나뿐**     | 노랑이라 명암비 확보가 가장 늦다          |
| grape       | 500, 600, 700, 800 |                                           |
| raspberry   | 500, 600, 700, 800 |                                           |
| blue (기존) | 600, 700, 800      | `vars.css` primitive — 대안으로 투입      |

skyblue 를 포함하면 통과 조합이 **0개**다. 사용자 승인을 받아 **blue 로 교체**했다(전 PASS 4,110개).
최종 순서는 파랑→초록→노랑→보라→빨강.

```
blue-600 → mint-700 → mango-800 → grape-500 → raspberry-500
[PASS] 밝기밴드 · 채도 · CVD ΔE 10.3 · 정상시각 ΔE 16.1 · 명암비 전부 3:1↑  → ALL CHECKS PASS
```

- **순서가 곧 검증 대상이다.** 인접 쌍만 판정하므로 같은 5색이라도 배열 순서가 바뀌면 결과가 달라진다.
  순서를 손보면 반드시 재검증할 것.
- `chart-palette.json` 에서 **skyblue 10토큰을 삭제**했다. 검증으로 사용 불가가 증명된 램프를
  primitive 에 남겨두면 다음 사람이 또 집어 든다.
- **남은 약점: tritan(청황) 분리도 4.0.** 검증기 주 판정(protan/deutan)은 통과하지만 낮다.
  그래서 범례·직접 레이블·퍼센트 목록이 **선택이 아니라 판독의 전제**다. §28-4 에 못박았다.

> **교훈: 접근성 지표는 하나만 맞추면 다른 하나가 깨진다.** 명암비(배경 대비)와
> 색 분리도(계열 간)는 **서로 반대 방향으로 당긴다** — 어둡게 할수록 전자는 좋아지고 후자는 나빠진다.
> 눈으로 고르지 말고 **두 지표를 동시에 만족하는 조합을 탐색**할 것.

### 7a 관찰의 해소

7a 에서 "`--color-chart-*` 가 배포 CSS 에 0건"이라고 남긴 항목은 **해소됐다.**
컴포넌트가 색을 쓰자 10개 전부 출력된다. 단 조건이 있다.

```
✅  CHART_SERIES_COLORS[i]            // 완전 문자열 배열 → 스캔됨
❌  `var(--color-chart-series-${i})`  // 조립 → 스캔 실패 → 배포 CSS 에서 변수 소멸
```

**대시보드를 짜다가 내가 이 함정에 그대로 빠졌다**(도넛 범례에서 인덱스로 조립). Chart.tsx 주석에
직접 경고를 써놓고도 어겼다. 배열 상수 참조로 고쳤고 §28-1 에 명시했다.

### 함정: jsdom 에서 Recharts 3 을 렌더하려면 **두 가지**가 필요하다

`ResponsiveContainer` 는 `width="100%"` 일 때 정적 크기 경로가 실패해 `SizeDetectorContainer` 로 떨어진다.

1. **`ResizeObserver` 전역 존재** — 없으면 크기가 `{-1,-1}` 로 남아 컨테이너가 **`null` 을 반환**한다(차트 자체가 사라짐). no-op 스텁이면 충분하고 콜백이 실제로 불릴 필요는 없다.
2. **`getBoundingClientRect()` 가 양수 반환** — 옵저버 콜백을 기다리지 않고 **동기적으로** 읽어 초기 크기를 잡는다. jsdom 은 전부 0을 주므로 고정 rect 로 스텁해야 한다.

`offsetWidth`/`offsetHeight` 는 recharts 3 이 쓰지 않는다.

**검증하지 말아야 할 것**: 경로 `d`·좌표(jsdom 크기 0) · **축 눈금 텍스트**(실제 텍스트 폭 측정으로
겹침을 솎아내는데 jsdom 에서 측정값이 0이라 축마다 마지막 눈금 하나만 살아남는다) ·
**막대 fill**(애니메이션이 끝나지 않아 내부 도형 자체가 없다).

---

## Phase 8 — 대시보드 (통계형) 조립 (2026-08-19)

Phase 8 페이지 4종 중 **근거가 0인 4번(대시보드)** 을 먼저 만들었다. 원본 `admin.html` 은
게스트 리다이렉트 페이지라 마크업이 없고 Clay CSS 에도 통계 화면 선례가 없다 — **재현이 아니라 설계다.**

**구성**: KPI 4장(매출·주문·방문자·전환율) → 매출 추이(2계열 라인) + 유입 채널(도넛, 가운데 합계)
→ 카테고리별 매출(막대) + 인기 상품 Top 5(표)

### 결정

- **CSS Grid 사용 `[확장]`** — 승인된 방향대로. Clay 원본 7,835줄에 `display:grid` 는 1건(달력 캡션)뿐이지만,
  KPI 4열·차트 2:1 배치를 flex 로 짜면 자식마다 폭 계산을 떠안아야 한다. 통계형 화면에 한해 쓴다.
- **`src/pages/` 신설 + GNB 구성 추출** — 대시보드와 주문 목록이 같은 사이드바를 써야 하는데
  `App.tsx` 안에 두면 `App → 페이지 → App` **순환 참조**가 된다. `pages/gnbSections.tsx` 로 뺐다.
- **사이드바 상태를 `App` 이 소유** — 페이지가 각자 `useState` 를 가지면 화면 전환마다 접힘 상태가 초기화된다.
  페이지는 props 로 받는다.
- **라우터를 들이지 않았다** — 이 저장소는 디자인 시스템 데모라 URL·딥링크·뒤로가기가 필요 없고,
  react-router 를 넣으면 **가져다 쓰는 쪽에 라우터 선택을 강요**하게 된다. 이식 시 `useState` 를 갈아끼우면 된다.
- **초기 화면을 대시보드로** 바꿔 `App.test.tsx` 를 갱신했다(2 → 4 테스트: 대시보드 렌더 · KPI · 차트 aria-label · GNB 전환).
- **매출 데이터를 만원 단위로 저장** — `LineChart` 의 `format` 하나가 축과 툴팁에 함께 쓰이므로,
  데이터 단위를 미리 맞춰야 둘의 표기가 어긋나지 않는다.

---

## Phase 8-2 — 상품 등록 (폼형) (2026-08-19)

### 문서에 사실 오류가 있었다 — 전수 재조사로 정정

`HANDOFF.md`에 **"폼은 세로 라벨 단일 규격 · 가로 라벨은 Clay에 존재하지 않으므로 도입 금지"**
라고 적혀 있었으나 **거짓이었다.** 원본 CSS를 전수 조사한 결과:

- `cardBodyItem_row`(가로)는 `_column`(세로)과 **같은 파일·같은 해시 그룹의 동급 변형**이다.
- 심지어 `@media (max-width:991px) { flex-wrap: wrap }` 전용 규칙을 갖는데,
  이건 그 파일의 **유일한 미디어쿼리**다 — 폼 규칙 중 **유일하게 반응형 처리를 받는 것이 가로 배치**다.
- 가로 사례 3종 추가 확인: `switchWrapper`(space-between) · `cardLabelOptionItem` · `infoLabel`(width 80 고정).

**필드 20 · 카드 24 도 조건이 빠져 있었다** — 둘 다 **PC 한정**이고 모바일은 각각 **24 · 8**로 뒤집힌다.
좁은 화면에서는 카드가 붙고 필드가 벌어지는 리듬이다.

> **교훈: "원본에 없다"는 주장은 "있다"는 주장보다 검증이 어렵다.** 없다고 단정하면 그 뒤로
> 아무도 다시 찾아보지 않기 때문에 오류가 그대로 굳는다. **금지 규칙을 문서에 박을 때는
> 근거 클래스명을 함께 남길 것.** 이번에 정정한 것도 근거를 §29에 전부 붙여뒀다.

### `FormField` 신설

`Input`·`Textarea`·`Select` 는 라벨·도움말·에러를 담을 곳이 **없었다**(`invalid` 만 있음).
필드가 15개 넘는 폼에서 매번 손으로 조립하면 간격이 흔들리므로 래퍼를 만들었다.

- **단일 자식이면 `cloneElement` 로 `id`·`aria-describedby`·`aria-required`·`invalid` 를 자동 주입**한다.
  이미 지정한 값은 존중한다. 사용처가 id 를 손으로 잇지 않아도 `getByLabelText` 로 찾힌다(테스트로 잠금).
- **`Switch`·`Checkbox`·`Radio` 는 `FormField` 로 감싸지 않는다** — 이들의 **루트가 이미 `<label>`** 이라
  라벨이 중첩되고, 자체 `label`·`description` prop 을 갖는다. FormField 는 Input 계열 전용이다.
- 부연설명은 `<label>` **바깥**에 둔다. 안에 넣으면 접근성 이름에 섞인다(§29-7 · Switch 에서 겪은 것과 같은 함정).

### 간격을 페이지가 지정하지 않는다

실측값이 이미 컨테이너에 들어 있음을 확인했다.

| 실측        | 이미 주는 곳              |
| ----------- | ------------------------- |
| 카드 간 24  | `AppShell` 의 `gap-6`     |
| 필드 간 20  | **`CardBody` 의 `gap-5`** |
| 라벨↔입력 6 | `FormField` 의 `gap-1.5`  |

즉 `ProductFormPage` 는 **간격 클래스를 하나도 쓰지 않는다.** 컨테이너가 규격을 책임진다.
(`CardBody` 가 `gap-5` 인 것은 Phase 4 때 정한 값인데, 이번 실측과 우연히 정확히 일치했다.)

### 2열 grid 를 만들지 않은 이유

원본에 폼 2열 규칙이 **없다** — `grid-template-columns` 는 전체에서 1건(달력 캡션)이고
`width:50%`·`flex-basis`·`calc(50%` 는 **0건**이다. 대신 원본은 **한 필드 안에서 컨트롤을 병치**한다
(`dateWrapper` + `dateItem { flex:1; min-width:0 }`). 판매가·할인가를 이 패턴으로 나란히 뒀다.

> 대시보드에서는 grid 를 썼지만(KPI 4열은 flex 로 짜면 자식마다 폭 계산을 떠안는다),
> 폼은 **원본 패턴이 있으므로** 그것을 따른다. 근거가 있으면 근거를 우선한다.

### 설계로 채운 것 `[확장]`

| 항목        | 결정                                | 근거 상태                                     |
| ----------- | ----------------------------------- | --------------------------------------------- |
| 필수 표시   | 라벨 뒤 `*` · `text-critical`       | 원본 CSS **전무** (`content:"*"` 0건)         |
| 에러 메시지 | **도움말과 같은 자리에서 교체**     | 색만 원본에 있음(`#ed1515`), 위치·타이포 없음 |
| 라벨 타이포 | `label-medium-bold` (14/24/**600**) | ⚠️ 정황 근거는 **400** — 아래                 |

**라벨 타이포는 정황 근거에서 의도적으로 이탈했다.** 저장본에 brand-admin 렌더 HTML 이 없어
CSS 만으로 판정이 불가능한데, Clay 입력 컨트롤이 정확히 `label-medium`(14/24/400)이라 라벨도 400일
가능성이 높다. 그러나 그러면 라벨과 입력값의 무게가 같아져 긴 폼에서 라벨이 색인 역할을 못 한다.
**스캔성을 위해 600을 택했고, 원본 렌더 HTML 을 확보하면 재검토한다.**

### 기록하되 적용하지 않은 실측

`.style_form { padding-bottom: 200px }` — **하단 고정 저장 바를 전제한 값**이다.
저장 액션을 PageHeader 에 두는 우리 구조에서는 빈 공간만 생긴다. §29-6 에 사유와 함께 남겼다.

### 게이트가 잡아낸 접근성 결함 1건 (2026-08-19)

게이트 8항목은 PASS 였으나, **게이트 밖 실측 검사**에서 결함이 나왔다.

`FormField` 가 `SegmentedControl`(판매 상태)·`RadioGroup`(배송비 유형)을 자식으로 받은 두 곳에서
**그룹에 접근가능 이름이 아예 없었다.** `<label for>` 는 **labelable 요소**(input·textarea·select·button)만
가리킬 수 있는데 이들의 루트는 `<div role="radiogroup">` 이라 연결이 성립하지 않는다.
스크린리더는 "라디오 그룹"으로만 읽고 라벨 클릭 시 포커스 이동도 없다 (WCAG 1.3.1 · 4.1.2).

- **해결**: `FormField` 에 `group` prop 신설 — 라벨을 `<span id>` 로 렌더하고 `aria-labelledby` 로 잇는다.
- 회귀 테스트 4개로 잠갔다. 그중 하나는 **`group` 을 빠뜨렸을 때 이름이 없다는 사실 자체를 고정**한다.

> **교훈: 이 결함은 화면에 전혀 드러나지 않는다.** 라벨이 멀쩡히 보이기 때문이다.
> `getByRole("radiogroup", { name })` 이 못 찾는 것으로만 확인된다.
> **정적 검사(grep)로도 안 잡힌다** — 실제로 렌더해서 접근성 트리를 봐야 한다.

### 함께 정정한 내 오판 2건

1. **"Switch·Checkbox 를 FormField 로 감싸면 라벨이 중첩된다"** → **틀렸다.**
   `FormField` 는 라벨 블록과 컨트롤을 별도 `<div>` 에 렌더하므로 두 `<label>` 은 **형제**다.
   실측 `querySelectorAll("label label").length === 0`. 감싸도 되며, 그때는 자체 `label` 을 비우면 된다.
   (감싸지 않는 이유는 "중첩"이 아니라 **역할이 겹쳐서**다.)
2. **`labelDescription` 이 `aria-describedby` 에 연결되지 않고 있었다.**
   이름 오염을 피하려다 **설명으로도 전달되지 않는** 상태였다 — 화면에는 보이는데 스크린리더에는
   존재하지 않는 정보였다. `describedby` 에 합류시켰다(이름은 여전히 라벨뿐임을 테스트로 확인).

> **교훈: `<label>` 밖으로 빼는 것과 `aria-describedby` 로 잇는 것은 별개의 작업이다.**
> 전자만 하면 "이름은 안 더럽혔지만 아무에게도 안 읽히는" 텍스트가 된다.

---

## Phase 8-3 — 주문 상세 (상세형) (2026-08-19)

### 실측이 문서보다 컸다 — `infoList` 는 회색 박스였다

문서에는 **"`infoList`(라벨 80px 고정)만 근거 있음"** 이라고만 적혀 있었는데,
원문(`client-provider.hjDLpAAS.css:928-950`)을 열어 보니 규격이 셋이었다.

```
.style_infoList  { flex-direction:column; padding:16; gap:8;
                   background: surface-sub; border-radius: medium }   ← 배경·패딩·radius
.style_infoItem  { display:flex; align-items:center; gap:10 }         ← 라벨↔값 10
.style_infoLabel { width:80px; flex-shrink:0 }                        ← 문서에 있던 유일한 항목
```

**그 결과 기존 구현이 실측과 어긋나 있었다.** `App.tsx` 의 주문상세 SideSheet 는
gap 16/16 · `items-start` · 배경 없음이었다 — 맞은 건 라벨 폭 80 하나뿐.

| 항목        | 기존 구현     | 실측                              |
| ----------- | ------------- | --------------------------------- |
| 항목 간 gap | `gap-4`(16)   | **8**                             |
| 라벨↔값 gap | `gap-4`(16)   | **10** (`--clay-space-25`)        |
| 정렬        | `items-start` | **`items-center`**                |
| 배경·패딩   | 없음          | **`surface-sub` + 16 + radius 8** |

> **교훈: "근거 있음"이라고 적힌 항목도 원문을 다시 열어볼 가치가 있다.**
> 요약이 문서에 옮겨질 때 **가장 눈에 띄는 한 줄만 살아남는다**(여기서는 "라벨 80px").
> 이번에 §29 의 "가로 라벨 없음"이 거짓이었던 것과 같은 종류의 손실이다.

### `InfoList` 신설 + 기존 구현 정정

- `InfoList` / `InfoItem` 신설(`<dl>`/`<dt>`/`<dd>` 시맨틱). 라벨 폭은 실측 80 고정이고,
  넘칠 때만 `labelWidth` 로 덮는다 — **기본값일 때만 `w-20` 을 방출**하고 커스텀이면 인라인 style 만 쓴다
  (`cn()` 무병합 때문에 같은 속성을 두 곳에서 내보내면 순서가 승자를 정한다).
- `App.tsx` 의 SideSheet 상세도 **같이 정정**했다. 같은 패턴이 두 곳에 다른 수치로 남아 있으면
  다음 사람이 어느 쪽을 따라야 할지 알 수 없다.

### 페이지 레이아웃은 1열 스택 `[확장]`

**원본에 상세 페이지 레이아웃 근거가 없다.** 2컬럼(주 2 : 보조 1)이 관리자 화면의 흔한 관행이지만,
Clay 원본이 전부 flex column 이고 **폼에서 2열 grid 를 도입하지 않기로 한 결정(§29-4)과의 일관성**을
택해 1열로 갔다. 대시보드에서 grid 를 쓴 것은 KPI 4열이라 불가피했던 경우다.

### 금액 내역은 `InfoList` 로 만들지 않았다

결제 금액 나열은 라벨-값 대응이 아니라 **좌우 대비(숫자를 세로로 비교)** 가 목적이라
`justify-between` 목록으로 따로 짰다. §7 의 "표 셀은 좌측 정렬"은 **표**에 대한 규칙이라
여기 적용되지 않는다. §30-5 에 명시.

### 진입 경로

GNB 에 "주문 상세" 메뉴를 만들지 않았다 — 정보구조상 어색하다.
**주문 목록 행 → SideSheet(빠른 미리보기) → "전체 상세 보기" → 상세 페이지** 로 이었다.
통합 테스트로 이 경로 전체를 잠갔다.

---

## Phase 8-1 — 주문 목록 템플릿 승격 (2026-08-19) · **Phase 8 완료**

`App.tsx` 안에 있던 `OrderPage` 를 `src/pages/OrderListPage.tsx` 로 옮겨
네 화면이 모두 같은 구조(`{navOpen, onNavOpenChange, activeNav, onNavSelect}` props)를 갖게 했다.

**`App.tsx` 533줄 → 47줄.** 이제 진입점은 **전역 Provider 와 화면 분기만** 책임진다.

- 새 설계 결정 없음. 순수 이동이라 **테스트 715개 그대로**(개수 변화 0)가 이동이 무손실이었음을 보인다.
- 이 화면이 네 개 중 **근거가 가장 강하다** — §7-1 테이블 셸 구조가 여기서 확정돼 `DataTableShell` 로
  추출됐고, 셀 좌측 정렬·colgroup 비율 배분도 이 화면에서 정해졌다.

### 남은 중복 (미처리) → **Phase 11 에서 "의도된 중복"으로 재해석**

`won()`(원화 포맷)이 3곳에 같은 코드로 있다. 당시엔 `src/lib/format.ts` 추출 후보로 봤으나,
템플릿화 이후 **각 `*.data.ts` 로 이동하면서 중복을 유지하기로 했다.**

**금액 단위는 도메인이다** — 물류는 kg, 교육은 시간, 정산은 원. 공용 파일로 빼면 서비스를 바꿀 때
뼈대를 고쳐야 하고, 그건 "도메인은 `.data.ts` 에만"이라는 계약을 깨뜨린다.

> **교훈: DRY 는 목적이 아니라 수단이다.** 두 곳의 코드가 같아 보여도 **바뀌는 이유가 다르면**
> 합치는 순간 결합이 생긴다. 여기서는 "서비스마다 갈아끼운다"가 상위 목적이라 중복이 옳다.

### 최종 게이트가 잡아낸 결함 2건 (2026-08-19)

8항목 게이트는 PASS 였으나 **릴리즈 관점 검토**에서 둘이 나왔다. 둘 다 화면을 바꿔봐야 드러나는 것들이다.

**① GNB 로고가 4화면 중 1곳에만 있었다.** `logo`/`collapsedLogo` 슬롯을 넘기는 페이지가
`OrderListPage` 뿐이라 **주문 목록에서만 로고가 보이고 나머지 3화면은 빈칸**이었다.
→ `gnbSections.tsx` 에 `GNB_LOGO_SLOTS` 를 두고 4페이지가 공유한다. GNB 구성을 공유한 것과 같은 이유다.

> `App.tsx` 가 순수 스위치가 되기 전에는 화면 전환 자체가 없어서 드러나지 않던 결함이다.
> **구조를 정리하면 가려져 있던 불일치가 드러난다.**

**② 주문 상세에서 사이드바 활성 표시가 사라졌다.** `order-detail` 은 GNB 항목 id 가 아니라
`activeId` 매칭이 실패해 **어떤 메뉴도 활성으로 보이지 않았다.**
→ 상세 화면에서는 부모 메뉴(`order-list`)를 활성으로 표시한다. 관리자 화면의 일반적 동작이다.

### 함정: JSX 요소를 그대로 export 하면 컴포넌트로 오인된다

`GNB_LOGO` 를 JSX 상수로 export 했더니 eslint `react-refresh/only-export-components` 가 걸렸다 —
같은 파일의 `GNB_SECTIONS`(비컴포넌트)와 섞였다는 경고다. `GNB_SECTIONS` 는 **배열**이라 그동안 조용했는데,
JSX 요소를 직접 내보내니 규칙이 컴포넌트로 판정했다.
→ **객체 한 겹으로 감쌌다**(`GNB_LOGO_SLOTS`). 배열과 같은 취급을 받는다.
Phase 4 의 "ToastProvider 가 컴포넌트 외 값을 export 하면 HMR 때 상태가 날아간다"와 같은 규칙이다.

---

## Phase 11-A — 페이지 4종 템플릿화 (2026-08-19)

### 왜 하는가 — 프로젝트 목표가 바뀌었다

이 저장소의 최종 목표가 "아임웹 Clay 클론"이 아니라
**기획자에게 폴더째 넘겨 각자 자기 서비스 대시보드를 만들게 하는 것**임이 확인됐다.
그렇다면 페이지는 "복사해서 뜯어고치는 예제"가 아니라 **"도메인만 갈아끼우는 템플릿"** 이어야 한다.

### 한 일

4종 전부 `*.tsx`(뼈대) + `*.data.ts`(도메인)로 갈랐다. **테스트 771개가 그대로 통과** —
데이터를 옮겼는데 하나도 늘거나 줄지 않은 것이 무손실 이동의 증거다.

각 파일 상단에 **구조 계약 주석**을 달았다. 이것이 이 작업의 핵심 산출물이다.

| 위치             | 담는 것                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `*.data.ts` 상단 | "다른 서비스로 바꿀 때" 매핑 표 · **뼈대가 이 파일에 기대하는 계약** |
| `*.tsx` 상단     | 화면 유형 · **갈아끼울 것(위치 포함)** · 그대로 두는 것              |

계약 예시(목록형): `Row` 는 `id`(고유키)와 `date`(`YYYY-MM-DD HH:mm`, 기간 필터가 파싱)를 반드시 갖는다 ·
`STATUS_META` 의 키는 `Row["status"]` 와 일치한다 · `FILTERS[0].value` 는 `"all"` 이다.

> **이 주석이 곧 화면 생성기(Stage 5)가 읽는 지도다.** 없으면 생성기가 매번
> "어디가 도메인이고 어디가 뼈대인지" 재판단해야 하고, 판단이 흔들리면 결과도 흔들린다.

### `won()` 중복은 이제 **의도된 것**이다

Phase 8-1 에서 "`src/lib/format.ts` 추출 후보"로 적었던 것을 **철회했다.**
금액 단위는 도메인이다 — 물류는 kg, 교육은 시간, 정산은 원. 공용 파일로 빼면 서비스를 바꿀 때
**뼈대를 고쳐야** 하고, 그건 "도메인은 `.data.ts` 에만"이라는 계약을 깨뜨린다.

> **교훈: DRY 는 목적이 아니라 수단이다.** 두 곳의 코드가 같아 보여도 **바뀌는 이유가 다르면**
> 합치는 순간 결합이 생긴다.

### 유형별 재사용 강도가 다르다 — 폼형만 예외

| 유형                 | 교체 방식            | 근거                                 |
| -------------------- | -------------------- | ------------------------------------ |
| 목록형·상세형·통계형 | **데이터만 교체**    | 데이터가 `.data.ts` 로 완전히 빠졌다 |
| **폼형**             | **필드를 다시 쓴다** | 아래                                 |

폼형에서 `.data.ts` 로 빠진 것은 **선택지 배열 2개와 포맷터 1개**가 전부다. 남은 이유:

1. **필드마다 컨트롤 종류가 다르다** — Input·Select·SegmentedControl·Textarea·RadioGroup·DatePicker·Switch·Checkbox **8종**. 데이터로 빼려면 "종류 → 컴포넌트" 디스패처, 즉 **폼 DSL** 을 만드는 일이 된다.
2. **필드 상태 8개의 타입이 제각각** (`string` · `boolean` · `DateRange | undefined`) — 배열로 뽑으면 타입이 뭉개진다.
3. **검증이 폼 단위다** — `salePriceError` 는 두 필드의 상호 비교이고, `nameError` 는 `nameTouched` 와 결합돼 있다. 필드 배열에 담기지 않는다.
4. **조건부 노출이 두 군데에 걸친다** — 필드 존재 여부(`shipping !== "free"`)와 도움말 문구(`=== "conditional"`).
5. 컨트롤별 부속 prop(`rightIcon` · `inputMode` · `minRows` · `labelAction`)이 그 필드 전용이다.
6. `FormField` 의 `group` 여부가 컨트롤 종류에 종속된다.

→ **폼형이 재사용하는 것은 데이터가 아니라 레이아웃 규칙이다.** 카드=섹션 · 간격을 컨테이너가 책임짐 ·
`group` 사용법 · 에러가 도움말 대체 · `flex-1 min-w-0`(488px) · Switch/Checkbox 자체 label.
이 한계를 감추지 않고 뼈대·데이터 양쪽 주석에 명시했다.

### 이동 중 발견한 숨은 결합 2건

- **`won` 의 천 단위 구분자는 반드시 쉼표여야 한다.** 뼈대의 할인가 검증이
  `Number(salePrice.replace(/,/g, ""))` 로 되돌리기 때문에, 구분자를 공백·마침표로 바꾸면
  **검증이 조용히 깨진다.** 데이터 파일에 계약으로 명시했다.
- **`TOP_PRODUCTS[].up` 은 죽은 필드다** — 표 JSX 가 그리지 않는다. 지우지 않고
  "현재 뼈대가 그리지 않는다 — 증감 화살표를 표에도 붙일 때 쓰라고 남겨둔 자리"라고 적어
  생성기가 필수 필드로 오해하지 않게 했다.

### 데이터/뼈대 경계에서 갈린 판단

- **`channelTotal`(합계) → 데이터** (`CHANNELS` 만으로 결정되는 순수 집계) ·
  **퍼센트 계산 → 뼈대** ("도넛 옆 범례" 패턴의 일부)
- **`CardHeader` 제목 문자열 → 뼈대에 남김.** 명백히 도메인이지만 JSX 라 옮기면 "JSX 무변경" 제약을 깬다.
  대신 뼈대 주석의 "갈아끼울 것" 표에 **위치를 명시**했다.
- **타입을 새로 달지 않았다** — 대시보드 배열들은 `ChartDatum`(`Record<string, string | number>`)에
  **암묵적 index signature 로 대입**되는 구조라, 인터페이스를 붙이면 그 대입이 깨진다. 계약은 주석으로 적었다.

---

## Phase 11-B — Stage 5(화면 생성) 신설 + 리허설 (2026-08-19)

### 무엇을 만들었나

기획서의 `keyScreens` 를 **실제 React 화면 코드**로 만드는 단계를 파이프라인에 붙였다.
이전까지 파이프라인의 종착점은 `04-figma-plan.json`(제작 **계획서**)이었고, **화면을 만드는 단계가 없었다.**

| 파일                                 | 역할                                        |
| ------------------------------------ | ------------------------------------------- |
| `docs/screen-templates.md`           | 템플릿 4종 카탈로그 · 유형 판정 신호 · 계약 |
| `docs/schemas/screen-plan.schema.md` | `05-screen-plan.json` 계약 + 검증 규칙      |
| `.claude/agents/screen-builder.md`   | Stage 5 에이전트 (5단계)                    |
| `.claude/commands/build-screens.md`  | `/build-screens`                            |

**Stage 5 는 브랜드 단계(2a·2b·3)에 의존하지 않는다.** `01` 만 있으면 실행된다 —
브랜드 확정은 사람 판단이 여러 번 필요한데 **화면 골격은 그걸 기다릴 이유가 없다.**
결과적으로 실사에서 드러난 Stage 3 하드 스톱을 우회하는 경로가 됐다.

### 검증 — 리허설 2회 + 실제 생성

**이커머스에서 가장 먼 도메인**(병원 예약 관리)으로 샘플 기획서를 만들어 돌렸다.
주문·상품·배송 개념이 하나도 없어야 "도메인 중립"이 진짜인지 드러난다.
화면 5개 중 하나(로그인)는 **일부러 4종에 안 맞는 것**을 넣어 실패 경로도 확인했다.

결과: **화면 4개 × 3파일 = 12개 파일 생성. 테스트 771 → 858.**
새 화면에서 이커머스 어휘를 전수 검색한 결과 **사용자 노출 문자열 0건.**

### 정적 분석이 놓친 것 — 이번 작업의 핵심

앞선 실사가 "컴포넌트 100% 중립 · 재사용률 78%"를 냈고 그건 **정확한 측정**이었다.
그런데 리허설에서 결함이 **18건** 나왔고 그중 **정적 분석으로 잡혔을 것은 0건**이다.

| 회차       | 결함 | 성격                                    |
| ---------- | ---- | --------------------------------------- |
| 1차 리허설 | 8건  | 문서 오류 · 계약 누락 · **도메인 가정** |
| 2차 리허설 | 6건  | 문서끼리의 정합성                       |
| 실제 생성  | 4건  | 템플릿의 구조적 한계                    |

> **교훈: "재사용 가능한가"는 얹어봐야 안다.** 컴포넌트가 중립이고 토큰이 참조 체인을
> 유지해도, **뼈대에 남은 도메인 가정 한 줄**이 결과를 뒤집는다. 그 한 줄은 어떤 지표에도 안 잡힌다.

### 최대 발견 — 증감 지표가 이커머스 전용 가정을 품고 있었다

```
tone={up ? "success" : "critical"}    ← up 하나가 "방향"과 "좋고 나쁨"을 겸용
```

이커머스는 매출·주문·방문자가 **전부 "오르면 좋다"** 라 두 개념이 **우연히 일치**한다.
병원은 갈린다 — 노쇼율 −1.2%p 는 **내려갔고 좋은 것**인데 템플릿은 빨강으로 그렸다.
실측하니 병원 지표 7개 중 **3개**가 `up ≠ good` 이었다.

→ `up`(방향)과 `good`(감정)을 분리했다. 아이콘은 `up`, 색은 `good`.
→ 계획서에는 `goodDirection`("이 지표는 어느 쪽이 좋은가")을 두어 **검증을 기계화**했다:
`good === (up === (goodDirection === "up"))`.

> **교훈: 의미 검증도 기계화할 수 있다.** "색이 의미와 맞는가"는 사람이 봐야 하는 줄 알았는데,
> **판단 근거를 필드로 하나 더 두니** 등식이 되어 `node` 로 돌아갔다.
> 형태 검증만으로는 이 결함이 100% 통과한다.

### 두 번째 발견 — 계약의 한쪽만 검증하면 조합에서 깨진다

```
FormField   → cloneElement 로 aria-describedby·invalid 주입   ✅ 자기 테스트 통과
DatePicker  → id 만 받고 나머지를 흘림                          ✅ 자기 테스트 통과
조합        → 에러가 화면엔 보이는데 스크린리더엔 안 감          ❌ 아무도 안 봄
```

`FormField` 는 "주입한다"를 테스트했고 `DatePicker` 는 "받는다"를 테스트한 적이 **없다.**
템플릿(`ProductFormPage` 판매 기간)에도 있었지만 **그 필드에 `error` 가 없어** 드러나지 않았다.
병원 폼의 "생년월일 필수"가 만들어낸 테스트 케이스다.

→ `DatePicker` 가 `invalid` + aria 3종을 받아 트리거에 전달하게 고치고,
**조합 형태**(`<FormField error><DatePicker/></FormField>`)로 회귀 테스트를 넣었다.

### 세 번째 발견 — 같은 결함이 쌍둥이로 있었다

KPI 캡션(`"지난 기간 대비"`)이 뼈대에 하드코딩돼 있어 데이터로 내렸는데,
**목록형 `STATS` 에 완전히 같은 구조**(`"지난주 대비"`)가 남아 있었고
**생성물까지 그대로 물려받았다.**

비교 기준은 지표마다 다르다 — 병원 목록형은 당일 건수 2장이 `"어제 대비"`,
비율 지표 1장이 `"최근 30일 평균 대비"` 로 **한 화면 안에서 갈린다.**
한 문구로 묶으면 **숫자가 서로 모순되는 화면**이 된다.

> **교훈: 결함을 고칠 때 "같은 모양이 또 있는지" 훑을 것.**
> 하나를 고치고 끝내면 쌍둥이가 남고, 그게 생성물로 전파된다.

### 폼형만 다르다 — 감추지 않고 명시했다

`.data.ts` 로 빠진 것이 **선택지 배열 2개와 포맷터 1개**뿐이다. 필드는 안 빠진다 —
컨트롤이 8종이고, 상태 타입이 제각각이고, 검증이 **폼 단위**(두 필드 상호 비교)이고,
조건부 노출이 두 군데에 걸친다. 데이터로 빼려면 **폼 DSL** 을 만드는 일이 된다.

→ 폼형이 재사용하는 것은 데이터가 아니라 **레이아웃 규칙 6가지**다. 이 한계를 뼈대·데이터·카탈로그
세 곳에 적었다. 감추면 생성기가 "데이터 교체"로 처리하다 엉뚱한 결과를 낸다.

### 리허설이 알려준 것 하나 더

2차 리허설 뒤 에이전트에게 "규칙이 많아져 헷갈렸는가"를 물었더니:

> **규칙이 많아서 헷갈린 것은 아닙니다. 어긋난 두 짝(문서↔템플릿, 예시↔규칙) 때문이었습니다.**

실제로 남은 결함 2건이 정확히 그 두 짝이었다(주석↔실물 이름 불일치, 규칙↔템플릿 상태 색).
**규칙의 양이 아니라 짝의 정합성이 판단 비용을 정한다.**

### 상태 색 규칙은 템플릿 쪽이 옳았다

`canceled: critical` 이 새 규칙("종료 상태는 `default`")과 충돌했을 때 **규칙을 고쳤다.**
규칙이 "끝났는가" 한 축만 봤는데 실제로는 **"끝났는가"와 "제대로 끝났는가"가 다른 축**이다.
취소를 회색으로 묻으면 목록에서 문제 건이 보이지 않는다.
문서에 **초안이 왜 틀렸는지까지** 남겼다 — 다음 사람이 되돌리지 않도록.
