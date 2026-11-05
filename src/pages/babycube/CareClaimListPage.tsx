import { useState } from "react";
import { Check, Search, X } from "lucide-react";
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
  FormField,
  Gnb,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
  Select,
  SelectionBar,
  SelectionBarButton,
  Skeleton,
  StatGrid,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  Textarea,
  TextButton,
  useToast,
  type DateRange,
  type TableSortDirection,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { PERIOD_PRESETS } from "../../lib/periodPresets";
import { useSearchParams } from "../../lib/router";
import {
  CLAIM_ROWS,
  DATE_FIELDS,
  DEFAULT_FILTER,
  FILTERS,
  filterSummary,
  inspectionMetaOf,
  PAGE_SIZE,
  PAGE_SIZES,
  REVIEW_COPY,
  REVIEW_UNIT,
  REVIEWABLE_STATUS,
  SEARCH_FIELDS,
  STATUS_META,
  sumAmount,
  won,
  ymd,
  type CareClaimRow,
} from "./CareClaimListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S14 안심케어 승인 (BabyCube 본사 운영 어드민) — 뼈대
 * 기준 기획: v0.4 `SCREENS.careClaims`(proto.html 3175~3195) — 입점 심사(`SellerReviewPage`)와 같은 틀
 *
 * ## 화면 유형: 목록형 (+ 행 선택 · 일괄 심사)
 *
 * ```
 * 상태 대시 (청구 접수 · 승인 · 반려 건수 — **전체 카드 없음**, 기본 청구 접수)  ← 원본 chipStatDash
 * 검색조건 (기본 펼침 · 기간 기준+빠른 선택+기간 · 검색조건+검색어)               ← 원본 filterBar
 * [ 목록 (총 N건) | 표(접수 건만 선택 · No · 복원비↕ 청구일↕) | 페이지 ]           ← 원본 listHead + table
 * 선택 일괄 심사 (승인 처리 / 반려 처리)                                         ← 원본 목록 머리의 심사 버튼
 * ```
 * 행 어디를 눌러도(주문번호 글자 포함) 상세 `/care-claims/{처리단위}` 로 간다. 체크박스는 이동하지 않는다.
 *
 * ## 갈아끼울 것 → `./CareClaimListPage.data.ts` (이 파일은 도메인을 모른다)
 * 표 열 구성은 이 파일의 `colgroup` + `TableHead` + 본문 셀이다(셋이 짝이다).
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `inPeriod` · 3단 정렬(오름→내림→해제) · 상태 카드를 바꾸면 정렬·선택·페이지 해제(원본 `subnav`) ·
 * 페이지 범위 클램프 · `?preview=loading|empty|refreshing` · 승인/반려 창(`CareApproveModal`·`CareRejectModal`,
 * **상세와 공용**)
 *
 * ## 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * - **엑셀 다운로드** — 원본 `EXPORT_SPEC` 에 안심케어가 없다
 * - **[전체] 상태 카드** · 「1~100건」 상한 문구 — v0.4 에 없다
 *
 * ## 원본과 다르게 둔 곳 (근거)
 * 1. **일괄 심사를 `SelectionBar`(§25)로** — 원본은 목록 머리의 [승인 처리][반려 처리] 버튼.
 *    입점 심사·회원·상품 목록과 같은 처리다. 그래서 원본의 "선택된 항목이 없습니다." 가 필요 없다
 * 2. **청구 접수 건만 고를 수 있다**(정산 기능표) — 원본은 모든 행을 고르고 제출 때 거른다.
 *    그래서 "청구 접수 상태인 건만 심사할 수 있습니다." 도 필요 없다(창을 열 때 자격을 다시 거른다)
 * 3. **빈 반려 사유는 입력칸 아래 오류**(원본은 토스트) — 입점 심사와 같다
 * 4. **검색조건은 입력 즉시 적용 · 기본 펼침**(원본은 [검색] · 접힘) — 형제 화면 결정
 * 5. **처리는 토스트만**(퍼블 범위) — 상태·처리일·건수를 바꾸지 않는다. 처리 뒤 선택만 푼다(원본과 같다)
 * 6. **열은 왼쪽 정렬**(판정·상태만 가운데) — 원본은 대부분 가운데. 전 화면 결정(HANDOFF §0-AB)
 * ====================================================================== */

/**
 * 기준 날짜가 선택한 기간 안에 드는지. 시작일 00:00 ~ 종료일 23:59:59.
 * ⚠️ 값이 **없는** 행(승인되지 않은 건의 승인일)은 기간을 걸면 빠진다.
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

/* 정렬 — 원본 `sortHead` : 복원비 · 청구일 (둘뿐이다) */
type SortKey = "amount" | "claimedAt";

interface SortState {
  key: SortKey;
  direction: TableSortDirection;
}

const COMPARATORS: Record<
  SortKey,
  (a: CareClaimRow, b: CareClaimRow) => number
> = {
  amount: (a, b) => a.amount - b.amount,
  claimedAt: (a, b) => a.claimedAt.localeCompare(b.claimedAt),
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

/**
 * 열 폭 — 원본 열 정의를 4px 격자로 옮긴 값.
 * 선택 · No · 주문번호 · 셀러 · 상품 · 검수 판정 · 복원비 · 청구일 · [승인일|반려일] · 상태.
 * 승인일·반려일은 상호배타라 자리 하나만 끼어든다.
 */
/*
  열 폭 — 실제 글자 폭 + 좌우 여백 24(No·셀러·검수 판정·복원비를 글자만큼) · 남는 폭은 상품.
  합 964(체크박스 칸은 실제 52) — 1280 카드 안쪽 폭(976)에 상태 열까지 들어간다. 승인일·반려일 열이 붙는 탭은 1080 이라
  1280 에서는 표 안에서만 가로로 민다(1440 은 다 보인다)
*/
const colgroup = (withDecidedAt: boolean) => (
  <colgroup>
    <col className="w-12" />
    <col className="w-12" />
    <col className="w-36" />
    <col className="w-24" />
    <col className="w-49" />
    <col className="w-28" />
    <col className="w-24" />
    <col className="w-28" />
    {withDecidedAt ? <col className="w-28" /> : null}
    <col className="w-28" />
  </colgroup>
);

const SKELETON_WIDTHS = [
  "w-4",
  "w-6",
  "w-28",
  "w-16",
  "w-36",
  "w-20",
  "w-14",
  "w-20",
  "w-14",
];

/** 로딩 뼈대 — 머리는 실제 글자, 본문만 가린다(§D8-1) */
const loadingTable = (
  <Table>
    {colgroup(false)}
    <TableHead sticky>
      <TableRow>
        <TableTh aria-label="선택" />
        <TableTh>No</TableTh>
        <TableTh>주문번호</TableTh>
        <TableTh>셀러</TableTh>
        <TableTh>상품</TableTh>
        <TableTh align="center">검수 판정</TableTh>
        <TableTh>복원비</TableTh>
        <TableTh>청구일</TableTh>
        <TableTh align="center">상태</TableTh>
      </TableRow>
    </TableHead>
    <TableBody>
      {Array.from({ length: PAGE_SIZE }, (_, row) => (
        <TableRow key={row}>
          {SKELETON_WIDTHS.map((width, cell) => (
            <TableTd key={cell}>
              <span className="body-small block">
                <Skeleton className={width} />
              </span>
            </TableTd>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

/**
 * 승인 확인 창 — 원본 `gateApprove`(kind care). 사유 없는 확인(되돌릴 수 없는 처리).
 * **목록 일괄과 상세가 같은 창을 쓴다.** 합계는 호출부가 데이터(`sumAmount`)로 낸 값이다.
 */
export function CareApproveModal({
  count,
  amount,
  open,
  onClose,
  onConfirm,
}: {
  count: number;
  amount: number;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} size="small">
      <ModalHeader
        /* 푸터에도 "취소"가 있어 헤더 X 의 기본 라벨과 겹친다 — 이름을 갈라 준다 */
        closeLabel="대화상자 닫기"
        title={REVIEW_COPY.approveTitle(count)}
      />
      <ModalBody>
        <p className="body-medium text-text">
          {REVIEW_COPY.approveBody(amount)}
        </p>
        <p className="body-small-bold text-text-critical">
          {REVIEW_COPY.approveWarning}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={onClose}>
          취소
        </Button>
        <Button size="large" onClick={onConfirm}>
          {REVIEW_COPY.approveConfirm}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * 반려 사유 창 — 원본 `_MODAL_CFG.carereject`. **목록 일괄과 상세가 같은 창을 쓴다.**
 * 사유는 trim 후 필수 — 빈 사유는 처리하지 않고 입력칸 아래에 이유를 낸다. 닫거나 처리하면 비운다.
 */
export function CareRejectModal({
  count,
  open,
  onClose,
  onConfirm,
}: {
  count: number;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);

  const clear = () => {
    setReason("");
    setTried(false);
  };

  const close = () => {
    clear();
    onClose();
  };

  const submit = () => {
    if (reason.trim() === "") {
      setTried(true);
      return;
    }
    clear();
    onConfirm();
  };

  return (
    <Modal open={open} onClose={close} size="small">
      <ModalHeader
        closeLabel="대화상자 닫기"
        title={REVIEW_COPY.rejectTitle(count)}
      />
      <ModalBody>
        <FormField
          label="반려 사유"
          required
          error={
            tried && reason.trim() === "" ? REVIEW_COPY.rejectEmpty : undefined
          }
        >
          <Textarea
            minRows={4}
            value={reason}
            placeholder={REVIEW_COPY.rejectPlaceholder}
            onChange={(event) => setReason(event.target.value)}
          />
        </FormField>
        <p className="body-small text-text-sub">{REVIEW_COPY.rejectNote}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={close}>
          취소
        </Button>
        <Button variant="critical" size="large" onClick={submit}>
          {REVIEW_COPY.rejectConfirm}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export interface CareClaimListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function CareClaimListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: CareClaimListPageProps) {
  const { toast } = useToast();

  const [filter, setFilter] = useState<string>(DEFAULT_FILTER);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<SortState | null>(null);

  /* 실 API 를 붙이면 이 한 줄을 fetch 상태로 바꾼다 (`/care-claims?preview=loading`) */
  const status = asStatus(useSearchParams().get("preview"));
  const [dateField, setDateField] = useState(DATE_FIELDS[0].value);
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  /** 검색조건 펼침 — **기본은 펼침**(형제 화면 결정. 원본은 접힘) */
  const [filterOpen, setFilterOpen] = useState(true);

  /** 고른 행 — 처리단위로 든다(인덱스로 들면 정렬·필터가 바뀌는 순간 다른 건이 골라진다) */
  const [selected, setSelected] = useState<string[]>([]);
  const [reviewMode, setReviewMode] = useState<"approve" | "reject" | null>(
    null,
  );
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  /** 상세로 — 원본 「주문번호 클릭 → openDetail('careClaim', u.id)」 */
  const openDetail = (row: CareClaimRow) =>
    onNavSelect(`/care-claims/${encodeURIComponent(row.id)}`);

  const searchAxis =
    SEARCH_FIELDS.find((field) => field.value === searchField) ??
    SEARCH_FIELDS[0];
  const dateAxis =
    DATE_FIELDS.find((field) => field.value === dateField) ?? DATE_FIELDS[0];

  /*
   * 상태를 **뺀** 나머지 조건으로 좁힌 집합 — 상태별 건수를 여기서 센다(원본 `applyFilters(scr,base,[stk])`).
   * 미리보기 `empty` 는 원장이 비었다는 뜻이라 건수도 0 이다.
   */
  const scoped =
    status === "empty"
      ? []
      : CLAIM_ROWS.filter((row) => {
          const matchKeyword =
            keyword.trim() === "" ||
            searchAxis.pick(row).includes(keyword.trim());
          return matchKeyword && inPeriod(dateAxis.pick(row), period);
        });

  const matched = scoped.filter((row) => row.status === filter);

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

  /** 상태 카드를 바꾸면 정렬·선택·페이지가 함께 풀린다(원본 `subnav`) */
  const selectStatus = (value: string) => {
    setFilter(value);
    setPage(1);
    setSort(null);
    setSelected([]);
  };

  /* 승인일·반려일은 **그 상태일 때만** 열이 붙는다(원본) */
  const showApprovedAt = filter === "approved";
  const showRejectedAt = filter === "rejected";

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  /* 고를 수 있는 것은 청구 접수 건뿐이다 */
  const reviewable = paged.filter((row) => row.status === REVIEWABLE_STATUS);
  const selectedOnPage = reviewable.filter((row) => selected.includes(row.id));
  const allSelected =
    reviewable.length > 0 && selectedOnPage.length === reviewable.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;

  /** 머리글 체크박스는 **이 페이지의 심사 가능한 행**만 고르고 푼다 */
  const toggleAll = () => {
    const ids = reviewable.map((row) => row.id);
    setSelected((current) =>
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])],
    );
  };

  const toggleOne = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  /* 초기화는 한 곳에서 — 「청구 접수」로 돌아간다(원본 `resetFilt`) */
  const resetFilters = () => {
    setFilter(DEFAULT_FILTER);
    setDateField(DATE_FIELDS[0].value);
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPeriod(undefined);
    setPage(1);
    setSelected([]);
    setSort(null);
  };

  /** 검색 조건이 바뀌면 1페이지로 */
  const changed =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  /** 창의 대상 — 열 때 **자격을 다시 거른다**(청구 접수만) */
  const pending = CLAIM_ROWS.filter(
    (row) => pendingIds.includes(row.id) && row.status === REVIEWABLE_STATUS,
  );

  const openReview = (mode: "approve" | "reject") => {
    setPendingIds(
      CLAIM_ROWS.filter(
        (row) => selected.includes(row.id) && row.status === REVIEWABLE_STATUS,
      ).map((row) => row.id),
    );
    setReviewMode(mode);
  };

  const closeReview = () => {
    setReviewMode(null);
    setPendingIds([]);
  };

  /** 처리 뒤 — 알리고 선택을 푼다. **행은 바꾸지 않는다**(퍼블 범위) */
  const finish = (message: string, tone?: "critical") => {
    toast(tone ? { message, tone } : message);
    setSelected((current) => current.filter((id) => !pendingIds.includes(id)));
    closeReview();
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
      header={<PageHeader title="안심케어 승인" />}
    >
      {/* 상태 대시 — 건수가 곧 상태 필터다(입점 심사와 같은 모양) */}
      <Card variant="soft" aria-busy={isBusy(status)}>
        <CardBody className={dimWhile(status)}>
          <StatGrid
            items={FILTERS.map((item) => ({
              value: item.value,
              label: item.label,
              count: scoped
                .filter((row) => row.status === item.value)
                .length.toLocaleString("ko-KR"),
              unit: REVIEW_UNIT,
              tip: STATUS_META[item.value].tip,
            }))}
            selected={filter}
            onSelect={selectStatus}
            ariaLabel="청구 상태"
            columns={4}
          />
        </CardBody>
      </Card>

      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary({
          dateLabel: dateAxis.label,
          from: period?.from,
          to: period?.to,
          fieldLabel: searchAxis.label,
          keyword,
        })}
        onReset={resetFilters}
      >
        <Select
          aria-label="기간 기준"
          options={DATE_FIELDS}
          value={dateField}
          onValueChange={changed(setDateField)}
        />
        <DatePicker
          mode="range"
          presets={PERIOD_PRESETS}
          value={period}
          onChange={changed(setPeriod)}
          startPlaceholder={`${dateAxis.label} 시작`}
          endPlaceholder={`${dateAxis.label} 종료`}
        />
        <Select
          aria-label="검색 조건"
          options={SEARCH_FIELDS}
          value={searchField}
          onValueChange={changed(setSearchField)}
        />
        <Input
          placeholder="검색어 입력"
          value={keyword}
          onChange={(event) => changed(setKeyword)(event.target.value)}
          leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        />
      </FilterBar>

      <DataTableShell
        variant="soft"
        fill
        className="flex-1"
        bodyClassName={dimWhile(status)}
        isLoading={status === "loading"}
        loading={loadingTable}
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
            title="해당 조건의 항목이 없습니다"
            description="조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요."
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
          {colgroup(showApprovedAt || showRejectedAt)}
          <TableHead sticky>
            <TableRow>
              <TableTh align="center">
                {/* `Checkbox` 는 루트가 이미 `<label>` 이라 `FormField` 로 감싸지 않는다 */}
                <Checkbox
                  size="small"
                  aria-label="전체 선택"
                  checked={allSelected}
                  indeterminate={someSelected}
                  disabled={reviewable.length === 0}
                  onChange={toggleAll}
                />
              </TableTh>
              {/* 조회 결과의 역순 순번(원본 `total-start-i`) — 레코드 번호가 아니다 */}
              <TableTh>No</TableTh>
              <TableTh>주문번호</TableTh>
              <TableTh>셀러</TableTh>
              <TableTh>상품</TableTh>
              <TableTh align="center">검수 판정</TableTh>
              <TableTh
                sortable
                sortDirection={directionOf("amount")}
                onSort={() => toggleSort("amount")}
              >
                복원비
              </TableTh>
              <TableTh
                sortable
                sortDirection={directionOf("claimedAt")}
                onSort={() => toggleSort("claimedAt")}
              >
                청구일
              </TableTh>
              {showApprovedAt ? <TableTh>승인일</TableTh> : null}
              {showRejectedAt ? <TableTh>반려일</TableTh> : null}
              <TableTh align="center">상태</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((row, index) => {
              const meta = STATUS_META[row.status];
              const inspection = inspectionMetaOf(row.inspection);
              return (
                <TableRow
                  key={row.id}
                  clickable
                  onClick={() => openDetail(row)}
                >
                  <TableTd align="center">
                    <Checkbox
                      size="small"
                      aria-label={`${row.orderNo} 선택`}
                      checked={selected.includes(row.id)}
                      disabled={row.status !== REVIEWABLE_STATUS}
                      onChange={() => toggleOne(row.id)}
                    />
                  </TableTd>
                  <TableTd className="tabular-nums">
                    {filtered.length - (currentPage - 1) * pageSize - index}
                  </TableTd>
                  {/* 원본에서 주문번호는 상세로 가는 링크다 */}
                  <TableTd>
                    <TextButton
                      className="max-w-full"
                      onClick={() => openDetail(row)}
                    >
                      <span className="truncate tabular-nums">
                        {row.orderNo}
                      </span>
                    </TextButton>
                  </TableTd>
                  <TableTd>{row.seller}</TableTd>
                  <TableTd ellipsis>{row.product}</TableTd>
                  <TableTd align="center">
                    <Tag tone={inspection.tone} size="small">
                      {inspection.label}
                    </Tag>
                  </TableTd>
                  <TableTd className="tabular-nums">{won(row.amount)}</TableTd>
                  <TableTd className="tabular-nums">
                    {ymd(row.claimedAt)}
                  </TableTd>
                  {showApprovedAt ? (
                    <TableTd className="tabular-nums">
                      {ymd(row.approvedAt)}
                    </TableTd>
                  ) : null}
                  {showRejectedAt ? (
                    <TableTd className="tabular-nums">
                      {ymd(row.rejectedAt)}
                    </TableTd>
                  ) : null}
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

      {/* 선택 일괄 심사 (§25) — 선택이 있을 때만 떠오른다 */}
      <SelectionBar
        open={selected.length > 0}
        count={selected.length}
        countLabel={(value) => `${value}${REVIEW_UNIT} 선택됨`}
        label="선택한 청구 일괄 심사"
        onClear={() => setSelected([])}
      >
        <SelectionBarButton
          icon={<Check size={16} strokeWidth={1.2} aria-hidden />}
          onClick={() => openReview("approve")}
        >
          승인 처리
        </SelectionBarButton>
        <SelectionBarButton
          icon={<X size={16} strokeWidth={1.2} aria-hidden />}
          onClick={() => openReview("reject")}
        >
          반려 처리
        </SelectionBarButton>
      </SelectionBar>

      <CareApproveModal
        count={pending.length}
        amount={sumAmount(pending)}
        open={reviewMode === "approve"}
        onClose={closeReview}
        onConfirm={() => finish(REVIEW_COPY.approved(pending.length))}
      />

      <CareRejectModal
        count={pending.length}
        open={reviewMode === "reject"}
        onClose={closeReview}
        onConfirm={() =>
          finish(REVIEW_COPY.rejected(pending.length), "critical")
        }
      />
    </AppShell>
  );
}
