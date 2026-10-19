import type { DateRange, SelectOption, TagTone } from "../../components/ui";
import { MEMBERS } from "./MemberListPage.data";
import { PRODUCTS, salePriceOf } from "./ProductListPage.data";

/* -------------------------------------------------------------------------
 * S08 주문 목록 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `OrderListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 원본 템플릿: `src/pages/OrderListPage.data.ts` (이커머스) — 이름이 같지만 다른 화면이다
 * 기준 기획: **v0.4** `SCREENS.ordersAll` · `ordersFlatHead`/`ordersFlatRow` · `_ordersUnitFilter`
 *
 * ## 이 화면이 무엇인가
 * 렌트·판매 주문을 **처리단위** 기준으로 조회하는 목록. 결제(주문번호) 1건이 처리단위
 * N행으로 펼쳐진다 — 그래서 행의 고유 키는 주문번호가 아니라 **처리단위 코드(`id`)**다.
 * 조회 전용이다(행 액션·일괄 처리 없음 — 처리는 셀러 어드민의 몫).
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(처리단위 코드 — 행 key·선택·엑셀 선택분) · `date`(결제 일시
 *   `YYYY-MM-DD HH:mm`)를 갖는다. 같은 `orderNo` 를 가진 행이 여럿일 수 있다
 * - `TYPE_FILTERS` 는 렌트·판매 **2장뿐**이고 기본은 렌트다(원본 `OTYPE_DEF` · [전체] 없음)
 * - `STATUS_OPTIONS_BY_TYPE[유형][0].value === "all"`
 * - `STATUS_META` 의 키는 `Order["status"]` 와 정확히 일치한다
 * - `searchValueOf` 는 검색 대상 7종 → 그 행의 값. 어느 필드를 보는가는 도메인이다
 * - `filtersFromQuery` 는 **URL 쿼리 → 초기 필터**(대시보드 링크). 원본 파라미터 이름 그대로
 *
 * ## 샘플 — 다른 화면과 **이어져 있다**
 * 상품·셀러는 상품 관리 샘플(`PRODUCTS`)에서, 구매자는 회원 샘플(`MEMBERS`)에서 읽는다.
 * 금액은 **주문 당시 값**을 상품 단가로 다시 만든 예시다(렌트 = 일 단가 × 렌트일).
 * ⚠️ 원본 샘플은 2026년 6월이지만, 상품 등록일(7~9월)보다 주문이 앞서지 않도록
 * **2026년 9~10월**로 옮겼다. 형식(14자리 주문번호 · 배송 3종 · 카드 결제)은 원본 그대로다.
 * ---------------------------------------------------------------------- */

/** 처리단위가 나간 방식. 렌트는 이용 기간·렌트 금액이 붙고 판매는 붙지 않는다 */
export type OrderType = "rent" | "sale";

/** 파는 주체. 본사(자체) 재고인지 입점 셀러 재고인지 */
export type SellerKind = "hq" | "seller";

/**
 * 처리단위의 진행 상태.
 * 앞 12개는 원본 `FLOW_STEPS` 의 판매(5)·렌트(11) 흐름이다(앞 4단계 공유).
 * 뒤 4개는 **목록에 보이기만 하는** 상태다 — 원본도 클레임 진행 건과 배송 지연을 주문
 * 목록에 섞어 보여 주지만 상태 선택지에는 없어 골라 볼 수 없다(기획 확인 사항).
 */
export type OrderStatus =
  | "new"
  | "ready"
  | "shipping"
  | "delivered"
  | "renting"
  | "extended"
  | "overdue"
  | "pickup"
  | "inspecting"
  | "inspected"
  | "returned"
  | "confirmed"
  | "delayed"
  | "cancelRequested"
  | "returnPicking"
  | "exchangeRequested";

export interface Order {
  /** 처리단위 코드 — **고유 키**. 행 key·선택·엑셀 선택분·(다음 단계의) 상세 경로 */
  id: string;
  /** 주문번호 14자리. 한 결제에 처리단위가 여럿이면 **같은 번호를 공유한다** */
  orderNo: string;
  status: OrderStatus;
  type: OrderType;
  sellerKind: SellerKind;
  /** 셀러명 — 본사 건은 `"본사"`. 판매자 열·셀러 필터·검색이 이 값을 본다 */
  seller: string;
  /** 이용 기간 `YYYY-MM-DD ~ YYYY-MM-DD` — 판매 건은 빈 문자열 */
  period: string;
  payMethod: string;
  /** ⚠️ **결제 일시** `YYYY-MM-DD HH:mm`. 기간 필터·정렬이 이 값을 본다 */
  date: string;
  /** 결제금액 — **엑셀 전용**(표에는 없다) */
  payAmount: number;
  shipMethod: string;
  carrier: string;
  trackingNo: string;
  /** 수거 택배사 — 렌트의 반납 회수에만 채워진다 */
  pickupCarrier: string;
  pickupTrackingNo: string;
  productCode: string;
  productName: string;
  /** 렌트 원가(일 단가 × 렌트일) — 판매 건은 `null` */
  rentBasePrice: number | null;
  /** 렌트 할인 — 판매 건은 `null`(판매 건의 렌트 금액 세 열은 모두 비어 있다) */
  rentDiscount: number | null;
  buyerName: string;
  /** 구매자 ID — 회원 샘플의 아이디(이메일) */
  buyerId: string;
  /** 구매자 연락처. 표의 "연락처" 열이자 검색 대상 `연락처` 가 보는 값 */
  buyerPhone: string;
  receiver: string;
  receiverPhone: string;
  address: string;
  shipMemo: string;
  /** 주문일시 — **엑셀 전용** */
  orderedAt: string;
}

/** 렌트가 = 원가 − 할인 (음수 방지). 저장하지 않고 계산한다 — 셋이 어긋날 수 없게 */
export const rentPriceOf = (order: Order): number | null =>
  order.rentBasePrice === null
    ? null
    : Math.max(0, order.rentBasePrice - (order.rentDiscount ?? 0));

/** 판매자 열 — 원본 `owner==='자체' ? '본사' : sellerName`. 열 하나로 끝낸다 */
export const sellerLabel = (order: Order): string =>
  order.sellerKind === "hq" ? "본사" : order.seller;

/**
 * 상태값 → 라벨과 Tag tone.
 *
 * | tone       | 뜻                                   | 여기서 |
 * | ---------- | ------------------------------------ | ------ |
 * | `warning`  | **지금 사람이 무언가를 해야 끝난다** | 신규 주문 · 수거 신청 · 검수중 · 검수완료 · 취소 요청 · 교환 신청 |
 * | `critical` | 비정상 — 즉시 조치                   | 연체중 · 배송 지연 |
 * | `success`  | 진행 중이고 정상 (돈이 도는 상태)    | 대여중 · 대여중(연장) |
 * | `default`  | 정상 종료 + 조용한 중간 단계         | 배송 3종 · 반납완료 · 구매확정 · 반품 수거중 |
 *
 * ⚠️ 검수완료가 `warning` 인 이유 — 이름은 "완료"지만 보증금 처리가 남아 흐름의 끝이 아니다.
 * 클레임 상태의 tone 은 취소·반품·교환 목록과 같다(같은 글자가 화면마다 다른 색이면 안 된다).
 */
export const STATUS_META: Record<
  OrderStatus,
  { label: string; tone: TagTone }
> = {
  new: { label: "신규 주문", tone: "warning" },
  ready: { label: "배송 준비", tone: "default" },
  shipping: { label: "배송중", tone: "default" },
  delivered: { label: "배송 완료", tone: "default" },
  renting: { label: "대여중", tone: "success" },
  extended: { label: "대여중(연장)", tone: "success" },
  overdue: { label: "연체중", tone: "critical" },
  pickup: { label: "수거 신청", tone: "warning" },
  inspecting: { label: "검수중", tone: "warning" },
  inspected: { label: "검수완료", tone: "warning" },
  returned: { label: "반납완료", tone: "default" },
  confirmed: { label: "구매확정", tone: "default" },
  delayed: { label: "배송 지연", tone: "critical" },
  cancelRequested: { label: "취소 요청", tone: "warning" },
  returnPicking: { label: "반품 수거중", tone: "default" },
  exchangeRequested: { label: "교환 신청", tone: "warning" },
};

/**
 * 유형 라벨. ⚠️ 원본은 렌트=초록 · 판매=파랑이지만 우리는 **둘 다 중립색**이다 —
 * `TagTone` 은 상태 어휘라 분류에 쓰면 "렌트는 좋은 상태"로 읽힌다.
 */
export const TYPE_META: Record<OrderType, { label: string; tone: TagTone }> = {
  rent: { label: "렌트", tone: "default" },
  sale: { label: "판매", tone: "default" },
};

/* =========================================================================
 * 샘플 — `처리단위|결제 일시(초)|상품코드|구매자 ID|상태|배송 방법|렌트일|배송 메모|수령인/연락처`
 *
 * 주문번호는 결제 일시의 숫자 14자리다 — **결제 일시가 같은 행은 같은 주문**이다
 * (U-R03·U-S03 = 렌트+판매 한 결제, U-R09·U-R22 = 렌트 두 건 한 결제).
 * 이용 기간은 결제 4일 뒤 시작한다. 상태는 오늘(2026-10-19) 기준으로 기간과 맞춰 두었다
 * (대여중은 기간 안, 연체중·검수·반납은 기간이 끝난 뒤).
 * ====================================================================== */
const SEED_ROWS = [
  /* ── 렌트 22 ── */
  "U-R01|2026-10-18 14:32:05|BL240814|sujin.park@example.com|new|택배|14|부재 시 경비실에 맡겨주세요|",
  "U-R02|2026-10-18 09:12:40|AR240729|dohyun.kim@example.com|new|방문 수령|7||",
  "U-R03|2026-10-17 20:05:11|GJ811204|yuna.choi@example.com|ready|택배|30||",
  "U-R04|2026-10-17 11:48:27|LB905531|yerin.song@example.com|ready|공항 픽업|5|출국 2시간 전 수령 예정|",
  "U-R05|2026-10-16 15:22:09|KB338806|taeho.ryu@example.com|delayed|택배|21||",
  "U-R06|2026-10-16 10:31:52|MC447210|serin.oh@example.com|shipping|택배|14||",
  "U-R07|2026-10-16 19:40:18|BL560372|jiho.moon@example.com|shipping|택배|30|문 앞에 두고 사진 남겨주세요|박서진/010-3310-7765",
  "U-R08|2026-10-15 08:55:30|LS184620|haeun.bae@example.com|delivered|택배|21||",
  "U-R09|2026-10-12 13:17:44|BH731058|chaewon.lim@example.com|renting|택배|30||",
  "U-R10|2026-10-10 21:03:06|AS730125|bora.hwang@example.com|renting|방문 수령|14||",
  "U-R11|2026-10-08 16:44:21|BL240814|jisung.ahn@example.com|renting|택배|30||",
  "U-R12|2026-10-02 10:09:33|KB338806|dain.hong@example.com|extended|택배|30||",
  "U-R13|2026-10-01 18:27:50|GJ811204|yoon.namgung@example.com|overdue|택배|7||",
  "U-R14|2026-09-26 12:40:02|AR240729|hajun.seo@example.com|overdue|공항 픽업|14|도착 후 픽업 데스크 수령|",
  "U-R15|2026-10-02 09:58:16|LB905531|gaeun.yoo@example.com|pickup|택배|14||",
  "U-R16|2026-09-24 14:15:37|BH731058|nayeon.kwon@example.com|inspecting|택배|14||",
  "U-R17|2026-09-22 17:33:49|LS672384|siwoo.jang@example.com|inspected|택배|14||",
  "U-R18|2026-09-18 11:20:08|BL377415|doyoon.baek@example.com|returned|택배|14||",
  "U-R19|2026-09-15 08:47:55|LB846102|harin.noh@example.com|returned|방문 수령|21||",
  "U-R20|2026-10-17 22:10:14|MC447210|junseo.ma@example.com|cancelRequested|택배|14||",
  "U-R21|2026-10-06 13:05:27|AS730125|sujin.park@example.com|returnPicking|택배|14||",
  "U-R22|2026-10-12 13:17:44|MC447210|chaewon.lim@example.com|renting|택배|30||",
  /* ── 판매 12 ── */
  "U-S01|2026-10-18 16:20:44|BL240811|yerin.song@example.com|new|택배|||",
  "U-S02|2026-10-18 10:02:19|LS240724|taeho.ryu@example.com|new|택배|||",
  "U-S03|2026-10-17 20:05:11|KB820417|yuna.choi@example.com|ready|택배|||",
  "U-S04|2026-10-15 13:36:58|BH612093|serin.oh@example.com|delayed|택배|||",
  "U-S05|2026-10-16 09:45:03|AR271948|jiho.moon@example.com|shipping|택배|||",
  "U-S06|2026-10-15 17:58:26|AS902715|haeun.bae@example.com|shipping|택배|경비실 옆 무인택배함||",
  "U-S07|2026-10-13 11:24:37|GJ650283|chaewon.lim@example.com|delivered|택배|||",
  "U-S08|2026-10-12 19:02:15|BL240811|bora.hwang@example.com|delivered|방문 수령|||",
  "U-S09|2026-10-05 14:48:09|LS240724|jisung.ahn@example.com|confirmed|택배|||",
  "U-S10|2026-09-25 10:30:52|HQ240806|dain.hong@example.com|confirmed|택배|||",
  "U-S11|2026-10-17 08:14:33|AS902715|yoon.namgung@example.com|cancelRequested|택배|||",
  "U-S12|2026-10-11 21:37:46|BH612093|hajun.seo@example.com|exchangeRequested|택배|||",
];

/** 상품을 받아 보낸 뒤의 상태 — 송장이 붙는다 */
const SHIPPED: OrderStatus[] = [
  "shipping",
  "delivered",
  "renting",
  "extended",
  "overdue",
  "pickup",
  "inspecting",
  "inspected",
  "returned",
  "confirmed",
  "returnPicking",
  "exchangeRequested",
];

/** 회수가 시작된 렌트 상태 — 수거 송장이 붙는다 */
const PICKED_UP: OrderStatus[] = [
  "inspecting",
  "inspected",
  "returned",
  "returnPicking",
];

const PAY_METHODS = ["신용카드", "카드(국민)", "체크카드", "카드(신한)"];
const CARRIERS = ["CJ대한통운", "롯데택배", "한진택배"];

/** `YYYY-MM-DD` 에 일수를 더한다 */
const addDays = (day: string, days: number) => {
  const at = new Date(`${day}T00:00:00`);
  at.setDate(at.getDate() + days);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
};

const toOrder = (row: string, index: number): Order => {
  const [id, paidAt, productId, buyerId, status, shipMethod, days, memo, to] =
    row.split("|");
  const product = PRODUCTS.find((item) => item.id === productId);
  const buyer = MEMBERS.find((member) => member.id === buyerId);
  if (!product || !buyer) throw new Error(`주문 샘플 연결 실패: ${row}`);

  const isRent = product.mode === "rent";
  const rentDays = Number(days);
  const start = addDays(paidAt.slice(0, 10), 4);
  const orderNo = paidAt.replace(/\D/g, "");
  const parcel = shipMethod === "택배";
  const carrier = CARRIERS[index % CARRIERS.length];
  const [receiver, receiverPhone] = to
    ? to.split("/")
    : [buyer.name, buyer.phone];

  const rentBasePrice = isRent ? (product.rentBase ?? 0) * rentDays : null;
  const rentDiscount = isRent ? (product.rentDiscount ?? 0) * rentDays : null;
  const goods = isRent
    ? (rentBasePrice ?? 0) - (rentDiscount ?? 0) + (product.deposit ?? 0)
    : salePriceOf(product);

  /* 주문일시는 결제보다 몇 분 앞선다(장바구니 → 결제) */
  const ordered = new Date(paidAt.replace(" ", "T"));
  ordered.setMinutes(ordered.getMinutes() - (3 + (index % 5)));
  const orderedAt = `${paidAt.slice(0, 10)} ${String(ordered.getHours()).padStart(2, "0")}:${String(ordered.getMinutes()).padStart(2, "0")}`;

  const shipped = parcel && SHIPPED.includes(status as OrderStatus);
  const pickedUp =
    parcel && isRent && PICKED_UP.includes(status as OrderStatus);

  return {
    id,
    orderNo,
    status: status as OrderStatus,
    type: product.mode,
    sellerKind: product.source === "hq" ? "hq" : "seller",
    seller: product.seller,
    period: isRent ? `${start} ~ ${addDays(start, rentDays - 1)}` : "",
    payMethod: PAY_METHODS[index % PAY_METHODS.length],
    date: paidAt.slice(0, 16),
    payAmount: goods + product.shipFee,
    shipMethod,
    carrier: shipped ? carrier : "",
    trackingNo: shipped ? "5" + orderNo.slice(1, 12) : "",
    pickupCarrier: pickedUp ? carrier : "",
    pickupTrackingNo: pickedUp ? "6" + orderNo.slice(2, 13) : "",
    productCode: product.id,
    productName: product.name,
    rentBasePrice,
    rentDiscount,
    buyerName: buyer.name,
    buyerId: buyer.id,
    buyerPhone: buyer.phone,
    receiver,
    receiverPhone,
    address: buyer.address,
    shipMemo: memo,
    orderedAt,
  };
};

/** 결제 일시 최신순 — 원본 목록의 기본 순서 */
export const ORDERS: Order[] = SEED_ROWS.map(toOrder).sort(
  (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
);

/**
 * 유형 대시 — **건수 카드가 곧 유형 필터다**(원본 `chip.dash`).
 * 원본 v0.4 는 **렌트·판매 2장, [전체] 없음, 들어오면 렌트**다(`_OTYPE_ALL` · `OTYPE_DEF`).
 */
export const TYPE_FILTERS: { value: OrderType; label: string }[] = [
  { value: "rent", label: "렌트" },
  { value: "sale", label: "판매" },
];

export const DEFAULT_TYPE: OrderType = "rent";

/** 카드 건수의 단위 */
export const DASH_UNIT = "건";

/** 판매자 라디오. 셀러를 고를 때만 셀러 셀렉트가 열린다 (원본 `radio.key = "owner"`) */
export const SELLER_KINDS = [
  { value: "all", label: "전체" },
  { value: "hq", label: "본사" },
  { value: "seller", label: "셀러" },
];

/**
 * 셀러 셀렉트 — **주문 샘플에 나오는 셀러에서 뽑는다**(손으로 적으면 샘플과 어긋난다).
 * 원본은 입력 + 목록 검색(부분 일치)이지만 우리는 셀렉트다(의도된 차이).
 */
export const SELLERS: SelectOption[] = [
  { value: "all", label: "셀러 전체" },
  ...[
    ...new Set(
      ORDERS.filter((order) => order.sellerKind === "seller").map(
        (order) => order.seller,
      ),
    ),
  ]
    .sort((a, b) => a.localeCompare(b, "ko"))
    .map((name) => ({ value: name, label: name })),
];

/**
 * 상태 셀렉트 — **유형별로 갈린다**(원본 `FLOW_STEPS` 판매 5 · 렌트 11).
 * 클레임 진행·배송 지연은 원본처럼 선택지에 없다(목록에는 보인다 — 기획 확인 사항).
 */
const statusOptions = (values: OrderStatus[]): SelectOption[] => [
  { value: "all", label: "상태 전체" },
  ...values.map((value) => ({ value, label: STATUS_META[value].label })),
];

export const STATUS_OPTIONS_BY_TYPE: Record<OrderType, SelectOption[]> = {
  rent: statusOptions([
    "new",
    "ready",
    "shipping",
    "delivered",
    "renting",
    "extended",
    "overdue",
    "pickup",
    "inspecting",
    "inspected",
    "returned",
  ]),
  sale: statusOptions(["new", "ready", "shipping", "delivered", "confirmed"]),
};

export type OrderSearchField =
  | "orderNo"
  | "seller"
  | "productCode"
  | "productName"
  | "buyerName"
  | "buyerId"
  | "buyerPhone";

/** 검색 대상 — 원본 7종, 기본 주문번호(원본 `_searchfield||'no'`). "전체" 대상은 없다 */
export const SEARCH_FIELDS: { value: OrderSearchField; label: string }[] = [
  { value: "orderNo", label: "주문번호" },
  { value: "seller", label: "셀러명" },
  { value: "productCode", label: "상품코드" },
  { value: "productName", label: "상품명" },
  { value: "buyerName", label: "구매자명" },
  { value: "buyerId", label: "구매자 ID" },
  { value: "buyerPhone", label: "연락처" },
];

/**
 * 검색 대상 → 그 행의 값. 원본처럼 **대소문자를 가리지 않는다**(뼈대가 소문자로 비교).
 * ⚠️ `연락처` 는 **구매자** 연락처다 — 수령인 연락처가 아니다(표의 열 이름과 같다).
 */
export const searchValueOf = (order: Order, field: OrderSearchField) =>
  order[field];

export const SEARCH_PLACEHOLDER = "검색어 입력";

/* =========================================================================
 * URL 쿼리 → 초기 필터  (원본 파라미터 이름을 그대로 쓴다)
 *
 * 대시보드 플로우 타일이 `/orders-all?stat=렌트&flow=대여중` 으로 링크한다.
 * **`stat` 이 유형, `flow` 가 상태**다(원본 `get("stat")` · `get("flow")`).
 *
 * | 파라미터     | 뜻      | 값                       |
 * | ------------ | ------- | ------------------------ |
 * | `stat`       | 유형    | `렌트` · `판매` (없거나 모르면 렌트) |
 * | `flow`       | 상태    | `대여중` · `검수완료` …  |
 * | `owner`      | 판매자  | `본사` · `셀러`          |
 * | `sellerName` | 셀러    | 셀러명 (`owner=셀러`일 때) |
 * | `q`          | 검색어  | 주문번호로 찾는다        |
 * | `paidAt_from` / `paidAt_to` | 결제일 구간 | `YYYY-MM-DD` |
 * ====================================================================== */

const TYPE_BY_LABEL: Record<string, OrderType> = Object.fromEntries(
  TYPE_FILTERS.map((item) => [item.label, item.value]),
);

const STATUS_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_META).map(([value, meta]) => [meta.label, value]),
);

const SELLER_KIND_BY_LABEL: Record<string, string> = Object.fromEntries(
  SELLER_KINDS.filter((item) => item.value !== "all").map((item) => [
    item.label,
    item.value,
  ]),
);

/** 뼈대가 들고 있는 조회 조건 한 덩어리 */
export interface OrderFilters {
  type: OrderType;
  sellerKind: string;
  /** 셀러명. `"all"` 이면 해제 */
  seller: string;
  status: string;
  searchField: OrderSearchField;
  keyword: string;
  period?: DateRange;
}

/** "초기화"가 되돌아가는 자리 — 렌트, 나머지는 전부 해제 */
export const EMPTY_FILTERS: OrderFilters = {
  type: DEFAULT_TYPE,
  sellerKind: "all",
  seller: "all",
  status: "all",
  searchField: "orderNo",
  keyword: "",
  period: undefined,
};

/** `YYYY-MM-DD` → `Date`. 형식이 아니면 `undefined`(필터 없음으로 떨어진다) */
function parseDay(text: string | null): Date | undefined {
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const at = new Date(`${text}T00:00:00`);
  return Number.isNaN(at.getTime()) ? undefined : at;
}

/**
 * URL 쿼리를 읽어 초기 조회 조건을 만든다. 모르는 값은 **조용히 무시**한다 —
 * 남이 만든 링크로 들어오는 자리라, 오타 하나로 화면이 비면 안 된다.
 *
 * 원본이 하는 **정합성 보정**을 함께 한다.
 *   · `stat=판매&flow=대여중` → 판매에 없는 상태라 `flow` 를 버린다
 *   · `owner=본사&sellerName=…` → 손댈 수 없는 셀러 지정이 되므로 버린다
 *   · 종료일만 있으면 시작일이 없어 기간을 걸지 않는다
 */
export function filtersFromQuery(params: URLSearchParams): OrderFilters {
  const type = TYPE_BY_LABEL[params.get("stat") ?? ""] ?? DEFAULT_TYPE;

  const status = STATUS_BY_LABEL[params.get("flow") ?? ""] ?? "all";
  const validStatus = STATUS_OPTIONS_BY_TYPE[type].some(
    (option) => option.value === status,
  )
    ? status
    : "all";

  const sellerKind = SELLER_KIND_BY_LABEL[params.get("owner") ?? ""] ?? "all";
  const sellerName = params.get("sellerName") ?? "";
  const seller = SELLERS.some((option) => option.value === sellerName)
    ? sellerName
    : "all";

  const from = parseDay(params.get("paidAt_from"));
  const to = parseDay(params.get("paidAt_to"));

  return {
    type,
    status: validStatus,
    sellerKind,
    seller: sellerKind === "seller" ? seller : "all",
    searchField: "orderNo",
    keyword: params.get("q") ?? "",
    period: from ? { from, to } : undefined,
  };
}

/** 검색조건이 접혀 있을 때 머리줄에 보이는 요약 — 걸린 조건이 없으면 이 글자 */
export const NO_FILTER_TEXT = "조건 없음 (전체)";

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

const dotDay = (value: Date) =>
  `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, "0")}.${String(value.getDate()).padStart(2, "0")}`;

/** 접힌 검색조건의 요약. 유형은 위의 카드가 말하므로 넣지 않는다 */
export const filterSummary = (filters: OrderFilters): string => {
  const parts: string[] = [];
  const { period } = filters;
  if (period?.from) {
    parts.push(
      `결제일 ${dotDay(period.from)}${period.to ? `~${dotDay(period.to)}` : ""}`,
    );
  }
  if (filters.sellerKind !== "all") {
    parts.push(
      filters.sellerKind === "seller" && filters.seller !== "all"
        ? `셀러 ${filters.seller}`
        : labelOf(SELLER_KINDS, filters.sellerKind),
    );
  }
  if (filters.status !== "all") {
    parts.push(`상태 ${STATUS_META[filters.status as OrderStatus].label}`);
  }
  if (filters.keyword.trim() !== "") {
    parts.push(
      `${labelOf(SEARCH_FIELDS, filters.searchField)} «${filters.keyword.trim()}»`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};

/** 빈 상태 — 원본 공용 문구 */
export const EMPTY_TITLE = "해당 조건의 항목이 없습니다";
export const EMPTY_DESCRIPTION =
  "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.";

/** 주문번호 링크 — 상세 화면을 만들기 전까지의 알림 */
export const DETAIL_PENDING = "주문 상세 화면은 준비 중입니다";

/**
 * 금액 포맷. 단위가 도메인이라 여기 둔다.
 * ⚠️ 천 단위 구분자는 **쉼표 고정**.
 */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/** 결제 일시 표기 — 점 표기, 분까지 (`2026.10.18 14:32`) */
export const ymdhm = (dateText: string) =>
  dateText.slice(0, 16).replace(/-/g, ".");

/** 이용 기간 표기 — 점 표기 (`2026.10.22 ~ 2026.11.04`) */
export const periodText = (period: string) => period.replace(/-/g, ".");

/** 한 페이지 행 수 — 원본 `DEFAULT_PAGE_SIZE` 와 같은 10, 고를 수 있는 크기 4종 */
export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];
