import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, FileText, Info } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  EmptyState,
  Gnb,
  IconButton,
  InfoItem,
  InfoList,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
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
} from "../../components/ui";
import { cn } from "../../lib/cn";
import { lastPathSegment, usePathname } from "../../lib/router";
import {
  STATUS_META as ORDER_STATUS_META,
  TYPE_META,
} from "./OrderListPage.data";
import { SETTLEMENT_STATUS_META, type SettlementRow } from "./settlement.data";
import { won } from "./SettlementStatementPage.data";
import {
  DETAIL_TITLE,
  LIST_PATH,
  PAGE_SIZE,
  PAGE_SIZES,
  POLICY,
  SECTIONS,
  SELLER_SETTLE_PATH,
  TX_EMPTY,
  calcLinesOf,
  downloadMessageOf,
  findStatementByNo,
  headlineOf,
  orderPathOf,
  payLinesOf,
  payNotesOf,
  sellerSettlePathOf,
  txFootOf,
  txNoteParts,
  txRulesOf,
  txTitleOf,
  unpaidNoteOf,
  type Rich,
} from "./SettlementStatementDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 정산 명세서 상세 (BO-STL-008) — 조회형 · 뼈대
 *
 * ## 구성 — 원본 v0.4 `hqStmtPage` (proto.html 5472~5490)
 * ```
 * 머리: 정산 명세서 상세 · {번호} · {대상} · {회차} 명세서 · 매출 · 지급액 · 지급일 + 상태 배지
 * 지급 정보 · 정산 명세(계산 박스) · {YYYY년 MM월} 거래 내역(표 + 페이저 + 각주) · 정산 정책   (각각 접기)
 * [목록]                [다운로드] [셀러 정산에서 처리](셀러만) [확인] [취소]                   ← 하단 바
 * ```
 * 경로 `/settle-statement/{명세서번호}` — 마지막 조각으로 찾고, 없거나 조각이 둘 이상이면 「찾을 수 없음」.
 *
 * ## 퍼블 범위
 * 고치는 값이 없다 — 접기 · 거래 내역 페이지 · [다운로드] 알림 · 이동뿐. [확인]·[취소]는 원본처럼 둘 다 목록으로.
 * 명세서가 바뀌면 `key` 로 처음부터(접힘·페이지가 다음 명세에 묻어가지 않게).
 *
 * ## 이 파일은 도메인을 모른다 — 줄 이름·문구·표기는 `./SettlementStatementDetailPage.data.ts`
 * ====================================================================== */

export interface SettlementStatementDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

const LABEL_WIDTH = 128;

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Card variant="soft">
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
      {open ? <CardBody>{children}</CardBody> : null}
    </Card>
  );
}

/** 굵은 낱말·셀러 정산 링크가 섞인 안내 한 줄 */
function RichText({ parts, onLink }: { parts: Rich; onLink: () => void }) {
  return (
    <>
      {parts.map((part, index) =>
        typeof part === "string" ? (
          part
        ) : "bold" in part ? (
          <strong key={index} className="body-small-bold text-text">
            {part.bold}
          </strong>
        ) : (
          <TextButton key={index} size="small" onClick={onLink}>
            {part.link}
          </TextButton>
        ),
      )}
    </>
  );
}

export function SettlementStatementDetailPage(
  props: SettlementStatementDetailPageProps,
) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  const rest = pathname.slice(LIST_PATH.length + 1);
  const row = rest.includes("/")
    ? undefined
    : findStatementByNo(lastPathSegment(pathname));

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
        header={<PageHeader title={DETAIL_TITLE} />}
      >
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<FileText strokeWidth={1.2} aria-hidden />}
              title="찾을 수 없는 명세서입니다"
              description="주소가 잘못되었거나 삭제된 명세서일 수 있습니다."
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                정산 내역/명세서로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  return <StatementDetailBody key={row.statementNo} row={row} {...props} />;
}

function StatementDetailBody({
  row,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SettlementStatementDetailPageProps & { row: SettlementRow }) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const status = SETTLEMENT_STATUS_META[row.status];
  const seller = row.kind === "seller";
  const toSellerMenu = () => onNavSelect(SELLER_SETTLE_PATH);
  const toList = () => onNavSelect(LIST_PATH);

  const txs = row.transactions;
  const totalPages = Math.max(1, Math.ceil(txs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedTx = txs.slice(start, start + pageSize);
  const foot = txFootOf(row);
  const unpaidNote = unpaidNoteOf(row);

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
          title={DETAIL_TITLE}
          description={headlineOf(row)}
          badges={
            <Tag tone={status.tone} dot>
              {status.label}
            </Tag>
          }
        />
      }
    >
      <Section title={SECTIONS.pay}>
        <InfoList>
          {payLinesOf(row).map((line) => (
            <InfoItem
              key={line.label}
              label={line.label}
              labelWidth={LABEL_WIDTH}
            >
              {line.value}
            </InfoItem>
          ))}
          <InfoItem label="상태" labelWidth={LABEL_WIDTH}>
            <Tag tone={status.tone} dot size="small">
              {status.label}
            </Tag>
          </InfoItem>
        </InfoList>
        {payNotesOf(row).map((note, index) => (
          <p key={index} className="body-small text-text-sub">
            <RichText parts={note} onLink={toSellerMenu} />
          </p>
        ))}
      </Section>

      <Section title={SECTIONS.calc}>
        {/* 원본 `amt(rows,'boxed stmt')` — 기준·소계·총액은 기본 행, 딸린 가감은 들여쓴다 */}
        <dl
          data-statement-calc
          className="flex flex-col gap-2 rounded-medium p-4 outline-1 -outline-offset-1 outline-border"
        >
          {calcLinesOf(row).map((line) => (
            <div key={line.label} className="flex flex-col gap-2">
              {line.tone === "total" && <Divider />}
              <div
                className={cn(
                  "flex items-center justify-between gap-4",
                  line.tone === "sub" && "pl-4",
                )}
              >
                <dt
                  className={cn(
                    "flex items-center gap-1",
                    line.tone === "total"
                      ? "body-large-bold text-text"
                      : line.tone === "strong"
                        ? "body-medium-bold text-text"
                        : "body-medium text-text-sub",
                  )}
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
                <dd
                  className={cn(
                    "tabular-nums",
                    line.tone === "total"
                      ? "body-large-bold text-text"
                      : line.tone === "strong"
                        ? "body-medium-bold text-text"
                        : line.minus
                          ? "body-medium text-text-critical"
                          : line.info
                            ? "body-medium text-text-minimal"
                            : "body-medium text-text",
                  )}
                >
                  {line.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
        {unpaidNote ? (
          <p className="body-small text-text-sub">
            <RichText parts={unpaidNote} onLink={toSellerMenu} />
          </p>
        ) : null}
      </Section>

      <Section title={txTitleOf(row)}>
        {/* 상품명이 길면 표가 카드보다 넓어진다 — 표만 가로로 민다(상품 상세와 같은 처리) */}
        <div className="overflow-x-auto">
          <Table>
            <colgroup>
              <col className="w-16" />
              <col className="w-44" />
              <col className="w-20" />
              <col />
              <col className="w-32" />
              <col className="w-32" />
              <col className="w-60" />
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
              {pagedTx.length === 0 ? (
                <TableRow>
                  <TableTd colSpan={7} align="center">
                    <span className="text-text-sub">{TX_EMPTY}</span>
                  </TableTd>
                </TableRow>
              ) : (
                pagedTx.map((tx, index) => {
                  const orderStatus = ORDER_STATUS_META[tx.order.status];
                  const note = txNoteParts(tx);
                  return (
                    <TableRow key={tx.order.id}>
                      <TableTd className="tabular-nums">
                        {start + index + 1}
                      </TableTd>
                      <TableTd>
                        <TextButton
                          onClick={() => onNavSelect(orderPathOf(tx))}
                        >
                          {tx.order.orderNo}
                        </TextButton>
                      </TableTd>
                      <TableTd align="center">
                        <Tag tone={TYPE_META[tx.order.type].tone} size="small">
                          {TYPE_META[tx.order.type].label}
                        </Tag>
                      </TableTd>
                      <TableTd ellipsis>{tx.order.productName}</TableTd>
                      <TableTd className="tabular-nums">
                        {won(tx.amount)}
                      </TableTd>
                      <TableTd align="center">
                        <Tag tone={orderStatus.tone} dot size="small">
                          {orderStatus.label}
                        </Tag>
                      </TableTd>
                      <TableTd>
                        {note.head}
                        <span className="text-text-sub">{note.rest}</span>
                      </TableTd>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
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
        {/* 각주 — 반영 건수·금액은 명세의 확정 거래액과 같은 값(원본 `settleTxFoot`) */}
        <div className="body-small flex flex-col gap-2 rounded-medium bg-surface-sub p-4 text-text-sub">
          <p>
            반영{" "}
            <strong className="body-small-bold text-text">
              {foot.count}건 · {won(foot.amount)}
            </strong>
            (= 확정 거래액) · 제외{" "}
            <strong className="body-small-bold text-text">
              {foot.excluded}건
            </strong>
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {txRulesOf(row).map((rule, index) => (
              <li key={index}>
                <RichText parts={rule} onLink={toSellerMenu} />
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title={SECTIONS.policy}>
        <p className="body-small text-text-sub">
          <RichText parts={POLICY} onLink={toSellerMenu} />
        </p>
      </Section>

      {/* 하단 바 — 원본 `nvEditPage`: 좌 [목록] / 우 extraBtns + [확인](목록) + [취소](목록) */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={toList}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => toast(downloadMessageOf(row))}
            >
              다운로드
            </Button>
            {seller ? (
              <Button
                variant="secondary"
                onClick={() => onNavSelect(sellerSettlePathOf(row.sellerId))}
              >
                셀러 정산에서 처리
              </Button>
            ) : null}
            <Button onClick={toList}>확인</Button>
            <Button variant="secondary" onClick={toList}>
              취소
            </Button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
