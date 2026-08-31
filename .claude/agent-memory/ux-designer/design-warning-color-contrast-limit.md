---
name: design-warning-color-contrast-limit
description: 머스터드(warning) 램프는 mustard-700 만 대비 기준을 통과한다 — 경고를 색으로 전달하는 설계를 할 때마다 걸리는 제약
metadata:
  type: project
---

`warning` 계열 semantic 토큰(`text-warning`·`icon-warning` = mustard-600 `#e28100`,
`border-warning`·`surface-warning-primary` = mustard-500 `#ffaa00`)은 **흰 배경에서 3:1 을 넘지 못한다.**
직접 계산한 흰 배경 대비: mustard-500 **1.91** · mustard-600 **2.85** · mustard-700 (`#bb5902`) **4.62**.
`surface-slate-secondary`(#e2e5e9) 위 대비도 mustard-600 은 2.25, mustard-700 은 3.66.

**Why:** `docs/DESIGN-dashboard.md` §D7-7 이 `text-success`(2.76) · `text-critical`(4.45) 의 같은 문제를
이미 측정해 `chart-delta-*` 토큰을 따로 만들었는데, **warning 은 그때 측정 대상이 아니어서 문서에 없다.**
그래서 "상태색이니 `text-warning` 쓰면 되겠지"로 가면 작은 글자·얇은 그래픽에서 조용히 미달한다.

**How to apply:** 경고를 색으로 말해야 하는 새 부품(막대 fill · 도트 · 얇은 라인 · 12~14px 글자)에서는
`text-warning`/`icon-warning` 을 그대로 쓰지 말고 **mustard-700 값의 전용 토큰을 `tokens/semantic/dashboard.json`
에 추가**하는 쪽으로 설계한다(§D7-7 이 만든 선례와 같은 처방). `*-hover` 토큰(`text-warning-hover` 등)이
마침 mustard-700 이지만, 정적 색으로 빌려 쓰면 hover 를 재매핑하는 날 조용히 깨진다.
큰 글자(24px 이상 bold, 3:1 기준)에서도 mustard-600 은 2.85 라 **여전히 미달**이다 —
`StatTile` 의 `tone="warning"` 이 이미 이 상태다. 관련: [[ux-progressbar-decisions]]
