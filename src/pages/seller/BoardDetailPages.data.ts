import {
  SELLER_ASKS,
  SELLER_NOTICES,
  SL_INQUIRIES,
  SL_REVIEWS,
} from "./seed/board.data";
import { byId } from "./BoardDetailPages.labels";

export * from "./BoardDetailPages.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./BoardDetailPages.labels`(개발 요청 2026-11-12 46번) */

export const findNotice = byId(SELLER_NOTICES);
export const findInquiry = byId(SL_INQUIRIES);
export const findReview = byId(SL_REVIEWS);
export const findAsk = byId(SELLER_ASKS);
