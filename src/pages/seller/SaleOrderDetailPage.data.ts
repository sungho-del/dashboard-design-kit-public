import { UNITS } from "./seed/orders.data";
import type { UnitDetailConfig } from "./unitDetail.data";
import { LIST_PATH, isPreShip } from "./SaleOrderDetailPage.labels";

export * from "./SaleOrderDetailPage.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./SaleOrderDetailPage.labels`(개발 요청 2026-11-12 46번) */

/**
 * 원본 `byKey(UNITS, k, 'id')` + `u.type === '판매'` — **판매 처리단위면 상태를 가리지 않는다**
 * (배송중·구매확정 건도 열린다 · 이때 상태는 배지, 배송정보는 읽기 전용, 하단 처리 버튼은 없다)
 */
export const findSaleUnit = (id: string) =>
  UNITS.find((u) => u.id === id && u.type === "판매");

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
