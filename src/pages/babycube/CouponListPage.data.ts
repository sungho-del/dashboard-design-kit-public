import type { TagTone } from "../../components/ui";
import { DEMO_TODAY } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * 쿠폰관리 — **도메인 층** (BabyCube 본사 운영 어드민 · 조회 전용)
 * 기준 기획: v0.4 `plan-members/proto.html` 3906~3948 (`COUPONS` · `SCREENS.promo`)
 *
 * 짝이 되는 뼈대: `CouponListPage.tsx` · 상세: `CouponDetailPage.*`(`/promo/{쿠폰코드}`)
 *
 * ## 이 화면이 무엇인가
 * 입점사·본사가 발행한 쿠폰 원장을 **표 하나로** 본다. 생성·수정·중지는 입점사 어드민 몫이라
 * 본사에는 [등록]도 행 액션도 없다(원본 annotations `screen.promo` · 3949 등록 함수 제거).
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할                 | 실물 이름                                         |
 * | -------------------- | ------------------------------------------------- |
 * | 표 한 행의 타입      | `Coupon`                                          |
 * | 상태 파생·라벨·톤    | `couponStatus` · `STATUS_META`                    |
 * | 샘플(원장)           | `COUPONS` — 원본 16건 + 보충 2건                  |
 * | 셀 표기              | `discountParts` · `conditionText` · `periodParts` · `ymd` |
 * | 상세 경로            | `detailPathOf`                                    |
 * | 페이지 크기·빈 상태  | `PAGE_SIZE` · `PAGE_SIZES` · `EMPTY_TITLE`        |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 키는 `id`(= 쿠폰코드, 원본 `c.id`) · 표 순서는 **배열 순서 그대로**(원본 원장 순서 — 정렬 없음)
 * - `STATUS_META` 의 키는 `CouponStatus` 와 정확히 일치한다
 * - `discountParts` → `{ main, note }` · `conditionText` → `{ text, unset }` ·
 *   `periodParts` → `{ lead, tail, tailMuted }`. `note`·`unset`·`tailMuted` 만 뼈대가 흐리게 그린다
 *   (원본 `muted` — 「조건 없음」·「기한 없음」·「상시」는 결측이 아니라 의미 있는 상태다)
 * - 상세(`CouponDetailPage.data.ts`)도 **같은 함수**로 조건·기간을 그린다 — 원본 주석(5306)의 요구
 *
 * ## 상태 = 저장값 2종 + 파생 1종 (원본 3928~3943 판정 ⑴)
 * 저장값은 `사용`·`사용중지` 둘뿐이고, 종료일이 기준일보다 앞선 `사용` 쿠폰만 화면에서 `만료`다.
 * **중지가 만료보다 앞선다**(셀러가 내린 쿠폰은 기한과 무관하게 사용중지). 시작일이 미래여도 `사용`이다
 * (옛 화면의 「발행대기」 분기는 원본에 없다).
 * 기준일은 원본 `CP_TODAY`(2026-08-04) 대신 **시연 기준일 `DEMO_TODAY`(2026-10-19)** 하나로 맞춘다.
 * → 사용 7 · 만료 8 · 사용중지 3. 종료일 10.31·12.31 은 예정된 기한이라 그대로 둔다(사용자 결정).
 *
 * ## 상태 배지 톤 (형제 규칙 — 원본 b-prog → success, b-done → default)
 * `사용` success · `사용중지` default(무채색 — 사용자 결정, 셀러가 내린 정상 처리) · `만료` default
 *
 * ## 샘플 (원본 원장 16건 + 보충 2건)
 * 원본 16건을 필드·순서 그대로 옮겼다(셀러 7곳은 모두 `SELLERS` 에 있다). 본사 발행분은 원본처럼 `"본사"`.
 * **보충 2건**(맨 위): 주문 샘플에서 쿠폰을 쓴 처리단위 중 원장에 대응 쿠폰이 없던 두 건을 위해 넣었다.
 * 주문·정산 숫자는 그대로다 — 쿠폰 금액이 주문의 `coupon` 과 같고, 그 날짜에 유효하고, 조건을 만족한다.
 * | 쿠폰           | 셀러     | 맞물리는 주문                                         |
 * | -------------- | -------- | ----------------------------------------------------- |
 * | CP-2610-01     | 베베하우스 | U-R09 · 2026-10-12 · 렌트 33,000 · 쿠폰 3,000       |
 * | CP-2609-01     | 아기별상사 | U-S35 · 2026-09-10 · 할인 후 200,000 · 쿠폰 10,000  |
 * | CP-2608-01(원본) | 리틀베이비 | U-S07 · U-S31 · 할인 후 89,000 · 쿠폰 5,000       |
 *
 * ## ⚠️ 기획 확인 필요 (원본대로 둠)
 * - 주문의 쿠폰 할인이 원장 쿠폰과 연결되지 않는다(원본은 해시 10% — 4831·4166). 주문에 쿠폰코드가 없다
 * - 원장 순서가 발행일 순이 아니다(CP-24xx 5건이 맨 아래) · 코드는 24xx 인데 발행은 2026년
 * - 정책은 「본사는 쿠폰을 만들지 않는다」인데 본사 발행분(CP-2404-01)이 있다 · 본사 쿠폰의 부담 주체 미정
 * - 스토리보드 설명과 코드가 다르다(목록 「조건」 열 · 상태 「만료」 · 사용 기간 한 줄) — 코드를 따랐다
 *
 * ## 원본과 다르게 둔 곳 (형제 규칙)
 * 머리글·값 왼쪽 정렬(상태만 가운데) · `?preview=` 데이터 상태 · 행 어디를 눌러도 상세로
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 상태 대시 · 검색조건(`FILTERS.promo={}`, `filterBar` 미호출) · 엑셀(`EXPORT_SPEC` 미등록) ·
 * 체크박스 · 정렬 · 쿠폰 미리보기 모달 · 쿠폰코드 복사 · [등록] · 원본에 없는 셀러의 손 샘플
 * ---------------------------------------------------------------------- */

export const LIST_PATH = "/promo";
export const detailPathOf = (code: string) =>
  `${LIST_PATH}/${encodeURIComponent(code)}`;

/** 할인 방식 — 원본 `dcType`(`rate` / `amt`) */
export type DiscountType = "rate" | "amount";

/** 원장 저장값 — 원본 `stat` 2종 */
export type StoredStatus = "사용" | "사용중지";

/** 화면 상태 — 저장값 2종 + 파생 `expired` */
export type CouponStatus = "active" | "suspended" | "expired";

export interface Coupon {
  /** 쿠폰코드 = 행 키 (원본 `id`) */
  id: string;
  /** 셀러명 — 본사 발행분은 `"본사"`(원본 그대로) */
  seller: string;
  name: string;
  discountType: DiscountType;
  /** 정률이면 %, 정액이면 원 */
  discountValue: number;
  /** 정률 최대 할인 한도(원). 없으면 `null` */
  discountMax: number | null;
  /** 최소 주문 금액(원). `null` 이면 **조건 없음** */
  minOrderAmount: number | null;
  /** 시작일 `YYYY-MM-DD`. `null` 이면 **상시** */
  startsOn: string | null;
  /** 종료일. `null` 이면 **기한 없음** */
  endsOn: string | null;
  /** 발행일 `YYYY-MM-DD` */
  issuedOn: string;
  stored: StoredStatus;
}

/** 만료 판정 기준일 — 시연 기준일(주문·정산과 같은 값) */
export const REFERENCE_TODAY = DEMO_TODAY;

export const STATUS_META: Record<
  CouponStatus,
  { label: string; tone: TagTone }
> = {
  active: { label: "사용", tone: "success" },
  suspended: { label: "사용중지", tone: "default" },
  expired: { label: "만료", tone: "default" },
};

/** 원본 `cpExpired` — 종료일이 기준일보다 **앞서면**(당일은 아직 사용) */
export const isExpired = (coupon: Coupon, today: string = REFERENCE_TODAY) =>
  coupon.endsOn !== null && coupon.endsOn < today;

/** 원본 `cpStatBadge` — 중지가 만료보다 앞선다 */
export const couponStatus = (
  coupon: Coupon,
  today: string = REFERENCE_TODAY,
): CouponStatus => {
  if (coupon.stored === "사용중지") return "suspended";
  return isExpired(coupon, today) ? "expired" : "active";
};

/** 원장 한 줄 — 원본 필드 순서 `id|seller|name|dcType|dcVal|cap|min|start|end|issued|stat` */
const row = (line: string): Coupon => {
  const [id, seller, name, type, value, cap, min, start, end, issued, stat] =
    line.split("|");
  return {
    id,
    seller,
    name,
    discountType: type === "rate" ? "rate" : "amount",
    discountValue: Number(value),
    discountMax: cap ? Number(cap) : null,
    minOrderAmount: min ? Number(min) : null,
    startsOn: start || null,
    endsOn: end || null,
    issuedOn: issued,
    stored: stat as StoredStatus,
  };
};

export const COUPONS: Coupon[] = [
  /* ── 보충 2건(샘플 보충 — 주문 U-R09 · U-S35 의 쿠폰) ── */
  "CP-2610-01|베베하우스|렌트 3,000원 할인|amt|3000|||2026-10-01|2026-12-31|2026-10-01|사용",
  "CP-2609-01|아기별상사|가을맞이 1만원 할인|amt|10000||100000|2026-09-01|2026-10-31|2026-09-01|사용",
  /* ── 원본 원장 16건(proto.html 3906~3921, 순서 그대로) ── */
  "CP-2608-01|리틀베이비|리틀베이비 여름맞이 5,000원|amt|5000||30000|2026-08-01|2026-10-31|2026-08-01|사용",
  "CP-2608-02|베이비노리터|전 상품 7% 할인|rate|7|||2026-08-01|2026-10-31|2026-08-01|사용",
  "CP-2608-03|리틀베이비|리틀베이비 상시 5% 할인|rate|5|||2026-08-01||2026-08-01|사용",
  "CP-2608-04|리틀베이비|리틀베이비 재구매 10% 할인|rate|10|10000||2026-08-02|2026-09-30|2026-08-02|사용중지",
  "CP-2607-01|장난감아저씨|주말 완구 5%|rate|5|||2026-07-01|2026-07-20|2026-07-01|사용",
  "CP-2606-03|리틀베이비|리틀베이비 웰컴 15%|rate|15|15000||2026-06-01|2026-08-31|2026-06-01|사용",
  "CP-2606-04|베이비노리터|베이비노리터 5,000원|amt|5000||20000|2026-06-10|2026-08-31|2026-06-10|사용",
  "CP-2606-05|포근하우스|수면용품 7,000원 할인|amt|7000||50000|2026-06-04|2026-09-04|2026-06-04|사용",
  "CP-2605-03|장난감아저씨|장난감아저씨 10%|rate|10|||2026-05-15|2026-07-15|2026-05-15|사용",
  "CP-2605-04|쑥쑥마켓|수유·위생용품 10%|rate|10|10000||2026-05-01|2026-09-15|2026-05-01|사용",
  "CP-2604-02|장난감아저씨|봄맞이 완구 15%|rate|15|10000||2026-04-26|2026-07-26|2026-04-26|사용",
  "CP-2406-01|리틀베이비|첫 렌트 30% 할인|rate|30|20000|50000|2026-06-01|2026-12-31|2026-06-01|사용",
  "CP-2406-02|포근하우스|여름 시즌 세척비 지원|amt|5000|||2026-06-15|2026-07-31|2026-06-15|사용",
  "CP-2405-01|베이비노리터|재렌트 감사 5% 할인|rate|5|10000|30000|2026-05-01||2026-05-01|사용",
  "CP-2405-02|하이베베|웰컴 베이비 1만원 할인|amt|10000||100000|2026-05-10|2026-08-15|2026-05-10|사용중지",
  "CP-2404-01|본사|봄맞이 유모차 기획전 15%|rate|15|50000||2026-04-01|2026-04-30|2026-04-01|사용중지",
].map(row);

export const findCoupon = (code: string) =>
  COUPONS.find((coupon) => coupon.id === code);

/** 금액 — 천 단위 쉼표 + `원` */
export const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/** 날짜 — 점 구분자(원본 `cpFmtD`) */
export const ymd = (date: string) => date.replace(/-/g, ".");

/** 내용 — 원본 `cpContent`. 한도(`note`)는 둘째 줄 보조 글자(원본 `(최대 N원)` 괄호는 줄을 나누며 뺐다) */
export const discountParts = (coupon: Coupon) =>
  coupon.discountType === "rate"
    ? {
        main: `${coupon.discountValue}% 할인`,
        note:
          coupon.discountMax !== null && coupon.discountMax > 0
            ? `최대 ${won(coupon.discountMax)}`
            : null,
      }
    : { main: `${won(coupon.discountValue)} 할인`, note: null };

/** 조건 — 원본 `cpCond` */
export const conditionText = (coupon: Coupon) =>
  coupon.minOrderAmount !== null && coupon.minOrderAmount > 0
    ? { text: `${won(coupon.minOrderAmount)} 이상 구매`, unset: false }
    : { text: "조건 없음", unset: true };

/** 기간 — 원본 `cpPeriod` 세 분기(둘 다 · 시작만 · 없음=상시) */
export const periodParts = (coupon: Coupon) => {
  if (coupon.startsOn === null) {
    return { lead: "", tail: "상시", tailMuted: true };
  }
  if (coupon.endsOn === null) {
    return {
      lead: `${ymd(coupon.startsOn)} ~ `,
      tail: "기한 없음",
      tailMuted: true,
    };
  }
  return {
    lead: `${ymd(coupon.startsOn)} ~ `,
    tail: ymd(coupon.endsOn),
    tailMuted: false,
  };
};

/** 빈 상태 — 원본 공용 `tableEmpty`(검색조건이 없어 「필터 초기화」는 두지 않는다) */
export const EMPTY_TITLE = "해당 조건의 항목이 없습니다";

/** 한 페이지 행 수 — 원본 기본 10, 고를 수 있는 크기 4종 */
export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];
