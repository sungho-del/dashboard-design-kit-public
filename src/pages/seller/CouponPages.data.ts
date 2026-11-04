import { COUPONS, type SellerCoupon } from "./seed/store.data";

/* =========================================================================
 * 쿠폰관리(SO-MKT-001) · 쿠폰 등록/수정(SO-MKT-002) — 도메인
 *
 * 원본 = 기획 v0.4 `SCREENS.promo`(3549) · `cpContent`·`cpCond`·`cpPeriod`·`cpExpired`(3538~3548) ·
 * `DETAILS.couponForm`(5176) · `saveCouponNew`(3570) · `efSave`(4524).
 * 이 원장 = 로그인 스토어(리틀베이비)가 발행한 쿠폰 5건(원본 시드 그대로).
 *
 * ## 원본 그대로
 * - 상태 저장값은 사용/사용중지 2값 · 「만료」는 종료일에서 파생(중지가 만료보다 앞선다)
 * - 만료 기준일 **2026-08-04**(원본 `CP_TODAY` = 사용자 앱 기준일) — 다른 셀러 화면 기준일(2026-06-29)과 다르다(기획 확인)
 * - 신규 [쿠폰 등록]: 쿠폰명·할인값 검사 → 「쿠폰이 등록되었습니다.」 → 목록 · 수정 [저장하기]: 「저장되었습니다.」(제자리)
 *
 * ## 원본과 다르게 둔 곳
 * - 수정 저장에도 신규와 같은 검사(쿠폰명·할인값)를 건다 — 원본 `efSave` 는 검사 없이 빈 쿠폰명도 저장했다
 * - 오류는 알림이 아니라 칸 아래(폼 규격 §29) · 문구는 원본 그대로
 * - **적용 대상**(전체·렌트·판매) 칸을 더했다 — 원본 v0.4 폼에는 없지만 정책 P-MKT-001 「쿠폰 등록 폼에 적용 대상 입력」 ·
 *   보드 06(본사 폼 = 셀러 폼 + …, 「적용 대상 아래」)이 전제한다. 셀러 개발 저장소 폼과 같은 문구. 시드에 값이 없어 「전체」로 연다
 * ====================================================================== */

export const LIST_PATH = "/promo";
export const NEW_PATH = "/promo/new";

/** 만료 판정 기준일 — 원본 `CP_TODAY` */
const CP_TODAY = "2026-08-04";

export type CouponStatus = "사용" | "사용중지" | "만료";

export const couponStatusOf = (c: SellerCoupon): CouponStatus => {
  if (c.stat === "사용중지") return "사용중지";
  const end = String(c.end || "").trim();
  return end && end < CP_TODAY ? "만료" : "사용";
};

export const STATUS_TONE = {
  사용: "success",
  사용중지: "default",
  만료: "default",
} as const;

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
export const dotDate = (s: string) => (s ? s.replace(/-/g, ".") : "");

/** 내용 — 「5% 할인」 + 보조 「(최대 10,000원)」 */
export function contentOf(c: SellerCoupon) {
  const v = Number(c.dcVal) || 0;
  if (c.dcType !== "rate") return { main: `${won(v)} 할인`, sub: "" };
  return {
    main: `${v}% 할인`,
    sub: Number(c.cap) > 0 ? `(최대 ${won(Number(c.cap))})` : "",
  };
}

/** 조건 — 최소 구매 금액이 없으면 「조건 없음」(보조색) */
export const conditionOf = (c: SellerCoupon) =>
  Number(c.min) > 0
    ? { text: `${won(Number(c.min))} 이상 구매`, unset: false }
    : { text: "조건 없음", unset: true };

/** 기간 — 「시작 ~ 끝」 · 끝이 없으면 「~ 기한 없음」(보조색) · 둘 다 없으면 「상시」 */
export function periodOf(c: SellerCoupon) {
  const s = dotDate(c.start);
  const e = dotDate(c.end);
  if (s && e) return { lead: `${s} ~ ${e}`, tail: "" };
  if (s) return { lead: `${s} ~ `, tail: "기한 없음" };
  return { lead: "", tail: "상시" };
}

export const findCoupon = (id: string) => COUPONS.find((c) => c.id === id);
export { COUPONS };

/* ---------- 폼 ---------- */

export type DcType = "rate" | "amt";

export interface CouponDraft {
  name: string;
  dcType: DcType;
  dcVal: string;
  cap: string;
  min: string;
  start: string;
  end: string;
  stat: "사용" | "사용중지";
  /** 적용 대상 — 정책 P-MKT-001 · 보드 06(원본 v0.4 폼에는 없다). 시드에 값이 없어 「전체」로 연다 */
  target: "전체" | "렌트" | "판매";
}

const digits = (v: number | string) =>
  v === "" || v == null ? "" : String(Number(v) || "");

export const draftOf = (c?: SellerCoupon): CouponDraft =>
  c
    ? {
        name: c.name,
        dcType: c.dcType === "amt" ? "amt" : "rate",
        dcVal: digits(c.dcVal),
        cap: digits(c.cap),
        min: digits(c.min),
        start: c.start,
        end: c.end,
        stat: c.stat === "사용중지" ? "사용중지" : "사용",
        target: "전체",
      }
    : {
        name: "",
        dcType: "rate",
        dcVal: "",
        cap: "",
        min: "",
        start: "",
        end: "",
        stat: "사용",
        target: "전체",
      };

export const NAME_MAX = 40;

export type CouponField = "name" | "dcVal";

/** 원본 `saveCouponNew` 검사 — 문구 그대로 */
export function validateCoupon(d: CouponDraft) {
  const e: Partial<Record<CouponField, string>> = {};
  if (!d.name.trim()) e.name = "쿠폰명을 입력하세요.";
  if (!(Number(d.dcVal) > 0))
    e.dcVal =
      d.dcType === "amt" ? "할인 금액을 입력하세요." : "할인율을 입력하세요.";
  return e;
}

export const DC_TYPES = [
  { value: "rate", label: "정률 (%)" },
  { value: "amt", label: "정액 (원)" },
];
export const TARGET_OPTIONS = [
  { value: "전체", label: "전체" },
  { value: "렌트", label: "렌트" },
  { value: "판매", label: "판매" },
];
export const STAT_OPTIONS = [
  { value: "사용", label: "사용" },
  { value: "사용중지", label: "사용중지" },
];

export const COUPON_COPY = {
  namePlaceholder: "예) 첫 렌트 30% 할인",
  capPlaceholder: "최대 할인액 (선택)",
  capHelp: "정률 할인의 **최대 할인 금액** 상한(선택). 비우면 상한 없음.",
  minPlaceholder: "최소 구매 금액 (선택)",
  minHelp:
    "입력한 **주문 금액 이상** 구매할 때만 쿠폰을 사용할 수 있습니다. 예) **50,000** 입력 시 **5만원 이상 구매** 시 사용 가능. 비우면 **구매 금액 조건 없음**.",
  targetHelp:
    "렌트 전용은 렌트 주문에만, 판매 전용은 구매 주문에만 적용됩니다. 사용자 몰 쿠폰 카드에 **[렌트 전용]**/**[구매 전용]** 배지로 보입니다.",
  periodHelp:
    "쿠폰을 사용할 수 있는 기간입니다. **종료일을 비우면 기한 없이 상시** 사용됩니다.",
  issuedHelp: "등록 시 오늘 날짜로 **발행일**이 기록됩니다.",
  created: "쿠폰이 등록되었습니다.",
  saved: "저장되었습니다.",
  notFoundTitle: "찾을 수 없는 쿠폰입니다",
  notFoundDescription:
    "주소가 잘못되었거나 내 스토어가 발행한 쿠폰이 아닐 수 있습니다.",
} as const;
