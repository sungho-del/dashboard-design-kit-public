import { useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
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
  InfoItem,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalHeader,
  PageHeader,
  Pagination,
  SegmentedControl,
  StatTile,
  Select,
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
} from "../../components/ui";
import {
  deduct,
  DEPOSIT_STATUS_META,
  DEPOSITS,
  EXPORT_NAME,
  FILTERS,
  ORDER_STATUS_META,
  PAGE_SIZE,
  refundOf,
  SEARCH_FIELDS,
  searchHaystack,
  sellerOf,
  SOURCE_CELL_LABEL,
  SOURCE_FILTERS,
  SUMMARY_STATS,
  won,
  ymd,
  type RentDeposit,
} from "./RentDepositListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S13 보증금 내역 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형
 * 렌트 보증금이 점유중에서 환급/차감으로 판정·집행되는 과정을 금액과 함께 추적한다.
 * 한 행에 상태가 **둘** 붙는다 — 주문 상태(물건)와 보증금 상태(돈)가 따로 움직인다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./RentDepositListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `RentDepositListPage.data.ts` **전체**         |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 금액 요약 4값          | `.data.ts` 의 `SUMMARY_STATS` (샘플에서 집계)  |
 * | 조회 조건 구성         | "조회 조건" 카드                                |
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **상태 요약 대시(건수 카드 5장)**. 원본이 이 화면에서만 `showStatusDashboard: !1` 로
 *   **꺼 둔다.** 상태 축의 컨트롤은 칩 하나뿐이다 — 대시를 되살리면 같은 축의
 *   컨트롤이 둘이 되어 한쪽만 눌린 자기모순 화면이 나온다
 * - **요약 카드의 증감(±%)·비교 기준 문구·아이콘**(`STATS`). 원본 타일은 라벨·값뿐이고,
 *   이전 기간 데이터가 없어 계산할 수도 없는 지어낸 숫자였다
 * - **`보증금 흐름` 도움말 툴팁**. 원본에 없는 지어낸 문장이었다
 * - **`출처` 를 12번째 열로 세우던 것**. 출처는 3번째 `구분` 열 + 툴바 칩 두 자리로 끝난다
 * - **모달의 `주문번호 복사` 버튼**. 원본 미리보기에는 액션이 없다
 *
 * ## 반대로 원본 대조로 **되살린** 것
 * - **상품 이름 옆 안심케어 표식** — 열이 아니라 표식이다(원본 `badge b-care`)
 * - **셀에서만 길어지는 보증금 상태 라벨**(`환급완료(전액차감)`). 칩은 짧게, 셀은 길게 —
 *   `전액차감` 만 있으면 바로 위 `환급대기`(예정) 탓에 "차감할 예정"으로 읽힌다
 * - **셀러명 칸이 자체 재고면 `본사`** (`sellerOf` — 데이터에 박지 않는다)
 *
 * ## 정렬 규칙 (§7-2 · th·td 를 반드시 함께 바꾼다)
 * 수치(보증금액·차감·반환 예정액)는 우측, **배지만** 들어가는 열(구분·주문 상태·
 * 보증금 상태)은 가운데. ⚠️ **상품 열은 좌측이다** — 안심케어 표식이 곁들여지지만
 * 주 정보가 상품명이라 이름의 기준선을 흔들지 않는다.
 * ====================================================================== */

/**
 * 상태 변경일이 선택한 기간 안에 드는지.
 *
 * `date` 는 `"YYYY-MM-DD HH:mm"` 인데 공백 구분자는 브라우저별 파싱이 갈린다.
 * `T` 로 바꿔 ISO 형태로 만든 뒤 넘긴다. 시작일은 00:00, 종료일은 23:59:59 까지 포함한다
 * (종료일을 그대로 쓰면 그날 낮에 판정된 건이 빠진다).
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

/**
 * 원본 `frozen` 열은 **주문번호 하나**다. 가로로 스크롤해도 어느 건인지가 남는다.
 *
 * 마지막(= 유일한) 고정 열이라 오른쪽 경계선을 갖는다 — 고정 구간의 끝이라는 표시다.
 * `border-collapse: collapse` 에서는 sticky 셀의 border 가 함께 스크롤돼 사라지므로
 * `::after` 로 그린다. 배치 기준은 `sticky` 자신이 만든다(`relative` 를 더하지 않는다).
 */
const FROZEN_TH =
  "sticky left-0 z-1 after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-divide after:content-['']";

/**
 * 본문 쪽 고정 열은 배경을 **행에서 물려받는다**(`bg-inherit`).
 * zebra 는 `<tr>` 이 칠하므로, 색을 새로 지정하면 홀짝·hover 세 상태를 따라가지 못한다.
 */
const FROZEN_TD = FROZEN_TH + " bg-inherit";

export interface RentDepositListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function RentDepositListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: RentDepositListPageProps) {
  const { toast } = useToast();

  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  /** 원본 `search.fieldOpts` 의 기본값이 주문번호(`no`)다 */
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);

  const [preview, setPreview] = useState<RentDeposit | null>(null);

  const filtered = DEPOSITS.filter((row) => {
    const matchStatus = status === "all" || row.depositStatus === status;
    const matchSource = source === "all" || row.source === source;
    /*
      ⚠️ 검색은 **고른 조건 한 칸만** 본다. 주문번호·회원명을 한 칸에 뭉뚱그리면
      "주문번호로 찾는 중"인 사람이 회원명에 걸린 결과를 보게 된다.
    */
    const matchKeyword =
      keyword.trim() === "" ||
      searchHaystack(row, searchField).includes(keyword.trim());
    return (
      matchStatus && matchSource && matchKeyword && inPeriod(row.date, period)
    );
  });

  /*
   * 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다. 그대로 두면
   * **빈 표**가 그려지므로 마지막 페이지로 당긴다.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /* 초기화는 한 곳에서만 정의한다 — 카드와 빈 상태 두 곳이 부르는데
   * 한쪽만 되돌리면 "초기화했는데 여전히 비어 있음"이 된다 */
  const resetFilters = () => {
    setStatus("all");
    setSource("all");
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPeriod(undefined);
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
      header={<PageHeader title="보증금 내역" />}
    >
      {/*
        금액 요약 — 원본 `note` 슬롯의 **4값**. 라벨과 값뿐이다.
        넷이 함께 있어야 보증금 풀이 닫힌다 — 들고 있다 / 나갈 예정 / 나갔다 / 본사가 가졌다.
        ⚠️ 증감(±%)·비교 문구·아이콘을 붙이지 않는다(원본에 없고 계산할 근거도 없다).
      */}
      <section className="grid grid-cols-4 gap-6">
        {SUMMARY_STATS.map(({ label, value, unit }) => (
          /* 값·단위 분리와 카드 규격은 `StatTile` 이 맡는다 (docs/DESIGN-dashboard.md §D3) */
          <StatTile
            key={label}
            variant="card"
            label={label}
            value={value}
            unit={unit}
          />
        ))}
      </section>

      {/* 조회 조건 — 상태 칩 · 출처 칩 · 기간 · 검색 2종 */}
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
            {/* 그룹 컨트롤은 `group` 이 없으면 접근가능 이름이 아예 없다 (§29-6b) */}
            <FormField label="보증금 상태" group className="flex-1 min-w-0">
              <SegmentedControl
                items={FILTERS}
                value={status}
                onValueChange={(next) => {
                  setStatus(next);
                  setPage(1);
                }}
              />
            </FormField>
            {/*
              출처 — 같은 `source` 필드를 표에서는 `본사/셀러`(구분), 필터에서는
              `자체/입점사` 로 부른다. 원본이 그렇다(`SOURCE_CELL_LABEL` 주석 참고).
            */}
            <FormField label="출처" group className="flex-1 min-w-0">
              <SegmentedControl
                items={SOURCE_FILTERS}
                value={source}
                onValueChange={(next) => {
                  setSource(next);
                  setPage(1);
                }}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <FormField label="기간 (상태 변경일)" className="flex-1 min-w-0">
              <DatePicker
                mode="range"
                value={period}
                onChange={(next) => {
                  setPeriod(next);
                  setPage(1);
                }}
                startPlaceholder="시작일"
                endPlaceholder="종료일"
              />
            </FormField>
            <FormField label="검색조건" className="flex-1 min-w-0">
              <Select
                options={SEARCH_FIELDS}
                value={searchField}
                onValueChange={(next) => {
                  setSearchField(next);
                  setPage(1);
                }}
              />
            </FormField>
            <FormField label="검색어" className="flex-1 min-w-0">
              <Input
                placeholder="검색어 입력"
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setPage(1);
                }}
                leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
              />
            </FormField>
          </div>
        </CardBody>
      </Card>

      {/* 보증금 목록 — DataTableShell 이 §7-1 셸 구조를 책임진다 */}
      <DataTableShell
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        toolbarEnd={
          /* 원본 `toolsLeft` 의 유일한 도구. 지금 조회된 건수로 파일명을 만든다 */
          <Button
            variant="secondary"
            onClick={() =>
              toast(`${EXPORT_NAME}_${filtered.length}건.csv 를 내려받았습니다`)
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
            `table-fixed` 라 폭 지정이 필수다. 11열이라 %가 아니라 px 로 준다 —
            합계가 곧 표 폭이 되고, 그만큼 셸의 표 래퍼가 가로로 스크롤한다.
          */}
          <colgroup>
            <col className="w-35" />
            <col className="w-23" />
            <col className="w-20" />
            <col className="w-28" />
            <col className="w-50" />
            <col className="w-25" />
            <col className="w-25" />
            <col className="w-28" />
            <col className="w-25" />
            <col className="w-38" />
            <col className="w-28" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh className={FROZEN_TH}>주문번호</TableTh>
              <TableTh>회원</TableTh>
              {/* 배지만 들어가는 열은 가운데 (§7-2) — th·td 를 반드시 함께 바꾼다 */}
              <TableTh align="center">구분</TableTh>
              <TableTh>셀러명</TableTh>
              {/* ⚠️ 상품은 좌측 — 표식이 붙어도 주 정보가 이름이다 */}
              <TableTh>상품</TableTh>
              {/* 크기를 비교하는 수치는 우측 (§7-2) */}
              <TableTh>보증금액</TableTh>
              <TableTh>차감</TableTh>
              <TableTh>반환 예정액</TableTh>
              <TableTh align="center">주문 상태</TableTh>
              <TableTh align="center">보증금 상태</TableTh>
              <TableTh>상태 변경일</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((row) => {
              const depositStatus = DEPOSIT_STATUS_META[row.depositStatus];
              const orderStatus = ORDER_STATUS_META[row.orderStatus];
              return (
                <TableRow
                  key={row.id}
                  clickable
                  onClick={() => setPreview(row)}
                >
                  <TableTd className={FROZEN_TD}>{row.id}</TableTd>
                  <TableTd>{row.member}</TableTd>
                  <TableTd align="center">
                    {/* 구분은 분류라 상태색을 쓰지 않는다 — 중립색 */}
                    <Tag size="small">{SOURCE_CELL_LABEL[row.source]}</Tag>
                  </TableTd>
                  {/* 자체 재고면 "본사" — 값을 데이터에 박지 않고 데이터가 만든다 */}
                  <TableTd>{sellerOf(row)}</TableTd>
                  <TableTd>
                    {/*
                      안심케어는 **열이 아니라 표식**이다. 이름이 길면 이름 쪽이
                      줄고 표식은 남는다(`shrink-0` 은 Tag 가 이미 갖고 있다).
                    */}
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{row.product}</span>
                      {row.careEnrolled && <Tag size="small">안심케어</Tag>}
                    </span>
                  </TableTd>
                  <TableTd>{won(row.deposit)}</TableTd>
                  {/* 부호와 `-` 표기는 데이터가 정한다 — 뼈대는 렌더만 한다 */}
                  <TableTd>{deduct(row.deduction)}</TableTd>
                  <TableTd>{won(refundOf(row))}</TableTd>
                  <TableTd align="center">
                    <Tag tone={orderStatus.tone} size="small">
                      {orderStatus.label}
                    </Tag>
                  </TableTd>
                  <TableTd align="center">
                    {/* 셀에서는 긴 라벨 — `전액차감` 만으로는 "차감할 예정"으로 읽힌다 */}
                    <Tag tone={depositStatus.tone} dot>
                      {depositStatus.cellLabel}
                    </Tag>
                  </TableTd>
                  {/* 저장은 하이픈+시각, 화면은 원본 `ymd` 처럼 날짜만 */}
                  <TableTd>{ymd(row.date)}</TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        보증금 미리보기 — 금액 4항목짜리 빠른 확인용이다.
        제목을 "보증금 상세"로 두지 않는다. 표가 11열이라 전체 정보가 모달에
        들어가지 않으므로, 여기서 다 보여주려 들면 모달이 두 번째 표가 된다.
        ⚠️ 푸터(도메인 액션)를 두지 않는다 — 원본 미리보기에 액션이 없다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader
          title="보증금 미리보기"
          description={
            preview ? preview.id + " · " + preview.member : undefined
          }
        />
        <ModalBody>
          {/*
            ⚠️ `labelWidth` 는 **목록 전체가 함께 가져간다.** `InfoItem` 은 행마다
            독립된 flex 라, 한 항목에만 주면 그 줄의 값만 오른쪽으로 밀려 숫자가
            세로로 어긋난다. "반환 예정액"(6글자)이 기본 80 을 넘으므로
            네 항목 모두 96 으로 맞춘다 — 기본값(80)은 아예 주지 않는다(§30-3).
          */}
          <InfoList>
            <InfoItem label="상품" labelWidth={96}>
              {preview?.product}
            </InfoItem>
            <InfoItem label="보증금액" labelWidth={96}>
              {preview ? won(preview.deposit) : ""}
            </InfoItem>
            <InfoItem label="차감" labelWidth={96}>
              {preview ? deduct(preview.deduction) : ""}
            </InfoItem>
            <InfoItem label="반환 예정액" labelWidth={96}>
              {preview ? won(refundOf(preview)) : ""}
            </InfoItem>
          </InfoList>
        </ModalBody>
      </Modal>
    </AppShell>
  );
}
