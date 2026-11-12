import {
  CLAIM_DONE,
  CLAIM_EXCEPTIONS,
  CLAIM_FLOW,
  claimStatOf,
  claimStatuses,
  isShipped,
  type ClaimType,
} from "./claim.data";
import { pickupOf } from "./orderUnit.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";
import type { DetailAction, UnitDetailConfig } from "./unitDetail.data";
import { VISIT_RETURN_WAIT, SCREEN } from "./SaleClaimDetailPage.labels";

export * from "./SaleClaimDetailPage.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./SaleClaimDetailPage.labels`(개발 요청 2026-11-12 46번) */

/** 원본 `udRmaDetail` 하단 버튼 — 다음 단계 [{다음} 처리] · [{유형} 반려] · 반려 건 [재반송 처리] */
export function claimActionsOf(u: OrderUnit, type: ClaimType): DetailAction[] {
  const stat = claimStatOf(u) || CLAIM_FLOW[type][0];
  const rent = u.type === "렌트";
  /*
   * 출고 뒤 취소 건은 반품으로 넘긴다. 렌트 취소 요청은 출고됐어도 [환불 처리중]이 함께 있다
   * (develop · 개발 요청 33번)
   */
  if (type === "취소" && isShipped(u) && stat !== "취소 완료")
    return [
      ...(rent && stat === "취소 요청"
        ? [{ label: "환불 처리중 처리", to: "환불 처리중" }]
        : []),
      { label: "반품 전환", special: "toReturn" as const },
    ];
  /*
   * 렌트 반품 — 수거·검수·환불은 대여·연체 / 검수·반납 메뉴가 맡아 「다음 처리」가 없다.
   * 승인 = [대여·연체 관리로] · 수거완료·검수 = [검수·반납 관리로](develop · 개발 요청 34번)
   */
  if (rent && type === "반품") {
    const id = u.id;
    const actions: DetailAction[] = [];
    if (stat === "반품 신청")
      actions.push({ label: "반품 승인 처리", to: "반품 승인" });
    if (stat === "반품 승인")
      actions.push({ label: "대여·연체 관리로", go: `/rent-use/${id}` });
    if (stat === "반품 수거완료" || stat === "반품 검수")
      actions.push({
        label: "검수·반납 관리로",
        go: `/rent-insp-return/${id}`,
      });
    if (["반품 신청", "반품 승인", "반품 수거중"].includes(stat))
      actions.push({
        label: "반품 반려",
        to: "반품 반려",
        tone: "criticalTonal",
      });
    if (stat === "반품 반려" || stat === "반품 거부")
      actions.push({
        label: "재반송 처리",
        to: "재반송",
        tone: "criticalTonal",
      });
    return actions;
  }
  const flow = CLAIM_FLOW[type];
  const exceptions = CLAIM_EXCEPTIONS[type];
  const ci = flow.indexOf(stat);
  let next = ci >= 0 && ci < flow.length - 1 ? flow[ci + 1] : null;
  let label = next ? `${next} 처리` : "";
  /* D-315 — 방문 수령은 수거 송장 단계 대신 방문 반납 */
  if (type !== "취소" && pickupOf(u)) {
    if (stat === `${type} 승인`) {
      next = VISIT_RETURN_WAIT;
      label = "방문 반납 대기 처리";
    } else if (stat === VISIT_RETURN_WAIT) {
      next = `${type} 수거완료`;
      label = "수거완료 처리";
    }
  }
  /* 택배 반품·교환 승인 뒤 — [수거 송장 등록](택배사·송장 창 · develop · 개발 요청 23번) */
  const collectStep =
    type !== "취소" && !pickupOf(u) && stat === `${type} 승인`;
  const actions: DetailAction[] = collectStep
    ? [{ label: "수거 송장 등록", special: "collect" }]
    : next
      ? [{ label, to: next }]
      : [];
  /*
   * 반려·거부 — develop: 수거 전에는 [반려], 수거완료·검수 단계에서는 [거부](사유 필수 · 개발 요청 20·23번).
   * 반려·거부 건은 [재반송 처리]
   */
  const collected = [`${type} 수거완료`, `${type} 검수`].includes(stat);
  if (
    exceptions.length &&
    !CLAIM_DONE.includes(stat) &&
    !exceptions.includes(stat)
  ) {
    const reject = `${type} ${collected ? "거부" : "반려"}`;
    actions.push({ label: reject, to: reject, tone: "criticalTonal" });
  }
  if (stat === `${type} 반려` || stat === `${type} 거부`)
    actions.push({ label: "재반송 처리", to: "재반송", tone: "criticalTonal" });
  return actions;
}

/**
 * 출고 뒤 취소 예시 — 시드의 취소 요청은 전부 출고 전이라 [반품 전환]이 화면에 안 보인다.
 * 판매 · 렌트 취소 요청 한 건씩 출고된 것으로 연다(개발 요청 21 · 33번). 실제 값은 서버
 */
const SHIPPED_CANCEL: Record<string, { courier: string; invoice: string }> = {
  "20260614914021-1": { courier: "CJ대한통운", invoice: "612877410098" },
  "20260617158784-1": { courier: "롯데택배", invoice: "517289567001" },
};
const withShippedSample = (u: OrderUnit | undefined) => {
  const s = u && SHIPPED_CANCEL[u.id];
  return s ? { ...u, ...s, ship: `${s.courier} ${s.invoice}` } : u;
};

/** 원본 `udRmaDetail(u, {type, isRent})` — 렌트는 제목에 (렌트) · 「교환으로 변경」 없음(원본 `DETAIL_TITLES`) */
export const claimDetail = (
  type: ClaimType,
  unitType: "판매" | "렌트" = "판매",
): UnitDetailConfig => {
  const { screen, path } = SCREEN[unitType][type]!;
  return {
    screen,
    title: unitType === "렌트" ? `${type} 상세(렌트)` : `${type} 상세`,
    listPath: path,
    listLabel: `${type} 관리로`,
    find: (id) =>
      withShippedSample(
        UNITS.find(
          (u) => u.id === id && u.type === unitType && u.req?.type === type,
        ),
      ),
    statusOptions: claimStatuses(type)
      .filter((s) => unitType === "판매" || s !== "교환으로 변경")
      .map((s) => ({ value: s, label: s })),
    /* 클레임 상세의 출고 송장은 읽기만(원본 `shipMode: 'ro'`) */
    shipMode: () => "ro",
    actions: (u) => claimActionsOf(u, type),
  };
};

export const SALE_CANCEL_DETAIL = claimDetail("취소");
export const SALE_RETURN_DETAIL = claimDetail("반품");
export const SALE_EXCHANGE_DETAIL = claimDetail("교환");
