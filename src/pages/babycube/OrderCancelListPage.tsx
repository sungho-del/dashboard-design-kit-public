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
  CANCELS,
  EMPTY_FILTERS,
  EXPORT_EXTRA_COLUMNS,
  EXPORT_NAME,
  FILTERS,
  PAGE_SIZE,
  SELLER_KINDS,
  SELLERS,
  SEARCH_FIELDS,
  STATUS_META,
  STATUS_OPTIONS,
  TYPE_META,
  filtersFromQuery,
  rentPriceOf,
  searchHaystack,
  sellerLabel,
  won,
  ymdhm,
  type Cancel,
  type CancelFilters,
} from "./OrderCancelListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S09 취소 목록 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형
 * 취소 요청이 걸린 **처리단위**를 조회한다.
 *
 * ⚠️ 원본 대조에서 밝혀진 사실: **취소 목록의 표는 주문 목록의 표와 같다.**
 * 컬럼 24개가 라벨·순서까지 동일하고 첫 열의 데이터만 취소 상태로 갈린다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./OrderCancelListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                           |
 * | --------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위 | `OrderCancelListPage.data.ts` **전체**         |
 * | 표 컬럼 구성          | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 조회 조건 구성        | "조회 조건" 카드                                |
 * | 화면 제목·도움말      | `PageHeader` 의 `title` · `badges`             |
 *
 * ## 형제 화면과 같은 뼈대를 **복사해서** 쓴다 (공용화하지 않는다)
 * S08·S10·S11 과 조회 조건 구성이 거의 같지만 각자 독립 파일이다.
 * 페이지는 템플릿이라, 공용 컴포넌트로 묶으면 서비스를 갈아끼울 때
 * **뼈대를 고쳐야** 한다. `.data.ts` 에 같은 도메인 상수가 반복되는 것도 의도된 것이다.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **원본에 없는 9열**: 주문 상태(`ORDER_STAGE_META`) · 취소 요청 일시 · 취소 사유 ·
 *   환불 금액 · 환불 수단 · 환불 일시 · 셀러 · 처리단위 · 결제금액.
 *   "배송중인 취소는 반품 전환"이라는 설명과 함께 세웠던 주문 상태 열도 원본에 없다
 * - **증감 요약 카드 3장**(`STATS` · "오늘 취소 요청 18건 -4건 · 취소율 3.2%").
 *   원본에 없는 지어낸 숫자였다. 그 자리에 원본이 실제로 두는 유형 대시를 세웠다
 * - **`판매자`(본사/셀러 배지) + `셀러`(이름) 두 열**. 원본 `b()` 는
 *   `"자체" === owner ? "본사" : sellerName` 으로 **열 하나**로 끝낸다
 * - **행 액션(`환불 승인` 버튼 + 확인 모달)**. 원본 취소 목록에는 행 액션이 없다
 * - **유형 `SegmentedControl`**. 유형은 대시 카드가 맡는다
 * - **유형별 안내 문구(`TYPE_NOTICE`)**. 원본 취소 목록에는 `statusTips` 가 없다 —
 *   형제 화면과 나란히 놓으면 허전하지만, 있지도 않은 문구를 지어 내는 것보다 낫다
 * ====================================================================== */

/**
 * 결제 일시가 선택한 기간 안에 드는지.
 * 기획서가 기간 필터 기준을 **결제일**로 못박아 `cancel.date` 가 결제 일시다.
 * `"YYYY-MM-DD HH:mm"` 의 공백 구분자는 브라우저별 파싱이 갈리므로 `T` 로 바꿔 넘긴다.
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

/** 값이 없는 칸은 빈칸이 아니라 `—` — 데이터가 없는 것과 화면이 깨진 것을 구별한다 */
const dash = (value: string) => (value.trim() === "" ? "—" : value);

/** 유형에 따라 존재하지 않는 금액(판매 건의 렌트가 등)은 `—` */
const money = (value: number | null) => (value === null ? "—" : won(value));

/**
 * 좌측 고정 5열 (원본 frozen: 상태 · 주문번호 · 유형 · 판매자 · 이용 기간).
 *
 * 폭과 `left` 오프셋이 **짝**이다 — 앞 열들의 폭 합이 다음 열의 오프셋이 된다.
 *   w-31(124) · w-39(156) · w-22(88) · w-32(128) · w-52(208)
 *   →  left-0 · left-31 · left-70 · left-92 · left-124
 * `<colgroup>` 을 고치면 **여기도 함께 고친다.**
 */
const FROZEN_TH = [
  "sticky left-0 z-1",
  "sticky left-31 z-1",
  "sticky left-70 z-1",
  "sticky left-92 z-1",
  /*
   * 마지막 고정 열만 오른쪽 경계선을 갖는다 — 고정 구간의 끝이라는 표시다.
   * `border-collapse: collapse` 에서는 sticky 셀의 border 가 함께 스크롤돼 사라지므로
   * `::after` 로 그린다. 배치 기준은 `sticky` 자신이 만든다(`relative` 를 더하지 않는다).
   */
  "sticky left-124 z-1 after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-divide after:content-['']",
];

/**
 * 고정 구간의 총 폭 — 좌측 고정 5열의 폭 합(124+156+88+128+208).
 *
 * `DataTableShell` 이 가로 스크롤바를 이만큼 **들여서** 그린다. 안 그러면 바가 표 전체
 * 폭에 깔려 "당기면 고정 열도 움직이겠지"로 읽히는데 실제로는 안 움직인다.
 * ⚠️ `<colgroup>` 폭·`left` 오프셋과 **함께 고쳐야 하는 세 번째 값**이다.
 */
const FROZEN_LEAD_WIDTH = 704;

/**
 * 본문 쪽 고정 열은 배경을 **행에서 물려받는다**(`bg-inherit`).
 * zebra 는 `<tr>` 이 칠하므로, 색을 새로 지정하면 홀짝·hover 세 상태를 따라가지 못한다.
 */
const FROZEN_TD = FROZEN_TH.map((cls) => cls + " bg-inherit");

export interface OrderCancelListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function OrderCancelListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: OrderCancelListPageProps) {
  const { toast } = useToast();

  /*
   * 원본 취소 목록도 주문 목록과 **같은 셸**을 써서 `stat`·`flow`·`owner`·
   * `sellerName`·`q`·`paidAt_from/to` 를 읽는다. 받는 쪽이 없으면
   * **링크는 열리고 필터만 안 걸린다** — 화면은 멀쩡해 보여서 타입·린트로는 안 잡힌다.
   */
  const [filters, setFilters] = useState<CancelFilters>(() =>
    filtersFromQuery(new URLSearchParams(window.location.search)),
  );
  const [page, setPage] = useState(1);

  const [preview, setPreview] = useState<Cancel | null>(null);

  /** 조건 하나를 갈아끼운다. **조건이 바뀌면 페이지는 언제나 1로 되돌아간다** */
  const patch = (next: Partial<CancelFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };

  /*
   * 판매자를 "셀러"에서 옮기면 셀러 지정도 함께 푼다.
   * 셀렉트가 잠기는데 값은 남아 있으면 손댈 수 없는 필터가 걸린 셈이 된다.
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
  const base = CANCELS.filter((cancel) => {
    const matchSellerKind =
      filters.sellerKind === "all" || cancel.sellerKind === filters.sellerKind;
    const matchSeller =
      filters.sellerId === "all" || cancel.sellerId === filters.sellerId;
    const matchStatus =
      filters.status === "all" || cancel.status === filters.status;
    const matchKeyword =
      filters.keyword.trim() === "" ||
      searchHaystack(cancel, filters.searchField).includes(
        filters.keyword.trim(),
      );
    return (
      matchSellerKind &&
      matchSeller &&
      matchStatus &&
      matchKeyword &&
      inPeriod(cancel.date, filters.period)
    );
  });

  /** 카드마다 붙는 건수. `전체 = 렌트 + 판매` 가 언제나 성립한다 */
  const countOf = (value: string) =>
    value === "all"
      ? base.length
      : base.filter((cancel) => cancel.type === value).length;

  const filtered =
    filters.type === "all"
      ? base
      : base.filter((cancel) => cancel.type === filters.type);

  /* 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다 — 빈 표 대신 마지막 페이지로 당긴다 */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /* 초기화는 한 곳에서만 정의한다 — 카드와 빈 상태 두 곳에서 부른다 */
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
          title="취소 목록"
          badges={
            <Tooltip
              title="취소 상태 흐름"
              content="취소 요청 → 환불 처리중 → 취소 완료 순으로 진행됩니다. 취소 요청은 사람이 판단해야 다음으로 넘어가고, 환불 처리중은 결제사가 처리하는 구간입니다."
            >
              <IconButton
                size="small"
                label="취소 상태 도움말"
                icon={<HelpCircle strokeWidth={1.2} aria-hidden />}
              />
            </Tooltip>
          }
        />
      }
    >
      {/*
        유형 대시 — 원본 `chip.dash: !0`. 건수를 보여주면서 그 자체가 유형 필터다.
        ⚠️ 증감(±)·취소율은 두지 않는다 — 원본에 없는 숫자다.
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
            onSelect={(value) => patch({ type: value })}
            ariaLabel="유형"
            columns={3}
          />
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
              description="취소 흐름은 렌트·판매가 같습니다."
            >
              <Select
                options={STATUS_OPTIONS}
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
            <col className="w-31" />
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
            {paged.map((cancel) => {
              const statusMeta = STATUS_META[cancel.status];
              const typeMeta = TYPE_META[cancel.type];
              return (
                <TableRow
                  key={cancel.id}
                  clickable
                  onClick={() => setPreview(cancel)}
                >
                  <TableTd align="center" className={FROZEN_TD[0]}>
                    <Tag tone={statusMeta.tone} dot>
                      {statusMeta.label}
                    </Tag>
                  </TableTd>
                  <TableTd className={FROZEN_TD[1]}>{cancel.id}</TableTd>
                  <TableTd align="center" className={FROZEN_TD[2]}>
                    <Tag tone={typeMeta.tone} size="small">
                      {typeMeta.label}
                    </Tag>
                  </TableTd>
                  {/* 원본 `b()` — 본사면 "본사", 아니면 셀러명. 열 하나로 끝낸다 */}
                  <TableTd className={FROZEN_TD[3]}>
                    {sellerLabel(cancel)}
                  </TableTd>
                  <TableTd className={FROZEN_TD[4]}>
                    {dash(cancel.usagePeriod)}
                  </TableTd>
                  <TableTd>{cancel.payMethod}</TableTd>
                  {/* 저장은 하이픈, 화면은 점 — 날것을 그대로 흘리지 않는다 */}
                  <TableTd>{ymdhm(cancel.date)}</TableTd>
                  <TableTd>{cancel.shipMethod}</TableTd>
                  <TableTd>{dash(cancel.carrier)}</TableTd>
                  <TableTd>{dash(cancel.trackingNo)}</TableTd>
                  <TableTd>{dash(cancel.pickupCarrier)}</TableTd>
                  <TableTd>{dash(cancel.pickupTrackingNo)}</TableTd>
                  <TableTd>{cancel.productCode}</TableTd>
                  <TableTd ellipsis>{cancel.productName}</TableTd>
                  <TableTd>{money(cancel.rentBasePrice)}</TableTd>
                  <TableTd>{won(cancel.discount)}</TableTd>
                  {/* 렌트가는 저장값이 아니라 원가−할인 파생값이다 */}
                  <TableTd>{money(rentPriceOf(cancel))}</TableTd>
                  <TableTd>{cancel.buyerName}</TableTd>
                  <TableTd ellipsis>{cancel.buyerId}</TableTd>
                  <TableTd>{cancel.buyerPhone}</TableTd>
                  <TableTd>{cancel.receiver}</TableTd>
                  <TableTd>{cancel.receiverPhone}</TableTd>
                  <TableTd ellipsis>{cancel.address}</TableTd>
                  <TableTd ellipsis>{dash(cancel.shipMemo)}</TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        취소 미리보기 — 4항목짜리 빠른 확인용이다.
        제목을 "취소 상세"로 두지 않는다. 24열짜리 표의 전체 정보는 모달에 들어가지 않는다.
        ⚠️ 푸터(도메인 액션)를 두지 않는다 — 원본 취소 목록에는 행 액션이 없다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="취소 미리보기" description={preview?.id} />
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
