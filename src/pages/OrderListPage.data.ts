import { ShoppingCart, TrendingUp, Users } from "lucide-react";
import type { TagTone } from "../components/ui";

/* -------------------------------------------------------------------------
 * 목록형 화면의 **도메인 층** — 여기가 서비스마다 통째로 갈리는 부분이다.
 *
 * 짝이 되는 뼈대: `OrderListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 다른 서비스로 바꿀 때
 * 이 파일을 **전부 새로 쓴다.** 아래 7개 **역할**을 채우면 뼈대는 거의 손대지 않아도 된다.
 *
 * ⚠️ **계약은 이름이 아니라 역할과 모양이다.** 아래 "실물 이름"은 이 파일이 이커머스라서
 * 그런 것이고, 병원 화면이라면 `Reservation`·`RESERVATIONS`·`minutes` 로 짓는 것이 옳다.
 * 템플릿 이름을 그대로 복사하면 병원 화면에 `Order` 타입이 남는다.
 *
 * | 역할                  | 실물 이름     | 예: 물류 SaaS         |
 * | --------------------- | ------------- | --------------------- |
 * | 표 한 행의 타입       | `Order`       | 배송 건               |
 * | 상태값 → 라벨·색      | `STATUS_META` | 집화/간선/배송중/완료 |
 * | 샘플 데이터           | `ORDERS`      | 배송 목록             |
 * | 상단 요약 카드 (3장)  | `STATS`       | 오늘 집화/지연/반송   |
 * | 툴바 세그먼트 필터    | `FILTERS`     | 전체/진행/완료        |
 * | 주요 수치 포맷        | `won`         | 중량(kg) · 거리(km)   |
 * | 페이지당 행 수        | `PAGE_SIZE`   | 동일                  |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(YYYY-MM-DD HH:mm, 기간 필터가 파싱) 를 반드시 갖는다
 * - `STATUS_META` 의 키는 행 타입의 `status` 유니온(`Order["status"]`)과 정확히 일치한다
 * - `FILTERS[0].value` 는 "전체"를 뜻하는 `"all"` 이다 (뼈대가 필터 해제로 취급)
 * - `STATS[]` 는 **`up`(방향)과 `good`(좋고 나쁨)을 둘 다** 갖는다 — 아래 STATS 주석 참고
 * ---------------------------------------------------------------------- */

export type OrderStatus = "paid" | "ready" | "pending" | "canceled";

export interface Order {
  /** 고유 키 — 뼈대가 행 key 로 쓴다 */
  id: string;
  product: string;
  customer: string;
  status: OrderStatus;
  amount: number;
  /** `YYYY-MM-DD HH:mm` — 뼈대의 기간 필터가 이 형식을 파싱한다 */
  date: string;
}

/** 상태값 → 표시 라벨과 Tag tone. 키는 `Order["status"]` 와 일치해야 한다 */
export const STATUS_META: Record<
  OrderStatus,
  { label: string; tone: TagTone }
> = {
  paid: { label: "결제완료", tone: "success" },
  ready: { label: "배송준비중", tone: "default" },
  pending: { label: "입금대기", tone: "warning" },
  canceled: { label: "취소", tone: "critical" },
};

export const ORDERS: Order[] = [
  {
    id: "20260818-0001",
    product: "무선 이어폰 Pro",
    customer: "김성호",
    status: "paid",
    amount: 189000,
    date: "2026-08-18 14:32",
  },
  {
    id: "20260818-0002",
    product: "노트북 거치대 (실버)",
    customer: "이서연",
    status: "ready",
    amount: 42000,
    date: "2026-08-18 11:05",
  },
  {
    id: "20260817-0031",
    product: "USB-C 허브 7in1",
    customer: "박준영",
    status: "pending",
    amount: 68000,
    date: "2026-08-17 22:14",
  },
  {
    id: "20260817-0028",
    product: "기계식 키보드 · 적축",
    customer: "최다은",
    status: "paid",
    amount: 156000,
    date: "2026-08-17 16:40",
  },
  {
    id: "20260817-0019",
    product: "모니터암 싱글",
    customer: "정우진",
    status: "canceled",
    amount: 89000,
    date: "2026-08-17 09:22",
  },
];

/**
 * 상단 요약 카드 3장. 아이콘은 lucide 컴포넌트 참조(JSX 아님).
 *
 * ⚠️ `up`(방향)과 `good`(좋고 나쁨)은 **다른 축**이다. 반드시 둘 다 채운다.
 * 이커머스는 주문·매출·회원이 전부 "오르면 좋다"라 두 값이 우연히 같지만,
 * **노쇼율·이탈률·대기시간·오류율은 내려가면 좋다.** 하나로 겸용하면 그런 지표에서
 * 화살표는 ↓인데 색이 빨강으로 나가 **화면이 거짓말을 한다.**
 *
 *   아이콘(↑/↓) ← `up`      색(초록/빨강) ← `good`
 *
 * ⚠️ `caption`(비교 기준)도 **카드마다 따로** 든다. 이커머스는 3장이 우연히 "지난주 대비"로
 * 같을 뿐이다. 한 문구로 묶으면 기준이 다른 지표까지 같은 기준으로 읽혀
 * **숫자가 서로 모순되는 화면**이 된다 — 병원이면 "오늘 예약"(어제 대비)과
 * "예약 확정률"(최근 30일)이 한 문구를 공유하게 된다.
 */
export const STATS = [
  {
    label: "오늘 주문",
    value: "42",
    unit: "건",
    delta: "+12%",
    up: true,
    good: true,
    caption: "지난주 대비",
    icon: ShoppingCart,
  },
  {
    label: "오늘 매출",
    value: "3,840,000",
    unit: "원",
    delta: "+8%",
    up: true,
    good: true,
    caption: "지난주 대비",
    icon: TrendingUp,
  },
  {
    label: "신규 회원",
    value: "17",
    unit: "명",
    delta: "+3%",
    up: true,
    good: true,
    caption: "지난주 대비",
    icon: Users,
  },
];

/** 툴바 세그먼트 필터. 첫 항목은 반드시 `"all"`(필터 해제) */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "paid", label: "결제완료" },
  { value: "ready", label: "배송준비중" },
  { value: "pending", label: "입금대기" },
];

/** 표의 주요 수치 포맷. 단위가 도메인이라 여기 둔다 (원 · kg · 건 · 명 …) */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 10·20·50 이지만 **샘플이 5건뿐이라 페이징 동작이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 3;
