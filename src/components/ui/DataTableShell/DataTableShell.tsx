import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../../lib/cn";

export interface DataTableShellProps extends HTMLAttributes<HTMLElement> {
  /**
   * 툴바 영역에 그대로 펼쳐지는 노드. Fragment로 여러 개를 넘기면
   * 각각이 툴바 flex의 직접 자식이 된다.
   * 좌/우 분할이 필요하면 `toolbarStart`·`toolbarEnd`를 쓴다(함께 써도 된다).
   */
  toolbar?: ReactNode;
  /** 툴바 좌측 — 상태 필터(SegmentedControl·Tabs) 자리 */
  toolbarStart?: ReactNode;
  /** 툴바 우측 — 검색·기간·액션 자리 */
  toolbarEnd?: ReactNode;
  /** 표 본문. `<Table>`을 그대로 넣는다 */
  children?: ReactNode;
  /**
   * 표시할 행이 없는 상태. true면 `children` 대신 `empty`를 렌더하고
   * 푸터(페이지네이션)·더보기 슬롯을 감춘다. **툴바는 그대로 유지**된다 —
   * 필터를 바꿔 다시 찾을 수 있어야 하기 때문이다.
   */
  isEmpty?: boolean;
  /** 빈 상태 노드. `<EmptyState size="table">`을 넣는다 (DESIGN.md §16) */
  empty?: ReactNode;
  /**
   * 데이터를 기다리는 상태. true면 `children`·`empty` 대신 `loading`을 렌더하고
   * 본문 컨테이너에 **`aria-busy="true"`** 를 건다. 푸터·더보기는 감춘다.
   *
   * **우선순위는 `loading` > `empty` 다** — 로딩이 끝나기 전에 "없음"을 그리지
   * 않는다(DESIGN-dashboard.md §D8-2). 아직 안 온 것을 없다고 말하면 신뢰가 깨진다.
   *
   * **로딩 중에도 툴바는 유지**된다(`isEmpty`와 같은 이유 — 조건을 되돌릴 수단이
   * 있어야 한다).
   *
   * ⚠️ **갱신(refetch)에는 쓰지 않는다.** 이미 그려진 표를 스켈레톤으로 되돌리면
   * 레이아웃이 튀고 **포커스가 사라진다**(§D8-1). 이전 렌더를 낮은 불투명도로 유지한다.
   */
  isLoading?: boolean;
  /**
   * 로딩 노드. `<Skeleton>` 으로 짠 표 뼈대를 넣는다.
   *
   * **시간이 처방을 정한다** (DESIGN-dashboard.md §D8-1):
   * `< 1s` 표시자를 넣지 않는다 · `1~10s` **스켈레톤** · `> 10s` 진행률 표시.
   * 지연 판단은 **호출부의 몫**이다 — 스켈레톤 부품에 타이머를 넣으면 수십 개가
   * 따로 돌아 화면이 튄다.
   *
   * 열 폭은 `<colgroup>` 이 정본이므로 로딩 뼈대도 **같은 `<colgroup>` 을 쓴다.**
   * 폭을 다시 추측하면 로드 후 레이아웃 시프트가 난다.
   */
  loading?: ReactNode;
  /** 하단 슬롯 — `<Pagination>` 자리. 좌우 24 패딩만 셸이 담당한다 */
  footer?: ReactNode;
  /**
   * 페이지네이션 대신 쓰는 "더보기" 슬롯. 높이 48 · 가로 100% 행이 된다.
   * `footer`와 함께 쓰지 않는다 — 둘 중 하나만 고른다.
   */
  loadMore?: ReactNode;
  /**
   * 스크롤 래퍼에만 붙는 className. sticky 헤더용 높이 제한
   * (`max-h-150` 등)에 쓴다. **패딩은 절대 주지 말 것** — 아래 주석 참고.
   *
   * ⚠️ `<TableHead sticky>` 를 쓸 거면 **여기에 `max-h-*` 를 반드시 준다.**
   * 이 래퍼가 곧 sticky 의 스크롤포트인데, 높이 제한이 없으면 세로로 스크롤할 것이
   * 없어 헤더가 붙지 않는다. 바깥 `<section>` 이 `overflow-hidden` 이라
   * 페이지 스크롤이 대신 걸려 주지도 않는다 — 아무 일도 일어나지 않는다.
   */
  bodyClassName?: string;
  /**
   * 좌측 고정 열의 총 폭(px). 넘기면 가로 스크롤바가 **그 폭만큼 들여서** 그려진다.
   *
   * 고정 열이 있는 표에서 스크롤바가 표 전체 폭에 깔리면 **"이 바를 당기면 고정 열도
   * 움직이겠지"** 로 읽히는데 실제로는 안 움직인다 — 바의 범위와 실제 스크롤 범위가
   * 어긋난다. 원본 어드민은 표를 둘로 쪼개(`frozen-left`/`frozen-right`) 이 문제를
   * 피하지만, 그러면 **행 hover 가 반쪽만 걸리고 스크린리더가 표 두 개로 읽는다.**
   * 그래서 표는 하나로 두고 **스크롤바만 옮긴다** (아래 프록시 바).
   *
   * 값은 `<colgroup>` 고정 열들의 폭 합이다 — `FROZEN_TH` 의 마지막 오프셋 + 그 열 폭.
   * 넘기지 않으면 이 기능은 통째로 꺼진다(기존 동작 그대로).
   */
  scrollLeadWidth?: number;
  /**
   * **우측** 고정 열의 총 폭(px). 있으면 스크롤바를 그만큼 앞에서 끊는다.
   * 상품 관리처럼 `관리` 열을 오른쪽에 붙여 둔 표에서, 바가 그 아래까지 깔리면
   * 좌측과 같은 오해가 오른쪽에서도 생긴다. `scrollLeadWidth` 와 함께 쓴다.
   */
  scrollTrailWidth?: number;
  /** 스크롤 위치 제어·측정용. React 19는 ref를 일반 prop으로 받는다 */
  ref?: Ref<HTMLElement>;
}

/**
 * 목록 화면의 표준 골격. (DESIGN.md §7-1 테이블 셸)
 *
 * 레퍼런스에서 같은 셸이 5개 파일에 중복 정의돼 있던 것을 하나로 합친 컴포넌트다.
 * 구성은 3단이다 — 툴바(p-6) · 표 래퍼(패딩 0 + overflow-auto) · 푸터(px-6).
 *
 * **표 래퍼에 패딩을 주지 않는 것이 이 컴포넌트의 존재 이유다.**
 * 셀이 이미 `first:pl-6`/`last:pr-6`(24)를 갖고 있어(§7) 그 24가 곧 컨테이너
 * 가장자리 정렬이 된다. 래퍼에 패딩을 더하면 좌우만 48이 되어 툴바(24)와
 * 첫 컬럼이 어긋나고, zebra 줄무늬도 좌우 끝까지 차지 않는다.
 * 같은 이유로 이 셸은 `Card`(p-6)로 감싸지 않는다.
 *
 * 표면은 Card와 같은 규칙이다 — 그림자 없이 `outline` + 음수 offset으로
 * 경계를 낸다. (DESIGN_참고.md §5)
 *
 * **다만 경계선은 `::after` 오버레이로 그린다.** `outline-offset: -1px`는 선을
 * 박스 **안쪽 1px 띠**에 그리는데, 이 셸은 자손이 그 띠를 불투명 배경으로 덮는
 * 유일한 컨테이너다 — `<thead>`/`<th>`의 `bg-surface`, `<tr>`의 zebra 배경이
 * 좌우 끝까지 차기 때문이다(줄무늬가 가장자리까지 가야 한다는 §7의 의도라
 * 겹침 자체는 없앨 수 없다). 그 결과 표 구간에서만 좌우 세로선이 지워진다.
 * 오버레이는 배치 자손(positioned)이라 표 배경보다 뒤에 그려지므로 선이 살아난다.
 * Card는 자식에 배경이 없어 같은 문제가 없고, 그래서 Card는 그대로 둔다.
 */
export function DataTableShell({
  toolbar,
  toolbarStart,
  toolbarEnd,
  children,
  isEmpty = false,
  empty,
  isLoading = false,
  loading,
  footer,
  loadMore,
  bodyClassName = "",
  scrollLeadWidth,
  scrollTrailWidth = 0,
  className = "",
  ref,
  ...props
}: DataTableShellProps) {
  const proxyOn = typeof scrollLeadWidth === "number" && scrollLeadWidth > 0;
  /** 바가 차지하는 가로 구간에서 빠지는 폭 — 좌우 고정 열의 합 */
  const inset = (scrollLeadWidth ?? 0) + scrollTrailWidth;

  const bodyRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);
  /** 프록시 안쪽 더미의 폭 = 표의 실제 폭. 표가 바뀌면 따라 바뀐다 */
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    const body = bodyRef.current;
    if (!proxyOn || !body) return;

    const sync = () => setScrollWidth(body.scrollWidth);
    sync();

    /* 열 폭·행 수가 바뀌면 표 폭도 바뀐다. jsdom 에는 없으므로 있을 때만 쓴다 */
    const Observer = window.ResizeObserver;
    const observer = Observer ? new Observer(sync) : null;
    observer?.observe(body);
    return () => observer?.disconnect();
  }, [proxyOn, children, isEmpty, isLoading]);

  /**
   * 두 스크롤러를 서로 물린다.
   *
   * 무한 되돌림은 **값이 이미 같으면 아무것도 하지 않는 것**으로 끊는다 —
   * A 가 B 를 밀면 B 의 scroll 이벤트가 뒤따르는데, 그때는 두 값이 같으므로
   * B 의 핸들러가 A 를 다시 밀지 않는다. 잠금 변수도 타이머도 필요 없다.
   * (한때 `requestAnimationFrame` 으로 푸는 잠금을 뒀는데, 프레임이 돌기 전에는
   *  반대 방향이 통째로 막혀 동기 코드에서 한쪽만 동작했다.)
   *
   * ⚠️ 프록시 바는 **폭이 0 이어도 항상 렌더**되어야 한다. 폭을 잰 뒤에야 그리면
   * 이 effect 가 처음 돌 때 `proxyRef.current` 가 `null` 이라 그냥 빠져나가고,
   * 그 뒤로 다시 붙지 않아 **리스너 없는 바**가 남는다 — 끌어도 표가 안 움직이고,
   * 표를 굴려도 바가 안 따라온다. (실제로 그렇게 만들었다가 고쳤다.)
   */
  useEffect(() => {
    const body = bodyRef.current;
    const proxy = proxyRef.current;
    if (!proxyOn || !body || !proxy) return;

    const follow = (from: HTMLElement, to: HTMLElement) => () => {
      if (to.scrollLeft === from.scrollLeft) return;
      to.scrollLeft = from.scrollLeft;
    };

    const onBody = follow(body, proxy);
    const onProxy = follow(proxy, body);
    body.addEventListener("scroll", onBody, { passive: true });
    proxy.addEventListener("scroll", onProxy, { passive: true });
    return () => {
      body.removeEventListener("scroll", onBody);
      proxy.removeEventListener("scroll", onProxy);
    };
  }, [proxyOn, scrollWidth]);

  const hasToolbar =
    toolbar != null || toolbarStart != null || toolbarEnd != null;

  /*
    본문 우선순위 — **loading > empty > children** (§D8-2).
    아직 안 온 것을 "없다"고 말하면 신뢰가 깨진다. 로딩이 끝나기 전에는
    빈 상태를 그리지 않는다.
  */
  const body = isLoading ? loading : isEmpty ? empty : children;
  /** 표가 자리에 없는 상태 — 푸터·더보기·프록시 바가 함께 꺼지는 조건 */
  const bodyless = isLoading || isEmpty;

  return (
    <section
      ref={ref}
      data-table-shell
      className={cn(
        "relative overflow-hidden rounded-medium bg-surface",
        // 경계선 오버레이. sticky thead(z-2)보다 위여야 헤더 구간도 이어진다.
        "after:pointer-events-none after:absolute after:inset-0 after:z-3 after:content-['']",
        "after:rounded-medium after:outline-1 after:-outline-offset-1 after:outline-border",
        className,
      )}
      {...props}
    >
      {hasToolbar && (
        // 헤더 영역 — flex · gap 8 · space-between · 패딩 24 (§7-1)
        // 좁은 폭에서 좌/우 그룹이 두 줄로 접히도록 flex-wrap을 준다.
        <div
          data-table-shell-toolbar
          className="flex flex-wrap items-center justify-between gap-2 p-6"
        >
          {toolbar}
          {toolbarStart != null && (
            // 필터 래퍼 — 데스크톱 fit-content / 모바일 100% (§7-1)
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-fit">
              {toolbarStart}
            </div>
          )}
          {toolbarEnd != null && (
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-fit">
              {toolbarEnd}
            </div>
          )}
        </div>
      )}

      {/*
        표 래퍼 — width 100% · overflow auto · **패딩 없음** (§7-1).
        빈 상태·로딩도 이 안에 렌더한다. 가로 스크롤이 있는 표에서
        `<EmptyState sticky>`가 화면 중앙에 머무르려면 같은 스크롤
        컨테이너 안에 있어야 하기 때문이다.
      */}
      <div
        ref={bodyRef}
        data-table-shell-body
        /*
          로딩 사실은 **여기서 한 번만** 말한다. 스켈레톤 하나하나가
          `role="status"` 를 갖는 대신(그러면 "로딩 중"이 수십 번 낭독된다)
          컨테이너가 `aria-busy` 로 알린다 — `Button` 이 이미 쓰는 문법이다.
          false 를 문자열로 남기지 않으려고 꺼진 상태에서는 속성 자체를 뺀다.
        */
        aria-busy={isLoading || undefined}
        className={cn(
          "w-full overflow-auto",
          /* 프록시 바를 쓸 때는 표 자신의 가로 스크롤바를 감춘다 — 바가 둘이면 안 된다.
             세로 스크롤(sticky 헤더 화면)은 그대로 남는다 */
          proxyOn && "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          bodyClassName,
        )}
      >
        {body}
      </div>

      {/*
        프록시 가로 스크롤바 — 고정 열 폭만큼 들여서 그린다.

        빈 div 하나를 표 폭만큼 늘려 두고 `overflow-x: auto` 를 준 것이다.
        **네이티브 스크롤바**라 키보드·터치·트랙패드가 그대로 동작하고,
        표 위에서 하는 가로 스크롤도 위 래퍼가 그대로 받는다(둘을 서로 물려 뒀다).
        표를 쪼개지 않으므로 행 hover 도, 스크린리더가 읽는 표 구조도 그대로다.
      */}
      {proxyOn && (
        <div
          ref={proxyRef}
          data-table-shell-scrollbar
          aria-hidden
          className="overflow-x-auto overflow-y-hidden"
          style={{ marginLeft: scrollLeadWidth, marginRight: scrollTrailWidth }}
        >
          {/*
            ⚠️ 폭이 0 이어도 **엘리먼트는 항상 둔다.** 폭을 잰 뒤에야 렌더하면
            동기화 effect 가 처음 돌 때 `proxyRef.current` 가 `null` 이라 그냥
            빠져나가고, 그 뒤로 다시 붙지 않아 **리스너 없는 바**가 남는다.
            폭 0 이면 스크롤할 것이 없어 바도 안 보이므로 있어도 해가 없다.
          */}
          {/*
            더미 폭 = 표 폭 − 고정 구간. 그래야 바의 최대 이동량이 표와 **정확히 같다** —
            바의 이동 가능 폭은 `(표폭 − inset) − (컨테이너폭 − inset)` 이라 inset 이 상쇄되어
            표의 `scrollWidth − clientWidth` 와 일치한다. 어긋나면 끝까지 끌어도 끝이 안 나온다.
          */}
          <div
            style={{
              width: bodyless ? 0 : Math.max(0, scrollWidth - inset),
              height: 1,
            }}
          />
        </div>
      )}

      {/*
        푸터 — 좌우 24만 셸이 담당한다. 상하 16은 Pagination 자신이 갖는다(§8).
        빈 상태에서 페이지네이션·더보기를 남겨두면 "결과 없음" 아래에
        페이지 번호가 붙으므로 함께 감춘다. **로딩도 같다** — 총 페이지 수를
        아직 모르는데 번호를 그리면 로드 후 그 숫자가 바뀐다.
      */}
      {!bodyless && footer != null && (
        <div data-table-shell-footer className="px-6">
          {footer}
        </div>
      )}

      {!bodyless && loadMore != null && (
        // 더보기 버튼 — width 100% · height 48 · center (§7-1)
        <div
          data-table-shell-more
          className="flex h-12 w-full items-center justify-center"
        >
          {loadMore}
        </div>
      )}
    </section>
  );
}
