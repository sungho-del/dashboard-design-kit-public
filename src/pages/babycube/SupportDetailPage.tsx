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
  PageHeader,
  Skeleton,
  Tag,
  Textarea,
  useToast,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import { STATUS_META, TYPE_LABELS, ymd } from "./SupportListPage.data";
import {
  COPY,
  findInquiry,
  KIND_META,
  kindOfId,
  type FoundInquiry,
} from "./SupportDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S22-D 문의 상세 (BabyCube 본사 운영 어드민) — 뼈대
 * 경로 `/support/{문의 ID}` — 고객 문의(`Q-…`)와 셀러 문의(`SQ-…`) 둘을 한 화면이 그린다
 * 기준 기획: v0.4 `DETAILS.inquiryDetail`(proto.html 5390~5404) · `DETAILS.sellerAskDetail`(5407~5420)
 *
 * ## 화면 유형: 상세형 (읽기 + 답변 입력)
 *
 * ```
 * 문의 정보   ← 메타(InfoList) 고객: 유형 · 상태 · 회원명 · 접수일 · 답변일 / 셀러: 셀러 · 상태 · 접수일
 *               → 읽기 블록 제목(굵게) · 내용(회색 상자 · 줄바꿈 보존 · 말줄임 없음)  ← 리뷰 상세 「리뷰 내용」과 같은 꼴
 *               → 답변 입력칸(필수 · 등록된 답변으로 채움)
 * 내용 상자와 답변 칸은 같은 읽기 폭(최대 780 = `max-w-195`, 원본 답변 `max-width:780px`)이라 묻고 답하는 짝이 맞는다
 * [목록]                                  [답변 등록 | 답변 수정]   ← 하단 바 (원본 그대로)
 * ```
 *
 * ## 갈아끼울 것 → `./SupportDetailPage.data.ts` (+ 목록 데이터의 행)
 *
 * ## 그대로 두는 것
 * 구역 접기 · 「찾을 수 없음」 · 문의가 바뀌면 `key` 로 본문을 새로 그림(적던 답변이 다음 건에 묻어가지 않게) ·
 * `?preview=`
 *
 * ## 퍼블 범위
 * [답변 등록]·[답변 수정]은 빈 답변(trim)을 막고, 통과하면 **알림만** — 상태 배지·버튼 이름·답변일은
 * 그대로다(사용자 결정 — 원본은 상태를 답변완료로 바꾸고 답변일을 찍는다).
 *
 * ## 원본과 다르게 둔 곳 → `SupportDetailPage.data.ts` 머리 주석
 * ====================================================================== */

export interface SupportDetailPageProps {
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

function Shell({
  title,
  description,
  badges,
  children,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SupportDetailPageProps & {
  title: string;
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
        <PageHeader title={title} description={description} badges={badges} />
      }
    >
      {children}
    </AppShell>
  );
}

export function SupportDetailPage(props: SupportDetailPageProps) {
  const id = lastPathSegment(usePathname());
  const found = findInquiry(id);

  if (!found) {
    const meta = KIND_META[kindOfId(id)];
    return (
      <Shell {...props} title={meta.title}>
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
                onClick={() => props.onNavSelect(meta.listPath)}
              >
                {COPY.backToList}
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  /* 문의마다 처음부터 — 적던 답변·오류·접힘이 다음 건에 묻어가지 않게 */
  return <SupportDetailBody key={found.item.id} found={found} {...props} />;
}

function SupportDetailBody({
  found,
  ...props
}: SupportDetailPageProps & { found: FoundInquiry }) {
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);

  const { kind, item } = found;
  const meta = KIND_META[kind];
  const badge = STATUS_META[item.status];
  /** 버튼 이름은 **저장된** 상태로 — 알림만 띄우므로 눌러도 바뀌지 않는다 */
  const answered = item.status === "done";

  const [answer, setAnswer] = useState(item.answer);
  const [tried, setTried] = useState(false);
  const empty = answer.trim() === "";

  const save = () => {
    if (empty) {
      setTried(true);
      return;
    }
    toast(answered ? COPY.updated : COPY.registered);
  };

  const description =
    found.kind === "customer"
      ? `${item.id} · ${found.item.member} · ${TYPE_LABELS[found.item.type]}`
      : `${item.id} · ${found.item.seller}`;

  const statusTag = (
    <Tag tone={badge.tone} dot>
      {badge.label}
    </Tag>
  );

  return (
    <Shell
      {...props}
      title={meta.title}
      description={description}
      badges={statusTag}
    >
      <Section title={COPY.section} busy={busy} dim={dim}>
        {status === "loading" ? (
          <LoadingLines rows={7} />
        ) : (
          <>
            {/* 줄 순서는 원본 `vRow2` 짝 그대로 — 유형|상태 · 회원명|접수일 · 답변일 */}
            <InfoList>
              {found.kind === "customer" ? (
                <>
                  <InfoItem label="유형">
                    {TYPE_LABELS[found.item.type]}
                  </InfoItem>
                  <InfoItem label="상태">{statusTag}</InfoItem>
                  <InfoItem label="회원명">{found.item.member}</InfoItem>
                  <InfoItem label="접수일">
                    <span className="tabular-nums">{ymd(item.date)}</span>
                  </InfoItem>
                  {/* 미답변이면 「-」 — 화면 설명(annotations 83) 기준 */}
                  <InfoItem label="답변일">
                    <span className="tabular-nums">
                      {ymd(found.item.answeredAt)}
                    </span>
                  </InfoItem>
                </>
              ) : (
                <>
                  <InfoItem label="셀러">{found.item.seller}</InfoItem>
                  <InfoItem label="상태">{statusTag}</InfoItem>
                  <InfoItem label="접수일">
                    <span className="tabular-nums">{ymd(item.date)}</span>
                  </InfoItem>
                </>
              )}
            </InfoList>

            {/* 묻는 글 — 메타 상자에 묻지 않고 독립된 읽기 블록(원본 `nvRow` 제목 · `gROtext` 내용).
                라벨·값 짝은 `<dt>`/`<dd>` 그대로 */}
            <dl className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <dt className="label-medium-bold text-text">제목</dt>
                <dd className="body-medium-bold break-keep text-text wrap-anywhere">
                  {item.title}
                </dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="label-medium-bold text-text">내용</dt>
                <dd className="body-medium max-w-195 rounded-medium bg-surface-sub p-4 break-keep whitespace-pre-wrap text-text wrap-anywhere">
                  {item.body}
                </dd>
              </div>
            </dl>

            <FormField
              label="답변"
              required
              error={tried && empty ? COPY.answerEmpty : undefined}
            >
              <Textarea
                className="max-w-195"
                minRows={6}
                value={answer}
                placeholder={COPY.answerPlaceholder}
                onChange={(event) => setAnswer(event.target.value)}
              />
            </FormField>
          </>
        )}
      </Section>

      {/* 하단 바 (원본 `nv-bar`) — `[목록]  …  [답변 등록|답변 수정]` */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            onClick={() => props.onNavSelect(meta.listPath)}
          >
            목록
          </Button>
          <Button onClick={save}>
            {answered ? COPY.update : COPY.register}
          </Button>
        </div>
      </Card>
    </Shell>
  );
}
