import { CLAIM_BUCKETS, claimStatOf, claimStatuses } from "./claim.data";
import { preDispatchLink, type ProcessListConfig } from "./processList.data";
import { OVERBOOKED_PRODUCTS } from "./ProductFormPage.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";
import {
  RENT_LIST_STATS,
  PROCESS_DATES,
  PROCESS_SEARCH,
  RENT_USE_STATS,
  RENT_INSP_STATS,
  CLAIM_DATES,
  CLAIM_SEARCH,
} from "./RentProcessPages.labels";

export * from "./RentProcessPages.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./RentProcessPages.labels`(개발 요청 2026-11-12 46번) */

/* =========================================================================
 * 렌트 처리 목록 6장 — **도메인 층**(화면 설정). 뼈대는 판매와 같은 공용 `ProcessList.tsx`.
 * 렌트 발주(SO-RNT-001) · 배송(SO-DLV-003) · 대여·연체(SO-RNT-003) · 검수·반납(SO-INS-001) ·
 * 취소(SO-RMA-007) · 반품(SO-RMA-008)
 *
 * 원본 = 기획 v0.4 `SCREENS.rentList|rentDispatch|rentUse|rentInspReturn`(4202~4247) · `rentRmaScreen`(4215) ·
 * `FILTERS.rent*`(2452~2516) · `rentOrderTable` 렌트 갈래(4110). 캡처 건수 `orig/16·18·20·22·24·26`.
 *
 * ## 원본과 다르게 둔 곳
 * - 렌트 취소·반품의 출고 택배사·송장 칸 — 원본은 열려 있는데 반영 버튼이 없다 → 읽기(기획 확인)
 * ====================================================================== */

/** 원본 `RENT_UNITS()` — 렌트 처리단위 전부(판매자를 거르지 않는다 · 판매와 같다) */
const RENT = UNITS.filter((u) => u.type === "렌트");
const inStats = (stats: readonly string[]) =>
  RENT.filter((u) => stats.includes(u.stat ?? ""));
export const RENT_LIST: ProcessListConfig = {
  screen: "rentList",
  title: "렌트 발주 관리",
  rent: true,
  units: inStats(RENT_LIST_STATS),
  cards: RENT_LIST_STATS,
  defaultCard: "신규 주문",
  dateFields: PROCESS_DATES,
  searchFields: PROCESS_SEARCH,
  bulk: [
    { value: "배송중", label: "배송중" },
    { value: "배송 준비", label: "배송 준비" },
    { value: "배송 지연", label: "배송 지연" },
    { value: "취소", label: "주문 취소" },
  ],
  bulkBy: {
    "신규 주문": ["배송 준비", "배송 지연", "취소"],
    "배송 준비": ["배송중", "배송 지연", "취소"],
    "배송 지연": ["배송 준비", "배송중", "취소"],
  },
  singleOnly: ["취소"],
  /* 신규 주문 카드엔 송장 열이 없다(원본 `shipCols` · 2026-08-07) */
  shipColumns: (card) => (card === "신규 주문" ? null : "register"),
  /* 자체 수령 준비 단계 [준비 완료] · 「전체」의 신규 주문 [주문 확인] — 상세로(개발 요청 27번) */
  rowLink: preDispatchLink,
  overbooked: OVERBOOKED_PRODUCTS,
  detailPath: (u) => `/rent-list/${u.id}`,
};

/** 배송중 하나뿐인 큐 — 카드 한 장(원본 `statDash(…,[['배송중']])`) · 배송 완료 = 대여 시작 */
export const RENT_DISPATCH: ProcessListConfig = {
  screen: "rentDispatch",
  title: "배송 관리",
  rent: true,
  units: inStats(["배송중"]),
  cards: ["배송중"],
  defaultCard: "배송중",
  dateFields: PROCESS_DATES,
  searchFields: PROCESS_SEARCH,
  bulk: [{ value: "배송 완료", label: "배송 완료 (대여 시작)" }],
  bulkBy: { 배송중: ["배송 완료"] },
  invoiceEditBulk: true,
  statusHelp:
    "렌트는 배송 완료가 곧 대여 시작입니다. 배송 완료 (대여 시작) 선택 시 즉시 대여중으로 전환되어 [대여·연체 관리]로 이동합니다.",
  shipColumns: () => "edit",
  detailPath: (u) => `/rent-dispatch/${u.id}`,
};
export const RENT_USE: ProcessListConfig = {
  screen: "rentUse",
  title: "대여·연체 관리",
  rent: true,
  units: inStats(RENT_USE_STATS),
  cards: RENT_USE_STATS,
  defaultCard: "대여중",
  dateFields: PROCESS_DATES,
  searchFields: PROCESS_SEARCH,
  bulk: [],
  bulkBy: {},
  collectBulk: true,
  rentStartColumn: true,
  /* 자체 수령은 「직접 반납」 + [반납 확인](개발 요청 30번) · 택배는 수거 신청 */
  collectColumn: (u) => (u.shipWay === "방문 수령" ? "selfReturn" : "register"),
  shipColumns: () => "ro",
  detailPath: (u) => `/rent-use/${u.id}`,
};
export const RENT_INSP_RETURN: ProcessListConfig = {
  screen: "rentInspReturn",
  title: "검수·반납 관리",
  rent: true,
  units: inStats(RENT_INSP_STATS),
  cards: RENT_INSP_STATS,
  defaultCard: "수거 신청",
  dateFields: PROCESS_DATES,
  searchFields: PROCESS_SEARCH,
  bulk: [
    { value: "검수중", label: "검수중" },
    { value: "연체중", label: "연체중 (회수 실패)" },
    { value: "검수완료", label: "검수완료" },
    { value: "반납완료", label: "반납완료" },
  ],
  bulkBy: {
    "수거 신청": ["검수중", "연체중"],
    검수중: ["검수완료"],
    검수완료: ["반납완료"],
    반납완료: [],
  },
  collectColumn: (u) => (u.stat === "수거 신청" ? "edit" : null),
  shipColumns: () => "ro",
  detailPath: (u) => `/rent-insp-return/${u.id}`,
};

/** 원본 `rentRmaScreen` base — 렌트 처리단위 중 그 유형의 클레임 */
const rentClaimUnits = (type: "취소" | "반품"): OrderUnit[] =>
  RENT.filter((u) => u.req?.type === type);

export const RENT_CANCEL: ProcessListConfig = {
  screen: "rentCancel",
  title: "취소 관리",
  rent: true,
  units: rentClaimUnits("취소"),
  cards: claimStatuses("취소"),
  defaultCard: "취소 요청",
  dateFields: CLAIM_DATES,
  searchFields: CLAIM_SEARCH,
  bulk: claimStatuses("취소").map((s) => ({ value: s, label: s })),
  bulkBy: {
    "취소 요청": ["환불 처리중"],
    "환불 처리중": ["취소 완료"],
    "취소 완료": [],
  },
  shipColumns: () => "ro",
  detailPath: (u) => `/rent-cancel/${u.id}`,
};

/** 렌트 반품 — 버킷 카드(판매와 같다) · 교환 미운영이라 「교환으로 변경」 없음(H-11) */
export const RENT_RMA: ProcessListConfig = {
  screen: "rentRma",
  title: "반품 관리",
  rent: true,
  units: rentClaimUnits("반품"),
  cards: ["접수", "진행", "완료"],
  defaultCard: "접수",
  inCard: (u, card) =>
    (CLAIM_BUCKETS.반품[card as "접수" | "진행" | "완료"] ?? []).includes(
      claimStatOf(u),
    ),
  dateFields: CLAIM_DATES,
  searchFields: CLAIM_SEARCH,
  bulk: claimStatuses("반품")
    .filter((s) => s !== "교환으로 변경")
    .map((s) => ({ value: s, label: s })),
  bulkBy: {
    접수: ["반품 승인", "반품 거부"],
    진행: ["반품 수거완료", "반품 검수", "환불 처리중", "반품 완료"],
    완료: [],
  },
  shipColumns: () => "ro",
  detailPath: (u) => `/rent-rma/${u.id}`,
};
