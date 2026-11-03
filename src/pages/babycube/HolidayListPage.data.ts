import { DEMO_TODAY } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * S25 공휴일 관리 — **도메인 층** (BabyCube 본사 운영 어드민 · 원본 v0.4 `SCREENS.opsCalendar`)
 *
 * 짝이 되는 뼈대: `HolidayListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 이 화면이 무엇인가
 * 회사 지정 휴무를 **기간 단위 1종**으로 등록한다(원본 1811 · 3612 — 07-27 구분 폐지,
 * 법정 공휴일·점검일 등은 내용 라벨로만 구분). 원본 메모가 밝힌 쓰임은
 * 「시작일 선택만 차단 · 영업일 계산 제외」와 삭제 창의 「대여 불가일 계산」뿐이다.
 * ⚠️ 정산 지급일·배송 출고·보증금 환급이 이 목록을 어떻게 읽는지는 **원본에 없다** —
 * 연동을 만들거나 문구로 약속하지 않는다(기획 확인 필요).
 *
 * ## ⚠️ 이 화면의 핵심 규칙 — 종료일은 선택값이다
 * **`endAt === ""` 이면 시작일 하루다.** 원본 등록 모달의 「종료일을 비우면 시작일 하루만
 * 등록됩니다.」 그대로이고(원본은 `to` 에 시작일을 채워 저장 — 표시는 같다),
 * 표의 기간 셀도 `periodText` 하나에서 나온다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(등록/수정일 `YYYY-MM-DD`) 를 갖는다
 * - 연도 축은 상수가 아니라 **데이터에서 뽑는다** — `yearsOf` · `inYear`
 * - 기본 연도의 기준은 `REFERENCE_YEAR`(시연 기준일의 해) — 실제 오늘이 아니다
 *
 * ## 샘플 — 원본 `OPS_CAL` 8건 그대로 (원본 3614~3623)
 * ID·내용·기간·등록/수정일까지 원본 값이다. 원본 배열은 시작일 순이지만
 * 뼈대가 따로 정렬하므로 순서에 기대지 않는다.
 *
 * ## 기획 확인 필요 (원본대로 두고 기록만)
 * - 주문 샘플 U-R17(시작 09-26 추석 연휴) · U-R26(시작 10-09 한글날)이 휴무일에 시작한다 —
 *   원본 규칙 「시작일 선택 차단」과 어긋나지만 주문·정산 값은 옮기지 않는다
 * - 정산 지급일 2026-10-10 이 토요일(앞날 한글날) — 휴일·주말 이월 규칙이 원본에 없다
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
  /** 등록/수정일 `YYYY-MM-DD` */
  date: string;
}

export const HOLIDAYS: Holiday[] = [
  {
    id: "HD-01",
    content: "물류센터 정기 점검",
    startAt: "2026-07-30",
    endAt: "",
    date: "2026-07-27",
  },
  {
    id: "HD-02",
    content: "전사 재고 실사",
    startAt: "2026-08-01",
    endAt: "",
    date: "2026-07-27",
  },
  {
    id: "HD-03",
    content: "광복절",
    startAt: "2026-08-15",
    endAt: "",
    date: "2026-07-26",
  },
  {
    id: "HD-04",
    content: "광복절 대체공휴일",
    startAt: "2026-08-17",
    endAt: "",
    date: "2026-07-26",
  },
  {
    id: "HD-05",
    content: "추석 연휴",
    startAt: "2026-09-24",
    endAt: "2026-09-26",
    date: "2026-07-26",
  },
  {
    id: "HD-06",
    content: "개천절",
    startAt: "2026-10-03",
    endAt: "",
    date: "2026-07-26",
  },
  {
    id: "HD-07",
    content: "한글날",
    startAt: "2026-10-09",
    endAt: "",
    date: "2026-07-26",
  },
  {
    id: "HD-08",
    content: "성탄절",
    startAt: "2026-12-25",
    endAt: "",
    date: "2026-07-26",
  },
];

/** 기본 연도의 기준 — 시연 기준일(2026-10-19)의 해. 원본은 실제 오늘(`new Date()`)이다 */
export const REFERENCE_YEAR = DEMO_TODAY.slice(0, 4);

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
 * 하루짜리는 **날짜 하나만** 찍는다 — `2026.10.03 ~ 2026.10.03` 은 읽는 사람을
 * 헷갈리게 한다. 일수(`3일`)는 원본이 세지 않으므로 붙이지 않는다.
 */
export const periodText = (holiday: Pick<Holiday, "startAt" | "endAt">) =>
  lastDay(holiday) === holiday.startAt
    ? ymd(holiday.startAt)
    : `${ymd(holiday.startAt)} ~ ${ymd(holiday.endAt)}`;

/**
 * 저장 문자열 → 화면 표기. 원본 어드민의 점 표기 `2026.08.18` 을 낸다.
 * 이 저장소의 모든 목록이 같은 표기를 쓴다.
 */
export const ymd = (dateText: string) =>
  dateText.slice(0, 10).replace(/-/g, ".");

/** 원본 알림 문구 — 업무 확정은 알림만 띄우고 목록은 바꾸지 않는다 */
export const MESSAGES = {
  needStart: "시작일을 선택해주세요.",
  needContent: "내용을 입력해주세요.",
  created: "등록되었습니다.",
  updated: "수정되었습니다.",
  noSelection: "선택된 공휴일이 없습니다.",
  deleted: (count: number) => `${count}건 삭제되었습니다.`,
  deleteBody:
    "삭제하면 목록에서 사라지고 대여 불가일 계산에서도 즉시 제외됩니다.",
  deleteWarn: "삭제 후에는 되돌릴 수 없습니다.",
  /* 원본 공용 `tableEmpty()` 문구(2729). 이 화면엔 필터가 없지만 원본대로 둔다(원본 결함 기록) */
  emptyTitle: "해당 조건의 항목이 없습니다",
  emptyDescription: "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.",
};
