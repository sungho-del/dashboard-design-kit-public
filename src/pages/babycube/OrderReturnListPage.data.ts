import type { DateRange, SelectOption, TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S10 반품 목록 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `OrderReturnListPage.tsx`
 * 원본 어드민 청크: `_plan/babycube-admin/chunks/3ax7j8sg636zl.js` (`/orders-return`)
 *
 * ## 이 화면이 무엇인가
 * 반품 요청이 걸린 **처리단위**를 조회한다.
 *
 * ⚠️ 원본 대조에서 밝혀진 사실: **반품 목록의 표는 주문 목록의 표와 같다.**
 * 컬럼 배열 24개가 라벨·순서까지 동일하고, 첫 열의 데이터 키만 반품 상태다.
 * 검수 판정·차감 금액 같은 반품 고유 정보는 표가 아니라 **상세 화면**에 있다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(YYYY-MM-DD HH:mm) 를 반드시 갖는다
 * - ⚠️ `date` 는 **결제 일시**다 — 원본이 기간 필터 축을 `[["paidAt","결제일"]]` 하나로
 *   못박았다. 주문일시(`orderedAt`)는 엑셀 전용이라 필터 축이 아니다
 * - `STATUS_META` 의 키는 `Return["status"]` 와 정확히 일치한다
 * - `FILTERS[0].value === "all"` — 유형 대시(원본 `chip.dash`)의 첫 카드
 * - `filtersFromQuery` 는 **URL 쿼리 → 초기 필터**. 원본과 파라미터 이름이 같다
 *
 * ## 원본 대조로 고친 것 (2026-08 정돈)
 * 1. **표를 원본 24열로 되돌렸다.** 우리 표는 25열이었고 그중 11열
 *    (검수 판정 · 반품 신청 일시 · 반품 사유 · 수거 완료 일시 · 검수 일시 ·
 *    차감 금액 · 환불 금액 · 결제금액 · 셀러 · 처리단위 · 주문일시)이
 *    **원본에 없는 열**이었다. 대신 원본에 있는 10열(이용 기간 · 배송 방법 · 택배사 ·
 *    송장번호 · 렌트 원가 · 할인 금액 · 렌트가 · 연락처 · 수령인 · 배송 메모)이 없었다
 * 2. **상태 어휘를 원본 10개로 맞췄다.** 원본 `flow` 셀렉트가
 *    `["반품 신청","반품 승인","반품 반려","반품 수거중","반품 수거완료","반품 검수",
 *      "환불 처리중","반품 완료","반품 거부","재반송"]` 이다.
 *    우리에게 없던 `반품 반려`·`반품 수거완료`·`환불 처리중`·`재반송` 을 더했다
 * 3. **`검수 판정` 열(VERDICT_META)을 걷어냈다.** 이상없음/경미손상/중대손상/분실은
 *    원본에 **상태 어휘로는 존재**하지만(보증금 화면 쪽) 반품 목록 표의 열이 아니다
 * 4. **지어낸 요약 카드 3장을 걷어냈다.** 그 자리에 원본이 실제로 두는
 *    **유형별 건수 대시**를 세웠다
 * ---------------------------------------------------------------------- */

/** 처리단위가 나간 방식. 렌트는 이용 기간·보증금이 붙고 판매는 붙지 않는다 */
export type OrderType = "rent" | "sale";

/** 파는 주체. 본사(자체) 재고인지 입점 셀러 재고인지 */
export type SellerKind = "hq" | "seller";

/**
 * 반품 진행 상태. **원본 `flow` 셀렉트의 열 값과 값·순서가 같다.**
 *
 * 반품 흐름은 유형(렌트/판매)과 무관하게 하나다 — 주문 목록처럼 유형별로 갈리지 않는다.
 */
export type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "picking"
  | "picked"
  | "inspecting"
  | "refunding"
  | "done"
  | "denied"
  | "resend";

export interface Return {
  /** 주문번호 — 고유 키. 앞 글자가 유형이다 (R=렌트 · S=판매) */
  id: string;
  status: ReturnStatus;
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
  /** 수거 택배사 — 반품이 수거 단계에 들어가야 채워진다 */
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
export const rentPriceOf = (item: Return): number | null =>
  item.rentBasePrice === null
    ? null
    : Math.max(0, item.rentBasePrice - item.discount);

/** 판매자 열에 찍히는 글자. 원본과 같다 — 본사면 "본사", 아니면 셀러명 */
export const sellerLabel = (item: Return): string =>
  item.sellerKind === "hq" ? "본사" : item.seller;

/**
 * 반품 상태 → 라벨과 Tag tone.
 *
 * ⚠️ 원본의 `b-prog`/`b-done`/`b-exc` 색을 옮기지 않고 우리 어휘로 다시 판단했다
 * (`docs/screen-templates.md` §3-1).
 *
 * | tone       | 뜻                                   | 여기서                                        |
 * | ---------- | ------------------------------------ | --------------------------------------------- |
 * | `warning`  | **지금 사람이 무언가를 해야 끝난다** | 반품 신청 · 반품 수거완료 · 반품 검수 · 재반송 |
 * | `critical` | **비정상 종료** — 반품이 성립하지 않았다 | 반품 반려 · 반품 거부                     |
 * | `success`  | 진행 중이고 정상 (돈이 도는 상태)    | 환불 처리중                                   |
 * | `default`  | 정상 종료 + 조용한 중간 단계         | 반품 승인 · 반품 수거중 · 반품 완료           |
 *
 * ## ⚠️ 종료 상태를 한 톤으로 묶지 않는다
 * `반품 완료`(정상 종료 · `default`)와 `반품 반려`·`반품 거부`(비정상 종료 · `critical`)는
 * 둘 다 "끝난 건"이지만 뜻이 정반대다. 같은 색으로 묶으면 목록에서 문제 건이 사라진다.
 * 반려는 **접수 단계 거절**, 거부는 **검수 뒤 거절**이라 시점만 다르고 결과는 같다.
 *
 * ## ⚠️ `반품 수거완료` 가 `default` 가 아닌 이유
 * 이름은 "완료"지만 흐름의 끝이 아니다 — 물건이 도착했으니 **사람이 검수를 시작해야**
 * 다음으로 간다. 이름만 보고 종료로 묶으면 검수 대기 건이 화면에서 조용해진다.
 *
 * ## ⚠️ `재반송` 이 `critical` 이 아닌 이유
 * 거부·반려된 물건을 고객에게 돌려보내는 **후속 처리 단계**다. 이미 판단은 끝났고
 * 남은 것은 송장 등록과 안내라 "사람이 해야 끝난다"(`warning`)에 해당한다.
 */
export const STATUS_META: Record<
  ReturnStatus,
  { label: string; tone: TagTone }
> = {
  requested: { label: "반품 신청", tone: "warning" },
  approved: { label: "반품 승인", tone: "default" },
  rejected: { label: "반품 반려", tone: "critical" },
  picking: { label: "반품 수거중", tone: "default" },
  picked: { label: "반품 수거완료", tone: "warning" },
  inspecting: { label: "반품 검수", tone: "warning" },
  refunding: { label: "환불 처리중", tone: "success" },
  done: { label: "반품 완료", tone: "default" },
  denied: { label: "반품 거부", tone: "critical" },
  resend: { label: "재반송", tone: "warning" },
};

/**
 * 유형 라벨.
 * ⚠️ 원본은 렌트=green · 판매=blue 로 색을 갈랐지만 **우리는 둘 다 중립색**이다.
 * 우리 `TagTone` 은 상태 어휘라, 분류에 상태색을 쓰면 "렌트는 좋은 상태"로 읽힌다.
 */
export const TYPE_META: Record<OrderType, { label: string; tone: TagTone }> = {
  rent: { label: "렌트", tone: "default" },
  sale: { label: "판매", tone: "default" },
};

export const RETURNS: Return[] = [
  {
    id: "R-20260818-0311",
    status: "requested",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-001",
    seller: "아기별상사",
    usagePeriod: "2026-08-14 ~ 2026-11-13",
    payMethod: "신용카드",
    date: "2026-08-18 10:04",
    payAmount: 189000,
    shipMethod: "택배",
    carrier: "CJ대한통운",
    trackingNo: "412042990173",
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
    orderedAt: "2026-08-18 09:58",
  },
  {
    id: "S-20260817-0140",
    status: "approved",
    type: "sale",
    sellerKind: "hq",
    sellerId: "hq",
    seller: "본사(자체)",
    usagePeriod: "",
    payMethod: "간편결제",
    date: "2026-08-17 15:22",
    payAmount: 42000,
    shipMethod: "택배",
    carrier: "한진택배",
    trackingNo: "558104477520",
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
    orderedAt: "2026-08-17 15:15",
  },
  {
    id: "R-20260816-0208",
    status: "picking",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-002",
    seller: "코코베베",
    usagePeriod: "2026-08-10 ~ 2026-11-09",
    payMethod: "계좌이체",
    date: "2026-08-16 13:47",
    payAmount: 168000,
    shipMethod: "택배",
    carrier: "롯데택배",
    trackingNo: "203848806411",
    pickupCarrier: "롯데택배",
    pickupTrackingNo: "203849117032",
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
    orderedAt: "2026-08-16 13:40",
  },
  {
    id: "R-20260815-0155",
    status: "picked",
    type: "rent",
    sellerKind: "hq",
    sellerId: "hq",
    seller: "본사(자체)",
    usagePeriod: "2026-08-08 ~ 2026-11-07",
    payMethod: "신용카드",
    date: "2026-08-15 11:16",
    payAmount: 156000,
    shipMethod: "화물 설치",
    carrier: "CJ대한통운",
    trackingNo: "412033118820",
    pickupCarrier: "CJ대한통운",
    pickupTrackingNo: "412034009917",
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
    orderedAt: "2026-08-15 11:08",
  },
  {
    id: "R-20260814-0122",
    status: "inspecting",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-003",
    seller: "리틀홈",
    usagePeriod: "2026-08-06 ~ 2026-11-05",
    payMethod: "신용카드",
    date: "2026-08-14 20:03",
    payAmount: 132000,
    shipMethod: "택배",
    carrier: "로젠택배",
    trackingNo: "770241663200",
    pickupCarrier: "로젠택배",
    pickupTrackingNo: "770242118874",
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
    orderedAt: "2026-08-14 19:55",
  },
  {
    id: "S-20260813-0098",
    status: "refunding",
    type: "sale",
    sellerKind: "seller",
    sellerId: "SLR-004",
    seller: "맘스케어",
    usagePeriod: "",
    payMethod: "가상계좌",
    date: "2026-08-13 08:31",
    payAmount: 89000,
    shipMethod: "택배",
    carrier: "로젠택배",
    trackingNo: "770239118845",
    pickupCarrier: "로젠택배",
    pickupTrackingNo: "770243007712",
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
    orderedAt: "2026-08-13 08:22",
  },
  {
    id: "R-20260812-0077",
    status: "denied",
    type: "rent",
    sellerKind: "seller",
    sellerId: "SLR-001",
    seller: "아기별상사",
    usagePeriod: "2026-08-01 ~ 2026-10-31",
    payMethod: "신용카드",
    date: "2026-08-12 17:45",
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
    orderedAt: "2026-08-12 17:36",
  },
  {
    id: "S-20260811-0060",
    status: "rejected",
    type: "sale",
    sellerKind: "seller",
    sellerId: "SLR-002",
    seller: "코코베베",
    usagePeriod: "",
    payMethod: "간편결제",
    date: "2026-08-11 12:09",
    payAmount: 68000,
    shipMethod: "택배",
    carrier: "한진택배",
    trackingNo: "558105991028",
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
    orderedAt: "2026-08-11 12:01",
  },
  {
    id: "R-20260810-0044",
    status: "done",
    type: "rent",
    sellerKind: "hq",
    sellerId: "hq",
    seller: "본사(자체)",
    usagePeriod: "2026-05-02 ~ 2026-08-01",
    payMethod: "계좌이체",
    date: "2026-08-10 09:52",
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
    orderedAt: "2026-08-10 09:44",
  },
  {
    id: "S-20260809-0021",
    status: "resend",
    type: "sale",
    sellerKind: "seller",
    sellerId: "SLR-003",
    seller: "리틀홈",
    usagePeriod: "",
    payMethod: "신용카드",
    date: "2026-08-09 14:37",
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
    orderedAt: "2026-08-09 14:28",
  },
];

/**
 * 유형 대시 — **건수 카드가 곧 유형 필터다** (원본 `chip: { key:"stat", dash: !0, … }`).
 * 그래서 이 화면의 필터바에는 유형이 없다.
 */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "rent", label: "렌트" },
  { value: "sale", label: "판매" },
];

/**
 * 유형별 안내 — **원본 `statusTips` 문구 그대로다.**
 * (원본은 유형 카드의 `i` 툴팁으로 띄우고, 우리는 카드 아래 한 줄로 상시 노출한다.)
 *
 * ⚠️ `all` 만 우리가 쓴 문장이다 — 원본 대시에는 "전체" 카드가 따로 없어 문구도 없다.
 */
export const TYPE_NOTICE: Record<string, string> = {
  all: "렌트와 판매의 반품 건이 함께 보입니다.",
  rent: "대여 계약으로 나간 처리단위의 반품 건입니다.",
  sale: "판매(구매)로 나간 처리단위의 반품 건입니다.",
};

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
 * 상태 셀렉트 — 원본 `flow` 옵션 10개와 값·순서가 같다.
 * 반품 흐름은 유형과 무관하게 하나라 S08 과 달리 **유형별로 갈리지 않는다.**
 */
export const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "상태 전체" },
  { value: "requested", label: "반품 신청" },
  { value: "approved", label: "반품 승인" },
  { value: "rejected", label: "반품 반려" },
  { value: "picking", label: "반품 수거중" },
  { value: "picked", label: "반품 수거완료" },
  { value: "inspecting", label: "반품 검수" },
  { value: "refunding", label: "환불 처리중" },
  { value: "done", label: "반품 완료" },
  { value: "denied", label: "반품 거부" },
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
 * `phone`("연락처")이지 `receiverPhone`("수령인 연락처")이 아니다.
 */
export function searchHaystack(item: Return, field: string): string {
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
 * | 파라미터     | 뜻      | 값                                       |
 * | ------------ | ------- | ---------------------------------------- |
 * | `stat`       | 유형    | `렌트` · `판매`                          |
 * | `flow`       | 상태    | `반품 신청` · `반품 검수` · `반품 거부` … |
 * | `owner`      | 판매자  | `본사` · `셀러`                          |
 * | `sellerName` | 셀러    | 셀러명 (`owner=셀러`일 때)               |
 * | `q`          | 검색어  | 자유 문자열                              |
 * | `paidAt_from` / `paidAt_to` | 결제일 구간 | `YYYY-MM-DD`             |
 *
 * ⚠️ **값이 한글 라벨이다.** 우리 내부 코드(`rent`/`denied`/`hq`)와 다르므로 여기서 옮긴다.
 * 매핑을 손으로 적지 않고 `STATUS_META`·`SELLERS` 에서 뽑아내는 이유는, 손으로 적으면
 * 상태가 늘 때 한쪽만 고쳐도 타입이 잡지 못해서다.
 * ====================================================================== */

/** `렌트`/`판매` → `rent`/`sale` */
const TYPE_BY_LABEL: Record<string, string> = Object.fromEntries(
  FILTERS.filter((item) => item.value !== "all").map((item) => [
    item.label,
    item.value,
  ]),
);

/** `반품 검수` → `inspecting`. `STATUS_META` 를 뒤집어 만든다 */
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
export interface ReturnFilters {
  type: string;
  sellerKind: string;
  sellerId: string;
  status: string;
  searchField: string;
  keyword: string;
  period?: DateRange;
}

/** 아무 조건도 걸리지 않은 상태. "초기화"가 되돌아가는 자리다 */
export const EMPTY_FILTERS: ReturnFilters = {
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
 * ⚠️ 원본이 `useEffect` 로 하는 **정합성 보정**을 여기서 함께 한다 —
 * `owner=본사&sellerName=코코베베` 는 셀러 지정이 손댈 수 없는 필터가 되므로 버린다.
 */
export function filtersFromQuery(params: URLSearchParams): ReturnFilters {
  const type = TYPE_BY_LABEL[params.get("stat") ?? ""] ?? "all";
  const status = STATUS_BY_LABEL[params.get("flow") ?? ""] ?? "all";

  const sellerKind = SELLER_KIND_BY_LABEL[params.get("owner") ?? ""] ?? "all";
  const sellerId = SELLER_ID_BY_NAME[params.get("sellerName") ?? ""] ?? "all";

  const from = parseDay(params.get("paidAt_from"));
  const to = parseDay(params.get("paidAt_to"));

  return {
    type,
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
 * 항목·순서가 같다 — 반품 목록도 주문 목록과 **같은 상수를 공유한다**.
 */
export const EXPORT_EXTRA_COLUMNS: {
  label: string;
  value: (item: Return) => string;
}[] = [
  { label: "처리단위", value: (item) => item.unitCode },
  { label: "결제금액", value: (item) => won(item.payAmount) },
  { label: "주문일시", value: (item) => item.orderedAt },
];

/** 내려받는 파일 이름의 앞머리. 원본 `exportName` 그대로 */
export const EXPORT_NAME = "반품목록";

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
