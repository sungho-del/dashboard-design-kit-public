import type { CalcBlock, CalcLine } from "./CalcBreakdown";
import { monthRangeText, STAGES } from "./GrowthStageListPage.data";
import {
  CARE_FEE,
  CLAIM_TYPE_LABEL,
  FAULT_LABEL,
  isClaimRefused,
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
  depositOf,
  type DepositStatus,
} from "./deposit.data";

/* -------------------------------------------------------------------------
 * 주문 상세 (BO-ORD-002) — 조회형 화면의 **도메인 층**
 *
 * 짝이 되는 뼈대: `OrderDetailPage.tsx`
 * 기준 기획: v0.4 `hqOrderDetailPage` — 구역 5개(주문정보·상품정보·배송정보·배송지 정보·
 * 주문 처리 이력) + 주문정보의 [상세보기](우리 이름 [주문 명세]) → 「주문 명세」 팝업 + 하단 [목록].
 * **본사는 조회 전용.**
 *
 * ## 주문 명세 — `CalcBreakdown` 어댑터(`statementBlocksOf`)
 * 묶음: 상품(원가 → 상품 할인 → 단가 → 일수/수량 → 소계) · 할인(쿠폰·포인트) · 추가(안심케어·배송비) ·
 * 결제금액(결과) · 별도(보증금 — 결제금액에 들지 않는다). 클레임 모드는 결제금액을 원거래 금액으로 낮추고
 * 클레임 묶음(`claimBlocksOf`)이 기준 → 차감 → 결과를 보인다. 부호는 읽기용 `−`/`+`(0 은 부호 없음).
 * 본문 주문정보의 결제금액·클레임 결과 줄은 **팝업과 같은 함수**(`payTotalOf`·`claimResultsOf`)를 읽는다.
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

/** 샘플의 `YYYY-MM-DD HH:mm` → 시각 (클레임 단계·확정 시각은 샘플이 직접 갖는다) */
const atOf = (text: string) => new Date(`${text.replace(" ", "T")}:00`);

/**
 * 단계별 **예시** 시각. 결제 → 주문확인 → 출고 → 수령 → 대여 시작(이용 기간 시작일) → 회수 순서를 지킨다.
 * 렌트의 출고·수령은 이용 기간 시작에 맞추고, 반납 쪽은 이용 기간 끝에서 센다.
 * 검수완료·반납완료·구매확정은 주문 행이 든 시각(`inspectedAt`·`confirmedAt`)을 그대로 쓴다 —
 * 그 규칙은 주문 샘플(`toOrder`) 한 곳에 있고, 보증금 상태 변경일·정산 회차 귀속이 같은 값을 읽는다.
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
      /* 수령 7일 뒤 자동 구매확정 — 정산 귀속과 같은 값(`Order.confirmedAt`) */
      return atOf(order.confirmedAt!);
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
      return atOf(order.inspectedAt!);
    case "returned":
      /* 반납완료 = 렌트 매출 확정 — 보증금 상태 변경일·정산 귀속과 같은 값 */
      return atOf(order.confirmedAt!);
  }
};

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

/**
 * 그 단계에 도달했으면 시각, 아니면 `-` (배송정보의 날짜 칸).
 * 읽기 칸의 일시는 **분까지** — 주문정보의 결제일시·신청일시와 같은 형식이다.
 * 초까지 남기는 것은 처리 이력 표(`stamp`) 하나다(원본 로그 형식).
 */
export const reachedAt = (order: Order, status: OrderStatus) => {
  const row = historyOf(order).find((item) => item.status === status);
  return row ? stamp(row.at).slice(0, 16) : NONE;
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
 * 보증금 상태 — 보증금 순수 함수(`deposit.data.ts` `depositOf`)를 그대로 읽는다.
 * 보증금 내역과 같은 처리단위에서 같은 상태·반환액이 나온다(반납완료는 차감액으로 전액/일부/전액차감).
 * 보증금이 없는 건(판매)은 칸 자체가 없다 — 여기서는 점유중으로 돌려준다.
 */
export const depositStatusOf = (order: Order): DepositStatus =>
  depositOf(order)?.status ?? "holding";

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

/**
 * 안심케어 요금 — 원본 `UD_CARE_FEE`. 쿠폰·포인트·안심케어 가입은 주문 행(`Order.coupon` ·
 * `point` · `care`)이 들고 있다 — 정산이 같은 값을 읽는다(따로 해시로 만들지 않는다)
 */
export { CARE_FEE };

/** 읽기용 부호 — 차감 `−`(U+2212, 붙여 씀) · 가산 `+` · 0 은 부호 없이 (정산 명세와 같은 규칙) */
const MINUS = "−";
const less = (amount: number, format: (value: number) => string = won) =>
  amount > 0 ? `${MINUS}${format(amount)}` : format(0);
const more = (amount: number) => `+${won(amount)}`;
/** 배송비 줄 — 0 이면 「무료」(원본 문구) */
const shipLine = (amount: number) => (amount > 0 ? more(amount) : "무료");

const calcLine = (
  key: string,
  label: string,
  value: string,
  extra: Partial<CalcLine> = {},
): CalcLine => ({ key, label, value, ...extra });

/** 배송비 · 회수 배송비 — 택배만 상품 배송비를 받는다(방문·공항은 무료) */
const shipFeeOf = (order: Order) => (isParcel(order) ? order.shipFee : 0);

/**
 * 결제금액 = 상품 소계 − 쿠폰 − 포인트 + 안심케어 + 배송비 + 회수 배송비.
 * ⚠️ **보증금은 들지 않는다**(원본 명세) — 명세에 「별도」 묶음으로 따로 보인다.
 */
export const payTotalOf = (order: Order) => {
  const ship = shipFeeOf(order);
  const subtotal =
    order.type === "rent"
      ? (rentPriceOf(order) ?? 0) * (order.rentDays ?? 0)
      : Math.max(0, (order.saleBasePrice ?? 0) - (order.saleDiscount ?? 0)) *
        order.qty;
  return Math.max(
    0,
    subtotal -
      order.coupon -
      order.point +
      (order.care?.fee ?? 0) +
      ship +
      (order.type === "rent" ? ship : 0),
  );
};

/** 보증금 줄의 보조 글자 — 결제금액과의 관계(상품 상세 「반납 검수 후 환급되는 금액」과 같은 뜻) */
const DEPOSIT_HINT = "결제금액에 포함 안 됨 · 반납 검수 후 환급";

/**
 * 주문 몫 — 「상품」(원가 → 상품 할인 → 단가 → 일수/수량 → 소계) · 「할인」(쿠폰·포인트) ·
 * 「추가」(안심케어·배송비·회수 배송비). 일 단가 할인은 단가에서 끝난다 — 총액에서 또 빼지 않는다.
 * 상품 할인은 늘 보이는 줄이라 0 이면 「0원/일」·「0원」, 쿠폰·포인트·안심케어는 있을 때만(원본).
 */
const orderBlocksOf = (order: Order): CalcBlock[] => {
  const ship = shipFeeOf(order);
  const rent = order.type === "rent";
  const salePrice = Math.max(
    0,
    (order.saleBasePrice ?? 0) - (order.saleDiscount ?? 0),
  );
  const rentPrice = rentPriceOf(order) ?? 0;
  const product: CalcLine[] = rent
    ? [
        calcLine("base", "렌트 원가", perDay(order.rentBasePrice ?? 0)),
        calcLine(
          "discount",
          "상품 할인",
          less(order.rentDiscount ?? 0, perDay),
        ),
        calcLine("price", "렌트가", perDay(rentPrice)),
        calcLine("days", "렌트일", `${order.rentDays}일`),
        calcLine("subtotal", "소계", won(rentPrice * (order.rentDays ?? 0)), {
          kind: "subtotal",
          hint: "렌트가 × 렌트일",
        }),
      ]
    : [
        calcLine("base", "판매 원가", won(order.saleBasePrice ?? 0)),
        calcLine("discount", "상품 할인", less(order.saleDiscount ?? 0)),
        calcLine("price", "판매가", won(salePrice)),
        calcLine("qty", "수량", `${order.qty}개`),
        calcLine("subtotal", "소계", won(salePrice * order.qty), {
          kind: "subtotal",
          hint: "판매가 × 수량",
        }),
      ];
  const discounts: CalcLine[] = [
    ...(order.coupon
      ? [calcLine("coupon", "쿠폰 할인", less(order.coupon))]
      : []),
    ...(order.point
      ? [
          calcLine("point", "포인트 할인", less(order.point), {
            hint: "플랫폼 부담",
          }),
        ]
      : []),
  ];
  const extras: CalcLine[] = [
    ...(order.care
      ? [
          calcLine("care", "안심케어", more(order.care.fee), {
            hint: "정산 미포함",
          }),
        ]
      : []),
    calcLine("ship", "배송비", shipLine(ship)),
    ...(rent ? [calcLine("returnShip", "회수 배송비", shipLine(ship))] : []),
  ];
  return [
    { key: "product", label: "상품", lines: product },
    { key: "discount", label: "할인", lines: discounts },
    { key: "extra", label: "추가", lines: extras },
  ];
};

/** 결제금액 줄 — 주문 상세는 결과(가장 굵게), 클레임 상세는 원거래 금액(소계 굵기) */
const payLineOf = (order: Order, kind: "total" | "subtotal"): CalcLine =>
  calcLine("pay", "결제금액", won(payTotalOf(order)), { kind });

/** 「별도」 보증금 — 결제금액 계산 밖의 돈이라 결과 묶음 **아래** 따로 (보조 글자색) */
const depositAsideOf = (order: Order): CalcBlock[] =>
  order.type === "rent"
    ? [
        {
          key: "deposit",
          label: "별도",
          lines: [
            calcLine("deposit", "보증금", won(order.deposit ?? 0), {
              kind: "note",
              hint: DEPOSIT_HINT,
            }),
          ],
        },
      ]
    : [];

/**
 * 주문 명세 — `CalcBreakdown` 묶음. 주문 상세는 주문 몫 + 결제금액(결과) + 별도 보증금,
 * 클레임 상세는 주문 몫 + 클레임 몫(`claimBlocksOf` — 결제금액은 거기서 기준 줄이 된다).
 */
export const statementBlocksOf = (
  order: Order,
  claimMode = false,
): CalcBlock[] => {
  if (claimMode && order.claim) {
    return [...orderBlocksOf(order), ...claimBlocksOf(order)];
  }
  return [
    ...orderBlocksOf(order),
    { key: "pay", emphasis: true, lines: [payLineOf(order, "total")] },
    ...depositAsideOf(order),
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

/** 클레임이 끝까지 갔는가 — 취소 완료·반품 완료·교환 완료 */
const isClaimDone = (order: Order) =>
  ["canceled", "returnDone", "exchangeDone"].includes(
    order.claim?.status ?? "",
  );

/**
 * 고객 귀책일 때 고객이 지는 배송비 — 반품 편도. **0 은 무료**(값 없음이 아니다).
 * 교환 배송비는 1차에 받지 않아 고객 몫이 없다(디자인 §3 #9 · 3차 회신 Q-11)
 */
export const claimFeeOf = (order: Order) => {
  const claim = order.claim;
  if (!claim || claim.fault !== "customer") return 0;
  if (claim.type === "return") return order.returnFee;
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
 * 교환 = 1차에는 교환 배송비를 받지 않아 고객 귀책도 「판매자 부담」(디자인 §3 #9 · 부록 A B11).
 * 취소는 출고 전이라 배송비가 생기지 않는다.
 */
export const feeBurdenOf = (order: Order) => {
  const claim = order.claim;
  if (!claim) return NONE;
  if (claim.type === "cancel") return "해당 없음 (발송 전 취소)";
  if (claim.fault === "seller") return "판매자 부담";
  if (claim.type === "exchange") return "판매자 부담";
  const fee = claimFeeOf(order);
  if (fee === 0) return "반품 배송비 무료";
  const from = order.type === "rent" ? "보증금에서" : "환불액에서";
  return `반품 배송비(편도) ${won(fee)} · ${from} 차감`;
};

/** 신청 구분 배지 — 클레임 종류 이름. 원본은 1단계 상태명(「취소 요청」)을 고정으로 찍었다 */
export const claimTypeTextOf = (order: Order) =>
  order.claim ? CLAIM_TYPE_LABEL[order.claim.type] : NONE;

/**
/**
 * 클레임 몫 — 돈이 **무엇을 기준으로** 움직이는지 묶음마다 기준 → 차감 → 결과로 보인다.
 * 결과가 둘이면(렌트 취소: 환불 + 보증금 반환) 묶음도 둘 — 둘을 합친 총액은 만들지 않는다.
 *
 * | 경우             | 묶음                                                                                  |
 * | ---------------- | ------------------------------------------------------------------------------------- |
 * | 취소             | 「환불」 결제금액 → 환불 예정액/완료 · (렌트) 「보증금」 보증금 → 반환 예정액/완료        |
 * | 판매 반품        | 「환불」 결제금액 → (고객 귀책) 반품 배송비 − → 환불 예정액/완료                          |
 * | 렌트 반품        | 「결제」 결제금액 · 「보증금」 보증금 → (고객 귀책) 반품 배송비 − → 반환 예정액/완료       |
 * | 교환             | 「결제」 결제금액 · 「교환」 처리 문장(교환 배송비는 1차 미징수 — 청구 줄 없음)             |
 * | 반려·거부·재반송 | 「결제」 결제금액 · 「결과」 처리 문장 (+ 렌트면 「별도」 보증금)                          |
 *
 * 처리 문장(「환불 없음 — 원거래 유지」 류)은 금액이 아니라 `message` 줄이다.
 * - 렌트 취소는 **무료 취소**(출고 전·위약금 없음)만 다룬다 — 결제금액 전액 + 보증금 반환을 따로
 *   (사용자 결정 2026-11-02). 원본은 렌트 취소에 보증금 반환만 있어 렌트료 환불이 빠졌다
 * - 환불은 **그 처리단위의 결제금액** 기준이다 — 같은 주문번호의 다른 처리단위를 끌어오지 않는다
 * - 렌트 반품은 원본처럼 보증금만 돌려준다. 반환액은 보증금 함수(`depositOf`) 하나가 정한다 —
 *   배송비를 여기서 다시 빼지 않는다(차감 줄은 보이기만 한다)
 */
const claimBlocksOf = (order: Order): CalcBlock[] => {
  const claim = order.claim;
  if (!claim) return [];
  const done = isClaimDone(order);
  const depositRefund = depositOf(order)?.refund ?? 0;
  const pay = payTotalOf(order);
  const fee = claimFeeOf(order);
  const rent = order.type === "rent";
  const payBlock: CalcBlock = {
    key: "pay",
    label: "결제",
    lines: [payLineOf(order, "subtotal")],
  };
  const depositBase = calcLine("deposit", "보증금", won(order.deposit ?? 0), {
    hint: "결제금액에 포함 안 됨",
  });
  const depositResult = calcLine(
    "depositRefund",
    done ? "보증금 반환 완료" : "보증금 반환 예정액",
    won(depositRefund),
    { kind: "total" },
  );
  const message = (label: string): CalcLine => ({
    key: "result",
    label,
    kind: "message",
  });

  if (claim.type === "cancel") {
    const refund: CalcBlock = {
      key: "refund",
      label: "환불",
      emphasis: true,
      lines: [
        payLineOf(order, "subtotal"),
        calcLine("refund", done ? "환불 완료" : "환불 예정액", won(pay), {
          kind: "total",
          hint: "결제금액 전액",
        }),
      ],
    };
    if (!rent) return [refund];
    return [
      refund,
      {
        key: "depositRefund",
        label: "보증금",
        emphasis: true,
        lines: [depositBase, depositResult],
      },
    ];
  }

  if (isClaimRefused(order)) {
    return [
      payBlock,
      {
        key: "result",
        label: "결과",
        emphasis: true,
        lines: [
          message(
            claim.type === "return"
              ? "환불 없음 — 원거래 유지"
              : "교환 불가 — 원거래 유지",
          ),
        ],
      },
      ...depositAsideOf(order),
    ];
  }

  /* 교환 배송비는 1차에 받지 않아 청구 줄을 붙이지 않는다(디자인 §3 #9 · 개발 c9f21b9 · 3차 회신 Q-11) */
  if (claim.type === "exchange") {
    return [
      payBlock,
      {
        key: "result",
        label: "교환",
        emphasis: true,
        lines: [
          message(
            done ? "환불 없음 — 재배송 완료" : "환불 없음 — 검수 후 재배송",
          ),
        ],
      },
    ];
  }

  /* 반품 — 렌트는 보증금, 판매는 결제금액이 기준이다 */
  const feeLines = (from: string) =>
    fee > 0
      ? [
          calcLine("returnFee", "반품 배송비", less(fee), {
            hint: `편도 · 고객 귀책 · ${from} 차감`,
          }),
        ]
      : [];
  if (rent) {
    return [
      payBlock,
      {
        key: "depositRefund",
        label: "보증금",
        emphasis: true,
        lines: [depositBase, ...feeLines("보증금에서"), depositResult],
      },
    ];
  }
  return [
    {
      key: "refund",
      label: "환불",
      emphasis: true,
      lines: [
        payLineOf(order, "subtotal"),
        ...feeLines("환불액에서"),
        calcLine(
          "refund",
          done ? "환불 완료" : "환불 예정액",
          won(Math.max(0, pay - fee)),
          { kind: "total" },
        ),
      ],
    },
  ];
};

/**
 * 클레임 결과 줄만 — 본문 주문정보의 결과 줄이 읽는다(팝업과 **같은 값·같은 문구**).
 * 환불·반환 금액(`total`)과 처리 문장(`message`)만 — 교환에 환불액을 새로 만들지 않는다.
 */
export const claimResultsOf = (order: Order): CalcLine[] =>
  claimBlocksOf(order)
    .flatMap((block) => block.lines)
    .filter((line) => line.kind === "total" || line.kind === "message");

export interface StatementLine {
  label: string;
  value: string;
  tone: "plain" | "total";
}

/**
 * 클레임 몫을 평평한 줄로 — 보증금 순수 함수 테스트(`deposit.data.test.ts`)가 결과 줄(`total`)
 * 값을 읽어 보증금 함수와 맞춰 본다. 화면은 `statementBlocksOf` 를 쓴다.
 */
export const claimStatementOf = (order: Order): StatementLine[] =>
  claimBlocksOf(order)
    .flatMap((block) => block.lines)
    .map((line) => ({
      label: line.label,
      value: line.value ?? "",
      tone: line.kind === "total" ? "total" : "plain",
    }));
