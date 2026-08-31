import type { SelectOption, TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S14 안심케어 승인 — **도메인 층** (BabyCube 본사 운영 어드민)
 * 원본 어드민: `_plan/babycube-admin/chunks/1iqb224ftrumf.js` (`/care-claims`)
 *
 * 짝이 되는 뼈대: `CareClaimListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 이 화면이 무엇인가
 * 파손·분실 건의 **복원비 청구를 본사가 심사**해 익월 정산 보전 여부를 결정한다.
 * 승인하면 그 복원비가 셀러 정산(S12)의 "안심케어" 칸에 **가산**되고 그 건의 보증금은
 * 차감 없이 종결된다. 반려하면 보전 대상에서 빠지고 **보증금 차감 판단으로 되돌아간다**.
 * 1~100건을 한 번에 심사하므로 행 선택 + 일괄 심사가 이 화면의 뼈대다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(주문번호) · `date`(`YYYY-MM-DD HH:mm`) 를 반드시 갖는다.
 *   ⚠️ `date` 는 **청구일**이다. 승인일·반려일은 아직 없을 수 있어 `null` 을 허용하고,
 *   기간 필터의 기준축은 `PERIOD_BASIS` 로 고른다(`dateOf`)
 * - `CLAIM_STATUS_META` 의 키는 `CareClaim["status"]` 와 정확히 일치한다
 * - `FILTERS[0].value` 는 `"all"` — 뼈대가 필터 해제로 취급한다.
 *   ⚠️ 다만 **초기값은 `all` 이 아니라 `DEFAULT_STATUS`** 다 (원본 `defaultStat: "청구 접수"`)
 * - **심사 대상 추리기·합계는 데이터가 한다**(`reviewableOf` · `sumRestoreFee`).
 *   원본도 선택한 것 중 `청구 접수` 인 건만 골라 그 합계를 모달에 찍는다
 * - 이 화면에는 금액 요약이 없다 — 원본에 `note` 슬롯이 없다.
 *   대신 심사 안내(`REVIEW_NOTICE`)가 "무엇이 보전되는가"를 한 줄로 말한다
 *
 * ## 원본 대조 (`/care-claims`)
 * 가져온 것: 컬럼 이름·순서와 **조건부 열**(승인일은 상태가 승인일 때, 반려일은 반려일 때만) ·
 * 상태 어휘 3종과 `statusTips` 문구 · **기본 상태가 `청구 접수`** 인 것 ·
 * 상태를 칩이 아니라 **건수 카드**로 그리는 것(`chip.dash: !0`) · 기간 기준 3축 ·
 * 검색 조건 3종 · 일괄 심사(승인/반려) 두 갈래와 그 검증 문구 ·
 * 모달 본문·플레이스홀더·토스트 문구 · 엑셀 파일명 `안심케어승인`.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * - **`안심케어 심사` 도움말 툴팁** — 원본에 없는 지어낸 문장이었다.
 *   상태 설명은 원본 `statusTips` 가 이미 갖고 있다
 * - **선택 바(SelectionBar) + 툴바의 `심사` 버튼** — 같은 두 액션으로 가는 길이 둘이었다.
 *   원본은 목록 헤더 우측의 **메뉴 하나**뿐이다
 *
 * ## ⚠️ 뜻이 틀렸던 문구 (고친 것)
 * 반려 결과를 "보증금은 차감 없이 종결됩니다"라고 적어 두었는데 **승인의 결과였다.**
 * 원본은 반려를 "보전 대상에서 빠지고 **보증금 차감 판단으로 되돌아간다**"고 말한다 —
 * 정반대다. 심사자가 이 문구를 읽고 반려를 누른다.
 * ---------------------------------------------------------------------- */

/** 청구의 심사 단계 — 원본 `chip.values` 3종 그대로다 */
export type ClaimStatus = "received" | "approved" | "rejected";

/** 검수에서 내린 손상 판정 중 청구가 붙는 것 */
export type Verdict =
  "minor" | "major" | "repairable" | "unrepairable" | "lost";

export interface CareClaim {
  /** 주문번호 — 고유 키 */
  id: string;
  seller: string;
  product: string;
  verdict: Verdict;
  /** 셀러가 청구한 복원비. 승인하면 이 금액이 익월 정산에 가산된다 */
  restoreFee: number;
  /** 청구일 `YYYY-MM-DD HH:mm` — 기간 필터의 기본 기준축 */
  date: string;
  /** 승인일. 아직 승인되지 않았으면 `null` */
  approvedAt: string | null;
  /** 반려일. 아직 반려되지 않았으면 `null` */
  rejectedAt: string | null;
  status: ClaimStatus;
}

/**
 * 청구 상태 → 라벨 · Tag tone · 상태 설명(원본 `statusTips` 문구).
 *
 * ## 색 배정 근거 (`docs/screen-templates.md` §3-1)
 * | 상태      | 지금 누가 무엇을 해야 하나  | tone       |
 * | --------- | --------------------------- | ---------- |
 * | 청구 접수 | **본사가 심사한다**         | `warning`  |
 * | 승인      | 아무도 — 보전 확정 종결     | `default`  |
 * | 반려      | 아무도, 그러나 **반려됐다** | `critical` |
 *
 * 반려는 §3-1 이 명시한 "비정상 종료"(취소·반려·실패)라 정상 종결(승인)과 색을 나눈다.
 * 승인·반려를 같은 회색으로 묶으면 어느 청구가 보전 대상인지 목록에서 보이지 않는다.
 */
export const CLAIM_STATUS_META: Record<
  ClaimStatus,
  { label: string; tone: TagTone; description: string }
> = {
  received: {
    label: "청구 접수",
    tone: "warning",
    description:
      "입점사가 복원비를 청구해 본사 판단을 기다리는 상태입니다. 다음 단계 — [승인] 또는 [반려]를 내립니다.",
  },
  approved: {
    label: "승인",
    tone: "default",
    description:
      "복원비 보전이 확정된 상태입니다. 익월 정산에 가산되고 그 건의 보증금은 차감 없이 종결됩니다. 되돌릴 통로가 없습니다.",
  },
  rejected: {
    label: "반려",
    tone: "critical",
    /* ⚠️ 원본 문구다. "차감 없이 종결"은 **승인**의 결과지 반려의 결과가 아니다 */
    description:
      "청구가 반려된 상태입니다. 보전 대상에서 빠지고 보증금 차감 판단으로 돌아갑니다. 재청구 통로가 없습니다.",
  },
};

/**
 * 검수 판정 → 라벨 · Tag tone.
 *
 * 판정은 상태가 아니라 분류지만 **심사의 갈림길**이라 색을 준다 —
 * 복원이 가능한 건(경미손상 · 파손(복원가능))은 복원비만 보전하면 끝이고,
 * 복원이 불가한 건(중대손상 · 파손(복원불가) · 분실)은 물건 자체가 사라진 것이라
 * 금액대가 다르다. 심사자가 목록을 훑을 때 이 둘이 갈려 보여야 한다.
 *
 * ⚠️ 어휘는 원본 공용 상태 사전에 있는 것만 쓴다. 값 자체는 API 에서 오므로
 * 어느 판정이 몇 건인지는 청크로 알 수 없다 — 샘플은 그대로 두었다.
 */
export const VERDICT_META: Record<Verdict, { label: string; tone: TagTone }> = {
  minor: { label: "경미손상", tone: "warning" },
  repairable: { label: "파손(복원가능)", tone: "warning" },
  major: { label: "중대손상", tone: "critical" },
  unrepairable: { label: "파손(복원불가)", tone: "critical" },
  lost: { label: "분실", tone: "critical" },
};

export const CLAIMS: CareClaim[] = [
  {
    id: "R2026-0705-0288",
    seller: "리틀스텝",
    product: "전동 바운서 오토스윙",
    verdict: "repairable",
    restoreFee: 64_000,
    date: "2026-08-16 09:20",
    approvedAt: null,
    rejectedAt: null,
    status: "received",
  },
  {
    id: "R2026-0612-0503",
    seller: "맘스케어",
    product: "하이체어 우드 · 그레이",
    verdict: "minor",
    restoreFee: 18_000,
    date: "2026-08-18 17:10",
    approvedAt: null,
    rejectedAt: null,
    status: "received",
  },
  {
    id: "R2026-0410-0912",
    seller: "맘스케어",
    product: "원목 모빌 세트",
    verdict: "lost",
    restoreFee: 80_000,
    date: "2026-08-13 11:44",
    approvedAt: null,
    rejectedAt: null,
    status: "received",
  },
  {
    id: "R2026-0522-0301",
    seller: "베베마켓",
    product: "아기 욕조 스탠드형",
    verdict: "major",
    restoreFee: 132_000,
    date: "2026-08-11 15:02",
    approvedAt: null,
    rejectedAt: null,
    status: "received",
  },
  {
    id: "R2026-0429-0188",
    seller: "베베마켓",
    product: "유모차 트래블 시스템",
    verdict: "repairable",
    restoreFee: 96_000,
    date: "2026-07-30 10:15",
    approvedAt: "2026-08-03 09:40",
    rejectedAt: null,
    status: "approved",
  },
  {
    id: "R2026-0318-0774",
    seller: "리틀스텝",
    product: "아기침대 프리미엄 (원목)",
    verdict: "unrepairable",
    restoreFee: 210_000,
    date: "2026-07-22 13:05",
    approvedAt: "2026-07-25 10:20",
    rejectedAt: null,
    status: "approved",
  },
  {
    id: "R2026-0402-0620",
    seller: "쁘띠하우스",
    product: "아기띠 힙시트 3in1",
    verdict: "minor",
    restoreFee: 24_000,
    date: "2026-07-18 16:30",
    approvedAt: null,
    rejectedAt: "2026-07-21 09:15",
    status: "rejected",
  },
];

/**
 * **심사할 수 있는 건인가.** 청구 접수 상태만 승인·반려를 내릴 수 있다.
 *
 * 뼈대는 이 판단을 직접 하지 않는다 — 아래 `reviewableOf` 만 부른다.
 * 그래서 내보내지 않는다(상태가 늘어도 고칠 자리는 이 파일 안이다).
 */
const isReviewable = (row: CareClaim) => row.status === "received";

/**
 * 고른 id 중 **실제로 심사할 수 있는 건**만 추린다 — 원본과 같은 규칙이다.
 *
 * 원본은 체크박스를 잠그지 않고 아무 행이나 고르게 둔 뒤, 제출할 때 `청구 접수` 인
 * 것만 골라 그 건수·합계를 모달에 찍는다. 그래서 모달의 "(N건)"과 복원비 합계는
 * **고른 개수가 아니라 심사 대상 개수**다.
 */
export const reviewableOf = (ids: string[]) =>
  CLAIMS.filter((row) => ids.includes(row.id) && isReviewable(row));

/**
 * 심사 대상들의 복원비 합계. **승인 모달 문구에 그대로 들어가는 숫자**라
 * 뼈대에서 더하면 표와 모달이 각자 계산하게 된다.
 */
export const sumRestoreFee = (rows: CareClaim[]) =>
  rows.reduce((acc, row) => acc + row.restoreFee, 0);

/** 표의 주요 수치 포맷. 단위가 도메인이라 여기 둔다 (원 · 건) */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/** 날짜 표기 — 원본 `ymd` 와 같이 **날짜만** `2026.08.16` 로 낸다 */
export const ymd = (dateText: string | null) =>
  dateText ? dateText.slice(0, 10).replace(/-/g, ".") : "-";

/** 기간 필터의 기준축 — 원본 `date.fields` 3축 그대로다 */
export const PERIOD_BASIS: SelectOption[] = [
  { value: "claimed", label: "청구일" },
  { value: "approved", label: "승인일" },
  { value: "rejected", label: "반려일" },
];

/**
 * 기준축에 해당하는 날짜를 꺼낸다. **어느 필드가 어느 축인지는 도메인**이라 여기 둔다.
 * `null` 이면 그 축에서는 아직 일어나지 않은 일이므로 기간 필터가 걸러낸다.
 */
export const dateOf = (row: CareClaim, basis: string): string | null => {
  if (basis === "approved") return row.approvedAt;
  if (basis === "rejected") return row.rejectedAt;
  return row.date;
};

/** 상태 건수 카드. 첫 항목은 필터 해제 — 원본 `chip.all: "전체"` */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "received", label: "청구 접수" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "반려" },
];

/**
 * **첫 화면의 상태 — 전체가 아니라 `청구 접수` 다** (원본 `defaultStat: "청구 접수"`).
 * 이 화면은 처리해야 할 일감을 보러 오는 곳이라, 열자마자 심사 대기 건이 떠야 한다.
 * `초기화` 도 전체가 아니라 여기로 돌아간다(원본은 쿼리를 비우면 기본값이 살아난다).
 */
export const DEFAULT_STATUS = "received";

/** 검색 조건 — 원본 `search.fieldOpts` 그대로 세 가지다 */
export const SEARCH_FIELDS: SelectOption[] = [
  { value: "no", label: "주문번호" },
  { value: "seller", label: "셀러명" },
  { value: "prod", label: "상품명" },
];

/** 검색 조건에 따라 훑을 문자열. 조건을 늘리면 여기만 고친다 */
export const searchHaystack = (row: CareClaim, field: string) => {
  if (field === "seller") return row.seller;
  if (field === "prod") return row.product;
  return row.id;
};

/** 엑셀 파일명 — 원본 `exportName: "안심케어승인"` */
export const EXPORT_NAME = "안심케어승인";

/**
 * 심사 안내 — 원본 목록 맨 위의 `muted` 한 줄 **그대로**다.
 * 금액 요약이 없는 화면이라 이 문장이 "무엇이 보전되는가"를 혼자 짊어진다.
 */
export const REVIEW_NOTICE =
  "승인한 복원비만 익월 정산에 보전됩니다 — 접수·반려 건은 보전 대상이 아닙니다.";

/** 원본이 서버에 넘기기 전에 막는 상한. 1건 미만·100건 초과는 심사할 수 없다 */
export const REVIEW_LIMIT = 100;

/** 일괄 심사를 막을 때의 문구 — 셋 다 원본 그대로다 */
export const REVIEW_GUARD = {
  empty: "선택된 항목이 없습니다.",
  notReviewable: "청구 접수 상태인 건만 심사할 수 있습니다.",
  limit: `심사 대상은 1~${REVIEW_LIMIT}건이어야 합니다.`,
};

/**
 * 일괄 심사 모달의 문구. 승인과 반려가 **서로 다른 결과**를 낳으므로 각각 적는다.
 *
 * ⚠️ 전부 원본 문장이다. 특히 반려의 "보증금 차감 판단으로 되돌아갑니다"를
 * "차감 없이 종결됩니다"로 바꿔 적으면 **정반대의 뜻**이 된다(그런 적이 있다).
 */
export const REVIEW_COPY = {
  approve: {
    /** 원본은 2건 이상일 때만 제목에 건수를 붙인다 */
    title: (count: number) =>
      count > 1 ? `안심케어 승인 (${count}건)` : "안심케어 승인",
    /** `{amount}` 자리에 심사 대상들의 복원비 합계가 들어간다 */
    body: (amount: string) =>
      `승인하면 복원비 ${amount}이 익월 정산에 보전되고, 해당 건의 보증금은 차감 없이 종결됩니다.`,
    warning: "승인 후에는 이 화면에서 되돌릴 수 없습니다.",
    confirm: "승인 처리",
    toast: (count: number) =>
      count > 1
        ? `${count}건 승인 처리되었습니다. 익월 정산에 보전됩니다.`
        : "승인 처리되었습니다. 익월 정산에 보전됩니다.",
  },
  reject: {
    title: (count: number) =>
      count > 1
        ? `안심케어 반려 사유 입력 (${count}건)`
        : "안심케어 반려 사유 입력",
    body: "반려하면 본사 보전 대상에서 빠지고, 해당 건은 보증금 차감 판단으로 되돌아갑니다(입점사 검수·반납 상세에 사유가 표시됩니다).",
    label: "반려 사유",
    placeholder:
      "반려 사유를 입력하세요 (예: 복원 견적서 미첨부, 복원가능 판정과 청구 내역 불일치, 케어 미가입 건 등)",
    error: "반려 사유를 입력해주세요.",
    confirm: "반려 처리",
    toast: (count: number) =>
      count > 1 ? `${count}건을 반려 처리했습니다.` : "반려 처리되었습니다.",
  },
};

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 원본 기본값 10 이지만 **샘플이 7건뿐이라 페이징 동작이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 5;
