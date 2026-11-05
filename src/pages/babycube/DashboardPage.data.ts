import type { ChartSeries } from "../../components/ui";
import {
  DEFAULT_FILTER as MEMBER_DEFAULT_FILTER,
  MEMBERS,
} from "./MemberListPage.data";
import { payTotalOf } from "./OrderDetailPage.data";
import {
  DEMO_TODAY,
  ORDERS,
  type Order,
  type OrderStatus,
  type OrderType,
} from "./OrderListPage.data";
import { LISTED_PRODUCTS } from "./ProductListPage.data";
import {
  DEFAULT_FILTER as SELLER_DEFAULT_FILTER,
  SELLERS,
} from "./SellerListPage.data";
import { APPLICATIONS, REVIEWABLE_STATUS } from "./SellerReviewPage.data";
import { SETTLEMENT_SUMMARY } from "./settlement.data";

/* -------------------------------------------------------------------------
 * S01 대시보드 (BabyCube 본사 운영 어드민) — 통계형 화면의 **도메인 층**
 *
 * 짝이 되는 뼈대: `DashboardPage.tsx` (레이아웃·차트 조립, 도메인 무관)
 *
 * ## ⚠️ 숫자를 손으로 적지 않는다 — 전부 샘플에서 파생한다
 *
 * 원본도 대시보드의 모든 수치를 기존 배열에서 센다(proto.html:3060 「모든 수치는 기존 배열에서 파생」).
 * 여기서 숫자를 적어 두면 타일을 눌러 간 목록과 숫자가 어긋난다(실제로 회원 12,847 → 목록 30 이었다).
 * (옛 예외 「오늘 방문자」 시드 상수 54 는 판정 Q19 로 「이번 달 가입자」(가입일 기준)가 되어 없어졌다.)
 *
 * ## 갈아끼울 것 (이 파일 전체)
 *
 * | 실물 이름                  | 역할                                                     |
 * | -------------------------- | -------------------------------------------------------- |
 * | `METRIC_GROUPS`              | 지표 — **3그룹 × 3장 = 9장**. 그룹 카드 제목 = `title`      |
 * | `PERIODS` · `DEFAULT_PERIOD` | 차트별 기간 세그먼트 (1주/1개월/3개월 · 기본 1개월)    |
 * | `ORDER_COUNT_TREND`        | 결제 건수 일별 추이 (기간 → 행 배열)                    |
 * | `REVENUE_TREND`            | 결제 금액 일별 추이                                      |
 * | `*Totals` · `*SeriesTotals` | 기간 합계 · 계열(칩) 합계 — 같은 원자료 · 같은 날짜 창 |
 * | `TICK_EVERY`               | x축 눈금 간격(1주 매일 · 1개월 5일 · 3개월 15일)         |
 * | `RENT_FUNNEL` · `SALE_FUNNEL` | 흐름 4단계 · 건수                                     |
 * | `count` · `won` · `num` · `shortDay` | 단위·날짜 포맷                                 |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `METRIC_GROUPS[].metrics` 는 **그룹마다 정확히 3장** — 뼈대가 그룹을 `grid-cols-3` 한 줄에 깐다
 * - `metrics[].navId` 는 **있을 때만** 그 타일이 링크가 된다(원본 `go`)
 * - 추이 행은 `{ label, rent, sale }` — `label` 은 **연도 포함 점 표기**(`2026.10.15`).
 *   툴팁 제목이 이 값을 그대로 쓰고, 축은 `shortDay` 로 줄여 그린다
 * - `TREND_SERIES[].key` 는 추이 행의 속성 이름(`rent`·`sale`)과 정확히 일치해야 한다
 * - 차트 배열에는 **타입을 새로 달지 않는다** — `ChartDatum` 에 암묵적 index signature 로 대입된다
 * ---------------------------------------------------------------------- */

/* =========================================================================
 * 1. 기간 세그먼트
 * ====================================================================== */

export type PeriodValue = "1w" | "1m" | "3m";

/** 차트 카드마다 하나씩 붙는 기간 세그먼트 (원본 `PERIODS` — proto.html:2992) */
export const PERIODS = [
  { value: "1w", label: "1주" },
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
];

/** 기간 → 기준일 포함 날짜 수 (원본 `[[7,'1주'],[30,'1개월'],[90,'3개월']]`) */
const PERIOD_DAYS: Record<PeriodValue, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
};

/**
 * x축 눈금 간격(일) — 원본 `lblStep` (proto.html:3013). **끝(기준일)에서 거꾸로** 센다 —
 * 원본은 첫날부터 세어 마지막 날 눈금이 없었다. 기준일이 눈에 보여야 「오늘까지」로 읽힌다.
 */
export const TICK_EVERY: Record<PeriodValue, number> = {
  "1w": 1,
  "1m": 5,
  "3m": 15,
};

/** 뼈대의 `useState` 초기값. **반드시 `PERIODS[].value` 중 하나** (원본 `DASH_PERIOD` 30일) */
export const DEFAULT_PERIOD: PeriodValue = "1m";

/** SegmentedControl 은 `string` 을 돌려주므로 값 비교로 좁힌다(캐스팅 없이) */
export const asPeriod = (value: string): PeriodValue =>
  value === "1w" ? "1w" : value === "3m" ? "3m" : "1m";

/* =========================================================================
 * 2. 총 매출 현황 — 결제 기준 일별 추이 (원본 `salesDaily` — proto.html:2983)
 *
 * ## 집계 계약 (GPT 검토 `dash-gpt-review.md` §2 — 바꾸지 말 것)
 * - **결제 = 주문번호**(`orderNo`). 처리단위가 여럿인 결제를 여러 번 세지 않는다
 * - 렌트 계열 = 렌트 처리단위를 **포함한** 결제 수 · 판매도 같다.
 *   렌트와 판매는 한 번에 결제되지 않아(디자인 §3 #19 · `DM` #23) 칩 합 = 기간 합계(전체 = 고유 결제 수).
 *   계산은 혼합 결제가 와도 양쪽에 한 번씩 세는 규칙 그대로다
 * - 금액 = 처리단위별 `payTotalOf`(주문 상세 「결제금액」과 같은 함수) 합. 보증금 제외 ·
 *   취소·반품 상태여도 결제 기록을 지우거나 환불을 빼지 않는다(순매출 차트가 아니다)
 * - 기준일 = `DEMO_TODAY`(시연 기준일) 포함 7/30/90일 **연속** — 결제가 없는 날도 0 으로 채운다
 * - 원 단위로 보관하고 표시 단계에서만 쉼표·단위를 붙인다
 * ====================================================================== */

/** 날짜 키 `YYYY-MM-DD` — 결제 일시(`YYYY-MM-DD HH:mm`)의 앞 10자와 같은 꼴 */
const dayKey = (at: Date) =>
  `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;

/** 기준일 포함 n일의 날짜 키(오래된 순). 로컬 날짜로 만든다 — `toISOString` 은 UTC 라 하루 밀린다 */
export function windowDays(n: number, today = DEMO_TODAY): string[] {
  const [y, m, d] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) =>
    dayKey(new Date(y, m - 1, d - (n - 1 - i))),
  );
}

/** `2026-10-15` → `2026.10.15` (날짜 점 표기 — 사용자 결정) */
const dotDay = (key: string) => key.replace(/-/g, ".");

/** 축 눈금용 `2026.10.15` → `10.15`. 툴팁·접근 설명은 연도를 남긴다 */
export const shortDay = (label: string | number) => String(label).slice(5);

/** 결제 하나 — 처리단위를 주문번호로 묶은 것 */
export interface Payment {
  orderNo: string;
  day: string;
  hasRent: boolean;
  hasSale: boolean;
  rentAmount: number;
  saleAmount: number;
}

/** 처리단위 → 결제. 결제일은 처리단위들이 공유한다(같은 주문번호 = 같은 결제 일시) */
export function paymentsOf(orders: readonly Order[]): Payment[] {
  const byNo = new Map<string, Payment>();
  for (const order of orders) {
    const pay = byNo.get(order.orderNo) ?? {
      orderNo: order.orderNo,
      day: order.date.slice(0, 10),
      hasRent: false,
      hasSale: false,
      rentAmount: 0,
      saleAmount: 0,
    };
    const amount = payTotalOf(order);
    if (order.type === "rent") {
      pay.hasRent = true;
      pay.rentAmount += amount;
    } else {
      pay.hasSale = true;
      pay.saleAmount += amount;
    }
    byNo.set(order.orderNo, pay);
  }
  return [...byNo.values()];
}

const PAYMENTS = paymentsOf(ORDERS);

/** 한 기간의 일별 행 + 합계. 시계열과 합계를 **같은 원자료 · 같은 날짜 창**에서 만든다 */
export function trendOf(payments: readonly Payment[], days: readonly string[]) {
  const inDay = (day: string) => payments.filter((p) => p.day === day);
  const count = days.map((day) => {
    const ps = inDay(day);
    return {
      label: dotDay(day),
      rent: ps.filter((p) => p.hasRent).length,
      sale: ps.filter((p) => p.hasSale).length,
    };
  });
  const revenue = days.map((day) => {
    const ps = inDay(day);
    return {
      label: dotDay(day),
      rent: ps.reduce((sum, p) => sum + p.rentAmount, 0),
      sale: ps.reduce((sum, p) => sum + p.saleAmount, 0),
    };
  });
  const inWindow = payments.filter((p) => days.includes(p.day));
  const sumOf = (rows: { rent: number; sale: number }[]) => ({
    rent: rows.reduce((sum, row) => sum + row.rent, 0),
    sale: rows.reduce((sum, row) => sum + row.sale, 0),
  });
  const revenueSeries = sumOf(revenue);
  return {
    count,
    revenue,
    /** 고유 결제 수 — 계열 합이 아니다(혼합 결제) */
    countTotal: inWindow.length,
    countSeries: sumOf(count),
    /** 금액은 처리단위별이라 계열 합 = 전체 */
    revenueTotal: revenueSeries.rent + revenueSeries.sale,
    revenueSeries,
  };
}

const TRENDS = {
  "1w": trendOf(PAYMENTS, windowDays(PERIOD_DAYS["1w"])),
  "1m": trendOf(PAYMENTS, windowDays(PERIOD_DAYS["1m"])),
  "3m": trendOf(PAYMENTS, windowDays(PERIOD_DAYS["3m"])),
};

const byPeriod = <T>(pick: (trend: (typeof TRENDS)["1m"]) => T) => ({
  "1w": pick(TRENDS["1w"]),
  "1m": pick(TRENDS["1m"]),
  "3m": pick(TRENDS["3m"]),
});

/** 결제 건수 일별 추이 — 기간 → 행 배열 */
export const ORDER_COUNT_TREND = byPeriod((t) => t.count);
/** 결제 금액(원) 일별 추이 */
export const REVENUE_TREND = byPeriod((t) => t.revenue);
export const orderCountTotals = byPeriod((t) => t.countTotal);
export const revenueTotals = byPeriod((t) => t.revenueTotal);

/**
 * 계열별 기간 합계 — 차트 헤더의 계열 토글 칩("렌트 24건")이 쓴다.
 *
 * ⚠️ **원본 v0.4 에 없는 숫자다**(원본은 전사 단일 계열 · 합계 없음, proto.html:3081~3084).
 * 칩과 기간 합계는 사용자 결정(2026-09-18 · 2026-11-03 유지)으로 둔 예외다.
 * 렌트와 판매는 한 번에 결제되지 않아 건수 칩 합이 기간 합계와 같다(디자인 §3 #19).
 */
export const orderCountSeriesTotals = byPeriod((t) => t.countSeries);
export const revenueSeriesTotals = byPeriod((t) => t.revenueSeries);

/** 칩 아래 한 줄 — 무엇을 셌는지(디자인 §3 #19) */
export const COUNT_NOTE = "결제 기준";
export const REVENUE_NOTE = "결제금액 기준 · 보증금 제외";

/** 기간 → `2026.09.20~2026.10.19` (접근 설명용 — 연도 포함) */
export const periodRangeText = (period: PeriodValue) => {
  const days = windowDays(PERIOD_DAYS[period]);
  return `${dotDay(days[0])}~${dotDay(days[days.length - 1])}`;
};

/**
 * 두 차트가 공유하는 계열. `key` 는 추이 행의 속성 이름과 정확히 일치한다.
 * 계열이 2개라 뼈대가 **범례(칩)를 반드시 붙인다**.
 */
export const TREND_SERIES: ChartSeries[] = [
  { key: "rent", label: "렌트" },
  { key: "sale", label: "판매" },
];

/* =========================================================================
 * 3. 상태 흐름 — 원본 `uFlow` (proto.html:2977)
 *
 * **주문 목록과 같은 유형 · 현재 상태**로 센다 — 단계를 누르면 그 필터로 주문 목록이 열리고
 * 거기 보이는 건수와 같아야 한다. 대여중(연장)·연체중을 대여중에 더하지 않는다(다른 상태다).
 * 네 단계의 합은 전체 주문 수가 아니다 — 비중 막대·진행률의 근거로 쓰지 않는다.
 * ====================================================================== */

export type FunnelStep = {
  /** 주문 목록의 상태 값 — 건수도 이것으로 센다 */
  value: OrderStatus;
  label: string;
  count: number;
};

const stepOf = (
  type: OrderType,
  value: OrderStatus,
  label: string,
): FunnelStep => ({
  value,
  label,
  count: ORDERS.filter((o) => o.type === type && o.status === value).length,
});

/** 렌트 4단계 — 원본 순서 그대로(proto.html:3111) */
export const RENT_FUNNEL: FunnelStep[] = [
  stepOf("rent", "new", "신규 주문"),
  stepOf("rent", "renting", "대여중"),
  stepOf("rent", "inspecting", "검수중"),
  stepOf("rent", "returned", "반납완료"),
];

/** 판매 4단계 — 원본 순서 그대로(proto.html:3113) */
export const SALE_FUNNEL: FunnelStep[] = [
  stepOf("sale", "new", "신규 주문"),
  stepOf("sale", "ready", "배송 준비"),
  stepOf("sale", "delivered", "배송 완료"),
  stepOf("sale", "confirmed", "구매확정"),
];

/**
 * 흐름 단계가 여는 화면 — 주문 목록. `?stat=<유형>&flow=<단계>` 로 유형·상태를 건다
 * (주문 목록 `filtersFromQuery`). ⚠️ GNB 부모 항목 id 와 헷갈리지 말 것(`gnbSections.tsx`).
 */
export const ORDERS_NAV_ID = "/orders-all";

/* =========================================================================
 * 4. 지표 타일 9장 — 원본 `tileRow` 3줄 (proto.html:3088~3106)
 *
 * **줄 = 집계 범위**(UI-242). 줄 제목은 화면에 없다(원본) — 이름은 스크린리더용
 * 묶음 이름(`name`, annotations 영역명 「회원 현황」 등)으로만 쓴다.
 * 타일 순서·단위는 원본 그대로. 라벨은 「셀러 거래액(판매가)」(판정 Q1 · Q10 · 디자인 §1) ·
 * 「정상 회원」·「입점 셀러」(판정 Q6) · 「이번 달 가입자」(판정 Q19 — 원본 「오늘 방문자」)만 바뀌었다.
 * ====================================================================== */

export const num = (value: number) => value.toLocaleString("ko-KR");

/**
 * 지표 — **3그룹 × 3장 = 9장.** 그룹 카드 제목은 `title`(2026-09-18 배치 · 2026-11-03 되돌림)
 *
 * - `navId` 가 있을 때만 링크(원본 `go`). 이번 달 가입자·오늘 가입자는 갈 곳이 없다(링크는 회신에 없음)
 * - 정상 회원·입점 셀러는 **각 목록 처음 화면과 같은 값**이다(판정 Q6) — 목록의 `DEFAULT_FILTER`
 *   상태 카드 수를 그대로 센다. 입점 등록 상품 30 은 판매중 17 외 상태를 포함한다(원본 산식)
 */
export const METRIC_GROUPS = [
  {
    id: "member",
    title: "회원 지표",
    metrics: [
      {
        label: "이번 달 가입자",
        /* 판정 Q19 · 디자인 §1 — 가입일 기준, 시연 기준일의 달(2026-10). 지금 샘플은 0명(최근 가입 08-12) */
        value: num(
          MEMBERS.filter((m) => m.date.slice(0, 7) === DEMO_TODAY.slice(0, 7))
            .length,
        ),
        unit: "명",
      },
      {
        label: "오늘 가입자",
        /* 가입일이 시연 기준일인 회원 — 지금 샘플은 0명(최근 가입 08-12). 0 도 값이다 */
        value: num(
          MEMBERS.filter((m) => m.date.slice(0, 10) === DEMO_TODAY).length,
        ),
        unit: "명",
      },
      /* 회원 목록 처음 화면(정상 카드)과 같은 값 — 판정 Q6 · 원본 「전체 회원」 `MEMBERS.length` */
      {
        label: "정상 회원",
        value: num(
          MEMBERS.filter((m) => m.status === MEMBER_DEFAULT_FILTER).length,
        ),
        unit: "명",
        navId: "/members",
      },
    ],
  },
  {
    id: "seller",
    title: "셀러 지표",
    metrics: [
      {
        label: "입점 심사 요청",
        value: num(
          APPLICATIONS.filter((a) => a.status === REVIEWABLE_STATUS).length,
        ),
        unit: "건",
        /* 원본도 상태를 걸어 보낸다. 목록은 아직 쿼리를 읽지 않지만 기본 탭이 승인요청이라 도착이 같다 */
        navId: "/seller-review?stat=%EC%8A%B9%EC%9D%B8%EC%9A%94%EC%B2%AD",
      },
      /* 입점사 상품 전체 — 원본 「본사 아님 && 임시저장 아님」(우리 모델엔 임시저장이 없다) */
      {
        label: "입점 등록 상품",
        value: num(LISTED_PRODUCTS.length),
        unit: "개",
        navId: "/products",
      },
      {
        label: "입점 셀러",
        /* 셀러 목록 처음 화면(입점 카드)과 같은 값 — 입점 상태만 · 퇴점 제외 · 본사 행 포함(판정 Q6 · 디자인 §1) */
        value: num(
          SELLERS.filter((s) => s.status === SELLER_DEFAULT_FILTER).length,
        ),
        unit: "사",
        navId: "/sellers",
      },
    ],
  },
  {
    id: "sales",
    title: "매출 지표",
    /*
      셀러 정산 「정산 요약」과 **같은 객체**를 읽는다 — 손으로 적거나 다시 계산하면 눌러 간
      화면과 숫자가 갈린다. 정산 회차(2026.09) 기준이라 차트(최근 n일 결제)와 범위가 다르다 — 정상이다.
      거래액 라벨은 「셀러 거래액(판매가)」(판정 Q1 · Q10 · 디자인 §1) — 원본 「입점사 거래액(정가)」.
      값은 정산 요약 `sales`(셀러 쿠폰 차감 전) 그대로 — 쿠폰 차감 뒤로 둘지는 기획 확인 요청 5번
    */
    metrics: [
      {
        label: "셀러 거래액(판매가)",
        value: num(SETTLEMENT_SUMMARY.sales),
        unit: "원",
        navId: "/settle-seller",
      },
      {
        label: "이번 회차 지급 총액",
        value: num(SETTLEMENT_SUMMARY.payout),
        unit: "원",
        navId: "/settle-seller",
      },
      {
        label: "본사 수수료 수익",
        value: num(SETTLEMENT_SUMMARY.fee),
        unit: "원",
        navId: "/settle-seller",
      },
    ],
  },
];

/* =========================================================================
 * 5. 단위 포맷 — 단위가 곧 도메인이라 여기 둔다
 *
 * 축 눈금·툴팁·최댓값 라벨이 같은 함수를 공유한다. 툴팁 값이 문자열로 들어올 수 있어
 * `number | string` 을 모두 받는다. 금액은 **원 단위 그대로** — 만 단위로 나누지 않는다.
 * ====================================================================== */

export const count = (value: number | string) =>
  typeof value === "number" ? `${num(value)}건` : `${value}`;

export const won = (value: number | string) =>
  typeof value === "number" ? `${num(value)}원` : `${value}`;
