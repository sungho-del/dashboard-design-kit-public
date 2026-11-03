import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
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
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import { MESSAGES } from "./FaqListPage.data";
import { FaqDeleteModal } from "./FaqListPage";
import {
  CATEGORY_OPTIONS,
  COPY,
  DEFAULT_CATEGORY_ID,
  LIST_LABEL,
  LIST_PATH,
  NOT_FOUND_DESCRIPTION,
  NOT_FOUND_TITLE,
  PAGE_TITLE,
  QUESTION_MAX,
  SAVED_MESSAGE,
  SAVE_LABEL,
  SECTION_TITLE,
  targetOf,
  type FaqFormTarget,
} from "./FaqFormPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * FAQ 등록/수정 — 폼형 · 뼈대 (원본 v0.4 `DETAILS.faqDetail`, 규격 `nvEditPage`)
 *
 * ## 구성
 * ```
 * [FAQ 등록 | FAQ 수정]                                    ← 머리(원본 미렌더 — 형제처럼 그림)
 * FAQ 내용 *  (접기)  카테고리 * · 질문 * · 답변 · 도움말
 * [목록]                      ([삭제]) [취소] [등록|저장]  ← 하단 고정 바(공지 폼과 같은 순서)
 * ```
 * 경로: `/faq-admin/new`(등록) · `/faq-admin/{id}`(수정). 그 밖은 「찾을 수 없음」 + [FAQ 관리로].
 * 대상이 바뀌면 `key` 로 처음부터(고친 값·오류·접힘이 다음 건에 묻어가지 않게).
 *
 * ## 이 파일은 도메인을 모른다
 * | 갈아끼울 것                              | 위치                      |
 * | ---------------------------------------- | ------------------------- |
 * | 대상 찾기·제목·라벨·문구·선택지·길이 제한 | `FaqFormPage.data.ts`     |
 * | 삭제 확인 창·삭제 알림                   | `FaqListPage` (목록과 공유) |
 *
 * ## 그대로 두는 것
 * 폼 간격은 직접 지정하지 않는다(`AppShell` gap-6 · `CardBody` gap-5 · `FormField` gap-1.5 — §29) ·
 * 저장 → 검증 → 알림 → 목록 · 오류가 나면 구역을 펼치고 그 칸으로 포커스
 *
 * ## 퍼블 범위
 * 저장·등록·삭제는 **알림 후 목록으로**만 간다 — 목록에 반영하지 않는다.
 * ====================================================================== */

export interface FaqFormPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

const QUESTION_ID = "faq-form-question";

export function FaqFormPage(props: FaqFormPageProps) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  /* 경로는 `/faq-admin/{id|new}` **한 조각**이어야 한다 */
  const rest = pathname.slice(LIST_PATH.length + 1);
  const target = rest.includes("/")
    ? undefined
    : targetOf(lastPathSegment(pathname));

  if (!target) {
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
        header={<PageHeader title={PAGE_TITLE.edit} />}
      >
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<HelpCircle strokeWidth={1.2} aria-hidden />}
              title={NOT_FOUND_TITLE}
              description={NOT_FOUND_DESCRIPTION}
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                {LIST_LABEL}로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  return (
    <FaqFormBody
      key={target.mode === "edit" ? target.faq.id : target.mode}
      target={target}
      {...props}
    />
  );
}

function FaqFormBody({
  target,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: FaqFormPageProps & { target: FaqFormTarget }) {
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const loading = status === "loading";

  const { mode } = target;
  const initial = target.mode === "edit" ? target.faq : undefined;

  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? DEFAULT_CATEGORY_ID,
  );
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [deleting, setDeleting] = useState(false);
  /* 접힌 구역을 펼친 **다음 그림**에서야 입력칸이 생긴다 — 포커스는 그때 옮긴다 */
  const focusPending = useRef(false);

  const save = () => {
    if (question.trim() === "") {
      setQuestionError(COPY.questionRequired);
      setOpen(true);
      focusPending.current = true;
      return;
    }
    toast(SAVED_MESSAGE[mode]);
    onNavSelect(LIST_PATH);
  };

  const confirmDelete = () => {
    setDeleting(false);
    toast(MESSAGES.faqDeleted(1));
    onNavSelect(LIST_PATH);
  };

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
      header={<PageHeader title={PAGE_TITLE[mode]} />}
    >
      <Card variant="soft" aria-busy={busy}>
        <CardHeader
          title={
            <>
              {SECTION_TITLE}
              {/* 원본 필수 ● — 시각 기호라 읽지 않는다. 필수 여부는 안의 칸이 말한다 */}
              <span aria-hidden className="text-text-critical">
                {" "}
                *
              </span>
            </>
          }
          action={
            <IconButton
              variant="ghost"
              size="small"
              label={`${SECTION_TITLE} ${open ? "접기" : "펼치기"}`}
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
        {open ? (
          <CardBody className={dimWhile(status)}>
            {loading ? (
              Array.from({ length: 3 }, (_, index) => (
                <span key={index} className="body-medium block w-1/2">
                  <Skeleton />
                </span>
              ))
            ) : (
              <>
                <FormField
                  label="카테고리"
                  required
                  htmlFor="faq-form-category"
                >
                  <Select
                    id="faq-form-category"
                    className="w-60"
                    options={CATEGORY_OPTIONS}
                    value={categoryId}
                    onValueChange={setCategoryId}
                  />
                </FormField>
                <FormField
                  label="질문"
                  required
                  htmlFor={QUESTION_ID}
                  error={questionError ?? undefined}
                >
                  <Input
                    id={QUESTION_ID}
                    ref={(element) => {
                      if (element && focusPending.current) {
                        focusPending.current = false;
                        element.focus();
                      }
                    }}
                    className="max-w-160"
                    maxLength={QUESTION_MAX}
                    placeholder={COPY.questionPlaceholder}
                    value={question}
                    invalid={questionError !== null}
                    onChange={(event) => {
                      setQuestion(event.target.value);
                      if (questionError !== null) setQuestionError(null);
                    }}
                  />
                </FormField>
                {/* 원본 — 답변은 필수가 아니다(5455 · 기획 확인 필요) */}
                <FormField label="답변" htmlFor="faq-form-answer">
                  <Textarea
                    id="faq-form-answer"
                    className="max-w-195"
                    minRows={7}
                    placeholder={COPY.answerPlaceholder}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                  />
                </FormField>
                <p className="body-small text-text-sub">
                  {COPY.help.lead}
                  <strong className="body-small-bold text-text">
                    {COPY.help.emphasis}
                  </strong>
                  {COPY.help.tail}
                </p>
              </>
            )}
          </CardBody>
        ) : null}
      </Card>

      {/*
        하단 고정 바 (원본 `nv-bar` 4737~4740) — `[목록]  …  ([삭제]) [취소] [등록|저장]`.
        순서는 공지 폼·회원·셀러 상세와 같게(사용자 결정 2026-11-03 — 원본은 [등록|저장][취소]).
        [취소]도 목록으로 간다(원본). 진한 버튼은 [등록|저장] 하나다.
      */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            {mode === "edit" ? (
              <Button variant="criticalTonal" onClick={() => setDeleting(true)}>
                삭제
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
              취소
            </Button>
            <Button onClick={save}>{SAVE_LABEL[mode]}</Button>
          </div>
        </div>
      </Card>

      {/* 목록 [선택 삭제]와 같은 창(원본 3471 「게이트 하나」) */}
      <FaqDeleteModal
        count={deleting ? 1 : null}
        onClose={() => setDeleting(false)}
        onConfirm={confirmDelete}
      />
    </AppShell>
  );
}
