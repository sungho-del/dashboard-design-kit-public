import { useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
import {
  AppShell,
  Button,
  Checkbox,
  DataTableShell,
  DatePicker,
  EmptyState,
  FilterBar,
  Input,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
  Select,
  Skeleton,
  StatTile,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
  useToast,
  type TableSortDirection,
} from "../../components/ui";
import { SellerGnb } from "./SellerGnb";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import { StatusTag } from "./OrderGates";
import { careOf, flowStatOf, optionsOf, payTotalOf } from "./orderUnit.data";
import {
  COPY,
  DATE_FIELDS,
  EMPTY_FILTERS,
  PAGE_SIZE,
  PAGE_SIZES,
  SEARCH_FIELDS,
  SHIP_WAYS,
  catToggle,
  filterSummary,
  flowOptionsOf,
  matchesFilters,
  orderStats,
  won,
  type OrderFilters,
  type OrdersOverviewConfig,
} from "./ordersOverview.data";
import {
  CARE_OPTIONS,
  SELLER_PERIOD_PRESETS,
  periodOf,
} from "./processList.data";
import type { OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 주문 통합 관리 공용 뼈대 — 목록형 · **조회 전용**. 판매(SO-ORD-003) · 렌트(SO-ORD-004)가 설정만 바꿔 쓴다
 *
 * [ 집계 타일 4 | 검색조건(펼침+요약) | 목록 (총 N건) · 엑셀 | 표 11열(렌트 12) | 페이지 ]
 *
 * 처리 목록(`ProcessList`)과 **의도적으로 다른 표**다(원본 `orderAllTable` — 입력칸·고정 열 없음).
 * 개발 요청(2026-11-12) 13·26번: 처리구분은 체크박스 묶음(복수) · 행 체크박스 + 머리 전체 선택(고른 행만 엑셀).
 * 선택은 조건·페이지를 바꿔도 남는다(develop — 이 화면엔 상태 카드가 없어 화면을 떠날 때만 비운다)
 * 계약·검색·집계는 `./ordersOverview.data.ts`, 화면 설정은 `SaleOrdersPage.data` · `RentOrdersPage.data`,
 * 처리상태 파생은 `orderUnit.data` `flowStatOf`. 렌트는 이용기간 정렬 열 · 상품명 옆 안심케어 · 안심케어 검색.
 *
 * ## 본사 퍼블과 같게 둔 것(톤)
 * 집계는 `StatTile` 카드 4칸(본사 보증금 내역 요약과 같은 부품) · 검색조건 기본 펼침 · 조건을 바꾸면
 * 페이지가 풀린다 · 빈 칸 「—」 · `?preview=loading|empty|refreshing`
 * ====================================================================== */

export interface OrdersOverviewProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
  config: OrdersOverviewConfig;
}

const DASH = "—";
type SortKey = "orderedAt" | "period";
interface Sort {
  key: SortKey;
  dir: TableSortDirection;
}
/** 정렬 순환 — 다른 열을 누르면 오름차순부터(원본 정렬 열은 결제일시 · 이용기간 둘) */
const nextSort = (current: Sort | null, key: SortKey): Sort | null =>
  current?.key !== key
    ? { key, dir: "asc" }
    : current.dir === "asc"
      ? { key, dir: "desc" }
      : null;
const sortValue = (u: OrderUnit, key: SortKey) =>
  key === "period" ? periodOf(u) : (u.orderedAt ?? "");

export function OrdersOverview({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
  config,
}: OrdersOverviewProps) {
  const rent = !!config.rent;
  const { toast } = useToast();
  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<Sort | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const patch = (next: Partial<OrderFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };
  const resetFilters = () => {
    patch(EMPTY_FILTERS);
    setSort(null);
  };

  const matched = config.units.filter((u) => matchesFilters(u, filters));
  const filtered = sort
    ? [...matched].sort((a, b) => {
        const order = sortValue(a, sort.key).localeCompare(
          sortValue(b, sort.key),
        );
        return sort.dir === "asc" ? order : -order;
      })
    : matched;
  const columnCount = rent ? 13 : 12;
  const sortHead = (key: SortKey, label: string) => (
    <TableTh
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
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const pageIds = paged.map((u) => u.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someChecked =
    !allChecked && pageIds.some((id) => selected.includes(id));
  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  const toggleAll = () =>
    setSelected((prev) =>
      allChecked
        ? prev.filter((id) => !pageIds.includes(id))
        : [...prev, ...pageIds.filter((id) => !prev.includes(id))],
    );

  /** 고른 행이 결과 안에 있으면 그것만, 없으면 결과 전체(develop) — 퍼블은 건수 알림만 */
  const exportCsv = () => {
    const picked = filtered.filter((u) => selected.includes(u.id));
    const n = picked.length || filtered.length;
    if (n === 0) return toast(COPY.excelEmpty);
    toast(COPY.excel(n));
  };

  return (
    <AppShell
      sidebar={
        <SellerGnb
          activeId={activeNav}
          onSelect={onNavSelect}
          open={navOpen}
          onOpenChange={onNavOpenChange}
        />
      }
      header={<PageHeader title={config.title} />}
    >
      {/* 집계 — 읽기 전용 타일(누르는 카드가 아니다). 검색 결과를 센다 */}
      <section className="grid grid-cols-4 gap-6" aria-label="주문 집계">
        {orderStats(filtered).map(({ label, value, warning }) => (
          <StatTile
            key={label}
            variant="card"
            label={label}
            value={String(value)}
            unit="건"
            tone={warning && value > 0 ? "warning" : "default"}
          />
        ))}
      </section>

      {/* 검색조건 — 원본 순서: 기간 → 처리구분 → 배송 방법 → (렌트) 안심케어 → 처리상태 → 검색 */}
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
        {/* 처리구분 복수 선택(개발 요청 13번) — 아무것도 안 고르면 전체 */}
        <div
          role="group"
          aria-label="처리구분"
          className="flex h-(--size-control-medium) items-center gap-3"
        >
          <span className="label-medium text-text-sub">처리구분</span>
          {config.cats.map((c) => (
            <Checkbox
              key={c}
              size="small"
              label={c}
              checked={filters.cats.includes(c)}
              onChange={() => patch(catToggle(filters, config.cats, c))}
            />
          ))}
        </div>
        <Select
          className="w-32"
          aria-label="배송 방법"
          options={[...SHIP_WAYS]}
          value={filters.shipWay}
          onValueChange={(value) => patch({ shipWay: value })}
        />
        {rent && (
          <Select
            className="w-32"
            aria-label="안심케어"
            options={[...CARE_OPTIONS]}
            value={filters.care}
            onValueChange={(value) => patch({ care: value })}
          />
        )}
        <Select
          className="w-36"
          aria-label="처리상태"
          options={flowOptionsOf(config.cats, filters.cats)}
          value={filters.flow}
          onValueChange={(value) => patch({ flow: value })}
        />
        <Select
          className="w-36"
          aria-label="검색 대상"
          options={[...SEARCH_FIELDS]}
          value={filters.searchField}
          onValueChange={(value) => patch({ searchField: value })}
        />
        <Input
          aria-label="검색어"
          placeholder="검색어 입력"
          value={filters.keyword}
          onChange={(event) => patch({ keyword: event.target.value })}
          leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        />
      </FilterBar>

      <DataTableShell
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
          <colgroup>
            <col className="w-13" />
            <col className="w-14" />
            <col className="w-29" />
            <col className="w-36" />
            <col className="w-39" />
            <col className="w-29" />
            {rent && <col className="w-52" />}
            <col className="w-27" />
            <col />
            <col className="w-24" />
            <col className="w-52" />
            <col className="w-24" />
            <col className="w-27" />
          </colgroup>
          <TableHead>
            <TableRow>
              {/* 선택분 엑셀용 체크박스(개발 요청 13번) */}
              <TableTh>
                <Checkbox
                  size="small"
                  aria-label="이 페이지 전체 선택"
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={toggleAll}
                />
              </TableTh>
              <TableTh>No</TableTh>
              <TableTh align="center">주문상태</TableTh>
              <TableTh>주문번호</TableTh>
              {sortHead("orderedAt", "결제일시")}
              <TableTh>결제금액</TableTh>
              {rent && sortHead("period", "이용기간")}
              <TableTh>상품코드</TableTh>
              <TableTh>상품명</TableTh>
              <TableTh>상품 수량</TableTh>
              <TableTh>옵션</TableTh>
              <TableTh>옵션 수량</TableTh>
              <TableTh>구매자명</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataStatus === "loading"
              ? Array.from({ length: pageSize }, (_, row) => (
                  <TableRow key={`skeleton-${row}`}>
                    {Array.from({ length: columnCount }, (_, cell) => (
                      <TableTd key={cell}>
                        <span className="body-small block">
                          <Skeleton />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : paged.map((u, index) => {
                  const options = optionsOf(u);
                  return (
                    <TableRow key={u.id}>
                      <TableTd>
                        <Checkbox
                          size="small"
                          aria-label={`${u.no} ${u.prod} 선택`}
                          checked={selected.includes(u.id)}
                          onChange={() => toggle(u.id)}
                        />
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {filtered.length - (start + index)}
                      </TableTd>
                      <TableTd align="center">
                        <StatusTag status={flowStatOf(u)} />
                      </TableTd>
                      <TableTd>
                        <TextButton
                          onClick={() => onNavSelect(config.homePathOf(u))}
                        >
                          {u.no}
                        </TextButton>
                      </TableTd>
                      <TableTd>{u.orderedAt || DASH}</TableTd>
                      <TableTd className="label-medium-bold">
                        {won(payTotalOf(u))}
                      </TableTd>
                      {rent && <TableTd>{periodOf(u)}</TableTd>}
                      <TableTd>{u.code || DASH}</TableTd>
                      {careOf(u) ? (
                        <TableTd>
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate">{u.prod}</span>
                            <Tag size="small" className="shrink-0">
                              안심케어
                            </Tag>
                          </span>
                        </TableTd>
                      ) : (
                        <TableTd ellipsis>{u.prod}</TableTd>
                      )}
                      <TableTd>{u.qty || 1}개</TableTd>
                      <TableTd ellipsis>
                        {options.length
                          ? options.map((o) => o.name).join(", ")
                          : DASH}
                      </TableTd>
                      <TableTd>
                        {options.length ? `${options.length}개` : DASH}
                      </TableTd>
                      <TableTd>{u.mem}</TableTd>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>
    </AppShell>
  );
}
