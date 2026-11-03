import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Gnb,
  IconButton,
  InfoItem,
  InfoList,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
  Skeleton,
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
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import {
  findRow,
  headlineOf,
  infoOf,
  LIST_LABEL,
  LIST_PATH,
  NOT_FOUND,
  orderPathOf,
  SECTIONS,
  sellerPathOf,
  statementDownloaded,
  TITLE,
  TX_PAGE_SIZE,
  TX_PAGE_SIZES,
  TX_RULES,
  txCells,
  txSummaryOf,
} from "./SellerSettlementDetailPage.data";
import {
  GATE_BUTTON,
  gateOf,
  SETTLE_FOOT,
  statementLinesOf,
  STATUS_META,
  type SettlementRow,
} from "./SellerSettlementPage.data";
import {
  SettlementGateModal,
  StatementBox,
  UnpaidNote,
} from "./SellerSettlementPage";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 셀러 정산 상세 (BO-STL-003 · `/settle-seller/{셀러 id}`) — 조회형 · 뼈대
 *
 * ## 구성 — 원본 v0.4 `DETAILS.settlement`
 * ```
 * 머리: 셀러 정산 상세 · {셀러} · {회차} · 상태 배지
 * 정산 명세      ← 목록 합산과 같은 줄 함수(요율 N% · 지급 예정액) + 미회수 각주 + 각주
 * 정산 정보      ← 셀러(→ 셀러 상세) · 정산 반영 거래 건수 · 정산월 · 지급일 · 지급 계좌 · 정산 상태
 *                  (+ 이의제기면 셀러 이의 사유 · 재발송 이력이 있으면 수정 명세 재발송)
 * {회차} 거래 내역 ← No · 주문번호(→ 주문 상세) · 유형 · 상품 · 금액 · 상태 · 정산 반영 + 페이지 + 요약·규칙
 * [목록]             [지급완료|수정 명세 재발송] [명세서] [확인] [취소]   ← 하단 고정 바
 * ```
 * 구역은 각각 접는다. 셀러가 바뀌면 본문을 `key` 로 처음부터 그린다(접힘·페이지·열린 창).
 *
 * ## 퍼블 범위
 * [지급완료]·[수정 명세 재발송]은 목록과 **같은 확인 창**(`SettlementGateModal`) — 처리하면 알림만.
 * [명세서]는 알림만. [확인]·[취소]는 원본대로 목록으로 간다(사용자 결정: 원본 버튼 유지).
 *
 * ## 원본과 다르게 둔 곳
 * - 머리: 원본은 상단 바 제목만(`bare` 를 읽는 코드가 없다 — 결함). 형제 상세처럼 셀러·회차·상태 배지
 * - 읽는 값은 `InfoList` · 상태 배지 톤은 공통 메타 · 거래 내역 행 어디를 눌러도 주문 상세(목록 공통 규칙)
 * - 하단 버튼 순서는 원본 그대로(업무 → 명세서 → 확인 → 취소)
 *
 * ## 데이터 상태
 * `?preview=loading|refreshing`. `empty` 는 없다 — 없는 셀러는 「찾을 수 없음」이다.
 * ====================================================================== */

export interface SellerSettlementDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 라벨 폭 — 가장 긴 「정산 반영 거래 건수」가 한 줄에 들어간다. 모든 구역이 같은 폭(§30-3) */
const LABEL_WIDTH = 136;

function Section({
  title,
  busy,
  dim,
  children,
}: {
  title: string;
  busy: boolean;
  dim: string | undefined;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card variant="soft" aria-busy={busy}>
      <CardHeader
        title={title}
        action={
          <IconButton
            variant="ghost"
            size="small"
            label={`${title} ${open ? "접기" : "펼치기"}`}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            icon={
              open ? (
                <ChevronUp strokeWidth={1.2} aria-hidden />
              ) : (
                <ChevronDown strokeWidth={1.2} aria-hidden />
              )
            }
          />
        }
      />
      {open ? <CardBody className={dim}>{children}</CardBody> : null}
    </Card>
  );
}

function LoadingLines({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="body-medium block w-1/2">
          <Skeleton />
        </span>
      ))}
    </div>
  );
}

const Item = ({ label, children }: { label: string; children: ReactNode }) => (
  <InfoItem label={label} labelWidth={LABEL_WIDTH}>
    {children}
  </InfoItem>
);

export function SellerSettlementDetailPage(
  props: SellerSettlementDetailPageProps,
) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  /* 경로는 `/settle-seller/{셀러 id}` **한 조각**이어야 한다 */
  const rest = pathname.slice(LIST_PATH.length + 1);
  const row = rest.includes("/")
    ? undefined
    : findRow(lastPathSegment(pathname));

  if (!row) {
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
        header={<PageHeader title={TITLE} />}
      >
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<Wallet strokeWidth={1.2} aria-hidden />}
              title={NOT_FOUND.title}
              description={NOT_FOUND.description}
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                {LIST_LABEL}으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  return <DetailBody key={row.sellerId} row={row} {...props} />;
}

function DetailBody({
  row,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerSettlementDetailPageProps & { row: SettlementRow }) {
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const [gateOpen, setGateOpen] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(TX_PAGE_SIZE);

  const meta = STATUS_META[row.status];
  const kind = gateOf(row.status);
  const info = infoOf(row);
  const summary = txSummaryOf(row);

  const txPages = Math.max(1, Math.ceil(row.transactions.length / txPageSize));
  const currentTxPage = Math.min(txPage, txPages);
  const txStart = (currentTxPage - 1) * txPageSize;
  const txView = row.transactions.slice(txStart, txStart + txPageSize);

  const toList = () => onNavSelect(LIST_PATH);

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
          title={TITLE}
          description={headlineOf(row)}
          badges={
            <Tag tone={meta.tone} dot>
              {meta.label}
            </Tag>
          }
        />
      }
    >
      <Section title={SECTIONS.statement} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={7} />
        ) : (
          <>
            <StatementBox
              lines={statementLinesOf(row, {
                totalLabel: "지급 예정액",
                rate: row.rate,
              })}
            />
            <UnpaidNote unpaid={row.unpaid} />
            <p className="body-small text-text-sub">{SETTLE_FOOT}</p>
          </>
        )}
      </Section>

      <Section title={SECTIONS.info} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={6} />
        ) : (
          <InfoList>
            <Item label="셀러">
              <TextButton onClick={() => onNavSelect(sellerPathOf(row))}>
                {row.name}
              </TextButton>
            </Item>
            <Item label="정산 반영 거래 건수">{info.count}</Item>
            <Item label="정산월">{info.round}</Item>
            <Item label="지급일">{info.payoutDate}</Item>
            <Item label="지급 계좌">{info.account}</Item>
            <Item label="정산 상태">
              <Tag tone={meta.tone} dot size="small">
                {meta.label}
              </Tag>
            </Item>
            {info.objection ? (
              <Item label="셀러 이의 사유">
                <span className="text-text-warning">{info.objection.text}</span>{" "}
                <span className="text-text-sub">({info.objection.at})</span>
              </Item>
            ) : null}
            {info.resend ? (
              <Item label="수정 명세 재발송">
                {info.resend.text}{" "}
                <span className="text-text-sub">({info.resend.at})</span>
              </Item>
            ) : null}
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.transactions} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={4} />
        ) : (
          <>
            {/* 상품명이 길면 표가 카드보다 넓어진다 — 표만 가로로 민다(상품 상세와 같은 처리) */}
            <div className="overflow-x-auto">
              <Table>
                <colgroup>
                  <col className="w-14" />
                  <col className="w-40" />
                  <col className="w-20" />
                  <col />
                  <col className="w-30" />
                  <col className="w-32" />
                  <col className="w-64" />
                </colgroup>
                <TableHead>
                  <TableRow>
                    <TableTh>No</TableTh>
                    <TableTh>주문번호</TableTh>
                    <TableTh align="center">유형</TableTh>
                    <TableTh>상품</TableTh>
                    <TableTh>금액</TableTh>
                    <TableTh align="center">상태</TableTh>
                    <TableTh>정산 반영</TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {txView.map((tx, index) => {
                    const cells = txCells(tx);
                    const open = () => onNavSelect(orderPathOf(tx));
                    return (
                      <TableRow key={tx.order.id} clickable onClick={open}>
                        {/* 페이지 안 순번(원본 `start + i + 1`) */}
                        <TableTd className="tabular-nums">
                          {txStart + index + 1}
                        </TableTd>
                        <TableTd>
                          <TextButton onClick={open}>
                            {tx.order.orderNo}
                          </TextButton>
                        </TableTd>
                        <TableTd align="center">
                          <Tag tone={cells.type.tone} size="small">
                            {cells.type.label}
                          </Tag>
                        </TableTd>
                        <TableTd ellipsis>{tx.order.productName}</TableTd>
                        <TableTd className="tabular-nums">
                          {cells.amount}
                        </TableTd>
                        <TableTd align="center">
                          <Tag tone={cells.status.tone} dot size="small">
                            {cells.status.label}
                          </Tag>
                        </TableTd>
                        {/* 반영이 아닌 줄은 흐리게(원본 `muted`) */}
                        <TableTd>
                          {tx.kind === "included" ? (
                            tx.note
                          ) : (
                            <span className="text-text-sub">{tx.note}</span>
                          )}
                        </TableTd>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={currentTxPage}
              totalPages={txPages}
              onPageChange={setTxPage}
              end={
                <PaginationSizeSelect
                  sizes={TX_PAGE_SIZES}
                  value={txPageSize}
                  onSizeChange={(size) => {
                    setTxPageSize(size);
                    setTxPage(1);
                  }}
                />
              }
            />
            <div className="body-small flex flex-col gap-1 text-text-sub">
              <p>
                반영{" "}
                <strong className="body-small-bold text-text">
                  {summary.included}
                </strong>
                (= 확정 거래액) · 제외{" "}
                <strong className="body-small-bold text-text">
                  {summary.excluded}
                </strong>
              </p>
              <ul className="list-disc pl-5">
                {TX_RULES.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </Section>

      {/* 하단 바 — 원본 `nvEditPage`: 좌 [목록] / 우 업무 · [명세서] · [확인] · [취소] */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={toList}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            {kind ? (
              <Button onClick={() => setGateOpen(true)}>
                {GATE_BUTTON[kind]}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => toast(statementDownloaded(row.name))}
            >
              명세서
            </Button>
            <Button onClick={toList}>확인</Button>
            <Button variant="secondary" onClick={toList}>
              취소
            </Button>
          </div>
        </div>
      </Card>

      <SettlementGateModal
        row={gateOpen ? row : null}
        onClose={() => setGateOpen(false)}
      />
    </AppShell>
  );
}
