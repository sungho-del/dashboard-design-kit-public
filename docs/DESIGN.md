# DESIGN.md — 컴포넌트 상세 사전

> **컴포넌트를 만들거나 수정하기 전에 반드시 해당 섹션을 Read하고 수치를 그대로 적용한다.**
> 문서에 없는 값은 임의로 만들지 않는다. 핵심 규칙 요약은 `docs/design-core.md`.
>
> **출처**: 아임웹 관리자 CSS 역추출 — 대조한 사본(`_reference/`)은 **2026-08-29 삭제됐다**
> (서드파티 자산). 이 문서의 수치가 그 역추출의 결과물이자 **현재의 원천**이다.
>
> - `brand-admin/_astro/gnb.BZBi7U3h.css` — Clay 컴포넌트 번들 (클래스명 해시됨, 내용으로 역추정)
> - `brand-admin/_astro/container.BuDZObdr.css` — GNB (클래스명 가독)
> - `brand-admin/_astro/client-provider.hjDLpAAS.css` — 앱 레이어(Table·Card·Modal 등)
> - `css/site/admin/dashboard.css` — 레거시(치수·정보구조만 참고, 색상은 전부 폐기)
>
> **신뢰도 표기**: 표기 없음 = CSS에서 직접 확인 · `[추정]` = 값 조합으로 역산 · `[유추]` = 원본에 없어 Clay 규격으로 설계

---

## §0. 앱 셸 레이아웃

```
┌────────────┬──────────────────────────────────────┐
│  GNB       │  PageHeader   min-h 72 · gutter 40   │
│  224 / 60  ├──────────────────────────────────────┤
│  100dvh    │  콘텐츠 (flex:1)                      │
└────────────┴──────────────────────────────────────┘
```

| 항목           | 값                                                                 | 토큰                   |
| -------------- | ------------------------------------------------------------------ | ---------------------- |
| 셸 배치        | `display:flex` 가로 — GNB(고정폭) + 콘텐츠(`flex:1`)               | —                      |
| GNB 컨테이너   | `min-width:60px; height:100dvh; flex-shrink:0; position:relative`  | `--size-gnb-collapsed` |
| GNB 확장       | `224px`                                                            | `--size-gnb-expanded`  |
| GNB 축소       | `60px` + `position:absolute` + `z-index:9000`, hover 시 224로 확장 | `--z-sidesheet`        |
| 페이지 헤더    | `min-height:72px`, 좌우 40 / 컴팩트 52, 좌우 16                    | `--size-page-header`   |
| 콘텐츠 최대폭  | 제한 없음(100%)이 기본 [추정] — 필요 시 페이지별 오버라이드        | —                      |
| 브레이크포인트 | 992(데스크톱 경계) · 588(모바일 경계)                              | `--breakpoint-*`       |

> 레거시는 콘텐츠 `max-width: 1100px`(sm 840 / lg 1300)을 썼으나, 신규 Clay 셸에는 해당 제한이 없다.
> 폭 제한이 필요한 페이지에서만 개별 적용한다.

---

## §1. Button

**Base**: `inline-flex` · center 정렬 · `width/height: fit-content` · `transition: background-color 0.1s ease-out, color 0.1s ease-out`

### 1-1. 사이즈

| size   | padding (y/x) | min-width | radius    | gap | 타이포        | **높이** |
| ------ | ------------- | --------- | --------- | --- | ------------- | -------- |
| large  | 12 / 16       | 80        | medium(8) | 8   | 16 / 24 / 600 | **48**   |
| medium | 8 / 12        | 64        | medium(8) | 8   | 14 / 24 / 600 | **40**   |
| small  | 4 / 12        | 48        | small(6)  | 4   | 14 / 24 / 600 | **32**   |
| xsmall | 6 / 8         | 40        | small(6)  | 4   | 12 / 16 / 600 | **28**   |

### 1-2. Variant (8종)

| variant         | 기본 bg / 텍스트                                                 | hover                    | pressed                    | disabled                            |
| --------------- | ---------------------------------------------------------------- | ------------------------ | -------------------------- | ----------------------------------- |
| `primary`       | `action-primary` / `text-inverse`                                | `-hover`                 | `-pressed`                 | `-disabled` + `text-disabled`       |
| `primaryTonal`  | `action-primary-tonal` / `text-secondary`                        | `-tonal-hover`           | `-tonal-pressed`           | `-tonal-disabled` + `text-disabled` |
| `ghost`         | `transparent` / `text-secondary`                                 | `action-secondary-hover` | `action-secondary-pressed` | transparent + `text-disabled`       |
| `secondary`     | `action-secondary` / `text-secondary` + **outline 1px `border`** | outline → `border-hover` | outline → `border-sub`     | bg `-disabled`, outline transparent |
| `critical`      | `action-critical` / `text-on`                                    | `-hover`                 | `-pressed`                 | `-disabled`                         |
| `criticalTonal` | `action-critical-tonal` / `text-critical`                        | `-tonal-hover`           | `-tonal-pressed`           | `-tonal-disabled`                   |
| `accent`        | `action-accent` / `text`                                         | `-hover`                 | `-pressed`                 | `-disabled`                         |
| `accentTonal`   | `action-accent-tonal` / `text-accent`                            | `-tonal-hover`           | `-tonal-pressed`           | `-tonal-disabled`                   |

### 1-3. Modifier · 상태

- `fullWidth` → `width: 100%` · `pill` → `radius: full`
- **loading**(`:disabled[data-loading="true"]`): 배경은 **pressed**, 텍스트·아이콘 색은 **원래대로 유지**. disabled와 명확히 구분한다.
- disabled: `cursor: not-allowed`, 아이콘 `icon-disabled`
- 전역 reset: `button { padding:0; background:transparent; border:none; outline:none; cursor:pointer; text-align:left }`

---

## §2. IconButton

Variant 8종·상태 전이는 **Button과 완전히 동일**. 사이즈만 다르다.

| size   | padding | radius    | 아이콘    | 높이 |
| ------ | ------- | --------- | --------- | ---- |
| large  | 12      | medium(8) | **24**    | 48   |
| medium | 12      | medium(8) | 16 [추정] | 40   |
| small  | 8       | small(6)  | 16 [추정] | 32   |
| xsmall | 6       | small(6)  | 16 [추정] | 28   |

---

## §3. TextButton (링크형)

`inline-flex` center · bg transparent · `gap: 2px` · `transition: color 0.1s`

| size   | padding | 타이포               |
| ------ | ------- | -------------------- |
| large  | 0       | 16 / 24 / 600        |
| medium | 0       | 14 / 24 / 600        |
| small  | 상하 4  | 12 / 16 / 600, gap 1 |

| tone      | color            | hover                  | disabled        |
| --------- | ---------------- | ---------------------- | --------------- |
| accent    | `text-accent`    | `text-accent-hover`    | `text-disabled` |
| secondary | `text-secondary` | `text-secondary-hover` | `text-disabled` |
| critical  | `text-critical`  | `text-critical-hover`  | `text-disabled` |
| warning   | `text-warning`   | `text-warning-hover`   | `text-disabled` |
| on        | `text-on`        | **opacity 0.75**       | `text-disabled` |

---

## §4. Tag / Badge

**Base**: `inline-flex` · gap 4 · center · `font-weight: 600` · **`radius: full`** · `width: fit-content` · `flex-shrink: 0`

| size   | 타이포  | padding (y/x) | min-width |
| ------ | ------- | ------------- | --------- |
| small  | 11 / 12 | 4 / 6         | 20        |
| medium | 12 / 16 | 4 / 8         | 24        |
| large  | 14 / 24 | 2 / 10        | 28        |

| tone     | background                   | color           |
| -------- | ---------------------------- | --------------- |
| default  | `surface-sub`                | `text-sub`      |
| success  | `surface-success-secondary`  | `text-success`  |
| warning  | `surface-warning-secondary`  | `text-warning`  |
| critical | `surface-critical-secondary` | `text-critical` |
| custom   | `--tag-bg-color` (로컬 변수) | `--tag-color`   |

- **Dot**: 8×8, `radius: full`, 색은 tone의 텍스트 색과 동일.

### 4-1. GNB 전용 배지

| 배지           | 스펙                                                                               |
| -------------- | ---------------------------------------------------------------------------------- |
| `count`        | min-w 20 × h 20, padding 2/6, `surface-inverse`, radius full, 12/16/600            |
| `countInverse` | 동일 + `surface-slate-secondary`                                                   |
| `update`       | padding 2, `surface-warning-primary`, radius small                                 |
| `new`          | `pink-500` 텍스트                                                                  |
| `warning`      | 20×20 원형 — 원본은 `#ff5e60` 하드코딩. **`surface-critical-primary`로 대체할 것** |

---

## §5. Input / SearchField

| 요소        | 스펙                                                                                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 필드        | **height 40** · `min-width 240` · padding `0 12` · gap 8 · `bg: surface` · **`outline: 1px solid border; outline-offset: -1px`** · `radius: medium` · `transition: background-color 0.1s` |
| hover       | `outline-color: border-hover`                                                                                                                                                             |
| **focus**   | `outline-width: 2px; outline-offset: -2px; outline-color: focus` (hover에도 유지)                                                                                                         |
| disabled    | `bg: field-disabled`, `outline-width: 0`, `cursor: not-allowed`                                                                                                                           |
| **error**   | `bg: surface-critical-secondary`, hover outline `border-critical-hover`                                                                                                                   |
| inner input | `height 24` · `flex: 1 1 0` · outline none · bg transparent · **14 / 24 / 400**                                                                                                           |
| placeholder | `text-minimal` (disabled 시 `text-disabled`)                                                                                                                                              |

### 5-1. 부착형 버튼 (검색 셀렉트 등)

> 원본 `.sjcokig` / `.sjcokif` / `.sjcokie` 실측. 예전 표기 "40 × 56"이 높이·폭 중
> 무엇인지 모호해 원본에서 재확인했다 — **height 40 · width 56**이다.

- 버튼: **height 40 × width 56** · padding 8 · gap 8 · `bg: action-secondary` · `color: text-secondary` · **14 / 20 / 600**(= `body-medium-bold`. `label-medium-bold`는 행간 24라 다르다)
- 필드 **우측**에 붙는다. 3면(위·오른쪽·아래) 경계선 — 좌측은 필드의 outline이 이미 그 자리를 차지한다
- hover `action-secondary-hover`(`:not(:disabled)`) · active(`[data-active]`) `action-primary-tonal` · disabled `field-disabled` + `text-disabled`
- 그룹(`.sjcokif`)은 `inline-flex` · `align-items: stretch` · `flex-shrink: 0`. 필드의 **우측 radius를 0으로** 지우고, 그룹 마지막 요소만 우측 radius를 복원한다

> **구현 메모**: 3면 경계선은 원본 그대로 `box-shadow: inset` 3개로 그린다
> (`shadow-[inset_0_1px_0_var(--color-border),…]`). box-shadow 는 박스 크기에 영향을
> 주지 않아 40 × 56 이 유지된다. **`outline` 은 네 면 일괄이라 여기서는 쓸 수 없다.**

### 5-2. 드롭다운 패널

- 패널: `radius: large(12)` · `overflow: hidden` · `shadow-layer`
- 컬럼: padding 16 · 세로 gap 4 · `bg: surface` · 컬럼 구분선 `box-shadow: inset -1px 0 0 border`
- 옵션: `min-width 108` · padding `8 12` · `radius: medium` · 14 / 24 / 400
  - hover `action-secondary-hover` (선택·비활성 아닐 때만) · **selected `action-primary-tonal`**
- 검색 결과 패널: padding 8 · `max-height 230` · `shadow-popover` · `overscroll-behavior: contain`

---

## §6. Select 트리거

| 상태                   | 스펙                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| base                   | **height 40** · padding `0 12` · `space-between` · gap 8 · `outline: 1px solid border; offset -1` · `radius: medium` · `bg: surface` |
| hover                  | `outline-color: border-hover`                                                                                                        |
| active / focus-visible | `outline-color: focus`                                                                                                               |

> 옵션 리스트박스는 §5-2 패턴을 그대로 쓴다.

---

## §7. Table

| 요소             | 스펙                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| table            | **`width: max-content`**; `min-width: 100%` · `border-collapse: collapse` · `table-layout: fixed` (⚠️ §7-1-1) |
| thead            | `position: relative` · `bg: surface` · 하단 `border-bottom: 1px solid divide`                                 |
| thead sticky     | `position: sticky; top: 0; z-index: 2` + `::after`로 1px `divide`                                             |
| **행 높이**      | **48** (`--size-table-row`)                                                                                   |
| th               | padding **좌우 12 · 상하 8** · `text-align: left` · `bg: surface` · **13 / 500** [레거시 기준]                |
| td               | padding **좌우 12 · 상하 8** · 상하 border 없음                                                               |
| **첫/마지막 셀** | `padding-left: 24` / `padding-right: 24`                                                                      |
| **zebra**        | 홀수 행 `surface`(흰색) · 짝수 행 `surface-sub`. 마지막 행이 홀수면 `border-bottom: 1px divide` 보정          |
| row hover        | `bg: surface-sub` · `transition: background-color 0.2s` · `cursor: pointer` (clickable 행만)                  |
| 링크 셀          | td padding 0, 내부 `<a>`가 `padding: 8; width/height: 100%` flex                                              |
| 세로 구분선      | `border-right: 1px solid divide` (sticky 셀은 `::after`로 대체)                                               |
| noBackground     | zebra 해제 + td `border-bottom: 1px divide`                                                                   |
| ellipsis         | `-webkit-line-clamp: 2`                                                                                       |

### 7-1. 테이블 셸

| 요소          | 스펙                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------- |
| 헤더 영역     | flex · gap 8 · `space-between` · **padding `0 24 24 24`**                                         |
| 래퍼          | `width: 100%` · `overflow: auto`                                                                  |
| 페이지네이션  | flex · `justify-content: flex-end` · padding `0 24`                                               |
| 필터 래퍼     | 데스크톱 `width: fit-content` / 모바일 `100%` · gap 8                                             |
| 카테고리 버튼 | `left: -8px`(옵티컬 보정) · padding 8 · gap 4 · `radius: medium` · hover `action-secondary-hover` |
| 더보기 버튼   | width 100% · **height 48** · center                                                               |

> 원본은 동일한 테이블 셸이 5개 파일에 중복 정의돼 있다. **단일 `DataTableShell`로 통합**할 것.

### 7-1-1. 열 폭은 `%`가 아니라 px다

우리 표는 `width: max-content; min-width: 100%` + `table-layout: fixed`라, `<col>`에 준 px가
**최소 폭이자 비율**로 동작한다 — 합이 화면보다 좁으면 비율대로 늘어나고, 넓으면 가로 스크롤이 된다.

> ⚠️ **`width: auto`면 가로 스크롤이 아예 생기지 않는다.** `auto`인 표는 shrink-to-fit
> (`min(내용이 원하는 폭, 쓸 수 있는 폭)`)이라 **컨테이너보다 넓어질 수 없다.**
> `<col>`에 3,532px어치를 선언해도 표가 화면 폭으로 눌리고, 넘치는 것이 없어
> 래퍼의 `overflow-auto`가 스크롤바를 만들지 않는다. 실제로 24열짜리 주문 표가
> 잘린 채 스크롤 불가였다. 원본 어드민은 같은 결과를 **셀의 `min-width`**로 낸다 —
> 셀 최소 폭이 표의 최소 내용 폭을 끌어올려 shrink-to-fit이 그 아래로 못 줄인다.

**`%`를 쓰면 안 된다.** 합이 100이어야 해서 **열 하나가 붙고 빠질 때마다 관계없는 열까지 전부
재배분**된다. 셀러 관리의 퇴점일이 정확히 그 경우였다 — 퇴점일이 붙으면 셀러명이 16%→14%로
줄었다. 같은 내용인데 화면마다 폭이 다른 것도 여기서 나왔다(날짜가 11% / 15%).

폭의 출처는 **원본 어드민의 컬럼 정의 `minWidth`**다. 원본은 10px 단위(70~260)를 쓰고
우리는 4px 그리드라 **올림**해서 옮긴다(70→72 · 110→112 · 130→132). 차이는 최대 2px다.

| 내용 유형                           | 원본        | 우리    |
| ----------------------------------- | ----------- | ------- |
| 체크박스                            | (정의 없음) | 40      |
| 짧은 수치(자녀·평점·유형)           | 70          | 72      |
| 상품수 · 사업자 · 관리              | 80          | 80      |
| 상태 배지(짧음) · 대표명 · 수수료율 | 90          | 92      |
| 상태 배지(김) · 회원명 · 택배사     | 100         | 100     |
| **날짜** · 이름 · 상품코드          | 110         | 112     |
| **연락처** · 송장번호 · 명세서번호  | 130         | 132     |
| 상호 · 주문번호 · **날짜+시각**     | 140         | 140     |
| 신청일(시각 포함) · 내용            | 160         | 160     |
| 이메일 · 상품명 · 쿠폰명            | 200         | 200     |
| 배송지 · 제목                       | 220~260     | 220~260 |

> **연락처는 어느 화면에서든 132다.** 같은 내용 유형은 같은 폭을 쓴다.

#### ⚠️ 고정 열 오프셋은 파생값이다

`sticky left-*`는 **앞 열 폭의 누적합**이다. `<colgroup>`을 고치면 반드시 함께 고쳐야 하고,
어긋나면 고정 열이 겹쳐 글자가 포개진다. **가로 스크롤을 해야 보이므로 렌더 테스트로는 안 잡힌다** —
`ProductListPage.test.tsx`처럼 `<col>`에서 누적합을 계산해 검사할 것. 리터럴을 적어 두면
폭을 고칠 때 테스트가 조용히 낡는다.

### 7-2. 열 정렬 규칙

열의 **성격**이 정렬을 정한다. 원본 서비스가 무엇으로 주든 이 규칙으로 통일한다 —
목록을 옮겨 다닐 때 같은 성격의 열이 화면마다 다른 쪽에 붙어 있으면 눈이 흔들린다.

| 열의 성격                     | 정렬                 | 왜                                                          |
| ----------------------------- | -------------------- | ----------------------------------------------------------- |
| **배지(`Tag`)만** 들어가는 열 | **`align="center"`** | 배지는 글자가 아니라 **객체**다 — 왼쪽 모서리에 정보가 없다 |
| **그 외 전부** (수치 포함)    | **좌측** (기본)      | 표 전체가 한 기준선에 선다                                  |

**우측 정렬은 어느 열에도 쓰지 않는다.** 금액·건수·수량도 좌측이다.

> 회계 표의 관행은 수치를 우측에 두는 것이다 — 자릿수가 세로로 맞아 **읽지 않고도**
> 대소가 보이기 때문이다. 이 저장소는 그 이득보다 **기준선이 하나인 것**을 택했다.
> 되돌리려면 `align="right"`만 다시 주면 되지만, 그때는 `tabular-nums`도 함께 켜야 한다 —
> 자릿수를 맞추려고 우측 정렬을 하는데 숫자 글자폭이 비례폭이면 반쪽짜리다.

**`TableTh`와 `TableTd`를 반드시 함께 바꾼다.** 한쪽만 고치면 헤더와 셀이 어긋난다.

#### 가운데가 되지 않는 두 경우

1. **배지가 곁들여진 이름 열은 좌측이다.** `상품명 + 안심케어 표식`, `배지 + 정산 대상명`처럼
   **주 정보가 이름**이면 좌측 기준선을 지킨다. 이름을 가운데로 밀면 세로로 훑을 수 없다.
   판정 기준은 "배지를 걷어냈을 때 남는 것이 있는가"다.
2. **체크박스 열은 좌측이다.** 첫 칸은 `first:pl-6`(24px 거터)를 갖는데,
   가운데로 밀면 그 거터가 무너져 표의 좌측 경계가 어긋난다.

#### ⚠️ `text-align`은 flex 자식에게 먹지 않는다

셀 안에 `<div className="flex …">`가 있으면 `align`을 바꿔도 **화면은 그대로다.**
`justify-*`를 함께 고쳐야 한다.

```tsx
// 관리 열(좌측)                     // 유형 열(가운데)
<TableTd>                            <TableTd align="center">
  <div className="flex gap-1">         <span className="flex flex-wrap justify-center gap-1">
```

---

## §8. Pagination

| 요소            | 스펙                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------- |
| 컨테이너        | `grid-template-columns: 1fr auto 1fr` · center · padding `16 0` · width 100%                    |
| 3분할 셀        | 가운데 center / 첫째 `flex-start` / 마지막 `flex-end`                                           |
| 버튼 그룹       | flex · **gap 2**                                                                                |
| 화살표          | **32 × 32** · `color: icon-sub`                                                                 |
| 페이지 버튼     | min-w **32** · h **32** · padding 0 · `radius: small` · `color: text-secondary` · 14 / 24 / 600 |
| hover / pressed | `action-secondary-hover` / `action-secondary-pressed`                                           |
| **selected**    | `bg: action-primary` + `color: text-inverse` (hover에도 고정)                                   |
| disabled        | transparent · `text-disabled` · `cursor: not-allowed` · `pointer-events: none`                  |
| 개수 셀렉트     | width **140** · 패널 `max-height 292` · padding 8 · `radius: medium` · `shadow-layer`           |

---

## §9. Tabs (underline)

| 요소         | 스펙                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| 리스트       | flex · **gap 16**                                                                                                |
| 탭           | `inline-block` · `position: relative` · padding **12 0** · **16 / 24 / 600** · `transition: color 0.3s ease-out` |
| default      | `text-minimal`                                                                                                   |
| hover        | `text-sub`                                                                                                       |
| **selected** | `text` + `::after` 밑줄 — `height: 2px`, `left/right: 0`, `bottom: 0`, `bg: action-primary`, `radius: full`      |
| disabled     | `text-disabled` · `cursor: not-allowed`                                                                          |

---

## §10. SegmentedControl

| 요소                        | 스펙                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| 컨테이너                    | `inline-flex` · relative · `radius: medium`                                                              |
| filled / plain              | `bg: surface-sub` + padding 4 / transparent + padding 0                                                  |
| 인디케이터                  | absolute · `top: 50%` · `radius: small` · `pointer-events: none` · `z-index: 0`                          |
| ↳ solid / outline / raised  | `action-primary` / `outline 2px action-primary, offset -2` / `action-secondary` + `shadow-raised-button` |
| 아이템                      | relative · `z-index: 1` · `color: text-secondary` · `transition: color 0.3s`                             |
| ↳ selected                  | solid → `text-inverse` · outline·raised → `text`                                                         |
| size small / medium / large | padding 4/12 · 6/12 · 10/12 → min-width 54 / 60 / 64 → **높이 32 / 36 / 44**                             |
| fullWidth                   | `width: 100%`, 아이템 `flex: 1`                                                                          |

---

## §11. Dropdown / Menu

| 요소              | 스펙                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 메뉴 아이템       | `width: 100%` · flex · gap 4 · `radius: medium` · padding **8 12** · hover `action-secondary-hover`                                                   |
| 카테고리 컨테이너 | relative · `max-height 280` · `overflow: auto`                                                                                                        |
| 슬라이드 전환     | `0.2s ease-out` · `translateX(±100%)` + opacity                                                                                                       |
| 액션 팝오버       | width **128**                                                                                                                                         |
| 큰 팝오버         | `min-width 280` · padding 6 · 세로 gap 8 · `radius: medium` · `shadow-popover`                                                                        |
| ↳ 아이템          | `space-between` · gap 12 · padding `8 12` · `radius: medium` · `transition 0.1s` · hover `action-secondary-hover` · **active `action-primary-tonal`** |
| ↳ 삭제 버튼       | padding 4 · `opacity: 0 → 1`(부모 hover) · `transition: opacity 0.2s`                                                                                 |

---

## §12. Tooltip / Popover

| 요소      | 스펙                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| 컨테이너  | relative flex · **max-width 256** · `bg: surface` · `radius: medium` · `shadow-layer` |
| 본문형    | 세로 · padding **12 16** · gap 8                                                      |
| 컴팩트형  | padding **6 8**                                                                       |
| 닫기 버튼 | absolute · `top/right: 8`                                                             |

> 앱 레이어에 별도의 커스텀 툴팁(width 292, 헤더 38px, 화살표 `::before/::after`)이 있으나
> `#d7d7d7` 보더·`rgba(0,0,0,.45)` 그림자 등 **토큰 이탈이 많아 클론 대상에서 제외**한다. 위 Clay 규격을 쓸 것.

---

## §13. Modal / Dialog `[유추]`

> ⚠️ **중앙 정렬 Modal의 Clay 베이스 CSS는 캡처된 파일에 없다.** 아래는 확인된 조각 + Clay 규격 유추.

| 요소           | 스펙                                                                                            | 근거                  |
| -------------- | ----------------------------------------------------------------------------------------------- | --------------------- |
| 딤             | `position: fixed; inset: 0` · `bg: overlay`(15%) 또는 `overlay-sub`(50%) · `z-index: --z-modal` | 토큰 존재             |
| 컨테이너       | `bg: surface` · **`radius: xlarge(16)`** · `shadow-modal`                                       | 본문 하단 radius가 16 |
| 바디           | 세로 flex · gap **20** · padding **24 0** · `overflow: auto`                                    | 확인됨                |
| 바디 아이템    | flex · gap 8 (small 항목 width 100, large 항목 `flex:1; min-width:0`)                           | 확인됨                |
| 버튼 영역      | padding `0 24`                                                                                  | 확인됨                |
| 푸터           | flex · `justify-content: flex-end`                                                              | 확인됨                |
| 삭제 확인 모달 | 세로 center · gap **16** · 아이콘 **72 × 72**                                                   | 확인됨                |

---

## §14. SideSheet / Drawer

| 요소        | 스펙                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| 오버레이    | `fixed; inset: 0` · `bg: overlay` · `animation 0.2s ease-in-out forwards`                                 |
| 배치        | `fixed; bottom: 0; right: 0` · padding 12 · **`transition: transform 0.2s linear`**                       |
| 패널        | 세로 flex · `bg: surface` · `radius: large(12)` · **width 380** · `max-height: 100%` · `shadow-page-side` |
| 헤더        | flex · gap 4 · `space-between` · 하단 border 조건부                                                       |
| 타이틀 영역 | 세로 gap 12 · `flex: 1`                                                                                   |
| 바디        | padding **16 24** · `padding-bottom: 0` · `flex: 1` · `overflow-y: auto`                                  |
| 푸터        | 세로 flex · gap **20** · padding **16 24**                                                                |
| z-index     | `--z-sidesheet` (9000)                                                                                    |

---

## §15. Toast

| 요소                        | 스펙                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 컨테이너                    | `fixed` · `left: 50%` `translateX(-50%)` · padding **32 0** · `pointer-events: none` · `z-index: --z-toast`                                         |
| 본체                        | flex center · gap 8 · **min-width 180 / max-width 480** · **`radius: full`** · `shadow-toast` · **`backdrop-filter: blur(2px)`** · `color: text-on` |
| size large / medium / small | h **48** pad 12/20 · h **40** pad 6/16 · h **32** pad 6/12                                                                                          |
| 타이포                      | 16/24/400 · 14/20/400 · 12/16/400                                                                                                                   |
| tone                        | `surface-toast` / `surface-toast-critical`                                                                                                          |
| 애니메이션                  | 상단 진입 `translateY(-16px)` · 하단 `+16px` + opacity, **0.3s ease-out**                                                                           |

---

## §16. Empty State

| 종류           | height  | gap | 아이콘                 |
| -------------- | ------- | --- | ---------------------- |
| 콘텐츠 전역    | **400** | 20  | **72 × 72**            |
| 테이블         | **320** | 20  | 72 × 72                |
| 필터 결과 없음 | 240     | 4   | 48 × 48                |
| 검색 결과 없음 | 214     | 8   | 48 × 48                |
| 리스트 내      | 120     | 4~8 | 48 × 48 (작은 경우 32) |

공통: 세로 flex center · `white-space: pre-wrap` · `text-align: center`
테이블 빈 상태는 `position: sticky; left: 50%; transform: translateX(-50%)`로 가로 스크롤과 무관하게 중앙 고정.

---

## §17. DatePicker

| 요소             | 스펙                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| 패널             | `width: fit-content` · **max-height 440** · padding-top 20 / bottom 24 · `bg: surface` |
| 부유형 / 인라인  | `radius: large(12)` + `shadow-layer` / radius 0                                        |
| 본문             | 좌우 padding 20 · 세로 gap 16                                                          |
| **날짜 셀**      | **40 × 40** · `radius: full` · 14 / 24 / 400                                           |
| ↳ hover          | `action-secondary-hover`                                                               |
| ↳ **selected**   | `bg: action-primary` + `text-inverse`                                                  |
| ↳ **today**      | `::after` 4px 점 (`bottom: 6px`, `bg: icon`)                                           |
| ↳ **range 중간** | `bg: surface-sub` + `color: text`                                                      |
| ↳ disabled       | `text-disabled` (opacity 1 강제)                                                       |
| 요일 헤더        | **40 × 44** · `text-sub` · 14 / 24 / 400 · padding 6/8                                 |
| 셀 간격          | `border-spacing: 4px; margin: -4px`                                                    |
| 하단 페이드      | height **56** · `mask-image: linear-gradient`                                          |
| 월 간격          | multi-month 32 / single 24                                                             |

### 17-1. 트리거 (레거시 실측, Clay 규격과 일치)

`height 40` · padding `0 11` · gap 8 · `radius: medium` · `outline 1px border` · hover `border-hover` · 날짜 텍스트 `min-width 84`(단일 날짜 192) · 중앙 아이콘 18px

---

## §18. TimePicker

| 요소               | 스펙                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 트리거             | padding **10** · flex gap 8 · `radius: medium` · `bg: field` · `outline 1px border, offset -1` · width 100%          |
| ↳ open             | `outline: 2px focus, offset -2` (hover에도 유지)                                                                     |
| ↳ closed hover     | `outline-color: border-hover`                                                                                        |
| 콘텐츠             | **height 292** · padding 8 · `radius: medium` · `bg: surface` · 세로 gap 12 · `shadow-layer`                         |
| 컬럼               | `overflow-y: auto` · `radius: small` · `bg: field` · padding 4 · **스크롤바 width 4, thumb `border-hover` radius 2** |
| 옵션               | padding **6 12** · `radius: medium` · 14 / 24 / 400                                                                  |
| ↳ selected / hover | `action-primary-tonal` / `surface-sub`                                                                               |

---

## §19. FileUpload (Dropzone)

| 요소               | 스펙                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 드롭존             | 세로 flex center · `bg: action-secondary` · gap 16 · `radius: medium` · cursor pointer                                             |
| ↳ default          | **`outline: 1px dashed border-minimal, offset -1`** · hover → `solid` + `border-hover`                                             |
| ↳ filled           | `bg: action-primary-tonal` · hover → 1px solid `border-hover`                                                                      |
| ↳ focus / dragover | `outline: 2px solid focus, offset -2`                                                                                              |
| ↳ disabled         | `cursor: not-allowed` · `outline-width: 0` · `action-secondary-disabled`                                                           |
| size(세로)         | small pad 20/24 **min-h 144** · medium pad 24 **176** · large pad 32/24 **224**                                                    |
| size(가로)         | small pad 12 gap 8 **min-h 64** · medium **72** · large pad 20/16 **88**                                                           |
| 아이콘             | 세로형 48 / 72 / 96 · 가로형 36 / 48 / 48                                                                                          |
| 파일 리스트        | 세로 gap 4 · `radius: medium` · padding 4 · outlined(1px border) 또는 filled(`surface-sub`)                                        |
| 리스트 아이템      | `space-between` · padding `4 12` · gap 16                                                                                          |
| 썸네일             | **48 × 48** · `radius: small` · `bg: layer-sub`                                                                                    |
| 진행바             | width 100% · **height 4** · `radius: full` · track `surface-slate-secondary` · fill `border-slate` · `transition: width 0.1s ease` |

---

## §20. Spinner

`inline-flex` center · `width/height: var(--spinner-size, 16px)` · `animation: rotate360 var(--spinner-speed, 1s) linear infinite`
tone: `icon`(기본) / accent / critical / warning / on / inverse

---

## §21. Accordion

Container 세로 flex gap **20** · Item `overflow: hidden` · Header `space-between` center gap **12** · 아이콘 `transition: transform 0.2s ease-in-out`(펼침 시 180° 회전) · Content `padding-top: 0`

> **시각 스타일(배경·보더)이 없는 순수 구조 컴포넌트.** 필요한 표면은 감싸는 쪽에서 준다.

---

## §22. Stepper `[추정]`

리스트 gap **36** · `margin-top: 12` · 아이템 flex gap 6 · `margin: -8 -12; padding: 8 12`
스텝 배지: `inline-flex` center · padding `4 6` · `min-width 20` · `radius: full` · **11 / 12 / 600**

| 상태     | bg / color                             |
| -------- | -------------------------------------- |
| current  | `surface-inverse` / `text-inverse`     |
| default  | `surface-slate-secondary` / `text-sub` |
| disabled | `surface-sub` / `text-disabled`        |

커넥터: absolute `right: -26px`, `translateY(-50%)`

---

## §23. GNB (사이드바)

### 23-1. 컨테이너

| 항목              | 값                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| container         | relative · `flex-shrink: 0` · `min-width: 60` · `height: 100dvh`                                                                                |
| **wrapper(확장)** | **width 224** · `padding-inline: 12` · `padding-block: 16` · 세로 gap **24** · `bg: surface` · `shadow-gnb` · **`container-type: inline-size`** |
| **wrapper(축소)** | `[data-open="false"]` → `position: absolute` · width **60** · `z-index: --z-sidesheet` · **hover 시 224** (transition 없음, 즉시 스냅)          |
| 모바일 드로어     | `fixed` · width **280** · `100dvh` · `z-index: --z-sidesheet`                                                                                   |
| 딤                | `fixed` 전면 · `bg: overlay-sub`                                                                                                                |
| content 영역      | `flex: 1` · `overflow-y: auto` · `overscroll-behavior-y: contain` · **스크롤바 숨김**                                                           |

내부 콘텐츠 폭 = 224 − 12×2 = **200px**

### 23-2. 로고

`height 28` · `padding-inline-start: 8` · `margin-block-end: 16` · `font-size: 0` · 로고 이미지 **114 × 24**
모바일: padding 12 · 이미지 152 × 32 · margin-bottom 4

### 23-3. 메뉴 아이템

| 항목           | 데스크톱                            | 모바일(≤991) |
| -------------- | ----------------------------------- | ------------ |
| padding-block  | 4                                   | 10           |
| padding-inline | 8                                   | 8            |
| radius         | small(6)                            | 동일         |
| transition     | `background-color 0.1s ease-in-out` | 동일         |
| **높이**       | **32**                              | **44**       |
| 아이콘         | **20 × 20**                         | 24 × 24      |

| 상태                                | 배경                     |
| ----------------------------------- | ------------------------ |
| hover                               | `action-secondary-hover` |
| **active** (`[data-active="true"]`) | `action-primary-tonal`   |

- depth1 리스트 gap **4** · depth1 아이템 `space-between` gap 8
- **depth2**: `padding-inline: 36 12`(모바일 40/12) · `padding-block: 2`(모바일 6) → 높이 **28**(모바일 36) · 리스트 상단 padding 4 / 하단 16
- 섹션 라벨(`itemHeader`): height **28**(모바일 32) · `padding-inline: 8 2` · ellipsis
- 플래그 아이콘 16 × 16 · `margin-right: 2`
- 텍스트: `label-medium`, active 시 `label-medium-bold` [추정]
- **섹션 사이 여백 16 `[확장]`** — 원본에는 섹션 간 여백 규칙이 **없다**(그룹 구분을 28px 라벨 행 하나에 전부 맡긴다). 밀도가 너무 높아 우리가 확장 모드에만 16을 넣었다. **축소 모드는 원본 그대로** — 구분선이 자기 여백(`margin: 4 0 24`)을 이미 갖는다.

### 23-4. 축소 모드 (컨테이너 쿼리)

```css
@container (width <= 60px) { … }
```

| 대상                     | 변화                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| 로고                     | `padding-inline-start: 0` · 풀 로고 숨김 → 심볼 표시             |
| depth2 리스트, 섹션 라벨 | `display: none`                                                  |
| **구분선**               | `display: block` — `margin: 4 0 24`, `height: 1px`, `bg: border` |

> **핵심**: 확장 시엔 섹션 라벨로 그룹을 구분하고, 축소 시엔 라벨을 숨기고 1px 선으로 **스왑**한다.
> `@container (width < 200px)`에서는 depth2 활성 배경을 제거한다.

### 23-5. 상단 사이트 선택기

`padding-block: 2` · `min-height 32`(모바일 44) · 이미지 **20 × 20**(모바일 24) · 텍스트 `flex: 1` ellipsis · 우측 chevron `flex-shrink: 0`

---

## §24. PageHeader

| 요소           | 스펙                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 바             | flex `space-between` · width 100% · `margin: 0 auto` · `bg: surface` · **하단선 `box-shadow: inset 0 -1px 0 0 border`** |
| 데스크톱       | **min-height 72** · padding `16 40 0` · gap 16                                                                          |
| 컴팩트/모바일  | **min-height 52** · padding `0 16` · gap 12                                                                             |
| sticky         | `position: fixed; top: var; left/right: 0; z-index: --z-header`                                                         |
| 우측 액션 그룹 | flex · `flex-shrink: 0` · gap **8**                                                                                     |
| 타이틀 행      | flex gap 12 · `flex: 1` · `min-width: 0` · min-height 40 / 52                                                           |
| 타이틀 옆 배지 | gap 4                                                                                                                   |
| 뒤로가기 버튼  | **32 × 32**                                                                                                             |
| 탭 정렬        | `padding-left: 40`                                                                                                      |

---

## §25. Selection Floating Bar (일괄 작업)

| 요소     | 스펙                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 바       | `fixed` · **`z-index: --z-modal`** · `bottom: 80` · `left: 50%` · padding `10 12` · flex gap 12 · `bg: surface-toast` · `radius: large(12)` · `shadow-toast` |
| 구분선   | 1 × 10px · `bg: divide`                                                                                                                                      |
| 버튼     | `inline-flex` center · padding 6 · `radius: small` · transparent · `color: text-secondary` · 12 / 16 / 600 · `transition 0.1s ease-out`                      |
| ↳ hover  | `bg: surface`(흰색)                                                                                                                                          |
| ↳ 아이콘 | `icon-on`                                                                                                                                                    |

---

## §26. 원본에 없는 컴포넌트 — 설계 지침 `[유추]`

아래는 Clay CSS에 **없어서** 규격에서 유추해 설계해야 한다. 구현 시 이 원칙을 따른다.

| 컴포넌트             | 설계 원칙                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Checkbox / Radio** | Clay는 인라인 SVG 아이콘으로 렌더링한다(래퍼 CSS만 존재). 크기 **20**(라벨 옆 16), 체크 시 `action-primary`, 비활성 `border-minimal`, focus는 `outline 2px focus, offset 2`                            |
| **Switch**           | 토큰 `action-toggle`(slate-tint-15)이 off 트랙. on 트랙 `action-primary`, thumb `surface` + `shadow-raised-button`. 높이는 컨트롤 체계와 맞춰 small 20 / medium 24 [유추]                              |
| **Card**             | `--shadow-card` 토큰만 존재. `bg: surface` · `radius: medium(8)` · padding 24 · 헤더/바디/푸터 구조. **레거시 Material 카드(radius 2px)는 절대 참고하지 말 것**                                        |
| **Avatar**           | 토큰 `surface-avatar`(slate-300), `avatar-deco` 3종 존재. 크기 24 / 32 / 48 · `radius: full` · 1px `avatar-deco` 테두리                                                                                |
| **Divider**          | 매번 인라인 구현됨. 가로 `height: 1px; bg: divide` · 세로 `width: 1px; height: 16px`                                                                                                                   |
| **Skeleton**         | 래퍼만 존재하고 shimmer 애니메이션 없음. `bg: surface-sub` + `radius`를 대상에 맞춰 부여                                                                                                               |
| **Textarea**         | `style_textareaCount`(absolute bottom 8 / right 12)만 확인. 나머지는 §5 Input 규격 준용, `min-height`만 별도                                                                                           |
| **Breadcrumb**       | 원본 없음. `label-medium` + `text-sub`, 구분자 chevron 16px, 현재 항목 `text`                                                                                                                          |
| **ProgressBar**      | **✅ 구현됨 — `src/components/ui/ProgressBar/`.** FileUpload 내부(§19) 스펙을 독립 컴포넌트로 승격: height 4 · `radius: full` · track `surface-slate-secondary` · fill `border-slate`. 아래 §26-1 참조 |

### 26-1. ProgressBar — §19 에서 승격하며 바꾼 것

| §19 스펙                                                                       | 판정                                                 |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| height 4 · radius full · track `surface-slate-secondary` · fill `border-slate` | **그대로**                                           |
| `width: 100%`                                                                  | **바꿈** — 값 텍스트를 뺀 **남는 폭 전부**(`flex-1`) |
| `transition: width 0.1s ease`                                                  | **뺌** — 아래                                        |

> ⚠️ **`transition: width` 를 되살리지 말 것.** 업로드에서는 같은 파일의 진행률이 이어서 오르므로
> 애니메이션이 진실이지만, 표에서는 정렬·페이지 이동 때 React 가 DOM 을 재사용한다.
> 그러면 A행 90% → B행 12% 사이를 막대가 미끄러지며 **일어나지 않은 변화를 애니메이션이 지어낸다.**

**Anatomy** — 루트는 가로 flex · 세로 가운데 · gap 8 (아이콘↔값 사이만 4)

| #   | 요소        | 필수                 | 규격                                                                                        |
| --- | ----------- | -------------------- | ------------------------------------------------------------------------------------------- |
| ①   | 트랙        | ✅                   | `bg-surface-slate-secondary` · height 4 · radius full · `flex-1`                            |
| ②   | 필          | value>0              | `bg-border-slate` / `bg-progress-warning` · radius full · 폭 = value% · **최소 폭 4**       |
| ③   | 주의 아이콘 | `tone="warning"`     | lucide `AlertTriangle` 16 · `strokeWidth 1.2` · `aria-hidden`                               |
| ④   | 값 텍스트   | `showValue`(기본 ✅) | `label-medium` · `text-text` · **`tabular-nums`** · 우측 정렬 · **최소 폭 40**(`100%` 기준) |

- **④ 슬롯 폭 고정이 이 부품의 핵심이다.** 값 폭이 행마다 달라지면 트랙의 끝 x 좌표가 달라져
  **막대 길이 비교가 무너진다.**
- **임계는 부품이 모른다** — `threshold` prop 을 두지 않는다. 극성("미만이면 경고")이 박히면
  이탈률처럼 높을수록 나쁜 지표에 못 쓴다. 판정은 호출부가 하고 부품은 결과인 `tone` 만 받는다.
- **상태는 enabled 하나뿐.** hover/focus/disabled/loading/indeterminate 전부 없다 — 탭이 서지 않고
  어느 조건에서도 버튼이 되지 않는다. 값이 없으면 렌더하지 말고 호출부가 `—` 를 둔다
  (**0%="시작 안 함" 과 미집계="모름" 은 다른 말이다**).
- **경고는 세 채널**(막대 색 · 아이콘 · `aria-valuetext` 덧말)로 전달한다.
  ⚠️ `tone="warning"` 이어도 **④의 글자색은 건드리지 않는다** — `text-warning`(mustard-600)은
  흰 배경 **2.85:1** 로 본문 기준 미달이다.
- 접근성: `role="progressbar"`(`meter` 아님) · `aria-valuemin/max` 명시 · `aria-valuenow` 는
  **반올림하지 않음** · `aria-valuetext` 는 **화면 문자열과 글자 그대로 동일**.

**신규 토큰 `progress-warning`(mustard-700)** — 비텍스트 대비 3:1 을 통과하는 유일한 mustard 단계다.

| 색                                   | 흰 배경  | 트랙(`#e2e5e9`) 위 | 3:1 |
| ------------------------------------ | -------- | ------------------ | --- |
| mustard-500 (`border-warning`)       | 1.91     | 1.51               | ❌  |
| mustard-600 (`text-warning`)         | 2.85     | 2.25               | ❌  |
| **mustard-700 (`progress-warning`)** | **4.62** | **3.66**           | ✅  |
| slate-900 (`border-slate`, 필 기본)  | 17.78    | 14.07              | ✅  |

> `text-warning-hover` 가 마침 mustard-700 이지만 **hover 토큰을 정적 색으로 빌려 쓰면
> hover 를 재매핑하는 날 조용히 깨진다** — 전용 토큰을 만든다(§D7-7 이 `chart-delta-*` 를 만든 것과 같은 처방).

---

## §27. 클론 제외 대상

| 항목                                                                                   | 이유                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------ |
| 레거시 `.card` (radius 2px, shadow `0 1px 3px`)                                        | Material Design 1(2015) — Clay와 정면 충돌 |
| `bootstrap-theme-dashboard.css` 전체                                                   | Bootstrap 3, `.eot` 폰트, 소셜 로그인 버튼 |
| `.help-pane` · `.tutorial_guide` · `.bankda` · `.pg_event_wrap` · `.consulting_banner` | 아임웹 사업 고유 기능                      |
| imTurbo 프로모 배너 (그라디언트 `#8000ff → #08f`)                                      | 프로모션 전용, 디자인 시스템 아님          |
| SocialButton (Naver/Kakao/LINE/FB 브랜드 색)                                           | 브랜드 색 하드코딩 — 필요 시 별도 취급     |
| CodeBlock                                                                              | 대시보드 범위 밖                           |

---

## §28. 차트 `[신규 설계]`

> ⚠️ **원본에 근거가 0인 유일한 섹션이다.** Clay 토큰 정본에 차트 색이 없고,
> `admin.html` 은 Chart.js 1.0.2 를 **로드만** 할 뿐 `new Chart(` 호출·`<canvas>` 가 0건이다.
> 즉 이 저장본에 차트 시각 언어의 선례가 없다. 아래는 실측이 아니라 **우리가 정한 규칙**이다.
> 구현: `src/components/ui/Chart/`

### 28-1. 계열색

별도 파일 `js/web_components/io/index.js` 에서 발견한 `--clay-color-palette-*`
(7계열 × 10단계)가 유일한 단서다. slate 램프가 `vars.css` 와 10/10 일치해 같은 Clay 혈통임이 증명된다.
단 7번째 `imBlue = #1a6dff` 는 **폐기된 색**이라 제외한다.

| #   | 토큰                     | 값                      | 흰 배경 명암비 |
| --- | ------------------------ | ----------------------- | -------------- |
| 1   | `--color-chart-series-1` | blue-600 `#0090d4`      | 3.5            |
| 2   | `--color-chart-series-2` | mint-700 `#009972`      | 3.6            |
| 3   | `--color-chart-series-3` | mango-800 `#99650a`     | 5.0            |
| 4   | `--color-chart-series-4` | grape-500 `#9a4bff`     | 4.4            |
| 5   | `--color-chart-series-5` | raspberry-500 `#fe5868` | 3.1            |

area 면은 같은 계열의 `100` 단계 (`--color-chart-fill-1..5`).

**이 조합은 눈으로 고른 것이 아니라 10만 조합 전수 탐색으로 찾은 것이다.** 통과 조건은
밝기 밴드 · 채도 하한(OKLCH C ≥ 0.10) · 색각이상 분리도(ΔE ≥ 8) · 정상시각 분리도(ΔE ≥ 15) ·
명암비 3:1(WCAG 1.4.11, 차트 선·막대는 "정보 전달에 필수적인 그래픽 객체"라 이 기준을 받는다).

#### 쓰면 안 되는 것

| 대상                     | 이유                                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| **skyblue 램프 전체**    | 어느 단계도 못 쓴다 — 밝은 쪽은 명암비 미달, 어두운 쪽은 채도 붕괴(회색) |
| **원본 대표 단계 500**   | mint·mango 는 흰 배경에서 1.8~1.9 로 명암비 미달                         |
| **slate**                | 무채색이라 채도 하한을 넘지 못한다                                       |
| **시맨틱 색 재사용**     | `success`/`critical`/`warning` 은 상태 전용 — "4번 계열"로 쓰지 않는다   |
| **6번째 계열 자동 생성** | 색을 순환시키지 않는다. 6번째부터는 "기타"로 접거나 차트를 나눈다        |

#### 색 참조 방법 (함정)

Tailwind v4 는 `@theme` 변수 중 **소스에서 실제로 발견된 것만** 출력한다.
반드시 **완전한 문자열**로 쓸 것 — 인덱스로 조립하면 스캔이 놓쳐 배포 CSS 에서 변수가 통째로 사라진다.

```
✅  CHART_SERIES_COLORS[i]            // "var(--color-chart-series-1)" … 배열 상수
❌  `var(--color-chart-series-${i})`  // 스캔 실패 → 변수 소멸
```

### 28-2. 형태

| 요소      | 규격                                                                    |
| --------- | ----------------------------------------------------------------------- |
| 선        | `stroke-width: 2` · `type="monotone"`                                   |
| 마커      | 평상시 없음 · hover 시 r 4(지름 8) + `surface` 링 2                     |
| 막대      | 끝만 radius **4** (`[4,4,0,0]`) · 최대 폭 40 · 누적 시 radius 0         |
| 도넛      | inner 62% / outer 92% · 조각 사이 `surface` stroke **2**                |
| 격자      | **가로선만** · `divide` · 세로 격자 없음                                |
| 축        | 선 `divide` · 눈금 텍스트 `text-sub` 12px · **y축 폭 최소 48**(아래 ⚠️) |
| 기본 높이 | 240                                                                     |

> ⚠️ **48 은 고정값이 아니라 바닥이다.** 한때 고정이었고, 그것이 라벨을 잘랐다 —
> 금액 단위가 붙는 한글 눈금은 전각이라 `10,000만`(7글자)이 48 을 넘얰다.
> 그러면 화면에는 앞글자가 사라진 **`0,000만`** 이 떠서 자릿수가 통째로 틀리게 읽힐다.
>
> 지금은 `Chart.tsx` 의 `yAxisWidth()` 가 **눈금 상한을 포맷해 폭을 계산**한다 — 짧으면 48,
> 길면 필요한 만큼만 늘어난다(`10,000만` → 59).
> recharts 의 `width="auto"` 는 **쓰지 않는다** — 렌더 시점 실측이라 텍스트 측정이 없는 jsdom 에서
> 플롯 영역이 0 이 되어 **차트가 통째로 안 그려진다**(실제로 테스트 7건이 깨졌다).
>
> 막대의 **바닥은 기준선에 붙인다.** 양끝을 둥글리면 값이 기준선에서 떠 보인다.
> 도넛 조각 사이의 2px 표면색 링은 인접한 두 색이 맞닿아 서로를 침범하는 것을 막는다.

### 28-3. 툴팁 · 범례

| 요소        | 규격                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| 툴팁 패널   | padding **16** · gap 8 · `bg: surface` · `shadow-popover` · 경계선 outline |
| ↳ radius    | **`rounded-medium`(8)** — 참조값 2px 이 아니라 Clay 규격을 따른다          |
| ↳ 계열 키   | **10px 원형** (`size-2.5 rounded-full`)                                    |
| 범례 스와치 | **16 × 16** (`size-4`) · 항목 간 gap 8                                     |

### 28-4. 접근성 (선택이 아니라 필수)

- **SVG 는 스크린리더에 내용이 전달되지 않는다.** 차트 프레임에 `role="img"` + `aria-label` 을 붙인다.
- **계열이 2개 이상이면 범례를 항상 노출한다.** 색만으로 식별하게 두지 않는다.
- 증감 지표는 색과 함께 **부호·화살표 아이콘**을 같이 쓴다.
- **텍스트에는 계열색을 입히지 않는다.** 값·라벨·범례 글자는 `text-*` 토큰을 쓰고,
  정체성은 옆에 놓인 색 마크가 담당한다.
- 도넛처럼 조각에 라벨을 얹기 어려운 형태는 **퍼센트 목록을 함께 둔다**(표 대체 수단).

> 이 팔레트는 **tritan(청황 색각이상) 분리도가 4.0으로 낮다.** 위의 보조 수단이
> 장식이 아니라 판독의 전제인 이유다.

### 28-5. 하지 말 것

| 금지                             | 이유                                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| **이중 축**(y축 2개)             | 두 척도를 한 그림에 겹치면 교차점이 우연의 산물이 된다             |
| 색을 **순위**에 배정             | 필터로 계열이 줄면 남은 계열의 색이 바뀐다. 색은 **대상**에 붙인다 |
| 모든 점에 값 라벨                | 라벨은 선택적으로 — 전부 붙이면 아무것도 안 읽힌다                 |
| 무지개 시퀀셜 · 중간색 있는 발산 | 시퀀셜은 한 색상 명암 단계, 발산은 두 색상 + 회색 중간점           |

### 28-6. 이 절이 다루지 않는 것 → `DESIGN-dashboard.md`

§28 은 **차트 그림 안쪽**만 정한다. 그 바깥 — 지표 타일 · 타일 그리드 · 수치 타이포 ·
증감 표현 · 데이터 상태 · 순서(ordinal)·극성(diverging) 색 — 은 **`docs/DESIGN-dashboard.md`**
에 있다. 특히:

- **계열색 5종 외의 색 역할 4가지**(순서 · 극성 · 약화 · 구조물) → §D7
- **차트는 `surface`(흰 카드) 위에 놓는다** — 계열 5는 `surface-sub` 에서 3:1 미달 → §D7-9
- **상태색이 계열 5를 사칭한다**(critical ↔ raspberry ΔE 10.2) → §D7-8

---

## §29. 폼 레이아웃

> 실측 정본: `brand-admin/_astro/client-provider.hjDLpAAS.css` (2026-08-19 전수 조사).
> **`[확장]` 표시가 붙은 것만 우리가 설계한 것이고, 나머지는 전부 원본 실측이다.**
> 구현: `src/components/ui/FormField/`

### 29-1. 간격 (전부 실측)

| 구간                        | 값                      | 근거 클래스                                          |
| --------------------------- | ----------------------- | ---------------------------------------------------- |
| 라벨 ↔ 입력                 | **6**                   | `cardBodyItem_column` 외 **7개 wrapper 계열이 동일** |
| 입력 ↔ 도움말               | **6**                   | `textfieldHelperTextWrapper`                         |
| 라벨 텍스트 ↔ 라벨 부연설명 | **4**                   | `cardItemLabel`                                      |
| 필드 ↔ 필드                 | **20** (모바일 24)      | `cardBody_pc` / `cardBody_mobile`                    |
| 카드 ↔ 카드                 | **24** (모바일 8)       | `container_pc` / `container_mobile`                  |
| 카드 내부 padding           | **24**                  | `formEditSkeletonWrapper`                            |
| 카드 헤더 ↔ 바디            | **24**                  | `cardHeaderWrapper` (`padding-bottom`)               |
| 라벨 옆 **툴팁**            | 가로 **4** · center     | `cardItemLabelTooltip`                               |
| 라벨 옆 **버튼**            | 가로 **8** · `flex-end` | `cardItemLabelButtonWrapper`                         |
| 라벨 행 액션 (양끝)         | **8** · `space-between` | `labelActions`                                       |
| 체크박스 행                 | gap **8** · `py-0.5`(2) | `checkboxWrapper`                                    |
| 체크박스 하위 "기타" 입력   | `margin-left` **24**    | `etcTextfield`                                       |

> ⚠️ **모바일에서 두 값이 뒤집힌다.** 필드 간격은 늘고(20→24) 카드 간격은 줄어든다(24→8).
> 좁은 화면에서는 카드가 사실상 붙고 필드가 벌어지는 리듬이다.
>
> ⚠️ **모달 안의 폼은 라벨↔입력이 6이 아니라 8이다** (`formEditModalBox`). 일반 폼과 다르다.

### 29-2. 세로 배치 (기본)

```
라벨 [*] [부연설명]        ← 라벨 내부 gap 4
   ↕ 6
[    입력 컨트롤    ]
   ↕ 6
도움말 또는 에러            ← 같은 자리를 공유한다 [확장]
```

`flex-direction: column; gap: 6` — `cardBodyItem_column`.

### 29-3. 가로 배치

**존재한다.** `cardBodyItem_row` 는 `_column` 과 **동급 변형**이며,
`@media (max-width: 991px) { flex-wrap: wrap }` 전용 규칙까지 갖는다
(이 파일의 **유일한 미디어쿼리** — 폼 규칙 중 유일하게 반응형 처리를 받는 것이 가로 배치다).

| 항목       | 값                                |
| ---------- | --------------------------------- |
| 컨테이너   | `flex` · `align-items: center`    |
| gap        | **row 24 / column 12**            |
| 라벨       | `flex: 1` (남는 폭을 라벨이 점유) |
| 991px 이하 | `flex-wrap: wrap`                 |

**언제 쓰나** — 실측 사례가 셋이다.

- **Switch 행**: `switchWrapper` = `space-between` · gap 8 → 토글은 가로가 정상이다
- **옵션 행**: `cardLabelOptionItem` = `space-between` · `padding-block: 8`
- **고정폭 정보 라벨**: `infoLabel` = `width: 80` · `flex-shrink: 0` (상세 화면용)

> 이전 문서에 "가로 라벨은 Clay에 존재하지 않으므로 도입 금지"라고 적혀 있었으나 **사실 오류였다.**

### 29-4. 2열 배치는 만들지 않는다

원본에 폼 2열 규칙이 **없다** — `grid-template-columns` 는 전체 CSS 에서 1건(달력 캡션)이고
`width:50%` · `flex-basis` · `calc(50%` 는 **0건**이다.

대신 원본은 **한 필드 안에서 컨트롤을 병치**한다. 이 패턴을 쓴다.

| 목적        | 패턴                                         | 근거                       |
| ----------- | -------------------------------------------- | -------------------------- |
| 균등 분할   | 래퍼 `flex gap-2` + 각 항목 `flex-1 min-w-0` | `dateWrapper` / `dateItem` |
| 짧은 고정폭 | `width: 120` 등 고정                         | `nationSelect`             |

`min-w-0` 을 빠뜨리면 flex 아이템의 자동 최소 크기(`min-width:auto`) 때문에 축소되지 않는다.

> ⚠️ **`min-w-0` 만으로 무한히 줄지는 않는다.** 그것은 **그 요소 자신**의 자동 최소 크기를 없앨 뿐이고,
> 자식 `Input` 의 래퍼가 **`min-w-60`(240 · §5 실측)** 을 갖는다. 따라서 **각 칸의 실질 최소 폭은 240**,
> 2칸 병치에는 `240×2 + 8 = 488px` 이상이 필요하다. 우리 셸(콘텐츠 폭 최소 ~670)에서는 여유가 있지만,
> 더 좁은 컨테이너(모달·사이드시트 등)에 병치하려면 **`Input` 쪽에 병치용 API 가 필요하다(미구현).**

### 29-5. 설계로 채운 것 `[확장]`

원본에 규칙이 **전혀 없어** 우리가 정했다.

| 항목            | 결정                                                           | 비고                                    |
| --------------- | -------------------------------------------------------------- | --------------------------------------- |
| **필수 표시**   | 라벨 뒤 `*` · `text-critical`                                  | 시각 표시는 `aria-hidden`,              |
|                 |                                                                | 의미는 컨트롤의 `aria-required` 가 전달 |
| **에러 메시지** | **도움말과 같은 자리에서 교체** (gap 6 유지) · `text-critical` | 레이아웃이 밀리지 않고 시선이 안 흩어짐 |
| **라벨 타이포** | `label-medium-bold` (14/24/600)                                | ⚠️ 아래 주의                            |
| **2열 그리드**  | **도입 안 함** (§29-4)                                         |                                         |

> ⚠️ **라벨 타이포는 정황 근거에서 의도적으로 이탈했다.** 저장본에 brand-admin 렌더 HTML 이 없어
> CSS 만으로는 판정이 불가능한데, Clay 입력 컨트롤이 정확히 `label-medium`(14/24/**400**)이라
> 라벨도 400일 가능성이 높다. 그러나 그러면 **라벨과 입력값의 무게가 같아져** 필드가 15개 넘는
> 긴 폼에서 라벨이 색인 역할을 못 한다. 스캔성을 위해 **600을 택했다.**
> 원본 렌더 HTML 을 확보하면 이 결정을 재검토할 것.

에러 색은 원본에 있다 — `[aria-invalid="true"]` 일 때 `--clay-text-critical`(#ed1515). 위치·타이포만 우리 설계다.

### 29-6. 기록하되 적용하지 않은 실측

| 실측                             | 값      | 적용 안 하는 이유                                    |
| -------------------------------- | ------- | ---------------------------------------------------- |
| `.style_form { padding-bottom }` | **200** | **하단 고정 저장 바를 전제한 값**이다. 저장 액션을   |
|                                  |         | PageHeader 에 두는 우리 구조에서는 빈 공간만 생긴다. |
|                                  |         | 하단 고정 바를 도입하면 그때 함께 적용할 것.         |

### 29-6b. 그룹 컨트롤은 `<label for>` 로 이름이 붙지 않는다

`<label for>` 는 **labelable 요소**(`input`·`textarea`·`select`·`button` 등)만 가리킬 수 있다.
`RadioGroup`·`SegmentedControl` 의 루트는 `<div role="radiogroup">` 이라 `for` 가 성립하지 않고,
그 결과 **그룹에 접근가능 이름이 아예 없는 상태**가 된다(스크린리더가 "라디오 그룹"으로만 읽음).
WCAG 1.3.1 · 4.1.2 위반이다.

→ `FormField` 에 **`group`** 을 켜면 라벨을 `<span id>` 로 렌더하고 `aria-labelledby` 로 잇는다.

| 자식                                           | 필요한 것          |
| ---------------------------------------------- | ------------------ |
| `Input` · `Textarea` · `Select` · `DatePicker` | 기본값 (label for) |
| `RadioGroup` · `SegmentedControl`              | **`group`**        |

> 이 결함은 화면상으로는 전혀 드러나지 않는다 — 라벨이 멀쩡히 보이기 때문이다.
> **`getByRole("radiogroup", { name })` 이 찾지 못하는 것으로만 확인된다.**

### 29-7. 하지 말 것

| 금지                              | 이유                                                    |
| --------------------------------- | ------------------------------------------------------- |
| `<label>` 안에 도움말·설명을 넣기 | **접근성 이름에 섞인다.** 이름은 라벨 텍스트에 고정하고 |
|                                   | 설명은 `aria-describedby` 로만 전달할 것                |
| 도움말과 에러를 동시 표시         | §29-5 결정 — 같은 자리에서 교체한다                     |
| 폼 2열 grid                       | §29-4 — 원본에 근거가 없다. `flex-1` 병치를 쓸 것       |
| 가로 라벨을 "원본에 없다"고 배제  | 있다. §29-3                                             |

---

## §30. InfoList (상세 정보 블록)

> 실측 정본: `brand-admin/_astro/client-provider.hjDLpAAS.css:928-950`.
> 구현: `src/components/ui/InfoList/`

### 30-1. 실측

| 요소        | 스펙                                                                        |
| ----------- | --------------------------------------------------------------------------- |
| `infoList`  | `flex-direction: column` · padding **16** · gap **8** ·                     |
|             | **`background: surface-sub`** · `border-radius: medium(8)`                  |
| `infoItem`  | `display: flex` · **`align-items: center`** · gap **10**(`--clay-space-25`) |
| `infoLabel` | **`width: 80`** · `flex-shrink: 0`                                          |

> ⚠️ **`InfoList` 는 단순 `<dl>` 이 아니라 회색 박스다.** 문서에 오래 "라벨 80px 고정"만
> 적혀 있어서 배경·padding·radius 가 빠진 채로 구현돼 있었다(2026-08-19 정정).
>
> ⚠️ 라벨↔값 gap 은 **10**이다. 6도 8도 12도 아니다 — Clay space 스케일의 `space-25`.

### 30-2. 마크업

시맨틱은 `<dl>` / `<dt>` / `<dd>`. 라벨이 스크린리더에 **term** 으로, 값이 **definition** 으로 읽힌다.

```
<dl class="…">                    ← InfoList
  <div class="flex items-center gap-2.5">   ← InfoItem
    <dt class="w-20 shrink-0">주문번호</dt>
    <dd>ORD-2026-0142</dd>
```

`<dl>` 안에서 `<dt>`+`<dd>` 쌍을 `<div>` 로 묶는 것은 HTML5 에서 허용된다.

### 30-3. 라벨 폭

기본 **80** 고정이다. 라벨이 넘칠 때만 `labelWidth` 로 덮는다(예: "배송 메시지" → 96).

> `cn()` 은 클래스를 병합하지 않으므로 **기본값일 때만 `w-20` 을 방출**하고
> `labelWidth` 를 주면 인라인 `style.width` 만 쓴다. 같은 속성을 두 곳에서 내보내면
> 스타일시트 순서가 승자를 정해 버린다(design-core 함정).

### 30-4. 상세 페이지 레이아웃 `[확장]`

**원본에 상세 페이지 레이아웃 근거가 없다.** 카드를 세로로 쌓는 **1열 스택**으로 정했다 —
Clay 원본이 전부 flex column 이고, 폼에서 2열 grid 를 도입하지 않기로 한 결정(§29-4)과도 어긋나지 않는다.

간격은 컨테이너가 준다: `AppShell` gap-6(카드 24) · `CardBody` gap-5(20) · `InfoList` gap-2(항목 8).

### 30-5. 금액 내역은 InfoList 가 아니다

결제 금액 나열은 **라벨-값이 아니라 좌우 대비**가 목적이라 `justify-between` 목록으로 따로 짠다.
§7 의 "표 셀은 좌측 정렬" 규칙은 **표**에 대한 것이라 여기 적용되지 않는다 — 숫자를 세로로
비교해야 하므로 값을 우측에 붙인다. 합계는 `Divider` 아래에 `heading-medium-bold` 로 둔다.
