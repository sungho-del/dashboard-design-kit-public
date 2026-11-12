import { PRODUCTS, type SellerProduct } from "./seed/products.data";
import {
  ADDR_BOOK,
  RENT_CATTREE,
  SALE_CATTREE,
  STAGES,
} from "./seed/store.data";
import {
  type ProductMode,
  type CategoryOption,
  toOption,
  type ProductDraft,
  DROPPED_INFO_KEY,
  emptyDraft,
  digits,
  displayOf,
  defaultInfo,
  fee,
} from "./ProductFormPage.labels";

export * from "./ProductFormPage.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./ProductFormPage.labels`(개발 요청 2026-11-12 46번) */

/** 경로의 상품 id → 상품. **본사 직영은 이 화면에 없다**(셀러 목록과 같은 집합) */
export const findProduct = (id: string): SellerProduct | undefined =>
  PRODUCTS.find((product) => product.id === id && product.src !== "본사");
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
    detail: p.detail,
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

/**
 * 진행 중 예약 건수 예시 — 시드에 예약 수가 없어 한 상품에만 둔다(개발 요청 8번 「초과 상태」가 보이도록).
 * P-001 은 렌트 수량 3 · 3번 중지라 활성 2개 → 예약 3건이면 처음부터 초과 상태다. 실제 값은 서버 슬롯 원장
 */
const RESERVATIONS: Record<string, number> = { "P-001": 3 };
export const reservationsOf = (id: string | undefined) =>
  (id && RESERVATIONS[id]) || 0;

/** 주소를 쓰는 상품이 있나 — 시드 상품의 방문 수령·공항 픽업 주소(A1·A3·A4). 이 주소는 삭제가 거부된다(개발 요청 10번) */
const ADDRESSES_IN_USE = new Set(
  PRODUCTS.flatMap((p) => [p.pickupAddrId, p.airportAddrId]).filter(Boolean),
);
export const addressInUse = (id: string) => ADDRESSES_IN_USE.has(id);
/**
 * 쓰는 중인 주소 삭제 거부 — develop 은 서버 409 문구를 그대로 띄운다. 그 문구가 서버에 있어
 * 퍼블은 예시 문장을 둔다(서버 값 자리)
 */
export const ADDRESS_IN_USE_SAMPLE =
  "이 주소를 쓰는 상품이 있어 삭제할 수 없습니다.";
/** 수령 전 주문 건수 예시 — 수정 저장 전 확인 창이 보이도록 출고지(A1) 한 곳에만 둔다. 실제 값은 서버 */
const PENDING_ORDERS: Record<string, number> = { A1: 2 };
export const pendingOrdersOf = (id: string) => PENDING_ORDERS[id] ?? 0;

/**
 * 진행 중 예약이 활성 수량보다 많은 내 렌트 상품 — 렌트 발주 관리 상단 「초과 상태」 줄(개발 요청 27번).
 * 활성 = 렌트 수량 − 중지 슬롯 · 예약 건수는 위 예시(`reservationsOf`)
 */
export const OVERBOOKED_PRODUCTS = PRODUCTS.filter(
  (p) => p.src !== "본사" && p.mode !== "sale",
)
  .map((p) => ({
    name: p.name,
    reservations: reservationsOf(p.id),
    active: Number(p.qty || 0) - (p.slotOff?.length ?? 0),
  }))
  .filter((p) => p.reservations > p.active);
