import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Info,
  PackageSearch,
  TriangleAlert,
} from "lucide-react";
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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
  Tooltip,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  navigate,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import { CalcBreakdown } from "./CalcBreakdown";
import { EvidenceRow } from "./CareClaimDetailPage";
import { COPY as EVIDENCE_COPY, evidenceOf } from "./CareClaimDetailPage.data";
import {
  OWNER_LABEL,
  inspectionOf,
  memberPathOf,
  overdueOf,
  sellerPathOf,
} from "./RentDepositDetailPage.data";
import {
  DEPOSIT_STATUS_META,
  ORDER_STATUS_META,
  type DepositRow,
} from "./RentDepositListPage.data";
import {
  COPY,
  FLOW_STEPS,
  LIST_PATH,
  SECTIONS,
  contractIdOf,
  depositBlocksOf,
  extensionCellsOf,
  extensionsOf,
  findContract,
  headlineOf,
  invoiceOf,
  liveExtensionOf,
  paymentPathOf,
  periodOf,
  returnStatusOf,
  stepIndexOf,
} from "./RentContractDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 대여 상세 — 조회형 · 뼈대 (develop `RentDetailScreen` + 부록 A)
 *
 * ## 구성
 * ```
 * 진행 상태 · 계약 정보 · (연장 이력) · 발송 / 반납 / 검수 · 보증금 정산 · 발송 전 / 파손 이미지 (검수 대조)
 * [목록]                                                    ← 하단 고정 바 → 주문 목록
 * ```
 * - 진행 상태: 5단계 한 줄(`<ol>` — 지난 단계 Tag · 지금 단계 색 Tag · 남은 단계 흐린 글자, 사이는 선 도형) +
 *   연체 건만 경고 아이콘 + 「연체 D+N」. 새 부품이 아니다 — 단계 표시가 이 화면 하나뿐이라 화면 안에 둔다
 * - 계약 정보: 계약 ID · 주문번호(→ 결제 상세) · 회원(→ 회원 상세) · 담당(+ 셀러 → 셀러 상세) · 상품 · 대여기간 ·
 *   (살아 있는 연장이 있을 때만) 연장 · 상태
 * - 연장 이력: 연장이 하나라도 있을 때만 — 표 7열. 주문번호 → 연장 결제의 결제 상세
 * - 보증금 정산: 공용 `CalcBreakdown` + 「보증금 상태: {배지}」(부록 A C24)
 * - 이미지: 안심케어 청구 상세의 `EvidenceRow`·문구·장수 규칙 그대로 + 확대 창(부록 A C25 · C80~C83)
 * 화살표는 글자가 아니라 아이콘이다(「원 종료일 → 현재」 · 표 머리 「연장 전 → 후」).
 *
 * ## 퍼블 범위
 * 고치는 값이 없다 — 접기·링크 이동·이미지 확대·[목록]뿐. 처리단위가 바뀌면 `key` 로 처음부터.
 * 번호 없이 들어오면(`/rent-detail/`) 주문 목록으로 보낸다(부록 A B10). 없는 건·렌트가 아닌 건은 「찾을 수 없음」.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./RentContractDetailPage.data.ts` 에 있다
 * 상태·검수 판정·보증금·연체·담당·링크는 보증금 상세가 쓰는 표·함수를 그대로 읽는다(같은 처리단위 = 같은 값).
 * ====================================================================== */

export interface RentContractDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

const PREFIX = "/rent-detail/";

/** 접을 수 있는 구역 한 장 — 형제 상세와 같은 규격 */
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

/** 화살표 — 글자 「→」 대신 도형 */
const Arrow = () => (
  <ArrowRight
    size={16}
    strokeWidth={1.2}
    aria-hidden
    className="shrink-0 text-icon-sub"
  />
);

export function RentContractDetailPage(props: RentContractDetailPageProps) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  /* 경로는 `/rent-detail/{처리단위}` **한 조각**이어야 한다 */
  const rest = pathname.slice(PREFIX.length);
  const blank = rest === "";
  useEffect(() => {
    if (blank) navigate(LIST_PATH, { replace: true });
  }, [blank]);
  const row = rest.includes("/")
    ? undefined
    : findContract(lastPathSegment(pathname));

  if (blank) return null;
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
        header={<PageHeader title="대여 상세" />}
      >
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<PackageSearch strokeWidth={1.2} aria-hidden />}
              title={COPY.notFoundTitle}
              description={COPY.notFoundDescription}
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                주문 목록으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  /* 처리단위마다 처음부터 — 접힘·열린 확대 창이 다음 건에 묻어가지 않게 */
  return <RentContractDetailBody key={row.id} row={row} {...props} />;
}

function RentContractDetailBody({
  row,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: RentContractDetailPageProps & { row: DepositRow }) {
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";
  const [zoomed, setZoomed] = useState<string | null>(null);

  const orderMeta = ORDER_STATUS_META[row.orderStatus];
  const depositMeta = DEPOSIT_STATUS_META[row.status];
  const current = stepIndexOf(row);
  const overdue = overdueOf(row);
  const sellerPath = sellerPathOf(row);
  const live = liveExtensionOf(row);
  const extensions = extensionsOf(row);
  const invoice = invoiceOf(row);
  const returnStatus = returnStatusOf(row);
  const inspection = inspectionOf(row);
  const evidence = evidenceOf(row.order);

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
          title="대여 상세"
          description={headlineOf(row)}
          badges={
            <Tag tone={orderMeta.tone} dot>
              {orderMeta.label}
            </Tag>
          }
        />
      }
    >
      <Section title={SECTIONS.flow} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={1} />
        ) : (
          <div className="flex flex-col gap-3">
            <ol
              aria-label="진행 단계"
              className="flex flex-wrap items-center gap-2"
            >
              {FLOW_STEPS.map((step, index) => {
                const state =
                  index < current
                    ? "done"
                    : index === current
                      ? "current"
                      : "todo";
                return (
                  <li
                    key={step.key}
                    data-step={state}
                    aria-current={state === "current" ? "step" : undefined}
                    className="flex items-center gap-2"
                  >
                    {index > 0 ? (
                      <span aria-hidden className="h-px w-6 bg-border" />
                    ) : null}
                    {state === "todo" ? (
                      <span className="label-medium px-2 text-text-minimal">
                        {step.label}
                      </span>
                    ) : (
                      <Tag
                        tone={state === "current" ? step.tone : "default"}
                        dot={state === "current"}
                      >
                        {step.label}
                      </Tag>
                    )}
                  </li>
                );
              })}
            </ol>
            {/* 연체 건만 — 안내 문장은 부록 A C22 로 없다. 경고 기호는 아이콘으로 */}
            {overdue ? (
              <p className="body-medium-bold flex items-center gap-1 text-text-warning">
                <TriangleAlert
                  size={16}
                  strokeWidth={1.2}
                  aria-hidden
                  className="shrink-0 text-icon-warning"
                />
                연체 D+{overdue.days}
              </p>
            ) : null}
          </div>
        )}
      </Section>

      <Section title={SECTIONS.info} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={7} />
        ) : (
          <InfoList>
            <InfoItem label="계약 ID">
              <span className="body-medium-bold tabular-nums">
                {contractIdOf(row)}
              </span>
            </InfoItem>
            <InfoItem label="주문번호">
              <TextButton
                onClick={() => onNavSelect(paymentPathOf(row.orderNo))}
              >
                {row.orderNo}
              </TextButton>
            </InfoItem>
            <InfoItem label="회원">
              <TextButton onClick={() => onNavSelect(memberPathOf(row))}>
                {row.member}
              </TextButton>
            </InfoItem>
            <InfoItem label="담당">
              <span className="flex items-center gap-2">
                {/* 담당은 분류라 상태색을 쓰지 않는다 — 보증금 상세와 같다 */}
                <Tag size="small">{OWNER_LABEL[row.sellerKind]}</Tag>
                {row.sellerKind === "seller" &&
                  (sellerPath ? (
                    <TextButton onClick={() => onNavSelect(sellerPath)}>
                      {row.seller}
                    </TextButton>
                  ) : (
                    row.seller
                  ))}
              </span>
            </InfoItem>
            <InfoItem label="상품">{row.product}</InfoItem>
            <InfoItem label="대여기간">
              <span className="tabular-nums">{periodOf(row)}</span>
            </InfoItem>
            {live ? (
              <InfoItem label="연장">
                <span className="flex flex-wrap items-center gap-x-1.5 tabular-nums">
                  원 종료일 {live.originalEnd}
                  <Arrow />
                  현재 {live.currentEnd} (연장 {live.count}회)
                </span>
              </InfoItem>
            ) : null}
            <InfoItem label="상태">
              <Tag tone={orderMeta.tone} dot size="small">
                {orderMeta.label}
              </Tag>
            </InfoItem>
          </InfoList>
        )}
      </Section>

      {extensions.length > 0 ? (
        <Section title={SECTIONS.extensions} busy={busy} dim={dim}>
          {loading ? (
            <LoadingLines rows={2} />
          ) : (
            <Table>
              <colgroup>
                <col className="w-16" />
                <col className="w-28" />
                <col className="w-60" />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-40" />
                <col />
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableTh>회차</TableTh>
                  <TableTh>신청일</TableTh>
                  <TableTh>
                    <span className="inline-flex items-center gap-1.5">
                      연장 전
                      <Arrow />후
                    </span>
                  </TableTh>
                  <TableTh>추가 일수</TableTh>
                  <TableTh>연장 금액</TableTh>
                  <TableTh>주문번호</TableTh>
                  <TableTh>취소</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {extensions.map((item) => {
                  const cells = extensionCellsOf(item);
                  const payOrderNo = item.payOrderNo;
                  return (
                    <TableRow key={item.seq}>
                      <TableTd>{cells.seq}</TableTd>
                      <TableTd className="tabular-nums">
                        {cells.appliedAt}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          {cells.prevEnd}
                          <Arrow />
                          {cells.newEnd}
                        </span>
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {cells.addedDays}
                      </TableTd>
                      <TableTd className="tabular-nums">{cells.fee}</TableTd>
                      <TableTd className="tabular-nums">
                        {payOrderNo ? (
                          <TextButton
                            onClick={() =>
                              onNavSelect(paymentPathOf(payOrderNo))
                            }
                          >
                            {payOrderNo}
                          </TextButton>
                        ) : (
                          COPY.noPayOrder
                        )}
                      </TableTd>
                      <TableTd>{cells.cancel}</TableTd>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Section>
      ) : null}

      <Section title={SECTIONS.proc} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={3} />
        ) : (
          <InfoList>
            <InfoItem label="출고 송장">
              {invoice ?? (
                <span className="text-text-minimal">{COPY.unregistered}</span>
              )}
            </InfoItem>
            <InfoItem label="회수 상태">
              <span className="flex items-center gap-1">
                <Tag size="small">{returnStatus.label}</Tag>
                {returnStatus.tip ? (
                  <Tooltip content={returnStatus.tip}>
                    <IconButton
                      variant="ghost"
                      size="xsmall"
                      label={`${returnStatus.label} 도움말`}
                      icon={<Info strokeWidth={1.2} aria-hidden />}
                    />
                  </Tooltip>
                ) : null}
              </span>
            </InfoItem>
            <InfoItem label="검수 판정">
              {inspection ? (
                <Tag tone={inspection.tone} size="small">
                  {inspection.label}
                </Tag>
              ) : (
                <span className="text-text-minimal">
                  {COPY.beforeInspection}
                </span>
              )}
            </InfoItem>
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.deposit} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={3} />
        ) : (
          <CalcBreakdown blocks={depositBlocksOf(row)}>
            <p className="body-medium flex items-center gap-2 text-text-sub">
              {COPY.depositStatus}
              <Tag tone={depositMeta.tone} dot size="small">
                {depositMeta.cellLabel}
              </Tag>
            </p>
          </CalcBreakdown>
        )}
      </Section>

      <Section title={SECTIONS.images} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={2} />
        ) : (
          <>
            <EvidenceRow
              label={EVIDENCE_COPY.shipLabel}
              prefix="발송 전"
              count={evidence.ship}
              empty={EVIDENCE_COPY.shipEmpty}
              onZoom={setZoomed}
            />
            <EvidenceRow
              label={EVIDENCE_COPY.returnLabel}
              prefix="파손"
              count={evidence.return}
              empty={EVIDENCE_COPY.returnEmpty}
              onZoom={setZoomed}
            />
            <p className="body-small text-text-sub">{COPY.evidenceNote}</p>
          </>
        )}
      </Section>

      {/* 하단 바 — 조회 전용이라 [목록] 하나뿐이다(develop `noSave`) */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
            목록
          </Button>
        </div>
      </Card>

      {/* 이미지 확대 — 안심케어 청구 상세와 같은 창 */}
      <Modal
        open={zoomed !== null}
        onClose={() => setZoomed(null)}
        size="medium"
      >
        <ModalHeader closeLabel="대화상자 닫기" title={zoomed ?? ""} />
        <ModalBody>
          <span className="body-medium flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-medium bg-surface-sub text-text-sub">
            <ImageIcon size={48} strokeWidth={1.2} aria-hidden />
            {zoomed}
          </span>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setZoomed(null)}
          >
            닫기
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
