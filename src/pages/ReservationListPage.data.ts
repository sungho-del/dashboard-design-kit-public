import { CalendarCheck, Clock, Percent } from "lucide-react";
import type { TagTone } from "../components/ui";

/* -------------------------------------------------------------------------
 * 예약 목록(S01) 화면의 **도메인 층** — 차트온(병·의원 예약·진료 관리 SaaS).
 *
 * 짝이 되는 뼈대: `ReservationListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 원본 템플릿: `OrderListPage.data.ts` (이커머스) — 역할과 모양만 상속했다.
 *
 * ## 이 파일이 채우는 역할 (템플릿의 7개 역할 중 6개)
 *
 * | 역할                 | 이 파일의 이름   | 템플릿(이커머스)의 이름 |
 * | -------------------- | ---------------- | ----------------------- |
 * | 표 한 행의 타입      | `Reservation`    | `Order`                 |
 * | 상태값 → 라벨·색     | `STATUS_META`    | 동일                    |
 * | 샘플 데이터          | `RESERVATIONS`   | `ORDERS`                |
 * | 상단 요약 카드 (3장) | `STATS`          | 동일                    |
 * | 툴바 세그먼트 필터   | `FILTERS`        | 동일                    |
 * | 페이지당 행 수       | `PAGE_SIZE`      | 동일                    |
 * | ~~주요 수치 포맷~~   | **없다** (아래)  | `won`                   |
 *
 * ⚠️ **수치 포맷터(`won` 자리)를 비웠다.** 예약 시점에는 진료비가 확정되지 않아
 * 목록에 금액 열이 없다. 뼈대에서도 결제금액 셀과 미리보기 모달의 금액 항목을 걷어냈다.
 * 진료비는 진료가 끝난 뒤 확정되므로 **상세 화면(`ReservationDetailPage`)에만** 나온다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(YYYY-MM-DD HH:mm, 기간 필터가 파싱) 를 반드시 갖는다
 * - `STATUS_META` 의 키는 `Reservation["status"]` 유니온과 정확히 일치한다
 * - `FILTERS[0].value` 는 "전체"를 뜻하는 `"all"` 이다 (뼈대가 필터 해제로 취급)
 * - `STATS[]` 는 **`up`(방향)과 `good`(좋고 나쁨)을 둘 다** 갖는다 — 아래 STATS 주석 참고
 *
 * ## 숫자의 출처 (다른 화면과 어긋나지 않게 맞춘 값)
 * - `STATS` 의 "오늘 예약 38건" 은 진료 현황(`ClinicStatusPage`)의 동명 KPI 와 같은 값이다
 * - "예약 확정률 82%" = (38 − 확정 대기 7) / 38 = 81.6% → 82%
 * - 샘플 3행(RS-20260819-0033)은 예약 상세(`ReservationDetailPage`)가 보여줄 바로 그 건이다
 * ---------------------------------------------------------------------- */

export type ReservationStatus =
  "pending" | "confirmed" | "done" | "noshow" | "canceled";

export interface Reservation {
  /** 예약번호 — 뼈대가 행 key 로 쓴다 */
  id: string;
  patient: string;
  department: string;
  doctor: string;
  status: ReservationStatus;
  /** `YYYY-MM-DD HH:mm` — 뼈대의 기간 필터가 이 형식을 파싱한다 */
  date: string;
  /** 표에는 없고 미리보기 모달에만 나온다 — 전화 접수 중 바로 필요한 값 */
  phone: string;
}

/**
 * 상태값 → 표시 라벨과 Tag tone. 키는 `Reservation["status"]` 와 일치해야 한다.
 *
 * 상태가 5개인데 상태를 뜻하는 `TagTone` 은 4종이라 색이 한 번 겹친다
 * (`screen-templates.md` §3-1 "상태 색 배정" 순서 그대로).
 *
 *   warning  — 지금 사람이 무언가 해야 끝나는 상태 (미확정: 데스크가 확정 전화를 건다)
 *   critical — 비정상 종료 (노쇼·취소). "잘못된 건이 몇 개인가"가 라벨을 읽기 전에 보여야 한다
 *   default  — 정상 종료 (진료완료). 제대로 끝난 일은 눈에 띌 이유가 없다
 *   success  — 진행 중이고 정상 (확정)
 *
 * 겹치는 쪽(노쇼·취소)은 둘 다 "정상적으로 끝나지 않은 건"이라 같은 색을 써도
 * 훑어보는 목적이 훼손되지 않는다. 구별은 `Tag` 가 함께 그리는 라벨 글자가 맡는다.
 */
export const STATUS_META: Record<
  ReservationStatus,
  { label: string; tone: TagTone }
> = {
  pending: { label: "미확정", tone: "warning" },
  confirmed: { label: "확정", tone: "success" },
  done: { label: "진료완료", tone: "default" },
  noshow: { label: "노쇼", tone: "critical" },
  canceled: { label: "취소", tone: "critical" },
};

/** 샘플 6건. `STATUS_META` 의 키 5종을 모두 한 번 이상 쓴다 */
export const RESERVATIONS: Reservation[] = [
  {
    id: "RS-20260819-0041",
    patient: "김도윤",
    department: "내과",
    doctor: "박서준",
    status: "pending",
    date: "2026-08-19 15:00",
    phone: "010-2841-7712",
  },
  {
    id: "RS-20260819-0038",
    patient: "이하늘",
    department: "정형외과",
    doctor: "김태현",
    status: "confirmed",
    date: "2026-08-19 14:20",
    phone: "010-5520-3391",
  },
  {
    id: "RS-20260819-0033",
    patient: "최유나",
    department: "이비인후과",
    doctor: "오세영",
    status: "done",
    date: "2026-08-19 10:30",
    phone: "010-3317-8064",
  },
  {
    id: "RS-20260819-0027",
    patient: "박시우",
    department: "피부과",
    doctor: "윤가은",
    status: "noshow",
    date: "2026-08-19 09:40",
    phone: "010-7742-1180",
  },
  {
    id: "RS-20260818-0119",
    patient: "정예린",
    department: "내과",
    doctor: "박서준",
    status: "canceled",
    date: "2026-08-18 16:10",
    phone: "010-4408-2256",
  },
  {
    id: "RS-20260818-0102",
    patient: "강민재",
    department: "가정의학과",
    doctor: "정민호",
    status: "confirmed",
    date: "2026-08-18 11:15",
    phone: "010-9153-6647",
  },
];

/**
 * 상단 요약 카드 3장. 아이콘은 lucide 컴포넌트 참조(JSX 아님).
 *
 * ⚠️ `up`(방향)과 `good`(좋고 나쁨)은 **다른 축**이다. 반드시 둘 다 채운다.
 * 병원에는 **내려가야 좋은 지표**가 있어서 두 값이 갈린다 —
 *
 *   오늘 예약   +6건   올랐고(up)  좋다(good)          → ↑ 초록
 *   확정 대기   -3건   내렸고(!up) 좋다(good)          → ↓ 초록  ← 겸용하면 여기서 거짓말한다
 *   예약 확정률 -2%p   내렸고(!up) 나쁘다(!good)       → ↓ 빨강
 *
 *   아이콘(↑/↓) ← `up`      색(초록/빨강) ← `good`
 */
export const STATS = [
  {
    /** 당일 건수라 어제와 견주는 것이 자연스럽다 */
    label: "오늘 예약",
    value: "38",
    unit: "건",
    delta: "+6건",
    up: true,
    good: true,
    caption: "어제 대비",
    icon: CalendarCheck,
  },
  {
    /** 확정 전화를 아직 못 건 건수 — 줄어드는 것이 좋은 지표다 */
    label: "확정 대기",
    value: "7",
    unit: "건",
    delta: "-3건",
    up: false,
    good: true,
    caption: "어제 대비",
    icon: Clock,
  },
  {
    /**
     * (38 − 7) / 38 = 81.6% → 82%.
     * 비율 지표는 하루치가 흔들려서 **기간 평균**과 견준다 — 앞 두 장과 기준이 다르다.
     */
    label: "예약 확정률",
    value: "82%",
    unit: "",
    delta: "-2%p",
    up: false,
    good: false,
    caption: "최근 30일 평균 대비",
    icon: Percent,
  },
];

/**
 * 툴바 세그먼트 필터. 첫 항목은 반드시 `"all"`(필터 해제).
 *
 * '취소'는 뺐다 — 되짚어 볼 일이 드물고 세그먼트가 5칸을 넘으면 툴바에서 눌린다.
 * 취소 건은 '전체'에서 보이고 상태 색(critical)으로 구별된다.
 */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "pending", label: "미확정" },
  { value: "confirmed", label: "확정" },
  { value: "done", label: "진료완료" },
  { value: "noshow", label: "노쇼" },
];

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 20·50 이지만 **샘플이 6건뿐이라 페이징 동작이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 3;
