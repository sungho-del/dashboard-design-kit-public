import { useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
import {
  AppShell,
  Button,
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
  StatTile,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  TextButton,
  useToast,
  type TableSortDirection,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import {
  SELLER_GNB_LOGO_SLOTS,
  SELLER_GNB_SECTIONS,
} from "../sellerGnbSections";
import { StatusTag } from "./OrderGates";
import { flowStatOf, optionsOf, salePayTotal } from "./orderUnit.data";
import { SELLER_PERIOD_PRESETS } from "./processList.data";
import {
  CAT_OPTIONS,
  COPY,
  DATE_FIELDS,
  EMPTY_FILTERS,
  PAGE_SIZE,
  PAGE_SIZES,
  SALE_ORDER_UNITS,
  SEARCH_FIELDS,
  SHIP_WAYS,
  filterSummary,
  flowOptions,
  homePathOf,
  matchesFilters,
  orderStats,
  won,
  type OrderFilters,
} from "./SaleOrdersPage.data";

/* =========================================================================
 * 주문 통합 관리(SO-ORD-003) — 목록형 · **조회 전용** (BabyCube 입점사 어드민)
 *
 * [ 집계 타일 4 | 검색조건(펼침+요약) | 목록 (총 N건) · 엑셀 | 표 11열 | 페이지 ]
 *
 * 처리 목록(`ProcessList`)과 **의도적으로 다른 표**다(원본 `orderAllTable` — 입력칸·체크박스·고정 열 없음).
 * 도메인(모집단·타일·검색·주문번호 목적지)은 `./SaleOrdersPage.data.ts`, 처리상태 파생은 `orderUnit.data` `flowStatOf`.
 *
 * ## 본사 퍼블과 같게 둔 것(톤)
 * 집계는 `StatTile` 카드 4칸(본사 보증금 내역 요약과 같은 부품) · 검색조건 기본 펼침 · 조건을 바꾸면
 * 페이지가 풀린다 · 빈 칸 「—」 · `?preview=loading|empty|refreshing`
 * ====================================================================== */

export interface SaleOrdersPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

const DASH = "—";
const nextSort = (current: TableSortDirection | null) =>
  current === null ? "asc" : current === "asc" ? "desc" : null;

export function SaleOrdersPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SaleOrdersPageProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<TableSortDirection | null>(null);
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const patch = (next: Partial<OrderFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };
  const resetFilters = () => {
    patch(EMPTY_FILTERS);
    setSort(null);
  };

  const matched = SALE_ORDER_UNITS.filter((u) => matchesFilters(u, filters));
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

  const exportCsv = () => {
    if (filtered.length === 0) return toast(COPY.excelEmpty);
    toast(COPY.excel(filtered.length));
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
      header={<PageHeader title="주문 통합 관리" />}
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

      {/* 검색조건 — 원본 순서: 기간 → 처리구분 → 배송 방법 → 처리상태 → 검색 */}
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
        <Select
          className="w-32"
          aria-label="처리구분"
          options={CAT_OPTIONS}
          value={filters.cat}
          /* 처리구분이 바뀌면 처리상태 선택지가 바뀐다 — 고른 상태를 푼다(원본 `resets: ['flow']`) */
          onValueChange={(value) => patch({ cat: value, flow: "" })}
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
          aria-label="처리상태"
          options={flowOptions(filters.cat)}
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
            <col className="w-14" />
            <col className="w-29" />
            <col className="w-36" />
            <col className="w-39" />
            <col className="w-29" />
            <col className="w-27" />
            <col />
            <col className="w-24" />
            <col className="w-52" />
            <col className="w-24" />
            <col className="w-27" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>No</TableTh>
              <TableTh align="center">주문상태</TableTh>
              <TableTh>주문번호</TableTh>
              <TableTh
                sortable
                sortDirection={sort ?? undefined}
                onSort={() => {
                  setSort(nextSort(sort));
                  setPage(1);
                }}
              >
                결제일시
              </TableTh>
              <TableTh>결제금액</TableTh>
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
                    {Array.from({ length: 11 }, (_, cell) => (
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
                      <TableTd className="tabular-nums">
                        {filtered.length - (start + index)}
                      </TableTd>
                      <TableTd align="center">
                        <StatusTag status={flowStatOf(u)} />
                      </TableTd>
                      <TableTd>
                        <TextButton onClick={() => onNavSelect(homePathOf(u))}>
                          {u.no}
                        </TextButton>
                      </TableTd>
                      <TableTd>{u.orderedAt || DASH}</TableTd>
                      <TableTd className="label-medium-bold">
                        {won(salePayTotal(u))}
                      </TableTd>
                      <TableTd>{u.code || DASH}</TableTd>
                      <TableTd ellipsis>{u.prod}</TableTd>
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
