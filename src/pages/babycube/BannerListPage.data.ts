import {
  STATUS_META as POST_STATUS_META,
  STATUS_OPTIONS as POST_STATUS_OPTIONS,
  type NoticeStatus,
} from "./NoticeListPage.data";

/* -------------------------------------------------------------------------
 * 배너 관리 — **도메인 층** (BabyCube 본사 운영 어드민 · BO-MKT-006)
 *
 * 원본 = 기획 v0.4 `BANNERS`(proto.html:3676-3680) · `SCREENS.display`(3782-3794).
 * 짝: 뼈대 `BannerListPage.tsx` · 등록/수정 `DisplayFormPage.tsx`(팝업과 공유).
 *
 * ## 이 화면이 무엇인가
 * 사용자 홈 상단 배너(**이미지형** — 링크·위치 없음, 3670)의 목록. 등록·수정은 상세 페이지다
 * (원본 3779 「구 등록·수정 모달 제거 — 상세 화면에서 등록·수정」).
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행은 `id`(경로 조각, 화면에 내지 않는다) · `order`(노출 순서) · `status`(게시/숨김) 를 갖는다
 * - 목록은 `sortedBanners()` — **복사본**을 노출 순서 오름차순으로(원본 3785). 시드 배열은 정렬하지 않는다
 * - 표의 No 는 정렬 순 1..N 이다. **No 와 노출 순서는 별개다**(원본은 저장·삭제 때 `ord` 를 1..N 으로
 *   다시 매긴다 3757-3759·3774 — 퍼블 범위라 재채번은 만들지 않는다)
 * - 날짜는 `YYYY-MM-DD`, 빈 문자열 = 값 없음(시작·종료 각각 독립)
 *
 * ## 샘플 = 원본 3건 글자 그대로 (GPT 검토 · 사용자 승인 2026-11-03)
 * 숨김은 기본 시드에 넣지 않는다 — 테스트 fixture 로만 확인한다.
 * 이미지는 원본 SVG(hex 색이 든 data URI)를 옮기지 않고 **있음/없음**만 둔다 — 화면은 자리 표시.
 *
 * ## 상태 = 손으로 고르는 저장값 (공지와 같은 의미표)
 * 게시 = success · 숨김 = default. 초록은 **저장된 게시 설정**이지 「지금 노출 중」 판정이 아니다.
 * 원본 `statusBadge` 에는 `게시` 키가 없어 숨김과 같은 회색이다(1894-1923 — 원본 결함 보정).
 *
 * ## ⚠️ 기획 확인 필요 (원본대로 둠)
 * - 「여름 물놀이 용품 기획전」은 08-20 에 끝났는데 `게시` 다(시연 기준일 2026-10-19)
 * - 시작일 비움·종료일만 입력을 원본이 허용한다(3747 은 둘 다 있을 때만 순서 검사) — 그 기간의 노출 판정이 없다
 * - 퍼블 범위(업로드 없음)라 신규 배너는 이미지 필수 오류까지만 시연된다
 * ---------------------------------------------------------------------- */

export type BannerStatus = NoticeStatus;

export interface Banner {
  /** 경로 조각(`/display/BN-1`). 원본에는 없다(배열 인덱스로 진입) */
  id: string;
  title: string;
  /** PC(1080×480) · 모바일(720×320) 이미지가 등록돼 있나 — 실제 파일은 개발 영역 */
  pcImage: boolean;
  mobileImage: boolean;
  /** 노출 시작일 `YYYY-MM-DD` · 빈 문자열이면 없음 */
  startAt: string;
  /** 노출 종료일 `YYYY-MM-DD` · **빈 문자열이면 상시** */
  endAt: string;
  /** 노출 순서(원본 `ord`, 1..N) */
  order: number;
  status: BannerStatus;
  /** 등록일 `YYYY-MM-DD`(원본 `at`) */
  date: string;
}

export const STATUS_META = POST_STATUS_META;
export const STATUS_OPTIONS = POST_STATUS_OPTIONS;

/** 원본 `BANNERS`(3677-3679) — 문안·기간·순서·상태·등록일 그대로 */
export const BANNERS: Banner[] = [
  {
    id: "BN-1",
    title: "성장 단계에 맞춰 필요한 것만 딱",
    pcImage: true,
    mobileImage: true,
    startAt: "2026-07-01",
    endAt: "",
    order: 1,
    status: "posted",
    date: "2026-07-01",
  },
  {
    id: "BN-2",
    title: "필요한 건 바로 구매로 빠르게",
    pcImage: true,
    mobileImage: true,
    startAt: "2026-07-01",
    endAt: "",
    order: 2,
    status: "posted",
    date: "2026-07-01",
  },
  {
    id: "BN-3",
    title: "여름 물놀이 용품 기획전",
    pcImage: true,
    mobileImage: true,
    startAt: "2026-07-10",
    endAt: "2026-08-20",
    order: 3,
    status: "posted",
    date: "2026-07-10",
  },
];

/** 노출 순서 오름차순 **복사본** — 시드 배열을 건드리지 않는다 */
export const sortedBanners = () =>
  [...BANNERS].sort((a, b) => a.order - b.order);

export const findBanner = (id: string) =>
  BANNERS.find((banner) => banner.id === id);

/** 저장 문자열 → 화면 표기 `2026.07.01` */
export const ymd = (dateText: string) =>
  dateText.slice(0, 10).replace(/-/g, ".");

/** 노출 기간 — 원본 `dispPeriod`(3781) 그대로: `시작 ~ 종료|상시`. 시작이 비면 비운 채로 둔다 */
export const periodText = (row: { startAt: string; endAt: string }) =>
  `${ymd(row.startAt)} ~ ${row.endAt ? ymd(row.endAt) : "상시"}`;
