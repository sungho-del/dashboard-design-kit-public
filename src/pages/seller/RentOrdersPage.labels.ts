import { flowOptionsOf } from "./ordersOverview.data";
import type { OrderUnit } from "./seed/orders.data";

/* 셀러 `RentOrdersPage.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./RentOrdersPage.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

/** 처리구분 — 원본 `ORDER_CATS.rentOrders`(렌트에는 교환이 없다 · H-11) */
export const RENT_CATS = ["렌트", "취소", "반품"] as const;
export const rentFlowOptions = (cat: string) =>
  flowOptionsOf(RENT_CATS, cat ? [cat] : []);

/**
 * 주문번호 목적지 — 렌트 주문 상세 `/rent-orders/{처리단위}`(develop `rentOrderPathOf` · 개발 요청 2026-11-12 2번).
 * 처리상태 담당 메뉴로 가르던 원본 `orderHomeScr` 는 버렸다(판매와 같은 까닭)
 */
export const rentHomePathOf = (u: OrderUnit) => `/rent-orders/${u.id}`;
