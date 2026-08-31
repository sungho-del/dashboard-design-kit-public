# token-architecture.md — 토큰 아키텍처

> 이 문서는 "토큰이 **어떻게 구성**되는가"를 규정한다.
>
> - "값이 **무엇**인가" → `src/tokens/_generated.css` (자동 생성, 이 아키텍처의 산출물)
> - "언제 무엇을 쓰는가" → `docs/DESIGN_참고.md`
> - "컴포넌트 상세 수치" → `docs/DESIGN.md`
>
> **원천**: 아임웹 Clay 디자인 시스템 `_reference/vhf535763542.imweb.me/design-system/clay/vars.css`

## 0. 한눈에

```
tokens/primitive/*.json   ← 원시 스케일 (slate·blue·coral-red… / radius · text · shadow)
        │  Style Dictionary 참조 {color.blue.500}
        ▼
tokens/semantic/*.json    ← 의미 토큰 (action-primary, text-sub, surface-sub …)
        │  npm run build:tokens
        ▼
src/tokens/_generated.css ← @theme 블록 (362개 CSS 변수)
        │  @import  (src/styles/tokens.css)
        ▼
Tailwind 유틸리티          ← bg-surface, text-text-sub, rounded-medium, p-2 …
        │
        ▼
컴포넌트                   ← semantic 색상 + Clay 치수만 사용
```

## 1. 색상은 2층, 치수는 1층 (설계 결정)

Clay 자체가 이 구조다. 그대로 따른다.

| 계층      | 색상                                                            | 치수(spacing·radius)                            |
| --------- | --------------------------------------------------------------- | ----------------------------------------------- |
| Primitive | slate/blue/neon-green/coral-red/mustard/pink/neon-purple + tint | —                                               |
| Semantic  | action-_, surface-_, text-_, border-_ …                         | radius-small/medium/large… (의미 이름이 곧 1층) |

**왜 치수에 의미층을 더 두지 않았나**: Clay는 `space-2`(8px), `rounded-medium`(8px)을 컴포넌트가 직접 참조한다.
여기에 `spacing-sm/md/lg` 같은 층을 덧대면 아임웹 실측 수치와 1:1 대조가 불가능해져 클론 정확도가 떨어진다.

**절대 규칙**: 컴포넌트는 **Semantic 색상만** 사용한다. Primitive(`bg-slate-900`, `var(--color-blue-500)`)를 직접 쓰지 않는다.

## 2. Primitive 계층 (`tokens/primitive/`)

### 2-1. `color.json` — 9팔레트 + tint

각 팔레트는 `50~900` 10스텝 + `tint-5/10/15/20`(투명도 오버레이).

> 차트 계열색은 **별도 파일** `chart-palette.json` 에 있다(4팔레트: mint·mango·grape·raspberry).
> UI 색과 데이터 시각화 색은 하는 일이 달라 파일을 갈랐다 — 규격: `DESIGN-dashboard.md` §D7.

| 팔레트        | 500 값    | 역할                                                          |
| ------------- | --------- | ------------------------------------------------------------- |
| `slate`       | `#717680` | 중립 — 텍스트·보더·표면 전반. **900 `#15181e`이 주요 액션색** |
| `blue`        | `#00b9ff` | accent — 링크·강조. **주 버튼 아님**                          |
| `neon-green`  | `#00e600` | 성공                                                          |
| `coral-red`   | `#ff4040` | 위험·에러                                                     |
| `mustard`     | `#ffaa00` | 주의                                                          |
| `pink`        | `#ff50da` | NEW 배지 등                                                   |
| `neon-purple` | `#cd28fd` | 특수 강조                                                     |

추가: `slate.black/white` · `canvas.base`(`#edf0f4` 페이지 배경) · `dim.light/strong/toast`(딤·토스트 배경)

> `tint`는 hex가 아니라 `rgba(팔레트500, 0.05~0.85)` — 어떤 배경 위에서도 자연스럽게 겹치게 하기 위함.
> `slate.tint`만 기준색이 `rgba(113,118,128)`(=slate-500)이다.

### 2-2. `dimension.json`

- `spacing`: **단일 값 `4px`**. Tailwind v4가 이 값을 배수로 계산해 `p-1`(4) `p-2`(8) `p-2.5`(10) `p-6`(24)… 전 스케일을 생성한다. Clay의 space 스케일(0/1/2/4/6/8/10/12/16/20/24/28/32/40/48/64/80/96/112/128/160)과 정확히 일치한다.
- `radius`: none 0 · xsmall 1 · small **6** · base·medium **8** · large 12 · xlarge 16 · full 999999
- `border`: 1 / 2 / 4 / icon 1.2
- `divide`: x / y = 1px
- `z`: header 8000 · sidesheet 9000 · modal 10000 · toast 11000

### 2-3. `typography.json`

- `text`: 2xsmall 11 · xsmall 12 · small 14 · base 16 · large 18 · xlarge 20 · 2xlarge 24 · 3xlarge 30 · 4xlarge 36 · 5xlarge 48
- `leading`: 3~~15 (12~~60px, 4px 간격) + normal 150% · relaxed 162.5% · loose 200%
- `font-weight`: normal 400 · medium 500 · semibold 600 · bold 700
- `font`: `base` / `large` / `code`

> **폰트 대체**: Clay 원본은 본문에 아임웹 독점 폰트 `imweb Sans`, 제목에 `Pretendard`를 쓴다.
> `imweb Sans`는 재배포 라이선스가 불명확해 **`font-base`·`font-large` 모두 Pretendard(OFL)로 단일화**했다.
> 두 토큰을 남겨둔 이유는 나중에 본문 폰트만 교체할 수 있게 하기 위함이다.

### 2-4. `shadow.json`

`none` · `popover` · `layer` · `modal` · `toast` · `card` · `page-side` · `raised-button` · `gnb`

> `gnb`는 Clay 토큰에 없던 하드코딩 값(`0 4px 4px #0000000a, 0 0 8px #0000000a`)을 토큰으로 승격한 것이다.

## 3. Semantic 계층 (`tokens/semantic/`) — 정식 어휘

> `tokens/semantic/` 에는 `color.json` `dimension.json` 외에 **차트 2종**이 더 있다:
> `chart.json`(계열색 5 + 면 5) · `dashboard.json`(구조물·순서·극성·약화·증감 19종).
> 규격: `DESIGN-dashboard.md` §D7.

### 3-1. `color.json` (9그룹)

| 그룹          | 토큰 예                                                                                                                                           | 용도                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 표면          | `surface` `surface-sub` `surface-inverse` `surface-{critical\|warning\|success\|highlight}-{primary\|secondary}` `surface-toast` `surface-avatar` | 카드·패널·상태 배경  |
| 입력면        | `field` `field-sub` `field-disabled`                                                                                                              | 인풋 배경            |
| 포커스        | `focus`(slate-900) `focus-accent`                                                                                                                 | 포커스 링            |
| 액션          | `action-{accent\|primary\|secondary\|critical}` + `-hover` `-pressed` `-disabled`, 각 `-tonal` 4종, `action-toggle`                               | 버튼·인터랙티브      |
| 레이어        | `layer` `layer-hover` `layer-sub` `layer-selected`                                                                                                | 드롭다운·리스트 면   |
| 딤            | `overlay` `overlay-sub`                                                                                                                           | 모달 배경            |
| 보더          | `border` `-hover` `-sub` `-minimal` `-critical` `-warning` `-success` `-highlight` `-slate`                                                       | 경계선               |
| 구분          | `divide` `divide-sub` `divide-minimal`                                                                                                            | 테이블·리스트 구분선 |
| 텍스트/아이콘 | `text-*` 15종 / `icon-*` 15종 / `avatar-deco-*` 3종                                                                                               | 전경색               |

### 3-2. `dimension.json`

- `size-control-{xsmall\|small\|medium\|large}` = 28 / 32 / 40 / 48
- `size-gnb-{expanded\|collapsed\|drawer}` = 224 / 60 / 280
- `size-page-header`(72) `-compact`(52) · `size-page-gutter`(40) `-compact`(16)
- `size-table-row`(48) · `size-sidesheet`(380)
- `breakpoint-tablet`(588) `-desktop`(992)

> 이 치수들은 Clay 토큰에 없다. 레거시 `dashboard.css`와 신규 `container.css` 실측에서 추출해 토큰화한 것이다.

## 4. 빌드 파이프라인

```
tokens/**/*.json
   → npm run build:tokens  (style-dictionary.config.mjs)
   → src/tokens/_generated.css   (@theme { … }, outputReferences: true)
   → src/styles/tokens.css 가 @import  →  Tailwind v4 유틸리티 생성
```

**커스텀 설정 2가지** (`style-dictionary.config.mjs`):

1. **`name/clay` transform** — 기본 `name/kebab`은 lodash `kebabCase`라 숫자·문자 경계를 쪼갠다(`text.2xsmall` → `--text-2-xsmall`). 토큰 키를 이미 kebab으로 작성하므로 path를 그대로 이어 붙인다 → `--text-2xsmall`.
2. **`css/clay` transformGroup** — 기본 `css` 그룹의 `size/rem`을 제외해 **px를 유지**한다. Clay는 관리자 대시보드용이라 모든 치수가 px 고정이다.

- **`_generated.css` 직접 수정 금지.** 값 변경은 `tokens/*.json` 수정 → `npm run build:tokens`.
- 타이포 프리셋(`@utility heading-*` 등)과 `@font-face`는 토큰으로 표현할 수 없어 `src/styles/tokens.css`에 수기 관리한다.

### 주의: 토큰 키 충돌

Style Dictionary는 모든 소스를 deep merge한다. **primitive의 그룹명과 semantic의 leaf 토큰명이 겹치면 leaf가 그룹을 덮어써 하위 참조가 전부 깨진다.**
실제로 `color.overlay`(semantic leaf)가 `color.overlay.{light,strong,toast}`(primitive 그룹)를 덮어써 빌드가 실패했고, primitive를 `color.dim.*`으로 개명해 해결했다.
→ 새 토큰 추가 시 primitive 그룹명과 semantic 토큰명이 겹치지 않는지 확인할 것.

## 5. 다크모드 — 구조만 보존

Clay는 라이트/다크 2벌을 모두 정의하지만, **실제 아임웹 관리자는 `data-clay-theme="light-only"`로 고정 운영**하므로 라이트만 구현했다.

전환이 필요해지면: semantic→primitive `var()` 참조가 CSS 런타임까지 유지되므로, **다크용 semantic 값 세트만 추가**하면 컴포넌트 수정 없이 전환된다. 다크 값 원본은 `vars.css` 343~462줄에 있다.
→ 컴포넌트 코드에 `dark:` 분기 색상 **금지**.

## 6. Clay 원본명 → 프로젝트 토큰명 매핑

| Clay 원본                          | 프로젝트                             | 비고                       |
| ---------------------------------- | ------------------------------------ | -------------------------- |
| `--clay-slate-900`                 | `--color-slate-900`                  | 접두사만 교체              |
| `--clay-neonGreen-500`             | `--color-neon-green-500`             | camelCase → kebab          |
| `--clay-coralRed-tint-10`          | `--color-coral-red-tint-10`          | 〃                         |
| `--clay-action-primaryTonal-hover` | `--color-action-primary-tonal-hover` | 〃                         |
| `--clay-rounded-medium`            | `--radius-medium`                    | 그룹명 rounded → radius    |
| `--clay-space-2`                   | `p-2` / `gap-2` (Tailwind)           | `--spacing: 4px` 기반 계산 |
| `--clay-text-2xsmall`              | `--text-2xsmall`                     | 동일                       |
| `--clay-dropShadow-layer`          | `--shadow-layer`                     | 그룹명 dropShadow → shadow |
| `--clay-zIndex-modal`              | `--z-modal`                          | 그룹명 zIndex → z          |
| `--clay-bg`                        | `--color-bg`                         | 값 `#edf0f4`               |
| `--clay-overlay`                   | `--color-overlay`                    | primitive는 `color.dim.*`  |

## 7. 폐기된 것 (절대 사용 금지)

- **`#1a6dff`** — 레거시 `dashboard.css`에 137회 등장하는 **구 브랜드 블루**. 현행 Clay에서 폐기됨.
- **`--clay-color-palette-*` / `--clay-color-semantic-*` (imBlue·raspberry·mango·mint)** — `gnb.BZBi7U3h.css`에 정의만 있고 참조하는 컴포넌트가 없는 마이그레이션 잔재. slate tint 값도 정본과 미세하게 다르다(`rgba(115,120,130)` vs 정본 `rgba(113,118,128)`).
- **레거시 `:root` 브리지 변수 22개** — `dashboard.css` 상단에서 Clay 값을 hex로 복사해둔 수동 스냅샷.
- 이전 프로젝트의 모바일 커머스 토큰(`--color-primary` `#2962FF`, `--color-fg-muted`, `--spacing-page` 등) — 전면 교체됨.
