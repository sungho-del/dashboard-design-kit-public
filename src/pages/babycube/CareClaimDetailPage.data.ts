import { depositOf, type DepositState } from "./deposit.data";
import { periodText, type Order } from "./OrderListPage.data";
import { CLAIM_ROWS, type CareClaimRow } from "./CareClaimListPage.data";

/* -------------------------------------------------------------------------
 * S14-D 안심케어 청구 상세 — 도메인 층 (`/care-claims/{처리단위}`)
 * 기준 기획: v0.4 `DETAILS.careClaim`(proto.html 5079~5104) · 증빙 이미지 `unitEvRows`(4470~4488) ·
 * 이미지 시드(1642~1660)
 *
 * 짝이 되는 뼈대: `CareClaimDetailPage.tsx`
 *
 * ## ⚠️ 청구 행·창 문구는 **목록과 같은 것을 쓴다**
 * `CareClaimListPage.data.ts` 의 `CLAIM_ROWS` · `STATUS_META` · `REVIEW_COPY` 를 그대로 읽는다.
 * 보증금·차감은 보증금 내역과 같은 함수(`depositOf`)다 — 같은 처리단위가 화면마다 다른 금액을 말하지 않게.
 *
 * ## 갈아끼울 것 (이 파일 전체)
 *
 * | 실물 이름        | 역할                                                    |
 * | ---------------- | ------------------------------------------------------- |
 * | `findClaim`      | 경로의 처리단위 → 청구 행 (없으면 「찾을 수 없음」)     |
 * | `SECTIONS`       | 구역 제목 2종 (원본 순서)                               |
 * | `COPY`           | 줄 도움말 · 상태별 안내 · 이미지 미등록 문구 (원본 그대로) |
 * | `evidenceOf`     | 발송 전 · 파손 이미지 장수 (원본 시드 규칙)             |
 * | `depositOfClaim` | 「보증금」·「보증금 차감」 줄                           |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - **청구 접수만 [승인][반려]** — 종결 건(승인·반려)은 하단 바에 [목록]만(원본 UI-287)
 * - 승인 건만 「승인일」·「정산 반영」, 반려 건만 「반려 사유 (반려일)」 + 안내, 접수 건만 안내 한 줄
 * - 이미지가 0장이면 빈 상자가 아니라 **문장**으로 말한다(원본 — 「미등록 = 대조 근거 없음」)
 *
 * ## 이미지 — 실제 파일이 없다
 * 원본은 시드로 색 상자 SVG 를 만든다. 우리는 장수만 같은 규칙으로 정하고 **자리 표시**를 그린다
 * (상품 상세의 상품이미지와 같은 처리 — 사용자 결정). 등록·교체·삭제는 없다(본사는 조회만 — 원본 4470).
 * 원본 규칙: 발송 전 = 발송 후 단계면 1~3장(아니면 약 1/3 만) · 파손 = 파손 판정 건만 1~2장.
 *
 * ## 원본 결함 — 어떻게 다뤘나
 * - 「청구 근거」에 필수 표시 ●가 붙는다(읽기 전용 구역 — 5103 `req:true`) → 그리지 않는다
 * - 원본 머리(상단 경로줄·요약)가 없다 → 형제 상세처럼 제목 + 주문번호·처리단위·상품·셀러 + 상태 배지
 * ---------------------------------------------------------------------- */

export const findClaim = (id: string): CareClaimRow | undefined =>
  CLAIM_ROWS.find((row) => row.id === id);

/** 원본 `sections` 순서 */
export const SECTIONS = {
  claim: "청구 근거",
  judge: "청구 심사",
} as const;

/** 원본 문구 그대로 */
export const COPY = {
  deductionHelp:
    "복원가능 파손 + 케어 가입 건은 본사 부담이라 차감하지 않습니다(#13).",
  amountHelp: "입점사 입력값 — 본사는 승인·반려만 합니다.",
  shipLabel: "발송 전 이미지",
  shipEmpty:
    "등록된 발송 전 이미지가 없습니다 — 대조 근거 없음(미등록 건의 파손 주장은 반납 이미지 단독으로 성립하지 않습니다).",
  shipHelp: "출고 처리 때 입점사가 등록합니다 · 최대 10장",
  returnLabel: "파손 이미지",
  returnEmpty:
    "등록된 파손 이미지가 없습니다 — 반납 검수에서 손상이 확인되지 않았거나 아직 등록 전입니다.",
  returnHelp: "반납 검수 때 입점사가 등록합니다 · 최대 10장",
  evidenceNote:
    "입점사가 등록한 이미지를 본사는 조회만 합니다 — 발송 전 상태와 반납 후 손상을 대조해 복원비 청구가 복원 가능한 파손인지 판단하세요. 썸네일의 [확대]로 원본 크기를 볼 수 있습니다.",
  settled: (amount: string) => `익월 정산 보전(+${amount})`,
  rejectedNote:
    "반려 건은 본사 보전 대상이 아니며, 보증금 차감 여부는 입점사가 검수·반납 상세에서 다시 판단합니다.",
  pendingNote:
    "승인하면 익월 정산에 보전되고, 반려하면 보증금 차감 판단으로 되돌아갑니다.",
};

/** 이용 기간 `2026.08.24 ~ 2026.09.13` */
export const periodOf = (row: CareClaimRow) =>
  row.order.period ? periodText(row.order.period) : "-";

/** 「보증금」·「보증금 차감」 — 보증금 내역과 같은 함수. 렌트 청구 건이라 늘 있다 */
export const depositOfClaim = (row: CareClaimRow): DepositState | null =>
  depositOf(row.order);

/** 발송 후 단계 — 원본 1653 `post` 목록 */
const SHIPPED_STAGES: Order["baseStatus"][] = [
  "shipping",
  "renting",
  "extended",
  "overdue",
  "pickup",
  "inspecting",
  "inspected",
  "returned",
];

/** 원본 시드의 씨앗 — 처리단위 문자열 해시(`g = g*33 + code`) */
const seedOf = (id: string) =>
  [...id].reduce((g, char) => (g * 33 + char.charCodeAt(0)) >>> 0, 0);

/**
 * 증빙 이미지 장수 — 원본 시드 규칙(1650~1659). 실제 파일은 없고 장수만 정한다.
 * 발송 전: 발송 후 단계거나 씨앗 %3 == 0 이면 1 + 씨앗 %3 장. 파손: 파손 판정이면 1 + 씨앗 %2 장.
 */
export const evidenceOf = (
  order: Pick<Order, "id" | "baseStatus" | "inspection">,
) => {
  const g = seedOf(order.id);
  const post = SHIPPED_STAGES.includes(order.baseStatus);
  return {
    ship: post || g % 3 === 0 ? 1 + (g % 3) : 0,
    return:
      order.inspection === "repairable" || order.inspection === "unrepairable"
        ? 1 + (g % 2)
        : 0,
  };
};
