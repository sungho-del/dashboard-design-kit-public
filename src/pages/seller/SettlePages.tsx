import { useState, type ReactNode } from "react";
import { ArrowDownToLine, FileText } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  DataTableShell,
  EmptyState,
  InfoItem,
  InfoList,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
  StatTile,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  TextButton,
  useToast,
} from "../../components/ui";
import { lastPathSegment, usePathname } from "../../lib/router";
import { CalcBreakdown } from "../babycube/CalcBreakdown";
import { StatusTag } from "./OrderGates";
import { LIST_COPY, PAGE_SIZE, PAGE_SIZES } from "./processList.data";
import type { OrderUnit } from "./seed/orders.data";
import {
  Bold,
  NoteBox,
  Section,
  SellerShell,
  StmtGates,
  TxFoot,
  TxTable,
  type SellerNavProps,
  type StmtGate,
} from "./SettleParts";
import {
  PAST_TX_NOTE,
  PAYOUT_ACCOUNT,
  SETTLE_FOOT,
  SETTLE_MONTH,
  SETTLE_MONTH_KO,
  SETTLE_PAYDAY,
  SETTLE_POLICY,
  SETTLE_TX,
  STATEMENTS,
  STMT_REQUEST_NOTE,
  SUMMARY,
  TAX_INVOICES,
  findStatement,
  minus,
  pastStatementBlocks,
  settleBlocksOf,
  txPathOf,
  unpaidNoteOf,
  won,
  type Statement,
} from "./settle.data";

/* =========================================================================
 * 정산 관리 4화면 + 명세서 상세 2 — 원본 기획 v0.4 `SCREENS.settleOwn`(4426) · `settleStatement`(4450) ·
 * `settleTax`(4460) · `sellerStmtPage`(5299 — 매출 정산 상세·정산 명세서 상세 공용 빌더)
 *
 * 숫자는 전부 `./settle.data`(원본 식 · 정답 대조). 이 파일은 배치·상호작용만.
 *
 * ## 퍼블 범위 (A안 · GPT 검토 `settle-gpt-review`)
 * - [확인]·[이의제기] = 원본 창 + 알림까지. 명세서 상태는 바뀌지 않는다(렌트 묶음과 같다)
 * - [다운로드]·[저장]·엑셀 = 알림만(원본 `act` 문구 그대로)
 *
 * ## 원본과 다르게 둔 곳
 * - 상세 하단 바 = 형제 상세 규칙(주 버튼 하나 · 맨 오른쪽): 확인요청이면 [확인], 아니면 [저장]이 주 버튼
 * - 확인요청 안내 「상단 [확인] 버튼」 → 「하단」(우리 버튼은 하단 바에 있다)
 * - 요약 타일 「지급 예정액」 강조(원본 `hl`)는 두지 않는다 — 타일에 강조 변형이 없다(경고색은 주의 수치 전용)
 * ====================================================================== */

/* ---------- 매출 정산 (SO-STL-001) ---------- */

export function SettleOwnPage(props: SellerNavProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<string[]>([]);

  const list = SETTLE_TX;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = list.slice(start, start + pageSize);
  const pageIds = paged.map((u) => u.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someChecked =
    pageIds.some((id) => selected.includes(id)) && !allChecked;

  const exportCsv = () => {
    const picked = selected.length > 0;
    toast(LIST_COPY.excel(picked ? selected.length : list.length, picked));
  };
  const open = (u: OrderUnit) => props.onNavSelect(txPathOf(u));

  return (
    <SellerShell {...props} header={<PageHeader title="매출 정산" />}>
      <section className="flex flex-col gap-4" aria-label="정산 요약">
        <h2 className="flex items-baseline gap-3">
          <span className="heading-medium-bold text-text">
            {SETTLE_MONTH_KO} 정산 요약
          </span>
          {/* 원본 문구 그대로 — 기준일(06.29)로는 D-11 이다(기획 확인) */}
          <span className="body-medium text-text-sub">
            지급일 {SETTLE_PAYDAY} · D-3
          </span>
        </h2>
        <div className="grid grid-cols-4 gap-6">
          {(
            [
              ["판매 확정 매출", SUMMARY.sale],
              ["렌트 확정 매출", SUMMARY.rent],
              ["확정 거래액 (판매가)", SUMMARY.list],
              ["지급 예정액", SUMMARY.payout],
            ] as const
          ).map(([label, value]) => (
            <StatTile
              key={label}
              variant="card"
              label={label}
              value={value.toLocaleString("ko-KR")}
              unit="원"
            />
          ))}
        </div>
      </section>

      <Section
        title={`${SETTLE_MONTH} 정산 명세`}
        action={
          <Button
            variant="secondary"
            size="small"
            onClick={() => props.onNavSelect(`/settle-own/${SETTLE_MONTH}`)}
          >
            정산 명세서 상세
          </Button>
        }
      >
        <CalcBreakdown
          blocks={settleBlocksOf(SUMMARY)}
          notes={[unpaidNoteOf(SUMMARY.unpaid), SETTLE_FOOT].filter(Boolean)}
        />
      </Section>

      <section className="flex flex-col gap-4" aria-label="거래 내역">
        <h2 className="flex items-baseline gap-3">
          <span className="heading-medium-bold text-text">
            {SETTLE_MONTH_KO} 거래 내역
          </span>
          <span className="body-medium text-text-sub">
            {list.length}건 중 반영 {SUMMARY.units.length}건
          </span>
        </h2>
        <DataTableShell
          variant="soft"
          toolbarStart={
            <h3 className="heading-medium-bold text-text">
              목록 (총 {list.length}건)
            </h3>
          }
          toolbarEnd={
            <Button variant="secondary" onClick={exportCsv}>
              <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
              엑셀 다운로드
            </Button>
          }
          footer={
            <div className="flex flex-col gap-4">
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
              <TxFoot units={list} />
            </div>
          }
        >
          <TxTable
            units={paged}
            start={start}
            onOpen={open}
            selection={{
              selected,
              allChecked,
              someChecked,
              onToggle: (id) =>
                setSelected((prev) =>
                  prev.includes(id)
                    ? prev.filter((v) => v !== id)
                    : [...prev, id],
                ),
              onTogglePage: () =>
                setSelected((prev) =>
                  allChecked
                    ? prev.filter((id) => !pageIds.includes(id))
                    : [...prev, ...pageIds.filter((id) => !prev.includes(id))],
                ),
            }}
          />
        </DataTableShell>
      </section>
    </SellerShell>
  );
}

/* ---------- 목록 공용 — 정산 내역/명세서 · 세금계산서(3행 · 체크박스 · 엑셀 · 페이지) ---------- */

function useRowSelection(ids: string[]) {
  const [selected, setSelected] = useState<string[]>([]);
  const allChecked = ids.length > 0 && ids.every((id) => selected.includes(id));
  return {
    selected,
    allChecked,
    someChecked: selected.length > 0 && !allChecked,
    toggle: (id: string) =>
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
      ),
    toggleAll: () => setSelected(allChecked ? [] : ids),
  };
}

function SmallListShell({
  count,
  selected,
  children,
}: {
  count: number;
  selected: number;
  children: ReactNode;
}) {
  const { toast } = useToast();
  return (
    <DataTableShell
      variant="soft"
      toolbarStart={
        <h2 className="heading-medium-bold text-text">목록 (총 {count}건)</h2>
      }
      toolbarEnd={
        <Button
          variant="secondary"
          onClick={() =>
            toast(
              LIST_COPY.excel(selected > 0 ? selected : count, selected > 0),
            )
          }
        >
          <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
          엑셀 다운로드
        </Button>
      }
      footer={<Pagination page={1} totalPages={1} onPageChange={() => {}} />}
    >
      {children}
    </DataTableShell>
  );
}

/* ---------- 정산 내역/명세서 (SO-STL-006) ---------- */

export function SettleStatementPage(props: SellerNavProps) {
  const [gate, setGate] = useState<StmtGate>(null);
  const sel = useRowSelection(STATEMENTS.map((s) => s.month));
  const open = (s: Statement) =>
    props.onNavSelect(`/settle-statement/${s.month}`);

  return (
    <SellerShell {...props} header={<PageHeader title="정산 내역/명세서" />}>
      <SmallListShell count={STATEMENTS.length} selected={sel.selected.length}>
        <Table>
          {/* 모든 열에 폭 — 합 976(1280 본문 폭). 처리 버튼은 [명세서] / [이의제기][확인] 두 줄로 접힌다 */}
          <colgroup>
            <col className="w-13" />
            <col className="w-26" />
            <col className="w-20" />
            <col className="w-28" />
            <col className="w-32" />
            <col className="w-28" />
            <col className="w-26" />
            <col className="w-26" />
            <col className="w-45" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>
                <Checkbox
                  size="small"
                  aria-label="전체 선택"
                  checked={sel.allChecked}
                  indeterminate={sel.someChecked}
                  onChange={sel.toggleAll}
                />
              </TableTh>
              <TableTh>명세서번호</TableTh>
              <TableTh>정산월</TableTh>
              {/* 금액 3열 — 계산을 맞춰 읽는 열이라 오른쪽(§7-2 계산 영역 예외 · 본사 명세서와 같다) */}
              <TableTh align="right">확정 매출</TableTh>
              <TableTh align="right">차감(수수료·PG)</TableTh>
              <TableTh align="right">지급액</TableTh>
              <TableTh>지급일</TableTh>
              <TableTh align="center">상태</TableTh>
              <TableTh>처리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {STATEMENTS.map((s) => (
              <TableRow key={s.month} clickable onClick={() => open(s)}>
                <TableTd>
                  <Checkbox
                    size="small"
                    aria-label={`${s.no} 선택`}
                    checked={sel.selected.includes(s.month)}
                    onChange={() => sel.toggle(s.month)}
                  />
                </TableTd>
                <TableTd>
                  <TextButton onClick={() => open(s)}>{s.no}</TextButton>
                </TableTd>
                <TableTd className="tabular-nums">{s.month}</TableTd>
                <TableTd align="right" className="tabular-nums">
                  {won(s.gmv)}
                </TableTd>
                <TableTd align="right" className="tabular-nums">
                  {s.ded ? minus(s.ded) : "-"}
                </TableTd>
                <TableTd
                  align="right"
                  className="body-medium-bold tabular-nums"
                >
                  {won(s.payout)}
                </TableTd>
                <TableTd className="tabular-nums">{s.payday}</TableTd>
                <TableTd align="center">
                  <StatusTag status={s.stat} />
                </TableTd>
                <TableTd>
                  <span className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => open(s)}
                    >
                      명세서
                    </Button>
                    {/* 판단 한 쌍은 같이 줄바꿈된다 */}
                    {s.stat === "확인요청" && (
                      <span className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => setGate("object")}
                        >
                          이의제기
                        </Button>
                        <Button size="small" onClick={() => setGate("confirm")}>
                          확인
                        </Button>
                      </span>
                    )}
                  </span>
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SmallListShell>
      <StmtGates gate={gate} onClose={() => setGate(null)} />
    </SellerShell>
  );
}

/* ---------- 세금계산서·증빙 (SO-STL-007) ---------- */

export function SettleTaxPage(props: SellerNavProps) {
  const { toast } = useToast();
  const sel = useRowSelection(TAX_INVOICES.map((t) => t.no));

  return (
    <SellerShell {...props} header={<PageHeader title="세금계산서·증빙" />}>
      <SmallListShell
        count={TAX_INVOICES.length}
        selected={sel.selected.length}
      >
        <Table>
          {/* 모든 열에 폭 — 합 940(실측 필요 폭 922 · 1280 본문 976 안). 「매월 10일 발행」(판정 Q4)은 1280 에서 두 줄로 접힌다 */}
          <colgroup>
            <col className="w-13" />
            <col className="w-22" />
            <col className="w-31" />
            <col className="w-22" />
            <col className="w-25" />
            <col className="w-27" />
            <col className="w-21" />
            <col className="w-24" />
            <col className="w-22" />
            <col className="w-28" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>
                <Checkbox
                  size="small"
                  aria-label="전체 선택"
                  checked={sel.allChecked}
                  indeterminate={sel.someChecked}
                  onChange={sel.toggleAll}
                />
              </TableTh>
              <TableTh>계산서번호</TableTh>
              <TableTh>공급자</TableTh>
              <TableTh>공급받는자</TableTh>
              <TableTh>작성일</TableTh>
              <TableTh align="right">공급가액(수수료)</TableTh>
              <TableTh align="right">세액(VAT)</TableTh>
              <TableTh align="right">합계</TableTh>
              <TableTh align="center">상태</TableTh>
              <TableTh>처리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {TAX_INVOICES.map((t) => (
              <TableRow key={t.no}>
                <TableTd>
                  <Checkbox
                    size="small"
                    aria-label={`${t.no} 선택`}
                    checked={sel.selected.includes(t.no)}
                    onChange={() => sel.toggle(t.no)}
                  />
                </TableTd>
                <TableTd className="body-medium-bold">{t.no}</TableTd>
                <TableTd>{t.supplier}</TableTd>
                <TableTd>{t.receiver}</TableTd>
                <TableTd className="tabular-nums">{t.date}</TableTd>
                <TableTd align="right" className="tabular-nums">
                  {won(t.supply)}
                </TableTd>
                <TableTd align="right" className="tabular-nums">
                  {won(t.vat)}
                </TableTd>
                <TableTd
                  align="right"
                  className="body-medium-bold tabular-nums"
                >
                  {won(t.supply + t.vat)}
                </TableTd>
                <TableTd align="center">
                  <StatusTag status={t.stat} />
                </TableTd>
                <TableTd>
                  {t.stat === "수취완료" ? (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => toast(`${t.month} 세금계산서 다운로드`)}
                    >
                      다운로드
                    </Button>
                  ) : (
                    <span className="break-keep text-text-sub">
                      매월 10일 발행
                    </span>
                  )}
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SmallListShell>
    </SellerShell>
  );
}

/* ---------- 명세서 상세 — 매출 정산 상세 · 정산 명세서 상세 (원본 `sellerStmtPage` 공용 빌더) ---------- */

interface StatementDetailConfig {
  title: string;
  listPath: string;
  listLabel: string;
}

function StatementDetail({
  config,
  ...props
}: SellerNavProps & { config: StatementDetailConfig }) {
  const pathname = usePathname();
  const rest = pathname.slice(config.listPath.length + 1);
  const s = rest.includes("/")
    ? undefined
    : findStatement(lastPathSegment(pathname));

  if (!s) {
    return (
      <SellerShell {...props} header={<PageHeader title={config.title} />}>
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<FileText strokeWidth={1.2} aria-hidden />}
              title="찾을 수 없는 명세서입니다"
              description="주소가 잘못되었거나 없는 정산월일 수 있습니다."
            >
              <Button
                variant="secondary"
                onClick={() => props.onNavSelect(config.listPath)}
              >
                {config.listLabel}
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </SellerShell>
    );
  }
  return <StatementDetailBody key={s.month} s={s} config={config} {...props} />;
}

const LABEL_WIDTH = 120;

function StatementDetailBody({
  s,
  config,
  ...props
}: SellerNavProps & { s: Statement; config: StatementDetailConfig }) {
  const { toast } = useToast();
  const [gate, setGate] = useState<StmtGate>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const toList = () => props.onNavSelect(config.listPath);
  const requested = s.stat === "확인요청";

  const totalPages = Math.max(1, Math.ceil(SETTLE_TX.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = SETTLE_TX.slice(start, start + pageSize);

  return (
    <SellerShell
      {...props}
      header={
        <PageHeader
          title={config.title}
          description={`${s.no} · ${s.month} 명세서 · 확정 매출 ${won(s.gmv)} · 지급액 ${won(s.payout)} · 지급일 ${s.payday}`}
          badges={<StatusTag status={s.stat} />}
        />
      }
    >
      <Section title="지급 정보">
        <InfoList>
          <InfoItem label="명세서번호" labelWidth={LABEL_WIDTH}>
            <span className="body-medium-bold">{s.no}</span>
          </InfoItem>
          <InfoItem label="정산월" labelWidth={LABEL_WIDTH}>
            {s.month}
          </InfoItem>
          <InfoItem label="지급일" labelWidth={LABEL_WIDTH}>
            {s.payday} (익월 10일)
          </InfoItem>
          <InfoItem label="지급 계좌" labelWidth={LABEL_WIDTH}>
            {PAYOUT_ACCOUNT}
          </InfoItem>
          <InfoItem label="상태" labelWidth={LABEL_WIDTH}>
            <StatusTag status={s.stat} />
          </InfoItem>
        </InfoList>
        {requested && (
          <NoteBox>
            <p>
              <Bold text={STMT_REQUEST_NOTE} />
            </p>
          </NoteBox>
        )}
      </Section>

      <Section title="정산 명세">
        <CalcBreakdown
          blocks={s.live ? settleBlocksOf(SUMMARY) : pastStatementBlocks(s)}
          notes={[unpaidNoteOf(s.unpaid)].filter(Boolean)}
        />
      </Section>

      <Section title={`${SETTLE_MONTH_KO} 거래 내역`}>
        {s.live ? (
          <>
            {/* 상품명이 길면 표가 카드보다 넓어진다 — 표만 가로로 민다 */}
            <div className="overflow-x-auto">
              <TxTable
                units={paged}
                start={start}
                onOpen={(u) => props.onNavSelect(txPathOf(u))}
              />
            </div>
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
            <TxFoot units={SETTLE_TX} />
          </>
        ) : (
          <p className="body-medium text-text-sub">{PAST_TX_NOTE}</p>
        )}
      </Section>

      <Section title="정산 정책">
        <p className="body-small break-keep text-text-sub">
          <Bold text={SETTLE_POLICY} />
        </p>
      </Section>

      {/* 하단 바 — 좌 [목록] / 우 보조 → 주 버튼 하나 맨 오른쪽(확인요청이면 [확인], 아니면 [저장]) */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={toList}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => toast(`${s.no} 명세서 다운로드`)}
            >
              다운로드
            </Button>
            {requested && (
              <Button variant="secondary" onClick={() => setGate("object")}>
                이의제기
              </Button>
            )}
            <Button variant="secondary" onClick={toList}>
              취소
            </Button>
            <Button
              variant={requested ? "secondary" : "primary"}
              onClick={() => toast(`${s.no} 저장`)}
            >
              저장
            </Button>
            {requested && (
              <Button onClick={() => setGate("confirm")}>확인</Button>
            )}
          </div>
        </div>
      </Card>
      <StmtGates gate={gate} onClose={() => setGate(null)} />
    </SellerShell>
  );
}

const OWN_DETAIL: StatementDetailConfig = {
  title: "매출 정산 상세",
  listPath: "/settle-own",
  listLabel: "매출 정산으로",
};
const STMT_DETAIL: StatementDetailConfig = {
  title: "정산 명세서 상세",
  listPath: "/settle-statement",
  listLabel: "정산 내역/명세서로",
};

export const SettleOwnDetailPage = (props: SellerNavProps) => (
  <StatementDetail config={OWN_DETAIL} {...props} />
);
export const SettleStmtDetailPage = (props: SellerNavProps) => (
  <StatementDetail config={STMT_DETAIL} {...props} />
);
