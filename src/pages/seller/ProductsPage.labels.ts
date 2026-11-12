import type { DateRange } from "../../components/ui";
import type { SellerProduct } from "./seed/products.data";

/* 셀러 `ProductsPage.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./ProductsPage.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

/* =========================================================================
 * 상품 관리(SO-PRD-001) — 목록형 · 도메인
 *
 * 원본 = 기획 v0.4 `SCREENS.products`(3470) · `FILTERS.products`(2344) · `prodStatDash`(2561) ·
 * `prodSaleStat`(1087) · `pSaveSelected`(5445) · 반려 사유 창 `prodReason`(2628) · 상태 설명 `STAT_TIP`(3105~).
 *
 * ## 원본 그대로
 * - 모집단 = 본사 등록분(`src==='본사'`)을 뺀 내 상품 57건 · 판매 상태 카드 6장(흐름 순) = 상태 필터,
 *   **처음엔 「판매중」이 켜진 채**(원본 `def`) → 첫 화면 38건
 * - 판매 상태는 재고에서 파생 — 판매 상품 재고 0 = 품절(원본 `prodSaleStat`)
 * - 가격 5칸(렌트 원가·할인 금액·보증금·판매 원가·판매 할인)은 표에서 바로 고친다 → 체크한 행만
 *   [수정 저장](원본 문구 그대로 · 퍼블은 알림만 — 행 값은 그대로 남는다)
 * - 유형을 고르면 반대 유형의 가격 열을 뺀다 · 카테고리는 유형을 고른 뒤에만 열린다
 *
 * ## 기획 확인 필요 (원본대로 둔 것)
 * - 기간 기준 「판매시작일·판매종료일」 — 상품에 그 값이 없어 고르면 늘 0건이다
 * - 렌트가 표기 「원/일」 고정(렌트 단위 폐지 — 원본 `unitKo`)
 * ====================================================================== */

export type SaleStat =
  "임시저장" | "판매중" | "품절" | "판매중지" | "반려" | "재심사요청";

/** 흐름 순 — 원본 `prodStatDash` `vals` */
export const SALE_STATS: SaleStat[] = [
  "임시저장",
  "판매중",
  "품절",
  "판매중지",
  "반려",
  "재심사요청",
];
/** 처음 켜진 카드 — 원본 `def:['판매중']` */
export const DEFAULT_STAT: SaleStat = "판매중";

/**
 * 판매 상태 = 재고 파생(원본 `prodSaleStat`) — 렌트는 품절 축이 없다.
 * 목록·대시보드·상품 폼(입력 중인 재고 문자열)이 이 함수 하나를 쓴다.
 */
export function saleStatOf(p: {
  mode: string;
  saleStat?: string;
  stat?: string;
  stock?: number | string;
}): SaleStat {
  const st = (p.saleStat || p.stat || "판매중") as SaleStat;
  if (p.mode !== "sale") return st;
  if (["판매중지", "임시저장", "반려", "재심사요청"].includes(st)) return st;
  return Number(p.stock || 0) > 0 ? "판매중" : "품절";
}

/** 본사 처분(반려·재심사요청) — 사유 창을 연다 */
export const reviewOf = (p: SellerProduct) =>
  ["반려", "재심사요청"].includes(saleStatOf(p)) ? (p.review ?? null) : null;

export const showStatOf = (p: SellerProduct) =>
  (p.showStat || "전시중") === "전시중" ? "전시중" : "전시중지";

/** 상태 카드 설명 — 원본 `STAT_TIP`(d + n). 품절은 본사 화면과 같은 문구(기획 답 2026-11-06 §2 #6) · 판매중·반려는 셀러가 읽는 말로(반영 결과 답(2026-11-10) 4번) */
export const STAT_TIP: Record<SaleStat, string> = {
  임시저장:
    "저장만 해 둔 초안입니다. 본사 화면에는 나오지 않습니다. 등록을 마치면 [판매중]이 되어 판매가 시작됩니다.",
  판매중: "재고가 0이 되면 품절, 본사가 반려하면 반려가 됩니다.",
  품절: "재고를 채우면 판매중으로 돌아갑니다.",
  판매중지:
    "내가 판매를 멈춘 상품입니다(본사 처분은 [반려]로 따로 표시됩니다). 중지를 풀면 [판매중]으로 돌아갑니다.",
  반려: "재심사를 요청하면 재심사요청으로 바뀝니다.",
  재심사요청:
    "반려된 상품에 이의를 제기해 본사 판단을 기다리는 상태입니다. 본사가 승인하면 [판매중], 다시 반려하면 [반려]로 남습니다.",
};

/* ---------- 검색조건 — 원본 순서: 기간 → 전시 상태 → 유형 → 카테고리 → 검색 ---------- */

export const DATE_FIELDS = [
  { value: "createdAt", label: "상품등록일" },
  { value: "saleStart", label: "판매시작일" },
  { value: "saleEnd", label: "판매종료일" },
  { value: "updatedAt", label: "최종수정일" },
] as const;
export const SHOW_OPTIONS = [
  { value: "all", label: "전시 상태 전체" },
  { value: "전시중", label: "전시중" },
  { value: "전시중지", label: "전시중지" },
] as const;
/* 원본 유형 라디오 → 셀렉트(본사 상품 관리와 같은 사용자 결정 — 검색조건 줄에서 라디오만 튀었다) */
export const TYPE_OPTIONS = [
  { value: "all", label: "유형 전체" },
  { value: "렌트", label: "렌트" },
  { value: "판매", label: "판매" },
] as const;
export const SEARCH_FIELDS = [
  { value: "name", label: "상품명" },
  { value: "code", label: "상품코드" },
] as const;

/**
 * 유형을 고르기 전 카테고리 셀렉트의 안내 — 원본 `catSelectHint` 「유형에서 렌트 또는 판매 먼저 선택」을
 * **잠긴 셀렉트 안에** 들어가게 줄였다(본사 상품 관리와 같다). 옆에 따로 두면 다음 칸의 설명으로 읽힌다.
 */
export const CATEGORY_HINT = "유형 먼저 선택";

/**
 * 카테고리 3단 · 성장단계 — 개발 요청 2026-11-12 3·4번(develop `ProductsPage/adapter.ts` 글자 그대로).
 * 대분류를 고르면 중·소를 비우고, 중분류를 고르면 소를 비운다. 중·소 셀렉트는 고른 칸에 하위 분류가 있을 때만 나온다.
 * 유형을 바꾸면 카테고리 3단을 비우고 성장단계는 남긴다.
 */
export const CATEGORY_ALL_LABEL = {
  large: "카테고리 전체",
  middle: "중분류 전체",
  small: "소분류 전체",
} as const;
export interface CategoryNode {
  name: string;
  children: CategoryNode[];
}
export const categorySelectOptions = (
  nodes: readonly CategoryNode[],
  allLabel: string,
) => [
  { value: "", label: allLabel },
  ...nodes.map((node) => ({ value: node.name, label: node.name })),
];
export const STAGE_NONE = "none";
export const stageSelectOptions = (
  stages: readonly { value: string; label: string }[],
) => [
  { value: "all", label: "성장단계 전체" },
  ...stages,
  { value: STAGE_NONE, label: "없음" },
];
/** 요약 — 고른 단계의 보이는 글자 · 「없음」은 「성장단계 없음」 */
export const stageSummaryOf = (
  value: string,
  stages: readonly { value: string; label: string }[],
) =>
  value === "all"
    ? undefined
    : value === STAGE_NONE
      ? "성장단계 없음"
      : (stages.find((stage) => stage.value === value)?.label ?? value);

export interface ProductFilters {
  stat: SaleStat;
  dateField: string;
  period?: DateRange;
  show: string;
  type: string;
  cat: string;
  cat2: string;
  cat3: string;
  stage: string;
  searchField: string;
  keyword: string;
}
export const EMPTY_FILTERS: ProductFilters = {
  stat: DEFAULT_STAT,
  dateField: "createdAt",
  period: undefined,
  show: "all",
  type: "all",
  cat: "",
  cat2: "",
  cat3: "",
  stage: "all",
  searchField: "name",
  keyword: "",
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayOf = (text: unknown) =>
  typeof text === "string" && text ? text.slice(0, 10).replace(/\./g, "-") : "";

/**
 * 상태를 뺀 조건 — 카드 건수가 이것으로 센다(원본 `applyFilters(scr,base,['saleStat'])`).
 * `catPath` = 상품의 [대, 중, 소] 카테고리 이름(시드는 대분류 하나뿐 — 예시 하위 분류는 `.data` 가 준다)
 */
export function matchesExceptStat(
  p: SellerProduct,
  f: ProductFilters,
  catPath: readonly string[] = [p.cat],
) {
  if (f.show !== "all" && showStatOf(p) !== f.show) return false;
  if (f.type !== "all" && p.mode !== (f.type === "렌트" ? "rent" : "sale"))
    return false;
  if (f.cat && catPath[0] !== f.cat) return false;
  if (f.cat2 && catPath[1] !== f.cat2) return false;
  if (f.cat3 && catPath[2] !== f.cat3) return false;
  if (
    f.stage === STAGE_NONE
      ? Boolean(p.stage)
      : f.stage !== "all" && p.stage !== f.stage
  )
    return false;
  if (f.period?.from) {
    const day = dayOf(p[f.dateField as keyof SellerProduct]);
    if (!day) return false;
    if (day < ymd(f.period.from)) return false;
    if (day > ymd(f.period.to ?? f.period.from)) return false;
  }
  const q = f.keyword.trim().toLowerCase();
  if (
    q &&
    !String(p[f.searchField as "name" | "code"] ?? "")
      .toLowerCase()
      .includes(q)
  )
    return false;
  return true;
}

export const matchesFilters = (
  p: SellerProduct,
  f: ProductFilters,
  catPath?: readonly string[],
) => saleStatOf(p) === f.stat && matchesExceptStat(p, f, catPath);

const dot = (d: Date) => ymd(d).replace(/-/g, ".");

/** 요약 한 줄 — 판매 상태는 카드가 말하므로 넣지 않는다. 순서 = 기간 → 전시 → 유형 → 카테고리 → 성장단계 → 검색어 */
export function filterSummary(f: ProductFilters, stageLabel?: string) {
  const out: string[] = [];
  if (f.period?.from) {
    const label = DATE_FIELDS.find((d) => d.value === f.dateField)?.label;
    out.push(
      `${label} ${dot(f.period.from)}~${dot(f.period.to ?? f.period.from)}`,
    );
  }
  if (f.show !== "all") out.push(`전시 상태 ${f.show}`);
  if (f.type !== "all") out.push(`유형 ${f.type}`);
  const deepest = f.cat3 || f.cat2 || f.cat;
  if (deepest) out.push(`카테고리 ${deepest}`);
  if (stageLabel) out.push(stageLabel);
  if (f.keyword.trim()) out.push(`검색어 "${f.keyword.trim()}"`);
  return out.length ? out.join(" · ") : "조건 없음 (전체)";
}

/* ---------- 표 ---------- */

/** 표에서 고치는 가격 5칸 — 원본 `PDRAFT` */
export type PriceField = "rent" | "rentDisc" | "dep" | "sale" | "saleDisc";
export type PriceDraft = Partial<Record<PriceField, number>>;

export const priceOf = (
  p: SellerProduct,
  draft: PriceDraft | undefined,
  f: PriceField,
) => draft?.[f] ?? Number(p[f] || 0);

/**
 * 정률 할인 금액 — 원가 × 율(develop `productDiscountAmount` 식 · 반올림 · 100% 상한).
 * 예전에 「%」로 저장된 상품은 목록에서 할인을 고칠 수 없어, 고친 원가로 다시 환산한 값을 잠긴 칸에 보인다(개발 요청 6번)
 */
export const rateDiscountAmount = (base: number, rate: number) =>
  base <= 0 ? 0 : Math.round((base * Math.min(rate, 100)) / 100);

/** 할인 금액 — 정률 상품(`rate`)은 원가로 환산, 나머지는 칸 값(원가를 넘지 않게) */
const discountOf = (
  p: SellerProduct,
  d: PriceDraft | undefined,
  base: PriceField,
  disc: PriceField,
  rate?: number,
) =>
  rate ? rateDiscountAmount(priceOf(p, d, base), rate) : priceOf(p, d, disc);

export const rentDiscountOf = (
  p: SellerProduct,
  d?: PriceDraft,
  rate?: number,
) => discountOf(p, d, "rent", "rentDisc", rate);
export const saleDiscountOf = (
  p: SellerProduct,
  d?: PriceDraft,
  rate?: number,
) => discountOf(p, d, "sale", "saleDisc", rate);
export const rentPriceOf = (p: SellerProduct, d?: PriceDraft, rate?: number) =>
  Math.max(0, priceOf(p, d, "rent") - rentDiscountOf(p, d, rate));
export const salePriceOf = (p: SellerProduct, d?: PriceDraft, rate?: number) =>
  Math.max(0, priceOf(p, d, "sale") - saleDiscountOf(p, d, rate));

export const isRent = (p: SellerProduct) => p.mode !== "sale";
export const isSale = (p: SellerProduct) => p.mode !== "rent";

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 가격 열 도움말 — 원본 `PINFO` */
export const PRICE_TIP =
  "가격 및 할인가 변경 후 체크 박스를 선택하고 수정 저장 버튼을 클릭하면 금액 변경이 가능합니다.";

export const PRODUCT_COPY = {
  saveNone: "수정할 상품의 체크박스를 선택해주세요.",
  saved: (n: number) => `${n}건의 상품 가격이 저장되었습니다.`,
  saveNoChange: "선택한 상품에 변경된 가격이 없습니다.",
  reasonEmpty: "등록된 반려 사유가 없습니다.",
  reasonWaiting: "재심사를 요청해 본사 판단을 기다리는 중입니다.",
  reasonGuide:
    "사유를 보완한 뒤 상품 상세 하단 바에서 [재심사 요청]을 넣어주세요.",
  /* 아래는 develop 문구 그대로(개발 요청 2026-11-12 5·6번) */
  /** [가격 변경 취소]·[서버값 다시 불러오기] 뒤 저장 결과 줄 */
  discarded: "입력한 가격 변경을 취소하고 서버 값을 다시 불러왔습니다.",
  /** 다른 작업이 먼저 고쳐 저장이 막혔을 때(서버 409) — 입력·선택은 남긴다 */
  conflict:
    "다른 작업에서 상품이 먼저 수정되었습니다. 입력값과 선택은 유지했습니다. [서버값 다시 불러오기]로 충돌을 해소해주세요.",
  discard: "가격 변경 취소",
  reload: "서버값 다시 불러오기",
  /** 정률 할인 상품의 잠긴 할인 칸 안내 */
  rateLockTip:
    "정률 할인 상품은 목록에서 할인을 고칠 수 없습니다. 할인을 끄려면 상품 상세에서 끕니다.",
} as const;

export const detailPathOf = (p: SellerProduct) => `/products/${p.id}`;
