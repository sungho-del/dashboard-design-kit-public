import { OrdersOverview } from "./OrdersOverview";
import { RENT_ORDERS } from "./RentOrdersPage.data";

/* =========================================================================
 * 렌트 주문 통합 관리(SO-ORD-004) — 목록형 · 조회 전용 (BabyCube 입점사 어드민)
 *
 * 뼈대는 판매와 같은 공용 `OrdersOverview`. 화면이 주는 것은 설정 하나(`RentOrdersPage.data.ts` —
 * 렌트 처리단위 · 처리구분 렌트/취소/반품 · 안심케어 · 이용기간 · 주문번호 목적지).
 * ====================================================================== */

export interface RentOrdersPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function RentOrdersPage(props: RentOrdersPageProps) {
  return <OrdersOverview {...props} config={RENT_ORDERS} />;
}
