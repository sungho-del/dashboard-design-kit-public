/* -------------------------------------------------------------------------
 * S18 포인트 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `PointListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 화면 유형: **목록형** (`docs/screen-templates.md` §3-1)
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할              | 실물 이름                     |
 * | ----------------- | ----------------------------- |
 * | 표 한 행의 타입   | `PointAccount`                |
 * | 샘플 데이터       | `POINT_ACCOUNTS`              |
 * | 검색 조건 셀렉트  | `SEARCH_FIELDS`               |
 * | 수치·일시 포맷    | `point` · `ymdhm`             |
 * | 페이지당 행 수    | `PAGE_SIZE`                   |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(`YYYY-MM-DD HH:mm` — 업데이트 기간 필터가 파싱) 를 갖는다
 * - `SEARCH_FIELDS` 의 **첫 항목이 기본 검색 조건**이다(원본도 `fieldOpts[0]` 을 기본으로 쓴다).
 *   ⚠️ 여기에 `"전체"` 를 넣지 않는다 — 원본 `fieldOpts` 는 회원명·아이디 둘뿐이다
 * - 보유 포인트는 **저장하지 않고 `balanceOf()` 로 계산한다** — 아래 참고
 *
 * ## 보유 포인트를 필드로 두지 않는 이유
 * 한 행에 보유·누적 지급·누적 차감 **세 숫자가 나란히** 놓인다. 셋을 각각 값으로 들고 있으면
 * 샘플을 고칠 때 합이 어긋나 **화면이 스스로 모순되는 숫자를 말한다.**
 * 지급·차감만 두고 보유는 파생값으로 계산하면 구조적으로 어긋날 수 없다.
 *
 * ## 원본 어드민 대조 (`_plan/babycube-admin/chunks/0mbh3uyfg-osc.js` 모듈 7642)
 * 원본 컬럼 정의는 **6열**이다 —
 * `name 회원명`(frozen, `/points/{id}` 링크) · `email 아이디(이메일)` ·
 * `balance 보유 포인트`(right, sortable, `<b>`) · `granted 누적 지급 포인트`(right, sortable) ·
 * `deducted 누적 차감 포인트`(right, sortable) · `updatedAt 업데이트 일시`(sortable).
 *
 * 필터는 두 축뿐이다:
 * ```js
 * { date:   { label: "업데이트 기간", fields: [["updatedAt", "업데이트 기간"]] },
 *   search: { fieldOpts: [["mem","회원명"], ["email","아이디(이메일)"]],
 *             ph: "회원명·아이디(이메일) 검색" } }
 * ```
 *
 * ### ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * **회원 등급(브론즈·실버·골드·VIP)이 통째로 발명이었다.** 원본에는 등급 컬럼도,
 * 등급 필터도 없고 **그 네 낱말이 원본 청크 어디에도 나오지 않는다**(전 청크 grep 확인).
 * 예전 주석이 "등급 어휘는 원본 어드민의 필터에서 가져왔다"고 적어 두었는데 사실이 아니다 —
 * 공용 필터바(`26426`)의 라벨 사전에 `grade: "등급"` 이라는 **키가** 있을 뿐이고,
 * 포인트 페이지는 그 축을 쓰지 않는다. `MemberGrade` · `GRADE_LABELS` · `FILTERS` 를 지웠다.
 *
 * 검색 조건의 `"전체"` 항목도 지웠다. 원본 `fieldOpts` 는 회원명·아이디(이메일) 둘뿐이고
 * 기본값이 첫 항목이라, `"전체"` 를 넣으면 **원본에 없는 검색 범위**를 만드는 것이 된다.
 *
 * ## 요약 카드·상태 대시가 없는 이유
 * 포인트 행에는 **상태 컬럼 자체가 없다.** 원본 공용 셸은 상태 대시가 기본 on 이지만
 * 카드 목록을 `api.statusCounts()` 로 받아오는데(값 출처 불명), 상태 축이 없는 화면이라
 * 보여줄 카드가 없다. 없는 지표를 지어내면 근거 없는 증감까지 함께 지어내게 된다.
 * ---------------------------------------------------------------------- */

export interface PointAccount {
  /** 고유 키 — 뼈대가 행 key 로 쓴다 (원본 `rowKey: e => e.id`) */
  id: string;
  name: string;
  /** 아이디(이메일) — 원본 어드민의 열 이름 그대로 */
  email: string;
  /** 누적 지급 포인트 */
  granted: number;
  /** 누적 차감 포인트 (사용·소멸·회수 합) */
  used: number;
  /** 업데이트 일시 `YYYY-MM-DD HH:mm` — 뼈대의 기간 필터가 이 형식을 파싱한다 */
  date: string;
}

export const POINT_ACCOUNTS: PointAccount[] = [
  {
    id: "M-100482",
    name: "김보라",
    email: "bora.kim@example.com",
    granted: 84200,
    used: 61800,
    date: "2026-08-24 10:12",
  },
  {
    id: "M-100471",
    name: "이준서",
    email: "junseo.lee@example.com",
    granted: 32000,
    used: 30500,
    date: "2026-08-23 18:40",
  },
  {
    id: "M-100455",
    name: "박하늘",
    email: "haneul.park@example.com",
    granted: 156000,
    used: 98000,
    date: "2026-08-22 09:05",
  },
  {
    id: "M-100438",
    name: "최시우",
    email: "siwoo.choi@example.com",
    granted: 6000,
    used: 6000,
    date: "2026-08-19 15:22",
  },
  {
    id: "M-100416",
    name: "정다인",
    email: "dain.jung@example.com",
    granted: 71500,
    used: 24300,
    date: "2026-08-15 11:47",
  },
  {
    id: "M-100390",
    name: "한서윤",
    email: "seoyun.han@example.com",
    granted: 18900,
    used: 12400,
    date: "2026-08-08 08:31",
  },
];

/** 보유 포인트 = 누적 지급 − 누적 차감. **파생값이라 저장하지 않는다** */
export const balanceOf = (account: PointAccount) =>
  account.granted - account.used;

/**
 * 검색 조건 셀렉트 — 원본 `search.fieldOpts` 그대로다(값 키까지 같다).
 * **첫 항목이 기본값**이고 `"전체"` 는 없다.
 */
export const SEARCH_FIELDS = [
  { value: "mem", label: "회원명" },
  { value: "email", label: "아이디(이메일)" },
];

/** 검색 대상 문자열. `SEARCH_FIELDS` 의 값에 대응한다 */
export const searchHaystack = (account: PointAccount, field: string) =>
  field === "email" ? account.email : account.name;

/**
 * 포인트 수치 포맷. 단위가 도메인이라 여기 둔다 (원 · P · kg …).
 * 천 단위 구분자는 **쉼표** (§3-1).
 */
export const point = (value: number) => `${value.toLocaleString("ko-KR")}P`;

/**
 * 업데이트 일시 표기 — **분까지, 점 구분자**.
 *
 * 원본 포맷터를 그대로 옮긴 것이다:
 * `e => e ? e.slice(0, 16).replace(/-/g, ".").replace("T", " ") : "-"`.
 * 원본은 ISO(`T` 구분)를 받으므로 `T` 치환이 있는데, 우리 샘플은 공백 구분이라
 * 그 치환이 그냥 지나간다 — 두 형식 모두 같은 결과가 나오도록 원본 그대로 둔다.
 */
export const ymdhm = (dateText: string) =>
  dateText.slice(0, 16).replace(/-/g, ".").replace("T", " ");

/** 검색어 입력의 안내 문구 — 원본 `search.ph` 그대로 */
export const SEARCH_PLACEHOLDER = "회원명·아이디(이메일) 검색";

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 원본 `DEFAULT_PAGE_SIZE` 지만 **샘플이 6건뿐이라 페이징 동작이
 * 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 4;
