import { useState } from "react";
import { FileWarning } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  EmptyState,
  FormField,
  Gnb,
  PageHeader,
  Tag,
  Textarea,
  useToast,
} from "../../components/ui";
import { TERMS, updatedText, ymd, type TermsDoc } from "./TermsAdminPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";
import { cn } from "../../lib/cn";

/* =========================================================================
 * S26 약관 관리 — 뼈대
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
 * 규칙이다. 여기서는 목록형 신호 자체가 약하다 — 표로 만들면 5행짜리 표 하나에
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
 * - 좌측 헤더는 `약관 목록 N종` — "총"이 붙지 않는다
 * - 좌측 항목은 **이름 + `필수` 배지(필수일 때만) + `미작성`** 이 전부다.
 *   `선택` 배지도 최종 수정일도 좌측에는 없다 — 둘 다 **우측 헤더**가 든다
 * - 우측 헤더는 `약관 편집` 같은 고정 제목이 아니라 **고른 문서의 이름**이고,
 *   그 옆에 `필수`/`선택` 배지, 오른쪽 끝에 `최종 수정 YYYY-MM-DD` 또는 `미작성`
 * - 본문 placeholder 는 `{문서 이름} 내용을 입력하세요.`
 * - 저장 버튼은 **본문이 있으면 `수정 저장`, 비어 있으면 `등록`**
 * - 저장 토스트는 `약관이 등록되었습니다.` / `약관이 수정되었습니다.`
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
 * ## 알려진 한계
 * 문서를 바꾸면 **저장하지 않은 본문은 사라진다.** 원본도 같다(`setDraft(null)`).
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

  const [terms, setTerms] = useState<TermsDoc[]>(TERMS);
  const [selectedId, setSelectedId] = useState(TERMS[0]?.id ?? "");
  const [draft, setDraft] = useState(TERMS[0]?.body ?? "");

  const current = terms.find((doc) => doc.id === selectedId);

  /** 문서 전환 — 편집기는 언제나 **고른 문서의 저장된 본문**에서 다시 시작한다 */
  const selectDoc = (id: string) => {
    setSelectedId(id);
    setDraft(terms.find((doc) => doc.id === id)?.body ?? "");
  };

  const save = () => {
    if (!current) return;
    if (draft.trim() === "") {
      toast({ message: "약관 내용을 입력해주세요.", tone: "critical" });
      return;
    }

    // 저장 전 본문이 비어 있었으면 "등록", 있었으면 "수정"이다 (원본 규칙)
    const firstWrite = current.body === "";
    setTerms((prev) =>
      prev.map((doc) =>
        doc.id === current.id ? { ...doc, body: draft, updatedAt: ymd() } : doc,
      ),
    );
    toast(`약관이 ${firstWrite ? "등록" : "수정"}되었습니다.`);
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
          {/* 원본 헤더는 `약관 목록 N종` — "총"이 붙지 않는다 */}
          <CardHeader
            title="약관 목록"
            action={
              <span className="body-small text-text-sub">{terms.length}종</span>
            }
          />
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
                        "flex w-full cursor-pointer flex-wrap items-center gap-1 rounded-small px-3 py-2 text-left",
                        "transition-[background-color] duration-100 ease-in-out",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
                        selected
                          ? // 약한 선택 = tonal (design-core.md "선택 상태 2종")
                            "bg-action-primary-tonal"
                          : "bg-transparent hover:bg-action-secondary-hover",
                      )}
                    >
                      <span className="label-medium-bold text-text">
                        {doc.name}
                      </span>
                      {/*
                        원본은 좌측에 **필수만** 표시한다(`선택` 은 붙지 않는다).
                        ⚠️ 색은 원본을 옮기지 않는다 — 원본은 `b-warn` 이지만
                        필수/선택은 **상태가 아니라 분류**라 상태색을 쓰지 않는다
                        (`screen-templates.md` §3-1 "분류 배지").
                      */}
                      {doc.required && <Tag size="small">필수</Tag>}
                      {doc.body === "" && (
                        <span className="body-small text-text-sub">미작성</span>
                      )}
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
                  <span className="body-small text-text-sub">
                    {updatedText(current)}
                  </span>
                }
              />
              <CardBody>
                <FormField label="약관 내용" required>
                  <Textarea
                    minRows={12}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={`${current.name} 내용을 입력하세요.`}
                  />
                </FormField>
              </CardBody>
              <CardFooter>
                {/* 원본은 본문이 비어 있으면 `등록`, 있으면 `수정 저장` 이다 */}
                <Button onClick={save}>
                  {current.body === "" ? "등록" : "수정 저장"}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
