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
 * | `BULK_TARGETS`       | 일괄 변경으로 갈 수 있는 상태            |
 * | `canSleep`·`canChangeStatus` | 상태 변경 자격 (목록·상세 공용)  |
 * | `REASON_COPY`·`needsReason` | 휴면·정지 사유 모달 (목록·상세 공용) |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(`YYYY-MM-DD HH:mm`, 기간 필터가 파싱)를 반드시 갖는다
 *   여기서는 **아이디(이메일)가 곧 고유키**라 `id` 를 그대로 화면에 쓴다
 * - `STATUS_META` 의 키는 `Member["status"]` 유니온과 정확히 일치한다
 * - `FILTERS` 의 `value` 는 **전부 `MemberStatus` 와 같은 값**이다 — 뼈대가 상태 대시에
 *   건수를 세어 붙일 때 이 대응을 쓴다. **`"all"` 항목은 없다**(원본 정책, `DEFAULT_FILTER` 참고)
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
 *   청크에 없다. 샘플 30명은 우리가 만든 값이다(원본 샘플 규모)
 * ---------------------------------------------------------------------- */

export type MemberStatus = "active" | "suspended" | "dormant" | "withdrawn";

/** 자녀 한 명 — 회원 상세의 "자녀 정보" 표가 쓴다 (원본 `sec.members_child`) */
export interface MemberChild {
  /** 태어나기 전이면 태명이 들어간다 (원본 "자녀 이름(또는 태명)") */
  name: string;
  /** `YYYY-MM-DD`. 개월 수는 화면이 이 값에서 계산한다 — 저장해 두면 하루만 지나도 틀린다 */
  birth: string;
  gender: "male" | "female";
}

/**
 * 결제 한 건 — 회원 상세의 "결제 내역" 표가 쓴다 (원본 `sec.members_hist`)
 *
 * 원본 표의 **No** 는 레코드 값이 아니라 **지금 보이는 목록의 역순 순번**이다
 * (`view.length - i`). 그래서 여기 두지 않고 화면이 센다.
 */
export interface MemberPayment {
  /** 주문번호 `YYYYMMDD` + 6자리 (원본 `20260629330571`) */
  orderNo: string;
  /** 결제 일시 `YYYY-MM-DD HH:mm` — 표에는 `2026.06.29 13:15` 로 낸다 */
  paidAt: string;
  /**
   * 주문에 담긴 상품. 원본은 처리단위(`unitsOf`)에서 `구분`·`상품명` 을 도출한다 —
   * **한 주문에 렌트와 판매가 섞일 수 있고**(구분 태그 둘), 상품이 여럿이면 `첫 상품 외 N건` 이다.
   */
  items: { kind: PaymentKind; product: string }[];
  /** 결제금액(원) */
  amount: number;
  status: PaymentStatus;
}

export type PaymentKind = "rent" | "sale";

/**
 * 결제 상태. 원본 화면에 나오는 것은 **둘뿐이다** —
 * `결제완료`(배지 `b-prog`) · `결제취소`(배지 `b-done`).
 */
export type PaymentStatus = "paid" | "canceled";

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
   * 결제 내역. 회원 상세의 "결제 내역" 표가 그대로 쓰고,
   * **목록의 `이용` 열도 여기서 센다**(`usageText`).
   *
   * ⚠️ 한때 `rentCount`·`buyCount` 두 숫자를 따로 들고 있었는데, 상세에 결제 내역 표가
   * 생기자 **같은 사람의 이용 횟수가 두 곳에 적히게** 됐다. 한쪽만 고치면 목록과 상세가
   * 다른 말을 하므로 숫자를 지우고 **내역에서 세도록** 바꿨다.
   */
  payments: MemberPayment[];
  status: MemberStatus;

  /* ── 여기부터는 **회원 상세(BO-MEM-002)** 가 쓰는 값이다 ──
     목록 표에는 나오지 않지만 같은 레코드에 속한다. 상세만 따로 배열을 두면
     한쪽만 고쳤을 때 이름과 연락처가 화면마다 달라진다. */

  gender: "male" | "female";
  /** 생년월일 `YYYY-MM-DD` */
  birth: string;
  address: string;
  /** 최근 접속일 `YYYY-MM-DD`. **1년 이상이면 휴면 전환 대상**이다(원본 정책) */
  lastVisit: string;
  /**
   * 보유 포인트(원) — **포인트 원장(`PointListPage.data.ts` `POINT_LEDGER`) 합과 같은 값**이다.
   * 원장이 회원을 읽으므로(순환 import) 계산 대신 값으로 적는다 — 어긋나면 포인트 목록 테스트가 잡는다
   */
  points: number;
  marketingOptIn: boolean;
  children: MemberChild[];
  /**
   * 진행 중인 렌트 건수. **0 이 아니면 휴면으로 바꿀 수 없다**(원본 상세의 가드 문구) —
   * 빌려 간 물건이 남아 있는데 계정을 재워 두면 반납 안내가 닿지 않는다.
   */
  activeRents: number;
  /**
   * 휴면·정지 사유와 처리 일시(`YYYY-MM-DD HH:mm`). 원본 C-3 ⓐ — 운영자가 휴면·정지로
   * 바꿀 때는 **통로(목록 일괄·상세 저장)와 무관하게 사유를 받는다.**
   * 12개월 미접속 **자동** 휴면에는 사유가 없다 — 그래서 선택값이다.
   */
  statusReason?: string;
  statusAt?: string;
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

/* -------------------------------------------------------------------------
 * 간이 회원 22명 — 원본 샘플(약 30명) 규모에 맞춰 **페이지 넘김이 보이게** 더한 것이다.
 * 아래 `MEMBERS` 의 앞 8명이 화면의 경계 사례(혼합 주문·휴면 가드·결제 없음…)를 맡고,
 * 이들은 머릿수만 채운다 — 상세를 열면 단순한 값이 나온다.
 * ---------------------------------------------------------------------- */

interface BriefRow {
  name: string;
  /** 이메일 앞부분 — 뒤에 `@example.com` 이 붙는다 */
  local: string;
  phone: string;
  date: string;
  status: MemberStatus;
  /** 결제 1건씩. 비우면 이용 `-` */
  uses: PaymentKind[];
  kids: number;
  lastVisit: string;
  reason?: [text: string, at: string];
  /** 보유 포인트 — 포인트 원장 합(`PointListPage.data.ts`). 원장이 없으면 생략 = 0 */
  points?: number;
}

const BRIEF_PRODUCTS: Record<PaymentKind, string> = {
  rent: "디럭스 유모차 스톨라 프로",
  sale: "실리콘 이유식 식기 세트",
};

const BRIEF_ROWS: BriefRow[] = [
  {
    name: "오세린",
    local: "serin.oh",
    phone: "010-3150-2287",
    date: "2026-05-19 10:02",
    status: "active",
    uses: ["rent"],
    kids: 1,
    lastVisit: "2026-09-15",
  },
  {
    name: "문지호",
    local: "jiho.moon",
    phone: "010-7742-1093",
    date: "2026-05-17 18:40",
    status: "active",
    uses: ["sale", "sale"],
    kids: 2,
    lastVisit: "2026-09-11",
  },
  {
    name: "배하은",
    local: "haeun.bae",
    phone: "010-2209-6631",
    date: "2026-05-11 09:27",
    status: "active",
    uses: [],
    kids: 1,
    lastVisit: "2026-08-29",
  },
  {
    name: "신우진",
    local: "woojin.shin",
    phone: "010-9031-4478",
    date: "2026-05-06 21:15",
    status: "suspended",
    uses: ["rent"],
    kids: 1,
    lastVisit: "2026-08-02",
    reason: ["부정 결제 의심 — 카드사 확인 요청", "2026-08-03 11:05"],
  },
  {
    name: "임채원",
    local: "chaewon.lim",
    phone: "010-5528-7710",
    date: "2026-04-28 14:51",
    status: "active",
    uses: ["rent", "sale"],
    kids: 2,
    lastVisit: "2026-09-17",
    points: 1200,
  },
  {
    name: "구민재",
    local: "minjae.koo",
    phone: "010-6617-3305",
    date: "2026-04-22 08:36",
    status: "dormant",
    uses: ["sale"],
    kids: 1,
    lastVisit: "2025-04-20",
  },
  {
    name: "황보라",
    local: "bora.hwang",
    phone: "010-4486-2251",
    date: "2026-04-15 16:09",
    status: "active",
    uses: ["rent", "rent"],
    kids: 1,
    lastVisit: "2026-09-08",
    points: 1100,
  },
  {
    name: "안지성",
    local: "jisung.ahn",
    phone: "010-3364-9182",
    date: "2026-04-09 12:44",
    status: "active",
    uses: ["sale"],
    kids: 3,
    lastVisit: "2026-09-02",
    points: 500,
  },
  {
    name: "전소율",
    local: "soyul.jeon",
    phone: "010-8873-5546",
    date: "2026-04-02 19:20",
    status: "withdrawn",
    uses: [],
    kids: 1,
    lastVisit: "2026-06-30",
  },
  {
    name: "홍다인",
    local: "dain.hong",
    phone: "010-2795-6604",
    date: "2026-03-27 10:58",
    status: "active",
    uses: ["rent"],
    kids: 2,
    lastVisit: "2026-09-14",
    points: 1600,
  },
  {
    name: "고은찬",
    local: "eunchan.ko",
    phone: "010-7150-8829",
    date: "2026-03-21 15:33",
    status: "dormant",
    uses: [],
    kids: 1,
    lastVisit: "2026-05-30",
    reason: ["고객 요청 — 육아휴직 중 계정 보관", "2026-06-01 09:40"],
  },
  {
    name: "남궁윤",
    local: "yoon.namgung",
    phone: "010-4021-3367",
    date: "2026-03-14 11:07",
    status: "active",
    uses: ["sale", "rent"],
    kids: 1,
    lastVisit: "2026-09-16",
  },
  {
    name: "서하준",
    local: "hajun.seo",
    phone: "010-6638-2149",
    date: "2026-03-08 20:26",
    status: "active",
    uses: [],
    kids: 2,
    lastVisit: "2026-07-21",
    points: 100,
  },
  {
    name: "유가은",
    local: "gaeun.yoo",
    phone: "010-9254-7713",
    date: "2026-02-27 13:12",
    status: "active",
    uses: ["rent"],
    kids: 1,
    lastVisit: "2026-09-10",
    points: 500,
  },
  {
    name: "조은우",
    local: "eunwoo.cho",
    phone: "010-3307-5590",
    date: "2026-02-19 09:49",
    status: "suspended",
    uses: ["sale"],
    kids: 2,
    lastVisit: "2026-06-12",
    reason: ["이용약관 위반 — 리뷰 어뷰징", "2026-06-13 17:22"],
  },
  {
    name: "권나연",
    local: "nayeon.kwon",
    phone: "010-5591-0436",
    date: "2026-02-11 17:38",
    status: "active",
    uses: ["sale"],
    kids: 1,
    lastVisit: "2026-09-05",
  },
  {
    name: "장시우",
    local: "siwoo.jang",
    phone: "010-8127-6652",
    date: "2026-02-03 08:15",
    status: "active",
    uses: ["rent", "rent", "sale"],
    kids: 2,
    lastVisit: "2026-09-18",
    points: 500,
  },
  {
    name: "윤서아",
    local: "seoa.yoon",
    phone: "010-2473-9918",
    date: "2026-01-26 22:01",
    status: "dormant",
    uses: ["rent"],
    kids: 1,
    lastVisit: "2025-01-18",
  },
  {
    name: "백도윤",
    local: "doyoon.baek",
    phone: "010-6962-3374",
    date: "2026-01-18 10:30",
    status: "active",
    uses: [],
    kids: 1,
    lastVisit: "2026-08-24",
  },
  {
    name: "차예준",
    local: "yejun.cha",
    phone: "010-4719-8805",
    date: "2026-01-12 14:17",
    status: "withdrawn",
    uses: ["sale"],
    kids: 2,
    lastVisit: "2026-04-03",
  },
  {
    name: "노하린",
    local: "harin.noh",
    phone: "010-3586-1127",
    date: "2026-01-07 16:55",
    status: "active",
    uses: ["rent"],
    kids: 1,
    lastVisit: "2026-09-13",
    points: 600,
  },
  {
    name: "마준서",
    local: "junseo.ma",
    phone: "010-7804-4463",
    date: "2026-01-03 09:08",
    status: "active",
    uses: ["sale"],
    kids: 1,
    lastVisit: "2026-09-07",
  },
];

/** 간이 행 → 회원 레코드. 결제는 가입 다음 달 1일부터 한 달 간격으로 놓는다 */
const toMember = (row: BriefRow, index: number): Member => {
  const [year, month] = row.date.split("-").map(Number);
  return {
    id: `${row.local}@example.com`,
    name: row.name,
    phone: row.phone,
    date: row.date,
    kids: row.kids,
    status: row.status,
    gender: index % 3 === 0 ? "male" : "female",
    birth: `199${index % 10}-0${(index % 9) + 1}-15`,
    address: "서울 강남구 테헤란로 152",
    lastVisit: row.lastVisit,
    points: row.points ?? 0,
    marketingOptIn: index % 2 === 0,
    activeRents: 0,
    statusReason: row.reason?.[0],
    statusAt: row.reason?.[1],
    payments: row.uses
      .map((kind, i) => {
        const at = new Date(year, month + i, 1);
        const day = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-01`;
        return {
          orderNo: `${day.replace(/-/g, "")}${String(100000 + index * 10 + i)}`,
          paidAt: `${day} 10:00`,
          items: [{ kind, product: BRIEF_PRODUCTS[kind] }],
          amount: kind === "rent" ? 148000 : 28000,
          status: "paid" as const,
        };
      })
      .reverse(),
    children: Array.from({ length: row.kids }, (_, i) => ({
      name: ["첫째", "둘째", "셋째"][i],
      birth: `202${i + 1}-0${i + 3}-10`,
      gender: i % 2 === 0 ? ("female" as const) : ("male" as const),
    })),
  };
};

const BRIEF_MEMBERS = BRIEF_ROWS.map(toMember);

export const MEMBERS: Member[] = [
  {
    id: "sujin.park@example.com",
    name: "박수진",
    phone: "010-2841-7702",
    date: "2026-08-12 14:32",
    kids: 2,
    status: "active",
    gender: "female",
    birth: "1991-04-18",
    address: "서울 마포구 월드컵북로 396",
    lastVisit: "2026-09-18",
    points: 0,
    marketingOptIn: true,
    /* 진행 중인 렌트가 있어 **휴면으로 바꿀 수 없다** — 상세의 가드 문구가 이 값을 읽는다 */
    activeRents: 1,
    /* 원본 회원 상세의 결제 내역 5건을 그대로 옮겼다 (취소 1건 포함) */
    payments: [
      {
        orderNo: "20260629330571",
        paidAt: "2026-06-29 13:15",
        items: [{ kind: "rent", product: "잘레토 전동 바운서 4세대" }],
        amount: 135000,
        status: "paid",
      },
      {
        orderNo: "20260627543127",
        paidAt: "2026-06-27 16:20",
        items: [{ kind: "sale", product: "비접촉 체온계" }],
        amount: 61000,
        status: "canceled",
      },
      {
        orderNo: "20260624231881",
        paidAt: "2026-06-24 10:10",
        items: [{ kind: "sale", product: "비접촉 체온계" }],
        amount: 32000,
        status: "paid",
      },
      {
        orderNo: "20260623493905",
        paidAt: "2026-06-23 13:10",
        items: [{ kind: "rent", product: "잘레토 전동 바운서 4세대" }],
        amount: 135000,
        status: "paid",
      },
      {
        orderNo: "20260514104534",
        paidAt: "2026-05-14 14:18",
        items: [{ kind: "rent", product: "원목 범퍼 아기침대" }],
        amount: 84000,
        status: "paid",
      },
    ],
    children: [
      { name: "하랑", birth: "2020-02-23", gender: "female" },
      { name: "튼튼이", birth: "2024-11-05", gender: "male" },
    ],
  },
  {
    id: "dohyun.kim@example.com",
    name: "김도현",
    phone: "010-5520-3318",
    date: "2026-08-10 09:18",
    kids: 1,
    status: "active",
    gender: "male",
    birth: "1988-12-02",
    address: "경기 성남시 분당구 판교로 174",
    lastVisit: "2026-09-12",
    points: 0,
    marketingOptIn: true,
    activeRents: 0,
    /* 사서만 쓰는 회원 — 렌트 0 이라 목록 `이용` 열이 "구매 3" 만 낸다 */
    payments: [
      {
        orderNo: "20260902118430",
        paidAt: "2026-09-02 09:41",
        items: [{ kind: "sale", product: "실리콘 이유식 식기 세트" }],
        amount: 28000,
        status: "paid",
      },
      {
        orderNo: "20260818552017",
        paidAt: "2026-08-18 20:05",
        items: [{ kind: "sale", product: "휴대용 젖병 소독기" }],
        amount: 74000,
        status: "paid",
      },
      {
        orderNo: "20260811900264",
        paidAt: "2026-08-11 11:32",
        items: [{ kind: "sale", product: "비접촉 체온계" }],
        amount: 32000,
        status: "paid",
      },
    ],
    children: [{ name: "봄이", birth: "2023-06-14", gender: "female" }],
  },
  {
    id: "haneul.lee@example.com",
    name: "이하늘",
    phone: "010-3377-9041",
    date: "2026-07-28 20:44",
    kids: 1,
    status: "dormant",
    gender: "female",
    birth: "1993-07-30",
    address: "부산 해운대구 센텀중앙로 90",
    /* 1년 넘게 접속이 없어 휴면으로 전환된 회원이다(원본 정책) */
    lastVisit: "2025-06-02",
    points: 0,
    marketingOptIn: false,
    activeRents: 0,
    /* 빌려만 쓰는 회원 — 구매 0 이라 "렌트 2" 만 낸다 */
    payments: [
      {
        orderNo: "20260420773106",
        paidAt: "2026-04-20 15:47",
        items: [{ kind: "rent", product: "원목 범퍼 아기침대" }],
        amount: 84000,
        status: "paid",
      },
      {
        orderNo: "20260315204918",
        paidAt: "2026-03-15 10:22",
        items: [{ kind: "rent", product: "접이식 아기 욕조" }],
        amount: 39000,
        status: "paid",
      },
    ],
    children: [{ name: "코코", birth: "2022-09-09", gender: "male" }],
  },
  {
    id: "minseo.jung@example.com",
    name: "정민서",
    phone: "010-8814-2260",
    date: "2026-07-15 11:05",
    kids: 3,
    status: "suspended",
    gender: "female",
    birth: "1986-01-11",
    address: "인천 연수구 송도과학로 32",
    lastVisit: "2026-08-30",
    points: 0,
    marketingOptIn: false,
    activeRents: 2,
    /* 운영자가 수동으로 정지한 회원 — 상세의 계정 상태에 «정지 사유» 줄이 나온다 */
    statusReason: "반납 지연 반복 · 분쟁 3건 접수",
    statusAt: "2026-08-30 15:20",
    payments: [
      {
        orderNo: "20260726611052",
        paidAt: "2026-07-26 18:03",
        items: [{ kind: "rent", product: "3in1 유아 카시트" }],
        amount: 162000,
        status: "paid",
      },
      {
        orderNo: "20260719338741",
        paidAt: "2026-07-19 12:55",
        items: [{ kind: "rent", product: "디럭스 유모차 스톨라 프로" }],
        amount: 148000,
        status: "paid",
      },
      {
        orderNo: "20260705129864",
        paidAt: "2026-07-05 09:12",
        items: [{ kind: "sale", product: "실리콘 이유식 식기 세트" }],
        amount: 28000,
        status: "canceled",
      },
      {
        orderNo: "20260628470335",
        paidAt: "2026-06-28 21:40",
        items: [{ kind: "rent", product: "베드사이드 아기침대 슬립온" }],
        amount: 96000,
        status: "paid",
      },
    ],
    children: [
      { name: "다온", birth: "2017-03-21", gender: "male" },
      { name: "라온", birth: "2019-08-02", gender: "female" },
      { name: "새봄이", birth: "2025-01-27", gender: "female" },
    ],
  },
  {
    id: "yuna.choi@example.com",
    name: "최유나",
    phone: "010-6693-5518",
    date: "2026-06-30 16:27",
    kids: 2,
    status: "active",
    gender: "female",
    birth: "1990-05-25",
    address: "대전 유성구 대학로 99",
    lastVisit: "2026-09-16",
    points: 500,
    marketingOptIn: true,
    activeRents: 0,
    payments: [
      {
        orderNo: "20260822905613",
        paidAt: "2026-08-22 14:08",
        /* 상품이 둘 — 상품명 칸이 «휴대용 젖병 소독기 외 1건» 이 된다 */
        items: [
          { kind: "sale", product: "휴대용 젖병 소독기" },
          { kind: "sale", product: "실리콘 이유식 식기 세트" },
        ],
        amount: 102000,
        status: "paid",
      },
      {
        orderNo: "20260731662240",
        paidAt: "2026-07-31 17:26",
        /* 렌트와 판매가 **한 주문에** 섞였다 — 구분 태그가 둘이고 [렌트]·[판매] 탭 양쪽에 나온다 */
        items: [
          { kind: "rent", product: "잘레토 전동 바운서 4세대" },
          { kind: "sale", product: "비접촉 체온계" },
        ],
        amount: 167000,
        status: "paid",
      },
      {
        orderNo: "20260708341779",
        paidAt: "2026-07-08 10:50",
        items: [{ kind: "rent", product: "접이식 아기 욕조" }],
        amount: 39000,
        status: "paid",
      },
    ],
    children: [
      { name: "소유", birth: "2021-12-30", gender: "female" },
      { name: "복덩이", birth: "2025-05-18", gender: "male" },
    ],
  },
  {
    id: "yerin.song@example.com",
    name: "송예린",
    phone: "010-2277-4416",
    date: "2026-08-05 13:40",
    kids: 2,
    status: "active",
    gender: "female",
    birth: "1992-09-14",
    address: "서울 송파구 올림픽로 300",
    lastVisit: "2026-09-17",
    points: 500,
    marketingOptIn: true,
    activeRents: 1,
    payments: [
      {
        orderNo: "20260905228104",
        paidAt: "2026-09-05 19:14",
        items: [{ kind: "rent", product: "3in1 유아 카시트" }],
        amount: 162000,
        status: "paid",
      },
      {
        orderNo: "20260827715339",
        paidAt: "2026-08-27 13:02",
        items: [{ kind: "rent", product: "원목 범퍼 아기침대" }],
        amount: 84000,
        status: "paid",
      },
    ],
    children: [
      { name: "온유", birth: "2021-05-06", gender: "male" },
      { name: "가을이", birth: "2024-09-30", gender: "female" },
    ],
  },
  {
    id: "taeho.ryu@example.com",
    name: "류태호",
    phone: "010-6104-2285",
    date: "2026-07-31 10:12",
    kids: 1,
    status: "active",
    gender: "male",
    birth: "1989-03-27",
    address: "경기 고양시 일산동구 중앙로 1275",
    lastVisit: "2026-09-10",
    points: 0,
    marketingOptIn: false,
    activeRents: 0,
    payments: [
      {
        orderNo: "20260913087452",
        paidAt: "2026-09-13 08:36",
        items: [{ kind: "sale", product: "비접촉 체온계" }],
        amount: 32000,
        status: "paid",
      },
    ],
    children: [{ name: "도담", birth: "2023-01-19", gender: "male" }],
  },
  {
    id: "jiwoo.han@example.com",
    name: "한지우",
    phone: "010-4402-8873",
    date: "2026-05-22 08:51",
    kids: 1,
    status: "withdrawn",
    gender: "male",
    birth: "1995-10-08",
    address: "광주 서구 상무중앙로 58",
    lastVisit: "2026-05-22",
    points: 0,
    marketingOptIn: false,
    activeRents: 0,
    /* 가입만 하고 결제한 적이 없다 — `usageText` 가 "-" 로 내고 표도 빈 상태가 된다 */
    payments: [],
    children: [{ name: "별이", birth: "2024-02-14", gender: "female" }],
  },
  ...BRIEF_MEMBERS,
];

/**
 * 상태 대시 = 상태 필터. 첫 항목은 반드시 `"all"`(필터 해제)이고,
 * 나머지 `value` 는 `MemberStatus` 와 같은 값이다 — 뼈대가 이 값으로 상태별 건수를 센다.
 *
 * 순서와 어휘는 원본 `chip.values`(`["정상","정지","휴면","탈퇴"]`) 그대로다 —
 * **`chip.all`("전체")은 쓰지 않는다**(아래 `DEFAULT_FILTER` 주석의 원본 정책).
 * 원본은 `chip.dash: true` 라 이 축을 **건수 카드**로 그린다 — 칩과 카드를 함께 두지 않는다.
 */
export const FILTERS = [
  { value: "active", label: "정상" },
  { value: "suspended", label: "정지" },
  { value: "dormant", label: "휴면" },
  { value: "withdrawn", label: "탈퇴" },
];

/**
 * 화면을 열었을 때 고를 상태. 원본 `members.dash` — _"기본 : 화면 진입 시 [정상] 선택"_.
 *
 * ## ⚠️ **[전체] 카드는 없다** (2026-09-21, 원본 v0.4 대조)
 * 원본 주석이 정책으로 못 박는다 — _"[전체] 카드 없음 — 목록은 항상 한 상태만 보여준다"_.
 */
export const DEFAULT_FILTER = "active";

/* -------------------------------------------------------------------------
 * 일괄 상태 변경 — 원본 목록 툴바의 `[휴면으로 변경] [정지로 변경]`
 *
 * 원본 주석 `screen.members` 가 정한다 — _"체크 후 [정상으로 변경]/[휴면으로 변경]/
 * [정지로 변경] → 선택 회원 일괄 변경"_.
 *
 * ## ⚠️ 목록이 상세의 가드를 우회하면 안 된다
 * 상세 화면(`MemberDetailPage`)은 **진행 중 렌트가 있으면 휴면을 막는다.** 목록에서
 * 여럿을 한꺼번에 재울 때 그 가드가 빠지면, 운영자는 상세에서 못 하는 일을 목록에서
 * 할 수 있게 된다 — 같은 정책을 두 화면이 다르게 적용하는 순간 정책이 아니게 된다.
 * 그래서 자격 판정(`canChangeStatus`)을 **데이터 층에 한 벌만** 둔다.
 * ---------------------------------------------------------------------- */

/** 일괄 변경으로 갈 수 있는 상태 — **탈퇴는 없다**(되돌릴 수 없는 종결 상태) */
export const BULK_TARGETS: { value: MemberStatus; label: string }[] = [
  { value: "active", label: "정상으로 변경" },
  { value: "dormant", label: "휴면으로 변경" },
  { value: "suspended", label: "정지로 변경" },
];

/**
 * 이 회원을 재울 수 있는가 — **목록의 일괄 변경과 상세의 택1 버튼이 함께 쓴다.**
 *
 * 빌려 간 물건이 남아 있는데 계정을 재우면 반납 안내가 닿지 않는다.
 * 판정을 두 화면에 각각 적어 두면 한쪽만 고쳤을 때 **목록으로 상세의 가드를 우회**할 수 있다.
 */
export const canSleep = (member: Member) => member.activeRents === 0;

/**
 * 이 회원을 `next` 상태로 바꿀 수 있는가(일괄 변경 전용).
 *
 * - **탈퇴 회원은 못 바꾼다** — 원본 _"탈퇴 회원은 상태 변경 드롭다운 없이 배지로만 표시"_
 * - **이미 그 상태면 바꿀 것이 없다** — 고른 행에 섞여 있어도 조용히 빠진다
 * - **휴면은 `canSleep` 이 허락할 때만**
 *
 * ⚠️ 상세 화면은 이 함수를 쓰지 않는다 — 거기서는 **현재 상태도 고를 수 있어야** 하므로
 * "이미 그 상태면 false" 가 맞지 않는다. 공유하는 것은 `canSleep` 하나다.
 */
export const canChangeStatus = (
  member: Member,
  next: MemberStatus,
): boolean => {
  if (member.status === "withdrawn") return false;
  if (member.status === next) return false;
  if (next === "dormant") return canSleep(member);
  return true;
};

/**
 * 일괄 변경 결과 문구.
 *
 * 처리한 수와 **빠진 수를 함께** 알린다(상품 화면 `approveMessage` 와 같은 규칙).
 * 고른 행 중 자격이 없는 건은 조용히 빠지는데, 그 사실을 숨기면 "5명 골랐는데 3명만
 * 바뀐" 이유를 알 수 없다. 휴면은 빠지는 이유가 하나뿐이라 **이유까지 적는다.**
 */
export const bulkStatusMessage = (
  next: MemberStatus,
  done: number,
  skipped: number,
) => {
  const label = STATUS_META[next].label;
  const reason =
    next === "dormant" ? "진행 중 렌트가 있는 회원" : "대상이 아닌 회원";
  return (
    `${done}명을 «${label}»으로 바꿨습니다` +
    (skipped > 0 ? ` · ${skipped}명 제외(${reason})` : "")
  );
};

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
  const rent = countPayments(member, "rent");
  const sale = countPayments(member, "sale");
  if (rent > 0) parts.push(`렌트 ${rent}`);
  if (sale > 0) parts.push(`구매 ${sale}`);
  return parts.length > 0 ? parts.join(" · ") : "-";
};

/**
 * 그 회원의 결제 건수. **취소된 건은 세지 않는다** —
 * 되돌린 주문을 이용 횟수로 세면 "몇 번 빌렸나"가 사실과 달라진다.
 */
export const countPayments = (member: Member, kind: PaymentKind) =>
  member.payments.filter(
    (payment) =>
      payment.status === "paid" &&
      payment.items.some((item) => item.kind === kind),
  ).length;

/** 한 페이지에 보여줄 행 수 — 원본 기본값 10 */
export const PAGE_SIZE = 10;

/** 페이지당 개수 후보 — 원본 표 하단의 셀렉트 */
export const PAGE_SIZES = [10, 20, 50, 100];

/* -------------------------------------------------------------------------
 * 휴면·정지 사유 — 원본 C-3 ⓐ (2026-08-06 전이주체 판정)
 *
 * 목록 일괄과 상세 저장 **두 통로가 같은 게이트**를 지난다. 원본은 한때 목록만 사유를 받고
 * 상세 [저장하기] 는 무사유로 통과했는데, 같은 처분이 통로에 따라 기록이 갈렸다.
 * [정상] 으로 되돌리는 것은 사유를 받지 않는다.
 * ---------------------------------------------------------------------- */

export const needsReason = (next: MemberStatus) =>
  next === "dormant" || next === "suspended";

/** 사유 입력 모달 문구 — 원본 `modalView` 의 memstat 분기 그대로 */
export const REASON_COPY = {
  title: (next: MemberStatus, count: number) =>
    `회원 ${STATUS_META[next].label} 사유 입력${count > 1 ? ` (${count}명)` : ""}`,
  label: (next: MemberStatus) => `${STATUS_META[next].label} 사유`,
  placeholder: (next: MemberStatus) =>
    next === "dormant"
      ? "휴면 전환 사유를 입력하세요 (예: 고객 요청, 장기 미접속 확인, 계정 보호 조치 등)"
      : "정지 사유를 입력하세요 (예: 이용약관 위반, 부정 결제, 분쟁 다발 등)",
  /* 휴면은 자동 전환이 원칙이라 수동 전환이 **예외**임을 문면으로 알린다(원본 #14) */
  note: (next: MemberStatus) =>
    next === "dormant"
      ? "휴면은 12개월 미접속 시 자동 전환이 원칙이며, 어드민 수동 전환은 예외라 사유를 기록합니다. 회원이 다시 로그인하면 [정상]으로 돌아갑니다."
      : "입력한 사유는 회원 상세에 기록되며, 확인 시 정지 회원이 됩니다.",
  error: (next: MemberStatus) =>
    `${STATUS_META[next].label} 사유를 입력해주세요.`,
  confirm: (next: MemberStatus) => `${STATUS_META[next].label} 처리`,
};

/* -------------------------------------------------------------------------
 * 검색조건 요약 — 접힌 `FilterBar` 한 줄에 들어가는 글자
 *
 * 원본은 조건이 없을 때 `조건 없음 (전체)` 라고 적는다. **비워 두지 않는다** —
 * 빈 자리는 "조건이 없는 것"과 "요약을 못 만든 것"을 구별해 주지 못한다.
 *
 * ⚠️ **상태는 요약에 넣지 않는다.** 상태 축은 위의 건수 카드가 이미 선택된 채로
 * 보여 주고 있어(원본 `chip.dash: true`), 여기서 또 적으면 같은 사실이 두 곳에서 말해진다.
 * ---------------------------------------------------------------------- */

/** 조건이 하나도 없을 때 — 원본 문구 그대로 */
export const NO_FILTER_TEXT = "조건 없음 (전체)";

/**
 * 걸린 조건을 사람이 읽는 한 줄로.
 *
 * 날짜는 `Date` 로 받는다(`DatePicker` 가 그렇게 준다) — 문자열로 받으면 화면이
 * 포맷을 한 번 더 정해야 하고, 그 포맷이 표의 `ymd` 와 어긋날 수 있다.
 */
export const filterSummary = ({
  from,
  to,
  fieldLabel,
  keyword,
}: {
  from?: Date;
  to?: Date;
  fieldLabel: string;
  keyword: string;
}): string => {
  const parts: string[] = [];

  if (from) {
    const day = (value: Date) =>
      `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, "0")}.${String(
        value.getDate(),
      ).padStart(2, "0")}`;
    /* 하루만 고르면 `to` 가 없다 — 그때는 범위가 아니라 그 하루다 */
    parts.push(`가입일 ${day(from)}${to ? `~${day(to)}` : ""}`);
  }

  if (keyword.trim() !== "") parts.push(`${fieldLabel} «${keyword.trim()}»`);

  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};
