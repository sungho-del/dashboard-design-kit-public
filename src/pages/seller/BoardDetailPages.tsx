import { useState, type ReactNode } from "react";
import {
  Lock,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Star,
} from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  FormField,
  InfoItem,
  InfoList,
  Input,
  PageHeader,
  Tag,
  Textarea,
  useToast,
} from "../../components/ui";
import { lastPathSegment, usePathname } from "../../lib/router";
import {
  ASK_COPY,
  ASK_TITLE_MAX,
  INQ_COPY,
  NOT_FOUND,
  NOTICE_COPY,
  REVIEW_COPY,
  findAsk,
  findInquiry,
  findNotice,
  findReview,
  scoreText,
  type NotFoundCopy,
} from "./BoardDetailPages.data";
import { BoardTag, RatingStars } from "./BoardPages";
import {
  ASK_NEW_KEY,
  ASK_PATH,
  EMPTY_CELL,
  NOTICE_PATH,
  PIN_DETAIL_LABEL,
  REVIEWS_PATH,
  SUPPORT_PATH,
  inqTypeOf,
  replyStatOf,
} from "./BoardPages.data";
import type { SellerAsk, SellerInquiry, SellerReview } from "./seed/board.data";
import { Bold, Section, SellerShell, type SellerNavProps } from "./SettleParts";

/* =========================================================================
 * 게시판 상세 4화면 — 원본 기획 v0.4 `DETAILS.noticeDetail`(5217) · `inqDetail`(5230) ·
 * `reviewDetail`(5249) · `askDetail`(5265). 도메인·문구는 `./BoardDetailPages.data.ts`.
 *
 * ## 화면 유형: 상세형 (읽기 + 답변·답글·문의 입력)
 * ```
 * 머리   제목 + 한 줄 요약 + 상태 배지
 * 카드   ○○ 정보 — 메타(InfoList · 원본 `vRow2` 짝 순서) → 제목 · 내용(회색 상자) → 입력칸 · 도움말
 * (1:1)  본사 답변 카드 — 작성(new)에는 없다
 * 하단 바 [목록]                              [주 버튼 하나 — 없을 수 있다]
 * ```
 * 경로는 `{목록}/{id}` **한 조각**이어야 한다 — 아니면 「찾을 수 없는 ○○입니다」 + 목록으로.
 * 1:1 문의는 `/seller-ask/new` 가 작성 화면이다.
 *
 * ## 갈아끼울 것 → `./BoardDetailPages.data.ts`
 *
 * ## 그대로 두는 것
 * 같은 화면에서 다른 건으로 가면 `key` 로 본문을 새로 그린다(적던 글이 다음 건에 묻어가지 않게)
 *
 * ## 퍼블 범위 (`BoardDetailPages.data.ts` 머리)
 * 빈 입력은 원본 알림으로 막고, 통과하면 원본 알림 + **이 화면 상태만** 바꾼다(배지·버튼 이름).
 * 1:1 [문의 접수]·[수정]은 목록으로 돌아간다(원본 `nav('sellerAsk')`).
 *
 * ## 원본과 다르게 둔 곳 (형제 상세 규칙)
 * - 머리를 그린다(원본은 머리층 없음 · UI-287) — 셀러·본사 형제 상세처럼 제목 + 요약 + 배지
 * - 메타 4열 행(`vRow2`) → `InfoList` 한 줄씩(같은 순서). 라벨 폭은 네 화면 모두 기본 80
 * - 구역 접기 · 하단 바 고정(형제 상세와 같다)
 * - 🔒 → 자물쇠 아이콘 · ★☆ → 별 아이콘 + `(N점)`
 * - 빈 입력 알림은 원본대로 알림(셀러 사유 창과 같은 방식) — 본사 상세는 입력칸 아래 오류다
 * ====================================================================== */

/** 경로의 id — `{목록}/{id}` 한 조각이 아니면 빈 값(= 찾을 수 없음) */
function useDetailId(listPath: string) {
  const pathname = usePathname();
  return pathname.slice(listPath.length + 1).includes("/")
    ? ""
    : lastPathSegment(pathname);
}

function NotFound({
  copy,
  icon,
  ...props
}: SellerNavProps & { copy: NotFoundCopy; icon: ReactNode }) {
  return (
    <SellerShell {...props} header={<PageHeader title={copy.title} />}>
      <Card variant="soft">
        <CardBody>
          <EmptyState
            size="page"
            icon={icon}
            title={`찾을 수 없는 ${copy.what}입니다`}
            description={`주소가 잘못되었거나 삭제된 ${copy.what}일 수 있습니다.`}
          >
            <Button
              variant="secondary"
              onClick={() => props.onNavSelect(copy.listPath)}
            >
              {copy.listLabel}
            </Button>
          </EmptyState>
        </CardBody>
      </Card>
    </SellerShell>
  );
}

/** 하단 바(원본 `nv-bar`) — 좌 [목록] / 우 주 버튼 하나 */
function ActionBar({
  listPath,
  onNavSelect,
  children,
}: {
  listPath: string;
  onNavSelect: (path: string) => void;
  children?: ReactNode;
}) {
  return (
    <Card variant="soft" className="sticky bottom-6 z-10">
      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={() => onNavSelect(listPath)}>
          목록
        </Button>
        {children}
      </div>
    </Card>
  );
}

/** 줄 아래 도움말(원본 `nv-help`) */
const Help = ({ text }: { text: string }) => (
  <p className="body-small break-keep text-text-sub">
    <Bold text={text} />
  </p>
);

/** 라벨 + 읽기 전용 회색 상자 — 원본 `nvRow` + `gROtext`(줄바꿈 보존 · 비면 `-` · 최대 780) */
function ReadOnlyBlock({
  label,
  text,
  children,
}: {
  label: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-medium-bold text-text">{label}</span>
      <p className="body-medium max-w-195 rounded-medium bg-surface-sub p-4 break-keep whitespace-pre-wrap text-text wrap-anywhere">
        {text.trim() || EMPTY_CELL}
      </p>
      {children}
    </div>
  );
}

/** 제목 — 원본 굵은 한 줄 */
const TitleBlock = ({ text }: { text: string }) => (
  <div className="flex flex-col gap-1.5">
    <span className="label-medium-bold text-text">제목</span>
    <p className="body-medium-bold break-keep text-text wrap-anywhere">
      {text}
    </p>
  </div>
);

const Num = ({ children }: { children: ReactNode }) => (
  <span className="tabular-nums">{children}</span>
);

/* ---------- 공지 상세 (SO-CSC-006) — 읽기 전용 ---------- */

export function NoticeDetailPage(props: SellerNavProps) {
  const n = findNotice(useDetailId(NOTICE_PATH));
  if (!n)
    return (
      <NotFound
        copy={NOT_FOUND.notice}
        icon={<Megaphone strokeWidth={1.2} aria-hidden />}
        {...props}
      />
    );

  const pin = n.pin ? <Tag size="small">{PIN_DETAIL_LABEL}</Tag> : null;
  return (
    <SellerShell
      {...props}
      header={
        <PageHeader
          title={NOTICE_COPY.title}
          description={`${n.date} · ${n.title}`}
          badges={pin}
        />
      }
    >
      <Section title={NOTICE_COPY.section}>
        <InfoList>
          <InfoItem label="게시일">
            <Num>{n.date}</Num>
          </InfoItem>
          <InfoItem label="고정">{pin ?? EMPTY_CELL}</InfoItem>
        </InfoList>
        <TitleBlock text={n.title} />
        <ReadOnlyBlock label="내용" text={n.body} />
        <Help text={NOTICE_COPY.help} />
      </Section>
      {/* 원본 오른쪽 비어 있음 — 셀러는 공지를 고칠 수 없다 */}
      <ActionBar listPath={NOTICE_PATH} onNavSelect={props.onNavSelect} />
    </SellerShell>
  );
}

/* ---------- 문의 상세 (SO-CSC-005) — 고객 → 입점사 · 답변 등록/수정 ---------- */

export function InqDetailPage(props: SellerNavProps) {
  const q = findInquiry(useDetailId(SUPPORT_PATH));
  if (!q)
    return (
      <NotFound
        copy={NOT_FOUND.inquiry}
        icon={<MessageSquare strokeWidth={1.2} aria-hidden />}
        {...props}
      />
    );
  return <InqDetailBody key={q.id} q={q} {...props} />;
}

function InqDetailBody({ q, ...props }: SellerNavProps & { q: SellerInquiry }) {
  const { toast } = useToast();
  const [stat, setStat] = useState(q.stat);
  const [answer, setAnswer] = useState(q.a);
  const answered = stat === INQ_COPY.doneStat;
  const type = inqTypeOf(q);

  /* 원본 `inqReplySave` — 비면 막고, 처음이면 등록 · 이후는 수정 */
  const save = () => {
    if (!answer.trim()) return toast(INQ_COPY.empty);
    setStat(INQ_COPY.doneStat);
    toast(answered ? INQ_COPY.updated : INQ_COPY.registered);
  };

  return (
    <SellerShell
      {...props}
      header={
        <PageHeader
          title={INQ_COPY.title}
          description={`${type} · ${q.mem} · ${q.prod}`}
          badges={<BoardTag status={stat} />}
        />
      }
    >
      <Section title={INQ_COPY.section}>
        {/* 원본 `vRow2` 짝 순서 — 유형|상태 · 작성자|접수일 · 상품|(주문번호) · 공개 여부 */}
        <InfoList>
          <InfoItem label="유형">
            <Tag size="small">{type}</Tag>
          </InfoItem>
          <InfoItem label="상태">
            <BoardTag status={stat} />
          </InfoItem>
          <InfoItem label="작성자">{q.mem}</InfoItem>
          <InfoItem label="접수일">
            <Num>{q.date}</Num>
          </InfoItem>
          <InfoItem label="상품">{q.prod}</InfoItem>
          {/* 주문번호는 주문 문의일 때만(원본) */}
          {q.type === "주문" && (
            <InfoItem label="주문번호">
              <Num>{q.no || EMPTY_CELL}</Num>
            </InfoItem>
          )}
          <InfoItem label="공개 여부">
            {q.secret ? (
              <span className="flex items-center gap-1">
                <Lock size={16} strokeWidth={1.2} aria-hidden />
                {INQ_COPY.secret}
              </span>
            ) : (
              INQ_COPY.public
            )}
          </InfoItem>
        </InfoList>
        <ReadOnlyBlock label="문의 내용" text={q.q} />
        <FormField
          label="답변"
          required
          description={<Bold text={INQ_COPY.help} />}
        >
          <Textarea
            className="max-w-195"
            minRows={6}
            value={answer}
            placeholder={INQ_COPY.placeholder}
            onChange={(event) => setAnswer(event.target.value)}
          />
        </FormField>
      </Section>
      <ActionBar listPath={SUPPORT_PATH} onNavSelect={props.onNavSelect}>
        <Button onClick={save}>
          {answered ? INQ_COPY.update : INQ_COPY.register}
        </Button>
      </ActionBar>
    </SellerShell>
  );
}

/* ---------- 리뷰 상세 (SO-CSC-007) — 판매자 답글 1개 등록/수정 (숨김·복원은 본사) ---------- */

export function ReviewDetailPage(props: SellerNavProps) {
  const r = findReview(useDetailId(REVIEWS_PATH));
  if (!r)
    return (
      <NotFound
        copy={NOT_FOUND.review}
        icon={<Star strokeWidth={1.2} aria-hidden />}
        {...props}
      />
    );
  return <ReviewDetailBody key={r.id} r={r} {...props} />;
}

function ReviewDetailBody({
  r,
  ...props
}: SellerNavProps & { r: SellerReview }) {
  const { toast } = useToast();
  const [hasReply, setHasReply] = useState(r.reply !== "");
  const [reply, setReply] = useState(r.reply);
  const stat = replyStatOf(hasReply);

  /* 원본 `rvReplySave` */
  const save = () => {
    if (!reply.trim()) return toast(REVIEW_COPY.empty);
    setHasReply(true);
    toast(hasReply ? REVIEW_COPY.updated : REVIEW_COPY.registered);
  };

  return (
    <SellerShell
      {...props}
      header={
        <PageHeader
          title={REVIEW_COPY.title}
          description={`${r.mem} · ${r.prod} · ${r.rate}점`}
          badges={<BoardTag status={stat} />}
        />
      }
    >
      <Section title={REVIEW_COPY.section}>
        {/* 원본 짝 순서 — 작성자|답글 · 별점|작성일 · 상품 */}
        <InfoList>
          <InfoItem label="작성자">{r.mem}</InfoItem>
          <InfoItem label="답글">
            <BoardTag status={stat} />
          </InfoItem>
          <InfoItem label="별점">
            <span className="flex items-center gap-1.5">
              <RatingStars rating={r.rate} />
              <span aria-hidden>{scoreText(r.rate)}</span>
            </span>
          </InfoItem>
          <InfoItem label="작성일">
            <Num>{r.date}</Num>
          </InfoItem>
          <InfoItem label="상품">{r.prod}</InfoItem>
        </InfoList>
        <ReadOnlyBlock label="리뷰 내용" text={r.txt} />
        <FormField
          label="판매자 답글"
          required
          description={<Bold text={REVIEW_COPY.help} />}
        >
          <Textarea
            className="max-w-195"
            minRows={6}
            value={reply}
            placeholder={REVIEW_COPY.placeholder}
            onChange={(event) => setReply(event.target.value)}
          />
        </FormField>
      </Section>
      <ActionBar listPath={REVIEWS_PATH} onNavSelect={props.onNavSelect}>
        <Button onClick={save}>
          {hasReply ? REVIEW_COPY.update : REVIEW_COPY.register}
        </Button>
      </ActionBar>
    </SellerShell>
  );
}

/* ---------- 1:1 문의 상세 (SO-CSC-008) — 등록·수정 겸용 (`new` = 작성) ---------- */

export function AskDetailPage(props: SellerNavProps) {
  const id = useDetailId(ASK_PATH);
  const q = id === ASK_NEW_KEY ? undefined : findAsk(id);
  if (id !== ASK_NEW_KEY && !q)
    return (
      <NotFound
        copy={NOT_FOUND.ask}
        icon={<MessageCircle strokeWidth={1.2} aria-hidden />}
        {...props}
      />
    );
  return <AskDetailBody key={id} q={q} {...props} />;
}

function AskDetailBody({
  q,
  ...props
}: SellerNavProps & { q: SellerAsk | undefined }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(q?.title ?? "");
  const [body, setBody] = useState(q?.body ?? "");
  /** 본사가 답한 뒤에는 원문을 고칠 수 없다(원본) — 읽기 전용 + [수정] 없음 */
  const answered = q?.stat === ASK_COPY.doneStat;

  /* 원본 `askNewSave` — 제목만 검사 · 접수/수정 후 목록으로 */
  const save = () => {
    if (!title.trim()) return toast(ASK_COPY.titleEmpty);
    props.onNavSelect(ASK_PATH);
    toast(q ? ASK_COPY.updated : ASK_COPY.submitted);
  };

  return (
    <SellerShell
      {...props}
      header={
        <PageHeader
          title={ASK_COPY.title}
          description={q?.title}
          badges={q ? <BoardTag status={q.stat} /> : null}
        />
      }
    >
      <Section title={q ? ASK_COPY.section : ASK_COPY.sectionNew}>
        {/* 작성(new)에는 접수일·상태가 아직 없어 줄을 내지 않는다(원본) */}
        {q && (
          <InfoList>
            <InfoItem label="접수일">
              <Num>{q.date}</Num>
            </InfoItem>
            <InfoItem label="상태">
              <BoardTag status={q.stat} />
            </InfoItem>
          </InfoList>
        )}
        {q && answered ? (
          <>
            <TitleBlock text={q.title} />
            <ReadOnlyBlock label="내용" text={q.body} />
          </>
        ) : (
          <>
            <FormField label="제목" required>
              <Input
                className="max-w-160"
                maxLength={ASK_TITLE_MAX}
                value={title}
                placeholder={ASK_COPY.titlePlaceholder}
                /* 글자 수 「N/60」 — 입력칸 오른쪽(develop · 개발 요청 43번) */
                rightIcon={
                  <span className="body-small text-text-sub tabular-nums">
                    {title.length}/{ASK_TITLE_MAX}
                  </span>
                }
                onChange={(event) => setTitle(event.target.value)}
              />
            </FormField>
            <FormField label="내용">
              <Textarea
                className="max-w-195"
                minRows={6}
                value={body}
                placeholder={ASK_COPY.bodyPlaceholder}
                onChange={(event) => setBody(event.target.value)}
              />
            </FormField>
          </>
        )}
      </Section>
      {q && (
        <Section title={ASK_COPY.answerSection}>
          <ReadOnlyBlock label={ASK_COPY.answerSection} text={q.a}>
            {answered ? null : <Help text={ASK_COPY.waiting} />}
          </ReadOnlyBlock>
        </Section>
      )}
      <ActionBar listPath={ASK_PATH} onNavSelect={props.onNavSelect}>
        {answered ? null : (
          <Button onClick={save}>
            {q ? ASK_COPY.update : ASK_COPY.submit}
          </Button>
        )}
      </ActionBar>
    </SellerShell>
  );
}
