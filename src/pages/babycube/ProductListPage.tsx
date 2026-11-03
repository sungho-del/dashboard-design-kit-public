import { useState } from "react";
import { ArrowDownToLine, Ban, Check, Search } from "lucide-react";
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
  SelectionBarDivider,
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
import {
  CATEGORY_ALL_LABEL,
  CATEGORY_HINT,
  CATEGORY_TREES,
  CHECK_LABEL,
  DASH_UNIT,
  DATE_FIELDS,
  DISPLAY_FILTERS,
  DISPLAY_META,
  EMPTY_DESCRIPTION,
  EMPTY_TITLE,
  FILTERS,
  LISTED_PRODUCTS,
  MODE_FILTERS,
  MODE_META,
  NOTICE_BODY,
  NOTICE_TITLE,
  NOTICE_WARNING,
  DEFAULT_FILTER,
  filterSummary,
  PAGE_SIZE,
  PAGE_SIZES,
  REJECT_EMPTY,
  REREVIEW_NOTE,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  STATUS_META,
  approveMessage,
  canApprove,
  canReject,
  categoryNameOf,
  categoryPathOf,
  hasRejectReason,
  rejectMessage,
  perDay,
  rentPriceText,
  salePriceOf,
  won,
  ymdhms,
  type CheckMark,
  type Product,
  type ProductDateField,
  type ProductMode,
  type ProductSearchField,
  type SaleStatus,
} from "./ProductListPage.data";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { PERIOD_PRESETS } from "../../lib/periodPresets";
import { useSearchParams } from "../../lib/router";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";
import { ProductRejectModal } from "./shared/ProductRejectModal";

/* =========================================================================
 * 상품 관리 (S05) — 목록형 · 뼈대
 *
 * ## 화면 유형: 목록형
 * 렌트·판매 상품을 한 표에서 조회하고, 입점사 상품을 **반려/승인**한다.
 * 이 어드민에서 컬럼이 가장 많은 화면이다(선택 + 22열).
 *
 * [ 안내 배너 | 상태 카드 5장 | 검색조건(접힘+요약) |
 *   목록 (총 N건) · 엑셀 다운로드 | 표 | 페이지네이션 ]       ← 원본 v0.4 와 같은 순서
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./ProductListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `ProductListPage.data.ts` **전체**             |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 상태 대시 구성         | `FILTERS` (카드가 곧 상태 필터다)              |
 * | 검색조건 구성          | `FilterBar` 의 자식 (원본 순서: 기간→전시→유형→카테고리→검색) |
 * | 행 액션                | 상품명 링크 · 관리 열의 `수정` 버튼            |
 * | 일괄 액션              | `SelectionBar` 버튼 2개(자격에 따라 나타난다)  |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · 페이지 범위 클램프 · `inPeriod` 날짜 필터 ·
 * 선택→SelectionBar→Modal 확인 흐름
 *
 * ## 뼈대가 데이터에 기대하는 계약
 * - 행은 `LISTED_PRODUCTS` 에서만 읽는다(본사 직영 제외) — 건수·조회·선택·엑셀·일괄이 같은 집합
 * - `canApprove`/`canReject` 가 **처분 자격**을 판정한다(원본 `productDispositionActions`).
 *   버튼을 보일지 말지도, 승인 알림의 제외 건수도 이 둘에서 나온다
 * - `CATEGORY_TREES[유형]` — 카테고리는 **유형을 고른 뒤에만** 열린다(원본 `catSelectHint`)
 * - 상태별 건수는 **뼈대가 지금 행에서 직접 센다** — 상수로 박으면 필터를 걸었을 때
 *   조용히 거짓말한다
 *
 * ## 퍼블 범위
 * 승인·반려·엑셀은 **알림만** 띄운다. 행의 상태·건수는 바뀌지 않는다(저장은 개발 영역).
 * 상품명·[수정]은 상품 상세(`/products/{상품코드}`)로 간다(원본 — 둘 다 같은 수정 폼).
 *
 * ## 원본과 일부러 다른 것
 * - **조건을 바꾸면 선택이 풀린다**(상태 카드·유형·카테고리·기간·검색). 원본은 선택을 남겨
 *   안 보이는 행까지 다음 처리 대상에 섞인다. 처리 대상은 늘 지금 조회 결과 안에서만 정해진다
 * - 일괄 처리는 툴바 셀렉트가 아니라 §25 `SelectionBar` 다(고르면 나타난다)
 * - 반려 사유는 밑줄 태그가 아니라 태그 아래 [사유 보기] 다(`Tag` 는 표시 전용 span)
 *
 * ⚠️ **원본에 없어서 걷어낸 것 — 되살리지 말 것.**
 * - 상단 요약 카드 3장(`전체 상품 1,284개` · `반려 상품 -4개` · `재심사 대기 +2건`).
 *   원본이 그 자리에 두는 것은 `StatDash`(**판매 상태별 건수**)이고 카드가 곧 상태 필터다.
 * - 툴바의 판매 상태 세그먼트. 상태 축의 입구는 대시 하나뿐이다.
 * - 관리 열의 드롭다운(상품 수정·상품코드 복사·반려 처리). 원본 관리 열은 `수정` 하나다.
 * - 행 클릭 「상품 미리보기」 모달과 그 안의 승인/반려. 원본에 없는 우회 처리 통로였다.
 *
 * ## 이 화면만의 구조 — 좌우 고정 열
 * 표 전체 폭이 **2,776px** 라 가로 스크롤이 전제다. 스크롤은 `DataTableShell` 의
 * 본문 래퍼(`overflow-auto`) 안에서만 일어나고 페이지 본문은 밀리지 않는다.
 *
 * - 좌측 5열(선택·유형·셀러·상품코드·상품명)과 우측 1열(관리)이 `position: sticky`.
 *   ⚠️ `FROZEN_LEFT` 의 `left` 값은 **앞 열 폭의 누적합**이다 —
 *   `<colgroup>` 의 폭을 고치면 여기도 같이 고쳐야 한다. 어긋나면 열이 겹쳐 보인다.
 * - 고정 셀의 배경은 `bg-inherit` 다. 행(`<tr>`)의 zebra·hover 배경을 그대로 물려받는다.
 * - 헤더 셀(`TableTh`)은 이미 `bg-surface` 를 갖고 있으므로 **배경 클래스를 더하지 않는다**
 *   (`cn()` 은 클래스를 병합하지 않아 같은 속성을 두 번 방출하면 순서가 승자를 정한다).
 * ====================================================================== */

/**
 * 좌측 고정 5열의 `left` 오프셋 — **`<colgroup>` 폭의 누적합**이다.
 * 52 / 72 / 112 / 112 / 232 → 0 · 52 · 124 · 236 · 348 (합 580)
 *
 * ⚠️ 첫 열은 **52** 다(40 아님). 체크박스 16 + 셀 여백(`first:pl-6` 24 · 오른쪽 12)이라
 * 40 을 주어도 브라우저가 52 로 늘린다 — 40 기준으로 오프셋을 잡았을 때 가로 스크롤하면
 * 「유형」 열이 체크박스 열을 12px 덮었다. 같은 이유로 관리 열은 84(수정 버튼 + 여백 12·24)다.
 *
 * ⚠️ 파생값이라 `<colgroup>` 을 고치면 **반드시 여기도 함께** 고쳐야 한다.
 */
const FROZEN_LEFT = ["left-0", "left-13", "left-31", "left-59", "left-87"];

/**
 * 고정 구간의 폭 — `DataTableShell` 이 가로 스크롤바를 이만큼 **비켜서** 그린다.
 *   좌측 5열 52+72+112+112+232 = 580 · 우측 `관리` 84
 * ⚠️ `<colgroup>` 폭·`FROZEN_LEFT` 와 **함께 고쳐야 한다.**
 */
const FROZEN_LEAD_WIDTH = 580;
const FROZEN_TRAIL_WIDTH = 84;

/** 고정 구간의 오른쪽 끝을 알리는 1px. `border` 는 collapse 표에서 함께 스크롤돼 사라진다 */
const FROZEN_EDGE_RIGHT =
  "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-divide after:content-['']";

/** 우측 고정 열의 왼쪽 끝 1px */
const FROZEN_EDGE_LEFT =
  "before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-divide before:content-['']";

/** 헤더 셀 — 배경을 더하지 않는다(TableTh 가 이미 `bg-surface`) */
const frozenTh = (index: number) =>
  cn("sticky z-2", FROZEN_LEFT[index], index === 4 && FROZEN_EDGE_RIGHT);

/** 본문 셀 — 배경은 행에서 물려받는다 */
const frozenTd = (index: number) =>
  cn(
    "sticky z-1 bg-inherit",
    FROZEN_LEFT[index],
    index === 4 && FROZEN_EDGE_RIGHT,
  );

/**
 * KC 인증 · 등록 이미지 표기 — 원본과 같은 `O`/`△`/`X`.
 * 색은 **`X`(미제출) 쪽만** 준다. △ 는 보완 필요일 뿐 미제출이 아니다.
 */
const checkMark = (value: CheckMark) =>
  value === "missing" ? (
    <span className="label-medium-bold text-text-warning">
      {CHECK_LABEL[value]}
    </span>
  ) : (
    CHECK_LABEL[value]
  );

/**
 * 선택한 기간 안에 드는지.
 *
 * `YYYY-MM-DD HH:mm:ss` 의 공백 구분자는 브라우저별 파싱이 갈려 `T` 로 바꿔 넘긴다.
 * 시작일은 00:00, 종료일은 23:59:59 까지 포함한다.
 *
 * ⚠️ **값 자체가 없으면 기간 조회에서 뺀다.** 판매종료일이 빈 상품은 "무기한"이라
 * 어떤 기간에도 속하지 않는다.
 */
const inPeriod = (dateText: string, range?: DateRange) => {
  if (!range?.from) return true;
  if (dateText === "") return false;

  const at = new Date(dateText.replace(" ", "T"));
  if (Number.isNaN(at.getTime())) return true;

  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);

  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);

  return at >= from && at <= to;
};

/** 렌트 전용 열은 판매 건에서 비고, 판매 전용 열은 렌트 건에서 빈다 */
const DASH = "—";

/**
 * 표의 열 수 — 로딩 뼈대가 같은 수의 빈 칸을 그린다.
 * ⚠️ `<colgroup>` 의 `<col>` 수와 **반드시 같아야** 한다(다르면 칸이 밀린다).
 */
const COLUMN_COUNT = 23;

/* -------------------------------------------------------------------------
 * 정렬 — 원본 표 헤더의 ↕ (상품등록일 · 최종수정일 **둘뿐이다**)
 * ---------------------------------------------------------------------- */

type SortKey = "date" | "updatedAt";

interface SortState {
  key: SortKey;
  direction: TableSortDirection;
}

/** 둘 다 `"YYYY-MM-DD HH:mm:ss"` 라 **문자열 비교로 시간 순서가 맞는다** */
const COMPARATORS: Record<SortKey, (a: Product, b: Product) => number> = {
  date: (a, b) => a.date.localeCompare(b.date),
  updatedAt: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
};

/** **오름 → 내림 → 해제** 3단. 기본 순서 자체가 의미를 가지므로 돌아갈 자리를 남긴다 */
const nextSort = (
  current: SortState | null,
  key: SortKey,
): SortState | null => {
  if (current?.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
};

export interface ProductListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function ProductListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: ProductListPageProps) {
  const { toast } = useToast();

  const [status, setStatus] = useState(DEFAULT_FILTER);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<SortState | null>(null);
  /** 검색조건 펼침. **기본은 펼침**이다(사용자 결정 2026-10-19 — 원본은 접힘) */
  const [filterOpen, setFilterOpen] = useState(true);

  /*
    실 API 를 붙이면 이 한 줄을 fetch 상태로 바꾼다 — 지금은 `?preview=` 로 미리 본다
    (`/products?preview=loading` · `empty` · `refreshing`).
  */
  const dataStatus = asStatus(useSearchParams().get("preview"));
  const [mode, setMode] = useState("all");
  const [display, setDisplay] = useState("all");
  const [major, setMajor] = useState("all");
  const [middle, setMiddle] = useState("all");
  const [minor, setMinor] = useState("all");
  const [dateField, setDateField] = useState<ProductDateField>("date");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [searchField, setSearchField] = useState<ProductSearchField>(
    SEARCH_FIELDS[0].value,
  );
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<string[]>([]);
  /** 반려 사유 입력 대상. 자격 판정은 이미 거친 것만 담는다 */
  const [rejectTargets, setRejectTargets] = useState<Product[]>([]);
  /** 반려 사유 보기 대상 */
  const [reasonTarget, setReasonTarget] = useState<Product | null>(null);

  /*
    카테고리 — **유형마다 트리가 따로다**(원본 `RENT_CATTREE`·`SALE_CATTREE`).
    유형이 "전체"면 고를 트리가 없어 셀렉트 3개가 잠기고 안내가 붙는다.
    3단 연쇄 — 상위가 풀리면 하위 선택지도 사라진다.
  */
  const categoryTree =
    mode === "all" ? [] : CATEGORY_TREES[mode as ProductMode];
  const majorNode = categoryTree.find((node) => node.value === major);
  const middleNode = majorNode?.children?.find((node) => node.value === middle);

  const majorOptions = [
    /* 잠긴 동안에는 "왜 잠겼는지"를 셀렉트 자신이 말한다 — 옆에 따로 적으면 줄바꿈 뒤 다른 칸의 설명으로 읽힌다 */
    {
      value: "all",
      label: mode === "all" ? CATEGORY_HINT : CATEGORY_ALL_LABEL.major,
    },
    ...categoryTree.map((node) => ({ value: node.value, label: node.label })),
  ];
  const middleOptions = [
    { value: "all", label: CATEGORY_ALL_LABEL.middle },
    ...(majorNode?.children ?? []).map((node) => ({
      value: node.value,
      label: node.label,
    })),
  ];
  const minorOptions = [
    { value: "all", label: CATEGORY_ALL_LABEL.minor },
    ...(middleNode?.children ?? []).map((node) => ({
      value: node.value,
      label: node.label,
    })),
  ];

  /** 가장 깊이 고른 카테고리 — 그 코드가 상품의 [대, 중, 소] 경로에 있으면 통과 */
  const category =
    [minor, middle, major].find((value) => value !== "all") ?? "all";

  /*
   * 상태를 **뺀** 나머지 조건까지만 좁힌 집합.
   * 상태 대시의 건수는 여기서 세야 "렌트만 보는 중"일 때 건수도 함께 줄어든다.
   */
  const scoped = LISTED_PRODUCTS.filter((product) => {
    const matchMode = mode === "all" || product.mode === mode;
    const matchDisplay = display === "all" || product.display === display;
    const matchCategory =
      category === "all" || categoryPathOf(product).includes(category);
    /* 검색은 **고른 대상 한 곳만** 훑는다(원본 `_searchfield`) */
    const matchKeyword =
      keyword.trim() === "" || product[searchField].includes(keyword.trim());

    return (
      matchMode &&
      matchDisplay &&
      matchCategory &&
      matchKeyword &&
      inPeriod(product[dateField], period)
    );
  });

  /* 상태 카드는 **항상 하나가 선택돼 있다**(원본 정책: [전체] 없음) */
  const matched = scoped.filter((product) => product.status === status);

  /*
    정렬은 **페이지를 나누기 전에** 한다.
    ⚠️ **복사한 뒤 정렬한다** — `sort` 는 제자리 정렬이라 모듈 상수의 순서를 영구히 바꾼다.
  */
  const filtered = sort
    ? [...matched].sort((a, b) => {
        const order = COMPARATORS[sort.key](a, b);
        return sort.direction === "asc" ? order : -order;
      })
    : matched;

  /** 헤더를 눌렀을 때. 정렬이 바뀌면 1페이지로 돌아간다 */
  const toggleSort = (key: SortKey) => {
    setSort((current) => nextSort(current, key));
    setPage(1);
  };

  const directionOf = (key: SortKey) =>
    sort?.key === key ? sort.direction : undefined;

  /** 상태별 건수 — 표와 어긋날 수 없도록 **지금 행에서 직접 센다** */
  const dash = FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count: scoped.filter((product) => product.status === item.value).length,
    /* 원본 `STAT_TIP` — 뜻과 다음 단계 */
    tip: STATUS_META[item.value as SaleStatus].description,
  }));

  /* 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다 — 마지막 페이지로 당긴다 */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  /** 머리 체크박스는 **보이는 페이지 단위**다 */
  const pageIds = paged.map((product) => product.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const somePageSelected =
    pageIds.some((id) => selected.includes(id)) && !allPageSelected;

  /** 고른 행 — **지금 조회 결과 안에서만** 센다 */
  const selectedProducts = filtered.filter((product) =>
    selected.includes(product.id),
  );

  /*
   * 처분 자격 — 상태가 곧 자격이다(원본 `productDispositionActions`).
   * 자격 없는 버튼이 뜨면 누를 수 있는 것처럼 보이고, 눌러도 뜻 없는 조작이 일어난다.
   */
  const approvable = selectedProducts.filter(canApprove);
  const rejectable = selectedProducts.filter(canReject);

  /**
   * 조건을 바꾸면 1페이지로, **선택도 풀린다**. 보던 페이지가 새 결과에 없을 수 있고,
   * 결과 밖으로 나간 선택이 남으면 보이지 않는 상품이 다음 처리 대상에 섞인다.
   */
  const refilter = () => {
    setPage(1);
    setSelected([]);
  };

  /** 상태 카드를 바꾸면 **정렬·선택·페이지가 함께 풀린다** — 다른 목록과 같다 */
  const selectStatus = (value: string) => {
    setStatus(value);
    setSort(null);
    refilter();
  };

  /** 유형을 바꾸면 트리가 바뀌므로 카테고리 3단을 모두 비운다(원본 `setRadio`) */
  const selectMode = (value: string) => {
    setMode(value);
    setMajor("all");
    setMiddle("all");
    setMinor("all");
    refilter();
  };

  /** 초기화는 한 곳에서만 정의한다 — 검색조건과 빈 상태가 서로 다르게 되돌리면 안 된다 */
  const resetFilters = () => {
    setStatus(DEFAULT_FILTER);
    setMode("all");
    setDisplay("all");
    setMajor("all");
    setMiddle("all");
    setMinor("all");
    setDateField("date");
    setPeriod(undefined);
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    refilter();
  };

  const toggleRow = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const togglePage = () => {
    setSelected((prev) =>
      allPageSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...prev, ...pageIds.filter((id) => !prev.includes(id))],
    );
  };

  /*
    엑셀 다운로드 — 원본 `exportCsv`. **지금 조회 결과 안에서 고른 행**이 있으면 그것만,
    없으면 조회 결과 전체(페이지로 자르기 전). 퍼블은 대상 건수만 알린다 — 파일 생성은 개발 영역.
  */
  const exportCsv = () => {
    const rows = selectedProducts.length > 0 ? selectedProducts : filtered;
    if (rows.length === 0) {
      toast("다운로드할 데이터가 없습니다");
      return;
    }
    toast(
      selectedProducts.length > 0
        ? `선택한 ${rows.length}건을 내려받았습니다`
        : `조회 결과 ${rows.length}건을 내려받았습니다`,
    );
  };

  /** 퍼블은 저장하지 않는다 — 알림을 띄우고 선택만 푼다. 행의 상태·건수는 그대로다 */
  const confirmReject = () => {
    toast({ message: rejectMessage(rejectTargets.length), tone: "critical" });
    setSelected([]);
    setRejectTargets([]);
  };

  const approve = () => {
    toast(
      approveMessage(
        approvable.length,
        selectedProducts.length - approvable.length,
      ),
    );
    setSelected([]);
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
      header={<PageHeader title="상품 관리" />}
    >
      {/*
        상시 안내 배너 (원본 `data-area="products.note"`).
        ⚠️ 도움말 툴팁으로 접지 말 것 — 마지막 줄(연대책임) 때문에 배너다.
        칠하는 것은 **마지막 줄 하나**다. 셋 다 칠하면 초점이 사라진다.
      */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-2">
            <p className="label-medium-bold text-text">{NOTICE_TITLE}</p>
            <p className="body-medium text-text-sub">{NOTICE_BODY}</p>
            <p className="body-medium text-text-warning">{NOTICE_WARNING}</p>
          </div>
        </CardBody>
      </Card>

      {/*
        판매 상태별 건수 대시 — 원본 `StatDash`. 건수를 보여주면서 **그 자체가 상태 필터**다.
        상자의 시각 규격·선택/hover·접근가능 이름·툴팁은 `StatGrid` 가 맡는다(§D4).
      */}
      <Card>
        <CardBody>
          <StatGrid
            items={dash.map((item) => ({
              value: item.value,
              label: item.label,
              count: String(item.count),
              unit: DASH_UNIT,
              tip: item.tip,
            }))}
            selected={status}
            onSelect={selectStatus}
            ariaLabel="판매 상태별 건수"
            columns={5}
          />
        </CardBody>
      </Card>

      {/*
        검색조건 — 원본 `products.filter`. **접힌 채로 열리고** 걸린 조건은 요약이 말한다.
        순서는 원본 그대로: 기간 → 전시 상태 → 유형 → 카테고리 → 검색어.

        ⚠️ 판매 상태는 여기 없다 — 그 축의 입구는 위의 건수 대시 하나뿐이다.
      */}
      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary({
          mode,
          display,
          category,
          dateField,
          from: period?.from,
          to: period?.to,
          searchField,
          keyword,
        })}
        onReset={resetFilters}
      >
        <Select
          className="w-32"
          aria-label="기간 종류"
          options={DATE_FIELDS}
          value={dateField}
          onValueChange={(value) => {
            setDateField(value as ProductDateField);
            refilter();
          }}
        />
        <DatePicker
          mode="range"
          /* 원본 "기간 빠른 버튼(오늘~전체)" — 어휘·계산은 `PERIOD_PRESETS` 가 든다 */
          presets={PERIOD_PRESETS}
          value={period}
          onChange={(next) => {
            setPeriod(next);
            refilter();
          }}
          startPlaceholder="시작일"
          endPlaceholder="종료일"
        />
        {/* 전시 상태는 판매 상태와 **다른 축**이다(원본 `showStat`) */}
        <Select
          className="w-36"
          aria-label="전시 상태"
          options={DISPLAY_FILTERS}
          value={display}
          onValueChange={(value) => {
            setDisplay(value);
            refilter();
          }}
        />
        {/* 원본은 라디오지만 검색조건 줄의 다른 칸과 모양을 맞춰 셀렉트로 둔다(사용자 결정 2026-10-19) */}
        <Select
          className="w-28"
          aria-label="유형"
          options={MODE_FILTERS}
          value={mode}
          onValueChange={selectMode}
        />
        <Select
          className="w-36"
          aria-label="카테고리 대분류"
          options={majorOptions}
          value={major}
          disabled={mode === "all"}
          onValueChange={(value) => {
            setMajor(value);
            setMiddle("all");
            setMinor("all");
            refilter();
          }}
        />
        <Select
          className="w-36"
          aria-label="카테고리 중분류"
          options={middleOptions}
          value={middle}
          disabled={major === "all"}
          onValueChange={(value) => {
            setMiddle(value);
            setMinor("all");
            refilter();
          }}
        />
        <Select
          className="w-32"
          aria-label="카테고리 소분류"
          options={minorOptions}
          value={minor}
          disabled={middle === "all"}
          onValueChange={(value) => {
            setMinor(value);
            refilter();
          }}
        />
        {/*
          검색 대상 셀렉트 — 한 번에 하나만 훑는다.
          세 필드를 동시에 훑으면 어디서 걸린 것인지 결과만 보고는 구별할 수 없다.
        */}
        <Select
          className="w-28"
          aria-label="검색 대상"
          options={SEARCH_FIELDS}
          value={searchField}
          onValueChange={(value) => {
            setSearchField(value as ProductSearchField);
            refilter();
          }}
        />
        <Input
          placeholder={SEARCH_PLACEHOLDER}
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            refilter();
          }}
          leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        />
      </FilterBar>

      <DataTableShell
        /* 양쪽 고정 열을 비켜서 스크롤바를 그린다 — 바의 범위 = 실제 스크롤 범위 */
        scrollLeadWidth={FROZEN_LEAD_WIDTH}
        scrollTrailWidth={FROZEN_TRAIL_WIDTH}
        /* 다른 목록 화면과 같은 층(§Card soft) */
        variant="soft"
        fill
        className="flex-1"
        bodyClassName={dimWhile(dataStatus)}
        aria-busy={isBusy(dataStatus)}
        toolbarStart={
          /* 원본 `ListHead` 의 "목록 (총 N건)" — 회원·셀러 목록과 같은 자리·같은 글자 */
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
            table-fixed 라 폭 지정 필수.
            좌측 고정 5열 = 52+72+112+112+232 = 580 (FROZEN_LEFT 와 짝을 이룬다)
            날짜 2열은 초까지 들어가도록 160 — 표 전체 2,776
          */}
          <colgroup>
            <col className="w-13" />
            <col className="w-18" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-58" />
            <col className="w-25" />
            <col className="w-25" />
            <col className="w-25" />
            <col className="w-25" />
            <col className="w-25" />
            <col className="w-25" />
            <col className="w-25" />
            <col className="w-23" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-23" />
            <col className="w-28" />
            <col className="w-33" />
            <col className="w-25" />
            <col className="w-40" />
            <col className="w-40" />
            <col className="w-21" />
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
              {/* 배지만 들어가는 열이 가운데다 — 유형·판매 상태·전시 상태 셋뿐(§7-2) */}
              <TableTh align="center" className={frozenTh(1)}>
                유형
              </TableTh>
              <TableTh className={frozenTh(2)}>셀러</TableTh>
              <TableTh className={frozenTh(3)}>상품코드</TableTh>
              <TableTh className={frozenTh(4)}>상품명</TableTh>
              <TableTh>렌트 원가</TableTh>
              <TableTh>할인 금액</TableTh>
              <TableTh>렌트가</TableTh>
              <TableTh>보증금</TableTh>
              <TableTh>판매 원가</TableTh>
              <TableTh>판매 할인</TableTh>
              <TableTh>판매가</TableTh>
              <TableTh>배송비</TableTh>
              <TableTh>반품배송비</TableTh>
              <TableTh>교환배송비</TableTh>
              <TableTh>카테고리</TableTh>
              <TableTh>KC 인증</TableTh>
              <TableTh>등록 이미지</TableTh>
              <TableTh align="center">판매 상태</TableTh>
              <TableTh align="center">전시 상태</TableTh>
              {/* 원본 표 헤더에서 ↕ 가 붙은 것은 이 둘뿐이다 */}
              <TableTh
                sortable
                sortDirection={directionOf("date")}
                onSort={() => toggleSort("date")}
              >
                상품등록일
              </TableTh>
              <TableTh
                sortable
                sortDirection={directionOf("updatedAt")}
                onSort={() => toggleSort("updatedAt")}
              >
                최종수정일
              </TableTh>
              <TableTh className={cn("sticky right-0 z-2", FROZEN_EDGE_LEFT)}>
                관리
              </TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {/*
              ⚠️ 이 화면만 `DataTableShell` 의 `isLoading`/`loading`(표 통째로 교체)을
              쓰지 않고 **본문 행만** 스켈레톤으로 바꾼다. 열이 23개이고 고정열 클래스와
              정렬 헤더가 얽혀 있어, 뼈대용 표를 한 벌 더 두면 헤더를 두 곳에서 관리하게 된다.
            */}
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
              : paged.map((product) => {
                  const statusMeta = STATUS_META[product.status];
                  const modeMeta = MODE_META[product.mode];
                  const displayMeta = DISPLAY_META[product.display];
                  const isRent = product.mode === "rent";

                  return (
                    <TableRow
                      key={product.id}
                      clickable
                      onClick={() => onNavSelect(`/products/${product.id}`)}
                    >
                      <TableTd className={frozenTd(0)}>
                        <Checkbox
                          size="small"
                          aria-label={product.name + " 선택"}
                          checked={selected.includes(product.id)}
                          onChange={() => toggleRow(product.id)}
                        />
                      </TableTd>
                      <TableTd align="center" className={frozenTd(1)}>
                        <Tag tone={modeMeta.tone} size="small">
                          {modeMeta.label}
                        </Tag>
                      </TableTd>
                      <TableTd className={frozenTd(2)}>
                        {product.seller}
                      </TableTd>
                      <TableTd className={frozenTd(3)}>{product.id}</TableTd>
                      {/* 원본: 상품명은 상품 상세(수정 폼)로 가는 링크 */}
                      <TableTd className={frozenTd(4)}>
                        {/*
                          ⚠️ 글자가 **줄바꿈될 수 있어야** 열 폭(232)이 지켜진다. 표가 `w-max` 라
                          칸의 최소 폭이 곧 열 폭이 되는데, `TextButton` 은 `nowrap` 이라 긴 상품명이
                          열을 394px 까지 밀어냈다. 안쪽 글자만 풀어 주고 두 줄에서 자른다(`ellipsis` 셀과 같은 규칙).
                        */}
                        <TextButton
                          className="max-w-full"
                          onClick={() => onNavSelect(`/products/${product.id}`)}
                        >
                          <span className="line-clamp-2 text-left whitespace-normal">
                            {product.name}
                          </span>
                        </TextButton>
                      </TableTd>
                      <TableTd>
                        {isRent ? perDay(product.rentBase ?? 0) : DASH}
                      </TableTd>
                      <TableTd>
                        {isRent ? perDay(product.rentDiscount ?? 0) : DASH}
                      </TableTd>
                      <TableTd>
                        {isRent ? rentPriceText(product) : DASH}
                      </TableTd>
                      <TableTd>
                        {isRent ? won(product.deposit ?? 0) : DASH}
                      </TableTd>
                      <TableTd>
                        {isRent ? DASH : won(product.saleBase ?? 0)}
                      </TableTd>
                      <TableTd>
                        {isRent ? DASH : won(product.saleDiscount ?? 0)}
                      </TableTd>
                      <TableTd>
                        {isRent ? DASH : won(salePriceOf(product))}
                      </TableTd>
                      <TableTd>{won(product.shipFee)}</TableTd>
                      <TableTd>{won(product.returnFee)}</TableTd>
                      <TableTd>{won(product.exchangeFee)}</TableTd>
                      {/* 원본과 같이 **이름 하나**다 — 3단 경로를 이어 붙이지 않는다 */}
                      <TableTd ellipsis>{categoryNameOf(product)}</TableTd>
                      <TableTd>{checkMark(product.kc)}</TableTd>
                      <TableTd>{checkMark(product.image)}</TableTd>
                      <TableTd align="center">
                        {/*
                          반려·재심사요청 건은 **왜 내려갔는지**가 이 화면의 핵심 정보다.
                          원본은 상태 태그에 밑줄을 그어 누르게 하지만, `Tag` 는 표시 전용(span)이라
                          클릭 대상을 따로 둔다.
                        */}
                        <div className="flex flex-col items-center gap-1">
                          <Tag tone={statusMeta.tone} dot size="small">
                            {statusMeta.label}
                          </Tag>
                          {hasRejectReason(product) && (
                            <TextButton
                              size="small"
                              tone="secondary"
                              onClick={() => setReasonTarget(product)}
                            >
                              사유 보기
                            </TextButton>
                          )}
                        </div>
                      </TableTd>
                      <TableTd align="center">
                        <Tag tone={displayMeta.tone} size="small">
                          {displayMeta.label}
                        </Tag>
                      </TableTd>
                      {/* 저장은 하이픈, 화면은 점 — 날것을 그대로 흘리지 않는다 */}
                      <TableTd>{ymdhms(product.date)}</TableTd>
                      <TableTd>{ymdhms(product.updatedAt)}</TableTd>
                      <TableTd
                        className={cn(
                          "sticky right-0 z-1 bg-inherit",
                          FROZEN_EDGE_LEFT,
                        )}
                      >
                        {/* 원본 관리 열도 `수정` 하나뿐이고, 상품명과 같은 상세로 간다 */}
                        <Button
                          size="small"
                          variant="secondary"
                          aria-label={product.name + " 수정"}
                          onClick={() => onNavSelect(`/products/${product.id}`)}
                        >
                          수정
                        </Button>
                      </TableTd>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        일괄 처리 바.
        원본은 승인/반려를 목록 머리의 셀렉트에 두지만, 이 디자인 시스템에서 여러 행을
        골라 한꺼번에 처리하는 규격은 §25 SelectionBar 다.
        ⚠️ 버튼은 **고른 행의 자격**이 있을 때만 나온다 — 이미 반려된 상품에
        '반려 처리'가 뜨면 화면이 거짓말을 한다. 상품 승인은 내린 처분을 푸는 것이라
        확인 창 없이 처리한다(원본 `prodApprove`).
      */}
      <SelectionBar
        open={selected.length > 0}
        count={selected.length}
        onClear={() => setSelected([])}
      >
        {approvable.length > 0 && (
          <SelectionBarButton
            icon={<Check size={16} strokeWidth={1.2} aria-hidden />}
            onClick={approve}
          >
            승인 처리
          </SelectionBarButton>
        )}
        {approvable.length > 0 && rejectable.length > 0 && (
          <SelectionBarDivider />
        )}
        {rejectable.length > 0 && (
          <SelectionBarButton
            icon={<Ban size={16} strokeWidth={1.2} aria-hidden />}
            onClick={() => setRejectTargets(rejectable)}
          >
            반려 처리
          </SelectionBarButton>
        )}
      </SelectionBar>

      {/*
        반려 사유 입력 — 상품 상세와 같은 창(`shared/ProductRejectModal`).
        제목의 건수는 **자격 있는 수**다. 대상 줄은 두지 않는다(원본 판정 ⑪ⓑ — 건수는 제목이 진다).
      */}
      <ProductRejectModal
        count={rejectTargets.length}
        open={rejectTargets.length > 0}
        onClose={() => setRejectTargets([])}
        onConfirm={confirmReject}
      />

      {/* 반려 사유 보기 — 원본 `prodReason`: 상태 태그 · 상품 · 사유 · 처리 시각 · [확인] */}
      <Modal
        open={reasonTarget !== null}
        onClose={() => setReasonTarget(null)}
        size="small"
      >
        <ModalHeader closeLabel="대화상자 닫기" title="반려 사유" />
        <ModalBody>
          {reasonTarget && (
            <>
              <Tag tone={STATUS_META[reasonTarget.status].tone} dot>
                {STATUS_META[reasonTarget.status].label}
              </Tag>
              <p className="body-medium text-text">
                상품:{" "}
                <span className="label-medium-bold">{reasonTarget.name}</span>
              </p>
              <p className="body-medium text-text">
                {reasonTarget.reject?.reason ?? REJECT_EMPTY}
              </p>
              <p className="body-small text-text-minimal">
                {reasonTarget.reject
                  ? ymdhms(reasonTarget.reject.at) + " 처리"
                  : ""}
                {reasonTarget.status === "rereview"
                  ? (reasonTarget.reject ? " · " : "") + REREVIEW_NOTE
                  : ""}
              </p>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button size="large" onClick={() => setReasonTarget(null)}>
            확인
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
