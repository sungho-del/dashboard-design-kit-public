import type { DateRange, SelectOption, TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S08 주문 목록 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `OrderListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 원본 템플릿: `src/pages/OrderListPage.data.ts` (이커머스) — 이름이 같지만 다른 화면이다
 * 원본 어드민 청크: `_plan/babycube-admin/chunks/12f_fr6-1x-_t.js` (`/orders-all`)
 *
 * ## 이 화면이 무엇인가
 * 렌트·판매 주문을 **처리단위** 기준으로 조회하는 어드민의 중심 목록.
 * 렌트는 배송으로 끝나지 않고 대여중 → 연체 → 수거 → 검수 → 반납까지 이어지므로
 * 상태 어휘가 판매(5단계)보다 길다. 그래서 상태 셀렉트가 **유형별로 갈린다**.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(YYYY-MM-DD HH:mm) 를 반드시 갖는다
 * - ⚠️ **`date` 는 "결제 일시"다.** 원본이 기간 필터 축을 `[["paidAt", "결제일"]]` 하나로
 *   못박았기 때문이다. 화면에 함께 나오는 "주문일시"는 `orderedAt` 으로 따로 든다
 * - `STATUS_META` 의 키는 `Order["status"]` 와 정확히 일치한다
 * - `FILTERS[0].value` 는 `"all"` — 뼈대가 필터 해제로 취급한다.
 *   ⚠️ 템플릿의 `FILTERS` 는 **상태** 세그먼트였지만 여기서는 **유형(렌트/판매)** 이다.
 *   계약은 이름이 아니라 역할(1차 필터축)이라 갈아끼워도 된다.
 *   상태는 가짓수가 12개라 세그먼트에 들어가지 않아 셀렉트로 내렸다
 * - `STATUS_OPTIONS_BY_TYPE` 의 각 배열도 `[0].value === "all"`
 * - `searchHaystack` 은 검색조건 7종 → 문자열 매핑. **어느 필드가 검색 대상인가는
 *   도메인**이라 뼈대가 아니라 여기 둔다
 * - `filtersFromQuery` 는 **URL 쿼리 → 초기 필터**. 원본과 파라미터 이름이 같다
 *
 * ## 원본 대조로 고친 것 (2026-08 정돈)
 * 1. **`inspected`(검수완료) 추가.** 원본 렌트 흐름(청크의 `i` 배열)은 11단계인데
 *    우리는 10단계였다. 검수중과 반납완료 사이가 비어 있어서, 검수는 끝났지만
 *    보증금 처리가 남은 건이 어느 상태로도 조회되지 않았다
 * 2. **`buyerPhone`(연락처) 추가.** 원본 표에 `memberPhone`/"연락처" 열이 있고
 *    검색조건 `tel`/"연락처"가 그 열을 가리킨다. 우리는 열도 없이 검색만 수령인
 *    번호를 보고 있었다 — 검색조건 이름과 보는 값이 어긋나 있었다
 * 3. **`rentPrice` 를 저장값에서 파생값으로.** 원본은
 *    `max(0, rentListPrice - rentDiscountAmount)` 로 계산한다. 저장해 두면
 *    원가·할인만 고쳤을 때 셋이 서로 모순된 채 화면에 나간다
 * 4. **판매자 열이 셀러명을 직접 보여준다.** 원본 `y()` 가
 *    `"자체" === owner ? "본사" : sellerName` 이라 열 하나로 끝낸다.
 *    우리는 `판매자`(본사/셀러 배지) + `셀러`(이름) 두 열로 나눠 같은 사실을 두 번 적었다
 * 5. **`결제금액` 열을 표에서 뺐다.** 원본 표는 24열이고 결제금액은
 *    `ORDER_EXPORT_EXTRA_COLUMNS`(엑셀 전용)에 있다. 우리는 25열이었다
 * 6. **지어낸 요약 카드 3장을 걷어냈다.** "오늘 신규 주문 128건 +12건" 류의 숫자는
 *    원본 어디에도 없다. 그 자리에 원본이 실제로 두는 **유형별 건수 대시**를 세웠다
 * ---------------------------------------------------------------------- */

/** 처리단위가 나간 방식. 렌트는 이용 기간·보증금이 붙고 판매는 붙지 않는다 */
export type OrderType = "rent" | "sale";

/** 파는 주체. 본사(자체) 재고인지 입점 셀러 재고인지 */
export type SellerKind = "hq" | "seller";

/**
 * 처리단위의 진행 상태. **렌트 11단계 · 판매 5단계**가 앞 4단계를 공유한다.
 * 원본 청크의 두 배열과 값·순서가 같다 (`n` = 판매, `i` = 렌트).
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
  | "confirmed";

export interface Order {
  /** 주문번호 — 고유 키. 앞 글자가 유형이다 (R=렌트 · S=판매) */
  id: string;
  status: OrderStatus;
  type: OrderType;
  sellerKind: SellerKind;
  /** 셀러 셀렉트 필터가 맞춰 보는 값. 본사 건은 `"hq"` */
  sellerId: string;
  /** 셀러명. 검색조건 "셀러명"이 보는 값이다 */
  seller: string;
  /** 이용 기간 — 판매 건은 빈 문자열(뼈대가 `—` 로 그린다) */
  usagePeriod: string;
  payMethod: string;
  /** ⚠️ **결제 일시**. 기간 필터가 이 값을 파싱한다 (`YYYY-MM-DD HH:mm`) */
  date: string;
  payAmount: number;
  shipMethod: string;
  carrier: string;
  trackingNo: string;
  /** 수거 택배사 — 렌트만 채워진다 */
  pickupCarrier: string;
  pickupTrackingNo: string;
  productCode: string;
  productName: string;
  /** 렌트 원가 — 판매 건은 `null`. 렌트가는 여기서 **파생된다**(`rentPriceOf`) */
  rentBasePrice: number | null;
  discount: number;
  buyerName: string;
  /** 아이디(이메일) */
  buyerId: string;
  /** 구매자 연락처. 원본 표의 "연락처" 열이자 검색조건 `tel` 이 보는 값 */
  buyerPhone: string;
  receiver: string;
  receiverPhone: string;
  address: string;
  shipMemo: string;
  /** 처리단위 코드 — 이 목록의 한 행이 곧 처리단위 하나다. **엑셀 전용**(아래 참조) */
  unitCode: string;
  /** 주문일시. **엑셀 전용**이며 기간 필터 대상이 아니다 */
  orderedAt: string;
}

/**
 * 실제로 청구한 렌트가 = 원가 − 할인 (음수 방지).
 *
 * ⚠️ **저장하지 않고 계산한다.** 원본도 `N = (e) => Math.max(0, (rentListPrice ?? 0) -
 * (rentDiscountAmount ?? 0))` 로 매번 만든다. 저장해 두면 원가·할인만 고쳤을 때
 * 표 안에서 `210,000 − 42,000 = 999,000` 같은 모순이 조용히 나간다.
 */
export const rentPriceOf = (order: Order): number | null =>
  order.rentBasePrice === null
    ? null
    : Math.max(0, order.rentBasePrice - order.discount);

/**
 * 판매자 열에 찍히는 글자. 원본 `y()` 와 같다 — 본사면 "본사", 아니면 셀러명.
 *
 * 열 하나로 끝내는 것이 요점이다. `본사/셀러` 배지와 셀러명을 두 열로 나누면
 * 같은 사실을 두 번 적게 되고, 셀러 행에서는 배지가 아무것도 알려주지 않는다.
 */
export const sellerLabel = (order: Order): string =>
  order.sellerKind === "hq" ? "본사" : order.seller;

/**
 * 상태값 → 라벨과 Tag tone.
 *
 * ⚠️ 원본 어드민은 `b-prog`/`b-done`/`b-exc` 세 톤으로 묶었지만 **그 색을 옮기지 않는다.**
 * 우리 `TagTone` 어휘로 다시 판단한 결과다 (`docs/screen-templates.md` §3-1).
 *
 * | tone       | 뜻                                   | 여기서                             |
 * | ---------- | ------------------------------------ | ---------------------------------- |
 * | `warning`  | **지금 사람이 무언가를 해야 끝난다** | 신규 주문 · 수거 신청 · 검수중 · 검수완료 |
 * | `critical` | 비정상 — 즉시 조치                   | 연체중                             |
 * | `success`  | 진행 중이고 정상 (돈이 도는 상태)    | 대여중 · 대여중(연장)              |
 * | `default`  | 정상 종료 + 조용한 중간 단계         | 배송 3종 · 반납완료 · 구매확정     |
 *
 * ⚠️ **검수완료가 `default` 가 아니라 `warning` 인 이유** — 이름은 "완료"지만
 * 흐름의 끝이 아니다. 검수가 끝나면 사람이 보증금 반환·차감을 처리해야 반납완료로 간다.
 * 이름만 보고 종료로 묶으면 그 대기 건이 목록에서 조용히 사라진다.
 * (형제 화면인 반품·교환 목록도 `수거완료` 를 같은 이유로 `warning` 에 둔다.)
 *
 * 정상 종료(반납완료·구매확정)를 `default` 로 묻는 것은 **더 볼 것이 없기 때문**이고,
 * 연체중을 `critical` 로 띄우는 것은 보증금 차감·배상으로 이어지는 자리라서다.
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
};

/**
 * 유형 라벨.
 *
 * ⚠️ 원본은 렌트=green(`b-green`) · 판매=blue(`b-blue`) 로 **색을 갈랐지만 우리는
 * 둘 다 중립색**이다. 우리 `TagTone` 은 상태 어휘(success·warning·critical)라,
 * 분류에 상태색을 쓰면 "렌트는 좋은 상태"로 읽힌다. 유형은 상태가 아니라 분류다.
 */
export const TYPE_META: Record<OrderType, { label: string; tone: TagTone }> = {
  rent: { label: "렌트", tone: "default" },
  sale: { label: "판매", tone: "default" },
};

export const ORDERS: Order[] = [
  {
    id: "R-20260818-0184",
    status: "overdue",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-001",
    seller: "아기별상사",
    usagePeriod: "2026-06-20 ~ 2026-08-19",
    payMethod: "신용카드",
    date: "2026-08-18 14:32",
    payAmount: 189000,
    shipMethod: "화물 설치",
    carrier: "CJ대한통운",
    trackingNo: "412039885517",
    pickupCarrier: "CJ대한통운",
    pickupTrackingNo: "412040112904",
    productCode: "BC-RC-1042",
    productName: "회전형 카시트 아이소픽스",
    rentBasePrice: 240000,
    discount: 51000,
    buyerName: "김지원",
    buyerId: "jiwon.kim@babymail.kr",
    buyerPhone: "010-2841-0192",
    receiver: "김지원",
    receiverPhone: "010-2841-0192",
    address: "서울 마포구 월드컵북로 396 8층",
    shipMemo: "부재 시 경비실에 맡겨주세요",
    unitCode: "U-1042-0007",
    orderedAt: "2026-08-18 14:28",
  },
  {
    id: "S-20260818-0092",
    status: "ready",
    type: "sale",
    sellerKind: "hq",
    sellerId: "hq",
    seller: "본사(자체)",
    usagePeriod: "",
    payMethod: "간편결제",
    date: "2026-08-18 11:05",
    payAmount: 42000,
    shipMethod: "택배",
    carrier: "한진택배",
    trackingNo: "558102947733",
    pickupCarrier: "",
    pickupTrackingNo: "",
    productCode: "BC-BT-4120",
    productName: "아기욕조 스탠드 세트",
    rentBasePrice: null,
    discount: 3000,
    buyerName: "이서연",
    buyerId: "seoyeon.lee@babymail.kr",
    buyerPhone: "010-7742-3388",
    receiver: "이서연",
    receiverPhone: "010-7742-3388",
    address: "경기 성남시 분당구 판교역로 235 302동 1104호",
    shipMemo: "",
    unitCode: "U-4120-0031",
    orderedAt: "2026-08-18 11:01",
  },
  {
    id: "R-20260817-0031",
    status: "inspecting",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-002",
    seller: "코코베베",
    usagePeriod: "2026-05-17 ~ 2026-08-16",
    payMethod: "계좌이체",
    date: "2026-08-17 22:14",
    payAmount: 168000,
    shipMethod: "택배",
    carrier: "롯데택배",
    trackingNo: "203845119027",
    pickupCarrier: "롯데택배",
    pickupTrackingNo: "203846620188",
    productCode: "BC-ST-2210",
    productName: "유모차 디럭스 4륜",
    rentBasePrice: 210000,
    discount: 42000,
    buyerName: "박준영",
    buyerId: "junyoung.park@babymail.kr",
    buyerPhone: "010-8820-5514",
    receiver: "박서진",
    receiverPhone: "010-3310-7765",
    address: "부산 해운대구 센텀중앙로 90 1802호",
    shipMemo: "문 앞에 두고 사진 남겨주세요",
    unitCode: "U-2210-0114",
    orderedAt: "2026-08-17 22:09",
  },
  {
    id: "R-20260817-0028",
    status: "renting",
    type: "rent",
    sellerKind: "hq",
    sellerId: "hq",
    seller: "본사(자체)",
    usagePeriod: "2026-08-01 ~ 2026-10-31",
    payMethod: "신용카드",
    date: "2026-08-17 16:40",
    payAmount: 156000,
    shipMethod: "화물 설치",
    carrier: "CJ대한통운",
    trackingNo: "412031007742",
    pickupCarrier: "",
    pickupTrackingNo: "",
    productCode: "BC-BD-3301",
    productName: "원목 아기침대 슬라이드",
    rentBasePrice: 195000,
    discount: 39000,
    buyerName: "최다은",
    buyerId: "daeun.choi@babymail.kr",
    buyerPhone: "010-9021-4417",
    receiver: "최다은",
    receiverPhone: "010-9021-4417",
    address: "대전 유성구 대학로 291 관리동 5층",
    shipMemo: "평일 오전 설치 희망",
    unitCode: "U-3301-0052",
    orderedAt: "2026-08-17 16:33",
  },
  {
    id: "S-20260817-0019",
    status: "confirmed",
    type: "sale",
    sellerKind: "seller",
    sellerId: "SLR-003",
    seller: "리틀홈",
    usagePeriod: "",
    payMethod: "가상계좌",
    date: "2026-08-17 09:22",
    payAmount: 89000,
    shipMethod: "택배",
    carrier: "로젠택배",
    trackingNo: "770239118845",
    pickupCarrier: "",
    pickupTrackingNo: "",
    productCode: "BC-PL-5077",
    productName: "놀이매트 폴더형 200x140",
    rentBasePrice: null,
    discount: 0,
    buyerName: "정우진",
    buyerId: "woojin.jung@babymail.kr",
    buyerPhone: "010-4471-6690",
    receiver: "정하람",
    receiverPhone: "010-5580-2231",
    address: "광주 서구 상무중앙로 58 1103호",
    shipMemo: "",
    unitCode: "U-5077-0208",
    orderedAt: "2026-08-17 09:15",
  },
  {
    id: "R-20260816-0007",
    status: "new",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-004",
    seller: "맘스케어",
    usagePeriod: "2026-08-25 ~ 2026-11-24",
    payMethod: "신용카드",
    date: "2026-08-16 20:51",
    payAmount: 132000,
    shipMethod: "방문 수령",
    carrier: "",
    trackingNo: "",
    pickupCarrier: "",
    pickupTrackingNo: "",
    productCode: "BC-CR-1188",
    productName: "하이체어 성장형",
    rentBasePrice: 165000,
    discount: 33000,
    buyerName: "한소미",
    buyerId: "somi.han@babymail.kr",
    buyerPhone: "010-4409-8812",
    receiver: "한소미",
    receiverPhone: "010-4409-8812",
    address: "인천 연수구 컨벤시아대로 165 705호",
    shipMemo: "주말 수령 예정",
    unitCode: "U-1188-0003",
    orderedAt: "2026-08-16 20:44",
  },
  /*
   * 렌트 흐름 11단계 중 `검수완료` 표본. 상태 어휘에만 있고 데이터에는 없는 값이
   * 생기면, 그 값으로 필터를 걸었을 때 빈 화면이 떠 **필터가 고장 난 것처럼** 보인다.
   * 결제 일시가 가장 오래됐으므로 목록 맨 뒤에 붙는다.
   */
  {
    id: "R-20260815-0112",
    status: "inspected",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-001",
    seller: "아기별상사",
    usagePeriod: "2026-05-10 ~ 2026-08-09",
    payMethod: "신용카드",
    date: "2026-08-15 13:07",
    payAmount: 174000,
    shipMethod: "택배",
    carrier: "CJ대한통운",
    trackingNo: "412028441063",
    pickupCarrier: "CJ대한통운",
    pickupTrackingNo: "412029770415",
    productCode: "BC-WK-6015",
    productName: "아기 보행기 브레이크형",
    rentBasePrice: 218000,
    discount: 44000,
    buyerName: "윤가람",
    buyerId: "garam.yoon@babymail.kr",
    buyerPhone: "010-6621-9043",
    receiver: "윤가람",
    receiverPhone: "010-6621-9043",
    address: "울산 남구 삼산로 282 1504호",
    shipMemo: "",
    unitCode: "U-6015-0019",
    orderedAt: "2026-08-15 12:58",
  },
];

/**
 * 유형 대시 — **건수 카드가 곧 유형 필터다.**
 *
 * 원본이 유형 칩에 `dash: !0` 을 줘서 필터바가 아니라 표 위의 건수 카드로 내보낸다
 * (`chip: { key: "stat", dash: !0, label: "유형", def: "렌트", values: ["렌트","판매"] }`).
 * 그래서 이 화면의 필터바에는 유형이 없다.
 *
 * ## 여기에 없는 것 — 증감(±%)·비교 기준
 * 한때 이 자리에 "오늘 신규 주문 128건 +12건" 같은 카드 3장이 있었는데,
 * **원본 어디에도 없는 숫자**였다(원본 카드는 `statusCounts` API 가 주는 건수뿐이다).
 * 지어낸 값이라 걷어냈다. 건수는 우리 데이터에서 세므로 표와 어긋나지 않는다.
 *
 * ## `all` 이 왜 있나
 * 원본 칩 설정은 `all` 을 따로 주지 않아 렌더러가 `"전체"` 로 채운다
 * (`let r = e.chip.all ?? "전체"; [r, ...e.chip.values]`). 대시는 그 칩을 자리만 옮긴
 * 것이라 같은 3지(전체·렌트·판매)로 둔다. 첫 항목이 `"all"`(필터 해제)인 것은
 * 목록형 계약이기도 하다.
 */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "rent", label: "렌트" },
  { value: "sale", label: "판매" },
];

/**
 * 유형별 안내 — 원본 `statusTips` 문구 그대로다(도메인 내용).
 * 렌트와 판매는 **열의 의미가 다르다**는 사실을 운영자에게 알리는 자리다.
 *
 * (원본은 유형 카드의 툴팁으로 띄우고, 우리는 필터 카드 아래 한 줄로 상시 노출한다.
 *  툴팁은 마우스를 올려야 보이는데, 이 문구는 "왜 이 열이 비어 있나"의 답이라
 *  표를 보기 **전에** 읽혀야 한다.)
 */
export const TYPE_NOTICE: Record<string, string> = {
  all: "렌트와 판매가 함께 보입니다. 판매 건은 이용 기간·수거 정보가 빈 칸입니다.",
  rent: "대여 계약으로 나간 처리단위입니다. 이용 기간·보증금이 붙습니다.",
  sale: "판매(구매)로 나간 처리단위입니다. 이용 기간이 없어 관련 열은 빈 칸입니다.",
};

/** 판매자 라디오. 셀러를 고를 때만 셀러 셀렉트가 열린다 (원본 `radio.key = "owner"`) */
export const SELLER_KINDS = [
  { value: "all", label: "전체" },
  { value: "hq", label: "본사" },
  { value: "seller", label: "셀러" },
];

/** 셀러 셀렉트. 첫 항목은 필터 해제 */
export const SELLERS: SelectOption[] = [
  { value: "all", label: "셀러 전체" },
  { value: "SLR-001", label: "아기별상사" },
  { value: "SLR-002", label: "코코베베" },
  { value: "SLR-003", label: "리틀홈" },
  { value: "SLR-004", label: "맘스케어" },
];

/**
 * 상태 셀렉트 — **유형별로 갈린다.** 원본 청크의 두 배열과 값·순서가 같다.
 *   렌트(`i`) 11단계 · 판매(`n`) 5단계.
 * 판매 건에 "대여중"을 고를 수 있게 두면 항상 0건이 나오는 선택지를 내미는 셈이다.
 *
 * `all` 은 원본이 `[...new Set([...판매, ...렌트])]` 로 만들어 구매확정이 5번째에 끼는데,
 * 우리는 **생애주기 순서**로 둔다 — 구매확정이 배송 완료와 대여중 사이에 있으면
 * 렌트 흐름의 한 단계처럼 읽힌다.
 */
export const STATUS_OPTIONS_BY_TYPE: Record<string, SelectOption[]> = {
  all: [
    { value: "all", label: "상태 전체" },
    { value: "new", label: "신규 주문" },
    { value: "ready", label: "배송 준비" },
    { value: "shipping", label: "배송중" },
    { value: "delivered", label: "배송 완료" },
    { value: "renting", label: "대여중" },
    { value: "extended", label: "대여중(연장)" },
    { value: "overdue", label: "연체중" },
    { value: "pickup", label: "수거 신청" },
    { value: "inspecting", label: "검수중" },
    { value: "inspected", label: "검수완료" },
    { value: "returned", label: "반납완료" },
    { value: "confirmed", label: "구매확정" },
  ],
  rent: [
    { value: "all", label: "상태 전체" },
    { value: "new", label: "신규 주문" },
    { value: "ready", label: "배송 준비" },
    { value: "shipping", label: "배송중" },
    { value: "delivered", label: "배송 완료" },
    { value: "renting", label: "대여중" },
    { value: "extended", label: "대여중(연장)" },
    { value: "overdue", label: "연체중" },
    { value: "pickup", label: "수거 신청" },
    { value: "inspecting", label: "검수중" },
    { value: "inspected", label: "검수완료" },
    { value: "returned", label: "반납완료" },
  ],
  sale: [
    { value: "all", label: "상태 전체" },
    { value: "new", label: "신규 주문" },
    { value: "ready", label: "배송 준비" },
    { value: "shipping", label: "배송중" },
    { value: "delivered", label: "배송 완료" },
    { value: "confirmed", label: "구매확정" },
  ],
};

/**
 * 검색조건 — 원본 `search.fieldOpts` 7종과 이름·순서가 같다.
 *
 * 첫 항목 `"조건 없음 (전체)"` 만 우리가 더한 것이다. 원본은 조건 없이 검색할 수
 * 없어 기본값이 "주문번호"인데, 그러면 셀러명을 붙여 넣었을 때 **조용히 0건**이 된다.
 */
export const SEARCH_FIELDS: SelectOption[] = [
  { value: "all", label: "조건 없음 (전체)" },
  { value: "id", label: "주문번호" },
  { value: "seller", label: "셀러명" },
  { value: "productCode", label: "상품코드" },
  { value: "productName", label: "상품명" },
  { value: "buyerName", label: "구매자명" },
  { value: "buyerId", label: "구매자 ID" },
  { value: "phone", label: "연락처" },
];

/**
 * 검색조건 → 훑을 문자열.
 *
 * **어느 필드가 검색 대상인가는 도메인**이라 뼈대가 아니라 여기 둔다.
 * 조건을 고르면 그 필드만 본다 — "구매자명"으로 상품명이 걸리면 검색조건이
 * 있으나 마나이기 때문이다.
 *
 * ⚠️ `"phone"`(연락처)은 **구매자 연락처**다. 원본 `tel` 이 가리키는 열이
 * `memberPhone`("연락처")이지 `receiverPhone`("수령인 연락처")이 아니다.
 * 이전에는 수령인 번호를 보고 있어서, 구매자 번호로 검색하면 걸리지 않았다.
 */
export function searchHaystack(order: Order, field: string): string {
  switch (field) {
    case "id":
      return order.id;
    case "seller":
      return order.seller;
    case "productCode":
      return order.productCode;
    case "productName":
      return order.productName;
    case "buyerName":
      return order.buyerName;
    case "buyerId":
      return order.buyerId;
    case "phone":
      return order.buyerPhone;
    default:
      return [
        order.id,
        order.seller,
        order.productCode,
        order.productName,
        order.buyerName,
        order.buyerId,
        order.buyerPhone,
      ].join(" ");
  }
}

/* =========================================================================
 * URL 쿼리 → 초기 필터  (원본 파라미터 이름을 그대로 쓴다)
 *
 * 대시보드의 플로우 타일이 `/orders-all?stat=렌트&flow=대여중` 으로 링크한다.
 * 원본이 `get("stat")` · `get("flow")` 로 읽으므로 **`stat` 이 유형, `flow` 가 상태**다.
 * 이름이 뒤바뀐 것처럼 보이지만 맞다.
 *
 * | 파라미터     | 뜻      | 값                       |
 * | ------------ | ------- | ------------------------ |
 * | `stat`       | 유형    | `렌트` · `판매`          |
 * | `flow`       | 상태    | `대여중` · `검수완료` …  |
 * | `owner`      | 판매자  | `본사` · `셀러`          |
 * | `sellerName` | 셀러    | 셀러명 (`owner=셀러`일 때) |
 * | `q`          | 검색어  | 자유 문자열              |
 * | `paidAt_from` / `paidAt_to` | 결제일 구간 | `YYYY-MM-DD` |
 *
 * ⚠️ **값이 한글 라벨이다.** 우리 내부 코드(`rent`/`overdue`/`hq`)와 다르므로
 * 반드시 여기서 옮긴다. 매핑을 손으로 적지 않고 `STATUS_META`·`SELLERS` 에서
 * 뽑아내는 이유는, 손으로 적으면 상태가 늘 때 한쪽만 고쳐도 타입이 잡지 못해서다.
 * ====================================================================== */

/** `렌트`/`판매` → `rent`/`sale`. `FILTERS` 에서 뽑아 쓴다 */
const TYPE_BY_LABEL: Record<string, string> = Object.fromEntries(
  FILTERS.filter((item) => item.value !== "all").map((item) => [
    item.label,
    item.value,
  ]),
);

/** `대여중` → `renting`. `STATUS_META` 를 뒤집어 만든다 */
const STATUS_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_META).map(([value, meta]) => [meta.label, value]),
);

/** `본사`/`셀러` → `hq`/`seller` */
const SELLER_KIND_BY_LABEL: Record<string, string> = Object.fromEntries(
  SELLER_KINDS.filter((item) => item.value !== "all").map((item) => [
    item.label,
    item.value,
  ]),
);

/** `아기별상사` → `SLR-001` */
const SELLER_ID_BY_NAME: Record<string, string> = Object.fromEntries(
  SELLERS.filter((option) => option.value !== "all").map((option) => [
    option.label,
    option.value,
  ]),
);

/** 뼈대가 들고 있는 조회 조건 한 덩어리 */
export interface OrderFilters {
  type: string;
  sellerKind: string;
  sellerId: string;
  status: string;
  searchField: string;
  keyword: string;
  period?: DateRange;
}

/** 아무 조건도 걸리지 않은 상태. "초기화"가 되돌아가는 자리다 */
export const EMPTY_FILTERS: OrderFilters = {
  type: "all",
  sellerKind: "all",
  sellerId: "all",
  status: "all",
  searchField: "all",
  keyword: "",
  period: undefined,
};

/** `YYYY-MM-DD` → `Date`. 형식이 아니면 `undefined`(필터 없음으로 떨어진다) */
function parseDay(text: string | null): Date | undefined {
  if (!text) return undefined;
  const at = new Date(`${text}T00:00:00`);
  return Number.isNaN(at.getTime()) ? undefined : at;
}

/**
 * URL 쿼리를 읽어 초기 조회 조건을 만든다. 모르는 값은 **조용히 무시**한다 —
 * 남이 만든 링크로 들어오는 자리라, 오타 하나로 화면이 비면 안 된다.
 *
 * ⚠️ 원본이 `useEffect` 로 하는 **정합성 보정**을 여기서 함께 한다.
 *   · `stat=판매&flow=대여중` → 판매에 없는 상태라 `flow` 를 버린다
 *     (원본: `if (!i || k(n).includes(i)) return; t.delete("flow")`)
 *   · `owner=본사&sellerName=코코베베` → 셀러 지정이 손댈 수 없는 필터가 되므로 버린다
 *     (원본: `if ("셀러" === s || !n) return; t.delete("sellerName")`)
 * 보정하지 않으면 **결과가 늘 0건인데 왜 그런지 화면에 안 보이는** 상태가 된다.
 */
export function filtersFromQuery(params: URLSearchParams): OrderFilters {
  const type = TYPE_BY_LABEL[params.get("stat") ?? ""] ?? "all";

  const status = STATUS_BY_LABEL[params.get("flow") ?? ""] ?? "all";
  const allowed = STATUS_OPTIONS_BY_TYPE[type] ?? STATUS_OPTIONS_BY_TYPE.all;
  const validStatus = allowed.some((option) => option.value === status)
    ? status
    : "all";

  const sellerKind = SELLER_KIND_BY_LABEL[params.get("owner") ?? ""] ?? "all";
  const sellerId = SELLER_ID_BY_NAME[params.get("sellerName") ?? ""] ?? "all";

  const from = parseDay(params.get("paidAt_from"));
  const to = parseDay(params.get("paidAt_to"));

  return {
    type,
    status: validStatus,
    sellerKind,
    sellerId: sellerKind === "seller" ? sellerId : "all",
    searchField: "all",
    keyword: params.get("q") ?? "",
    period: from ? { from, to } : undefined,
  };
}

/**
 * 표에는 없고 **엑셀에만 들어가는 열**. 원본 `ORDER_EXPORT_EXTRA_COLUMNS` 와
 * 항목·순서가 같다 (처리단위 · 결제금액 · 주문일시).
 *
 * 원본이 이 셋을 표에서 뺀 이유는 화면에서 겹치기 때문이다 — 처리단위는 주문번호와,
 * 주문일시는 결제 일시와 같은 것을 묻는다(둘의 간격은 대개 몇 분이다).
 * 그래도 정산·CS 에서는 필요하므로 내려받는 파일에는 남긴다.
 *
 * ⚠️ 한때 `결제금액` 을 표에 남겨 두었는데(판매 행에 금액이 하나도 안 보인다는 이유),
 * **원본 표에 없는 25번째 열**이었다. 원본 대조에서 되돌렸다 — 판매 행의 금액은
 * 미리보기 모달과 엑셀에서 본다.
 */
export const EXPORT_EXTRA_COLUMNS: {
  label: string;
  value: (order: Order) => string;
}[] = [
  { label: "처리단위", value: (order) => order.unitCode },
  { label: "결제금액", value: (order) => won(order.payAmount) },
  { label: "주문일시", value: (order) => order.orderedAt },
];

/** 내려받는 파일 이름의 앞머리. 원본 `exportName` 그대로 */
export const EXPORT_NAME = "주문목록";

/**
 * 금액 포맷. 단위가 도메인이라 여기 둔다.
 * ⚠️ 천 단위 구분자는 **쉼표 고정** — 폼 화면이 `replace(/,/g, "")` 로 되돌린다.
 */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/**
 * 결제 일시 표기 — 원본 어드민의 포맷터를 그대로 옮겼다:
 * `e.slice(0, 16).replace(/-/g, ".").replace("T", " ")`
 *
 * **분까지** 낸다(초는 자른다). 날짜만으로는 같은 날 안에서 순서를 알 수 없다.
 * 구분자가 점인 것도 원본 규칙이다 — 이 저장소의 모든 화면이 `2026.08.18` 로 쓴다.
 * 표기는 도메인이라 여기 둔다(`won` 과 같은 이유).
 */
export const ymdhm = (dateText: string | null) =>
  dateText ? dateText.slice(0, 16).replace(/-/g, ".").replace("T", " ") : "-";

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스 기본값은 10(원본 `DEFAULT_PAGE_SIZE`)이지만
 * **샘플이 7건뿐이라 페이징이 동작하는 것이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 3;
