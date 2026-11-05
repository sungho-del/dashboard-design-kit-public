import type { ButtonVariant, SelectOption, TagTone } from "../../components/ui";
import {
  TAX_INVOICES,
  type TaxInvoiceRow,
  type TaxInvoiceStatus,
} from "./settlement.data";

/* -------------------------------------------------------------------------
 * 세금계산서·증빙 (BO-STL-009) — **도메인 층** (BabyCube 본사 운영 어드민)
 * 기준 기획: v0.4 `proto.html` 4632~4646(`SCREENS.settleTax`) · 2061~2062(검색조건) ·
 * annotations 70·191(처리 열)
 *
 * 짝이 되는 뼈대: `TaxInvoiceListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 이 화면이 무엇인가
 * 이번 정산 회차(2026.09)의 **판매 수수료**에 대한 세금계산서를 조회한다.
 * 공급자는 본사, 공급받는자는 셀러다 — 정산 지급 방향과 반대다.
 *
 * ## 행은 따로 갖지 않는다 — 셀러 정산에서 파생된다
 * 행 = 공통 데이터 `settlement.data.ts` 의 `TAX_INVOICES`(원본 `settleSellerRows().filter(fee>0)`).
 * - 공급가액 = 그 셀러의 판매 수수료 · 세액 = round(공급가액 × 10%) · 합계 = 둘의 합
 * - 상태 = 셀러 정산 「지급완료」면 발행완료, 그 밖은 발행대기
 * - 작성일 = 회차 지급일 `PAYOUT_DATE`(2026.10.12). ⚠️ 원본은 `2026.06.10`(정산월의 10일)이라
 *   지급일과 어긋난다 — 원본 결함 ③, 이번 시연의 표시 기준일 뿐 실발행 정책이 아니다
 * - 본사 · 수수료 0원 셀러(리틀스텝)는 행이 없다 → 7건
 * 숫자를 이 파일이나 뼈대에서 다시 계산하지 않는다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `no`(계산서번호 — 고유 키) · `date`(`YYYY-MM-DD`) · `vat` · `total` 을 갖는다
 * - `STATUS_META` · `ACTION_META` 의 키는 `TaxInvoiceRow["status"]` 와 정확히 일치한다
 * - `STATUS_OPTIONS[0].value` 는 `"all"` — 뼈대가 필터 해제로 취급한다
 *
 * ## 원본 대조
 * 가져온 것: 열 9개 이름·순서(**상태 다음이 처리**) · 계산서번호·합계 굵게 · 발행상태 2종 ·
 * 검색 대상 2종(기본 계산서번호, 대소문자 무시) · 「검색어 입력」 · 엑셀 없음 · 체크박스·No·정렬 없음 ·
 * 페이지 10/20/50/100 · 처리 열 발행대기 [발행] / 발행완료 [다운로드](누르면 토스트만 — 원본 `act()` 도 토스트뿐)
 * 원본과 다르게 둔 것: 발행상태 다중 칩 → 셀렉트(값이 둘이라 뜻이 같다 · 형제 목록과 같은 형식) ·
 * 검색 입력 즉시 적용 · 검색조건 기본 펼침 · 열 왼쪽 정렬(배지만 가운데)
 *
 * ## ⚠️ 기획 확인 필요
 * - 「지급완료 시 자동 동시 발행」(B-6 · 원본 4252)인데 발행대기 행에 수동 [발행]이 있다(원본 그대로 둠)
 * - annotations 는 [발행] 뒤 「상태가 발행완료로 변경」이라 하나 원본 코드는 토스트만 띄운다
 * - 수수료율: 정책 B-2 문구 「10%」 ↔ 원본 코드·셀러 마스터 셀러별 요율(셀러별 요율을 따름)
 *
 * ## 걷어낸 것 (원본에 없다)
 * - 행 클릭 「계산서 미리보기」 모달과 상태 설명 문구 — 원본에 상세·링크가 없다
 * - 안내 note — 원본이 `note()` 를 호출하지만 v0.4 의 `note()` 는 빈 문자열을 돌려준다(1941)
 * - 손으로 적은 옛 샘플(억 단위 수수료 · 셀러 마스터에 없는 셀러)
 * ---------------------------------------------------------------------- */

export { TAX_INVOICES };
export type { TaxInvoiceRow, TaxInvoiceStatus };

/**
 * 발행 상태 → 라벨 · Tag tone (`docs/screen-templates.md` §3-1).
 * 발행대기는 지급과 함께 나가야 할 일이라 `warning`, 발행완료는 종결이라 `default`.
 */
export const STATUS_META: Record<
  TaxInvoiceStatus,
  { label: string; tone: TagTone }
> = {
  pending: { label: "발행대기", tone: "warning" },
  issued: { label: "발행완료", tone: "default" },
};

/**
 * 처리 열 — 원본 4643 그대로. 발행대기 `btn sm` [발행] · 발행완료 `btn line sm` [다운로드].
 * 누르면 **토스트만** 뜬다(원본 `act(msg)` = `toast(msg)` · 문구도 원본). 상태는 바뀌지 않는다.
 */
export const ACTION_META: Record<
  TaxInvoiceStatus,
  { label: string; variant: ButtonVariant; message: (no: string) => string }
> = {
  pending: {
    label: "발행",
    variant: "primary",
    message: (no) => `${no} 세금계산서 발행`,
  },
  issued: {
    label: "다운로드",
    variant: "secondary",
    message: (no) => `${no} 다운로드`,
  },
};

/** 발행상태 — 원본 `chips[stat]`(전체·발행대기·발행완료). 첫 항목은 반드시 `"all"` */
export const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: STATUS_META.pending.label },
  { value: "issued", label: STATUS_META.issued.label },
];

export type SearchField = "no" | "to";

/** 검색 대상 — 원본 `search.fieldOpts` 그대로 */
export const SEARCH_FIELDS: SelectOption[] = [
  { value: "no", label: "계산서번호" },
  { value: "to", label: "공급받는자" },
];

export const SEARCH_PLACEHOLDER = "검색어 입력";

/** 검색 대상에 따라 훑을 문자열(소문자 — 원본 `toLowerCase().includes`) */
export const searchHaystack = (row: TaxInvoiceRow, field: SearchField) =>
  (field === "to" ? row.buyer : row.no).toLowerCase();

export interface TaxFilters {
  status: string;
  searchField: SearchField;
  keyword: string;
}

export const EMPTY_FILTERS: TaxFilters = {
  status: "all",
  searchField: "no",
  keyword: "",
};

export const NO_FILTER_TEXT = "조건 없음 (전체)";

const labelOf = (options: SelectOption[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

/** 검색조건 요약 한 줄 — 형제 목록과 같은 형식 */
export const filterSummary = (filters: TaxFilters): string => {
  const parts: string[] = [];
  if (filters.status !== "all") {
    parts.push(`발행상태 ${labelOf(STATUS_OPTIONS, filters.status)}`);
  }
  if (filters.keyword.trim() !== "") {
    parts.push(
      `${labelOf(SEARCH_FIELDS, filters.searchField)} «${filters.keyword.trim()}»`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};

/** 빈 상태 — 형제 목록과 같은 문구 */
export const EMPTY_TITLE = "해당 조건의 항목이 없습니다";
export const EMPTY_DESCRIPTION =
  "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.";

/** 금액 포맷 — 단위가 도메인이라 여기 둔다. 천 단위 쉼표 */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/** 작성일 표기 — 원본처럼 날짜만 점 표기(`2026.10.10`) */
export const ymd = (dateText: string) =>
  dateText.slice(0, 10).replace(/-/g, ".");

/** 한 페이지 행 수 — 원본 기본 10, 고를 수 있는 크기 4종 */
export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];
