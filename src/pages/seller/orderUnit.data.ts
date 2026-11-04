import type { TagTone } from "../../components/ui";
import { PRODUCTS, type SellerProduct } from "./seed/products.data";
import type { OrderUnit } from "./seed/orders.data";
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
 *
 * 렌트 쪽 식(`udRentPlan`·`rentPayTotal`·`udCollectFee`·`udCare`)은 렌트 묶음에서 옮긴다.
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

/** 원본 `udBaseAmt`(판매) — 본품 금액 = 판매가 × 수량. 쿠폰·포인트의 기준 */
const saleBaseAmt = (u: OrderUnit) =>
  Math.max(0, (u.sale ?? 0) - (u.saleDisc ?? 0)) * (Number(u.qty) || 1);

/** 원본 `udCoupon` — 셀러 쿠폰 10%(해시 3의 배수 주문만 · 본품 기준 · 100원 단위) */
export function couponOf(u: OrderUnit) {
  const base = saleBaseAmt(u);
  return unitHash(u) % 3 === 0
    ? Math.min(base, Math.round((base * 0.1) / 100) * 100)
    : 0;
}

/** 원본 `udPoint` — 포인트 할인 5%(해시 4의 배수 · 플랫폼 부담) */
export function pointOf(u: OrderUnit) {
  const base = saleBaseAmt(u);
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
  Math.max(0, saleBaseAmt(u) - couponOf(u)) + optionTotal(u) + shipFeeOf(u);

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
  대여중: {
    d: "고객이 상품을 사용 중인 기간입니다.",
    n: "다음 단계 — 반납일이 지나면 [연체중], 수거 송장을 등록하면 [수거 신청]으로 넘어갑니다.",
  },
  "대여중(연장)": {
    d: "대여 기간을 연장해 사용 중인 상태입니다.",
    n: "다음 단계 — 연장 종료일을 기준으로 [연체중] 또는 [수거 신청]으로 넘어갑니다.",
  },
  연체중: {
    d: "반납일이 지났는데 수거가 시작되지 않은 상태입니다. 연체료가 발생합니다.",
    n: "다음 단계 — 수거 송장을 등록하면 [수거 신청]으로 넘어갑니다.",
    variant: true,
  },
  "수거 신청": {
    d: "회수 요청이 접수되어 수거를 기다리는 상태입니다.",
    n: "다음 단계 — 물품이 도착하면 [검수중]으로 넘어갑니다.",
  },
  검수중: {
    d: "반납된 물품의 상태를 확인하는 단계입니다.",
    n: "다음 단계 — 등급을 판정하면 [검수완료]가 되고 보증금 처리 대상이 됩니다.",
  },
  검수완료: {
    d: "검수 등급 판정이 끝나 보증금 처리를 기다리는 상태입니다.",
    n: "다음 단계 — 환급을 실행하면 [반납완료]로 종결됩니다.",
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
