# design-core.md — 디자인 핵심 규칙 (상시 로드용)

<!-- ⚠️ 사용 규칙 (Claude Code 필독)
이 파일은 아래 3개 문서와 한 쌍으로 사용한다.
- 이 파일 = 항상 지켜야 하는 핵심 규칙 요약 (색상/타이포/크기/라디우스/그림자/모션)
- docs/token-architecture.md = 토큰 구조와 정식 어휘 — 값의 원천
- docs/DESIGN_참고.md = 언제 무엇을 쓰는가 (사용 맥락·조합 규칙·Don'ts)
- docs/DESIGN.md = 상세 사전. 어떤 UI 컴포넌트든 만들거나 수정하기 전에
  반드시 해당 섹션을 Read하고 그 수치를 그대로 적용한다.
- 문서에 없는 값은 임의로 만들지 않는다.
-->

> **기준: 데스크톱 관리자 대시보드.** 브레이크포인트 992px(데스크톱) / 588px(모바일 경계).
> 모든 값의 원천은 아임웹 **Clay 디자인 시스템**이다.
> (대조했던 원본 사본 `_reference/` 는 **2026-08-29 저장소에서 삭제**했다 — 서드파티 자산이라
> 공개할 수 없다. 아래 수치들은 그 대조의 **결과물**이고, 지금은 이 문서가 원천이다.)
> 라이트 테마만 구현한다(다크 정의는 `token-architecture.md` §5에 보존).

## 색상 — Semantic 토큰만 (임의 hex 금지 · Primitive 직접 사용 금지)

> ⚠️ **Primary는 파랑이 아니라 near-black이다.** 아임웹의 주요 액션 색은
> `action-primary` = slate-900 `#15181e`. 파랑(`#00b9ff`)은 **accent/링크 전용**이며
> 주요 버튼에 쓰지 않는다. 레거시 `#1a6dff`는 폐기된 구 브랜드 색 — 절대 사용 금지.

- **액션**: `action-primary`(주 버튼·선택 상태) / `action-accent`(강조·링크) / `action-secondary`(흰 배경 아웃라인 버튼) / `action-critical`(파괴적) — 각각 `-hover` `-pressed` `-disabled` 보유
- **Tonal 변형**: `action-{primary|accent|critical}-tonal` — 옅은 배경 버튼·선택된 리스트 항목
- **표면**: `bg`(페이지 `#edf0f4`) / `surface`(카드·흰 면) / `surface-sub`(옅은 톤 `#f8f9fb`) / `surface-inverse`
- **상태 표면**: `surface-{critical|warning|success|highlight}-{primary|secondary}`
- **텍스트**: `text` / `text-sub` / `text-minimal` / `text-disabled` / `text-secondary` / `text-inverse` / `text-on`
- **아이콘(텍스트와 별도 계열)**: `icon` / `icon-sub` / `icon-minimal` / `icon-disabled` / `icon-secondary`
- **라인**: `border` / `border-hover` / `border-sub` / `border-minimal` / `divide`(테이블·구분선)
- **레이어**: `layer` `layer-hover` `layer-selected` / `overlay`(딤) `overlay-sub`
- Tailwind는 semantic 유틸리티만: `bg-surface`, `text-text-sub`, `border-border`, `bg-action-primary`.
  `bg-slate-900`·`text-blue-500` 같은 Primitive 클래스 **금지**.

## 타이포 (Pretendard · weight 400/500/600/700)

**임의 크기 금지.** 아래 프리셋 클래스 **27종**이 정본이다 (`src/styles/tokens.css`의 `@utility`).
일반 24종 + 대시보드 수치 전용 `metric-*` 3종.

| 계열    | 클래스                   | 크기/행간   | 용도                      |
| ------- | ------------------------ | ----------- | ------------------------- |
| Heading | `heading-2xlarge-bold`   | 24 / 32     | 페이지 제목               |
|         | `heading-xlarge-bold`    | 20 / 28     | 섹션 제목                 |
|         | `heading-large` `-bold`  | 18 / 28     | 단독·대형 카드 제목       |
|         | `heading-medium` `-bold` | 16 / 24     | **카드 제목 기본**·소제목 |
| Body    | `body-large` `-bold`     | 16 / 24     | 본문(큼)                  |
|         | `body-medium` `-bold`    | **14 / 20** | **기본 본문**             |
|         | `body-small` `-bold`     | 12 / 16     | 캡션·설명                 |
| Label   | `label-large` `-bold`    | 16 / 24     | 큰 버튼                   |
|         | `label-medium` `-bold`   | **14 / 24** | **버튼·인풋·메뉴 기본**   |
|         | `label-small` `-bold`    | 12 / 16     | 작은 버튼·태그            |
|         | `label-xsmall`           | 11 / 12     | 배지·최소 라벨            |
| Metric  | `metric-large`           | 36 / 44     | 대시보드 대표 수치        |
|         | `metric-medium`          | 30 / 36     | 지표 타일 수치            |
|         | `metric-small`           | 24 / 32     | 좁은 타일·보조 수치       |

> **metric-\* 는 수치 전용이다.** 지표 타일의 **값**에만 쓴다 — 라벨·단위·제목에 쓰지 않는다.
> 상세는 `docs/DESIGN-dashboard.md`.
>
> **body vs label**: 같은 14px라도 문단은 `body-medium`(행간 20), 인라인 UI 텍스트는 `label-medium`(행간 24).
> 확장 스케일(`heading-3xlarge~5xlarge`, `label-3xlarge`, `label-xlarge`)은 대시보드에서 거의 쓰지 않는다.

## 크기 체계

- **컨트롤 높이 4단**: **48 / 40 / 32 / 28** (large/medium/small/xsmall)
  → 버튼·아이콘버튼·토스트·소셜버튼 공통. 토큰: `--size-control-*`
- **고정 높이**: 인풋·셀렉트 트리거 **40** / 테이블 행 **48** / 페이지네이션 버튼 **32** / GNB 메뉴 **32**(모바일 44) / 캘린더 날짜 40
- **레이아웃**: GNB 확장 **224** · 축소 **60** · 모바일 드로어 **280** / 페이지 헤더 **72**(컴팩트 52) / 페이지 좌우 gutter **40**(컴팩트 16) / SideSheet **380**
- **아이콘**: GNB·인라인 **20**, 대형 버튼 **24**, 소형 **16**, 빈 상태 **72**(작은 빈 상태 48)
- **Spacing**: `--spacing: 4px` 기반 4px 그리드. Tailwind 유틸 그대로 — `p-2`(8) `gap-3`(12) `p-4`(16) `gap-6`(24).
  주요 리듬은 **4 / 8 / 12 / 16 / 24**이며 8이 가장 흔하다.

## 라디우스

| 토큰                       | 값     | 사용처                                            |
| -------------------------- | ------ | ------------------------------------------------- |
| `rounded-full`             | 999999 | 배지·태그·토스트·탭 인디케이터·캘린더 날짜·진행바 |
| `rounded-xlarge`           | 16     | 모달 컨테이너                                     |
| `rounded-large`            | 12     | SideSheet·DatePicker 패널·드롭다운 레이어         |
| `rounded-medium` (=`base`) | **8**  | **기본값** — 버튼(m/l)·인풋·팝오버·카드           |
| `rounded-small`            | **6**  | 소형 버튼(s/xs)·GNB 메뉴 항목·리스트 아이템       |
| `rounded-xsmall` / `none`  | 1 / 0  | 특수                                              |

> **규칙**: 컨트롤이 작아지면 radius도 함께 축소한다(8 → 6).

## 그림자

`shadow-popover`(작은 팝오버) · `shadow-layer`(드롭다운·셀렉트·캘린더) · `shadow-modal` · `shadow-toast` · `shadow-card` · `shadow-page-side`(SideSheet) · `shadow-raised-button`(세그먼트 thumb) · `shadow-gnb`(사이드바)

## 경계선 · 포커스 (중요)

**border를 쓰지 않고 `outline` + 음수 offset으로 그린다.** 상태 전환 시 레이아웃이 밀리지 않게 하기 위한 의도적 규칙이다.

```css
/* 기본 */
outline: 1px solid var(--color-border);
outline-offset: -1px;
/* hover */
outline-color: var(--color-border-hover);
/* focus */
outline-width: 2px;
outline-offset: -2px;
outline-color: var(--color-focus);
```

- `--color-focus`는 **slate-900**(파랑 아님). 강조 포커스가 필요할 때만 `focus-accent`.
- 하단 구분선은 `box-shadow: inset 0 -1px 0 0 var(--color-divide)` 방식(PageHeader 등).

## 모션

| 대상                             | duration | easing                                        |
| -------------------------------- | -------- | --------------------------------------------- |
| 상태 색 변화(hover·pressed)      | **0.1s** | `ease-in-out`(표면) / `ease-out`(버튼)        |
| 이동·변형(슬라이드·회전)         | **0.2s** | `linear`(SideSheet) / `ease-in-out`(아코디언) |
| 콘텐츠 전환(탭 색·토스트·페이드) | **0.3s** | `ease-out`                                    |
| 테이블 행 hover                  | 0.2s     | —                                             |
| 스피너                           | 1s       | `linear infinite`                             |

## z-index (4단 고정)

`--z-header: 8000` → `--z-sidesheet: 9000`(GNB 축소 부유·드로어·딤) → `--z-modal: 10000` → `--z-toast: 11000`

## 필수 규칙

1. **loading ≠ disabled** — 로딩 버튼은 배경만 `pressed`로 바꾸고 텍스트·아이콘 색은 원래대로 유지한다.
2. **테이블 zebra**: 홀수 행 `surface`(흰색), 짝수 행 `surface-sub`. 행 높이 48, 첫/마지막 셀만 좌우 패딩 24.
   **열 정렬 — 배지만 들어가는 열은 `align="center"`, 그 외는 전부 좌측**(수치도 좌측이다. **우측 정렬은 쓰지 않는다**). `TableTh`·`TableTd`를 함께 바꾸고, 셀 안에 flex가 있으면 `justify-*`도 같이 고친다(`text-align`은 flex 자식에게 안 먹는다). 예외·판정 기준: `DESIGN.md` §7-2.
   **열 폭은 `%`가 아니라 px다** — 원본 `minWidth`를 4px 격자로 옮긴 값이고, `sticky left-*`는 **앞 열 폭의 누적합**이라 폭을 고치면 함께 고쳐야 한다. `DESIGN.md` §7-1-1.
3. **선택 상태 2종**: 강한 선택 = `action-primary`(배경 near-black + `text-inverse`) / 약한 선택 = `action-primary-tonal`.
   ⚠️ **단, 바탕이 `surface-sub`이고 hover가 있는 곳에서는 약한 선택에 `action-primary-tonal`을 쓰지 않는다.**
   `action-primary-tonal`은 `rgba(113,118,128,0.1)`이라 흰 배경 위에서 `#f1f1f2`가 되는데,
   `surface-sub`(`#f8f9fb`)와는 **2.4%**밖에 차이가 안 나면서 hover인 `surface-slate-secondary`(`#e2e5e9`)보다는 **밝다.**
   즉 마우스만 올린 것이 골라 둔 것보다 진해져 **선택 신호가 hover에 진다.**
   이 경우 **선택은 테두리(`outline-action-primary`), hover는 면**으로 갈라 서로 다른 축을 쓰게 한다.
   해당 사례: 목록 화면의 "건수 카드 = 필터" 대시(10화면). 되돌리지 말 것.
4. **GNB 축소 모드는 컨테이너 쿼리로 구현**한다(`container-type: inline-size`, `≤60px`). hover 확장이 컨테이너 폭 기준이라 미디어쿼리로 대체 불가.
5. 색만으로 의미 전달 금지 — 아이콘/텍스트 병행.
6. 다크모드 값은 토큰에 넣지 않는다(구조만 보존). 컴포넌트에 `dark:` 분기 금지.
