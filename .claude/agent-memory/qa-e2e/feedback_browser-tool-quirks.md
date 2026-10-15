---
name: browser-tool-quirks
description: claude-in-chrome 실클릭이 JS 스크롤 직후 페이지에 안 닿는 문제, 헤드리스 콘솔 수집법, 무거운 JS 루프 타임아웃 회피
metadata:
  type: feedback
---

claude-in-chrome 의 `left_click` 은 JS 로 `scrollIntoView` 한 직후에는 **페이지에 이벤트가 전달되지 않을 수 있다**(document capture 리스너에 pointerdown 조차 안 찍힘). `screenshot` 을 한 번 찍은 뒤 클릭하면 정상 동작했다.

**Why:** 2026-10-15 퍼블 전달본 QA 에서 셀러명 클릭이 "안 먹는" 것처럼 보여 제품 결함으로 오판할 뻔했다.
**How to apply:** 실클릭이 무반응이면 결함으로 적기 전에 (1) 스크린샷 후 재클릭 (2) capture 단계 pointerdown 리스너로 이벤트 도달 여부 확인.

- 헤드리스 크롬은 `--enable-logging=stderr --v=0` 을 주면 stderr 에 `INFO:CONSOLE` 줄로 페이지 콘솔이 찍힌다 → 경로별 초기 로드 콘솔 에러 수집에 쓴다. 병렬 실행 시 `--user-data-dir` 을 경로마다 따로 준다.
- 31개 화면을 도는 JS 루프를 `javascript_tool` 한 번에 await 하면 45초 CDP 타임아웃이 난다. 비동기로 띄우고 `window.__out` 에 쌓은 뒤 폴링한다. 타임아웃 난 루프는 계속 돌므로 **페이지를 다시 navigate 해서 죽인 뒤** 재시작할 것.
- Vite 개발 서버는 잘못 인코딩된 URL(`%E0%A4%A`)을 직접 열면 앱 이전에 500 을 낸다. 앱 레벨 동작은 `history.pushState` + 앱의 `app:navigate` 이벤트로 확인한다. 이 요청은 HMR 로 열린 탭에 Vite 에러 오버레이도 띄운다(Esc 로 닫기, 제품 결함 아님).
- 스크린샷 좌표계와 CSS px 이 다를 수 있다(같은 탭에서 500 폭 → 2560 CSS px / 1568 스크린샷 폭으로 바뀐 적 있음). `getBoundingClientRect` 값을 클릭에 쓰기 전에 `스크린샷폭 / innerWidth` 비율을 곱한다.
