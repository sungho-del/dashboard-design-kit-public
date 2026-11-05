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
  TextButton,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import {
  EMPTY_DESCRIPTION,
  EMPTY_FILTERS,
  EMPTY_TITLE,
  PAGE_SIZE,
  PAGE_SIZES,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  STATEMENTS,
  STATUS_META,
  STATUS_OPTIONS,
  TARGET_KIND_LABEL,
  TARGET_OPTIONS,
  additionText,
  deductionText,
  detailPathOf,
  filterSummary,
  matches,
  won,
  type StatementFilters,
  type StatementSearchField,
} from "./SettlementStatementPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 정산 내역/명세서 — 목록형 · 뼈대 (BabyCube 본사 운영 어드민 · 조회 전용)
 *
 * ## 구성 — 원본 v0.4 `SCREENS.settleStatement` (proto.html 4619~4631)
 * ```
 * 검색조건 (정산 대상 · 상태 · 검색 대상 + 검색어)        ← FilterBar, 펼친 채로 열린다
 * 목록 (총 N건) / 표 9열 / 페이지네이션 10·20·50·100      ← 엑셀·체크박스·No·정렬 없음(원본)
 * ```
 * 명세서번호 · [명세서] · 행 클릭 → 정산 명세서 상세(`/settle-statement/{명세서번호}`).
 * 지급액·상태·[명세서] 세 열은 오른쪽 고정(1280 에서도 함께 보인다) · 금액 4열(매출·차감·가산·지급액)은 오른쪽 정렬.
 * 가산(보전·셀러 귀속) 열은 차감 다음(판정 Q3).
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./SettlementStatementPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·라벨·단위·판정  | `SettlementStatementPage.data.ts` **전체**     |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 검색조건 구성          | `FilterBar` 의 자식                            |
 *
 * ## 그대로 두는 것 (형제 목록과 같다)
 * 조건을 바꾸면 1페이지로 · 결과가 줄면 마지막 페이지로 당김 · 초기화는 한 곳 ·
 * `?preview=loading|empty|refreshing`
 * ====================================================================== */

/*
  **오른쪽 고정 묶음 — 지급액 · 상태 · [명세서]** (2026-11-05 사용자 결정 · 셀러 정산 목록과 같은 꼴).
  1280 에서 표가 가로로 밀리면 [명세서] 열만 붙박혀 지급액·상태를 덮었다(「171,6」). 세 열을 함께 붙박는다.
  right = 그 열 오른쪽 고정 열 폭의 합 — 명세서 112 → 0 · 상태 112 → 112 · 지급액 112 → 224
  ⚠️ 파생값이라 `<colgroup>` 끝 세 열을 고치면 **반드시 함께** 고친다.
  왼쪽 1px 선은 묶음 맨 왼쪽(지급액)에만 가상 요소로, 본문 셀 배경은 행에서 물려받는다(줄무늬·hover 를 따라가려면 상속뿐)
*/
const FROZEN_RIGHT = ["right-56", "right-28", "right-0"]; // 지급액 · 상태 · 명세서
const RIGHT_EDGE =
  "before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-divide before:content-['']";
const frozenRightTh = (i: number) =>
  `sticky z-2 ${FROZEN_RIGHT[i]}${i === 0 ? ` ${RIGHT_EDGE}` : ""}`;
const frozenRightTd = (i: number) =>
  `sticky z-1 bg-inherit ${FROZEN_RIGHT[i]}${i === 0 ? ` ${RIGHT_EDGE}` : ""}`;

export interface SettlementStatementPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

const COLUMN_COUNT = 9;

export function SettlementStatementPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SettlementStatementPageProps) {
  const [filters, setFilters] = useState<StatementFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const patch = (next: Partial<StatementFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };
  const resetFilters = () => patch(EMPTY_FILTERS);

  const filtered = STATEMENTS.filter((row) => matches(row, filters));
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
      header={<PageHeader title="정산 내역/명세서" />}
    >
      {/* 원본 순서: 정산 대상 → 상태 → 검색. 칩(다중)은 셀렉트(택일)로 */}
      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary(filters)}
        onReset={resetFilters}
      >
        <Select
          className="w-36"
          aria-label="정산 대상"
          options={TARGET_OPTIONS}
          value={filters.target}
          onValueChange={(value) => patch({ target: value })}
        />
        <Select
          className="w-36"
          aria-label="상태"
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
            patch({ searchField: value as StatementSearchField })
          }
        />
        <Input
          placeholder={SEARCH_PLACEHOLDER}
          value={filters.keyword}
          onChange={(event) => patch({ keyword: event.target.value })}
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
          {/*
            합 1128 — 1440(상자 1136)은 다 보이고, 1280(976)은 표 안에서 밀린다. 그래도 [명세서] 열은 오른쪽에 붙박는다.
            가산 열을 넣으며(판정 Q3) 매출·지급액 128 → 112(실측 내용 94) · 가산 128(머리 123)
          */}
          <colgroup>
            <col className="w-36" />
            <col className="w-44" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-34" />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>명세서번호</TableTh>
              <TableTh>정산 대상</TableTh>
              <TableTh>정산월</TableTh>
              {/* 금액 4열은 계산을 맞춰 읽는 열이라 오른쪽(§7-2 계산 영역 예외 — 셀러 정산과 같다) */}
              <TableTh align="right">매출</TableTh>
              <TableTh align="right">차감(수수료·PG·취소)</TableTh>
              <TableTh align="right">가산(보전·셀러 귀속)</TableTh>
              <TableTh align="right" className={frozenRightTh(0)}>
                지급액
              </TableTh>
              <TableTh align="center" className={frozenRightTh(1)}>
                상태
              </TableTh>
              <TableTh className={frozenRightTh(2)}>명세서</TableTh>
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
                  const open = () => onNavSelect(detailPathOf(row.statementNo));
                  return (
                    <TableRow key={row.statementNo} clickable onClick={open}>
                      <TableTd>
                        <TextButton onClick={open}>
                          {row.statementNo}
                        </TextButton>
                      </TableTd>
                      <TableTd>
                        <span className="flex items-center justify-start gap-2">
                          <Tag tone="default" size="small">
                            {TARGET_KIND_LABEL[row.kind]}
                          </Tag>
                          {/* 본사 행은 이름도 「본사」 — 배지만 둔다 */}
                          {row.kind === "seller" && row.name}
                        </span>
                      </TableTd>
                      <TableTd>{row.round}</TableTd>
                      <TableTd align="right" className="tabular-nums">
                        {won(row.revenue)}
                      </TableTd>
                      <TableTd align="right" className="tabular-nums">
                        {deductionText(row)}
                      </TableTd>
                      <TableTd align="right" className="tabular-nums">
                        {additionText(row)}
                      </TableTd>
                      {/* 지급액은 굵게(원본 `<b>`) — TableTd 의 body-medium 과 겹치지 않게 span 에 */}
                      <TableTd
                        align="right"
                        className={`tabular-nums ${frozenRightTd(0)}`}
                      >
                        <span className="body-medium-bold">
                          {won(row.payout)}
                        </span>
                      </TableTd>
                      <TableTd align="center" className={frozenRightTd(1)}>
                        <Tag tone={status.tone} dot size="small">
                          {status.label}
                        </Tag>
                      </TableTd>
                      <TableTd className={frozenRightTd(2)}>
                        <Button
                          size="small"
                          variant="secondary"
                          aria-label={`${row.name} 명세서`}
                          onClick={open}
                        >
                          명세서
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
