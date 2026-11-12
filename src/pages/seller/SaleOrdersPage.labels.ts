import { flowOptionsOf } from "./ordersOverview.data";
import type { OrderUnit } from "./seed/orders.data";

/* 셀러 `SaleOrdersPage.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./SaleOrdersPage.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

/** 처리구분 — 원본 `ORDER_CATS.saleOrders` */
export const CATS = ["판매", "취소", "반품", "교환"] as const;
export const flowOptions = (cat: string) =>
  flowOptionsOf(CATS, cat ? [cat] : []);

/**
 * 주문번호 목적지 — 판매 주문 상세 `/sale-orders/{처리단위}`(develop `saleOrderPathOf` · 개발 요청 2026-11-12 2번).
 * 담당 메뉴 상세로 가르던 원본 `orderHomeScr` 는 버렸다 — 목록 응답에 클레임 유형이 없어 「환불 처리중」·「재반송」을 메뉴로 가를 수 없다
 */
export const homePathOf = (u: OrderUnit) => `/sale-orders/${u.id}`;
