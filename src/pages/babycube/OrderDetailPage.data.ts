import { monthRangeText, STAGES } from "./GrowthStageListPage.data";
import {
  ORDERS,
  perDay,
  rentPriceOf,
  sellerLabel,
  won,
  type Order,
  type OrderStatus,
} from "./OrderListPage.data";
import { ADDRESSES, AIRPORTS, stageOf } from "./ProductDetailPage.data";
import { PRODUCTS } from "./ProductListPage.data";
import {
  DEPOSIT_STATUS_META,
  type DepositStatus,
} from "./RentDepositListPage.data";

/* -------------------------------------------------------------------------
 * 주문 상세 (BO-ORD-002) — 조회형 화면의 **도메인 층**
 *
 * 짝이 되는 뼈대: `OrderDetailPage.tsx`
 * 기준 기획: v0.4 `hqOrderDetailPage` — 구역 5개(주문정보·상품정보·배송정보·배송지 정보·
 * 주문 처리 이력) + 주문정보의 [상세보기] → 「주문 명세」 팝업 + 하단 [목록]. **본사는 조회 전용.**
 *
 * ## 레코드
 * 주문 목록의 `ORDERS` 한 행(**처리단위**)이다. 경로 `/orders-all/{처리단위}`.
 * 상품(성장단계·보증금)·회원은 그 행이 가리키는 샘플에서 읽는다 — 화면끼리 값이 같다.
 *
 * ## 원본 결함을 **의도대로** 고친 곳 (그대로 옮기지 않는다)
 * - 처리 이력: 원본은 날값으로 단계를 판정해 연체·수거 신청 건이 「배송 준비」에서 끝났다.
 *   여기서는 **정상 흐름을 현재 단계까지** 쌓고, 연장·연체·배송 지연은 **그 건에 있을 때만** 한 줄 더한다
 *   (상태 목록을 순서대로 쌓으면 모든 반납 건이 연체를 거친 것처럼 보인다).
 *   렌트 흐름에서 빠져 있던 「배송 완료」를 넣었다. 미래 단계는 넣지 않는다
 * - 처리 시각: 원본은 단계 시각이 거꾸로 가기도 했다. 결제 → 출고 → 수령 → 대여 시작(= 이용 기간 시작)
 *   → 회수 순서를 지키도록 고정 간격으로 만든다 — **예시 시각**이다
 * - 방문 수령·공항 픽업: 원본은 분기가 실행되지 않아 택배·송장 줄이 찍혔다. 여기서는 장소를 보이고 택배 줄을 뺀다
 * - 판매 명세 금액이 0원이던 것(필드 이름 오타) · 상품주문상태 배지가 날값이던 것 · 다른 상품의 브랜드/성장단계
 * ---------------------------------------------------------------------- */

/** 경로의 처리단위 코드 → 주문 행 */
export const findOrder = (id: string): Order | undefined =>
  ORDERS.find((order) => order.id === id);

/** 화면 제목 — 원본 상단 바 「주문 상세(렌트)」/「주문 상세(판매)」 */
export const titleOf = (order: Order) =>
  order.type === "rent" ? "주문 상세(렌트)" : "주문 상세(판매)";

/** 머리 설명 — 같은 주문번호의 다른 처리단위와 구별되게 처리단위 코드까지 */
export const headlineOf = (order: Order) =>
  `${order.orderNo} · ${order.id} · ${order.productName} · ${sellerLabel(order)}`;

export const SECTIONS = {
  info: "주문정보",
  product: "상품정보",
  shipping: "배송정보",
  address: "배송지 정보",
  history: "주문 처리 이력",
} as const;

/** 값이 없는 칸 — 원본도 `-` */
export const NONE = "-";

/* =========================================================================
 * 처리 이력
 * ====================================================================== */

/** 정상 흐름 — 판매 5단계 · 렌트 9단계(원본에서 빠진 「배송 완료」 포함) */
const SALE_FLOW: OrderStatus[] = [
  "new",
  "ready",
  "shipping",
  "delivered",
  "confirmed",
];
const RENT_FLOW: OrderStatus[] = [
  "new",
  "ready",
  "shipping",
  "delivered",
  "renting",
  "pickup",
  "inspecting",
  "inspected",
  "returned",
];

/** 흐름 밖의 사건 → 그 사건이 일어나는 자리(이 단계 뒤에 한 줄 붙는다) */
const SIDE_EVENT_AFTER: Partial<Record<OrderStatus, OrderStatus>> = {
  delayed: "ready",
  extended: "renting",
  overdue: "renting",
};

const pad = (value: number) => String(value).padStart(2, "0");

/** `YYYY-MM-DD` 의 그날 `HH:mm` 에 일수를 더한 시각 */
const dayAt = (day: string, plusDays: number, time: string) => {
  const at = new Date(`${day}T${time}:00`);
  at.setDate(at.getDate() + plusDays);
  return at;
};

const plusHours = (at: Date, hours: number) =>
  new Date(at.getTime() + hours * 3_600_000);

/** 처리 일시 표기 — 원본 `YYYY.MM.DD HH:mm:ss` */
export const stamp = (at: Date) =>
  `${at.getFullYear()}.${pad(at.getMonth() + 1)}.${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;

/**
 * 단계별 **예시** 시각. 결제 → 주문확인 → 출고 → 수령 → 대여 시작(이용 기간 시작일) → 회수 순서를 지킨다.
 * 렌트의 출고·수령은 이용 기간 시작에 맞추고, 반납 쪽은 이용 기간 끝에서 센다.
 */
const eventAt = (order: Order, status: OrderStatus): Date => {
  const paid = new Date(
    `${order.date.replace(" ", "T")}:${order.orderNo.slice(12, 14)}`,
  );
  const day = order.date.slice(0, 10);
  const [start, end] = order.period.split(" ~ ");
  const rent = order.type === "rent";
  const shippedAt = rent ? dayAt(start, -2, "14:20") : dayAt(day, 1, "15:40");
  const deliveredAt = rent
    ? dayAt(start, -1, "13:10")
    : plusHours(shippedAt, 21.5);

  switch (status) {
    case "new":
      return paid;
    case "ready":
      return plusHours(paid, 2);
    case "delayed":
      return dayAt(day, 1, "10:30");
    case "shipping":
      return shippedAt;
    case "delivered":
      return deliveredAt;
    case "confirmed":
      /* 수령 7일 뒤 자동 구매확정 */
      return plusHours(deliveredAt, 24 * 7);
    case "renting":
      return dayAt(start, 0, "09:00");
    case "extended":
      return dayAt(start, 7, "10:00");
    case "overdue":
      return dayAt(end, 1, "00:00");
    case "pickup":
      return dayAt(end, 0, "10:00");
    case "inspecting":
      return dayAt(end, 2, "15:00");
    case "inspected":
      return dayAt(end, 3, "11:00");
    case "returned":
      return dayAt(end, 4, "16:00");
    case "cancelRequested":
      return plusHours(eventAt(order, order.baseStatus), 1);
    case "returnPicking":
      return dayAt(start, 3, "11:00");
    case "exchangeRequested":
      return plusHours(eventAt(order, "delivered"), 48);
  }
};

export interface HistoryRow {
  status: OrderStatus;
  at: Date;
}

/**
 * 주문 처리 이력 — 정상 흐름을 `baseStatus` 까지 + (있으면) 흐름 밖 사건 + (있으면) 클레임 한 줄.
 * 원본은 주문 목록에서 들어온 클레임 건에 클레임 줄을 보이지 않지만(`rma=null`), 머리 배지와
 * 어긋나지 않게 **클레임 상태 한 줄**을 더한다(사유·귀책 같은 클레임 상세는 끌어오지 않는다).
 */
export const historyOf = (order: Order): HistoryRow[] => {
  const flow = order.type === "rent" ? RENT_FLOW : SALE_FLOW;
  const after = SIDE_EVENT_AFTER[order.baseStatus];
  const last = after ?? order.baseStatus;
  const steps = flow.slice(0, flow.indexOf(last) + 1);
  if (after) steps.push(order.baseStatus);
  if (order.status !== order.baseStatus) steps.push(order.status);
  return steps.map((status) => ({ status, at: eventAt(order, status) }));
};

/** 그 단계에 도달했으면 시각, 아니면 `-` (배송정보의 날짜 칸) */
export const reachedAt = (order: Order, status: OrderStatus) => {
  const row = historyOf(order).find((item) => item.status === status);
  return row ? stamp(row.at) : NONE;
};

/* =========================================================================
 * 상품정보
 * ====================================================================== */

/** 성장단계 — 상품 상세의 처음 값과 같은 배정(`stageOf`). 현재 상품 기준 예시다 */
export const stageTextOf = (order: Order) => {
  const product = PRODUCTS.find((item) => item.id === order.productCode);
  const stage = product
    ? STAGES.find((item) => item.id === stageOf(product))
    : undefined;
  return stage ? `${stage.name} (${monthRangeText(stage)})` : "없음";
};

/** 보증금 상태 — 반납완료 = 전액환급 · 검수완료 = 환급대기 · 그 전은 점유중 */
export const depositStatusOf = (order: Order): DepositStatus =>
  order.status === "returned"
    ? "fullRefund"
    : order.status === "inspected"
      ? "pendingRefund"
      : "holding";

export { DEPOSIT_STATUS_META };

/* =========================================================================
 * 배송정보
 * ====================================================================== */

export const isParcel = (order: Order) => order.shipMethod === "택배";

/** 방문 수령·공항 픽업의 장소 — 원본 `udShipInfo` 의 주소록 줄(출고지) · 공항 */
export const placeOf = (order: Order) => {
  if (order.shipMethod === "방문 수령") {
    const place = ADDRESSES[0];
    return `${place.name} · ${place.address} · ${place.phone1}`;
  }
  return `${AIRPORTS[0]} · 3층 출국장 픽업 데스크`;
};

/** 배송 지연 사유 — 원본 문구 2종을 처리단위마다 번갈아 */
const DELAY_REASONS = [
  "택배사 집화 지연 — 지연 안내 후 우선 발송 예정",
  "재고 확보 지연 — 출고 일정 조정중",
];
export const delayReasonOf = (order: Order) =>
  historyOf(order).some((row) => row.status === "delayed")
    ? DELAY_REASONS[order.type === "rent" ? 0 : 1]
    : NONE;

/** 송장 없는 택배 — 원본 「미등록」 */
export const UNREGISTERED = "미등록";

/** 요금 표기 — 0 이면 무료 */
export const feeText = (amount: number) => (amount > 0 ? won(amount) : "무료");

/* =========================================================================
 * 주문 명세 — 원본 `udPriceBox`
 * ====================================================================== */

/** 안심케어 요금 — 원본 `UD_CARE_FEE` */
export const CARE_FEE = 5000;

/**
 * 결제 단계의 할인·부가 — 일부 처리단위에만 있다(원본도 해시로 일부 건에만 붙인다).
 * 한 결제(주문번호)에 처리단위가 여럿이면 **한 행에만** 둔다 — 같은 할인을 두 번 빼지 않게.
 */
const EXTRAS: Record<string, { coupon?: number; point?: number; care?: true }> =
  {
    "U-R09": { coupon: 3000, care: true },
    "U-R11": { point: 2000 },
    "U-R12": { care: true },
    "U-S07": { coupon: 5000 },
  };

export type StatementTone = "plain" | "strong" | "minus" | "total";

export interface StatementLine {
  label: string;
  value: string;
  tone: StatementTone;
}

const line = (
  label: string,
  value: string,
  tone: StatementTone = "plain",
): StatementLine => ({ label, value, tone });

/** 배송비 · 회수 배송비 — 택배만 상품 배송비를 받는다(방문·공항은 무료) */
const shipFeeOf = (order: Order) => (isParcel(order) ? order.shipFee : 0);

/**
 * 결제금액 = 상품 소계 − 쿠폰 − 포인트 + 안심케어 + 배송비 + 회수 배송비.
 * ⚠️ **보증금은 들지 않는다**(원본 명세) — 명세에 따로 한 줄로 보인다.
 */
export const payTotalOf = (order: Order) => {
  const extra = EXTRAS[order.id] ?? {};
  const ship = shipFeeOf(order);
  const subtotal =
    order.type === "rent"
      ? (rentPriceOf(order) ?? 0) * (order.rentDays ?? 0)
      : Math.max(0, (order.saleBasePrice ?? 0) - (order.saleDiscount ?? 0)) *
        order.qty;
  return Math.max(
    0,
    subtotal -
      (extra.coupon ?? 0) -
      (extra.point ?? 0) +
      (extra.care ? CARE_FEE : 0) +
      ship +
      (order.type === "rent" ? ship : 0),
  );
};

export const statementOf = (order: Order): StatementLine[] => {
  const extra = EXTRAS[order.id] ?? {};
  const ship = shipFeeOf(order);
  const plus = (amount: number) => (amount > 0 ? `+ ${won(amount)}` : "무료");
  const discounts = [
    ...(extra.coupon
      ? [line("쿠폰 할인", `- ${won(extra.coupon)}`, "minus")]
      : []),
    ...(extra.point
      ? [line("포인트 할인 · (플랫폼 부담)", `- ${won(extra.point)}`, "minus")]
      : []),
    ...(extra.care
      ? [line("안심케어 · (정산 미포함)", `+ ${won(CARE_FEE)}`)]
      : []),
  ];

  if (order.type === "rent") {
    const price = rentPriceOf(order) ?? 0;
    return [
      line("렌트 원가", perDay(order.rentBasePrice ?? 0)),
      line("할인 금액", `- ${perDay(order.rentDiscount ?? 0)}`, "minus"),
      line("렌트가", perDay(price), "strong"),
      line("렌트일", `${order.rentDays}일`),
      line("소계", won(price * (order.rentDays ?? 0)), "strong"),
      ...discounts,
      line("배송비", plus(ship)),
      line("회수 배송비", plus(ship)),
      line("보증금", won(order.deposit ?? 0)),
      line("결제금액", won(payTotalOf(order)), "total"),
    ];
  }

  const price = Math.max(
    0,
    (order.saleBasePrice ?? 0) - (order.saleDiscount ?? 0),
  );
  return [
    line("판매 원가", won(order.saleBasePrice ?? 0)),
    line("할인 금액", `- ${won(order.saleDiscount ?? 0)}`, "minus"),
    line("판매가", won(price), "strong"),
    line("수량", `${order.qty}개`),
    line("소계", won(price * order.qty), "strong"),
    ...discounts,
    line("배송비", plus(ship)),
    line("결제금액", won(payTotalOf(order)), "total"),
  ];
};

/** 명세 팝업 제목 — 원본 `주문 명세 · {주문번호}` */
export const statementTitleOf = (order: Order) =>
  `주문 명세 · ${order.orderNo}`;

/** 결제 일시 표기 — 점 표기, 분까지 */
export const paidAtText = (order: Order) => order.date.replace(/-/g, ".");
