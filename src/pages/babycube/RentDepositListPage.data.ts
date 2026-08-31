import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S13 보증금 내역 — **도메인 층** (BabyCube 본사 운영 어드민)
 * 원본 어드민: `_plan/babycube-admin/chunks/0rvj1jaaeo2ue.js` (`/rent-deposit`)
 *
 * 짝이 되는 뼈대: `RentDepositListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 이 화면이 무엇인가
 * 렌트 보증금이 **점유중 → 환급/차감**으로 판정·집행되는 과정을 금액과 함께 추적한다.
 * 한 행에 상태가 **둘** 붙는다 — 주문 상태(대여중·연체중·검수중…)와 보증금 상태.
 * 물건이 돌아오는 흐름과 돈이 돌아가는 흐름이 따로 움직이기 때문이다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(주문번호) · `date`(`YYYY-MM-DD HH:mm`) 를 반드시 갖는다.
 *   ⚠️ 여기서 `date` 는 **상태 변경일**이다 — 원본 기간 필터 축이 `depStatAt` 하나뿐이다.
 *   표에는 원본 `ymd` 처럼 **날짜만** 낸다(`2026.08.01`)
 * - `DEPOSIT_STATUS_META` 의 키는 `RentDeposit["depositStatus"]` 와 정확히 일치한다
 *   (주문 상태는 별도 축이라 `ORDER_STATUS_META` 로 따로 든다)
 * - `FILTERS[0].value` 는 `"all"` — 뼈대가 필터 해제로 취급한다
 * - **반환 예정액은 데이터가 계산한다**(`refundOf`). 요약 4값도 샘플에서 **집계**한다 —
 *   손으로 적으면 표의 숫자와 어긋난다
 * - **셀러명·구분 표기도 데이터가 만든다**(`sellerOf` · `SOURCE_CELL_LABEL`).
 *   같은 `source` 필드를 셀에서는 `본사/셀러`, 필터에서는 `자체/입점사` 로 부르는 것이 원본이다
 *
 * ## 원본 대조 (`/rent-deposit`)
 * 가져온 것: 컬럼 11개의 이름·순서·정렬·고정열 · 상태 어휘 5종과 **셀에서만 길어지는 라벨**
 * (`환급완료(전액환급)`) · 요약 **4값**의 문구와 순서 · 출처를 **컬럼 + 칩 필터 양쪽**에 두는 것 ·
 * 셀러명 칸이 자체 재고면 `본사` 로 바뀌는 것 · **상품 옆 안심케어 표식** ·
 * 차감이 없으면 `0원` 이 아니라 `-` · 기간 축 이름(상태 변경일) · 검색 조건 2종 ·
 * 엑셀 파일명 `보증금내역`.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * - **상태 요약 대시(건수 카드 5장)** — 원본이 이 화면에서만 `showStatusDashboard: !1` 로
 *   **꺼 둔다.** 상태는 칩 하나로만 거른다
 * - **요약 카드의 증감(±%)·비교 기준 문구·아이콘** — 원본 타일은 라벨·값뿐이다
 * - **`보증금 흐름` 도움말 툴팁** — 원본에 없는 지어낸 문장이었다
 * - **`구분`·`안심케어 가입` 을 각각 열로 세우던 것** — 구분은 원본에서 3번째 열 하나뿐이고,
 *   안심케어는 **열이 아니라 상품 이름 옆 표식**이다
 *
 * ## 값 출처가 불명해 그대로 둔 것
 * 행 데이터는 전부 API 에서 오므로 청크에 값이 없다. 회원명·상품명·금액·주문 상태 어휘는
 * 기존 샘플을 그대로 뒀다. `careEnrolled` 만 **S14 안심케어 승인에 청구가 있는 세 건**
 * (`R2026-0705-0288` · `R2026-0612-0503` · `R2026-0410-0912`)에 맞춰 켰다 —
 * 청구가 있는데 가입 표식이 없으면 두 화면이 서로 다른 말을 한다.
 * ---------------------------------------------------------------------- */

/** 보증금이 어디까지 왔나 — 원본 `chip.values` 5종 그대로다 */
export type DepositStatus =
  "holding" | "pendingRefund" | "fullRefund" | "partialRefund" | "fullDeduct";

/** 물건이 어디까지 왔나 (렌트 흐름 중 보증금이 걸리는 구간) */
export type OrderStatus =
  "renting" | "overdue" | "inspecting" | "returned" | "confirmed";

/**
 * 재고를 댄 주체. 원본 표의 **"구분"** 열이자 툴바의 **"출처"** 칩이다.
 *
 * ⚠️ 한때 여기에 렌트/구매를 뜻하는 열을 따로 두었는데 **원본에 없는 열이었다.**
 * 보증금은 애초에 렌트에만 걸리므로 렌트/구매를 가르는 열이 있을 이유가 없다.
 */
export type Source = "hq" | "seller";

export interface RentDeposit {
  /** 주문번호 — 고유 키 */
  id: string;
  member: string;
  /**
   * 입점사 재고일 때의 셀러명. 자체 재고면 **빈 문자열**이고 화면에는 `sellerOf` 가
   * "본사"를 채운다(원본과 같다) — "본사 직영" 같은 문자열을 데이터에 박으면 `source` 와
   * 두 곳에서 같은 사실을 말하게 되고, 한쪽만 고치면 어긋난다.
   */
  seller: string;
  product: string;
  /**
   * 안심케어 가입 여부. **열이 아니라 상품 이름 옆 표식**이다(원본 `badge b-care`).
   * 켜진 건은 S14 안심케어 승인에서 복원비를 청구할 수 있다.
   */
  careEnrolled: boolean;
  /** 받아 둔 보증금 */
  deposit: number;
  /** 연체료·손상 등으로 뺀 금액. **상한은 보증금액**이라 `deposit` 을 넘지 않는다 */
  deduction: number;
  orderStatus: OrderStatus;
  depositStatus: DepositStatus;
  /** 상태 변경일 `YYYY-MM-DD HH:mm` — 기간 필터가 이 형식을 파싱한다 */
  date: string;
  source: Source;
}

/**
 * 보증금 상태 → 라벨 · Tag tone.
 *
 * ## 색 배정 근거 (`docs/screen-templates.md` §3-1)
 * | 상태     | 지금 누가 무엇을 해야 하나           | tone       |
 * | -------- | ------------------------------------ | ---------- |
 * | 점유중   | 아무도 — 대여가 정상 진행 중         | `success`  |
 * | 환급대기 | **본사가 환급을 집행한다**(판정 완료)| `warning`  |
 * | 전액환급 | 아무도 — 정상 종결                   | `default`  |
 * | 일부환급 | 아무도 — 판정대로 종결               | `default`  |
 * | 전액차감 | 아무도, 그러나 **사고로 끝났다**     | `critical` |
 *
 * - `warning` 은 "지금 주의를 요하는 상태"가 독점한다 → 환급대기(돈이 묶여 있다)
 * - 전액차감은 미반납·복원불가처럼 **정상적으로 끝나지 않은 종결**이라 `critical` 이다.
 *   회색으로 묻으면 목록에서 사고 건이 보이지 않는다
 * - 겹치는 쪽(전액환급 ↔ 일부환급)은 **둘 다 판정대로 정상 종결**이라 가장 덜 아프다.
 *   차감이 있었는지는 바로 옆 "차감" 칸의 금액이 말해 준다
 *
 * ⚠️ 원본 색(`전액환급`·`일부환급` `b-done` / `전액차감` `b-exc` / 나머지 `b-prog`)을
 * 그대로 옮기지 않았다 — 원본은 점유중과 환급대기를 같은 `b-prog` 로 묶어
 * "돈이 묶여 있어 지금 집행해야 하는 건"이 보이지 않는다.
 *
 * ## 라벨이 둘인 이유 (`label` vs `cellLabel`) — 원본 그대로다
 * 칩은 좁아서 짧은 이름을 쓰고(`전액차감`), 표의 셀은 원본처럼 `환급완료(전액차감)` 으로
 * 길게 적는다. **"전액차감"만 있으면 "차감할 예정"으로 읽힌다** —
 * 바로 위 칸이 `환급대기`(예정) 라서 더 그렇다.
 */
export const DEPOSIT_STATUS_META: Record<
  DepositStatus,
  { label: string; cellLabel: string; tone: TagTone }
> = {
  holding: { label: "점유중", cellLabel: "점유중", tone: "success" },
  pendingRefund: {
    label: "환급대기",
    cellLabel: "환급대기",
    tone: "warning",
  },
  fullRefund: {
    label: "전액환급",
    cellLabel: "환급완료(전액환급)",
    tone: "default",
  },
  partialRefund: {
    label: "일부환급",
    cellLabel: "환급완료(일부환급)",
    tone: "default",
  },
  fullDeduct: {
    label: "전액차감",
    cellLabel: "환급완료(전액차감)",
    tone: "critical",
  },
};

/**
 * 주문 상태 → 라벨 · Tag tone. 보증금 상태와 **다른 축**이라 맵을 따로 둔다.
 * 배정 기준은 같다 — 연체중은 보증금 차감으로 이어지는 사고라 `critical`,
 * 검수중은 사람이 판정해야 끝나므로 `warning`.
 */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; tone: TagTone }
> = {
  renting: { label: "대여중", tone: "success" },
  overdue: { label: "연체중", tone: "critical" },
  inspecting: { label: "검수중", tone: "warning" },
  returned: { label: "반납완료", tone: "default" },
  confirmed: { label: "구매확정", tone: "default" },
};

/**
 * **같은 필드를 두 이름으로 부른다 — 원본이 그렇다.**
 * 표의 `구분` 칸은 `본사`/`셀러`, 툴바의 `출처` 칩은 `자체`/`입점사` 다.
 * 행에서는 "누가 파는가", 필터에서는 "어느 재고인가"를 묻기 때문이다.
 */
export const SOURCE_CELL_LABEL: Record<Source, string> = {
  hq: "본사",
  seller: "셀러",
};

/** 출처 칩 — 원본 `chips: [{ key: "owner", label: "출처" }]`. 첫 항목은 필터 해제 */
export const SOURCE_FILTERS = [
  { value: "all", label: "전체" },
  { value: "hq", label: "자체" },
  { value: "seller", label: "입점사" },
];

export const DEPOSITS: RentDeposit[] = [
  {
    id: "R2026-0731-0042",
    member: "김하늘",
    seller: "베베마켓",
    product: "아기침대 프리미엄 (원목)",
    careEnrolled: false,
    deposit: 150_000,
    deduction: 0,
    orderStatus: "renting",
    depositStatus: "holding",
    date: "2026-08-01 09:12",
    source: "seller",
  },
  {
    id: "R2026-0728-0117",
    member: "이서준",
    /* 자체 재고 — 셀러명은 비워 두고 `sellerOf` 가 "본사"를 채운다 */
    seller: "",
    product: "유아 카시트 360 회전형",
    careEnrolled: false,
    deposit: 200_000,
    deduction: 0,
    orderStatus: "renting",
    depositStatus: "holding",
    date: "2026-07-28 14:05",
    source: "hq",
  },
  {
    /* S14 안심케어 승인에 청구가 걸려 있는 건 */
    id: "R2026-0705-0288",
    member: "박도윤",
    seller: "리틀스텝",
    product: "전동 바운서 오토스윙",
    careEnrolled: true,
    deposit: 120_000,
    deduction: 0,
    orderStatus: "overdue",
    depositStatus: "holding",
    date: "2026-08-15 10:30",
    source: "seller",
  },
  {
    /* S14 안심케어 승인에 청구가 걸려 있는 건 */
    id: "R2026-0612-0503",
    member: "최유나",
    seller: "맘스케어",
    product: "하이체어 우드 · 그레이",
    careEnrolled: true,
    deposit: 90_000,
    deduction: 18_000,
    orderStatus: "inspecting",
    depositStatus: "pendingRefund",
    date: "2026-08-18 16:40",
    source: "seller",
  },
  {
    id: "R2026-0620-0455",
    member: "정민서",
    seller: "",
    product: "아기띠 힙시트 3in1",
    careEnrolled: false,
    deposit: 60_000,
    deduction: 0,
    orderStatus: "returned",
    depositStatus: "pendingRefund",
    date: "2026-08-17 11:22",
    source: "hq",
  },
  {
    id: "R2026-0518-0731",
    member: "한지우",
    seller: "베베마켓",
    product: "유모차 트래블 시스템",
    careEnrolled: false,
    deposit: 180_000,
    deduction: 0,
    orderStatus: "returned",
    depositStatus: "fullRefund",
    date: "2026-08-10 09:05",
    source: "seller",
  },
  {
    id: "R2026-0502-0669",
    member: "오세아",
    seller: "리틀스텝",
    product: "아기침대 프리미엄 (원목)",
    careEnrolled: false,
    deposit: 150_000,
    deduction: 45_000,
    orderStatus: "confirmed",
    depositStatus: "partialRefund",
    date: "2026-08-05 15:18",
    source: "seller",
  },
  {
    /* S14 안심케어 승인에 청구가 걸려 있는 건 */
    id: "R2026-0410-0912",
    member: "강태오",
    seller: "맘스케어",
    product: "원목 모빌 세트",
    careEnrolled: true,
    deposit: 80_000,
    deduction: 80_000,
    orderStatus: "overdue",
    depositStatus: "fullDeduct",
    date: "2026-08-12 17:45",
    source: "seller",
  },
];

/**
 * 셀러명 칸의 표기 — 원본 그대로 자체 재고면 `본사`, 없으면 `-` 다.
 * 값을 데이터에 박지 않고 여기서 만든다(위 `seller` 주석 참고).
 */
export const sellerOf = (row: RentDeposit) =>
  row.source === "hq" ? "본사" : row.seller || "-";

/**
 * 반환 예정액 = 보증금액 − 차감.
 * 표·미리보기·요약이 모두 이 함수를 부른다. 뼈대에서 따로 빼면 세 곳이 어긋난다.
 */
export const refundOf = (row: RentDeposit) => row.deposit - row.deduction;

/** 판정이 끝나 집행까지 마친 상태들 — "반환 완료액"·"차감 수익" 집계 대상 */
const SETTLED: DepositStatus[] = ["fullRefund", "partialRefund", "fullDeduct"];

const sum = (rows: RentDeposit[], pick: (row: RentDeposit) => number) =>
  rows.reduce((acc, row) => acc + pick(row), 0);

/** 아직 본사가 들고 있는 보증금 */
export const holdingTotal = sum(
  DEPOSITS.filter((row) => row.depositStatus === "holding"),
  (row) => row.deposit,
);

/** 판정은 끝났는데 아직 나가지 않은 돈 */
export const pendingRefundTotal = sum(
  DEPOSITS.filter((row) => row.depositStatus === "pendingRefund"),
  refundOf,
);

/** 집행까지 끝나 회원에게 돌아간 돈 (전액차감 건은 0 이라 합계에 영향이 없다) */
export const returnedTotal = sum(
  DEPOSITS.filter((row) => SETTLED.includes(row.depositStatus)),
  refundOf,
);

/**
 * 집행까지 끝나 **본사가 가진** 돈 (연체료·손상 차감).
 * 실행 전인 환급대기 건의 차감은 아직 수익이 아니라 여기 넣지 않는다 —
 * 그래야 네 값이 보증금 풀을 그대로 나눠 갖는다
 * (들고 있다 470,000 / 나갈 예정 132,000+18,000 / 나갔다 285,000 / 본사가 가졌다 125,000).
 */
export const deductedTotal = sum(
  DEPOSITS.filter((row) => SETTLED.includes(row.depositStatus)),
  (row) => row.deduction,
);

/** 표의 주요 수치 포맷. 단위가 도메인이라 여기 둔다 (원 · 건) */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/** 단위를 뗀 수치 — 요약 상자가 값과 단위를 다른 크기로 그린다 */
export const num = (value: number) => value.toLocaleString("ko-KR");

/** 상태 변경일 표기 — 원본 `ymd` 와 같이 **날짜만** `2026.08.01` 로 낸다 */
export const ymd = (dateText: string) =>
  dateText.slice(0, 10).replace(/-/g, ".");

/** **금액이 없는 칸의 표기.** 원본 그대로 `0원` 이 아니라 `-` 다 */
export const NO_AMOUNT = "-";

/**
 * **차감 항목 표기 규칙.** 차감이 없는 건이 대부분이라 `0원` 이 줄줄이 서면
 * "0을 차감했다"로 읽히고 눈이 그 칸에서 멈춘다. 원본도 `-` 로 비운다.
 */
export const deduct = (value: number) =>
  value === 0 ? NO_AMOUNT : "-" + won(value);

/** 보증금 상태 칩. 첫 항목은 반드시 `"all"`(필터 해제) — 원본 `chip.all: "전체"` */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "holding", label: "점유중" },
  { value: "pendingRefund", label: "환급대기" },
  { value: "fullRefund", label: "전액환급" },
  { value: "partialRefund", label: "일부환급" },
  { value: "fullDeduct", label: "전액차감" },
];

/** 검색 조건 — 원본 `search.fieldOpts` 그대로 두 가지다 */
export const SEARCH_FIELDS = [
  { value: "no", label: "주문번호" },
  { value: "mem", label: "회원명" },
];

/** 검색 조건에 따라 훑을 문자열. 조건을 늘리면 여기만 고친다 */
export const searchHaystack = (row: RentDeposit, field: string) =>
  field === "mem" ? row.member : row.id;

/** 엑셀 파일명 — 원본 `exportName: "보증금내역"` */
export const EXPORT_NAME = "보증금내역";

/**
 * 금액 요약 **4값** — 원본 `rentDeposit.stats` 그대로다.
 *
 * ## 왜 넷인가
 * 기획서는 3장(점유중·환급 대기·반환 완료)만 적었지만 원본은 `차감 수익` 을 더해 넷이다.
 * **본사가 보증금으로 번 돈은 그 값에만 나온다.** 넷을 함께 놓아야 보증금 풀이
 * 어디에 있는지가 닫힌다 — 들고 있다 / 나갈 예정 / 나갔다 / 본사가 가졌다.
 *
 * ⚠️ 라벨의 괄호 설명(`판정됨·실행 전` · `연체료+손상 · 상한=보증금`)도 원본 문구다.
 * 이 화면의 값이 무엇을 세고 무엇을 빼는지가 그 괄호에 들어 있다.
 *
 * ⚠️ 증감(±%)·비교 기준 문구를 **붙이지 않는다.** 원본에 없고, 이전 기간 데이터가
 * 이 파일에 없어 계산할 수도 없다.
 */
export const SUMMARY_STATS = [
  { label: "점유중 보증금 총액", value: num(holdingTotal), unit: "원" },
  {
    label: "환급 대기액 (판정됨·실행 전)",
    value: num(pendingRefundTotal),
    unit: "원",
  },
  { label: "반환 완료액", value: num(returnedTotal), unit: "원" },
  {
    label: "차감 수익 (연체료+손상 · 상한=보증금)",
    value: num(deductedTotal),
    unit: "원",
  },
];

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 원본 기본값 10 이지만 **샘플이 8건뿐이라 페이징 동작이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 5;
