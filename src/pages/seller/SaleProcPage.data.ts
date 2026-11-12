import { preDispatchLink, type ProcessListConfig } from "./processList.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 발주 관리(SO-ORD-001) — **도메인 층**(화면 설정). 뼈대는 공용 `ProcessList.tsx`.
 *
 * 원본 = 기획 v0.4 `SCREENS.saleProc`(3923) · `FILTERS.saleProc`(2385) · `rentOrderTable`(4110).
 * 대조 문서 `docs/seller/pilot-saleProc.md`.
 * ====================================================================== */

/**
 * 원본 `SCREENS.saleProc` — 판매 처리단위 중 **`stat`** 이 세 상태인 것.
 * ⚠️ 판매자를 거르지 않는다 — 본사 자체 처리단위도 섞인다(원본 `SALE_UNITS()` · 기획 확인 필요).
 */
export const SALE_PROC_UNITS: OrderUnit[] = UNITS.filter(
  (u) =>
    u.type === "판매" &&
    ["신규 주문", "배송 준비", "배송 지연"].includes(u.stat ?? ""),
);

export const SALE_PROC: ProcessListConfig = {
  screen: "saleProc",
  title: "발주 관리",
  units: SALE_PROC_UNITS,
  /* 원본 `chip.values` — 화면에서는 변수 상태(배송 지연)가 앞, 대표(신규 주문)가 맨 앞 */
  cards: ["신규 주문", "배송 준비", "배송 지연"],
  defaultCard: "신규 주문",
  dateFields: [
    { value: "orderedAt", label: "결제일" },
    { value: "confirmedAt", label: "주문 확인일" },
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
  /* 원본 `list.bulk.options` 순서 · 값 → 글자 */
  bulk: [
    { value: "배송중", label: "배송중" },
    { value: "배송 준비", label: "배송 준비" },
    { value: "배송 지연", label: "배송 지연" },
    { value: "취소", label: "주문 취소" },
  ],
  /* 고른 카드에서 갈 수 있는 곳만(원본 `bulk.by` · UI-284) */
  bulkBy: {
    "신규 주문": ["배송 준비", "배송 지연", "취소"],
    "배송 준비": ["배송중", "배송 지연", "취소"],
    "배송 지연": ["배송 준비", "배송중", "취소"],
  },
  /* 단건 전용 — 2건 이상 고르면 잠근다(원본 `bulk.single` · 2026-08-06 사용자 지시) */
  singleOnly: ["취소"],
  /* 택배사·송장번호 열은 **배송 준비·배송 지연 카드에서만**(원본 `orderColFlags.shipCols`) */
  shipColumns: (card) => (card === "신규 주문" ? null : "register"),
  /* 방문 수령 준비 단계 [준비 완료] · 「전체」(`?stat=`)의 신규 주문 [주문 확인] — 상세로(개발 요청 15번) */
  rowLink: preDispatchLink,
  detailPath: (u) => `/sale-proc/${u.id}`,
};
