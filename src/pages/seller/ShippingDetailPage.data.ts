import { UNITS } from "./seed/orders.data";
import type { UnitDetailConfig } from "./unitDetail.data";

/* =========================================================================
 * 배송 관리 상세(SO-DLV-002) — **도메인 층**(화면 설정). 뼈대는 공용 `UnitDetail.tsx`.
 *
 * 원본 = 기획 v0.4 `DETAILS.shipping`(5032) → `udOrderPage(u, {statOpts: SALE_STAT_DISP, shipMode: 'edit'})`.
 * ====================================================================== */

export const SHIPPING_DETAIL: UnitDetailConfig = {
  screen: "shipping",
  title: "배송 관리 상세",
  listPath: "/shipping",
  listLabel: "배송 관리로",
  /* 원본 — 판매 처리단위면 상태를 가리지 않는다 */
  find: (id) => UNITS.find((u) => u.id === id && u.type === "판매"),
  /* 원본 `SALE_STAT_DISP` — 구매확정은 선택지에 없다(PC-2 · 어드민 금지 전이) */
  statusOptions: [
    { value: "배송중", label: "배송중" },
    { value: "배송 완료", label: "배송 완료" },
  ],
  shipMode: () => "edit",
  /* 원본 `extraBtns` — 배송중에만. [배송 완료 처리]는 셀렉트와 같은 게이트(원본 `saleDeliver` → `rentStatSel`) */
  actions: (u) =>
    u.stat === "배송중"
      ? [
          { label: "배송 완료 처리", to: "배송 완료" },
          { label: "배송 추적", special: "track" },
        ]
      : [],
};
