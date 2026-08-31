import { useState } from "react";
import { Search } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTableShell,
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
  Select,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
} from "../../components/ui";
import {
  FILTERS,
  NO_ACTION,
  PAGE_SIZE,
  SEARCH_FIELDS,
  searchHaystack,
  STATUS_META,
  TAX_INVOICES,
  totalOf,
  vatOf,
  won,
  ymd,
  type TaxInvoice,
} from "./TaxInvoiceListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S16 세금계산서·증빙 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형
 * 정산 수수료에 대한 세금계산서를 발행 상태로 **조회**한다.
 * 신호: `sections` 에 필터 바 + 데이터 테이블 + 페이지네이션,
 * `components` 에 `Table`·`Pagination` (`docs/screen-templates.md` §2).
 *
 * ## ⚠️ 이 화면은 **읽기 전용**이다 — 이 화면의 성격이 곧 뼈대의 모양이다
 * 원본이 공용 목록 셸을 쓰지 않고 `total`·`filter`·`table` 셋만 넘기는 **얇은 화면**이다
 * (`makeListApi("/admin/tax-invoices")` — 목록 API 하나뿐, 발행·정정 엔드포인트가 없다).
 * 그래서 이 파일에는 **쓰기 동작이 하나도 없다** — 모달도 토스트도 모달 푸터도 없다.
 * 발행은 지급 처리에 딸려 자동으로 일어난다(S12 지급완료 설명).
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./TaxInvoiceListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `TaxInvoiceListPage.data.ts` **전체**          |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 세율                   | `VAT_RATE` (데이터) — 뼈대에는 세율이 없다     |
 * | 조회 조건 구성         | "검색조건" 카드                                |
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * - **행 액션(발행 · 계산서 보기)과 발행 확인 모달** — 원본 `처리` 열은
 *   `render: () => "-"` 로 **항상 `-`** 를 그린다. 쓰기 API 자체가 없다
 * - **엑셀 다운로드** — 이 화면만 공용 목록 셸을 쓰지 않아 `toolsLeft` 가 아예 없다.
 *   다른 목록에 있다고 여기에도 달면 안 된다
 * - **정산월 셀렉트** — 원본 필터는 `발행상태` 칩 + 검색뿐이다.
 *   축이 사라지면서 행의 `month` 필드도 함께 걷어냈다
 * - **`세금계산서 도움말` 툴팁** — 지어낸 문장이었다. 상태 설명은
 *   `STATUS_META.description` 으로 미리보기 모달에 상시 노출한다
 *
 * ## 표 정렬 — 전 화면 공통 규칙 (§7-2)
 * 좌측 기본 · 자릿수를 비교하는 수치(공급가액·세액·합계)만 우측 ·
 * **배지만** 든 열(상태)은 가운데. `처리` 는 원본이 center 지만 좌측으로 통일한다.
 * ⚠️ 컬럼 순서는 원본 그대로 **상태 다음이 처리**다.
 *
 * ## 그대로 두는 것 (도메인 무관 · §7-1 실측 규격)
 * `DataTableShell` 셸 구조 · 페이지 범위 클램프 · 행클릭 → Modal(미리보기) 흐름
 * ====================================================================== */

export interface TaxInvoiceListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function TaxInvoiceListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: TaxInvoiceListPageProps) {
  const [filter, setFilter] = useState("all");
  const [searchField, setSearchField] = useState("no");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const [preview, setPreview] = useState<TaxInvoice | null>(null);

  const filtered = TAX_INVOICES.filter((row) => {
    const matchStatus = filter === "all" || row.status === filter;
    const matchKeyword =
      keyword.trim() === "" ||
      searchHaystack(row, searchField).includes(keyword.trim());
    return matchStatus && matchKeyword;
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
    setFilter("all");
    setSearchField("no");
    setKeyword("");
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
      header={<PageHeader title="세금계산서·증빙" />}
    >
      {/* 검색조건 — 원본 `chips` 한 축(발행상태) + `search` 조건 2종. 그게 전부다 */}
      <Card>
        <CardHeader
          title="검색조건"
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
            <FormField label="발행상태" group className="min-w-0">
              <SegmentedControl
                items={FILTERS}
                value={filter}
                onValueChange={(value) => {
                  setFilter(value);
                  setPage(1);
                }}
              />
            </FormField>
            <FormField label="검색조건" className="min-w-0">
              <Select
                options={SEARCH_FIELDS}
                value={searchField}
                onValueChange={(value) => {
                  setSearchField(value);
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

      {/*
        목록 — 툴바에는 총 N건뿐이다.
        원본에 `toolsLeft` 가 없어 엑셀 다운로드 버튼을 달지 않는다.
      */}
      <DataTableShell
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
            `table-fixed` 라 폭 지정이 필수다. 9열이라 %가 아니라 px 로 준다 —
            합계가 곧 표 폭이 되고, 좁은 창에서는 셸의 표 래퍼가 가로로 스크롤한다.
          */}
          <colgroup>
            <col className="w-33" />
            <col className="w-38" />
            <col className="w-38" />
            <col className="w-25" />
            <col className="w-35" />
            <col className="w-30" />
            <col className="w-33" />
            <col className="w-25" />
            <col className="w-23" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>계산서번호</TableTh>
              <TableTh>공급자</TableTh>
              <TableTh>공급받는자</TableTh>
              <TableTh>작성일</TableTh>
              <TableTh>공급가액(수수료)</TableTh>
              <TableTh>세액(VAT)</TableTh>
              <TableTh>합계</TableTh>
              {/* 배지만 들어가는 열이라 가운데다 */}
              <TableTh align="center">상태</TableTh>
              {/* 원본 순서 그대로 상태 다음이 처리다 — 원본은 center 지만 좌측으로 통일한다 */}
              <TableTh>처리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((row) => {
              const status = STATUS_META[row.status];
              return (
                <TableRow
                  key={row.id}
                  clickable
                  onClick={() => setPreview(row)}
                >
                  <TableTd>{row.id}</TableTd>
                  <TableTd>{row.supplier}</TableTd>
                  <TableTd>{row.buyer}</TableTd>
                  {/* 날것을 그대로 찍지 않는다 — `~일` 로 끝나는 열은 날짜만 낸다 */}
                  <TableTd>{ymd(row.date)}</TableTd>
                  <TableTd>{won(row.supply)}</TableTd>
                  {/* 세액·합계는 데이터가 계산한다 — 뼈대에 세율이 없다 */}
                  <TableTd>{won(vatOf(row))}</TableTd>
                  <TableTd>{won(totalOf(row))}</TableTd>
                  <TableTd align="center">
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </TableTd>
                  {/*
                    ⚠️ 원본이 `render: () => "-"` 로 **항상 `-`** 를 그린다.
                    이 화면에는 쓰기 동작이 없다 — 버튼을 달지 말 것.
                  */}
                  <TableTd>{NO_ACTION}</TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        계산서 미리보기 — 4항목짜리 빠른 확인용이다.
        제목을 "계산서 상세"로 두지 않는다. 모달은 "금액이 맞나"를 확인하는 자리다.
        **푸터가 없다** — 이 화면에는 누를 것이 없다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="계산서 미리보기" description={preview?.id} />
        <ModalBody>
          {/*
            ⚠️ `labelWidth` 는 **목록 전체가 함께 가져간다.** `InfoItem` 은 행마다
            독립된 flex 라, 한 항목에만 주면 그 줄의 값만 오른쪽으로 밀려 금액이
            세로로 어긋난다. "공급가액(수수료)"가 기본 80 을 크게 넘으므로
            네 항목 모두 128 로 맞춘다 — 기본값(80)은 아예 주지 않는다(§30-3).
          */}
          <InfoList>
            <InfoItem label="공급받는자" labelWidth={128}>
              {preview?.buyer}
            </InfoItem>
            <InfoItem label="작성일" labelWidth={128}>
              {preview ? ymd(preview.date) : ""}
            </InfoItem>
            <InfoItem label="공급가액(수수료)" labelWidth={128}>
              {preview ? won(preview.supply) : ""}
            </InfoItem>
            <InfoItem label="합계" labelWidth={128}>
              {preview ? won(totalOf(preview)) : ""}
            </InfoItem>
          </InfoList>
          <p className="body-small text-text-sub">
            {preview ? STATUS_META[preview.status].description : ""}
          </p>
        </ModalBody>
      </Modal>
    </AppShell>
  );
}
