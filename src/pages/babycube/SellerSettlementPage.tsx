import { useState } from "react";
import { Info, Search } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTableShell,
  Divider,
  EmptyState,
  FilterBar,
  FormField,
  Gnb,
  IconButton,
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
  Tooltip,
  useToast,
} from "../../components/ui";
import { cn } from "../../lib/cn";
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
  LIST_HEADING,
  matchesFilters,
  num,
  PAGE_SIZE,
  PAGE_SIZES,
  payLinesOf,
  ROWS,
  SEARCH_PLACEHOLDER,
  SETTLE_FOOT,
  sellerCountText,
  statementLinesOf,
  STATUS_META,
  STATUS_OPTIONS,
  SUMMARY,
  SUMMARY_STATS,
  SUMMARY_SUB,
  SUMMARY_TITLE,
  TOTAL_STATEMENT_SUB,
  TOTAL_STATEMENT_TITLE,
  unpaidNoteOf,
  type SettlementFilters,
  type SettlementRow,
  type StatementLine,
} from "./SellerSettlementPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 셀러 정산 (BO-STL-002 · `/settle-seller`) — 목록형 · 뼈대
 *
 * ## 구성 — 원본 v0.4 `SCREENS.settleSeller` 순서 그대로
 * ```
 * {회차} 정산 요약 · 지급일          ← 타일 4장(전체 셀러 — 필터와 무관)
 * 안심케어 금액 설정 · 플랫폼 공통    ← 금액 입력 하나(화면 안 값 + 알림)
 * {회차} 정산 명세 · 전 입점사 합산   ← 명세 줄 + 미회수 각주 + 각주
 * 정산 대상 입점사 · N개사            ← 소제목
 * 검색조건(펼침 · 요약 · 초기화)       ← 상태 셀렉트 · 셀러명
 * 목록 (총 N건) / 표 10열 / 페이지(10·20·50·100)
 * ```
 * 표 10열: 셀러 · 거래액 · 셀러쿠폰 · 수수료 · PG수수료 · 취소·반품 차감 · 안심케어 · 지급액 · 상태 · 처리.
 * 체크박스·No·정렬·엑셀은 **없다**(원본 그대로).
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./SellerSettlementPage.data.ts`, 숫자는 `settlement.data.ts`
 *
 * | 갈아끼울 것             | 위치                                              |
 * | ----------------------- | ------------------------------------------------- |
 * | 행·요약·라벨·단위·문구  | `SellerSettlementPage.data.ts`                    |
 * | 명세 줄                 | 같은 파일 `statementLinesOf` (상세와 공용)        |
 * | 상태별 버튼·모달 문구   | 같은 파일 `gateOf` · `GATE_COPY` · `payLinesOf`   |
 * | 표 컬럼                 | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀    |
 *
 * ## 상호작용
 * - 행 어디를 눌러도 상세(`/settle-seller/{셀러 id}`) — 셀러명 링크·[상세]도 같다.
 *   처리 열의 업무 버튼은 행 클릭이 아니다(`TableRow clickable` 이 셀 안 버튼을 거른다)
 * - 처리 열: 확인완료·보류 → [지급완료] · 이의제기 → [수정 명세 재발송] · 그 밖은 [상세]만
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
 *   열 왼쪽 정렬(목록 공통)
 * - 행 클릭 → 상세(사용자 결정 2026-11-02 — 원본은 셀러명·[상세]만)
 *
 * ## ⚠️ 원본에 없어 걷어낸 것 — 되살리지 말 것
 * 정산 회차 열 · 좌측 고정 열 · 엑셀 다운로드 · 행 클릭 「정산 미리보기」 모달 ·
 * 필터 아래 상태 설명 문구(v0.4 에 없다) · 셀러명 검색의 회차 id 검색 · [확인요청]·[확인완료]·[협의 완료] 대행 버튼
 * ====================================================================== */

/** 상세 경로 — 셀러 마스터 id 가 키다(한 회차만 다룬다 — 원본 `DETAILS.settlement`) */
const detailPathOf = (row: SettlementRow) => `/settle-seller/${row.sellerId}`;

const COLUMN_COUNT = 10;

/* =========================================================================
 * 명세 상자 — 합산 명세 · 상세 「정산 명세」 · 지급 모달이 같은 것을 그린다
 * ====================================================================== */

const LABEL_CLASS: Record<StatementLine["tone"], string> = {
  base: "body-medium text-text",
  sub: "body-medium text-text-sub",
  strong: "body-medium-bold text-text",
  total: "body-large-bold text-text",
  info: "body-medium text-text-sub",
};

const valueClassOf = (line: StatementLine) =>
  line.tone === "total"
    ? "body-large-bold text-text"
    : line.tone === "strong"
      ? "body-medium-bold text-text"
      : line.minus
        ? "body-medium text-text-critical"
        : line.tone === "info"
          ? "body-medium text-text-sub"
          : "body-medium text-text";

/** 줄 목록을 그린다 — 딸린 가감(`sub`·`info`)은 들여쓰고, 총액 위에 구분선 */
export function StatementBox({ lines }: { lines: StatementLine[] }) {
  return (
    <dl className="flex flex-col gap-2">
      {lines.map((line) => (
        <div key={line.key} className="flex flex-col gap-2">
          {line.tone === "total" && <Divider />}
          <div
            className={cn(
              "flex min-h-7 items-center justify-between gap-4",
              (line.tone === "sub" || line.tone === "info") && "pl-4",
            )}
          >
            <dt
              className={cn("flex items-center gap-1", LABEL_CLASS[line.tone])}
            >
              {line.label}
              {line.tip ? (
                <Tooltip content={line.tip}>
                  <IconButton
                    variant="ghost"
                    size="xsmall"
                    label={`${line.label} 도움말`}
                    icon={<Info strokeWidth={1.2} aria-hidden />}
                  />
                </Tooltip>
              ) : null}
            </dt>
            <dd className={cn("tabular-nums", valueClassOf(line))}>
              {line.value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/** 미회수 각주 — 미회수가 있을 때만 */
export function UnpaidNote({ unpaid }: { unpaid: number }) {
  const note = unpaidNoteOf(unpaid);
  if (!note) return null;
  return (
    <p className="body-small text-text-sub">
      <strong className="body-small-bold text-text">{note.strong}</strong>{" "}
      {note.rest}
    </p>
  );
}

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
            <StatementBox lines={payLinesOf(row)} />
            <UnpaidNote unpaid={row.unpaid} />
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
  const { toast } = useToast();
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const [filters, setFilters] = useState<SettlementFilters>(EMPTY_FILTERS);
  /** 검색조건 펼침 — **기본은 펼침**(사용자 결정 2026-10-19 · 원본은 접힘) */
  const [filterOpen, setFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [gate, setGate] = useState<SettlementRow | null>(null);

  /* 안심케어 금액 — 화면 안 값. 확정(포커스 이탈·Enter)하면 알림만 */
  const [carePrice, setCarePrice] = useState(CARE_PRICE_COPY.initial);
  const [careText, setCareText] = useState(num(CARE_PRICE_COPY.initial));
  const commitCare = () => {
    const value = CARE_PRICE_COPY.parse(careText);
    setCareText(value ? num(value) : "");
    if (value === carePrice) return;
    setCarePrice(value);
    toast(CARE_PRICE_COPY.done(value));
  };

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
      {/* 정산 요약 — 전체 셀러 합(필터와 무관 · 원본) */}
      <Card>
        <CardHeader>
          <h2 className="heading-medium-bold text-text">{SUMMARY_TITLE}</h2>
          <span className="body-small text-text-sub">{SUMMARY_SUB}</span>
        </CardHeader>
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
        </CardBody>
      </Card>

      {/* 안심케어 금액 설정 — 원본 `settleSeller.care`. 값은 화면 안에만 산다 */}
      <Card>
        <CardHeader>
          <h2 className="heading-medium-bold text-text">
            {CARE_PRICE_COPY.title}
          </h2>
          <span className="body-small text-text-sub">
            {CARE_PRICE_COPY.sub}
          </span>
        </CardHeader>
        <CardBody>
          <FormField
            label={CARE_PRICE_COPY.label}
            description={CARE_PRICE_COPY.help}
            suffix="원"
          >
            <Input
              className="w-60"
              inputMode="numeric"
              placeholder="0"
              value={careText}
              onChange={(event) => setCareText(event.target.value)}
              onBlur={commitCare}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitCare();
              }}
            />
          </FormField>
        </CardBody>
      </Card>

      {/* 전 입점사 합산 명세 — 상세 「정산 명세」와 같은 줄 함수 */}
      <Card>
        <CardHeader>
          <h2 className="heading-medium-bold text-text">
            {TOTAL_STATEMENT_TITLE}
          </h2>
          <span className="body-small text-text-sub">
            {TOTAL_STATEMENT_SUB}
          </span>
        </CardHeader>
        <CardBody>
          <StatementBox
            lines={statementLinesOf(SUMMARY, {
              listLabel: "입점사 확정 거래액 (할인 후)",
              totalLabel: "지급 예정 총액",
            })}
          />
          <UnpaidNote unpaid={SUMMARY.unpaid} />
          <p className="body-small text-text-sub">{SETTLE_FOOT}</p>
        </CardBody>
      </Card>

      {/* 소제목 — 원본 `정산 대상 입점사 · N개사` */}
      <div className="flex items-baseline gap-2">
        <h2 className="heading-medium-bold text-text">{LIST_HEADING}</h2>
        <span className="body-small text-text-sub">
          {sellerCountText(ROWS.length)}
        </span>
      </div>

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
            목록 (총 {filtered.length}건)
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
            <col className="w-35" />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-33" />
            <col className="w-28" />
            <col className="w-30" />
            <col className="w-25" />
            <col className="w-56" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>셀러</TableTh>
              <TableTh>거래액(할인 후)</TableTh>
              <TableTh>셀러쿠폰</TableTh>
              <TableTh>수수료</TableTh>
              <TableTh>PG수수료</TableTh>
              <TableTh>취소·반품 차감</TableTh>
              <TableTh>안심케어</TableTh>
              <TableTh>지급액</TableTh>
              {/* 배지만 들어가는 열은 가운데 (§7-2) */}
              <TableTh align="center">상태</TableTh>
              <TableTh>처리</TableTh>
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
                      <TableTd>
                        <TextButton onClick={() => openDetail(row)}>
                          {row.name}
                        </TextButton>
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {cellMoney.sales(row)}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {cellMoney.coupon(row)}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {cellMoney.fee(row)}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {cellMoney.pg(row)}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {cellMoney.clawback(row)}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {cellMoney.care(row)}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        <span className="body-medium-bold">
                          {cellMoney.payout(row)}
                        </span>
                      </TableTd>
                      <TableTd align="center">
                        <Tag tone={meta.tone} dot size="small">
                          {meta.label}
                        </Tag>
                      </TableTd>
                      <TableTd>
                        <div className="flex items-center gap-2">
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => openDetail(row)}
                          >
                            상세
                          </Button>
                          {kind ? (
                            <Button size="small" onClick={() => setGate(row)}>
                              {GATE_BUTTON[kind]}
                            </Button>
                          ) : null}
                        </div>
                      </TableTd>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>

      <SettlementGateModal row={gate} onClose={() => setGate(null)} />
    </AppShell>
  );
}
