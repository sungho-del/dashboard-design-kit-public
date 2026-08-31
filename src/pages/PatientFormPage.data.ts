/* -------------------------------------------------------------------------
 * 환자 등록(S04) 화면의 **도메인 층** — 다만 여기 있는 건 도메인의 **일부**뿐이다.
 *
 * 짝이 되는 뼈대: `PatientFormPage.tsx` (레이아웃 규칙·연결 규칙·필드 정의)
 * 원본 템플릿: `ProductFormPage.data.ts` (이커머스)
 *
 * ⚠️ **폼은 필드 목록 자체가 도메인이라 이 파일로 다 빠지지 않는다.**
 * 여기 있는 건 "값의 나열"(선택지·포맷터)뿐이고, **어떤 필드가 몇 개 있고 무엇이 필수인지는
 * 뼈대의 JSX 에 그대로 남아 있다.** 목록형·상세형처럼 "데이터만 갈아끼우면 끝"이 아니다.
 * 폼형에서 상속하는 것은 데이터가 아니라 **레이아웃 규칙 6가지**다
 * (`screen-templates.md` §3-4).
 *
 * ## 이 파일이 채우는 역할
 *
 * | 이 파일의 이름    | 뜻                              | 템플릿(이커머스)의 이름 |
 * | ----------------- | ------------------------------- | ----------------------- |
 * | `INSURANCE_TYPES` | `Select` 의 선택지              | `CATEGORIES`            |
 * | `PATIENT_TYPES`   | `SegmentedControl` 의 선택지    | `SALE_STATES`           |
 * | `phone`           | 입력 **중** 쓰는 표시 포맷      | `won`                   |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 두 목록 모두 `{ value, label }` 배열이다 (`SelectOption` · `SegmentedControlItem` 호환)
 * - `PATIENT_TYPES` 는 **가로로 한 줄에 놓이는 세그먼트**다 — 3~4개를 넘기면 줄바꿈이 생긴다
 * - `PATIENT_TYPES` 중 하나는 뼈대의 `useState` 초기값(`"new"`)과 일치해야 한다
 * - `INSURANCE_TYPES` 의 **`"self"`(비급여)가 조건부 노출의 분기값**이다 —
 *   비급여가 아니면 증번호 필드가 나타난다. 값을 바꾸면 뼈대의 분기도 같이 고친다
 * - `phone` 은 **타자 한 번마다 호출된다.** 숫자가 아닌 문자를 지우고 하이픈을 넣는데,
 *   빈 문자열은 그대로 돌려줘야 한다 — `"010-"` 을 돌려주면 다 지워도 하이픈이 남는다
 * ---------------------------------------------------------------------- */

/** `SegmentedControl` 의 items. 가로 한 줄이라 3~4개까지 */
export const PATIENT_TYPES = [
  { value: "new", label: "신규" },
  { value: "revisit", label: "재진" },
  { value: "foreign", label: "외국인" },
];

/**
 * `Select` 의 options. `"self"`(비급여)가 증번호 조건부 노출의 분기값이다 —
 * 비급여 환자는 보험 증번호가 존재하지 않는다.
 */
export const INSURANCE_TYPES = [
  { value: "health", label: "건강보험" },
  { value: "medicaid", label: "의료급여" },
  { value: "industrial", label: "산재보험" },
  { value: "auto", label: "자동차보험" },
  { value: "self", label: "비급여" },
];

/**
 * 전화번호 입력 표시 포맷 — 입력값(문자열)을 받아 **입력창에 되쓸 문자열**을 돌려준다.
 * 상세 화면의 `won`(숫자→"12,000원")과 달리 단위를 붙이지 않는다.
 *
 * 숫자만 남기고 11자리까지 자른 뒤 `010-1234-5678` 꼴로 하이픈을 넣는다.
 * 입력 도중에도 자연스럽게 보이도록 자릿수에 따라 하이픈 개수를 늘린다.
 * 빈 값은 빈 문자열 그대로 — 지우자마자 하이픈이 되살아나면 지울 수가 없다.
 */
export const phone = (value: string) => {
  const digits = value.replace(/[^\d]/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

/** 검증에서 쓰는 자릿수 — `phone` 이 만든 문자열에서 하이픈을 걷어낸 길이 */
export const phoneDigits = (value: string) => value.replace(/[^\d]/g, "");
