import type { OrderUnit } from "./seed/orders.data";

/* 셀러 `SaleOrderDetailPage.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./SaleOrderDetailPage.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

/* =========================================================================
 * 발주 관리 상세(SO-ORD-002) — **도메인 층**(화면 설정). 뼈대는 공용 `UnitDetail.tsx`,
 * 상세 공용 값(명세·날짜·배송지)은 `unitDetail.data.ts`.
 *
 * 원본 = 기획 v0.4 `DETAILS.saleOrderDetail`(5026) → `udOrderPage`(4930). 대조 문서 `docs/seller/pilot-saleProc.md` B 절.
 * ====================================================================== */

/** 경로 — 목록 `/sale-proc` 뒤에 처리단위 id */
export const LIST_PATH = "/sale-proc";

/** 출고 전 — 상태 셀렉트·송장 등록·[배송지 변경]·[주문 취소]가 살아 있는 상태(원본 `preShip`) */
const PRE_SHIP = ["신규 주문", "배송 준비", "배송 지연"];
export const isPreShip = (u: OrderUnit) => PRE_SHIP.includes(u.stat ?? "");
