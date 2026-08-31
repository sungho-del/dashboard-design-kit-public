import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S02 회원 관리 (BabyCube 본사 운영 어드민) — 목록형 화면의 **도메인 층**
 *
 * 짝이 되는 뼈대: `MemberListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 갈아끼울 것 (이 파일 전체)
 *
 * | 실물 이름            | 역할                                     |
 * | -------------------- | ---------------------------------------- |
 * | `Member`             | 표 한 행의 타입                          |
 * | `STATUS_META`        | 상태값 → 라벨·Tag tone·설명(툴팁)        |
 * | `MEMBERS`            | 샘플 데이터                              |
 * | `FILTERS`            | 상태 대시 = 상태 필터                    |
 * | `SEARCH_FIELDS`      | 검색 조건 셀렉트 (검색 필드 선택형)      |
 * | `ymd`·`people`·`usageText` | 표의 값 포맷 (가입일 · 명 · 이용)  |
 * | `PAGE_SIZE`          | 페이지당 행 수                           |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(`YYYY-MM-DD HH:mm`, 기간 필터가 파싱)를 반드시 갖는다
 *   여기서는 **아이디(이메일)가 곧 고유키**라 `id` 를 그대로 화면에 쓴다
 * - `STATUS_META` 의 키는 `Member["status"]` 유니온과 정확히 일치한다
 * - `FILTERS[0].value` 는 `"all"`(뼈대가 필터 해제로 취급)이고,
 *   나머지 항목의 `value` 는 **`MemberStatus` 와 같은 값**이다 —
 *   뼈대가 상태 대시에 건수를 세어 붙일 때 이 대응을 쓴다
 * - `SEARCH_FIELDS[0].value` 가 검색 조건의 초기값이고, 각 항목의 `pick` 이
 *   **그 조건으로 무엇을 훑을지**를 정한다 — 뼈대는 필드 이름을 모른다
 *
 * ## 상태 색 배정 근거 (§3-1 "상태 색 배정")
 * 상태 4개 · 색 4종이라 겹치지 않는다. **원본 배지 클래스는 참고하지 않았다**
 * (원본은 정상=`b-prog` · 정지=`b-exc` · 휴면·탈퇴=`b-done` 로 3색뿐이라 휴면과 탈퇴가 같은 색이다).
 * | 상태 | tone       | 이유                                                        |
 * | ---- | ---------- | ----------------------------------------------------------- |
 * | 정상 | `success`  | 진행 중이고 정상인 상태                                     |
 * | 정지 | `critical` | 운영자가 막아 둔 **비정상** 상태 — 목록에서 눈에 띄어야 한다 |
 * | 휴면 | `warning`  | 되살릴 수 있는 비활성 상태 — 재활성 대상이라 신호가 필요하다 |
 * | 탈퇴 | `default`  | **정상 종료**. 되돌아가지 않으므로 더 볼 것이 없다          |
 *
 * ## 원본 저장본(`_plan/babycube-admin/chunks/1bjnhfdn7b5r1.js`)과 대조한 결과
 * 원본은 `MEMBER_COLUMNS` 배열과 `filter` 객체로 화면 구성을 통째로 데이터로 들고 있어
 * 컬럼 이름·순서·정렬·필터 축을 그대로 읽을 수 있다. 그것이 **정본**이다.
 *
 * - **그대로 가져온 것**
 *   - 컬럼 8종의 이름과 순서: 이름 · 아이디(이메일) · 연락처 · 가입일 · 자녀 · 상태 · 이용 · 관리
 *   - `자녀` 우측 정렬(원본 `align: "right"`) · `자녀` 표기 `${childCount}명`
 *   - `가입일` 표기 — 원본 `ymd` 가 **날짜만** `2026.08.12` 로 낸다(시각 없음)
 *   - `이용` 을 렌트/구매로 나눠 적는 규칙(원본 `렌트 3 · 구매 2`, 둘 다 0 이면 `-`)
 *   - 상태 어휘 4종(정상·정지·휴면·탈퇴)과 상태별 안내 문구(원본 `statusTips`)
 *   - 검색 조건 3종과 그 **순서**(이름 → 연락처 → 아이디(이메일)) · 자리표시자 "검색어 입력"
 * - **값 출처가 불명해 그대로 둔 것**: 표 데이터·건수는 원본에서 API(`membersApi`) 응답이라
 *   청크에 없다. 샘플 6건은 우리가 만든 값이다
 * ---------------------------------------------------------------------- */

export type MemberStatus = "active" | "suspended" | "dormant" | "withdrawn";

export interface Member {
  /** 아이디(이메일) — 고유키이자 화면에 그대로 보이는 값이다 */
  id: string;
  name: string;
  phone: string;
  /**
   * 가입일 `YYYY-MM-DD HH:mm` — 뼈대의 기간 필터가 이 형식을 파싱한다.
   * 표에는 `ymd()` 로 **날짜만** 낸다(원본과 같다).
   */
  date: string;
  /** 자녀 수 */
  kids: number;
  /**
   * 이용 내역은 **렌트와 구매를 나눠 든다.**
   * 합계 하나로 접으면 이 서비스에서 가장 중요한 구분(빌려 쓰는 사람 / 사서 쓰는 사람)이
   * 표에서 사라진다 — 원본 어드민도 `렌트 3 · 구매 2` 로 나눠 적는다.
   */
  rentCount: number;
  buyCount: number;
  status: MemberStatus;
}

/**
 * 상태값 → 표시 라벨 · Tag tone · 설명.
 *
 * `description` 은 원본 어드민의 `statusTips` 를 그대로 옮긴 것이다.
 * 원본은 이 문구를 **상태 대시 카드의 툴팁**으로 띄우므로 우리도 같은 자리에 붙이고,
 * 미리보기 모달에서도 한 번 더 낸다 — 되돌림 가능 여부가 조치 판단의 근거다.
 */
export const STATUS_META: Record<
  MemberStatus,
  { label: string; tone: TagTone; description: string }
> = {
  active: {
    label: "정상",
    tone: "success",
    description: "정상 이용 중인 회원입니다.",
  },
  suspended: {
    label: "정지",
    tone: "critical",
    description:
      "관리자가 이용을 정지한 회원입니다. 정지를 풀면 [정상]으로 돌아갑니다.",
  },
  dormant: {
    label: "휴면",
    tone: "warning",
    description:
      "장기 미접속으로 휴면 처리된 회원입니다. 로그인하면 [정상]으로 돌아갑니다.",
  },
  withdrawn: {
    label: "탈퇴",
    tone: "default",
    description:
      "탈퇴한 회원입니다. 개인정보 파기 기한이 지나면 조회되지 않습니다.",
  },
};

export const MEMBERS: Member[] = [
  {
    id: "sujin.park@example.com",
    name: "박수진",
    phone: "010-2841-7702",
    date: "2026-08-12 14:32",
    kids: 2,
    rentCount: 9,
    buyCount: 5,
    status: "active",
  },
  {
    /* 렌트 0 — 사서만 쓰는 회원. "구매 6"만 나온다 */
    id: "dohyun.kim@example.com",
    name: "김도현",
    phone: "010-5520-3318",
    date: "2026-08-10 09:18",
    kids: 1,
    rentCount: 0,
    buyCount: 6,
    status: "active",
  },
  {
    /* 구매 0 — 빌려만 쓰는 회원. "렌트 3"만 나온다 */
    id: "haneul.lee@example.com",
    name: "이하늘",
    phone: "010-3377-9041",
    date: "2026-07-28 20:44",
    kids: 1,
    rentCount: 3,
    buyCount: 0,
    status: "dormant",
  },
  {
    id: "minseo.jung@example.com",
    name: "정민서",
    phone: "010-8814-2260",
    date: "2026-07-15 11:05",
    kids: 3,
    rentCount: 15,
    buyCount: 6,
    status: "suspended",
  },
  {
    id: "yuna.choi@example.com",
    name: "최유나",
    phone: "010-6693-5518",
    date: "2026-06-30 16:27",
    kids: 2,
    rentCount: 4,
    buyCount: 5,
    status: "active",
  },
  {
    /* 둘 다 0 — 가입만 하고 이용한 적이 없다. `usageText` 가 "-" 로 낸다 */
    id: "jiwoo.han@example.com",
    name: "한지우",
    phone: "010-4402-8873",
    date: "2026-05-22 08:51",
    kids: 1,
    rentCount: 0,
    buyCount: 0,
    status: "withdrawn",
  },
];

/**
 * 상태 대시 = 상태 필터. 첫 항목은 반드시 `"all"`(필터 해제)이고,
 * 나머지 `value` 는 `MemberStatus` 와 같은 값이다 — 뼈대가 이 값으로 상태별 건수를 센다.
 *
 * 순서와 어휘는 원본 `chip.values`(`["정상","정지","휴면","탈퇴"]`) + `chip.all`("전체") 그대로다.
 * 원본은 `chip.dash: true` 라 이 축을 **건수 카드**로 그린다 — 칩과 카드를 함께 두지 않는다.
 */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "active", label: "정상" },
  { value: "suspended", label: "정지" },
  { value: "dormant", label: "휴면" },
  { value: "withdrawn", label: "탈퇴" },
];

/**
 * 검색 조건 — 원본 어드민의 "검색 필드 선택 + 검색어" 구조를 그대로 옮겼다.
 * **순서까지 원본(`fieldOpts`) 그대로**다: 이름 → 연락처 → 아이디(이메일).
 * `pick` 이 조건마다 **행의 어느 값을 훑을지**를 정하므로 뼈대는 필드 이름을 모른다.
 */
export const SEARCH_FIELDS = [
  { value: "name", label: "이름", pick: (member: Member) => member.name },
  { value: "phone", label: "연락처", pick: (member: Member) => member.phone },
  { value: "id", label: "아이디(이메일)", pick: (member: Member) => member.id },
];

/** 회원 수의 단위. 단위가 곧 도메인이라 여기 둔다 */
export const MEMBER_UNIT = "명";

/** 천 단위 구분만 하는 순수 수치 — 대시 상자가 값과 단위를 따로 그린다 */
export const num = (value: number) => value.toLocaleString("ko-KR");

/** 자녀 수 등 단위를 붙여 한 덩이로 읽히는 자리 (원본 `${childCount}명`) */
export const people = (value: number) => `${num(value)}${MEMBER_UNIT}`;

/**
 * 가입일 표기 — 원본 `ymd` 와 같다.
 * `"2026-08-12 14:32"` → `"2026.08.12"`. **시각은 표에 내지 않는다**(원본이 날짜만 낸다).
 */
export const ymd = (dateText: string) =>
  dateText.slice(0, 10).replace(/-/g, ".");

/**
 * 이용 내역 한 줄 — 원본 어드민의 규칙을 그대로 옮겼다.
 * 0 인 쪽은 아예 적지 않고, 둘 다 0 이면 `-` 다.
 * "렌트 0 · 구매 6"처럼 적으면 **없는 이용을 있는 것처럼 훑게 된다.**
 */
export const usageText = (member: Member) => {
  const parts: string[] = [];
  if (member.rentCount > 0) parts.push(`렌트 ${member.rentCount}`);
  if (member.buyCount > 0) parts.push(`구매 ${member.buyCount}`);
  return parts.length > 0 ? parts.join(" · ") : "-";
};

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스는 10·20·50·100(기본 10)이지만 **샘플이 6건뿐이라 페이징이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 4;
