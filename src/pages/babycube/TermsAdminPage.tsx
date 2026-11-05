import { useState } from "react";
import { FileWarning } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  DatePicker,
  EmptyState,
  FormField,
  Gnb,
  InfoItem,
  InfoList,
  PageHeader,
  SegmentedControl,
  Tag,
  Textarea,
  useToast,
} from "../../components/ui";
import {
  dotDate,
  EFFECTIVE_COPY,
  effectiveDefault,
  MESSAGES,
  SCHEDULE_COPY,
  TERMS,
  TODAY,
  updatedText,
} from "./TermsAdminPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";
import { cn } from "../../lib/cn";

/* =========================================================================
 * S26 약관 관리 — 뼈대 (원본 v0.4 `SCREENS.termsAdmin` 3566 · 저장 `termsSave` 3561)
 *
 * ## 화면 유형: 폼형 (`src/pages/ProductFormPage.tsx` 변형)
 *
 * ### 판정 근거 — 목록형이 아니다
 * | 신호                          | 판정                                                     |
 * | ----------------------------- | -------------------------------------------------------- |
 * | `components` 에 `Table`·`Pagination` **없음** | 목록형의 결정적 신호가 빠져 있다          |
 * | `components` 에 `Textarea`·`Select` 있음     | §2 폼형 행("작성·편집 / Textarea·Select") |
 * | `purpose` 가 "본문을 작성·저장하는 2단 **폼 화면**" | 목적어가 조회가 아니라 작성이다   |
 * | `states` 에 `editing`·`saving`               | 폼의 상태 어휘다                          |
 * | 좌측 목록에 필터·검색·페이징이 없다           | 조회 대상 집합이 아니라 **편집 대상 선택기**다 |
 *
 * §2 의 "판정이 갈리면 목록형 우선"은 **한 화면이 목록 신호와 상세 신호에 동시에 걸릴 때**의
 * 규칙이다. 여기서는 목록형 신호 자체가 약하다 — 표로 만들면 12행짜리 표 하나에
 * 필터도 페이징도 없는, 표일 이유가 없는 표가 된다.
 *
 * ## 폼형 템플릿에서 상속한 것 (`screen-templates.md` §3-4)
 * 1. **카드 = 섹션** — 좌(목록) · 우(편집) 두 덩어리
 * 2. **간격을 페이지가 지정하지 않는다** — `CardBody` gap-5 · `FormField` gap-1.5.
 *    ⚠️ 예외는 2단 래퍼의 `gap-6` 하나뿐이다. 카드를 **가로로** 놓는 배치라
 *    `AppShell` 의 세로 gap-6 이 닿지 않는다. 값은 §29-1 의 카드↔카드 24 를 그대로 썼다
 * 3. **2열 grid 를 쓰지 않는다**(§29-4) — 여기 2단은 **폼 필드의 2열이 아니라**
 *    "대상 선택 / 편집" 이라는 다른 성격의 두 카드다. flex + `min-w-0` 로 짠다
 *
 * ## 갈아끼울 것
 * | 갈아끼울 것        | 위치                                  |
 * | ------------------ | ------------------------------------- |
 * | 문서 목록·본문     | `TermsAdminPage.data.ts` **전체**     |
 * | 필드 구성          | 우측 카드의 `FormField`               |
 * | 빈 상태 문구       | 우측 `EmptyState`                     |
 *
 * ## 원본 어드민(`/terms-admin`) 대조 결과
 * 원본도 좌(`term-list`) · 우(`term-edit`) 2단이고, 좌측이 유일한 문서 선택기다.
 *
 * 원본과 맞춘 것:
 * - 좌측 헤더는 `약관 목록 N종` — 건수가 제목 바로 옆, "총"이 붙지 않는다
 * - 좌측 항목은 **이름(왼쪽) + `필수` 배지(필수일 때만)·`미작성`(오른쪽 끝)** 이 전부다.
 *   선택 항목만 굵다. `선택` 배지도 최종 수정일도 좌측에는 없다 — 둘 다 **우측 헤더**가 든다
 * - 우측 헤더는 `약관 편집` 같은 고정 제목이 아니라 **고른 문서의 이름**이고,
 *   그 옆에 `필수`/`선택` 배지, 오른쪽 끝에 `최종 수정 YYYY.MM.DD` 또는 `미작성`
 * - `미작성` 은 경고색(원본 warn) — 처리할 상태다. 필수/선택은 **분류**라 무채색 `Tag`
 * - 본문 placeholder 는 `{문서 이름} 내용을 입력하세요.`
 * - 저장 버튼은 **본문이 있으면 `수정 저장`, 비어 있으면 `등록`**
 * - 저장 토스트는 `약관이 등록되었습니다.` / `약관이 수정되었습니다.`
 *   ⚠️ **저장은 알림만**(퍼블 범위) — 저장본·`미작성`·최종 수정일·버튼 라벨은 바뀌지 않는다.
 *   편집 초안은 그 문서에 머무는 동안 남고, 문서를 바꾸면 저장본으로 돌아온다
 * - 빈 본문으로 저장 → 토스트 `약관 내용을 입력해주세요.`
 * - 문서가 하나도 없을 때 — `등록된 약관이 없습니다.` +
 *   `약관 문서가 하나도 없어 편집할 대상이 없습니다.`
 *
 * ⚠️ 원본에 없어서 걷어낸 것 — **되살리지 말 것**
 * 1. **`문서 선택` Select** — 좌측 목록과 **같은 축에 컨트롤이 둘**이 된다.
 *    기획서 S26 의 `components` 에 `Select` 가 있지만 원본에는 없다
 * 2. **`편집 중` 배지와 `되돌리기` 버튼** — 원본 우측 카드에는 저장 버튼 하나뿐이다
 * 3. **본문 필드의 인라인 에러** — 원본은 토스트로만 알린다
 * 4. **PageHeader 도움말 툴팁** · 좌측 카드의 빈 상태
 *
 * 5. **버전 이력·개정 공지** — 원본엔 최종 수정일 하나뿐이다(기획 확인 필요는 data 주석)
 *
 * ## 원본과 다르게 둔 것
 * - 본문에 보이는 라벨 `약관 내용`(원본은 라벨 없음) — 편집기의 접근성 이름이다
 * - **시행일 칸 + 「중요 변경 (30일 전 공지)」 체크**(판정 Q15) — 본문 아래. 기본 오늘+7 · 체크하면 +30 ·
 *   지난 날짜는 고를 수 없고, 칸을 비울 수 없다(필수 — 고른 날을 다시 눌러도 지워지지 않는다).
 *   문서를 바꾸면 본문처럼 기본값으로 돌아온다
 * - **예약(개정 예정본)이 있을 때만 [현행본][개정 예정본] 전환 + [예약 취소]**(판정 Q15) — 본문 위 세그먼트.
 *   현행본 = 위 편집 폼 그대로 · 개정 예정본 = 그 본문(읽기만)과 시행일(잠금) + 하단 [예약 취소].
 *   [예약 취소] 는 그 문서에 머무는 동안 전환을 걷고 현행본으로 돌아온다 — 저장본은 바꾸지 않아(퍼블 범위)
 *   문서를 바꾸면 예약이 다시 보인다(편집 초안과 같다). 예약이 없으면 지금 화면 그대로(예시 0건 — data 주석)
 *
 * ## 알려진 한계
 * 문서를 바꾸면 **저장하지 않은 본문은 사라진다.** 원본도 같다(경고 없음).
 * ====================================================================== */

export interface TermsAdminPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function TermsAdminPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: TermsAdminPageProps) {
  const { toast } = useToast();

  /* 저장은 알림만이라 저장본은 원본 그대로 읽는다 — 로컬인 것은 선택과 편집 초안뿐 */
  const terms = TERMS;
  const [selectedId, setSelectedId] = useState(TERMS[0]?.id ?? "");
  const [draft, setDraft] = useState(TERMS[0]?.body ?? "");
  /* 시행일 — 판정 Q15. 기본 오늘+7, 「중요 변경」이면 +30 */
  const [important, setImportant] = useState(false);
  const [effectiveAt, setEffectiveAt] = useState(() => effectiveDefault(false));
  /* 예약(개정 예정본) — 판정 Q15. 있을 때만 전환 · [예약 취소] 는 이 문서에 머무는 동안만 걷는다 */
  const [showScheduled, setShowScheduled] = useState(false);
  const [scheduleCanceled, setScheduleCanceled] = useState(false);

  const current = terms.find((doc) => doc.id === selectedId);
  const schedule = scheduleCanceled ? undefined : current?.scheduled;
  const viewingScheduled = schedule !== undefined && showScheduled;

  /** 문서 전환 — 편집기는 언제나 **고른 문서의 저장된 본문**에서 다시 시작한다 */
  const selectDoc = (id: string) => {
    setSelectedId(id);
    setDraft(terms.find((doc) => doc.id === id)?.body ?? "");
    setImportant(false);
    setEffectiveAt(effectiveDefault(false));
    setShowScheduled(false);
    setScheduleCanceled(false);
  };

  const cancelSchedule = () => {
    setScheduleCanceled(true);
    setShowScheduled(false);
  };

  const toggleImportant = (next: boolean) => {
    setImportant(next);
    setEffectiveAt(effectiveDefault(next));
  };

  const save = () => {
    if (!current) return;
    if (draft.trim() === "") {
      toast({ message: MESSAGES.needBody, tone: "critical" });
      return;
    }
    // 저장본이 비어 있으면 "등록", 있으면 "수정" (원본 규칙). 저장본·최종 수정일은 바꾸지 않는다
    toast(MESSAGES.saved(current.body === ""));
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
      header={<PageHeader title="약관 관리" />}
    >
      {/*
        2단 배치 — 좌 280 고정 / 우 나머지.
        `min-w-0` 이 없으면 긴 본문이 편집 카드를 밀어내 좌측 목록이 찌그러진다.
      */}
      <div className="flex items-start gap-6">
        <Card className="w-70 shrink-0">
          {/* 원본 헤더는 `약관 목록 N종` — 건수가 제목 바로 옆, "총"이 붙지 않는다 */}
          <CardHeader>
            <div className="flex items-center gap-2">
              <h3 className="heading-medium-bold text-text">약관 목록</h3>
              <span className="body-small text-text-sub">{terms.length}종</span>
            </div>
          </CardHeader>
          <CardBody>
            {/* 항목 간격 4 — 카드 본문 블록(20)이 아니라 리스트 내부 리듬이다 */}
            <ul aria-label="약관 문서 목록" className="flex flex-col gap-1">
              {terms.map((doc) => {
                const selected = doc.id === selectedId;
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      aria-current={selected ? "true" : undefined}
                      onClick={() => selectDoc(doc.id)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-small px-3 py-2 text-left",
                        "transition-[background-color] duration-100 ease-in-out",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
                        selected
                          ? // 약한 선택 = tonal (design-core.md "선택 상태 2종")
                            "bg-action-primary-tonal"
                          : "bg-transparent hover:bg-action-secondary-hover",
                      )}
                    >
                      {/* 선택 항목만 굵게(원본 3202) · 긴 이름은 단어 단위로 줄바꿈 */}
                      <span
                        className={cn(
                          "min-w-0 break-keep wrap-anywhere text-text",
                          selected ? "label-medium-bold" : "label-medium",
                        )}
                      >
                        {doc.name}
                      </span>
                      {/*
                        원본은 좌측에 **필수만** 표시한다(`선택` 은 붙지 않는다).
                        ⚠️ 색은 원본을 옮기지 않는다 — 원본은 `b-warn` 이지만
                        필수/선택은 **상태가 아니라 분류**라 상태색을 쓰지 않는다
                        (`screen-templates.md` §3-1 "분류 배지").
                      */}
                      {/* 메타는 오른쪽 끝에 고정(원본 `term-item-meta` flex-shrink:0) */}
                      <span className="flex shrink-0 items-center gap-1.5">
                        {doc.required && <Tag size="small">필수</Tag>}
                        {/* 미작성은 분류가 아니라 **처리할 상태**라 경고색(원본 warn) */}
                        {doc.body === "" && (
                          <span className="label-small-bold text-text-warning">
                            미작성
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <Card className="min-w-0 flex-1">
          {current === undefined ? (
            <CardBody>
              {/*
                `size="section"` 이다 — 다른 28곳은 `table`(표 자리의 빈 상태)이지만
                여기는 **표가 아니라 카드 안 영역**이라 표 규격이 맞지 않는다.
              */}
              <EmptyState
                size="section"
                icon={<FileWarning strokeWidth={1.2} aria-hidden />}
                title="등록된 약관이 없습니다"
                description="약관 문서가 하나도 없어 편집할 대상이 없습니다."
              />
            </CardBody>
          ) : (
            <>
              {/* 원본 우측 헤더 = 문서 이름 + 필수/선택 배지 + 최종 수정일 */}
              <CardHeader
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {current.name}
                    {/* 필수↔선택은 대등한 분류다 — 한쪽만 칠하지 않는다 (§3-1) */}
                    <Tag size="small">{current.required ? "필수" : "선택"}</Tag>
                  </span>
                }
                action={
                  <span
                    className={cn(
                      "body-small",
                      current.updatedAt === ""
                        ? "text-text-warning"
                        : "text-text-sub",
                    )}
                  >
                    {updatedText(current)}
                  </span>
                }
              />
              <CardBody>
                {/* 예약이 있을 때만 — 보기 전환이라 본문 위(회원 상세 결제 구분과 같은 자리·크기) */}
                {schedule && (
                  <SegmentedControl
                    aria-label={SCHEDULE_COPY.switchLabel}
                    items={[
                      { value: "current", label: SCHEDULE_COPY.current },
                      { value: "scheduled", label: SCHEDULE_COPY.scheduled },
                    ]}
                    value={viewingScheduled ? "scheduled" : "current"}
                    onValueChange={(value) =>
                      setShowScheduled(value === "scheduled")
                    }
                  />
                )}
                {schedule && viewingScheduled ? (
                  <>
                    {/* 개정 예정본은 읽기만 — 회신은 전환과 [예약 취소] 까지만 정했다 */}
                    <FormField label="약관 내용">
                      <Textarea minRows={12} value={schedule.body} readOnly />
                    </FormField>
                    {/* 시행일은 예약에서 가장 중요한 값 — 흐린 비활성 칸 대신 읽는 값(기본 글자색)으로 */}
                    <InfoList>
                      <InfoItem label={EFFECTIVE_COPY.label}>
                        <span className="tabular-nums">
                          {dotDate(schedule.effectiveAt)}
                        </span>
                      </InfoItem>
                    </InfoList>
                  </>
                ) : (
                  <>
                    <FormField label="약관 내용" required>
                      <Textarea
                        minRows={12}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={`${current.name} 내용을 입력하세요.`}
                      />
                    </FormField>
                    <FormField label={EFFECTIVE_COPY.label} required>
                      <DatePicker
                        className="w-60"
                        value={effectiveAt}
                        /* 필수 — 고른 날을 다시 눌러 지우는 것은 받지 않는다 */
                        onChange={(next) => next && setEffectiveAt(next)}
                        disabledDates={{ before: TODAY }}
                        defaultMonth={effectiveAt}
                      />
                    </FormField>
                    {/* Checkbox 는 루트가 이미 `<label>` 이라 FormField 로 감싸지 않는다 */}
                    <Checkbox
                      label={EFFECTIVE_COPY.important}
                      checked={important}
                      onChange={(event) =>
                        toggleImportant(event.target.checked)
                      }
                    />
                  </>
                )}
              </CardBody>
              <CardFooter>
                {viewingScheduled ? (
                  <Button variant="secondary" onClick={cancelSchedule}>
                    {SCHEDULE_COPY.cancel}
                  </Button>
                ) : (
                  /* 원본은 본문이 비어 있으면 `등록`, 있으면 `수정 저장` 이다 */
                  <Button onClick={save}>
                    {current.body === "" ? "등록" : "수정 저장"}
                  </Button>
                )}
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
