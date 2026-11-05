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
  Tag,
  TextButton,
  useToast,
  type DateRange,
} from "../../components/ui";
import { cn } from "../../lib/cn";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { PERIOD_PRESETS } from "../../lib/periodPresets";
import { useSearchParams } from "../../lib/router";
import {
  DEPOSITS,
  DEPOSIT_STATUS_META,
  EMPTY_DESCRIPTION,
  EMPTY_FILTERS,
  EMPTY_TITLE,
  ORDER_STATUS_META,
  PAGE_SIZE,
  PAGE_SIZES,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  SOURCE_CELL_LABEL,
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
  SUMMARY_STATS,
  deductText,
  filterSummary,
  matchesFilters,
  searchValueOf,
  won,
  ymd,
  type DepositFilters,
  type DepositSearchField,
} from "./RentDepositListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S13 보증금 내역 — 목록형 · 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형 (조회 전용 원장)
 * [ 요약 타일 4 | 검색조건(기본 펼침+요약) | 목록 (총 N건) · 엑셀 다운로드 | 표 | 페이지네이션 ]
 *                                                       ← 원본 v0.4 `listPage` 순서
 * 행 액션·일괄 처리는 없다(원본 — 환급 실행은 셀러의 검수·반납 관리). 선택은 엑셀 선택분을 정하는 데만 쓴다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./RentDepositListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `RentDepositListPage.data.ts` **전체**         |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 요약 4값               | `.data.ts` 의 `SUMMARY_STATS` (데이터가 집계)  |
 * | 검색조건 구성          | `FilterBar` 의 자식 (원본 순서: 기간→상태→출처→검색) |
 *
 * ## 공통 목록 규칙 (주문 목록과 같다)
 * - 조건을 바꾸면 1페이지로, **선택도 풀린다** — 결과 밖으로 나간 선택이 엑셀에 섞이지 않게
 * - 엑셀은 지금 조회 결과 안에서 고른 행, 없으면 조회 결과 전체, 0건이면 막는다 — 알림만(파일 생성 없음)
 * - 행 어디를 눌러도 상세(`/rent-deposit/{처리단위}`), 주문번호 글자도 같은 곳(원본 `idLink`).
 *   체크박스는 이동하지 않는다(`TableRow clickable` 이 셀 안 컨트롤을 거른다)
 * - No 열·정렬은 **없다**(원본 그대로 — 이 목록만 No 가 없다)
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - 행 클릭 「보증금 미리보기」 모달 — 원본은 상세 화면으로 간다
 * - 늘 펼친 「조회 조건」 카드 · 세그먼트 칩 — 형제처럼 `FilterBar` + 셀렉트
 * - 상태 요약 대시(건수 카드) — 원본이 이 화면에 두지 않는다
 * - 「1 / N 페이지」 문구 · 5건 고정 페이지
 *
 * ## 원본과 다르게 둔 것
 * - 주문번호까지 좌측 고정(체크박스·주문번호) — 12열이 화면 폭을 넘어 가로로 밀면 어느 건인지 사라진다
 * - 열은 왼쪽 정렬, 배지만 든 열(구분·주문 상태·보증금 상태)은 가운데(형제 규칙 §7-2) ·
 *   금액 3열(보증금액·차감·반환 예정액)만 오른쪽 + `tabular-nums`(§7-2 계산 영역 예외 — 셀러 정산·정산 명세서와 같다)
 * - 차감 부호 `−N원`(U+2212 · 원본 `- N원`) — 정산 화면 공통 부호
 * - 차감 칸에 경고색을 칠하지 않는다(금액 강조색 토큰 없음 — 형제와 같다)
 * ====================================================================== */

/** 고정 2열(체크박스 52 · 주문번호 144)의 `left` — `<colgroup>` 폭의 누적합. 함께 고친다 */
const FROZEN_LEFT = ["left-0", "left-13"];
const LAST_FROZEN = FROZEN_LEFT.length - 1;
const FROZEN_LEAD_WIDTH = 196;

/** 고정 구간의 오른쪽 끝 1px. `border` 는 collapse 표에서 함께 스크롤돼 사라진다 */
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

/** 본문 셀 — 배경은 행에서 물려받는다(zebra·hover 를 따라가려면 상속뿐) */
const frozenTd = (index: number) =>
  index > LAST_FROZEN
    ? undefined
    : cn(
        "sticky z-1 bg-inherit",
        FROZEN_LEFT[index],
        index === LAST_FROZEN && FROZEN_EDGE,
      );

/** 표의 열 수 — 로딩 뼈대가 같은 수의 빈 칸을 그린다. `<col>` 수와 같아야 한다 */
const COLUMN_COUNT = 12;

/**
 * 날짜가 기간 안에 드는지. 시작일 00:00 ~ 종료일 23:59:59.
 * **날짜가 없는 행은 기간을 걸면 빠진다**(점유중 — 원본 `_normDate` 그대로).
 */
const inPeriod = (dateText: string | null, range?: DateRange) => {
  if (!range?.from) return true;
  if (!dateText) return false;
  const at = new Date(dateText.replace(" ", "T"));
  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);
  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);
  return at >= from && at <= to;
};

export interface RentDepositListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function RentDepositListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: RentDepositListPageProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<DepositFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<string[]>([]);
  /** 검색조건 펼침. **기본은 펼침**(사용자 결정 2026-10-19 — 원본은 접힘) */
  const [filterOpen, setFilterOpen] = useState(true);

  /* `?preview=loading|empty|refreshing` 으로 데이터 상태를 미리 본다 */
  const dataStatus = asStatus(useSearchParams().get("preview"));

  /** 조건 하나를 바꾼다 — 1페이지로, 선택도 풀린다 */
  const patch = (next: Partial<DepositFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
    setSelected([]);
  };
  const resetFilters = () => patch(EMPTY_FILTERS);

  const keyword = filters.keyword.trim().toLowerCase();
  const filtered = DEPOSITS.filter(
    (row) =>
      matchesFilters(row, filters) &&
      inPeriod(row.changedAt, filters.period) &&
      (keyword === "" ||
        searchValueOf(row, filters.searchField)
          .toLowerCase()
          .includes(keyword)),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  /** 머리 체크박스는 **보이는 페이지 단위**다 */
  const pageIds = paged.map((row) => row.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const somePageSelected =
    pageIds.some((id) => selected.includes(id)) && !allPageSelected;
  const selectedRows = filtered.filter((row) => selected.includes(row.id));

  const toggleRow = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  const togglePage = () =>
    setSelected((prev) =>
      allPageSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...prev, ...pageIds.filter((id) => !prev.includes(id))],
    );

  /* 엑셀 — 형제 목록과 같은 3문구. 퍼블은 대상 건수만 알린다 */
  const exportCsv = () => {
    const rows = selectedRows.length > 0 ? selectedRows : filtered;
    if (rows.length === 0) {
      toast("다운로드할 데이터가 없습니다");
      return;
    }
    toast(
      selectedRows.length > 0
        ? `선택한 ${rows.length}건을 내려받았습니다`
        : `조회 결과 ${rows.length}건을 내려받았습니다`,
    );
  };

  const openDetail = (id: string) => onNavSelect(`/rent-deposit/${id}`);

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
      header={<PageHeader title="보증금 내역" />}
    >
      {/*
        요약 4값 — 원본 `note` 슬롯. 라벨·값뿐이고 **필터와 무관**하다(보증금 있는 렌트 전체에서 센다).
        ⚠️ 목록 범위(반납 이후)보다 넓다 — 원본 그대로, 기획 확인 사항(.data.ts 머리 주석)
      */}
      <section className="grid grid-cols-4 gap-6" aria-label="보증금 요약">
        {SUMMARY_STATS.map(({ label, value, unit }) => (
          <StatTile
            key={label}
            variant="card"
            label={label}
            value={value}
            unit={unit}
          />
        ))}
      </section>

      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary(filters)}
        onReset={resetFilters}
      >
        <DatePicker
          mode="range"
          aria-label="상태 변경일"
          presets={PERIOD_PRESETS}
          value={filters.period}
          onChange={(next) => patch({ period: next })}
          startPlaceholder="상태 변경일 시작"
          endPlaceholder="상태 변경일 종료"
        />
        <Select
          className="w-40"
          aria-label="보증금 상태"
          options={STATUS_OPTIONS}
          value={filters.status}
          onValueChange={(value) => patch({ status: value })}
        />
        <Select
          className="w-32"
          aria-label="출처"
          options={SOURCE_OPTIONS}
          value={filters.source}
          onValueChange={(value) => patch({ source: value })}
        />
        <Select
          className="w-28"
          aria-label="검색 대상"
          options={SEARCH_FIELDS}
          value={filters.searchField}
          onValueChange={(value) =>
            patch({ searchField: value as DepositSearchField })
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
        scrollLeadWidth={FROZEN_LEAD_WIDTH}
        variant="soft"
        bodyClassName={dimWhile(dataStatus)}
        aria-busy={isBusy(dataStatus)}
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        toolbarEnd={
          <Button variant="secondary" onClick={exportCsv}>
            <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
            엑셀 다운로드
          </Button>
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
          {/*
            table-fixed 라 폭 지정 필수. ⚠️ 앞 2개는 `FROZEN_LEFT` 와 짝이다(합 196).
            폭은 실제 글자 폭 + 좌우 여백 24 로 잡는다(금액 `160,000원` 68 → 92).
            상품 200 = 가장 긴 예시 이름 + 안심케어 칩이 한 줄(176) — 셀러 보증금 내역과 같은 모양(사용자 결정 2026-11-05).
            그래서 합 1220 이 1440 카드 안쪽 폭(1136)을 넘는다 — 1440·1280 에서는 표 안에서만 가로로 민다(주문번호까지 고정)
          */}
          <colgroup>
            <col className="w-13" />
            <col className="w-36" />
            <col className="w-16" />
            <col className="w-14" />
            <col className="w-22" />
            <col className="w-50" />
            <col className="w-23" />
            <col className="w-23" />
            <col className="w-23" />
            <col className="w-22" />
            <col className="w-34" />
            <col className="w-28" />
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
              <TableTh className={frozenTh(1)}>주문번호</TableTh>
              <TableTh>회원</TableTh>
              {/* 배지만 들어가는 열은 가운데 (§7-2) — th·td 를 함께 바꾼다 */}
              <TableTh align="center">구분</TableTh>
              <TableTh>셀러명</TableTh>
              <TableTh>상품</TableTh>
              {/* 금액 3열은 계산을 맞춰 읽는 열이라 오른쪽 · tabular-nums(§7-2 계산 영역 예외) */}
              <TableTh align="right">보증금액</TableTh>
              <TableTh align="right">차감</TableTh>
              <TableTh align="right">반환 예정액</TableTh>
              <TableTh align="center">주문 상태</TableTh>
              <TableTh align="center">보증금 상태</TableTh>
              <TableTh>상태 변경일</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataStatus === "loading"
              ? Array.from({ length: pageSize }, (_, row) => (
                  <TableRow key={`skeleton-${row}`}>
                    {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                      <TableTd key={cell} className={frozenTd(cell)}>
                        <span className="body-small block">
                          <Skeleton />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : paged.map((row) => {
                  const depositMeta = DEPOSIT_STATUS_META[row.status];
                  const orderMeta = ORDER_STATUS_META[row.orderStatus];
                  return (
                    <TableRow
                      key={row.id}
                      clickable
                      onClick={() => openDetail(row.id)}
                    >
                      <TableTd className={frozenTd(0)}>
                        {/* 같은 주문번호에 처리단위가 여럿일 수 있어 상품명까지 이름에 넣는다 */}
                        <Checkbox
                          size="small"
                          aria-label={`${row.orderNo} ${row.product} 선택`}
                          checked={selected.includes(row.id)}
                          onChange={() => toggleRow(row.id)}
                        />
                      </TableTd>
                      <TableTd className={frozenTd(1)}>
                        <TextButton onClick={() => openDetail(row.id)}>
                          {row.orderNo}
                        </TextButton>
                      </TableTd>
                      <TableTd>{row.member}</TableTd>
                      <TableTd align="center">
                        {/* 구분은 분류라 상태색을 쓰지 않는다 — 중립색 */}
                        <Tag size="small">
                          {SOURCE_CELL_LABEL[row.sellerKind]}
                        </Tag>
                      </TableTd>
                      <TableTd>{row.seller}</TableTd>
                      <TableTd>
                        {/*
                          안심케어는 열이 아니라 상품 옆 표식이다. 예시 이름은 칩까지 한 줄이고, 더 긴 이름은
                          낱말 단위로 두 줄까지 접는다. ⚠️ 글자 폭을 열 안쪽 폭(200 − 여백 24 = 176, `w-44`)에
                          묶어야 한다 — `w-max` 표는 셀 내용의 한 줄 폭만큼 열을 늘린다. 열 폭과 함께 고친다
                        */}
                        <span className="line-clamp-2 block w-44 break-keep">
                          {row.product}
                          {row.care && (
                            <>
                              {" "}
                              <Tag size="small">안심케어</Tag>
                            </>
                          )}
                        </span>
                      </TableTd>
                      <TableTd
                        align="right"
                        className="whitespace-nowrap tabular-nums"
                      >
                        {won(row.deposit)}
                      </TableTd>
                      <TableTd
                        align="right"
                        className="whitespace-nowrap tabular-nums"
                      >
                        {deductText(row.deduction)}
                      </TableTd>
                      <TableTd
                        align="right"
                        className="whitespace-nowrap tabular-nums"
                      >
                        {won(row.refund)}
                      </TableTd>
                      <TableTd align="center">
                        <Tag tone={orderMeta.tone} dot size="small">
                          {orderMeta.label}
                        </Tag>
                      </TableTd>
                      <TableTd align="center">
                        {/* 셀에서는 긴 라벨 — `전액차감` 만으로는 "차감할 예정"으로 읽힌다 */}
                        <Tag tone={depositMeta.tone} dot size="small">
                          {depositMeta.cellLabel}
                        </Tag>
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {ymd(row.changedAt)}
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
