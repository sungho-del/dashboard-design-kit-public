import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S04 입점 심사 (BabyCube 본사 운영 어드민) — 목록형 화면의 **도메인 층**
 *
 * 짝이 되는 뼈대: `SellerReviewPage.tsx` (레이아웃·선택·일괄 처리, 도메인 무관)
 *
 * ## 갈아끼울 것 (이 파일 전체)
 *
 * | 실물 이름         | 역할                                        |
 * | ----------------- | ------------------------------------------- |
 * | `Application`     | 표 한 행의 타입                             |
 * | `STATUS_META`     | 상태값 → 라벨·Tag tone·설명(툴팁)           |
 * | `KIND_META`·`dealKinds` | 거래 유형(렌트/판매) 배지             |
 * | `APPLICATIONS`    | 샘플 데이터                                 |
 * | `FILTERS`         | 상태 대시 = 상태 필터                       |
 * | `DATE_FIELDS`     | 기간 기준 셀렉트 (신청일/승인일/반려일)     |
 * | `SEARCH_FIELDS`   | 검색 조건 셀렉트                            |
 * | `REVIEW_COPY`     | 심사 모달의 안내 문구 (도메인 카피)         |
 * | `HYGIENE_OPTIONS`·`parseRate` | 승인 게이트의 입력 규칙         |
 * | `PROCESSED_AT`    | 처리 일시 (실서비스에서는 서버가 돌려준다)  |
 * | `count`·`ymd`·`ymdhms` | 건수·날짜 포맷                        |
 * | `PAGE_SIZE`       | 페이지당 행 수                              |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(`YYYY-MM-DD HH:mm`, 기간 필터가 파싱)를 반드시 갖는다.
 *   여기서 `date` 는 **신청일**이다
 * - `approvedAt` · `rejectedAt` 은 아직 처리되지 않았으면 `null` → `ymd` 가 `-` 로 낸다
 * - `DATE_FIELDS[].pick` 이 기간 필터가 훑을 값을 고른다 — `null` 이면 그 행은 기간에서 빠진다
 * - `STATUS_META` 의 키는 `Application["status"]` 유니온과 정확히 일치한다
 * - **`REVIEWABLE_STATUS` 만 심사 대상이다.** 뼈대는 이 값으로 행 선택 가능 여부를 정한다 —
 *   원본의 "승인요청 상태인 신청만 심사할 수 있습니다"가 이 한 줄에 걸려 있다
 * - `commissionRate`·`hygieneCertified` 는 **신청자가 제안한 값**이다. 승인 게이트가
 *   이 값을 초깃값으로 받아 운영자가 확정한다(원본 `initial: W` 와 같다)
 * - `FILTERS[0].value` 는 `"all"` · `SEARCH_FIELDS[].pick` 이 검색 대상 값을 정한다
 *
 * ## 상태 색 배정 근거 (§3-1 "상태 색 배정")
 * **원본 배지 클래스는 참고하지 않았다**(원본은 승인요청=`b-prog` · 승인=`b-done` · 반려=`b-exc`).
 * | 상태     | tone       | 이유                                                                  |
 * | -------- | ---------- | --------------------------------------------------------------------- |
 * | 승인요청 | `warning`  | **지금 사람이 심사해야 끝난다** — warning 이 독점하는 자리다          |
 * | 승인     | `default`  | 제대로 끝난 일(정상 종료). 더 볼 것이 없어 눈에 띌 이유가 없다        |
 * | 반려     | `critical` | **비정상 종료**. 목록을 훑을 때 반려 건이 몇인지 라벨 없이 보여야 한다 |
 *
 * `success` 는 쓰지 않는다 — 이 화면에 "진행 중이고 정상인" 상태가 없다.
 * 승인은 진행 중이 아니라 종결이라 `default` 다(§3-1 규칙 3).
 *
 * ## ⚠️ 유형(렌트/판매)은 분류지 상태가 아니다
 * 원본은 렌트를 초록(`b-green`), 판매를 파랑(`b-blue`)으로 칠했다. **그 색 체계는 버렸다.**
 * 우리 `Tag` 의 초록/노랑/빨강은 "지금 주의를 요하는가"를 뜻하므로 분류에 쓰면
 * 목록이 거짓 신호를 낸다. 둘 다 `default` 로 두고 구별은 글자가 한다 —
 * 렌트와 판매는 **대등한 두 값**이라 한쪽만 칠하면 없는 신호가 생긴다.
 *
 * ## 원본 저장본(`_plan/babycube-admin/chunks/27i1gkm-7zus7.js`)과 대조한 결과
 * - **그대로 가져온 것**
 *   - 컬럼 이름과 **순서**: 셀러명 · 대표명 · 연락처 · 유형 · 사업자 · 신청일 ·
 *     [승인일] · [반려일] · 상태 — 승인일/반려일은 **그 상태로 좁혔을 때만** 붙는다
 *   - 유형이 `전체` 인 신청은 **렌트·판매 두 배지**로 편다(원본 `dealType === "전체"`)
 *   - 신청일은 `ymdhms`(초까지) · 승인일·반려일은 `ymd`(날짜만)
 *   - 필터 축 3개: 기간(신청일/승인일/반려일) · 상태(대시) · 검색 조건(셀러명/대표명/연락처)
 *   - 상태 어휘 3종과 상태별 안내 문구(원본 `statusTips`)
 *   - **승인 게이트의 구조 전체** — 셀러별 수수료율 입력 + 위생인증 인증/인증안됨 토글,
 *     6~16% 검증과 그 오류 문구, 되돌릴 수 없다는 경고
 *   - 반려 모달의 사유 자리표시자·안내 문구·버튼 라벨, 처리 결과 토스트 문구
 * - **값 출처가 불명해 그대로 둔 것**
 *   - 표 데이터는 원본에서 API(`sellerApplicationsApi`) 응답이라 청크에 없다
 *   - **`사업자` 열**: 원본 필드명이 `businessType`(유형)이고 `minWidth: 80` 이라
 *     `개인`/`법인` 같은 **짧은 유형 값**일 가능성이 크지만, 값 목록이 청크에 없다.
 *     우리 샘플은 사업자등록번호를 그대로 둔다 — 모르는 어휘를 지어내지 않는다
 * ---------------------------------------------------------------------- */

export type ApplicationStatus = "requested" | "approved" | "rejected";

/** 실제 거래 유형 두 가지. 배지 하나에 대응한다 */
export type DealKind = "rent" | "sale";

/** 신청서가 고르는 값. `both` 는 원본의 `dealType: "전체"` 다 */
export type ApplicationKind = DealKind | "both";

export interface Application {
  /** 신청번호 — 고유키 */
  id: string;
  /** 셀러명 */
  name: string;
  /** 대표명 */
  ceo: string;
  phone: string;
  kind: ApplicationKind;
  /**
   * 사업자 — 원본 필드명은 `businessType` 이다.
   * ⚠️ 원본 값 목록이 청크에 없어(API 응답) 우리 샘플은 사업자등록번호를 쓴다.
   */
  business: string;
  /** 신청일 `YYYY-MM-DD HH:mm` — 뼈대의 기간 필터가 이 형식을 파싱한다 */
  date: string;
  /** 승인일. 아직 승인되지 않았으면 `null` */
  approvedAt: string | null;
  /** 반려일. 아직 반려되지 않았으면 `null` */
  rejectedAt: string | null;
  /**
   * 신청자가 제안한 수수료율(%). **`0` 이면 제안하지 않은 것**이라
   * 승인 게이트가 빈 칸으로 연다(원본 `commissionRate > 0 ? String(...) : ""`).
   */
  commissionRate: number;
  /** 신청서에 적힌 위생인증 여부. 승인 게이트의 초깃값이 된다 */
  hygieneCertified: boolean;
  status: ApplicationStatus;
}

/**
 * **심사할 수 있는 상태.** 뼈대가 이 값으로 행 선택 가능 여부를 정한다.
 * 원본의 "승인요청 상태인 신청만 심사할 수 있습니다"가 이 상수 하나에 걸려 있다.
 */
export const REVIEWABLE_STATUS: ApplicationStatus = "requested";

export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; tone: TagTone; description: string }
> = {
  requested: {
    label: "승인요청",
    tone: "warning",
    description:
      "입점 신청이 접수돼 심사를 기다리는 건입니다. 심사는 상세에서 서류를 보고 처리합니다.",
  },
  approved: {
    label: "승인",
    tone: "default",
    description: "심사를 통과해 셀러로 등록된 신청입니다.",
  },
  rejected: {
    label: "반려",
    tone: "critical",
    description: "심사에서 반려된 신청입니다. 반려 사유가 함께 기록됩니다.",
  },
};

/**
 * 유형 배지. **상태가 아니라 분류**라 상태색을 쓰지 않는다.
 * 둘 다 `default` 다 — 대등한 두 값이라 한쪽만 칠하면 "그쪽이 특별하다"는 없는 신호가 생긴다.
 */
export const KIND_META: Record<DealKind, { label: string; tone: TagTone }> = {
  rent: { label: "렌트", tone: "default" },
  sale: { label: "판매", tone: "default" },
};

/**
 * 유형 하나를 배지 목록으로 편다.
 * 원본은 `dealType === "전체"` 일 때 `["렌트", "판매"]` 두 배지를 나란히 그린다 —
 * "전체"라고 한 단어로 적으면 무엇과 무엇인지가 사라진다.
 */
export const dealKinds = (kind: ApplicationKind): DealKind[] =>
  kind === "both" ? ["rent", "sale"] : [kind];

/** 값이 없는 셀(아직 처리되지 않은 승인일·반려일)에 채우는 글자 */
const EMPTY_CELL = "-";

/**
 * 심사를 마친 시각. 실서비스에서는 **서버가 처리 결과와 함께 돌려주는 값**이라
 * 화면이 만들지 않는다. 샘플에서는 고정값을 써서 처리 결과가 표에 어떻게
 * 반영되는지 그대로 보여준다.
 */
export const PROCESSED_AT = "2026-08-24 09:00";

export const APPLICATIONS: Application[] = [
  {
    id: "A-2026-0141",
    name: "포근한잠",
    ceo: "윤서아",
    phone: "010-4471-2280",
    kind: "rent",
    business: "128-81-55021",
    date: "2026-08-22 10:14",
    approvedAt: null,
    rejectedAt: null,
    commissionRate: 12,
    hygieneCertified: true,
    status: "requested",
  },
  {
    /* 수수료율을 제안하지 않은 신청 — 승인 게이트가 빈 칸으로 열려 입력을 요구한다 */
    id: "A-2026-0139",
    name: "하루베베",
    ceo: "강도윤",
    phone: "010-3320-7714",
    kind: "sale",
    business: "214-86-33907",
    date: "2026-08-21 16:38",
    approvedAt: null,
    rejectedAt: null,
    commissionRate: 0,
    hygieneCertified: false,
    status: "requested",
  },
  {
    /* 렌트와 판매를 함께 하겠다는 신청 — 배지가 둘 뜬다(원본 `dealType: "전체"`) */
    id: "A-2026-0136",
    name: "리틀그린",
    ceo: "오지안",
    phone: "010-8852-1163",
    kind: "both",
    business: "305-82-71144",
    date: "2026-08-20 09:52",
    approvedAt: null,
    rejectedAt: null,
    commissionRate: 9.5,
    hygieneCertified: true,
    status: "requested",
  },
  {
    id: "A-2026-0128",
    name: "소복이",
    ceo: "신하람",
    phone: "010-2214-9908",
    kind: "sale",
    business: "412-88-20376",
    date: "2026-08-14 13:20",
    approvedAt: "2026-08-16 11:02",
    rejectedAt: null,
    commissionRate: 14,
    hygieneCertified: false,
    status: "approved",
  },
  {
    id: "A-2026-0122",
    name: "맘스케어",
    ceo: "배준서",
    phone: "010-7093-5541",
    kind: "rent",
    business: "138-81-64822",
    date: "2026-08-11 15:07",
    approvedAt: null,
    rejectedAt: "2026-08-13 09:45",
    commissionRate: 0,
    hygieneCertified: false,
    status: "rejected",
  },
  {
    id: "A-2026-0117",
    name: "아이랑숲",
    ceo: "임채원",
    phone: "010-6628-3390",
    kind: "sale",
    business: "220-85-49013",
    date: "2026-08-08 11:44",
    approvedAt: "2026-08-09 14:26",
    rejectedAt: null,
    commissionRate: 11,
    hygieneCertified: true,
    status: "approved",
  },
  {
    id: "A-2026-0110",
    name: "밤톨상회",
    ceo: "노시우",
    phone: "010-5517-8842",
    kind: "rent",
    business: "507-83-11290",
    date: "2026-08-05 17:31",
    approvedAt: null,
    rejectedAt: "2026-08-07 10:18",
    commissionRate: 0,
    hygieneCertified: false,
    status: "rejected",
  },
];

/**
 * 심사 모달의 안내 문구. **원본 어드민의 카피를 그대로 옮긴 것**이라 도메인이다 —
 * 되돌릴 수 없다는 경고, 알림톡 전달 고지, 종결 처리 고지는 운영자가 판단을
 * 확정하기 전에 반드시 읽어야 하는 내용이라 뼈대에 박지 않는다.
 */
export const REVIEW_COPY = {
  approveIntro:
    "승인할 셀러별 수수료율과 위생인증 여부를 확정해 주세요. 요청 전체가 함께 승인되거나 함께 취소됩니다.",
  approveWarning:
    "승인하면 셀러·계정이 생성되며 이 심사 화면에서 되돌릴 수 없습니다.",
  rateError: "모든 셀러의 수수료율을 6~16% 사이로 입력해 주세요.",
  rejectPrompt: "반려 사유를 입력해 주세요. 신청자에게 알림톡으로 전달됩니다.",
  rejectWarning:
    "반려는 종결 처리이며, 사유는 심사 이력과 결과 알림에 그대로 남습니다.",
  reviewableOnly: "승인요청 상태인 신청만 심사할 수 있습니다.",
};

/** 승인 게이트의 위생인증 토글. 어휘는 원본(`인증` / `인증안됨`) 그대로다 */
export const HYGIENE_OPTIONS = [
  { value: "certified", label: "인증" },
  { value: "none", label: "인증안됨" },
];

/** 수수료율 허용 범위 — 원본 검증식과 같다 */
const RATE_MIN = 6;
const RATE_MAX = 16;

/**
 * 수수료율 입력 파서 — 원본 `parseCommissionRateInput` 을 그대로 옮겼다.
 * 소수 둘째 자리까지만 허용하고, 범위를 벗어나면 `null` 이다.
 * `null` 하나가 곧 "승인 처리 버튼을 눌러도 넘어가지 않는다"는 뜻이다.
 */
export const parseRate = (text: string): number | null => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(text.trim())) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= RATE_MIN && value <= RATE_MAX
    ? value
    : null;
};

/** 상태 대시 = 상태 필터. 첫 항목은 반드시 `"all"`(필터 해제) — 어휘는 원본 `chip` 그대로다 */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "requested", label: "승인요청" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "반려" },
];

/**
 * 기간 기준 — 원본 `date.fields: [신청일, 승인일, 반려일]`.
 * `pick` 이 `null` 을 내면 그 행은 기간 조건에서 빠진다(아직 처리되지 않은 건).
 */
export const DATE_FIELDS = [
  { value: "apply", label: "신청일", pick: (item: Application) => item.date },
  {
    value: "approved",
    label: "승인일",
    pick: (item: Application) => item.approvedAt,
  },
  {
    value: "rejected",
    label: "반려일",
    pick: (item: Application) => item.rejectedAt,
  },
];

/** 검색 조건 — 원본 `search.fieldOpts` 의 어휘와 **순서** 그대로다 */
export const SEARCH_FIELDS = [
  { value: "name", label: "셀러명", pick: (item: Application) => item.name },
  { value: "ceo", label: "대표명", pick: (item: Application) => item.ceo },
  { value: "phone", label: "연락처", pick: (item: Application) => item.phone },
];

/** 건수 포맷. 단위가 곧 도메인이라 여기 둔다 */
export const count = (value: number) => `${value.toLocaleString("ko-KR")}건`;

/** 승인일·반려일 표기 — 원본 `ymd`. 값이 없으면 `-` 다 */
export const ymd = (dateText: string | null) =>
  dateText ? dateText.slice(0, 10).replace(/-/g, ".") : EMPTY_CELL;

/**
 * 신청일 표기 — 원본 `ymdhms`.
 * 신청일만 **시각까지** 낸다. 같은 날 여러 건이 들어오면 접수 순서가 곧 심사 순서라
 * 날짜만으로는 무엇이 먼저인지 알 수 없다.
 */
export const ymdhms = (dateText: string | null) =>
  dateText
    ? dateText.slice(0, 19).replace(/-/g, ".").replace("T", " ")
    : EMPTY_CELL;

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스는 10·20·50·100(기본 10)이지만 **샘플이 7건뿐이라 페이징이 보이도록** 작게 잡았다.
 * 1페이지에 심사 대상(승인요청) 3건과 처리 완료 1건이 섞이도록 배치했다 —
 * "선택할 수 있는 행"과 "없는 행"이 한 화면에 같이 있어야 전체 선택이 무엇을 고르는지 보인다.
 */
export const PAGE_SIZE = 4;
