import {
  categoryPathOf,
  LISTED_PRODUCTS,
  type DisplayStatus,
  type Product,
  type ProductMode,
} from "./ProductListPage.data";
import { STAGES } from "./GrowthStageListPage.data";

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
 * 렌트 수량·재고·이미지·주요정보·배송 세부·옵션·코멘트·태그)은 `draftOf` 가
 * **상품코드로 정해지는 예시 값**으로 채운다. 목록의 KC·이미지 표시(O/△/X)와 어긋나지 않게 —
 * 이미지 X 는 대표이미지 없음, KC X 는 인증 행이 빈 채로, △ 는 인증번호가 빈 채로 연다.
 * 성장단계는 성장단계 관리 화면의 `STAGES` 를 읽는다.
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
  /** 대표이미지가 있나 · 추가이미지 장수 — 실제 파일은 개발 영역이라 자리만 센다 */
  mainImage: boolean;
  extraImages: number;
  /** 상세설명 — 원본은 서식 편집기, 우리는 평문(2026-10-19 사용자 결정) */
  detail: string;
  /** 등록 주체(셀러명) — 본사가 바꿀 수 있다(원본) */
  seller: string;
  /** 성장단계 id — 성장단계 관리의 `STAGES` */
  stage: string;
  certs: CertRow[];
  info: InfoRow[];
  courier: string;
  shipFee: Fee;
  /** 회수 배송비 — 렌트만 */
  collectFee: Fee;
  returnFee: string;
  exchangeFee: string;
  pickupOn: boolean;
  /** 방문 수령 주소 — 주소록(`ADDRESSES`)의 id. 비면 미선택 */
  pickupAddress: string;
  pickupFee: Fee;
  /** 방문 반납 요금 — 렌트만 */
  pickupReturnFee: Fee;
  airportOn: boolean;
  airport: string;
  airportPlace: string;
  airportFee: Fee;
  /** 공항 반납 요금 — 렌트만 */
  airportReturnFee: Fee;
  optionOn: boolean;
  optionSort: OptionSort;
  /** 옵션입력 — 축마다 이름과 쉼표로 나눈 값(최대 3축) */
  optionInputs: OptionInput[];
  /** 옵션목록 — [옵션목록으로 적용] 이 만든 조합 */
  options: OptionRow[];
  /** 옵션목록의 축 이름 — 적용할 때 정해진다(입력칸을 바꿔도 표 머리는 그대로) */
  optionAxes: string[];
}

/** 금액 + 「무료」 체크 — 무료면 금액 칸이 잠긴다(원본 `_freeMoney`) */
export interface Fee {
  amount: string;
  free: boolean;
}

/** 인증 정보 한 줄 — 원본 `pfCertBody` */
export interface CertRow {
  id: number;
  type: string;
  no: string;
  note: string;
}

/** 상품 주요 정보(고시) 한 줄 — 기본 세트(`fixed`)는 항목명을 못 고치고 지우지 못한다 */
export interface InfoRow {
  id: number;
  key: string;
  value: string;
  /** 「상품상세참조」 — 켜면 내용이 그 글자로 채워지고 잠긴다 */
  ref: boolean;
  fixed: boolean;
}

export interface OptionInput {
  id: number;
  name: string;
  values: string;
}

/** 옵션목록 한 줄 — 조합(축마다 값 하나)이 곧 열쇠다 */
export interface OptionRow {
  combo: string[];
  /** 옵션가(원 · 주문당 1회) */
  price: string;
  stock: string;
  code: string;
  recommended: boolean;
  use: boolean;
  /** 등록순 — 정렬을 「등록순」으로 되돌릴 때 쓴다 */
  seq: number;
}

export type OptionSort = "reg" | "abc" | "lo" | "hi";

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

/** 추가이미지 장수 한도 — 원본 9장 */
export const EXTRA_IMAGE_MAX = 9;

/** 옵션 축 한도 — 원본 최대 3 */
export const OPTION_AXIS_MAX = 3;

/** 인증 유형 — 원본 `CERT_TYPES` */
export const CERT_TYPES = [
  "어린이제품 안전인증",
  "어린이제품 안전확인",
  "어린이제품 공급자적합성확인",
  "전기용품 KC",
  "전파 적합성(KC)",
  "식품용 기구",
  "기타",
  "해당없음",
];

/** 인증번호가 필요 없는 유형 — 원본 검사가 이 둘을 뺀다 */
const NO_NUMBER_TYPES = ["해당없음", "기타"];
export const needsCertNumber = (type: string) =>
  type !== "" && !NO_NUMBER_TYPES.includes(type);

/** 상품정보제공고시 「영유아용품」 기본 세트 — 원본 `GOSI_ROWS` */
export const INFO_KEYS = [
  "품명 및 모델명",
  "크기·중량",
  "색상",
  "재질",
  "사용연령 또는 체중 범위",
  "동일모델 출시년월",
  "제조자·수입자",
  "제조국",
  "취급방법 및 취급 시 주의사항",
  "품질보증기준",
  "A/S 책임자와 전화번호",
];

/** 「상품상세참조」 를 켜면 내용에 들어가는 글자 */
export const INFO_REF_TEXT = "상품상세참조";

export const COURIERS = [
  "CJ대한통운",
  "롯데택배",
  "한진택배",
  "로젠택배",
  "우체국",
];

export const AIRPORTS = [
  "인천국제공항 T1",
  "인천국제공항 T2",
  "김포공항",
  "김해공항",
  "제주공항",
];

export const OPTION_SORTS: { value: OptionSort; label: string }[] = [
  { value: "reg", label: "등록순" },
  { value: "abc", label: "가나다순" },
  { value: "lo", label: "낮은 가격순" },
  { value: "hi", label: "높은 가격순" },
];

/** 성장단계 선택지 — 성장단계 관리의 단계 이름·월령 그대로 */
export const STAGE_OPTIONS = STAGES.map((stage) => ({
  value: stage.id,
  label:
    stage.monthTo === null
      ? `${stage.name} (${stage.monthFrom}개월~)`
      : `${stage.name} (${stage.monthFrom}~${stage.monthTo}개월)`,
}));

/** 등록 주체로 고를 수 있는 셀러 — 목록에 상품이 있는 입점 셀러 */
export const SELLER_OPTIONS = [
  ...new Set(LISTED_PRODUCTS.map((product) => product.seller)),
].map((name) => ({ value: name, label: name }));

/** 판매자 주소록 예시 — 원본 `ADDR_BOOK` 시드(본사 물류센터 주소) 그대로 */
export interface Address {
  id: string;
  name: string;
  tag: string;
  address: string;
  phone1: string;
  phone2: string;
}

export const ADDRESSES: Address[] = [
  {
    id: "A1",
    name: "본사 물류센터 출고지",
    tag: "출고지",
    address:
      "경기도 이천시 마장면 물류로 45 (BabyCube 통합물류센터) A동 (우 : 17378)",
    phone1: "031-635-1200",
    phone2: "010-2345-6789",
  },
  {
    id: "A2",
    name: "본사 반품·교환 센터",
    tag: "반품/교환지",
    address:
      "경기도 이천시 마장면 물류로 45 (BabyCube 통합물류센터) B동 반품처리동 (우 : 17378)",
    phone1: "031-635-1201",
    phone2: "",
  },
];

/** 옵션 조합의 열쇠 — 다시 적용해도 같은 조합의 옵션가·재고·관리코드·추천·사용을 되살린다 */
export const optionKey = (row: Pick<OptionRow, "combo">) =>
  JSON.stringify(row.combo);

/** 옵션목록 정렬 — 원본 `_optSorted`. 가격순은 옵션가, 가나다는 조합 글자 */
export const sortOptions = (rows: OptionRow[], sort: OptionSort) => {
  const list = [...rows];
  if (sort === "abc")
    return list.sort((a, b) =>
      a.combo.join(" / ").localeCompare(b.combo.join(" / "), "ko"),
    );
  if (sort === "lo") return list.sort((a, b) => num(a.price) - num(b.price));
  if (sort === "hi") return list.sort((a, b) => num(b.price) - num(a.price));
  return list.sort((a, b) => a.seq - b.seq);
};

/**
 * [옵션목록으로 적용] — 축마다 쉼표로 나눈 값의 **모든 조합**(원본 `pfOptApply`).
 * 이름이나 값이 빈 축은 건너뛴다. 이미 친 값은 열쇠로 되살린다 — 값 하나 고치려고 다시
 * 적용했다가 앞서 친 것이 전부 0 으로 돌아가면 조합이 많을수록 손해가 크다.
 * 축이 하나도 없으면 `null` (원본 「옵션명과 옵션값을 입력해주세요.」).
 */
export const applyOptions = (
  inputs: OptionInput[],
  previous: OptionRow[],
  sort: OptionSort,
): { axes: string[]; rows: OptionRow[] } | null => {
  const axes = inputs
    .map((input) => ({
      name: input.name.trim(),
      values: input.values
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    }))
    .filter((axis) => axis.name !== "" && axis.values.length > 0);
  if (axes.length === 0) return null;

  let combos: string[][] = [[]];
  for (const axis of axes) {
    combos = combos.flatMap((combo) =>
      axis.values.map((value) => [...combo, value]),
    );
  }
  const kept = new Map(previous.map((row) => [optionKey(row), row]));
  const rows = combos.map((combo, seq) => {
    const old = kept.get(optionKey({ combo }));
    return old
      ? { ...old, combo, seq }
      : {
          combo,
          price: "0",
          stock: "0",
          code: "",
          recommended: false,
          use: true,
          seq,
        };
  });
  return { axes: axes.map((axis) => axis.name), rows: sortOptions(rows, sort) };
};

const fee = (amount: number | null | undefined): Fee =>
  amount === null || amount === undefined
    ? { amount: "", free: false }
    : { amount: amount > 0 ? String(amount) : "", free: amount === 0 };

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
    /* 목록 「등록 이미지」 와 맞춘다 — X 는 대표 없음, △ 는 대표만, O 는 대표 + 추가 2장 */
    mainImage: product.image !== "missing",
    extraImages: product.image === "ok" ? 2 : 0,
    detail: `${product.name} — 안전하고 실용적인 육아 필수품입니다.\n· KC 안전인증 완료 · 유해물질 검사 통과\n· 친환경 소재로 아이 피부에 안심\n· 세척·관리가 간편한 분리형 구조`,
    seller: product.seller,
    stage: pick(product.id, STAGES).id,
    /* 목록 「KC 인증」 과 맞춘다 — X 는 빈 행, △ 는 번호 빈 행(보완 필요), O 는 번호까지 */
    certs: [
      {
        id: 1,
        type: product.kc === "missing" ? "" : "어린이제품 안전확인",
        no: product.kc === "ok" ? `CB-B2026-${product.id.slice(-4)}` : "",
        note: "",
      },
    ],
    info: INFO_KEYS.map((key, index) => ({
      id: index + 1,
      key,
      value:
        product.id === "BL240814" && index === 0 ? "스핀 360 / BL-S360" : "",
      ref: false,
      fixed: true,
    })),
    courier: "CJ대한통운",
    shipFee: fee(product.shipFee),
    collectFee: product.mode === "rent" ? fee(product.shipFee) : fee(null),
    returnFee: String(product.returnFee),
    exchangeFee: String(product.exchangeFee),
    pickupOn: false,
    pickupAddress: "",
    pickupFee: { amount: "", free: true },
    pickupReturnFee: { amount: "", free: true },
    airportOn: false,
    airport: "",
    airportPlace: "",
    airportFee: { amount: "", free: false },
    airportReturnFee: { amount: "", free: false },
    /* 원본 시드처럼 옵션 하나짜리 상품 — 다른 상품은 옵션 없이 연다 */
    optionOn: product.id === "BL240814",
    optionSort: "reg",
    optionInputs:
      product.id === "BL240814"
        ? [{ id: 1, name: "구성", values: "기본 구성,추가 커버 세트" }]
        : [{ id: 1, name: "", values: "" }],
    options:
      product.id === "BL240814"
        ? [
            {
              combo: ["기본 구성"],
              price: "0",
              stock: "3",
              code: "",
              recommended: false,
              use: true,
              seq: 0,
            },
            {
              combo: ["추가 커버 세트"],
              price: "9000",
              stock: "1",
              code: "",
              recommended: true,
              use: true,
              seq: 1,
            },
          ]
        : [],
    optionAxes: product.id === "BL240814" ? ["구성"] : [],
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
 * 저장 검사 — 원본 `pfValidate`
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
  | "seller"
  | "stage"
  | "certs"
  | "pickupAddress"
  | "airport"
  | "tags";

/**
 * 오류는 **화면 순서대로** 쌓는다 — 뼈대가 첫 오류로 이동한다.
 * 원본의 「권장 월령」 검사는 그 칸이 화면에 없어(원본도 조립하지 않음) 뺐다.
 * 「빈 옵션명」 검사도 뺐다 — 우리 옵션목록은 [적용] 으로만 생겨 이름이 빌 수 없다.
 */
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
  seller: "mainInfo",
  stage: "mainInfo",
  certs: "mainInfo",
  pickupAddress: "shipping",
  airport: "shipping",
  tags: "display",
};

export type SectionKey =
  | "name"
  | "mode"
  | "category"
  | "price"
  | "quantity"
  | "images"
  | "detail"
  | "mainInfo"
  | "shipping"
  | "option"
  | "display";

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
  if (draft.seller === "") errors.seller = COPY.errors.seller;
  if (draft.stage === "") errors.stage = COPY.errors.stage;
  if (!draft.certs.some((row) => row.type !== "")) {
    errors.certs = COPY.errors.certs;
  } else if (
    draft.certs.some((row) => needsCertNumber(row.type) && row.no.trim() === "")
  ) {
    errors.certs = COPY.errors.certNo;
  }
  if (draft.pickupOn && draft.pickupAddress === "")
    errors.pickupAddress = COPY.errors.pickupAddress;
  if (draft.airportOn && draft.airport === "")
    errors.airport = COPY.errors.airport;
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
    images: "상품이미지",
    detail: "상세설명",
    mainInfo: "상품 주요정보",
    shipping: "배송",
    option: "옵션",
    display: "노출 관리",
  },
  imageHelp:
    "이미지 크기 : 최대 1000 X 1000px, 최소 300 X 300px 이상 · 이미지 형식 : jpg,png 형식의 이미지만 등록 가능합니다. · 이미지 용량 : 1MB 이하 (최대 5MB)",
  imageDragHelp: "이미지를 드래그하여 순서를 변경할 수 있습니다.",
  /** 업로드·교체·삭제·순서 바꾸기는 개발 영역 — 퍼블은 알림만(2026-10-19 사용자 결정) */
  imagePending: "이미지 등록·교체·삭제는 개발 연동 시 제공됩니다.",
  detailPlaceholder:
    "상품 상세페이지를 작성하세요. 소재·사이즈·구성품·사용 연령·세탁/관리 방법·주의사항 등을 이미지와 함께 자유롭게 구성할 수 있습니다.",
  detailHelp:
    "사용자 앱 상품 상세 ‘상품정보’ 탭 본문으로 노출됩니다. 서식(굵게·정렬·목록·이미지 삽입) 편집기는 개발 연동 시 붙습니다.",
  stageHelp:
    "성장단계는 본사 ‘성장단계 관리’에서 동적으로 관리됩니다(선택만 가능). 사용 중 단계가 삭제되면 ‘없음’으로 자동 대체됩니다.",
  certHelp:
    "유아용품은 어린이제품 안전 특별법(KC) 등 법정 인증 대상입니다(판매·대여 모두 적용). 해당하는 인증을 모두 등록해주세요 — 비대상 품목은 ‘해당없음’을 선택합니다(1행 이상 필수). 등록한 인증은 사용자 상품 상세·본사 검수 화면에 노출됩니다.",
  infoHelp:
    "전자상거래법 상품정보제공고시 ‘영유아용품’ 필수 항목이 기본 세트로 제공됩니다 — 기본 세트는 삭제·항목명 수정 불가(내용 입력·상품상세참조만), 직접 추가한 행만 자유 편집됩니다. 체크 시 내용에 “상품상세참조”가 자동 입력됩니다.",
  infoRefAll: "전체 항목에 상품상세참조가 적용되었습니다.",
  shipMethodHelp: "택배는 기본 배송 방법으로 항상 제공됩니다.",
  pickupHelp:
    "체크하면 택배와 함께 방문 수령도 제공합니다. 구매자는 결제 시 택배·방문 수령 중 선택합니다.",
  pickupEmpty: "판매자 주소록에서 방문 수령 주소를 등록·선택해주세요.",
  pickupSelected: "방문 수령 주소가 선택되었습니다.",
  /** 주소록 편집은 판매자 계정의 데이터라 퍼블은 알림만 */
  addressPending: "주소록 등록·수정·삭제는 개발 연동 시 제공됩니다.",
  airportHelp:
    "체크하면 택배·방문 수령과 함께 공항 픽업도 제공합니다. 방문 수령 규칙을 준용해 준비 완료 알림 → 수령 기한 7일 → 경과 시 자동취소되며, 반납도 같은 장소(공항)에서 합니다. 공항 수령·반납 요금은 아래 공항 픽업 요금·공항 반납 요금으로 각각 설정합니다(무료 가능 · 렌트는 두 요금이 합산 부과되고, 구매는 픽업 요금만 부과).",
  optionHelp:
    "옵션명(축)과 옵션값을 입력하고 [옵션목록으로 적용]하면 값의 모든 조합이 목록으로 생성됩니다(최대 3축). 옵션가는 렌트 기간과 무관한 주문당 1회 정액이며, 추천을 체크하면 사용자 화면 옵션 목록에 추천 배지가 붙습니다.",
  optionApplied: (count: number) =>
    `${count}개 옵션 조합을 목록에 적용했습니다.`,
  optionEmptyInput: "옵션명과 옵션값을 입력해주세요.",
  optionNoneSelected: "선택된 옵션이 없습니다.",
  optionBulkDone: (count: number) => `${count}개 옵션을 일괄수정했습니다.`,
  optionEmptyTitle: "데이터가 존재하지 않습니다.",
  optionEmptyDescription:
    "위 옵션입력에 옵션명·옵션값을 적고 [옵션목록으로 적용]을 눌러 주세요.",
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
    seller: "셀러를 선택해주세요.",
    stage: "성장단계를 선택해주세요.",
    certs: "인증 정보를 1행 이상 선택해주세요(비대상 품목은 ‘해당없음’).",
    certNo: "선택한 인증의 인증번호를 입력해주세요.",
    pickupAddress: "방문 수령 주소를 선택해주세요.",
    airport: "공항 픽업 공항을 선택해주세요.",
    tags: "검색 태그는 최대 10개까지 입력할 수 있습니다.",
  } satisfies Record<FieldKey | "certNo", string>,
};
