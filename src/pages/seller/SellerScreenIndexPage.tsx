import { ArrowRight } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  PageHeader,
  Tag,
} from "../../components/ui";
import { SellerGnb } from "./SellerGnb";
import {
  SELLER_SCREENS,
  SELLER_TYPE_TONE,
  type SellerScreenEntry,
} from "./SellerScreenIndexPage.data";

/* =========================================================================
 * 셀러 화면 목록 — 본사 `ScreenIndexPage` 를 복사해 셀러 데이터로 바꾼 것.
 *
 * 본사 화면을 import 해 props 로 갈라 쓰지 않는 이유: 두 앱은 **따로 전달된다**
 * (`export:publishing --app`). 공용으로 묶으면 한쪽 전달본이 다른 쪽 GNB·데이터를 끌고 간다.
 *
 * 본사와 다른 점: 카드에 원본 **화면 코드**(SO-*)를 보이고, 아직 만들지 않은 화면은
 * 파일 자리에 「퍼블 작업 전」을 쓴다. 나머지(카드 꼴·버튼 이름 규칙·4열)는 본사와 같다.
 * ====================================================================== */

const TITLE = "베이비큐브 입점사 어드민";

function ScreenCard({
  screen,
  onOpen,
}: {
  screen: SellerScreenEntry;
  onOpen: () => void;
}) {
  const { name, code, type, summary, file, icon: Icon } = screen;

  return (
    <Card>
      <CardBody>
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <span className="flex flex-wrap items-center gap-1">
              <Tag tone={SELLER_TYPE_TONE} size="small">
                {type}
              </Tag>
              {code && (
                <span className="body-small text-text-minimal">{code}</span>
              )}
            </span>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-medium bg-surface-sub text-icon-sub">
              <Icon size={20} strokeWidth={1.2} aria-hidden />
            </span>
          </div>

          <strong className="heading-medium-bold text-text">{name}</strong>
          <span className="body-small break-keep text-text-sub">{summary}</span>
          <span className="body-small text-text-minimal break-all">
            {file ?? "퍼블 작업 전"}
          </span>
        </div>

        {/* 「열기」만 두면 접근가능 이름이 전부 같아진다 — 화면 이름을 붙인다(본사와 같은 규칙) */}
        <Button
          variant="secondary"
          fullWidth
          onClick={onOpen}
          aria-label={`${TITLE} · ${name} 열기`}
        >
          열기
          <ArrowRight size={16} strokeWidth={1.2} aria-hidden />
        </Button>
      </CardBody>
    </Card>
  );
}

export interface SellerScreenIndexPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function SellerScreenIndexPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerScreenIndexPageProps) {
  return (
    <AppShell
      sidebar={
        <SellerGnb
          activeId={activeNav}
          onSelect={onNavSelect}
          open={navOpen}
          onOpenChange={onNavOpenChange}
        />
      }
      header={
        <PageHeader
          title="화면 목록"
          badges={
            <Tag tone="default" size="small">
              {SELLER_SCREENS.length}개
            </Tag>
          }
        />
      }
    >
      <section aria-label={TITLE} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="heading-medium-bold text-text">{TITLE}</h2>
          <p className="body-small text-text-sub">
            유아용품 렌트·판매 멀티셀러 마켓플레이스의 입점사(셀러) 운영 어드민.
            원본 기획에서 가져온 것은 도메인 내용뿐이고 색·레이아웃·간격은 전부
            이 저장소의 토큰이다(본사 어드민과 같은 톤).
          </p>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {SELLER_SCREENS.map((screen) => (
            <ScreenCard
              key={screen.navId}
              screen={screen}
              onOpen={() => onNavSelect(screen.navId)}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
