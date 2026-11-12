import {
  SALE_ORDER_DETAIL,
  SALE_ORDERS_DETAIL,
} from "./SaleOrderDetailPage.data";
import { UnitDetail } from "./UnitDetail";

/* =========================================================================
 * 발주 관리 상세(SO-ORD-002) — 상세형 · 처리 화면 (BabyCube 입점사 어드민)
 *
 * 뼈대는 판매 상세 공용 `UnitDetail`(원본도 `udOrderPage` 한 틀) — 이 화면이 주는 것은
 * `SALE_ORDER_DETAIL` 설정 하나다(상태 선택지 · 출고 전 송장 등록 · [배송지 변경]·[주문 취소]).
 * ====================================================================== */

export interface SaleOrderDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function SaleOrderDetailPage(props: SaleOrderDetailPageProps) {
  return <UnitDetail {...props} config={SALE_ORDER_DETAIL} />;
}

/** 판매 주문 상세 — 주문 통합 관리에서 여는 같은 틀(개발 요청 2026-11-12 2번) */
export function SaleOrdersDetailPage(props: SaleOrderDetailPageProps) {
  return <UnitDetail {...props} config={SALE_ORDERS_DETAIL} />;
}
