import { PRODUCTS, type SellerProduct } from "./seed/products.data";
import { PAYORDERS, type OrderUnit } from "./seed/orders.data";
import { ADDR_BOOK, type AddressBookEntry } from "./seed/store.data";
import {
  fits,
  rentPrice,
  unitHash,
  careOf,
  CARE_FEE,
} from "./orderUnit.labels";

export * from "./orderUnit.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./orderUnit.labels`(개발 요청 2026-11-12 46번) */

const byName = (u: OrderUnit) => PRODUCTS.find((x) => x.name === u.prod);

/**
 * 원본 `udProdRef` — 처리단위의 상품 레코드. 이름·유형이 맞으면 그것, 아니면 같은 유형에서 **결정적으로** 하나.
 * 씨앗은 ID 이관 전 값(`legacyId`)이다 — 원본 주석: 씨앗이 `id` 면 ID 교체가 구성품·결제금액까지 바꾼다.
 */
export function productRef(u: OrderUnit): Partial<SellerProduct> {
  const named = byName(u);
  if (named && fits(u, named)) return named;
  const pool = PRODUCTS.filter((p) => fits(u, p));
  let h = 0;
  const s = String(u.legacyId || u.id || u.no || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return pool[h % pool.length] ?? {};
}

/** 상품명·유형이 정확히 맞는 상품 — 방문 수령 분기는 이때만 탄다(원본: 유닛 배송 상태와 모순 방지) */
export function exactProduct(u: OrderUnit): SellerProduct | undefined {
  const named = byName(u);
  return named && fits(u, named) ? named : undefined;
}

/** 원본 `udCourier` — 처리단위 값, 없으면 상품 등록 택배사(이름만 맞으면 유형은 보지 않는다 · 원본 그대로) */
export const courierOf = (u: OrderUnit) =>
  u.courier || byName(u)?.courier || "";

/** 원본 `saleConsts` — 옵션(구 「구성품」) = 상품 옵션 중 기간 옵션을 뺀 것 */
export const optionsOf = (u: OrderUnit) =>
  (productRef(u).options ?? []).filter((o) => !("period" in o && o.period));

const optionTotal = (u: OrderUnit) =>
  optionsOf(u).reduce((a, o) => a + (Number(o.add) || 0), 0);

/** 원본 `udShipFee` — 방문 수령이면 0, 상품이 무료 배송이면 0 */
export function shipFeeOf(u: OrderUnit) {
  if (u.shipMethod === "pickup") return 0;
  const p = productRef(u);
  return p.shipFeeFree === "Y" || !Number(p.shipFee) ? 0 : Number(p.shipFee);
}

/** 원본 `udCollectFee` — 렌트만. 방문 수령이면 0, 상품이 회수 무료면 0 */
export function collectFeeOf(u: OrderUnit) {
  if (u.type !== "렌트" || u.shipMethod === "pickup") return 0;
  const p = productRef(u);
  return p.collectFeeFree === "Y" || !Number(p.collectFee)
    ? 0
    : Number(p.collectFee);
}

/**
 * 원본 `udRentPlan` — 주문이 어느 **기간 옵션**으로 계약됐는지 해시로 골라 그 등록 총액을 렌트료로 쓴다.
 * 옵션이 없으면 기본 렌트일 × 렌트가(무할인). 처리단위 렌트가가 상품과 다르면(시드 편차) 등록 총액이 함의하는
 * 할인율만 이 주문 정가에 적용한다(100원 단위).
 */
export function rentPlanOf(u: OrderUnit) {
  const p = productRef(u);
  const base = Number(p.baseRentDays) || 7;
  const dr = rentPrice(u);
  const presets = (p.presets ?? []).filter(
    (o) => Number(o.days) > 0 && Number(o.price) > 0,
  );
  const opt = presets.length ? presets[unitHash(u) % presets.length] : null;
  const days = opt ? Number(opt.days) : base;
  const norm = dr * days;
  const pdr = Math.max(0, Number(p.rent || 0) - Number(p.rentDisc || 0));
  const rate =
    opt && pdr > 0 ? Math.min(1, Number(opt.price) / (pdr * days)) : 1;
  const fee = Math.max(0, opt ? Math.round((norm * rate) / 100) * 100 : norm);
  return { base, days, dr, fee, disc: Math.max(0, norm - fee), opt };
}

/** 원본 `udBaseAmt` — 본품 금액(쿠폰·포인트의 기준). 판매 = 판매가 × 수량 · 렌트 = 기간 옵션 렌트료 */
const baseAmt = (u: OrderUnit) =>
  u.type === "렌트"
    ? rentPlanOf(u).fee
    : Math.max(0, (u.sale ?? 0) - (u.saleDisc ?? 0)) * (Number(u.qty) || 1);

/** 원본 `udCoupon` — 셀러 쿠폰 10%(해시 3의 배수 주문만 · 본품 기준 · 100원 단위) */
export function couponOf(u: OrderUnit) {
  const base = baseAmt(u);
  return unitHash(u) % 3 === 0
    ? Math.min(base, Math.round((base * 0.1) / 100) * 100)
    : 0;
}

/** 원본 `udPoint` — 포인트 할인 5%(해시 4의 배수 · 플랫폼 부담) */
export function pointOf(u: OrderUnit) {
  const base = baseAmt(u);
  return unitHash(u) % 4 === 0
    ? Math.min(base, Math.round((base * 0.05) / 100) * 100)
    : 0;
}

/**
 * 원본 `salePayTotal` — 판매 결제금액 = (판매가 × 수량 − 쿠폰) + 옵션 + 배송비.
 * ⚠️ 시드의 `amt` 와 다르다(예: 20260623864962-1 은 계산 63,500 · 저장 45,000) — 원본 화면은 계산값을 보인다.
 */
export const salePayTotal = (u: OrderUnit) =>
  Math.max(0, baseAmt(u) - couponOf(u)) + optionTotal(u) + shipFeeOf(u);

/** 렌트 옵션 총액 — 옵션 추가금은 일 단가라 렌트일만큼(원본 `conTotal`) */
export const rentOptionTotal = (u: OrderUnit) =>
  optionTotal(u) * rentPlanOf(u).days;

/**
 * 렌트 결제금액 — 원본 명세 식: 렌트료 + 옵션 − 쿠폰 − 포인트 + 안심케어 + 배송비 + 회수 배송비.
 * **보증금은 들지 않는다**(명세에 따로)
 */
export const rentPayTotal = (u: OrderUnit) =>
  Math.max(
    0,
    rentPlanOf(u).fee +
      rentOptionTotal(u) -
      couponOf(u) -
      pointOf(u) +
      (careOf(u) ? CARE_FEE : 0) +
      shipFeeOf(u) +
      collectFeeOf(u),
  );

/** 네이버페이로 결제한 주문번호 — 처리단위 `payMethod` 는 카드뿐이라 결제(PAYORDERS)에서 읽는다 */
const NAVER_PAY = new Set(
  PAYORDERS.filter((o) => o.method === "네이버페이").map((o) => o.no),
);
/**
 * 결제수단 — 기획 보드 01 「네이버페이로 결제한 주문은 「네이버페이」로 표시」. 보드는 렌트 상세를 들었지만
 * 같은 주문이 화면마다 다르게 보이지 않게 판매에도 같은 식을 쓴다. 다른 수단은 처리단위 값 그대로
 */
export const payMethodOf = (u: OrderUnit) =>
  NAVER_PAY.has(u.no) ? "네이버페이" : u.payMethod;

/** 처리단위 결제금액 — 유형별 식 하나(목록·상세·명세가 같은 값) */
export const payTotalOf = (u: OrderUnit) =>
  u.type === "렌트" ? rentPayTotal(u) : salePayTotal(u);

/** 방문 수령 여부 + 수령지 — 처리단위 지정 우선, 없으면 정확히 맞는 상품의 등록값(원본 `udShipInfo`) */
export function pickupOf(
  u: OrderUnit,
): { address: AddressBookEntry | undefined } | null {
  const exact = exactProduct(u);
  const pickup = u.shipMethod === "pickup" || exact?.shipMethod === "pickup";
  if (!pickup) return null;
  const id = u.pickupAddrId || exact?.pickupAddrId || "";
  return { address: ADDR_BOOK.find((a) => a.id === id) };
}
