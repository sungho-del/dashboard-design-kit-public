import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S21 리뷰 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `ReviewListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 화면 유형: **목록형** (`docs/screen-templates.md` §3-1)
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할               | 실물 이름                       |
 * | ------------------ | ------------------------------- |
 * | 표 한 행의 타입    | `Review`                        |
 * | 상태 → 라벨·톤     | `STATUS_META`                   |
 * | 샘플 데이터        | `REVIEWS`                       |
 * | 별점 표기 규칙     | `RATING_MAX` · `ratingLabel`    |
 * | 내용 셀 표기       | `bodyText`                      |
 * | 페이지당 행 수     | `PAGE_SIZE`                     |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(`YYYY-MM-DD HH:mm`) 를 갖는다
 * - `STATUS_META` 의 키는 `Review["status"]` 와 정확히 일치한다
 *
 * ## 원본 어드민 대조 (`_plan/babycube-admin/chunks/1gh8hvu-ixb27.js` 모듈 17716·26766)
 * 원본 페이지 컴포넌트는 **40줄이 전부**다. 목록 파라미터는
 * `{ sortKey: "createdAt", sortDir: "desc", page, size }` 뿐이고, 카드 프레임에
 * `total` 과 `table` **둘만** 넘긴다:
 * ```js
 * return <Frame total={data?.total ?? 0} table={table} />;
 * ```
 * 즉 **툴바가 통째로 없다** — 필터도, 검색도, 엑셀 다운로드도, 행 액션도 없는
 * 순수 조회 목록이다. 컬럼은 7열이다:
 * `memberName 작성자` · `sellerName 셀러` · `productName 상품` · `rating 별점` ·
 * `body 내용`(링크 + 말줄임) · `createdAt 작성일` · `status 상태`.
 *
 * ### ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **상태 요약 대시 2장과 증감(±건)·비교 기준("어제 대비")**. 원본에 대시가 아예 없고,
 *   증감과 비교 기준은 **우리가 지어낸 수치**였다(`DASHES` 를 통째로 지웠다)
 * - **검색어 입력 · 초기화 · 엑셀 다운로드**. 원본 툴바가 비어 있다
 * - **답글 등록**(`REPLY_TOAST` + 상태 변경). 원본 리뷰 상세 API 가 가진 조치는
 *   `hide`/`restore`(숨김·복원)이고 그나마 **상세 화면**의 것이다. 목록에는 조치가 없다
 * - **낮은 별점 강조**(`LOW_RATING` · `isLowRating` · 툴팁 문구). 원본에 그런 규칙이 없다 —
 *   "2점 이하는 답글을 먼저 달아 주세요"는 우리가 만든 운영 규칙이었다
 *
 * ### 원본에 있었는데 우리가 빠뜨렸던 것 — 되살렸다
 * - **`hidden` 플래그와 `(숨김) ` 접두어.** 원본 내용 셀은
 *   `((e.hidden ? "(숨김) " : "") + (e.body ?? "")).trim() || "-"` 다.
 *   숨긴 리뷰가 목록에서 **사라지지 않고 표시만 달라진다**는 뜻이라, 이 접두어가 없으면
 *   숨김 리뷰와 노출 리뷰를 화면에서 구별할 수 없다
 * - **작성일의 날짜 표기**(`ymd`, 점 구분자). 시각까지 찍고 있었다
 *
 * ## 상태 어휘는 **값 출처 불명**이다
 * 원본 `status` 는 API 가 준다. 공용 배지 맵(`15312`)에 `답글 대기`·`답글 완료` 와
 * `노출`·`숨김` 이 **둘 다** 있는데, 노출 여부는 이미 `hidden` 필드가 들고 있으므로
 * 답글 상태 쪽으로 읽었다. 확정된 값이 아니라 지금 어휘를 그대로 두었다.
 *
 * ## 상태 색 배정 (§3-1)
 * - `waiting`(답글 대기) = **누가 무언가를 해야 끝나는 상태** → `warning`
 * - `done`(답글 완료) = 정상 종료. 더 볼 것이 없다 → `default`
 * ---------------------------------------------------------------------- */

export type ReviewStatus = "waiting" | "done";

export interface Review {
  /** 고유 키 — 뼈대가 행 key 로 쓴다 (원본 `rowKey: e => e.id`) */
  id: string;
  /** 작성자(회원명) */
  author: string;
  seller: string;
  product: string;
  /** 1~`RATING_MAX` 정수 */
  rating: number;
  content: string;
  /**
   * 숨김 처리된 리뷰인가. 숨겨도 **목록에서 사라지지 않고** 내용 앞에 `(숨김)` 이 붙는다
   * (원본 내용 셀의 규칙). 숨김·복원은 리뷰 상세 화면의 일이다.
   */
  hidden: boolean;
  status: ReviewStatus;
  /** 작성일시 `YYYY-MM-DD HH:mm`. 표에는 `ymd` 로 날짜만 낸다 */
  date: string;
}

/** 상태값 → 표시 라벨과 Tag tone. 키는 `Review["status"]` 와 일치해야 한다 */
export const STATUS_META: Record<
  ReviewStatus,
  { label: string; tone: TagTone }
> = {
  waiting: { label: "답글 대기", tone: "warning" },
  done: { label: "답글 완료", tone: "default" },
};

export const REVIEWS: Review[] = [
  {
    id: "RV-3041",
    author: "김보라",
    seller: "아이몽컴퍼니",
    product: "브라이텍스 카시트",
    rating: 5,
    content: "설치가 쉬워서 좋았어요. 아이도 편해합니다.",
    hidden: false,
    status: "waiting",
    date: "2026-08-24 09:12",
  },
  {
    id: "RV-3040",
    author: "이준서",
    seller: "베이비루션",
    product: "스토케 유모차",
    rating: 2,
    content: "바퀴에서 소음이 나요. 소독 상태도 아쉬웠습니다.",
    hidden: false,
    status: "waiting",
    date: "2026-08-23 20:05",
  },
  {
    id: "RV-3038",
    author: "박하늘",
    seller: "쿠쿠베베",
    product: "아기 침대 세트",
    rating: 4,
    content: "조립 설명서가 친절했어요.",
    hidden: false,
    status: "done",
    date: "2026-08-22 14:30",
  },
  {
    id: "RV-3035",
    author: "최시우",
    seller: "아이몽컴퍼니",
    product: "젖병 소독기",
    rating: 5,
    content: "위생 상태가 아주 깨끗했습니다.",
    hidden: false,
    status: "done",
    date: "2026-08-21 11:48",
  },
  {
    id: "RV-3033",
    author: "정다인",
    seller: "베이비루션",
    product: "하이체어",
    rating: 1,
    content: "다리 부분이 흔들려서 불안했어요.",
    hidden: false,
    status: "waiting",
    date: "2026-08-20 18:22",
  },
  {
    id: "RV-3030",
    author: "한서윤",
    seller: "쿠쿠베베",
    product: "아기띠",
    rating: 4,
    content: "허리 지지가 잘 돼서 만족합니다.",
    hidden: false,
    status: "done",
    date: "2026-08-19 10:03",
  },
  {
    id: "RV-3028",
    author: "오지호",
    seller: "아이몽컴퍼니",
    product: "유아 매트",
    rating: 3,
    content: "두께는 적당한데 냄새가 조금 났어요.",
    hidden: false,
    status: "done",
    date: "2026-08-18 16:40",
  },
  {
    /* 숨김 처리된 리뷰 — 목록에서 사라지지 않고 내용 앞에 `(숨김)` 이 붙는다 */
    id: "RV-3026",
    author: "문가온",
    seller: "베이비루션",
    product: "범퍼침대",
    rating: 1,
    content: "여기보다 싼 곳 알려드릴게요. 연락 주세요.",
    hidden: true,
    status: "done",
    date: "2026-08-17 21:14",
  },
  {
    id: "RV-3025",
    author: "서다온",
    seller: "베이비루션",
    product: "범퍼침대",
    rating: 5,
    content: "회수까지 빨라서 좋았습니다.",
    hidden: false,
    status: "done",
    date: "2026-08-17 09:55",
  },
];

/**
 * 내용 셀의 표기 — 원본 그대로다:
 * `((hidden ? "(숨김) " : "") + (body ?? "")).trim() || "-"`.
 *
 * 본문이 비어 있으면 `-` 가 되는 갈래는 **별점만 남긴 리뷰**를 위한 것이다
 * (샘플에는 없지만 실 데이터에는 있다).
 */
export const HIDDEN_PREFIX = "(숨김) ";
export const EMPTY_CELL = "-";

export const bodyText = (review: Review) =>
  ((review.hidden ? HIDDEN_PREFIX : "") + review.content).trim() || EMPTY_CELL;

/**
 * 작성일 표기 — **날짜만, 점 구분자**. 원본 공용 포맷터(모듈 32916) 그대로다:
 * `e => e ? e.slice(0, 10).replace(/-/g, ".") : "-"`.
 */
export const ymd = (dateText: string) =>
  dateText.slice(0, 10).replace(/-/g, ".");

/* ── 별점 표기 규칙 ───────────────────────────────────────────────────────
 * 별의 개수는 뼈대가 그리지만 **만점이 몇인지는 도메인**이다(5점인지 10점인지).
 * 원본은 `"★".repeat(rating) + "☆".repeat(5 - rating)` 로 5점 만점을 그린다.
 * ---------------------------------------------------------------------- */

/** 만점 */
export const RATING_MAX = 5;

/**
 * 별점의 접근성 문구. 별 그림만으로는 스크린리더가 점수를 읽지 못한다.
 * 모양이 아니라 **숫자로도** 전달하기 위한 것이다.
 */
export const ratingLabel = (rating: number) =>
  `별점 ${rating}점 (${RATING_MAX}점 만점)`;

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 원본 `DEFAULT_PAGE_SIZE` 지만 **샘플이 9건뿐이라 페이징 동작이
 * 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 4;
