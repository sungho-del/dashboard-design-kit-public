import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, FileText } from "lucide-react";
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
  Textarea,
  TextButton,
  useToast,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { usePathname, useSearchParams } from "../../lib/router";
import {
  approvedMessage,
  BIZ_TYPE_LABEL,
  COMMISSION_HINT,
  commissionError,
  documentOpenText,
  findApplication,
  HYGIENE_HINT,
  HYGIENE_OPTIONS,
  hygieneValue,
  isReviewable,
  KIND_LABEL,
  REJECT_NOTICE,
  REJECT_PLACEHOLDER,
  REJECT_REASON_REQUIRED,
  rejectedMessage,
  SECTIONS,
  stampText,
} from "./SellerReviewDetailPage.data";
import { STATUS_META, type ReviewDocument } from "./SellerReviewPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S04-D 입점 심사 상세 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 폼형 (읽기 + 심사 판정)
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 (BO-SEL-004)
 *
 * ```
 * 신청 정보 (입점 전)     ← 셀러명 · 대표명 · 연락처 · 사업자 유형 ·
 *                           상품 취급 유형 · 서류 2종 · 신청일
 * 심사 결과 (입점 승인 후) ← 심사 상태 · 수수료율(%) · 위생인증
 * [목록]                                      [승인] [반려]   ← 하단 액션 바
 * ```
 *
 * ## 두 섹션이 갈라져 있는 이유 (원본 제목이 그것을 말한다)
 * 위는 **셀러가 낸 것**(입점 전), 아래는 **본사가 정하는 것**(승인 후)이다.
 * 그래서 위는 전부 읽기 전용이고, 아래만 입력칸이 열린다. 한 덩어리로 합치면
 * "누가 적은 값인지"가 사라져 운영자가 신청서를 고칠 수 있다고 착각한다.
 *
 * ## 원본 정책 — 화면이 강제하는 것
 * - **승인요청 상태만 심사할 수 있다.** 이미 승인·반려된 건은 읽기 전용이고
 *   하단 바에 판정 버튼이 뜨지 않는다(목록 화면의 `REVIEWABLE_STATUS` 와 같은 규칙)
 * - **수수료율 없이 승인할 수 없다.** 원본이 _"신청 접수 시 0%로 시작하며,
 *   최고관리자가 심사 시 직접 입력합니다"_ 라고 적는다 — 0% 로 승인하면
 *   플랫폼 수수료가 영영 0 인 셀러가 생긴다
 * - **반려에는 사유가 필수다.** 셀러가 무엇을 고쳐야 하는지 알아야 재신청이 성립한다
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 1. **읽기 전용 값을 비활성 입력칸이 아니라 `InfoList` 로 낸다**(회원·셀러 상세와 같다)
 * 2. **반려 사유를 모달로 받는다.** 원본은 하단 [반려] 를 바로 누르는데, 사유 없이
 *    반려되면 셀러가 재신청할 수 없다. 상품 관리의 반려 흐름과 같은 모양으로 맞췄다
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

/** `신청 정보` 블록의 라벨 폭 — `통신판매업신고증` 이 기본 80 에 들어가지 않는다 */
const APPLY_LABEL_WIDTH = 128;

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

/** 제출 서류 한 줄 — 파일명 · 번호 · [보기] (셀러 상세와 같은 모양) */
function DocumentRow({
  document,
  onOpen,
}: {
  document: ReviewDocument;
  onOpen: () => void;
}) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <FileText size={16} strokeWidth={1.2} aria-hidden />
      <span>{document.fileName}</span>
      <span className="text-text-sub tabular-nums">{document.number}</span>
      <TextButton onClick={onOpen}>보기</TextButton>
    </span>
  );
}

export function SellerReviewDetailPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerReviewDetailPageProps) {
  const { toast } = useToast();
  const pathname = usePathname();
  const status = asStatus(useSearchParams().get("preview"));

  const applicationId = decodeURIComponent(pathname.split("/").pop() ?? "");
  const application = findApplication(applicationId);

  /*
    심사에서 정하는 값 — 판정 전까지 화면 안에만 산다.
    수수료율은 **신청서 값으로 시작하되 0 이면 빈 칸**이다(원본과 같다) —
    0 은 "제안하지 않았다"는 뜻이라 그대로 두면 승인 가능한 값처럼 보인다.
  */
  const [commission, setCommission] = useState(
    application && application.commissionRate > 0
      ? String(application.commissionRate)
      : "",
  );
  const [hygiene, setHygiene] = useState(
    hygieneValue(application?.hygieneCertified ?? false),
  );
  const [touched, setTouched] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);

  const nav = (
    <Gnb
      sections={GNB_SECTIONS}
      activeId={activeNav}
      onSelect={onNavSelect}
      open={navOpen}
      onOpenChange={onNavOpenChange}
      logo={GNB_LOGO_SLOTS.logo}
      collapsedLogo={GNB_LOGO_SLOTS.collapsed}
    />
  );

  if (!application) {
    return (
      <AppShell sidebar={nav} header={<PageHeader title="입점 심사 상세" />}>
        <Card variant="soft">
          <CardBody>
            {/*
              다른 화면의 빈 상태는 거의 `table`(표 안이 비었다)이지만 여기는 **표가 아니라
              화면 전체가 없는 것**이다 — §16 의 `page`(콘텐츠 전역 400)가 그 자리다.
              회원·셀러 상세의 "없는 레코드" 화면과 같은 규격이다.
            */}
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

  const meta = STATUS_META[application.status];
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  /** 이미 판정이 끝난 건은 읽기만 한다 — 목록의 선택 규칙과 같은 기준이다 */
  const reviewable = isReviewable(application);
  const error = commissionError(commission);

  const approve = () => {
    setTouched(true);
    if (error) return;
    toast(approvedMessage(application.name, commission));
  };

  const submitReject = () => {
    setReasonTouched(true);
    if (reason.trim() === "") return;
    toast(rejectedMessage(application.name));
    setRejectOpen(false);
    setReason("");
    setReasonTouched(false);
  };

  return (
    <AppShell
      sidebar={nav}
      header={
        <PageHeader title="입점 심사 상세" description={application.name} />
      }
    >
      <Section title={SECTIONS.apply} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={7} />
        ) : (
          <InfoList>
            <InfoItem label="셀러명" labelWidth={APPLY_LABEL_WIDTH}>
              {application.name}
            </InfoItem>
            <InfoItem label="대표명" labelWidth={APPLY_LABEL_WIDTH}>
              {application.ceo}
            </InfoItem>
            <InfoItem label="연락처" labelWidth={APPLY_LABEL_WIDTH}>
              {application.phone}
            </InfoItem>
            <InfoItem label="사업자 유형" labelWidth={APPLY_LABEL_WIDTH}>
              {BIZ_TYPE_LABEL[application.bizType]}
            </InfoItem>
            <InfoItem label="상품 취급 유형" labelWidth={APPLY_LABEL_WIDTH}>
              {KIND_LABEL[application.kind]}
            </InfoItem>
            <InfoItem label="사업자등록증" labelWidth={APPLY_LABEL_WIDTH}>
              <DocumentRow
                document={application.bizLicense}
                onOpen={() =>
                  toast(documentOpenText(application.bizLicense.fileName))
                }
              />
            </InfoItem>
            <InfoItem label="통신판매업신고증" labelWidth={APPLY_LABEL_WIDTH}>
              <DocumentRow
                document={application.salesLicense}
                onOpen={() =>
                  toast(documentOpenText(application.salesLicense.fileName))
                }
              />
            </InfoItem>
            <InfoItem label="신청일" labelWidth={APPLY_LABEL_WIDTH}>
              {stampText(application.date)}
            </InfoItem>
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.result} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={4} />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <span className="label-medium-bold text-text">심사 상태</span>
              <span className="flex flex-wrap items-center gap-2">
                <Tag tone={meta.tone} dot>
                  {meta.label}
                </Tag>
                <span className="body-small text-text-sub">
                  {meta.description}
                </span>
              </span>
            </div>

            {/*
              수수료율 — 승인의 전제다. 판정이 끝난 건은 값만 읽는다.
              ⚠️ 신청서의 `0` 은 "제안하지 않음"이라 빈 칸으로 열린다.
            */}
            {reviewable ? (
              <FormField
                label="수수료율"
                description={COMMISSION_HINT}
                error={touched ? (error ?? undefined) : undefined}
              >
                <span className="flex items-center gap-2">
                  <Input
                    className="w-24"
                    inputMode="decimal"
                    value={commission}
                    onChange={(event) => setCommission(event.target.value)}
                  />
                  <span className="body-small text-text-sub">%</span>
                </span>
              </FormField>
            ) : (
              <InfoList>
                <InfoItem label="수수료율">
                  {application.commissionRate > 0
                    ? `${application.commissionRate}%`
                    : "-"}
                </InfoItem>
                <InfoItem label="승인일">
                  {stampText(application.approvedAt)}
                </InfoItem>
                <InfoItem label="반려일">
                  {stampText(application.rejectedAt)}
                </InfoItem>
              </InfoList>
            )}

            <div className="flex flex-col gap-2">
              <span className="label-medium-bold text-text">위생인증</span>
              <SegmentedControl
                aria-label="위생인증"
                items={HYGIENE_OPTIONS.map((item) => ({
                  ...item,
                  disabled: !reviewable,
                }))}
                value={hygiene}
                onValueChange={setHygiene}
              />
              <p className="body-small text-text-sub">{HYGIENE_HINT}</p>
            </div>
          </>
        )}
      </Section>

      {/*
        하단 액션 바 (원본 `sellerReview.actions`) — `[목록] [승인] [반려]`.
        판정이 끝난 건에는 [승인]·[반려] 를 내지 않는다. 누를 수 있게 두면
        "이미 승인된 건을 또 승인"할 수 있다는 뜻이 된다.
      */}
      <Card variant="soft">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
            목록
          </Button>
          {reviewable ? (
            <div className="flex items-center gap-2">
              <Button variant="critical" onClick={() => setRejectOpen(true)}>
                반려
              </Button>
              <Button onClick={approve}>승인</Button>
            </div>
          ) : null}
        </div>
      </Card>

      {/* 반려 사유 — 비워 두고 반려하면 셀러가 무엇을 고쳐야 할지 알 수 없다 */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)}>
        <ModalHeader title={`${application.name} 반려`} />
        <ModalBody>
          <p className="body-small text-text-sub">{REJECT_NOTICE}</p>
          <FormField
            label="반려 사유"
            error={
              reasonTouched && reason.trim() === ""
                ? REJECT_REASON_REQUIRED
                : undefined
            }
          >
            <Textarea
              minRows={4}
              placeholder={REJECT_PLACEHOLDER}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </FormField>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setRejectOpen(false)}>
            취소
          </Button>
          <Button variant="critical" onClick={submitReject}>
            반려 처리
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
