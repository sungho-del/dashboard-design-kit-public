import type { TagTone } from "../../components/ui";
import { PRODUCTS, type SellerProduct } from "./seed/products.data";
import { PAYORDERS, type OrderUnit } from "./seed/orders.data";
import { ADDR_BOOK, type AddressBookEntry } from "./seed/store.data";

/* =========================================================================
 * 처리단위(주문 1건 = 상품 1행) 도메인 — 판매·렌트 처리 화면 11개와 상세가 같이 쓴다.
 *
 * ## 원본 함수를 그대로 옮겼다 (기획 v0.4 `apps/admin-seller/index.html`)
 * 원본은 시드에 없는 값(구성품·쿠폰·배송비·처리 시각·지연 사유)을 **주문번호 해시로 결정적으로**
 * 만들어 화면마다 같은 값을 보인다. 여기 식이 하나라도 다르면 목록·상세·정산 숫자가 원본과 어긋난다.
 * 그래서 `orderUnit.data.test.ts` 가 **원본을 브라우저로 열어 처리단위 183건마다 뽑은 값**
 * (`orderUnit.golden.ts`)과 전부 맞는지 본다.
 *
 * | 여기                | 원본                 | 줄     |
 * | ------------------- | -------------------- | ------ |
 * | `unitHash`          | `_udHash2`           | 4709   |
 * | `unitTime`          | `_udT`               | 4711   |
 * | `productRef`        | `udProdRef`          | 4551   |
 * | `courierOf`         | `udCourier`          | 4544   |
 * | `stageIdx`          | `udStageIdx`         | 4721   |
 * | `orderStat`         | `udOrderStat`        | 4731   |
 * | `optionsOf`         | `saleConsts`         | 4752   |
 * | `shipFeeOf`         | `udShipFee`          | 4754   |
 * | `couponOf`·`pointOf`| `udCoupon`·`udPoint` | 4774   |
 * | `salePayTotal`      | `salePayTotal`       | 4777   |
 * | `historyOf`         | `udHistory`(클레임 제외) | 4908 |
 * | `delayReasonOf`     | `udShipInfo` 지연 사유 | 4879 |
 * | `careOf`            | `udCare`             | 4756   |
 * | `collectFeeOf`      | `udCollectFee`       | 4755   |
 * | `rentPlanOf`        | `udRentPlan`         | 4760   |
 * | `rentPayTotal`      | `udPriceBox` 렌트 결제금액 | 4812 |
 *
 * ## 원본과 다르게 둔 곳
 * 렌트 결제금액은 **명세(`udPriceBox`) 식** 하나로 쓴다 — 원본 목록 식(`rentPayTotal` 4781)은 포인트를
 * 빼지 않아, 포인트를 쓴 19건은 목록 결제금액이 명세 결제금액보다 포인트만큼 컸다(판정 회신 Q-64
 * 「총 결제금액 = 명세 행 합계 = 실결제액」 · 기획 확인)
 * ====================================================================== */

export type UnitType = "판매" | "렌트";

/** 정상 흐름 — 원본 `_UD_SALE_FLOW`·`_UD_RENT_FLOW`(렌트 배송 완료 = 대여 시작이라 「대여중」이 그 단계) */
export const SALE_FLOW = [
  "신규 주문",
  "배송 준비",
  "배송중",
  "배송 완료",
  "구매확정",
] as const;
export const RENT_FLOW = [
  "신규 주문",
  "배송 준비",
  "배송중",
  "대여중",
  "수거 신청",
  "검수중",
  "반납완료",
] as const;

/** 택배사 — 원본 `UD_COURIERS`(상품 등록 폼과 같은 5종) */
export const COURIERS = [
  "CJ대한통운",
  "롯데택배",
  "한진택배",
  "로젠택배",
  "우체국",
] as const;

/** 원본 `_udHash2` — 주문번호(없으면 id) 문자열 해시. 32비트 부호 없는 정수 */
export const unitHash = (u: Pick<OrderUnit, "no" | "id">) => {
  let h = 0;
  const s = String(u.no || u.id || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 원본 `_udT` — 단계 k 의 처리 시각(`YYYY.MM.DD HH:MM:SS`). 주문번호 앞 8자리 날짜에서 해시로 시·분·초를 정하고
 * 단계마다 4~9시간씩 민다. ⚠️ `(h >> 3)` 는 원본처럼 **부호 있는 32비트** 시프트다(음수 초가 나올 수 있고 Date 가 받아 넘긴다).
 */
export const unitTime = (u: Pick<OrderUnit, "no" | "id">, k: number) => {
  const m = String(u.no || "").match(/^(\d{4})(\d{2})(\d{2})/);
  const h = unitHash(u);
  const base = m
    ? new Date(+m[1], +m[2] - 1, +m[3], 9 + (h % 9), h % 60, (h >> 3) % 60)
    : new Date(2026, 5, 20, 10, 20, 30);
  const d = new Date(base.getTime() + k * (4 + (h % 6)) * 3600000);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** 원본 `_udFits` — 렌트 처리단위는 판매 전용 상품을, 판매 처리단위는 렌트 전용 상품을 짝으로 삼지 않는다 */
const fits = (u: OrderUnit, p: SellerProduct) =>
  u.type === "렌트" ? p.mode !== "sale" : p.mode !== "rent";

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

/** 원본 `udStageIdx` — 정방향 흐름에서 도달한 단계 인덱스(배송정보 빈칸·처리 이력의 기준) */
export function stageIdx(u: OrderUnit) {
  if (u.req)
    return u.req.type === "취소" ? (u.ship && u.ship !== "-" ? 2 : 1) : 3;
  const flow: readonly string[] = u.type === "렌트" ? RENT_FLOW : SALE_FLOW;
  const alias: Record<string, number> = {
    "배송 지연": 1,
    "대여중(연장)": 3,
    연체중: 3,
    검수완료: 5,
    취소: 1,
  };
  const i = flow.indexOf(u.stat ?? "");
  return i >= 0 ? i : (alias[u.stat ?? ""] ?? 1);
}

/** 원본 `udOrderStat` — 주문 자체의 단계(클레임 건은 `stat` 이 클레임 유형이라 그대로 못 쓴다) */
export const orderStat = (u: OrderUnit) => {
  const flow: readonly string[] = u.type === "렌트" ? RENT_FLOW : SALE_FLOW;
  return flow[stageIdx(u)] ?? flow[0];
};

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

/** 안심케어 정액 — 원본 `UD_CARE_FEE`(렌트 선택 옵션 · 정산 미포함) */
export const CARE_FEE = 5000;

/** 원본 `udCare` — 렌트 안심케어 가입. 시드 값이 없으면 해시로 약 절반 */
export const careOf = (u: OrderUnit) =>
  u.type === "렌트" && (u.care != null ? !!u.care : unitHash(u) % 2 === 0);

/** 렌트가(원/일) = 렌트 원가 − 할인 */
export const rentPrice = (u: OrderUnit) =>
  Math.max(0, (u.rent ?? 0) - (u.rentDisc ?? 0));

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

/** 판매가(원가 − 할인) */
export const salePrice = (u: OrderUnit) =>
  Math.max(0, (u.sale ?? 0) - (u.saleDisc ?? 0));

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

/** 원본 `udHistory`(클레임 제외) — 도달한 단계까지 [상태, 시각]. 1단계 뒤에 「배송 지연」이 끼어든다 */
export function historyOf(u: OrderUnit): [string, string][] {
  const flow: readonly string[] = u.type === "렌트" ? RENT_FLOW : SALE_FLOW;
  const si = stageIdx(u);
  const rows: [string, string][] = [];
  for (let k = 0; k <= si && k < flow.length; k++) {
    rows.push([
      flow[k],
      k === 0 ? u.orderedAt || unitTime(u, 0) : unitTime(u, k),
    ]);
    if (k === 1 && u.stat === "배송 지연")
      rows.push(["배송 지연", unitTime(u, 1.5)]);
  }
  return rows;
}

/** 원본 `udShipInfo` 지연 사유 — 배송 지연 건만, 시드에 없으면 해시로 두 문장 중 하나 */
export const delayReasonOf = (u: OrderUnit & { delayReason?: string }) =>
  u.stat === "배송 지연"
    ? u.delayReason ||
      [
        "택배사 집화 지연 — 지연 안내 후 우선 발송 예정",
        "재고 확보 지연 — 출고 일정 조정중",
      ][unitHash(u) % 2]
    : "-";

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

/* -------------------------------------------------------------------------
 * 상태 어휘 — 원본 `STAT_TIP`(상태 카드 ⓘ · 상태 변경 확인 창 설명) · 배지 색
 * ---------------------------------------------------------------------- */

export interface StatusTip {
  /** 이 상태가 무엇인가 */
  d: string;
  /** 다음 단계 */
  n: string;
  /** 렌트 화면에서 쓰는 다음 단계(원본 `nRent`) */
  nRent?: string;
  /** 정상 흐름에서 벗어난 상태(원본 `v`) — 상태 카드에서 정상 흐름보다 앞에 선다 */
  variant?: true;
}

/** 원본 `STAT_TIP` 중 주문·클레임 상태(글자 그대로) */
export const STATUS_TIPS: Record<string, StatusTip> = {
  "신규 주문": {
    d: "결제가 완료되어 접수된 주문입니다. 아직 상품 준비를 시작하지 않았습니다.",
    n: "다음 단계 — [배송 준비]로 변경합니다. 준비가 늦어지면 [배송 지연]으로 사유를 등록합니다.",
  },
  "배송 준비": {
    d: "상품을 준비하는 단계입니다. 택배사와 송장번호를 등록하면 배송이 시작됩니다.",
    n: "다음 단계 — 송장을 등록하면 [배송중]으로 넘어갑니다.",
  },
  "배송 지연": {
    d: "준비가 늦어져 지연 사유를 등록한 상태입니다. 정상 흐름에서 벗어나 있습니다.",
    n: "다음 단계 — 준비가 끝나면 [배송 준비]로 되돌리거나, 송장을 등록해 [배송중]으로 넘깁니다.",
    variant: true,
  },
  배송중: {
    d: "출고되어 배송이 진행 중인 상태입니다.",
    n: "다음 단계 — 배송이 끝나면 [배송 완료]로 넘어가고, 완료일로부터 7일이 지나면 자동 구매확정됩니다.",
    nRent:
      "다음 단계 — 렌트는 배송 완료 처리가 곧 대여 시작이라 즉시 [대여중]으로 전환됩니다.",
  },
  "배송 완료": {
    d: "상품이 고객에게 도착한 상태입니다.",
    n: "고객이 확정하거나 기한이 지나면 [구매확정]이 됩니다.",
  },
  구매확정: {
    d: "구매가 확정되어 매출로 잡히는 종결 상태입니다.",
    n: "더 진행할 단계가 없습니다. 정산 대상이 됩니다.",
  },
  /*
   * 렌트 4줄은 원본 `STAT_TIP` 을 원본의 전이 규칙에 맞춰 고쳤다(GPT 검토 · 기획 확인) — 원본 설명은
   * 「반납일이 지나면 연체」·「연체료 발생」이었지만 원본 게이트는 연체를 **수거 신청 뒤 회수 실패**로만 열고
   * (A-3), 연체료는 자동 산정하지 않는다(`depOdFee = 0`). 반납일만 지난 건은 이용 기간 칸 「수거 지연」이다
   */
  대여중: {
    d: "고객이 상품을 사용 중인 기간입니다.",
    n: "다음 단계 — 이용 종료일부터 수거 송장을 등록하면 [수거 신청]으로 넘어갑니다.",
  },
  "대여중(연장)": {
    d: "대여 기간을 연장해 사용 중인 상태입니다.",
    n: "다음 단계 — 연장 종료일부터 수거 송장을 등록하면 [수거 신청]으로 넘어갑니다.",
  },
  연체중: {
    d: "수거 신청 뒤 고객이 반납하지 않아 회수에 실패한 상태입니다. 연체료는 자동 산정하지 않습니다.",
    n: "다음 단계 — 수거 송장을 다시 등록하면 [수거 신청]으로 넘어갑니다.",
    variant: true,
  },
  "수거 신청": {
    d: "회수 요청이 접수되어 수거를 기다리는 상태입니다.",
    n: "다음 단계 — 물품이 도착하면 [검수중], 회수에 실패하면 [연체중]으로 넘어갑니다.",
  },
  검수중: {
    d: "반납된 물품의 상태를 확인하는 단계입니다.",
    n: "다음 단계 — 등급을 판정하면 [검수완료]가 되고 보증금 처리 대상이 됩니다.",
  },
  검수완료: {
    d: "검수 등급 판정이 끝나 보증금 처리를 기다리는 상태입니다.",
    n: "다음 단계 — 보증금 환급을 실행한 뒤 [반납완료]로 전환합니다.",
  },
  반납완료: {
    d: "반납과 보증금 처리가 모두 끝난 종결 상태입니다.",
    n: "더 진행할 단계가 없습니다.",
  },
  "주문 취소": {
    d: "주문이 취소되어 종결된 상태입니다. 정상 흐름에서 벗어납니다.",
    n: "더 진행할 단계가 없습니다. 환불은 [취소 관리]에서 처리합니다.",
    variant: true,
  },
  "취소 요청": {
    d: "고객이 취소를 신청한 상태입니다.",
    n: "발송 전이면 환불로 진행하고, 발송 후면 반품으로 전환합니다.",
  },
  "환불 처리중": {
    d: "환불 절차가 진행 중인 상태입니다.",
    n: "환불이 끝나면 [취소 완료] 또는 [반품 완료]가 됩니다.",
  },
  "취소 완료": {
    d: "취소와 환불이 모두 끝난 종결 상태입니다.",
    n: "더 진행할 단계가 없습니다.",
  },
  "반품 신청": {
    d: "고객이 반품을 신청한 상태입니다.",
    n: "승인하면 [반품 승인], 요건이 안 되면 [반품 반려]로 처리합니다.",
  },
  "반품 승인": {
    d: "반품 요청을 받아들여 수거를 준비하는 상태입니다.",
    n: "수거 송장을 등록하면 [반품 수거중]으로 넘어갑니다.",
  },
  "반품 지연": {
    d: "반품 처리가 지연된 상태입니다. 정상 흐름에서 벗어나 있습니다.",
    n: "지연 사유가 해소되면 원래 단계로 되돌립니다.",
    variant: true,
  },
  "반품 수거중": {
    d: "반품 물품을 회수하는 중입니다.",
    n: "물품이 도착하면 [반품 수거완료]가 됩니다.",
  },
  "반품 수거완료": {
    d: "반품 물품이 도착해 검수를 기다리는 상태입니다.",
    n: "검수를 시작하면 [반품 검수]로 넘어갑니다.",
  },
  "반품 검수": {
    d: "반품 물품의 상태를 확인하는 단계입니다.",
    n: "귀책을 판정하면 [환불 처리중]으로 넘어갑니다.",
  },
  "반품 완료": {
    d: "반품과 환불이 모두 끝난 종결 상태입니다.",
    n: "더 진행할 단계가 없습니다.",
  },
  "반품 반려": {
    d: "반품 요건에 맞지 않아 반려된 상태입니다. 거래는 유지됩니다.",
    n: "물품이 셀러에게 있으면 [재반송]으로 고객에게 되돌려 보냅니다.",
    variant: true,
  },
  "반품 거부": {
    d: "반품을 거부해 종결된 상태입니다. 거래는 유지됩니다.",
    n: "물품이 셀러에게 있으면 [재반송]으로 고객에게 되돌려 보냅니다.",
    variant: true,
  },
  재반송: {
    d: "반려·거부된 물품을 고객에게 되돌려 보낸 종결 상태입니다.",
    n: "더 진행할 단계가 없습니다.",
    variant: true,
  },
  "교환으로 변경": {
    d: "반품 건이 교환으로 바뀐 상태입니다.",
    n: "이후 진행은 [교환 관리]에서 이어집니다.",
    variant: true,
  },
  "교환 신청": {
    d: "고객이 교환을 신청한 상태입니다.",
    n: "승인하면 [교환 승인], 요건이 안 되면 [교환 반려]로 처리합니다.",
  },
  "교환 승인": {
    d: "교환 요청을 받아들여 수거를 준비하는 상태입니다.",
    n: "수거 송장을 등록하면 [교환 수거중]으로 넘어갑니다.",
  },
  "교환 지연": {
    d: "교환 처리가 지연된 상태입니다. 정상 흐름에서 벗어나 있습니다.",
    n: "지연 사유가 해소되면 원래 단계로 되돌립니다.",
    variant: true,
  },
  "교환 수거중": {
    d: "교환 물품을 회수하는 중입니다.",
    n: "물품이 도착하면 [교환 수거완료]가 됩니다.",
  },
  "교환 수거완료": {
    d: "교환 물품이 도착해 검수를 기다리는 상태입니다.",
    n: "검수를 시작하면 [교환 검수]로 넘어갑니다.",
  },
  "교환 검수": {
    d: "교환 물품의 상태를 확인하는 단계입니다.",
    n: "이상이 없으면 [교환 재배송]으로 넘어갑니다.",
  },
  "교환 재배송": {
    d: "교환품을 고객에게 다시 보내는 중입니다.",
    n: "도착하면 [교환 완료]로 종결됩니다.",
  },
  "교환 완료": {
    d: "교환이 끝난 종결 상태입니다.",
    n: "더 진행할 단계가 없습니다.",
  },
  "교환 반려": {
    d: "교환 요건에 맞지 않아 반려된 상태입니다. 거래는 유지됩니다.",
    n: "물품이 셀러에게 있으면 [재반송]으로 고객에게 되돌려 보냅니다.",
    variant: true,
  },
  "교환 거부": {
    d: "교환을 거부해 종결된 상태입니다. 거래는 유지됩니다.",
    n: "물품이 셀러에게 있으면 [재반송]으로 고객에게 되돌려 보냅니다.",
    variant: true,
  },
  /* 반품·교환 단계 버킷 카드(접수·진행·완료)의 뜻 — 개별 상태 설명은 위 각 상태가 갖는다 */
  접수: {
    d: "고객 신청이 들어와 판매자의 결정을 기다리는 건입니다(신청·지연).",
    n: "다음 단계 — [승인]하면 진행으로, [거부]하면 완료(종결)로 넘어갑니다.",
  },
  진행: {
    d: "승인 후 수거·검수·환불(교환은 재배송)이 진행 중인 건입니다.",
    n: "다음 단계 — 처리가 끝나면 완료로 종결됩니다.",
  },
  완료: {
    d: "정상 완료되었거나 반려·거부·재반송으로 종결된 건입니다.",
    n: "더 진행할 단계가 없습니다. 세부 구분은 목록의 상태 배지로 확인합니다.",
  },
};

/** 원본 `statTipOf` — 렌트 화면이면 렌트용 다음 단계 */
export const tipOf = (status: string, rent = false) => {
  const t = STATUS_TIPS[status];
  return t ? { d: t.d, n: (rent && t.nRent) || t.n } : null;
};

/**
 * 상태 배지 색 — **본사 퍼블과 같은 상태는 같은 색**(`babycube/OrderListPage.data.ts` STATUS_META · 톤 통일).
 * 신규·신청·검수 = 확인할 일(warning) · 지연·연체·반려·거부·재반송 = 비정상(critical) · 대여중·환불 처리중 = 진행(success).
 */
export const STATUS_TONE: Record<string, TagTone> = {
  "신규 주문": "warning",
  "배송 준비": "default",
  "배송 지연": "critical",
  배송중: "default",
  "배송 완료": "default",
  구매확정: "default",
  대여중: "success",
  "대여중(연장)": "success",
  연체중: "critical",
  "수거 신청": "warning",
  검수중: "warning",
  검수완료: "warning",
  반납완료: "default",
  취소: "default",
  "주문 취소": "default",
  "취소 요청": "warning",
  "환불 처리중": "success",
  "취소 완료": "default",
  "반품 신청": "warning",
  "반품 승인": "default",
  "반품 지연": "critical",
  "반품 수거중": "default",
  "반품 수거완료": "warning",
  "반품 검수": "warning",
  "반품 완료": "default",
  "반품 반려": "critical",
  "반품 거부": "critical",
  재반송: "critical",
  "교환 신청": "warning",
  "교환 승인": "default",
  "교환 지연": "critical",
  "교환 수거중": "default",
  "교환 수거완료": "warning",
  "교환 검수": "warning",
  "교환 재배송": "default",
  "교환 완료": "default",
  "교환 반려": "critical",
  "교환 거부": "critical",
  /* 보증금·검수·안심케어 — 본사 `deposit.data` · `CareClaimListPage.data` 와 같은 색 */
  점유중: "success",
  환급대기: "warning",
  전액환급: "default",
  일부환급: "default",
  전액차감: "critical",
  이상없음: "default",
  "파손(복원가능)": "critical",
  "파손(복원불가)": "critical",
  파손: "critical",
  분실: "critical",
  "청구 접수": "warning",
  승인: "default",
  반려: "critical",
};
export const toneOf = (status: string): TagTone =>
  STATUS_TONE[status] ?? "default";

/** 셀러 직권 취소 사유 — 원본 `SELLER_CANCEL_PRESETS` */
export const SELLER_CANCEL_PRESETS = [
  "품절 (재고 없음)",
  "상품 정보 오류",
  "배송 불가 지역",
  "직접입력",
] as const;
/** 배송 지연 사유 — 원본 `DELAY_PRESETS` */
export const DELAY_PRESETS = [
  "택배사 지연",
  "상품 준비 지연",
  "직접입력",
] as const;
/** 직접입력 사유 글자 수 상한(원본 50자) */
export const REASON_MAX = 50;

/** 배송 지연 사유 창 — 원본 `MODAL.type === 'delay'` (판매·렌트 발주 공용) */
export const DELAY_GATE = {
  title: "배송 지연 사유",
  intro: "배송 지연 처리 사유를 선택하거나 직접 입력해주세요.",
  placeholder: "지연 사유를 직접 입력해주세요 (최대 50자)",
  empty: "지연 사유를 입력해주세요.",
  confirm: "배송 지연 처리",
} as const;

/** 셀러 직권 취소 사유 창 — 원본 `gateSellerCancel` (판매·렌트 발주 공용). 고지문은 `OrderGates` */
export const CANCEL_GATE = {
  title: "주문 취소 사유",
  placeholder: "취소 사유를 직접 입력해주세요 (최대 50자)",
  empty: "취소 사유를 입력해주세요.",
  confirm: "주문 취소 처리",
} as const;

/* -------------------------------------------------------------------------
 * 처리상태(주문 통합 관리) — 원본 `FLOW_STEPS`(1554) · `deriveFlow`(1580) · `saleStat`·`autoConfirmDate`(1606)
 * ---------------------------------------------------------------------- */

/** 처리구분별 처리상태 표준 단계 — 원본 `FLOW_STEPS`(순서 그대로) */
export const FLOW_STEPS: Record<string, readonly string[]> = {
  판매: ["신규 주문", "배송 준비", "배송중", "배송 완료", "구매확정"],
  렌트: [
    "신규 주문",
    "배송 준비",
    "배송중",
    "대여중",
    "대여중(연장)",
    "연체중",
    "수거 신청",
    "검수중",
    "검수완료",
    "반납완료",
  ],
  취소: ["취소 요청", "환불 처리중", "취소 완료"],
  반품: [
    "반품 신청",
    "반품 승인",
    "반품 반려",
    "반품 수거중",
    "반품 수거완료",
    "반품 검수",
    "환불 처리중",
    "반품 완료",
    "반품 거부",
    "재반송",
  ],
  교환: [
    "교환 신청",
    "교환 승인",
    "교환 반려",
    "교환 수거중",
    "교환 수거완료",
    "교환 검수",
    "교환 재배송",
    "교환 완료",
    "교환 거부",
    "재반송",
  ],
};

/** 처리구분 — 클레임이 걸리면 그 유형, 아니면 판매/렌트(원본 `flowCat`) */
export const flowCatOf = (u: OrderUnit) => u.req?.type ?? (u.type || "판매");

/** 원본 `deliveredDate` — 시드에 없으면 주문일 + 2일(결정적) */
function deliveredDate(u: OrderUnit) {
  if (u.deliveredAt) return String(u.deliveredAt).slice(0, 10);
  const no = String(u.no || "");
  if (no.length < 8) return "";
  const d = new Date(+no.slice(0, 4), +no.slice(4, 6) - 1, +no.slice(6, 8) + 2);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 원본 데모 기준일 — 자동 구매확정 판정이 여기서 센다 */
const FB_TODAY = "2026-06-29";

/**
 * 원본 `autoConfirmDate` — 배송 완료 뒤 7일이 지나면 자동 구매확정(F-1 · PC-3). 클레임 건은 제외.
 * ⚠️ 원본처럼 `new Date('YYYY-MM-DD')`(UTC 자정)로 비교한다 — 식을 바꾸면 경계일 판정이 갈린다
 */
function autoConfirmed(u: OrderUnit) {
  if (u.type !== "판매" || u.stat !== "배송 완료" || u.req) return false;
  const d = deliveredDate(u);
  if (!d) return false;
  const t = new Date(d.replace(/\./g, "-"));
  t.setDate(t.getDate() + 7);
  return !(t > new Date(FB_TODAY));
}

/** 원본 클레임 구 어휘 → 표준 처리상태 */
const LEGACY_FLOW: Record<string, Record<string, string>> = {
  반품: { 승인대기: "반품 신청", 수거중: "반품 수거중", 환불완료: "반품 완료" },
  교환: { 승인대기: "교환 신청", 수거중: "교환 수거중", 환불완료: "교환 완료" },
};

/** 원본 `deriveFlow`(= `flowStat`) — 주문 통합 관리 「주문상태」 열의 값 */
export function flowStatOf(u: OrderUnit) {
  if (u.flow) return u.flow;
  if (u.req) {
    const { type: t, stat: s } = u.req;
    if (FLOW_STEPS[t]?.includes(s)) return s;
    if (t === "취소") return s === "환불완료" ? "취소 완료" : "취소 요청";
    return LEGACY_FLOW[t]?.[s] ?? `${t} 신청`;
  }
  if (u.type === "판매") return autoConfirmed(u) ? "구매확정" : (u.stat ?? "");
  if (u.stat === "반납완료")
    return u.inspect === "미검수" ? "검수중" : "반납완료";
  return u.stat ?? "";
}
