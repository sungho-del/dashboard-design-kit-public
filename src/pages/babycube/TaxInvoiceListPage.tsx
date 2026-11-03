import { useState } from "react";
import { Search } from "lucide-react";
import {
  AppShell,
  Button,
  DataTableShell,
  EmptyState,
  FilterBar,
  Gnb,
  Input,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  useToast,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import {
  ACTION_META,
  EMPTY_DESCRIPTION,
  EMPTY_FILTERS,
  EMPTY_TITLE,
  PAGE_SIZE,
  PAGE_SIZES,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  STATUS_META,
  STATUS_OPTIONS,
  TAX_INVOICES,
  filterSummary,
  searchHaystack,
  won,
  ymd,
  type SearchField,
  type TaxFilters,
} from "./TaxInvoiceListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 세금계산서·증빙 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형 (상세 없음 — 원본에도 없다)
 * 검색조건(`FilterBar`) + 데이터 테이블 + 페이지네이션. 행 클릭·체크박스·No·정렬·엑셀이 **없다**(원본).
 * 처리 열의 버튼만 누를 수 있고, 누르면 토스트만 뜬다(목록 상태는 그대로).
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./TaxInvoiceListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 행·라벨·단위·처리 버튼 | `TaxInvoiceListPage.data.ts` **전체**          |
 * | 표 열 구성             | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 검색조건 구성          | `FilterBar` 의 자식 (원본 순서: 발행상태→검색) |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `FilterBar` 기본 펼침(사용자 결정 2026-10-19) · 페이지 범위 클램프 · 페이지 크기 선택 ·
 * `?preview=loading|empty|refreshing`(§D8) · 빈 상태 + [필터 초기화]
 *
 * ## 표 정렬 (§7-2)
 * 열은 왼쪽 정렬 · 배지만 든 상태 열은 가운데. 원본 순서 그대로 **상태 다음이 처리**다.
 * 계산서번호·합계는 원본처럼 굵게(`<b>`).
 *
 * ## 걷어낸 것 (원본에 없다 — 되살리지 말 것)
 * 행 클릭 「계산서 미리보기」 모달 · 엑셀 · 안내 note
 * ====================================================================== */

/** 표 열 수 — 로딩 스켈레톤이 쓴다. `TableHead` 와 함께 고칠 것 */
const COLUMN_COUNT = 9;

export interface TaxInvoiceListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function TaxInvoiceListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: TaxInvoiceListPageProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<TaxFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  /** 검색조건 펼침. **기본은 펼침**이다(사용자 결정 2026-10-19 — 원본은 접힘) */
  const [filterOpen, setFilterOpen] = useState(true);

  /* `?preview=loading|empty|refreshing` 으로 데이터 상태를 미리 본다 */
  const dataStatus = asStatus(useSearchParams().get("preview"));

  /** 조건 하나를 바꾼다 — 1페이지로 */
  const patch = (next: Partial<TaxFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };

  /** 초기화는 한 곳에서만 — 검색조건과 빈 상태가 함께 부른다 */
  const resetFilters = () => patch(EMPTY_FILTERS);

  const keyword = filters.keyword.trim().toLowerCase();
  const filtered = TAX_INVOICES.filter(
    (row) =>
      (filters.status === "all" || row.status === filters.status) &&
      (keyword === "" ||
        searchHaystack(row, filters.searchField).includes(keyword)),
  );

  /* 결과가 줄어 현재 페이지가 범위를 벗어나면 마지막 페이지로 당긴다 */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return (
    <AppShell
      sidebar={
        <Gnb
          sections={GNB_SECTIONS}
          activeId={activeNav}
          onSelect={onNavSelect}
          open={navOpen}
          onOpenChange={onNavOpenChange}
          logo={GNB_LOGO_SLOTS.logo}
          collapsedLogo={GNB_LOGO_SLOTS.collapsed}
        />
      }
      header={<PageHeader title="세금계산서·증빙" />}
    >
      {/* 검색조건 — 원본 `chips`(발행상태) + `search`(대상 2종). 기간 축은 원본에 없다 */}
      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary(filters)}
        onReset={resetFilters}
      >
        {/* 원본 다중 칩(전체·발행대기·발행완료) — 값이 둘뿐이라 셀렉트 하나와 뜻이 같다 */}
        <Select
          className="w-36"
          aria-label="발행상태"
          options={STATUS_OPTIONS}
          value={filters.status}
          onValueChange={(value) => patch({ status: value })}
        />
        <Select
          className="w-28"
          aria-label="검색 대상"
          options={SEARCH_FIELDS}
          value={filters.searchField}
          onValueChange={(value) =>
            patch({ searchField: value as SearchField })
          }
        />
        <Input
          placeholder={SEARCH_PLACEHOLDER}
          value={filters.keyword}
          onChange={(event) => patch({ keyword: event.target.value })}
          leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        />
      </FilterBar>

      {/* 목록 — 툴바에는 총 N건뿐이다(원본에 엑셀이 없다) */}
      <DataTableShell
        variant="soft"
        bodyClassName={dimWhile(dataStatus)}
        aria-busy={isBusy(dataStatus)}
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        isEmpty={dataStatus === "empty" || filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            sticky
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title={EMPTY_TITLE}
            description={EMPTY_DESCRIPTION}
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
          {/* `table-fixed` 라 폭 지정이 필수다. 합계가 곧 표 폭 — 좁은 창에서는 가로로 스크롤한다 */}
          <colgroup>
            <col className="w-33" />
            <col className="w-38" />
            <col className="w-38" />
            <col className="w-25" />
            <col className="w-35" />
            <col className="w-30" />
            <col className="w-33" />
            <col className="w-25" />
            <col className="w-25" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>계산서번호</TableTh>
              <TableTh>공급자</TableTh>
              <TableTh>공급받는자</TableTh>
              <TableTh>작성일</TableTh>
              <TableTh>공급가액(수수료)</TableTh>
              <TableTh>세액(VAT)</TableTh>
              <TableTh>합계</TableTh>
              <TableTh align="center">상태</TableTh>
              <TableTh>처리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataStatus === "loading"
              ? Array.from({ length: pageSize }, (_, row) => (
                  <TableRow key={`skeleton-${row}`}>
                    {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                      <TableTd key={cell}>
                        <span className="body-small block">
                          <Skeleton />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : paged.map((row) => {
                  const status = STATUS_META[row.status];
                  const action = ACTION_META[row.status];
                  return (
                    /* 상세가 없어 행 클릭이 없다(원본) — 처리 버튼만 누른다 */
                    <TableRow key={row.no}>
                      <TableTd>
                        <span className="body-medium-bold">{row.no}</span>
                      </TableTd>
                      <TableTd>{row.supplier}</TableTd>
                      <TableTd>{row.buyer}</TableTd>
                      <TableTd className="tabular-nums">
                        {ymd(row.date)}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {won(row.supply)}
                      </TableTd>
                      <TableTd className="tabular-nums">{won(row.vat)}</TableTd>
                      <TableTd className="tabular-nums">
                        <span className="body-medium-bold">
                          {won(row.total)}
                        </span>
                      </TableTd>
                      <TableTd align="center">
                        <Tag tone={status.tone} dot>
                          {status.label}
                        </Tag>
                      </TableTd>
                      <TableTd>
                        <Button
                          variant={action.variant}
                          size="small"
                          aria-label={`${row.no} ${action.label}`}
                          onClick={() => toast(action.message(row.no))}
                        >
                          {action.label}
                        </Button>
                      </TableTd>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>
    </AppShell>
  );
}
