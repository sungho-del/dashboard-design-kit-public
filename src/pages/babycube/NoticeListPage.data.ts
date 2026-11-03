import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S19 공지사항 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `NoticeListPage.tsx`(목록) · `NoticeFormPage.tsx`(등록/수정 폼)
 * 화면 유형: **목록형** (`docs/screen-templates.md` §3-1)
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할                | 실물 이름                              |
 * | ------------------- | -------------------------------------- |
 * | 표 한 행의 타입     | `Notice`                               |
 * | 대상 전환 탭        | `AUDIENCES` · `audienceOf`             |
 * | 상태 → 라벨·톤      | `STATUS_META`                          |
 * | 샘플 데이터         | `NOTICES`                              |
 * | 게시 기간 표기      | `periodParts`                          |
 * | 본문 발췌 규칙      | `excerpt` · `EXCERPT_LENGTH`           |
 * | 경로                | `LIST_PATH` · `listPathOf` · `formPathOf` · `NEW_KEY` |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키·상세 경로 조각) · `date`(`YYYY-MM-DD`) 를 갖는다
 * - `STATUS_META` 의 키는 `Notice.status` 값과 정확히 일치한다
 * - `AUDIENCES` 에는 **「전체」가 없다** — 첫 항목이 기본값이다
 * - `periodParts` 는 `{ lead, tail, tailMuted }` 를 돌려준다
 * - `NOTICES` 는 **보일 순서 그대로** 놓는다(뼈대는 정렬하지 않는다)
 *
 * ## 원본 = 기획 v0.4 `plan-members/proto.html`
 * - 목록 `SCREENS.notices` 3415-3432 · 샘플 `NOTICES` 3386-3394 · 저장 `noticeSave` 3397-3406
 * - 폼 `DETAILS.noticeForm` 5009-5030(틀 `nvEditPage` 4734-4743)
 * - `annotations.js` 등 설명 파일에는 공지 설명이 없다 — 코드가 정본이다
 *
 * ## 샘플 = 원본 7건 글자 그대로 + 숨김 1건 (사용자 결정 2026-11-03)
 * 원본 시드는 전부 `게시` 라 `숨김` 이 화면에 한 번도 나오지 않는다. 원본 글은 건드리지 않고
 * **셀러 공지 1건(N-S22, 지난 점검 안내)** 만 더했다. 고객 3 · 셀러 5.
 *
 * ## 상태는 **손으로 고르는 저장값**이다 (원본 `stat` = 게시/숨김)
 * 게시 기간에서 파생하지 않는다 — 원본 폼의 「노출 여부」 세그먼트로 고른다.
 * ⚠️ **기획 확인 필요**: 종료일이 지난 N-U29(06-01~08-31)도 `게시` 다(원본 그대로).
 * 사용자 화면 노출을 기간이 정하는지 상태가 정하는지 원본에 없다.
 *
 * ## 상태 색 (원본 결함 보정)
 * 원본 `statusBadge` 표에 `게시` 키가 없어 `숨김` 과 같은 회색으로 그려진다(proto.html:1894-1922).
 * 노출 중/숨김을 색으로 가르게 **게시 = success · 숨김 = default** 로 둔다(형제 「노출 = b-prog」 대응).
 * ⚠️ 기획 확인 필요.
 *
 * ## 정렬하지 않는다 — 「상단 고정」이 있어도 (사용자 결정 2026-11-03)
 * 원본은 배열 순서 그대로 그린다(시드가 등록일 최신순, 새 글은 맨 앞에 붙는다).
 * 폼의 「목록 상단에 고정(핀)」은 정렬에 쓰이지 않는다 — 시드에서는 고정 글이 대상별 최신 글이라
 * 결과가 같다. ⚠️ 기획 확인 필요.
 * ---------------------------------------------------------------------- */

export type NoticeAudience = "customer" | "seller";
export type NoticeStatus = "posted" | "hidden";

export interface Notice {
  /** 고유 키 = 상세 경로 조각 (`/notices/N-U31`) */
  id: string;
  audience: NoticeAudience;
  /** 상단 고정 — 목록에서는 배지만, 고치는 곳은 폼이다 */
  pinned: boolean;
  title: string;
  /** 본문. 목록에는 `excerpt()` 로 앞 60자만 */
  body: string;
  /** 게시 시작일 `YYYY-MM-DD` */
  startsOn: string;
  /** 게시 종료일. `null` 이면 **상시** */
  endsOn: string | null;
  /** 노출 여부 — 손으로 고르는 저장값(원본 `stat`) */
  status: NoticeStatus;
  /** 등록일 `YYYY-MM-DD` */
  date: string;
}

/** 대상 전환 — 원본 `[['고객','고객 공지'],['셀러','셀러 공지']]`, 기본 고객 */
export const AUDIENCES: { value: NoticeAudience; label: string }[] = [
  { value: "customer", label: "고객 공지" },
  { value: "seller", label: "셀러 공지" },
];

/** URL `?aud=` 값 → 대상. 모르는 값은 기본(고객) */
export const audienceOf = (value: string | null): NoticeAudience =>
  value === "seller" ? "seller" : "customer";

export const audienceLabel = (audience: NoticeAudience) =>
  AUDIENCES.find((item) => item.value === audience)?.label ?? "";

/** 노출 여부 — 원본 폼 세그먼트 `게시`·`숨김` 순서 그대로 */
export const STATUS_OPTIONS: { value: NoticeStatus; label: string }[] = [
  { value: "posted", label: "게시" },
  { value: "hidden", label: "숨김" },
];

export const STATUS_META: Record<
  NoticeStatus,
  { label: string; tone: TagTone }
> = {
  posted: { label: "게시", tone: "success" },
  hidden: { label: "숨김", tone: "default" },
};

/** 원본 `NOTICES`(proto.html:3387-3393) 글자 그대로 + N-S22(숨김, 추가) */
export const NOTICES: Notice[] = [
  {
    id: "N-U31",
    audience: "customer",
    pinned: true,
    title: "[안내] 여름 성수기 배송 일정 안내",
    body: "7~8월 성수기에는 도서산간 지역 배송이 1~2일 지연될 수 있습니다.",
    startsOn: "2026-07-01",
    endsOn: null,
    status: "posted",
    date: "2026-07-01",
  },
  {
    id: "N-U30",
    audience: "customer",
    pinned: false,
    title: "[공지] 보증금 환급 안내 문구 개정",
    body: "보증금은 검수 완료 후 7영업일 이내 환급됩니다(카드사에 따라 다소 차이가 있을 수 있습니다).",
    startsOn: "2026-06-20",
    endsOn: null,
    status: "posted",
    date: "2026-06-20",
  },
  {
    /* ⚠️ 기획 확인 필요: 「신규 가입 고객 대상」 vs 쿠폰 CP-2406-01 은 셀러 쿠폰·기간 12-31 */
    id: "N-U29",
    audience: "customer",
    pinned: false,
    title: "[이벤트] 첫 렌트 30% 쿠폰 오픈",
    body: "신규 가입 고객 대상 첫 렌트 30% 할인 쿠폰이 발급됩니다.",
    startsOn: "2026-06-01",
    endsOn: "2026-08-31",
    status: "posted",
    date: "2026-06-01",
  },
  {
    id: "N-S26",
    audience: "seller",
    pinned: true,
    title: "[정산] 7월 정산 명세 확인 요청 발송 안내 (7/1)",
    body: "7월 1일에 6월분 정산 확인요청이 발송됩니다. 확인 기한은 3일입니다.",
    startsOn: "2026-06-28",
    endsOn: null,
    status: "posted",
    date: "2026-06-28",
  },
  {
    id: "N-S25",
    audience: "seller",
    pinned: false,
    title: "[운영] 여름 성수기 배송 지연 대비 출고 가이드",
    body: "출고 예정일보다 1일 이른 발송 처리를 권장합니다.",
    startsOn: "2026-06-24",
    endsOn: null,
    status: "posted",
    date: "2026-06-24",
  },
  {
    id: "N-S24",
    audience: "seller",
    pinned: false,
    title: "[정책] 출고 이미지 등록 안내 — 미등록 시 분쟁 대조 근거 없음",
    body: "렌트 발송 처리 시 주문건별 출고 이미지를 등록해주세요.",
    startsOn: "2026-06-20",
    endsOn: null,
    status: "posted",
    date: "2026-06-20",
  },
  {
    id: "N-S23",
    audience: "seller",
    pinned: false,
    title: "[시스템] 상품 등록 폼 개편(옵션·기간 특가·인증 정보) 안내",
    body: "상품 등록 폼에 렌트 수량·기간 특가·인증 정보·상품 주요 정보 섹션이 추가되었습니다.",
    startsOn: "2026-06-15",
    endsOn: null,
    status: "posted",
    date: "2026-06-15",
  },
  {
    /* 원본에 없는 추가분 — 숨김 상태 시연(지난 점검 안내를 내린 글) */
    id: "N-S22",
    audience: "seller",
    pinned: false,
    title: "[시스템] 셀러 어드민 정기 점검 안내 (6/12)",
    body: "6월 12일 02:00~05:00 정기 점검으로 셀러 어드민 접속이 제한됩니다.",
    startsOn: "2026-06-10",
    endsOn: "2026-06-12",
    status: "hidden",
    date: "2026-06-10",
  },
];

export const findNotice = (id: string) =>
  NOTICES.find((notice) => notice.id === id);

/** 날짜 표기 — 점 구분자 (`2026.07.01`) */
export const ymd = (dateText: string) => dateText.replace(/-/g, ".");

/**
 * 게시 기간 — 원본 `${start} ~ ${end || '상시'}`.
 * 「상시」로 바뀌는 것은 **꼬리뿐**이다 — 시작일은 실제 값이라 남긴다.
 */
export const periodParts = (notice: Notice) => ({
  lead: `${ymd(notice.startsOn)} ~ `,
  tail: notice.endsOn === null ? "상시" : ymd(notice.endsOn),
  tailMuted: notice.endsOn === null,
});

/** 제목 아래 본문 발췌 길이 — 원본 60자 */
export const EXCERPT_LENGTH = 60;

export const excerpt = (body: string) =>
  body.length > EXCERPT_LENGTH ? `${body.slice(0, EXCERPT_LENGTH)}…` : body;

export const PIN_LABEL = "고정";
export const EMPTY_CELL = "-";

/* ---- 경로 ---- */
export const LIST_PATH = "/notices";
/** 신규 작성 경로 조각 (`/notices/new`) */
export const NEW_KEY = "new";

/** 목록 경로 — 셀러 공지면 탭을 주소에 싣는다(돌아와도 보던 탭) */
export const listPathOf = (audience: NoticeAudience) =>
  audience === "seller" ? `${LIST_PATH}?aud=seller` : LIST_PATH;

export const formPathOf = (id: string) => `${LIST_PATH}/${id}`;

export const newPathOf = (audience: NoticeAudience) =>
  `${LIST_PATH}/${NEW_KEY}${audience === "seller" ? "?aud=seller" : ""}`;

/* ---- 문구 ---- */
export const EMPTY_TITLE = (audience: NoticeAudience) =>
  `등록된 ${audienceLabel(audience)}가 없습니다`;
export const EMPTY_DESCRIPTION = "새 공지를 작성하면 이 목록에 쌓입니다.";
