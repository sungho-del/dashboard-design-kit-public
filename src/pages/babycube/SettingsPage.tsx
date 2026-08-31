import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormField,
  Gnb,
  Input,
  PageHeader,
  useToast,
} from "../../components/ui";
import {
  FIELD_COPY,
  REQUIRED_KEYS,
  SAVED_SETTINGS,
  SECTIONS,
  type SectionId,
  type SettingKey,
} from "./SettingsPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";
import { cn } from "../../lib/cn";

/* =========================================================================
 * S28 설정 — 뼈대
 *
 * ## 화면 유형: 폼형 (`src/pages/ProductFormPage.tsx` 변형)
 * 판정 근거 — `purpose` 가 "…를 접이식 섹션으로 관리하는 **폼 화면**",
 * `components` 가 `Card`·`FormField`·`Input`·`Button` 이고 `Table` 이 없다. §2 폼형 행.
 *
 * ## 폼형 템플릿에서 상속한 것 (`screen-templates.md` §3-4)
 * 1. **카드 = 섹션** — 판매자·푸터정보 / 고객 센터 두 덩어리
 * 2. **간격을 페이지가 지정하지 않는다** — 카드 24는 `AppShell` gap-6,
 *    필드 20은 `CardBody` gap-5, 라벨↔입력 6은 `FormField` gap-1.5
 *
 * ## 템플릿에서 더한 것 — **섹션 접기/펼치기**
 * `Accordion` 컴포넌트는 33종에 없다(DESIGN.md §21 은 규격만 있고 구현이 없다).
 * 새로 만들지 않고 `Card` + 헤더 버튼으로 짰다 — §21 이 "시각 스타일이 없는 순수 구조
 * 컴포넌트"라고 못박고 있어, 표면을 이미 가진 `Card` 위에 얹으면 규격이 그대로 성립한다.
 * - 제목 줄 전체가 버튼이다(`<h3><button aria-expanded>`) — 셰브런만 누를 수 있으면 좁다
 * - 셰브런은 펼침 시 180° 회전 · 0.2s ease-in-out (§21)
 * - **접힌 섹션은 DOM 에서 뺀다.** `hidden` 속성은 `CardBody` 의 `flex` 유틸이 이겨
 *   먹히지 않는다(같은 `display` 속성을 두 규칙이 다툰다). 값은 이 컴포넌트의
 *   `values` 에 있어 접었다 펴도 사라지지 않는다
 * - `aria-controls` 는 쓰지 않는다 — 접히면 가리킬 요소가 사라져 참조가 끊긴다.
 *   `aria-expanded` 만으로 disclosure 패턴이 성립한다
 *
 * ## 원본 어드민(`/settings`) 대조 결과
 * 원본은 접이식 섹션 2개 + 하단 바 하나다. 섹션은 기본 **펼침**이다.
 *
 * 원본과 맞춘 것:
 * - **섹션 순서 — `판매자 / 푸터정보` 가 먼저**, `고객 센터 정보` 가 나중이다
 *   (기획서 S28 은 반대로 적었지만 원본이 정본이다)
 * - 판매자 필드 순서 — 회사명 · 사업자 등록 번호 · 대표자명 · 전화 번호 · 주소
 * - 고객 센터 필드 순서 — 상담 전화 번호 · 업무 시간 · 점심 시간(**여기만 선택**)
 * - 섹션 안내(`nv-help`)는 **필드 아래**에 붙는다. 원본 문장 그대로
 * - 저장 버튼 문구는 `저장` 이다(스크립트 화면의 `변경 사항 저장` 과 다르다).
 *   **위치는 원본의 하단 바가 아니라 상단 헤더 우측이다** — 사용자 결정으로 폼형 템플릿과 통일
 * - 저장 토스트 `설정이 저장되었습니다.`
 * - 입력마다 `maxLength` 가 있다(회사명 40 · 번호류 20 · 주소·시간 80)
 *
 * ⚠️ 원본에 없어서 걷어낸 것 — **되살리지 말 것**
 * 1. **필수값 검증과 그에 딸린 것 전부** — 원본은 값을 그대로 PATCH 하고 판정은
 *    서버가 한다. 클라이언트 검증이 없으니 `touched`·필드 에러·
 *    "빠진 항목이 든 섹션 자동 펼침"·`SECTION_OF` 도 함께 지웠다.
 *    ⚠️ `설정을 저장하지 못했습니다.` 는 **서버 오류 문구**다 — 검증 실패 문구로 쓰지 말 것
 * 2. **하단 바 좌측 문구와 `저장 전` 배지** — 원본 `nv-bar-l` 은 비어 있다
 * 3. **변경이 없을 때 저장 버튼 비활성화** — 원본은 저장 중에만 잠근다
 * 4. **대표자명·사업자 등록 번호 2열 병치와 그 아래 `Divider`** — 원본은 한 줄에 하나씩이다
 * 5. **PageHeader 도움말 툴팁**
 *
 * ## 원본과 의도적으로 다른 곳 (하나뿐이다)
 * 원본 `주소` 는 **한 행에 입력 2개**(도로명 / 상세·우편번호)다. 여기서는 필드를 둘로
 * 나눴다 — `FormField` 는 자식 하나에만 `id` 를 이어 주므로 입력 두 개를 한 필드에
 * 넣으면 **둘째 입력에 이름이 붙지 않는다.** 둘째 라벨은 원본 placeholder 문구를 썼다.
 * ====================================================================== */

interface SectionCardProps {
  section: SectionId;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * 접이식 섹션 카드.
 * 페이지 밖으로 내보내지 않는다 — 이 화면의 레이아웃 조각이지 디자인 시스템 컴포넌트가 아니다.
 */
function SectionCard({ section, open, onToggle, children }: SectionCardProps) {
  const { title, guide } = SECTIONS[section];
  const [guideBefore, guideStrong, guideAfter] = guide;

  return (
    <Card>
      <CardHeader>
        <h3>
          <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className={cn(
              "flex w-full cursor-pointer items-center justify-between gap-3 rounded-small text-left",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
            )}
          >
            <span className="heading-medium-bold text-text">{title}</span>
            <ChevronDown
              size={20}
              strokeWidth={1.2}
              aria-hidden
              className={cn(
                "shrink-0 text-icon-sub",
                "transition-transform duration-200 ease-in-out",
                open && "rotate-180",
              )}
            />
          </button>
        </h3>
      </CardHeader>
      {open && (
        <CardBody>
          {children}
          {/* 원본 `nv-help` 는 필드 **아래**에 온다 — 값이 어디에 나가는지 알린다 */}
          <p className="body-small text-text-sub">
            {guideBefore}
            <b className="body-small-bold text-text">{guideStrong}</b>
            {guideAfter}
          </p>
        </CardBody>
      )}
    </Card>
  );
}

export interface SettingsPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function SettingsPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SettingsPageProps) {
  const { toast } = useToast();

  const [values, setValues] = useState(SAVED_SETTINGS);
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    seller: true,
    customer: true,
  });

  const change = (key: SettingKey) => (event: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: event.target.value }));

  const isRequired = (key: SettingKey) => REQUIRED_KEYS.includes(key);

  /* 원본은 아홉 값을 그대로 PATCH 한다 — 클라이언트 검증이 없다 */
  const save = () => toast("설정이 저장되었습니다.");

  /** 필드 하나. 라벨·placeholder·글자 수 제한이 전부 `FIELD_COPY` 에서 온다 */
  const field = (key: SettingKey, inputMode?: "tel" | "numeric") => (
    <FormField label={FIELD_COPY[key].label} required={isRequired(key)}>
      <Input
        value={values[key]}
        onChange={change(key)}
        placeholder={FIELD_COPY[key].placeholder}
        maxLength={FIELD_COPY[key].max}
        inputMode={inputMode}
      />
    </FormField>
  );

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
          title="설정"
          /*
            저장은 **상단 헤더 우측**이다 — 폼형 템플릿(`ProductFormPage`)과 같은 자리.
            원본 어드민은 하단 고정 바를 쓰지만, 한 저장소에 저장 위치가 둘이면
            화면마다 어디를 눌러야 하는지 다시 찾아야 한다. **사용자 결정으로 통일했다.**
          */
          actions={
            /*
              size 를 주지 않는다 = `medium`(40). `PageHeader` 에 버튼을 두는 다른 14개
              화면이 전부 기본값이다. `large`(48)는 **하단 고정 바** 시절의 값이었고,
              바는 세로 여백이 넉넉한 독립 영역이라 맞았지만 헤더(min-h 72)에서는 과하다.
            */
            <Button onClick={save}>저장</Button>
          }
        />
      }
    >
      {/* ⚠️ 판매자 섹션이 **먼저**다 (원본 순서) */}
      <SectionCard
        section="seller"
        open={open.seller}
        onToggle={() => setOpen((prev) => ({ ...prev, seller: !prev.seller }))}
      >
        {field("company")}
        {field("bizNumber", "numeric")}
        {field("ceo")}
        {field("phone", "tel")}
        {field("roadAddress")}
        {field("detailAddress")}
      </SectionCard>

      <SectionCard
        section="customer"
        open={open.customer}
        onToggle={() =>
          setOpen((prev) => ({ ...prev, customer: !prev.customer }))
        }
      >
        {field("centerPhone", "tel")}
        {field("workHours")}
        {field("lunchHours")}
      </SectionCard>
    </AppShell>
  );
}
