import {
  CLAIM_BUCKETS,
  claimStatOf,
  claimStatuses,
  type ClaimType,
} from "./claim.data";
import type { ProcessListConfig } from "./processList.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 취소 관리(SO-RMA-001) · 반품 관리(SO-RMA-003) · 교환 관리(SO-RMA-005) — **도메인 층**(화면 설정 3벌).
 * 뼈대는 공용 `ProcessList.tsx`. 원본도 한 함수(`saleRmaScreen(scr, type)`)가 세 화면을 그린다.
 *
 * 원본 = 기획 v0.4 `saleRmaScreen`(3938) · `FILTERS.saleCancel|saleReturn|saleExchange`(2409~2440) ·
 * 취소 카드 `rmaStatDash`(2588) · 반품·교환 카드 `rmaBucketChip`(1681).
 * ====================================================================== */

/** 원본 `saleRmaScreen` base — 판매 처리단위 중 그 유형의 클레임이 있는 것(판매자를 거르지 않는다) */
export const claimUnitsOf = (type: ClaimType): OrderUnit[] =>
  UNITS.filter(
    (u) => u.type === "판매" && u.req?.type === type && !!u.req.stat,
  );

/** 상태변경 버튼 — 원본 `rmaOpts(type)`(흐름 + 예외) 순서 · 값 = 글자 */
const bulkOf = (type: ClaimType) =>
  claimStatuses(type).map((s) => ({ value: s, label: s }));

/** 클레임 화면 검색 — 원본 `search.fieldOpts`(전체 없음 · 주문번호가 기본) */
const CLAIM_SEARCH = [
  { value: "no", label: "주문번호" },
  { value: "mem", label: "회원명" },
  { value: "prod", label: "상품명" },
] as const;

export const SALE_CANCEL: ProcessListConfig = {
  screen: "saleCancel",
  title: "취소 관리",
  units: claimUnitsOf("취소"),
  /* 취소는 상태가 셋뿐이라 버킷 없이 상태 카드(원본 `rmaStatDash`) */
  cards: claimStatuses("취소"),
  defaultCard: "취소 요청",
  dateFields: [
    { value: "orderedAt", label: "결제일" },
    { value: "confirmedAt", label: "주문 확인일" },
    { value: "reqAppliedAt", label: "취소 요청일" },
    { value: "reqDoneAt", label: "취소 완료일" },
  ],
  searchFields: CLAIM_SEARCH,
  bulk: bulkOf("취소"),
  /* 취소 3단계는 순차뿐(예외 종결 없음) — 각 상태에서 다음 한 곳만(UI-284) */
  bulkBy: {
    "취소 요청": ["환불 처리중"],
    "환불 처리중": ["취소 완료"],
    "취소 완료": [],
  },
  /* 출고 송장 칸 + [송장등록] → 반품으로 전환(원본 `cancelToReturn`) */
  shipColumns: () => "cancel",
  detailPath: (u) => `/sale-cancel/${u.id}`,
};

/** 반품·교환 — 카드 = 단계 버킷 3장(접수·진행·완료 · 원본 2026-08-05 A안) · 기본 [접수] */
const bucketConfig = (
  type: "반품" | "교환",
  screen: "saleReturn" | "saleExchange",
  path: string,
  progress: readonly string[],
): ProcessListConfig => ({
  screen,
  title: `${type} 관리`,
  units: claimUnitsOf(type),
  cards: ["접수", "진행", "완료"],
  defaultCard: "접수",
  inCard: (u, card) =>
    (CLAIM_BUCKETS[type][card as "접수" | "진행" | "완료"] ?? []).includes(
      claimStatOf(u),
    ),
  dateFields: [
    { value: "orderedAt", label: "결제일" },
    { value: "reqAppliedAt", label: `${type} 신청일` },
    { value: "reqDoneAt", label: `${type} 완료일` },
  ],
  searchFields: CLAIM_SEARCH,
  bulk: bulkOf(type),
  /* 고른 버킷에서 갈 수 있는 곳만 — 완료 버킷은 종결이라 버튼 없음 */
  bulkBy: {
    접수: [`${type} 승인`, `${type} 거부`],
    진행: progress,
    완료: [],
  },
  /* 수거 송장 칸 — 신청 상태만 편집 · [송장등록] → 수거중(원본 `rmaCollectShip`) */
  shipColumns: () => "collect",
  detailPath: (u) => `${path}/${u.id}`,
});

export const SALE_RETURN = bucketConfig("반품", "saleReturn", "/sale-return", [
  "반품 수거완료",
  "반품 검수",
  "환불 처리중",
  "반품 완료",
]);

export const SALE_EXCHANGE = bucketConfig(
  "교환",
  "saleExchange",
  "/sale-exchange",
  ["교환 수거완료", "교환 검수", "교환 재배송", "교환 완료"],
);
