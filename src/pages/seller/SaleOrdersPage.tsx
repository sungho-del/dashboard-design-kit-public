import { OrdersOverview } from "./OrdersOverview";
import { SALE_ORDERS } from "./SaleOrdersPage.data";

/* =========================================================================
 * 주문 통합 관리(SO-ORD-003) — 목록형 · 조회 전용 (BabyCube 입점사 어드민)
 *
 * 뼈대는 렌트와 같은 공용 `OrdersOverview`(원본도 `orderAllTable` 한 표). 화면이 주는 것은 설정 하나
 * (`SaleOrdersPage.data.ts` — 판매 처리단위 · 처리구분 판매/취소/반품/교환 · 주문번호 목적지).
 * ====================================================================== */

export interface SaleOrdersPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function SaleOrdersPage(props: SaleOrdersPageProps) {
  return <OrdersOverview {...props} config={SALE_ORDERS} />;
}
