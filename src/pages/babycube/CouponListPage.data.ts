import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S17 쿠폰 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `CouponListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 화면 유형: **목록형** (`OrderListPage` 계열 — `docs/screen-templates.md` §3-1)
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할                     | 실물 이름                          |
 * | ------------------------ | ---------------------------------- |
 * | 표 한 행의 타입          | `Coupon`                           |
 * | 상태 → 라벨·톤           | `STATUS_META` · `couponStatus`     |
 * | 상태 요약 대시           | `DASHES`                           |
 * | 샘플 데이터              | `COUPONS`                          |
 * | 값 없음의 표기           | `conditionText` · `periodParts`    |
 * | 수치 포맷                | `won` · `num` · `count` · `ymd`    |
 * | 페이지당 행 수           | `PAGE_SIZE`                        |
 *
 * ## 그대로 두는 것
 * 이 파일에는 JSX·클래스·색이 없다. 라벨과 값만 둔다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(`YYYY-MM-DD HH:mm`) 를 갖는다
 * - `STATUS_META` 의 키는 `CouponStatus` 와 정확히 일치한다
 * - `DASHES[]` 는 `STATUS_META` 의 **키만** 들고 있다 — 라벨·톤은 그쪽에서 가져오므로
 *   여기에 다시 적지 않는다(두 곳에 적으면 하나만 고쳐 어긋난다)
 * - `conditionText` 는 `{ text, unset }` 을, `periodParts` 는 `{ lead, tail, tailMuted }` 를
 *   돌려준다. `unset`·`tailMuted` 가 `true` 일 때만 뼈대가 글자를 `text-minimal` 로 낮춘다
 *   ("조건 없음"·"기한 없음"·"상시"는 **결측이 아니라 의미 있는 상태**라 빈칸으로 두지 않는다)
 *
 * ## 원본 어드민 대조 (`_plan/babycube-admin/chunks/2kq5rs018or94.js` 모듈 32262)
 * 원본 컬럼 정의(`o = [...]`)는 **7열**이다 —
 * `sellerName 셀러명` · `name 쿠폰명` · `content 내용` · `cond 조건` · `period 기간` ·
 * `issuedOn 발행일` · `status 상태`. 우리 표가 이 순서 그대로다.
 *
 * ### ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 원본 페이지 컴포넌트는 공용 목록 셸(`20013`)에 이렇게 넘긴다:
 * ```js
 * { api: couponsApi, columns: o, filter: c, defaultStat: "",
 *   rowKey: e => e.id, exportName: "쿠폰관리" }
 * ```
 * 그리고 바로 윗줄이 `c = {}` 다.
 * **`filter` 가 빈 객체다.** 즉 이 화면에는 검색 축이 하나도 없다 —
 * 기간·검색어·유형 어느 것도 원본에 없다. 한때 이 파일에는 `ISSUER_FILTERS`(발행 주체
 * 라디오) · `DISCOUNT_TYPES`(할인 유형 체크박스) · `SEARCH_FIELDS` · `QUICK_PERIODS` ·
 * `presetRange` · `searchHaystack` · `PILL_LABELS` 가 있었는데 **전부 발명**이라 지웠다.
 * 좁히는 수단은 상태 대시(`DASHES`) 하나뿐이고, 그것이 원본의 `StatDash` 다.
 *
 * `COPY_TOAST`("쿠폰 코드를 복사했습니다")도 지웠다 — 원본 쿠폰 레코드에 **코드 필드가
 * 아예 없다**(sellerName·name·discountType·discountValue·maxDiscountAmount·
 * minOrderAmount·startOn·endOn·issuedOn·status 가 전부다). 없는 필드를 복사하는
 * 버튼이었다.
 *
 * ### 상태를 저장하지 않고 **날짜에서 파생**하는 이유
 * 원본 `status` 는 API 가 주는 값이라 청크에 목록이 없다. 우리는 기간과 같은
 * 값(`startsOn`·`endsOn`)에서 계산해 **두 열이 정의상 모순될 수 없게** 만든다.
 * 날짜로 알 수 없는 것은 운영자가 중단시킨 `suspended` 하나뿐이라 그것만 데이터로 든다.
 * 어휘는 원본 전역 배지 맵(`15312`)에 실제로 있는 단어만 골랐다 —
 * `발행대기` · `발행완료` · `만료` · `정지`.
 *
 * ### 상태 색 배정 (§3-1 로 다시 판단 — 원본 색은 쓰지 않는다)
 * 원본은 `발행대기 b-prog` · `발행완료 b-done` · `만료 b-done` · `정지 b-exc` 로 칠한다.
 * 우리 규칙으로 다시 판단하면:
 * - `issued`(발행완료) = **진행 중이고 정상** → `success` (§3-1 항목 4)
 * - `scheduled`(발행대기) = 시작일이 오면 자동으로 시작된다. 사람이 할 일이 없으므로
 *   `warning` 이 아니다 → `default`
 * - `expired`(만료) = 제대로 끝난 일 → `default` (§3-1 항목 3)
 * - `suspended`(정지) = 운영자가 중간에 끊은 **비정상 종료** → `critical` (§3-1 항목 2)
 * ---------------------------------------------------------------------- */

/** 할인 방식 — 원본 어휘 그대로 "정률" / "원 할인" */
export type DiscountType = "rate" | "amount";

/** 쿠폰 상태 — `suspended` 외에는 기간에서 파생한다(`couponStatus`) */
export type CouponStatus = "scheduled" | "issued" | "expired" | "suspended";

export interface Coupon {
  /** 고유 키 — 뼈대가 행 key 로 쓴다 (원본 `rowKey: e => e.id`) */
  id: string;
  name: string;
  /**
   * 셀러명. 본사 발행이면 `null`.
   * 원본에도 발행 주체 필드가 따로 없다 — `sellerName` 이 비었으면 본사 발행이다.
   */
  seller: string | null;
  discountType: DiscountType;
  /** 정률이면 %, 정액이면 원 */
  discountValue: number;
  /** 정률 쿠폰의 최대 할인 한도(원). 한도가 없으면 `null` */
  discountMax: number | null;
  /** 최소 주문 금액(원). `null` 이면 **조건 없음** */
  minOrderAmount: number | null;
  /** 사용 시작일 `YYYY-MM-DD`. `null` 이면 **상시**(기간 제한 없음) */
  startsOn: string | null;
  /** 사용 종료일. `null` 이면 **기한 없음** */
  endsOn: string | null;
  /**
   * 운영자가 중간에 끊었는가. 기간으로는 알 수 없는 **유일한** 상태라
   * 이것만 데이터로 든다 — 나머지는 `couponStatus()` 가 날짜에서 계산한다.
   */
  suspended: boolean;
  /** 발행일시 `YYYY-MM-DD HH:mm`. 표에는 `ymd` 로 날짜만 낸다(원본 `issuedOn`) */
  date: string;
}

/**
 * 본사 발행 쿠폰의 셀러 열 표기.
 *
 * 원본은 이 자리를 `sellerName || "-"` 로 비운다. 빈 대시는 "셀러 정보가 없다"로
 * 읽혀 본사 발행이라는 사실이 화면에서 사라지므로 낱말을 채웠다.
 * `본사` 는 원본 다른 화면(상품 목록의 판매자 열)이 쓰는 어휘라 지어낸 말이 아니다.
 * **배지로 칠하지는 않는다** — 본사↔셀러는 대등한 분류다(§3-1 분류 배지).
 */
export const HQ_LABEL = "본사";

/** 상태 대시·모달에 쓰는 단위 */
export const COUPON_UNIT = "건";

/** 상태값 → 표시 라벨과 Tag tone. 키는 `CouponStatus` 와 일치해야 한다 */
export const STATUS_META: Record<
  CouponStatus,
  { label: string; tone: TagTone }
> = {
  scheduled: { label: "발행대기", tone: "default" },
  issued: { label: "발행완료", tone: "success" },
  expired: { label: "만료", tone: "default" },
  suspended: { label: "정지", tone: "critical" },
};

/**
 * 상태 요약 대시에 놓을 순서 — 쿠폰의 생애주기 순이다.
 *
 * **건수를 여기 적지 않는다.** 뼈대가 현재 목록에서 세므로 목록과 대시가 어긋날 수 없다.
 * 증감(전주 대비 등)도 붙이지 않는다 — 원본 `StatDash` 는 `{ value, label, count }` 만
 * 받아 **건수만** 보여준다.
 *
 * ⚠️ `전체` 카드는 두지 않는다. 원본 카드 목록은 `api.statusCounts()` 가 주는 값이라
 * 청크에서 확인할 수 없어(**값 출처 불명**), 없는 카드를 지어내는 대신 카드를 다시 눌러
 * 해제하는 방식으로 뒀다.
 */
export const DASHES: CouponStatus[] = [
  "scheduled",
  "issued",
  "expired",
  "suspended",
];

export const COUPONS: Coupon[] = [
  {
    id: "CP-2026-0151",
    name: "9월 신학기 유아식탁 15% 쿠폰",
    seller: null,
    discountType: "rate",
    discountValue: 15,
    discountMax: 25000,
    minOrderAmount: 80000,
    startsOn: "2026-09-01",
    endsOn: "2026-09-30",
    suspended: false,
    date: "2026-08-24 15:10",
  },
  {
    id: "CP-2026-0142",
    name: "여름맞이 전 품목 10% 쿠폰",
    seller: null,
    discountType: "rate",
    discountValue: 10,
    discountMax: 20000,
    minOrderAmount: 50000,
    startsOn: "2026-08-01",
    endsOn: "2026-08-31",
    suspended: false,
    date: "2026-08-24 09:00",
  },
  {
    id: "CP-2026-0141",
    name: "첫 대여 3천원 할인",
    seller: "아이몽컴퍼니",
    discountType: "amount",
    discountValue: 3000,
    discountMax: null,
    minOrderAmount: null,
    startsOn: "2026-08-20",
    endsOn: null,
    suspended: false,
    date: "2026-08-20 14:20",
  },
  {
    id: "CP-2026-0138",
    name: "유모차 카테고리 15% 쿠폰",
    seller: "베이비루션",
    discountType: "rate",
    discountValue: 15,
    discountMax: 30000,
    minOrderAmount: 100000,
    startsOn: "2026-08-18",
    endsOn: "2026-09-17",
    suspended: false,
    date: "2026-08-18 11:05",
  },
  {
    id: "CP-2026-0136",
    name: "베베팜 단독 2만원 쿠폰",
    seller: "베베팜",
    discountType: "amount",
    discountValue: 20000,
    discountMax: null,
    minOrderAmount: 150000,
    startsOn: "2026-08-15",
    endsOn: "2026-09-14",
    /* 기간은 아직 남았지만 운영자가 끊었다 — 날짜로는 알 수 없는 유일한 상태 */
    suspended: true,
    date: "2026-08-15 13:00",
  },
  {
    id: "CP-2026-0129",
    name: "재구매 감사 5천원 쿠폰",
    seller: null,
    discountType: "amount",
    discountValue: 5000,
    discountMax: null,
    minOrderAmount: 30000,
    startsOn: "2026-08-11",
    endsOn: "2026-08-25",
    suspended: false,
    date: "2026-08-11 10:00",
  },
  {
    id: "CP-2026-0117",
    name: "신규 회원 상시 5% 쿠폰",
    seller: "쿠쿠베베",
    discountType: "rate",
    discountValue: 5,
    discountMax: null,
    minOrderAmount: null,
    /* 시작일이 없으면 **상시** — 원본 기간 열의 세 번째 분기다 */
    startsOn: null,
    endsOn: null,
    suspended: false,
    date: "2026-07-30 16:40",
  },
  {
    id: "CP-2026-0098",
    name: "여름 특가 1만원 쿠폰",
    seller: null,
    discountType: "amount",
    discountValue: 10000,
    discountMax: null,
    minOrderAmount: 200000,
    startsOn: "2026-06-15",
    endsOn: "2026-06-30",
    suspended: false,
    date: "2026-06-15 09:30",
  },
];

/**
 * 샘플 데이터의 **기준일**. 상태 파생이 이 날짜에서 계산된다.
 *
 * 실서비스로 이식하면 서버가 준 `status` 를 그대로 쓴다. 샘플은 날짜가 고정돼 있어
 * 실제 오늘을 쓰면 시간이 지날수록 모든 쿠폰이 만료로 굳는다.
 */
export const REFERENCE_TODAY = "2026-08-24";

/**
 * 쿠폰 상태를 **기간에서 파생**한다. 기간 열과 상태 열이 같은 값에서 나오므로
 * 두 열이 서로 다른 말을 할 수 없다.
 *
 * `YYYY-MM-DD` 는 사전순 비교가 곧 날짜 비교라 `Date` 로 바꾸지 않는다.
 */
export const couponStatus = (
  coupon: Coupon,
  today: string = REFERENCE_TODAY,
): CouponStatus => {
  if (coupon.suspended) return "suspended";
  if (coupon.startsOn !== null && today < coupon.startsOn) return "scheduled";
  if (coupon.endsOn !== null && today > coupon.endsOn) return "expired";
  return "issued";
};

/** 표의 주요 수치 포맷. 천 단위 구분자는 **쉼표** (§3-1) */
export const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/** 건수 포맷 — 대시의 수치는 값과 단위를 따로 그리므로 숫자만 돌려준다 */
export const num = (value: number) => value.toLocaleString("ko-KR");

/** 건수 + 단위. 접근가능 이름처럼 **한 문자열이어야 하는 자리**에 쓴다 */
export const count = (value: number) => `${num(value)}${COUPON_UNIT}`;

/**
 * 날짜 표기 — **날짜만, 점 구분자**로 낸다.
 *
 * 원본 공용 포맷터를 그대로 옮긴 것이다(모듈 32916):
 * `e => e ? e.slice(0, 10).replace(/-/g, ".") : "-"`.
 * 발행일 열과 기간 열이 **같은 이 함수**를 쓴다 — 원본도 그렇다.
 */
export const ymd = (dateTimeText: string) =>
  dateTimeText.slice(0, 10).replace(/-/g, ".");

/**
 * 할인 내용 — 원본과 같은 두 조각이다.
 * `note`(최대 한도)는 부가 정보라 뼈대가 농도를 낮춰 그린다(원본 `muted`).
 */
export const discountParts = (coupon: Coupon) => {
  if (coupon.discountType === "rate") {
    return {
      main: `${coupon.discountValue}% 할인`,
      note:
        coupon.discountMax === null
          ? null
          : `(최대 ${won(coupon.discountMax)})`,
    };
  }
  return { main: `${won(coupon.discountValue)} 할인`, note: null };
};

/** 모달용으로 두 조각을 이어 붙인 한 줄 */
export const discountText = (coupon: Coupon) => {
  const { main, note } = discountParts(coupon);
  return note === null ? main : `${main} ${note}`;
};

/**
 * 적용 조건. **비어 있는 것도 의미다** — 최소 주문 금액이 없는 쿠폰은
 * "미입력"이 아니라 "조건 없이 쓸 수 있는 쿠폰"이다(원본 어휘 "조건 없음").
 * `unset` 을 함께 돌려주어 뼈대가 글자 농도를 낮춰 구별하게 한다.
 */
export const conditionText = (coupon: Coupon) =>
  coupon.minOrderAmount === null
    ? { text: "조건 없음", unset: true }
    : { text: `${won(coupon.minOrderAmount)} 이상 구매`, unset: false };

/**
 * 사용 기간 — 원본 기간 열의 **세 분기**를 그대로 옮겼다.
 * | 데이터                  | 표기                             |
 * | ----------------------- | -------------------------------- |
 * | 시작일 없음             | `상시` (전체 농도 낮춤)          |
 * | 시작일만 있음           | `2026.08.20 ~ ` + `기한 없음`    |
 * | 둘 다 있음              | `2026.08.18 ~ 2026.09.17`        |
 *
 * 날짜는 발행일 열과 **같은 `ymd`** 로 찍는다(원본도 기간 열에서 `ymd` 를 부른다).
 * 농도를 낮추는 것은 **꼬리(`tail`)뿐**이다 — 시작일은 실제 값이라 그대로 둔다.
 */
export const periodParts = (coupon: Coupon) => {
  if (coupon.startsOn === null) {
    return { lead: "", tail: "상시", tailMuted: true };
  }
  if (coupon.endsOn === null) {
    return {
      lead: `${ymd(coupon.startsOn)} ~ `,
      tail: "기한 없음",
      tailMuted: true,
    };
  }
  return {
    lead: `${ymd(coupon.startsOn)} ~ `,
    tail: ymd(coupon.endsOn),
    tailMuted: false,
  };
};

/** 모달용으로 이어 붙인 한 줄 */
export const periodText = (coupon: Coupon) => {
  const { lead, tail } = periodParts(coupon);
  return `${lead}${tail}`;
};

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 원본 `DEFAULT_PAGE_SIZE` 지만 **샘플이 8건뿐이라 페이징 동작이
 * 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 4;
