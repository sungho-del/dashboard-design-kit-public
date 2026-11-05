import type { SelectOption } from "../../components/ui";
import {
  SETTLEMENT_STATUS_META,
  STATEMENTS,
  type SettlementRow,
  type SettlementStatus,
} from "./settlement.data";

/* -------------------------------------------------------------------------
 * 정산 내역/명세서 (목록) — **도메인 층** (BabyCube 본사 운영 어드민)
 * 기준 기획: v0.4 `plan-members/proto.html` 4619~4631 (`SCREENS.settleStatement`)
 *
 * 짝이 되는 뼈대: `SettlementStatementPage.tsx` · 상세: `SettlementStatementDetailPage.*`
 *
 * ## 이 화면이 무엇인가 (조회 전용)
 * 이번 회차(2026.09)의 명세서를 **본사 1 + 셀러 정산과 같은 셀러 행**으로 본다(원본도 `settleSellerRows()`
 * 하나에서 셀러 정산·명세서·세금계산서가 나온다). 상태 변경·지급은 셀러 정산에서 한다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행은 공통 정산 계산(`settlement.data.ts` `STATEMENTS`)을 **그대로** 쓴다 — 금액을 여기서 다시 셈하지 않는다
 * - `TARGET_OPTIONS` · `STATUS_OPTIONS` 의 첫 값은 `"all"`(필터 해제)
 * - `matches(row, filters)` 하나가 조회 조건 전부를 판정한다 — 표·건수가 같은 결과를 쓴다
 * - 상세 경로는 `detailPathOf(명세서번호)` — 번호 링크 · [명세서] · 행 클릭이 모두 여기로 간다
 *
 * ## 금액 (원본 4626 그대로)
 * - 매출 = 정산 매출(`revenue` — 할인 후 소계 − 셀러 쿠폰) · 본사는 판매 + 렌트 확정 매출
 * - 차감(수수료·PG·취소) = 판매 수수료 + PG + 취소·반품 환수 — 0 이면 `-`
 * - 가산(보전·셀러 귀속) = 안심케어 보전 + 위약금·픽업 요금·배송비(셀러 귀속) — 0 이면 `-`(판정 Q3 · 차감 다음 열)
 * - 지급액 = 공통 계산의 `payout`(0원 하한) — 매출 − 차감 + 가산 = 지급액
 * ⚠️ 0원 하한·미회수 행(리틀스텝)은 맞지 않는다 — 기획 확인 요청 20번. 미회수는 상세의 정산 명세가 보인다.
 *
 * ## 원본과 다르게 둔 곳 (공통 규칙·사용자 결정)
 * - 정산 대상·상태 체크 칩(다중) → **셀렉트 하나씩**(택일) · 검색은 입력 즉시(대소문자 무시는 원본)
 * - 검색조건 바는 펼친 채로 열린다 · 행 어디를 눌러도 상세로 간다
 * - 정산 대상 배지 무채색(원본 자체 = 파랑) · 열 왼쪽 정렬 — 금액 4열(매출·차감·가산·지급액)만 오른쪽(§7-2 계산 영역 예외) ·
 *   차감 부호 `−N원` · 가산 부호 `+N원`
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 행 클릭 「명세서 미리보기」 모달 · 엑셀 다운로드(`EXPORT_SPEC` 미등록) · 명세 확정 일시 · 손으로 적은 억 단위 샘플
 * ---------------------------------------------------------------------- */

export type { SettlementRow };
export { STATEMENTS };

export const LIST_PATH = "/settle-statement";
export const detailPathOf = (statementNo: string) =>
  `${LIST_PATH}/${statementNo}`;

export const STATUS_META = SETTLEMENT_STATUS_META;

/** 정산 대상 구분 — 대등한 분류라 무채색 배지(원본 자체 = 파랑) */
export const TARGET_KIND_LABEL: Record<SettlementRow["kind"], string> = {
  hq: "자체",
  seller: "입점사",
};

export const TARGET_OPTIONS: SelectOption[] = [
  { value: "all", label: "정산 대상 전체" },
  { value: "hq", label: "자체" },
  { value: "seller", label: "입점사" },
];

const STATUS_KEYS: SettlementStatus[] = [
  "waiting",
  "requested",
  "agreed",
  "paid",
  "disputed",
  "held",
];

/** 상태 6종 — 원본 `settleStat` 순서 */
export const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "상태 전체" },
  ...STATUS_KEYS.map((key) => ({ value: key, label: STATUS_META[key].label })),
];

export type StatementSearchField = "no" | "target";

/** 검색 대상 — 원본 2종, 기본 명세서번호 */
export const SEARCH_FIELDS: { value: StatementSearchField; label: string }[] = [
  { value: "no", label: "명세서번호" },
  { value: "target", label: "정산 대상" },
];
export const SEARCH_PLACEHOLDER = "검색어 입력";

export interface StatementFilters {
  target: string;
  status: string;
  searchField: StatementSearchField;
  keyword: string;
}

export const EMPTY_FILTERS: StatementFilters = {
  target: "all",
  status: "all",
  searchField: "no",
  keyword: "",
};

const searchValueOf = (row: SettlementRow, field: StatementSearchField) =>
  field === "target" ? row.name : row.statementNo;

/** 조회 조건 판정 — 검색은 대소문자 무시 `includes`(원본) */
export const matches = (row: SettlementRow, filters: StatementFilters) => {
  const keyword = filters.keyword.trim().toLowerCase();
  return (
    (filters.target === "all" || row.kind === filters.target) &&
    (filters.status === "all" || row.status === filters.status) &&
    (keyword === "" ||
      searchValueOf(row, filters.searchField).toLowerCase().includes(keyword))
  );
};

export const NO_FILTER_TEXT = "조건 없음 (전체)";

/** 검색조건 요약 한 줄 — 형제 목록과 같은 꼴 */
export const filterSummary = (filters: StatementFilters): string => {
  const parts: string[] = [];
  if (filters.target !== "all") {
    parts.push(
      `정산 대상 ${TARGET_KIND_LABEL[filters.target as SettlementRow["kind"]]}`,
    );
  }
  if (filters.status !== "all") {
    parts.push(`상태 ${STATUS_META[filters.status as SettlementStatus].label}`);
  }
  const keyword = filters.keyword.trim();
  if (keyword !== "") {
    const field = SEARCH_FIELDS.find(
      (item) => item.value === filters.searchField,
    );
    parts.push(`${field?.label} «${keyword}»`);
  }
  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};

export const EMPTY_TITLE = "해당 조건의 항목이 없습니다";
export const EMPTY_DESCRIPTION =
  "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.";

export const won = (value: number) => value.toLocaleString("ko-KR") + "원";
export const NO_AMOUNT = "-";

/** 차감(수수료·PG·취소) — 원본 `fee+pg+cancel`(안심케어 보전은 빼지 않는다) */
export const deductionOf = (row: SettlementRow) =>
  row.fee + row.pg + row.clawback;

/** 차감 칸 — 0 이면 `-`(원본), 아니면 `−N원`(U+2212 · 정산 화면 공통 부호 — 원본 `- N원`) */
export const deductionText = (row: SettlementRow) => {
  const value = deductionOf(row);
  return value === 0 ? NO_AMOUNT : `−${won(value)}`;
};

/** 가산(보전·셀러 귀속) — 안심케어 보전 + 위약금·픽업 요금·배송비(셀러 귀속) (판정 Q3) */
export const additionOf = (row: SettlementRow) =>
  row.care + row.penalty + row.pickupFee + row.shippingFee;

/** 가산 칸 — 0 이면 `-`, 아니면 `+N원`(정산 명세의 가산 줄과 같은 부호) */
export const additionText = (row: SettlementRow) => {
  const value = additionOf(row);
  return value === 0 ? NO_AMOUNT : `+${won(value)}`;
};

export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];
