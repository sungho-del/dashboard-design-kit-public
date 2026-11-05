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
  Select,
  Skeleton,
  StatTile,
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
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import {
  CARE_PRICE_COPY,
  cellMoney,
  dotted,
  EMPTY_DESCRIPTION,
  EMPTY_FILTERS,
  EMPTY_TITLE,
  filterSummary,
  GATE_BUTTON,
  GATE_COPY,
  gateOf,
  listTitleOf,
  matchesFilters,
  PAGE_SIZE,
  PAGE_SIZES,
  payLinesOf,
  ROWS,
  roundOf,
  SEARCH_PLACEHOLDER,
  SETTLE_NOTES,
  statementLinesOf,
  STATUS_META,
  STATUS_OPTIONS,
  SUMMARY,
  SUMMARY_STATS,
  SUMMARY_SUB,
  SUMMARY_TITLE,
  TOTAL_STATEMENT_SUB,
  TOTAL_STATEMENT_TITLE,
  UNPAID_SELLERS,
  type SettlementFilters,
  type SettlementRow,
  NO_AMOUNT,
} from "./SellerSettlementPage.data";
import { SettlementCalc } from "./SettlementCalc";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/*
  처리 열은 표 **오른쪽에 붙박는다** — 10열이라 좁은 화면(1280)에서는 표가 가로로 밀리는데,
  업무 버튼([지급완료]·[수정 명세 재발송])이 스크롤 밖으로 사라지면 안 된다.
  왼쪽 1px 선은 `border` 대신 가상 요소로(collapse 표에서 border 는 함께 스크롤돼 사라진다 — 주문 목록 고정 열과 같다)
*/
const ACTION_EDGE =
  "before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-divide before:content-['']";
const ACTION_TH = `sticky right-0 z-2 ${ACTION_EDGE}`;
/* 본문 셀 배경은 행에서 물려받는다(줄무늬·hover 를 따라가려면 상속뿐) */
const ACTION_TD = `sticky right-0 z-1 bg-inherit ${ACTION_EDGE}`;

/* =========================================================================
 * 셀러 정산 (BO-STL-002 · `/settle-seller`) — 목록형 · 뼈대
 *
 * ## 구성 — 원본 v0.4 `SCREENS.settleSeller` 를 정산 흐름 순서로 다시 묶었다(사용자 승인 2026-11-03)
 * ```
 * {2026년 9월} 정산            지급일 ← 한 카드: 요약 타일 4장 + 산출 내역(전 입점사 합산 · `SettlementCalc`)
 *                                       전체 셀러 합 — 필터와 무관
 * 검색조건(펼침 · 요약 · 초기화)       ← 상태 셀렉트 · 셀러명
 * 정산 대상 입점사 (총 N개사) / 표 10열 / 페이지(10·20·50·100)
 * 안심케어 금액              모든 셀러 공통 ← 안심케어 가입 금액 5,000원 한 줄(조회만 — 부록 A B6-3)
 * ```
 * 표 10열: 셀러 · 거래액 · 셀러쿠폰 · 수수료 · PG수수료 · 취소·반품 차감 · 안심케어 · 지급액 · 상태 · 처리.
 * 체크박스·No·정렬·엑셀은 **없다**(원본 그대로).
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./SellerSettlementPage.data.ts`, 숫자는 `settlement.data.ts`
 *
 * | 갈아끼울 것             | 위치                                              |
 * | ----------------------- | ------------------------------------------------- |
 * | 행·요약·라벨·단위·문구  | `SellerSettlementPage.data.ts`                    |
 * | 산출 내역 줄            | 같은 파일 `statementLinesOf` (상세와 공용)        |
 * | 산출 내역 모양          | `SettlementCalc.tsx` (3화면 공용 부품)            |
 * | 상태별 버튼·모달 문구   | 같은 파일 `gateOf` · `GATE_COPY` · `payLinesOf`   |
 * | 표 컬럼                 | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀    |
 *
 * ## 상호작용
 * - 행 어디를 눌러도 상세(`/settle-seller/{셀러 id}`) — 셀러명 링크도 같다. 원본 [상세] 버튼은 행 클릭과 겹쳐 뺐다(1280 에서 업무 버튼이 밀려 안 보였다)
 *   처리 열의 업무 버튼은 행 클릭이 아니다(`TableRow clickable` 이 셀 안 버튼을 거른다)
 * - 처리 열: 확인완료·보류 → [지급완료] · 이의제기 → [수정 명세 재발송] · 그 밖은 `-`
 * - 모달 3종(`SettlementGateModal` — 상세도 같은 것을 쓴다): 지급 실행(명세 미리보기) ·
 *   보류 종결(결론 요지 필수) · 수정 명세 재발송(검토 내용 필수, 이의 사유를 함께 보인다)
 * - **퍼블 범위**: 처리하면 알림만 — 상태·금액은 바뀌지 않는다. 사유는 앞뒤 공백을 빼고 검사하고,
 *   닫거나 처리하면 비운다
 * - 검색조건은 입력 즉시 적용 · 바꾸면 1페이지로. `?preview=loading|empty|refreshing`
 *
 * ## 원본과 다르게 둔 곳
 * - 검색조건: 상태 칩 → 셀렉트, 기본 펼침, [검색] 없이 즉시 적용(목록 공통 규칙)
 * - 빈 사유는 입력칸 아래 오류(원본은 알림) — 다른 사유 창과 같다
 * - 상태 배지 톤은 공통 `SETTLEMENT_STATUS_META`(원본 b-prog/b-done/b-exc 아님) · 금액 셀 색 없음 ·
 *   **금액 열은 머리글까지 오른쪽 정렬**(자릿수 비교 — 사용자 승인 2026-11-03)
 * - 요약·합산 명세 두 카드 → 한 카드 · 소제목 「정산 대상 입점사 · N개사」 + 「목록 (총 N건)」 → 목록 머리 하나 ·
 *   안심케어 금액(모든 셀러 공통 · 조회만)은 정산 흐름 밖 맨 아래 「안심케어 금액」
 * - 행 클릭 → 상세(사용자 결정 2026-11-02 — 원본은 셀러명·[상세]만)
 *
 * ## 회신으로 되살린 것
 * - **정산 회차 열**(표 첫 열 · 디자인 §3 #10 「퍼블 주석 「되살리지 말 것」 해제」). 개발의 회차·셀러 두 열 고정 ·
 *   회차 정렬 · `2026년 09월` 표기는 기획 확인 중이라(질문 13) 열만 두고 이 화면 표기(`2026년 9월`)를 쓴다
 *
 * ## ⚠️ 원본에 없어 걷어낸 것 — 되살리지 말 것
 * 좌측 고정 열(기획 확인 중 — 위) · 엑셀 다운로드 · 행 클릭 「정산 미리보기」 모달 ·
 * 필터 아래 상태 설명 문구(v0.4 에 없다) · 셀러명 검색의 회차 id 검색 · [확인요청]·[확인완료]·[협의 완료] 대행 버튼
 * ====================================================================== */

/** 상세 경로 — 셀러 마스터 id 가 키다(한 회차만 다룬다 — 원본 `DETAILS.settlement`) */
const detailPathOf = (row: SettlementRow) => `/settle-seller/${row.sellerId}`;

const COLUMN_COUNT = 11;

/* =========================================================================
 * 확인 모달 3종 — 목록 처리 열과 상세 하단 바가 같은 창을 쓴다(원본 `settleActBtn` 공유)
 * ====================================================================== */

export function SettlementGateModal({
  row,
  onClose,
}: {
  /** 연 대상 — `null` 이면 닫힘 */
  row: SettlementRow | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const kind = row ? gateOf(row.status) : null;

  const clear = () => {
    setNote("");
    setTried(false);
  };
  const close = () => {
    clear();
    onClose();
  };

  if (!row || !kind) return null;

  const submit = () => {
    if (kind !== "pay" && note.trim() === "") {
      setTried(true);
      return;
    }
    clear();
    onClose();
    toast(
      kind === "reissue"
        ? GATE_COPY.reissue.done()
        : GATE_COPY[kind].done(row.name),
    );
  };

  const input = kind === "pay" ? null : GATE_COPY[kind];

  return (
    <Modal open onClose={close} size="medium">
      <ModalHeader
        /* 푸터에도 "취소"가 있어 헤더 X 의 기본 라벨과 겹친다 — 이름을 갈라 준다 */
        closeLabel="대화상자 닫기"
        title={GATE_COPY[kind].title(row.name)}
      />
      <ModalBody>
        {kind === "pay" ? (
          <>
            <SettlementCalc lines={payLinesOf(row)} />
            <p className="body-small text-text-sub">{GATE_COPY.pay.note}</p>
          </>
        ) : (
          <>
            {kind === "reissue" && row.objection ? (
              <p className="body-small text-text">
                <strong className="body-small-bold">
                  {GATE_COPY.reissue.objection}
                </strong>{" "}
                — {row.objection.reason}{" "}
                <span className="text-text-sub">
                  ({dotted(row.objection.at)})
                </span>
              </p>
            ) : null}
            {input ? (
              <FormField
                label={input.label}
                required
                error={tried && note.trim() === "" ? input.empty : undefined}
              >
                <Textarea
                  minRows={4}
                  value={note}
                  placeholder={input.placeholder}
                  onChange={(event) => setNote(event.target.value)}
                />
              </FormField>
            ) : null}
            <p className="body-small text-text-sub">{input?.note}</p>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={close}>
          취소
        </Button>
        <Button size="large" onClick={submit}>
          {GATE_COPY[kind].confirm}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export interface SellerSettlementPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function SellerSettlementPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerSettlementPageProps) {
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const [filters, setFilters] = useState<SettlementFilters>(EMPTY_FILTERS);
  /** 검색조건 펼침 — **기본은 펼침**(사용자 결정 2026-10-19 · 원본은 접힘) */
  const [filterOpen, setFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [gate, setGate] = useState<SettlementRow | null>(null);

  const patch = (next: Partial<SettlementFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  };
  const resetFilters = () => patch(EMPTY_FILTERS);

  const filtered =
    dataStatus === "empty"
      ? []
      : ROWS.filter((row) => matchesFilters(row, filters));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const openDetail = (row: SettlementRow) => onNavSelect(detailPathOf(row));

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
      header={<PageHeader title="셀러 정산" />}
    >
      {/* 회차 정산 — 요약 4칸 + 산출 내역(전 입점사 합산) 한 카드. 전체 셀러 합 · 필터와 무관(원본) */}
      <Card>
        <CardHeader
          title={SUMMARY_TITLE}
          action={
            <span className="body-medium text-text-sub">{SUMMARY_SUB}</span>
          }
        />
        <CardBody>
          {/* 카드 안 항목 묶음 거터 12 (`DESIGN-dashboard.md` §D4-3) */}
          <div className="grid grid-cols-4 gap-3">
            {SUMMARY_STATS.map((stat) => (
              <StatTile
                key={stat.label}
                compact
                label={stat.label}
                value={stat.value}
                unit={stat.unit}
              />
            ))}
          </div>
          <section className="flex flex-col gap-3">
            <h3 className="flex items-baseline gap-2">
              <span className="label-large-bold text-text">
                {TOTAL_STATEMENT_TITLE}
              </span>
              <span className="body-small text-text-sub">
                {TOTAL_STATEMENT_SUB}
              </span>
            </h3>
            <SettlementCalc
              lines={statementLinesOf(SUMMARY, {
                listLabel: "셀러 확정 거래액",
                totalLabel: "이번 회차 지급 총액",
                unpaidBy: UNPAID_SELLERS,
              })}
              notes={SETTLE_NOTES}
            />
          </section>
        </CardBody>
      </Card>

      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary(filters)}
        onReset={resetFilters}
      >
        <Select
          className="w-36"
          aria-label="상태"
          options={STATUS_OPTIONS}
          value={filters.status}
          onValueChange={(value) => patch({ status: value })}
        />
        <Input
          aria-label="셀러명"
          placeholder={SEARCH_PLACEHOLDER}
          value={filters.keyword}
          onChange={(event) => patch({ keyword: event.target.value })}
          leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        />
      </FilterBar>

      <DataTableShell
        variant="soft"
        bodyClassName={dimWhile(dataStatus)}
        aria-busy={isBusy(dataStatus)}
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            {listTitleOf(filtered.length)}
          </h2>
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
            end={
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
          <colgroup>
            {/*
              합 1,128 — 1440 은 스크롤 없이(표 상자 1,136) · 1280 은 표만 가로로 밀리고 처리 열은 오른쪽에 붙어 있다.
              정산 회차 108(첫 칸 왼쪽 여백 24 포함 · 「2026년 9월」 실측 71)을 넣느라 셀러 96→88 · 셀러쿠폰·수수료·안심케어
              96→92 · 지급액 104→96 · 상태 96→88 로 줄였다(실측 내용 폭 61 · 68 · 68 · 68 · 70 · 63 + 셀 여백 24)
            */}
            <col className="w-27" />
            <col className="w-22" />
            <col className="w-28" />
            <col className="w-23" />
            <col className="w-23" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-23" />
            <col className="w-24" />
            <col className="w-22" />
            <col className="w-38" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>정산 회차</TableTh>
              <TableTh>셀러</TableTh>
              <TableTh align="right">거래액(판매가)</TableTh>
              <TableTh align="right">셀러쿠폰</TableTh>
              <TableTh align="right">수수료</TableTh>
              <TableTh align="right">PG수수료</TableTh>
              <TableTh align="right">취소·반품 차감</TableTh>
              <TableTh align="right">안심케어</TableTh>
              <TableTh align="right">지급액</TableTh>
              {/* 배지만 들어가는 열은 가운데 (§7-2) */}
              <TableTh align="center">상태</TableTh>
              <TableTh className={ACTION_TH}>처리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataStatus === "loading"
              ? Array.from({ length: pageSize }, (_, row) => (
                  <TableRow key={`skeleton-${row}`}>
                    {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                      <TableTd key={cell}>
                        <span className="body-small block">
                          <Skeleton />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : paged.map((row) => {
                  const meta = STATUS_META[row.status];
                  const kind = gateOf(row.status);
                  return (
                    <TableRow
                      key={row.sellerId}
                      clickable
                      onClick={() => openDetail(row)}
                    >
                      <TableTd className="whitespace-nowrap tabular-nums">
                        {roundOf(row)}
                      </TableTd>
                      <TableTd>
                        <TextButton onClick={() => openDetail(row)}>
                          {row.name}
                        </TextButton>
                      </TableTd>
                      <TableTd
                        align="right"
                        className="whitespace-nowrap tabular-nums"
                      >
                        {cellMoney.sales(row)}
                      </TableTd>
                      <TableTd
                        align="right"
                        className="whitespace-nowrap tabular-nums"
                      >
                        {cellMoney.coupon(row)}
                      </TableTd>
                      <TableTd
                        align="right"
                        className="whitespace-nowrap tabular-nums"
                      >
                        {cellMoney.fee(row)}
                      </TableTd>
                      <TableTd
                        align="right"
                        className="whitespace-nowrap tabular-nums"
                      >
                        {cellMoney.pg(row)}
                      </TableTd>
                      <TableTd
                        align="right"
                        className="whitespace-nowrap tabular-nums"
                      >
                        {cellMoney.clawback(row)}
                      </TableTd>
                      <TableTd
                        align="right"
                        className="whitespace-nowrap tabular-nums"
                      >
                        {cellMoney.care(row)}
                      </TableTd>
                      <TableTd
                        align="right"
                        className="whitespace-nowrap tabular-nums"
                      >
                        <span className="body-medium-bold">
                          {cellMoney.payout(row)}
                        </span>
                      </TableTd>
                      <TableTd align="center">
                        <Tag tone={meta.tone} dot size="small">
                          {meta.label}
                        </Tag>
                      </TableTd>
                      <TableTd className={ACTION_TD}>
                        {/* [상세]는 두지 않는다 — 행 클릭·셀러명이 이미 상세로 간다 */}
                        {kind ? (
                          <Button size="small" onClick={() => setGate(row)}>
                            {GATE_BUTTON[kind]}
                          </Button>
                        ) : (
                          <span className="text-text-sub">{NO_AMOUNT}</span>
                        )}
                      </TableTd>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* 안심케어 금액 — 모든 셀러 공통 값이라 정산 흐름 밖, 맨 아래 한 줄(원본 `settleSeller.care`) ·
          조회만(부록 A B6-3 — 입력칸·툴팁 없이 읽는 값) */}
      <Card>
        <CardHeader
          title={CARE_PRICE_COPY.title}
          action={
            <span className="body-medium text-text-sub">
              {CARE_PRICE_COPY.scope}
            </span>
          }
        />
        <CardBody>
          <div className="flex flex-wrap items-center gap-3">
            <span className="label-medium-bold text-text">
              {CARE_PRICE_COPY.label}
            </span>
            <span className="body-medium tabular-nums text-text">
              {CARE_PRICE_COPY.value}
            </span>
            <span className="body-small text-text-sub">
              {CARE_PRICE_COPY.help}
            </span>
          </div>
        </CardBody>
      </Card>

      <SettlementGateModal row={gate} onClose={() => setGate(null)} />
    </AppShell>
  );
}
