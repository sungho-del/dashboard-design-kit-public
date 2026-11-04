import { useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
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
import { ACTION_COPY, routeGate, statusIn, type Gate } from "./gate.data";
import { GateHost, StatusTag } from "./OrderGates";
import {
  COURIERS,
  optionsOf,
  pickupOf,
  salePayTotal,
  salePrice,
  tipOf,
} from "./orderUnit.data";
import {
  LIST_COPY,
  PAGE_SIZE,
  PAGE_SIZES,
  SEARCH_PLACEHOLDER,
  SELLER_PERIOD_PRESETS,
  SHIP_WAYS,
  emptyFilters,
  filterSummary,
  matchesFilters,
  orderCards,
  won,
  type ProcFilters,
  type ProcessListConfig,
  type ShipColumnKind,
} from "./processList.data";
import type { OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 처리 목록 공용 뼈대 — 판매 처리 화면 5개(발주·배송·취소·반품·교환)가 설정만 바꿔 쓴다.
 *
 * [ 상태 카드 | 검색조건(펼침+요약) | 목록 (총 N건) · 엑셀 / 상태변경 버튼 | 표 | 페이지 ]
 *                                       ← 원본 v0.4 층 순서(UI-283) 그대로
 *
 * 화면이 갈아끼우는 것은 `ProcessListConfig`(`processList.data.ts`) 하나 — 모집단 · 카드 · 검색 ·
 * 상태변경 버튼 · 택배사/송장 열의 쓰임. 상태 전이는 `gate.data` `routeGate` → `OrderGates` `GateHost`
 * (상세와 같은 창).
 *
 * ## 원본을 그대로 둔 것
 * - 상태 카드는 [전체] 없이 항상 한 장(진입 = 대표 카드) · 카드 ⓘ 두 줄 · 건수는 카드 밖 조건만 반영
 * - **상태변경 버튼은 목록 머리에 상시**(사용자 결정 2026-11-04) — 고른 카드에서 갈 수 있는 것만,
 *   0건이면 「선택된 항목이 없습니다.」, 단건 전용 버튼은 2건 이상이면 잠기고 이유를 툴팁으로
 * - 왼쪽 고정 5칸(체크·No·상태·주문번호·결제금액 · 원본 `frozenTable(4+1)`)
 * - 택배사·송장 열은 화면·카드가 정한다(발주의 신규 주문엔 없다 · 반품·교환은 수거 송장)
 * - 주문번호를 누르면 그 화면의 상세. 행 클릭은 없다 — 행 안에 입력칸이 있다
 *
 * ## 본사 퍼블과 같게 둔 것(톤)
 * 검색조건 기본 펼침 · 카드나 조건을 바꾸면 선택·페이지가 풀린다 · 빈 칸 「—」 · 상태 배지 색 ·
 * `?preview=loading|empty|refreshing`
 *
 * ## 퍼블 범위
 * 업무 버튼은 창 + 알림까지 — 목록은 바뀌지 않는다. 표 안 택배사·송장번호는 **화면 안에서만** 적힌다.
 * ====================================================================== */

/**
 * 왼쪽 고정 5칸의 `left` — `<colgroup>` 폭의 누적합. 52 / 56 / 116 / 144 / 116 → 0 · 52 · 108 · 224 · 368 (합 484)
 * ⚠️ 파생값이라 `<colgroup>` 을 고치면 함께 고친다(본사 주문 목록과 같은 방식).
 */
const FROZEN_LEFT = ["left-0", "left-13", "left-27", "left-56", "left-92"];
const LAST_FROZEN = FROZEN_LEFT.length - 1;
const FROZEN_LEAD_WIDTH = 484;
const FROZEN_EDGE =
  "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-divide after:content-['']";
const frozenTh = (index: number) =>
  index > LAST_FROZEN
    ? undefined
    : cn(
        "sticky z-2",
        FROZEN_LEFT[index],
        index === LAST_FROZEN && FROZEN_EDGE,
      );
const frozenTd = (index: number) =>
  index > LAST_FROZEN
    ? undefined
    : cn(
        "sticky z-1 bg-inherit",
        FROZEN_LEFT[index],
        index === LAST_FROZEN && FROZEN_EDGE,
      );

const DASH = "—";
const dash = (value: string | undefined) =>
  !value || value.trim() === "" || value === "-" ? DASH : value;

/** 결제 일시 ↕ 하나뿐(원본) — `YYYY.MM.DD HH:MM` 이라 문자열 비교가 곧 시간순 */
const nextSort = (current: TableSortDirection | null) =>
  current === null ? "asc" : current === "asc" ? "desc" : null;

const COURIER_OPTIONS = [
  { value: "", label: "선택" },
  ...COURIERS.map((c) => ({ value: c, label: c })),
];

/** 열 이름·행 버튼 — 원본 `rentOrderTable` 머리 · `invoiceCell` 버튼 갈래 */
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
};

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
  const [card, setCard] = useState(config.defaultCard);
  const [filters, setFilters] = useState<ProcFilters>(() =>
    emptyFilters(config),
  );
  const [filterOpen, setFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<TableSortDirection | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  /** 표 안에 적은 택배사·송장번호 — 화면 안에서만 남는다(저장은 개발 영역) */
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [gate, setGate] = useState<Gate | null>(null);
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const inCard =
    config.inCard ??
    ((u: OrderUnit, value: string) => statusIn(config.screen, u) === value);
  const shipKind = config.shipColumns(card);

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
        const order = (a.orderedAt ?? "").localeCompare(b.orderedAt ?? "");
        return sort === "asc" ? order : -order;
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

  /** 송장 칸의 처음 값 — 수거 열은 수거 택배사·송장, 나머지는 출고 */
  const draftOf = (u: OrderUnit): Draft =>
    drafts[u.id] ??
    (shipKind === "collect"
      ? { courier: u.retCourier ?? "", invoice: u.retInvoice ?? "" }
      : { courier: u.courier ?? "", invoice: u.invoice ?? "" });
  const setDraft = (u: OrderUnit, next: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [u.id]: { ...draftOf(u), ...next } }));
  /** 수거 송장은 **신청 상태만** 고칠 수 있다(원본 `rmaRetEditable`) */
  const editable = (u: OrderUnit) => {
    if (shipKind !== "collect") return true;
    const type = claimTypeOf(u);
    /* D-315 — 방문 수령 반품·교환은 수거 송장이 없다(상세에서 방문 반납으로 처리) */
    return !!type && claimStatOf(u) === CLAIM_FLOW[type][0] && !pickupOf(u);
  };

  /** 창을 닫고 처리한 건을 선택에서 뺀다(원본 `gateApply`) */
  const finish = (ids: string[], message: string) => {
    setGate(null);
    setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    toast(message);
  };

  /** 행의 송장 버튼 — 원본 `rentShipOne` · `rentInvoiceEdit` · `cancelToReturn` · `rmaCollectShip` */
  const rowShip = (u: OrderUnit) => {
    const d = draftOf(u);
    if (shipKind === "register") {
      if (!d.courier) return toast(ACTION_COPY.courierFirst);
      if (!d.invoice.trim()) return toast(ACTION_COPY.invoiceFirst);
      return toast(ACTION_COPY.shipped(1));
    }
    if (shipKind === "edit") {
      if (!d.invoice.trim()) return toast(ACTION_COPY.invoiceFirst);
      return toast(ACTION_COPY.invoiceEdited);
    }
    if (shipKind === "cancel") {
      if (!d.courier || !d.invoice.trim())
        return toast(ACTION_COPY.courierAndInvoice);
      return toast(ACTION_COPY.cancelToReturn);
    }
    const type = claimTypeOf(u);
    if (!d.courier || !d.invoice.trim()) return toast(ACTION_COPY.collectFirst);
    if (type === "반품" || type === "교환") toast(ACTION_COPY.collected(type));
  };

  /** 머리의 상태변경 버튼 — 원본 `bulkSet` → `gateRoute` */
  const runBulk = (action: string) => {
    if (selected.length === 0) return toast(ACTION_COPY.noSelection);
    if (action === "배송중") {
      if (
        selectedUnits.some(
          (u) => !draftOf(u).courier || !draftOf(u).invoice.trim(),
        )
      )
        return toast(ACTION_COPY.courierAndInvoice);
      return finish(selected, ACTION_COPY.shipped(selectedUnits.length));
    }
    const route = routeGate(action, selectedUnits, config.screen);
    if (route.kind === "toast") return toast(route.message);
    setGate(route);
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

  const columnCount = shipKind ? 26 : 24;
  const allowed = config.bulk.filter((a) =>
    (config.bulkBy[card] ?? []).includes(a.value),
  );
  const showActions = config.invoiceEditBulk || allowed.length > 0;
  const shipCopy = shipKind ? SHIP_COLUMN[shipKind] : null;

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
              const tip = tipOf(value, false);
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

      {/* 검색조건 — 원본 순서: 기간 → 배송 방법 → 검색 */}
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
        <Select
          className="w-32"
          aria-label="배송 방법"
          options={[...SHIP_WAYS]}
          value={filters.shipWay}
          onValueChange={(value) => patch({ shipWay: value })}
        />
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
        scrollLeadWidth={FROZEN_LEAD_WIDTH}
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
            {/* 둘째 줄 — 원본 `listHead` 좌측: [송장수정](배송) + 고른 카드에서 갈 수 있는 상태변경 */}
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
          {/* 앞 5개는 `FROZEN_LEFT` 와 짝(합 484) */}
          <colgroup>
            <col className="w-13" />
            <col className="w-14" />
            <col className="w-29" />
            <col className="w-36" />
            <col className="w-29" />
            <col className="w-27" />
            <col className="w-39" />
            <col className="w-27" />
            {shipKind && <col className="w-40" />}
            {shipKind && <col className="w-72" />}
            <col className="w-27" />
            <col className="w-60" />
            <col className="w-24" />
            <col className="w-29" />
            <col className="w-29" />
            <col className="w-29" />
            <col className="w-52" />
            <col className="w-24" />
            <col className="w-37" />
            <col className="w-27" />
            <col className="w-52" />
            <col className="w-37" />
            <col className="w-27" />
            <col className="w-37" />
            <col className="w-76" />
            <col className="w-52" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh className={frozenTh(0)}>
                <Checkbox
                  size="small"
                  aria-label="이 페이지 전체 선택"
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={togglePage}
                />
              </TableTh>
              <TableTh className={frozenTh(1)}>No</TableTh>
              <TableTh align="center" className={frozenTh(2)}>
                상태
              </TableTh>
              <TableTh className={frozenTh(3)}>주문번호</TableTh>
              <TableTh className={frozenTh(4)}>결제금액</TableTh>
              <TableTh>결제수단</TableTh>
              <TableTh
                sortable
                sortDirection={sort ?? undefined}
                onSort={() => {
                  setSort(nextSort(sort));
                  setPage(1);
                }}
              >
                결제 일시
              </TableTh>
              <TableTh>배송 방법</TableTh>
              {shipCopy && <TableTh>{shipCopy.courier}</TableTh>}
              {shipCopy && <TableTh>{shipCopy.invoice}</TableTh>}
              <TableTh>상품코드</TableTh>
              <TableTh>상품명</TableTh>
              <TableTh>상품 수량</TableTh>
              <TableTh>판매 원가</TableTh>
              <TableTh>할인 금액</TableTh>
              <TableTh>판매가</TableTh>
              <TableTh>옵션</TableTh>
              <TableTh>옵션 수량</TableTh>
              <TableTh>옵션 총액 (정액 1회)</TableTh>
              <TableTh>구매자명</TableTh>
              <TableTh>구매자 ID</TableTh>
              <TableTh>연락처</TableTh>
              <TableTh>수령인</TableTh>
              <TableTh>수령인 연락처</TableTh>
              <TableTh>배송지</TableTh>
              <TableTh>배송 메모</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataStatus === "loading"
              ? Array.from({ length: pageSize }, (_, row) => (
                  <TableRow key={`skeleton-${row}`}>
                    {Array.from({ length: columnCount }, (_, cell) => (
                      <TableTd key={cell} className={frozenTd(cell)}>
                        <span className="body-small block">
                          <Skeleton />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : paged.map((u, index) => {
                  const options = optionsOf(u);
                  const optionTotal = options.reduce(
                    (a, o) => a + (Number(o.add) || 0),
                    0,
                  );
                  const d = draftOf(u);
                  const canEdit = editable(u);
                  return (
                    <TableRow key={u.id}>
                      <TableTd className={frozenTd(0)}>
                        <Checkbox
                          size="small"
                          aria-label={`${u.no} ${u.prod} 선택`}
                          checked={selected.includes(u.id)}
                          onChange={() => toggleRow(u.id)}
                        />
                      </TableTd>
                      <TableTd className={cn("tabular-nums", frozenTd(1))}>
                        {filtered.length - (start + index)}
                      </TableTd>
                      <TableTd align="center" className={frozenTd(2)}>
                        <StatusTag status={statusIn(config.screen, u)} />
                      </TableTd>
                      <TableTd className={frozenTd(3)}>
                        <TextButton
                          onClick={() => onNavSelect(config.detailPath(u))}
                        >
                          {u.no}
                        </TextButton>
                      </TableTd>
                      <TableTd className={cn("label-medium-bold", frozenTd(4))}>
                        {won(salePayTotal(u))}
                      </TableTd>
                      <TableTd>{dash(u.payMethod)}</TableTd>
                      <TableTd>{dash(u.orderedAt)}</TableTd>
                      <TableTd>{dash(u.shipWay)}</TableTd>
                      {shipCopy && (
                        <TableTd>
                          <Select
                            size="small"
                            aria-label={`${u.no} ${shipCopy.courier}`}
                            options={COURIER_OPTIONS}
                            value={d.courier}
                            disabled={!canEdit}
                            onValueChange={(courier) =>
                              setDraft(u, { courier })
                            }
                          />
                        </TableTd>
                      )}
                      {shipCopy && (
                        <TableTd>
                          <span className="flex items-center gap-2">
                            <Input
                              size="small"
                              inputMode="numeric"
                              aria-label={`${u.no} ${shipCopy.invoice}`}
                              placeholder={shipCopy.placeholder}
                              value={d.invoice}
                              disabled={!canEdit}
                              onChange={(event) =>
                                setDraft(u, { invoice: event.target.value })
                              }
                            />
                            <Button
                              variant="secondary"
                              size="small"
                              disabled={!canEdit}
                              onClick={() => rowShip(u)}
                            >
                              {shipCopy.button}
                            </Button>
                          </span>
                        </TableTd>
                      )}
                      <TableTd>{dash(u.code)}</TableTd>
                      <TableTd ellipsis>{u.prod}</TableTd>
                      <TableTd>{u.qty || 1}개</TableTd>
                      <TableTd>{won(u.sale ?? 0)}</TableTd>
                      <TableTd>{won(u.saleDisc ?? 0)}</TableTd>
                      <TableTd className="label-medium-bold">
                        {won(salePrice(u))}
                      </TableTd>
                      <TableTd ellipsis>
                        {options.length
                          ? options.map((o) => o.name).join(", ")
                          : DASH}
                      </TableTd>
                      <TableTd>
                        {options.length ? `${options.length}개` : DASH}
                      </TableTd>
                      <TableTd>
                        {optionTotal > 0 ? won(optionTotal) : DASH}
                      </TableTd>
                      <TableTd>{u.mem}</TableTd>
                      <TableTd ellipsis>{dash(u.email)}</TableTd>
                      <TableTd>{dash(u.tel)}</TableTd>
                      <TableTd>{dash(u.receiver)}</TableTd>
                      <TableTd>{dash(u.receiverTel)}</TableTd>
                      <TableTd ellipsis>{dash(u.addr)}</TableTd>
                      <TableTd ellipsis>{dash(u.shipMemo)}</TableTd>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>

      <GateHost
        gate={gate}
        units={selectedUnits}
        onClose={() => setGate(null)}
        onDone={(message) => gate && finish(gate.ids, message)}
      />
    </AppShell>
  );
}
