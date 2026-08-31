import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S19 공지사항 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `NoticeListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 화면 유형: **목록형** (`docs/screen-templates.md` §3-1)
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할                | 실물 이름                    |
 * | ------------------- | ---------------------------- |
 * | 표 한 행의 타입     | `Notice`                     |
 * | 대상 구분 칩        | `AUDIENCES`                  |
 * | 상태 → 라벨·톤      | `STATUS_META` · `statusOf`   |
 * | 샘플 데이터         | `NOTICES`                    |
 * | 게시 기간 표기      | `periodParts`                |
 * | 본문 발췌 규칙      | `excerpt` · `EXCERPT_LENGTH` |
 * | 정렬 규칙           | `sortForList`                |
 * | 페이지당 행 수      | `PAGE_SIZE`                  |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(`YYYY-MM-DD HH:mm`) 를 갖는다
 * - `STATUS_META` 의 키는 `statusOf()` 가 돌려주는 값과 정확히 일치한다
 * - `AUDIENCES` 에는 **`"all"` 이 없다** — 아래 참고
 * - `periodParts` 는 `{ lead, tail, tailMuted }` 를 돌려준다.
 *   `tailMuted` 가 `true` 일 때만 뼈대가 꼬리 글자를 `text-minimal` 로 낮춘다
 *
 * ## 원본 어드민 대조 (`_plan/babycube-admin/chunks/3ev97mnz8g4z1.js` 모듈 31590)
 * 이 화면은 **공용 목록 셸(`20013`)을 쓰지 않는다.** 표 컴포넌트와 카드 프레임만 직접
 * 조립한 화면이라 필터바도, 엑셀 다운로드도 없다. 원본이 그리는 것은 이게 전부다:
 * ```
 * 대상 칩 2개 (고객 공지 / 셀러 공지)      ← 카드 **밖**, 카드 위
 * 카드[ 목록 (총 N건) + `+ 공지 작성` | 표 5열 | 페이지네이션 ]
 * ```
 * 컬럼은 `isPinned 고정` · `title 제목`(+본문 발췌) · `period 게시 기간` ·
 * `status 상태` · `createdAt 등록일` **순서**다.
 *
 * ### ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **상태 세그먼트 필터**(전체·게시중·게시 예정·게시 종료)와 **초기화 버튼**.
 *   원본 목록 파라미터는 `{ chips: { aud: [...] }, sortKey, sortDir, page, size }` 가
 *   전부다 — 좁히는 축은 **대상 칩 하나뿐**이다
 * - **고정 토글**(모달 푸터 버튼 + 토스트 + 목록 재정렬). 원본 `isPinned` 는
 *   **읽기 전용 배지**다. 목록에서 고정을 걸고 푸는 기능 자체가 없다 —
 *   고정 여부는 공지 작성/상세 화면에서 정한다
 * - **고정 우선 정렬.** 원본은 `sortKey: "createdAt", sortDir: "desc"` 하나뿐이다.
 *   고정을 위로 올리는 정렬은 우리가 지어낸 규칙이었다
 *
 * ### 원본에 있었는데 우리가 빠뜨렸던 것 — 되살렸다
 * **제목 아래 본문 발췌 60자.** 원본 제목 셀은 링크 한 줄이 아니라 두 줄이다:
 * ```js
 * <Link className="linkish">{title}</Link>
 * <div className="muted">{body.length > 60 ? body.slice(0,60) + "…" : body}</div>
 * ```
 *
 * ## 대상 구분에 "전체"가 없는 이유 (원본도 그렇다)
 * 원본 칩은 `[["고객","고객 공지"], ["셀러","셀러 공지"]]` 둘뿐이고 기본값이 `고객` 이다.
 * 공지는 고객 **또는** 셀러 한쪽을 보고 쓰는 글이라(문체·안내 대상·게시 위치가 다르다)
 * 대상은 필터가 아니라 **작업 대상 전환**이다.
 *
 * ## 상태를 필드로 두지 않는 이유
 * 게시 상태는 게시 기간에서 **파생된다**(`statusOf`). 값으로 들고 있으면 기간을 고칠 때
 * 상태가 따라오지 않아, 같은 행이 "게시중"이라고 말하면서 종료된 기간을 함께 보여준다.
 *
 * ⚠️ **상태 어휘는 값 출처 불명이다.** 원본 `status` 는 API 가 주고, 공용 배지 맵(`15312`)에
 * 공지용 어휘가 따로 없다(`노출`·`숨김`·`임시저장` 같은 범용 낱말뿐이다).
 * 지금 어휘(게시중·게시 예정·게시 종료)는 우리가 기간에서 파생시킨 것이라 그대로 두었다 —
 * 실서비스 값이 확인되면 이 세 낱말만 갈아끼우면 된다.
 *
 * ## 상태 색 배정 (§3-1)
 * - `ongoing`(게시중) = 지금 사용자에게 노출 중 → **`success`**
 * - `scheduled`(게시 예정) · `ended`(게시 종료) = **둘 다 `default`**
 *   겹치지만, §3-1 이 묻는 "겹치는 쪽이 덜 중요한 상태인가"에 둘 다 해당한다.
 *   예정은 시간이 오면 자동으로 뜨고 종료는 이미 끝났다 — 지금 사람이 손댈 일이 없다.
 * ---------------------------------------------------------------------- */

export type NoticeAudience = "customer" | "seller";
export type NoticeStatus = "ongoing" | "scheduled" | "ended";

export interface Notice {
  /** 고유 키 — 뼈대가 행 key 로 쓴다 (원본 `rowKey: e => e.id`) */
  id: string;
  audience: NoticeAudience;
  title: string;
  /** 본문. 표에는 `excerpt()` 로 앞 60자만, 모달에는 전문이 나간다 */
  body: string;
  /** 상단 고정 여부 — **읽기 전용 배지**다(목록에서 토글하지 않는다) */
  pinned: boolean;
  /** 게시 시작일 `YYYY-MM-DD` */
  startsOn: string;
  /** 게시 종료일. `null` 이면 **상시** */
  endsOn: string | null;
  /** 등록일시 `YYYY-MM-DD HH:mm`. 표에는 `ymd` 로 날짜만 낸다 */
  date: string;
}

/**
 * 대상 구분 칩 — 원본 `u = [["고객","고객 공지"], ["셀러","셀러 공지"]]` 그대로.
 * 필터가 아니라 **작업 대상 전환**이라 "전체"가 없고, 첫 항목이 기본값이다.
 */
export const AUDIENCES: { value: NoticeAudience; label: string }[] = [
  { value: "customer", label: "고객 공지" },
  { value: "seller", label: "셀러 공지" },
];

/** 상태값 → 표시 라벨과 Tag tone. 키는 `statusOf()` 의 반환값과 일치해야 한다 */
export const STATUS_META: Record<
  NoticeStatus,
  { label: string; tone: TagTone }
> = {
  ongoing: { label: "게시중", tone: "success" },
  scheduled: { label: "게시 예정", tone: "default" },
  ended: { label: "게시 종료", tone: "default" },
};

/**
 * 샘플 데이터의 **기준일**. 게시 상태가 이 날짜를 기준으로 계산된다.
 * 실서비스로 이식하면 서버가 준 `status` 를 그대로 쓴다.
 */
export const REFERENCE_TODAY = "2026-08-24";

export const NOTICES: Notice[] = [
  {
    id: "N-2026-041",
    audience: "customer",
    title: "추석 연휴 배송·회수 일정 안내",
    body: "연휴 기간(9/24~9/28)에는 대여 상품의 배송과 회수가 순차 지연됩니다. 회수 예약은 연휴 전 영업일까지 신청해 주세요.",
    pinned: true,
    startsOn: "2026-08-20",
    endsOn: "2026-09-30",
    date: "2026-08-20 09:00",
  },
  {
    id: "N-2026-045",
    audience: "customer",
    title: "9월 신규 브랜드 입점 예고",
    body: "9월 1일부터 유모차·카시트 신규 브랜드 4곳이 입점합니다. 사전 알림을 신청한 회원에게 쿠폰이 지급됩니다.",
    pinned: false,
    startsOn: "2026-09-01",
    endsOn: "2026-09-30",
    date: "2026-08-23 16:20",
  },
  {
    id: "N-2026-039",
    audience: "customer",
    title: "안심케어 서비스 이용약관 개정 안내",
    body: "파손 보상 범위와 자기부담금 기준이 변경됩니다. 개정 약관은 게시일로부터 적용됩니다.",
    pinned: false,
    startsOn: "2026-08-10",
    endsOn: null,
    date: "2026-08-10 14:00",
  },
  {
    id: "N-2026-036",
    audience: "customer",
    title: "여름 휴가철 고객센터 운영 시간 변경",
    body: "8월 1일부터 8월 10일까지 고객센터를 10시~16시로 단축 운영했습니다.",
    pinned: false,
    startsOn: "2026-07-28",
    endsOn: "2026-08-10",
    date: "2026-07-28 10:30",
  },
  {
    id: "N-2026-044",
    audience: "seller",
    title: "정산 지급일 변경 안내 (9월부터)",
    body: "9월 정산분부터 지급일이 매월 15일에서 10일로 앞당겨집니다. 계좌 정보를 미리 확인해 주세요.",
    pinned: true,
    startsOn: "2026-08-22",
    endsOn: "2026-09-22",
    date: "2026-08-22 11:00",
  },
  {
    id: "N-2026-046",
    audience: "seller",
    title: "셀러 등급 개편 사전 안내",
    body: "9월 5일부터 등급 산정 기준에 리뷰 응답률이 추가됩니다. 개편 전 답글 대기 리뷰를 정리해 주세요.",
    pinned: false,
    startsOn: "2026-09-05",
    endsOn: null,
    date: "2026-08-24 08:50",
  },
  {
    id: "N-2026-042",
    audience: "seller",
    title: "상품 등록 이미지 가이드 개정",
    body: "대표 이미지 규격이 1000×1000 이상으로 상향됩니다. 기존 상품은 9월 말까지 교체해 주세요.",
    pinned: false,
    startsOn: "2026-08-18",
    endsOn: null,
    date: "2026-08-18 09:40",
  },
  {
    id: "N-2026-040",
    audience: "seller",
    title: "셀러 어드민 2.0 사용 가이드",
    body: "주문·정산 화면이 개편되었습니다. 달라진 점과 자주 묻는 질문을 정리했습니다.",
    pinned: false,
    startsOn: "2026-08-05",
    endsOn: null,
    date: "2026-08-05 13:00",
  },
];

/** 게시 기간에서 상태를 **계산**한다 (필드로 저장하지 않는 이유는 상단 주석 참고) */
export const statusOf = (notice: Notice): NoticeStatus => {
  if (notice.startsOn > REFERENCE_TODAY) return "scheduled";
  if (notice.endsOn !== null && notice.endsOn < REFERENCE_TODAY) return "ended";
  return "ongoing";
};

/**
 * 날짜 표기 — **날짜만, 점 구분자**. 원본 공용 포맷터(모듈 32916) 그대로다:
 * `e => e ? e.slice(0, 10).replace(/-/g, ".") : "-"`.
 * 게시 기간 열과 등록일 열이 **같은 이 함수**를 쓴다.
 */
export const ymd = (dateText: string) =>
  dateText.slice(0, 10).replace(/-/g, ".");

/**
 * 게시 기간 표기 — 원본 `h()` 그대로다:
 * `${ymd(startDate)} ~ ${endDate ? ymd(endDate) : "상시"}`.
 *
 * ⚠️ 종료일이 없을 때 **"상시"로 바뀌는 것은 꼬리뿐**이다. 셀 전체를 "상시 게시"로
 * 갈아치우면 시작일이라는 실제 값이 화면에서 사라진다.
 * `tailMuted` 가 `true` 인 동안만 뼈대가 꼬리 농도를 낮춘다.
 */
export const periodParts = (notice: Notice) => ({
  lead: `${ymd(notice.startsOn)} ~ `,
  tail: notice.endsOn === null ? "상시" : ymd(notice.endsOn),
  tailMuted: notice.endsOn === null,
});

/** 모달용으로 이어 붙인 한 줄 */
export const periodText = (notice: Notice) => {
  const { lead, tail } = periodParts(notice);
  return `${lead}${tail}`;
};

/** 제목 아래 본문 발췌의 길이 — 원본과 같은 60자 */
export const EXCERPT_LENGTH = 60;

/** 본문 발췌. 원본과 같이 넘치면 말줄임표 한 글자를 덧붙인다 */
export const excerpt = (body: string) =>
  body.length > EXCERPT_LENGTH ? `${body.slice(0, EXCERPT_LENGTH)}…` : body;

/**
 * 목록 정렬 규칙 — **등록일 최신순**.
 * 원본 목록 파라미터가 `sortKey: "createdAt", sortDir: "desc"` 하나뿐이다.
 * 고정 공지를 위로 올리지 않는다(그 규칙은 원본에 없다).
 */
export const sortForList = (list: Notice[]) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date));

/** 고정 배지 문구 */
export const PIN_LABEL = "고정";

/** 고정이 아닌 행의 표기 — 원본도 `"-"` 한 글자다 */
export const EMPTY_CELL = "-";

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 원본 `DEFAULT_PAGE_SIZE` 지만 **대상별로 4건뿐이라 페이징 동작이
 * 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 3;
