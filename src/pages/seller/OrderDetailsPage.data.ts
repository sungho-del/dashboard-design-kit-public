import type { CalcBlock } from "../babycube/CalcBreakdown";
import { flowStatOf } from "./orderUnit.data";
import { PAYORDERS, UNITS, type PayOrder } from "./seed/orders.data";

/* =========================================================================
 * 주문 상세(통합 · SO-ORD-002) — 결제(주문번호) 한 건 · 도메인
 *
 * 원본 = 기획 v0.4 `DETAILS.orderDetail`(5047) · `unitsOf`(1283). 개발 저장소 경로 `/order-details/[orderNo]`.
 * 한 결제 안의 처리단위는 담당(자체/입점사)·진행 상태가 각각 독립이라 표로 늘어놓고, 상품명을 누르면
 * 유형별 처리단위 상세(렌트 → 렌트 발주 · 판매 → 발주)로 간다.
 *
 * ## 기획 확인 필요 (원본대로 둔 것)
 * - 원본 돌아갈 곳 `ordersAll`(전체 주문 목록)은 셀러 앱에 없는 화면이다 — 우리는 주문 통합 관리(`/sale-orders`)로 돌아간다
 * - 결제 요약의 판매·렌탈료 합계 = 처리단위 저장 금액(`u.amt`) 합 · 결제 합계 = 결제 저장값(`o.amt`) — 둘이 다를 수 있다(원본 특이점)
 * - 셀러 화면인데 한 결제의 **다른 셀러·본사 처리단위까지** 보인다(원본 `unitsOf` 가 판매자를 거르지 않는다)
 * - 이 화면으로 오는 통로가 원본 셀러 메뉴에 없다(화면 목록에서만 연다)
 * ====================================================================== */

export const LIST_PATH = "/order-details";
export const BACK_PATH = "/sale-orders";

export const findPayOrder = (no: string) => PAYORDERS.find((o) => o.no === no);
export const unitsOf = (no: string) => UNITS.filter((u) => u.no === no);

export const PAY_STATS = ["결제완료", "입금대기", "결제취소"].map((v) => ({
  value: v,
  label: v,
}));

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
export { won };

export const unitPathOf = (u: { type: string; id: string }) =>
  u.type === "렌트" ? `/rent-list/${u.id}` : `/sale-proc/${u.id}`;
export const unitStatusOf = flowStatOf;

export function summaryBlocks(o: PayOrder): CalcBlock[] {
  const us = unitsOf(o.no);
  const sum = (type: string) =>
    us.filter((u) => u.type === type).reduce((a, u) => a + u.amt, 0);
  return [
    {
      key: "sum",
      lines: [
        { key: "sale", label: "판매 합계", value: won(sum("판매")) },
        { key: "rent", label: "렌탈료 합계", value: won(sum("렌트")) },
        {
          key: "dep",
          label: "보증금",
          hint: "별도 점유",
          value: won(us.reduce((a, u) => a + (u.dep || 0), 0)),
        },
      ],
    },
    {
      key: "total",
      emphasis: true,
      lines: [
        { key: "total", label: "결제 합계", value: won(o.amt), kind: "total" },
      ],
    },
  ];
}

export const ORDER_DETAIL_COPY = {
  unitsTitle: "주문 상품 — 담당·진행 상태는 상품별로 관리됩니다",
  guide:
    "한 주문(결제) 안의 상품은 **담당(자체/입점사)과 진행 상태가 각각 독립**적으로 진행됩니다. 상품명을 클릭하면 해당 관리 상세로 이동합니다.",
  receipt: (no: string) => `${no} 영수증`,
  deposit: (no: string) => `${no} 입금 확인`,
  saved: "저장되었습니다.",
} as const;
