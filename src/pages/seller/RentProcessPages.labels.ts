/* 셀러 `RentProcessPages.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./RentProcessPages.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

/** 처리 4화면 검색 — 원본 `search.fieldOpts`(판매 발주와 같다) */
export const PROCESS_SEARCH = [
  { value: "all", label: "전체" },
  { value: "mem", label: "구매자명" },
  { value: "email", label: "구매자 ID" },
  { value: "receiver", label: "수령인" },
  { value: "receiverTel", label: "수령인 연락처" },
  { value: "no", label: "주문번호" },
  { value: "code", label: "상품코드" },
  { value: "invoice", label: "송장번호" },
] as const;
export const PROCESS_DATES = [
  { value: "orderedAt", label: "결제일" },
  { value: "confirmedAt", label: "주문 확인일" },
] as const;
/** 클레임 2화면 — 기간은 주문일 하나(원본 · 판매 클레임의 요청일·완료일은 없다) */
export const CLAIM_SEARCH = [
  { value: "no", label: "주문번호" },
  { value: "mem", label: "회원명" },
  { value: "prod", label: "상품명" },
] as const;
export const CLAIM_DATES = [{ value: "orderedAt", label: "주문일" }] as const;

export const RENT_LIST_STATS = ["신규 주문", "배송 준비", "배송 지연"];

/**
 * 대여·연체 — **상태 버튼이 없다**(원본 2026-08-06 A-2·A-3: 연장은 고객 결제 전이, 연체는 수거 신청 뒤에만).
 * 셀러 일은 [수거 신청](수거 송장 등록)뿐 · 출고 송장은 읽기
 */
export const RENT_USE_STATS = ["대여중", "대여중(연장)", "연체중"];

/**
 * 검수·반납 — 순차(수거 신청 → 검수중 → 검수완료 → 반납완료). **수거 신청에서만 연체중(회수 실패)으로 갈라진다**
 * (원본 A-3). 수거 송장은 수거 신청 건만 [송장수정]
 */
export const RENT_INSP_STATS = ["수거 신청", "검수중", "검수완료", "반납완료"];
