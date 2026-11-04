import {
  RENT_CANCEL_DETAIL,
  RENT_INSP_DETAIL,
  RENT_ORDER_DETAIL,
  RENT_RMA_DETAIL,
  RENT_SHIP_DETAIL,
  RENT_USE_DETAIL,
} from "./RentDetailPages.data";
import { UnitDetail } from "./UnitDetail";

/* =========================================================================
 * 렌트 상세 6종 — 상세형 (BabyCube 입점사 어드민)
 *
 * 뼈대는 판매와 같은 공용 `UnitDetail`(원본도 `udOrderPage` 한 틀). 화면마다 주는 것은 설정 하나다
 * (`RentDetailPages.data.ts`) — 상태 선택지 · 송장 칸 · 중간 구역 · 처리 버튼.
 * - 발주 · 배송: 출고 이미지 구역
 * - 대여·연체: 대여 정보(수거 신청) · 상품정보에 보증금
 * - 검수·반납: 대여 정보 · 검수 판정 · 보증금 정산 · 안심케어 청구(가입 건) · 상품 상태 이미지
 * - 취소 · 반품: 판매 클레임 상세와 같은 꼴 + 렌트 명세(보증금 반환)
 * ====================================================================== */

export interface RentDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function RentOrderDetailPage(props: RentDetailPageProps) {
  return <UnitDetail {...props} config={RENT_ORDER_DETAIL} />;
}

export function RentShipDetailPage(props: RentDetailPageProps) {
  return <UnitDetail {...props} config={RENT_SHIP_DETAIL} />;
}

export function RentUseDetailPage(props: RentDetailPageProps) {
  return <UnitDetail {...props} config={RENT_USE_DETAIL} />;
}

export function RentInspDetailPage(props: RentDetailPageProps) {
  return <UnitDetail {...props} config={RENT_INSP_DETAIL} />;
}

export function RentCancelDetailPage(props: RentDetailPageProps) {
  return <UnitDetail {...props} config={RENT_CANCEL_DETAIL} />;
}

export function RentRmaDetailPage(props: RentDetailPageProps) {
  return <UnitDetail {...props} config={RENT_RMA_DETAIL} />;
}
