import { ProcessList } from "./ProcessList";
import { SHIPPING } from "./ShippingPage.data";

/* =========================================================================
 * 배송 관리(SO-DLV-001) — 목록형 · 처리 화면 (BabyCube 입점사 어드민)
 *
 * 뼈대는 판매 처리 목록 공용 `ProcessList` — 이 화면이 주는 것은 `SHIPPING` 설정 하나다
 * (카드 배송중·배송 완료·구매확정 · 머리 [송장수정][배송 완료] · 행 [송장수정]).
 * ====================================================================== */

export interface ShippingPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function ShippingPage(props: ShippingPageProps) {
  return <ProcessList {...props} config={SHIPPING} />;
}
