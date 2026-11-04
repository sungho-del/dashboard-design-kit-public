import type { DateRange, SelectOption, TagTone } from "../../components/ui";
import { MEMBERS } from "./MemberListPage.data";
import { PRODUCTS } from "./ProductListPage.data";

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
 *
 * ## 원본과 다르게 둔 곳 — 추가 기획 보드
 * - 결제수단 「네이버페이」(보드 01 · 토스페이먼츠 경유 간편결제) — 주문번호 숫자 합이 7의 배수인
 *   결제(12처리단위)가 네이버페이다. 주문번호로 고르므로 한 결제의 처리단위는 같은 수단이다
 * - 「추가 연락처」 `receiverSubPhone`(보드 02 · 개발 d53c51d `receiverSubPhone`) — 배송지 스냅샷.
 *   몇 건만 번호가 있고(`SUB_PHONES`) 나머지는 `null`(상세에 `-`). 기능 도입 전 주문이라 렌트도 비어 있을 수 있다
 * 정산 2026.09 회차 사례(2026-11-02 추가 11건)는 9월 안에 확정되도록 **8월 결제**가 섞인다.
 * 보증금(`deposit.data.ts`)·안심케어·정산(`settlement.data.ts`)이 모두 이 처리단위에서 값을 읽는다 —
 * 같은 처리단위가 화면마다 다른 말을 하지 않게.
 * ---------------------------------------------------------------------- */

/** 처리단위가 나간 방식. 렌트는 이용 기간·렌트 금액이 붙고 판매는 붙지 않는다 */
export type OrderType = "rent" | "sale";

/** 파는 주체. 본사(자체) 재고인지 입점 셀러 재고인지 */
export type SellerKind = "hq" | "seller";

/**
 * 정상 흐름의 단계 — 원본 `FLOW_STEPS` 의 판매(5)·렌트(11) 흐름(앞 4단계 공유)과 배송 지연.
 * 클레임이 없었다면 있었을 단계(`baseStatus`)는 늘 이 중 하나다.
 */
export type FlowStatus =
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
  | "delayed";

/** 클레임 종류 — 취소·반품·교환 목록이 각자 이 값으로 모집단을 거른다 */
export type ClaimType = "cancel" | "return" | "exchange";

/**
 * 클레임 진행 상태 — 원본 `FLOW_STEPS['취소'|'반품'|'교환']`.
 * ⚠️ **키는 유형마다 따로**다. 「환불 처리중」(취소·반품)과 「재반송」(반품·교환)은 글자가 같지만
 * 다른 흐름의 단계라, 키 하나로 합치면 어느 클레임의 단계인지 잃는다.
 */
export type CancelStatus = "cancelRequested" | "cancelRefunding" | "canceled";
export type ReturnStatus =
  | "returnRequested"
  | "returnApproved"
  | "returnRejected"
  | "returnPicking"
  | "returnPicked"
  | "returnInspecting"
  | "returnRefunding"
  | "returnDone"
  | "returnRefused"
  | "returnResend";
export type ExchangeStatus =
  | "exchangeRequested"
  | "exchangeApproved"
  | "exchangeRejected"
  | "exchangePicking"
  | "exchangePicked"
  | "exchangeInspecting"
  | "exchangeReshipping"
  | "exchangeDone"
  | "exchangeRefused"
  | "exchangeResend";
export type ClaimStatus = CancelStatus | ReturnStatus | ExchangeStatus;

/**
 * 처리단위의 진행 상태 = 정상 흐름 + 클레임.
 * 클레임 건은 주문 목록에도 **클레임 상태로** 보인다(원본 `flowStat`) — 상태 선택지에는 없어
 * 주문 목록에서 골라 볼 수는 없다(원본 그대로 · 기획 확인 사항). 고르는 곳은 각 클레임 목록이다.
 */
export type OrderStatus = FlowStatus | ClaimStatus;

/** 귀책 — 판매자(하자·배송 문제) / 고객(단순 변심 등). 원본 정책 문구 그대로 */
export type ClaimFault = "seller" | "customer";

export interface ClaimEvent {
  status: ClaimStatus;
  /** `YYYY-MM-DD HH:mm` — **예시** 시각. 시간순이고 시연 기준일을 넘지 않는다 */
  at: string;
}

export interface Claim {
  type: ClaimType;
  /** 지금 단계 = `events` 의 마지막 */
  status: ClaimStatus;
  /** 신청 사유(고객이 고른 문구) */
  reason: string;
  /** 귀책 — 사유에서 **한 번만** 정한다(`faultOf`). 배지·배송비 부담·명세가 모두 이 값을 본다 */
  fault: ClaimFault;
  /** 실제로 거친 단계만, 시간순 — 처리 이력이 이것을 그대로 쌓는다 */
  events: ClaimEvent[];
}

/**
 * 반납 검수 판정 — 원본 4단(`이상없음`·`파손(복원가능)`·`파손(복원불가)`·`분실`).
 * 라벨·톤은 보증금 쪽(`deposit.data.ts` `INSPECTION_META`)에 있다.
 */
export type Inspection = "ok" | "repairable" | "unrepairable" | "lost";

/** 안심케어 복원비 청구의 본사 심사 상태 — 원본 3값(청구 접수·승인·반려) */
export type CareClaimStatus = "received" | "approved" | "rejected";

export const CARE_CLAIM_STATUS_LABEL: Record<CareClaimStatus, string> = {
  received: "청구 접수",
  approved: "승인",
  rejected: "반려",
};

/**
 * 안심케어 복원비 청구 — 셀러가 반납 검수 뒤 올린다. **주문 클레임(`claim`)과 다른 일이다**
 * (그쪽은 취소·반품·교환). 금액은 셀러 입력값 그대로, 본사는 승인·반려만 한다(원본 #13).
 */
export interface CareClaim {
  /** 청구 복원비 */
  amount: number;
  status: CareClaimStatus;
  /** 청구일시 `YYYY-MM-DD HH:mm` — 반납 검수 뒤 */
  claimedAt: string;
  /** 승인·반려 일시 — 접수 건은 `null` */
  decidedAt: string | null;
  /** 반려 사유 — 반려 건만 */
  rejectReason: string | null;
}

/** 안심케어 가입 — 주문 명세의 가입 요금과 청구 자격이 **같은 값**을 읽는다 */
export interface Care {
  /** 가입 요금(결제 당시) — 정산 매출에 들지 않는다 */
  fee: number;
  /** 복원비 청구 — 없으면 `null` */
  claim: CareClaim | null;
}

/** 안심케어 가입 요금 — 원본 `UD_CARE_FEE` */
export const CARE_FEE = 5000;

export interface Order {
  /** 처리단위 코드 — **고유 키**. 행 key·선택·엑셀 선택분·상세 경로(`/orders-all/{id}`) */
  id: string;
  /** 주문번호 14자리. 한 결제에 처리단위가 여럿이면 **같은 번호를 공유한다** */
  orderNo: string;
  /** 목록 배지 — 클레임 건은 `claim.status`, 나머지는 `baseStatus` 와 같다(따로 적지 않고 만든다) */
  status: OrderStatus;
  /**
   * 클레임이 없었다면 있었을 **진행 단계** — 처리 이력의 정상 흐름이 여기까지 쌓이고,
   * 원래 배송 송장도 이 값으로 정한다. 클레임 건은 샘플이 원래 단계를 직접 적는다(추측하지 않는다)
   */
  baseStatus: FlowStatus;
  /** 취소·반품·교환 — 없으면 `null` */
  claim: Claim | null;
  type: OrderType;
  sellerKind: SellerKind;
  /** 셀러명 — 본사 건은 `"본사"`. 판매자 열·셀러 필터·검색이 이 값을 본다 */
  seller: string;
  /** 이용 기간 `YYYY-MM-DD ~ YYYY-MM-DD` — 판매 건은 빈 문자열 */
  period: string;
  payMethod: string;
  /** ⚠️ **결제 일시** `YYYY-MM-DD HH:mm`. 기간 필터·정렬이 이 값을 본다 */
  date: string;
  shipMethod: string;
  carrier: string;
  trackingNo: string;
  /** 수거 택배사 — 렌트의 반납 회수, 그리고 반품·교환 수거(렌트·판매 모두)에 채워진다 */
  pickupCarrier: string;
  pickupTrackingNo: string;
  productCode: string;
  productName: string;
  /** 렌트 원가 **원/일**(주문 당시 단가) — 판매 건은 `null` */
  rentBasePrice: number | null;
  /** 렌트 할인 **원/일** — 판매 건은 `null`(판매 건의 렌트 금액 세 열은 모두 비어 있다) */
  rentDiscount: number | null;
  /** 렌트일 — 판매 건은 `null` */
  rentDays: number | null;
  /** 보증금(고정액) — 판매 건은 `null`. 결제금액에 들지 않는다(원본 명세) */
  deposit: number | null;
  /** 판매 단가(원가 · 할인) — 렌트 건은 `null` */
  saleBasePrice: number | null;
  saleDiscount: number | null;
  /** 수량 — 렌트는 1 */
  qty: number;
  /** 배송비 — 상품의 배송비(0 이면 무료) */
  shipFee: number;
  /** 반품 배송비(편도) · 교환 배송비(왕복) — 상품의 값. **0 은 무료**다(값 없음이 아니다) */
  returnFee: number;
  exchangeFee: number;
  buyerName: string;
  /** 구매자 ID — 회원 샘플의 아이디(이메일) */
  buyerId: string;
  /** 구매자 연락처. 표의 "연락처" 열이자 검색 대상 `연락처` 가 보는 값 */
  buyerPhone: string;
  receiver: string;
  receiverPhone: string;
  /** 추가 연락처(배송지 스냅샷 · 보드 02) — 없으면 `null` */
  receiverSubPhone: string | null;
  address: string;
  shipMemo: string;
  /** 주문일시 `YYYY-MM-DD HH:mm` — 같은 주문번호면 같다 */
  orderedAt: string;

  /* ── 결제 단계의 할인·부가 — 주문 명세와 정산이 **같은 값**을 읽는다 ── */

  /** 쿠폰 할인 — **셀러 쿠폰(셀러 부담)**. 정산 매출에서 빠진다 */
  coupon: number;
  /** 포인트 사용 — 본사(플랫폼) 부담. 정산에 영향 없다(참고 줄만) */
  point: number;
  /** 안심케어 가입 — 미가입은 `null`. 렌트만 */
  care: Care | null;

  /* ── 반납 검수 · 확정 — 보증금(`deposit.data.ts`)과 정산(`settlement.data.ts`)이 읽는다 ── */

  /** 검수 판정 — 검수완료 전(또는 판매)은 `null` */
  inspection: Inspection | null;
  /** 검수 차감액(셀러 입력) — 0 이상. 보증금 한도는 보증금 함수가 건다 */
  deduction: number;
  /** 검수완료 시각 `YYYY-MM-DD HH:mm` — 처리 이력의 「검수완료」와 같은 값 */
  inspectedAt: string | null;
  /**
   * **매출 확정 시각** `YYYY-MM-DD HH:mm` — 판매 = 구매확정(배송 완료 7일 뒤 자동) /
   * 렌트 = 반납완료. 처리 이력의 그 단계와 같은 값이고 정산 회차 귀속의 기준이다(결제월이 아니다).
   * 반려·거부·재반송으로 끝난 판매 클레임은 거래가 살아 있어 자동 확정과 클레임 종결 중 늦은 쪽에 확정된다
   * (원본 `confirmDate`). 미확정·진행 중 클레임은 `null`
   */
  confirmedAt: string | null;
}

/** 클레임이 **거래를 되돌리지 않고** 끝났는가 — 반려·거부·재반송(원본 불성립 어휘) */
export const isClaimRefused = (order: Pick<Order, "claim">) =>
  /Rejected$|Refused$|Resend$/.test(order.claim?.status ?? "");

/** 렌트가(원/일) = 원가 − 할인 (음수 방지). 저장하지 않고 계산한다 — 셋이 어긋날 수 없게 */
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
 * | `warning`  | **지금 사람이 무언가를 해야 끝난다** | 신규 주문 · 수거 신청 · 검수중 · 검수완료 · 클레임 신청 · 수거완료 · 검수 |
 * | `critical` | 비정상 — 즉시 조치 또는 비정상 종결  | 연체중 · 배송 지연 · 반려 · 거부 · 재반송 |
 * | `success`  | 진행 중이고 정상 (돈이 도는 상태)    | 대여중 · 대여중(연장) · 환불 처리중 |
 * | `default`  | 정상 종료 + 조용한 중간 단계         | 배송 3종 · 반납완료 · 구매확정 · 승인 · 수거중 · 재배송 · 완료 |
 *
 * ⚠️ 검수완료가 `warning` 인 이유 — 이름은 "완료"지만 보증금 처리가 남아 흐름의 끝이 아니다.
 * ⚠️ 재반송은 `critical` 이다 — 원본이 반려·거부와 같은 예외색으로 두고 **종결 상태**로 못 박았다
 * (더 진행할 단계가 없다). 한때 「할 일이 남음」(`warning`)으로 칠했는데 뜻이 틀렸다.
 * 클레임 목록 셋도 이 표를 그대로 쓴다(같은 글자가 화면마다 다른 색이면 안 된다).
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
  cancelRefunding: { label: "환불 처리중", tone: "success" },
  canceled: { label: "취소 완료", tone: "default" },
  returnRequested: { label: "반품 신청", tone: "warning" },
  returnApproved: { label: "반품 승인", tone: "default" },
  returnRejected: { label: "반품 반려", tone: "critical" },
  returnPicking: { label: "반품 수거중", tone: "default" },
  returnPicked: { label: "반품 수거완료", tone: "warning" },
  returnInspecting: { label: "반품 검수", tone: "warning" },
  returnRefunding: { label: "환불 처리중", tone: "success" },
  returnDone: { label: "반품 완료", tone: "default" },
  returnRefused: { label: "반품 거부", tone: "critical" },
  returnResend: { label: "재반송", tone: "critical" },
  exchangeRequested: { label: "교환 신청", tone: "warning" },
  exchangeApproved: { label: "교환 승인", tone: "default" },
  exchangeRejected: { label: "교환 반려", tone: "critical" },
  exchangePicking: { label: "교환 수거중", tone: "default" },
  exchangePicked: { label: "교환 수거완료", tone: "warning" },
  exchangeInspecting: { label: "교환 검수", tone: "warning" },
  exchangeReshipping: { label: "교환 재배송", tone: "default" },
  exchangeDone: { label: "교환 완료", tone: "default" },
  exchangeRefused: { label: "교환 거부", tone: "critical" },
  exchangeResend: { label: "재반송", tone: "critical" },
};

/** 클레임 종류 이름 — 상세의 「신청 구분」 배지·제목에 쓴다 */
export const CLAIM_TYPE_LABEL: Record<ClaimType, string> = {
  cancel: "취소",
  return: "반품",
  exchange: "교환",
};

/**
 * 클레임 목록의 상태 선택지 순서 — 원본 `FLOW_STEPS['취소'|'반품'|'교환']` 그대로.
 * 취소 3 · 반품 10 · 교환 10. 유형(렌트·판매)과 무관하게 하나다.
 */
export const CLAIM_FLOW: Record<ClaimType, ClaimStatus[]> = {
  cancel: ["cancelRequested", "cancelRefunding", "canceled"],
  return: [
    "returnRequested",
    "returnApproved",
    "returnRejected",
    "returnPicking",
    "returnPicked",
    "returnInspecting",
    "returnRefunding",
    "returnDone",
    "returnRefused",
    "returnResend",
  ],
  exchange: [
    "exchangeRequested",
    "exchangeApproved",
    "exchangeRejected",
    "exchangePicking",
    "exchangePicked",
    "exchangeInspecting",
    "exchangeReshipping",
    "exchangeDone",
    "exchangeRefused",
    "exchangeResend",
  ],
};

/** 클레임 상태 → 종류 (`CLAIM_FLOW` 를 뒤집어 만든다 — 손으로 적으면 한쪽만 고친다) */
export const claimTypeOf = (status: ClaimStatus): ClaimType =>
  (Object.keys(CLAIM_FLOW) as ClaimType[]).find((type) =>
    CLAIM_FLOW[type].includes(status),
  )!;

/**
 * 클레임이 **실제로 거친 단계** — 지금 단계에서 거꾸로 정한다. 추측이 아니라 흐름의 정의다.
 *   · 정상: 신청 → 승인 → 수거중 → 수거완료 → 검수 → (환불 처리중 | 재배송) → 완료 — 지금 단계까지
 *   · 반려: 신청 → 반려 — **수거 전** 거절이라 승인·수거가 없다
 *   · 거부: 정상 흐름의 검수까지 → 거부 — **검수 뒤** 거절이다
 *   · 재반송: 거부 흐름 → 재반송 — 돌려보낼 물건이 우리 손에 있어야 하므로 반려 뒤에는 오지 않는다
 * ⚠️ 원본은 예외 종결을 모두 「반려」 한 줄로 찍고(거부·재반송 건도), 지연을 모든 건에 끼웠다.
 */
const CLAIM_MAIN: Record<ClaimType, ClaimStatus[]> = {
  cancel: ["cancelRequested", "cancelRefunding", "canceled"],
  return: [
    "returnRequested",
    "returnApproved",
    "returnPicking",
    "returnPicked",
    "returnInspecting",
    "returnRefunding",
    "returnDone",
  ],
  exchange: [
    "exchangeRequested",
    "exchangeApproved",
    "exchangePicking",
    "exchangePicked",
    "exchangeInspecting",
    "exchangeReshipping",
    "exchangeDone",
  ],
};

const claimPathOf = (status: ClaimStatus): ClaimStatus[] => {
  const type = claimTypeOf(status);
  const main = CLAIM_MAIN[type];
  const upTo = (step: ClaimStatus) => main.slice(0, main.indexOf(step) + 1);
  const ret = type === "return";
  switch (status) {
    case "returnRejected":
    case "exchangeRejected":
      return [main[0], status];
    case "returnRefused":
    case "exchangeRefused":
      return [...upTo(ret ? "returnInspecting" : "exchangeInspecting"), status];
    case "returnResend":
    case "exchangeResend":
      return [
        ...upTo(ret ? "returnInspecting" : "exchangeInspecting"),
        ret ? "returnRefused" : "exchangeRefused",
        status,
      ];
    default:
      return upTo(status);
  }
};

/** 수거가 시작된 클레임인가 — 수거 택배사·송장이 붙는다(렌트·판매 모두) */
const PICKUP_STARTED: ClaimStatus[] = ["returnPicking", "exchangePicking"];

/**
 * 귀책 판정 — 원본 `faultOf` 의 사유 낱말(하자·배송 문제 → 판매자, 그 밖 → 고객).
 * ⚠️ 실제 귀책 판단 엔진이 아니다 — **샘플을 만들 때 한 번** 정해 `claim.fault` 에 넣는다.
 */
const SELLER_FAULT =
  /불량|하자|파손|손상|오배송|오발송|누락|결함|배송 (문제|지연|오류)/;
const faultOf = (reason: string): ClaimFault =>
  SELLER_FAULT.test(reason) ? "seller" : "customer";

export const FAULT_LABEL: Record<ClaimFault, string> = {
  seller: "판매자 귀책",
  customer: "고객 귀책",
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
 * 샘플 — `처리단위|결제 일시(초)|상품코드|구매자 ID|단계|배송 방법|렌트일|배송 메모|수령인/연락처|수량`
 *
 * 주문번호는 결제 일시의 숫자 14자리다 — **결제 일시가 같은 행은 같은 주문**이다
 * (U-R03·U-S03 = 렌트+판매 한 결제, U-R09·U-R22 = 렌트 두 건 한 결제).
 * 렌트 32(본사 1) · 판매 35(본사 5) — 정산 사례 11건을 더한 수다.
 * 이용 기간은 결제 4일 뒤 시작한다. 단계는 **시연 기준일(2026-10-19)** 기준으로 기간과 맞춰 두었다
 * (대여중은 기간 안, 연체중·검수·반납은 기간이 끝난 뒤).
 * 「단계」는 정상 흐름의 단계(`baseStatus`)다 — 클레임 건은 아래 `CLAIM_SEEDS` 가 상태를 덮는다.
 * ====================================================================== */

/** 시연 기준일 — 샘플의 모든 사건 시각이 이 날을 넘지 않는다(오늘 날짜가 아니다) */
export const DEMO_TODAY = "2026-10-19";

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
  "U-R20|2026-10-17 22:10:14|MC447210|junseo.ma@example.com|ready|택배|14||",
  "U-R21|2026-10-06 13:05:27|AS730125|sujin.park@example.com|renting|택배|14||",
  "U-R22|2026-10-12 13:17:44|MC447210|chaewon.lim@example.com|renting|택배|30||",
  /* ── 렌트 클레임 (취소 2 · 반품 3) — 렌트 교환은 없다(원본: 교환은 판매 전용) ── */
  "U-R23|2026-10-16 10:12:30|LS240809|haneul.lee@example.com|ready|택배|14||",
  "U-R24|2026-10-13 15:05:41|KB119374|minseo.jung@example.com|new|방문 수령|7||",
  "U-R25|2026-10-09 11:02:16|BL377415|soyul.jeon@example.com|renting|택배|30||",
  "U-R26|2026-10-05 09:40:51|LB846102|eunchan.ko@example.com|renting|택배|30||",
  "U-R27|2026-09-28 16:22:09|LS184620|minjae.koo@example.com|renting|택배|21||",
  /* ── 판매 12 ── */
  "U-S01|2026-10-18 16:20:44|BL240811|yerin.song@example.com|new|택배|||",
  "U-S02|2026-10-18 10:02:19|LS240724|taeho.ryu@example.com|new|택배|||",
  "U-S03|2026-10-17 20:05:11|KB820417|yuna.choi@example.com|ready|택배|||",
  "U-S04|2026-10-15 13:36:58|BH612093|serin.oh@example.com|delayed|택배|||",
  "U-S05|2026-10-16 09:45:03|AR271948|jiho.moon@example.com|shipping|택배|||",
  "U-S06|2026-10-15 17:58:26|AS902715|haeun.bae@example.com|shipping|택배|경비실 옆 무인택배함||",
  "U-S07|2026-10-13 11:24:37|GJ650283|chaewon.lim@example.com|delivered|택배||||2",
  "U-S08|2026-10-12 19:02:15|BL240811|bora.hwang@example.com|delivered|방문 수령|||",
  "U-S09|2026-10-05 14:48:09|LS240724|jisung.ahn@example.com|confirmed|택배|||",
  "U-S10|2026-09-25 10:30:52|HQ240806|dain.hong@example.com|confirmed|택배|||",
  "U-S11|2026-10-17 08:14:33|AS902715|yoon.namgung@example.com|ready|택배|||",
  "U-S12|2026-10-11 21:37:46|BH612093|hajun.seo@example.com|delivered|택배|||",
  /* ── 판매 클레임 (취소 2 · 반품 6 · 교환 9) — 취소 U-S13 · 반품 U-S15 · 교환 U-S24 는 본사 상품 ── */
  "U-S13|2026-10-16 12:44:18|HQ240806|jiwoo.han@example.com|ready|택배|||",
  "U-S14|2026-10-09 20:31:07|KB781520|woojin.shin@example.com|new|택배|||",
  "U-S15|2026-10-10 18:22:37|HQ240806|eunwoo.cho@example.com|delivered|택배|||",
  "U-S16|2026-10-08 13:15:20|LS240724|seoa.yoon@example.com|delivered|택배|||",
  "U-S17|2026-10-06 20:48:33|GJ994106|yejun.cha@example.com|delivered|택배|||",
  "U-S18|2026-10-04 10:05:12|AR408861|minjae.koo@example.com|delivered|택배|||",
  "U-S19|2026-10-02 15:30:44|MC209836|dohyun.kim@example.com|delivered|택배|||",
  "U-S20|2026-09-29 11:11:11|BH295740|gaeun.yoo@example.com|delivered|택배|||",
  "U-S21|2026-10-12 09:20:05|KB820417|jiwoo.han@example.com|delivered|택배|||",
  "U-S22|2026-10-08 17:44:51|AR271948|haneul.lee@example.com|delivered|택배|||",
  "U-S23|2026-10-09 08:31:26|GJ650283|minseo.jung@example.com|delivered|택배|||",
  "U-S24|2026-10-05 14:02:47|HQ240806|eunchan.ko@example.com|delivered|택배|||",
  "U-S25|2026-10-03 19:25:08|AS902715|soyul.jeon@example.com|delivered|택배|||",
  "U-S26|2026-10-01 10:40:15|BL240811|woojin.shin@example.com|delivered|택배|||",
  "U-S27|2026-09-24 16:08:39|LS240724|eunwoo.cho@example.com|delivered|택배|||",
  "U-S28|2026-09-27 12:12:12|KB781520|seoa.yoon@example.com|delivered|택배|||",
  "U-S29|2026-09-21 18:30:30|BH612093|yejun.cha@example.com|delivered|택배|||",
  /* ── 정산 2026.09 회차 사례 (2026-11-02 · 사례표 scratchpad `settle-cases.md`) ──
     렌트 반납완료 5: 안심케어 승인 2(U-R28·U-R29) · 일부환급(U-R30) · 전액차감(U-R31) · 본사 렌트(U-R32).
     판매: 8월 확정 → 9월 반품 완료 환수(U-S30) · 9/30 확정(U-S31) · 10/1 확정 경계(U-S32) ·
     반품 반려 후 거래 유지(U-S33) · 본사 판매(U-S34) · 쿠폰·포인트(U-S35).
     8월 결제 건은 9월 회차에 확정되게 앞당긴 것이다(상품 등록일보다는 늦다). */
  "U-R28|2026-08-20 15:10:24|BH731058|chaewon.lim@example.com|returned|택배|21||",
  "U-R29|2026-08-18 11:42:37|KB338806|dain.hong@example.com|returned|택배|21||",
  "U-R30|2026-08-29 19:05:12|AR240729|hajun.seo@example.com|returned|택배|14||",
  "U-R31|2026-08-25 09:33:48|MC447210|bora.hwang@example.com|returned|방문 수령|20||",
  "U-R32|2026-09-01 10:20:15|PR270901|gaeun.yoo@example.com|returned|택배|14||",
  "U-S30|2026-08-05 13:27:41|LS240724|jisung.ahn@example.com|confirmed|택배|||",
  "U-S31|2026-09-21 09:15:20|GJ650283|yuna.choi@example.com|confirmed|택배|||",
  "U-S32|2026-09-22 20:40:05|GJ650283|serin.oh@example.com|confirmed|택배|||",
  "U-S33|2026-09-03 14:55:09|BL240811|taeho.ryu@example.com|delivered|택배|||",
  "U-S34|2026-09-08 16:02:33|HQ240806|yerin.song@example.com|confirmed|택배|||",
  "U-S35|2026-09-10 11:48:56|AS902715|harin.noh@example.com|confirmed|택배|||",
];

/**
 * 결제 단계의 할인 — 일부 처리단위에만 있다(원본도 해시로 일부 건에만 붙인다).
 * 한 결제(주문번호)에 처리단위가 여럿이면 **한 행에만** 둔다 — 같은 할인을 두 번 빼지 않게.
 * 쿠폰은 **셀러 쿠폰(셀러 부담)**, 포인트는 본사 부담이다. 주문 명세와 정산이 이 값을 그대로 읽는다.
 */
const PAY_EXTRAS: Record<string, { coupon?: number; point?: number }> = {
  "U-R09": { coupon: 3000 },
  "U-R11": { point: 2000 },
  "U-S07": { coupon: 5000 },
  "U-S31": { coupon: 5000 },
  "U-S35": { coupon: 10000, point: 3000 },
};

/**
 * 안심케어 가입 건 — `null` 은 가입만(청구 없음).
 * 청구는 반납 검수 뒤에 생긴다(검수완료 → 청구 → 심사, 시연 기준일 전).
 * - 승인 U-R28·U-R29 — 9월 반납·9월 승인 → 2026.09 회차 보전
 * - 접수 U-R18 · 반려 U-R19 — 10월 반납이라 9월 회차와 무관(원본도 접수·반려를 다음 달 종료로 둔다)
 * ⚠️ **기획 확인 필요**: 원본은 접수·반려 건도 보증금이 이미 「전액환급」인데, 반려 안내는
 * 「보증금 차감 판단으로 되돌아갑니다」라고 한다(이미 돌려준 보증금). 사용자 결정 ④로 원본대로 뒀다.
 */
const CARE_SEEDS: Record<string, CareClaim | null> = {
  "U-R09": null,
  "U-R12": null,
  "U-R18": {
    amount: 9000,
    status: "received",
    claimedAt: "2026-10-10 10:30",
    decidedAt: null,
    rejectReason: null,
  },
  "U-R19": {
    amount: 15000,
    status: "rejected",
    claimedAt: "2026-10-14 11:00",
    decidedAt: "2026-10-16 15:20",
    rejectReason:
      "복원 견적서 미첨부 — 수리 업체 견적서를 첨부해 다시 청구해 주세요.",
  },
  "U-R28": {
    amount: 12000,
    status: "approved",
    claimedAt: "2026-09-18 10:00",
    decidedAt: "2026-09-21 10:30",
    rejectReason: null,
  },
  "U-R29": {
    amount: 18000,
    status: "approved",
    claimedAt: "2026-09-16 11:00",
    decidedAt: "2026-09-18 14:00",
    rejectReason: null,
  },
};

/**
 * 반납 검수 판정 — `처리단위 → [판정, 차감액]`. 검수완료·반납완료인데 여기 없으면 「이상없음 · 0원」
 * (원본: 판정 없는 검수완료는 이상없음). 안심케어 가입 + 복원가능 파손은 차감하지 않는다(본사 부담).
 */
const INSPECTION_SEEDS: Record<string, [Inspection, number]> = {
  "U-R18": ["repairable", 0],
  "U-R19": ["repairable", 0],
  "U-R28": ["repairable", 0],
  "U-R29": ["repairable", 0],
  "U-R30": ["unrepairable", 25000],
  "U-R31": ["lost", 40000],
};

/**
 * 클레임 — `처리단위 → [지금 단계, 신청 일시, 신청 사유]`.
 * 거친 단계는 `claimPathOf` 가 지금 단계에서 정하고, 시각은 신청부터 **25시간 간격**의 예시다.
 *
 * - 취소: 모두 **출고 전**이다(송장 없음) — 원본 정책 「발송 후 취소 불가, 반품으로 전환」.
 *   렌트 취소는 **무료 취소 사례만** 둔다(사용자 결정 2026-11-02 — 위약금 20/30%·출고 후 배송비
 *   차감은 원본 FAQ 에만 있고 화면이 계산하지 않는다. 기획 확인 사항)
 * - 반품·교환: 수령 뒤에만 생긴다(원래 단계 = 배송 완료 · 대여중). 교환은 **판매 전용**
 * - 상태마다 최소 한 건 — 클레임 목록의 상태 선택지가 0건으로 끝나지 않게(원본 결함: 환불 처리중 0건)
 */
const CLAIM_SEEDS: Record<string, [ClaimStatus, string, string]> = {
  /* 취소 6 — 렌트·판매 × 3단계 */
  "U-R20": ["cancelRequested", "2026-10-18 09:20", "배송 전 단순변심"],
  "U-R23": ["cancelRefunding", "2026-10-16 18:40", "이용 일정 변경"],
  "U-R24": ["canceled", "2026-10-13 19:10", "주문 실수"],
  "U-S11": ["cancelRequested", "2026-10-17 21:30", "옵션 잘못 선택"],
  "U-S13": ["cancelRefunding", "2026-10-16 16:05", "배송 전 단순변심"],
  "U-S14": ["canceled", "2026-10-10 08:15", "중복 주문"],
  /* 반품 12 — 10단계 각 한 건 (렌트 4 · 판매 6) + 정산 사례 2(완료 U-S30 · 반려 U-S33) */
  "U-R25": ["returnRequested", "2026-10-18 15:20", "사이즈 안맞음"],
  "U-S15": ["returnApproved", "2026-10-14 09:30", "단순변심 (청약철회)"],
  "U-S16": ["returnRejected", "2026-10-16 10:00", "단순변심 (수령 7일 경과)"],
  "U-R21": [
    "returnPicking",
    "2026-10-15 10:30",
    "제품 불량 (등받이 고정 불량)",
  ],
  "U-R26": [
    "returnPicked",
    "2026-10-14 11:00",
    "아이가 사용을 거부해 조기 반납",
  ],
  "U-S17": ["returnInspecting", "2026-10-11 10:00", "파손 배송 (프레임 휨)"],
  "U-S18": ["returnRefunding", "2026-10-08 09:00", "사이즈 안맞음"],
  "U-R27": ["returnDone", "2026-10-08 09:00", "제품 불량 (회전 잠금 고장)"],
  "U-S19": [
    "returnRefused",
    "2026-10-07 10:00",
    "단순변심 (검수 결과 사용 흔적)",
  ],
  "U-S20": [
    "returnResend",
    "2026-10-04 10:00",
    "단순변심 (검수 결과 구성품 훼손)",
  ],
  /* 교환 10 — 판매만, 10단계 각 한 건 */
  "U-S12": [
    "exchangeRequested",
    "2026-10-15 10:00",
    "사이즈 교환 (대형 → 중형)",
  ],
  "U-S21": ["exchangeApproved", "2026-10-16 10:00", "제품 불량 (램프 미점등)"],
  "U-S22": [
    "exchangeRejected",
    "2026-10-13 11:00",
    "단순변심 (교환 불가 상품)",
  ],
  "U-S23": ["exchangePicking", "2026-10-14 10:00", "오배송 (주문과 다른 색상)"],
  "U-S24": ["exchangePicked", "2026-10-10 10:00", "제품 불량 (지퍼 파손)"],
  "U-S25": ["exchangeInspecting", "2026-10-08 10:00", "옵션 변경 요청 (색상)"],
  "U-S26": ["exchangeReshipping", "2026-10-06 09:00", "제품 불량 (전원 불량)"],
  "U-S27": ["exchangeDone", "2026-09-29 09:00", "사이즈 교환"],
  "U-S28": [
    "exchangeRefused",
    "2026-10-02 10:00",
    "단순변심 (검수 결과 사용 흔적)",
  ],
  "U-S29": ["exchangeResend", "2026-09-26 10:00", "단순변심 (검수 결과 오염)"],
  /* 정산 사례 — 8월 회차에 지급된 판매(구매확정 08-14)가 9월에 반품 완료 → 9월 회차 환수 */
  "U-S30": ["returnDone", "2026-09-08 10:00", "제품 불량 (버클 잠김 불량)"],
  /* 정산 사례 — 수거 전 반려로 거래 유지 → 자동 구매확정(09-12)으로 9월 회차 반영 */
  "U-S33": ["returnRejected", "2026-09-06 10:00", "단순변심 (개봉한 위생용품)"],
};

/** 상품을 받아 보낸 뒤의 단계 — 원래 배송 송장이 붙는다(클레임 건도 원래 단계로 본다) */
const SHIPPED: FlowStatus[] = [
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
];

/** 회수가 시작된 렌트 단계 — 수거 송장이 붙는다 */
const PICKED_UP: FlowStatus[] = ["inspecting", "inspected", "returned"];

/** `YYYY-MM-DD HH:mm` 에 시간을 더한다 */
const plusHoursText = (at: string, hours: number) => {
  const time = new Date(at.replace(" ", "T"));
  time.setHours(time.getHours() + hours);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}`;
};

/** 클레임 한 건 — 지금 단계에서 거친 단계를 정하고, 신청부터 25시간 간격으로 시각을 붙인다 */
const claimOf = (id: string): Claim | null => {
  const seed = CLAIM_SEEDS[id];
  if (!seed) return null;
  const [status, requestedAt, reason] = seed;
  return {
    type: claimTypeOf(status),
    status,
    reason,
    fault: faultOf(reason),
    events: claimPathOf(status).map((step, index) => ({
      status: step,
      at: plusHoursText(requestedAt, index * 25),
    })),
  };
};

const PAY_METHODS = ["신용카드", "카드(국민)", "체크카드", "카드(신한)"];

/** 결제수단 — 숫자 합이 7의 배수면 네이버페이(보드 01), 나머지는 카드 4종을 돌린다 */
const payMethodOf = (seed: number) =>
  seed % 7 === 0 ? "네이버페이" : PAY_METHODS[seed % PAY_METHODS.length];

/** 추가 연락처가 있는 처리단위(보드 02) — 각자 다른 결제라 같은 주문번호끼리 어긋나지 않는다 */
const SUB_PHONES: Record<string, string> = {
  "U-R01": "010-9876-5432",
  "U-R02": "010-5544-2211",
  "U-R04": "010-3030-7788",
  "U-S01": "010-7123-4567",
};

/** 주문번호의 숫자 합 — 한 결제의 처리단위들이 **같은 결제수단·주문일시**를 갖게 주문번호로 고른다 */
const orderSeed = (orderNo: string) =>
  [...orderNo].reduce((sum, digit) => sum + Number(digit), 0);
const CARRIERS = ["CJ대한통운", "롯데택배", "한진택배"];

/** `YYYY-MM-DD` 에 일수를 더한다 */
const addDays = (day: string, days: number) => {
  const at = new Date(`${day}T00:00:00`);
  at.setDate(at.getDate() + days);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
};

const toOrder = (row: string, index: number): Order => {
  const [
    id,
    paidAt,
    productId,
    buyerId,
    status,
    shipMethod,
    days,
    memo,
    to,
    qty,
  ] = row.split("|");
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

  const seed = orderSeed(orderNo);

  /* 주문일시는 결제보다 몇 분 앞선다(장바구니 → 결제) — 같은 주문이면 같은 값 */
  const ordered = new Date(paidAt.replace(" ", "T"));
  ordered.setMinutes(ordered.getMinutes() - (3 + (seed % 5)));
  const orderedAt = `${paidAt.slice(0, 10)} ${String(ordered.getHours()).padStart(2, "0")}:${String(ordered.getMinutes()).padStart(2, "0")}`;

  const baseStatus = status as FlowStatus;
  const claim = claimOf(id);
  /* 원래 배송 송장은 **원래 단계**로 정한다 — 클레임 상태로 정하면 반품 건의 송장이 사라진다 */
  const shipped = parcel && SHIPPED.includes(baseStatus);
  /* 수거: 렌트의 반납 회수 + 반품·교환 수거(렌트·판매 모두) */
  const pickedUp =
    parcel &&
    ((isRent && PICKED_UP.includes(baseStatus)) ||
      (claim?.events.some((event) => PICKUP_STARTED.includes(event.status)) ??
        false));

  /* 검수·확정 시각 — 처리 이력의 예시 시각과 **같은 규칙**(이력은 이 값을 그대로 읽는다).
     렌트: 검수완료 = 종료 3일 뒤 11:00 · 반납완료 = 종료 4일 뒤 16:00.
     판매: 출고 결제 다음 날 → 수령 이틀 뒤 13:10 → 7일 뒤 자동 구매확정 = 결제 9일 뒤 13:10 */
  const end = isRent ? addDays(start, rentDays - 1) : "";
  const inspectedAt =
    isRent && (baseStatus === "inspected" || baseStatus === "returned")
      ? `${addDays(end, 3)} 11:00`
      : null;
  const autoConfirmAt = `${addDays(paidAt.slice(0, 10), 9)} 13:10`;
  const claimEnd = claim?.events[claim.events.length - 1].at ?? "";
  const keptAt = claimEnd > autoConfirmAt ? claimEnd : autoConfirmAt;
  const confirmedAt =
    baseStatus === "returned"
      ? `${addDays(end, 4)} 16:00`
      : baseStatus === "confirmed"
        ? autoConfirmAt
        : !isRent &&
            baseStatus === "delivered" &&
            isClaimRefused({ claim }) &&
            keptAt <= `${DEMO_TODAY} 23:59`
          ? keptAt
          : null;
  const extras = PAY_EXTRAS[id] ?? {};
  const careClaim = CARE_SEEDS[id];
  const [inspection, deduction]: [Inspection | null, number] = INSPECTION_SEEDS[
    id
  ] ?? [inspectedAt ? "ok" : null, 0];

  return {
    id,
    orderNo,
    status: claim?.status ?? baseStatus,
    baseStatus,
    claim,
    type: product.mode,
    sellerKind: product.source === "hq" ? "hq" : "seller",
    seller: product.seller,
    period: isRent ? `${start} ~ ${end}` : "",
    payMethod: payMethodOf(seed),
    date: paidAt.slice(0, 16),
    shipMethod,
    carrier: shipped ? carrier : "",
    trackingNo: shipped ? "5" + orderNo.slice(1, 12) : "",
    pickupCarrier: pickedUp ? carrier : "",
    pickupTrackingNo: pickedUp ? "6" + orderNo.slice(2, 13) : "",
    productCode: product.id,
    productName: product.name,
    rentBasePrice: isRent ? (product.rentBase ?? 0) : null,
    rentDiscount: isRent ? (product.rentDiscount ?? 0) : null,
    rentDays: isRent ? rentDays : null,
    deposit: isRent ? (product.deposit ?? 0) : null,
    saleBasePrice: isRent ? null : (product.saleBase ?? 0),
    saleDiscount: isRent ? null : (product.saleDiscount ?? 0),
    qty: Number(qty) || 1,
    shipFee: product.shipFee,
    returnFee: product.returnFee,
    exchangeFee: product.exchangeFee,
    buyerName: buyer.name,
    buyerId: buyer.id,
    buyerPhone: buyer.phone,
    receiver,
    receiverPhone,
    receiverSubPhone: SUB_PHONES[id] ?? null,
    address: buyer.address,
    shipMemo: memo,
    orderedAt,
    coupon: extras.coupon ?? 0,
    point: extras.point ?? 0,
    care: careClaim === undefined ? null : { fee: CARE_FEE, claim: careClaim },
    inspection,
    deduction,
    inspectedAt,
    confirmedAt,
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

/**
 * 판매자 셀렉트 — 원본의 판매자 라디오(전체·본사·셀러)와 셀러 지정을 **셀렉트 하나로 합쳤다**
 * (사용자 결정 2026-10-19 — 검색조건 줄에서 라디오만 모양이 달라 튀고, 잠긴 셀러 칸이 하나 더
 * 끼었다). 값: `all` 전체 · `hq` 본사 · `seller` 셀러 전체 · 그 밖은 **셀러명**.
 * 셀러명은 **주문 샘플에 나오는 셀러에서 뽑는다**(손으로 적으면 샘플과 어긋난다).
 */
export const SELLER_ALL = "all";
export const SELLER_HQ = "hq";
export const SELLER_ANY = "seller";

const SELLER_NAMES = [
  ...new Set(
    ORDERS.filter((order) => order.sellerKind === "seller").map(
      (order) => order.seller,
    ),
  ),
].sort((a, b) => a.localeCompare(b, "ko"));

export const SELLER_OPTIONS: SelectOption[] = [
  { value: SELLER_ALL, label: "판매자 전체" },
  { value: SELLER_HQ, label: "본사" },
  { value: SELLER_ANY, label: "셀러 전체" },
  ...SELLER_NAMES.map((name) => ({ value: name, label: name })),
];

/** 판매자 셀렉트 값에 이 행이 드는가 */
export const matchesSeller = (order: Order, value: string) =>
  value === SELLER_ALL ||
  (value === SELLER_HQ
    ? order.sellerKind === "hq"
    : value === SELLER_ANY
      ? order.sellerKind === "seller"
      : order.seller === value);

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

/**
 * `대여중` → `renting`. **정상 흐름의 선택지에서만** 뒤집는다 — 클레임 라벨(환불 처리중·재반송)은
 * 유형마다 키가 달라 한데 뒤집으면 덮이고, 주문 목록에서 고를 수도 없는 숨은 필터가 된다.
 */
const STATUS_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.values(STATUS_OPTIONS_BY_TYPE)
    .flat()
    .filter((option) => option.value !== "all")
    .map((option) => [option.label, option.value]),
);

/** 뼈대가 들고 있는 조회 조건 한 덩어리 */
export interface OrderFilters {
  type: OrderType;
  /** 판매자 셀렉트 값 — `SELLER_OPTIONS` 참고 */
  seller: string;
  status: string;
  searchField: OrderSearchField;
  keyword: string;
  period?: DateRange;
}

/** "초기화"가 되돌아가는 자리 — 렌트, 나머지는 전부 해제 */
export const EMPTY_FILTERS: OrderFilters = {
  type: DEFAULT_TYPE,
  seller: SELLER_ALL,
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

  /* `owner=셀러` 일 때만 셀러명을 본다 — 모르는 셀러명이면 "셀러 전체"로 */
  const owner = params.get("owner");
  const sellerName = params.get("sellerName") ?? "";
  const seller =
    owner === "본사"
      ? SELLER_HQ
      : owner === "셀러"
        ? SELLER_NAMES.includes(sellerName)
          ? sellerName
          : SELLER_ANY
        : SELLER_ALL;

  const from = parseDay(params.get("paidAt_from"));
  const to = parseDay(params.get("paidAt_to"));

  return {
    type,
    status: validStatus,
    seller,
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
  if (filters.seller !== SELLER_ALL) {
    parts.push(
      SELLER_NAMES.includes(filters.seller)
        ? `셀러 ${filters.seller}`
        : labelOf(SELLER_OPTIONS, filters.seller),
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

/**
 * 금액 포맷. 단위가 도메인이라 여기 둔다.
 * ⚠️ 천 단위 구분자는 **쉼표 고정**.
 */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/** 렌트 단가 표기 — 상품 관리 목록과 같은 `원/일` */
export const perDay = (value: number) => won(value) + "/일";

/** 결제 일시 표기 — 점 표기, 분까지 (`2026.10.18 14:32`) */
export const ymdhm = (dateText: string) =>
  dateText.slice(0, 16).replace(/-/g, ".");

/** 이용 기간 표기 — 점 표기 (`2026.10.22 ~ 2026.11.04`) */
export const periodText = (period: string) => period.replace(/-/g, ".");

/** 한 페이지 행 수 — 원본 `DEFAULT_PAGE_SIZE` 와 같은 10, 고를 수 있는 크기 4종 */
export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];
