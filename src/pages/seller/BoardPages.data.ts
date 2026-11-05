import type { TagTone } from "../../components/ui";
import {
  SELLER_NOTICES,
  type SellerInquiry,
  type SellerNotice,
} from "./seed/board.data";

/* =========================================================================
 * 게시판 관리 4목록 — 도메인 층 (공지사항 · 문의 관리 · 리뷰 관리 · 1:1 문의)
 *
 * 원본 = 기획 v0.4 `SCREENS.sellerNotice`(3590) · `support`(3623) · `sellerReviews`(3658) · `sellerAsk`(3693).
 * 행은 시드 `./seed/board.data`(원본 배열 그대로) — 이 파일은 경로·라벨·톤·셀 표기만.
 * 짝이 되는 뼈대: `BoardPages.tsx` · 상세는 `BoardDetailPages.*`
 *
 * ## 갈아끼울 것
 * | 실물 이름                    | 역할                                                   |
 * | ---------------------------- | ------------------------------------------------------ |
 * | `*_PATH` · `detailPathOf`    | 목록 경로 · 상세 경로(`{목록}/{id}`) · 1:1 새 문의(`/new`) |
 * | `BOARD_TONE` · `boardToneOf` | 게시판 상태 → Tag 톤(본사 문의·리뷰 화면과 같은 색)      |
 * | `INQ_TYPE_TABS` · `inqTypeOf` | 문의 유형 칩(전체/상품 문의/주문 문의) · 유형 라벨      |
 * | `replyStatOf`                | 리뷰 답글 유무 → 「답글 완료/답글 대기」(원본 파생)     |
 * | `ratingLabel`                | 별점 읽기 이름                                         |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행은 `id` 를 가진다(체크박스 · 상세 경로)
 * - `BOARD_TONE` 에 없는 상태는 `default`(중립)
 * - 문의 `type` 이 비면 「상품」으로 본다(원본 폴백)
 * - 공지 목록·대시보드 공지 카드는 `NOTICE_ROWS`(고정 먼저(최신순) → 일반(최신순) — 판정 Q13 「세 앱 공통」)
 *
 * ## 원본에 없어서 두지 않은 것
 * 검색조건(FilterBar) · 상태 카드 — 원본 `FILTERS` 에 네 화면이 없다. 문의 관리의 유형 칩만 있다.
 *
 * ## 기획 확인 필요 (원본대로 둠)
 * - 문의 상태 어휘가 갈린다 — 데이터·배지는 「접수」, 상태 사전(`STAT_TIP`)·대시보드 타일은 「미답변」
 * - 문의 목록 열 「회원」 ↔ 문의 상세 줄 「작성자」 — 같은 값에 이름이 둘
 * - 대시보드 타일(미답변 문의 · 답글 미작성 리뷰 · 1:1 답변 대기)이 여는 목록은 거르지 않은 전체다
 *   — 목록에 상태 필터가 없다
 * - 원본 배지 맵(`statusBadge`)에 「접수」·「답변완료」가 없어 둘 다 회색(종결색)이다 → 우리는 본사 톤(아래)
 * - 1:1 문의 SQ-12 접수일 2026.07.02 이 데모 기준일(2026.06.29)보다 뒤다
 * ====================================================================== */

export const NOTICE_PATH = "/seller-notice";
export const SUPPORT_PATH = "/support";
export const REVIEWS_PATH = "/seller-reviews";
export const ASK_PATH = "/seller-ask";
/** 1:1 문의 작성 — 원본 `openDetail('askDetail','new')` */
export const ASK_NEW_KEY = "new";

export const detailPathOf = (listPath: string, id: string) =>
  `${listPath}/${encodeURIComponent(id)}`;

/**
 * 본사 공지 순서 — 고정 먼저 → 같은 묶음 안은 등록일 최신순(판정 Q13 · 디자인 §1 「세 앱 공통」 —
 * 본사 `NoticeListPage.data` `noticeOrder` 와 같은 규칙). 시드는 손대지 않고 여기서 정렬한다.
 */
export const noticeOrder = (a: SellerNotice, b: SellerNotice) =>
  Number(b.pin) - Number(a.pin) || b.date.localeCompare(a.date);

export const NOTICE_ROWS = [...SELLER_NOTICES].sort(noticeOrder);

/**
 * 게시판 상태 → 톤. 본사 `SupportListPage.data`(미답변 warning · 답변완료 default)와 같은 규칙 —
 * **누가 무언가를 해야 끝나는 상태 = warning**, 종결 = default.
 * (`orderUnit.data` 의 `toneOf` 는 주문 상태 사전이라 여기 두지 않는다)
 */
export const BOARD_TONE: Record<string, TagTone> = {
  접수: "warning",
  답변완료: "default",
  "답글 대기": "warning",
  "답글 완료": "default",
};
export const boardToneOf = (status: string): TagTone =>
  BOARD_TONE[status] ?? "default";

/** 리뷰 답글 상태 — 원본 `r.reply ? '답글 완료' : '답글 대기'` */
export const replyStatOf = (hasReply: boolean) =>
  hasReply ? "답글 완료" : "답글 대기";

/** 고정 배지 — 목록은 「고정」, 상세는 「상단 고정」(원본 글자 그대로) */
export const PIN_LABEL = "고정";
export const PIN_DETAIL_LABEL = "상단 고정";
export const EMPTY_CELL = "-";

/** 문의 유형 라벨 — 원본 `tName` (type 미지정 = 상품) */
export const inqTypeOf = (q: SellerInquiry) =>
  q.type === "주문" ? "주문 문의" : "상품 문의";

/** 유형 칩 — 원본 `['전체','상품 문의','주문 문의']` · 기본 전체 */
export const INQ_TYPE_ALL = "전체";
export const INQ_TYPE_TABS = [INQ_TYPE_ALL, "상품 문의", "주문 문의"].map(
  (value) => ({ value, label: value }),
);

export const RATING_MAX = 5;
export const ratingLabel = (rating: number) =>
  `별점 ${rating}점 (${RATING_MAX}점 만점)`;

/** 비밀글 표시 읽기 이름 — 원본 🔒 */
export const SECRET_LABEL = "비밀글";
