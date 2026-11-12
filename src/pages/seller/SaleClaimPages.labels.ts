import { claimStatuses, type ClaimType } from "./claim.labels";

/* 셀러 `SaleClaimPages.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./SaleClaimPages.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

/** 상태변경 버튼 — 원본 `rmaOpts(type)`(흐름 + 예외) 순서 · 값 = 글자 */
export const bulkOf = (type: ClaimType) =>
  claimStatuses(type).map((s) => ({ value: s, label: s }));

/** 클레임 화면 검색 — 원본 `search.fieldOpts`(전체 없음 · 주문번호가 기본) */
export const CLAIM_SEARCH = [
  { value: "no", label: "주문번호" },
  { value: "mem", label: "회원명" },
  { value: "prod", label: "상품명" },
] as const;
