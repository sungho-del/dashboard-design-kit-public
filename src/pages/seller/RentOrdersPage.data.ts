import type { OrdersOverviewConfig } from "./ordersOverview.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";
import { RENT_CATS, rentHomePathOf } from "./RentOrdersPage.labels";

export * from "./RentOrdersPage.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./RentOrdersPage.labels`(개발 요청 2026-11-12 46번) */

/* =========================================================================
 * 렌트 주문 통합 관리(SO-ORD-004) — **도메인 층**(화면 설정). 뼈대는 공용 `OrdersOverview.tsx`.
 *
 * 원본 = 기획 v0.4 `SCREENS.rentOrders`(3918) · `FILTERS.rentOrders`(2442) · `orderHomeScr`(3846).
 * 정답 대조: `rentOrders.golden.ts`(원본에서 렌트 처리단위 94건마다 뽑은 처리상태·담당 메뉴).
 * ====================================================================== */

/** 원본 `RENT_UNITS()` — 렌트 처리단위 전부 */
export const RENT_ORDER_UNITS: OrderUnit[] = UNITS.filter(
  (u) => u.type === "렌트",
);

export const RENT_ORDERS: OrdersOverviewConfig = {
  title: "렌트 주문 통합 관리",
  units: RENT_ORDER_UNITS,
  cats: RENT_CATS,
  rent: true,
  homePathOf: rentHomePathOf,
};
