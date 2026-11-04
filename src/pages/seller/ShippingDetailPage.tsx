import { SHIPPING_DETAIL } from "./ShippingDetailPage.data";
import { UnitDetail } from "./UnitDetail";

/* =========================================================================
 * 배송 관리 상세(SO-DLV-002) — 상세형 · 처리 화면 (BabyCube 입점사 어드민)
 *
 * 뼈대는 판매 상세 공용 `UnitDetail` — 이 화면이 주는 것은 `SHIPPING_DETAIL` 설정 하나다
 * (상태 배송중·배송 완료 · 송장 수정 · 배송중이면 [배송 완료 처리]·[배송 추적]).
 * ====================================================================== */

export interface ShippingDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function ShippingDetailPage(props: ShippingDetailPageProps) {
  return <UnitDetail {...props} config={SHIPPING_DETAIL} />;
}
