import type { ClaimType } from "./claim.labels";
import type { ProcessScreen } from "./gate.data";

/* 셀러 `SaleClaimDetailPage.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./SaleClaimDetailPage.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

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

export const SCREEN: Record<
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
