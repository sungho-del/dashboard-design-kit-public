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
  Tag,
  TextButton,
  useToast,
  type DateRange,
  type TableSortDirection,
} from "../../components/ui";
import { cn } from "../../lib/cn";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { PERIOD_PRESETS } from "../../lib/periodPresets";
import { useSearchParams } from "../../lib/router";
import {
  DASH_UNIT,
  EMPTY_DESCRIPTION,
  EMPTY_FILTERS,
  EMPTY_TITLE,
  PAGE_SIZE,
  PAGE_SIZES,
  RETURNS,
  RETURN_DETAIL_PATH,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  SELLER_OPTIONS,
  STATUS_META,
  STATUS_OPTIONS,
  TYPE_FILTERS,
  TYPE_META,
  filterSummary,
  filtersFromQuery,
  matchesSeller,
  perDay,
  periodText,
  rentPriceOf,
  searchValueOf,
  sellerLabel,
  ymdhm,
  type Order,
  type OrderFilters,
  type OrderSearchField,
  type OrderType,
} from "./OrderReturnListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S10 반품 목록 — 목록형 · 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형 (조회 전용)
 * 반품이 걸린 처리단위를 조회한다. 원본 v0.4 는 이 화면을 `ordersRmaScreen` 으로 그리는데,
 * 그 안은 주문 목록과 **같은 함수**(`ordersFlatCard`/`ordersFlatHead`/`ordersFlatRow`)다.
 * 그래서 이 뼈대도 주문 목록(`OrderListPage.tsx`)과 같고, 다른 것은 셋뿐이다:
 *   ① 모집단 `RETURNS` ② 상태 선택지 `STATUS_OPTIONS`(유형과 무관한 10단계)
 *   ③ 주문번호 링크 → 반품 상세 `RETURN_DETAIL_PATH`
 *
 * [ 유형 카드 2장 | 검색조건(펼침+요약) | 목록 (총 N건) · 엑셀 다운로드 | 표 | 페이지네이션 ]
 *                                                  ← 원본 v0.4 와 같은 순서
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./OrderReturnListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 모집단·상태·판매자·URL | `OrderReturnListPage.data.ts`                  |
 * | 타입·라벨·단위         | `OrderListPage.data.ts` (다시 내보낸다)        |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 유형 대시 구성         | `TYPE_FILTERS` (카드가 곧 유형 필터다)         |
 * | 검색조건 구성          | `FilterBar` 의 자식 (원본 순서: 기간→판매자→상태→검색) |
 *
 * ## 공통 목록 규칙 (주문 목록과 같다)
 * - 유형 카드를 바꾸면 **상태·정렬·선택·페이지가 함께 풀린다**(원본 `setOrderType` — 반품은 상태
 *   선택지가 유형과 무관하지만 원본 동작이 해제다)
 * - 다른 조건을 바꾸면 1페이지로, **선택도 풀린다** — 결과 밖으로 나간 선택이 엑셀에 섞이지 않게
 * - 정렬은 이용 기간·결제 일시 둘뿐, 필터 뒤·페이지 나누기 전. 정렬을 바꾸면 1페이지로
 * - 엑셀은 **지금 조회 결과 안에서 고른 행**, 없으면 조회 결과 전체 — 알림만(파일 생성은 개발 영역)
 * - No 는 **조회 결과의 역순 순번**(원본 `total-(start+i)`) — 레코드 번호가 아니다
 *
 * ## 상세 연결
 * 주문번호를 누르면 **그 처리단위의** 반품 상세(`/orders-return/{처리단위}`)로 간다
 * (원본 판매 `rmaReturn` / 렌트 `rentRmaReturn`). 상세 화면은 따로 만든다.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - 유형 카드의 **[전체]** — v0.4 는 렌트·판매 2장, 들어오면 렌트
 * - 제목 옆 「반품 상태 흐름」 도움말 툴팁 · 유형 안내 문구(`statusTips` 는 v0.4 에 없다)
 * - **행 클릭 「반품 미리보기」 모달** — 원본은 주문번호 링크로 상세에 간다
 * - 검색 대상 「전체 항목」 — 원본은 7종, 기본 주문번호
 * - 엑셀 파일명·추가 열 안내 토스트 · 「n / m 페이지」 표기 · 이 화면만의 자체 샘플
 * ====================================================================== */

/**
 * 좌측 고정 7열(원본 `frozenTable(…, 7)`: 선택·No·상태·주문번호·유형·판매자·이용 기간)의
 * `left` 오프셋 — **`<colgroup>` 폭의 누적합**이다.
 *   52 / 56 / 116 / 144 / 72 / 112 / 208 → 0 · 52 · 108 · 224 · 368 · 440 · 552 (합 760)
 * ⚠️ 첫 열은 52 다 — 체크박스 16 + 셀 여백(왼쪽 24 · 오른쪽 12). 40 을 줘도 브라우저가 늘린다.
 * ⚠️ 파생값이라 `<colgroup>` 을 고치면 **반드시 함께** 고친다. 어긋나면 열이 겹친다.
 */
const FROZEN_LEFT = [
  "left-0",
  "left-13",
  "left-27",
  "left-56",
  "left-92",
  "left-110",
  "left-138",
];
const LAST_FROZEN = FROZEN_LEFT.length - 1;

/** 고정 구간의 폭 — `DataTableShell` 이 가로 스크롤바를 이만큼 비켜서 그린다 */
const FROZEN_LEAD_WIDTH = 760;

/** 고정 구간의 오른쪽 끝 1px. `border` 는 collapse 표에서 함께 스크롤돼 사라진다 */
const FROZEN_EDGE =
  "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-divide after:content-['']";

/** 헤더 셀 — 배경을 더하지 않는다(TableTh 가 이미 `bg-surface`) */
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
const COLUMN_COUNT = 26;

/** 값이 없는 칸 — 데이터가 없는 것과 화면이 깨진 것을 구별한다 */
const DASH = "—";
const dash = (value: string) => (value.trim() === "" ? DASH : value);
/** 렌트 금액 열 — 원가·할인·렌트가 셋 다 **원/일 단가**(원본 목록 단위). 판매 행은 값 없음 */
const dayPrice = (value: number | null) =>
  value === null ? DASH : perDay(value);

/**
 * 결제 일시가 선택한 기간 안에 드는지. 시작일 00:00 ~ 종료일 23:59:59 를 포함한다.
 * 공백 구분자는 브라우저별 파싱이 갈려 `T` 로 바꿔 넘긴다.
 */
const inPeriod = (dateText: string, range?: DateRange) => {
  if (!range?.from) return true;
  const at = new Date(dateText.replace(" ", "T"));
  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);
  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);
  return at >= from && at <= to;
};

/* -------------------------------------------------------------------------
 * 정렬 — 원본 표 머리의 ↕ (이용 기간 · 결제 일시 **둘뿐이다**)
 * 둘 다 `YYYY-MM-DD…` 라 문자열 비교가 곧 시간순이다. 판매의 빈 기간은 한쪽 끝에 모인다.
 * ---------------------------------------------------------------------- */
type SortKey = "period" | "date";

interface SortState {
  key: SortKey;
  direction: TableSortDirection;
}

const COMPARATORS: Record<SortKey, (a: Order, b: Order) => number> = {
  period: (a, b) => a.period.localeCompare(b.period),
  date: (a, b) => a.date.localeCompare(b.date),
};

/** **오름 → 내림 → 해제** 3단. 해제하면 기본 순서(결제 최신순)로 돌아간다 */
const nextSort = (
  current: SortState | null,
  key: SortKey,
): SortState | null => {
  if (current?.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
};

export interface OrderReturnListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function OrderReturnListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: OrderReturnListPageProps) {
  const { toast } = useToast();

  /*
   * URL 쿼리(`/orders-return?stat=판매&flow=재반송`)를 초기 조건으로 읽는다(주문 목록과 같은 파라미터).
   * 쿼리 → 필터 변환과 정합성 보정은 도메인이라 `filtersFromQuery` 가 하고,
   * 뼈대는 그 결과를 초기값으로 받기만 한다.
   */
  const [filters, setFilters] = useState<OrderFilters>(() =>
    filtersFromQuery(new URLSearchParams(window.location.search)),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<SortState | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  /** 검색조건 펼침. **기본은 펼침**이다(사용자 결정 2026-10-19 — 원본은 접힘) */
  const [filterOpen, setFilterOpen] = useState(true);

  /* `?preview=loading|empty|refreshing` 으로 데이터 상태를 미리 본다 */
  const dataStatus = asStatus(useSearchParams().get("preview"));

  /** 조건 하나를 바꾼다 — 1페이지로, 선택도 풀린다 */
  const patch = (next: Partial<OrderFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
    setSelected([]);
  };

  /** 유형을 바꾸면 **상태·정렬·선택·페이지가 함께 풀린다**(원본 `setOrderType`) */
  const selectType = (value: string) => {
    patch({ type: value as OrderType, status: "all" });
    setSort(null);
  };

  /** 초기화는 한 곳에서만 — 검색조건과 빈 상태가 서로 다르게 되돌리면 안 된다 */
  const resetFilters = () => {
    patch(EMPTY_FILTERS);
    setSort(null);
  };

  /*
   * 유형을 **뺀** 나머지 조건까지 적용한 결과. 유형 카드의 건수를 여기서 센다
   * (원본 `orderTypeDash` skipType) — 전체 데이터에서 세면 검색을 좁혀도 숫자가 안 변한다.
   */
  const keyword = filters.keyword.trim().toLowerCase();
  const scoped = RETURNS.filter(
    (order) =>
      matchesSeller(order, filters.seller) &&
      (filters.status === "all" || order.status === filters.status) &&
      (keyword === "" ||
        searchValueOf(order, filters.searchField)
          .toLowerCase()
          .includes(keyword)) &&
      inPeriod(order.date, filters.period),
  );

  const matched = scoped.filter((order) => order.type === filters.type);

  /* 정렬은 **페이지를 나누기 전에**, 복사한 뒤 한다(제자리 정렬은 모듈 상수를 바꾼다) */
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

  /* 결과가 줄어 현재 페이지가 범위를 벗어나면 마지막 페이지로 당긴다 */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  /** 머리 체크박스는 **보이는 페이지 단위**다 */
  const pageIds = paged.map((order) => order.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const somePageSelected =
    pageIds.some((id) => selected.includes(id)) && !allPageSelected;
  const selectedOrders = filtered.filter((order) =>
    selected.includes(order.id),
  );

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

  /* 엑셀 — 상품 목록과 같은 규칙·문구. 퍼블은 대상 건수만 알린다 */
  const exportCsv = () => {
    const rows = selectedOrders.length > 0 ? selectedOrders : filtered;
    if (rows.length === 0) {
      toast("다운로드할 데이터가 없습니다");
      return;
    }
    toast(
      selectedOrders.length > 0
        ? `선택한 ${rows.length}건을 내려받았습니다`
        : `조회 결과 ${rows.length}건을 내려받았습니다`,
    );
  };

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
      header={<PageHeader title="반품 목록" />}
    >
      {/*
        유형 대시 — 원본 `chip.dash`. 건수를 보여주면서 그 자체가 유형 필터다.
        **항상 하나가 선택돼 있다**([전체] 없음 · 기본 렌트).
      */}
      <Card>
        <CardBody>
          <StatGrid
            items={TYPE_FILTERS.map((item) => ({
              value: item.value,
              label: item.label,
              count: String(
                scoped.filter((order) => order.type === item.value).length,
              ),
              unit: DASH_UNIT,
            }))}
            selected={filters.type}
            onSelect={selectType}
            ariaLabel="유형별 건수"
            columns={2}
          />
        </CardBody>
      </Card>

      {/*
        검색조건 — **펼친 채로 열리고**(사용자 결정) 접으면 걸린 조건을 요약이 말한다.
        순서는 원본 그대로: 기간(결제일) → 판매자 → 상태 → 검색.
        판매자는 원본의 라디오 + 셀러 지정을 셀렉트 하나로 합쳤다(사용자 결정 2026-10-19).
        ⚠️ 유형은 여기 없다 — 그 축의 입구는 위의 건수 카드 하나뿐이다.
      */}
      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary(filters)}
        onReset={resetFilters}
      >
        <DatePicker
          mode="range"
          aria-label="결제일"
          presets={PERIOD_PRESETS}
          value={filters.period}
          onChange={(next) => patch({ period: next })}
          startPlaceholder="결제일 시작"
          endPlaceholder="결제일 종료"
        />
        {/* 원본 판매자 라디오 + 셀러 지정을 셀렉트 하나로 합쳤다(사용자 결정) */}
        <Select
          className="w-36"
          aria-label="판매자"
          options={SELLER_OPTIONS}
          value={filters.seller}
          onValueChange={(value) => patch({ seller: value })}
        />
        <Select
          className="w-36"
          aria-label="상태"
          options={STATUS_OPTIONS}
          value={filters.status}
          onValueChange={(value) => patch({ status: value })}
        />
        {/* 검색 대상은 한 번에 하나만 훑는다 — 어디서 걸렸는지 결과만 보고 구별할 수 있게 */}
        <Select
          className="w-28"
          aria-label="검색 대상"
          options={SEARCH_FIELDS}
          value={filters.searchField}
          onValueChange={(value) =>
            patch({ searchField: value as OrderSearchField })
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
        /* 고정 구간을 비켜서 스크롤바를 그린다 — 바의 범위 = 실제 스크롤 범위 */
        scrollLeadWidth={FROZEN_LEAD_WIDTH}
        /* 다른 목록 화면과 같은 층(§Card soft) */
        variant="soft"
        /*
          ⚠️ `fill`(남는 높이만큼 표를 늘리기)을 쓰지 않는다 — 큰 화면에서 행 아래가
          비고 가로 스크롤바가 그 빈칸 밑으로 밀려난다(사용자 보고 2026-10-19).
          스크롤바는 마지막 행 바로 아래가 자리다(주문 목록과 같다).
        */
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
            table-fixed 라 폭 지정 필수. 26열이라 px(4px 그리드 유틸)로 준다.
            ⚠️ 앞 7개는 `FROZEN_LEFT` 의 오프셋과 **짝**이다(합 760). 함께 고칠 것.
          */}
          <colgroup>
            <col className="w-13" />
            <col className="w-14" />
            <col className="w-29" />
            <col className="w-36" />
            <col className="w-18" />
            <col className="w-28" />
            <col className="w-52" />
            <col className="w-27" />
            <col className="w-39" />
            <col className="w-27" />
            <col className="w-29" />
            <col className="w-37" />
            <col className="w-32" />
            <col className="w-37" />
            <col className="w-27" />
            <col className="w-54" />
            <col className="w-29" />
            <col className="w-29" />
            <col className="w-29" />
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
              {/* 배지만 들어가는 열은 가운데 (§7-2) — th·td 를 함께 바꾼다 */}
              <TableTh align="center" className={frozenTh(2)}>
                상태
              </TableTh>
              <TableTh className={frozenTh(3)}>주문번호</TableTh>
              <TableTh align="center" className={frozenTh(4)}>
                유형
              </TableTh>
              <TableTh className={frozenTh(5)}>판매자</TableTh>
              {/* 원본 표 머리에서 ↕ 가 붙은 것은 이용 기간·결제 일시 둘뿐이다 */}
              <TableTh
                className={frozenTh(6)}
                sortable
                sortDirection={directionOf("period")}
                onSort={() => toggleSort("period")}
              >
                이용 기간
              </TableTh>
              <TableTh>결제수단</TableTh>
              <TableTh
                sortable
                sortDirection={directionOf("date")}
                onSort={() => toggleSort("date")}
              >
                결제 일시
              </TableTh>
              <TableTh>배송 방법</TableTh>
              <TableTh>택배사</TableTh>
              <TableTh>송장번호</TableTh>
              <TableTh>수거 택배사</TableTh>
              <TableTh>수거 송장번호</TableTh>
              <TableTh>상품코드</TableTh>
              <TableTh>상품명</TableTh>
              <TableTh>렌트 원가</TableTh>
              <TableTh>할인 금액</TableTh>
              <TableTh>렌트가</TableTh>
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
            {/* 로딩은 본문 행만 스켈레톤으로 — 정렬 머리·고정 열을 두 벌로 관리하지 않는다 */}
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
              : paged.map((order, index) => {
                  const statusMeta = STATUS_META[order.status];
                  const typeMeta = TYPE_META[order.type];
                  const isRent = order.type === "rent";
                  return (
                    <TableRow
                      key={order.id}
                      clickable
                      onClick={() =>
                        onNavSelect(`${RETURN_DETAIL_PATH}/${order.id}`)
                      }
                    >
                      <TableTd className={frozenTd(0)}>
                        {/* 같은 주문번호에 처리단위가 여럿일 수 있어 상품명까지 이름에 넣는다 */}
                        <Checkbox
                          size="small"
                          aria-label={`${order.orderNo} ${order.productName} 선택`}
                          checked={selected.includes(order.id)}
                          onChange={() => toggleRow(order.id)}
                        />
                      </TableTd>
                      {/* 조회 결과의 역순 순번 — 필터·정렬을 바꾸면 다시 센다 */}
                      <TableTd className={cn("tabular-nums", frozenTd(1))}>
                        {filtered.length - (start + index)}
                      </TableTd>
                      <TableTd align="center" className={frozenTd(2)}>
                        <Tag tone={statusMeta.tone} dot size="small">
                          {statusMeta.label}
                        </Tag>
                      </TableTd>
                      {/* 원본: 주문번호를 누르면 처리단위별 반품 상세로 간다 */}
                      <TableTd className={frozenTd(3)}>
                        <TextButton
                          onClick={() =>
                            onNavSelect(`${RETURN_DETAIL_PATH}/${order.id}`)
                          }
                        >
                          {order.orderNo}
                        </TextButton>
                      </TableTd>
                      <TableTd align="center" className={frozenTd(4)}>
                        <Tag tone={typeMeta.tone} size="small">
                          {typeMeta.label}
                        </Tag>
                      </TableTd>
                      <TableTd className={frozenTd(5)}>
                        {sellerLabel(order)}
                      </TableTd>
                      <TableTd className={frozenTd(6)}>
                        {isRent ? periodText(order.period) : DASH}
                      </TableTd>
                      <TableTd>{order.payMethod}</TableTd>
                      <TableTd>{ymdhm(order.date)}</TableTd>
                      <TableTd>{order.shipMethod}</TableTd>
                      <TableTd>{dash(order.carrier)}</TableTd>
                      <TableTd>{dash(order.trackingNo)}</TableTd>
                      <TableTd>{dash(order.pickupCarrier)}</TableTd>
                      <TableTd>{dash(order.pickupTrackingNo)}</TableTd>
                      <TableTd>{order.productCode}</TableTd>
                      <TableTd ellipsis>{order.productName}</TableTd>
                      {/* 판매 건은 렌트 금액 세 열이 **모두** 비어 있다(원본 `hasRent`) */}
                      {/* 렌트 금액은 **원/일 단가**다(원본) — 렌트일을 곱한 총액은 상세의 주문 명세가 보인다 */}
                      <TableTd>{dayPrice(order.rentBasePrice)}</TableTd>
                      <TableTd>{dayPrice(order.rentDiscount)}</TableTd>
                      <TableTd>
                        {isRent ? perDay(rentPriceOf(order) ?? 0) : DASH}
                      </TableTd>
                      <TableTd>{order.buyerName}</TableTd>
                      <TableTd ellipsis>{order.buyerId}</TableTd>
                      <TableTd>{order.buyerPhone}</TableTd>
                      <TableTd>{order.receiver}</TableTd>
                      <TableTd>{order.receiverPhone}</TableTd>
                      <TableTd ellipsis>{order.address}</TableTd>
                      <TableTd ellipsis>{dash(order.shipMemo)}</TableTd>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>
    </AppShell>
  );
}
