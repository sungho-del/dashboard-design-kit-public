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
  SegmentedControl,
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
  APPLICATIONS,
  BIZ_TYPE_LABEL,
  commissionError,
  DATE_FIELDS,
  dealKinds,
  DEFAULT_FILTER,
  FILTERS,
  filterSummary,
  HYGIENE_OPTIONS,
  hygieneValue,
  KIND_META,
  PAGE_SIZE,
  PAGE_SIZES,
  rateDraft,
  REVIEW_COPY,
  REVIEW_UNIT,
  REVIEWABLE_STATUS,
  SEARCH_FIELDS,
  STATUS_META,
  ymd,
  ymdhms,
  type Application,
  type ApplicationStatus,
} from "./SellerReviewPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S04 입점 심사 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 목록형 (+ 행 선택 · 일괄 심사)
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 — 임의로 더하지 말 것
 *
 * ```
 * 상태 대시 (승인요청·승인·반려 건수 — **전체 카드 없음**)     ← 원본 StatDash
 * 검색조건 (접힘 + 요약 · 기간 기준+기간 · 검색조건+검색어)   ← 원본 filter/search
 * [ 목록 (총 N건) | 표(선택 체크박스) | 페이지네이션 ]          ← 원본 ListHead + table + foot
 * 선택 일괄 심사 (승인 처리 / 반려 처리)                     ← 원본 목록 머리의 심사 버튼
 * ```
 *
 * ## 원본에 없어서 걷어낸 것들 (되살리지 말 것)
 * - **증감 요약 카드** — 원본 상단 카드는 상태별 **건수**뿐이다
 * - **엑셀 다운로드** — 원본 `EXPORT_SPEC` 에 입점 심사가 없다(2026-10-15 v0.4 대조로 제거)
 * - **행별 심사 버튼** — 원본 v0.4 가 "심사는 상세에서 근거를 보고 내리는 판단"이라 지웠다.
 *   목록의 심사 경로는 **선택 → 일괄 처리** 하나다
 *
 * ## 기획 v0.4 대조로 채운 것 (2026-10-15 — 회원·셀러 관리와 같은 틀)
 * - ✅ **No 는 조회 결과의 역순 순번**(원본 `total - start - i`) — 레코드 번호가 아니다
 * - ✅ **검색조건 접기**(`FilterBar` + 요약) · 「목록 (총 N건)」 머리
 * - ✅ 사업자 열 = **법인/개인**(원본 `s.biz`) · 신청일 초까지 · 승인일·반려일 정렬
 * - ✅ 상태 카드를 바꾸면 **정렬·선택·페이지**가 함께 풀린다(원본 `subnav`)
 * - ✅ 승인 창 제목·본문·경고, 반려 창 제목·자리표시자·안내, 1건/여러 건 알림 — v0.4 문구
 * - ✅ 처리는 **토스트만**(퍼블 범위) — 행의 상태·처리일·건수를 화면에서 바꾸지 않는다.
 *   원본처럼 처리 뒤 선택을 풀고 제자리에 둔다(탭 이동 없음)
 * - ✅ 페이지당 10·20·50·100 · 샘플 v0.4 14건
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 1. **일괄 심사를 `SelectionBar`(§25)로 낸다** — 원본은 목록 머리의 버튼이다. 선택이 있어야만
 *    의미가 있는 버튼이라 §25 가 이 자리다. 그래서 원본의 "선택된 항목이 없습니다." 는 필요가 없다
 * 2. **승인요청 건만 고를 수 있다** — 원본은 모든 행에 체크가 되지만, 이미 처리된 건을
 *    다시 승인·반려할 근거가 없다(`REVIEWABLE_STATUS`)
 * 3. **승인 창에서 셀러별 수수료율·위생인증을 확정한다** — 원본 v0.4 는 문구만 있는 확인 창이지만,
 *    개발 앱의 승인 계약이 셀러마다 두 값을 받고 상세 승인과 같은 규칙이어야 한다(2026-10-15 사용자 결정)
 * 4. **빈 반려 사유는 입력칸 아래 오류로 알린다** — 원본은 토스트. 회원 사유 창과 같은 모양이다
 * 5. **검색조건은 입력 즉시 적용**이다(원본은 [검색]) — 건수 카드와 목록이 같은 조건을 말해야 한다
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./SellerReviewPage.data.ts` 에 있다
 * ====================================================================== */

/**
 * 기준 날짜가 선택한 기간 안에 드는지.
 *
 * `"YYYY-MM-DD HH:mm:ss"` 의 공백 구분자는 브라우저별 파싱이 갈려 `T` 로 바꾼다.
 * 시작일은 00:00, 종료일은 23:59:59 까지 포함한다.
 *
 * ⚠️ 값이 **없는** 행(승인되지 않은 건의 승인일)은 기간을 걸면 **빠진다.**
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

/* -------------------------------------------------------------------------
 * 정렬 — 원본 헤더의 ↕ : 신청일 · [승인일] · [반려일] (그 탭에서만 열이 있다)
 * ---------------------------------------------------------------------- */

type SortKey = "date" | "approvedAt" | "rejectedAt";

interface SortState {
  key: SortKey;
  direction: TableSortDirection;
}

const COMPARATORS: Record<SortKey, (a: Application, b: Application) => number> =
  {
    date: (a, b) => a.date.localeCompare(b.date),
    approvedAt: (a, b) =>
      (a.approvedAt ?? "").localeCompare(b.approvedAt ?? ""),
    rejectedAt: (a, b) =>
      (a.rejectedAt ?? "").localeCompare(b.rejectedAt ?? ""),
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

/** 승인 창에서 운영자가 확정해 나가는 값. 입력 중이라 수수료율은 문자열이다 */
interface GateDraft {
  rate: string;
  hygiene: string;
}

/**
 * 열 폭 — **원본 어드민의 컬럼 정의(`minWidth`)** 를 4px 격자로 옮긴 값(§DESIGN.md §7-2).
 * 승인일·반려일은 상호배타라 그 자리 하나만 끼어든다.
 * ⚠️ 신청일만 넓은 것은 **이 화면에서 유일하게 초까지 찍기 때문**이다.
 */
const colgroup = (withProcessedAt: boolean) => (
  <colgroup>
    <col className="w-12" />
    <col className="w-16" />
    <col className="w-35" />
    <col className="w-23" />
    <col className="w-33" />
    <col className="w-28" />
    <col className="w-20" />
    <col className="w-44" />
    {withProcessedAt ? <col className="w-28" /> : null}
    <col className="w-25" />
  </colgroup>
);

/** 로딩 자리의 셀 폭 — 실제 값의 글자 수에 가깝게 둬야 도착했을 때 덜 튄다 */
const SKELETON_WIDTHS = [
  "w-4",
  "w-6",
  "w-28",
  "w-16",
  "w-24",
  "w-16",
  "w-10",
  "w-36",
  "w-14",
];

/** 로딩 뼈대 — 헤더는 실제 글자, 본문만 가린다(§D8-1) */
const loadingTable = (
  <Table>
    {colgroup(false)}
    <TableHead sticky>
      <TableRow>
        <TableTh aria-label="선택" />
        <TableTh>No</TableTh>
        <TableTh>셀러명</TableTh>
        <TableTh>대표명</TableTh>
        <TableTh>연락처</TableTh>
        <TableTh align="center">유형</TableTh>
        <TableTh>사업자</TableTh>
        <TableTh>신청일</TableTh>
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
 * 반려 사유 창 — 원본 `_MODAL_CFG.reject`. **목록 일괄과 상세가 같은 창을 쓴다.**
 * 빈 사유(공백만 포함)는 처리하지 않고 이유를 낸다. 닫거나 처리하면 적던 사유를 비운다.
 */
export function ReviewRejectModal({
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
        /* 푸터에도 "취소"가 있어 헤더 X 의 기본 라벨과 겹친다 — 이름을 갈라 준다 */
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

export interface SellerReviewPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function SellerReviewPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerReviewPageProps) {
  const { toast } = useToast();

  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<SortState | null>(null);

  /* 실 API 를 붙이면 이 한 줄을 fetch 상태로 바꾼다 (`/seller-review?preview=loading`) */
  const status = asStatus(useSearchParams().get("preview"));
  const [dateField, setDateField] = useState(DATE_FIELDS[0].value);
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  /** 검색조건 펼침. **기본은 펼침**이다(사용자 결정 2026-10-19 — 원본은 접힘) */
  const [filterOpen, setFilterOpen] = useState(true);

  /** 고른 행 — 신청번호로 든다(인덱스로 들면 정렬·필터가 바뀌는 순간 다른 건이 골라진다) */
  const [selected, setSelected] = useState<string[]>([]);

  /** 입점 심사 상세로 이동 — 원본의 "셀러명 클릭 → `/seller-review/{id}`" */
  const openDetail = (application: Application) =>
    onNavSelect(`/seller-review/${encodeURIComponent(application.id)}`);

  /* 심사 창 — 어떤 처리인지와 대상이 무엇인지를 함께 들고 있는다 */
  const [reviewMode, setReviewMode] = useState<"approve" | "reject" | null>(
    null,
  );
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, GateDraft>>({});
  const [rateError, setRateError] = useState(false);

  const searchAxis =
    SEARCH_FIELDS.find((field) => field.value === searchField) ??
    SEARCH_FIELDS[0];

  /* 기간 기준도 같은 방식이다 — 뼈대는 "신청일"이라는 말을 모른다 */
  const dateAxis =
    DATE_FIELDS.find((field) => field.value === dateField) ?? DATE_FIELDS[0];

  /*
   * 상태를 **뺀** 나머지 조건으로 좁힌 집합. 상태별 건수를 여기서 센다.
   * 이미 상태로 좁힌 결과에서 세면 하나를 고르는 순간 나머지가 전부 0 이 된다.
   */
  const scoped = APPLICATIONS.filter((item) => {
    const matchKeyword =
      keyword.trim() === "" || searchAxis.pick(item).includes(keyword.trim());
    return matchKeyword && inPeriod(dateAxis.pick(item), period);
  });

  const matched = scoped.filter((item) => item.status === filter);

  /* 정렬은 페이지를 나누기 전에 — `APPLICATIONS` 가 모듈 상수라 복사한 뒤 정렬한다 */
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

  /* 원본 상태 대시(`StatDash`) — 건수를 보여주면서 그 자체가 상태 필터다 */
  const dash = FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count: scoped.filter((row) => row.status === item.value).length,
    /* 원본 `STAT_TIP` — 설명과 다음 단계 */
    tip: STATUS_META[item.value as ApplicationStatus].description,
  }));

  /**
   * 상태 카드를 바꾸면 **정렬·선택·페이지가 함께 풀린다**(원본 `subnav`).
   * 다른 탭에서 고른 건이 일괄 바에 남아 있으면 보이지 않는 건을 처리하게 된다.
   */
  const selectStatus = (value: string) => {
    setFilter(value);
    setPage(1);
    setSort(null);
    setSelected([]);
  };

  /* 승인일·반려일은 **그 상태로 좁혔을 때만** 열이 붙는다(원본과 같다) */
  const showApprovedAt = filter === "approved";
  const showRejectedAt = filter === "rejected";

  /* 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다 — 마지막 페이지로 당긴다 */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  /* 심사할 수 있는 것은 승인요청 건뿐이다 — 선택 가능 여부가 여기서 갈린다 */
  const reviewable = paged.filter((item) => item.status === REVIEWABLE_STATUS);
  const selectedOnPage = reviewable.filter((item) =>
    selected.includes(item.id),
  );
  const allSelected =
    reviewable.length > 0 && selectedOnPage.length === reviewable.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;

  /** 머리글 체크박스는 **이 페이지의 심사 가능한 행**만 고르고 푼다 */
  const toggleAll = () => {
    const ids = reviewable.map((item) => item.id);
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

  /* 초기화는 **한 곳에서만 정의한다** — 선택까지 함께 비운다 */
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

  /** 검색 조건이 바뀌면 1페이지로 — 보던 페이지가 새 결과에 없을 수 있다 */
  const changed =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  /**
   * 대상 행들 — 창을 열 때 **자격을 다시 거른다.** 고른 뒤 조건이 바뀌어도
   * 승인요청이 아닌 건이 창에 들어가지 않는다.
   */
  const pending = APPLICATIONS.filter(
    (item) => pendingIds.includes(item.id) && item.status === REVIEWABLE_STATUS,
  );

  const openReview = (mode: "approve" | "reject") => {
    const targets = APPLICATIONS.filter(
      (item) => selected.includes(item.id) && item.status === REVIEWABLE_STATUS,
    );
    setPendingIds(targets.map((item) => item.id));
    setRateError(false);
    /* 승인 창의 첫 값 — 신청 단계의 0% 는 "아직 정하지 않음"이라 빈 칸으로 연다 */
    setDrafts(
      Object.fromEntries(
        targets.map((item) => [
          item.id,
          {
            rate: rateDraft(item),
            hygiene: hygieneValue(item.hygieneCertified),
          },
        ]),
      ),
    );
    setReviewMode(mode);
  };

  const closeReview = () => {
    setReviewMode(null);
    setPendingIds([]);
    setDrafts({});
    setRateError(false);
  };

  /** 처리 뒤 — 알리고 선택을 푼다. **행은 바꾸지 않는다**(퍼블 범위 · 원본은 제자리) */
  const finish = (message: string, tone?: "critical") => {
    /* 반려는 비정상 종료라 알림도 critical 이다(이전과 같다) */
    toast(tone ? { message, tone } : message);
    setSelected((current) => current.filter((id) => !pendingIds.includes(id)));
    closeReview();
  };

  /** 승인 — **모든 셀러의 수수료율이 통과해야** 처리한다(하나라도 틀리면 아무것도 하지 않는다) */
  const applyApprove = () => {
    if (pending.some((item) => commissionError(drafts[item.id]?.rate ?? ""))) {
      setRateError(true);
      return;
    }
    finish(REVIEW_COPY.approved(pending.length));
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
      header={<PageHeader title="입점 심사" />}
    >
      {/*
        상태 대시 — 원본 `StatDash`. 건수를 보여주면서 그 자체가 상태 필터다.
        흰 카드(그룹) 안에 연한 그레이 상자(항목)들이 들어간다.
      */}
      <Card variant="soft" aria-busy={isBusy(status)}>
        <CardBody className={dimWhile(status)}>
          <StatGrid
            items={dash.map((item) => ({
              value: item.value,
              label: item.label,
              count: item.count.toLocaleString("ko-KR"),
              unit: REVIEW_UNIT,
              tip: item.tip,
            }))}
            selected={filter}
            onSelect={selectStatus}
            ariaLabel="심사 상태"
            columns={4}
          />
        </CardBody>
      </Card>

      {/*
        검색조건 — 원본 `filter` · `search`. **접힌 채로 열리고** 걸린 조건은 요약이 말한다.
        입력 즉시 적용이다(회원·셀러 관리와 같다).
      */}
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
        {/* 기간 기준은 **신청일 / 승인일 / 반려일 세 축**이다(원본 `date.fields`) */}
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

      {/* 심사 목록 — DataTableShell 이 §7-1 셸 구조를 책임진다 */}
      <DataTableShell
        variant="soft"
        /* 남는 세로 공간을 표가 흡수한다 — 페이지네이션은 셸 맨 아래에 붙는다 */
        fill
        className="flex-1"
        bodyClassName={dimWhile(status)}
        isLoading={status === "loading"}
        loading={loadingTable}
        toolbarStart={
          /* 원본 `ListHead` 의 "목록 (총 N건)" — 회원·셀러 목록과 같은 자리·같은 글자 */
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        isEmpty={status === "empty" || filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title="해당 조건의 신청이 없습니다"
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
              /* 원본 표 하단의 페이지당 개수 셀렉트. 바꾸면 1페이지로 돌아간다 */
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
                {/*
                  전체 선택은 **현재 페이지의 심사 가능한 행**만 고른다.
                  `Checkbox` 는 루트가 이미 `<label>` 이라 `FormField` 로 감싸지 않는다.
                */}
                <Checkbox
                  size="small"
                  aria-label="전체 선택"
                  checked={allSelected}
                  indeterminate={someSelected}
                  disabled={reviewable.length === 0}
                  onChange={toggleAll}
                />
              </TableTh>
              {/*
                원본 표의 첫 열 — **조회 결과의 역순 순번**(`total - start - i`)이다.
                레코드 번호가 아니라서 필터·정렬을 바꾸면 다시 센다.
              */}
              <TableTh>No</TableTh>
              <TableTh>셀러명</TableTh>
              <TableTh>대표명</TableTh>
              <TableTh>연락처</TableTh>
              <TableTh align="center">유형</TableTh>
              <TableTh>사업자</TableTh>
              <TableTh
                sortable
                sortDirection={directionOf("date")}
                onSort={() => toggleSort("date")}
              >
                신청일
              </TableTh>
              {showApprovedAt ? (
                <TableTh
                  sortable
                  sortDirection={directionOf("approvedAt")}
                  onSort={() => toggleSort("approvedAt")}
                >
                  승인일
                </TableTh>
              ) : null}
              {showRejectedAt ? (
                <TableTh
                  sortable
                  sortDirection={directionOf("rejectedAt")}
                  onSort={() => toggleSort("rejectedAt")}
                >
                  반려일
                </TableTh>
              ) : null}
              <TableTh align="center">상태</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((item, index) => {
              const status = STATUS_META[item.status];
              const selectable = item.status === REVIEWABLE_STATUS;
              return (
                <TableRow
                  key={item.id}
                  clickable
                  onClick={() => openDetail(item)}
                >
                  <TableTd align="center">
                    <Checkbox
                      size="small"
                      aria-label={`${item.name} 선택`}
                      checked={selected.includes(item.id)}
                      disabled={!selectable}
                      onChange={() => toggleOne(item.id)}
                    />
                  </TableTd>
                  <TableTd className="tabular-nums">
                    {filtered.length - (currentPage - 1) * pageSize - index}
                  </TableTd>
                  {/* 원본에서 셀러명은 `/seller-review/{id}` 로 가는 링크다 */}
                  <TableTd>
                    <TextButton
                      className="max-w-full"
                      onClick={() => openDetail(item)}
                    >
                      <span className="truncate">{item.name}</span>
                    </TextButton>
                  </TableTd>
                  <TableTd>{item.ceo}</TableTd>
                  <TableTd className="tabular-nums">{item.phone}</TableTd>
                  <TableTd align="center">
                    {/*
                      유형은 분류다 — 상태색을 쓰지 않는다.
                      `전체` 신청은 렌트·판매 **두 배지**로 편다(원본과 같다).
                    */}
                    <span className="flex flex-wrap items-center justify-center gap-1">
                      {dealKinds(item.kind).map((kind) => (
                        <Tag key={kind} tone={KIND_META[kind].tone}>
                          {KIND_META[kind].label}
                        </Tag>
                      ))}
                    </span>
                  </TableTd>
                  <TableTd>{BIZ_TYPE_LABEL[item.bizType]}</TableTd>
                  {/* 신청일만 초까지 낸다 — 같은 날 접수 순서가 곧 심사 순서다 */}
                  <TableTd className="tabular-nums">
                    {ymdhms(item.date)}
                  </TableTd>
                  {showApprovedAt ? (
                    <TableTd className="tabular-nums">
                      {ymd(item.approvedAt)}
                    </TableTd>
                  ) : null}
                  {showRejectedAt ? (
                    <TableTd className="tabular-nums">
                      {ymd(item.rejectedAt)}
                    </TableTd>
                  ) : null}
                  <TableTd align="center">
                    <Tag tone={status.tone} dot>
                      {status.label}
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
        label="선택한 신청 일괄 심사"
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

      {/*
        승인 창 — 원본 `gateApprove` 의 제목·본문·경고 + **셀러별 수수료율·위생인증 확정**(우리 추가).
        승인과 동시에 셀러가 입점으로 바뀌므로 두 값이 정해져 있어야 한다.
      */}
      <Modal open={reviewMode === "approve"} onClose={closeReview} size="large">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={REVIEW_COPY.approveTitle(pending.length)}
        />
        <ModalBody>
          <p className="body-medium text-text">{REVIEW_COPY.approveBody}</p>
          <p className="body-small text-text-sub">{REVIEW_COPY.approveRates}</p>
          <ul className="flex flex-col gap-3">
            {pending.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <span className="label-medium-bold min-w-0 flex-1 truncate text-text">
                  {item.name}
                </span>
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  aria-label={`${item.name} 수수료율`}
                  value={drafts[item.id]?.rate ?? ""}
                  invalid={
                    rateError && !!commissionError(drafts[item.id]?.rate ?? "")
                  }
                  onChange={(event) => {
                    /* 원본과 같이 숫자와 소수점만 남긴다 */
                    const next = event.target.value.replace(/[^0-9.]/g, "");
                    setDrafts((current) => ({
                      ...current,
                      [item.id]: {
                        rate: next,
                        hygiene: current[item.id]?.hygiene ?? "none",
                      },
                    }));
                  }}
                  rightIcon={
                    <span className="body-medium text-text-sub">%</span>
                  }
                />
                {/* 같은 컨트롤이 여러 벌이라 셀러명을 붙여 구별한다 */}
                <SegmentedControl
                  className="shrink-0"
                  aria-label={`${item.name} 위생인증`}
                  items={HYGIENE_OPTIONS}
                  value={drafts[item.id]?.hygiene ?? "none"}
                  onValueChange={(value) =>
                    setDrafts((current) => ({
                      ...current,
                      [item.id]: {
                        rate: current[item.id]?.rate ?? "",
                        hygiene: value,
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
          {rateError ? (
            <p role="alert" className="body-small text-text-critical">
              {REVIEW_COPY.rateError}
            </p>
          ) : null}
          <p className="body-small-bold text-text-critical">
            {REVIEW_COPY.approveWarning}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="large" onClick={closeReview}>
            취소
          </Button>
          <Button size="large" onClick={applyApprove}>
            {REVIEW_COPY.approveConfirm}
          </Button>
        </ModalFooter>
      </Modal>

      <ReviewRejectModal
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
