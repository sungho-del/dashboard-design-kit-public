import { useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
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
  useToast,
} from "../../components/ui";
import {
  deduct,
  EXPORT_NAME,
  PAGE_SIZE,
  payoutOf,
  SEARCH_FIELDS,
  searchHaystack,
  STATEMENTS,
  STATUS_FILTERS,
  STATUS_META,
  TARGET_FILTERS,
  TARGET_KIND_LABEL,
  won,
  ym,
  type Statement,
} from "./SettlementStatementPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S15 정산 내역/명세서 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형
 * 제목에 "내역·명세"가 들어가 상세형 신호가 함께 걸리지만,
 * `sections` 가 **필터 바 + 데이터 테이블 + 페이지네이션**이고 `purpose` 가
 * 단일 레코드가 아니라 "명세서 단위로 **조회**한다"라서 목록형이다.
 * (`docs/screen-templates.md` §2 — 한 화면의 판정이 갈리면 목록형을 우선한다)
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./SettlementStatementPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `SettlementStatementPage.data.ts` **전체**     |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 조회 조건 구성         | "검색조건" 카드                                |
 *
 * ## 원본 화면 구성 순서 (그대로 따른다)
 * ```
 * 검색조건 (정산 대상 칩 · 상태 칩 · 검색조건 · 검색어)   ← 원본 `chips` 두 축 + `search`
 * 목록 카드 [ 총 N건 · 엑셀 다운로드 / 표 / 페이저 ]
 * ```
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * - **`명세서 도움말` 도움말 툴팁** — 지어낸 문장이었다
 * - **명세서 다운로드 토스트 · 모달 푸터의 내려받기 버튼.** 원본 `명세서` 컬럼은
 *   **명세서 화면으로 가는 링크**지 파일을 내려받는 버튼이 아니다.
 *   이 목록에서 내려받는 것은 엑셀(CSV)뿐이다 — 그래서 미리보기 모달에 푸터가 없다
 * - **요약 카드** — 원본에 `note` 슬롯이 없다. 없는 지표를 지어내지 않는다
 *
 * ## 원본에 있는데 빠뜨렸던 것 (되살린 것)
 * - **상태 필터** — 원본 `chips` 는 `정산 대상`·`상태` **두 축**이다.
 *   상태 열만 보여 주고 거를 수단이 없으면 "이의제기 난 명세만 보기"가 불가능하다
 * - **검색 조건 선택**(명세서번호/정산 대상) — 한 칸에 뭉뚱그리지 않는다
 *
 * ## 표 정렬 — 전 화면 공통 규칙 (§7-2)
 * 좌측 기본 · 자릿수를 비교하는 수치(매출·차감·지급액)만 우측 · **배지만** 든 열은 가운데.
 * ⚠️ `정산 대상` 은 배지가 붙지만 **주 정보가 이름**이라 좌측이다 —
 * 이름을 가운데로 밀면 세로로 훑을 수 없다.
 *
 * ## 그대로 두는 것 (도메인 무관 · §7-1 실측 규격)
 * `DataTableShell` 셸 구조 · 페이지 범위 클램프 · 행클릭 → Modal(미리보기) 흐름
 * ====================================================================== */

export interface SettlementStatementPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function SettlementStatementPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SettlementStatementPageProps) {
  const { toast } = useToast();

  const [targetFilter, setTargetFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchField, setSearchField] = useState("no");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const [preview, setPreview] = useState<Statement | null>(null);

  const filtered = STATEMENTS.filter((row) => {
    const matchTarget =
      targetFilter === "all" || row.targetKind === targetFilter;
    const matchStatus = statusFilter === "all" || row.status === statusFilter;
    const matchKeyword =
      keyword.trim() === "" ||
      searchHaystack(row, searchField).includes(keyword.trim());
    return matchTarget && matchStatus && matchKeyword;
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
    setTargetFilter("all");
    setStatusFilter("all");
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
      header={<PageHeader title="정산 내역/명세서" />}
    >
      {/* 검색조건 — 원본 `chips` 두 축(정산 대상 · 상태) + `search` 조건 2종 */}
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
            <FormField label="정산 대상" group className="min-w-0">
              <SegmentedControl
                items={TARGET_FILTERS}
                value={targetFilter}
                onValueChange={(value) => {
                  setTargetFilter(value);
                  setPage(1);
                }}
              />
            </FormField>
            <FormField label="상태" group className="min-w-0">
              <SegmentedControl
                items={STATUS_FILTERS}
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-start gap-2">
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

      {/* 목록 — 원본 `ListHead` 의 좌우 슬롯: 총 N건 · 엑셀 다운로드 */}
      <DataTableShell
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        toolbarEnd={
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
            `table-fixed` 라 폭 지정이 필수다. 8열이라 %가 아니라 px 로 준다 —
            합계가 곧 표 폭이 되고, 좁은 창에서는 셸의 표 래퍼가 가로로 스크롤한다.
          */}
          <colgroup>
            <col className="w-33" />
            <col className="w-43" />
            <col className="w-23" />
            <col className="w-30" />
            <col className="w-40" />
            <col className="w-33" />
            <col className="w-25" />
            <col className="w-23" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>명세서번호</TableTh>
              {/* 배지가 붙지만 주 정보가 이름이라 좌측이다 (§7-2 예외) */}
              <TableTh>정산 대상</TableTh>
              <TableTh>정산월</TableTh>
              <TableTh>매출</TableTh>
              <TableTh>차감(수수료·PG·취소)</TableTh>
              <TableTh>지급액</TableTh>
              {/* 배지만 들어가는 열이라 가운데다 */}
              <TableTh align="center">상태</TableTh>
              {/* 버튼이 든 열은 글자 취급이라 좌측이다 */}
              <TableTh>명세서</TableTh>
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
                  <TableTd>
                    {/*
                      배지 + 이름이 한 칸이다(원본 그대로). 셀이 `text-left` 라도
                      **flex 자식에게는 text-align 이 먹지 않아** 정렬은 `justify-start` 가 낸다.
                    */}
                    <span className="flex items-center justify-start gap-2">
                      <Tag tone="default" size="small">
                        {TARGET_KIND_LABEL[row.targetKind]}
                      </Tag>
                      {row.target}
                    </span>
                  </TableTd>
                  <TableTd>{ym(row.month)}</TableTd>
                  <TableTd>{won(row.revenue)}</TableTd>
                  {/* 부호는 데이터가 정한다 — 뼈대는 렌더만 한다 */}
                  <TableTd>{deduct(row.deduction)}</TableTd>
                  <TableTd>{won(payoutOf(row))}</TableTd>
                  <TableTd align="center">
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </TableTd>
                  <TableTd>
                    {/*
                      행 전체가 클릭 대상(미리보기)이라 버튼 클릭이 함께 타면
                      같은 모달이 두 번 열린다. 전파를 여기서 끊는다.
                    */}
                    <div
                      role="presentation"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <TextButton onClick={() => setPreview(row)}>
                        명세서
                      </TextButton>
                    </div>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        명세서 미리보기 — 4항목짜리 빠른 확인용이다.
        제목을 "명세서 상세"로 두지 않는다. 모달은 "이 명세서가 맞나"를 확인하는 자리다.
        **푸터가 없다** — 원본 `명세서` 는 화면으로 가는 링크지 다운로드가 아니다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="명세서 미리보기" description={preview?.id} />
        <ModalBody>
          <InfoList>
            <InfoItem label="정산 대상">
              {preview
                ? TARGET_KIND_LABEL[preview.targetKind] + " · " + preview.target
                : ""}
            </InfoItem>
            <InfoItem label="정산월">
              {preview ? ym(preview.month) : ""}
            </InfoItem>
            <InfoItem label="지급액">
              {preview ? won(payoutOf(preview)) : ""}
            </InfoItem>
            {/* 라벨이 5글자라 기본 폭 80 에 들어간다 — `labelWidth` 를 주지 않는다 */}
            <InfoItem label="확정 일시">{preview?.date}</InfoItem>
          </InfoList>
        </ModalBody>
      </Modal>
    </AppShell>
  );
}
