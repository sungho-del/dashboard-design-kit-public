import type { CalcBlock } from "./CalcBreakdown";
import { INSPECTION_META, refundDueNoteOf } from "./deposit.data";
import { DEMO_TODAY, ORDERS } from "./OrderListPage.data";
import { SELLERS } from "./SellerListPage.data";
import {
  depositRowOf,
  won,
  ymd,
  type DepositRow,
} from "./RentDepositListPage.data";

export { refundDueNoteOf };

/* -------------------------------------------------------------------------
 * 보증금 상세 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `RentDepositDetailPage.tsx` · 들어오는 곳: 보증금 내역 행 클릭(`/rent-deposit/{처리단위}`)
 * 기준 기획: **v0.4** `DETAILS.rentDepositDetail` (proto.html 5265~5296) — **조회 전용**
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `findDeposit(처리단위)` → 행 | `undefined`. 렌트 + 보증금 있는 건만 연다(원본: 렌트가 아니면 `notFound`).
 *   목록 범위(반납 이후) 밖의 렌트도 열린다 — 원본도 렌트 여부만 본다
 * - 금액·상태는 목록과 같은 행(`depositRowOf` → `depositOf`)에서 읽는다 — 화면이 다시 계산하지 않는다
 * - 구역 3개 제목은 `SECTIONS` — `보증금 정보` · `정산 계산` · `처리 상태`(원본 「(조회 전용)」은 부록 A C18 로 뺐다)
 * - 정산 계산은 `calcBlocksOf(row)` 블록만 — 그리는 것은 공용 `CalcBreakdown`. 원본 정책 문단(안내 상자)은 부록 A C17 로 지웠다
 * - 반환 예정액 아래 환급 실패 안내는 `refundDueNoteOf(row.order)` — 결제사 기간 경과 실패 건만 한 줄 · 아니면 `null`
 *   (개발 §3-2-8 · develop d46e752 와 같은 조건. 예시 건 없음 — 퍼블이 정함)
 *
 * ## 원본과 다르게 둔 것
 * - 머리: 원본은 crumb·제목·배지·부제를 넘기지만 `nvEditPage` 가 그리지 않는다(결함) — 형제처럼 그린다
 * - 문구의 🛡·✓ 기호는 뺐다(목록과 같이 안심케어는 Tag 로)
 *
 * ## ⚠️ 기획 확인 필요
 * - 취소 환불 처리중(환급대기) 건도 처리 상태 문구가 「검수 완료」를 말한다 — 원본은 취소 건을 점유중으로 둬서
 *   이 문구를 만나지 않는다(우리는 무료 취소 결정으로 환급 상태)
 * ---------------------------------------------------------------------- */

export const LIST_PATH = "/rent-deposit";
export const LIST_LABEL = "보증금 내역";

export const SECTIONS = {
  info: "보증금 정보",
  calc: "정산 계산",
  proc: "처리 상태",
} as const;

/** 처리단위 → 보증금 행. 렌트가 아니거나 보증금이 없으면 `undefined` */
export const findDeposit = (id: string): DepositRow | undefined => {
  const order = ORDERS.find((item) => item.id === id);
  return (order && depositRowOf(order)) ?? undefined;
};

/** 머리 설명 — 원본 `sub`(렌트 · 상품 · 회원 · 보증금 · 안심케어) 앞에 주문번호·처리단위 */
export const headlineOf = (row: DepositRow) =>
  [
    row.orderNo,
    row.id,
    "렌트",
    row.product,
    row.member,
    `보증금 ${won(row.deposit)}`,
    ...(row.care ? ["안심케어"] : []),
  ].join(" · ");

/** 담당 배지 — 원본 `ownerBadge`(자체/입점사) · 화면 글자는 「본사 / 셀러」(판정 Q10) */
export const OWNER_LABEL = { hq: "본사", seller: "셀러" } as const;

/** 셀러 상세 경로 — 셀러 마스터에 있는 입점사만(본사·미등록이면 `null` → 글자만) */
export const sellerPathOf = (row: DepositRow) => {
  if (row.sellerKind !== "seller") return null;
  const seller = SELLERS.find((item) => item.name === row.seller);
  return seller ? `/sellers/${encodeURIComponent(seller.id)}` : null;
};

export const memberPathOf = (row: DepositRow) =>
  `/members/${encodeURIComponent(row.memberId)}`;

/** 주문번호 → 그 처리단위의 주문 상세(같은 주문번호의 다른 처리단위와 갈린다) */
export const orderPathOf = (row: DepositRow) => `/orders-all/${row.id}`;

/** 이용 기간 — 점 표기 */
export const periodText = (period: string) =>
  period ? period.replace(/-/g, ".") : "-";

/** 검수 판정 — 판정 전이면 `null`(화면은 「검수 전」) */
export const inspectionOf = (row: DepositRow) =>
  row.order.inspection ? INSPECTION_META[row.order.inspection] : null;

const dayDiff = (from: string, to: string) =>
  Math.round(
    (new Date(`${to}T00:00:00`).getTime() -
      new Date(`${from}T00:00:00`).getTime()) /
      86_400_000,
  );

/**
 * 연체 경과 — 연체중 건만(원본 `u.od>0`). 반납 예정일 = 이용 기간 끝, 경과 = 시연 기준일 − 예정일.
 * 원본은 `od` 를 행이 들고 있지만 우리 주문 샘플에 없어 기간과 시연 기준일에서 센다.
 */
export const overdueOf = (row: DepositRow) => {
  if (row.orderStatus !== "overdue") return null;
  const due = row.period.split("~")[1]?.trim() ?? "";
  if (!due) return null;
  return { days: dayDiff(due, DEMO_TODAY), due: due.replace(/-/g, ".") };
};

/* =========================================================================
 * 정산 계산 — 원본 `amt([보증금, 차감, 반환 예정액])` + 정책 문단 → 공용 `CalcBreakdown` 블록
 * 한 묶음(보증금 · 차감) + 결과 묶음(반환 예정액). 줄 이름이 곧 묶음이라 묶음 이름 열은 비운다. 차감은 기본 글자색에 `−N원`(U+2212), 차감이 없으면 `0원`
 * (목록 칸의 `-` 와 다르다 — 원본). 「차감」 줄에 보조 글자는 없다 — 「복원가능 손상 본사 부담」은 뺐다
 * (부록 A C16 과 같은 문장 · 확인 요청 답(2026-11-06) 29번). 금액은 행 값 그대로(여기서 계산하지 않는다).
 * ====================================================================== */

export const calcBlocksOf = (row: DepositRow): CalcBlock[] => [
  {
    key: "base",
    lines: [
      { key: "deposit", label: "보증금", value: won(row.deposit) },
      {
        key: "deduction",
        label: "차감",
        value: row.deduction > 0 ? `−${won(row.deduction)}` : won(0),
      },
    ],
  },
  {
    key: "refund",
    emphasis: true,
    lines: [
      {
        key: "refund",
        label: "반환 예정액",
        value: won(row.refund),
        kind: "total",
      },
    ],
  },
];

/**
 * 처리 상태 문장 — 원본 3갈래(점유중 · 환급대기 · 종결) · 부록 A C19 · C20 · C21 바꿈 문구.
 * 연체중 덧붙임 문장은 B14 로 지웠다. 종결 줄의 「✓」 기호는 넣지 않는다(기호 대신 글자 · 퍼블이 정함)
 */
export const procTextOf = (row: DepositRow) => {
  if (row.status === "holding") {
    return "대여 중 — 반납·검수 후 셀러가 환급을 처리합니다.";
  }
  if (row.status === "pendingRefund") {
    return "검수 완료 — 셀러의 환급 처리를 기다리는 중입니다.";
  }
  return `환급 완료${row.changedAt ? ` · ${ymd(row.changedAt)}` : ""}`;
};
