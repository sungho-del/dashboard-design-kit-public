import type { ProcessListConfig } from "./processList.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 배송 관리(SO-DLV-001) — **도메인 층**(화면 설정). 뼈대는 공용 `ProcessList.tsx`.
 *
 * 원본 = 기획 v0.4 `SCREENS.shipping`(3929) · `FILTERS.shipping`(2398) · `rentOrderTable`(4110).
 * ====================================================================== */

/** 원본 `SCREENS.shipping` — 판매 처리단위 중 배송중·배송 완료·구매확정(판매자를 거르지 않는다 · 발주와 같다) */
export const SHIPPING_UNITS: OrderUnit[] = UNITS.filter(
  (u) =>
    u.type === "판매" &&
    ["배송중", "배송 완료", "구매확정"].includes(u.stat ?? ""),
);

export const SHIPPING: ProcessListConfig = {
  screen: "shipping",
  title: "배송 관리",
  units: SHIPPING_UNITS,
  cards: ["배송중", "배송 완료", "구매확정"],
  defaultCard: "배송중",
  dateFields: [
    { value: "orderedAt", label: "결제일" },
    { value: "confirmedAt", label: "주문 확인일" },
    { value: "deliveredAt", label: "배송 완료일" },
    { value: "purchasedAt", label: "구매 확정일" },
  ],
  searchFields: [
    { value: "all", label: "전체" },
    { value: "mem", label: "구매자명" },
    { value: "email", label: "구매자 ID" },
    { value: "receiver", label: "수령인" },
    { value: "receiverTel", label: "수령인 연락처" },
    { value: "no", label: "주문번호" },
    { value: "code", label: "상품코드" },
    { value: "invoice", label: "송장번호" },
  ],
  /*
    배송중 → [배송 완료]만. 배송 완료 다음은 어드민 조작이 없다 — 구매확정은 고객 확정 또는
    배송 완료 후 7일 자동(원본 도메인모델 PC-2 · [구매확정 처리] 제거)
  */
  bulk: [{ value: "배송 완료", label: "배송 완료" }],
  bulkBy: { 배송중: ["배송 완료"], "배송 완료": [], 구매확정: [] },
  /* 원본 `list.actionsBefore` — 상태변경 버튼 앞 [송장수정](일괄) */
  invoiceEditBulk: true,
  /* 출고 송장 열은 모든 카드에 · 행 버튼은 [송장수정] */
  shipColumns: () => "edit",
  detailPath: (u) => `/shipping/${u.id}`,
};
