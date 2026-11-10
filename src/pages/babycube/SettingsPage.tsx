import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormField,
  Gnb,
  IconButton,
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

/* =========================================================================
 * 설정 — 뼈대 (BabyCube 본사 운영 어드민 · BO-SYS-002)
 *
 * ## 화면 유형: 설정형 폼 (원본 `SCREENS.settings` proto.html:4137~4155 · 4124~4127 주석)
 *
 * ```
 * 판매자 / 푸터정보   ← 회사명* · 사업자 등록 번호* · 대표자명* · 주소*(도로명 / 상세·우편번호) ·
 *                      통신판매업 신고번호 · 이메일 · 호스팅서비스 (판정 Q18 — 대표 번호는 상담 전화 번호로 통합)
 *                      안내 「사용자 앱 푸터의 사업자 정보로 노출됩니다.」
 * 고객 센터 정보      ← 상담 전화 번호* · 업무 시간* · 점심 시간
 *                      안내 「사용자 앱 고객센터·주문 문의 안내에 노출됩니다.」
 *                                              [저장]   ← 하단 고정 바 (오른쪽 하나)
 * ```
 *
 * | 갈아끼울 것             | 위치                                      |
 * | ----------------------- | ----------------------------------------- |
 * | 문구·저장값·글자 수     | `SettingsPage.data.ts`                    |
 * | 구획·필드 구성·입력 폭  | 이 파일의 `Section` 두 장과 `field()` 호출 |
 *
 * ## 그대로 두는 것
 * 1. **구획 = 접을 수 있는 카드**(형제 공지·FAQ·셀러 상세의 `Section` 과 같은 꼴 —
 *    soft 카드 · 머리 오른쪽 접기 아이콘 버튼). 기본 **펼침**, 접으면 본문을 DOM 에서 뺀다
 * 2. **편집값은 페이지(`values`)에 있다** — 구획 안으로 옮기면 접었다 펼 때 값이 사라진다
 * 3. **간격을 페이지가 지정하지 않는다** — 카드 24는 `AppShell` gap-6,
 *    필드 20은 `CardBody` gap-5, 라벨↔입력 6은 `FormField` gap-1.5
 * 4. **입력 폭 상한은 원본 값**(`setInput` 4번째 인자) — 회사명 280 · 번호·대표자 240 ·
 *    주소 두 칸 각 420 · 업무/점심 520. 폭은 레이아웃이라 뼈대에 둔다.
 *    판정 Q18 새 칸(원본 없음)은 신고번호 320(확정 값이 잘리지 않게) · 이메일·호스팅 280(회사명과 같게)
 * 5. 안내(`nv-help`)는 구획 **아래**(필드 뒤)에 붙는다
 *
 * ## 저장 — 화면 전체 [저장] 하나 = 두 구획 한 번에 (구획별 저장 없음 · proto.html:4134~4135)
 * **하단 고정 바 오른쪽**에 둔다(2026-11-03 사용자 결정 — 원본 `nv-bar` 와 형제 폼·상세가 전부 하단 바).
 * 한때 머리 오른쪽에 두었던 결정은 이 결정으로 **대체됐다** — 머리에 다시 두지 말 것.
 * 스크립트 관리(`ScriptSettingsPage`)와 함께 움직인다. 왼쪽에 [목록]·[취소]를 만들지 않는다.
 * 원본 `setSave` 는 검증 없이 「설정이 저장되었습니다.」 — 필수 표시는 표시일 뿐 저장을 막지 않는다.
 *
 * ## 퍼블 범위
 * [저장]은 알림만. 화면을 떠나면 편집값·접힘은 처음으로 돌아온다(원본 `PFOPEN` 전역 유지는 안 옮긴다).
 *
 * ## 원본과 의도적으로 다른 곳
 * 1. 원본 `주소` 는 **한 행에 입력 2개**(도로명 / 상세·우편번호)다. 여기서는 필드를 둘로
 *    나눴다 — `FormField` 는 자식 하나에만 `id` 를 이어 주므로 입력 두 개를 한 필드에
 *    넣으면 **둘째 입력에 이름이 붙지 않는다.** 둘째 라벨은 원본 placeholder 문구를 썼다
 * 2. 구획 제목 옆 필수 ●(원본 `nvSec {req:true}`)는 그리지 않는다 — 형제 `Section` 과 같다
 * 3. 라벨은 위, 입력은 아래(키트 폼 규격 §29). 원본은 라벨 160px 왼쪽 열
 *
 * ## 기획 확인 필요 (원본대로 둠)
 * - 화면 주석(annotations.js:91·95~96)은 옛 설정 화면(운영 정책 기본값 표·관리자 계정·「메뉴 임시 숨김」)을
 *   설명한다 — 지금 원본 코드의 2구획 폼과 다르다. 코드를 정본으로 두고 옛 항목을 되살리지 않는다
 *   (안심케어 금액은 셀러 정산 화면, 수수료율은 셀러별, 개인정보 처리방침은 약관 관리 소관)
 * ====================================================================== */

/** 접을 수 있는 구역 한 장 — 공지 폼·셀러 상세와 같은 규격 */
function Section({
  section,
  open,
  onToggle,
  children,
}: {
  section: SectionId;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { title, guide } = SECTIONS[section];
  const [guideBefore, guideStrong, guideAfter] = guide;

  return (
    <Card variant="soft">
      <CardHeader
        title={title}
        action={
          <IconButton
            variant="ghost"
            size="small"
            label={`${title} ${open ? "접기" : "펼치기"}`}
            aria-expanded={open}
            onClick={onToggle}
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
        <CardBody>
          {children}
          {/* 원본 `nv-help` 는 필드 **아래**에 온다 — 값이 어디에 나가는지 알린다 */}
          <p className="body-small text-text-sub">
            {guideBefore}
            <b className="body-small-bold text-text">{guideStrong}</b>
            {guideAfter}
          </p>
        </CardBody>
      ) : null}
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
  const toggle = (section: SectionId) => () =>
    setOpen((prev) => ({ ...prev, [section]: !prev[section] }));

  const change = (key: SettingKey) => (event: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: event.target.value }));

  /* 원본 `setSave` — 두 구획 한 번에, 검증 없이. 퍼블 범위라 알림만 */
  const save = () => toast("설정이 저장되었습니다.");

  /**
   * 필드 하나. 라벨·placeholder·글자 수 제한은 `FIELD_COPY`, 폭 상한은 여기서(원본 px → 4px 단위).
   * 클래스 문자열을 그대로 써야 Tailwind 스캔이 잡는다 — 조립하지 말 것
   */
  const field = (key: SettingKey, widthClass: string, tel = false) => (
    <FormField
      label={FIELD_COPY[key].label}
      required={REQUIRED_KEYS.includes(key)}
    >
      <Input
        className={widthClass}
        value={values[key]}
        onChange={change(key)}
        placeholder={FIELD_COPY[key].placeholder}
        maxLength={FIELD_COPY[key].max}
        inputMode={tel ? "tel" : undefined}
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
      header={<PageHeader title="설정" />}
    >
      {/* ⚠️ 판매자 구획이 **먼저**다 (원본 순서) */}
      <Section section="seller" open={open.seller} onToggle={toggle("seller")}>
        {field("company", "max-w-70")}
        {field("bizNumber", "max-w-60")}
        {field("ceo", "max-w-60")}
        {field("roadAddress", "max-w-105")}
        {field("detailAddress", "max-w-105")}
        {/* 판정 Q18 새 칸 — 「판매자 / 푸터정보」 구획 끝(확인 요청 답 37번) · 필수 · 확정 값(반영 결과 답(2026-11-10) §3) */}
        {field("mailOrderNo", "max-w-80")}
        {field("email", "max-w-70")}
        {field("hosting", "max-w-70")}
      </Section>

      <Section
        section="customer"
        open={open.customer}
        onToggle={toggle("customer")}
      >
        {field("centerPhone", "max-w-60", true)}
        {field("workHours", "max-w-130")}
        {field("lunchHours", "max-w-130")}
      </Section>

      {/* 하단 액션 바 (원본 `nv-bar`) — 화면 아래에 붙는다. 왼쪽은 비어 있다 */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-end gap-2">
          <Button onClick={save}>저장</Button>
        </div>
      </Card>
    </AppShell>
  );
}
