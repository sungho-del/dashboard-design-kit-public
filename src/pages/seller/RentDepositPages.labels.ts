import type { CalcBlock } from "../babycube/CalcBreakdown";
import {
  filterSummary,
  matchesFilters,
  type Option,
  type ProcFilters,
} from "./processList.data";
import type { OrderUnit } from "./seed/orders.data";
import {
  DEP_STATUSES,
  depBackOf,
  depCutOf,
  depStatOf,
  minus,
  won,
} from "./settle.labels";

/* 셀러 `RentDepositPages.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./RentDepositPages.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

/* =========================================================================
 * 보증금 내역(SO-STL-002) · 보증금 상세(SO-STL-003) — 조회 전용 원장
 *
 * 원본 = 기획 v0.4 `SCREENS.rentDeposit`(4257) · `FILTERS.rentDeposit`(2519) · `DETAILS.rentDepositDetail`(5143).
 * 반환·청구 **실행은 검수·반납 관리 상세**에서만 — 여기는 집계·조회·이동(원본 주석 그대로).
 * 금액·상태는 `settle.data`(원본 `depBack`·`DEP_LABEL` · 정답 대조).
 *
 * ## 원본 그대로 둔 이상한 점 (기획 확인)
 * - 요약 4값은 보증금 있는 렌트 **전체**(94건)에서 센다 — 목록은 검수중·검수완료·반납완료 18건뿐이라
 *   「점유중 보증금 총액」에 목록에 없는 건이 들어간다(본사 보증금 내역과 같은 모순)
 * - 연체료 칸은 없다 — 원본이 자동 산정을 폐지했다(`depOdFee` = 0)
 * ====================================================================== */

export const DEP_LIST_PATH = "/rent-deposit";

export const DEP_DATE_FIELDS: readonly Option[] = [
  { value: "depStatAt", label: "상태 변경일" },
];
export const DEP_SEARCH_FIELDS: readonly Option[] = [
  { value: "no", label: "주문번호" },
  { value: "mem", label: "회원명" },
  { value: "prod", label: "상품명" },
];
/* 「전체」만 두면 옆 칸 「안심케어 전체」와 같은 꼴이 아니다 — 무엇의 전체인지 적는다 */
export const DEP_STATUS_OPTIONS: readonly Option[] = [
  { value: "all", label: "보증금 상태 전체" },
  ...DEP_STATUSES.map((s) => ({ value: s, label: s })),
];

export interface DepFilters extends ProcFilters {
  status: string;
}

export const EMPTY_DEP_FILTERS: DepFilters = {
  dateField: "depStatAt",
  period: undefined,
  shipWay: "all",
  care: "all",
  searchField: "no",
  keyword: "",
  status: "all",
};

/** 원본 `applyFilters` — 보증금 상태 → 안심케어 → 상태 변경일 → 검색 */
export const matchesDep = (u: OrderUnit, f: DepFilters) =>
  (f.status === "all" || depStatOf(u) === f.status) &&
  matchesFilters(u, f, DEP_SEARCH_FIELDS);

export function depFilterSummary(f: DepFilters) {
  const base = filterSummary(f, DEP_DATE_FIELDS);
  if (f.status === "all") return base;
  const status = `보증금 상태 ${f.status}`;
  return base === "조건 없음 (전체)" ? status : `${status} · ${base}`;
}

/* ---------- 상세 ---------- */

/** 검수 판정 — 판정 전(`-`·`미검수`)이면 null */
export const inspectOf = (u: OrderUnit) =>
  u.inspect && u.inspect !== "-" && u.inspect !== "미검수" ? u.inspect : null;

/** 판정 전 「검수·반납 상세로」 링크가 붙는 상태 */
export const inspLinkable = (u: OrderUnit) =>
  u.stat === "검수중" || u.stat === "수거 신청";

/** 반납 예정일 — 이용 기간 끝 */
export const dueOf = (u: OrderUnit) =>
  ((u.period || "").split("~")[1] || "-").trim();

export const depositCalcBlocks = (u: OrderUnit): CalcBlock[] => [
  {
    key: "dep",
    lines: [
      { key: "dep", label: "보증금", value: won(u.dep || 0) },
      { key: "cut", label: "차감", value: minus(depCutOf(u)) },
    ],
  },
  {
    key: "result",
    emphasis: true,
    lines: [
      {
        key: "back",
        label: "반환 예정액",
        value: won(depBackOf(u)),
        kind: "total",
      },
    ],
  },
];

/** 정산 계산 아래 안내 — 원본 문면(굵은 낱말 `**`) */
export const DEPOSIT_HELP =
  "**배상액(이상없음=전액환급 / 파손 복원가능·복원불가=일부환급 / 분실=전액차감)은 보증금 한도 내에서만 차감**되며 초과 청구는 없습니다. **연체료는 플랫폼에서 자동 산정하지 않으며**, 셀러가 재량으로 보증금에서 차감하고 보증금을 초과하는 금액은 **고객과 직접 협의·청구**합니다(플랫폼 정산 미반영). 안심케어 가입 건의 복원가능 손상은 본사 부담(배상 차감 없음·복원비 본사 청구)입니다. 보증금은 매출 정산과 분리 처리됩니다.";

export type DepProcess = "holding" | "done" | "pending";

/** 처리 상태 갈래 — 원본: 점유중 → 진행 안내 · 환급 완료 · 그 밖 = 환급 실행 대기 */
export const depProcessOf = (u: OrderUnit): DepProcess =>
  depStatOf(u) === "점유중" ? "holding" : u.depDone ? "done" : "pending";

export const DEP_PROCESS_COPY = {
  holding:
    "대여 진행중(점유) — 반납·검수 완료 후 [검수·반납 관리] 상세에서 처리됩니다.",
  holdingOverdue: " 연체료는 반환 시점에 최종 확정되어 차감됩니다.",
  done: "**환급 처리 완료** — 보증금 반환 실행됨.",
  pending:
    "**환급 실행 대기**(검수 판정 완료 · 환급 실행 전) — 반환·청구 실행은 **[검수·반납 관리] 상세의 보증금 정산**에서 합니다.",
  pendingButton: "검수·반납 상세에서 처리",
} as const;

export const inspPathOf = (u: OrderUnit) => `/rent-insp-return/${u.id}`;
