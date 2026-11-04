import {
  SALE_CANCEL_DETAIL,
  SALE_EXCHANGE_DETAIL,
  SALE_RETURN_DETAIL,
} from "./SaleClaimDetailPage.data";
import { UnitDetail } from "./UnitDetail";

/* =========================================================================
 * 취소 상세 · 반품 상세 · 교환 상세 — 상세형 · 처리 화면 3장 (BabyCube 입점사 어드민)
 *
 * 뼈대는 판매 상세 공용 `UnitDetail`(클레임 모드 — 주문정보 「{유형} 정보」 · 상태 두 칸 · 명세 환불 몫 ·
 * 클레임 이력). 원본도 한 함수(`udRmaDetail`)가 유형만 바꿔 그린다 — 그래서 한 파일에 둔다.
 * ====================================================================== */

export interface SaleClaimDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function SaleCancelDetailPage(props: SaleClaimDetailPageProps) {
  return <UnitDetail {...props} config={SALE_CANCEL_DETAIL} />;
}

export function SaleReturnDetailPage(props: SaleClaimDetailPageProps) {
  return <UnitDetail {...props} config={SALE_RETURN_DETAIL} />;
}

export function SaleExchangeDetailPage(props: SaleClaimDetailPageProps) {
  return <UnitDetail {...props} config={SALE_EXCHANGE_DETAIL} />;
}
