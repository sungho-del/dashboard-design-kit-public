import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "../../../lib/cn";
import { useFocusTrap } from "../../../lib/useFocusTrap";
import { IconButton } from "../IconButton";

/* -------------------------------------------------------------------------
 * 스크롤 위치 기억
 * ---------------------------------------------------------------------- */

/**
 * 메뉴 영역의 스크롤 위치. **모듈 스코프에 둔다 — 리마운트를 넘어 살아남아야 한다.**
 *
 * ## 왜 필요한가
 *
 * 화면 37개가 **각자 자기 `<Gnb>` 를 렌더**하고, `App.tsx` 는 경로가 바뀌면
 * `<Screen {...nav} />` 를 **다른 컴포넌트 타입으로 교체**한다. React 는 그때
 * 이전 페이지를 통째로 언마운트하므로 그 안의 `Gnb` 도 새 DOM 으로 다시 태어난다 —
 * 스크롤을 내려 아래쪽 메뉴를 고르면 **새 GNB 는 맨 위를 보여준다.**
 *
 * 근본 해법은 `Gnb` 를 `App` 으로 끌어올리는 것이지만 37개 페이지의 계약이 걸린다.
 * 여기서는 **리마운트를 그대로 두고 위치만 이어 붙인다.**
 *
 * `useState` 나 ref 로는 안 된다 — 둘 다 언마운트와 함께 사라진다.
 * 새로고침하면 0 으로 돌아가는데, 그건 새 세션이므로 자연스럽다.
 */
let savedMenuScrollTop = 0;

/* -------------------------------------------------------------------------
 * 타입
 * ---------------------------------------------------------------------- */

export interface GnbMenuItem {
  id: string;
  label: string;
  /** 좌측 20×20 아이콘. depth1에서만 쓴다 (DESIGN.md §23-3) */
  icon?: ReactNode;
  /** 라벨 앞 16×16 플래그 아이콘 (국가·언어 표시 등) */
  flag?: ReactNode;
  /** 지정하면 `<a>`, 없으면 `<button>`으로 렌더링한다 */
  href?: string;
  /** 라벨 우측 배지. `<GnbBadge>` 사용 권장 */
  badge?: ReactNode;
  /** depth2 하위 메뉴. GNB는 2단까지만 지원한다 */
  items?: GnbMenuItem[];
}

export interface GnbSection {
  id: string;
  /**
   * 섹션 라벨. 확장 모드에서만 보이고, 축소 모드에서는
   * 1px 구분선으로 스왑된다 (DESIGN.md §23-4).
   */
  label?: string;
  items: GnbMenuItem[];
}

export type GnbBadgeTone =
  "count" | "countInverse" | "update" | "new" | "warning";

export interface GnbBadgeProps {
  tone?: GnbBadgeTone;
  children?: ReactNode;
  className?: string;
}

/* -------------------------------------------------------------------------
 * GnbBadge (DESIGN.md §4-1)
 * ---------------------------------------------------------------------- */

/**
 * DESIGN.md §4-1 GNB 전용 배지.
 *
 * 일반 `Tag`와 규격이 달라(20×20 고정·padding 2/6) 별도로 둔다.
 *
 * - `warning`은 원본이 `#ff5e60`을 하드코딩하지만, DESIGN.md §4-1 지시대로
 *   semantic 토큰 `surface-critical-primary`로 대체했다.
 * - `new`는 `text-promotion`(pink-500) semantic 토큰을 쓴다. Clay 원본은 primitive를
 *   직접 참조했지만, 이 프로젝트는 semantic 만 사용하는 규칙이라 토큰을 신설했다.
 * - `countInverse`는 배경이 밝은 `surface-slate-secondary`라 원본의
 *   `text-on`(흰색)을 그대로 쓰면 읽히지 않는다. `text-text`로 바꿨다.
 */
const badgeToneClasses: Record<GnbBadgeTone, string> = {
  count:
    "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-inverse px-1.5 py-0.5 text-text-on label-small-bold",
  countInverse:
    "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-slate-secondary px-1.5 py-0.5 text-text label-small-bold",
  update:
    "inline-flex items-center justify-center rounded-small bg-surface-warning-primary p-0.5 text-text-on label-xsmall",
  new: "inline-flex items-center justify-center text-text-promotion label-xsmall",
  warning:
    "inline-flex size-5 items-center justify-center rounded-full bg-surface-critical-primary px-1.5 py-0.5 text-text-on label-small-bold",
};

export function GnbBadge({
  tone = "count",
  className = "",
  children,
}: GnbBadgeProps) {
  return (
    <span className={cn("shrink-0", badgeToneClasses[tone], className)}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * 내부 클래스 상수
 * ---------------------------------------------------------------------- */

/** DESIGN.md §23-3 itemBase — 높이는 padding + 라인하이트(24)로 만든다 */
const itemBaseClasses =
  "flex w-full cursor-pointer items-center rounded-small select-none transition-[background-color] duration-100 ease-in-out";

/** depth1: padding 4/8 → 높이 32 */
const depth1ItemClasses = "justify-between gap-2 px-2 py-1";

/** depth2: padding-block 2 / padding-inline 36·12 → 높이 28 */
const depth2ItemClasses = "gap-1 py-0.5 pr-3 pl-9";

/* -------------------------------------------------------------------------
 * GnbItem (내부)
 * ---------------------------------------------------------------------- */

interface GnbItemProps {
  item: GnbMenuItem;
  depth: 1 | 2;
  active: boolean;
  /** depth2를 가진 항목의 펼침 여부. depth2를 안 가지면 undefined */
  expanded?: boolean;
  onActivate: () => void;
}

function GnbItem({ item, depth, active, expanded, onActivate }: GnbItemProps) {
  const isAccordion = expanded !== undefined;

  const content = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {item.icon ? (
          <span
            aria-hidden
            className="flex size-5 shrink-0 items-center justify-center [&>img]:size-5 [&>svg]:size-5"
          >
            {item.icon}
          </span>
        ) : null}
        <span
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1",
            active ? "label-medium-bold" : "label-medium",
          )}
        >
          {item.flag ? (
            <span
              aria-hidden
              className="mr-0.5 flex size-4 shrink-0 items-center justify-center [&>img]:size-4 [&>svg]:size-4"
            >
              {item.flag}
            </span>
          ) : null}
          <span className="truncate">{item.label}</span>
          {item.badge}
        </span>
      </span>
      {isAccordion ? (
        <ChevronDown
          aria-hidden
          strokeWidth={1.2}
          className={cn(
            "size-5 shrink-0 transition-transform duration-200 ease-in-out",
            expanded ? "rotate-180" : "rotate-0",
          )}
        />
      ) : null}
    </>
  );

  // 배경색은 한 곳에서만 방출한다 — active면 tonal 고정, 아니면 hover 반응.
  // depth2는 컨테이너가 200px 미만일 때 활성 배경을 지운다 (DESIGN.md §23-4).
  const activeBgClasses =
    depth === 2
      ? "bg-action-primary-tonal @max-[200px]:bg-transparent"
      : "bg-action-primary-tonal";

  const className = cn(
    itemBaseClasses,
    depth === 1 ? depth1ItemClasses : depth2ItemClasses,
    active ? activeBgClasses : "hover:bg-action-secondary-hover",
  );

  if (item.href && !isAccordion) {
    return (
      <a
        href={item.href}
        data-active={active}
        aria-current={active ? "page" : undefined}
        className={className}
        onClick={onActivate}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      data-active={active}
      aria-current={active ? "page" : undefined}
      aria-expanded={isAccordion ? expanded : undefined}
      className={className}
      onClick={onActivate}
    >
      {content}
    </button>
  );
}

/* -------------------------------------------------------------------------
 * Gnb
 * ---------------------------------------------------------------------- */

export interface GnbProps {
  /** 섹션 목록. 섹션 라벨이 있으면 축소 시 구분선으로 스왑된다 */
  sections: GnbSection[];
  /** 현재 활성 메뉴 id */
  activeId?: string;
  /** 메뉴 선택(하위 메뉴가 없는 항목 클릭) */
  onSelect?: (id: string) => void;
  /**
   * 확장(true) / 축소(false). 제어형이며 기본값은 확장이다.
   * `variant="drawer"`에서는 드로어의 열림 여부를 뜻한다.
   */
  open?: boolean;
  /**
   * 확장·축소 변경 요청.
   *
   * **넘기면 사이드바 하단에 접기/펼치기 토글이 자동으로 붙는다.** 드로어에서는
   * 닫기 버튼·딤 클릭에서 호출된다. 원본 CSS에는 데스크톱 접기 버튼이 아예 없어
   * (`.gnb_closeButton`은 모바일 드로어 닫기) 이 토글은 우리 확장이다.
   */
  onOpenChange?: (open: boolean) => void;
  /** 확장 상태의 풀 로고 (114 × 24) */
  logo?: ReactNode;
  /** 축소 상태의 심볼 로고 */
  collapsedLogo?: ReactNode;
  /** 로고 아래 상단 슬롯 — 사이트 선택기 등 (DESIGN.md §23-5) */
  header?: ReactNode;
  /** 데스크톱 사이드바 / 모바일 드로어 */
  variant?: "sidebar" | "drawer";
  /** `<nav>`의 접근 가능한 이름 */
  ariaLabel?: string;
  /** wrapper 오버라이드 className */
  className?: string;
}

/** 활성 항목을 자식으로 가진 아코디언은 처음부터 펼쳐둔다 */
function initialExpandedIds(
  sections: GnbSection[],
  activeId?: string,
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  if (!activeId) return next;
  for (const section of sections) {
    for (const item of section.items) {
      if (item.items?.some((child) => child.id === activeId)) {
        next[item.id] = true;
      }
    }
  }
  return next;
}

/**
 * DESIGN.md §23 GNB — 좌측 글로벌 내비게이션.
 *
 * ## 축소 모드는 왜 컨테이너 쿼리인가
 *
 * 축소(60px) 상태의 wrapper는 **hover하면 224px로 즉시 펼쳐진다**(transition 없음).
 * 이때 뷰포트 폭은 하나도 변하지 않으므로 미디어 쿼리로는 "지금 좁은가"를
 * 알 수 없다. 그래서 wrapper 자신을 컨테이너로 삼아(`@container` =
 * `container-type: inline-size`) 폭을 질의한다. (design-core.md 필수규칙 4)
 *
 * Tailwind v4 컨테이너 쿼리 변형으로 그대로 표현된다:
 *
 * | 클래스              | 컴파일 결과                     | 용도                        |
 * | ------------------- | ------------------------------- | --------------------------- |
 * | `@container`        | `container-type: inline-size`   | wrapper를 질의 컨테이너로   |
 * | `@max-[60px]:*`     | `@container (width < 60px)`     | 축소 분기                   |
 * | `@max-[200px]:*`    | `@container (width < 200px)`    | depth2 활성 배경 제거       |
 *
 * > 컨테이너 쿼리의 `width`는 **컨테이너의 content box**를 잰다.
 * > wrapper는 `px-3`(좌우 12)를 가지므로 실제 질의값은
 * > 확장 224 − 24 = **200**, 축소 60 − 24 = **36**이다.
 * > 원본 CSS의 임계값이 정확히 `200px`인 것도 같은 이유다(DESIGN.md §23-1).
 * > 즉 `@max-[60px]:`는 36 < 60(참) / 200 < 60(거짓)으로 의도대로 갈린다.
 *
 * ## 축소 시 일어나는 일
 *
 * - 풀 로고 → 심볼 로고 스왑, 로고 좌측 패딩 제거
 * - 섹션 라벨 숨김 → 같은 자리에 1px 구분선 표시
 * - depth2 리스트 숨김
 */
export function Gnb({
  sections,
  activeId,
  onSelect,
  open = true,
  onOpenChange,
  logo,
  collapsedLogo,
  header,
  variant = "sidebar",
  ariaLabel = "주 메뉴",
  className = "",
}: GnbProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() =>
    initialExpandedIds(sections, activeId),
  );

  /*
   * 스크롤 위치 복원 — **`useLayoutEffect` 여야 한다.**
   * `useEffect` 는 브라우저가 한 번 그린 뒤에 돌아서, 맨 위로 갔다가 되돌아오는
   * 깜빡임이 눈에 보인다. 레이아웃 단계에서 맞춰 두면 그 프레임이 아예 없다.
   */
  const menuScrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = menuScrollRef.current;
    if (el) el.scrollTop = savedMenuScrollTop;
  }, []);

  /*
    드로어는 딤을 깔고 화면을 가리는 **모달**이다 — `Modal`·`SideSheet` 와 같은
    대접을 받아야 한다. 트랩이 없으면 키보드 사용자가 딤 뒤의 페이지로 탭해 나가
    보이지 않는 것을 조작하게 되고, Escape 로 닫을 수도 없다.

    ⚠️ 훅은 아래 `if (!open) return null` **앞에서** 부른다 — 조건부 호출은 금지다.
    드로어가 아니거나 닫혀 있으면 `open: false` 로 넘겨 훅이 아무것도 하지 않게 한다.
  */
  const drawerRef = useFocusTrap<HTMLDivElement>({
    open: variant === "drawer" && open,
    onClose: () => onOpenChange?.(false),
  });

  const toggle = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const body = (
    <>
      {/*
        로고 — DESIGN.md §23-2.

        축소 모드 두 가지가 원본과 다르다 `[확장]`:
        1. 원본은 `padding-inline-start: 0`으로 되돌리는데, 그건 축소용 심볼이
           36×36(`.gnb_headerLogoPartnerSmall`)이라 60px의 content box(36)를
           꽉 채워 저절로 가운데 오기 때문이다. 우리 심볼은 그보다 작아 그대로
           두면 아래 아이콘 열(`px-2` → x=20)보다 8px 왼쪽으로 튄다.
           `pl-2`를 유지해 **좌측 기준선을 아이콘과 공유**한다.
        2. `margin-block-end: 16`을 축소 시엔 지운다. 남기면 로고 아래만
           16+24=40이 되어 나머지 블록 간격(24)과 어긋난다.
      */}
      {/*
        `shrink-0` 이 **필수**다. 이 래퍼는 `h-dvh`/`h-full` 로 높이가 잠긴 세로 flex 의
        자식인데, `overflow-hidden` 이 걸리면 자동 최소 크기(`min-height: auto`)가
        **0 으로 떨어진다** — 자동 최소 크기는 `overflow: visible` 일 때만 내용을 지킨다.
        형제 중 header 슬롯·접기 토글은 이미 `shrink-0` 이고 스크롤 영역은
        `flex-basis: 0` 이라 shrink 가중치가 없어서, 공간이 모자라면 **로고만 눌린다.**
        (`Select` 옵션이 눌려 글자가 잘렸던 것과 같은 원인이다)
      */}
      <div className="flex h-7 shrink-0 items-center overflow-hidden pl-2 mb-4 @max-[60px]:mb-0">
        <span className="block overflow-hidden @max-[60px]:hidden">{logo}</span>
        <span className="hidden @max-[60px]:block">{collapsedLogo}</span>
      </div>

      {/*
        상단 사이트 선택기 슬롯 — DESIGN.md §23-5.

        블록 래퍼를 한 겹 끼우는 이유: 이 슬롯은 세로 flex(column)의 직접
        자식이라, 소비자가 가로 문맥 감각으로 `flex-1`을 붙이면 그게 **세로로**
        작동해 선택기가 남은 높이를 통째로 먹고 메뉴가 화면 아래로 밀린다.
        래퍼가 대신 flex 아이템이 되면(기본 `flex: 0 1 auto`) 안쪽 flex 값은
        무력해진다. §23-5의 `flex: 1`은 래퍼가 아니라 **텍스트**에 거는 값이다.
      */}
      {header ? <div className="shrink-0">{header}</div> : null}

      {/* 스크롤 영역. 스크롤바는 두 벤더 문법 모두로 숨긴다 (DESIGN.md §23-1) */}
      <div
        ref={menuScrollRef}
        onScroll={(e) => {
          savedMenuScrollTop = e.currentTarget.scrollTop;
        }}
        className="flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/*
          섹션 사이 16 — **레퍼런스에 없는 우리 확장이다.**
          원본(`container.BuDZObdr.css`)에는 섹션 간 여백 규칙이 아예 없고
          그룹 구분을 28px 라벨 행 하나에 전부 맡긴다. 실사용에서 밀도가 너무
          높아 그룹이 읽히지 않아 확장 모드에만 16을 넣었다.

          축소 모드는 원본 그대로 둔다 — 라벨이 사라지고 구분선이 자기 여백
          (`margin: 4 0 24`)을 이미 갖기 때문에 여기서 또 벌리면 이중이 된다.
        */}
        <nav
          aria-label={ariaLabel}
          className="flex flex-col gap-4 overflow-hidden @max-[60px]:gap-0"
        >
          {sections.map((section) => (
            <div key={section.id}>
              {section.label ? (
                <>
                  {/* 축소 모드에서만 보이는 구분선 — 섹션 라벨과 자리를 맞바꾼다 */}
                  <div
                    aria-hidden
                    data-gnb-divider
                    /*
                      상하 12 대칭 `[확장]`.

                      원본은 `margin: 4 0 24`인데(라벨 행 28을 그대로 대체하려는
                      계산), 아이템이 32 높이에 아이콘 20이라 상하 6씩 자체 여백을
                      갖는다. 그래서 눈에 보이는 간격은 **위 10 / 아래 30**이 되어
                      선이 위 그룹에 붙고 아래 아이콘만 밀려 보인다.
                      12/12로 맞추면 시각 간격이 18/18로 대칭이 된다.
                    */
                    className="hidden my-3 h-px w-full bg-border @max-[60px]:block"
                  />
                  <div className="flex h-7 items-center justify-between gap-2 overflow-hidden pr-0.5 pl-2 whitespace-nowrap @max-[60px]:hidden">
                    <span className="truncate text-text-sub label-small-bold">
                      {section.label}
                    </span>
                  </div>
                </>
              ) : null}

              <ul className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const hasChildren = Boolean(item.items?.length);
                  const expanded = hasChildren
                    ? Boolean(expandedIds[item.id])
                    : undefined;

                  return (
                    <li key={item.id}>
                      <GnbItem
                        item={item}
                        depth={1}
                        active={item.id === activeId}
                        expanded={expanded}
                        onActivate={() =>
                          hasChildren ? toggle(item.id) : onSelect?.(item.id)
                        }
                      />

                      {hasChildren && expanded ? (
                        <ul className="flex flex-col gap-1 pt-1 pb-4 @max-[60px]:hidden">
                          {item.items?.map((child) => (
                            <li key={child.id}>
                              <GnbItem
                                item={child}
                                depth={2}
                                active={child.id === activeId}
                                onActivate={() => onSelect?.(child.id)}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </>
  );

  /*
    하단 접기/펼치기 토글 (사이드바 전용) `[확장]`.

    원본 CSS에는 데스크톱 접기 버튼이 없다(`.gnb_closeButton`은 모바일 드로어 닫기).
    조작 대상인 GNB 안에 두는 편이 응집도가 높아 하단에 내장했다.

    좌측 기준선: 래퍼가 `px-3`(12), IconButton small은 32×32에 아이콘 20이 가운데라
    아이콘이 버튼 안에서 6 들어가 있다. `pl-0.5`(2)를 주면 아이콘 좌측이
    12+2+6 = **20** — 메뉴 아이콘(`px-2` → 12+8=20)과 정확히 같은 열에 선다.
    축소(content box 36)에서도 같은 계산이라 모드가 바뀌어도 흔들리지 않는다.
  */
  const collapseToggle = onOpenChange ? (
    <div className="flex shrink-0 pl-0.5">
      <IconButton
        size="small"
        label={open ? "메뉴 접기" : "메뉴 펼치기"}
        icon={
          open ? (
            <PanelLeftClose strokeWidth={1.2} />
          ) : (
            <PanelLeftOpen strokeWidth={1.2} />
          )
        }
        onClick={() => onOpenChange(!open)}
      />
    </div>
  ) : null;

  /* 모바일 드로어 — DESIGN.md §23-1. 딤 + 280px 고정 패널 */
  if (variant === "drawer") {
    if (!open) return null;

    return (
      <>
        <div
          data-gnb-dim
          aria-hidden
          onClick={() => onOpenChange?.(false)}
          className="fixed inset-0 z-(--z-sidesheet) bg-overlay-sub"
        />
        <div
          ref={drawerRef}
          data-open="true"
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className={cn(
            "@container fixed top-0 left-0 z-(--z-sidesheet) flex h-dvh w-(--size-gnb-drawer) flex-col gap-6 bg-surface px-3 pb-4 text-text shadow-gnb",
            className,
          )}
        >
          <div className="absolute top-2 -right-10">
            <IconButton
              label="메뉴 닫기"
              size="small"
              icon={<X strokeWidth={1.2} />}
              onClick={() => onOpenChange?.(false)}
            />
          </div>
          {body}
        </div>
      </>
    );
  }

  /* 데스크톱 사이드바 — DESIGN.md §23-1
   *
   * 축소일 때만 wrapper를 `absolute`로 띄운다. 컨테이너는 `min-w-60px`만
   * 차지하고, hover로 224까지 벌어져도 본문 레이아웃을 밀지 않는다.
   * width는 open 삼항 한 곳에서만 방출한다(확장/축소가 서로 배타). */
  /*
   * ⚠️ `sticky top-0` 이 **필수**다. 예전에는 `relative h-dvh` 였는데,
   * 본문이 한 화면을 넘는 순간 사이드바가 딱 한 화면에서 끝나고 그 아래로
   * 셸 배경(회색)이 드러났다 — 스크롤하면 GNB 가 잘려 보인다.
   * sticky 로 두면 높이는 그대로 100dvh 이면서 **뷰포트에 붙어** 늘 채워진다.
   * (`position: sticky` 도 positioned 요소라, 축소 상태의 `absolute` 자식이
   *  이 래퍼를 기준으로 잡는 것은 그대로 유지된다.)
   *
   * ⚠️ **`z-index` 는 안쪽 패널이 아니라 이 래퍼에 있어야 한다.**
   * `position: sticky` 는 z-index 와 무관하게 **항상 쌓임 맥락을 만든다.**
   * 안쪽 패널에만 `z-(--z-sidesheet)` 를 주면 그 9000 이 이 맥락 안에 갇히고,
   * 래퍼 자신은 `z-index: auto` 라 **뒤에 오는 콘텐츠 컬럼이 그 위에 그려진다** —
   * 축소 상태에서 hover 로 펼쳤을 때 표 카드가 GNB 를 덮어 글자가 겹쳐 보였다.
   */
  return (
    <div className="sticky top-0 z-(--z-sidesheet) h-dvh min-w-(--size-gnb-collapsed) shrink-0">
      <div
        data-open={open}
        className={cn(
          "@container flex h-full flex-col gap-6 bg-surface px-3 py-4 text-text shadow-gnb",
          open
            ? "relative w-(--size-gnb-expanded)"
            : "absolute top-0 left-0 w-(--size-gnb-collapsed) hover:w-(--size-gnb-expanded)",
          className,
        )}
      >
        {body}
        {collapseToggle}
      </div>
    </div>
  );
}
