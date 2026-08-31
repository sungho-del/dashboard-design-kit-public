import { useState } from "react";
import { ArrowDownToLine, HelpCircle, Search } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTableShell,
  DatePicker,
  EmptyState,
  FormField,
  Gnb,
  IconButton,
  InfoItem,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalHeader,
  PageHeader,
  Pagination,
  Radio,
  RadioGroup,
  Select,
  StatGrid,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
  Tooltip,
  useToast,
  type DateRange,
} from "../../components/ui";
import {
  EMPTY_FILTERS,
  EXPORT_EXTRA_COLUMNS,
  EXPORT_NAME,
  FILTERS,
  ORDERS,
  PAGE_SIZE,
  SELLER_KINDS,
  SELLERS,
  SEARCH_FIELDS,
  STATUS_META,
  STATUS_OPTIONS_BY_TYPE,
  TYPE_META,
  TYPE_NOTICE,
  filtersFromQuery,
  rentPriceOf,
  searchHaystack,
  sellerLabel,
  won,
  ymdhm,
  type Order,
  type OrderFilters,
} from "./OrderListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S08 주문 목록 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형
 * 렌트·판매 주문을 **처리단위** 기준으로 조회하는 어드민의 중심 목록.
 * 조회 조건이 6종이고 표가 24열이라, 템플릿(`src/pages/OrderListPage.tsx`)의
 * "툴바 한 줄" 구성으로는 담기지 않는다. 세 군데가 갈린다 — 아래 참고.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./OrderListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                          |
 * | ---------------------- | --------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `OrderListPage.data.ts` **전체**              |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 조회 조건 구성         | "조회 조건" 카드                               |
 * | 화면 제목·도움말       | `PageHeader` 의 `title` · `badges`            |
 *
 * ## 템플릿과 갈린 세 곳 (의도된 것)
 * 1. **유형이 필터바가 아니라 건수 대시다.** 원본이 유형 칩에 `dash: !0` 을 줘서
 *    필터바가 아니라 표 위의 건수 카드로 내보낸다. 카드가 곧 필터라
 *    건수를 읽는 것과 좁히는 것이 한 동작이 된다.
 * 2. **조회 조건이 툴바가 아니라 카드다.** 필터가 6종(기간·판매자·셀러·상태·
 *    검색조건·검색어)이라 `DataTableShell` 툴바에 넣으면 라벨 없이 세 줄로 접힌다.
 *    "본사 / 셀러" 라디오는 그룹 이름이 없으면 무엇을 고르는지 알 수 없어 라벨이 필수다.
 *    → `FormField` 로 라벨을 붙여 카드에 담고, 툴바에는 기획서가 정한
 *    **목록 헤더(총 N건 · 엑셀 다운로드)** 만 남긴다.
 * 3. **표가 가로로 스크롤한다.** 24열이라 `<colgroup>` 을 %가 아니라
 *    **px(4px 그리드 유틸)** 로 준다. 가로 스크롤은 `DataTableShell` 의
 *    표 래퍼(`overflow-auto`) 안에서만 일어난다 — `AppShell` 콘텐츠가 `min-w-0` 이라
 *    페이지 본문은 밀리지 않는다.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **증감 요약 카드 3장**(`STATS` · "오늘 신규 주문 128건 +12건" 류).
 *   원본 어디에도 없는 지어낸 숫자였다. 그 자리에 원본이 실제로 두는 유형 대시를 세웠다
 * - **`판매자`(본사/셀러 배지) + `셀러`(이름) 두 열**. 원본 `y()` 는
 *   `"자체" === owner ? "본사" : sellerName` 으로 **열 하나**로 끝낸다.
 *   그래서 `SELLER_KIND_META` 배지가 사라졌다
 * - **`결제금액`·`처리단위`·`주문일시` 열**. 원본에서 이 셋은
 *   `ORDER_EXPORT_EXTRA_COLUMNS`(엑셀 전용)다. 화면에서는 겹치는 정보라 뺐다
 * - **행 액션(`배송 처리` 버튼 + 확인 모달)**. 원본 주문 목록에는 행 액션이 없다.
 *   미리보기 모달에 남는 버튼은 헤더의 닫기 X 하나뿐이다
 * - **유형 `SegmentedControl`**. 유형은 대시 카드가 맡는다
 *
 * ## 그대로 두는 것 (도메인 무관 · §7-1 실측 규격)
 * `DataTableShell` 셸 구조 · 셀 정렬 규칙(§7-2) · 페이지 범위 클램프 ·
 * `inPeriod` 날짜 필터 · 행클릭 → Modal(미리보기) 흐름
 * ====================================================================== */

/**
 * 결제 일시가 선택한 기간 안에 드는지.
 *
 * 기획서가 기간 필터 기준을 **결제일**로 못박아 `order.date` 가 결제 일시다.
 * `"YYYY-MM-DD HH:mm"` 의 공백 구분자는 브라우저별 파싱이 갈리므로 `T` 로 바꿔
 * ISO 형태로 넘긴다. 시작일은 00:00, 종료일은 23:59:59 까지 포함한다
 * (종료일을 그대로 쓰면 그날 낮에 결제된 건이 빠진다).
 */
const inPeriod = (dateText: string, range?: DateRange) => {
  if (!range?.from) return true;

  const at = new Date(dateText.replace(" ", "T"));
  if (Number.isNaN(at.getTime())) return true;

  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);

  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);

  return at >= from && at <= to;
};

/** 값이 없는 칸은 빈칸이 아니라 `—` 로 —— 데이터가 없는 것과 화면이 깨진 것을 구별한다 */
const dash = (value: string) => (value.trim() === "" ? "—" : value);

/** 유형에 따라 존재하지 않는 금액(판매 건의 렌트가 등)은 `—` */
const money = (value: number | null) => (value === null ? "—" : won(value));

/**
 * 좌측 고정 5열 (원본 frozen: 상태 · 주문번호 · 유형 · 판매자 · 이용 기간).
 *
 * 폭과 `left` 오프셋이 **짝**이다 — 앞 열들의 폭 합이 다음 열의 오프셋이 된다.
 *   w-29(116) · w-39(156) · w-22(88) · w-32(128) · w-52(208)
 *   →  left-0 · left-29 · left-68 · left-90 · left-122
 * `<colgroup>` 을 고치면 **여기도 함께 고친다.** 어긋나면 열이 서로 겹쳐 덮는다.
 */
const FROZEN_TH = [
  "sticky left-0 z-1",
  "sticky left-29 z-1",
  "sticky left-68 z-1",
  "sticky left-90 z-1",
  /*
   * 마지막 고정 열만 오른쪽 경계선을 갖는다 — 여기가 "고정 구간의 끝"이라는 표시다.
   * `border-collapse: collapse` 에서는 border 를 셀이 아니라 표가 그려서, 셀이
   * sticky 로 떠 있는 동안 border 만 원래 자리에 남아 함께 스크롤돼 사라진다.
   * 그래서 `::after` 로 그린다 (`Table.tsx` 의 sticky thead 가 쓰는 것과 같은 방식).
   * 배치 기준은 `sticky` 자신이 만든다 — `relative` 를 더하면 position 이 두 번 나온다.
   */
  "sticky left-122 z-1 after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-divide after:content-['']",
];

/**
 * 고정 구간의 총 폭 — 마지막 오프셋(488) + 그 열 폭(208).
 *
 * `DataTableShell` 이 가로 스크롤바를 이만큼 **들여서** 그린다. 안 그러면 바가 표 전체
 * 폭에 깔려 "당기면 고정 열도 움직이겠지"로 읽히는데 실제로는 안 움직인다.
 * ⚠️ 위 폭·오프셋과 **같이 고쳐야 하는 세 번째 값**이다.
 */
const FROZEN_LEAD_WIDTH = 122 * 4 + 52 * 4;

/**
 * 본문 쪽 고정 열은 배경을 **행에서 물려받는다**(`bg-inherit`).
 *
 * zebra 줄무늬는 `<tr>` 이 칠하는데(`odd:bg-surface even:bg-surface-sub`), 고정 열이
 * 배경 없이 떠 있으면 아래를 지나가는 셀이 비쳐 글자가 겹쳐 보인다.
 * 색을 새로 지정하면 zebra 홀짝과 hover 세 상태를 따라가지 못하므로 상속이 유일한 답이다.
 * (헤더 셀은 `TableTh` 가 이미 `bg-surface` 를 갖고 있어 더할 것이 없다.)
 */
const FROZEN_TD = FROZEN_TH.map((cls) => cls + " bg-inherit");

export interface OrderListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function OrderListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: OrderListPageProps) {
  const { toast } = useToast();

  /*
   * 대시보드 흐름 타일이 `/orders-all?stat=렌트&flow=연체중` 으로 링크한다.
   * 받는 쪽이 없으면 **링크는 열리고 필터만 안 걸린다** — 화면은 멀쩡해 보여서
   * 타입·린트로는 잡히지 않는다. 쿼리 → 필터 변환과 정합성 보정은 도메인이라
   * `filtersFromQuery`(도메인 층)가 하고, 뼈대는 그 결과를 초기값으로 받기만 한다.
   */
  const [filters, setFilters] = useState<OrderFilters>(() =>
    filtersFromQuery(new URLSearchParams(window.location.search)),
  );
  const [page, setPage] = useState(1);

  const [preview, setPreview] = useState<Order | null>(null);

  /** 조건 하나를 갈아끼운다. **조건이 바뀌면 페이지는 언제나 1로 되돌아간다** */
  const patch = (next: Partial<OrderFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };

  const statusOptions =
    STATUS_OPTIONS_BY_TYPE[filters.type] ?? STATUS_OPTIONS_BY_TYPE.all;

  /*
   * 유형이 바뀌면 상태 선택지가 통째로 갈린다(렌트 11단계 / 판매 5단계).
   * 판매로 좁혔는데 "대여중"이 남아 있으면 **필터는 걸린 채인데 결과는 늘 0건**이 되고,
   * 운영자는 셀렉트에 보이지도 않는 값 때문에 빈 화면을 보게 된다. 그래서 되돌린다.
   */
  const handleTypeChange = (next: string) => {
    const allowed = STATUS_OPTIONS_BY_TYPE[next] ?? STATUS_OPTIONS_BY_TYPE.all;
    patch({
      type: next,
      status: allowed.some((option) => option.value === filters.status)
        ? filters.status
        : "all",
    });
  };

  /*
   * 판매자를 "셀러"에서 다른 값으로 옮기면 셀러 지정도 함께 푼다.
   * 셀렉트가 비활성으로 잠기는데 값은 남아 있으면 손댈 수 없는 필터가 걸린 셈이 된다.
   */
  const handleSellerKindChange = (next: string) => {
    patch({
      sellerKind: next,
      sellerId: next === "seller" ? filters.sellerId : "all",
    });
  };

  /*
   * 유형을 **뺀** 나머지 조건까지 적용한 결과. 대시 카드의 건수를 여기서 센다.
   * 전체 데이터에서 세면 검색을 좁혀도 숫자가 안 변해 **표와 모순된 건수**가 남는다.
   */
  const base = ORDERS.filter((order) => {
    const matchSellerKind =
      filters.sellerKind === "all" || order.sellerKind === filters.sellerKind;
    const matchSeller =
      filters.sellerId === "all" || order.sellerId === filters.sellerId;
    const matchStatus =
      filters.status === "all" || order.status === filters.status;
    const matchKeyword =
      filters.keyword.trim() === "" ||
      searchHaystack(order, filters.searchField).includes(
        filters.keyword.trim(),
      );
    return (
      matchSellerKind &&
      matchSeller &&
      matchStatus &&
      matchKeyword &&
      inPeriod(order.date, filters.period)
    );
  });

  /** 카드마다 붙는 건수. `전체 = 렌트 + 판매` 가 언제나 성립한다 */
  const countOf = (value: string) =>
    value === "all"
      ? base.length
      : base.filter((order) => order.type === value).length;

  const filtered =
    filters.type === "all"
      ? base
      : base.filter((order) => order.type === filters.type);

  /*
   * 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다(2페이지를 보던 중
   * 1페이지까지만 남는 경우). 그대로 두면 **빈 표**가 그려지므로 마지막 페이지로 당긴다.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /* 초기화는 **한 곳에서만 정의한다.** 카드와 빈 상태 두 곳에서 부르는데 한쪽만
   * 되돌리면 "초기화했는데 여전히 비어 있음"이 된다. 조건이 늘어도 여기만 고친다. */
  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
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
      header={
        <PageHeader
          title="주문 목록"
          badges={
            <Tooltip
              title="상태 흐름"
              content="렌트는 배송 완료 뒤에도 대여중 → 수거 신청 → 검수중 → 검수완료 → 반납완료로 이어집니다. 판매는 구매확정에서 끝납니다. 연체중은 보증금 차감으로 이어지므로 먼저 처리하세요."
            >
              <IconButton
                size="small"
                label="상태 도움말"
                icon={<HelpCircle strokeWidth={1.2} aria-hidden />}
              />
            </Tooltip>
          }
        />
      }
    >
      {/*
        유형 대시 — 원본 `chip.dash: !0`. 건수를 보여주면서 그 자체가 유형 필터다.
        흰 카드(그룹) 안에 연한 그레이 상자(항목) 셋이 들어간다.
        ⚠️ 증감(±)·비교 기준은 두지 않는다 — 원본에 없는 숫자다.
      */}
      <Card>
        <CardBody>
          {/*
            건수 대시 = 필터. 상자의 시각 규격 · 선택/hover 축 분리 · 접근가능 이름
            조립 · 툴팁 분기는 전부 `StatGrid` 가 맡는다 (docs/DESIGN-dashboard.md §D4).
            여기서는 **무엇을 세는지**만 말한다.
          */}
          <StatGrid
            items={FILTERS.map((item) => ({
              value: item.value,
              label: item.label,
              count: String(countOf(item.value)),
              unit: "건",
            }))}
            selected={filters.type}
            onSelect={handleTypeChange}
            ariaLabel="유형"
            columns={3}
          />

          {/*
            유형별 안내 — 원본 `statusTips` 문구다. 렌트와 판매는 **열의 의미가 다르다**.
            원본은 툴팁으로 띄우지만, 이 문구는 "왜 이 열이 비어 있나"의 답이라
            표를 보기 **전에** 읽혀야 해서 상시 노출한다.
          */}
          <p className="body-small text-text-sub">
            {TYPE_NOTICE[filters.type]}
          </p>
        </CardBody>
      </Card>

      {/* 조회 조건 — 필터 6종. 라벨이 필요한 컨트롤이라 툴바가 아니라 카드에 담는다 */}
      <Card>
        <CardHeader
          title="조회 조건"
          action={
            <TextButton tone="secondary" onClick={resetFilters}>
              초기화
            </TextButton>
          }
        />
        <CardBody>
          {/* §29-4 균등 분할 — 래퍼 flex + 각 항목 flex-1 min-w-0 (2열 grid 금지) */}
          <div className="flex flex-wrap items-start gap-2">
            <FormField label="기간 (결제일)" className="flex-1 min-w-0">
              <DatePicker
                mode="range"
                value={filters.period}
                onChange={(next) => patch({ period: next })}
                startPlaceholder="시작일"
                endPlaceholder="종료일"
              />
            </FormField>
            {/* 그룹 컨트롤은 `group` 이 없으면 접근가능 이름이 아예 없다 (§29-6b) */}
            <FormField label="판매자" group className="flex-1 min-w-0">
              <RadioGroup
                orientation="horizontal"
                value={filters.sellerKind}
                onValueChange={handleSellerKindChange}
              >
                {SELLER_KINDS.map((item) => (
                  <Radio
                    key={item.value}
                    value={item.value}
                    label={item.label}
                  />
                ))}
              </RadioGroup>
            </FormField>
            <FormField
              label="셀러"
              className="flex-1 min-w-0"
              description="판매자에서 '셀러'를 선택하면 특정 셀러를 지정할 수 있습니다."
            >
              <Select
                options={SELLERS}
                value={filters.sellerId}
                onValueChange={(next) => patch({ sellerId: next })}
                disabled={filters.sellerKind !== "seller"}
                placeholder="셀러 전체"
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <FormField
              label="상태"
              className="flex-1 min-w-0"
              description={
                filters.type === "sale"
                  ? "판매는 구매확정에서 끝납니다."
                  : "렌트는 반납완료까지 이어집니다."
              }
            >
              <Select
                options={statusOptions}
                value={filters.status}
                onValueChange={(next) => patch({ status: next })}
                placeholder="상태 전체"
              />
            </FormField>
            <FormField label="검색조건" className="flex-1 min-w-0">
              <Select
                options={SEARCH_FIELDS}
                value={filters.searchField}
                onValueChange={(next) => patch({ searchField: next })}
                placeholder="조건 없음 (전체)"
              />
            </FormField>
            <FormField label="검색어" className="flex-1 min-w-0">
              <Input
                placeholder="검색어 입력"
                value={filters.keyword}
                onChange={(event) => patch({ keyword: event.target.value })}
                leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
              />
            </FormField>
          </div>
        </CardBody>
      </Card>

      {/* 목록 — 툴바에는 기획서가 정한 "목록 헤더"(총 N건 · 엑셀 다운로드)만 둔다 */}
      <DataTableShell
        /* 가로 스크롤바를 고정 구간만큼 들여서 그린다 — 바의 범위 = 실제 스크롤 범위 */
        scrollLeadWidth={FROZEN_LEAD_WIDTH}
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        toolbarEnd={
          <Button
            variant="secondary"
            /*
              표에 없는 열 셋(처리단위·결제금액·주문일시)이 파일에는 들어간다.
              파일을 열어 봐야 아는 것보다 내려받는 순간 알리는 편이 낫다.
            */
            onClick={() =>
              toast(
                `${EXPORT_NAME}_${filtered.length}건.csv 를 내려받았습니다 (${EXPORT_EXTRA_COLUMNS.map(
                  (column) => column.label,
                ).join("·")} 포함)`,
              )
            }
          >
            <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
            엑셀 다운로드
          </Button>
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
                {currentPage} / {totalPages} 페이지
              </span>
            }
          />
        }
      >
        <Table>
          {/*
            `table-fixed` 라 폭 지정이 필수다. 24열이라 %가 아니라 px 로 준다 —
            합계가 곧 표 폭이 되고, 그만큼 셸의 표 래퍼가 가로로 스크롤한다.
            ⚠️ 앞 5개는 `FROZEN_TH` 의 left 오프셋과 **짝**이다. 함께 고칠 것.
          */}
          <colgroup>
            <col className="w-29" />
            <col className="w-39" />
            <col className="w-22" />
            <col className="w-32" />
            <col className="w-52" />
            <col className="w-27" />
            <col className="w-39" />
            <col className="w-27" />
            <col className="w-29" />
            <col className="w-37" />
            <col className="w-32" />
            <col className="w-37" />
            <col className="w-32" />
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
              {/* 배지만 들어가는 열은 가운데 (§7-2) — th·td 를 반드시 함께 바꾼다 */}
              <TableTh align="center" className={FROZEN_TH[0]}>
                상태
              </TableTh>
              <TableTh className={FROZEN_TH[1]}>주문번호</TableTh>
              <TableTh align="center" className={FROZEN_TH[2]}>
                유형
              </TableTh>
              <TableTh className={FROZEN_TH[3]}>판매자</TableTh>
              <TableTh className={FROZEN_TH[4]}>이용 기간</TableTh>
              <TableTh>결제수단</TableTh>
              <TableTh>결제 일시</TableTh>
              <TableTh>배송 방법</TableTh>
              <TableTh>택배사</TableTh>
              <TableTh>송장번호</TableTh>
              <TableTh>수거 택배사</TableTh>
              <TableTh>수거 송장번호</TableTh>
              <TableTh>상품코드</TableTh>
              <TableTh>상품명</TableTh>
              {/* 크기를 비교하는 수치는 우측 (§7-2) */}
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
            {paged.map((order) => {
              const statusMeta = STATUS_META[order.status];
              const typeMeta = TYPE_META[order.type];
              return (
                <TableRow
                  key={order.id}
                  clickable
                  onClick={() => setPreview(order)}
                >
                  <TableTd align="center" className={FROZEN_TD[0]}>
                    <Tag tone={statusMeta.tone} dot>
                      {statusMeta.label}
                    </Tag>
                  </TableTd>
                  <TableTd className={FROZEN_TD[1]}>{order.id}</TableTd>
                  <TableTd align="center" className={FROZEN_TD[2]}>
                    <Tag tone={typeMeta.tone} size="small">
                      {typeMeta.label}
                    </Tag>
                  </TableTd>
                  {/* 원본 `y()` — 본사면 "본사", 아니면 셀러명. 열 하나로 끝낸다 */}
                  <TableTd className={FROZEN_TD[3]}>
                    {sellerLabel(order)}
                  </TableTd>
                  <TableTd className={FROZEN_TD[4]}>
                    {dash(order.usagePeriod)}
                  </TableTd>
                  <TableTd>{order.payMethod}</TableTd>
                  {/* 저장은 하이픈, 화면은 점 — 날것을 그대로 흘리지 않는다 */}
                  <TableTd>{ymdhm(order.date)}</TableTd>
                  <TableTd>{order.shipMethod}</TableTd>
                  <TableTd>{dash(order.carrier)}</TableTd>
                  <TableTd>{dash(order.trackingNo)}</TableTd>
                  <TableTd>{dash(order.pickupCarrier)}</TableTd>
                  <TableTd>{dash(order.pickupTrackingNo)}</TableTd>
                  <TableTd>{order.productCode}</TableTd>
                  <TableTd ellipsis>{order.productName}</TableTd>
                  <TableTd>{money(order.rentBasePrice)}</TableTd>
                  <TableTd>{won(order.discount)}</TableTd>
                  {/* 렌트가는 저장값이 아니라 원가−할인 파생값이다 */}
                  <TableTd>{money(rentPriceOf(order))}</TableTd>
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

      {/*
        주문 미리보기 — 4항목짜리 빠른 확인용이다.
        제목을 "주문 상세"로 두지 않는다. 표가 24열이라 전체 정보가 모달에 들어가지
        않으므로, 여기서 다 보여주려 들면 모달이 두 번째 표가 된다.
        ⚠️ 푸터(도메인 액션)를 두지 않는다 — 원본 주문 목록에는 행 액션이 없다.
        표에서 뺀 **결제금액**을 여기서 보는 것이 이 모달이 하는 일이다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="주문 미리보기" description={preview?.id} />
        <ModalBody>
          <InfoList>
            <InfoItem label="상품">{preview?.productName}</InfoItem>
            <InfoItem label="구매자">{preview?.buyerName}</InfoItem>
            <InfoItem label="결제금액">
              {preview ? won(preview.payAmount) : ""}
            </InfoItem>
            {/* 라벨이 4글자라 기본 폭 80 에 들어간다 — `labelWidth` 를 주지 않는다 */}
            <InfoItem label="결제 일시">
              {preview ? ymdhm(preview.date) : ""}
            </InfoItem>
          </InfoList>
        </ModalBody>
      </Modal>
    </AppShell>
  );
}
