import { ProcessList } from "./ProcessList";
import { SALE_PROC } from "./SaleProcPage.data";

/* =========================================================================
 * 발주 관리(SO-ORD-001) — 목록형 · 처리 화면 (BabyCube 입점사 어드민)
 *
 * 뼈대는 판매 처리 목록 공용 `ProcessList`(원본도 `rentOrderTable` 한 틀) — 이 화면이 주는 것은
 * `SALE_PROC` 설정 하나다(카드 3장 · 상태변경 버튼 · 단건 [주문 취소] · 배송 준비·지연 카드의 송장 열).
 * ====================================================================== */

export interface SaleProcPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function SaleProcPage(props: SaleProcPageProps) {
  return <ProcessList {...props} config={SALE_PROC} />;
}
