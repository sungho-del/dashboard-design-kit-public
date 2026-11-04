import {
  CLAIM_DONE,
  CLAIM_EXCEPTIONS,
  CLAIM_FLOW,
  claimStatOf,
  claimStatuses,
  isShipped,
  type ClaimType,
} from "./claim.data";
import type { ProcessScreen } from "./gate.data";
import { pickupOf } from "./orderUnit.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";
import type { DetailAction, UnitDetailConfig } from "./unitDetail.data";

/* =========================================================================
 * 취소 상세 · 반품 상세 · 교환 상세 — **도메인 층**(화면 설정 3벌). 뼈대는 공용 `UnitDetail.tsx`.
 *
 * 원본 = 기획 v0.4 `DETAILS.rmaCancel|rmaReturn|rmaExchange`(5021) → `udRmaDetail(u, cfg)`(4945) →
 * `udOrderPage(u, {statOpts: rmaOpts(type), rma: type, shipMode: 'ro'})`.
 *
 * ## 원본과 다르게 둔 곳
 * - 경로의 유형과 처리단위의 클레임 유형이 다르면 「찾을 수 없음」(원본은 취소 경로로 반품 건도 열었다 · 본사와 같다)
 * - **D-315 (판정 회신 11차)** — 방문 수령 반품·교환은 송장이 없다: 승인 뒤 [방문 반납 대기 처리],
 *   받으면 [수거완료 처리]. 원본 v0.4 에 없던 갈래다(시드에는 방문 수령 승인 건이 없어 화면에서 볼 일은 아직 없다)
 * ====================================================================== */

const SCREEN: Record<
  "판매" | "렌트",
  Partial<Record<ClaimType, { screen: ProcessScreen; path: string }>>
> = {
  판매: {
    취소: { screen: "saleCancel", path: "/sale-cancel" },
    반품: { screen: "saleReturn", path: "/sale-return" },
    교환: { screen: "saleExchange", path: "/sale-exchange" },
  },
  /* 렌트 클레임 = 취소·반품 2유형(교환 미운영 · H-11) */
  렌트: {
    취소: { screen: "rentCancel", path: "/rent-cancel" },
    반품: { screen: "rentRma", path: "/rent-rma" },
  },
};

/** D-315 방문 반납 대기 — 방문 수령 반품·교환의 승인 다음 단계 */
export const VISIT_RETURN_WAIT = "방문 반납 대기";

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
  const actions: DetailAction[] = next ? [{ label, to: next }] : [];
  if (
    exceptions.length &&
    !CLAIM_DONE.includes(stat) &&
    !exceptions.includes(stat)
  )
    actions.push({
      label: `${type} 반려`,
      to: `${type} 반려`,
      tone: "criticalTonal",
    });
  if (stat === `${type} 반려`)
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
