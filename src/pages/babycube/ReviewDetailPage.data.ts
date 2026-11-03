import { LIST_PATH, findReview, type Review } from "./ReviewListPage.data";

/* -------------------------------------------------------------------------
 * 리뷰 상세 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `ReviewDetailPage.tsx` · 들어오는 곳: 리뷰 관리 내용 링크·행 클릭(`/reviews-admin/{리뷰 id}`)
 * 기준 기획: **v0.4** `DETAILS.reviewDetail` (proto.html 5421~5443) · 동작 `rvHideSave`·`rvRestore` (3596~3601)
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `findReview(id)` → 리뷰 | `undefined` (목록과 같은 배열 `REVIEWS`)
 * - 구역 2개 제목은 `SECTIONS` — 원본 `리뷰 정보` · `노출 관리`
 * - 문구는 `COPY` — 도움말·토스트·오류는 원본 문장 그대로
 * - 숨김 사유 글자 수 `REASON_MAX`(원본 `maxlength=60`)
 *
 * ## 퍼블 범위 (사용자 결정 2026-11-03)
 * [숨김 처리]는 사유(trim)가 비면 입력칸 아래 오류로 멈추고, 통과하면 **알림만** · [복원]은 확인 없이 **알림만**.
 * 배지·노출 관리 카드·버튼은 그대로다(원본은 `hidden`·`reason` 을 바꾸고 다시 그린다).
 *
 * ## 원본과 다르게 둔 것
 * - 머리를 그린다 — 제목 「리뷰 상세」(원본 `DETAIL_TITLES`) + 부제 + 상태 배지(형제 상세와 같다)
 * - 사유 오류는 토스트가 아니라 입력칸 아래(형제 규칙)
 * - 별점은 별 아이콘 + `(N점)`(목록과 같은 그림)
 * - 구역 접기(형제 상세와 같다)
 *
 * ## 기획 확인 필요 (원본대로 둠)
 * - 판매자 답글 필드가 원본 데이터에 없어 언제나 `-` 다
 * - 「숨김해도 자동 회수 없음」인데 포인트 원장에는 「리뷰 삭제로 회수 · 시스템 자동」이 있다
 * ---------------------------------------------------------------------- */

export { LIST_PATH, findReview };
export const PAGE_TITLE = "리뷰 상세";
export const LIST_LABEL = "리뷰 목록";

export const SECTIONS = {
  info: "리뷰 정보",
  manage: "노출 관리",
} as const;

/** 숨김 사유 최대 글자 수 — 원본 `maxlength="60"` */
export const REASON_MAX = 60;

export const COPY = {
  notFoundTitle: "찾을 수 없는 리뷰입니다",
  notFoundDescription: "해당 항목이 존재하지 않거나 삭제되었습니다.",
  replyHelpLead: "판매자 답글은 ",
  replyHelpStrong: "입점사 어드민",
  replyHelpTail: "에서 작성합니다. 본사는 내용만 확인합니다.",
  /** 답글이 없을 때 — 빈 회색 상자에 `-` 하나 대신 흐린 문구(쿠폰 「조건 없음」과 같은 꼴) */
  replyEmpty: "답글 없음",
  reasonPlaceholder: "숨김 사유 1줄 (필수)",
  hideHelpLead: "숨김 처리해도 리뷰 지급 포인트는 ",
  hideHelpStrong: "자동 회수되지 않습니다",
  hideHelpTail: " — 악용 건은 포인트 관리에서 수동 차감하세요.",
  restoreHelp:
    "복원하면 사용자 앱 상품 상세에 리뷰가 다시 노출되고 숨김 사유는 삭제됩니다.",
  reasonEmpty: "숨김 사유를 입력해주세요.",
  hide: "숨김 처리",
  restore: "복원",
  hidden:
    "리뷰가 숨김 처리되었습니다(포인트 자동 회수 없음 — 악용 건은 포인트 관리에서 수동 처리).",
  restored: "리뷰가 복원되었습니다.",
} as const;

/** 읽기 전용 상자의 빈 값 — 원본 `gROtext('')` */
export const EMPTY_TEXT = "-";
export const textOrDash = (value: string) => value.trim() || EMPTY_TEXT;

/** 별점 옆 숫자 — 원본 `(4점)` */
export const scoreText = (rating: number) => `(${rating}점)`;

/** 머리 부제 — 리뷰 id · 작성자 · 상품 */
export const headlineOf = (review: Review) =>
  [review.id, review.author, review.product].join(" · ");
