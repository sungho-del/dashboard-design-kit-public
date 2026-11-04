import type { CalcBlock, CalcLine } from "../babycube/CalcBreakdown";
import {
  couponOf,
  optionsOf,
  productRef,
  salePayTotal,
  salePrice,
  shipFeeOf,
  stageIdx,
  unitTime,
} from "./orderUnit.data";
import { won } from "./SaleProcPage.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 발주 관리 상세(SO-ORD-002) — **도메인 층**. 뼈대는 `SaleOrderDetailPage.tsx`.
 *
 * 원본 = 기획 v0.4 `DETAILS.saleOrderDetail`(5026) → `udOrderPage`(4930) ·
 * `udOrderInfo`(4732) · `udPriceBox`(4787) · `udProdInfo` · `udShipInfo` · `udAddrInfo` · `udHistory`.
 * 대조 문서 `docs/seller/pilot-saleProc.md` B 절.
 *
 * | 갈아끼울 것      | 여기                                   |
 * | ---------------- | -------------------------------------- |
 * | 레코드           | `findSaleUnit` (판매 처리단위 · 경로 id) |
 * | 상태 셀렉트      | `STATUS_OPTIONS` · `isPreShip`          |
 * | 배송정보 날짜    | `reachedAt` · `confirmedAt`             |
 * | 주문 명세        | `statementBlocksOf` (`CalcBreakdown` 어댑터) |
 * | 알림 문구        | `DETAIL_COPY` (목록과 같은 문구는 `SaleProcPage.data` `COPY`) |
 *
 * ## 기획 변경 반영 (원본 v0.4 이후 · `docs/seller/plan-changes.md`)
 * - D-349·D-345 — 배송지 정보에 「추가 연락처」 행(수령인 연락처 아래). 없으면 「-」.
 *   처리단위 시드에 값이 없어 지금은 모두 「-」다(렌트 묶음에서 보강 시드를 붙인다)
 * ====================================================================== */

/** 경로 — 목록 `/sale-proc` 뒤에 처리단위 id */
export const LIST_PATH = "/sale-proc";
export const detailPath = (u: Pick<OrderUnit, "id">) => `${LIST_PATH}/${u.id}`;

/**
 * 원본 `byKey(UNITS, k, 'id')` + `u.type === '판매'` — **판매 처리단위면 상태를 가리지 않는다**
 * (배송중·구매확정 건도 열린다 · 이때 상태는 배지, 배송정보는 읽기 전용, 하단 처리 버튼은 없다)
 */
export const findSaleUnit = (id: string) =>
  UNITS.find((u) => u.id === id && u.type === "판매");

/** 출고 전 — 상태 셀렉트·송장 등록·[배송지 변경]·[주문 취소]가 살아 있는 상태(원본 `preShip`) */
const PRE_SHIP = ["신규 주문", "배송 준비", "배송 지연"];
export const isPreShip = (u: OrderUnit) => PRE_SHIP.includes(u.stat ?? "");

/** 상품주문상태 셀렉트 — 원본 `statOpts`. 지금 상태가 여기 없으면 셀렉트 대신 배지(원본 `udStatSel`) */
export const STATUS_OPTIONS = [
  { value: "신규 주문", label: "신규 주문" },
  { value: "배송 준비", label: "배송 준비" },
  { value: "배송 지연", label: "배송 지연" },
  { value: "취소", label: "주문 취소" },
] as const;
export const hasStatusSelect = (u: OrderUnit) =>
  STATUS_OPTIONS.some((o) => o.value === u.stat);

/** 값 없음 — 원본도 `-` (본사 상세와 같다) */
export const NONE = "-";
export const orNone = (value: string | undefined) =>
  !value || value.trim() === "" || value === "-" ? NONE : value;

/** 원본 `unitNo` — 주문번호 + 순번(`20260623864962-1`). 하단 [변경 저장] 알림의 표시 축 */
export const unitNo = (u: OrderUnit) => {
  const parts = String(u.id).split("-");
  const last = parts[parts.length - 1];
  return `${u.no}-${/^\d+$/.test(last) ? last : "1"}`;
};

/** 머리 설명 — 같은 주문번호의 다른 처리단위와 구별되게(본사 상세와 같은 꼴) */
export const headlineOf = (u: OrderUnit) => `${unitNo(u)} · ${u.prod}`;

/* -------------------------------------------------------------------------
 * 상품정보 — 원본 `udProdInfo`(판매)
 * ---------------------------------------------------------------------- */

export const productCodeOf = (u: OrderUnit) =>
  u.code || productRef(u).code || NONE;
export const brandOf = (u: OrderUnit) => productRef(u).brand || NONE;
export const growthStageOf = (u: OrderUnit) => productRef(u).stage || NONE;
/** 구성품 — 원본은 옵션(기간 옵션 제외) 이름을 줄바꿈으로. 없으면 행 자체가 없다 */
export const componentNamesOf = (u: OrderUnit) =>
  optionsOf(u).map((o) => o.name);

/* -------------------------------------------------------------------------
 * 배송정보 — 원본 `udShipInfo`. 도달한 단계까지만 시각, 아니면 「-」
 * ---------------------------------------------------------------------- */

/** 원본 `fee` — 상품 배송비, 무료면 「무료」 */
export const shipFeeText = (u: OrderUnit) => {
  const fee = shipFeeOf(u);
  return fee > 0 ? won(fee) : "무료";
};

/** 원본 `t(k)` — 1 주문확인 · 2 배송처리 · 3 배송완료 */
export const reachedAt = (u: OrderUnit, k: 1 | 2 | 3) =>
  stageIdx(u) >= k ? unitTime(u, k) : NONE;
/** 구매확정일 — 구매확정 건만(원본) */
export const purchasedAtOf = (u: OrderUnit) =>
  u.stat === "구매확정" ? unitTime(u, 4) : NONE;

/* -------------------------------------------------------------------------
 * 배송지 정보 — 원본 `udAddrInfo` + 「추가 연락처」(D-349·D-345)
 * ---------------------------------------------------------------------- */

export const receiverOf = (u: OrderUnit) => u.receiver || u.mem;
export const receiverTelOf = (u: OrderUnit) => orNone(u.receiverTel || u.tel);
/** 추가 연락처 — 시드에 필드가 없다. 보강 시드가 붙으면 여기서 읽는다 */
export const extraTelOf = (u: OrderUnit & { extraTel?: string }) =>
  orNone(u.extraTel);

/* -------------------------------------------------------------------------
 * 주문 명세 — 원본 `udPriceBox`(판매) → `CalcBreakdown` 묶음
 *
 * 원본 줄: 판매 원가 · 할인 금액 · 판매가 · 수량 · 소계 · 구성품(각 +금액) · 쿠폰 할인 · 배송비 · 결제 금액.
 * 묶음은 본사 주문 명세와 같은 꼴(상품 · 구성품 · 할인 · 추가 · 결과). 「할인 금액」은 옆 「할인」 묶음과
 * 헷갈려 본사처럼 「상품 할인」으로 부른다. **포인트는 판매 명세에 없다**(원본 — 결제금액 식에도 없다).
 * ---------------------------------------------------------------------- */

const MINUS = "−";
const less = (amount: number) =>
  amount > 0 ? `${MINUS}${won(amount)}` : won(0);
const more = (amount: number) => `+${won(amount)}`;
const line = (
  key: string,
  label: string,
  value: string,
  extra: Partial<CalcLine> = {},
): CalcLine => ({ key, label, value, ...extra });

export const statementTitleOf = (u: OrderUnit) => `주문 명세 · ${u.no}`;

export function statementBlocksOf(u: OrderUnit): CalcBlock[] {
  const price = salePrice(u);
  const qty = Number(u.qty) || 1;
  const coupon = couponOf(u);
  const ship = shipFeeOf(u);
  return [
    {
      key: "product",
      label: "상품",
      lines: [
        line("base", "판매 원가", won(u.sale ?? 0)),
        line("discount", "상품 할인", less(u.saleDisc ?? 0)),
        line("price", "판매가", won(price)),
        line("qty", "수량", `${qty}개`),
        line("subtotal", "소계", won(price * qty), {
          kind: "subtotal",
          hint: "판매가 × 수량",
        }),
      ],
    },
    {
      key: "component",
      label: "구성품",
      lines: optionsOf(u).map((o, i) =>
        line(`component-${i}`, o.name, more(Number(o.add) || 0)),
      ),
    },
    {
      key: "discount",
      label: "할인",
      lines: coupon ? [line("coupon", "쿠폰 할인", less(coupon))] : [],
    },
    {
      key: "extra",
      label: "추가",
      lines: [line("ship", "배송비", ship > 0 ? more(ship) : "무료")],
    },
    {
      key: "pay",
      emphasis: true,
      lines: [line("pay", "결제금액", won(salePayTotal(u)), { kind: "total" })],
    },
  ];
}

/* -------------------------------------------------------------------------
 * 알림·창 문구 — 원본 글자 그대로
 * ---------------------------------------------------------------------- */

export const DETAIL_COPY = {
  title: "발주 관리 상세",
  notFoundTitle: "찾을 수 없는 주문입니다",
  notFoundDescription: "해당 항목이 존재하지 않거나 삭제되었습니다.",
  /** 원본 `act(unitNo + ' 변경 저장')` — 표시 축 = 주문번호+순번(원본 판정 ②) */
  saved: (u: OrderUnit) => `${unitNo(u)} 변경 저장`,
  /** 원본 `saleChangeAddr` — prompt 문구 · 완료 알림 */
  addrTitle: "배송지 변경",
  addrLabel: "변경할 배송지",
  addrPlaceholder: "변경할 배송지를 입력하세요",
  addrChanged: "배송지를 변경했습니다.",
} as const;
