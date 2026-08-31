/* -------------------------------------------------------------------------
 * 폼형 화면의 **도메인 층** — 다만 여기 있는 건 도메인의 **일부**뿐이다.
 *
 * 짝이 되는 뼈대: `ProductFormPage.tsx` (레이아웃 규칙·연결 규칙)
 *
 * ⚠️ **폼은 필드 목록 자체가 도메인이라 이 파일로 다 빠지지 않는다.**
 * 여기 있는 건 "값의 나열"(선택지·포맷터)뿐이고, **어떤 필드가 몇 개 있고 무엇이 필수인지는
 * 뼈대의 JSX 에 그대로 남아 있다.** 목록형·상세형처럼 "데이터만 갈아끼우면 끝"이 아니다.
 * 왜 그런지는 `ProductFormPage.tsx` 상단 주석에 적어 뒀다.
 *
 * ## 다른 서비스로 바꿀 때
 * 이 파일의 3개 export 를 새로 쓰고, **그다음 뼈대의 필드를 다시 쓴다.**
 *
 * | export        | 뜻                              | 예: 강의 개설 SaaS        |
 * | ------------- | ------------------------------- | ------------------------- |
 * | `CATEGORIES`  | `Select` 의 선택지              | 분야(개발·디자인·어학…)   |
 * | `SALE_STATES` | `SegmentedControl` 의 선택지    | 모집중 / 마감 / 종료      |
 * | `won`         | 금액 입력 **중** 쓰는 표시 포맷 | 수강료 천 단위 구분       |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 두 목록 모두 `{ value, label }` 배열이다 (`SelectOption` · `SegmentedControlItem` 호환)
 * - `SALE_STATES` 는 **가로로 한 줄에 놓이는 세그먼트**다 — 3~4개를 넘기면 줄바꿈이 생긴다.
 *   선택지가 더 많으면 `SegmentedControl` 이 아니라 `Select` 로 바꿀 것
 * - `SALE_STATES` 중 하나는 뼈대의 `useState` 초기값(`"selling"`)과 일치해야 한다
 * - `won` 은 **타자 한 번마다 호출된다.** 숫자 아닌 문자를 지우고 천 단위 구분자를 넣는데,
 *   ⚠️ 뼈대의 검증이 `replace(/,/g, "")` 로 되돌려 숫자 비교를 하므로
 *   **구분자는 반드시 쉼표**여야 한다. 공백·마침표로 바꾸면 할인가 검증이 조용히 깨진다
 * - 빈 문자열을 그대로 돌려줘야 한다 — `0` 을 돌려주면 지우자마자 "0"이 다시 박힌다
 * ---------------------------------------------------------------------- */

/** `Select` 의 options. 개수 제한 없음 — 길어지면 스크롤된다 */
export const CATEGORIES = [
  { value: "clothing", label: "의류" },
  { value: "bag", label: "가방·잡화" },
  { value: "beauty", label: "뷰티" },
  { value: "living", label: "리빙" },
  { value: "food", label: "식품" },
];

/** `SegmentedControl` 의 items. 가로 한 줄이라 3~4개까지 */
export const SALE_STATES = [
  { value: "selling", label: "판매중" },
  { value: "stopped", label: "판매중지" },
  { value: "soldout", label: "품절" },
];

/**
 * 금액 입력 표시 포맷 — 목록·상세의 `won`(숫자→"12,000원")과 **다른 물건**이다.
 * 여기 것은 입력값(문자열)을 받아 **입력창에 되쓸 문자열**을 돌려준다. 단위는 붙이지 않는다
 * (단위는 `Input` 의 `rightIcon` 이 담당).
 */
export const won = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  return digits === "" ? "" : Number(digits).toLocaleString("ko-KR");
};
