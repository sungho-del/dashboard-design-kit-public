import type { TagTone } from "../../components/ui";
import {
  isClaimRefused,
  type Inspection,
  type Order,
} from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * 보증금 — **순수 계산 층** (화면 없음)
 *
 * 주문 처리단위(`ORDERS` 한 행) → 보증금 상태 · 실효 차감액 · 반환액 · 상태 변경일.
 * 주문 상세(「보증금 상태」 칸 · 클레임 명세)와 보증금 내역(목록·상세)이 **이 함수 하나**를 읽는다 —
 * 같은 처리단위가 두 화면에서 다른 상태·금액을 말하지 않게.
 *
 * ⚠️ 의존 방향: 이 파일 → `OrderListPage.data`(타입만). 주문 상세·보증금 데이터는 이 파일만 import 한다
 * (주문 상세 ↔ 보증금 데이터가 서로 부르면 순환이 된다 — GPT 검토 2026-11-02 계약 5).
 *
 * 기준 기획: v0.4 `depBack`(반환 = 보증금 − 차감, 연체료 0) · `depTerminal`(차감 0 전액환급 /
 * 차감 ≥ 보증금 전액차감 / 그 사이 일부환급) · 상태 표준(검수완료 = 환급대기, 반납완료 = 종결,
 * 그 전 = 점유중 — proto.html 1614~1616).
 * ---------------------------------------------------------------------- */

/** 보증금이 어디까지 왔나 — 원본 5종 */
export type DepositStatus =
  "holding" | "pendingRefund" | "fullRefund" | "partialRefund" | "fullDeduct";

/**
 * 보증금 상태 → 라벨 · Tag tone. 칸이 좁은 곳은 `label`, 보증금 표의 셀은 원본처럼
 * `cellLabel`(「전액차감」만 있으면 "차감할 예정"으로 읽힌다).
 *
 * | 상태     | 지금 누가 무엇을 해야 하나            | tone       |
 * | -------- | ------------------------------------- | ---------- |
 * | 점유중   | 아무도 — 대여가 정상 진행 중          | `success`  |
 * | 환급대기 | **셀러가 환급을 집행한다**(판정 완료) | `warning`  |
 * | 전액환급 | 아무도 — 정상 종결                    | `default`  |
 * | 일부환급 | 아무도 — 판정대로 종결                | `default`  |
 * | 전액차감 | 아무도, 그러나 **사고로 끝났다**      | `critical` |
 *
 * ⚠️ 원본 색(점유중·환급대기 둘 다 `b-prog`)을 옮기지 않았다 — 집행할 건이 안 보인다.
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
 * 검수 판정 → 라벨 · tone. 원본은 `파손(복원가능)` 키가 배지 사전에 없어 회색으로 나왔다(결함) —
 * 의도(`파손: b-exc`)대로 파손·분실은 `critical`.
 * 안심케어 청구 자격은 `repairable` 하나다(약관 — 분실·복원불가는 청구 대상이 아니다).
 */
export const INSPECTION_META: Record<
  Inspection,
  { label: string; tone: TagTone }
> = {
  ok: { label: "이상없음", tone: "default" },
  repairable: { label: "파손(복원가능)", tone: "critical" },
  unrepairable: { label: "파손(복원불가)", tone: "critical" },
  lost: { label: "분실", tone: "critical" },
};

export interface DepositState {
  status: DepositStatus;
  /** 받아 둔 보증금 */
  deposit: number;
  /** 실효 차감 = 검수 차감 + (렌트 반품 고객 귀책) 반품 배송비 — 한 번씩, 0 ~ 보증금 */
  deduction: number;
  /** 반환액 = max(0, 보증금 − 실효 차감). 종결 전엔 예정액, 종결 뒤엔 완료액 */
  refund: number;
  /** 상태 변경일 `YYYY-MM-DD HH:mm` — 점유중은 `null`(원본 빈 값) */
  changedAt: string | null;
  /** 환급까지 끝났나(종결 3종) */
  done: boolean;
}

/** 결제사 환불 가능 기간 경과 코드 — develop d46e752 `data/rma-cancel.ts` `PG_REFUND_DUE_CODE` */
export const PG_REFUND_DUE_CODE = "EXCEED_MAX_REFUND_DUE";

/**
 * 마지막 보증금 환급 시도가 결제사 기간 경과로 실패한 건의 본사 안내 한 줄 · 아니면 `null`
 * (개발 §3-2-8 — 주문 상세 「보증금 상태」 아래 · 보증금 상세 반환 예정액 아래. develop `refundDueNote` 와 같은 조건)
 */
export const refundDueNoteOf = (order: Order): string | null =>
  order.depositRefundFailureCode === PG_REFUND_DUE_CODE
    ? "결제 취소 기간이 지났어요. 고객에게 연락해 계좌로 환불해 주세요."
    : null;

/** 종결 3종 — 금액으로만 가른다(원본 `depTerminal`). 귀책 이름으로 정하지 않는다 */
const terminalOf = (deposit: number, deduction: number): DepositStatus =>
  deduction <= 0
    ? "fullRefund"
    : deduction >= deposit
      ? "fullDeduct"
      : "partialRefund";

const DONE: DepositStatus[] = ["fullRefund", "partialRefund", "fullDeduct"];

/**
 * 처리단위 → 보증금. 렌트가 아니거나 보증금이 없으면 `null`.
 *
 * 클레임 분기를 **먼저** 본다 — 정상 반납 규칙으로 덮어쓰지 않는다:
 *   · 취소 완료 → 전액환급(위약금 건 U-R24 도 보증금은 전액 — 위약금은 결제금액에서 뺀다 · 기획 확인 요청 18번)
 *     · 취소 환불 처리중 → 환급대기
 *   · 반품 환불 처리중 → 환급대기 · 반품 완료 → 금액으로 종결 3종
 *     (고객 귀책 반품 배송비를 **여기서 한 번만** 뺀다 — 클레임 명세는 이 값을 다시 빼지 않는다.
 *     배송비가 0원이면 고객 귀책이라도 전액환급이다)
 * 그 밖(클레임 진행·반려·거부 포함)은 정상 흐름(`baseStatus`): 반납완료 → 종결 3종 · 검수완료 → 환급대기 ·
 * 그 전 → 점유중. 안심케어 가입 + 복원가능 파손은 검수 차감을 하지 않는다(본사 부담 — 원본 정책 C-2).
 * 연체료 자동 산정은 없다(원본 `depOdFee` = 0).
 */
export const depositOf = (order: Order): DepositState | null => {
  const deposit = order.deposit ?? 0;
  if (order.type !== "rent" || deposit <= 0) return null;

  const claim = order.claim;
  const claimAt = claim?.events[claim.events.length - 1].at ?? null;
  const careCovered = order.care !== null && order.inspection === "repairable";
  const inspectionCut = careCovered ? 0 : Math.max(0, order.deduction);
  /* 고객 귀책 렌트 반품 — 반품 배송비(편도)를 보증금에서 한 번. 진행 중이면 예정액에, 반려·거부면 없다 */
  const returnFee =
    claim?.type === "return" &&
    claim.fault === "customer" &&
    !isClaimRefused(order)
      ? order.returnFee
      : 0;
  const cut = (amount: number) => Math.min(deposit, Math.max(0, amount));
  const deduction = cut(inspectionCut + returnFee);

  const state = (
    status: DepositStatus,
    deduction: number,
    changedAt: string | null,
  ): DepositState => ({
    status,
    deposit,
    deduction,
    refund: Math.max(0, deposit - deduction),
    changedAt,
    done: DONE.includes(status),
  });

  switch (claim?.status) {
    case "canceled":
      return state("fullRefund", 0, claimAt);
    case "cancelRefunding":
      return state("pendingRefund", 0, claimAt);
    case "returnRefunding":
      return state("pendingRefund", deduction, claimAt);
    case "returnDone":
      return state(terminalOf(deposit, deduction), deduction, claimAt);
  }

  if (order.baseStatus === "returned") {
    return state(terminalOf(deposit, deduction), deduction, order.confirmedAt);
  }
  if (order.baseStatus === "inspected") {
    return state("pendingRefund", deduction, order.inspectedAt);
  }
  /* 점유중 — 반환액은 지금 판정대로의 예정액(진행 중 고객 귀책 반품이면 배송비가 빠져 있다) */
  return state("holding", deduction, null);
};
