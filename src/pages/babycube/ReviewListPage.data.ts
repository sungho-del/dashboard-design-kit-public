import type { TagTone } from "../../components/ui";
import { MEMBERS } from "./MemberListPage.data";
import { ORDERS } from "./OrderListPage.data";
import { POINT_LEDGER } from "./PointListPage.data";

/* -------------------------------------------------------------------------
 * 리뷰 관리 (목록) — **도메인 층** (BabyCube 본사 운영 어드민 · 조회 전용)
 * 기준 기획: v0.4 `plan-members/proto.html` 3588~3611 (`HQ_REVIEWS` · `SCREENS.reviewsAdmin`)
 *
 * 짝이 되는 뼈대: `ReviewListPage.tsx` · 상세: `ReviewDetailPage.*`(`/reviews-admin/{리뷰 id}`)
 *
 * ## 이 화면이 무엇인가
 * 상품 리뷰를 표 하나로 본다. 원본 화면은 `tableCard` 하나뿐 — 상태 대시·검색조건·체크박스·No·
 * 엑셀·정렬 머리가 없다. 숨김·복원은 **상세**의 일이다(원본 2292 — 07-29 숨김 모달 제거).
 * 본사는 답글 주체가 아니다(원본 5421~5422 — 답글은 입점사 어드민).
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할                 | 실물 이름                              |
 * | -------------------- | -------------------------------------- |
 * | 표 한 행의 타입      | `Review`                               |
 * | 상태 파생·라벨·톤    | `reviewStatus` · `STATUS_META`         |
 * | 샘플                 | `REVIEWS` — 원본 4건                   |
 * | 셀 표기              | `bodyText` · `ymd` · `ratingLabel`     |
 * | 상세 경로            | `LIST_PATH` · `detailPathOf`           |
 * | 페이지 크기·빈 상태  | `PAGE_SIZE` · `PAGE_SIZES` · `EMPTY_TITLE` |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 키는 `id`(원본 `RV-31` 꼴) — 상세 경로가 이 값을 쓴다
 * - `date`(`YYYY-MM-DD HH:mm`)가 정렬축이다 — 작성일 최신순(원본은 배열 순서 = 날짜 내림차순)
 * - `STATUS_META` 의 키는 `ReviewStatus` 와 정확히 일치한다
 *
 * ## 상태 = `hidden` 에서 파생 (원본 `statusBadge(r.hidden?'숨김':'노출')`)
 * `노출` success(원본 b-prog) · `숨김` default(원본 b-done) — 형제 톤 규칙과 같다.
 *
 * ## 샘플 — 원본 4건, 대상만 실존 주문으로 (사용자 결정 2026-11-03)
 * id · 문구 · 별점 · 숨김 · 숨김 사유는 원본 그대로. **작성자·셀러·상품·작성일**은 아래 처리단위에서 읽는다 —
 * 작성자 = 그 주문의 구매자 회원(실명, `MEMBERS`) · 셀러·상품 = 그 주문의 것 ·
 * 작성일 = **포인트 원장의 그 주문 리뷰 지급 시각**(리뷰 등록 즉시 지급 — 원본 FAQ 3443).
 * | 리뷰  | 처리단위 | 작성자 · 셀러 · 상품                         | 작성일(원장)     |
 * | ----- | -------- | -------------------------------------------- | ---------------- |
 * | RV-31 | U-R19    | 노하린 · 리틀베이비 · 디럭스 유모차 클래식   | 2026-09-21 10:05 |
 * | RV-30 | U-R30    | 서하준 · 아이랑 · 바구니형 카시트 코지       | 2026-09-04 18:10 |
 * | RV-28 | U-S35    | 노하린 · 아기별상사 · 기내반입 유모차 포켓   | 2026-09-14 19:20 |
 * | RV-27 | U-R28    | 임채원 · 베베하우스 · 베드사이드 침대 코모   | 2026-08-27 19:30 |
 * - RV-28(숨김)은 원본처럼 판매 건 — 원장의 판매 리뷰 중 셀러 판매 · RV-31~RV-30 사이 날짜에 가장 가까운 건이다.
 *   그래도 날짜가 RV-30 보다 늦어 **최신순 2번째**에 온다(원본은 3번째)
 * - 숨김 리뷰는 원장 「리뷰 삭제로 회수」(U-S32)와 **잇지 않았다** — 숨김은 삭제가 아니고, 원본 상세는
 *   「숨김 처리해도 포인트는 자동 회수되지 않습니다」라고 적는다. 회수 행은 목록에 없는(삭제된) 리뷰의 것이다
 * - 판매자 답글 `reply` 는 원본처럼 4건 모두 비어 있다(상세에 `-`)
 *
 * ## 기획 확인 필요 (원본대로 둠)
 * - 리뷰 ↔ 주문 연결 키가 원본 데이터에 없다(우리는 `unit` 으로 잇는다 — 화면에는 열이 없다)
 * - 리뷰 작성 가능 시점이 정의돼 있지 않다 — 원장의 리뷰 지급이 모두 반납완료·구매확정 **전**이다
 *   (렌트는 이용 중, 판매는 배송 뒤). 이 4건도 그렇다
 * - 포토/일반 지급(500P·100P)을 가르는 사진 여부가 리뷰 데이터·화면에 없다
 * - 셀러 평점이 리뷰와 무관한 고정값이다(원본 955)
 * - 숨김은 자동 회수 없음인데 원장에는 「리뷰 삭제로 회수 · 시스템 자동」이 있다(포인트 화면 결정 — 원본대로)
 *
 * ## 원본과 다르게 둔 곳 (형제 규칙)
 * 열 왼쪽 정렬(상태만 가운데) · 별점은 lucide 별 아이콘 · `?preview=` · 행 어디를 눌러도 상세로
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 「답글 대기/답글 완료」 상태(본사는 답글 주체가 아니다) · 리뷰 미리보기 모달 · 상태 대시와 증감 ·
 * 검색·엑셀 · 답글 등록 · 낮은 별점 강조 · 회원·셀러·상품 샘플에 없는 손 샘플 9건(아이몽컴퍼니 등)
 * ---------------------------------------------------------------------- */

export const LIST_PATH = "/reviews-admin";
export const detailPathOf = (id: string) =>
  `${LIST_PATH}/${encodeURIComponent(id)}`;

export type ReviewStatus = "shown" | "hidden";

/** 상태 → 라벨·톤. 키는 `ReviewStatus` 와 일치해야 한다 */
export const STATUS_META: Record<
  ReviewStatus,
  { label: string; tone: TagTone }
> = {
  shown: { label: "노출", tone: "success" },
  hidden: { label: "숨김", tone: "default" },
};

export interface Review {
  /** 리뷰 id — 행 키 · 상세 경로 (원본 `RV-31`) */
  id: string;
  /** 리뷰를 쓴 주문 처리단위(`ORDERS.id`) — 화면에는 열이 없다 */
  unit: string;
  /** 작성자 = 그 주문의 구매자 회원 실명 */
  author: string;
  seller: string;
  product: string;
  /** 1~`RATING_MAX` 정수 */
  rating: number;
  content: string;
  /** 숨겨도 목록에서 사라지지 않고 내용 앞에 `(숨김)` 이 붙는다(원본) */
  hidden: boolean;
  /** 숨김 사유 — 노출 리뷰는 빈 문자열 */
  reason: string;
  /** 판매자 답글 — 입점사 어드민에서 쓴다. 없으면 빈 문자열 */
  reply: string;
  /** 작성일시 `YYYY-MM-DD HH:mm` = 원장 리뷰 지급 시각. 표에는 `ymd` 로 날짜만 */
  date: string;
}

export const reviewStatus = (review: Review): ReviewStatus =>
  review.hidden ? "hidden" : "shown";

type Seed = Pick<Review, "id" | "unit" | "rating" | "content" | "hidden"> &
  Partial<Pick<Review, "reason" | "reply">>;

/** 처리단위에서 작성자·셀러·상품·작성일을 읽는다 — 공통 데이터에 없으면 바로 깨진다 */
const fromOrder = (seed: Seed): Review => {
  const order = ORDERS.find((item) => item.id === seed.unit);
  if (!order) throw new Error(`리뷰: 주문 처리단위가 없습니다 ${seed.unit}`);
  const member = MEMBERS.find((item) => item.id === order.buyerId);
  if (!member) throw new Error(`리뷰: 구매자 회원이 없습니다 ${order.buyerId}`);
  const paid = POINT_LEDGER.filter(
    (entry) =>
      entry.kind === "earn" &&
      entry.reason.includes("후기") &&
      entry.orderNo === order.orderNo &&
      entry.memberId === member.id,
  );
  if (paid.length !== 1) {
    throw new Error(`리뷰: 원장의 리뷰 지급 행이 1건이 아닙니다 ${seed.unit}`);
  }
  return {
    reason: "",
    reply: "",
    ...seed,
    author: member.name,
    seller: order.seller,
    product: order.productName,
    date: paid[0].at,
  };
};

/** 원본 4건 — 순서·id·문구·별점·숨김·사유 그대로 */
export const REVIEWS: Review[] = [
  {
    id: "RV-31",
    unit: "U-R19",
    rating: 5,
    content: "성장단계 추천으로 골랐는데 우리 아이한테 딱 맞아요.",
    hidden: false,
  },
  {
    id: "RV-30",
    unit: "U-R30",
    rating: 4,
    content: "상태가 새것 같아요. 벨트가 살짝 빡빡한 것 빼면 만족합니다.",
    hidden: false,
  },
  {
    id: "RV-28",
    unit: "U-S35",
    rating: 1,
    /* 원본 자리표시 그대로 — 시연에서 실제 욕설을 쓰지 않는다 */
    content: "(욕설·비방 내용)",
    hidden: true,
    reason: "욕설·비방 포함 — 커뮤니티 가이드 위반",
  },
  {
    id: "RV-27",
    unit: "U-R28",
    rating: 5,
    content: "조립 기사님이 친절했고 위생 상태 최고예요.",
    hidden: false,
  },
].map(fromOrder);

export const findReview = (id: string) =>
  REVIEWS.find((review) => review.id === id);

/**
 * 내용 셀 — 원본 `(hidden?'(숨김) ':'')+txt`, 비면 `-`.
 * 접두어는 괄호 없이 `숨김` 을 따로 준다 — 뼈대가 흐리게 그린다(원본 자리표시
 * `(욕설·비방 내용)` 의 괄호와 겹쳐 `(숨김) (…)` 로 읽히던 것을 정리)
 */
export const HIDDEN_PREFIX = "숨김";
export const EMPTY_CELL = "-";

export const bodyParts = (review: Review) => {
  const text = review.content.trim();
  return {
    prefix: review.hidden ? HIDDEN_PREFIX : null,
    text: text || (review.hidden ? "" : EMPTY_CELL),
  };
};

/** 작성일 — 날짜만, 점 구분(원본 `2026.06.25`) */
export const ymd = (dateText: string) =>
  dateText.slice(0, 10).replace(/-/g, ".");

/** 별점 만점 — 원본 `'★'.repeat(n)+'☆'.repeat(5-n)` */
export const RATING_MAX = 5;

/** 별 그림의 접근가능 이름 — 점수를 숫자로도 전한다 */
export const ratingLabel = (rating: number) =>
  `별점 ${rating}점 (${RATING_MAX}점 만점)`;

/** 빈 상태 — 원본 공용 `tableEmpty`(검색조건이 없어 「필터 초기화」는 두지 않는다) */
export const EMPTY_TITLE = "해당 조건의 항목이 없습니다";

/** 한 페이지 행 수 — 원본 기본 10, 고를 수 있는 크기 4종 */
export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];
