import {
  LIST_PATH,
  findCoupon,
  isExpired,
  won,
  type Coupon,
} from "./CouponListPage.data";

/* -------------------------------------------------------------------------
 * 쿠폰 상세 — **도메인 층** (BabyCube 본사 운영 어드민 · 조회 전용)
 *
 * 짝이 되는 뼈대: `CouponDetailPage.tsx` · 들어오는 곳: 쿠폰관리 쿠폰명·행 클릭(`/promo/{쿠폰코드}`)
 * 기준 기획: **v0.4** `DETAILS.couponForm` (proto.html 5298~5320)
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `findCoupon(쿠폰코드)` → 쿠폰 | `undefined` (목록과 같은 원장 `COUPONS`)
 * - 구역 4개 제목은 `SECTIONS` — 원본 `기본 정보` · `할인 내용` · `사용 기간` · `상태`
 * - 사용 조건·사용 기간·상태 배지는 **목록과 같은 함수**(`conditionText`·`periodParts`·`couponStatus`)를
 *   뼈대가 목록 data 에서 직접 가져다 쓴다 — 목록과 상세가 다른 말을 할 수 없게(원본 5306)
 * - `discountDetailOf` → `{ prefix, strong, note }` — `strong` 은 굵게, `note` 는 흐리게(원본 `<b>`·`muted`)
 * - `expiredNoteOf` → 만료(파생)일 때만 문장, 아니면 `null`
 *
 * ## 원본과 다르게 둔 것
 * - 머리를 그린다 — 원본은 `bare`(상단 머리 없음)지만 형제 상세와 같게 제목 + 부제 + 상태 배지.
 *   제목은 원본 GNB 숨은 항목 이름 「쿠폰 상세」(탑바 「쿠폰 상세 (조회)」가 아니라 — 사용자 결정)
 * - 읽는 값은 `InfoList`(형제 상세와 같다)
 *
 * - 셀러명 — 원본 본사 발행분 CP-2404-01 은 직영 매장 쿠폰이라 「베이비크루저」(목록 data 원장 · 보드 06)
 *
 * ## 원본과 맞춘 것
 * 하단 바 왼쪽 [목록] 하나 — 저장·취소·확인 없음(원본 `noSave`). 찾을 수 없음 문구 원본 그대로
 * ---------------------------------------------------------------------- */

export { LIST_PATH, findCoupon };
export const LIST_LABEL = "쿠폰관리";
export const PAGE_TITLE = "쿠폰 상세";

export const SECTIONS = {
  basic: "기본 정보",
  content: "할인 내용",
  period: "사용 기간",
  status: "상태",
} as const;

/** 찾을 수 없음 — 원본 `notFound` 설명 문구 그대로 */
export const NOT_FOUND_TITLE = "찾을 수 없는 쿠폰입니다";
export const NOT_FOUND_DESCRIPTION =
  "해당 항목이 존재하지 않거나 삭제되었습니다.";

/** 머리 부제 — 쿠폰코드 · 셀러명 · 쿠폰명 */
export const headlineOf = (coupon: Coupon) =>
  [coupon.id, coupon.seller, coupon.name].join(" · ");

/** 할인 유형 — 원본 `정률 (%)` / `정액 (원)` */
export const DISCOUNT_TYPE_LABEL: Record<Coupon["discountType"], string> = {
  rate: "정률 (%)",
  amount: "정액 (원)",
};

/** 할인 내용 — 원본 `정률 <b>15%</b> (최대 50,000원)` / `정액 <b>5,000원</b>` */
export const discountDetailOf = (coupon: Coupon) =>
  coupon.discountType === "rate"
    ? {
        prefix: "정률",
        strong: `${coupon.discountValue}%`,
        note:
          coupon.discountMax !== null && coupon.discountMax > 0
            ? `(최대 ${won(coupon.discountMax)})`
            : null,
      }
    : { prefix: "정액", strong: won(coupon.discountValue), note: null };

/** 만료 보조문 — 저장값은 `사용`인데 화면은 `만료`일 때만(원본 5310~5312) · 「(저장값: …)」은 부록 A B18 로 뺐다 */
export const expiredNoteOf = (coupon: Coupon) =>
  coupon.stored === "사용" && isExpired(coupon)
    ? "사용 기간이 지나 만료로 표시됩니다"
    : null;
