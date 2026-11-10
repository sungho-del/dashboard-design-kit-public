import type { TagTone } from "../../components/ui";
import {
  COMMISSION_RATE_MESSAGE,
  parseCommissionRate,
} from "./SellerListPage.data";

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
 * | `BIZ_TYPE_LABEL`  | 사업자 열(법인/개인)                        |
 * | `APPLICATIONS`    | 샘플 데이터 (v0.4 `SELLER_REVIEW` 14건)     |
 * | `FILTERS`         | 상태 대시 = 상태 필터                       |
 * | `DATE_FIELDS`     | 기간 기준 셀렉트 (신청일/승인일/반려일)     |
 * | `SEARCH_FIELDS`   | 검색 조건 셀렉트                            |
 * | `REVIEW_COPY`     | 승인·반려 창과 알림 문구 (목록·상세 공용)   |
 * | `HYGIENE_OPTIONS`·`commissionError` | 승인의 입력 규칙 (목록·상세 공용) |
 * | `filterSummary`   | 접힌 검색조건 줄의 요약                     |
 * | `ymd`·`ymdhms`    | 날짜 포맷                                   |
 * | `businessVerifiedText` | 상세 「사업자 확인」 줄의 값(국세청 확인 완료 / 미확인) |
 * | `PAGE_SIZE`       | 페이지당 행 수                              |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(`YYYY-MM-DD HH:mm:ss`, 기간 필터가 파싱)를 반드시 갖는다.
 *   여기서 `date` 는 **신청일**이다. 표의 No 는 레코드 값이 아니라 조회 결과의 역순 순번이다
 * - `approvedAt` · `rejectedAt` 은 그 상태가 아니면 `null` → `ymd` 가 `-` 로 낸다
 * - `DATE_FIELDS[].pick` 이 기간 필터가 훑을 값을 고른다 — `null` 이면 그 행은 기간에서 빠진다
 * - `STATUS_META` 의 키는 `Application["status"]` 유니온과 정확히 일치한다
 * - **`REVIEWABLE_STATUS` 만 심사 대상이다.** 뼈대는 이 값으로 행 선택 가능 여부를 정한다 —
 *   이미 처리된 건을 다시 처리하지 못하게 한다(원본은 모든 행을 고를 수 있지만 재처리를 허용할 근거가 없다)
 * - **승인하려면 셀러별 수수료율이 있어야 한다** — `commissionError` 하나로 목록 일괄·상세 승인이
 *   같은 규칙(0 초과 100 이하 · 소수 둘째 자리 · 6~16% 밖은 경고만)을 쓴다(2026-10-15 사용자 결정. 원본 v0.4 는 승인 시 수수료율을
 *   검사하지 않지만, 개발 앱의 승인 계약이 셀러마다 수수료율·위생인증을 받는다)
 *
 * ## 상태 어휘 — **`승인요청`** 이다 (원본 v0.4 화면은 `승인신청`)
 * 개발 저장소의 도메인 모델(#15)과 API 계약이 `승인요청` 을 쓴다. 규범 서열상 도메인 모델이
 * 프로토타입 화면보다 앞서므로 표시 어휘도 그것을 따른다.
 *
 * ## 상태 색 배정 근거 (§3-1 "상태 색 배정")
 * **원본 배지 클래스는 참고하지 않았다**(원본은 승인요청=`b-prog` · 승인=`b-done` · 반려=`b-exc`).
 * | 상태     | tone       | 이유                                                                  |
 * | -------- | ---------- | --------------------------------------------------------------------- |
 * | 승인요청 | `warning`  | **지금 사람이 심사해야 끝난다** — warning 이 독점하는 자리다          |
 * | 승인     | `default`  | 제대로 끝난 일(정상 종료). 더 볼 것이 없어 눈에 띌 이유가 없다        |
 * | 반려     | `critical` | **비정상 종료**. 목록을 훑을 때 반려 건이 몇인지 라벨 없이 보여야 한다 |
 *
 * ## ⚠️ 유형(렌트/판매)은 분류지 상태가 아니다
 * 원본은 렌트를 초록(`b-green`), 판매를 파랑(`b-blue`)으로 칠했다. **그 색 체계는 버렸다.**
 * 우리 `Tag` 의 초록/노랑/빨강은 "지금 주의를 요하는가"를 뜻하므로 분류에 쓰면
 * 목록이 거짓 신호를 낸다. 둘 다 `default` 로 두고 구별은 글자가 한다.
 *
 * ## 원본 v0.4(`SCREENS.sellerReview`)와 대조한 결과 (2026-10-15)
 * - 컬럼 이름과 **순서**: No · 셀러명 · 대표명 · 연락처 · 유형 · 사업자(법인/개인) · 신청일 ·
 *   [승인일] · [반려일] · 상태 — 승인일/반려일은 **그 상태로 좁혔을 때만** 붙고 정렬된다
 * - 신청일은 초까지 · 승인일·반려일은 날짜만
 * - 승인 창 제목·본문·경고, 반려 창 제목·자리표시자·안내, 처리 알림(1건/여러 건) 문구
 * - **엑셀 없음** — 원본 `EXPORT_SPEC` 에 입점 심사가 없다
 * ---------------------------------------------------------------------- */

export type ApplicationStatus = "requested" | "approved" | "rejected";

/** 실제 거래 유형 두 가지. 배지 하나에 대응한다 */
export type DealKind = "rent" | "sale";

/** 신청서가 고르는 값. `both` 는 원본의 `type: "전체"` 다 */
export type ApplicationKind = DealKind | "both";

/** 사업자 유형 — 원본 `biz: 법인 / 개인` */
export type ReviewBizType = "corporate" | "individual";

/**
 * 제출 서류 한 건 — 사업자등록증 · 통신판매업신고증.
 * 파일 자체는 서버에 있으므로 여기는 **보여줄 이름과 번호만** 든다.
 */
export interface ReviewDocument {
  fileName: string;
  number: string;
}

export interface Application {
  /** 신청번호 — 고유키 */
  id: string;
  /** 셀러명 */
  name: string;
  /** 대표명 */
  ceo: string;
  phone: string;
  kind: ApplicationKind;
  /** 사업자 — 표의 `사업자` 열이 이것이다(원본 `s.biz`) */
  bizType: ReviewBizType;
  /** 신청일 `YYYY-MM-DD HH:mm:ss` — 원본이 초까지 적는다 */
  date: string;
  /**
   * 사업자 확인 — 국세청 사업자 상태 확인을 마쳤는가. 상세 「사업자 확인」 줄
   * (확인 요청 답(2026-11-06) 12번 · 개발 `businessVerified`)
   */
  businessVerified: boolean;
  /** 승인일. 승인 건만 */
  approvedAt: string | null;
  /** 반려일. 반려 건만 */
  rejectedAt: string | null;
  /** 반려 사유. 반려 건만 — 상세의 「반려 사유」 줄 */
  rejectReason?: string;
  /**
   * 수수료율(%). 신청 단계에서는 0 이고(원본 "신청 접수 시 0%로 시작"),
   * 승인할 때 운영자가 입력한다. 승인 건은 확정된 값을 든다.
   */
  commissionRate: number;
  /** 위생인증 — 기본 `인증안됨`, 승인 셀러에 한해 부여(원본 안내) */
  hygieneCertified: boolean;
  status: ApplicationStatus;
  bizLicense: ReviewDocument;
  salesLicense: ReviewDocument;
}

/**
 * **심사할 수 있는 상태.** 뼈대가 이 값으로 행 선택 가능 여부를 정한다.
 */
export const REVIEWABLE_STATUS: ApplicationStatus = "requested";

/**
 * 상태값 → 라벨 · tone · 설명. 설명은 v0.4 `STAT_TIP` 의 두 문장(설명 + 다음 단계)이다.
 * ⚠️ 반려만은 원본 `STAT_TIP["반려"]` 가 **상품** 문장("판매를 내린 상태… 재심사 요청")이라
 * 같은 형식으로 입점 심사용 문장을 썼다 — 재신청 정책은 근거가 없어 적지 않는다.
 */
export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; tone: TagTone; description: string }
> = {
  requested: {
    label: "승인요청",
    tone: "warning",
    description:
      "입점을 신청해 심사를 기다리는 상태입니다. 심사 결과에 따라 [승인] 또는 [반려]가 됩니다.",
  },
  approved: {
    label: "승인",
    tone: "default",
    description: "본사 심사를 통과한 건입니다. 더 진행할 단계가 없습니다.",
  },
  rejected: {
    label: "반려",
    tone: "critical",
    description:
      "본사 심사에서 반려된 신청입니다. 반려 사유를 확인할 수 있습니다.",
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
 * 원본은 `type === "전체"` 일 때 `["렌트", "판매"]` 두 배지를 나란히 그린다.
 */
export const dealKinds = (kind: ApplicationKind): DealKind[] =>
  kind === "both" ? ["rent", "sale"] : [kind];

export const BIZ_TYPE_LABEL: Record<ReviewBizType, string> = {
  corporate: "법인",
  individual: "개인",
};

/** 값이 없는 셀에 채우는 글자 */
const EMPTY_CELL = "-";

/* -------------------------------------------------------------------------
 * 샘플 — 원본 v0.4 `SELLER_REVIEW` 14건 그대로 (승인요청 8 · 승인 3 · 반려 3)
 *
 * 원본에 없는 값은 둘뿐이다: **승인 건의 수수료율**(원본 샘플은 전부 0 — 승인 건은 확정 요율이
 * 있어야 상세가 의미 있게 읽힌다)과 위생인증(원본 샘플에 없어 기본값 `인증안됨`, 승인 건 하나만 인증).
 * ---------------------------------------------------------------------- */

type Row = [
  id: string,
  name: string,
  ceo: string,
  phone: string,
  bizType: ReviewBizType,
  kind: ApplicationKind,
  bizNo: string,
  salesNo: string,
  date: string,
  status: ApplicationStatus,
  extra?: {
    approvedAt?: string;
    rejectedAt?: string;
    rejectReason?: string;
    commissionRate?: number;
    hygieneCertified?: boolean;
  },
];

const ROWS: Row[] = [
  [
    "SR-318",
    "코지베이비",
    "문지호",
    "010-3318-1900",
    "corporate",
    "both",
    "318-81-10021",
    "2026-서울강남-10021",
    "2026-06-20 14:32:08",
    "requested",
  ],
  [
    "SR-317",
    "그린키즈",
    "배수정",
    "010-3317-1700",
    "individual",
    "rent",
    "317-22-30144",
    "2026-경기성남-30144",
    "2026-06-18 09:15:44",
    "requested",
  ],
  [
    "SR-316",
    "맘스토이",
    "서동현",
    "010-3316-1600",
    "corporate",
    "sale",
    "316-81-52277",
    "2026-서울마포-52277",
    "2026-06-12 16:48:21",
    "approved",
    { approvedAt: "2026-06-14", commissionRate: 12, hygieneCertified: true },
  ],
  [
    "SR-315",
    "베베리움",
    "노아라",
    "010-3315-1500",
    "individual",
    "both",
    "315-14-61190",
    "2026-인천남동-61190",
    "2026-06-10 11:07:53",
    "rejected",
    { rejectedAt: "2026-06-11", rejectReason: "KC 미인증 품목 포함" },
  ],
  [
    "SR-314",
    "도담도담",
    "이하람",
    "010-3314-1400",
    "corporate",
    "both",
    "314-81-70338",
    "2026-서울송파-70338",
    "2026-06-09 10:22:41",
    "requested",
  ],
  [
    "SR-313",
    "꼬망세",
    "유가은",
    "010-3313-1300",
    "individual",
    "rent",
    "313-27-45012",
    "2026-대구수성-45012",
    "2026-06-08 15:47:19",
    "requested",
  ],
  [
    "SR-312",
    "베이비플로우",
    "정우빈",
    "010-3312-1200",
    "corporate",
    "sale",
    "312-81-28806",
    "2026-서울영등포-28806",
    "2026-06-06 09:03:55",
    "requested",
  ],
  [
    "SR-311",
    "오구오구",
    "김서율",
    "010-3311-1100",
    "individual",
    "both",
    "311-19-63340",
    "2026-경기용인-63340",
    "2026-06-04 13:29:07",
    "approved",
    { approvedAt: "2026-06-05", commissionRate: 10 },
  ],
  [
    "SR-310",
    "라라키즈",
    "박시현",
    "010-3310-1000",
    "corporate",
    "rent",
    "310-81-11947",
    "2026-서울서초-11947",
    "2026-06-02 16:58:33",
    "rejected",
    { rejectedAt: "2026-06-03", rejectReason: "사업자등록증 업종 불일치" },
  ],
  [
    "SR-309",
    "몽실베베",
    "최윤슬",
    "010-3309-0900",
    "individual",
    "sale",
    "309-31-50221",
    "2026-부산해운대-50221",
    "2026-05-30 11:41:12",
    "requested",
  ],
  [
    "SR-308",
    "토실토실",
    "한지후",
    "010-3308-0800",
    "corporate",
    "both",
    "308-81-84409",
    "2026-서울종로-84409",
    "2026-05-28 09:18:44",
    "requested",
  ],
  [
    "SR-307",
    "우리아기첫날",
    "강라윤",
    "010-3307-0700",
    "individual",
    "rent",
    "307-16-37725",
    "2026-경기부천-37725",
    "2026-05-25 14:05:29",
    "approved",
    { approvedAt: "2026-05-26", commissionRate: 11 },
  ],
  [
    "SR-306",
    "자란다",
    "임도경",
    "010-3306-0600",
    "corporate",
    "sale",
    "306-81-59013",
    "2026-서울관악-59013",
    "2026-05-22 10:37:58",
    "rejected",
    { rejectedAt: "2026-05-23", rejectReason: "통신판매업 신고증 미제출" },
  ],
  [
    "SR-305",
    "폴짝상점",
    "오시안",
    "010-3305-0500",
    "individual",
    "both",
    "305-24-42660",
    "2026-인천연수-42660",
    "2026-05-20 16:22:03",
    "requested",
  ],
];

/** 사업자 확인이 아직인 신청 — 「미확인」 이 실제로 보이도록 둔 예시(퍼블이 정함 · 서버 값) */
const UNVERIFIED = new Set(["SR-317"]);

/** 「사업자 확인」 줄의 값 — 개발 문구 그대로 */
export const businessVerifiedText = (application: Application) =>
  application.businessVerified ? "국세청 확인 완료" : "미확인";

export const APPLICATIONS: Application[] = ROWS.map(
  ([
    id,
    name,
    ceo,
    phone,
    bizType,
    kind,
    bizNo,
    salesNo,
    date,
    status,
    extra = {},
  ]) => ({
    id,
    name,
    ceo,
    phone,
    kind,
    bizType,
    date,
    businessVerified: !UNVERIFIED.has(id),
    approvedAt: extra.approvedAt ?? null,
    rejectedAt: extra.rejectedAt ?? null,
    rejectReason: extra.rejectReason,
    commissionRate: extra.commissionRate ?? 0,
    hygieneCertified: extra.hygieneCertified ?? false,
    status,
    bizLicense: { fileName: "사업자등록증.pdf", number: bizNo },
    salesLicense: { fileName: "통신판매업 신고증.pdf", number: salesNo },
  }),
);

/**
 * 승인·반려 창과 알림 문구 — 원본 v0.4(`gateApprove` · `_MODAL_CFG.reject` · `confirmReject` ·
 * `gateApproveGo`) 자리. 창 본문·경고·반려 입력칸·반려 안내는 부록 A C74~C77 문구다.
 * **목록 일괄과 상세가 같은 문구를 쓴다.**
 * 승인 창의 셀러별 수수료율·위생인증 입력은 원본에 없는 우리 추가다(위 계약 참고).
 */
export const REVIEW_COPY = {
  approveTitle: (count: number) =>
    `입점 심사 승인${count > 1 ? ` (${count}건)` : ""}`,
  approveBody: "승인하면 셀러 계정이 만들어집니다.",
  approveWarning: "승인 후에는 되돌릴 수 없습니다.",
  /* 일괄 승인 창에만 — 셀러별로 정할 값이 있다는 것을 먼저 말한다 */
  approveRates: "셀러별 수수료율과 위생인증을 확정해 주세요.",
  /** 일괄 승인 — 개발 「모든 셀러의 수수료율을 확인해 주세요. {COMMISSION_RATE_MESSAGE}」 */
  rateError: `모든 셀러의 수수료율을 확인해 주세요. ${COMMISSION_RATE_MESSAGE}`,
  approveConfirm: "승인 처리",
  approved: (count: number) =>
    count > 1 ? `${count}건 승인 처리되었습니다.` : "승인 처리되었습니다.",
  rejectTitle: (count: number) =>
    `입점 반려 사유 입력${count > 1 ? ` (${count}건)` : ""}`,
  rejectPlaceholder: "예: 사업자등록증 확인 불가",
  rejectNote:
    "반려 사유는 알림톡으로 신청자에게 전달됩니다. 반려 후에는 되돌릴 수 없습니다.",
  rejectEmpty: "반려 사유를 입력해주세요.",
  rejectConfirm: "반려 처리",
  rejected: (count: number) =>
    count > 1 ? `${count}건을 반려 처리했습니다.` : "반려 처리되었습니다.",
};

/** 승인 창·상세의 위생인증 택1. 어휘는 원본(`인증` / `인증안됨`) 그대로다 */
export const HYGIENE_OPTIONS = [
  { value: "certified", label: "인증" },
  { value: "none", label: "인증안됨" },
];

export const hygieneValue = (certified: boolean) =>
  certified ? "certified" : "none";

/**
 * 수수료율 검증 — **목록 일괄 승인과 상세 승인이 같은 규칙**을 쓴다(0 초과 100 이하 · 소수 둘째 자리까지 —
 * 판정 Q20-5 · 셀러 목록·상세와 같은 `parseCommissionRate`). 빈 칸과 0 을 모두 막는다 — 신청 단계의 0% 그대로
 * 승인하면 수수료를 정하지 않은 채 입점시킨다. 6~16% 밖은 막지 않고 경고만(`isAtypicalCommission`)
 */
export const commissionError = (value: string) =>
  parseCommissionRate(value) === null ? COMMISSION_RATE_MESSAGE : null;

/** 승인 창의 수수료율 첫 값 — 신청 단계의 0 은 "아직 정하지 않음"이라 빈 칸으로 연다 */
export const rateDraft = (application: Application) =>
  application.commissionRate > 0 ? String(application.commissionRate) : "";

/** 상태 대시 = 상태 필터. 어휘·순서는 원본 `chip` 그대로다(표시 어휘는 위 「상태 어휘」 참고) */
export const FILTERS = [
  { value: "requested", label: "승인요청" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "반려" },
];

/**
 * 화면을 열었을 때 고를 상태. 원본 `sellerReview.dash` — _"기본 : 화면 진입 시 [승인신청] 선택"_.
 *
 * ## ⚠️ **[전체] 카드는 없다** (2026-09-21, 원본 v0.4 대조)
 * 원본 주석이 정책으로 못 박는다 — _"[전체] 카드 없음 — 목록은 항상 한 상태만 보여준다"_.
 */
export const DEFAULT_FILTER = "requested";

/**
 * 기간 기준 — 원본 `date.fields: [신청일, 승인일, 반려일]`.
 * `pick` 이 `null` 을 내면 그 행은 기간 조건에서 빠진다(그 처리가 없는 건).
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

/** 상태 카드의 단위 */
export const REVIEW_UNIT = "건";

/** 승인일·반려일 표기 — 원본 `ymd`(날짜만). 값이 없으면 `-` 다 */
export const ymd = (dateText: string | null) =>
  dateText ? dateText.slice(0, 10).replace(/-/g, ".") : EMPTY_CELL;

/**
 * 신청일 표기 — 원본 `2026.06.20 14:32:08`(초까지).
 * 같은 날 여러 건이 들어오면 접수 순서가 곧 심사 순서라 날짜만으로는 무엇이 먼저인지 알 수 없다.
 */
export const ymdhms = (dateText: string | null) =>
  dateText ? dateText.slice(0, 19).replace(/-/g, ".") : EMPTY_CELL;

/** 페이지당 행 수 기본값 — 원본 `pager` 기본 10 */
export const PAGE_SIZE = 10;

/** 페이지당 개수 후보 — 원본 표 하단 셀렉트 그대로 */
export const PAGE_SIZES = [10, 20, 50, 100];

/* -------------------------------------------------------------------------
 * 검색조건 요약 — 접힌 `FilterBar` 한 줄 (회원·셀러 관리와 같은 규칙)
 * 조건이 없으면 원본 문구 `조건 없음 (전체)`. **상태는 넣지 않는다** — 건수 카드가 이미 말한다.
 * ---------------------------------------------------------------------- */

export const NO_FILTER_TEXT = "조건 없음 (전체)";

const dotDate = (value: Date) =>
  `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, "0")}.${String(
    value.getDate(),
  ).padStart(2, "0")}`;

export const filterSummary = ({
  dateLabel,
  from,
  to,
  fieldLabel,
  keyword,
}: {
  dateLabel: string;
  from?: Date;
  to?: Date;
  fieldLabel: string;
  keyword: string;
}): string => {
  const parts: string[] = [];
  /* 하루만 고르면 `to` 가 없다 — 그때는 범위가 아니라 그 하루다 */
  if (from)
    parts.push(`${dateLabel} ${dotDate(from)}${to ? `~${dotDate(to)}` : ""}`);
  if (keyword.trim() !== "") parts.push(`${fieldLabel} «${keyword.trim()}»`);
  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};
