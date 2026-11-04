import { UNITS, type OrderUnit } from "./seed/orders.data";
import type { UnitDetailConfig } from "./unitDetail.data";

/* =========================================================================
 * 발주 관리 상세(SO-ORD-002) — **도메인 층**(화면 설정). 뼈대는 공용 `UnitDetail.tsx`,
 * 상세 공용 값(명세·날짜·배송지)은 `unitDetail.data.ts`.
 *
 * 원본 = 기획 v0.4 `DETAILS.saleOrderDetail`(5026) → `udOrderPage`(4930). 대조 문서 `docs/seller/pilot-saleProc.md` B 절.
 * ====================================================================== */

/** 경로 — 목록 `/sale-proc` 뒤에 처리단위 id */
export const LIST_PATH = "/sale-proc";

/**
 * 원본 `byKey(UNITS, k, 'id')` + `u.type === '판매'` — **판매 처리단위면 상태를 가리지 않는다**
 * (배송중·구매확정 건도 열린다 · 이때 상태는 배지, 배송정보는 읽기 전용, 하단 처리 버튼은 없다)
 */
export const findSaleUnit = (id: string) =>
  UNITS.find((u) => u.id === id && u.type === "판매");

/** 출고 전 — 상태 셀렉트·송장 등록·[배송지 변경]·[주문 취소]가 살아 있는 상태(원본 `preShip`) */
const PRE_SHIP = ["신규 주문", "배송 준비", "배송 지연"];
export const isPreShip = (u: OrderUnit) => PRE_SHIP.includes(u.stat ?? "");

export const SALE_ORDER_DETAIL: UnitDetailConfig = {
  screen: "saleProc",
  title: "발주 관리 상세",
  listPath: LIST_PATH,
  listLabel: "발주 관리로",
  find: findSaleUnit,
  /* 원본 `statOpts` — 지금 상태가 여기 없으면 셀렉트 대신 배지(원본 `udStatSel`) */
  statusOptions: [
    { value: "신규 주문", label: "신규 주문" },
    { value: "배송 준비", label: "배송 준비" },
    { value: "배송 지연", label: "배송 지연" },
    { value: "취소", label: "주문 취소" },
  ],
  shipMode: (u) => (isPreShip(u) ? "register" : "ro"),
  /* 원본 `extraBtns` — 출고 전에만 [배송지 변경]·[주문 취소] */
  actions: (u) =>
    isPreShip(u)
      ? [
          { label: "배송지 변경", special: "address" },
          { label: "주문 취소", to: "취소", tone: "criticalTonal" },
        ]
      : [],
};
