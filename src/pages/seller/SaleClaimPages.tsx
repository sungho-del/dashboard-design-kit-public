import { ProcessList } from "./ProcessList";
import { SALE_CANCEL, SALE_EXCHANGE, SALE_RETURN } from "./SaleClaimPages.data";

/* =========================================================================
 * 취소 관리 · 반품 관리 · 교환 관리 — 목록형 · 처리 화면 3장 (BabyCube 입점사 어드민)
 *
 * 뼈대는 판매 처리 목록 공용 `ProcessList`. 원본도 한 함수(`saleRmaScreen`)가 유형만 바꿔 세 화면을 그린다 —
 * 그래서 한 파일에 둔다. 화면마다 주는 것은 설정 하나다(`SaleClaimPages.data.ts`).
 * - 취소: 카드 취소 요청·환불 처리중·취소 완료 · 행 송장 [송장등록] → 반품 전환
 * - 반품·교환: 카드 접수·진행·완료(단계 버킷) · 행 수거 송장(신청 상태만)
 * ====================================================================== */

export interface SaleClaimPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function SaleCancelPage(props: SaleClaimPageProps) {
  return <ProcessList {...props} config={SALE_CANCEL} />;
}

export function SaleReturnPage(props: SaleClaimPageProps) {
  return <ProcessList {...props} config={SALE_RETURN} />;
}

export function SaleExchangePage(props: SaleClaimPageProps) {
  return <ProcessList {...props} config={SALE_EXCHANGE} />;
}
