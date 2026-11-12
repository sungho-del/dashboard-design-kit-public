import { UNITS } from "./seed/orders.data";
import { preShipActions, type UnitDetailConfig } from "./unitDetail.data";
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
  /* 출고 전에만 — develop 버튼 순서([배송중 전환] · [준비 완료] · [배송 지연] · [배송지 변경] · [주문 취소] · 개발 요청 16~18번) */
  actions: (u) => (isPreShip(u) ? preShipActions(u) : []),
};

/**
 * 판매 주문 상세 `/sale-orders/{처리단위}` — 주문 통합 관리에서 연다(개발 요청 2026-11-12 2번).
 * develop 은 발주 상세와 같은 화면(`saleOrderDetail` · listRoute `/sale-orders`)이라 설정도 제목·목록만 바꾼다
 */
export const SALE_ORDERS_DETAIL: UnitDetailConfig = {
  ...SALE_ORDER_DETAIL,
  title: "판매 주문 상세",
  listPath: "/sale-orders",
  listLabel: "주문 통합 관리로",
};
