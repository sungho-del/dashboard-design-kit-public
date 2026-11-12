import {
  ASK_PATH,
  NOTICE_PATH,
  REVIEWS_PATH,
  SUPPORT_PATH,
} from "./BoardPages.labels";

/* 셀러 `BoardDetailPages.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./BoardDetailPages.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

/* =========================================================================
 * 게시판 상세 4화면 — 도메인 층 (공지 · 문의 · 리뷰 · 1:1 문의(등록/수정))
 *
 * 원본 = 기획 v0.4 `DETAILS.noticeDetail`(5217) · `inqDetail`(5230) · `reviewDetail`(5249) ·
 * `askDetail`(5265) · 저장 `inqReplySave`(3616) · `rvReplySave`(3651) · `askNewSave`(3681).
 * 화면 제목 = 원본 `DETAIL_TITLES`(6166). 문구는 원본 글자 그대로(`**` = 원본 `<b>`).
 * 짝이 되는 뼈대: `BoardDetailPages.tsx`
 *
 * ## 갈아끼울 것
 * | 실물 이름        | 역할                                                      |
 * | ---------------- | --------------------------------------------------------- |
 * | `find*`          | 경로의 id → 시드 행(없으면 「찾을 수 없음」)               |
 * | `*_COPY`         | 화면 제목 · 구역 제목 · 자리표시 · 도움말 · 알림 · 버튼 이름 |
 * | `NOT_FOUND`      | 화면별 「찾을 수 없음」 문구 · [목록] 경로                 |
 * | `ASK_TITLE_MAX`  | 1:1 제목 글자 수 상한(원본 `maxlength="60"`)              |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 1:1 문의는 id 가 `new` 면 작성, 아니면 그 문의(접수 = 수정 가능 · 답변완료 = 읽기 전용)
 * - 버튼 이름은 **지금 화면의 상태**로 정한다 — 답변·답글을 등록하면 이 화면 안에서는 「수정」이 된다
 *
 * ## 퍼블 범위
 * 저장은 **이 화면의 상태만** 바꾼다(원본 `render()` 처럼 배지·버튼이 바뀐다) — 시드·목록은 그대로다.
 * 1:1 [문의 접수]·[수정]은 원본처럼 목록으로 돌아가며 알림만 — 목록에 새 행·고친 제목은 나오지 않는다.
 *
 * ## 기획 확인 필요 (원본대로 둠)
 * - 리뷰 답글 도움말 「답글은 **상품당** 1개」 — 원본 주석·저장 로직은 **리뷰당** 1개다
 * - 주문 문의 상세에도 「공개 여부」 줄이 있다 — 원본 주석은 「비밀글은 상품 문의만 의미」라 주문 문의는 늘 「공개」
 * - 1:1 문의 「내용」은 필수가 아니다 — 원본은 제목만 검사해 빈 내용으로도 접수된다
 * - 1:1 문의 답변완료 건도 화면 제목이 「1:1 문의 상세 (등록/수정)」(읽기 전용인데 등록/수정)
 * - 1:1 「본사 답변」 카드 안 줄 이름도 「본사 답변」 — 같은 말이 두 번
 * - 원본 저장의 「답변이 등록된 문의는 수정할 수 없습니다.」 막음은 화면에서 닿지 않는다
 *   (답변완료면 [수정] 버튼 자체가 없다) — 그래서 두지 않았다
 * ====================================================================== */

export const byId =
  <T extends { id: string }>(rows: T[]) =>
  (id: string) =>
    rows.find((row) => row.id === id);

export const NOTICE_COPY = {
  title: "공지 상세",
  section: "공지 정보",
  help: "공지는 **본사가 발행**합니다. 내용에 대한 문의는 **1:1 문의**로 접수해 주세요.",
} as const;

export const INQ_COPY = {
  title: "문의 상세",
  section: "문의 정보",
  secret: "비밀글 (작성자·판매자만 열람)",
  public: "공개",
  placeholder: "답변 내용을 입력해 주세요",
  help: "등록한 답변은 **사용자 앱 상품 상세 Q&A(주문 문의는 주문 상세)**에 그대로 노출됩니다.",
  empty: "답변 내용을 입력해주세요.",
  register: "답변 등록",
  update: "답변 수정",
  registered: "답변이 등록되었습니다.",
  updated: "답변이 수정되었습니다.",
  doneStat: "답변완료",
} as const;

export const REVIEW_COPY = {
  title: "리뷰 상세",
  section: "리뷰 정보",
  placeholder: "답글 내용을 입력해 주세요",
  help: "답글은 상품당 **1개**이며 사용자 앱 리뷰 아래에 노출됩니다. 리뷰 **숨김·복원은 본사 권한**이라 여기서 처리할 수 없습니다.",
  empty: "답글 내용을 입력해주세요.",
  register: "답글 등록",
  update: "답글 수정",
  registered: "판매자 답글이 등록되었습니다.",
  updated: "판매자 답글이 수정되었습니다.",
} as const;

export const scoreText = (rating: number) => `(${rating}점)`;

export const ASK_COPY = {
  title: "1:1 문의 상세 (등록/수정)",
  sectionNew: "문의 작성",
  section: "문의 정보",
  answerSection: "본사 답변",
  titlePlaceholder: "제목을 입력해 주세요",
  bodyPlaceholder: "문의 내용을 입력해 주세요",
  waiting:
    "아직 답변이 등록되지 않았습니다. 답변 등록 전까지는 제목·내용을 수정할 수 있습니다.",
  titleEmpty: "제목을 입력해주세요.",
  submit: "문의 접수",
  update: "수정",
  submitted: "문의가 접수되었습니다.",
  updated: "문의가 수정되었습니다.",
  doneStat: "답변완료",
} as const;

/** 원본 `maxlength="60"` */
export const ASK_TITLE_MAX = 60;

export interface NotFoundCopy {
  title: string;
  what: string;
  listPath: string;
  listLabel: string;
}

const notFound = (
  title: string,
  what: string,
  listPath: string,
  listLabel: string,
): NotFoundCopy => ({ title, what, listPath, listLabel });

/** 「찾을 수 없음」 — 형제 상세와 같은 꼴(「찾을 수 없는 ○○입니다」 + 목록으로) */
export const NOT_FOUND = {
  notice: notFound(NOTICE_COPY.title, "공지", NOTICE_PATH, "공지사항으로"),
  inquiry: notFound(INQ_COPY.title, "문의", SUPPORT_PATH, "문의 관리로"),
  review: notFound(REVIEW_COPY.title, "리뷰", REVIEWS_PATH, "리뷰 관리로"),
  ask: notFound(ASK_COPY.title, "문의", ASK_PATH, "1:1 문의로"),
} as const;
