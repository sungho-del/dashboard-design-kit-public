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
import { ReasonModal, StatusConfirmModal, StatusTag } from "./OrderGates";
import {
  COURIERS,
  DELAY_PRESETS,
  SELLER_CANCEL_PRESETS,
  optionsOf,
  salePayTotal,
  salePrice,
} from "./orderUnit.data";
import {
  BULK_ACTIONS,
  BULK_BY,
  COPY,
  DATE_FIELDS,
  DEFAULT_STATUS,
  EMPTY_FILTERS,
  PAGE_SIZE,
  PAGE_SIZES,
  SALE_PROC_UNITS,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  SELLER_PERIOD_PRESETS,
  SHIP_WAYS,
  SINGLE_ONLY,
  STATUS_CARDS,
  cardTip,
  filterSummary,
  matchesFilters,
  showsShipColumns,
  won,
  type BulkAction,
  type DateField,
  type ProcFilters,
  type ProcStatus,
  type SearchField,
  type ShipWayFilter,
} from "./SaleProcPage.data";
import type { OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 발주 관리(SO-ORD-001) — 목록형 · 처리 화면 (BabyCube 입점사 어드민)
 *
 * [ 상태 카드 3장 | 검색조건(접힘+요약) | 목록 (총 N건) · 엑셀 / 상태변경 버튼 | 표 | 페이지 ]
 *                                          ← 원본 v0.4 층 순서(UI-283) 그대로
 *
 * 도메인(대상 처리단위·카드·버튼 규칙·검색·문구)은 `./SaleProcPage.data.ts`, 처리단위 파생값
 * (결제금액·옵션)은 `./orderUnit.data.ts`, 상태 전이 창은 `./OrderGates.tsx` 에 있다.
 *
 * ## 원본을 그대로 둔 것
 * - 상태 카드는 [전체] 없이 항상 한 장(진입 = 신규 주문) · 카드 ⓘ 두 줄
 * - **상태변경 버튼은 목록 머리 왼쪽에 상시**(사용자 결정 2026-11-04 · 원본 `listHead`) —
 *   고른 카드에서 갈 수 있는 것만 보이고, 0건이면 「선택된 항목이 없습니다.」,
 *   [주문 취소] 는 2건 이상 고르면 잠기고 이유를 툴팁으로 말한다
 * - 왼쪽 고정 5칸(체크·No·상태·주문번호·결제금액 · 원본 `frozenTable(4+1)`)
 * - 택배사·송장번호 열은 배송 준비·배송 지연 카드에서만 · 행의 [송장등록]
 * - 주문번호를 누르면 상세(`/sale-proc/{처리단위}`). 행 클릭은 없다 — 행 안에 입력칸이 있다
 *
 * ## 본사 퍼블과 같게 둔 것(톤)
 * 검색조건 기본 펼침(본사 사용자 결정 2026-10-19) · 카드를 바꾸거나 조건을 바꾸면 선택·페이지가 풀린다 ·
 * 빈 칸 「—」 · 상태 배지 색 · `?preview=loading|empty|refreshing`
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

type Gate =
  | { kind: "confirm"; ids: string[]; next: string }
  | { kind: "delay"; ids: string[] }
  | { kind: "cancel"; ids: string[] }
  | null;

export interface SaleProcPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function SaleProcPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SaleProcPageProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<ProcStatus>(DEFAULT_STATUS);
  const [filters, setFilters] = useState<ProcFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<TableSortDirection | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  /** 표 안에 적은 택배사·송장번호 — 화면 안에서만 남는다(저장은 개발 영역) */
  const [drafts, setDrafts] = useState<
    Record<string, { courier: string; invoice: string }>
  >({});
  const [gate, setGate] = useState<Gate>(null);
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const patch = (next: Partial<ProcFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
    setSelected([]);
  };
  const resetFilters = () => {
    patch(EMPTY_FILTERS);
    setSort(null);
  };
  /** 카드를 바꾸면 선택·정렬·페이지가 풀린다 — 열 구성과 갈 수 있는 상태가 통째로 바뀐다 */
  const pickStatus = (value: string) => {
    setStatus(value as ProcStatus);
    setPage(1);
    setSelected([]);
    setSort(null);
  };

  /* 카드 건수는 상태를 **뺀** 조건으로 센다(원본 `chipDash` — 카드를 눌러도 다른 조건은 그대로) */
  const scoped = SALE_PROC_UNITS.filter((u) => matchesFilters(u, filters));
  const matched = scoped.filter((u) => u.stat === status);
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

  const draftOf = (u: OrderUnit) =>
    drafts[u.id] ?? { courier: u.courier ?? "", invoice: u.invoice ?? "" };
  const setDraft = (
    u: OrderUnit,
    next: Partial<{ courier: string; invoice: string }>,
  ) => setDrafts((prev) => ({ ...prev, [u.id]: { ...draftOf(u), ...next } }));

  /** 창을 닫고 처리한 건을 선택에서 뺀다(원본 `gateApply`) */
  const finish = (ids: string[], message: string) => {
    setGate(null);
    setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    toast(message);
  };

  /** 행의 [송장등록] — 원본 `rentShipOne`(판매는 출고 이미지 확인이 없다) */
  const shipOne = (u: OrderUnit) => {
    const d = draftOf(u);
    if (!d.courier) return toast(COPY.courierFirst);
    if (!d.invoice.trim()) return toast(COPY.invoiceFirst);
    toast(COPY.shipped(1));
  };

  /** 머리의 상태변경 버튼 — 원본 `bulkSet` → `gateRoute` */
  const runBulk = (action: BulkAction) => {
    if (selected.length === 0) return toast(COPY.noSelection);
    if (action === "배송중") {
      const units = SALE_PROC_UNITS.filter((u) => selected.includes(u.id));
      if (units.some((u) => !draftOf(u).courier || !draftOf(u).invoice.trim()))
        return toast(COPY.courierAndInvoice);
      return finish(selected, COPY.shipped(units.length));
    }
    if (action === "취소") {
      /* 잠금은 안내고 차단은 여기다(원본 주석 — 한 곳만 남으면 뚫린다) */
      if (selected.length > 1) return toast(COPY.singleOnlyToast);
      return setGate({ kind: "cancel", ids: selected });
    }
    if (action === "배송 지연")
      return setGate({ kind: "delay", ids: selected });
    setGate({ kind: "confirm", ids: selected, next: action });
  };

  const exportCsv = () => {
    const picked = filtered.filter((u) => selected.includes(u.id));
    const rows = picked.length > 0 ? picked : filtered;
    if (rows.length === 0) return toast(COPY.excelEmpty);
    toast(COPY.excel(rows.length, picked.length > 0));
  };

  const shipCols = showsShipColumns(status);
  const columnCount = shipCols ? 26 : 24;
  const allowed = BULK_ACTIONS.filter((a) => BULK_BY[status].includes(a.value));

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
      header={<PageHeader title="발주 관리" />}
    >
      {/* 상태 카드 — 원본 한 줄 4칸 격자에 3장 */}
      <Card>
        <CardBody>
          <StatGrid
            items={STATUS_CARDS.map((value) => {
              const [d, n] = cardTip(value);
              return {
                value,
                label: value,
                count: String(scoped.filter((u) => u.stat === value).length),
                unit: "건",
                tip: (
                  <span className="flex flex-col gap-2">
                    <span>{d}</span>
                    <span>{n}</span>
                  </span>
                ),
              };
            })}
            selected={status}
            onSelect={pickStatus}
            ariaLabel="처리 상태별 건수"
            columns={4}
          />
        </CardBody>
      </Card>

      {/* 검색조건 — 원본 순서: 기간 → 배송 방법 → 검색 */}
      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary(filters)}
        onReset={resetFilters}
      >
        <Select
          className="w-32"
          aria-label="기간 기준"
          options={[...DATE_FIELDS]}
          value={filters.dateField}
          onValueChange={(value) => patch({ dateField: value as DateField })}
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
          onValueChange={(value) => patch({ shipWay: value as ShipWayFilter })}
        />
        <Select
          className="w-36"
          aria-label="검색 대상"
          options={[...SEARCH_FIELDS]}
          value={filters.searchField}
          onValueChange={(value) =>
            patch({ searchField: value as SearchField })
          }
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
            {/* 둘째 줄 — 상태변경 버튼(원본 `listHead` 좌측 상단 · 고른 카드에서 갈 수 있는 것만) */}
            <div
              role="group"
              aria-label="상태 변경"
              className="flex w-full flex-wrap items-center gap-2"
            >
              {allowed.map((action) =>
                SINGLE_ONLY.includes(action.value) && selected.length > 1 ? (
                  /* 잠긴 버튼은 자기 툴팁을 못 띄워 감싼다(원본과 같은 방식) */
                  <Tooltip key={action.value} content={COPY.singleOnly}>
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
          </>
        }
        isEmpty={dataStatus === "empty" || filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            sticky
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title={COPY.emptyTitle}
            description={COPY.emptyDescription}
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
            {shipCols && <col className="w-40" />}
            {shipCols && <col className="w-72" />}
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
              {shipCols && <TableTh>택배사</TableTh>}
              {shipCols && <TableTh>송장번호</TableTh>}
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
                        <StatusTag status={u.stat ?? ""} />
                      </TableTd>
                      <TableTd className={frozenTd(3)}>
                        <TextButton
                          onClick={() => onNavSelect(`/sale-proc/${u.id}`)}
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
                      {shipCols && (
                        <TableTd>
                          <Select
                            size="small"
                            aria-label={`${u.no} 택배사`}
                            options={COURIER_OPTIONS}
                            value={d.courier}
                            onValueChange={(courier) =>
                              setDraft(u, { courier })
                            }
                          />
                        </TableTd>
                      )}
                      {shipCols && (
                        <TableTd>
                          <span className="flex items-center gap-2">
                            <Input
                              size="small"
                              inputMode="numeric"
                              aria-label={`${u.no} 송장번호`}
                              placeholder="송장번호 입력"
                              value={d.invoice}
                              onChange={(event) =>
                                setDraft(u, { invoice: event.target.value })
                              }
                            />
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={() => shipOne(u)}
                            >
                              송장등록
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

      <StatusConfirmModal
        open={gate?.kind === "confirm"}
        count={gate?.ids.length ?? 0}
        current={status}
        next={gate?.kind === "confirm" ? gate.next : ""}
        onClose={() => setGate(null)}
        onConfirm={() =>
          gate?.kind === "confirm" &&
          finish(gate.ids, COPY.changed(gate.next, gate.ids.length))
        }
      />
      <ReasonModal
        open={gate?.kind === "delay"}
        title={COPY.delayTitle}
        count={gate?.ids.length ?? 0}
        presets={DELAY_PRESETS}
        intro={COPY.delayIntro}
        customPlaceholder={COPY.delayPlaceholder}
        emptyMessage={COPY.delayEmpty}
        confirmLabel={COPY.delayConfirm}
        onClose={() => setGate(null)}
        onConfirm={(reason) =>
          gate && finish(gate.ids, COPY.delayed(reason, gate.ids.length))
        }
      />
      <ReasonModal
        open={gate?.kind === "cancel"}
        title={COPY.cancelTitle}
        count={gate?.ids.length ?? 0}
        presets={SELLER_CANCEL_PRESETS}
        customPlaceholder={COPY.cancelPlaceholder}
        emptyMessage={COPY.cancelEmpty}
        notice={
          <>
            고객이 요청하지 않은 <b>셀러 사정 취소</b>라 사유를 남겨야 합니다.
            셀러 사정 취소로 기록되어 <b>취소 수수료가 면제</b>되고 결제 금액이
            전액 환불되며, 입력한 사유는 <b>고객 주문 내역에 노출</b>됩니다.
          </>
        }
        confirmLabel={COPY.cancelConfirm}
        danger
        onClose={() => setGate(null)}
        onConfirm={() => gate && finish(gate.ids, COPY.canceled)}
      />
    </AppShell>
  );
}
