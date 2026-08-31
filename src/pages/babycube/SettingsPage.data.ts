/* -------------------------------------------------------------------------
 * S28 설정 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `SettingsPage.tsx` (레이아웃·접기·저장 흐름)
 * 원본 템플릿: `src/pages/ProductFormPage.data.ts` (폼형)
 *
 * ## ⚠️ 폼형이라 "데이터만 갈아끼우기"가 안 된다
 * `screen-templates.md` §3-4 — 필드 목록 자체가 도메인이라 **뼈대의 JSX 에 남는다.**
 * 이 파일이 드는 것은 문구(라벨·placeholder·섹션 안내)와 저장값·글자 수 제한이다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `SAVED_SETTINGS` 의 키 9개가 뼈대의 입력 9개와 짝이다
 * - `REQUIRED_KEYS` 는 **라벨의 `*` 표시**에만 쓰인다.
 *   ⚠️ **저장을 막는 검증이 아니다** — 원본 `/settings` 는 필수값을 클라이언트에서
 *   검사하지 않는다(값을 그대로 PATCH 하고 판정은 서버가 한다).
 *   "필수인데 비었으니 저장 불가" 같은 규칙을 여기서 지어내지 말 것
 *
 * ## ⚠️ 원본 대조로 바로잡은 것
 * - **섹션 순서가 뒤집혀 있었다.** 원본은 `판매자 / 푸터정보` 가 먼저다
 * - `업무 시간` 이 필수에서 빠져 있었다(원본은 `req`)
 * - placeholder 를 우리가 다시 쓴 것이 있었다 —
 *   `대표자명`·`상세 주소 · 우편번호` 는 "예) …" 형태가 아니고,
 *   업무/점심 시간에는 `운영시간.`·`점심시간.` 접두어가 붙는다
 * - `max`(글자 수 제한)가 통째로 빠져 있었다
 * ---------------------------------------------------------------------- */

export type SettingKey =
  | "company"
  | "bizNumber"
  | "ceo"
  | "phone"
  | "roadAddress"
  | "detailAddress"
  | "centerPhone"
  | "workHours"
  | "lunchHours";

export type SectionId = "seller" | "customer";

/**
 * 서버에 저장돼 있던 값 = 뼈대의 초기값.
 *
 * ⚠️ 실제 값은 API 가 내려준다(청크에 없다). 여기 값은 **자리 채움**이라
 * 실서비스 값과 다를 수 있다 — 형식만 원본 placeholder 를 따랐다.
 */
export const SAVED_SETTINGS: Record<SettingKey, string> = {
  company: "BabyCube",
  bizNumber: "000-81-00001",
  ceo: "김하늘",
  phone: "02-1588-0000",
  roadAddress: "서울특별시 성동구 왕십리로 100",
  detailAddress: "3층 301호 · 04766",
  centerPhone: "02-1588-0000",
  workHours: "평일 10:00 ~ 17:00 (주말·공휴일 휴무)",
  lunchHours: "평일 13:00 ~ 14:00",
};

/**
 * 필수 표시가 붙는 항목. **원본 `req` 를 그대로 옮긴 것**이다.
 * 점심 시간과 상세 주소만 빠진다(원본 `주소` 행은 도로명 쪽에 필수가 붙는다).
 *
 * ⚠️ 표시일 뿐 저장을 막지 않는다 — 위 주석 참고.
 */
export const REQUIRED_KEYS: SettingKey[] = [
  "company",
  "bizNumber",
  "ceo",
  "phone",
  "roadAddress",
  "centerPhone",
  "workHours",
];

/**
 * 섹션 제목과 안내 문구.
 *
 * ⚠️ 안내는 섹션 **아래**(필드 뒤)에 붙는다 — 원본 `nv-help` 의 자리다.
 * 문장도 원본 그대로다. `사용자 앱` 이라는 주어를 빼지 말 것 —
 * 이 값이 어디에 나가는지가 이 화면의 유일한 맥락이다.
 *
 * 세 토막으로 나눠 든 이유는 원본이 **노출 위치만 굵게** 쓰기 때문이다.
 * 한 문장으로 합치면 그 강조가 사라진다.
 */
export const SECTIONS: Record<
  SectionId,
  { title: string; guide: [string, string, string] }
> = {
  seller: {
    title: "판매자 / 푸터정보",
    guide: [
      "사용자 앱 ",
      "푸터의 사업자 정보",
      "로 노출됩니다. 우편번호 검색 연동은 실서비스 연결 시 적용하며, 프로토타입에서는 직접 입력합니다.",
    ],
  },
  customer: {
    title: "고객 센터 정보",
    guide: ["사용자 앱 ", "고객센터·주문 문의", " 안내에 노출됩니다."],
  },
};

/** 필드 문구 — 라벨 · placeholder · 글자 수 제한. 전부 원본 값이다 */
export const FIELD_COPY: Record<
  SettingKey,
  { label: string; placeholder: string; max: number }
> = {
  company: { label: "회사명", placeholder: "예) BabyCube", max: 40 },
  bizNumber: {
    label: "사업자 등록 번호",
    placeholder: "예) 000-81-00001",
    max: 20,
  },
  ceo: { label: "대표자명", placeholder: "대표자명", max: 20 },
  phone: { label: "전화 번호", placeholder: "예) 02-1588-0000", max: 20 },
  roadAddress: { label: "주소", placeholder: "도로명 주소", max: 80 },
  detailAddress: {
    label: "상세 주소 · 우편번호",
    placeholder: "상세 주소 · 우편번호",
    max: 80,
  },
  centerPhone: {
    label: "상담 전화 번호",
    placeholder: "예) 02-1588-0000",
    max: 20,
  },
  workHours: {
    label: "업무 시간",
    placeholder: "예) 운영시간. 평일 10:00 ~ 17:00 (주말·공휴일 휴무)",
    max: 80,
  },
  lunchHours: {
    label: "점심 시간",
    placeholder: "예) 점심시간. 평일 13:00 ~ 14:00",
    max: 80,
  },
};
