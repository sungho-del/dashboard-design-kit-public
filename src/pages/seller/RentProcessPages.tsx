import { ProcessList } from "./ProcessList";
import {
  RENT_CANCEL,
  RENT_DISPATCH,
  RENT_INSP_RETURN,
  RENT_LIST,
  RENT_RMA,
  RENT_USE,
} from "./RentProcessPages.data";

/* =========================================================================
 * 렌트 처리 목록 6장 — 목록형 (BabyCube 입점사 어드민)
 *
 * 뼈대는 판매와 같은 공용 `ProcessList`(원본도 `rentOrderTable` 한 틀). 화면마다 주는 것은 설정 하나다
 * (`RentProcessPages.data.ts`).
 * - 렌트 발주: 신규·배송 준비·배송 지연 · 송장 [송장등록](출고 이미지 안내)
 * - 배송: 배송중 한 장 · [송장수정] · [배송 완료 (대여 시작)]
 * - 대여·연체: 상태 버튼 없음 · 수거 송장 [송장등록] · 머리 [수거 신청]
 * - 검수·반납: 수거 신청 → 검수중 → 검수완료 → 반납완료 (수거 신청에서 연체중)
 * - 취소 · 반품: 판매 클레임과 같은 카드(반품은 버킷) · 출고 송장 읽기
 * ====================================================================== */

export interface RentProcessPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function RentListPage(props: RentProcessPageProps) {
  return <ProcessList {...props} config={RENT_LIST} />;
}

export function RentDispatchPage(props: RentProcessPageProps) {
  return <ProcessList {...props} config={RENT_DISPATCH} />;
}

export function RentUsePage(props: RentProcessPageProps) {
  return <ProcessList {...props} config={RENT_USE} />;
}

export function RentInspReturnPage(props: RentProcessPageProps) {
  return <ProcessList {...props} config={RENT_INSP_RETURN} />;
}

export function RentCancelPage(props: RentProcessPageProps) {
  return <ProcessList {...props} config={RENT_CANCEL} />;
}

export function RentRmaPage(props: RentProcessPageProps) {
  return <ProcessList {...props} config={RENT_RMA} />;
}
