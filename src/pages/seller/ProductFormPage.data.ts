import { saleStatOf } from "./ProductsPage.data";
import type { TagTone } from "../../components/ui";
import { PRODUCTS, type SellerProduct } from "./seed/products.data";
import {
  ADDR_BOOK,
  RENT_CATTREE,
  SALE_CATTREE,
  STAGES,
  type CategoryNode,
} from "./seed/store.data";

/* -------------------------------------------------------------------------
 * 셀러 상품 폼 (상품 상세 수정 · 상품 등록) — 도메인 층
 *
 * 짝이 되는 뼈대: `ProductFormPage.tsx`
 * 본사 `babycube/ProductDetailPage.data.ts` 를 **복사해 셀러 원본에 맞게 고친 것**이다(가져다 쓰지 않는다).
 *
 * 원본 = 셀러 어드민 v0.4 `openProductForm(id,'seller')` · `_pfDefaults` · `pfValidate` · `pfSave`.
 * 한 폼이 두 모드다 — 수정(`/products/{P-001}`)은 상품을 `draftOf` 로 옮겨 열고,
 * 등록(`/product-new`)은 `emptyDraft`(원본 `_pfDefaults`)로 연다.
 *
 * ## ⚠️ 상품 레코드는 셀러 시드(`seed/products.data.ts`)를 **읽기만** 한다
 * 본사 화면과 달리 예시 값을 지어내지 않는다 — 시드에 실제 값이 다 있다(기간 옵션·인증·고시·
 * 옵션·렌트 수량·슬롯 중지·배송 세부·방문 수령·공항 픽업·이미지·상세설명).
 * 본사 직영(`src === "본사"`)은 셀러 목록에서 빠지므로(원본) 상세로도 열지 않는다.
 *
 * ## 갈아끼울 것 (이 파일 전체)
 * | 실물 이름        | 역할                                                       |
 * | ---------------- | ---------------------------------------------------------- |
 * | `findProduct`    | 경로의 상품 id → 상품 (본사 직영은 찾지 않는다)            |
 * | `saleStatOf`     | 판매 상태 6종 파생 — 원본 `prodSaleStat` (품절 = 재고 파생)|
 * | `isLocked`       | 본사 처분(반려·재심사요청) — 원본 `prodLocked`             |
 * | `ProductDraft`   | 화면 안에서 고치는 값 — 저장하지 않는다(퍼블 범위)         |
 * | `draftOf`        | 상품 → 처음 값 (원본 `openProductForm` 의 매핑)            |
 * | `emptyDraft`     | 등록 모드 처음 값 (원본 `_pfDefaults`)                     |
 * | `validate`       | 원본 셀러 `pfValidate` − 셀러명 검사 + Q-63 보증금         |
 * | `NEXT_ID`        | 등록 알림의 새 상품 id (원본 `P-{최대+1}`)                 |
 * | `COPY`           | 안내·오류·알림 문구 (원본 그대로 — 고친 곳은 뼈대 머리 주석) |
 * ---------------------------------------------------------------------- */

export type ProductMode = "rent" | "sale";

/** 전시 상태 — 원본 `showStat` (구 값 「숨김」 은 전시중지로 읽는다) */
export type DisplayStat = "전시중" | "전시중지";

/** 할인 입력 방식 — 원본 `%` / `원` */
export type DiscountType = "amt" | "rate";

/** 판매 상품의 상태 — 중고면 최초 구매일·등급을 더 받는다 */
export type Condition = "new" | "used";

/** 경로의 상품 id → 상품. **본사 직영은 이 화면에 없다**(셀러 목록과 같은 집합) */
export const findProduct = (id: string): SellerProduct | undefined =>
  PRODUCTS.find((product) => product.id === id && product.src !== "본사");

/** 판매 상태 — 원본 `prodSaleStat`. 목록과 **같은 함수**(`ProductsPage.data`) · 화면에서 고치는 값에도 쓴다 */
export { saleStatOf };

/** 본사 처분이 걸린 건 — 판매·전시 상태를 셀러가 바꾸지 못한다(원본 `prodLocked`) */
export const isLocked = (product: SellerProduct) =>
  ["반려", "재심사요청"].includes(saleStatOf(product));

/** 판매 상태 배지 색 — 본사 상품 목록과 같은 판정(정상 진행 success · 처분 critical · 대기 warning) */
const SALE_STAT_TONE: Record<string, TagTone> = {
  판매중: "success",
  반려: "critical",
  재심사요청: "warning",
};
export const saleStatTone = (stat: string): TagTone =>
  SALE_STAT_TONE[stat] ?? "default";

export const displayOf = (product: SellerProduct): DisplayStat =>
  product.showStat === "전시중" ? "전시중" : "전시중지";
export const displayTone = (display: DisplayStat): TagTone =>
  display === "전시중" ? "success" : "default";

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
  /** 판매 상태 세그먼트 값 — 판매중/판매중지. 품절·처분·초안은 뼈대가 파생해 배지로 낸다 */
  saleStat: string;
  display: DisplayStat;
  comment: string;
  tags: string;
  /** 대표이미지가 있나 · 추가이미지 장수 — 실제 파일은 개발 영역이라 자리만 센다 */
  mainImage: boolean;
  extraImages: number;
  /** 상세설명 — 원본은 서식 편집기, 우리는 평문(2026-10-19 사용자 결정) */
  detail: string;
  /** 성장단계 — 원본 결합형 값 `이름·구간`(예 `영아·4~12개월`) */
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
  /** 방문 수령 주소 — 주소록(`ADDR_BOOK`)의 id. 비면 미선택 */
  pickupAddress: string;
  pickupFee: Fee;
  /** 방문 반납 요금 — 렌트만 */
  pickupReturnFee: Fee;
  airportOn: boolean;
  /** 공항 픽업 주소 — 방문 수령과 같은 주소록에서 고른다(원본 2026-07-29 판정) */
  airportAddress: string;
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

/** 고시에서 걷어낸 행 — 같은 섹션의 「인증 정보」 로 옮겨 갔다(원본 `_pfInfoRows` 가 걸러낸다) */
const DROPPED_INFO_KEY = "KC 인증 유무";

/** 「상품상세참조」 를 켜면 내용에 들어가는 글자 */
export const INFO_REF_TEXT = "상품상세참조";

export const COURIERS = [
  "CJ대한통운",
  "롯데택배",
  "한진택배",
  "로젠택배",
  "우체국",
];

export const OPTION_SORTS: { value: OptionSort; label: string }[] = [
  { value: "reg", label: "등록순" },
  { value: "abc", label: "가나다순" },
  { value: "lo", label: "낮은 가격순" },
  { value: "hi", label: "높은 가격순" },
];

/** 카테고리 선택지 — 원본 `catTreeOf(mode)`. 이름이 곧 값이다 */
export interface CategoryOption {
  value: string;
  label: string;
  children: CategoryOption[];
}
const toOption = (node: CategoryNode): CategoryOption => ({
  value: node.name,
  label: node.name,
  children: node.children.map(toOption),
});
export const CATEGORY_TREES: Record<ProductMode, CategoryOption[]> = {
  rent: RENT_CATTREE.map(toOption),
  sale: SALE_CATTREE.map(toOption),
};

/** 성장단계 선택지 — 원본 `PF_STAGES`. 값은 결합형(`영아·4~12개월`), 보이는 글자는 `영아 (4~12개월)` */
export const STAGE_OPTIONS = STAGES.map((stage) => ({
  value: `${stage.name}·${stage.range}`,
  label: `${stage.name} (${stage.range})`,
}));

/** 판매자 주소록 — 원본 `ADDR_BOOK` 시드(리틀베이비 출고지·반품교환지·공항 픽업존 2) */
export const ADDRESSES = ADDR_BOOK;

/** 등록 알림의 새 상품 id — 원본 `pfSave` 의 `P-{가장 큰 번호 + 1}` (저장하지 않으니 늘 같다) */
export const NEXT_ID = `P-${String(
  Math.max(0, ...PRODUCTS.map((p) => parseInt(p.id.split("-")[1]) || 0)) + 1,
).padStart(3, "0")}`;

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
 * 이름이나 값이 빈 축은 건너뛴다. 이미 친 값은 열쇠로 되살린다.
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

const digits = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

/** 금액 + 무료 — 원본은 `{금액 필드, 무료 필드 'Y'}` 한 쌍. 무료면 금액을 보이지 않는다 */
const fee = (amount: number | undefined, free?: string): Fee =>
  free === "Y"
    ? { amount: "", free: true }
    : { amount: digits(amount), free: false };

const blankFee = (): Fee => ({ amount: "", free: false });

const defaultInfo = (): InfoRow[] =>
  INFO_KEYS.map((key, index) => ({
    id: index + 1,
    key,
    value: "",
    ref: false,
    fixed: true,
  }));

/**
 * 상세설명 HTML → 평문. 시드는 `<b>제목</b><div><br></div><div>줄</div>…` 한 꼴뿐이다
 * (`<div>` = 줄바꿈 · `<div><br></div>` = 빈 줄). 평문 칸에 태그 글자가 보이면 안 된다.
 */
const plainText = (html: string) =>
  html
    .replace(/<br>/g, "")
    .replace(/<div>/g, "\n")
    .replace(/<[^>]+>/g, "");

/** 등록 모드 처음 값 — 원본 `_pfDefaults` (렌트 · 판매중 · 전시중 · 나머지는 빈 칸) */
export const emptyDraft = (): ProductDraft => ({
  name: "",
  mode: "rent",
  condition: "new",
  firstBuyDate: "",
  grade: "",
  major: "",
  middle: "",
  minor: "",
  rentBase: "",
  rentDiscOn: false,
  rentDiscType: "amt",
  rentDiscVal: "",
  baseRentDays: "",
  deposit: "",
  periodOn: false,
  periods: [{ id: 1, days: "", price: "" }],
  saleBase: "",
  saleDiscOn: false,
  saleDiscType: "amt",
  saleDiscVal: "",
  rentQty: "",
  slotOff: [],
  stock: "",
  saleStat: "판매중",
  display: "전시중",
  comment: "",
  tags: "",
  mainImage: false,
  extraImages: 0,
  detail: "",
  stage: "",
  /* 원본 `pfCertBody` — 비어 있으면 빈 줄 하나를 깔고 연다 */
  certs: [{ id: 1, type: "", no: "", note: "" }],
  info: defaultInfo(),
  courier: "",
  shipFee: blankFee(),
  collectFee: blankFee(),
  returnFee: "",
  exchangeFee: "",
  pickupOn: false,
  pickupAddress: "",
  pickupFee: blankFee(),
  pickupReturnFee: blankFee(),
  airportOn: false,
  airportAddress: "",
  airportFee: blankFee(),
  airportReturnFee: blankFee(),
  optionOn: false,
  optionSort: "reg",
  optionInputs: [{ id: 1, name: "", values: "" }],
  options: [],
  optionAxes: [],
});

/**
 * 상품 → 처음 값. 원본 `openProductForm` 의 매핑 그대로 —
 * - 유형 `both` 는 렌트로(렌트+판매 탭 폐지)
 * - 할인은 할인액이 있으면 [설정함] · 정액(원)
 * - 기간 옵션은 `presets` 가 있으면 [설정함]
 * - 인증은 `certs` 가 없으면 KC 표시 + 인증번호로 한 줄을 세운다
 * - 고시는 `infoRows` 가 없으면 기본 세트, 있으면 「KC 인증 유무」 행을 걸러낸다
 * - 옵션은 시드가 전부 **평면 옵션**(조합 없음)이라 1축 「옵션」 으로 접는다(원본 `_optRestore`)
 * - 배송비·회수 배송비·픽업 요금은 `…Amt`/`…Free` 쌍을 읽는다(레거시 `shipFee` 는 읽지 않는다)
 * - 카테고리가 **그 유형의 트리에 없으면 비운다**(뼈대 머리 주석 「원본과 다르게 둔 곳」)
 * - 판매 상태 저장값 「품절」 은 세그먼트 기준값 「판매중」 으로 읽는다(품절은 고르는 값이 아니라 재고 파생)
 */
export const draftOf = (p: SellerProduct): ProductDraft => {
  const mode: ProductMode = p.mode === "sale" ? "sale" : "rent";
  const inTree = CATEGORY_TREES[mode].some((node) => node.value === p.cat);
  const stat = p.stat || p.saleStat || "판매중";
  const certs =
    p.certs ??
    (p.kc
      ? [{ type: "어린이제품 안전확인", no: p.certNo || "", note: "" }]
      : []);
  const info = (p.infoRows ?? []).filter((row) => row.k !== DROPPED_INFO_KEY);
  const flatOptions = p.options.filter((option) => !option.period);
  const optionLabel = (option: SellerProduct["options"][number]) =>
    `${option.name} ${option.val}`.trim() || "-";

  return {
    ...emptyDraft(),
    name: p.name,
    mode,
    major: inTree ? p.cat : "",
    rentBase: digits(p.rent),
    rentDiscOn: p.rentDisc > 0,
    rentDiscVal: p.rentDisc > 0 ? String(p.rentDisc) : "",
    baseRentDays: digits(p.baseRentDays),
    deposit: digits(p.dep),
    periodOn: (p.presets?.length ?? 0) > 0,
    periods: p.presets?.length
      ? p.presets.map((row, index) => ({
          id: index + 1,
          days: String(row.days),
          price: String(row.price),
        }))
      : [{ id: 1, days: "", price: "" }],
    saleBase: digits(p.sale),
    saleDiscOn: p.saleDisc > 0,
    saleDiscVal: p.saleDisc > 0 ? String(p.saleDisc) : "",
    rentQty: digits(p.qty),
    slotOff: p.slotOff ? [...p.slotOff] : [],
    stock: digits(p.stock),
    saleStat: stat === "품절" ? "판매중" : stat,
    display: displayOf(p),
    comment: p.comment ?? "",
    tags: p.tags?.join(", ") ?? "",
    mainImage: Boolean(p.mainImg),
    extraImages: p.addImgs.length,
    detail: plainText(p.detail),
    stage: p.stage,
    certs: certs.length
      ? certs.map((row, index) => ({ id: index + 1, ...row }))
      : [{ id: 1, type: "", no: "", note: "" }],
    info: info.length
      ? info.map((row, index) => ({
          id: index + 1,
          key: row.k,
          value: row.v,
          ref: row.ref,
          fixed: row.fixed,
        }))
      : defaultInfo(),
    courier: p.courier ?? "",
    shipFee: fee(p.shipFeeAmt, p.shipFeeFree),
    collectFee: fee(p.collectFee, p.collectFeeFree),
    returnFee: digits(p.returnFee),
    exchangeFee: digits(p.exchangeFee),
    pickupOn: (p.pickupUse || (p.shipMethod === "pickup" ? "Y" : "N")) === "Y",
    pickupAddress: p.pickupAddrId ?? "",
    pickupFee: fee(p.pickupFee),
    pickupReturnFee: fee(p.pickupRetFee),
    airportOn: p.airportUse === "Y",
    airportAddress: p.airportAddrId ?? "",
    airportFee: fee(p.airportFee),
    airportReturnFee: fee(p.airportRetFee),
    optionOn: flatOptions.length > 0,
    optionInputs: flatOptions.length
      ? [
          {
            id: 1,
            name: "옵션",
            values: [...new Set(flatOptions.map(optionLabel))].join(","),
          },
        ]
      : [{ id: 1, name: "", values: "" }],
    options: flatOptions.map((option, seq) => ({
      combo: [optionLabel(option)],
      price: String(option.add),
      stock: String(option.stock),
      code: option.code,
      recommended: false,
      use: option.use !== "N",
      seq,
    })),
    optionAxes: flatOptions.length ? ["옵션"] : [],
  };
};

/* -------------------------------------------------------------------------
 * 계산 — 원본 `pfDiscAbs` · `fmtDaysKo` 그대로
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

/** 슬롯 이름 — 원본 `{상품ID}-{2자리}`. 등록 중인 상품은 아직 id 가 없어 원본도 `P-신규` 를 쓴다 */
export const slotName = (code: string | undefined, index: number) =>
  `${code ?? "P-신규"}-${String(index).padStart(2, "0")}`;

/** 쉼표로 나눈 태그 수 */
export const tagCount = (tags: string) =>
  tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean).length;

/* -------------------------------------------------------------------------
 * 저장 검사 — 원본 셀러 `pfValidate`
 *
 * 원본에 없는 검사를 더하지 않는다 — 단 하나, **Q-63(기획 결정) 렌트 보증금 1원 이상**.
 * 빠진 것: 셀러명(등록 주체 칸이 없다 — 입점사 스토어로 자동) · 권장 월령(그 칸이 화면에 없다 —
 * 원본도 조립하지 않음 · 시드에 시작 > 종료인 상품도 없다) · 빈 옵션명(옵션목록은 [적용] 으로만 생겨
 * 이름이 빌 수 없다). 재고 수량은 원본도 검사하지 않는다(0 = 품절은 정상).
 * 숨은 유형의 칸(렌트 상품의 판매가 등)은 검사하지 않는다.
 * ---------------------------------------------------------------------- */

/** 오류를 붙일 칸 — 뼈대가 이 이름으로 입력칸 id 를 만들고 첫 오류로 이동한다 */
export type FieldKey =
  | "name"
  | "category"
  | "rentBase"
  | "rentDisc"
  | "deposit"
  | "periods"
  | "rentQty"
  | "saleBase"
  | "saleDisc"
  | "stage"
  | "certs"
  | "pickupAddress"
  | "airportAddress"
  | "tags";

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

/** 칸 → 그 칸이 들어 있는 섹션. 접힌 섹션의 오류를 펼쳐 보이려고 쓴다 */
export const SECTION_OF: Record<FieldKey, SectionKey> = {
  name: "name",
  category: "category",
  rentBase: "price",
  rentDisc: "price",
  deposit: "price",
  periods: "price",
  rentQty: "quantity",
  saleBase: "price",
  saleDisc: "price",
  stage: "mainInfo",
  certs: "mainInfo",
  pickupAddress: "shipping",
  airportAddress: "shipping",
  tags: "display",
};

/** 오류는 **화면 순서대로** 쌓는다 — 뼈대가 첫 오류로 이동한다(원본은 첫 오류 하나를 알림) */
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
    /* Q-63 — 보증금 0원 렌트를 막는다(원본에는 없는 검사 · 기획 결정) */
    if (!(num(draft.deposit) > 0)) errors.deposit = COPY.errors.deposit;
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
  if (draft.airportOn && draft.airportAddress === "")
    errors.airportAddress = COPY.errors.airportAddress;
  if (tagCount(draft.tags) > TAG_COUNT_MAX) errors.tags = COPY.errors.tags;

  return errors;
};

/* -------------------------------------------------------------------------
 * 문구 — 원본 그대로 (고친 곳은 뼈대 머리 주석 「원본과 다르게 둔 곳」)
 * ---------------------------------------------------------------------- */

export const COPY = {
  titleEdit: "상품 상세 (수정)",
  titleNew: "상품 등록 폼",
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
  /** 방문 수령·공항 픽업이 같은 주소록을 쓴다 — 여는 버튼·빈 안내·선택 알림만 다르다(원본 `addrBookOpen(target)`) */
  address: {
    pickup: {
      button: "판매자 주소록",
      empty: "판매자 주소록에서 방문 수령 주소를 등록·선택해주세요.",
      selected: "방문 수령 주소가 선택되었습니다.",
    },
    airport: {
      button: "공항 픽업 주소록",
      empty: "공항 픽업 주소록에서 공항 픽업 주소를 등록·선택해주세요.",
      selected: "공항 픽업 주소가 선택되었습니다.",
    },
  },
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
  /** 셀러 원본 문면(세 줄) — 본사 화면의 한 문단과 다르다. 원본 줄머리 「·」는 도형 점(`BulletList`)으로 */
  baseRentDaysHelp: [
    "원칙은 최소일 수(기본 렌트일)에 렌트가(원/일)를 곱한 계산으로 가격이 산정됩니다.",
    "사용자가 기간을 늘리면 늘린 기간수에 렌트가(원/일)를 곱한 계산으로 가격이 산정됩니다.",
    "기간 옵션은 위 원칙과 별개로 정해진 기간과 가격으로 렌트를 진행합니다.",
  ],
  finalRentHelp:
    "사용자가 기간을 늘리지 않았을 때 결제되는 기본 금액입니다(보증금 별도).",
  finalRentEmpty: "위 기본 렌트일을 입력하면 계산됩니다.",
  depositHelp: "반납 검수 후 환급되는 금액입니다.",
  /** 셀러 원본 문면(두 줄) — 줄머리 「·」는 도형 점(`BulletList`)으로 */
  periodHelp: [
    "정한 기간 만큼, 장기 렌트 할인가로 판매하는 옵션입니다.",
    "1개월은 '30일' 기준입니다.",
  ],
  periodFull: `기간 옵션은 최대 ${PERIOD_MAX}개까지 등록할 수 있습니다. 다른 기간을 등록하려면 기존 옵션을 삭제한 뒤 추가해주세요.`,
  rentQtyHelp:
    "같은 상품의 동시 대여 가능 건수입니다(수량 풀 — 개체 배정 없음). 수량 등록 시 슬롯 ID가 {상품ID}-{순번}으로 자동 발번되며(삭제 시 결번 유지), 수량 변경·중지·삭제는 심사 없이 즉시 반영됩니다.",
  slotOffNote: "신규 예약 제외",
  stockHelp: "판매 가능한 재고 수량입니다.",
  /** 판매 상태 안내 — 원본 노출 관리 5992~5995. 고친 낱말은 뼈대 머리 주석 */
  saleStatusHelp: {
    rejected:
      "본사가 반려 처리한 상품이라 판매 상태를 직접 바꿀 수 없습니다. 아래 사유를 보완하신 뒤 하단 바의 [재심사 요청]을 눌러주세요.",
    rereview:
      "본사가 반려 처리한 상품이라 판매 상태를 직접 바꿀 수 없습니다. 재심사를 요청해 두었으니 본사 판단을 기다려 주세요.",
    draft:
      "저장만 해 둔 초안입니다(본사 화면에는 나오지 않습니다). 아래 [수정 저장]을 누르면 판매중으로 전환되어 판매가 시작되고, 초안으로 더 두려면 [임시저장]을 눌러주세요.",
    /** 품절 — 가운데 「판매중지」 는 누르면 판매중지로 바꾸는 글자 버튼이다 */
    soldOut: [
      "판매 재고가 0개라 품절입니다 — 위 [재고 수량]을 채우면 판매중으로 돌아갑니다(품절은 재고에서 자동으로 정해집니다). 판매를 멈추려면 ",
      "판매중지",
      "로 바꿔주세요.",
    ] as const,
  },
  displayLocked: {
    rejected:
      "본사 반려 처분으로 전시가 함께 내려간 상태라 직접 바꿀 수 없습니다. 재심사를 거쳐 처분이 풀리면 다시 고를 수 있습니다.",
    rereview:
      "본사 반려 처분으로 전시가 함께 내려간 상태라 직접 바꿀 수 없습니다. 재심사 결과가 나오면 다시 고를 수 있습니다.",
  },
  noReason: "등록된 반려 사유가 없습니다.",
  commentPlaceholder:
    "예) 통기성 좋은 메시 소재라 여름에도 쾌적해요. 신생아부터 24개월까지 쓸 수 있습니다.",
  commentHelp:
    "사용자 화면 상품 상세의 상품명 바로 아래에 그대로 노출됩니다. 비워 두면 그 자리가 나타나지 않습니다.",
  tagsPlaceholder: "쉼표(,)로 구분해 입력 — 최대 10개",
  tagsHelp:
    "태그는 검색 매칭 전용입니다(사용자 화면 비노출 — SL-3). 예) 신생아, 휴대용, 접이식",
  /** 저장·임시저장·재심사 알림 — 원본 `pfSave`·`pfSaveDraft`·`requestRereviewOne` */
  saved: "상품 정보가 수정되었습니다.",
  created: (id: string) => `${id} 상품이 등록되었습니다.`,
  draftSaved: "임시저장되었습니다.",
  draftCreated: (id: string) =>
    `${id} 상품이 임시저장되었습니다. 등록을 마치면 판매가 시작됩니다.`,
  draftNeedsName: "상품명을 입력해주세요 — 임시저장에도 이름은 필요합니다.",
  rereviewDone: "재심사를 요청했습니다. 본사 판단을 기다립니다.",
  errors: {
    name: "상품명을 입력해주세요.",
    category: "카테고리(대분류)를 선택해주세요.",
    rentBase: "렌트료를 입력해주세요.",
    rentDisc: "렌트 할인율은 100%를 초과할 수 없습니다.",
    /** Q-63 — 기획 결정 문구 그대로 */
    deposit: "보증금을 입력해 주세요.",
    periods: "기간 옵션은 일수와 장기 렌트 할인가를 함께 입력해주세요.",
    rentQty: "렌트 수량을 입력해주세요.",
    saleBase: "판매가를 입력해주세요.",
    saleDisc: "판매 할인율은 100%를 초과할 수 없습니다.",
    stage: "성장단계를 선택해주세요.",
    certs: "인증 정보를 1행 이상 선택해주세요(비대상 품목은 ‘해당없음’).",
    certNo: "선택한 인증의 인증번호를 입력해주세요.",
    pickupAddress: "방문 수령 주소를 선택해주세요.",
    airportAddress: "공항 픽업 주소를 선택해주세요.",
    tags: "검색 태그는 최대 10개까지 입력할 수 있습니다.",
  } satisfies Record<FieldKey | "certNo", string>,
};
