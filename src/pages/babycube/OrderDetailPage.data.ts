import { monthRangeText, STAGES } from "./GrowthStageListPage.data";
import {
  CLAIM_TYPE_LABEL,
  FAULT_LABEL,
  ORDERS,
  perDay,
  rentPriceOf,
  sellerLabel,
  won,
  type ClaimType,
  type FlowStatus,
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

/* =========================================================================
 * 모드 — 주문 상세 하나가 **네 경로**를 맡는다 (원본 `hqOrderDetailPage(u, {rma})` 하나와 같다)
 *
 * | 모드       | 경로                          | 들어오는 곳 | 더해지는 것 |
 * | ---------- | ----------------------------- | ----------- | ----------- |
 * | `order`    | `/orders-all/{처리단위}`      | 주문 목록   | 없음 — 클레임 건은 이력 끝에 지금 단계 한 줄 |
 * | `cancel`   | `/orders-cancel/{처리단위}`   | 취소 목록   | 클레임 줄 · 상태 두 칸 · 명세 꼬리 · 클레임 이력 |
 * | `return`   | `/orders-return/{처리단위}`   | 반품 목록   | 〃 |
 * | `exchange` | `/orders-exchange/{처리단위}` | 교환 목록   | 〃 (판매만 — 렌트 교환은 없다) |
 * ====================================================================== */
export type DetailMode = "order" | ClaimType;

export const MODES: Record<
  DetailMode,
  { listPath: string; listLabel: string; noun: string }
> = {
  order: { listPath: "/orders-all", listLabel: "주문 목록", noun: "주문" },
  cancel: { listPath: "/orders-cancel", listLabel: "취소 목록", noun: "취소" },
  return: { listPath: "/orders-return", listLabel: "반품 목록", noun: "반품" },
  exchange: {
    listPath: "/orders-exchange",
    listLabel: "교환 목록",
    noun: "교환",
  },
};

/** 경로 → 모드. 목록 경로 뒤에 `/` 가 붙은 상세 경로만 본다 — 모르면 주문 */
export const modeOfPath = (pathname: string): DetailMode =>
  (Object.keys(MODES) as DetailMode[]).find((mode) =>
    pathname.startsWith(`${MODES[mode].listPath}/`),
  ) ?? "order";

/**
 * 경로의 처리단위 코드 → 주문 행. 클레임 모드는 **그 클레임이 있는 건만** 연다
 * (취소 경로로 반품 건이 열리면 안 된다). 교환은 판매만 — 원본은 클레임 유무만 봐서 막지 못했다.
 */
export const findOrder = (
  id: string,
  mode: DetailMode = "order",
): Order | undefined => {
  const order = ORDERS.find((item) => item.id === id);
  if (!order || mode === "order") return order;
  if (order.claim?.type !== mode) return undefined;
  if (mode === "exchange" && order.type !== "sale") return undefined;
  return order;
};

/** 화면 제목 — 원본 상단 바 「주문 상세(렌트)」 · 「반품 상세(판매)」 … */
export const titleOf = (order: Order, mode: DetailMode = "order") =>
  `${MODES[mode].noun} 상세(${order.type === "rent" ? "렌트" : "판매"})`;

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
const SALE_FLOW: FlowStatus[] = [
  "new",
  "ready",
  "shipping",
  "delivered",
  "confirmed",
];
const RENT_FLOW: FlowStatus[] = [
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
const SIDE_EVENT_AFTER: Partial<Record<FlowStatus, FlowStatus>> = {
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
const eventAt = (order: Order, status: FlowStatus): Date => {
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
  }
};

/** 샘플의 `YYYY-MM-DD HH:mm` → 시각 (클레임 단계는 샘플이 시각을 직접 갖는다) */
const atOf = (text: string) => new Date(`${text.replace(" ", "T")}:00`);

export interface HistoryRow {
  status: OrderStatus;
  at: Date;
}

/**
 * 주문 처리 이력 — 정상 흐름을 `baseStatus` 까지 + (있으면) 흐름 밖 사건 + (있으면) 클레임.
 * 클레임은 그 건이 **실제로 거친 단계만** 샘플의 시각으로 잇는다(`claim.events`).
 * `claimSteps` 가 `"last"` 면 클레임 **지금 단계 한 줄**만 — 주문 상세는 원본이 클레임 줄을 보이지
 * 않지만(`rma=null`) 머리 배지와 어긋나지 않게 한 줄을 남긴다.
 */
export const historyOf = (
  order: Order,
  claimSteps: "all" | "last" = "last",
): HistoryRow[] => {
  const flow = order.type === "rent" ? RENT_FLOW : SALE_FLOW;
  const after = SIDE_EVENT_AFTER[order.baseStatus];
  const last = after ?? order.baseStatus;
  const steps = flow.slice(0, flow.indexOf(last) + 1);
  if (after) steps.push(order.baseStatus);
  const rows: HistoryRow[] = steps.map((status) => ({
    status,
    at: eventAt(order, status),
  }));
  const events = order.claim?.events ?? [];
  const claimRows = claimSteps === "all" ? events : events.slice(-1);
  return [
    ...rows,
    ...claimRows.map((event) => ({ status: event.status, at: atOf(event.at) })),
  ];
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

/**
 * 보증금 상태 — 반납완료 = 전액환급 · 검수완료 = 환급대기 · 그 전은 점유중.
 * 클레임: 취소 완료 = 전액환급(출고 전 무료 취소) · 환불 처리중 = 환급대기 ·
 * 반품 완료 = 판매자 귀책 전액환급 / 고객 귀책 부분환급(반품 배송비 차감).
 */
export const depositStatusOf = (order: Order): DepositStatus => {
  switch (order.status) {
    case "returned":
    case "canceled":
      return "fullRefund";
    case "returnDone":
      return order.claim?.fault === "customer" ? "partialRefund" : "fullRefund";
    case "inspected":
    case "cancelRefunding":
    case "returnRefunding":
      return "pendingRefund";
    default:
      return "holding";
  }
};

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

/* =========================================================================
 * 클레임 — 클레임 모드에서만 보인다 (원본 `rma` 분기)
 * ====================================================================== */

/** 클레임이 **거래를 되돌리지 않고** 끝났는가 — 반려·거부·재반송 */
const isClaimRefused = (order: Order) =>
  /Rejected$|Refused$|Resend$/.test(order.claim?.status ?? "");

/** 클레임이 끝까지 갔는가 — 취소 완료·반품 완료·교환 완료 */
const isClaimDone = (order: Order) =>
  ["canceled", "returnDone", "exchangeDone"].includes(
    order.claim?.status ?? "",
  );

/** 고객 귀책일 때 고객이 지는 배송비 — 반품은 편도, 교환은 왕복. **0 은 무료**(값 없음이 아니다) */
export const claimFeeOf = (order: Order) => {
  const claim = order.claim;
  if (!claim || claim.fault !== "customer") return 0;
  if (claim.type === "return") return order.returnFee;
  if (claim.type === "exchange") return order.exchangeFee;
  return 0;
};

/** 신청일시 — 첫 단계(신청)의 시각 */
export const requestedAtText = (order: Order) =>
  order.claim ? order.claim.events[0].at.replace(/-/g, ".") : NONE;

/**
 * 발송 여부 — 원본은 송장 유무로 정해 반품 건이 「발송 전」으로 찍히기도 했다.
 * 여기서는 **클레임 종류**로 정한다: 취소는 늘 출고 전이고, 반품·교환은 받은 뒤에만 생긴다.
 */
export const shippedTextOf = (order: Order) => {
  if (order.claim?.type === "cancel") return "발송 전";
  return isParcel(order) && order.trackingNo
    ? `발송 후 · ${order.carrier} ${order.trackingNo}`
    : `발송 후 · ${order.shipMethod}`;
};

export const faultTextOf = (order: Order) =>
  order.claim ? FAULT_LABEL[order.claim.fault] : NONE;

/**
 * 배송비 부담 — 판매자 귀책이면 판매자가 진다.
 * 고객 귀책: 반품 = 편도 배송비를 렌트는 **보증금에서**, 판매는 **환불액에서** 차감한다
 * (사용자 결정 2026-11-02 — 원본은 「별도 청구」라 쓰고 환불액에서도 빼 이중 부담으로 읽혔다).
 * 교환 = 왕복 배송비를 고객이 낸다. 취소는 출고 전이라 배송비가 생기지 않는다.
 */
export const feeBurdenOf = (order: Order) => {
  const claim = order.claim;
  if (!claim) return NONE;
  if (claim.type === "cancel") return "해당 없음 (발송 전 취소)";
  if (claim.fault === "seller") return "판매자 부담";
  const fee = claimFeeOf(order);
  if (claim.type === "exchange") {
    return fee > 0
      ? `교환 배송비(왕복) ${won(fee)} · 고객 부담`
      : "교환 배송비 무료";
  }
  if (fee === 0) return "반품 배송비 무료";
  const from = order.type === "rent" ? "보증금에서" : "환불액에서";
  return `반품 배송비(편도) ${won(fee)} · ${from} 차감`;
};

/** 신청 구분 배지 — 클레임 종류 이름. 원본은 1단계 상태명(「취소 요청」)을 고정으로 찍었다 */
export const claimTypeTextOf = (order: Order) =>
  order.claim ? CLAIM_TYPE_LABEL[order.claim.type] : NONE;

/**
 * 명세 꼬리 — 결제금액 **아래에** 클레임이 돈을 어떻게 움직이는지.
 *
 * | 단계             | 취소                   | 반품                                              | 교환 |
 * | ---------------- | ---------------------- | ------------------------------------------------- | ---- |
 * | 진행 중          | 환불 예정액 = 결제금액 | (고객 귀책) 편도 배송비 차감 → 환불/보증금 반환 예정액 | (고객 귀책) 왕복 배송비 · 환불 없음 — 검수 후 재배송 |
 * | 완료             | 환불 완료              | 환불 완료 / 보증금 반환 완료                      | 환불 없음 — 재배송 완료 |
 * | 반려·거부·재반송 | (없음)                 | 환불 없음 — 원거래 유지                           | 교환 불가 — 원거래 유지 |
 *
 * - 렌트 취소는 **무료 취소**(출고 전·위약금 없음)만 다룬다 — 결제금액 전액 + 보증금 반환을 따로
 *   (사용자 결정 2026-11-02). 원본은 렌트 취소에 보증금 반환만 있어 렌트료 환불이 빠졌다
 * - 환불은 **그 처리단위의 결제금액** 기준이다 — 같은 주문번호의 다른 처리단위를 끌어오지 않는다
 * - 렌트 반품은 원본처럼 보증금만 돌려준다. 차감액이 보증금보다 크면 0원 — 추가 청구로 넓히지 않는다
 */
export const claimStatementOf = (order: Order): StatementLine[] => {
  const claim = order.claim;
  if (!claim) return [];
  const done = isClaimDone(order);
  const deposit = order.deposit ?? 0;
  const pay = payTotalOf(order);
  const fee = claimFeeOf(order);
  const rent = order.type === "rent";

  if (claim.type === "cancel") {
    const depositLine = rent
      ? [
          line(
            done ? "보증금 반환 완료" : "보증금 반환 예정액",
            won(deposit),
            "strong",
          ),
        ]
      : [];
    return [
      line(done ? "환불 완료" : "환불 예정액", won(pay), "total"),
      ...depositLine,
    ];
  }

  if (isClaimRefused(order)) {
    const result =
      claim.type === "return"
        ? "환불 없음 — 원거래 유지"
        : "교환 불가 — 원거래 유지";
    return [line("처리 결과", result, "total")];
  }

  if (claim.type === "exchange") {
    const feeLine =
      fee > 0 ? [line("교환 배송비(왕복) · 고객 부담", won(fee))] : [];
    const result = done
      ? "환불 없음 — 재배송 완료"
      : "환불 없음 — 검수 후 재배송";
    return [...feeLine, line("처리 결과", result, "total")];
  }

  /* 반품 — 렌트는 보증금, 판매는 결제금액에서 고객 귀책 배송비를 뺀다 */
  const from = rent ? "보증금에서" : "환불액에서";
  const feeLine =
    fee > 0
      ? [line(`반품 배송비(편도) 차감 · ${from}`, `- ${won(fee)}`, "minus")]
      : [];
  const label = rent
    ? done
      ? "보증금 반환 완료"
      : "보증금 반환 예정액"
    : done
      ? "환불 완료"
      : "환불 예정액";
  const base = rent ? deposit : pay;
  return [...feeLine, line(label, won(Math.max(0, base - fee)), "total")];
};
