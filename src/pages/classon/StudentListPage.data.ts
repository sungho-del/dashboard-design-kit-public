import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S02 수강생 관리 (클래스온 — 온라인 강의 플랫폼 운영 어드민) — **도메인 층**
 *
 * 짝이 되는 뼈대: `StudentListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 템플릿 원형: `src/pages/OrderListPage.*` (목록형)
 *
 * ## 기획서가 정한 것 (pipeline/01-service-brief.json)
 * - F04 상태별 건수 필터 — 전체 / 수강중 / 완료 / 중단 / 환불, 누르면 목록을 필터
 * - F05 등록일 기간 + 검색어(이름 / 이메일 / 강의명) + 초기화
 * - F06 표 7열 — 이름 · 이메일 · 수강 강의 · 진도율 · 최근 학습 · 상태 · 관리
 *   (진도율은 0~100% 가로 막대 + 숫자 · 최근 학습은 `YYYY-MM-DD HH:mm`)
 * - F07 행을 누르면 우측 요약 패널 · F08 선택한 수강생에게 독려 메일 · F09 엑셀 다운로드
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키)와 **`date`(등록일 · `YYYY-MM-DD HH:mm`)** 를 갖는다 —
 *   기간 필터가 `date` 를 파싱한다. 표에 보이는 `lastStudiedAt`(최근 학습)과 **다른 값**이다
 * - `STATUS_META` 의 키는 `Student["status"]` 유니온과 정확히 일치한다
 * - `FILTERS[0].value === "all"` (뼈대가 필터 해제로 취급) · 나머지는 상태 어휘 그대로
 * - 상태별 건수는 **뼈대가 지금 남아 있는 행에서 센다.** 이 파일에 상수로 박지 않는다 —
 *   박으면 검색을 좁혔을 때 대시가 표와 다른 말을 한다
 *
 * ## ⚠️ 증감 요약 카드(`STATS` 3장)를 두지 않는다 — 일부러다
 * 목록형 템플릿은 상단에 증감 카드 3장을 두지만, **기획서 S02 의 상단은 상태 건수 대시**이고
 * 수강생 지표의 증감(±)도 비교 기준 문구도 기획서 어디에도 없다. 3장을 세우려면 숫자와
 * "지난주 대비" 같은 문구를 지어내야 한다 — 근거 없는 증감은 만들지 않는다.
 * 상단 자리는 기획서가 명시한 `StatGrid`(건수 = 필터) 하나가 쓴다.
 * ---------------------------------------------------------------------- */

export type StudentStatus = "active" | "completed" | "stopped" | "refunded";

export interface Student {
  /** 고유 키 — 뼈대가 행 key·선택 상태에 쓴다 */
  id: string;
  name: string;
  email: string;
  /** 수강 강의 (한 사람이 여러 강의를 들으면 수강 건 단위로 행이 나뉜다) */
  course: string;
  /** 진도율 **0~100**. `ProgressBar` 가 그대로 받는다(0~1 아님) */
  progress: number;
  /** 최근 학습 `YYYY-MM-DD HH:mm` — 기획서 formats */
  lastStudiedAt: string;
  status: StudentStatus;
  /** 등록일 `YYYY-MM-DD HH:mm` — **기간 필터가 이 값을 파싱한다.** 표에는 보이지 않는다 */
  date: string;
}

/**
 * 상태값 → 라벨 · `TagTone` · 뜻.
 *
 * ## 색 배정 근거 (`docs/screen-templates.md` §3-1 "상태 색 배정" 순서대로)
 *
 * | 상태   | tone       | 왜                                                              |
 * | ------ | ---------- | --------------------------------------------------------------- |
 * | 중단   | `warning`  | ① 지금 사람의 조치(독려 메일)를 요하는 상태 — warning 이 독점한다 |
 * | 환불   | `critical` | ② 이미 끝났지만 **정상적으로 끝나지 않은** 종료 (취소와 같은 자리) |
 * | 완료   | `default`  | ③ 정상 종료 — 제대로 끝난 일이라 눈에 띌 이유가 없다             |
 * | 수강중 | `success`  | ④ 진행 중이고 정상인 상태                                        |
 *
 * '수강중'은 성격상 **정보성**이라 딱 맞는 tone 이 `Tag` 에 없다(기획서도 그 점을 지적했다).
 * 위 순서대로 배정하니 warning·critical·default 가 각각 임자를 찾아 남은 자리가 success
 * 하나였고, 결과적으로 4색이 겹치지 않아 `custom` 주입이 필요 없다.
 *
 * ⚠️ 기획서 domainVocabulary 는 '환불'을 중립(`default`)으로 제안했지만 §3-1 항목 2를 따라
 * `critical` 로 둔다 — 환불을 회색으로 묻으면 목록을 훑을 때 **돈이 되돌아간 건이 보이지 않는다.**
 * `Tag` 는 라벨을 항상 함께 보여주므로 색이 세도 상태는 글자로 구별된다.
 *
 * `description` 은 기획서 statusTones 의 `meaning` 그대로다 — 상태 대시의 툴팁이 쓴다.
 */
export const STATUS_META: Record<
  StudentStatus,
  { label: string; tone: TagTone; description: string }
> = {
  active: {
    label: "수강중",
    tone: "success",
    description: "진도 1~99% · 정상 진행",
  },
  completed: {
    label: "완료",
    tone: "default",
    description: "진도 100% · 완주함",
  },
  stopped: {
    label: "중단",
    tone: "warning",
    description: "30일 이상 접속 없음",
  },
  refunded: {
    label: "환불",
    tone: "critical",
    description: "환불 완료 · 수강 권한 없음",
  },
};

/**
 * 표본 8건. 총 수강생은 4,820명이지만 화면 검증에 필요한 것은 **상태·진도·기간의 조합**이라
 * 8건으로 줄였다(`PAGE_SIZE` 5 라 2페이지가 되어 페이징도 눈에 보인다).
 *
 * ⚠️ 기획서의 '중단 = 30일 이상 접속 없음' 과 어긋나지 않게 맞췄다 —
 * 오늘(2026-08-28) 기준 `stopped` 행만 최근 학습이 40일 전이고 나머지는 30일 안이다.
 * 데이터가 규칙을 어기면 화면이 조용히 거짓말을 한다.
 */
export const STUDENTS: Student[] = [
  {
    id: "E-20260611-014",
    name: "김하늘",
    email: "haneul.kim@example.com",
    course: "실무로 배우는 React 입문",
    progress: 72.5,
    lastStudiedAt: "2026-08-27 21:14",
    status: "active",
    date: "2026-06-11 10:24",
  },
  {
    id: "E-20260508-002",
    name: "박도윤",
    email: "doyun.park@example.com",
    course: "데이터 분석 첫걸음: 파이썬",
    progress: 100,
    lastStudiedAt: "2026-08-24 19:02",
    status: "completed",
    date: "2026-05-08 14:12",
  },
  {
    id: "E-20260630-041",
    name: "이서준",
    email: "seojun.lee@example.com",
    course: "비전공자를 위한 SQL 기초",
    progress: 18,
    lastStudiedAt: "2026-07-19 23:41",
    status: "stopped",
    date: "2026-06-30 09:35",
  },
  {
    id: "E-20260702-107",
    name: "최유나",
    email: "yuna.choi@example.com",
    course: "UX 라이팅 실전 워크숍",
    progress: 46.2,
    lastStudiedAt: "2026-08-26 08:55",
    status: "active",
    date: "2026-07-02 16:48",
  },
  {
    id: "E-20260721-233",
    name: "정민서",
    email: "minseo.jung@example.com",
    course: "직장인 영어 회화 100일",
    progress: 8.4,
    lastStudiedAt: "2026-08-12 22:30",
    status: "refunded",
    date: "2026-07-21 11:07",
  },
  {
    id: "E-20260803-318",
    name: "강태오",
    email: "taeo.kang@example.com",
    course: "실무로 배우는 React 입문",
    progress: 34.8,
    lastStudiedAt: "2026-08-28 07:20",
    status: "active",
    date: "2026-08-03 20:15",
  },
  {
    id: "E-20260624-089",
    name: "윤소미",
    email: "somi.yoon@example.com",
    course: "데이터 분석 첫걸음: 파이썬",
    progress: 91.3,
    lastStudiedAt: "2026-08-27 12:46",
    status: "active",
    date: "2026-06-24 13:09",
  },
  {
    id: "E-20260519-071",
    name: "한지우",
    email: "jiwoo.han@example.com",
    course: "비전공자를 위한 SQL 기초",
    progress: 100,
    lastStudiedAt: "2026-08-20 18:33",
    status: "completed",
    date: "2026-05-19 09:58",
  },
];

/** 상태 대시 = 필터. 첫 항목은 반드시 `"all"`(필터 해제) */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "active", label: "수강중" },
  { value: "completed", label: "완료" },
  { value: "stopped", label: "중단" },
  { value: "refunded", label: "환불" },
];

/** 세는 대상이 사람이라 단위가 '명'이다 — 단위는 도메인이라 여기 둔다 */
export const STUDENT_UNIT = "명";

/** 상태 대시의 건수 — **이미 포맷된 문자열**로 넘긴다(단위는 `unit` 이 따로 든다) */
export const num = (value: number) => value.toLocaleString("ko-KR");

/**
 * 진도율. 기획서 formats — "0~100 정수 또는 소수 1자리 %".
 * `%` 는 값과 쪼개지 않는다(§D6-5) — 백분율은 한 덩어리로 읽힌다.
 */
export const pct = (value: number) =>
  `${Number.isInteger(value) ? value : value.toFixed(1)}%`;

/**
 * 검색은 이름 · 이메일 · 강의명 **세 값을 한 번에** 훑는다(기획서 F05).
 * 조건 셀렉트를 따로 두지 않는 것은 기획서가 셋을 나열만 하고 고르게 하지 않기 때문이다.
 */
export const searchable = (student: Student) =>
  `${student.name} ${student.email} ${student.course}`;

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 20·50 이지만 **표본이 8건뿐이라 페이징 동작이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 5;
