import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
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
  PageHeader,
  Skeleton,
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
import { RatingStars } from "./ReviewListPage";
import {
  STATUS_META,
  reviewStatus,
  ymd,
  type Review,
} from "./ReviewListPage.data";
import {
  COPY,
  LIST_LABEL,
  LIST_PATH,
  PAGE_TITLE,
  REASON_MAX,
  SECTIONS,
  findReview,
  headlineOf,
  orderPathOf,
  scoreText,
  textOrDash,
} from "./ReviewDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 리뷰 상세 — 상세형 · 뼈대 (원본 v0.4 `DETAILS.reviewDetail`, 본사는 노출 여부만 처리)
 *
 * ## 구성
 * ```
 * 리뷰 정보   작성자 · 상태 · 별점 · 작성일 · 셀러 · 상품 · 주문번호(주문 상세 링크) / 리뷰 내용(회색 상자) / 판매자 답글(회색 상자 — 없으면 흐린 「답글 없음」 · 도움말은 부록 A C78 로 뺐다)
 * 노출 관리   노출 중: 숨김 사유 입력(필수 · 60자) + 도움말 / 숨김 중: 숨김 사유(회색 상자) + 도움말
 * [목록]                                  [숨김 처리 | 복원]   ← 하단 고정 바 (원본 그대로)
 * ```
 * 리뷰 관리의 내용 링크·행이 이 화면으로 온다(`/reviews-admin/{리뷰 id}`).
 * 리뷰가 바뀌면 `key` 로 처음부터(적던 사유·오류·접힘이 다음 건에 묻어가지 않게).
 *
 * ## 이 파일은 도메인을 모른다
 * | 갈아끼울 것                    | 위치                                       |
 * | ------------------------------ | ------------------------------------------ |
 * | 대상 찾기·구역 제목·문구·글자 수 | `ReviewDetailPage.data.ts`                |
 * | 상태·작성일·별점 표기           | `ReviewListPage.data.ts`·`RatingStars`(목록과 같다) |
 *
 * ## 퍼블 범위
 * [숨김 처리]·[복원]은 **알림만** — 배지·카드·버튼은 저장된 상태 그대로다(사용자 결정).
 * ====================================================================== */

export interface ReviewDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

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

/** 줄 아래 도움말(원본 `nv-help`) */
const Help = ({ children }: { children: ReactNode }) => (
  <span className="body-small text-text-sub">{children}</span>
);

/**
 * 라벨 + 읽기 전용 회색 상자(원본 `nvRow` + `gROtext` — 줄바꿈 보존, 비면 `-`).
 * `emptyText` 를 주면 비었을 때 상자 없이 흐린 문구 한 줄(값이 없다는 것 자체가 정보인 자리)
 */
function ReadOnlyBlock({
  label,
  text,
  help,
  emptyText,
}: {
  label: string;
  text: string;
  help: ReactNode;
  emptyText?: string;
}) {
  const empty = text.trim() === "";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-medium-bold text-text">{label}</span>
      {empty && emptyText !== undefined ? (
        <p className="body-medium text-text-minimal">{emptyText}</p>
      ) : (
        <p className="body-medium rounded-medium bg-surface-sub p-4 break-keep whitespace-pre-wrap text-text wrap-anywhere">
          {textOrDash(text)}
        </p>
      )}
      {help}
    </div>
  );
}

function Shell({
  description,
  badges,
  children,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: ReviewDetailPageProps & {
  description?: string;
  badges?: ReactNode;
  children: ReactNode;
}) {
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
          title={PAGE_TITLE}
          description={description}
          badges={badges}
        />
      }
    >
      {children}
    </AppShell>
  );
}

export function ReviewDetailPage(props: ReviewDetailPageProps) {
  const pathname = usePathname();
  /* 경로는 `/reviews-admin/{리뷰 id}` **한 조각**이어야 한다 */
  const rest = pathname.slice(LIST_PATH.length + 1);
  const review = rest.includes("/")
    ? undefined
    : findReview(lastPathSegment(pathname));

  if (!review) {
    return (
      <Shell {...props}>
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<MessageSquare strokeWidth={1.2} aria-hidden />}
              title={COPY.notFoundTitle}
              description={COPY.notFoundDescription}
            >
              <Button
                variant="secondary"
                onClick={() => props.onNavSelect(LIST_PATH)}
              >
                {LIST_LABEL}으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  return <ReviewDetailBody key={review.id} review={review} {...props} />;
}

function ReviewDetailBody({
  review,
  ...props
}: ReviewDetailPageProps & { review: Review }) {
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const meta = STATUS_META[reviewStatus(review)];
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const reasonEmpty = reason.trim() === "";

  /* 알림만 — 배지·카드·버튼은 저장된 상태 그대로다 */
  const hide = () => {
    if (reasonEmpty) {
      setTried(true);
      return;
    }
    toast(COPY.hidden);
  };
  const restore = () => toast(COPY.restored);

  const statusTag = (
    <Tag tone={meta.tone} dot size="small">
      {meta.label}
    </Tag>
  );

  return (
    <Shell
      {...props}
      description={headlineOf(review)}
      badges={
        <Tag tone={meta.tone} dot>
          {meta.label}
        </Tag>
      }
    >
      <Section title={SECTIONS.info} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={8} />
        ) : (
          <>
            {/*
              줄 순서는 원본 `vRow2` 짝 그대로 — 작성자|상태 · 별점|작성일 · 셀러|상품.
              끝에 주문번호(주문 상세 링크 — 판정 Q12 · 디자인 §1)
            */}
            <InfoList>
              <InfoItem label="작성자">{review.author}</InfoItem>
              <InfoItem label="상태">{statusTag}</InfoItem>
              <InfoItem label="별점">
                <span className="flex items-center gap-1.5">
                  <RatingStars rating={review.rating} />
                  <span aria-hidden>{scoreText(review.rating)}</span>
                </span>
              </InfoItem>
              <InfoItem label="작성일">
                <span className="tabular-nums">{ymd(review.date)}</span>
              </InfoItem>
              <InfoItem label="셀러">{review.seller}</InfoItem>
              <InfoItem label="상품">{review.product}</InfoItem>
              <InfoItem label="주문번호">
                <TextButton
                  onClick={() => props.onNavSelect(orderPathOf(review))}
                >
                  {review.orderNo}
                </TextButton>
              </InfoItem>
            </InfoList>
            <ReadOnlyBlock
              label="리뷰 내용"
              text={review.content}
              help={null}
            />
            <ReadOnlyBlock
              label="판매자 답글"
              text={review.reply}
              emptyText={COPY.replyEmpty}
              help={null}
            />
          </>
        )}
      </Section>

      <Section title={SECTIONS.manage} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={2} />
        ) : review.hidden ? (
          <ReadOnlyBlock
            label="숨김 사유"
            text={review.reason}
            help={<Help>{COPY.restoreHelp}</Help>}
          />
        ) : (
          <FormField
            label="숨김 사유"
            required
            error={tried && reasonEmpty ? COPY.reasonEmpty : undefined}
            description={
              <>
                {COPY.hideHelpLead}
                <b className="body-small-bold">{COPY.hideHelpStrong}</b>
                {COPY.hideHelpTail}
              </>
            }
          >
            <Input
              className="max-w-130"
              maxLength={REASON_MAX}
              placeholder={COPY.reasonPlaceholder}
              value={reason}
              invalid={tried && reasonEmpty}
              onChange={(event) => setReason(event.target.value)}
            />
          </FormField>
        )}
      </Section>

      {/* 하단 바 (원본 `nv-bar`) — `[목록]  …  [숨김 처리|복원]` */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            onClick={() => props.onNavSelect(LIST_PATH)}
          >
            목록
          </Button>
          {review.hidden ? (
            <Button onClick={restore}>{COPY.restore}</Button>
          ) : (
            <Button variant="critical" onClick={hide}>
              {COPY.hide}
            </Button>
          )}
        </div>
      </Card>
    </Shell>
  );
}
