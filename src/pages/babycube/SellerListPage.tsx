import { useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  DataTableShell,
  DatePicker,
  EmptyState,
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
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { PERIOD_PRESETS } from "../../lib/periodPresets";
import { useSearchParams } from "../../lib/router";
import {
  DATE_FIELDS,
  DEFAULT_FILTER,
  EMPTY_CELL,
  FILTERS,
  HQ_SUFFIX,
  HYGIENE_BADGE,
  HYGIENE_FILTERS,
  num,
  PAGE_SIZE,
  PAGE_SIZES,
  rate,
  score,
  SEARCH_FIELDS,
  SELLERS,
  SELLER_UNIT,
  STATUS_META,
  ymd,
  type Seller,
  type SellerStatus,
} from "./SellerListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S03 셀러 관리 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 목록형
 * 입점한 셀러의 운영 상태·수수료율·실적(상품수·평점)을 조회하고,
 * 셀러명을 눌러 한 곳을 연다.
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 — 임의로 더하지 말 것
 *
 * ```
 * 상태 대시 (입점·퇴점 처리중·퇴점 건수 — **전체 카드 없음**)  ← 원본 StatDash
 * 검색조건 바 (기간 기준+기간 · 위생인증 · 검색조건+검색어)   ← 원본 filter/chips/search
 * [ 총 N건 · 엑셀 다운로드 | 표 | 페이지네이션 ]              ← 원본 ListHead + table + foot
 * ```
 *
 * ## 원본에 없어서 걷어낸 것들 (되살리지 말 것)
 *
 * - **증감 요약 카드 3장**(전체 입점 셀러/퇴점 처리중/평균 평점 + ±% + 비교 기준).
 *   원본 상단 카드는 상태별 **건수**뿐이고 증감도 비교 기준 문구도 없다
 * - **미리보기 모달의 액션 2종**(수수료율 조정 · 퇴점 처리)과 **퇴점 처리 확인 모달**.
 *   원본 셀러 목록에는 행 액션이 하나도 없다 — 조치는 셀러 상세 화면의 일이다
 * - **상태 세그먼트**. 원본은 `chip.dash: true` 라 상태 축을 **건수 카드로만** 그린다
 * - **PageHeader 도움말 툴팁**. 상태 설명은 원본대로 **대시 카드의 툴팁**으로 내려갔다
 *
 * ## 원본에서 되살린 것 (이전에 빠져 있던 축)
 * - **기간 기준 셀렉트**(원본 `date.fields: [입점일, 퇴점일]`). 기준이 둘이라 원본도
 *   셀렉트를 띄운다. 퇴점일 기준으로 거르면 아직 퇴점하지 않은 셀러는 빠진다
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./SellerListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `SellerListPage.data.ts` **전체**              |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 필터 구성              | `toolbarEnd` 슬롯                              |
 * | 화면 제목              | `PageHeader` 의 `title`                        |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · 퇴점일 열이 붙고 빠지는 두 벌 `colgroup` ·
 * 페이지 범위 클램프 · `inPeriod` 날짜 필터 ·
 * **흰 카드 = 그룹 / 연한 그레이 상자 = 항목** 두 층 · 상자 안 **라벨 좌상단 · 수치 우하단** ·
 * **분류 배지에 상태색을 쓰지 않는** 규칙(위생인증은 highlight 계열) ·
 * 상태 건수를 **상태 필터를 뺀 나머지 조건**에서 세는 규칙(아래 `scoped`)
 *
 * ## 원본 복원 (2026-09-21 · 원본 v0.4 프로토타입 대조)
 * - ✅ **[전체] 카드 제거 · 기본 [입점]** — 원본 `sellers.dash` 가 "목록은 항상 한 상태만
 *   보여준다"고 정책으로 못 박는다. 한때 우리가 [전체]를 넣고 기본값으로 둔 것을 되돌렸다
 * - ✅ **No 열** · **페이지당 개수 셀렉트** · **수수료율 인라인 수정**(원본 `feecell`)
 * - ✅ **정렬 헤더** — 원본이 ↕ 를 붙인 **입점일·상품수·평점** 3열.
 *   옛 주석은 "셀러명·수수료율·입점일·퇴점일·상품수"라고 적고 있었는데 **틀린 기록**이었다
 * - ✅ **기간 빠른 선택** 7종
 *
 * ## 아직 표현하지 못한 것 (미해결)
 * - **검색조건 접기** — 원본은 "조건 없음(전체) + [검색 열기]" 로 접어 둔다.
 *   목록형 27화면이 공유할 패턴이라 공용 부품으로 만들어야 한다(별도 승인 필요)
 * - **고정열**(원본 `frozen`: 셀러명) — 이 표는 가로 스크롤이 나지 않아 아직 불필요
 * - **행 선택 체크박스** — 원본 표에는 열이 있으나 **일괄 액션이 하나도 없다.**
 *   넣으면 눌러도 아무 일 없는 열이 되므로 액션이 생길 때 함께 넣는다
 * - **위생인증의 다중 선택**(원본은 체크박스 칩). 값이 둘뿐이라 3지 택일 셀렉트로 대신했다
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 2. **셀러명이 미리보기 모달을 연다** — 원본은 `/sellers/{id}` 상세로 나가지만
 *    그 화면은 기획서 `gaps` 라 이 배치에 없다
 * 3. **값이 없는 셀을 `-` 로 채운다** — 원본은 빈칸이다. 빈 셀은 "값이 없음"인지
 *    "못 불러왔음"인지 구별되지 않는다
 * ====================================================================== */

/**
 * 기준 날짜가 선택한 기간 안에 드는지.
 *
 * `"YYYY-MM-DD HH:mm"` 형식인데 공백 구분자는 브라우저별 파싱이 갈린다.
 * `T` 로 바꿔 ISO 형태로 만든 뒤 넘긴다. 시작일은 00:00, 종료일은 23:59:59 까지 포함한다.
 *
 * ⚠️ 값이 **없는** 행(퇴점하지 않은 셀러의 퇴점일)은 기간을 걸면 **빠진다.**
 * 기간을 걸지 않았을 때만 통과시킨다 — "퇴점일 7월"로 물었는데 퇴점하지 않은 셀러가
 * 함께 나오면 질문에 대한 답이 아니다.
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

export interface SellerListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/* -------------------------------------------------------------------------
 * 정렬 — 원본 표 헤더의 ↕ 가 붙은 열 (입점일 · 상품수 · 평점)
 *
 * ⚠️ 셀러명·수수료율·퇴점일에는 원본에 ↕ 가 **없다.** 한때 이 파일 주석이
 * "셀러명·수수료율·입점일·퇴점일·상품수"라고 적고 있었는데 원본(v0.4)과 대조하니
 * 틀린 기록이었다(2026-09-21). 원본 헤더가 정본이다.
 * ---------------------------------------------------------------------- */

type SortKey = "date" | "products" | "rating";

interface SortState {
  key: SortKey;
  direction: TableSortDirection;
}

/**
 * 열마다 무엇을 비교하는지. 표는 비교 규칙을 모른다.
 * 입점일은 `"YYYY-MM-DD HH:mm"` 이라 문자열 비교로 시간 순서가 맞는다(자리수 고정).
 */
const COMPARATORS: Record<SortKey, (a: Seller, b: Seller) => number> = {
  date: (a, b) => a.date.localeCompare(b.date),
  products: (a, b) => a.products - b.products,
  rating: (a, b) => a.rating - b.rating,
};

/** 오름 → 내림 → 해제 3단. 해제가 있어야 원래 순서로 돌아갈 수 있다 */
const nextSort = (
  current: SortState | null,
  key: SortKey,
): SortState | null => {
  if (current?.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
};

/**
 * 로딩 뼈대 — 헤더는 실제 글자, 본문만 가린다(§D8-1).
 *
 * 열 폭은 퇴점일이 빠진 기본 배치를 쓴다. 로딩 중에는 어느 상태로 좁혔는지와
 * 무관하게 **한 벌**이면 된다 — 도착하면 그때 열이 정해진다.
 */
const SKELETON_WIDTHS = [
  "w-6",
  "w-28",
  "w-20",
  "w-16",
  "w-24",
  "w-12",
  "w-14",
  "w-20",
  "w-10",
  "w-10",
];

const loadingTable = (
  <Table>
    <colgroup>
      <col className="w-16" />
      <col className="w-35" />
      <col className="w-25" />
      <col className="w-23" />
      <col className="w-33" />
      <col className="w-25" />
      <col className="w-23" />
      <col className="w-28" />
      <col className="w-20" />
      <col className="w-18" />
    </colgroup>
    <TableHead sticky>
      <TableRow>
        <TableTh>No</TableTh>
        <TableTh>셀러명</TableTh>
        <TableTh align="center">위생인증</TableTh>
        <TableTh>대표명</TableTh>
        <TableTh>연락처</TableTh>
        <TableTh align="center">상태</TableTh>
        <TableTh>수수료율</TableTh>
        <TableTh>입점일</TableTh>
        <TableTh>상품수</TableTh>
        <TableTh>평점</TableTh>
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
 * 수수료율 셀 — 원본 `feecell`(숫자 입력 + `%` + [수정] 버튼).
 *
 * ## 본사는 입력 자리를 만들지 않는다
 * 본사 직영은 자기 자신에게 수수료를 매기지 않아 값이 `null` 이다(`-`).
 * 빈 입력칸을 띄우면 "아직 안 정했으니 넣어라"로 읽힌다 — 정할 수 없는 값이다.
 *
 * ## 입력 중인 값은 문자열로 둔다
 * 숫자로 바로 바꾸면 `9.` 처럼 **입력 도중의 상태**를 표현할 수 없다(소수점을 찍는 순간
 * 사라진다). 커밋할 때 한 번만 숫자로 해석한다.
 */
function CommissionCell({
  seller,
  value,
  draft,
  onDraftChange,
  onCommit,
}: {
  seller: Seller;
  value: number | null;
  draft: string | undefined;
  onDraftChange: (next: string) => void;
  onCommit: () => void;
}) {
  if (value === null) return <>{rate(null)}</>;

  return (
    <span className="flex items-center gap-2">
      <Input
        size="small"
        className="w-16"
        inputMode="decimal"
        aria-label={`${seller.name} 수수료율`}
        value={draft ?? String(value)}
        onChange={(event) => onDraftChange(event.target.value)}
        /* Enter 로도 확정된다 — 버튼까지 가지 않고 끝낼 수 있어야 한다 */
        onKeyDown={(event) => {
          if (event.key === "Enter") onCommit();
        }}
      />
      <span className="body-small text-text-sub">%</span>
      {/* 원본 `btn line sm` — 우리의 secondary small 과 같은 자리다 */}
      <Button variant="secondary" size="small" onClick={onCommit}>
        수정
      </Button>
    </span>
  );
}

export function SellerListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerListPageProps) {
  const { toast } = useToast();

  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [hygieneFilter, setHygieneFilter] = useState(HYGIENE_FILTERS[0].value);
  const [dateField, setDateField] = useState(DATE_FIELDS[0].value);
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  /**
   * 셀러 상세로 이동 — 원본의 "셀러명 클릭 → `/sellers/{id}`".
   * 한때 이 자리에 4항목짜리 미리보기 모달이 있었는데, **상세 화면이 생겨** 걷어냈다.
   */
  const openDetail = (seller: Seller) =>
    onNavSelect(`/sellers/${encodeURIComponent(seller.id)}`);
  const [sort, setSort] = useState<SortState | null>(null);

  /*
    수수료율 인라인 수정(원본 `feecell`) — 실 API 를 붙이기 전까지는 화면 안에서만 산다.
    **원본 값을 덮어쓰지 않고 덮개(overlay)로 얹는다** — 초기화·새로고침이 원본으로
    되돌릴 수 있어야 하고, `SELLERS` 는 모듈 상수라 직접 바꾸면 다른 화면까지 오염된다.
  */
  const [commissions, setCommissions] = useState<Record<string, number>>({});
  /** 입력 중인 값(문자열) — 커밋 전까지는 표시용 문자열 그대로 둔다 */
  const [draft, setDraft] = useState<Record<string, string>>({});

  /* 실 API 를 붙이면 이 한 줄을 fetch 상태로 바꾼다 (`/sellers?preview=loading`) */
  const status = asStatus(useSearchParams().get("preview"));

  /* 검색 조건이 "어느 값을 훑을지"를 정한다 — 뼈대는 필드 이름을 모른다 */
  const pick =
    SEARCH_FIELDS.find((field) => field.value === searchField)?.pick ??
    SEARCH_FIELDS[0].pick;

  /* 기간 기준도 같은 방식이다 — 뼈대는 "입점일"이라는 말을 모른다 */
  const dateAxis =
    DATE_FIELDS.find((field) => field.value === dateField) ?? DATE_FIELDS[0];

  /*
   * 상태를 **뺀** 나머지 조건으로 좁힌 집합. 상태별 건수를 여기서 센다.
   * 이미 상태로 좁힌 결과에서 세면 하나를 고르는 순간 나머지가 전부 0 이 되어
   * 대시가 비교할 것을 잃는다.
   */
  const scoped = SELLERS.filter((seller) => {
    const matchHygiene =
      hygieneFilter === "all" ||
      (hygieneFilter === "certified") === seller.hygiene;
    const matchKeyword =
      keyword.trim() === "" || pick(seller).includes(keyword.trim());
    return (
      matchHygiene && matchKeyword && inPeriod(dateAxis.pick(seller), period)
    );
  });

  const matched = scoped.filter((seller) => seller.status === filter);

  /*
    정렬은 **페이지를 나누기 전에** 한다. 복사한 뒤 정렬하는 이유는 `SELLERS` 가
    모듈 상수이기 때문이다 — 제자리 정렬하면 "정렬 해제"가 원래 순서로 못 돌아간다.
  */
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

  /** 지금 화면에 보이는 수수료율 — 수정한 값이 있으면 그것, 없으면 원본 */
  const commissionOf = (seller: Seller) =>
    commissions[seller.id] ?? seller.commission;

  /**
   * 수수료율 커밋. 원본은 셀에서 고치고 [수정] 을 눌러 확정한다.
   * 숫자가 아니거나 범위를 벗어나면 **되돌리고 알린다** — 조용히 버리면
   * 사용자는 고쳐졌다고 믿는다.
   */
  const commitCommission = (seller: Seller) => {
    const raw = draft[seller.id];
    if (raw === undefined) return;

    const value = Number(raw.trim());
    if (!raw.trim() || Number.isNaN(value) || value < 0 || value > 100) {
      setDraft((prev) => {
        const next = { ...prev };
        delete next[seller.id];
        return next;
      });
      toast("수수료율은 0~100 사이의 숫자로 입력해 주세요");
      return;
    }

    setCommissions((prev) => ({ ...prev, [seller.id]: value }));
    setDraft((prev) => {
      const next = { ...prev };
      delete next[seller.id];
      return next;
    });
    toast(`${seller.name} 수수료율을 ${value}% 로 변경했습니다`);
  };

  /*
   * 원본 상태 대시(`StatDash`)가 하던 일 — 상태별 건수를 클릭 없이 보여주고,
   * 카드 자체가 그 상태의 필터가 된다.
   */
  const dash = FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count: scoped.filter((seller) => seller.status === item.value).length,
    /* 원본은 상태 카드마다 `tip`(statusTips)을 달아 뜻을 설명한다 */
    tip: STATUS_META[item.value as SellerStatus].description,
  }));

  const selectStatus = (value: string) => {
    setFilter(value);
    setPage(1);
  };

  /*
   * 퇴점일은 **퇴점이 완료된 셀러만** 값이 있다. 전체 목록에서 열을 세워 두면
   * 거의 모든 행이 `-` 라 열 하나를 통째로 낭비한다 — 원본도 상태 필터가 `퇴점` 일 때만
   * 이 열을 컬럼 배열에 밀어 넣는다. 열 개수가 바뀌므로 `<colgroup>` 도 함께 갈린다.
   */
  const showExitDate = filter === "closed";

  /* 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다 — 마지막 페이지로 당긴다 */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  /* 초기화는 **한 곳에서만 정의한다** — 툴바와 빈 상태가 서로 다르게 되돌리면 안 된다 */
  const resetFilters = () => {
    setFilter(DEFAULT_FILTER);
    setHygieneFilter(HYGIENE_FILTERS[0].value);
    setDateField(DATE_FIELDS[0].value);
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPeriod(undefined);
    setPage(1);
    setSort(null);
    /* 입력하다 만 값은 되돌린다 — 확정한 수수료율(`commissions`)은 남긴다 */
    setDraft({});
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
      header={<PageHeader title="셀러 관리" />}
    >
      {/*
        상태 대시 — 원본 `StatDash`. 건수를 보여주면서 그 자체가 상태 필터다.
        흰 카드(그룹) 안에 연한 그레이 상자(항목) 넷이 들어간다.
      */}
      <Card variant="soft" aria-busy={isBusy(status)}>
        <CardBody className={dimWhile(status)}>
          {/*
            건수 대시 = 필터. 상자의 시각 규격 · 선택/hover 축 분리 · 접근가능 이름
            조립 · 툴팁 분기는 전부 `StatGrid` 가 맡는다 (docs/DESIGN-dashboard.md §D4).
            여기서는 **무엇을 세는지**만 말한다.
          */}
          <StatGrid
            items={dash.map((item) => ({
              value: item.value,
              label: item.label,
              count: num(item.count),
              unit: SELLER_UNIT,
              tip: item.tip,
            }))}
            selected={filter}
            onSelect={selectStatus}
            ariaLabel="셀러 상태"
            columns={4}
          />
        </CardBody>
      </Card>

      {/* 셀러 목록 — DataTableShell 이 §7-1 셸 구조를 책임진다 */}
      <DataTableShell
        variant="soft"
        /* 남는 세로 공간을 표가 흡수한다 — 페이지네이션은 셸 맨 아래에 붙는다 */
        fill
        className="flex-1"
        bodyClassName={dimWhile(status)}
        isLoading={status === "loading"}
        loading={loadingTable}
        toolbarStart={
          /* 원본 `toolsLeft` 는 엑셀 다운로드 하나다 — 툴바 좌측이 그 자리다 */
          <Button
            variant="secondary"
            /*
              내보내기 대상은 화면 전체가 아니라 **지금 조건으로 조회된 결과**다
              (원본도 `셀러관리_N건.csv` 로 저장한다).
            */
            onClick={() =>
              toast(`조회 결과 ${filtered.length}건을 내려받았습니다`)
            }
          >
            <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
            엑셀 다운로드
          </Button>
        }
        toolbarEnd={
          <>
            {/*
              기간 기준은 **입점일 / 퇴점일 두 축**이다(원본 `date.fields`).
              무엇을 고르는 셀렉트인지는 트리거 글자가 아니라 `aria-label` 이 말한다.
            */}
            <Select
              aria-label="기간 기준"
              options={DATE_FIELDS}
              value={dateField}
              onValueChange={(value) => {
                setDateField(value);
                setPage(1);
              }}
            />
            <DatePicker
              mode="range"
              presets={PERIOD_PRESETS}
              value={period}
              onChange={(next) => {
                setPeriod(next);
                setPage(1);
              }}
              startPlaceholder={`${dateAxis.label} 시작`}
              endPlaceholder={`${dateAxis.label} 종료`}
            />
            {/*
              위생인증은 상태와 **다른 축**이라 상태 대시에 섞지 않는다
              (원본도 상태 칩과 별개인 `chips.hygiene` 로 둔다).
            */}
            <Select
              aria-label="위생인증"
              options={HYGIENE_FILTERS}
              value={hygieneFilter}
              onValueChange={(value) => {
                setHygieneFilter(value);
                setPage(1);
              }}
            />
            <Select
              aria-label="검색 조건"
              options={SEARCH_FIELDS}
              value={searchField}
              onValueChange={(value) => {
                setSearchField(value);
                setPage(1);
              }}
            />
            <Input
              placeholder="검색어 입력"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
            />
            <TextButton tone="secondary" onClick={resetFilters}>
              초기화
            </TextButton>
          </>
        }
        isEmpty={status === "empty" || filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title="해당 조건의 셀러가 없습니다"
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
            start={
              /* 원본 `ListHead` 의 "목록 (총 N건)" 과 같은 정보다 */
              <span className="body-small text-text-sub">
                총 {filtered.length}건
              </span>
            }
            end={
              /* 원본 표 하단의 페이지당 개수 셀렉트. 바꾸면 1페이지로 돌아간다 */
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
            table-fixed 라 폭 지정 필수. 한 컬럼만 auto 로 두면 여백을 독식한다.
            퇴점일 열이 붙고 빠지므로 `<col>` 묶음도 두 벌이다.

            폭은 **원본 어드민의 컬럼 정의(`minWidth`)** 를 옮긴 값이다(§DESIGN.md §7-2).
            한때 화면마다 손으로 고른 `%` 였는데, % 는 합이 100 이어야 해서 **열 하나가
            붙고 빠질 때마다 관계없는 열까지 전부 흔들렸다** — 여기 퇴점일이 정확히 그
            경우였다(셀러명 16%↔14%). 이제 퇴점일이 붙어도 나머지는 1px 도 안 움직인다.
            표가 `width:auto; min-width:100%` 라 합이 화면보다 좁으면 비율대로 늘어난다.
          */}
          {showExitDate ? (
            <colgroup>
              <col className="w-16" />
              <col className="w-35" />
              <col className="w-25" />
              <col className="w-23" />
              <col className="w-33" />
              <col className="w-25" />
              <col className="w-23" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-18" />
            </colgroup>
          ) : (
            <colgroup>
              <col className="w-16" />
              <col className="w-35" />
              <col className="w-25" />
              <col className="w-23" />
              <col className="w-33" />
              <col className="w-25" />
              <col className="w-23" />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-18" />
            </colgroup>
          )}
          {/*
            헤더는 표 래퍼 안에서 스크롤될 때 위에 붙는다(`fill` 로 표가 늘어나
            행이 많으면 여기서 세로 스크롤이 생긴다).
          */}
          <TableHead sticky>
            <TableRow>
              {/* 원본 표의 첫 열. 레코드에 붙은 번호라 정렬·필터와 무관하다 */}
              <TableTh>No</TableTh>
              <TableTh>셀러명</TableTh>
              <TableTh align="center">위생인증</TableTh>
              <TableTh>대표명</TableTh>
              <TableTh>연락처</TableTh>
              <TableTh align="center">상태</TableTh>
              {/*
                ⚠️ 수치 열도 **좌측 정렬**이다 — 이 저장소는 회계 관행을 알면서
                좌측을 택했다(§7-2 · §D6-4). 한때 여기 "우측 정렬" 주석이 달려
                있었는데 코드와 어긋난 설명이었다.
              */}
              <TableTh>수수료율</TableTh>
              {/* 원본 헤더에 ↕ 가 붙은 세 열만 정렬한다 */}
              <TableTh
                sortable
                sortDirection={directionOf("date")}
                onSort={() => toggleSort("date")}
              >
                입점일
              </TableTh>
              {showExitDate ? <TableTh>퇴점일</TableTh> : null}
              <TableTh
                sortable
                sortDirection={directionOf("products")}
                onSort={() => toggleSort("products")}
              >
                상품수
              </TableTh>
              <TableTh
                sortable
                sortDirection={directionOf("rating")}
                onSort={() => toggleSort("rating")}
              >
                평점
              </TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((seller) => {
              const status = STATUS_META[seller.status];
              return (
                <TableRow key={seller.id}>
                  <TableTd className="tabular-nums">{seller.no}</TableTd>
                  {/*
                    원본에서 셀러명은 `/sellers/{id}` 로 가는 링크다(`className: "linkish"`).
                    행 전체를 누르게 만들지 않는다 — 원본에 없는 어포던스다.
                  */}
                  <TableTd>
                    <TextButton
                      className="max-w-full"
                      onClick={() => openDetail(seller)}
                    >
                      <span className="truncate">
                        {seller.name}
                        {seller.isHeadquarters ? HQ_SUFFIX : ""}
                      </span>
                    </TextButton>
                  </TableTd>
                  <TableTd align="center">
                    {/*
                      플래그 배지 — "있음"만 붙는다(§3-1). 문구는 원본 그대로 `위생인증셀러`.
                      색은 상태색을 피해 highlight 계열 토큰을 주입받는다.
                    */}
                    {seller.hygiene ? (
                      <Tag
                        tone={HYGIENE_BADGE.tone}
                        style={HYGIENE_BADGE.style}
                      >
                        {HYGIENE_BADGE.label}
                      </Tag>
                    ) : (
                      EMPTY_CELL
                    )}
                  </TableTd>
                  <TableTd>{seller.ceo}</TableTd>
                  <TableTd className="tabular-nums">{seller.phone}</TableTd>
                  <TableTd align="center">
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </TableTd>
                  <TableTd>
                    <CommissionCell
                      seller={seller}
                      value={commissionOf(seller)}
                      draft={draft[seller.id]}
                      onDraftChange={(next) =>
                        setDraft((prev) => ({ ...prev, [seller.id]: next }))
                      }
                      onCommit={() => commitCommission(seller)}
                    />
                  </TableTd>
                  {/* 원본 `ymd` — 날짜만 낸다 */}
                  <TableTd className="tabular-nums">{ymd(seller.date)}</TableTd>
                  {showExitDate ? (
                    <TableTd className="tabular-nums">
                      {ymd(seller.exitDate)}
                    </TableTd>
                  ) : null}
                  {/* 원본 `productCount.toLocaleString("ko-KR")` — 단위를 붙이지 않는다 */}
                  <TableTd className="tabular-nums">
                    {num(seller.products)}
                  </TableTd>
                  <TableTd className="tabular-nums">
                    {score(seller.rating)}
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
