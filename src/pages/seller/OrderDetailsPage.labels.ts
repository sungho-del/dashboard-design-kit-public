import { flowStatOf } from "./orderUnit.labels";

/* 셀러 `OrderDetailsPage.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./OrderDetailsPage.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

/* =========================================================================
 * 주문 상세(통합 · SO-ORD-002) — 결제(주문번호) 한 건 · 도메인
 *
 * 원본 = 기획 v0.4 `DETAILS.orderDetail`(5047) · `unitsOf`(1283). 개발 저장소 경로 `/order-details/[orderNo]`.
 * 한 결제 안의 처리단위는 담당(자체/입점사)·진행 상태가 각각 독립이라 표로 늘어놓고, 상품명을 누르면
 * 유형별 처리단위 상세(렌트 → 렌트 발주 · 판매 → 발주)로 간다.
 *
 * ## 기획 확인 필요 (원본대로 둔 것)
 * - 원본 돌아갈 곳 `ordersAll`(전체 주문 목록)은 셀러 앱에 없는 화면이다 — 우리는 주문 통합 관리(`/sale-orders`)로 돌아간다
 * - 원본은 한 결제의 다른 셀러·본사 처리단위까지 보였다 — develop 대로 **내 스토어 유닛만** 보인다(개발 요청 14번)
 * - 이 화면으로 오는 통로가 원본 셀러 메뉴에 없다(화면 목록에서만 연다)
 * ====================================================================== */

export const LIST_PATH = "/order-details";
export const BACK_PATH = "/sale-orders";

export const PAY_STATS = ["결제완료", "입금대기", "결제취소"].map((v) => ({
  value: v,
  label: v,
}));

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
export { won };

export const unitPathOf = (u: { type: string; id: string }) =>
  u.type === "렌트" ? `/rent-list/${u.id}` : `/sale-proc/${u.id}`;
export const unitStatusOf = flowStatOf;

export const ORDER_DETAIL_COPY = {
  /** develop 구역 이름 — 「담당」·「셀러」 열을 빼서 내 스토어 몫임을 이름이 말한다(개발 요청 14번) */
  unitsTitle: "주문 상품 — 내 스토어 담당 유닛",
  sumTitle: "내 스토어 결제 요약",
  receipt: (no: string) => `${no} 영수증`,
  deposit: (no: string) => `${no} 입금 확인`,
  saved: "저장되었습니다.",
} as const;
