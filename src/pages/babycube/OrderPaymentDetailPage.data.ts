import type { CalcBlock } from "./CalcBreakdown";
import { MEMBERS, type PaymentStatus } from "./MemberListPage.data";
import { orderApprovedOf, payTotalOf } from "./OrderDetailPage.data";
import { isClaimRefused, ORDERS, won, type Order } from "./OrderListPage.data";
import { EXTENSIONS, type Extension } from "./RentContractDetailPage.data";

/* -------------------------------------------------------------------------
 * 결제 상세 — **도메인 층** (BabyCube 본사 운영 어드민 · 추가 작업 요청 2026-11-09 A1)
 *
 * 짝이 되는 뼈대: `OrderPaymentDetailPage.tsx` · 경로 `/order-detail/{주문번호}`
 * 기준: develop `order-detail/OrderDetailScreen.tsx` + 11/4 회신 부록 A(B15 · C26 · C27 · C28) — **조회 전용**
 *
 * ## 이 화면이 무엇인가
 * **결제(주문번호) 1건**이다. 처리단위 상세(`OrderDetailPage` · `/orders-all/{처리단위}`)가 아니다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `findPayment(주문번호)` → 결제 1건 | `undefined`
 * - `extension` 이 있으면 「렌트 연장」 줄을 그린다(연장 결제 주문 — 처리단위가 없다)
 * - `summaryBlocksOf` 의 네 값은 **판매 합계 + 렌탈료 합계 + 보증금 = 결제 합계**
 *
 * ## 예시 데이터 — 새로 만들지 않는다
 * - 일반 결제: 주문 목록 처리단위(`ORDERS`)를 주문번호로 묶는다. 합계는 주문 명세와 같은 함수(`payTotalOf`),
 *   결제 합계는 주문 명세 끝 「주문 전체 승인액」과 같은 함수(`orderApprovedOf`)다
 * - 연장 결제: 대여 상세의 연장 이력(`EXTENSIONS`) + 회원 결제 내역의 그 결제 건. 결제수단은 원 주문의 것
 *
 * ## 퍼블이 정한 것
 * - 부분 취소·반품 건수: 취소·반품 클레임이 달린 처리단위(반려·거부로 끝난 건과 교환은 세지 않는다)
 * - 결제취소: 처리단위가 모두 취소 완료일 때만
 * - 연장 결제 금액은 「렌탈료 합계」에 든다
 * ---------------------------------------------------------------------- */

export const LIST_PATH = "/orders-all";

export const SECTIONS = { info: "주문 정보", summary: "결제 요약" } as const;

export const COPY = {
  notFoundTitle: "찾을 수 없는 결제입니다",
  notFoundDescription: "주소가 잘못되었거나 없는 주문번호일 수 있습니다.",
  noClaim: "없음",
  claimed: (units: number, claimed: number) =>
    `상품 ${units}건 중 ${claimed}건 취소·반품 진행/완료`,
  /* 부록 A B15 — 뼈대가 이 조각 사이에 링크 둘을 끼운다 */
  extensionHead: (seq: number) => `렌트 연장 결제 ${seq}회 — 원 주문`,
  extensionUnit: "대여 건",
};

export interface Payment {
  orderNo: string;
  memberId: string;
  memberName: string;
  /** `YYYY.MM.DD HH:mm` */
  paidAt: string;
  payMethod: string;
  unitCount: number;
  claimedCount: number;
  status: PaymentStatus;
  saleSum: number;
  rentSum: number;
  depositSum: number;
  /** 결제 합계 — 보증금이 들어 있다 */
  payAmount: number;
  extension: Extension | null;
}

const dot = (text: string) => text.replace(/-/g, ".");

const sumOf = (units: Order[], pick: (order: Order) => number) =>
  units.reduce((sum, order) => sum + pick(order), 0);

const isClaimed = (order: Order) =>
  order.claim !== null &&
  order.claim.type !== "exchange" &&
  !isClaimRefused(order);

const PAYMENTS = MEMBERS.flatMap((member) => member.payments);

export const findPayment = (orderNo: string): Payment | undefined => {
  const units = ORDERS.filter((order) => order.orderNo === orderNo);
  if (units.length > 0) {
    const [first] = units;
    return {
      orderNo,
      memberId: first.buyerId,
      memberName: first.buyerName,
      paidAt: dot(first.date),
      payMethod: first.payMethod,
      unitCount: units.length,
      claimedCount: units.filter(isClaimed).length,
      status: units.every((order) => order.claim?.status === "canceled")
        ? "canceled"
        : "paid",
      saleSum: sumOf(
        units.filter((order) => order.type === "sale"),
        payTotalOf,
      ),
      rentSum: sumOf(
        units.filter((order) => order.type === "rent"),
        payTotalOf,
      ),
      depositSum: sumOf(units, (order) => order.deposit ?? 0),
      payAmount: orderApprovedOf(first),
      extension: null,
    };
  }

  /* 연장 결제 주문 — 처리단위 없이 새 주문번호로 발번해 원 처리단위에 잇는다 */
  const extension = EXTENSIONS.find((item) => item.payOrderNo === orderNo);
  const unit = ORDERS.find((order) => order.id === extension?.unitId);
  const paid = PAYMENTS.find((item) => item.orderNo === orderNo);
  if (!extension || !unit || !paid) return undefined;
  return {
    orderNo,
    memberId: unit.buyerId,
    memberName: unit.buyerName,
    paidAt: dot(paid.paidAt),
    payMethod: unit.payMethod,
    unitCount: 0,
    claimedCount: 0,
    status: paid.status,
    saleSum: 0,
    rentSum: paid.amount,
    depositSum: 0,
    payAmount: paid.amount,
    extension,
  };
};

/** 회원 결제 내역이 링크를 걸 수 있는 주문번호인가 — 결제 상세가 열리는 번호만 */
export const hasPayment = (orderNo: string) =>
  findPayment(orderNo) !== undefined;

export const paymentPathOf = (orderNo: string) => `/order-detail/${orderNo}`;
export const memberPathOf = (payment: Payment) =>
  `/members/${encodeURIComponent(payment.memberId)}`;
export const rentPathOf = (unitId: string) => `/rent-detail/${unitId}`;

/** 머리 설명 */
export const headlineOf = (payment: Payment) =>
  `${payment.orderNo} · ${payment.memberName}`;

/** 결제 요약 — 판매 합계 · 렌탈료 합계 · 보증금(부록 A C27) · 결제 합계(결과) */
export const summaryBlocksOf = (payment: Payment): CalcBlock[] => [
  {
    key: "parts",
    lines: [
      { key: "sale", label: "판매 합계", value: won(payment.saleSum) },
      { key: "rent", label: "렌탈료 합계", value: won(payment.rentSum) },
      { key: "deposit", label: "보증금", value: won(payment.depositSum) },
    ],
  },
  {
    key: "total",
    emphasis: true,
    lines: [
      {
        key: "pay",
        label: "결제 합계",
        value: won(payment.payAmount),
        kind: "total",
      },
    ],
  },
];
