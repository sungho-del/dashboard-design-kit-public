import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S24 팝업 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `PopupListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 원본 템플릿: `src/pages/OrderListPage.data.ts` (이커머스 목록형)
 *
 * ## 이 화면이 무엇인가
 * 사용자 화면 진입 시 뜨는 팝업의 **상태와 노출 기간**을 관리한다.
 * 배너(S23)와 같은 축을 쓴다 — 상태 3종 + 기간(종료일 없으면 상시).
 *
 * ## ⚠️ 원본 대조로 바로잡은 것 — 상태 축은 **있다**
 * 이 파일은 한때 "원본 팝업 목록에 상태 어휘가 없다"고 적고 `STATUS_META` 를
 * 만들지 않았다. **사실이 아니다.** 원본 청크(`/popups`)의 컬럼 정의에
 * `{ key: "status", label: "상태", minWidth: 90 }` 가 `내용` 과 `노출 기간` **사이**에
 * 있고, 삭제 모달도 "잠시 내리려는 것이라면 [숨김]을 쓰세요"라고 안내한다.
 * 없던 축을 지어낸 게 아니라 **있는 축을 놓쳤던** 것이라 되살렸다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(등록일시 `YYYY-MM-DD HH:mm`) 를 반드시 갖는다
 * - `STATUS_META` 의 키는 `Popup["status"]` 와 정확히 일치한다
 * - `STATUS_ITEMS` 는 등록/수정 모달의 상태 선택지다
 * - `endAt === ""` 는 **종료일 없음 = 상시**를 뜻한다. 화면 문구는 `periodText` 가 만든다
 *
 * ## 템플릿과 의도적으로 다른 점 (원본 `/popups` 대조)
 * - **상단 요약 카드(STATS 3장)를 만들지 않았다.** 원본에도 기획서에도 없고,
 *   팝업 5건짜리 운영 목록에 증감 지표를 붙이면 없는 숫자를 지어내게 된다
 * - **필터 상수(`FILTERS`)·검색 축이 없다.** 원본은 전량을 받아
 *   `card > ListHead + Table` 한 덩어리로 그린다 — 필터 바 자체가 없다
 * ---------------------------------------------------------------------- */

/** 팝업의 노출 상태. 배너(S23)와 같은 어휘를 쓴다 — 원본도 같은 배지 컴포넌트다 */
export type PopupStatus = "visible" | "stopped" | "hidden";

export interface Popup {
  /** 팝업 번호 — 고유 키 */
  id: string;
  title: string;
  /** 팝업 본문. 표에서는 한 줄로 잘려 보인다 */
  content: string;
  status: PopupStatus;
  /** 노출 시작일 `YYYY-MM-DD` */
  startAt: string;
  /** 노출 종료일 `YYYY-MM-DD`. **빈 문자열이면 상시** */
  endAt: string;
  /** 등록일시 `YYYY-MM-DD HH:mm` */
  date: string;
}

/**
 * 상태값 → 표시 라벨과 Tag tone. **배너(S23)와 같은 배정**이다 —
 * 두 화면이 같은 어휘를 다른 색으로 칠하면 운영자가 색을 못 믿는다.
 *
 * ⚠️ 색은 `screen-templates.md` §3-1 로 판단한다(원본 톤을 옮기지 않는다).
 * - `visible` 전시중 — 진행 중이고 정상 → `success`
 * - `hidden` 숨김 — **되돌릴 것을 전제로 잠시 내린 상태**다. 방치하면 알려야 할
 *   공지가 안 뜬 채로 남으므로 목록에서 눈에 띄어야 한다 → `warning`
 * - `stopped` 전시중지 — 기간이 끝나 제대로 종료됐다. 더 볼 것이 없다 → `default`
 */
export const STATUS_META: Record<
  PopupStatus,
  { label: string; tone: TagTone }
> = {
  visible: { label: "전시중", tone: "success" },
  hidden: { label: "숨김", tone: "warning" },
  stopped: { label: "전시중지", tone: "default" },
};

export const POPUPS: Popup[] = [
  {
    id: "PU-2026-0005",
    title: "8월 정기 점검 안내",
    content: "8/25(화) 02:00~04:00 서비스 점검이 있습니다.",
    status: "visible",
    startAt: "2026-08-20",
    endAt: "2026-08-25",
    date: "2026-08-18 09:10",
  },
  {
    id: "PU-2026-0004",
    title: "여름 세일 오픈",
    content: "인기 유모차·카시트 최대 30% 할인",
    status: "visible",
    startAt: "2026-08-01",
    endAt: "2026-08-31",
    date: "2026-07-30 15:44",
  },
  {
    id: "PU-2026-0003",
    title: "안심케어 신규 가입 혜택",
    content: "첫 달 이용료를 받지 않습니다.",
    status: "hidden",
    startAt: "2026-08-05",
    endAt: "",
    date: "2026-08-05 11:02",
  },
  {
    id: "PU-2026-0002",
    title: "배송 지연 안내",
    content: "폭우로 일부 지역 배송이 지연되고 있습니다.",
    status: "stopped",
    startAt: "2026-07-15",
    endAt: "2026-07-20",
    date: "2026-07-15 08:30",
  },
  {
    id: "PU-2026-0001",
    title: "개인정보 처리방침 개정 안내",
    content: "2026-07-01부터 개정된 방침이 적용됩니다.",
    status: "stopped",
    startAt: "2026-06-24",
    endAt: "2026-07-01",
    date: "2026-06-20 17:20",
  },
];

/**
 * 삭제가 실패하는 팝업.
 *
 * 실서비스에서는 **서버 응답이** 성공/실패를 정한다. 프로토타입이라
 * 부분 실패 경로("요청한 팝업이 모두 삭제되지 않았습니다")를 볼 수 없어 고정했다.
 * 서버를 붙이면 이 상수는 통째로 사라진다.
 */
export const DELETE_BLOCKED_IDS = ["PU-2026-0004"];

/**
 * 등록/수정 모달의 상태 선택지.
 *
 * ⚠️ 여기서 파생한 **툴바 상태 필터(`FILTERS`)를 되살리지 말 것.**
 * 원본 `/popups` 는 `popupsApi.all()` 로 전량을 받아 그대로 그린다 —
 * 필터 바도 검색도 없다. 기획서 S24 의 `sections` 에도 없다.
 */
export const STATUS_ITEMS = [
  { value: "visible", label: "전시중" },
  { value: "stopped", label: "전시중지" },
  { value: "hidden", label: "숨김" },
];

/**
 * 표의 "노출 기간" 셀 문구. 종료일이 비면 **상시**다.
 *
 * ⚠️ 한때 `상시` 를 `Tag` 로 띄웠는데 되돌렸다. 같은 행에 상태 `Tag` 가 이미
 * 색을 쓰고 있어 배지가 둘이 되면 한 행에서 색이 두 축을 다툰다
 * (`screen-templates.md` §3-1 "분류 배지"). 원본도 글자로만 적는다.
 */
export const periodText = (popup: Pick<Popup, "startAt" | "endAt">) =>
  popup.endAt === ""
    ? `${ymd(popup.startAt)} ~ 상시`
    : `${ymd(popup.startAt)} ~ ${ymd(popup.endAt)}`;

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

/** 다음 팝업 번호. 목록에서 가장 큰 일련번호 + 1 */
export const nextPopupId = (rows: Popup[]) => {
  const max = rows.reduce((acc, row) => {
    const serial = Number(row.id.slice(-4));
    return Number.isNaN(serial) ? acc : Math.max(acc, serial);
  }, 0);
  return `PU-2026-${String(max + 1).padStart(4, "0")}`;
};

/** 한 페이지에 보여줄 행 수. 샘플이 5건이라 페이징이 보이도록 작게 잡았다 */
export const PAGE_SIZE = 4;
