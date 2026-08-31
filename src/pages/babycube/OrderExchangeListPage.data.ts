import type { DateRange, SelectOption, TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S11 교환 목록 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `OrderExchangeListPage.tsx`
 * 원본 어드민 청크: `_plan/babycube-admin/chunks/3giil3sr7d2kg.js` (`/orders-exchange`)
 *
 * ## 이 화면이 무엇인가
 * 교환 요청이 걸린 **처리단위**를 조회한다.
 *
 * ⚠️ 원본 대조에서 밝혀진 사실 둘:
 * 1. **교환 목록의 표도 주문 목록의 표와 같다.** 컬럼 24개가 라벨·순서까지 동일하다.
 *    교환 상품·추가 결제금액 같은 교환 고유 정보는 표가 아니라 **상세 화면**에 있다.
 * 2. **이 화면에는 유형(렌트/판매) 필터가 없다.** 형제 화면 셋(주문·취소·반품)은
 *    `chip: { key: "stat", dash: !0, values: ["렌트","판매"] }` 를 갖지만
 *    교환은 `chip` 자체가 없고, **`stat` 이 유형이 아니라 교환 상태**다
 *    (`selects: [{ key: "stat", label: "상태", opts: [...교환 상태 10개] }]`).
 *    같은 파라미터 이름이 화면마다 다른 뜻인 것이라, 링크를 이을 때 특히 조심해야 한다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(YYYY-MM-DD HH:mm) 를 반드시 갖는다
 * - ⚠️ `date` 는 **결제 일시**다 — 원본이 기간 필터 축을 `[["paidAt","결제일"]]` 하나로
 *   못박았다. 주문일시(`orderedAt`)는 엑셀 전용이라 필터 축이 아니다
 * - `STATUS_META` 의 키는 `Exchange["status"]` 와 정확히 일치한다
 * - `STATUS_OPTIONS[0].value === "all"` (필터 해제)
 * - `filtersFromQuery` 는 **URL 쿼리 → 초기 필터**. 원본과 파라미터 이름이 같다
 *
 * ## 원본 대조로 고친 것 (2026-08 정돈)
 * 1. **표를 원본 24열로 되돌렸다.** 우리 표는 27열이었고 그중 13열
 *    (검수 판정 · 교환 신청 일시 · 교환 사유 · 재배송 택배사 · 재배송 송장번호 ·
 *    재배송 일시 · 교환 상품코드 · 교환 상품명 · 추가 결제금액 · 결제금액 ·
 *    셀러 · 처리단위 · 주문일시)이 **원본에 없는 열**이었다
 * 2. **상태 어휘를 원본 10개로 맞췄다** (`교환 신청`~`재반송`)
 * 3. **유형 필터를 걷어냈다.** 원본 교환 목록에는 유형 축이 아예 없다.
 *    유형 **열**은 그대로 있다 — 필터가 없을 뿐이다
 * 4. **지어낸 요약 카드 3장을 걷어냈다.** 원본에 없는 숫자였다
 * ---------------------------------------------------------------------- */

/** 처리단위가 나간 방식. 유형은 **열로만** 쓰인다 — 이 화면에 유형 필터가 없다 */
export type OrderType = "rent" | "sale";

/** 파는 주체. 본사(자체) 재고인지 입점 셀러 재고인지 */
export type SellerKind = "hq" | "seller";

/**
 * 교환 진행 상태. **원본 `stat` 셀렉트의 열 값과 값·순서가 같다.**
 * 반품과 흐름이 닮았지만 `환불 처리중` 대신 `교환 재배송` 이 들어간다 —
 * 교환은 돈을 돌려주는 대신 물건을 다시 보내기 때문이다.
 */
export type ExchangeStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "picking"
  | "picked"
  | "inspecting"
  | "reshipping"
  | "done"
  | "denied"
  | "resend";

export interface Exchange {
  /** 주문번호 — 고유 키. 앞 글자가 유형이다 (R=렌트 · S=판매) */
  id: string;
  status: ExchangeStatus;
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
  /** 수거 택배사 — 교환이 수거 단계에 들어가야 채워진다 */
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
  /** 처리단위 코드. **엑셀 전용** */
  unitCode: string;
  /** 주문일시. **엑셀 전용**이며 기간 필터 대상이 아니다 */
  orderedAt: string;
}

/**
 * 실제로 청구한 렌트가 = 원가 − 할인 (음수 방지). 원본 계산식과 같다.
 * ⚠️ **저장하지 않고 계산한다** — 저장해 두면 원가·할인만 고쳤을 때 셋이 조용히 어긋난다.
 */
export const rentPriceOf = (item: Exchange): number | null =>
  item.rentBasePrice === null
    ? null
    : Math.max(0, item.rentBasePrice - item.discount);

/** 판매자 열에 찍히는 글자. 원본과 같다 — 본사면 "본사", 아니면 셀러명 */
export const sellerLabel = (item: Exchange): string =>
  item.sellerKind === "hq" ? "본사" : item.seller;

/**
 * 교환 상태 → 라벨과 Tag tone.
 *
 * ⚠️ 원본의 `b-prog`/`b-done`/`b-exc` 색을 옮기지 않고 우리 어휘로 다시 판단했다
 * (`docs/screen-templates.md` §3-1).
 *
 * | tone       | 뜻                                   | 여기서                                        |
 * | ---------- | ------------------------------------ | --------------------------------------------- |
 * | `warning`  | **지금 사람이 무언가를 해야 끝난다** | 교환 신청 · 교환 수거완료 · 교환 검수 · 재반송 |
 * | `critical` | **비정상 종료** — 교환이 성립하지 않았다 | 교환 반려 · 교환 거부                     |
 * | `default`  | 정상 종료 + 조용한 중간 단계         | 교환 승인 · 교환 수거중 · 교환 재배송 · 교환 완료 |
 *
 * ## ⚠️ 종료 상태를 한 톤으로 묶지 않는다
 * `교환 완료`(정상 종료 · `default`)와 `교환 반려`·`교환 거부`(비정상 종료 · `critical`)는
 * 둘 다 "끝난 건"이지만 뜻이 정반대다. 같은 색으로 묶으면 목록에서 문제 건이 사라진다.
 *
 * ## ⚠️ `success` 가 하나도 없다
 * 우리 어휘에서 `success` 는 **돈이 정상적으로 도는 진행 상태**를 맡는다
 * (반품 목록의 `환불 처리중`). 교환에는 환불 단계가 없어 해당하는 상태가 없다.
 * 화면들끼리 색 분포를 맞추려고 `교환 재배송` 을 초록으로 올리지 않는다 —
 * 그건 택배사가 물건을 옮기는 조용한 중간 단계(`default`)다.
 *
 * ## ⚠️ `교환 수거완료` 가 `default` 가 아닌 이유
 * 이름은 "완료"지만 흐름의 끝이 아니다 — 물건이 도착했으니 **사람이 검수를 시작해야**
 * 다음으로 간다. 이름만 보고 종료로 묶으면 검수 대기 건이 화면에서 조용해진다.
 */
export const STATUS_META: Record<
  ExchangeStatus,
  { label: string; tone: TagTone }
> = {
  requested: { label: "교환 신청", tone: "warning" },
  approved: { label: "교환 승인", tone: "default" },
  rejected: { label: "교환 반려", tone: "critical" },
  picking: { label: "교환 수거중", tone: "default" },
  picked: { label: "교환 수거완료", tone: "warning" },
  inspecting: { label: "교환 검수", tone: "warning" },
  reshipping: { label: "교환 재배송", tone: "default" },
  done: { label: "교환 완료", tone: "default" },
  denied: { label: "교환 거부", tone: "critical" },
  resend: { label: "재반송", tone: "warning" },
};

/**
 * 유형 라벨. **열에만 쓰인다** — 이 화면에는 유형 필터가 없다.
 * ⚠️ 원본은 렌트=green · 판매=blue 로 색을 갈랐지만 우리는 둘 다 중립색이다.
 */
export const TYPE_META: Record<OrderType, { label: string; tone: TagTone }> = {
  rent: { label: "렌트", tone: "default" },
  sale: { label: "판매", tone: "default" },
};

export const EXCHANGES: Exchange[] = [
  {
    id: "R-20260818-0402",
    status: "requested",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-001",
    seller: "아기별상사",
    usagePeriod: "2026-08-14 ~ 2026-11-13",
    payMethod: "신용카드",
    date: "2026-08-18 11:26",
    payAmount: 189000,
    shipMethod: "택배",
    carrier: "CJ대한통운",
    trackingNo: "412043771260",
    pickupCarrier: "",
    pickupTrackingNo: "",
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
    orderedAt: "2026-08-18 11:18",
  },
  {
    id: "S-20260817-0355",
    status: "approved",
    type: "sale",
    sellerKind: "hq",
    sellerId: "hq",
    seller: "본사(자체)",
    usagePeriod: "",
    payMethod: "간편결제",
    date: "2026-08-17 09:41",
    payAmount: 42000,
    shipMethod: "택배",
    carrier: "한진택배",
    trackingNo: "558106220731",
    pickupCarrier: "한진택배",
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
    orderedAt: "2026-08-17 09:33",
  },
  {
    id: "R-20260816-0301",
    status: "picking",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-002",
    seller: "코코베베",
    usagePeriod: "2026-08-10 ~ 2026-11-09",
    payMethod: "계좌이체",
    date: "2026-08-16 18:52",
    payAmount: 168000,
    shipMethod: "택배",
    carrier: "롯데택배",
    trackingNo: "203850117744",
    pickupCarrier: "롯데택배",
    pickupTrackingNo: "203850662219",
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
    orderedAt: "2026-08-16 18:44",
  },
  {
    id: "R-20260815-0288",
    status: "picked",
    type: "rent",
    sellerKind: "hq",
    sellerId: "hq",
    seller: "본사(자체)",
    usagePeriod: "2026-08-08 ~ 2026-11-07",
    payMethod: "신용카드",
    date: "2026-08-15 14:09",
    payAmount: 156000,
    shipMethod: "화물 설치",
    carrier: "CJ대한통운",
    trackingNo: "412035008812",
    pickupCarrier: "CJ대한통운",
    pickupTrackingNo: "412035772044",
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
    orderedAt: "2026-08-15 14:01",
  },
  {
    id: "R-20260814-0245",
    status: "inspecting",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-003",
    seller: "리틀홈",
    usagePeriod: "2026-08-06 ~ 2026-11-05",
    payMethod: "신용카드",
    date: "2026-08-14 16:33",
    payAmount: 132000,
    shipMethod: "택배",
    carrier: "로젠택배",
    trackingNo: "770244118820",
    pickupCarrier: "로젠택배",
    pickupTrackingNo: "770244660137",
    productCode: "BC-CR-1188",
    productName: "하이체어 성장형",
    rentBasePrice: 165000,
    discount: 33000,
    buyerName: "정우진",
    buyerId: "woojin.jung@babymail.kr",
    buyerPhone: "010-4471-6690",
    receiver: "정하람",
    receiverPhone: "010-5580-2231",
    address: "광주 서구 상무중앙로 58 1103호",
    shipMemo: "",
    unitCode: "U-1188-0003",
    orderedAt: "2026-08-14 16:25",
  },
  {
    id: "S-20260813-0210",
    status: "reshipping",
    type: "sale",
    sellerKind: "seller",
    sellerId: "SLR-004",
    seller: "맘스케어",
    usagePeriod: "",
    payMethod: "가상계좌",
    date: "2026-08-13 10:18",
    payAmount: 89000,
    shipMethod: "택배",
    carrier: "로젠택배",
    trackingNo: "770239118845",
    pickupCarrier: "로젠택배",
    pickupTrackingNo: "770245003318",
    productCode: "BC-PL-5077",
    productName: "놀이매트 폴더형 200x140",
    rentBasePrice: null,
    discount: 0,
    buyerName: "한소미",
    buyerId: "somi.han@babymail.kr",
    buyerPhone: "010-4409-8812",
    receiver: "한소미",
    receiverPhone: "010-4409-8812",
    address: "인천 연수구 컨벤시아대로 165 705호",
    shipMemo: "주말 수령 예정",
    unitCode: "U-5077-0208",
    orderedAt: "2026-08-13 10:09",
  },
  {
    id: "R-20260812-0177",
    status: "denied",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-001",
    seller: "아기별상사",
    usagePeriod: "2026-08-01 ~ 2026-10-31",
    payMethod: "신용카드",
    date: "2026-08-12 19:04",
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
    orderedAt: "2026-08-12 18:56",
  },
  {
    id: "S-20260811-0142",
    status: "rejected",
    type: "sale",
    sellerKind: "seller",
    sellerId: "SLR-002",
    seller: "코코베베",
    usagePeriod: "",
    payMethod: "간편결제",
    date: "2026-08-11 13:47",
    payAmount: 68000,
    shipMethod: "택배",
    carrier: "한진택배",
    trackingNo: "558107330294",
    pickupCarrier: "",
    pickupTrackingNo: "",
    productCode: "BC-BT-4120",
    productName: "아기욕조 스탠드 세트",
    rentBasePrice: null,
    discount: 5000,
    buyerName: "서지호",
    buyerId: "jiho.seo@babymail.kr",
    buyerPhone: "010-3357-2204",
    receiver: "서지호",
    receiverPhone: "010-3357-2204",
    address: "대구 수성구 동대구로 234 908호",
    shipMemo: "",
    unitCode: "U-4120-0077",
    orderedAt: "2026-08-11 13:39",
  },
  {
    id: "R-20260810-0108",
    status: "done",
    type: "rent",
    sellerKind: "hq",
    sellerId: "hq",
    seller: "본사(자체)",
    usagePeriod: "2026-05-02 ~ 2026-08-01",
    payMethod: "계좌이체",
    date: "2026-08-10 08:15",
    payAmount: 147000,
    shipMethod: "택배",
    carrier: "롯데택배",
    trackingNo: "203845119027",
    pickupCarrier: "롯데택배",
    pickupTrackingNo: "203846620188",
    productCode: "BC-ST-2210",
    productName: "유모차 디럭스 4륜",
    rentBasePrice: 210000,
    discount: 63000,
    buyerName: "노유진",
    buyerId: "yujin.noh@babymail.kr",
    buyerPhone: "010-5512-8830",
    receiver: "노유진",
    receiverPhone: "010-5512-8830",
    address: "세종 한누리대로 2130 1201호",
    shipMemo: "",
    unitCode: "U-2210-0301",
    orderedAt: "2026-08-10 08:07",
  },
  {
    id: "S-20260809-0064",
    status: "resend",
    type: "sale",
    sellerKind: "seller",
    sellerId: "SLR-003",
    seller: "리틀홈",
    usagePeriod: "",
    payMethod: "신용카드",
    date: "2026-08-09 17:52",
    payAmount: 54000,
    shipMethod: "택배",
    carrier: "로젠택배",
    trackingNo: "770238004416",
    pickupCarrier: "로젠택배",
    pickupTrackingNo: "770238771905",
    productCode: "BC-PL-5077",
    productName: "놀이매트 폴더형 200x140",
    rentBasePrice: null,
    discount: 0,
    buyerName: "배하람",
    buyerId: "haram.bae@babymail.kr",
    buyerPhone: "010-2278-6641",
    receiver: "배하람",
    receiverPhone: "010-2278-6641",
    address: "제주 제주시 첨단로 242 3층",
    shipMemo: "택배함 이용 불가",
    unitCode: "U-5077-0412",
    orderedAt: "2026-08-09 17:44",
  },
];

/** 판매자 라디오 (원본 `radio.key = "owner"`) */
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
 * 상태 셀렉트 — 원본 `stat` 옵션 10개와 값·순서가 같다.
 * ⚠️ 이 화면에서 `stat` 은 **유형이 아니라 상태**다 (형제 화면 셋과 다르다).
 */
export const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "상태 전체" },
  { value: "requested", label: "교환 신청" },
  { value: "approved", label: "교환 승인" },
  { value: "rejected", label: "교환 반려" },
  { value: "picking", label: "교환 수거중" },
  { value: "picked", label: "교환 수거완료" },
  { value: "inspecting", label: "교환 검수" },
  { value: "reshipping", label: "교환 재배송" },
  { value: "done", label: "교환 완료" },
  { value: "denied", label: "교환 거부" },
  { value: "resend", label: "재반송" },
];

/**
 * 검색조건 — 원본 `search.fieldOpts` 7종과 이름·순서가 같다.
 * 첫 항목 `"조건 없음 (전체)"` 만 우리가 더한 것이다(원본 기본값은 "주문번호").
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
 * 검색조건 → 훑을 문자열. **어느 필드가 검색 대상인가는 도메인**이라 여기 둔다.
 *
 * ⚠️ `"phone"`(연락처)은 **구매자 연락처**다 — 원본 `tel` 이 가리키는 열이
 * `buyerPhone`("연락처")이지 `receiverPhone`("수령인 연락처")이 아니다.
 */
export function searchHaystack(item: Exchange, field: string): string {
  switch (field) {
    case "id":
      return item.id;
    case "seller":
      return item.seller;
    case "productCode":
      return item.productCode;
    case "productName":
      return item.productName;
    case "buyerName":
      return item.buyerName;
    case "buyerId":
      return item.buyerId;
    case "phone":
      return item.buyerPhone;
    default:
      return [
        item.id,
        item.seller,
        item.productCode,
        item.productName,
        item.buyerName,
        item.buyerId,
        item.buyerPhone,
      ].join(" ");
  }
}

/* =========================================================================
 * URL 쿼리 → 초기 필터  (원본 파라미터 이름을 그대로 쓴다)
 *
 * ⚠️⚠️ **`stat` 이 형제 화면과 다른 뜻이다.**
 * 주문·취소·반품에서 `stat` 은 유형(렌트/판매)이고 상태는 `flow` 인데,
 * 교환에서는 `stat` 이 **상태**이고 `flow` 는 아예 읽지 않는다
 * (원본 `chipKeys: ["owner","sellerName"]` — `flow` 가 빠져 있다).
 * 링크를 이을 때 이 차이를 놓치면 "필터가 안 걸린 채 목록만 열린다".
 *
 * | 파라미터     | 뜻      | 값                                       |
 * | ------------ | ------- | ---------------------------------------- |
 * | `stat`       | **상태** | `교환 신청` · `교환 검수` · `교환 거부` … |
 * | `owner`      | 판매자  | `본사` · `셀러`                          |
 * | `sellerName` | 셀러    | 셀러명 (`owner=셀러`일 때)               |
 * | `q`          | 검색어  | 자유 문자열                              |
 * | `paidAt_from` / `paidAt_to` | 결제일 구간 | `YYYY-MM-DD`             |
 * ====================================================================== */

/** `교환 검수` → `inspecting`. `STATUS_META` 를 뒤집어 만든다 */
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

/**
 * 뼈대가 들고 있는 조회 조건 한 덩어리.
 * **유형이 없다** — 원본 교환 목록에 유형 축이 없기 때문이다.
 */
export interface ExchangeFilters {
  sellerKind: string;
  sellerId: string;
  status: string;
  searchField: string;
  keyword: string;
  period?: DateRange;
}

/** 아무 조건도 걸리지 않은 상태. "초기화"가 되돌아가는 자리다 */
export const EMPTY_FILTERS: ExchangeFilters = {
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
 * ⚠️ 원본이 `useEffect` 로 하는 **정합성 보정**을 여기서 함께 한다 —
 * `owner=본사&sellerName=코코베베` 는 셀러 지정이 손댈 수 없는 필터가 되므로 버린다.
 */
export function filtersFromQuery(params: URLSearchParams): ExchangeFilters {
  const status = STATUS_BY_LABEL[params.get("stat") ?? ""] ?? "all";

  const sellerKind = SELLER_KIND_BY_LABEL[params.get("owner") ?? ""] ?? "all";
  const sellerId = SELLER_ID_BY_NAME[params.get("sellerName") ?? ""] ?? "all";

  const from = parseDay(params.get("paidAt_from"));
  const to = parseDay(params.get("paidAt_to"));

  return {
    status,
    sellerKind,
    sellerId: sellerKind === "seller" ? sellerId : "all",
    searchField: "all",
    keyword: params.get("q") ?? "",
    period: from ? { from, to } : undefined,
  };
}

/**
 * 표에는 없고 **엑셀에만 들어가는 열**. 원본 `ORDER_EXPORT_EXTRA_COLUMNS` 와
 * 항목·순서가 같다 — 교환 목록도 주문 목록과 **같은 상수를 공유한다**.
 */
export const EXPORT_EXTRA_COLUMNS: {
  label: string;
  value: (item: Exchange) => string;
}[] = [
  { label: "처리단위", value: (item) => item.unitCode },
  { label: "결제금액", value: (item) => won(item.payAmount) },
  { label: "주문일시", value: (item) => item.orderedAt },
];

/** 내려받는 파일 이름의 앞머리. 원본 `exportName` 그대로 */
export const EXPORT_NAME = "교환목록";

/**
 * 금액 포맷. 단위가 도메인이라 여기 둔다.
 * ⚠️ 천 단위 구분자는 **쉼표 고정**.
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
 * **샘플이 10건뿐이라 페이징이 동작하는 것이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 4;
