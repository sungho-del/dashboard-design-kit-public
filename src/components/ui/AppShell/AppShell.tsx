import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../../lib/cn";

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
 * │  GNB       │  PageHeader   min-h 72 · gutter 40   │
 * │  224 / 60  ├──────────────────────────────────────┤
 * │  100dvh    │  콘텐츠 (flex:1)                      │
 * └────────────┴──────────────────────────────────────┘
 * ```
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
  maxWidth,
  className = "",
  children,
  ref,
  ...props
}: AppShellProps) {
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
