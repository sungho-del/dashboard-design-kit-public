---
name: design-section26-inferred-specs
description: DESIGN.md §26 의 [유추] 한 줄 지침은 미측정이라 그대로 믿으면 안 된다 — 승격할 때 검증하고 바뀐 것을 §26-N 로 기록하는 것이 이 저장소의 선례
metadata:
  type: project
---

`docs/DESIGN.md` §26 "원본에 없는 컴포넌트 — 설계 지침 `[유추]`" 의 각 줄은 **Clay 원본에 없어서
규격에서 추론한 것**이고 **대비·실사용 검증을 거치지 않았다.** 승격할 때 그대로 옮기지 말고 재검증한다.

**Why:** 이미 두 건이 검증에서 뒤집혔다.

- `ProgressBar`: §19 의 `transition: width` 와 `width:100%` 를 승격하며 뺐고, 바꾼 것을 **§26-1 표**로 남겼다.
- `Skeleton`: §26 이 지정한 `bg: surface-sub`(slate-50 `#f8f9fb`)는 흰 면 위 대비 **1.05:1** 로 사실상
  보이지 않고, `plain` StatTile 의 배경(§D3-4)과 **같은 색**이라 가장 흔한 자리에서 아예 사라진다.
  (직접 계산: slate-50 vs 흰색 1.05 · slate-100 `#e2e5e9` vs 흰색 1.26 · vs slate-50 1.20 · slate-200 vs 흰색 1.35)

**How to apply:** §26 에 남은 미구현(Breadcrumb 등)을 설계할 때 ① 지정된 토큰의 실제 값을 `_generated.css`
에서 꺼내 대비를 계산하고 ② 그 부품이 **놓일 배경**(흰 카드 / `surface-sub` 타일 / 표 zebra)마다 따로 본다.
바꿔야 하면 그 사실을 `§26-N` 절로 남길 것을 명세에 포함한다 — §26 본문만 고치면 왜 달라졌는지가 사라진다.
컴포넌트 전용 색이 필요하면 기존 토큰을 빌리지 말고 전용 semantic 토큰을 만든다
(`progress-warning` 선례 · 이유는 [[design-warning-color-contrast-limit]]). 관련: [[ux-skeleton-decisions]]
