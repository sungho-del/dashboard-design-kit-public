import { ArrowRight } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  Gnb,
  PageHeader,
  Tag,
} from "../components/ui";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "./gnbSections";
import {
  SCREENS,
  TYPE_TONE,
  type ScreenEntry,
  type ScreenOrigin,
} from "./ScreenIndexPage.data";

/* =========================================================================
 * 화면 목록 — 이 저장소에 무엇이 있는지 한눈에 보는 진입 화면
 *
 * ## 다른 페이지와 성격이 다르다
 * 서비스 화면이 아니라 **저장소 자체의 색인**이다. 그래서 템플릿 4종의 유형
 * (목록형·상세형·통계형·폼형) 어디에도 속하지 않는다 — 이걸 Stage 5 의 다섯 번째
 * 템플릿으로 오해하지 말 것.
 *
 * ## 왜 만들었나
 * 1. **상세형 2종은 GNB 로 갈 수 없다** — 목록 → 행 클릭 → 미리보기 모달 → 버튼을
 *    거쳐야 열린다(의도된 구조다. 상세는 "어느 건"이 정해져야 하므로 메뉴가 될 수 없다).
 *    확인만 하려는 사람에게는 이 경로가 번거롭다.
 * 2. **전 화면을 한 장에서 연다** — 확인·대조할 때 메뉴를 뒤지지 않게 한다.
 *    (화면 생성기의 원본인 템플릿 4종은 여기 없다 — `/_template/*` 로만 연다)
 *
 * ## 카드를 통째로 클릭하게 만들지 않은 이유
 * `Card` 는 `<div>` 다. `<div onClick>` 은 키보드로 접근할 수 없어 이 프로젝트가
 * 금지하는 패턴이고(design-qa 검사 항목), `role="button"` + `tabIndex` 를 손으로
 * 다는 것보다 **버튼을 하나 두는 편이 정직하다.**
 * ====================================================================== */

const ORIGIN_META: Record<
  ScreenOrigin,
  { title: string; description: string }
> = {
  babycube: {
    title: "BabyCube 본사 어드민",
    description:
      "유아용품 렌트·판매 멀티셀러 마켓플레이스의 본사 운영 어드민. 화면 간 숫자와 상태 어휘가 서로 맞물린다. 원본 기획에서 가져온 것은 도메인 내용뿐이고 색·레이아웃·간격은 전부 이 저장소의 토큰이다.",
  },
};

function ScreenCard({
  screen,
  originTitle,
  onOpen,
}: {
  screen: ScreenEntry;
  /** 카드가 속한 묶음 이름 — 버튼의 접근가능 이름을 유일하게 만드는 데 쓴다 */
  originTitle: string;
  onOpen: () => void;
}) {
  const { name, type, summary, file, entryNote, icon: Icon } = screen;

  return (
    <Card>
      <CardBody>
        {/*
          카드 안의 정보 묶음은 gap 8 로 촘촘히 둔다.
          `CardBody` 의 gap-5(20)는 "정보 묶음 ↔ 액션" 사이에만 걸리게 한다.
        */}
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <Tag tone={TYPE_TONE} size="small">
              {type}
            </Tag>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-medium bg-surface-sub text-icon-sub">
              <Icon size={20} strokeWidth={1.2} aria-hidden />
            </span>
          </div>

          <strong className="heading-medium-bold text-text">{name}</strong>
          <span className="body-small text-text-sub">{summary}</span>

          {/* 소스를 찾아갈 단서 — 이 화면의 독자는 개발자·기획자다.
              경로는 띄어쓰기가 없어 줄이 안 바뀐다 — 긴 파일명이 카드 밖으로 나가지 않게 아무 데서나 꺾는다 */}
          <span className="body-small text-text-minimal break-all">{file}</span>

          {entryNote && (
            <span className="body-small text-text-minimal">{entryNote}</span>
          )}
        </div>

        {/*
          ⚠️ 라벨을 `"열기"` 로만 두면 **접근가능 이름이 같은 버튼이 36개**가 되어
          스크린리더로 구별할 수 없다. 그래서 `aria-label` 로 이름을 넓힌다
          (글자는 짧게 두는 편이 카드 안에서 읽기 좋다).

          **묶음 이름까지 앞에 붙이는 이유**: 화면 이름만으로는 부족하다 —
          이 목록은 세 도메인을 한 자리에 모아 두므로 "대시보드" 같은 이름이 겹친다.
          이름을 바꿔 피할 수도 있지만, 그러면 **원본 기획서의 문구가 훼손된다.**
          출처를 접두로 두면 화면 이름은 원본 그대로 두면서 유일성이 보장된다.
        */}
        <Button
          variant="secondary"
          fullWidth
          onClick={onOpen}
          aria-label={`${originTitle} · ${name} 열기`}
        >
          열기
          <ArrowRight size={16} strokeWidth={1.2} aria-hidden />
        </Button>
      </CardBody>
    </Card>
  );
}

export interface ScreenIndexPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function ScreenIndexPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: ScreenIndexPageProps) {
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
          title="화면 목록"
          badges={
            <Tag tone="default" size="small">
              {SCREENS.length}개
            </Tag>
          }
        />
      }
    >
      {/*
        ⚠️ 화면이 하나도 없는 묶음은 건너뛴다 — 설명만 있고 카드가 없는 빈 섹션이 뜨지 않게.
      */}
      {(["babycube"] as const)
        .filter((o) => SCREENS.some((s) => s.origin === o))
        .map((origin) => {
          const meta = ORIGIN_META[origin];
          const items = SCREENS.filter((s) => s.origin === origin);

          return (
            <section
              key={origin}
              aria-label={meta.title}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1">
                <h2 className="heading-medium-bold text-text">{meta.title}</h2>
                <p className="body-small text-text-sub">{meta.description}</p>
              </div>

              {/*
              4열 고정. **한 도메인이 몇 화면으로 펼쳐지는지**를 보여주는 것이 목적이다.
            */}
              <div className="grid grid-cols-4 gap-6">
                {items.map((screen) => (
                  <ScreenCard
                    key={screen.navId}
                    screen={screen}
                    originTitle={meta.title}
                    onOpen={() => onNavSelect(screen.navId)}
                  />
                ))}
              </div>
            </section>
          );
        })}
    </AppShell>
  );
}
