import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S23 배너 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `BannerListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 원본 템플릿: `src/pages/OrderListPage.data.ts` (이커머스 목록형)
 *
 * ## 이 화면이 무엇인가
 * 사용자 홈 상단에 도는 배너의 **노출 순서와 기간**을 관리한다.
 * 목록·등록/수정 모달·삭제 확인이 한 화면에 다 있고, 별도 상세 화면이 없다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(등록일시 `YYYY-MM-DD HH:mm`) 를 반드시 갖는다
 * - `STATUS_META` 의 키는 `Banner["status"]` 와 정확히 일치한다
 * - `STATUS_ITEMS` 는 등록/수정 모달의 상태 선택지다
 * - `endAt === ""` 는 **종료일 없음 = 상시**를 뜻한다. 화면 문구는 `periodText` 가 만든다
 *
 * ## 템플릿과 의도적으로 다른 점 (원본 `/display` 대조)
 * - **상단 요약 카드(STATS 3장)를 만들지 않았다.** 원본에도 기획서 S23 에도 없다.
 *   배너 6건짜리 운영 목록에 "지난주 대비 +12%" 를 붙이면 없는 숫자를 지어낸다.
 *   증감 지표가 없으므로 `up`·`good` 도 등장하지 않는다
 * - **필터 상수(`FILTERS`)·검색 축이 없다.** 원본은 `listAll()` 로 전량을 받아
 *   `card > ListHead + Table` 한 덩어리로 그린다 — 필터 바 자체가 없다.
 *   `date` 형식은 목록형 계약대로 유지한다
 * ---------------------------------------------------------------------- */

/** 배너의 노출 상태. 원본 어휘 그대로(전시중 / 전시중지 / 숨김) */
export type BannerStatus = "visible" | "stopped" | "hidden";

export interface Banner {
  /** 배너 번호 — 고유 키 */
  id: string;
  title: string;
  /** 노출 순서(원본 `sortOrder`). 정렬 방향은 원본이 밝히지 않아 숫자만 보관한다 */
  order: number;
  status: BannerStatus;
  /** 노출 시작일 `YYYY-MM-DD` */
  startAt: string;
  /** 노출 종료일 `YYYY-MM-DD`. **빈 문자열이면 상시** */
  endAt: string;
  /** 등록일시 `YYYY-MM-DD HH:mm` */
  date: string;
}

/**
 * 상태값 → 표시 라벨과 Tag tone.
 *
 * ⚠️ 색은 **"지금 사람의 주의를 요하는가"** 로 정한다(원본의 톤 체계를 옮기지 않는다).
 * - `visible` 전시중 — 정상적으로 굴러가는 중 → `success`
 * - `hidden` 숨김 — **되돌릴 것을 전제로 잠시 내린 상태**다. 방치하면 홈의 배너 자리가
 *   빈 채로 남으므로 목록을 훑을 때 눈에 띄어야 한다 → `warning`
 * - `stopped` 전시중지 — 기간이 끝나 제대로 종료된 상태. 더 볼 것이 없다 → `default`
 */
export const STATUS_META: Record<
  BannerStatus,
  { label: string; tone: TagTone }
> = {
  visible: { label: "전시중", tone: "success" },
  hidden: { label: "숨김", tone: "warning" },
  stopped: { label: "전시중지", tone: "default" },
};

export const BANNERS: Banner[] = [
  {
    id: "BN-2026-0006",
    title: "여름 정기 세일 안내",
    order: 1,
    status: "visible",
    startAt: "2026-08-01",
    endAt: "2026-08-31",
    date: "2026-07-28 10:12",
  },
  {
    id: "BN-2026-0005",
    title: "신생아 렌트 첫 달 무료",
    order: 2,
    status: "visible",
    startAt: "2026-08-10",
    endAt: "",
    date: "2026-08-10 09:40",
  },
  {
    id: "BN-2026-0004",
    title: "성장단계별 추천 상품 모음",
    order: 3,
    status: "hidden",
    startAt: "2026-07-01",
    endAt: "2026-09-30",
    date: "2026-06-25 14:05",
  },
  {
    id: "BN-2026-0003",
    title: "안심케어 가입 안내",
    order: 4,
    status: "visible",
    startAt: "2026-08-05",
    endAt: "2026-08-20",
    date: "2026-08-04 16:22",
  },
  {
    id: "BN-2026-0002",
    title: "봄맞이 유모차 특가",
    order: 5,
    status: "stopped",
    startAt: "2026-03-02",
    endAt: "2026-04-30",
    date: "2026-02-27 11:30",
  },
  {
    id: "BN-2026-0001",
    title: "BabyCube 오픈 기념 이벤트",
    order: 6,
    status: "stopped",
    startAt: "2026-01-02",
    endAt: "2026-01-31",
    date: "2025-12-28 18:03",
  },
];

/**
 * 삭제가 실패하는 배너.
 *
 * 실서비스에서는 **서버 응답이** 성공/실패를 정한다. 이 화면은 프로토타입이라
 * 삭제 실패 경로("요청한 배너가 모두 삭제되지 않았습니다")를 눈으로 확인할 수 없어,
 * 특정 배너를 실패로 고정했다. 서버를 붙일 때 이 상수는 **통째로 사라진다**.
 */
export const DELETE_BLOCKED_IDS = ["BN-2026-0003"];

/**
 * 등록/수정 모달의 상태 선택지.
 *
 * ⚠️ 여기서 파생한 **툴바 상태 필터(`FILTERS`)를 되살리지 말 것.**
 * 원본 `/display` 는 `listAll()` 로 전량을 받아 그대로 그린다 — 필터 바도 검색도 없다.
 * 기획서 S23 의 `sections` 에도 없다.
 */
export const STATUS_ITEMS = [
  { value: "visible", label: "전시중" },
  { value: "stopped", label: "전시중지" },
  { value: "hidden", label: "숨김" },
];

/**
 * 표의 "노출 기간" 셀 문구.
 * 종료일이 비면 **상시**다 — 등록/수정 모달의 안내 문구와 같은 규칙이다.
 */
export const periodText = (banner: Pick<Banner, "startAt" | "endAt">) =>
  banner.endAt === ""
    ? `${ymd(banner.startAt)} ~ 상시`
    : `${ymd(banner.startAt)} ~ ${ymd(banner.endAt)}`;

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

/** 새 행의 등록일시 `YYYY-MM-DD HH:mm` */
export const stamp = (at: Date = new Date()) => {
  const hour = String(at.getHours()).padStart(2, "0");
  const minute = String(at.getMinutes()).padStart(2, "0");
  return `${toYmd(at)} ${hour}:${minute}`;
};

/** 다음 배너 번호. 목록에서 가장 큰 일련번호 + 1 */
export const nextBannerId = (rows: Banner[]) => {
  const max = rows.reduce((acc, row) => {
    const serial = Number(row.id.slice(-4));
    return Number.isNaN(serial) ? acc : Math.max(acc, serial);
  }, 0);
  return `BN-2026-${String(max + 1).padStart(4, "0")}`;
};

/** 한 페이지에 보여줄 행 수. 샘플이 6건이라 페이징이 보이도록 작게 잡았다 */
export const PAGE_SIZE = 4;
