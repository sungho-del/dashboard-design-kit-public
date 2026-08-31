/* -------------------------------------------------------------------------
 * S25 공휴일 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `HolidayListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 원본 템플릿: `src/pages/OrderListPage.data.ts` (이커머스 목록형)
 *
 * ## 이 화면이 무엇인가
 * 휴무일을 등록해 **대여 불가일 계산**에 반영한다. 렌트 상품의 반납·수거 일정이
 * 이 목록을 그대로 참조하므로, 하루를 잘못 넣으면 주문 전체의 날짜가 밀린다.
 *
 * ## ⚠️ 이 화면의 핵심 규칙 — 종료일은 선택값이다
 * **`endAt === ""` 이면 시작일 하루만 등록된 것이다.** 원본 등록 모달이 그대로
 * 못박은 규칙이고(`"종료일을 비우면 시작일 하루만 등록됩니다."`), 표의 기간 셀도
 * 여기서 나온다. `periodText` 가 그 유일한 구현이다 — 뼈대가 따로 세지 않는다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(등록/수정일시 `YYYY-MM-DD HH:mm`) 를 갖는다
 * - 연도 축은 상수가 아니라 **데이터에서 뽑는다** — `yearsOf` · `inYear`
 *
 * ## 템플릿과 의도적으로 다른 점 (원본 `/ops-calendar` 대조)
 * - **`STATUS_META` 가 없다.** 공휴일에 상태가 없다(등록돼 있으면 휴무다)
 * - **페이지네이션이 없다.** 원본도 없다 — 연도로 걸러 보는 화면이라
 *   한 해 치가 한 화면에 들어간다. 총 건수는 **툴바**가 들고 있다
 * - **상단 요약 카드(STATS)를 만들지 않았다.** 증감 지표가 없는 도메인이다
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **`dayCount` 와 기간 셀의 `(3일)`·`(하루)` 꼬리표.** 원본 기간 셀은
 *   `시작일 ~ 종료일` 이고 하루짜리는 **날짜 하나만** 찍는다. 일수는 세지 않는다
 * - **`FILTERS` 상수(전체/2026년/2025년).** 원본은 "전체"가 없고, 연도 칩을
 *   데이터에서 뽑아 **항상 한 해만** 보여 준다
 * - **`DELETE_BLOCKED_IDS` 와 부분 실패 안내.** 원본 삭제는 성공/실패뿐이고
 *   "요청한 공휴일이 모두 삭제되지 않았습니다" 같은 문구가 아예 없다
 * ---------------------------------------------------------------------- */

export interface Holiday {
  /** 공휴일 번호 — 고유 키 */
  id: string;
  /** 휴무 사유. 예) 추석 연휴 */
  content: string;
  /** 시작일 `YYYY-MM-DD` */
  startAt: string;
  /** 종료일 `YYYY-MM-DD`. **빈 문자열이면 시작일 하루만** */
  endAt: string;
  /** 등록/수정일시 `YYYY-MM-DD HH:mm` */
  date: string;
}

export const HOLIDAYS: Holiday[] = [
  {
    id: "HD-2026-0006",
    content: "추석 연휴",
    startAt: "2026-09-24",
    endAt: "2026-09-26",
    date: "2026-08-12 10:20",
  },
  {
    id: "HD-2026-0005",
    content: "개천절",
    startAt: "2026-10-03",
    endAt: "",
    date: "2026-08-12 10:24",
  },
  {
    id: "HD-2026-0004",
    content: "한글날",
    startAt: "2026-10-09",
    endAt: "",
    date: "2026-08-12 10:25",
  },
  {
    id: "HD-2026-0003",
    content: "광복절",
    startAt: "2026-08-15",
    endAt: "",
    date: "2026-07-30 09:12",
  },
  {
    id: "HD-2026-0002",
    content: "여름 물류센터 휴무",
    startAt: "2026-08-03",
    endAt: "2026-08-05",
    date: "2026-07-21 16:48",
  },
  {
    id: "HD-2025-0001",
    content: "성탄절",
    startAt: "2025-12-25",
    endAt: "",
    date: "2025-12-01 11:03",
  },
];

/** 공휴일이 걸쳐 있는 마지막 날. 종료일이 비면 시작일 하루짜리다 */
const lastDay = (holiday: Pick<Holiday, "startAt" | "endAt">) =>
  holiday.endAt === "" ? holiday.startAt : holiday.endAt;

/**
 * 연도 칩 목록. **상수가 아니라 데이터에서 뽑는다**(원본과 같다) —
 * 시작 연도와 종료 연도를 모두 모아 오름차순으로 정렬한다.
 */
export const yearsOf = (rows: Holiday[]) =>
  [
    ...new Set(
      rows.flatMap((row) => [
        row.startAt.slice(0, 4),
        lastDay(row).slice(0, 4),
      ]),
    ),
  ].sort();

/**
 * 그 해에 걸치는가. 연말~연초로 이어지는 휴무는 **두 해 모두**에 걸린다 —
 * 어느 해를 보고 있든 눈에 띄어야 하기 때문이다(원본과 같은 판정).
 */
export const inYear = (holiday: Holiday, year: string) =>
  holiday.startAt.slice(0, 4) <= year && lastDay(holiday).slice(0, 4) >= year;

/**
 * 표의 "기간" 셀 문구.
 * 하루짜리는 **날짜 하나만** 찍는다 — `2026-10-03 ~ 2026-10-03` 은 읽는 사람을
 * 헷갈리게 한다. 일수(`3일`)는 원본이 세지 않으므로 붙이지 않는다.
 */
export const periodText = (holiday: Pick<Holiday, "startAt" | "endAt">) =>
  lastDay(holiday) === holiday.startAt
    ? ymd(holiday.startAt)
    : `${ymd(holiday.startAt)} ~ ${ymd(holiday.endAt)}`;

/**
 * `Date` → `YYYY-MM-DD`. DatePicker 가 돌려준 값을 **행 데이터로 저장할 때** 쓴다.
 *
 * ⚠️ 표시용 `ymd` 와 방향이 반대다 — 이쪽은 입력(Date)을 저장 문자열로 만들고,
 * `ymd` 는 저장 문자열을 화면 표기(`2026.08.18`)로 만든다. 한때 둘 다 `ymd` 라
 * 이 화면들만 표에 하이픈이 그대로 나갔다.
 */
export const toYmd = (date?: Date) => {
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

/**
 * 저장 문자열 → 화면 표기. 원본 어드민의 `ymd` 그대로 `2026.08.18` 을 낸다.
 * 이 저장소의 모든 목록이 같은 표기를 쓴다.
 */
export const ymd = (dateText: string) =>
  dateText.slice(0, 10).replace(/-/g, ".");

/** 새 행의 등록/수정일시 `YYYY-MM-DD HH:mm` */
export const stamp = (at: Date = new Date()) => {
  const hour = String(at.getHours()).padStart(2, "0");
  const minute = String(at.getMinutes()).padStart(2, "0");
  return `${toYmd(at)} ${hour}:${minute}`;
};

/** 다음 공휴일 번호. 목록에서 가장 큰 일련번호 + 1 */
export const nextHolidayId = (rows: Holiday[]) => {
  const max = rows.reduce((acc, row) => {
    const serial = Number(row.id.slice(-4));
    return Number.isNaN(serial) ? acc : Math.max(acc, serial);
  }, 0);
  return `HD-2026-${String(max + 1).padStart(4, "0")}`;
};
