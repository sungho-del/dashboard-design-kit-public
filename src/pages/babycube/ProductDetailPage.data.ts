import {
  categoryPathOf,
  LISTED_PRODUCTS,
  type DisplayStatus,
  type Product,
  type ProductMode,
} from "./ProductListPage.data";

/* -------------------------------------------------------------------------
 * 상품 상세 (BO-PRD-002) — 도메인 층
 *
 * 짝이 되는 뼈대: `ProductDetailPage.tsx`
 *
 * 원본 v0.4 의 상품 상세는 **상품 등록 폼의 수정 모드**다(`openProductForm(id,'seller')`).
 * 본사가 입점사 상품을 열어 대부분의 칸을 고칠 수 있고, **판매 상태만** 직접 바꾸지 못한다
 * (반려·승인 처분으로만 바뀐다). 처분이 걸린 건(반려·재심사요청)은 전시 상태도 잠긴다.
 *
 * ## ⚠️ 상품 레코드는 **목록과 같은 것을 쓴다**
 * `ProductListPage.data.ts` 의 `LISTED_PRODUCTS`(본사 직영 제외)에서 찾는다. 같은 상품의 상태·가격·
 * 반려 사유·카테고리가 화면마다 다르게 보이면 안 된다. 목록에 없는 칸(기본 렌트일·기간 옵션·
 * 렌트 수량·재고·코멘트·태그)은 `draftOf` 가 **상품코드로 정해지는 예시 값**으로 채운다.
 *
 * ## 갈아끼울 것 (이 파일 전체)
 * | 실물 이름        | 역할                                                |
 * | ---------------- | --------------------------------------------------- |
 * | `findProduct`    | 경로의 상품코드 → 상품 (본사 직영은 찾지 않는다)    |
 * | `ProductDraft`   | 화면 안에서 고치는 값 — 저장하지 않는다(퍼블 범위)  |
 * | `draftOf`        | 상품 → 처음 값                                      |
 * | `validate`       | 원본 `pfValidate` 중 지금 화면에 있는 칸의 검사      |
 * | `COPY`           | 안내·오류·알림 문구 (원본 그대로)                   |
 * ---------------------------------------------------------------------- */

/** 경로의 상품코드 → 상품. **본사 직영은 이 화면에 없다**(목록과 같은 집합) */
export const findProduct = (code: string): Product | undefined =>
  LISTED_PRODUCTS.find((product) => product.id === code);

/** 할인 입력 방식 — 원본 `%` / `원` */
export type DiscountType = "amt" | "rate";

/** 판매 상품의 상태 — 중고면 최초 구매일·등급을 더 받는다 */
export type Condition = "new" | "used";

/** 기간 옵션 한 줄 — 일수와 그 기간의 **총액**(장기 렌트 할인가) */
export interface PeriodOption {
  /** 행 식별자 — 지우고 더해도 입력칸이 엉키지 않게 */
  id: number;
  days: string;
  price: string;
}

/** 화면 안에서 고치는 값. 숫자 칸도 입력 그대로(문자열) 든다 — 빈 칸과 0 을 가른다 */
export interface ProductDraft {
  name: string;
  mode: ProductMode;
  condition: Condition;
  /** `YYYY-MM-DD` · 비면 미입력 */
  firstBuyDate: string;
  grade: string;
  major: string;
  middle: string;
  minor: string;
  rentBase: string;
  rentDiscOn: boolean;
  rentDiscType: DiscountType;
  rentDiscVal: string;
  baseRentDays: string;
  deposit: string;
  periodOn: boolean;
  periods: PeriodOption[];
  saleBase: string;
  saleDiscOn: boolean;
  saleDiscType: DiscountType;
  saleDiscVal: string;
  rentQty: string;
  /** 중지한 슬롯 번호(1부터) */
  slotOff: number[];
  stock: string;
  display: DisplayStatus;
  comment: string;
  tags: string;
}

/** 상품 등급 — 원본 S·A·B·C */
export const GRADES = ["S급", "A급", "B급", "C급"];

/** 기간 옵션 상한 — 원본 `PF_PRESET_MAX` */
export const PERIOD_MAX = 5;

/** 상품 코멘트·검색 태그 글자 수 한도, 태그 개수 한도 — 원본 그대로 */
export const COMMENT_MAX = 100;
export const TAGS_MAX = 200;
export const TAG_COUNT_MAX = 10;

/** 상품명 글자 수 한도 — 원본 `nvInput('name', …, 100)` */
export const NAME_MAX = 100;

const digits = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

/** 예시 값을 상품코드로 고른다 — 매번 같은 상품은 같은 값으로 열린다 */
const pick = <T>(code: string, choices: T[]): T =>
  choices[
    [...code].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % choices.length
  ];

/**
 * 상품 → 처음 값. 목록에 있는 값은 그대로 옮기고, 없는 값은 상품코드로 정해지는 예시다.
 * - 품절 상품은 재고 0 (품절은 재고에서 정해진다)
 * - 렌트 할인이 있는 상품은 [설정함] 으로 연다
 * - 기간 옵션은 30·60일 두 줄 — 정가(렌트가 × 일수)보다 싸게 잡는다
 */
export const draftOf = (product: Product): ProductDraft => {
  const [major = "", middle = "", minor = ""] = categoryPathOf(product);
  const dayRate = Math.max(
    0,
    (product.rentBase ?? 0) - (product.rentDiscount ?? 0),
  );
  const totalOf = (days: number, rate: number) =>
    String(Math.round((dayRate * days * rate) / 100) * 100);
  const periodOn = product.mode === "rent" && dayRate >= 1000;
  /* 판매 상품 하나는 중고 — 중고 칸(최초 구매일·등급)이 실제로 보이도록 */
  const used = product.id === "AR271948";

  return {
    name: product.name,
    mode: product.mode,
    condition: used ? "used" : "new",
    firstBuyDate: used ? "2025-11-03" : "",
    grade: used ? "A급" : "",
    major,
    middle,
    minor,
    rentBase: digits(product.rentBase),
    rentDiscOn: (product.rentDiscount ?? 0) > 0,
    rentDiscType: "amt",
    rentDiscVal:
      (product.rentDiscount ?? 0) > 0 ? digits(product.rentDiscount) : "",
    baseRentDays:
      product.mode === "rent" ? pick(product.id, ["7", "14", "30"]) : "",
    deposit: digits(product.deposit),
    periodOn,
    periods: periodOn
      ? [
          { id: 1, days: "30", price: totalOf(30, 0.9) },
          { id: 2, days: "60", price: totalOf(60, 0.85) },
        ]
      : [{ id: 1, days: "", price: "" }],
    saleBase: digits(product.saleBase),
    saleDiscOn: (product.saleDiscount ?? 0) > 0,
    saleDiscType: "amt",
    saleDiscVal:
      (product.saleDiscount ?? 0) > 0 ? digits(product.saleDiscount) : "",
    rentQty: product.mode === "rent" ? pick(product.id, ["2", "3", "4"]) : "",
    /* 슬롯 하나를 중지해 둔 예시 — 「신규 예약 제외」 가 실제로 보이도록 */
    slotOff: product.id === "BL240814" ? [2] : [],
    stock:
      product.mode === "sale"
        ? product.status === "soldout"
          ? "0"
          : pick(product.id, ["8", "12", "20"])
        : "",
    display: product.display,
    comment:
      product.id === "BL240814"
        ? "360도 회전으로 태우고 내리기 편해요. 신생아부터 4세까지 쓸 수 있습니다."
        : "",
    tags: product.id === "BL240814" ? "신생아, 회전형, ISOFIX" : "",
  };
};

/* -------------------------------------------------------------------------
 * 계산 — 원본 `pfDiscAbs` · `_fmtDaysKo` 그대로
 * ---------------------------------------------------------------------- */

/** 입력 문자열 → 숫자 (빈 칸·글자는 0) */
export const num = (value: string) => Number(value) || 0;

/** 원 표기 */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/** 할인액 — 정액은 원가를 넘지 않고, 정률은 반올림한 원 단위. 원가·값이 0 이하이면 0 */
export const discountOf = (
  base: string,
  on: boolean,
  type: DiscountType,
  value: string,
) => {
  const b = num(base);
  const v = num(value);
  if (!on || b <= 0 || v <= 0) return 0;
  return type === "amt"
    ? Math.min(b, v)
    : Math.min(b, Math.round((b * v) / 100));
};

/** 일수 → "N개월 M일" (1개월 = 30일 — 기간 옵션 표기 전용 규칙) */
export const daysLabel = (days: number) => {
  if (days <= 0) return "";
  const months = Math.floor(days / 30);
  const rest = days % 30;
  return [months ? `${months}개월` : "", rest ? `${rest}일` : ""]
    .filter(Boolean)
    .join(" ");
};

/**
 * 기간 옵션 한 줄의 표기 — 정가(일 렌트가 × 일수)보다 싸면 할인율을 함께 낸다.
 * 기간 옵션 가격은 **그 기간 전체의 총액**이다(일수를 다시 곱하지 않는다).
 */
export const periodSummary = (option: PeriodOption, dayRate: number) => {
  const days = num(option.days);
  const price = num(option.price);
  if (days <= 0) return null;
  const regular = dayRate * days;
  const percent =
    regular > 0 && price > 0 && price < regular
      ? Math.round(((regular - price) / regular) * 100)
      : 0;
  return { label: daysLabel(days), regular, price, percent };
};

/** 슬롯 이름 — 원본 `{상품ID}-{2자리}` */
export const slotName = (code: string, index: number) =>
  `${code}-${String(index).padStart(2, "0")}`;

/** 쉼표로 나눈 태그 수 */
export const tagCount = (tags: string) =>
  tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean).length;

/* -------------------------------------------------------------------------
 * 저장 검사 — 원본 `pfValidate` 중 **지금 화면에 있는 칸만**
 *
 * 원본에 없는 검사를 더하지 않는다. 재고 수량은 원본도 검사하지 않는다(0 = 품절은 정상).
 * 숨은 유형의 칸(렌트 상품의 판매가 등)은 검사하지 않는다.
 * ---------------------------------------------------------------------- */

/** 오류를 붙일 칸 — 뼈대가 이 이름으로 입력칸 id 를 만들고 첫 오류로 이동한다 */
export type FieldKey =
  | "name"
  | "category"
  | "rentBase"
  | "rentDisc"
  | "periods"
  | "rentQty"
  | "saleBase"
  | "saleDisc"
  | "tags";

/** 칸 → 그 칸이 들어 있는 섹션. 접힌 섹션의 오류를 펼쳐 보이려고 쓴다 */
export const SECTION_OF: Record<FieldKey, SectionKey> = {
  name: "name",
  category: "category",
  rentBase: "price",
  rentDisc: "price",
  periods: "price",
  rentQty: "quantity",
  saleBase: "price",
  saleDisc: "price",
  tags: "display",
};

export type SectionKey =
  "name" | "mode" | "category" | "price" | "quantity" | "display";

export const validate = (
  draft: ProductDraft,
): Partial<Record<FieldKey, string>> => {
  const errors: Partial<Record<FieldKey, string>> = {};
  const rent = draft.mode === "rent";

  if (draft.name.trim() === "") errors.name = COPY.errors.name;
  if (draft.major === "") errors.category = COPY.errors.category;
  if (rent) {
    if (!(num(draft.rentBase) > 0)) errors.rentBase = COPY.errors.rentBase;
    if (
      draft.rentDiscOn &&
      draft.rentDiscType === "rate" &&
      num(draft.rentDiscVal) > 100
    )
      errors.rentDisc = COPY.errors.rentDisc;
    if (
      draft.periodOn &&
      draft.periods.some((row) => num(row.days) > 0 !== num(row.price) > 0)
    )
      errors.periods = COPY.errors.periods;
    if (!(num(draft.rentQty) > 0)) errors.rentQty = COPY.errors.rentQty;
  } else {
    if (!(num(draft.saleBase) > 0)) errors.saleBase = COPY.errors.saleBase;
    if (
      draft.saleDiscOn &&
      draft.saleDiscType === "rate" &&
      num(draft.saleDiscVal) > 100
    )
      errors.saleDisc = COPY.errors.saleDisc;
  }
  if (tagCount(draft.tags) > TAG_COUNT_MAX) errors.tags = COPY.errors.tags;

  return errors;
};

/* -------------------------------------------------------------------------
 * 문구 — 원본 그대로 (상태별 안내만 실제로 있는 버튼을 가리키게 고쳤다)
 * ---------------------------------------------------------------------- */

export const COPY = {
  title: "상품 상세 (수정)",
  sections: {
    name: "상품명",
    mode: "유형",
    category: "카테고리",
    priceRent: "가격 · 렌트 기간",
    priceSale: "가격",
    rentQty: "렌트 수량",
    stock: "재고 수량",
    display: "노출 관리",
  },
  namePlaceholder: "상품명을 입력해 주세요",
  rentBaseHelp: "할인 전 렌트 원가를 입력해주세요.",
  saleBaseHelp: "할인 전 판매 원가를 입력해주세요.",
  baseRentDaysHelp:
    "사용자 앱에서 기본으로 선택되는 렌트 일수입니다. 기본가에 포함되는 기간이며, 더 긴 기간의 할인가는 아래 기간 옵션에서 기간별 총액으로 등록합니다.",
  finalRentHelp:
    "사용자가 기간을 늘리지 않았을 때 결제되는 기본 금액입니다(보증금 별도).",
  finalRentEmpty: "위 기본 렌트일을 입력하면 계산됩니다.",
  depositHelp: "반납 검수 후 환급되는 금액입니다.",
  periodHelp: `기간을 일수로 등록하면 1개월=30일 환산으로 "N개월 M일" 형식으로 표기됩니다(예: 50일 → "1개월 20일" · 사용자 화면 동일). 기간마다 장기 렌트 할인가(총액)를 직접 입력하며, 사용자가 등록한 기간과 같은 기간을 선택한 경우에만 그 할인가가 적용됩니다(그 외 일수는 일 단위 렌트가 × 일수). 최대 ${PERIOD_MAX}개까지 등록할 수 있습니다.`,
  periodFull: `기간 옵션은 최대 ${PERIOD_MAX}개까지 등록할 수 있습니다. 다른 기간을 등록하려면 기존 옵션을 삭제한 뒤 추가해주세요.`,
  rentQtyHelp:
    "같은 상품의 동시 대여 가능 건수입니다(수량 풀 — 개체 배정 없음). 수량 등록 시 슬롯 ID가 {상품ID}-{순번}으로 자동 발번되며(삭제 시 결번 유지), 수량 변경·중지·삭제는 심사 없이 즉시 반영됩니다.",
  slotOffNote: "신규 예약 제외",
  stockHelp: "판매 가능한 재고 수량입니다.",
  /** 판매 상태 안내 — 원본 문장에서 **그 상태에 실제로 있는 버튼**을 가리키게 고쳤다 */
  saleStatusHelp: {
    reject:
      "입점 상품의 판매 상태는 입력으로 바꾸지 않습니다 — 아래 하단 바의 [반려 처리]로 사유를 남겨 주세요(사유는 입점사에 그대로 표시되고, 입점사는 보완 후 재심사를 요청합니다).",
    approve:
      "입점 상품의 판매 상태는 입력으로 바꾸지 않습니다 — 처분을 풀려면 아래 하단 바의 [승인 처리]를 눌러 주세요.",
    both: "입점 상품의 판매 상태는 입력으로 바꾸지 않습니다 — 입점사의 재심사 요청에 아래 하단 바의 [승인 처리] 또는 [반려 처리]로 답해 주세요.",
  },
  displayLocked: {
    rereview:
      "반려 처분으로 전시가 함께 내려간 상태입니다 — 재심사에 [승인 처리]로 답하면 다시 고를 수 있습니다.",
    rejected:
      "반려 처분으로 전시가 함께 내려간 상태입니다 — [승인 처리]로 처분을 풀면 다시 고를 수 있습니다.",
  },
  commentPlaceholder:
    "예) 통기성 좋은 메시 소재라 여름에도 쾌적해요. 신생아부터 24개월까지 쓸 수 있습니다.",
  commentHelp:
    "사용자 화면 상품 상세의 상품명 바로 아래에 그대로 노출됩니다. 비워 두면 그 자리가 나타나지 않습니다.",
  tagsPlaceholder: "쉼표(,)로 구분해 입력 — 최대 10개",
  tagsHelp:
    "태그는 검색 매칭 전용입니다(사용자 화면 비노출 — SL-3). 예) 신생아, 휴대용, 접이식",
  saved: "상품 정보가 수정되었습니다.",
  errors: {
    name: "상품명을 입력해주세요.",
    category: "카테고리(대분류)를 선택해주세요.",
    rentBase: "렌트료를 입력해주세요.",
    rentDisc: "렌트 할인율은 100%를 초과할 수 없습니다.",
    periods: "기간 옵션은 일수와 장기 렌트 할인가를 함께 입력해주세요.",
    rentQty: "렌트 수량을 입력해주세요.",
    saleBase: "판매가를 입력해주세요.",
    saleDisc: "판매 할인율은 100%를 초과할 수 없습니다.",
    tags: "검색 태그는 최대 10개까지 입력할 수 있습니다.",
  } satisfies Record<FieldKey, string>,
};
