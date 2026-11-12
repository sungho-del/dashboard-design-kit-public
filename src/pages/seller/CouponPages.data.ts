import { COUPONS } from "./seed/store.data";

export * from "./CouponPages.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./CouponPages.labels`(개발 요청 2026-11-12 46번) */

export const findCoupon = (id: string) => COUPONS.find((c) => c.id === id);
export { COUPONS };
