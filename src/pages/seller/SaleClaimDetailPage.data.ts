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
  /* 출고 뒤 취소 건은 반품으로 넘긴다 */
  if (type === "취소" && isShipped(u) && stat !== "취소 완료")
    return [{ label: "반품 전환", special: "toReturn" }];
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
      UNITS.find(
        (u) => u.id === id && u.type === unitType && u.req?.type === type,
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
