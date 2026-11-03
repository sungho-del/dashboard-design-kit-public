import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Megaphone } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  DatePicker,
  EmptyState,
  FormField,
  Gnb,
  IconButton,
  InfoItem,
  InfoList,
  Input,
  PageHeader,
  SegmentedControl,
  Skeleton,
  Tag,
  Textarea,
  useToast,
  type DateRange,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { usePathname, useSearchParams } from "../../lib/router";
import {
  LIST_PATH,
  NEW_KEY,
  STATUS_META,
  STATUS_OPTIONS,
  audienceLabel,
  audienceOf,
  findNotice,
  listPathOf,
  type Notice,
  type NoticeAudience,
  type NoticeStatus,
} from "./NoticeListPage.data";
import { FORM_COPY, formDescription } from "./NoticeFormPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 공지 등록/수정 — 뼈대 (BabyCube 본사 운영 어드민 · BO-CSC-007)
 *
 * ## 화면 유형: 폼형 · 신규·수정 겸용 (원본 `DETAILS.noticeForm` proto.html:5009-5030)
 * 경로 `/notices/new?aud=seller` = 신규(대상은 목록에서 보던 탭) · `/notices/{공지 ID}` = 수정.
 * 문구는 `./NoticeFormPage.data.ts`, 샘플·타입·경로는 `./NoticeListPage.data.ts`.
 *
 * ```
 * 공지 내용   ← 제목* · 본문
 * 게시 설정   ← 공지 대상(읽기) · 공지 ID(수정만) · 노출 여부 게시/숨김(수정만) ·
 *               상단 고정 · 게시 기간(종료 비우면 상시)
 * [목록]                                   [취소] [등록|저장]   ← 하단 바 (화면 아래 고정)
 * ```
 *
 * | 갈아끼울 것   | 위치                                        |
 * | ------------- | ------------------------------------------- |
 * | 문구·라벨     | `NoticeFormPage.data.ts` 의 `FORM_COPY`     |
 * | 구역·입력칸   | 이 파일의 `Section` 두 장                   |
 *
 * ## 그대로 두는 것
 * 구역 접기 · 하단 바 · 찾을 수 없음 · 공지마다 본문 `key` · `?preview=loading|refreshing`
 *
 * ## 원본 정책
 * - 필수는 **제목 하나**(원본 `noticeSave`). 글자 수 제한·시작일 필수·기간 순서 검사 없음
 * - 노출 여부는 **[저장] 에서만 확정되는 초안**이다 — 머리 배지는 저장된 값
 * - [목록]·[취소] 는 확인 없이 목록으로(보던 대상 탭으로)
 *
 * ## 퍼블 범위
 * [등록]/[저장] 은 검사 후 **알림 + 목록 이동만** 한다(원본도 저장 뒤 목록으로 간다).
 * 목록에는 반영하지 않는다.
 *
 * ## 원본과 다르게 둔 곳 (근거)
 * 1. 머리를 그린다 — 원본은 `nvEditPage` 의 title 인자가 그려지지 않는다(UI-287 결함).
 *    제목 「공지 등록」/「공지 수정」(형제 FAQ 폼과 같은 꼴) + `고객 공지 · N-U31`(신규 `고객 공지 작성`) + 저장된 상태 배지
 * 2. 빈 제목은 입력칸 아래 오류(원본은 토스트 — 폼 규격 §29)
 * 3. 하단 버튼 [취소][등록|저장] 순서(사용자 결정 — 회원·셀러 상세와 같게. 원본은 반대)
 * 4. 없는 공지 ID 면 「찾을 수 없는 공지입니다」(원본은 빈 수정 폼 — 결함)
 * 5. 공지 대상·공지 ID 는 `InfoList` 로 읽는 값(비활성 입력칸 대신 — 셀러 상세와 같은 규칙)
 * ====================================================================== */

export interface NoticeFormPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** `YYYY-MM-DD` ↔ `Date` (로컬 자정) */
const toDate = (text: string | null) => {
  if (!text) return undefined;
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** 접을 수 있는 구역 한 장 — 셀러 상세와 같은 규격 */
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
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
  header,
  children,
}: NoticeFormPageProps & { header: ReactNode; children: ReactNode }) {
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
      header={header}
    >
      {children}
    </AppShell>
  );
}

export function NoticeFormPage(props: NoticeFormPageProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  /* 경로는 `/notices/{조각}` **한 조각**이어야 한다 */
  const key = pathname.slice(LIST_PATH.length + 1);
  const isNew = key === NEW_KEY;
  const notice = isNew || key.includes("/") ? undefined : findNotice(key);

  if (!isNew && !notice) {
    return (
      <Shell
        {...props}
        header={<PageHeader title={FORM_COPY.pageTitle.edit} />}
      >
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<Megaphone strokeWidth={1.2} aria-hidden />}
              title={FORM_COPY.notFoundTitle}
              description={FORM_COPY.notFoundDescription}
            >
              <Button
                variant="secondary"
                onClick={() => props.onNavSelect(LIST_PATH)}
              >
                {FORM_COPY.backToList}
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  const audience = notice?.audience ?? audienceOf(params.get("aud"));
  /* 공지마다 처음부터 — 주소만 바뀌어도 고치던 값이 다음 공지에 묻어가지 않게 */
  return (
    <NoticeFormBody
      key={notice?.id ?? `${NEW_KEY}-${audience}`}
      notice={notice}
      audience={audience}
      {...props}
    />
  );
}

interface Draft {
  title: string;
  body: string;
  status: NoticeStatus;
  pinned: boolean;
  period: DateRange | undefined;
}

const draftOf = (notice: Notice | undefined): Draft => ({
  title: notice?.title ?? "",
  body: notice?.body ?? "",
  /* 신규는 원본처럼 `게시` 로 등록된다 */
  status: notice?.status ?? "posted",
  pinned: notice?.pinned ?? false,
  period: notice
    ? { from: toDate(notice.startsOn), to: toDate(notice.endsOn) }
    : undefined,
});

function NoticeFormBody({
  notice,
  audience,
  ...props
}: NoticeFormPageProps & {
  notice: Notice | undefined;
  audience: NoticeAudience;
}) {
  const { onNavSelect } = props;
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const [draft, setDraft] = useState(() => draftOf(notice));
  /** [등록|저장] 을 누른 뒤부터 오류를 보인다 */
  const [touched, setTouched] = useState(false);
  const set =
    <K extends keyof Draft>(field: K) =>
    (value: Draft[K]) =>
      setDraft((prev) => ({ ...prev, [field]: value }));

  const titleError =
    touched && draft.title.trim() === "" ? FORM_COPY.titleEmpty : undefined;
  const backToList = () => onNavSelect(listPathOf(audience));

  const save = () => {
    setTouched(true);
    if (draft.title.trim() === "") return;
    toast(notice ? FORM_COPY.updated : FORM_COPY.created);
    backToList();
  };

  const saved = notice ? STATUS_META[notice.status] : null;

  return (
    <Shell
      {...props}
      header={
        /* 배지는 **저장된** 노출 여부 — 고르는 중인 초안과 섞지 않는다 */
        <PageHeader
          title={FORM_COPY.pageTitle[notice ? "edit" : "new"]}
          description={formDescription(audience, notice?.id)}
          badges={
            saved ? (
              <Tag tone={saved.tone} dot>
                {saved.label}
              </Tag>
            ) : undefined
          }
        />
      }
    >
      <Section title={FORM_COPY.sectionContent} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={2} />
        ) : (
          <>
            <FormField label={FORM_COPY.titleLabel} required error={titleError}>
              <Input
                className="max-w-160"
                value={draft.title}
                placeholder={FORM_COPY.titlePlaceholder}
                onChange={(event) => set("title")(event.target.value)}
              />
            </FormField>
            <FormField label={FORM_COPY.bodyLabel}>
              {/* 읽기 폭 상한 780(원본 `max-width:780px` · 형제 FAQ 답변과 같다) */}
              <Textarea
                className="max-w-195"
                minRows={6}
                value={draft.body}
                placeholder={FORM_COPY.bodyPlaceholder}
                onChange={(event) => set("body")(event.target.value)}
              />
            </FormField>
          </>
        )}
      </Section>

      <Section title={FORM_COPY.sectionSetting} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={4} />
        ) : (
          <>
            <InfoList>
              <InfoItem label={FORM_COPY.audienceLabel}>
                <span className="label-medium-bold text-text">
                  {audienceLabel(audience)}
                </span>
              </InfoItem>
              {notice ? (
                <InfoItem label={FORM_COPY.idLabel}>{notice.id}</InfoItem>
              ) : null}
            </InfoList>
            {/* 신규는 원본처럼 고르지 않는다(게시로 등록) */}
            {notice ? (
              <FormField label={FORM_COPY.statusLabel} group>
                <SegmentedControl
                  className="self-start"
                  items={STATUS_OPTIONS}
                  value={draft.status}
                  onValueChange={(value) =>
                    set("status")(value as NoticeStatus)
                  }
                />
              </FormField>
            ) : null}
            {/* Checkbox 는 루트가 이미 `<label>` 이라 FormField 로 감싸지 않는다 */}
            <div
              role="group"
              aria-label={FORM_COPY.pinLabel}
              className="flex flex-col gap-1.5"
            >
              <span className="label-medium-bold text-text">
                {FORM_COPY.pinLabel}
              </span>
              <Checkbox
                label={FORM_COPY.pinCheckbox}
                checked={draft.pinned}
                onChange={(event) => set("pinned")(event.target.checked)}
              />
            </div>
            <FormField
              label={FORM_COPY.periodLabel}
              labelDescription={FORM_COPY.periodHint}
            >
              {/* 날짜 둘 + 화살표 폭(224)의 상한 — 카드 끝까지 빈 칸이 늘어나지 않게(원본 날짜칸 170 × 2) */}
              <DatePicker
                className="max-w-60"
                mode="range"
                value={draft.period}
                onChange={set("period")}
                startPlaceholder="시작일"
                endPlaceholder="종료일"
              />
            </FormField>
          </>
        )}
      </Section>

      {/* 하단 액션 바 (원본 `nv-bar`) — 화면 아래에 붙는다(셀러 상세와 같다) */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={backToList}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={backToList}>
              취소
            </Button>
            <Button onClick={save}>
              {notice ? FORM_COPY.updateLabel : FORM_COPY.createLabel}
            </Button>
          </div>
        </div>
      </Card>
    </Shell>
  );
}
