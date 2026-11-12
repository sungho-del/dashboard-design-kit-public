import type { OrdersOverviewConfig } from "./ordersOverview.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";
import { CATS, homePathOf } from "./SaleOrdersPage.labels";

export * from "./SaleOrdersPage.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./SaleOrdersPage.labels`(개발 요청 2026-11-12 46번) */

/* =========================================================================
 * 주문 통합 관리(SO-ORD-003) — **도메인 층**(화면 설정). 뼈대는 공용 `OrdersOverview.tsx` ·
 * 계약·검색·집계는 `ordersOverview.data.ts`.
 *
 * 원본 = 기획 v0.4 `SCREENS.saleOrders`(3913) · `FILTERS.saleOrders`(2373) · `orderHomeScr`(3846).
 * 정답 대조: `saleOrders.golden.ts`(원본에서 판매 처리단위 89건마다 뽑은 처리상태·담당 메뉴).
 * ====================================================================== */

/** 원본 `SALE_UNITS()` — 판매 처리단위 전부(판매자를 거르지 않는다 · 본사 자체 건도 섞인다 · 기획 확인) */
export const SALE_ORDER_UNITS: OrderUnit[] = UNITS.filter(
  (u) => u.type === "판매",
);

export const SALE_ORDERS: OrdersOverviewConfig = {
  title: "주문 통합 관리",
  units: SALE_ORDER_UNITS,
  cats: CATS,
  homePathOf,
};
