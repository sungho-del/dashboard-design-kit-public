---
name: static-only-qa-runs
description: User sometimes scopes QA to code cross-check only (no browser) and wants terse reports with unrun checks marked blocked/SKIP
metadata:
  type: feedback
---

사용자가 "브라우저 기동 없이 코드 대조만" 같이 **범위를 좁혀 지시할 때는 그 범위를 넘지 말고**,
못 돌린 검사는 통과가 아니라 `blocked`/`SKIP` 으로 남긴 뒤 **짧게** 보고한다.

**Why:** 브라우저 기동은 시간이 걸리고, 사용자가 이미 다른 세션을 병렬로 돌리고 있을 수 있다.
그리고 이 저장소의 핵심 결함 유형(GNB id ↔ ROUTES 키 불일치, `onNavSelect` 상대경로)은
**정적 대조만으로도 확정 가능**하다 — 실제로 차트온 3곳이 코드 대조만으로 잡혔다.

**How to apply:** 범위 축소 지시가 있으면 서버·헤드리스 크롬을 띄우지 않는다.
대신 판정을 `pass` 로 올리지 말고, 검증 못 한 축(딥링크·새로고침·콘솔 에러)을
"검사하지 못한 것" 절에 이유와 함께 명시한다. 보고 표는 유지하되 설명은 최소로.
