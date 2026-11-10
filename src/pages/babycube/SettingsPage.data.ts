/* -------------------------------------------------------------------------
 * 설정 — **도메인 층** (BabyCube 본사 운영 어드민 · BO-SYS-002)
 *
 * 짝이 되는 뼈대: `SettingsPage.tsx` (레이아웃·접기·입력 폭·저장 흐름)
 * 원본: `SET`·`SCREENS.settings` (proto.html:4128~4155)
 *
 * ## ⚠️ 폼형이라 "데이터만 갈아끼우기"가 안 된다
 * `screen-templates.md` §3-4 — 필드 목록 자체가 도메인이라 **뼈대의 JSX 에 남는다.**
 * 이 파일이 드는 것은 문구(라벨·placeholder·섹션 안내)와 저장값·글자 수 제한이다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `SAVED_SETTINGS` 의 키 11개가 뼈대의 입력 11개와 짝이다
 * - `REQUIRED_KEYS` 는 **라벨의 `*` 표시**에만 쓰인다.
 *   ⚠️ **저장을 막는 검증이 아니다** — 원본 `setSave`(proto.html:4135)는 필수값을
 *   검사하지 않고 알림만 띄운다.
 *   "필수인데 비었으니 저장 불가" 같은 규칙을 여기서 지어내지 말 것
 *
 * ## ⚠️ 원본 대조로 바로잡은 것
 * - **섹션 순서가 뒤집혀 있었다.** 원본은 `판매자 / 푸터정보` 가 먼저다
 * - `업무 시간` 이 필수에서 빠져 있었다(원본은 `req`)
 * - placeholder 를 우리가 다시 쓴 것이 있었다 —
 *   `대표자명`·`상세 주소 · 우편번호` 는 "예) …" 형태가 아니고,
 *   업무/점심 시간에는 `운영시간.`·`점심시간.` 접두어가 붙는다
 * - `max`(글자 수 제한)가 통째로 빠져 있었다
 * - 저장값이 지어낸 자리 채움(대표자 김하늘·성동구 주소·접두어 없는 시간)이었다 → 원본 `SET` 으로(2026-11-03)
 *
 * ## 판정 Q18 — 설정 값이 사용자 푸터·고객센터의 기준 (2026-11-05)
 * - 대표 번호는 고객센터 번호로 통합 — 판매자 구획 「전화 번호」를 뺐다(「상담 전화 번호」 하나)
 * - 통신판매업 신고번호 · 이메일 · 호스팅서비스 칸 추가.
 *   라벨 그대로 · 「판매자 / 푸터정보」 구획(확인 요청 답(2026-11-06) 37번). 값이 확정돼 **필수** · 값 채움
 *   (반영 결과 답(2026-11-10) §3). 자리표시(라벨 글자)·글자 수 제한 없음은 퍼블이 정했다
 * ---------------------------------------------------------------------- */

export type SettingKey =
  | "company"
  | "bizNumber"
  | "ceo"
  | "roadAddress"
  | "detailAddress"
  | "mailOrderNo"
  | "email"
  | "hosting"
  | "centerPhone"
  | "workHours"
  | "lunchHours";

export type SectionId = "seller" | "customer";

/**
 * 저장돼 있던 값 = 뼈대의 초기값. 원본 `SET`(proto.html:4128~4130) 그대로다.
 *
 * - 업무·점심 시간의 `운영시간.`·`점심시간.` 접두어는 **값의 일부**다 — 사용자 앱에 그대로 찍힌다
 * - 대표자·상담 전화·주소는 셀러 목록의 본사 행(`SellerListPage.data.ts` S-000)과 같은 값이다
 *   (원본도 `SET` 과 본사 셀러 `S-000` 이 같다 — proto.html:954). 두 화면이 서로를 읽지는 않는다
 * - 사업자등록번호 · 소재지 · 새 세 칸 · 상담 전화는 고객사 확정 값(반영 결과 답(2026-11-10) §3 · `DM` #24).
 *   소재지를 도로명 / 상세 두 칸으로 나눈 자리는 퍼블이 정했다(우편번호는 받은 값이 없어 없음)
 * - 대표자는 「이학용」 — 상호 「렌티크」와 따로다(확인 요청 답(2026-11-06) §5 · 원본 샘플은 상호가 들어 있었다)
 * - 회사명은 「주식회사 렌티크」(판정 Q17 — 원본 「BabyCube」)
 */
export const SAVED_SETTINGS: Record<SettingKey, string> = {
  company: "주식회사 렌티크",
  bizNumber: "543-81-03181",
  ceo: "이학용",
  roadAddress: "서울특별시 송파구 충민로 66",
  detailAddress: "리빙관동 7층 엘-7101호, 엘-7102호(문정동, 가든파이브라이프)",
  mailOrderNo: "제 2026-서울송파-3005 호 (송파구청)",
  email: "babycube.co.kr@gmail.com",
  hosting: "카페24",
  centerPhone: "02-6406-1110",
  workHours: "운영시간. 평일 10:00 ~ 17:00 (주말·공휴일 휴무)",
  lunchHours: "점심시간. 평일 13:00 ~ 14:00",
};

/**
 * 필수 표시가 붙는 항목. **원본 `req` 를 그대로 옮긴 것**이다.
 * 점심 시간과 상세 주소만 빠진다(원본 `주소` 행은 도로명 쪽에 필수가 붙는다).
 * 새 세 칸도 값이 확정돼 필수다(반영 결과 답(2026-11-10) §3).
 *
 * ⚠️ 표시일 뿐 저장을 막지 않는다 — 위 주석 참고.
 */
export const REQUIRED_KEYS: SettingKey[] = [
  "company",
  "bizNumber",
  "ceo",
  "roadAddress",
  "mailOrderNo",
  "email",
  "hosting",
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
    guide: ["사용자 앱 ", "푸터의 사업자 정보", "로 노출됩니다."],
  },
  customer: {
    title: "고객 센터 정보",
    guide: ["사용자 앱 ", "고객센터·주문 문의", " 안내에 노출됩니다."],
  },
};

/** 필드 문구 — 라벨 · placeholder · 글자 수 제한. 전부 원본 값이다 */
export const FIELD_COPY: Record<
  SettingKey,
  /* `max` 없음 = 글자 수 제한 없음(새 세 칸 — 퍼블이 정함) */
  { label: string; placeholder: string; max?: number }
> = {
  company: { label: "회사명", placeholder: "예) 주식회사 렌티크", max: 40 },
  bizNumber: {
    label: "사업자 등록 번호",
    placeholder: "예) 000-81-00001",
    max: 20,
  },
  ceo: { label: "대표자명", placeholder: "대표자명", max: 20 },
  roadAddress: { label: "주소", placeholder: "도로명 주소", max: 80 },
  detailAddress: {
    label: "상세 주소 · 우편번호",
    placeholder: "상세 주소 · 우편번호",
    max: 80,
  },
  /* 판정 Q18 새 칸 — 라벨은 판정 글자 그대로, 자리표시는 라벨(대표자명과 같은 꼴) */
  mailOrderNo: {
    label: "통신판매업 신고번호",
    placeholder: "통신판매업 신고번호",
  },
  email: { label: "이메일", placeholder: "이메일" },
  hosting: { label: "호스팅서비스", placeholder: "호스팅서비스" },
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
