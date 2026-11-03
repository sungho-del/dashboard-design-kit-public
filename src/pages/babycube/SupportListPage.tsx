import { useState } from "react";
import { Search } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  DataTableShell,
  DatePicker,
  EmptyState,
  FilterBar,
  Gnb,
  Input,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
  SegmentedControl,
  Select,
  Skeleton,
  StatGrid,
  StatTile,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
  type DateRange,
} from "../../components/ui";
import {
  asStatus,
  dimWhile,
  isBusy,
  type DataStatus,
} from "../../lib/dataStatus";
import { PERIOD_PRESETS } from "../../lib/periodPresets";
import { useSearchParams } from "../../lib/router";
import {
  AUDIENCE_TABS,
  CUSTOMER_INQUIRIES,
  DEFAULT_FILTER,
  detailPathOf,
  FILTERS,
  filterSummary,
  PAGE_SIZE,
  PAGE_SIZES,
  PERIOD_FIELDS,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  SELLER_ASKS,
  SELLER_SUMMARY,
  SELLER_TAB_QUERY,
  STATUS_META,
  TYPE_FILTERS,
  TYPE_LABELS,
  UNIT,
  ymd,
  type SupportAudience,
  type SupportStatus,
} from "./SupportListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S22 문의 관리 (BabyCube 본사 운영 어드민) — 뼈대
 * 기준 기획: v0.4 `SCREENS.support`(proto.html 4095~4119)
 *
 * ## 화면 유형: 목록형 — 탭마다 몸통이 통째로 다르다
 *
 * ```
 * 탭 [고객 문의][셀러 문의]   ← 본문 맨 위 SegmentedControl(공지 화면과 같은 부품 · 원본 칩 탭 자리)
 *
 * 고객 문의 : 상태 카드 2장(미답변·답변완료 — **전체 없음**, 기본 미답변)
 *             → 검색조건(기본 펼침 · 기간 기준+빠른 선택 · 유형 · 검색조건+검색어)
 *             → [ 목록 (총 N건) | 표 8열(No 포함) | 페이지 10/20/50/100 ]
 * 셀러 문의 : 요약 2칸(미답변/전체 — 누를 수 없음) → [ 표 5열 ]   ← 필터·목록 머리·페이저 없다(원본)
 * ```
 * 행 어디를 눌러도(제목 글자 포함) 상세 `/support/{문의 ID}` 로 간다. `?tab=seller` 면 셀러 탭으로 열린다
 * (셀러 문의 상세의 [목록]이 돌아오는 곳).
 *
 * ## 갈아끼울 것 → `./SupportListPage.data.ts` (이 파일은 도메인을 모른다)
 * 표 열 구성은 이 파일의 `colgroup` + `TableHead` + 본문 셀이다(셋이 짝이다).
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `inPeriod` · 상태 카드 건수는 **상태를 뺀 나머지 조건**으로 센다(원본 `applyFilters(scr,base,[stk])`) ·
 * 상태 카드를 바꾸면 페이지 해제 · 페이지 범위 클램프 · `?preview=loading|empty|refreshing` ·
 * 탭을 바꾸면 고객 탭 조건이 풀린다(탭 몸통이 언마운트된다 — 형제 규칙)
 *
 * ## 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * - **행 클릭 미리보기 모달** — 원본은 07-29 「목록 + 상세」 2화면 구성이다. 상세는 `SupportDetailPage`
 * - **[전체] 상태 카드** — 원본 `dash:true` · 기본 미답변
 * - **엑셀 · 체크박스 · 정렬** — 원본 `EXPORT_SPEC`·선택 화면 목록에 문의가 없다. 정렬 머리도 없다
 * - **셀러 요약의 증감·비교 기준 · 셀러 표의 유형·답변일 열** — 원본 셀러 탭은 라벨+건수 · 5열뿐
 *
 * ## 원본과 다르게 둔 곳 (형제 화면 규칙)
 * - 검색조건은 입력 즉시 적용 · 기본 펼침(원본은 [검색] · 접힘)
 * - 행 어디를 눌러도 상세(원본은 제목 링크만)
 * - 열은 왼쪽 정렬(상태만 가운데)
 * ====================================================================== */

/**
 * 날짜 문자열이 선택한 기간 안에 드는지. 시작일 00:00 ~ 종료일 23:59:59.
 * `null`(미답변 건의 답변일)은 기간을 걸면 빠진다.
 */
const inPeriod = (dateText: string | null, range?: DateRange) => {
  if (!range?.from) return true;
  if (!dateText) return false;

  const at = new Date(dateText.replace(" ", "T"));
  if (Number.isNaN(at.getTime())) return true;

  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);
  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);

  return at >= from && at <= to;
};

const EMPTY_TITLE = "해당 조건의 항목이 없습니다";
const EMPTY_DESCRIPTION =
  "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.";

/** 로딩 뼈대 — 머리는 실제 글자, 본문만 가린다(§D8-1) */
function LoadingTable({
  cols,
  heads,
  rows,
}: {
  cols: string[];
  heads: string[];
  rows: number;
}) {
  return (
    <Table>
      <colgroup>
        {cols.map((width, index) => (
          <col key={index} className={width} />
        ))}
      </colgroup>
      <TableHead sticky>
        <TableRow>
          {heads.map((head) => (
            <TableTh key={head}>{head}</TableTh>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: rows }, (_, row) => (
          <TableRow key={row}>
            {heads.map((head) => (
              <TableTd key={head}>
                <span className="body-small block">
                  <Skeleton className="w-16" />
                </span>
              </TableTd>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── 고객 문의 탭 ───────────────────────────────────────────────────── */

/**
 * 열 폭 = 실측 글자 폭(4px 격자) · 합 976 = 1280 화면의 표 폭 — 상태 열까지 스크롤 없이 보인다
 * (1440 에서는 비율대로 늘어난다). 제목은 한 줄(원본 nowrap)이라 실측 폭을 주고, 남는 폭은 내용(2줄 말줄임)
 */
const CUSTOMER_COLS = [
  "w-14",
  "w-18",
  "w-24",
  "w-61",
  "w-51",
  "w-26",
  "w-26",
  "w-24",
];
const CUSTOMER_HEADS = [
  "No",
  "회원명",
  "유형",
  "제목",
  "내용",
  "접수일",
  "답변일",
  "상태",
];

function CustomerTab({
  status,
  onOpen,
}: {
  status: DataStatus;
  onOpen: (id: string) => void;
}) {
  const [filter, setFilter] = useState<SupportStatus>(DEFAULT_FILTER);
  const [type, setType] = useState(TYPE_FILTERS[0].value);
  const [periodField, setPeriodField] = useState(PERIOD_FIELDS[0].value);
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  /** 검색조건 펼침 — **기본은 펼침**(형제 화면 결정. 원본은 접힘) */
  const [filterOpen, setFilterOpen] = useState(true);

  const searchAxis =
    SEARCH_FIELDS.find((field) => field.value === searchField) ??
    SEARCH_FIELDS[0];
  const periodAxis =
    PERIOD_FIELDS.find((field) => field.value === periodField) ??
    PERIOD_FIELDS[0];
  const typeOption = TYPE_FILTERS.find((option) => option.value === type);

  /* 상태를 **뺀** 나머지 조건 — 카드 건수를 여기서 센다. 미리보기 `empty` 는 원장이 비었다는 뜻이다 */
  const query = keyword.trim().toLowerCase();
  const scoped =
    status === "empty"
      ? []
      : CUSTOMER_INQUIRIES.filter(
          (row) =>
            (type === "all" || row.type === type) &&
            (query === "" ||
              searchAxis.pick(row).toLowerCase().includes(query)) &&
            inPeriod(periodAxis.pick(row), period),
        );
  const filtered = scoped.filter((row) => row.status === filter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  /** 검색 조건이 바뀌면 1페이지로 */
  const changed =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  /* 초기화는 한 곳에서 — 「미답변」으로 돌아간다(원본 `resetFilt` · def) */
  const resetFilters = () => {
    setFilter(DEFAULT_FILTER);
    setType(TYPE_FILTERS[0].value);
    setPeriodField(PERIOD_FIELDS[0].value);
    setPeriod(undefined);
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPage(1);
  };

  return (
    <>
      {/* 상태 대시 — 건수가 곧 상태 필터다(안심케어 승인·입점 심사와 같은 모양) */}
      <Card variant="soft" aria-busy={isBusy(status)}>
        <CardBody className={dimWhile(status)}>
          <StatGrid
            items={FILTERS.map((item) => ({
              value: item.value,
              label: item.label,
              count: scoped
                .filter((row) => row.status === item.value)
                .length.toLocaleString("ko-KR"),
              unit: UNIT,
              tip: STATUS_META[item.value].tip,
            }))}
            selected={filter}
            onSelect={(value) => changed(setFilter)(value as SupportStatus)}
            ariaLabel="문의 상태"
            columns={4}
          />
        </CardBody>
      </Card>

      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary({
          dateLabel: periodAxis.label,
          from: period?.from,
          to: period?.to,
          typeLabel: type === "all" ? undefined : typeOption?.label,
          fieldLabel: searchAxis.label,
          keyword,
        })}
        onReset={resetFilters}
      >
        <Select
          aria-label="기간 기준"
          options={PERIOD_FIELDS}
          value={periodField}
          onValueChange={changed(setPeriodField)}
        />
        <DatePicker
          mode="range"
          presets={PERIOD_PRESETS}
          value={period}
          onChange={changed(setPeriod)}
          startPlaceholder={`${periodAxis.label} 시작`}
          endPlaceholder={`${periodAxis.label} 종료`}
        />
        <Select
          aria-label="문의 유형"
          options={TYPE_FILTERS}
          value={type}
          onValueChange={changed(setType)}
        />
        <Select
          aria-label="검색 조건"
          options={SEARCH_FIELDS}
          value={searchField}
          onValueChange={changed(setSearchField)}
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
        bodyClassName={dimWhile(status)}
        isLoading={status === "loading"}
        loading={
          <LoadingTable
            cols={CUSTOMER_COLS}
            heads={CUSTOMER_HEADS}
            rows={PAGE_SIZE}
          />
        }
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        isEmpty={filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title={EMPTY_TITLE}
            description={EMPTY_DESCRIPTION}
          >
            <Button variant="secondary" onClick={resetFilters}>
              필터를 초기화
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
          <colgroup>
            {CUSTOMER_COLS.map((width, index) => (
              <col key={index} className={width} />
            ))}
          </colgroup>
          {/* 열 이름·순서는 원본 4117 그대로 */}
          <TableHead sticky>
            <TableRow>
              {/* 조회 결과의 역순 순번(원본 `total-start-i`) — 레코드 번호가 아니다 */}
              <TableTh>No</TableTh>
              <TableTh>회원명</TableTh>
              <TableTh>유형</TableTh>
              <TableTh>제목</TableTh>
              <TableTh>내용</TableTh>
              <TableTh>접수일</TableTh>
              <TableTh>답변일</TableTh>
              <TableTh align="center">상태</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((row, index) => {
              const meta = STATUS_META[row.status];
              return (
                <TableRow key={row.id} clickable onClick={() => onOpen(row.id)}>
                  <TableTd className="tabular-nums">
                    {filtered.length - (currentPage - 1) * pageSize - index}
                  </TableTd>
                  <TableTd>{row.member}</TableTd>
                  {/* 유형은 대등한 분류라 배지로 칠하지 않는다(원본도 맨 글자) */}
                  <TableTd>{TYPE_LABELS[row.type]}</TableTd>
                  {/* 원본에서 제목은 상세로 가는 링크다 — 한 줄(nowrap) */}
                  <TableTd>
                    <TextButton
                      className="max-w-full"
                      onClick={() => onOpen(row.id)}
                    >
                      <span className="truncate">{row.title}</span>
                    </TextButton>
                  </TableTd>
                  {/* 한국어 단어 중간에서 끊지 않는다(공백 없는 긴 문자열만 강제 줄바꿈) */}
                  <TableTd ellipsis className="break-keep wrap-anywhere">
                    {row.body}
                  </TableTd>
                  <TableTd className="tabular-nums">{ymd(row.date)}</TableTd>
                  <TableTd className="tabular-nums">
                    {ymd(row.answeredAt)}
                  </TableTd>
                  <TableTd align="center">
                    <Tag tone={meta.tone} dot>
                      {meta.label}
                    </Tag>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>
    </>
  );
}

/* ── 셀러 문의 탭 ───────────────────────────────────────────────────── */

const SELLER_COLS = ["w-35", "w-65", "w-65", "w-28", "w-24"];
const SELLER_HEADS = ["셀러", "제목", "내용", "접수일", "상태"];

function SellerTab({
  status,
  onOpen,
}: {
  status: DataStatus;
  onOpen: (id: string) => void;
}) {
  /* 원본은 필터도 페이저도 없이 배열 그대로(최신순) 전부 보여준다 */
  const rows = status === "empty" ? [] : SELLER_ASKS;

  return (
    <>
      {/* 셀러 요약 — 원본 `statrow`. 라벨과 건수뿐이고 누를 수 없다 */}
      <Card variant="soft" aria-busy={isBusy(status)}>
        <CardBody className={dimWhile(status)}>
          {/* 거터 12 — 카드 안 항목 묶음(§D4-3) */}
          <div className="grid grid-cols-2 gap-3">
            {SELLER_SUMMARY.map((item) => (
              <StatTile
                key={item.label}
                label={item.label}
                value={String(
                  rows.filter(
                    (ask) => item.status === null || ask.status === item.status,
                  ).length,
                )}
                unit={UNIT}
                compact
                tone={item.warn ? "warning" : "default"}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 원본 셀러 카드는 표 하나뿐이다 — 목록 머리도 페이지네이션도 없다 */}
      <DataTableShell
        variant="soft"
        bodyClassName={dimWhile(status)}
        isLoading={status === "loading"}
        loading={
          <LoadingTable cols={SELLER_COLS} heads={SELLER_HEADS} rows={3} />
        }
        isEmpty={rows.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title={EMPTY_TITLE}
            description={EMPTY_DESCRIPTION}
          />
        }
      >
        <Table>
          <colgroup>
            {SELLER_COLS.map((width, index) => (
              <col key={index} className={width} />
            ))}
          </colgroup>
          {/* 열 이름·순서는 원본 4109 그대로 — 유형과 답변일이 없다 */}
          <TableHead sticky>
            <TableRow>
              <TableTh>셀러</TableTh>
              <TableTh>제목</TableTh>
              <TableTh>내용</TableTh>
              <TableTh>접수일</TableTh>
              <TableTh align="center">상태</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((ask) => {
              const meta = STATUS_META[ask.status];
              return (
                <TableRow key={ask.id} clickable onClick={() => onOpen(ask.id)}>
                  <TableTd>{ask.seller}</TableTd>
                  <TableTd>
                    <TextButton
                      className="max-w-full"
                      onClick={() => onOpen(ask.id)}
                    >
                      <span className="truncate">{ask.title}</span>
                    </TextButton>
                  </TableTd>
                  <TableTd ellipsis className="break-keep wrap-anywhere">
                    {ask.body}
                  </TableTd>
                  <TableTd className="tabular-nums">{ymd(ask.date)}</TableTd>
                  <TableTd align="center">
                    <Tag tone={meta.tone} dot>
                      {meta.label}
                    </Tag>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>
    </>
  );
}

export interface SupportListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function SupportListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SupportListPageProps) {
  const params = useSearchParams();
  /* 실 API 를 붙이면 이 한 줄을 fetch 상태로 바꾼다 (`/support?preview=loading`) */
  const status = asStatus(params.get("preview"));
  /* 기본 고객 문의(원본 `supTab`) — `?tab=seller` 면 셀러 탭으로 연다 */
  const [audience, setAudience] = useState<SupportAudience>(
    params.get("tab") === SELLER_TAB_QUERY ? "seller" : AUDIENCE_TABS[0].value,
  );

  const open = (id: string) => onNavSelect(detailPathOf(id));

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
      header={<PageHeader title="문의 관리" />}
    >
      {/* 원본 칩 탭 — 본문 맨 위(상태 카드 위). 공지 화면과 같은 부품 */}
      <SegmentedControl
        className="self-start"
        aria-label="문의 대상"
        items={AUDIENCE_TABS}
        value={audience}
        onValueChange={(value) => setAudience(value as SupportAudience)}
      />

      {audience === "seller" ? (
        <SellerTab status={status} onOpen={open} />
      ) : (
        <CustomerTab status={status} onOpen={open} />
      )}
    </AppShell>
  );
}
