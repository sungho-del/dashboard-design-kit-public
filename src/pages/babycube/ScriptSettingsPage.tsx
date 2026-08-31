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
 * S27 스크립트 관리 — 뼈대
 *
 * ## 화면 유형: 폼형 (`src/pages/ProductFormPage.tsx` 변형)
 * 판정 근거 — `purpose` 가 "외부 스크립트를 삽입 위치별로 저장하는 **단일 폼 화면**",
 * `components` 가 `Card`·`FormField`·`Textarea`·`Button` 뿐이고 `Table` 이 없다.
 * §2 신호표 폼형 행.
 *
 * ## 폼형 템플릿에서 상속한 것 (`screen-templates.md` §3-4)
 * 1. **카드 = 섹션** — 삽입 위치 3곳이 한 덩어리라 카드 하나에 담고 `Divider` 로 나눈다
 * 2. **간격을 페이지가 지정하지 않는다** — 카드 24는 `AppShell` gap-6,
 *    필드 20은 `CardBody` gap-5, 라벨↔입력 6은 `FormField` gap-1.5
 * 3. **에러가 도움말을 대체한다** — 이 화면엔 필수 필드가 없어 도움말만 산다
 * 4. **필드를 데이터로 빼지 않는다** — 세 필드가 전부 Textarea 라 `map` 을 돌리고 싶어지지만
 *    그 순간 폼 DSL 이 된다. 문구만 `ScriptSettingsPage.data.ts` 에서 온다
 *
 * ## 저장 버튼은 **상단 헤더 우측**이다 (원본과 다른 곳 · 사용자 결정)
 * 원본 어드민과 기획서 S27 은 **하단 고정 바**를 쓴다. 한때 그대로 만들었으나
 * `ProductFormPage`(폼형 템플릿)는 저장을 `PageHeader` 에 두고 있어,
 * **한 저장소에 저장 위치가 둘**이 되었다 — 화면마다 어디를 눌러야 하는지 다시 찾게 된다.
 * 그래서 템플릿 쪽으로 통일했다. 되돌리려면 두 화면을 함께 되돌린다.
 *
 * ## 갈아끼울 것
 * | 갈아끼울 것       | 위치                                    |
 * | ----------------- | --------------------------------------- |
 * | 필드 문구·초기값  | `ScriptSettingsPage.data.ts`            |
 * | 필드 구성         | 이 파일의 `FormField` 3개               |
 * | 저장 동작         | `save()`                                |
 *
 * ## 원본 어드민(`/scripts`) 대조 결과
 * 원본은 **카드 하나 + 하단 바** 가 전부다. 필드마다
 * `라벨(굵게) + 출력 위치(옅게)` → `textarea` → `도움말` 순서이고, 저장 버튼은
 * 하단 바 **오른쪽 끝**에 `변경 사항 저장` 하나뿐이다. 저장 성공 토스트는 `저장되었습니다.`
 *
 * ⚠️ 원본에 없어서 걷어낸 것 — **되살리지 말 것**
 * 1. **카드 제목("스크립트 삽입")과 `저장 전` 배지** — 원본 카드에는 헤더가 없다
 * 2. **하단 바 좌측의 "저장하지 않은 변경이 있습니다." 문구** — 원본의 `nv-bar-l` 은 **비어 있다**.
 *    문구가 없으므로 dirty 판정 자체가 화면에 쓰이지 않아 상태도 함께 지웠다
 * 3. **변경이 없을 때 저장 버튼 비활성화** — 원본은 저장 중에만 잠근다
 * 4. **PageHeader 도움말 툴팁**
 * ====================================================================== */

export interface ScriptSettingsPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

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

  /* 원본은 세 값을 그대로 PATCH 한다 — 내용 검증도, 변경 여부 판정도 없다 */
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
      header={
        <PageHeader
          title="스크립트 관리"
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
            <Button onClick={save}>변경 사항 저장</Button>
          }
        />
      }
    >
      {/* 원본 카드에는 제목이 없다 — 필드 3개가 곧 내용이다 */}
      <Card>
        <CardBody>
          <FormField
            label={SCRIPT_FIELDS.header.label}
            labelDescription={SCRIPT_FIELDS.header.position}
            description={SCRIPT_FIELDS.header.help}
          >
            <Textarea
              minRows={5}
              value={header}
              onChange={(event) => setHeader(event.target.value)}
              placeholder={SCRIPT_FIELDS.header.placeholder}
            />
          </FormField>

          {/* 삽입 위치가 바뀌는 지점을 눈으로 끊어 준다 */}
          <Divider />

          <FormField
            label={SCRIPT_FIELDS.body.label}
            labelDescription={SCRIPT_FIELDS.body.position}
            description={SCRIPT_FIELDS.body.help}
          >
            <Textarea
              minRows={5}
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
              value={footer}
              onChange={(event) => setFooter(event.target.value)}
              placeholder={SCRIPT_FIELDS.footer.placeholder}
            />
          </FormField>
        </CardBody>
      </Card>
    </AppShell>
  );
}
