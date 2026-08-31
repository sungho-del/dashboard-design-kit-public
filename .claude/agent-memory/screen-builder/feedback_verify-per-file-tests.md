---
name: verify-per-file-tests
description: 화면을 하나 끝낼 때마다 그 화면의 테스트 파일만 vitest 로 돌려 통과시키고 넘어간다 — 그리고 접근가능 이름을 지어내지 않는다
metadata:
  type: feedback
---

**화면 하나(`.tsx`+`.data.ts`+`.test.tsx`)를 완전히 끝낼 때마다
`npx vitest run src/pages/<경로>/<파일>.test.tsx` 로 그 파일만 돌려 통과시킨 뒤 다음으로 넘어간다.**
전체 스위트(`npm test`)는 다른 배치와 충돌하므로 돌리지 않는다.

**Why:** 코디네이터가 "npm test 를 돌리지 마라"고 했다가 정정했다 —
금지 대상은 **전체 스위트**였고, 담당 파일 단위 실행은 오히려 필수다.
여러 화면을 반쯤 만들어 두고 마지막에 몰아서 검증하면, API 529 로 중간에 죽었을 때
어디까지가 검증된 것인지 알 수 없다. 실제로 이 파이프라인은 529 로 두 번 끊겼다.

**How to apply:**

- 화면 단위로 묶어서 진행한다. 여러 화면을 동시에 반쯤 만들지 않는다.
- 테스트 쿼리를 쓰기 전에 **그 이름을 렌더하는 코드가 실제로 있는지 확인한다.**
  코디네이터가 집계한 실패 원인 2가지가 전부 여기서 나왔다.
  1. `Pagination` 의 페이지 버튼은 **숫자만** 렌더한다 → `getByRole("button", { name: "2" })`.
     `"2 페이지"` 는 없는 이름이다. 컨테이너는 `getByRole("navigation", { name: "페이지네이션" })`.
  2. `"○○ 관리"` 처럼 "제목 + 동작" 형태의 `aria-label` 은 **내가 직접 붙였을 때만** 존재한다.
- 이름이 안 잡히면 지어내지 말고 **연결 자체를 확인하는 쿼리**로 바꾼다.
  예) `Select` 의 `label` 은 `<label for>` 로 `<button>` 트리거에 붙지만
  접근가능 이름 계산에서 잡히지 않아 `getByRole("button", { name: 라벨 })` 이 실패한다 →
  `getByText(라벨).getAttribute("for")` 로 id 를 얻어 `document.getElementById` 로 검증한다.
- 클래스 검증은 `className.split(/\s+/)` 배열에 `toContain` — 문자열 부분 일치는
  `text-text-critical` 과 `text-text-critical-hover` 를 못 가른다.

관련: [[babycube-stage5]] · [[report-failures]]
