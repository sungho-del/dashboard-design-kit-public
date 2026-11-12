import type { DateRange } from "../../components/ui";
import { periodPresetsFrom } from "../../lib/periodPresets";
import type { ProcessScreen } from "./gate.data";
import { STATUS_TIPS, careOf } from "./orderUnit.labels";
import type { OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 처리 목록 공용 **도메인 계약** — 판매 처리 화면 5개(발주·배송·취소·반품·교환)가 이 꼴로 설정을 준다.
 * 뼈대는 `ProcessList.tsx`, 화면별 설정은 각 `*Page.data.ts`.
 *
 * 원본 = 기획 v0.4 `rentOrderTable(scr)`(4110) + `listPage`(3229) + `chipDash`(3217) + `statDash`(3195) +
 * `FILTERS[scr]`(2343) — 원본도 처리 목록 11개가 **한 틀을 화면 설정으로** 쓴다.
 *
 * | 설정              | 원본                                          |
 * | ----------------- | --------------------------------------------- |
 * | `units`           | `SCREENS.<scr>` 의 base                        |
 * | `cards`·`defaultCard`·`inCard` | `FILTERS.<scr>.chip`(값·`def`·`match`) · 취소는 `rmaStatDash` |
 * | `dateFields`·`searchFields` | `FILTERS.<scr>.date.fields` · `search.fieldOpts` |
 * | `bulk`·`bulkBy`·`singleOnly` | `list.bulk.options`·`by`·`single`  |
 * | `invoiceEditBulk` | `list.actionsBefore`(배송 관리 [송장수정])      |
 * | `shipColumns`     | `orderColFlags` `shipCols`·`isSaleRet` + `invoiceCell` 버튼 갈래 |
 * ====================================================================== */

/**
 * 택배사·송장 열의 쓰임 — 원본 `invoiceCell`·`rmaRetCourier` 갈래
 * - `register` 출고 송장 + [송장등록](발주) · `edit` 출고 송장 + [송장수정](배송)
 * - `cancel` 출고 송장 + [송장등록] → 반품 전환(취소) · `collect` 수거 송장(신청 상태만 편집) + [송장등록](반품·교환)
 * - `ro` 출고 송장 읽기(렌트 대여·연체 · 검수·반납 · 취소 · 반품). 원본 렌트 취소·반품은 칸이 열려 있는데
 *   반영 버튼이 없다 → 잠금(기획 확인)
 */
export type ShipColumnKind = "register" | "edit" | "cancel" | "collect" | "ro";

/**
 * 렌트 **수거** 송장 칸 — 출고 칸과 따로 선다(원본 `isCollect` · 결제금액 뒤).
 * `register` [송장등록] = 수거 신청(대여·연체) · `edit` [송장수정](검수·반납 수거 신청 건) · `null` 잠김
 */
export type CollectColumnKind = "register" | "edit";

export interface Option {
  value: string;
  label: string;
}

export interface OverbookedProduct {
  name: string;
  reservations: number;
  active: number;
}

export interface ProcessListConfig {
  screen: ProcessScreen;
  /** 원본 탑바 h1 */
  title: string;
  /** 모집단 — 원본 `SCREENS.<scr>` base */
  units: OrderUnit[];
  /** 카드 값 — 원본 선언 순서. 화면에서는 변수 상태 → 정상 흐름, 대표 카드가 맨 앞 */
  cards: readonly string[];
  defaultCard: string;
  /** 카드 소속 — 없으면 「이 화면의 상태 = 카드 값」 */
  inCard?: (u: OrderUnit, card: string) => boolean;
  dateFields: readonly Option[];
  /** 검색 대상 — 첫 칸이 기본. `all` 은 나머지 필드를 모두 훑는다 */
  searchFields: readonly Option[];
  bulk: readonly Option[];
  bulkBy: Record<string, readonly string[]>;
  /** 단건 전용 — 2건 이상 고르면 잠근다 */
  singleOnly?: readonly string[];
  /** 머리 상태변경 버튼 앞 [송장수정](일괄) */
  invoiceEditBulk?: boolean;
  /** 그 카드의 택배사·송장 열 — `null` 이면 열이 없다 */
  shipColumns: (card: string) => ShipColumnKind | null;
  /**
   * 행 송장 칸 대신 상세로 가는 버튼 글자 — 값이 있으면 그 행의 택배사·송장 칸을 잠그고 버튼이 상세로 간다
   * (develop `preDispatchShipmentDetailAction` · 취소 [상세 처리] · 개발 요청 2026-11-12 15·19·27번)
   */
  rowLink?: (u: OrderUnit) => string | null;
  /** 목록 위 「초과 상태」 줄 — 진행 중 예약이 활성 수량보다 많은 상품(렌트 발주 · 개발 요청 27번). 비면 그리지 않는다 */
  overbooked?: readonly OverbookedProduct[];
  detailPath: (u: OrderUnit) => string;
  /** 렌트 처리 화면 — 이용 기간 열(고정 · 정렬) · 렌트 금액 열 · 상품 수량 없음 · 검색조건 안심케어(원본 `orderColFlags`) */
  rent?: boolean;
  /** 렌트 수거 열 — 행마다 칸 쓰임. 함수가 없으면 열이 없다 */
  collectColumn?: (u: OrderUnit) => CollectColumnKind | null;
  /** 대여 시작일 열(대여·연체) */
  rentStartColumn?: boolean;
  /** 머리 [수거 신청](대여·연체 — 상태 버튼 대신) */
  collectBulk?: boolean;
  /** 상태 열 머리 도움말(렌트 배송 관리) */
  statusHelp?: string;
}

/**
 * 발주 단계 행 버튼 — develop `preDispatchShipmentDetailAction` 그대로(판매·렌트 같다).
 * 신규 주문 = [주문 확인](「전체」 보기에서만 송장 열이 보인다) · 방문 수령 + 배송 준비·지연 = [준비 완료] · 그 밖(택배 송장등록)은 없음
 */
export function preDispatchLink(u: OrderUnit): string | null {
  if (u.stat === "신규 주문") return "주문 확인";
  if (
    u.shipWay === "방문 수령" &&
    ["배송 준비", "배송 지연"].includes(u.stat ?? "")
  )
    return "준비 완료";
  return null;
}

/** 원본 데모 기준일 `FB_TODAY` — 빠른 기간(오늘·1주일…)이 여기서 센다 */
export const DEMO_TODAY = "2026-06-29";
export const SELLER_PERIOD_PRESETS = periodPresetsFrom(
  () => new Date(`${DEMO_TODAY}T00:00:00`),
);

/**
 * 원본 `statDash` 순서 — **변수 상태(정상 흐름에서 벗어난 것)가 앞**, 그리고 대표 카드는 언제나 맨 앞
 * (누를 때마다 카드가 자리를 바꾸지 않게 · UI-294)
 */
export function orderCards(cards: readonly string[], def: string) {
  const variant = cards.filter((c) => STATUS_TIPS[c]?.variant);
  const ord = [...variant, ...cards.filter((c) => !STATUS_TIPS[c]?.variant)];
  return [def, ...ord.filter((c) => c !== def)];
}

/**
 * 배송 방법 — 원본은 다중 칩(전체 · 택배 · 방문 수령). 값이 둘뿐이라 다중 선택이 만드는 경우가
 * 전체 / 택배 / 방문 수령 셋과 같아 **하나만 고르는 칸**으로 둔다(결과 같음)
 */
export const SHIP_WAYS = [
  /* 「전체」만 두면 옆 검색 대상 「전체」와 같은 글자가 나란히 선다 — 본사 「판매자 전체」와 같은 꼴 */
  { value: "all", label: "배송 방법 전체" },
  { value: "택배", label: "택배" },
  { value: "방문 수령", label: "방문 수령" },
] as const;
/** 안심케어 — 원본 렌트 칩(전체 · 가입 · 미가입). 배송 방법과 같은 이유로 하나만 고르는 칸 */
export const CARE_OPTIONS = [
  { value: "all", label: "안심케어 전체" },
  { value: "가입", label: "가입" },
  { value: "미가입", label: "미가입" },
] as const;
export const careLabelOf = (u: OrderUnit) => (careOf(u) ? "가입" : "미가입");

export const SEARCH_PLACEHOLDER = "검색어 입력";

export interface ProcFilters {
  dateField: string;
  period?: DateRange;
  shipWay: string;
  care: string;
  searchField: string;
  keyword: string;
}
export const emptyFilters = (config: ProcessListConfig): ProcFilters => ({
  dateField: config.dateFields[0].value,
  period: undefined,
  shipWay: "all",
  care: "all",
  searchField: config.searchFields[0].value,
  keyword: "",
});

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** 「2026.06.23 09:15」 → 「2026-06-23」 (원본 `_normDate` — 날짜만 비교) */
const dayOf = (text: unknown) =>
  typeof text === "string" && text ? text.slice(0, 10).replace(/\./g, "-") : "";

/** 원본 `applyFilters` — 배송 방법 → 기간 → 검색(대소문자 무시 · 부분 일치) */
export function matchesFilters(
  u: OrderUnit,
  f: ProcFilters,
  searchFields: readonly Option[],
) {
  if (f.shipWay !== "all" && u.shipWay !== f.shipWay) return false;
  if (f.care !== "all" && careLabelOf(u) !== f.care) return false;
  if (f.period?.from) {
    const day = dayOf(u[f.dateField as keyof OrderUnit]);
    if (!day) return false;
    if (day < ymd(f.period.from)) return false;
    if (day > ymd(f.period.to ?? f.period.from)) return false;
  }
  const q = f.keyword.trim().toLowerCase();
  if (q) {
    const fields =
      f.searchField === "all"
        ? searchFields.map((o) => o.value).filter((v) => v !== "all")
        : [f.searchField];
    if (
      !fields.some((k) =>
        String(u[k as keyof OrderUnit] ?? "")
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
export function filterSummary(f: ProcFilters, dateFields: readonly Option[]) {
  const out: string[] = [];
  const dateLabel = dateFields.find((d) => d.value === f.dateField)?.label;
  if (f.period?.from)
    out.push(
      `${dateLabel} ${dot(f.period.from)}~${dot(f.period.to ?? f.period.from)}`,
    );
  if (f.shipWay !== "all") out.push(`배송 방법 ${f.shipWay}`);
  if (f.care !== "all") out.push(`안심케어 ${f.care}`);
  if (f.keyword.trim()) out.push(`검색어 "${f.keyword.trim()}"`);
  return out.length ? out.join(" · ") : "조건 없음 (전체)";
}

/* -------------------------------------------------------------------------
 * 렌트 이용 기간 — 원본 `periodCell` · `rentStartCell` · `rentCollectAllowed`(기준일 2026-06-29)
 * ---------------------------------------------------------------------- */

/** 이용 기간 — 출고 전 「예정 」 머리를 뗀다(원본 표기 · 정렬도 이 값) */
export const periodOf = (u: OrderUnit) =>
  (u.period || "-").replace(/^예정\s*/, "");
const dateIn = (text: string) => text.match(/(\d{4})\.(\d{2})\.(\d{2})/);
/** 기준일부터 그 날짜까지 며칠(지났으면 음수) */
const daysFromToday = (m: RegExpMatchArray) =>
  Math.round(
    (Date.UTC(+m[1], +m[2] - 1, +m[3]) -
      Date.parse(`${DEMO_TODAY}T00:00:00Z`)) /
      86400000,
  );
const periodEnd = (u: OrderUnit) => periodOf(u).split("~")[1] ?? "";

/** 대여 시작일 — 렌트는 배송 완료 = 대여 시작이라 이용 기간 시작일(원본 `rentStartCell`) */
export const rentStartOf = (u: OrderUnit) =>
  periodOf(u).split("~")[0]?.trim() || "-";

export type PeriodAlert =
  | { kind: "due"; tip: string }
  | { kind: "badge"; label: "수거 지연" | "수거 준비"; tip: string };

const IN_USE = ["대여중", "대여중(연장)", "연체중"];

/**
 * 이용 기간 칸 경고 — 발주 관리에서 시작 3일 안이면 빨간 글씨 + ⚠(송장 미등록 경고) ·
 * 대여 중이면 종료일 기준 지남 = 「수거 지연」, 3일 안 = 「수거 준비」(F-3 · H-9)
 */
export function periodAlertOf(
  u: OrderUnit,
  screen: ProcessListConfig["screen"],
): PeriodAlert | null {
  if (screen === "rentList") {
    const m = dateIn(periodOf(u));
    if (m && daysFromToday(m) <= 3)
      return {
        kind: "due",
        tip: "곧 이용기간이 다가옵니다. 배송 지연으로 상태를 변경하거나 송장을 등록해주세요",
      };
  }
  if (IN_USE.includes(u.stat ?? "")) {
    const m = dateIn(periodEnd(u));
    if (m) {
      const days = daysFromToday(m);
      if (days < 0)
        return {
          kind: "badge",
          label: "수거 지연",
          tip: "반납일이 지났지만 수거 신청이 되지 않았습니다. 수거 송장을 등록해 수거 신청을 진행해주세요",
        };
      if (days <= 3)
        return {
          kind: "badge",
          label: "수거 준비",
          tip: `대여기간 종료 ${days}일 전 — 수거 준비가 필요합니다. 수거 송장을 등록해 수거 신청을 진행해주세요`,
        };
    }
  }
  return null;
}

/**
 * 수거 신청 가능 — **이용 종료일 당일부터**(종료 전 등록은 고객의 연장 창을 닫는다 · 원본 `rentCollectAllowed`).
 * 조기 반납 접수 건은 예외(원본은 클레임·처리상태 글자로 근사)
 */
export function collectAllowed(u: OrderUnit) {
  if (/조기\s?반납/.test(String(u.claim || u.flow || ""))) return true;
  const end = periodEnd(u).trim().replace(/\./g, "-");
  return !end || end <= DEMO_TODAY;
}

export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 목록 문구 — 원본 글자 그대로 */
/** 렌트 발주 관리 상단 「초과 상태」 줄 — develop `RentListNotice` 문구 그대로(상품명은 굵게 앞에) */
export const OVERBOOKED_COPY = {
  badge: "초과 상태 — 신규 예약 차단 중",
  line: (reservations: number, active: number) =>
    `(예약 ${reservations}건 > 활성 ${active}개) — 기존 예약은 보호되며 신규 예약만 차단됩니다(수량 풀 ㉡).`,
} as const;

export const LIST_COPY = {
  /** 엑셀 — 원본 `exportCsv`: 고른 행이 있으면 그것만, 없으면 조회 결과 전체(퍼블은 알림만) */
  excelEmpty: "다운로드할 데이터가 없습니다.",
  excel: (n: number, picked: boolean) =>
    `${n}건을 엑셀(CSV)로 다운로드했습니다.${picked ? " (선택분)" : ""}`,
  /** 빈 표 — 원본 `tableEmpty` */
  emptyTitle: "해당 조건의 항목이 없습니다.",
  emptyDescription: "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.",
} as const;
