---
name: feedback-table-alignment
description: 표 셀 정렬은 좌측이 기본이고 자릿수를 비교하는 수치만 우측이다 — 원본이 center 여도 좌측으로 통일한다
metadata:
  type: feedback
---

목록 표의 정렬은 **좌측 기본 + 수치만 우측**이다.

- 글자·날짜·상태·분류·ID·액션 열 → `align` 미지정(좌측)
- **금액·건수·개수·율(%)·수량처럼 자릿수를 세로로 비교하는 값만** `align="right"`
- 원본 컬럼 정의가 `align: "center"` 를 줬어도 **좌측으로 통일**한다

**Why:** 조정자 지시(2026-08-26). 화면마다 정렬이 제각각이라 목록을 옮겨 다닐 때 눈이 흔들린다는
지적이 있었다. 우측 정렬은 자릿수 비교라는 **기능**이 있어 그것만 예외로 둔다
(원본 컬럼 정의의 `align: "right"` 와도 일치한다).

**How to apply:** `<TableTh>` 와 `<TableTd>` 의 `align` 을 **같이** 고친다 — 한쪽만 고치면
헤더와 셀이 어긋난다. 테스트로 못박는다: 금액 열 셀·헤더의 `className.split(/\s+/)` 에
`text-right` 가 있고, 글자 열에는 `text-right` 도 `text-center` 도 없다
(문자열 부분 일치는 `text-right` 와 다른 클래스를 못 가른다).

관련: [[babycube-admin]] · [[feedback_original-diff-pass]]
