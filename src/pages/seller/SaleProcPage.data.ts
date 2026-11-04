import type { DateRange } from "../../components/ui";
import { periodPresetsFrom } from "../../lib/periodPresets";
import { STATUS_TIPS } from "./orderUnit.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 발주 관리(SO-ORD-001) — **도메인 층**. 뼈대는 `SaleProcPage.tsx`.
 *
 * 원본 = 기획 v0.4 `SCREENS.saleProc`(3923) · `FILTERS.saleProc`(2385) · `rentOrderTable`(4110) ·
 * `listHead`(2998) · `chipDash`(3217) · 게이트 `gateRoute`(1786). 대조 문서 `docs/seller/pilot-saleProc.md`.
 *
 * | 갈아끼울 것        | 여기                                           |
 * | ------------------ | ---------------------------------------------- |
 * | 대상 처리단위       | `SALE_PROC_UNITS` (판매 · 신규 주문/배송 준비/배송 지연) |
 * | 상태 카드          | `STATUS_CARDS` · `DEFAULT_STATUS`               |
 * | 상태변경 버튼       | `BULK_ACTIONS` · `BULK_BY` · `SINGLE_ONLY`      |
 * | 검색조건           | `DATE_FIELDS` · `SHIP_WAYS` · `SEARCH_FIELDS`   |
 * | 알림 문구          | `COPY`                                          |
 * ====================================================================== */

/** 원본 데모 기준일 `FB_TODAY` — 빠른 기간(오늘·1주일…)이 여기서 센다 */
export const DEMO_TODAY = "2026-06-29";
export const SELLER_PERIOD_PRESETS = periodPresetsFrom(
  () => new Date(`${DEMO_TODAY}T00:00:00`),
);

export type ProcStatus = "신규 주문" | "배송 준비" | "배송 지연";

/**
 * 원본 `SCREENS.saleProc` — 판매 처리단위 중 **`stat`** 이 세 상태인 것.
 * ⚠️ 판매자를 거르지 않는다 — 본사 자체 처리단위도 섞인다(원본 `SALE_UNITS()` · 기획 확인 필요).
 */
export const SALE_PROC_UNITS: OrderUnit[] = UNITS.filter(
  (u) =>
    u.type === "판매" &&
    ["신규 주문", "배송 준비", "배송 지연"].includes(u.stat ?? ""),
);

/**
 * 상태 카드 — 원본 `statDash` 순서: **변수 상태(배송 지연)가 정상 흐름 앞**, 그리고 대표 상태(신규 주문)는
 * 언제나 맨 앞(누를 때마다 카드가 자리를 바꾸지 않게). → 신규 주문 · 배송 지연 · 배송 준비
 */
export const STATUS_CARDS: ProcStatus[] = [
  "신규 주문",
  "배송 지연",
  "배송 준비",
];
/** 진입 시 켜지는 카드(원본 `chip.def`) — [전체] 카드는 없다(UI-299) */
export const DEFAULT_STATUS: ProcStatus = "신규 주문";

/** 카드 ⓘ — 원본 `STAT_TIP` 두 줄(설명 · 다음 단계) */
export const cardTip = (status: ProcStatus) => {
  const t = STATUS_TIPS[status];
  return [t.d, t.n] as const;
};

/** 상태변경 버튼 — 원본 `list.bulk.options` 순서 · 값 → 글자 */
export const BULK_ACTIONS = [
  { value: "배송중", label: "배송중" },
  { value: "배송 준비", label: "배송 준비" },
  { value: "배송 지연", label: "배송 지연" },
  { value: "취소", label: "주문 취소" },
] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number]["value"];

/** 고른 카드에서 갈 수 있는 곳만(원본 `bulk.by` · UI-284) */
export const BULK_BY: Record<ProcStatus, BulkAction[]> = {
  "신규 주문": ["배송 준비", "배송 지연", "취소"],
  "배송 준비": ["배송중", "배송 지연", "취소"],
  "배송 지연": ["배송 준비", "배송중", "취소"],
};
/** 단건 전용 — 2건 이상 고르면 잠근다(원본 `bulk.single` · 2026-08-06 사용자 지시) */
export const SINGLE_ONLY: BulkAction[] = ["취소"];

/** 택배사·송장번호 열은 **배송 준비·배송 지연 카드에서만**(원본 `orderColFlags.shipCols`) */
export const showsShipColumns = (status: ProcStatus) => status !== "신규 주문";

/** 기간 기준 — 원본 `date.fields` */
export const DATE_FIELDS = [
  { value: "orderedAt", label: "결제일" },
  { value: "confirmedAt", label: "주문 확인일" },
] as const;
export type DateField = (typeof DATE_FIELDS)[number]["value"];

/**
 * 배송 방법 — 원본은 다중 칩(전체 · 택배 · 방문 수령)이다. 값이 둘뿐이라 다중 선택이 만드는 경우가
 * 전체 / 택배 / 방문 수령 셋과 같아 **하나만 고르는 칸**으로 둔다(결과 같음).
 */
export const SHIP_WAYS = [
  /* 「전체」만 두면 옆 검색 대상 「전체」와 같은 글자가 나란히 선다 — 본사 「판매자 전체」와 같은 꼴 */
  { value: "all", label: "배송 방법 전체" },
  { value: "택배", label: "택배" },
  { value: "방문 수령", label: "방문 수령" },
] as const;
export type ShipWayFilter = (typeof SHIP_WAYS)[number]["value"];

/** 검색 대상 — 원본 `search.fieldOpts` 순서 그대로. 「전체」는 아래 필드를 모두 훑는다 */
export const SEARCH_FIELDS = [
  { value: "all", label: "전체" },
  { value: "mem", label: "구매자명" },
  { value: "email", label: "구매자 ID" },
  { value: "receiver", label: "수령인" },
  { value: "receiverTel", label: "수령인 연락처" },
  { value: "no", label: "주문번호" },
  { value: "code", label: "상품코드" },
  { value: "invoice", label: "송장번호" },
] as const;
export type SearchField = (typeof SEARCH_FIELDS)[number]["value"];
export const SEARCH_PLACEHOLDER = "검색어 입력";

export interface ProcFilters {
  dateField: DateField;
  period?: DateRange;
  shipWay: ShipWayFilter;
  searchField: SearchField;
  keyword: string;
}
export const EMPTY_FILTERS: ProcFilters = {
  dateField: "orderedAt",
  period: undefined,
  shipWay: "all",
  searchField: "all",
  keyword: "",
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** 「2026.06.23 09:15」 → 「2026-06-23」 (원본 `_normDate` — 날짜만 비교) */
const dayOf = (text: string | undefined) =>
  text ? text.slice(0, 10).replace(/\./g, "-") : "";

/** 원본 `applyFilters` — 배송 방법 → 기간 → 검색(대소문자 무시 · 부분 일치) */
export function matchesFilters(u: OrderUnit, f: ProcFilters) {
  if (f.shipWay !== "all" && u.shipWay !== f.shipWay) return false;
  if (f.period?.from) {
    const day = dayOf(u[f.dateField]);
    if (!day) return false;
    if (day < ymd(f.period.from)) return false;
    if (day > ymd(f.period.to ?? f.period.from)) return false;
  }
  const q = f.keyword.trim().toLowerCase();
  if (q) {
    const fields: Exclude<SearchField, "all">[] =
      f.searchField === "all"
        ? ["mem", "email", "receiver", "receiverTel", "no", "code", "invoice"]
        : [f.searchField];
    if (
      !fields.some((k) =>
        String(u[k] ?? "")
          .toLowerCase()
          .includes(q),
      )
    )
      return false;
  }
  return true;
}

const dot = (d: Date) => ymd(d).replace(/-/g, ".");

/**
 * 검색조건 요약 — 원본 `fbSummary` 꼴(「결제일 2026.06.01~2026.06.29」 · 「검색어 "…"」).
 * 배송 방법도 넣는다 — 원본은 위 줄 칩(`chipsTop`)을 요약에서 빠뜨려 접힌 채로는 걸린 줄 모른다.
 */
export function filterSummary(f: ProcFilters) {
  const out: string[] = [];
  const dateLabel = DATE_FIELDS.find((d) => d.value === f.dateField)!.label;
  if (f.period?.from)
    out.push(
      `${dateLabel} ${dot(f.period.from)}~${dot(f.period.to ?? f.period.from)}`,
    );
  if (f.shipWay !== "all") out.push(`배송 방법 ${f.shipWay}`);
  if (f.keyword.trim()) out.push(`검색어 "${f.keyword.trim()}"`);
  return out.length ? out.join(" · ") : "조건 없음 (전체)";
}

export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 알림·창 문구 — 원본 글자 그대로 */
export const COPY = {
  noSelection: "선택된 항목이 없습니다.",
  singleOnly: "한 건씩만 처리할 수 있습니다 — 선택을 1건으로 줄여주세요.",
  singleOnlyToast:
    "주문 취소는 한 건씩만 처리할 수 있습니다 — 선택을 1건으로 줄이거나 주문 상세에서 취소해주세요.",
  courierFirst: "택배사를 먼저 선택해주세요.",
  invoiceFirst: "송장번호를 입력해주세요.",
  courierAndInvoice: "택배사와 송장번호를 입력해주세요.",
  /** 배송중(송장 등록) 완료 — 원본 `_rentShipGo` */
  shipped: (n: number) =>
    n > 1
      ? `${n}건 배송중 전환 → [배송 관리]로 이동했습니다.`
      : "송장 등록 완료 → [배송 관리]로 이동했습니다.",
  /** 일반 확인 완료 — 원본 `gateConfirmGo` */
  changed: (status: string, n: number) =>
    n > 1
      ? `${n}건 '${status}' 처리되었습니다.`
      : `'${status}' 상태로 변경했습니다.`,
  /* 지연·취소 사유 창 문구는 `orderUnit.data` `DELAY_GATE`·`CANCEL_GATE`(상세·렌트와 공용) */
  delayed: (reason: string, n: number) =>
    n > 1
      ? `${n}건을 배송 지연 처리했습니다. (사유: ${reason})`
      : `배송 지연 처리했습니다. (사유: ${reason})`,
  canceled:
    "주문 취소 처리되었습니다 — 셀러 사정 취소로 기록되어 취소 수수료가 면제됩니다. → [취소 관리]에서 환불을 진행하세요.",
  /** 엑셀 — 원본 `exportCsv`: 고른 행이 있으면 그것만, 없으면 조회 결과 전체(퍼블은 알림만) */
  excelEmpty: "다운로드할 데이터가 없습니다.",
  excel: (n: number, picked: boolean) =>
    `${n}건을 엑셀(CSV)로 다운로드했습니다.${picked ? " (선택분)" : ""}`,
  /** 빈 표 — 원본 `tableEmpty` */
  emptyTitle: "해당 조건의 항목이 없습니다.",
  emptyDescription: "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.",
} as const;
