import {
  createContext,
  useContext,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../../lib/cn";

/**
 * 계정 줄 내용의 공급처. 값이 `undefined` 면 "Provider 가 없다"와 같다.
 * 밖으로 내보내지 않는다 — 읽는 곳은 `AppShell` 하나뿐이다.
 */
const TopBarContext = createContext<ReactNode>(undefined);

export interface AppShellProviderProps {
  /** 아래 모든 `AppShell` 이 받을 계정 줄 내용. 없으면 줄 없음 */
  topBar?: ReactNode;
  children: ReactNode;
}

/**
 * 앱 진입점에서 계정 줄 내용을 **한 번** 넣는다 — 아래 모든 `AppShell` 이 받아 그린다.
 *
 * 화면마다 `topBar` 를 넘기게 하면 **넘긴 화면에서만 보이고 나머지에서는 조용히 사라진다**
 * (GNB 로고가 실제로 그랬다). 그래서 넣는 곳을 진입점 하나로 묶는다.
 */
export function AppShellProvider({ topBar, children }: AppShellProviderProps) {
  return <TopBarContext value={topBar}>{children}</TopBarContext>;
}

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 사이드바(GNB) 슬롯. 셸은 GNB를 직접 import하지 않고 노드로만 받는다 —
   * 셸이 특정 내비게이션 구현에 묶이지 않아야 다른 앱에 그대로 이식된다.
   *
   * 넘기는 노드는 **자기 폭·높이를 스스로 책임진다**. DESIGN.md §0의
   * GNB 규격(`min-width: 60px` · `height: 100dvh` · `flex-shrink: 0`)이
   * 그대로 살아야 축소 모드의 `position: absolute` 부유 동작이 깨지지 않으므로,
   * 셸은 래퍼 div로 감싸지 않고 그대로 렌더한다.
   */
  sidebar?: ReactNode;
  /**
   * 페이지 헤더 슬롯. `PageHeader`를 넣는 자리다.
   * 본문 좌우 gutter 바깥(콘텐츠 컬럼 최상단)에 놓여, 헤더가 자기 gutter를
   * 직접 갖는 DESIGN.md §24 구조를 그대로 따른다.
   */
  header?: ReactNode;
  /**
   * 계정 줄(콘텐츠 열 맨 위 · `header` 위) 내용.
   *
   * **화면에서 넘기지 않는다** — `AppShellProvider` 가 진입점에서 한 번 넣는다.
   * 안 넘기면 Provider 값을 쓰고, Provider 도 없으면 줄 자체를 그리지 않는다(빈 48 을 남기지 않는다).
   * `null` 을 넘기면 Provider 가 있어도 그 화면만 줄을 끈다 — 화면이 이 prop 을 쓰는 유일한 경우다.
   */
  topBar?: ReactNode;
  /**
   * 본문 최대폭 (CSS 길이값, 예: `"1100px"`).
   *
   * **기본은 제한 없음(100%)** 이다 — DESIGN.md §0. 레거시 대시보드는
   * `max-width: 1100px`를 썼으나 신규 Clay 셸에는 해당 제한이 없어,
   * 폭 제한이 필요한 페이지에서만 개별로 지정한다.
   * 값은 페이지마다 다른 런타임 값이라 클래스가 아니라 인라인 스타일로 건다.
   */
  maxWidth?: CSSProperties["maxWidth"];
  /** 본문 콘텐츠 */
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * DESIGN.md §0 앱 셸 레이아웃 — 사이드바(고정폭) + 콘텐츠(`flex: 1`)의 가로 배치.
 *
 * ```
 * ┌────────────┬──────────────────────────────────────┐
 * │  GNB       │  계정 줄      h 48 · gutter 40 (선택) │
 * │  224 / 60  ├──────────────────────────────────────┤
 * │  100dvh    │  PageHeader   min-h 72 · gutter 40   │
 * │            ├──────────────────────────────────────┤
 * │            │  콘텐츠 (flex:1)                      │
 * └────────────┴──────────────────────────────────────┘
 * ```
 *
 * ## 계정 줄 (`topBar`) — 규격은 유추(§24 PageHeader · §1 Button small · §26 Avatar small)
 *
 * 틀(높이 48 · 좌우 40 · 오른쪽 정렬 · 아래 선)은 셸이 그리고 내용만 받는다 —
 * PageHeader 와 축을 맞추는 값을 한 곳에서 보장하려는 것이다.
 * - 아래 선은 **안쪽 그림자**다(PageHeader 와 같은 방식). `border` 로 그리면 높이가 49 가 된다
 * - `<header>` 가 아니라 이름 있는 `region` 이다 — PageHeader 가 이미 `<header>` 라 banner 가 둘이 된다
 * - 고정하지 않는다(스크롤과 함께 올라간다) — 어떤 화면도 PageHeader 를 sticky 로 쓰지 않는다
 * - 내용은 계정뿐이다. 제목·검색·알림을 얹으면 PageHeader 와 역할이 겹친다
 *
 * ## 구조
 *
 * ```tsx
 * <AppShell
 *   sidebar={<Gnb />}
 *   header={<PageHeader title="주문 관리" actions={<Button>등록</Button>} />}
 * >
 *   <section>…</section>
 * </AppShell>
 * ```
 */
export function AppShell({
  sidebar,
  header,
  topBar,
  maxWidth,
  className = "",
  children,
  ref,
  ...props
}: AppShellProps) {
  const providedTopBar = useContext(TopBarContext);
  /* `undefined`(안 넘김)만 Provider 로 넘어간다 — `null` 은 "이 화면은 끈다"는 뜻이라 그대로 둔다 */
  const bar = topBar === undefined ? providedTopBar : topBar;

  return (
    <div
      ref={ref}
      className={cn(
        // 사이드바가 100dvh라 셸도 최소 한 화면은 차지해야 배경이 끊기지 않는다
        "flex min-h-dvh bg-bg",
        className,
      )}
      {...props}
    >
      {sidebar}

      {/*
        콘텐츠 컬럼.
        `min-w-0`이 없으면 테이블처럼 넓은 자식이 flex 기본 `min-width: auto`를
        밀고 나가 셸 전체에 가로 스크롤이 생긴다.
      */}
      <div data-slot="content" className="flex min-w-0 flex-1 flex-col">
        {bar != null && bar !== false && (
          <div
            role="region"
            aria-label="로그인 계정"
            data-slot="top-bar"
            className="flex h-12 shrink-0 items-center justify-end bg-surface px-10 shadow-[inset_0_-1px_0_0_var(--color-border)]"
          >
            {bar}
          </div>
        )}

        {header}

        {/*
          본문 — 좌우 gutter 40(`--size-page-gutter`) · 세로 24.
          섹션 사이 간격은 24다 (DESIGN_참고.md §4 "섹션 사이").
          `mx-auto`는 maxWidth가 지정됐을 때만 의미를 갖는다(기본은 제한 없음).
        */}
        <main
          data-slot="body"
          className="mx-auto flex w-full flex-1 flex-col gap-6 px-10 py-6"
          style={{ maxWidth }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
