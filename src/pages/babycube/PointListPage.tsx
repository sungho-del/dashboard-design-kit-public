import { useState } from "react";
import { Search } from "lucide-react";
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
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  TextButton,
  type DateRange,
  type TableSortDirection,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { PERIOD_PRESETS } from "../../lib/periodPresets";
import { useSearchParams } from "../../lib/router";
import {
  DATE_LABEL,
  EMPTY_DESCRIPTION,
  EMPTY_TITLE,
  PAGE_SIZE,
  PAGE_SIZES,
  POINT_SUMMARIES,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  detailPathOf,
  filterSummary,
  matchesKeyword,
  point,
  ymdhm,
  type PointSearchField,
  type PointSummary,
} from "./PointListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 포인트 관리 — 목록형 · 뼈대 (BabyCube 본사 운영 어드민 · 조회 전용)
 *
 * ## 구성 — 원본 v0.4 `SCREENS.points` (proto.html 4055~4064)
 * ```
 * 검색조건 (업데이트 기간 + 빠른 선택 · 검색 대상 + 검색어)   ← FilterBar, 펼친 채로 열린다
 * 목록 (총 N건) / 표 7열(No · 보유↕ 누적 지급↕ 누적 차감↕ 업데이트 일시↕) / 페이지 10·20·50·100
 * ```
 * 행 어디를 눌러도(회원명 글자 포함) 포인트 현황 상세 `/points/{회원 id}` 로 간다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./PointListPage.data.ts` 에 있다
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 원장·합계·라벨·단위    | `PointListPage.data.ts` **전체**               |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 정렬 열                | `COMPARATORS`                                  |
 *
 * ## 그대로 두는 것 (형제 목록과 같다)
 * `inPeriod` · 3단 정렬(오름→내림→해제, 기본 정렬 없음 = 데이터 순서) · 조건·정렬을 바꾸면 1페이지 ·
 * 결과가 줄면 마지막 페이지로 당김 · 초기화는 한 곳 · No 는 조회 결과의 역순 순번 ·
 * `?preview=loading|empty|refreshing`
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 엑셀 다운로드 · 체크박스(원본은 엑셀·일괄이 없어 꺼진다) · 회원명 미리보기 모달 · 「포인트 목록」 제목
 * ====================================================================== */

/** 기간 판정 — 시작일 00:00 ~ 종료일 23:59:59 포함 */
const inPeriod = (dateText: string, range?: DateRange) => {
  if (!range?.from) return true;

  const at = new Date(dateText.replace(" ", "T"));
  if (Number.isNaN(at.getTime())) return true;

  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);
  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);

  return at >= from && at <= to;
};

/* 정렬 — 원본 `sortHead` 4열 */
type SortKey = "balance" | "granted" | "deducted" | "updatedAt";

interface SortState {
  key: SortKey;
  direction: TableSortDirection;
}

const COMPARATORS: Record<
  SortKey,
  (a: PointSummary, b: PointSummary) => number
> = {
  balance: (a, b) => a.balance - b.balance,
  granted: (a, b) => a.granted - b.granted,
  deducted: (a, b) => a.deducted - b.deducted,
  updatedAt: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
};

/** 오름 → 내림 → 해제 3단 */
const nextSort = (
  current: SortState | null,
  key: SortKey,
): SortState | null => {
  if (current?.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
};

const COLUMN_COUNT = 7;

export interface PointListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function PointListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: PointListPageProps) {
  const [filterOpen, setFilterOpen] = useState(true);
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [searchField, setSearchField] = useState<PointSearchField>(
    SEARCH_FIELDS[0].value,
  );
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<SortState | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const dataStatus = asStatus(useSearchParams().get("preview"));

  /** 조건을 바꾸면 1페이지로 */
  const changed =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  const resetFilters = () => {
    setPeriod(undefined);
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPage(1);
  };

  const matched = POINT_SUMMARIES.filter(
    (row) =>
      matchesKeyword(row, searchField, keyword) &&
      inPeriod(row.updatedAt, period),
  );
  /* 정렬은 페이지를 나누기 전에 — 모듈 상수라 복사한 뒤 정렬한다 */
  const filtered = sort
    ? [...matched].sort((a, b) => {
        const order = COMPARATORS[sort.key](a, b);
        return sort.direction === "asc" ? order : -order;
      })
    : matched;

  const toggleSort = (key: SortKey) => {
    setSort((current) => nextSort(current, key));
    setPage(1);
  };
  const directionOf = (key: SortKey) =>
    sort?.key === key ? sort.direction : undefined;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const sortTh = (key: SortKey, label: string) => (
    <TableTh
      sortable
      sortDirection={directionOf(key)}
      onSort={() => toggleSort(key)}
    >
      {label}
    </TableTh>
  );

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
      header={<PageHeader title="포인트 관리" />}
    >
      {/* 원본 순서: 기간 → 검색 */}
      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary({
          from: period?.from,
          to: period?.to,
          field: searchField,
          keyword,
        })}
        onReset={resetFilters}
      >
        <DatePicker
          mode="range"
          aria-label={DATE_LABEL}
          presets={PERIOD_PRESETS}
          value={period}
          onChange={changed(setPeriod)}
          startPlaceholder={`${DATE_LABEL} 시작`}
          endPlaceholder={`${DATE_LABEL} 종료`}
        />
        <Select
          className="w-36"
          aria-label="검색 대상"
          options={SEARCH_FIELDS}
          value={searchField}
          onValueChange={(value) =>
            changed(setSearchField)(value as PointSearchField)
          }
        />
        <Input
          placeholder={SEARCH_PLACEHOLDER}
          value={keyword}
          onChange={(event) => changed(setKeyword)(event.target.value)}
          leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        />
      </FilterBar>

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
                onSizeChange={changed(setPageSize)}
              />
            }
          />
        }
      >
        <Table>
          {/* 업데이트 일시는 날짜·시각 한 줄(실측 153) — 1280 의 표 폭 976 안에서 두 줄로 접히지 않게.
              포인트 열은 값(≈70)보다 머리글+정렬 아이콘이 넓어 그 폭에 맞춘다 */}
          <colgroup>
            <col className="w-16" />
            <col className="w-28" />
            <col className="w-52" />
            <col className="w-28" />
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-40" />
          </colgroup>
          <TableHead>
            <TableRow>
              {/* 조회 결과의 역순 순번(원본 `total-start-i`) — 정렬해도 위에서부터 큰 수 */}
              <TableTh>No</TableTh>
              <TableTh>회원명</TableTh>
              <TableTh>아이디(이메일)</TableTh>
              {sortTh("balance", "보유 포인트")}
              {sortTh("granted", "누적 지급 포인트")}
              {sortTh("deducted", "누적 차감 포인트")}
              {sortTh("updatedAt", "업데이트 일시")}
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
              : paged.map((row, index) => {
                  const open = () => onNavSelect(detailPathOf(row.id));
                  return (
                    <TableRow key={row.id} clickable onClick={open}>
                      <TableTd className="tabular-nums">
                        {filtered.length - start - index}
                      </TableTd>
                      {/* 원본 링크는 회원명 — 행 클릭과 같은 곳으로 간다 */}
                      <TableTd>
                        <TextButton onClick={open}>{row.name}</TextButton>
                      </TableTd>
                      <TableTd ellipsis>{row.email}</TableTd>
                      {/* 보유만 굵게(원본 `<b>`) — TableTd 의 body-medium 과 겹치지 않게 span 에 */}
                      <TableTd className="tabular-nums">
                        <span className="body-medium-bold">
                          {point(row.balance)}
                        </span>
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {point(row.granted)}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {point(row.deducted)}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {ymdhm(row.updatedAt)}
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
