import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, FileText, Info } from "lucide-react";
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
  POLICY_ITEMS,
  SECTIONS,
  SELLER_SETTLE_PATH,
  TX_EMPTY,
  calcLinesOf,
  calcNotesOf,
  downloadMessageOf,
  findStatementByNo,
  headlineOf,
  orderPathOf,
  payLinesOf,
  payNotesOf,
  sellerSettlePathOf,
  txFootOf,
  txNoteOf,
  txRulesOf,
  txTitleOf,
  type Rich,
} from "./SettlementStatementDetailPage.data";
import { SettlementCalc } from "./SettlementCalc";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 정산 명세서 상세 (BO-STL-008) — 조회형 · 뼈대
 *
 * ## 구성 — 원본 v0.4 `hqStmtPage` (proto.html 5472~5490)
 * ```
 * 머리: 정산 명세서 상세 · {번호} · {대상} · {회차} + 상태 배지
 * 정산 명세(공용 `SettlementCalc` + 계산 기준 안내 상자) · 지급 정보(+ 상태 안내 상자) ·
 * {2026년 9월} 거래 내역(표 + 페이저 + 각주 · 행 클릭 → 주문 상세) · 정산 정책(목록)   (각각 접기)
 * [목록]                [다운로드] [셀러 정산에서 처리](셀러만) [취소] [확인]                   ← 하단 바
 * ```
 * 경로 `/settle-statement/{명세서번호}` — 마지막 조각으로 찾고, 없거나 조각이 둘 이상이면 「찾을 수 없음」.
 *
 * ## 퍼블 범위
 * 고치는 값이 없다 — 접기 · 거래 내역 페이지 · [다운로드] 알림 · 이동뿐. [확인]·[취소]는 원본처럼 둘 다 목록으로.
 * 카드 순서는 셀러 정산 상세와 같게 명세 먼저(원본은 지급 정보 먼저) — 가장 중요한 숫자가 위에.
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

/** 안내 상자 — info 아이콘 + 목록(줄마다 굵은 낱말·셀러 정산 링크 유지). 줄이 없으면 그리지 않는다 */
function NoteBox({ items, onLink }: { items: Rich[]; onLink: () => void }) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-2 rounded-medium bg-surface-sub px-4 py-3">
      <Info
        size={16}
        strokeWidth={1.2}
        aria-hidden
        className="mt-0.5 shrink-0 text-icon-sub"
      />
      <ul className="body-small flex flex-col gap-1 text-text-sub">
        {items.map((item, index) => (
          <li key={index}>
            <RichText parts={item} onLink={onLink} />
          </li>
        ))}
      </ul>
    </div>
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
      <Section title={SECTIONS.calc}>
        {/* 셀러 정산과 같은 산출 내역 부품 + 계산 기준 안내(본사면 직영 안내 먼저) */}
        <SettlementCalc lines={calcLinesOf(row)} notes={calcNotesOf(row)} />
      </Section>

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
        {/* 상태 안내 — 한 상자에 목록으로(셀러 정산 링크 유지). 본사는 상태 안내가 없으면 상자도 없다 */}
        <NoteBox items={payNotesOf(row)} onLink={toSellerMenu} />
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
                  const note = txNoteOf(tx);
                  return (
                    /* 행 어디를 눌러도 주문 상세(셀러 정산 상세와 같다) — 주문번호 링크는 키보드 경로로 유지 */
                    <TableRow
                      key={tx.order.id}
                      clickable
                      onClick={() => onNavSelect(orderPathOf(tx))}
                    >
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
                        {note.strong}
                        {note.muted ? (
                          <span className="text-text-sub">{note.muted}</span>
                        ) : null}
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
        <ul className="body-small flex list-disc flex-col gap-1 pl-5 text-text-sub">
          {POLICY_ITEMS.map((item, index) => (
            <li key={index}>
              <RichText parts={item} onLink={toSellerMenu} />
            </li>
          ))}
        </ul>
      </Section>

      {/* 하단 바 — 원본 `nvEditPage` 버튼 그대로, 순서는 형제 상세 규칙: 좌 [목록] / 우 보조 → 주([확인]) 맨 오른쪽 */}
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
            <Button variant="secondary" onClick={toList}>
              취소
            </Button>
            <Button onClick={toList}>확인</Button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
