import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Image as ImageIcon,
  Info,
  ZoomIn,
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
  Tag,
  useToast,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import {
  inspectionMetaOf,
  isReviewOverdue,
  OVERDUE_LABEL,
  REVIEW_COPY,
  REVIEWABLE_STATUS,
  reviewDdayOf,
  reviewDdayText,
  STATUS_META,
  won,
  ymd,
  type CareClaimRow,
} from "./CareClaimListPage.data";
import { CareApproveModal, CareRejectModal } from "./CareClaimListPage";
import {
  COPY,
  depositOfClaim,
  evidenceOf,
  findClaim,
  periodOf,
  SECTIONS,
} from "./CareClaimDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S14-D 안심케어 청구 상세 (BabyCube 본사 운영 어드민) — 뼈대
 * 경로 `/care-claims/{처리단위}` · 기준 기획 v0.4 `DETAILS.careClaim`(proto.html 5079~5104)
 *
 * ## 화면 유형: 상세형 (읽기 + 심사 판정)
 *
 * ```
 * 청구 근거   ← 주문번호 · 셀러 · 상품 · 이용 기간 · 검수 판정 · 보증금 · 보증금 차감
 * 청구 심사   ← 청구 상태 · 청구 복원비 · 청구일 · 심사 기한(접수 건만 D-day·「기한 경과」) · 발송 전 이미지 · 파손 이미지 ·
 *               [승인] 승인일 · 정산 반영 / [반려] 반려 사유 (반려일) ·
 *               안내 상자(대조 안내 한 줄)
 * [목록]                                         [승인] [반려]   ← 하단 바 (청구 접수 건만 오른쪽)
 * ```
 * 원본은 조회 전용(`noSave`)이라 [저장하기]·[취소]가 없다 — 하단 바는 원본 그대로 [목록] + 접수 건의 [승인][반려].
 *
 * ## 갈아끼울 것 → `./CareClaimDetailPage.data.ts` (+ 목록 데이터의 행·창 문구)
 *
 * ## 그대로 두는 것
 * 구역 접기 · 「찾을 수 없음」 · 처리단위가 바뀌면 `key` 로 본문을 새로 그림 · `?preview=` ·
 * 승인/반려 창은 **목록과 같은 창**(`CareApproveModal`·`CareRejectModal`)
 *
 * ## 퍼블 범위
 * 승인·반려는 **토스트만** — 상태·처리일을 바꾸지 않는다. 금액 수정 통로는 없다(원본 #13).
 * 이미지는 자리 표시 + [확대](닫기가 있는 창 — 원본은 문구·닫기 없는 전체 오버레이). 등록·교체·삭제 없음.
 *
 * ## 원본과 다르게 둔 곳
 * - 머리: 원본은 머리가 그려지지 않는다(결함) → 형제 상세처럼 제목 + 한 줄 요약 + 청구 상태 배지
 * - 읽는 값은 `InfoList`(형제 상세와 같다). 「청구 근거」의 필수 표시 ●는 그리지 않는다(원본 결함)
 * - 반려 사유가 비면 토스트가 아니라 입력칸 아래 오류(목록과 같은 창)
 * ====================================================================== */

export interface CareClaimDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 목록 경로 — [목록]·「찾을 수 없음」이 돌려보내는 곳 */
const LIST_PATH = "/care-claims";

/** 라벨 폭 — 「보증금 차감」·「청구 복원비」가 기본 80 에서 쪼개지지 않게. 모든 블록이 같은 폭(§30-3) */
const LABEL_WIDTH = 96;

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

const Item = ({ label, children }: { label: string; children: ReactNode }) => (
  <InfoItem label={label} labelWidth={LABEL_WIDTH}>
    {children}
  </InfoItem>
);

/**
 * 증빙 이미지 한 줄 — 썸네일(자리 표시) + [확대]. 0장이면 미등록 문장.
 * 실제 파일이 없어 이름만 그린다(상품 상세의 상품이미지와 같은 대체물).
 */
export function EvidenceRow({
  label,
  prefix,
  count,
  empty,
  onZoom,
}: {
  label: string;
  prefix: string;
  count: number;
  empty: string;
  onZoom: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-medium-bold text-text">{label}</span>
      {count > 0 ? (
        <ul className="flex flex-wrap gap-3" aria-label={label}>
          {Array.from({ length: count }, (_, index) => {
            const name = `${prefix} ${index + 1}`;
            return (
              <li key={name} className="flex flex-col items-center gap-1">
                <span className="body-small flex size-24 flex-col items-center justify-center gap-1 rounded-medium bg-surface-sub text-text-sub">
                  <ImageIcon size={24} strokeWidth={1.2} aria-hidden />
                  {name}
                </span>
                <IconButton
                  variant="ghost"
                  size="small"
                  label={`${name} 확대`}
                  onClick={() => onZoom(name)}
                  icon={<ZoomIn strokeWidth={1.2} aria-hidden />}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="body-medium text-text">{empty}</p>
      )}
    </div>
  );
}

export function CareClaimDetailPage(props: CareClaimDetailPageProps) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  const claim = findClaim(lastPathSegment(pathname));

  if (!claim) {
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
        header={<PageHeader title="안심케어 청구 상세" />}
      >
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<ClipboardCheck strokeWidth={1.2} aria-hidden />}
              title="찾을 수 없는 청구입니다"
              description="주소가 잘못되었거나 삭제된 청구일 수 있습니다."
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                안심케어 승인 목록으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  /* 처리단위마다 처음부터 — 열린 창·접힘이 다음 건에 묻어가지 않게 */
  return <CareClaimDetailBody key={claim.id} claim={claim} {...props} />;
}

function CareClaimDetailBody({
  claim,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: CareClaimDetailPageProps & { claim: CareClaimRow }) {
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [zoomed, setZoomed] = useState<string | null>(null);

  const meta = STATUS_META[claim.status];
  const dday = reviewDdayOf(claim);
  const inspection = inspectionMetaOf(claim.inspection);
  const deposit = depositOfClaim(claim);
  const evidence = evidenceOf(claim.order);
  /** 종결 건(승인·반려)은 읽기만 — 목록의 선택 규칙과 같은 기준 */
  const reviewable = claim.status === REVIEWABLE_STATUS;

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
        /* 배지는 **저장된** 청구 상태다 */
        <PageHeader
          title="안심케어 청구 상세"
          description={`${claim.orderNo} · ${claim.id} · ${claim.product} · ${claim.seller}`}
          badges={
            <Tag tone={meta.tone} dot>
              {meta.label}
            </Tag>
          }
        />
      }
    >
      <Section title={SECTIONS.claim} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={7} />
        ) : (
          <InfoList>
            <Item label="주문번호">
              <span className="tabular-nums">{claim.orderNo}</span>
            </Item>
            <Item label="셀러">{claim.seller}</Item>
            <Item label="상품">{claim.product}</Item>
            <Item label="이용 기간">
              <span className="tabular-nums">{periodOf(claim)}</span>
            </Item>
            <Item label="검수 판정">
              <Tag tone={inspection.tone} size="small">
                {inspection.label}
              </Tag>
            </Item>
            <Item label="보증금">
              <span className="tabular-nums">
                {deposit ? won(deposit.deposit) : "-"}
              </span>
            </Item>
            <Item label="보증금 차감">
              <span className="tabular-nums">
                {deposit ? won(deposit.deduction) : "-"}
              </span>
            </Item>
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.judge} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={6} />
        ) : (
          <>
            <InfoList>
              <Item label="청구 상태">
                <Tag tone={meta.tone} dot size="small">
                  {meta.label}
                </Tag>
              </Item>
              <Item label="청구 복원비">
                <span className="label-medium-bold tabular-nums">
                  {won(claim.amount)}
                </span>
              </Item>
              <Item label="청구일">
                <span className="tabular-nums">{ymd(claim.claimedAt)}</span>
              </Item>
              {/* 목록과 같은 값 — 접수 건만 `(D-n)` 또는 「기한 경과」 Tag + `D+n`, 끝난 건은 날짜만(develop) */}
              <Item label="심사 기한">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  {ymd(claim.reviewDueOn)}
                  {dday === null ? null : isReviewOverdue(claim) ? (
                    <>
                      <Tag tone="critical" size="small">
                        {OVERDUE_LABEL}
                      </Tag>
                      {reviewDdayText(dday)}
                    </>
                  ) : (
                    <span>({reviewDdayText(dday)})</span>
                  )}
                </span>
              </Item>
            </InfoList>

            {/* 증빙 — 금액이 아니라 손상 사실이 판단 근거라 결과보다 **위**에 둔다(원본) */}
            <EvidenceRow
              label={COPY.shipLabel}
              prefix="발송 전"
              count={evidence.ship}
              empty={COPY.shipEmpty}
              onZoom={setZoomed}
            />
            <EvidenceRow
              label={COPY.returnLabel}
              prefix="파손"
              count={evidence.return}
              empty={COPY.returnEmpty}
              onZoom={setZoomed}
            />
            {claim.status === "approved" ? (
              <InfoList>
                <Item label="승인일">
                  <span className="tabular-nums">{ymd(claim.approvedAt)}</span>
                </Item>
                <Item label="정산 반영">{COPY.settled(won(claim.amount))}</Item>
              </InfoList>
            ) : null}
            {claim.status === "rejected" ? (
              <>
                <InfoList>
                  <Item label="반려 사유">
                    <span className="text-text-warning">
                      {claim.rejectReason ?? "-"}
                    </span>{" "}
                    <span className="text-text-sub tabular-nums">
                      ({ymd(claim.rejectedAt)})
                    </span>
                  </Item>
                </InfoList>
              </>
            ) : null}
            {/* 대조 안내 — 상태와 관계없이 한 줄(부록 A C51 · 상태별 안내 C52·C53 은 지웠다) */}
            <div className="flex gap-2 rounded-medium bg-surface-sub px-4 py-3">
              <Info
                size={16}
                strokeWidth={1.2}
                aria-hidden
                className="mt-0.5 shrink-0 text-icon-sub"
              />
              <p className="body-small text-text-sub">{COPY.evidenceNote}</p>
            </div>
          </>
        )}
      </Section>

      {/*
        하단 바 (원본 `nv-bar` · `noSave`) — `[목록]  …  [승인] [반려]`.
        종결 건에는 [승인]·[반려] 를 내지 않는다(원본 UI-287 — [목록]만).
      */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
            목록
          </Button>
          {reviewable ? (
            <div className="flex items-center gap-2">
              <Button onClick={() => setApproveOpen(true)}>승인</Button>
              <Button variant="critical" onClick={() => setRejectOpen(true)}>
                반려
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      {/* 목록 일괄과 같은 창 — 1건 */}
      <CareApproveModal
        count={1}
        amount={claim.amount}
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={() => {
          setApproveOpen(false);
          toast(REVIEW_COPY.approved(1));
        }}
      />
      <CareRejectModal
        count={1}
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={() => {
          setRejectOpen(false);
          toast({ message: REVIEW_COPY.rejected(1), tone: "critical" });
        }}
      />

      {/* 이미지 확대 — 원본은 전체 오버레이(닫기 없음). 우리는 닫기가 있는 창 */}
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
