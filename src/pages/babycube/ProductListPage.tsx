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
  Gnb,
  InfoItem,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Pagination,
  Radio,
  RadioGroup,
  Select,
  SelectionBar,
  SelectionBarButton,
  SelectionBarDivider,
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
} from "../../components/ui";
import { cn } from "../../lib/cn";
import {
  CATEGORY_ALL_LABEL,
  CATEGORY_TREE,
  CHECK_LABEL,
  DASH_UNIT,
  DATE_FIELDS,
  DISPLAY_FILTERS,
  DISPLAY_META,
  EMPTY_DESCRIPTION,
  EMPTY_TITLE,
  FILTERS,
  MODE_FILTERS,
  MODE_META,
  NOTICE_BODY,
  NOTICE_TITLE,
  NOTICE_WARNING,
  PAGE_SIZE,
  PRODUCTS,
  REJECT_EMPTY,
  REJECT_ERROR,
  REJECT_NOTICE,
  REJECT_PLACEHOLDER,
  REREVIEW_NOTE,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  STATUS_META,
  STATUS_TIPS,
  approveMessage,
  canApprove,
  canReject,
  categoryNameOf,
  priceText,
  rejectMessage,
  rentPriceText,
  salePriceOf,
  won,
  ymdhm,
  type CheckMark,
  type Product,
  type ProductDateField,
  type ProductSearchField,
  type SaleStatus,
} from "./ProductListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 상품 관리 (S05) — 목록형 · 뼈대
 *
 * ## 화면 유형: 목록형
 * 렌트·판매 상품을 한 표에서 조회하고, 입점사 상품을 **반려/승인**한다.
 * 이 어드민에서 컬럼이 가장 많은 화면이다(선택 + 22열).
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./ProductListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `ProductListPage.data.ts` **전체**             |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 상태 대시 구성         | `FILTERS` (카드가 곧 상태 필터다)              |
 * | 툴바 필터 구성         | `toolbarStart` / `toolbarEnd` 슬롯             |
 * | 행 액션                | 관리 열의 `수정` 버튼                          |
 * | 일괄 액션              | `SelectionBar` 버튼 2개(자격에 따라 나타난다)  |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · 페이지 범위 클램프 · `inPeriod` 날짜 필터 ·
 * 행클릭→Modal 미리보기 · 선택→SelectionBar→Modal 확인 흐름
 *
 * ## 뼈대가 데이터에 기대하는 계약
 * - `FILTERS[0].value === "all"` — 나머지는 `SaleStatus` 어휘 그대로
 * - `canApprove`/`canReject` 가 **처분 자격**을 판정한다(원본 `productDispositionActions`).
 *   버튼을 보일지 말지도, 결과 문구의 제외 건수도 전부 이 둘에서 나온다
 * - `approveMessage`/`rejectMessage` 가 처리·제외 건수를 함께 알린다
 * - 상태별 건수는 **뼈대가 지금 행에서 직접 센다** — 상수로 박으면 필터를 걸었을 때
 *   조용히 거짓말한다
 *
 * ⚠️ **원본에 없어서 걷어낸 것 — 되살리지 말 것.**
 * - 상단 요약 카드 3장(`전체 상품 1,284개` · `반려 상품 -4개` · `재심사 대기 +2건`)과
 *   증감 화살표·비교 기준 문구. 원본이 그 자리에 두는 것은 `StatDash`
 *   (**판매 상태별 건수**)이고 카드가 곧 상태 필터다.
 * - 툴바의 판매 상태 세그먼트. 상태 축의 입구는 대시 하나뿐이다 — 같은 축을 두 군데
 *   두면 어느 쪽이 진짜인지 알 수 없다.
 * - 관리 열의 드롭다운(상품 수정·상품코드 복사·반려 처리). 원본 관리 열은 `수정` 하나다.
 *
 * ## 이 화면만의 구조 — 좌우 고정 열
 * 표 전체 폭이 **2,720px** 라 가로 스크롤이 전제다. 스크롤은 `DataTableShell` 의
 * 본문 래퍼(`overflow-auto`) 안에서만 일어나고 페이지 본문은 밀리지 않는다
 * (`AppShell` 콘텐츠 컬럼이 `min-w-0` 이라 넓은 자식이 셸을 밀어내지 못한다).
 *
 * - 좌측 5열(선택·유형·셀러·상품코드·상품명)과 우측 1열(관리)이 `position: sticky`.
 *   ⚠️ `FROZEN_LEFT` 의 `left` 값은 **앞 열 폭의 누적합**이다 —
 *   `<colgroup>` 의 폭을 고치면 여기도 같이 고쳐야 한다. 어긋나면 열이 겹쳐 보인다.
 * - 고정 셀의 배경은 `bg-inherit` 다. 행(`<tr>`)이 zebra 배경을 갖고 있어서
 *   고정 셀이 그 값을 그대로 물려받아야 hover 까지 따라간다. 특정 색을 칠하면
 *   짝수 행에서 줄무늬가 끊긴다.
 * - 헤더 셀(`TableTh`)은 이미 `bg-surface` 를 갖고 있으므로 **배경 클래스를 더하지 않는다**
 *   (`cn()` 은 클래스를 병합하지 않아 같은 속성을 두 번 방출하면 순서가 승자를 정한다).
 * ====================================================================== */

/**
 * 좌측 고정 5열의 `left` 오프셋 — **`<colgroup>` 폭의 누적합**이다.
 * 40 / 72 / 112 / 112 / 232 → 0 · 40 · 112 · 224 · 336 (합 568)
 *
 * ⚠️ 파생값이라 `<colgroup>` 을 고치면 **반드시 여기도 함께** 고쳐야 한다.
 * 어긋나면 고정 열이 서로 겹쳐 글자가 포개진다 — 가로 스크롤을 해 봐야 보이므로
 * 렌더 테스트로는 잡히지 않는다.
 */
const FROZEN_LEFT = ["left-0", "left-10", "left-28", "left-56", "left-84"];

/**
 * 고정 구간의 폭 — `DataTableShell` 이 가로 스크롤바를 이만큼 **비켜서** 그린다.
 *
 * 안 그러면 바가 표 전체 폭에 깔려 "당기면 고정 열도 움직이겠지"로 읽히는데
 * 실제로는 안 움직인다. 이 화면은 **양쪽에 고정 열이 있어** 두 값을 다 준다.
 *   좌측 5열 40+72+112+112+232 = 568 · 우측 `관리` 80
 * ⚠️ `<colgroup>` 폭·`FROZEN_LEFT` 와 **함께 고쳐야 한다.**
 */
const FROZEN_LEAD_WIDTH = 568;
const FROZEN_TRAIL_WIDTH = 80;

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
 * KC 인증 · 등록 이미지 표기 — 원본과 같은 `O`/`X`.
 *
 * 색은 **`X` 쪽만** 준다. 비대칭이 의도다(§3-1 "플래그") — 미인증 상품 노출은
 * 본사에 연대책임이 발생하는 사안이라 22열을 훑을 때 걸려야 한다.
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
 * `YYYY-MM-DD HH:mm` 의 공백 구분자는 브라우저별 파싱이 갈려 `T` 로 바꿔 넘긴다.
 * 시작일은 00:00, 종료일은 23:59:59 까지 포함한다.
 *
 * ⚠️ **값 자체가 없으면 기간 조회에서 뺀다.** 판매종료일이 빈 상품은 "무기한"이라
 * 어떤 기간에도 속하지 않는다 — 이걸 통과시키면 "9월에 끝나는 상품"을 찾을 때
 * 끝나지 않는 상품이 전부 섞여 나온다.
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

  const [status, setStatus] = useState("all");
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
  const [detail, setDetail] = useState<Product | null>(null);
  /**
   * 반려 사유 입력 대상의 **원본 선택**. 일괄(선택 행)과 단건(행·모달)이 같은 모달을 쓴다.
   * 자격 판정은 아래에서 하므로 여기에는 고른 것을 그대로 담는다 —
   * 처리한 수와 제외한 수를 둘 다 알리려면 원본이 있어야 한다.
   */
  const [rejectSource, setRejectSource] = useState<Product[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTouched, setRejectTouched] = useState(false);
  /** 반려 사유 보기 대상 */
  const [reasonTarget, setReasonTarget] = useState<Product | null>(null);

  /* 카테고리 3단 연쇄 — 상위가 풀리면 하위 선택지도 사라진다 */
  const majorNode = CATEGORY_TREE.find((node) => node.value === major);
  const middleNode = majorNode?.children?.find((node) => node.value === middle);

  const majorOptions = [
    { value: "all", label: CATEGORY_ALL_LABEL.major },
    ...CATEGORY_TREE.map((node) => ({ value: node.value, label: node.label })),
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

  /*
   * 상태를 **뺀** 나머지 조건까지만 좁힌 집합.
   * 상태 대시의 건수는 여기서 세야 "렌트만 보는 중"일 때 건수도 함께 줄어든다.
   * (`filtered` 로 세면 고른 상태의 카드만 숫자가 남고 나머지는 전부 0이 된다)
   */
  const scoped = PRODUCTS.filter((product) => {
    const matchMode = mode === "all" || product.mode === mode;
    const matchDisplay = display === "all" || product.display === display;
    const matchMajor = major === "all" || product.major === major;
    const matchMiddle = middle === "all" || product.middle === middle;
    const matchMinor = minor === "all" || product.minor === minor;
    /* 검색은 **고른 대상 한 곳만** 훑는다(원본 `_searchfield`) */
    const matchKeyword =
      keyword.trim() === "" || product[searchField].includes(keyword.trim());

    return (
      matchMode &&
      matchDisplay &&
      matchMajor &&
      matchMiddle &&
      matchMinor &&
      matchKeyword &&
      inPeriod(product[dateField], period)
    );
  });

  const filtered = scoped.filter(
    (product) => status === "all" || product.status === status,
  );

  /** 상태별 건수 — 표와 어긋날 수 없도록 **지금 행에서 직접 센다** */
  const dash = FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count:
      item.value === "all"
        ? scoped.length
        : scoped.filter((product) => product.status === item.value).length,
    /* 원본은 상태마다 전이 설명을 달아 둔다. "전체"에는 없다 */
    tip:
      item.value === "all" ? undefined : STATUS_TIPS[item.value as SaleStatus],
  }));

  /*
   * 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다. 그대로 두면 빈 표가
   * 그려지므로 마지막 페이지로 당긴다.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /** 선택은 **보이는 페이지 단위**다. 페이지를 넘기면 헤더 체크박스도 그 페이지를 가리킨다 */
  const pageIds = paged.map((product) => product.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const somePageSelected =
    pageIds.some((id) => selected.includes(id)) && !allPageSelected;

  const selectedProducts = PRODUCTS.filter((product) =>
    selected.includes(product.id),
  );

  /*
   * 처분 자격 — 상태가 곧 자격이다(원본 `productDispositionActions`).
   * 자격 없는 버튼이 뜨면 누를 수 있는 것처럼 보이고, 눌러도 뜻 없는 조작이 일어난다.
   */
  const approvable = selectedProducts.filter(canApprove);
  const rejectable = selectedProducts.filter(canReject);

  /** 반려 모달이 실제로 처리할 대상과, 자격이 없어 빠진 수 */
  const rejectTargets = rejectSource.filter(canReject);
  const rejectSkipped = rejectSource.length - rejectTargets.length;

  /** 초기화는 한 곳에서만 정의한다 — 되돌릴 항목이 늘어도 여기만 고치면 된다 */
  const resetFilters = () => {
    setStatus("all");
    setMode("all");
    setDisplay("all");
    setMajor("all");
    setMiddle("all");
    setMinor("all");
    setDateField("date");
    setPeriod(undefined);
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPage(1);
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

  const openReject = (targets: Product[]) => {
    setRejectSource(targets);
    setRejectReason("");
    setRejectTouched(false);
  };

  const closeReject = () => {
    setRejectSource([]);
    setRejectReason("");
    setRejectTouched(false);
  };

  const submitReject = () => {
    setRejectTouched(true);
    if (rejectReason.trim() === "") return;

    toast({
      message: rejectMessage(rejectTargets.length, rejectSkipped),
      tone: "critical",
    });
    setSelected([]);
    closeReject();
  };

  const approve = (targets: Product[]) => {
    const done = targets.filter(canApprove).length;
    toast(approveMessage(done, targets.length - done));
    setSelected([]);
  };

  const rejectInvalid = rejectTouched && rejectReason.trim() === "";

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
      header={
        <PageHeader
          title="상품 관리"
          actions={
            <Button
              variant="secondary"
              onClick={() => toast("엑셀 파일을 내려받았습니다")}
            >
              <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
              엑셀 다운로드
            </Button>
          }
        />
      }
    >
      {/*
        상시 안내 배너 (원본 `data-area="products.note"`).
        ⚠️ 도움말 툴팁으로 접지 말 것 — 마지막 줄(연대책임) 때문에 배너다.
        호버해야 보이는 자리에 두면 읽지 않은 채 미인증 상품을 노출시킬 수 있다.
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
        판매 상태별 건수 대시 — 원본 `StatDash`.
        건수를 보여주면서 **그 자체가 상태 필터**다(원본 `chips[0].dash = true` 라
        필터바에서 빠지고 대시가 그 역할을 가져간다).
      */}
      <Card>
        <CardBody>
          {/*
            건수 대시 = 필터. 상자의 시각 규격 · 선택/hover 축 분리 · 접근가능 이름
            조립 · 툴팁 분기는 전부 `StatGrid` 가 맡는다 (docs/DESIGN-dashboard.md §D4).
            여기서는 **무엇을 세는지**만 말한다.
          */}
          <StatGrid
            items={dash.map((item) => ({
              value: item.value,
              label: item.label,
              count: String(item.count),
              unit: DASH_UNIT,
              tip: item.tip,
            }))}
            selected={status}
            onSelect={(value) => {
              setStatus(value);
              setPage(1);
            }}
            ariaLabel="판매 상태별 건수"
            columns={6}
          />
        </CardBody>
      </Card>

      <DataTableShell
        /* 양쪽 고정 열을 비켜서 스크롤바를 그린다 — 바의 범위 = 실제 스크롤 범위 */
        scrollLeadWidth={FROZEN_LEAD_WIDTH}
        scrollTrailWidth={FROZEN_TRAIL_WIDTH}
        toolbarStart={
          /* 상태 축의 입구는 위의 대시 하나뿐이다 — 여기에는 유형만 둔다 */
          <RadioGroup
            value={mode}
            onValueChange={(value) => {
              setMode(value);
              setPage(1);
            }}
            orientation="horizontal"
            aria-label="유형"
          >
            {MODE_FILTERS.map((item) => (
              <Radio
                key={item.value}
                value={item.value}
                label={item.label}
                size="small"
              />
            ))}
          </RadioGroup>
        }
        toolbarEnd={
          <>
            {/* 전시 상태는 판매 상태와 **다른 축**이다(원본 `showStat`) */}
            <Select
              className="w-36"
              aria-label="전시 상태"
              options={DISPLAY_FILTERS}
              value={display}
              onValueChange={(value) => {
                setDisplay(value);
                setPage(1);
              }}
            />
            <Select
              className="w-36"
              aria-label="카테고리 대분류"
              options={majorOptions}
              value={major}
              onValueChange={(value) => {
                setMajor(value);
                setMiddle("all");
                setMinor("all");
                setPage(1);
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
                setPage(1);
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
                setPage(1);
              }}
            />
            <Select
              className="w-32"
              aria-label="기간 종류"
              options={DATE_FIELDS}
              value={dateField}
              onValueChange={(value) => {
                setDateField(value as ProductDateField);
                setPage(1);
              }}
            />
            <DatePicker
              mode="range"
              value={period}
              onChange={setPeriod}
              startPlaceholder="시작일"
              endPlaceholder="종료일"
            />
            {/*
              검색 대상 셀렉트 — 한 번에 하나만 훑는다.
              세 필드를 동시에 훑으면 "맘스케어"가 셀러명에서 걸린 것인지
              상품명에 들어간 것인지 결과만 보고는 구별할 수 없다.
            */}
            <Select
              className="w-28"
              aria-label="검색 대상"
              options={SEARCH_FIELDS}
              value={searchField}
              onValueChange={(value) => {
                setSearchField(value as ProductSearchField);
                setPage(1);
              }}
            />
            <Input
              placeholder={SEARCH_PLACEHOLDER}
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
        isEmpty={filtered.length === 0}
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
            start={
              <span className="body-small text-text-sub">
                총 {filtered.length}건
              </span>
            }
          />
        }
      >
        <Table>
          {/*
            table-fixed 라 폭 지정 필수.
            좌측 고정 5열 = 64+80+112+112+208 = 576 (FROZEN_LEFT 와 짝을 이룬다)
            나머지 18열 = 2,144 → 표 전체 2,720
          */}
          <colgroup>
            <col className="w-10" />
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
            <col className="w-35" />
            <col className="w-35" />
            <col className="w-20" />
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
              <TableTh>상품등록일</TableTh>
              <TableTh>최종수정일</TableTh>
              <TableTh className={cn("sticky right-0 z-2", FROZEN_EDGE_LEFT)}>
                관리
              </TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((product) => {
              const statusMeta = STATUS_META[product.status];
              const modeMeta = MODE_META[product.mode];
              const displayMeta = DISPLAY_META[product.display];
              const isRent = product.mode === "rent";
              const hasReason =
                product.status === "rejected" || product.status === "rereview";

              return (
                <TableRow
                  key={product.id}
                  clickable
                  onClick={() => setDetail(product)}
                >
                  <TableTd className={frozenTd(0)}>
                    <div
                      role="presentation"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        size="small"
                        aria-label={product.name + " 선택"}
                        checked={selected.includes(product.id)}
                        onChange={() => toggleRow(product.id)}
                      />
                    </div>
                  </TableTd>
                  <TableTd align="center" className={frozenTd(1)}>
                    <Tag tone={modeMeta.tone} size="small">
                      {modeMeta.label}
                    </Tag>
                  </TableTd>
                  <TableTd className={frozenTd(2)}>{product.seller}</TableTd>
                  <TableTd className={frozenTd(3)}>{product.id}</TableTd>
                  <TableTd ellipsis className={frozenTd(4)}>
                    {product.name}
                  </TableTd>
                  <TableTd>
                    {isRent ? won(product.rentBase ?? 0) : DASH}
                  </TableTd>
                  <TableTd>
                    {isRent ? won(product.rentDiscount ?? 0) : DASH}
                  </TableTd>
                  <TableTd>{isRent ? rentPriceText(product) : DASH}</TableTd>
                  <TableTd>{isRent ? won(product.deposit ?? 0) : DASH}</TableTd>
                  <TableTd>
                    {isRent ? DASH : won(product.saleBase ?? 0)}
                  </TableTd>
                  <TableTd>
                    {isRent ? DASH : won(product.saleDiscount ?? 0)}
                  </TableTd>
                  <TableTd>{isRent ? DASH : won(salePriceOf(product))}</TableTd>
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
                      Tag 는 표시 전용(span)이라 클릭 대상을 따로 둔다.
                    */}
                    <div className="flex flex-col items-center gap-1">
                      <Tag tone={statusMeta.tone} dot size="small">
                        {statusMeta.label}
                      </Tag>
                      {hasReason && (
                        <div
                          role="presentation"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <TextButton
                            size="small"
                            tone="secondary"
                            onClick={() => setReasonTarget(product)}
                          >
                            사유 보기
                          </TextButton>
                        </div>
                      )}
                    </div>
                  </TableTd>
                  <TableTd align="center">
                    <Tag tone={displayMeta.tone} size="small">
                      {displayMeta.label}
                    </Tag>
                  </TableTd>
                  {/* 저장은 하이픈, 화면은 점 — 날것을 그대로 흘리지 않는다 */}
                  <TableTd>{ymdhm(product.date)}</TableTd>
                  <TableTd>{ymdhm(product.updatedAt)}</TableTd>
                  <TableTd
                    className={cn(
                      "sticky right-0 z-1 bg-inherit",
                      FROZEN_EDGE_LEFT,
                    )}
                  >
                    <div
                      role="presentation"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {/* 원본 관리 열도 `수정` 하나뿐이다 */}
                      <Button
                        size="small"
                        variant="secondary"
                        aria-label={product.name + " 수정"}
                        onClick={() => toast("상품 수정 화면을 엽니다")}
                      >
                        수정
                      </Button>
                    </div>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        일괄 처리 바.
        기획서는 승인/반려 버튼을 목록 헤더에 두지만, 이 디자인 시스템에서 여러 행을
        골라 한꺼번에 처리하는 규격은 §25 SelectionBar 다.
        ⚠️ 버튼은 **고른 행의 자격**이 있을 때만 나온다 — 이미 반려된 상품에
        '반려 처리'가 뜨면 화면이 거짓말을 한다.
      */}
      <SelectionBar
        open={selected.length > 0}
        count={selected.length}
        onClear={() => setSelected([])}
      >
        {approvable.length > 0 && (
          <SelectionBarButton
            icon={<Check size={16} strokeWidth={1.2} aria-hidden />}
            onClick={() => approve(selectedProducts)}
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
            onClick={() => openReject(selectedProducts)}
          >
            반려 처리
          </SelectionBarButton>
        )}
      </SelectionBar>

      {/*
        상품 미리보기 — 4항목짜리 빠른 확인용이다.
        상품 상세 화면은 이 배치에 없으므로 푸터는 "전체 상세 보기" 대신
        이 화면의 도메인 액션(승인/반려)을 놓는다. 자격 규칙은 SelectionBar 와 같다 —
        둘이 어긋나면 같은 상품에 대해 화면이 두 가지 말을 한다.
      */}
      <Modal open={detail !== null} onClose={() => setDetail(null)}>
        <ModalHeader title="상품 미리보기" description={detail?.id} />
        <ModalBody>
          <InfoList>
            <InfoItem label="셀러">{detail?.seller}</InfoItem>
            <InfoItem label="상품명">{detail?.name}</InfoItem>
            <InfoItem label="가격">{detail ? priceText(detail) : ""}</InfoItem>
            <InfoItem label="판매 상태">
              {detail && (
                <Tag tone={STATUS_META[detail.status].tone} dot size="small">
                  {STATUS_META[detail.status].label}
                </Tag>
              )}
            </InfoItem>
          </InfoList>
        </ModalBody>
        <ModalFooter>
          {detail && canReject(detail) && (
            <Button
              size="large"
              variant="secondary"
              onClick={() => {
                openReject([detail]);
                setDetail(null);
              }}
            >
              반려 처리
            </Button>
          )}
          {detail && canApprove(detail) && (
            <Button
              size="large"
              onClick={() => {
                approve([detail]);
                setDetail(null);
              }}
            >
              승인 처리
            </Button>
          )}
        </ModalFooter>
      </Modal>

      {/*
        반려 사유 입력 — 일괄·단건이 같은 모달을 쓴다.
        ⚠️ 제목의 건수는 **자격 있는 수**다. 고른 수를 그대로 쓰면 모달이 4건이라
        말하고 결과는 3건이 되어 화면이 스스로 모순된다.
      */}
      <Modal
        open={rejectTargets.length > 0}
        onClose={closeReject}
        size="medium"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={
            rejectTargets.length > 1
              ? "상품 반려 사유 입력 (" + rejectTargets.length + "건)"
              : "상품 반려 사유 입력"
          }
          description={
            rejectTargets.length === 1 ? rejectTargets[0].name : undefined
          }
        />
        <ModalBody>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder={REJECT_PLACEHOLDER}
            minRows={4}
            invalid={rejectInvalid}
            aria-label="반려 사유"
          />
          {rejectInvalid ? (
            <p role="alert" className="body-small text-text-critical">
              {REJECT_ERROR}
            </p>
          ) : (
            <p className="body-small text-text-minimal">{REJECT_NOTICE}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="large" onClick={closeReject}>
            닫기
          </Button>
          <Button variant="critical" size="large" onClick={submitReject}>
            반려 처리
          </Button>
        </ModalFooter>
      </Modal>

      {/* 반려 사유 보기 */}
      <Modal
        open={reasonTarget !== null}
        onClose={() => setReasonTarget(null)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title="반려 사유"
          description={reasonTarget?.name}
        />
        <ModalBody>
          {reasonTarget && (
            <Tag tone={STATUS_META[reasonTarget.status].tone} dot>
              {STATUS_META[reasonTarget.status].label}
            </Tag>
          )}
          <p className="body-medium text-text">
            {reasonTarget?.reject?.reason ?? REJECT_EMPTY}
          </p>
          <p className="body-small text-text-minimal">
            {reasonTarget?.reject ? reasonTarget.reject.at + " 처리" : ""}
            {reasonTarget?.status === "rereview" ? " · " + REREVIEW_NOTE : ""}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setReasonTarget(null)}
          >
            닫기
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
