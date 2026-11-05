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
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { PERIOD_PRESETS } from "../../lib/periodPresets";
import { useSearchParams } from "../../lib/router";
import {
  COMMISSION_CELL_COPY,
  COMMISSION_RATE_MESSAGE,
  commissionInput,
  isCommissionLocked,
  DATE_FIELDS,
  DEFAULT_FILTER,
  EMPTY_CELL,
  FILTERS,
  filterSummary,
  HQ_BADGE,
  HYGIENE_BADGE,
  HYGIENE_FILTERS,
  num,
  parseCommissionRate,
  PAGE_SIZE,
  PAGE_SIZES,
  productCount,
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
 * 검색조건 (접힘 + 요약 · 기간 기준+기간 · 위생인증 · 검색조건+검색어) ← 원본 filter/chips/search
 * [ 목록 (총 N건) · 엑셀 다운로드 | 표 | 페이지네이션 ]       ← 원본 ListHead + table + foot
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
 * | 필터 구성              | `FilterBar` 의 자식                            |
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
 * ## 기획 v0.4 대조로 채운 것 (2026-10-15 — 회원 관리와 같은 틀)
 * - ✅ **No 는 조회 결과의 역순 순번**(원본 `total - start - i`) — 레코드 번호가 아니다
 * - ✅ **검색조건 접기**(`FilterBar` + 요약) · 「목록 (총 N건)」 머리 · 엑셀은 오른쪽
 * - ✅ **행 선택 체크박스**(원본 `rowchk`) — 일괄 처리는 없고 **선택분 엑셀**에 쓰인다.
 *   엑셀은 고른 행(지금 조회 결과 안의)이 있으면 그것만, 없으면 조회 결과 전체 — **토스트만**(퍼블 범위)
 * - ✅ 표기: 본사 배지 · 상품수 `N개` · 평점 `★ 4.9` · 상태 카드 단위 `건` · 상태 툴팁 2문장
 * - ✅ 페이지당 10·20·50·100 · 샘플 32곳 · **퇴점일 정렬**([퇴점] 탭)
 * - ✅ 상태 카드를 바꾸면 **정렬·선택·페이지**가 함께 풀린다(원본 `subnav`)
 * - ✅ 수수료율 [수정] 은 **검증 + 토스트만** — 확정 값을 따로 들고 있지 않는다(퍼블 범위)
 *
 * ## 아직 표현하지 못한 것 (미해결)
 * - **고정열**(원본 `frozen`: 셀러명) — 이 표는 가로 스크롤이 나지 않아 아직 불필요
 * - **위생인증의 다중 선택**(원본은 체크박스 칩). 값이 둘뿐이라 3지 택일 셀렉트로 대신했다
 * - 검색어 지우기 ✕ — 지우기·[초기화]로 해제된다
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 1. **값이 없는 셀을 `-` 로 채운다** — 원본은 빈칸이다. 빈 셀은 "값이 없음"인지
 *    "못 불러왔음"인지 구별되지 않는다
 * 2. **검색조건은 입력 즉시 적용**이다(원본은 [검색]·Enter) — 회원 관리와 같은 이유:
 *    건수 카드와 목록이 서로 다른 조건을 말하는 순간을 만들지 않는다
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
 * 퇴점일은 [퇴점] 탭에서만 열이 생기고 그때 ↕ 가 붙는다(원본 `sortHead(scr,"퇴점일","quitAt")`).
 * ⚠️ 셀러명·수수료율에는 원본에 ↕ 가 **없다.** 한때 이 파일 주석이
 * "셀러명·수수료율·입점일·퇴점일·상품수"라고 적고 있었는데 원본(v0.4)과 대조하니
 * 틀린 기록이었다(2026-09-21). 원본 헤더가 정본이다.
 * ---------------------------------------------------------------------- */

type SortKey = "date" | "exitDate" | "products" | "rating";

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
  /* 퇴점일 열은 [퇴점] 탭에만 있다 — 거기서는 모두 값이 있지만 비교기는 `null` 도 견딘다 */
  exitDate: (a, b) => (a.exitDate ?? "").localeCompare(b.exitDate ?? ""),
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
  "w-4",
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

/**
 * 열 폭 — 원본 어드민의 컬럼 정의(`minWidth`)에서 출발해 **실제 글자 폭**으로 다시 나눴다
 * (2026-11-03 UX 검수). 수수료율 열은 112 로 선언돼 있었지만 내용(입력 56 + % + [수정])이
 * 그보다 넓어 실제 163 으로 늘었고, 퇴점일 열이 붙는 퇴점 탭은 1440 에서도 110px 넘쳐
 * 상품수·평점이 가려졌다. 지금 퇴점 탭 합 = **1136**(1440 표 폭) — 1440 은 두 탭 모두 스크롤 없음,
 * 1280 은 표 안에서 가로 스크롤(페이지는 밀리지 않는다).
 *
 * 체크 52(실제 폭) · No 44 · 셀러명 128(긴 이름은 말줄임) · 위생인증 104(배지) · 대표명 72 ·
 * 연락처 132(모든 화면 같음) · 상태 92 · 수수료율 156(실제 내용) · 입점일 100 · [퇴점일 100] ·
 * 상품수 76 · 평점 80(정렬 머리글 아이콘까지). 퇴점일만 끼어들고 나머지는 1px 도 안 움직인다.
 */
const colgroup = (withExitDate: boolean) => (
  <colgroup>
    <col className="w-13" />
    <col className="w-11" />
    <col className="w-32" />
    <col className="w-26" />
    <col className="w-18" />
    <col className="w-33" />
    <col className="w-23" />
    <col className="w-39" />
    <col className="w-25" />
    {withExitDate ? <col className="w-25" /> : null}
    <col className="w-19" />
    <col className="w-20" />
  </colgroup>
);

const loadingTable = (
  <Table>
    {colgroup(false)}
    <TableHead sticky>
      <TableRow>
        <TableTh />
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
 * ## 본사 행도 입력칸이다
 * 본사 행 수수료율은 처음 0%, **수정 가능**하고 본사 행만 0% 이상을 받는다(판정 Q20-1 · Q20-5 ·
 * 디자인 §3 #15 — 2026-10-15 「0% 확정이라 입력 자리를 만들지 않는다」를 풀었다).
 *
 * ## 퇴점 처리중·퇴점 행은 값만 — 입력칸·[수정] 없음
 * 수수료율 읽기 전용(판정 Q8 · `isCommissionLocked`). 재입점하면 다시 입력칸이다.
 * 셀에 안내 줄 자리가 없어 안내 「…바꿀 수 없습니다」는 셀러 상세에만 둔다(기획 확인 요청 32번 답 대기).
 *
 * ## 입력 중인 값은 문자열로 둔다
 * 숫자로 바로 바꾸면 `9.` 처럼 **입력 도중의 상태**를 표현할 수 없다(소수점을 찍는 순간
 * 사라진다). [수정] 할 때 한 번만 숫자로 해석한다.
 */
function CommissionCell({
  seller,
  draft,
  onDraftChange,
  onCommit,
}: {
  seller: Seller;
  draft: string | undefined;
  onDraftChange: (next: string) => void;
  onCommit: () => void;
}) {
  if (isCommissionLocked(seller.status)) return <>{rate(seller.commission)}</>;

  return (
    <span className="flex items-center gap-2">
      <Input
        size="small"
        /* 56 — 「11.5」 네 자가 들어가는 폭. 열 폭(156)이 이 값에 기댄다 */
        className="w-14"
        inputMode="decimal"
        aria-label={`${seller.name} 수수료율`}
        value={draft ?? String(seller.commission)}
        onChange={(event) => onDraftChange(commissionInput(event.target.value))}
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
  /** 고른 행 — 셀러 id 로 든다(인덱스로 들면 정렬·필터가 바뀌는 순간 다른 셀러가 골라진다) */
  const [selected, setSelected] = useState<string[]>([]);
  /** 검색조건 펼침. **기본은 펼침**이다(사용자 결정 2026-10-19 — 원본은 접힘) */
  const [filterOpen, setFilterOpen] = useState(true);

  /**
   * 셀러 상세로 이동 — 원본의 "셀러명 클릭 → `/sellers/{id}`".
   * 한때 이 자리에 4항목짜리 미리보기 모달이 있었는데, **상세 화면이 생겨** 걷어냈다.
   */
  const openDetail = (seller: Seller) =>
    onNavSelect(`/sellers/${encodeURIComponent(seller.id)}`);
  const [sort, setSort] = useState<SortState | null>(null);

  /*
    수수료율 인라인 수정(원본 `feecell`) — **입력 중인 문자열만** 화면에 든다.
    [수정] 은 검증하고 알릴 뿐 확정 값을 따로 보관하지 않는다 — 저장은 개발 영역이다(퍼블 범위).
  */
  const [draft, setDraft] = useState<Record<string, string>>({});

  /* 실 API 를 붙이면 이 한 줄을 fetch 상태로 바꾼다 (`/sellers?preview=loading`) */
  const status = asStatus(useSearchParams().get("preview"));

  const searchAxis =
    SEARCH_FIELDS.find((field) => field.value === searchField) ??
    SEARCH_FIELDS[0];

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
      keyword.trim() === "" || searchAxis.pick(seller).includes(keyword.trim());
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

  /**
   * [수정] — 원본은 셀에서 고치고 [수정] 을 눌러 확정한다.
   * 허용 꼴(0 초과 100 이하 · 소수 둘째 자리)이 아니면 **되돌리고 알린다** — 조용히 버리면
   * 사용자는 고쳐졌다고 믿는다. 맞으면 알리기만 한다(저장은 개발 영역).
   */
  const commitCommission = (seller: Seller) => {
    const raw = draft[seller.id];
    if (raw === undefined) return;

    /* 0 초과 100 이하 · 소수 둘째 자리까지 · 본사 행만 0 이상(판정 Q20-5 · 개발 `parseCommissionRate`) */
    const value = parseCommissionRate(raw, seller.isHeadquarters);
    if (value === null) {
      setDraft((prev) => {
        const next = { ...prev };
        delete next[seller.id];
        return next;
      });
      toast(COMMISSION_RATE_MESSAGE);
      return;
    }

    /* 6~16% 밖이면 막지 않고 알림 뒤에 경고를 붙인다(디자인 §3 #12 · D-217) */
    toast(
      value === seller.commission
        ? COMMISSION_CELL_COPY.unchanged(seller.name, value)
        : COMMISSION_CELL_COPY.saved(seller.name, value, seller.isHeadquarters),
    );
  };

  /*
   * 원본 상태 대시(`StatDash`)가 하던 일 — 상태별 건수를 클릭 없이 보여주고,
   * 카드 자체가 그 상태의 필터가 된다.
   */
  const dash = FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count: scoped.filter((seller) => seller.status === item.value).length,
    /* 원본은 상태 카드마다 `tip`(STAT_TIP)을 달아 뜻과 다음 단계를 설명한다 */
    tip: STATUS_META[item.value as SellerStatus].description,
  }));

  /**
   * 상태 카드를 바꾸면 **정렬·선택·페이지가 함께 풀린다**(원본 `subnav`).
   * 다른 상태의 목록에서 고른 행이 남아 있으면 선택분 엑셀이 보이지 않는 행을 담는다.
   */
  const selectStatus = (value: string) => {
    setFilter(value);
    setPage(1);
    setSort(null);
    setSelected([]);
  };

  /*
   * 퇴점일 **열**은 [퇴점] 탭에서만 세운다 — 다른 탭에서는 값이 없거나(입점) 예정일(처리중)이라
   * 열 하나를 통째로 낭비하거나 확정되지 않은 날짜를 확정처럼 보인다. 원본도 같다.
   */
  const showExitDate = filter === "closed";

  /* 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다 — 마지막 페이지로 당긴다 */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  /* 초기화는 **한 곳에서만 정의한다** — 검색조건과 빈 상태가 서로 다르게 되돌리면 안 된다 */
  const resetFilters = () => {
    setFilter(DEFAULT_FILTER);
    setHygieneFilter(HYGIENE_FILTERS[0].value);
    setDateField(DATE_FIELDS[0].value);
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPeriod(undefined);
    setPage(1);
    setSort(null);
    setSelected([]);
    setDraft({});
  };

  /* -------------------------------------------------------------------
   * 행 선택 — 원본 `rowchk`. 일괄 처리는 없고 **선택분 엑셀**에 쓰인다.
   * ---------------------------------------------------------------- */
  const pageIds = paged.map((seller) => seller.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const somePageSelected =
    pageIds.some((id) => selected.includes(id)) && !allPageSelected;

  const toggleOne = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );

  /** 머리글 체크박스는 **이 페이지**만 고르고 푼다 — 안 보이는 행까지 고르지 않는다 */
  const togglePage = () =>
    setSelected((current) =>
      allPageSelected
        ? current.filter((id) => !pageIds.includes(id))
        : [...new Set([...current, ...pageIds])],
    );

  /*
    엑셀 다운로드 — 원본 `exportCsv`. **지금 조회 결과 안에서 고른 행**이 있으면 그것만,
    없으면 조회 결과 전체(페이지로 자르기 전). 조건을 바꿔 결과 밖으로 나간 선택은 세지 않는다.
    퍼블은 대상 건수만 알린다 — 파일 생성은 개발 영역이다.
  */
  const exportCsv = () => {
    const picked = filtered.filter((seller) => selected.includes(seller.id));
    const rows = picked.length > 0 ? picked : filtered;
    if (rows.length === 0) {
      toast("다운로드할 데이터가 없습니다");
      return;
    }
    toast(
      picked.length > 0
        ? `선택한 ${rows.length}건을 내려받았습니다`
        : `조회 결과 ${rows.length}건을 내려받았습니다`,
    );
  };

  /** 검색 조건이 바뀌면 1페이지로 — 보던 페이지가 새 결과에 없을 수 있다 */
  const changed =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
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
        흰 카드(그룹) 안에 연한 그레이 상자(항목)들이 들어간다.
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

      {/*
        검색조건 — 원본 `filter` · `chips` · `search`. **접힌 채로 열리고** 걸린 조건은 요약이 말한다.
        입력 즉시 적용이다(회원 관리와 같다 — 건수 카드와 목록이 같은 조건을 말해야 한다).
      */}
      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary({
          dateLabel: dateAxis.label,
          from: period?.from,
          to: period?.to,
          hygieneLabel:
            hygieneFilter === "all"
              ? undefined
              : HYGIENE_FILTERS.find((item) => item.value === hygieneFilter)
                  ?.label,
          fieldLabel: searchAxis.label,
          keyword,
        })}
        onReset={resetFilters}
      >
        {/*
          기간 기준은 **입점일 / 퇴점일 두 축**이다(원본 `date.fields`).
          무엇을 고르는 셀렉트인지는 트리거 글자가 아니라 `aria-label` 이 말한다.
        */}
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
        {/*
          위생인증은 상태와 **다른 축**이라 상태 대시에 섞지 않는다
          (원본도 상태 칩과 별개인 `chips.hygiene` 로 둔다).
        */}
        <Select
          aria-label="위생인증"
          options={HYGIENE_FILTERS}
          value={hygieneFilter}
          onValueChange={changed(setHygieneFilter)}
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
          /* 원본 `ListHead` 의 "목록 (총 N건)" — 회원·주문 목록과 같은 자리·같은 글자 */
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
          {colgroup(showExitDate)}
          {/*
            헤더는 표 래퍼 안에서 스크롤될 때 위에 붙는다(`fill` 로 표가 늘어나
            행이 많으면 여기서 세로 스크롤이 생긴다).
          */}
          <TableHead sticky>
            <TableRow>
              {/* 전체 선택 — **이 페이지의 행만** 고른다. 일부만 골랐으면 `indeterminate` */}
              <TableTh align="center">
                <Checkbox
                  size="small"
                  aria-label="이 페이지 전체 선택"
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={togglePage}
                />
              </TableTh>
              {/*
                원본 표의 첫 열 — **조회 결과의 역순 순번**(`total - start - i`)이다.
                레코드 번호가 아니라서 필터·정렬을 바꾸면 다시 센다(건너뛰는 번호가 없다).
              */}
              <TableTh>No</TableTh>
              <TableTh>셀러명</TableTh>
              <TableTh align="center">위생인증</TableTh>
              <TableTh>대표명</TableTh>
              <TableTh>연락처</TableTh>
              <TableTh align="center">상태</TableTh>
              {/*
                ⚠️ 수치 열도 **좌측 정렬**이다 — 이 저장소는 회계 관행을 알면서
                좌측을 택했다(§7-2 · §D6-4).
              */}
              <TableTh>수수료율</TableTh>
              {/* 원본 헤더에 ↕ 가 붙은 열만 정렬한다 */}
              <TableTh
                sortable
                sortDirection={directionOf("date")}
                onSort={() => toggleSort("date")}
              >
                입점일
              </TableTh>
              {showExitDate ? (
                <TableTh
                  sortable
                  sortDirection={directionOf("exitDate")}
                  onSort={() => toggleSort("exitDate")}
                >
                  퇴점일
                </TableTh>
              ) : null}
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
            {paged.map((seller, index) => {
              const status = STATUS_META[seller.status];
              return (
                <TableRow
                  key={seller.id}
                  clickable
                  onClick={() => openDetail(seller)}
                >
                  <TableTd align="center">
                    <Checkbox
                      size="small"
                      /* 이름을 함께 읽어 줘야 어느 행을 고르는지 알 수 있다 */
                      aria-label={`${seller.name} 선택`}
                      checked={selected.includes(seller.id)}
                      onChange={() => toggleOne(seller.id)}
                    />
                  </TableTd>
                  <TableTd className="tabular-nums">
                    {filtered.length - (currentPage - 1) * pageSize - index}
                  </TableTd>
                  {/*
                    원본에서 셀러명은 `/sellers/{id}` 로 가는 링크다(`className: "linkish"`).
                    본사는 이름 옆에 `본사` 배지(분류 — highlight 계열)가 붙는다.
                  */}
                  <TableTd>
                    <span className="flex min-w-0 items-center gap-2">
                      <TextButton
                        className="max-w-full min-w-0"
                        onClick={() => openDetail(seller)}
                      >
                        <span className="truncate">{seller.name}</span>
                      </TextButton>
                      {seller.isHeadquarters ? (
                        <Tag tone={HQ_BADGE.tone} style={HQ_BADGE.style}>
                          {HQ_BADGE.label}
                        </Tag>
                      ) : null}
                    </span>
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
                  <TableTd className="tabular-nums">
                    {productCount(seller.products)}
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
