---
name: ux-skeleton-decisions
description: Skeleton 설계 명세의 핵심 판단(원자형 API · shimmer 없음 · aria-hidden + 컨테이너 aria-busy)과 그 이유 — 2026-08-28 승인 대기
metadata:
  type: project
---

`Skeleton` 설계 명세를 2026-08-28 에 작성했다(구현 전, 승인 대기). 다시 논쟁이 붙기 쉬운 결정 4개:

1. **원자형(`shape` + 부모가 주는 폭)이지 구조 내장형(`SkeletonRow count`)이 아니다.**
   표 열 폭의 정본은 `<colgroup>` 의 px 값(`DESIGN.md` §7-1-1)이라, 구조 내장형이 열 폭을 다시 추측하면
   정본이 둘이 되고 어긋나는 순간 **로드 후 레이아웃 시프트** — 스켈레톤이 막으려던 증상이 난다.
2. **shimmer/pulse 없음.** `design-core.md` 모션 표의 무한 반복은 스피너 1s 하나뿐이고, 나머지는 전부
   한 번 끝나는 전이(0.1/0.2/0.3s)다. 표 5행 × 6열이면 상자 30개가 동시에 맥동한다.
   덤으로 `prefers-reduced-motion` 을 다룰 일이 없어진다(저장소에 `motion-reduce:` 는 Toast·SelectionBar 2곳뿐).
3. **부품은 항상 `aria-hidden`, 로딩 사실은 컨테이너의 `aria-busy` 가 말한다.** 라이브 리전은 부품에 두지
   않는다 — 원자마다 생기면 화면에 `role="status"` 가 수십 개가 된다(§D9-4 의 후속 작업 몫).
   Primer 750ms 규칙은 §D8-1 의 "1초 전에는 표시자를 내지 않는다"가 이미 흡수하므로 **지연 타이머는 호출부**에 둔다.
4. **사용처가 지금 0곳이다.** `src/pages/` 전체에 비동기 로딩이 없다(모두 정적 `.data.ts`, `loading` prop 은
   `Button` 에만). 그래서 "두 번째 사용처가 보이면 승격" 규칙이 아니라 **규격 선행**(§D8-5)으로 판정했고,
   `DataTableShell.loading` 연결을 같은 스프린트로 묶는 조건을 달았다.

**Why:** 1~3 은 근거를 잃으면 "다른 DS 는 shimmer 가 있는데"로 되돌려지기 쉽고, 되돌리면 조용히 나빠진다.

**How to apply:** Skeleton 을 손보자는 요청이 오면 위 근거부터 확인한다. 4번은 **반드시 현재 코드로 재확인**
할 것 — 실서비스 연결이 들어오면 즉시 낡는다. 색 결정은 [[design-section26-inferred-specs]] 참조.
