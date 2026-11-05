import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  FormField,
  Gnb,
  IconButton,
  InfoItem,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  SegmentedControl,
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
  COMMISSION_HINT,
  COMMISSION_PLACEHOLDER,
  findApplication,
  isReviewable,
  KIND_LABEL,
  SECTIONS,
} from "./SellerReviewDetailPage.data";
import {
  COMMISSION_RATE_WARNING,
  isAtypicalCommission,
  parseCommissionRate,
} from "./SellerListPage.data";
import {
  BIZ_TYPE_LABEL,
  commissionError,
  HYGIENE_OPTIONS,
  hygieneValue,
  rateDraft,
  REVIEW_COPY,
  STATUS_META,
  ymd,
  ymdhms,
  type Application,
} from "./SellerReviewPage.data";
import { ReviewRejectModal } from "./SellerReviewPage";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";
import { DocumentModal, DocumentRow } from "./shared/DocumentParts";
import {
  DOCUMENT_COPY,
  DOCUMENT_KEYS,
  DOCUMENTS,
  type DocumentKey,
  type DocumentView,
} from "./shared/documents";

/* =========================================================================
 * S04-D 입점 심사 상세 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 폼형 (읽기 + 심사 판정)
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 (BO-SEL-004 · 기획 v0.4 `DETAIL.sellerReview`)
 *
 * ```
 * 신청 정보 (입점 전)     ← 셀러명 · 대표명 · 연락처 · 사업자 유형 ·
 *                           상품 취급 유형 · 서류 2종 · 신청일(초까지)
 * 심사 결과              ← 승인요청: 심사 상태 · 수수료율(%)* · 위생인증 (입력)
 *                           승인: 심사 상태 · 수수료율 · 승인일 · 위생인증 / 반려: 심사 상태 · 반려 사유 · 반려일
 * [목록]                                      [승인] [반려]   ← 하단 액션 바 (승인요청 건만)
 * ```
 *
 * ## 두 섹션이 갈라져 있는 이유 (원본 제목이 그것을 말한다)
 * 위는 **셀러가 낸 것**(입점 전), 아래는 **본사가 정하는 것**이다.
 *
 * ## 원본 정책 — 화면이 강제하는 것
 * - **승인요청 상태만 심사할 수 있다.** 처리된 건은 읽기 전용이고 하단 바에 [목록]만 남는다
 * - **[승인] 은 확인 창을 거친다**(원본 `gateApprove` — 되돌릴 수 없는 처리라서)
 * - **반려에는 사유가 필수다** — 목록 일괄과 **같은 창**(`ReviewRejectModal`)을 쓴다
 * - 반려 건은 「반려 사유」·「반려일」 두 줄만(수수료율·위생인증 없음), 승인 건은 승인일·요율·위생(판정 Q11 ·
 *   제목 「심사 결과」 — 부록 A A18). 「심사 상태」 줄은 세 상태 모두 그대로(기획 확인 요청 34번)
 *
 * ## 표기 (2026-11-03 UX 검수)
 * - **반려 사유는 심사 상태 바로 아래** — 반려 건에서 가장 먼저 읽을 값이다(원본은 수수료율 다음).
 *   반려일은 그 아래 「반려일」 줄 — 승인 건의 「승인일」 줄과 같은 꼴(2026-11-05 화면 점검 · 판정 Q11 「반려 사유·반려일」)
 * - **심사 상태는 두 경우 모두 `InfoList` 한 줄**이다 — 승인요청 건은 그 아래에 입력칸이 이어진다.
 *   상태에 따라 같은 항목이 「라벨 위 배지」와 「회색 상자 줄」로 갈리지 않게
 * - 라벨 폭은 **화면 상수 하나**(`LABEL_WIDTH`) — 두 카드의 값 시작선이 맞는다
 *
 * ## 퍼블 범위 (2026-10-15 사용자 결정)
 * 승인·반려·서류 다운로드는 **토스트만** 띄운다. 상태·처리일을 화면에서 바꾸지 않는다.
 *
 * ## 신청이 바뀌면 화면을 통째로 새로 시작한다
 * 주소만 바뀌면 같은 컴포넌트가 남아 A 의 수수료율·위생인증·열린 창이 B 에 묻어갔다.
 * 본문을 `key={application.id}` 로 그려 신청마다 처음부터 시작한다(셀러 상세와 같다).
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 1. **신청 정보를 `InfoList` 로 읽게 한다.** 원본은 입력칸이지만 이 화면에는 저장 통로가 없다
 *    (원본 `noSave`) — 고칠 수 있을 것처럼 보이는 칸은 고친 값이 사라지는 오해를 낳는다
 * 2. **처리된 건의 수수료율·위생인증은 읽기 전용이다.** 원본은 열어 두지만 저장할 곳이 없다.
 *    처리 뒤 운영 값 수정은 셀러 관리 화면의 일이다
 * 3. **승인에 수수료율이 필요하다**(0 초과 100 이하 · 소수 둘째 자리 · 6~16% 밖은 칸 아래 경고만) — 원본은 검사하지 않지만, 목록 일괄 승인과
 *    같은 규칙이어야 한다(2026-10-15 사용자 결정)
 *
 * ## 데이터 상태 (§D8 · `src/lib/dataStatus.ts`)
 * `/seller-review/{id}?preview=loading` · `refreshing` 으로 미리 본다.
 * ====================================================================== */

export interface SellerReviewDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 목록 경로 — 뒤로 가는 곳이자, 없는 신청일 때 돌려보내는 곳 */
const LIST_PATH = "/seller-review";

/**
 * 이 화면 InfoList 의 라벨 폭(화면 상수 하나) — `통신판매업신고증` 이 기본 80 에 들어가지 않는다.
 * 심사 결과 카드도 같은 값을 써 두 카드의 값 시작선을 맞춘다.
 */
const LABEL_WIDTH = 128;

/** 접을 수 있는 섹션 한 장 (회원·셀러 상세와 같은 규격) */
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

export function SellerReviewDetailPage(props: SellerReviewDetailPageProps) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  const application = findApplication(lastPathSegment(pathname));

  if (!application) {
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
        header={<PageHeader title="입점 심사 상세" />}
      >
        <Card variant="soft">
          <CardBody>
            {/* 표가 아니라 **화면 전체가 없는 것**이다 — §16 의 `page` 가 그 자리다 */}
            <EmptyState
              size="page"
              icon={<ClipboardCheck strokeWidth={1.2} aria-hidden />}
              title="찾을 수 없는 신청입니다"
              description="주소가 잘못되었거나 삭제된 신청일 수 있습니다."
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                입점 심사 목록으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  /* 신청마다 처음부터 — 위 「신청이 바뀌면 화면을 통째로 새로 시작한다」 */
  return (
    <SellerReviewDetailBody
      key={application.id}
      application={application}
      {...props}
    />
  );
}

function SellerReviewDetailBody({
  application,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerReviewDetailPageProps & { application: Application }) {
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));

  /* 심사에서 정하는 값 — 판정 전까지 화면 안에만 산다. 신청 단계의 0% 는 빈 칸으로 연다 */
  const [commission, setCommission] = useState(() => rateDraft(application));
  const [hygiene, setHygiene] = useState(() =>
    hygieneValue(application.hygieneCertified),
  );
  const [touched, setTouched] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [openDocument, setOpenDocument] = useState<DocumentKey | null>(null);

  const meta = STATUS_META[application.status];
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  /** 이미 판정이 끝난 건은 읽기만 한다 — 목록의 선택 규칙과 같은 기준이다 */
  const reviewable = isReviewable(application);
  const error = commissionError(commission);

  /** [승인] — 수수료율이 맞아야 확인 창이 열린다 */
  const approve = () => {
    setTouched(true);
    if (error) return;
    setApproveOpen(true);
  };

  const confirmApprove = () => {
    setApproveOpen(false);
    toast(REVIEW_COPY.approved(1));
  };

  /** 서류 뷰가 그리는 값 — 이 신청의 레코드에서 채운다 */
  const documentView = (key: DocumentKey): DocumentView => ({
    key,
    number: application[key].number,
    owner: application.name,
    ceo: application.ceo,
  });

  const hygieneLabel =
    HYGIENE_OPTIONS.find((item) => item.value === hygiene)?.label ?? "-";

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
        /* 배지는 **저장된** 심사 상태다(회원·셀러 상세와 같다) */
        <PageHeader
          title="입점 심사 상세"
          description={application.name}
          badges={
            <Tag tone={meta.tone} dot>
              {meta.label}
            </Tag>
          }
        />
      }
    >
      <Section title={SECTIONS.apply} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={7} />
        ) : (
          <InfoList>
            <InfoItem label="셀러명" labelWidth={LABEL_WIDTH}>
              {application.name}
            </InfoItem>
            <InfoItem label="대표명" labelWidth={LABEL_WIDTH}>
              {application.ceo}
            </InfoItem>
            <InfoItem label="연락처" labelWidth={LABEL_WIDTH}>
              {application.phone}
            </InfoItem>
            <InfoItem label="사업자 유형" labelWidth={LABEL_WIDTH}>
              {BIZ_TYPE_LABEL[application.bizType]}
            </InfoItem>
            <InfoItem label="상품 취급 유형" labelWidth={LABEL_WIDTH}>
              {KIND_LABEL[application.kind]}
            </InfoItem>
            {DOCUMENT_KEYS.map((kind) => (
              <InfoItem
                key={kind}
                label={DOCUMENTS[kind].label}
                labelWidth={LABEL_WIDTH}
              >
                <DocumentRow
                  fileName={application[kind].fileName}
                  view={documentView(kind)}
                  onOpen={() => setOpenDocument(kind)}
                />
              </InfoItem>
            ))}
            {/* 원본 `2026.06.20 14:32:08` — 접수 순서가 곧 심사 순서라 초까지 */}
            <InfoItem label="신청일" labelWidth={LABEL_WIDTH}>
              {ymdhms(application.date)}
            </InfoItem>
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.result} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={4} />
        ) : reviewable ? (
          <>
            <InfoList>
              <InfoItem label="심사 상태" labelWidth={LABEL_WIDTH}>
                <Tag tone={meta.tone} dot>
                  {meta.label}
                </Tag>
              </InfoItem>
            </InfoList>
            {/*
              수수료율 — 승인의 전제다(원본도 필수 표시). 신청 단계의 0% 는 빈 칸으로 열린다.
              오류는 [승인] 을 한 번 누른 뒤부터 낸다 — 입력 도중에 빨갛게 하지 않는다.
            */}
            <FormField
              label="수수료율"
              required
              description={
                <>
                  {COMMISSION_HINT}
                  {/* 6~16% 밖이면 칸 아래 경고 — 막지 않는다(디자인 §3 #12 · D-217) */}
                  {isAtypicalCommission(parseCommissionRate(commission)) ? (
                    <span className="block text-text-warning">
                      {COMMISSION_RATE_WARNING}
                    </span>
                  ) : null}
                </>
              }
              error={touched ? (error ?? undefined) : undefined}
              suffix="%"
            >
              <Input
                noMinWidth
                className="w-24"
                inputMode="decimal"
                placeholder={COMMISSION_PLACEHOLDER}
                value={commission}
                onChange={(event) =>
                  setCommission(event.target.value.replace(/[^0-9.]/g, ""))
                }
              />
            </FormField>
            {/* `self-start` — 세로 배치가 선택 버튼을 폭 가득 늘리지 않게(셀러 상세와 같다) */}
            <FormField label="위생인증" group>
              <SegmentedControl
                className="self-start"
                items={HYGIENE_OPTIONS}
                value={hygiene}
                onValueChange={setHygiene}
              />
            </FormField>
          </>
        ) : (
          /*
            처리된 건 — 판정 Q11 상태별 항목: 승인 = 승인일·요율·위생 / 반려 = 반려 사유·반려일
            (반려 건은 수수료율·위생인증 줄이 없다). 「심사 상태」 줄은 기획 확인 요청 34번 답 전까지 그대로
          */
          <InfoList>
            <InfoItem label="심사 상태" labelWidth={LABEL_WIDTH}>
              <Tag tone={meta.tone} dot>
                {meta.label}
              </Tag>
            </InfoItem>
            {/* 반려 사유는 심사 상태 바로 아래 — 반려 건에서 가장 먼저 읽을 값(위 「표기」) */}
            {application.status === "rejected" ? (
              <InfoItem label="반려 사유" labelWidth={LABEL_WIDTH}>
                <span className="text-text-warning">
                  {application.rejectReason ?? "-"}
                </span>
              </InfoItem>
            ) : null}
            {application.status === "rejected" ? (
              <InfoItem label="반려일" labelWidth={LABEL_WIDTH}>
                {ymd(application.rejectedAt)}
              </InfoItem>
            ) : null}
            {application.status === "rejected" ? null : (
              <>
                <InfoItem label="수수료율" labelWidth={LABEL_WIDTH}>
                  {application.commissionRate > 0
                    ? `${application.commissionRate}%`
                    : "-"}
                </InfoItem>
                <InfoItem label="승인일" labelWidth={LABEL_WIDTH}>
                  {ymd(application.approvedAt)}
                </InfoItem>
                <InfoItem label="위생인증" labelWidth={LABEL_WIDTH}>
                  {hygieneLabel}
                </InfoItem>
              </>
            )}
          </InfoList>
        )}
      </Section>

      {/*
        하단 액션 바 (원본 `nv-bar` · `noSave`) — `[목록]  …  [승인] [반려]`.
        판정이 끝난 건에는 [승인]·[반려] 를 내지 않는다(원본 — 종결 건은 [목록]만).
        회원·셀러 상세와 같이 **화면 아래에 붙는다**(`bottom-6` = 본문 아래 여백).
      */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
            목록
          </Button>
          {reviewable ? (
            <div className="flex items-center gap-2">
              <Button onClick={approve}>승인</Button>
              <Button variant="critical" onClick={() => setRejectOpen(true)}>
                반려
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      {/* 승인 확인 — 원본 `gateApprove`. 되돌릴 수 없는 처리라 사유 없는 확인을 거친다 */}
      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={REVIEW_COPY.approveTitle(1)}
        />
        <ModalBody>
          <p className="body-medium text-text">{REVIEW_COPY.approveBody}</p>
          <p className="body-small-bold text-text-critical">
            {REVIEW_COPY.approveWarning}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setApproveOpen(false)}
          >
            취소
          </Button>
          <Button size="large" onClick={confirmApprove}>
            {REVIEW_COPY.approveConfirm}
          </Button>
        </ModalFooter>
      </Modal>

      {/* 반려 사유 — 목록 일괄과 같은 창 */}
      <ReviewRejectModal
        count={1}
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={() => {
          setRejectOpen(false);
          toast({ message: REVIEW_COPY.rejected(1), tone: "critical" });
        }}
      />

      {/* 서류 미리보기 — 원본 `docModalView`. [다운로드] 는 알림만(파일은 개발 영역) */}
      <DocumentModal
        view={openDocument ? documentView(openDocument) : null}
        onClose={() => setOpenDocument(null)}
        onDownload={(label) => toast(DOCUMENT_COPY.downloaded(label))}
      />
    </AppShell>
  );
}
