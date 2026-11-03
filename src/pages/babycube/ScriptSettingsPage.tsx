import { useState } from "react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  Divider,
  FormField,
  Gnb,
  PageHeader,
  Textarea,
  useToast,
} from "../../components/ui";
import { SAVED_SCRIPTS, SCRIPT_FIELDS } from "./ScriptSettingsPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 스크립트 관리 — 뼈대 (BabyCube 본사 운영 어드민 · BO-SYS-005)
 *
 * ## 화면 유형: 설정형 폼 (원본 `SCREENS.scripts` proto.html:3826~3837)
 * 목록·상세가 없다 — 추적 태그는 건수를 세는 대상이 아니라 «어느 자리에 무엇이
 * 붙어 있나»가 전부다(원본 이력 annotations.js:92 · proto.html:3795~3799).
 *
 * ```
 * [카드 하나 · 제목 없음]
 *   헤더 스크립트  (</head> 직전에 출력)   textarea   도움말
 *   ─────────
 *   바디 스크립트  (<body> 직후에 출력)    textarea   도움말
 *   ─────────
 *   푸터 스크립트  (</body> 직전에 출력)   textarea   도움말
 *                                   [변경 사항 저장]   ← 하단 고정 바 (오른쪽 하나)
 * ```
 *
 * ## 그대로 두는 것
 * 1. **간격을 페이지가 지정하지 않는다** — 카드 24는 `AppShell` gap-6,
 *    필드 20은 `CardBody` gap-5, 라벨↔입력 6은 `FormField` gap-1.5
 * 2. **필드를 데이터로 빼지 않는다** — 세 필드가 전부 Textarea 라 `map` 을 돌리고 싶어지지만
 *    그 순간 폼 DSL 이 된다. 문구만 `ScriptSettingsPage.data.ts` 에서 온다
 * 3. **입력칸은 고정폭 글꼴**(`font-code` — 원본 정책 annotations.js:93 · CSS proto.html:583).
 *    내부 `<textarea>` 에 준다(`textareaClassName`). 래퍼에 주면 내부의 `label-medium` 이
 *    글꼴을 Pretendard 로 되돌린다. 크기·행간은 프리셋 그대로
 *
 * ## 저장 — 하단 고정 바 오른쪽 [변경 사항 저장] 하나 (2026-11-03 사용자 결정)
 * 원본(`nv-bar` sticky · 왼쪽 비움, proto.html:3835~3836)과 형제 폼·상세(공지·FAQ·회원·셀러…)가
 * 전부 하단 바라 그쪽으로 옮겼다. 한때 머리 오른쪽에 두었던 결정(폼형 템플릿과 통일)은
 * 이 결정으로 **대체됐다** — 머리에 다시 두지 말 것. 설정 화면(`SettingsPage`)과 함께 움직인다.
 * 왼쪽에 [목록]·[취소]·dirty 안내를 만들지 않는다(원본에 없다).
 *
 * ## 원본 정책 (annotations.js:92~94)
 * - 세 칸을 **한 번에** 저장하고 「저장되었습니다.」 알림. 칸별 저장·되돌리기 없음
 * - 형식 검증·정규화 없음 — 업체가 준 코드를 그대로 둔다. 비운 칸 = 그 자리에 아무것도 넣지 않음
 * - 코드를 **실행하지 않는다**(임의 스크립트 실행은 XSS 통로) — 값은 textarea 의 문자열일 뿐이다.
 *   그래서 「적용 중」 배지도 없다. 미리보기·주입을 더하지 말 것
 *
 * ## 퍼블 범위
 * [변경 사항 저장]은 알림만. 화면을 떠나면 편집값은 저장값으로 돌아온다(화면 간 상태 유지 안 함).
 *
 * ## 기획 확인 필요 (원본대로 둠)
 * - 칸마다 「출력 위치 꼬리표 + 안내 한 줄」은 annotations.js:93 에만 있고 원본 코드는 라벨만
 *   그린다(proto.html:3829~3832). 정책 문구 쪽을 따라 그렸다
 * - 「어드민에는 넣지 않는다」 화면 안내(proto.html:3833)는 `note()` 가 비어(proto.html:1941)
 *   원본에서도 보이지 않는다
 * ====================================================================== */

export interface ScriptSettingsPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 내부 textarea 에 주는 고정폭 글꼴 — `src/styles/tokens.css` 의 `--font-code` */
const CODE_FONT = "font-code";

export function ScriptSettingsPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: ScriptSettingsPageProps) {
  const { toast } = useToast();

  const [header, setHeader] = useState(SAVED_SCRIPTS.header);
  const [body, setBody] = useState(SAVED_SCRIPTS.body);
  const [footer, setFooter] = useState(SAVED_SCRIPTS.footer);

  /* 원본 `scriptSetSave` — 세 칸을 한 번에, 검증 없이. 퍼블 범위라 알림만 */
  const save = () => toast("저장되었습니다.");

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
      header={<PageHeader title="스크립트 관리" />}
    >
      {/* 원본 카드에는 제목이 없다 — 필드 3개가 곧 내용이다 */}
      <Card variant="soft">
        <CardBody>
          <FormField
            label={SCRIPT_FIELDS.header.label}
            labelDescription={SCRIPT_FIELDS.header.position}
            description={SCRIPT_FIELDS.header.help}
          >
            <Textarea
              minRows={5}
              textareaClassName={CODE_FONT}
              value={header}
              onChange={(event) => setHeader(event.target.value)}
              placeholder={SCRIPT_FIELDS.header.placeholder}
            />
          </FormField>

          {/* 삽입 위치가 바뀌는 지점을 눈으로 끊어 준다(원본 `.scr-field` 아래 선) */}
          <Divider />

          <FormField
            label={SCRIPT_FIELDS.body.label}
            labelDescription={SCRIPT_FIELDS.body.position}
            description={SCRIPT_FIELDS.body.help}
          >
            <Textarea
              minRows={5}
              textareaClassName={CODE_FONT}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={SCRIPT_FIELDS.body.placeholder}
            />
          </FormField>

          <Divider />

          <FormField
            label={SCRIPT_FIELDS.footer.label}
            labelDescription={SCRIPT_FIELDS.footer.position}
            description={SCRIPT_FIELDS.footer.help}
          >
            <Textarea
              minRows={5}
              textareaClassName={CODE_FONT}
              value={footer}
              onChange={(event) => setFooter(event.target.value)}
              placeholder={SCRIPT_FIELDS.footer.placeholder}
            />
          </FormField>
        </CardBody>
      </Card>

      {/* 하단 액션 바 (원본 `nv-bar`) — 화면 아래에 붙는다. 왼쪽은 비어 있다 */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-end gap-2">
          <Button onClick={save}>변경 사항 저장</Button>
        </div>
      </Card>
    </AppShell>
  );
}
