import { useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  CircleHelp,
  Search,
  TriangleAlert,
} from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  Checkbox,
  DataTableShell,
  DatePicker,
  EmptyState,
  FilterBar,
  Gnb,
  Input,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
  Select,
  Skeleton,
  StatGrid,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
  Tooltip,
  useToast,
  type TableSortDirection,
} from "../../components/ui";
import { cn } from "../../lib/cn";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import {
  SELLER_GNB_LOGO_SLOTS,
  SELLER_GNB_SECTIONS,
} from "../sellerGnbSections";
import { CLAIM_FLOW, claimStatOf, claimTypeOf } from "./claim.data";
import {
  ACTION_COPY,
  routeGate,
  shipImageMissing,
  statusIn,
  type Gate,
} from "./gate.data";
import { GateHost, StatusTag } from "./OrderGates";
import {
  COURIERS,
  careOf,
  optionsOf,
  payMethodOf,
  payTotalOf,
  pickupOf,
  rentPrice,
  salePrice,
  tipOf,
} from "./orderUnit.data";
import {
  CARE_OPTIONS,
  LIST_COPY,
  PAGE_SIZE,
  PAGE_SIZES,
  SEARCH_PLACEHOLDER,
  SELLER_PERIOD_PRESETS,
  SHIP_WAYS,
  collectAllowed,
  emptyFilters,
  filterSummary,
  matchesFilters,
  orderCards,
  periodAlertOf,
  periodOf,
  rentStartOf,
  won,
  type ProcFilters,
  type ProcessListConfig,
  type ShipColumnKind,
} from "./processList.data";
import type { OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 처리 목록 공용 뼈대 — 판매 5 · 렌트 6 처리 화면이 설정만 바꿔 쓴다(원본도 `rentOrderTable` 한 틀).
 *
 * [ 상태 카드 | 검색조건(펼침+요약) | 목록 (총 N건) · 엑셀 / 상태변경 버튼 | 표 | 페이지 ]
 *                                       ← 원본 v0.4 층 순서(UI-283) 그대로
 *
 * 화면이 갈아끼우는 것은 `ProcessListConfig`(`processList.data.ts`) 하나 — 모집단 · 카드 · 검색 ·
 * 상태변경 버튼 · 출고/수거 송장 칸의 쓰임 · 렌트 여부. 상태 전이는 `gate.data` `routeGate` →
 * `OrderGates` `GateHost`(상세와 같은 창).
 *
 * ## 열 구성은 한 곳(`columnsOf`)에서
 * 원본 `orderColFlags` 처럼 화면 표·머리·뼈대 줄이 같은 열 목록을 본다. 판매 = 고정 5칸(체크 · No · 상태 ·
 * 주문번호 · 결제금액), 렌트 = 고정 6칸(+ 이용 기간). 렌트는 상품 수량이 없고, 대여·연체는 대여 시작일,
 * 대여·연체 / 검수·반납은 결제금액 뒤에 수거 송장 칸이 선다(출고 송장 칸과 따로).
 *
 * ## 원본을 그대로 둔 것
 * - 상태 카드는 [전체] 없이 항상 한 장(진입 = 대표 카드) · 카드 ⓘ 두 줄 · 건수는 카드 밖 조건만 반영
 * - **상태변경 버튼은 목록 머리에 상시**(사용자 결정 2026-11-04) — 고른 카드에서 갈 수 있는 것만,
 *   0건이면 「선택된 항목이 없습니다.」, 단건 전용 버튼은 2건 이상이면 잠기고 이유를 툴팁으로
 * - 정렬은 결제 일시(렌트는 이용 기간도) ↕ — 페이지를 자르기 전에
 * - 렌트 이용 기간 칸: 발주 관리 시작 3일 안 ⚠ · 대여 중 「수거 준비」·「수거 지연」
 * - 송장등록(머리·행)은 출고 이미지 없는 렌트 건이면 안내 창을 먼저 연다(상세와 같은 창)
 * - 주문번호를 누르면 그 화면의 상세. 행 클릭은 없다 — 행 안에 입력칸이 있다
 *
 * ## 본사 퍼블과 같게 둔 것(톤)
 * 검색조건 기본 펼침 · 카드나 조건을 바꾸면 선택·페이지가 풀린다 · 빈 칸 「—」 · 상태 배지 색 ·
 * 안심케어는 상품명 옆 작은 태그 · `?preview=loading|empty|refreshing`
 *
 * ## 퍼블 범위
 * 업무 버튼은 창 + 알림까지 — 목록은 바뀌지 않는다. 표 안 택배사·송장번호는 **화면 안에서만** 적힌다.
 * ====================================================================== */

type ColumnKey =
  | "check"
  | "no"
  | "status"
  | "orderNo"
  | "period"
  | "pay"
  | "rentStart"
  | "collectCourier"
  | "collectInvoice"
  | "payMethod"
  | "orderedAt"
  | "shipWay"
  | "courier"
  | "invoice"
  | "code"
  | "prod"
  | "qty"
  | "base"
  | "disc"
  | "price"
  | "opts"
  | "optCount"
  | "optTotal"
  | "mem"
  | "email"
  | "tel"
  | "receiver"
  | "receiverTel"
  | "addr"
  | "memo";

/**
 * 왼쪽 고정 칸의 `left` — 아래 `WIDTH` 의 누적합. ⚠️ 파생값이라 폭을 고치면 함께 고친다(본사 주문 목록과 같은 방식)
 * - 판매 52 / 56 / 116 / 144 / 116 → 0 · 52 · 108 · 224 · 368 (합 484)
 * - 렌트 52 / 56 / 116 / 144 / 224 / 116 → … · 368 · 592 (합 708)
 */
const FROZEN = {
  sale: {
    left: ["left-0", "left-13", "left-27", "left-56", "left-92"],
    width: 484,
  },
  rent: {
    left: ["left-0", "left-13", "left-27", "left-56", "left-92", "left-148"],
    width: 708,
  },
} as const;
const FROZEN_EDGE =
  "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-divide after:content-['']";

/** 열 폭 — 렌트 금액 칸은 「원/일」이 붙어 한 단계 넓다 · 읽기 송장 칸은 버튼이 없어 좁다 */
const WIDTH: Record<ColumnKey, string> = {
  check: "w-13",
  no: "w-14",
  status: "w-29",
  orderNo: "w-36",
  period: "w-56",
  pay: "w-29",
  rentStart: "w-32",
  collectCourier: "w-40",
  collectInvoice: "w-72",
  payMethod: "w-27",
  orderedAt: "w-39",
  shipWay: "w-27",
  courier: "w-40",
  invoice: "w-72",
  code: "w-27",
  prod: "w-60",
  qty: "w-24",
  base: "w-29",
  disc: "w-29",
  price: "w-29",
  opts: "w-52",
  optCount: "w-24",
  optTotal: "w-37",
  mem: "w-27",
  email: "w-52",
  tel: "w-37",
  receiver: "w-27",
  receiverTel: "w-37",
  addr: "w-76",
  memo: "w-52",
};
const widthOf = (key: ColumnKey, rent: boolean, ship: ShipColumnKind | null) =>
  rent && (key === "base" || key === "disc" || key === "price")
    ? "w-32"
    : ship === "ro" && key === "invoice"
      ? "w-44"
      : WIDTH[key];

/** 원본 `rentOrderTable` 머리 순서 — 화면 설정과 고른 카드가 정한다 */
function columnsOf(
  config: ProcessListConfig,
  ship: ShipColumnKind | null,
): ColumnKey[] {
  const rent = !!config.rent;
  return [
    "check",
    "no",
    "status",
    "orderNo",
    ...(rent ? (["period"] as const) : []),
    "pay",
    ...(config.rentStartColumn ? (["rentStart"] as const) : []),
    ...(config.collectColumn
      ? (["collectCourier", "collectInvoice"] as const)
      : []),
    "payMethod",
    "orderedAt",
    "shipWay",
    ...(ship ? (["courier", "invoice"] as const) : []),
    "code",
    "prod",
    ...(rent ? [] : (["qty"] as const)),
    "base",
    "disc",
    "price",
    "opts",
    "optCount",
    "optTotal",
    "mem",
    "email",
    "tel",
    "receiver",
    "receiverTel",
    "addr",
    "memo",
  ];
}

const DASH = "—";
const dash = (value: string | undefined) =>
  !value || value.trim() === "" || value === "-" ? DASH : value;

type SortKey = "orderedAt" | "period";
interface Sort {
  key: SortKey;
  dir: TableSortDirection;
}
/** ↕ 순환 — 다른 열을 누르면 오름차순부터. 두 값 모두 `YYYY.MM.DD` 로 시작해 문자열 비교가 곧 시간순 */
const nextSort = (current: Sort | null, key: SortKey): Sort | null =>
  current?.key !== key
    ? { key, dir: "asc" }
    : current.dir === "asc"
      ? { key, dir: "desc" }
      : null;
const sortValue = (u: OrderUnit, key: SortKey) =>
  key === "period" ? periodOf(u) : (u.orderedAt ?? "");

const COURIER_OPTIONS = [
  { value: "", label: "선택" },
  ...COURIERS.map((c) => ({ value: c, label: c })),
];

/** 출고 열 이름·행 버튼 — 원본 `rentOrderTable` 머리 · `invoiceCell` 버튼 갈래 */
const SHIP_COLUMN: Record<
  ShipColumnKind,
  { courier: string; invoice: string; button: string; placeholder: string }
> = {
  register: {
    courier: "택배사",
    invoice: "송장번호",
    button: "송장등록",
    placeholder: "송장번호 입력",
  },
  edit: {
    courier: "택배사",
    invoice: "송장번호",
    button: "송장수정",
    placeholder: "송장번호 입력",
  },
  cancel: {
    courier: "택배사",
    invoice: "송장번호",
    button: "송장등록",
    placeholder: "송장번호 입력",
  },
  collect: {
    courier: "수거 택배사",
    invoice: "수거 송장번호",
    button: "송장등록",
    placeholder: "수거 송장번호 입력",
  },
  ro: {
    courier: "택배사",
    invoice: "송장번호",
    button: "",
    placeholder: "송장번호 입력",
  },
};

/** 머리 도움말 — 원본 `th-help` ? */
function HeadHelp({ label, help }: { label: string; help: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Tooltip content={help}>
        <span
          tabIndex={0}
          aria-label={`${label} 도움말`}
          className="inline-flex"
        >
          <CircleHelp
            size={16}
            strokeWidth={1.2}
            aria-hidden
            className="text-icon-sub"
          />
        </span>
      </Tooltip>
    </span>
  );
}

/** 이용 기간 칸 — 원본 `periodCell` */
function PeriodCell({
  u,
  screen,
}: {
  u: OrderUnit;
  screen: ProcessListConfig["screen"];
}) {
  const text = periodOf(u);
  const alert = periodAlertOf(u, screen);
  if (!alert) return <>{dash(text)}</>;
  if (alert.kind === "due")
    return (
      <Tooltip content={alert.tip}>
        <span
          tabIndex={0}
          className="inline-flex items-center gap-1 text-text-critical"
        >
          <TriangleAlert size={16} strokeWidth={1.2} aria-hidden />
          {text}
        </span>
      </Tooltip>
    );
  return (
    <span className="flex flex-col items-start gap-1">
      {text}
      <Tooltip content={alert.tip}>
        <span tabIndex={0} className="inline-flex">
          <Tag
            tone={alert.label === "수거 지연" ? "critical" : "warning"}
            size="small"
          >
            {alert.label}
          </Tag>
        </span>
      </Tooltip>
    </span>
  );
}

interface Draft {
  courier: string;
  invoice: string;
}

export interface ProcessListProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
  config: ProcessListConfig;
}

export function ProcessList({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
  config,
}: ProcessListProps) {
  const { toast } = useToast();
  const rent = !!config.rent;
  const [card, setCard] = useState(config.defaultCard);
  const [filters, setFilters] = useState<ProcFilters>(() =>
    emptyFilters(config),
  );
  const [filterOpen, setFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<Sort | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  /** 표 안에 적은 택배사·송장번호 — 화면 안에서만 남는다(저장은 개발 영역). 출고·수거를 따로 */
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [collectDrafts, setCollectDrafts] = useState<Record<string, Draft>>({});
  const [gate, setGate] = useState<Gate | null>(null);
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const inCard =
    config.inCard ??
    ((u: OrderUnit, value: string) => statusIn(config.screen, u) === value);
  const shipKind = config.shipColumns(card);
  const columns = columnsOf(config, shipKind);
  const frozen = FROZEN[rent ? "rent" : "sale"];
  const lastFrozen = frozen.left.length - 1;
  const frozenClass = (index: number, layer: "z-2" | "z-1") =>
    index > lastFrozen
      ? undefined
      : cn(
          "sticky",
          layer,
          layer === "z-1" && "bg-inherit",
          frozen.left[index],
          index === lastFrozen && FROZEN_EDGE,
        );

  const patch = (next: Partial<ProcFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
    setSelected([]);
  };
  const resetFilters = () => {
    patch(emptyFilters(config));
    setSort(null);
  };
  /** 카드를 바꾸면 선택·정렬·페이지가 풀린다 — 열 구성과 갈 수 있는 상태가 통째로 바뀐다 */
  const pickCard = (value: string) => {
    setCard(value);
    setPage(1);
    setSelected([]);
    setSort(null);
  };

  /* 카드 건수는 카드를 **뺀** 조건으로 센다(원본 `chipDash` — 카드를 눌러도 다른 조건은 그대로) */
  const scoped = config.units.filter((u) =>
    matchesFilters(u, filters, config.searchFields),
  );
  const matched = scoped.filter((u) => inCard(u, card));
  const filtered = sort
    ? [...matched].sort((a, b) => {
        const order = sortValue(a, sort.key).localeCompare(
          sortValue(b, sort.key),
        );
        return sort.dir === "asc" ? order : -order;
      })
    : matched;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const pageIds = paged.map((u) => u.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const somePageSelected =
    pageIds.some((id) => selected.includes(id)) && !allPageSelected;
  const toggleRow = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  const togglePage = () =>
    setSelected((prev) =>
      allPageSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...prev, ...pageIds.filter((id) => !prev.includes(id))],
    );
  const selectedUnits = config.units.filter((u) => selected.includes(u.id));

  /** 출고 칸의 처음 값 — 판매 반품·교환은 이 자리가 수거 송장이다 */
  const draftOf = (u: OrderUnit): Draft =>
    drafts[u.id] ??
    (shipKind === "collect"
      ? { courier: u.retCourier ?? "", invoice: u.retInvoice ?? "" }
      : { courier: u.courier ?? "", invoice: u.invoice ?? "" });
  const setDraft = (u: OrderUnit, next: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [u.id]: { ...draftOf(u), ...next } }));
  /** 렌트 수거 칸의 처음 값 */
  const collectDraftOf = (u: OrderUnit): Draft =>
    collectDrafts[u.id] ?? {
      courier: u.retCourier ?? "",
      invoice: u.retInvoice ?? "",
    };
  const setCollectDraft = (u: OrderUnit, next: Partial<Draft>) =>
    setCollectDrafts((prev) => ({
      ...prev,
      [u.id]: { ...collectDraftOf(u), ...next },
    }));
  /** 출고 칸 편집 — 읽기 칸은 잠금 · 판매 수거 송장은 **신청 상태만**(원본 `rmaRetEditable`) */
  const editable = (u: OrderUnit) => {
    if (shipKind === "ro") return false;
    if (shipKind !== "collect") return true;
    const type = claimTypeOf(u);
    /* D-315 — 방문 수령 반품·교환은 수거 송장이 없다(상세에서 방문 반납으로 처리) */
    return !!type && claimStatOf(u) === CLAIM_FLOW[type][0] && !pickupOf(u);
  };
  const hasInvoice = (u: OrderUnit) =>
    !!draftOf(u).courier && !!draftOf(u).invoice.trim();
  const hasCollect = (u: OrderUnit) =>
    !!collectDraftOf(u).courier && !!collectDraftOf(u).invoice.trim();

  /** 창을 닫고 처리한 건을 선택에서 뺀다(원본 `gateApply`) */
  const finish = (ids: string[], message: string) => {
    setGate(null);
    setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    toast(message);
  };

  /** 배송중 전환(송장 등록) — 출고 이미지 없는 렌트 건이 있으면 안내 창이 먼저(원본 `rentShipOne`·`rentShipBulk`) */
  const ship = (units: OrderUnit[]) => {
    const ids = units.map((u) => u.id);
    if (shipImageMissing(units).length)
      return setGate({ kind: "shipRemind", ids, act: "배송중" });
    finish(ids, ACTION_COPY.shipped(units.length));
  };

  /** 행의 출고 송장 버튼 — 원본 `rentShipOne` · `rentInvoiceEdit` · `cancelToReturn` · `rmaCollectShip` */
  const rowShip = (u: OrderUnit) => {
    const d = draftOf(u);
    if (shipKind === "register") {
      if (!d.courier) return toast(ACTION_COPY.courierFirst);
      if (!d.invoice.trim()) return toast(ACTION_COPY.invoiceFirst);
      return ship([u]);
    }
    if (shipKind === "edit") {
      if (!d.invoice.trim()) return toast(ACTION_COPY.invoiceFirst);
      return toast(ACTION_COPY.invoiceEdited);
    }
    if (shipKind === "cancel") {
      if (!hasInvoice(u)) return toast(ACTION_COPY.courierAndInvoice);
      return toast(ACTION_COPY.cancelToReturn);
    }
    const type = claimTypeOf(u);
    if (!hasInvoice(u)) return toast(ACTION_COPY.collectFirst);
    if (type === "반품" || type === "교환") toast(ACTION_COPY.collected(type));
  };

  /** 행의 렌트 수거 버튼 — 원본 `rentCollectOne`(수거 신청) · `rentRetInvoiceEdit` */
  const rowCollect = (u: OrderUnit) => {
    if (config.collectColumn?.(u) === "edit") {
      if (!collectDraftOf(u).invoice.trim())
        return toast(ACTION_COPY.retInvoiceFirst);
      return toast(ACTION_COPY.retInvoiceEdited);
    }
    if (!hasCollect(u)) return toast(ACTION_COPY.collectFirst);
    if (!collectAllowed(u)) return toast(ACTION_COPY.collectTooEarly);
    toast(ACTION_COPY.collectRequested(1));
  };

  /** 머리의 상태변경 버튼 — 원본 `bulkSet` → `gateRoute` */
  const runBulk = (action: string) => {
    if (selected.length === 0) return toast(ACTION_COPY.noSelection);
    if (action === "배송중") {
      if (selectedUnits.some((u) => !hasInvoice(u)))
        return toast(ACTION_COPY.courierAndInvoice);
      return ship(selectedUnits);
    }
    const route = routeGate(action, selectedUnits, config.screen);
    if (route.kind === "toast") return toast(route.message);
    setGate(route);
  };

  /** 대여·연체 머리 [수거 신청] — 하나라도 조건을 못 맞추면 전체를 막는다(원본 `rentCollectBulk`) */
  const requestCollect = () => {
    if (selected.length === 0) return toast(ACTION_COPY.noSelection);
    if (selectedUnits.some((u) => !hasCollect(u)))
      return toast(ACTION_COPY.collectFirst);
    if (selectedUnits.some((u) => !collectAllowed(u)))
      return toast(ACTION_COPY.collectTooEarly);
    finish(selected, ACTION_COPY.collectRequested(selectedUnits.length));
  };

  /** 배송 관리 머리 [송장수정] — 송장번호가 있는 행만 반영(원본 `rentInvoiceEditBulk`) */
  const editInvoices = () => {
    if (selected.length === 0) return toast(ACTION_COPY.noSelection);
    const ok = selectedUnits.filter((u) => draftOf(u).invoice.trim()).length;
    setSelected([]);
    toast(ACTION_COPY.invoiceEditedBulk(ok, selectedUnits.length - ok));
  };

  const exportCsv = () => {
    const picked = filtered.filter((u) => selected.includes(u.id));
    const rows = picked.length > 0 ? picked : filtered;
    if (rows.length === 0) return toast(LIST_COPY.excelEmpty);
    toast(LIST_COPY.excel(rows.length, picked.length > 0));
  };

  const allowed = config.bulk.filter((a) =>
    (config.bulkBy[card] ?? []).includes(a.value),
  );
  const showActions =
    config.invoiceEditBulk || config.collectBulk || allowed.length > 0;
  const shipCopy = shipKind ? SHIP_COLUMN[shipKind] : null;

  const sortHead = (key: SortKey, label: string, index: number) => (
    <TableTh
      key={key}
      className={frozenClass(index, "z-2")}
      sortable
      sortDirection={sort?.key === key ? sort.dir : undefined}
      onSort={() => {
        setSort(nextSort(sort, key));
        setPage(1);
      }}
    >
      {label}
    </TableTh>
  );

  const head = (key: ColumnKey, index: number): ReactNode => {
    const th = (children: ReactNode, align?: "center") => (
      <TableTh key={key} align={align} className={frozenClass(index, "z-2")}>
        {children}
      </TableTh>
    );
    switch (key) {
      case "check":
        return th(
          <Checkbox
            size="small"
            aria-label="이 페이지 전체 선택"
            checked={allPageSelected}
            indeterminate={somePageSelected}
            onChange={togglePage}
          />,
        );
      case "no":
        return th("No");
      case "status":
        return th(
          config.statusHelp ? (
            <HeadHelp label="상태" help={config.statusHelp} />
          ) : (
            "상태"
          ),
          "center",
        );
      case "orderNo":
        return th("주문번호");
      case "period":
        return sortHead("period", "이용 기간", index);
      case "pay":
        return th("결제금액");
      case "rentStart":
        return th(
          <HeadHelp
            label="대여 시작일"
            help="배송 완료 처리 시점 = 대여 시작일 (렌트는 배송 완료가 곧 대여 시작)"
          />,
        );
      case "collectCourier":
        return th("수거 택배사");
      case "collectInvoice":
        return th("수거 송장번호");
      case "payMethod":
        return th("결제수단");
      case "orderedAt":
        return sortHead("orderedAt", "결제 일시", index);
      case "shipWay":
        return th("배송 방법");
      case "courier":
        return th(shipCopy?.courier);
      case "invoice":
        return th(shipCopy?.invoice);
      case "code":
        return th("상품코드");
      case "prod":
        return th("상품명");
      case "qty":
        return th("상품 수량");
      case "base":
        return th(rent ? "렌트 원가" : "판매 원가");
      case "disc":
        return th("할인 금액");
      case "price":
        return th(rent ? "렌트가" : "판매가");
      case "opts":
        return th("옵션");
      case "optCount":
        return th("옵션 수량");
      case "optTotal":
        return th("옵션 총액 (정액 1회)");
      case "mem":
        return th("구매자명");
      case "email":
        return th("구매자 ID");
      case "tel":
        return th("연락처");
      case "receiver":
        return th("수령인");
      case "receiverTel":
        return th("수령인 연락처");
      case "addr":
        return th("배송지");
      case "memo":
        return th("배송 메모");
    }
  };

  /** 렌트 금액 칸은 일 단가(원/일 · 본사와 같다) */
  const money = (n: number) => (rent ? `${won(n)}/일` : won(n));

  const cell = (
    key: ColumnKey,
    index: number,
    u: OrderUnit,
    rowIndex: number,
  ): ReactNode => {
    const td = (
      children: ReactNode,
      extra: { className?: string; align?: "center"; ellipsis?: boolean } = {},
    ) => (
      <TableTd
        key={key}
        align={extra.align}
        ellipsis={extra.ellipsis}
        className={cn(extra.className, frozenClass(index, "z-1"))}
      >
        {children}
      </TableTd>
    );
    const options = optionsOf(u);
    switch (key) {
      case "check":
        return td(
          <Checkbox
            size="small"
            aria-label={`${u.no} ${u.prod} 선택`}
            checked={selected.includes(u.id)}
            onChange={() => toggleRow(u.id)}
          />,
        );
      case "no":
        return td(filtered.length - (start + rowIndex), {
          className: "tabular-nums",
        });
      case "status":
        return td(<StatusTag status={statusIn(config.screen, u)} />, {
          align: "center",
        });
      case "orderNo":
        return td(
          <TextButton onClick={() => onNavSelect(config.detailPath(u))}>
            {u.no}
          </TextButton>,
        );
      case "period":
        return td(<PeriodCell u={u} screen={config.screen} />);
      case "pay":
        return td(won(payTotalOf(u)), { className: "label-medium-bold" });
      case "rentStart":
        return td(dash(rentStartOf(u)));
      case "collectCourier":
      case "collectInvoice": {
        const kind = config.collectColumn?.(u) ?? null;
        const d = collectDraftOf(u);
        if (key === "collectCourier")
          return td(
            <Select
              size="small"
              aria-label={`${u.no} 수거 택배사`}
              options={COURIER_OPTIONS}
              value={d.courier}
              disabled={!kind}
              onValueChange={(courier) => setCollectDraft(u, { courier })}
            />,
          );
        return td(
          <span className="flex items-center gap-2">
            <Input
              size="small"
              inputMode="numeric"
              aria-label={`${u.no} 수거 송장번호`}
              placeholder="송장번호 입력"
              value={d.invoice}
              disabled={!kind}
              onChange={(event) =>
                setCollectDraft(u, { invoice: event.target.value })
              }
            />
            {kind && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => rowCollect(u)}
              >
                {kind === "register" ? "송장등록" : "송장수정"}
              </Button>
            )}
          </span>,
        );
      }
      case "payMethod":
        return td(dash(payMethodOf(u)));
      case "orderedAt":
        return td(dash(u.orderedAt));
      case "shipWay":
        return td(dash(u.shipWay));
      case "courier":
      case "invoice": {
        const d = draftOf(u);
        const canEdit = editable(u);
        if (key === "courier")
          return td(
            <Select
              size="small"
              aria-label={`${u.no} ${shipCopy?.courier}`}
              options={COURIER_OPTIONS}
              value={d.courier}
              disabled={!canEdit}
              onValueChange={(courier) => setDraft(u, { courier })}
            />,
          );
        return td(
          <span className="flex items-center gap-2">
            <Input
              size="small"
              inputMode="numeric"
              aria-label={`${u.no} ${shipCopy?.invoice}`}
              placeholder={shipCopy?.placeholder}
              value={d.invoice}
              disabled={!canEdit}
              onChange={(event) => setDraft(u, { invoice: event.target.value })}
            />
            {shipCopy?.button && (
              <Button
                variant="secondary"
                size="small"
                disabled={!canEdit}
                onClick={() => rowShip(u)}
              >
                {shipCopy.button}
              </Button>
            )}
          </span>,
        );
      }
      case "code":
        return td(dash(u.code));
      case "prod":
        return td(
          careOf(u) ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{u.prod}</span>
              <Tag size="small" className="shrink-0">
                안심케어
              </Tag>
            </span>
          ) : (
            u.prod
          ),
          { ellipsis: !careOf(u) },
        );
      case "qty":
        return td(`${u.qty || 1}개`);
      case "base":
        return td(money((rent ? u.rent : u.sale) ?? 0));
      case "disc":
        return td(money((rent ? u.rentDisc : u.saleDisc) ?? 0));
      case "price":
        return td(money(rent ? rentPrice(u) : salePrice(u)), {
          className: "label-medium-bold",
        });
      case "opts":
        return td(
          options.length ? options.map((o) => o.name).join(", ") : DASH,
          { ellipsis: true },
        );
      case "optCount":
        return td(options.length ? `${options.length}개` : DASH);
      case "optTotal": {
        /* 원본 「정액 1회」 — 추가금 합계 그대로(렌트 명세는 일가 × 렌트일이다 · 기획 확인) */
        const total = options.reduce((a, o) => a + (Number(o.add) || 0), 0);
        return td(total > 0 ? won(total) : DASH);
      }
      case "mem":
        return td(u.mem);
      case "email":
        return td(dash(u.email), { ellipsis: true });
      case "tel":
        return td(dash(u.tel));
      case "receiver":
        return td(dash(u.receiver));
      case "receiverTel":
        return td(dash(u.receiverTel));
      case "addr":
        return td(dash(u.addr), { ellipsis: true });
      case "memo":
        return td(dash(u.shipMemo), { ellipsis: true });
    }
  };

  return (
    <AppShell
      sidebar={
        <Gnb
          sections={SELLER_GNB_SECTIONS}
          activeId={activeNav}
          onSelect={onNavSelect}
          open={navOpen}
          onOpenChange={onNavOpenChange}
          logo={SELLER_GNB_LOGO_SLOTS.logo}
          collapsedLogo={SELLER_GNB_LOGO_SLOTS.collapsed}
        />
      }
      header={<PageHeader title={config.title} />}
    >
      {/* 상태 카드 — 원본 한 줄 4칸 격자 */}
      <Card>
        <CardBody>
          <StatGrid
            items={orderCards(config.cards, config.defaultCard).map((value) => {
              const tip = tipOf(value, rent);
              return {
                value,
                label: value,
                count: String(scoped.filter((u) => inCard(u, value)).length),
                unit: "건",
                tip: tip ? (
                  <span className="flex flex-col gap-2">
                    <span>{tip.d}</span>
                    <span>{tip.n}</span>
                  </span>
                ) : undefined,
              };
            })}
            selected={card}
            onSelect={pickCard}
            ariaLabel="처리 상태별 건수"
            columns={4}
          />
        </CardBody>
      </Card>

      {/* 검색조건 — 원본 순서: 기간 → 배송 방법(판매) / 안심케어(렌트) → 검색 */}
      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary(filters, config.dateFields)}
        onReset={resetFilters}
      >
        <Select
          className="w-32"
          aria-label="기간 기준"
          options={[...config.dateFields]}
          value={filters.dateField}
          onValueChange={(value) => patch({ dateField: value })}
        />
        <DatePicker
          mode="range"
          aria-label="기간"
          presets={SELLER_PERIOD_PRESETS}
          value={filters.period}
          onChange={(next) => patch({ period: next })}
          startPlaceholder="시작일"
          endPlaceholder="종료일"
        />
        {rent ? (
          <Select
            className="w-32"
            aria-label="안심케어"
            options={[...CARE_OPTIONS]}
            value={filters.care}
            onValueChange={(value) => patch({ care: value })}
          />
        ) : (
          <Select
            className="w-32"
            aria-label="배송 방법"
            options={[...SHIP_WAYS]}
            value={filters.shipWay}
            onValueChange={(value) => patch({ shipWay: value })}
          />
        )}
        <Select
          className="w-36"
          aria-label="검색 대상"
          options={[...config.searchFields]}
          value={filters.searchField}
          onValueChange={(value) => patch({ searchField: value })}
        />
        <Input
          aria-label="검색어"
          placeholder={SEARCH_PLACEHOLDER}
          value={filters.keyword}
          onChange={(event) => patch({ keyword: event.target.value })}
          leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        />
      </FilterBar>

      <DataTableShell
        scrollLeadWidth={frozen.width}
        variant="soft"
        bodyClassName={dimWhile(dataStatus)}
        aria-busy={isBusy(dataStatus)}
        toolbar={
          <>
            <h2 className="heading-medium-bold text-text">
              목록 (총 {filtered.length}건)
            </h2>
            <Button variant="secondary" onClick={exportCsv}>
              <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
              엑셀 다운로드
            </Button>
            {/* 둘째 줄 — 원본 `listHead` 좌측: [송장수정](배송) · [수거 신청](대여·연체) + 갈 수 있는 상태변경 */}
            {showActions && (
              <div className="flex w-full flex-wrap items-center gap-2">
                {config.invoiceEditBulk && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={editInvoices}
                  >
                    송장수정
                  </Button>
                )}
                {config.collectBulk && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={requestCollect}
                  >
                    수거 신청
                  </Button>
                )}
                {allowed.length > 0 && (
                  <div
                    role="group"
                    aria-label="상태 변경"
                    className="flex flex-wrap items-center gap-2"
                  >
                    {allowed.map((action) =>
                      config.singleOnly?.includes(action.value) &&
                      selected.length > 1 ? (
                        /* 잠긴 버튼은 자기 툴팁을 못 띄워 감싼다(원본과 같은 방식) */
                        <Tooltip
                          key={action.value}
                          content={ACTION_COPY.singleOnly}
                        >
                          <span tabIndex={0} className="inline-flex">
                            <Button variant="secondary" size="small" disabled>
                              {action.label}
                            </Button>
                          </span>
                        </Tooltip>
                      ) : (
                        <Button
                          key={action.value}
                          variant="secondary"
                          size="small"
                          onClick={() => runBulk(action.value)}
                        >
                          {action.label}
                        </Button>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        }
        isEmpty={dataStatus === "empty" || filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            sticky
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title={LIST_COPY.emptyTitle}
            description={LIST_COPY.emptyDescription}
          >
            <Button variant="secondary" onClick={resetFilters}>
              필터 초기화
            </Button>
          </EmptyState>
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            end={
              <PaginationSizeSelect
                sizes={PAGE_SIZES}
                value={pageSize}
                onSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            }
          />
        }
      >
        <Table>
          {/* 앞 고정 칸은 `FROZEN` 오프셋과 짝 */}
          <colgroup>
            {columns.map((key) => (
              <col key={key} className={widthOf(key, rent, shipKind)} />
            ))}
          </colgroup>
          <TableHead>
            <TableRow>{columns.map((key, index) => head(key, index))}</TableRow>
          </TableHead>
          <TableBody>
            {dataStatus === "loading"
              ? Array.from({ length: pageSize }, (_, row) => (
                  <TableRow key={`skeleton-${row}`}>
                    {columns.map((key, index) => (
                      <TableTd key={key} className={frozenClass(index, "z-1")}>
                        <span className="body-small block">
                          <Skeleton />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : paged.map((u, rowIndex) => (
                  <TableRow key={u.id}>
                    {columns.map((key, index) => cell(key, index, u, rowIndex))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <GateHost
        gate={gate}
        units={config.units}
        onClose={() => setGate(null)}
        onDone={(message) => gate && finish(gate.ids, message)}
        onShipImage={(u) =>
          onNavSelect(`${config.detailPath(u)}?section=shipimg`)
        }
      />
    </AppShell>
  );
}
