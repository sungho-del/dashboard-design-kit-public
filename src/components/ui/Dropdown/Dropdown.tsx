import {
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type HTMLProps,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import {
  FloatingFocusManager,
  FloatingList,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListItem,
  useListNavigation,
  useMergeRefs,
  useRole,
  useTypeahead,
  type Placement,
} from "@floating-ui/react";
import { cn } from "../../../lib/cn";
import { Divider, type DividerProps } from "../Divider";

/* -------------------------------------------------------------------------
 * Context — floating-ui 인스턴스 하나를 트리거·패널·아이템이 나눠 쓴다
 * ---------------------------------------------------------------------- */

export type DropdownSize = "default" | "compact";

interface DropdownContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  size: DropdownSize;
  closeOnSelect: boolean;
  activeIndex: number | null;
  elementsRef: RefObject<Array<HTMLElement | null>>;
  labelsRef: RefObject<Array<string | null>>;
  floating: ReturnType<typeof useFloating>;
  interactions: ReturnType<typeof useInteractions>;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext(component: string): DropdownContextValue {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error(`<${component}>는 <Dropdown> 안에서만 사용할 수 있다.`);
  }
  return context;
}

/* -------------------------------------------------------------------------
 * Dropdown (루트)
 * ---------------------------------------------------------------------- */

export interface DropdownProps {
  /** 제어형 열림 상태. 넘기지 않으면 내부 state 로 동작한다 */
  open?: boolean;
  /** 비제어형의 초기 열림 상태 */
  defaultOpen?: boolean;
  /** 열림/닫힘 요청. 제어형이면 여기서 `open` 을 갱신해야 한다 */
  onOpenChange?: (open: boolean) => void;
  /** 앵커 기준 배치. flip() 이 공간에 따라 자동으로 뒤집는다 */
  placement?: Placement;
  /** `default` 최소 폭 280 / `compact` 고정 폭 128 (DESIGN.md §11) */
  size?: DropdownSize;
  /** 아이템 선택 시 자동으로 닫기 (기본 true) */
  closeOnSelect?: boolean;
  children?: ReactNode;
}

/**
 * DESIGN.md §11 Dropdown / Menu.
 *
 * ## 구조
 *
 * ```tsx
 * <Dropdown>
 *   <Dropdown.Trigger>
 *     <IconButton label="더보기" icon={<MoreVertical />} />
 *   </Dropdown.Trigger>
 *   <Dropdown.Menu>
 *     <Dropdown.Item leftIcon={<Pencil />} onSelect={edit}>수정</Dropdown.Item>
 *     <Dropdown.Divider />
 *     <Dropdown.Item tone="critical" onSelect={remove}>삭제</Dropdown.Item>
 *   </Dropdown.Menu>
 * </Dropdown>
 * ```
 *
 * ## 구현 메모
 *
 * - **위치는 `@floating-ui/react` 가 inline style 로 넣는다.** `offset(4)` +
 *   `flip()` + `shift({ padding: 8 })` 조합이라 화면 밖으로 밀리지 않는다.
 *   컴포넌트는 위치 관련 Tailwind 클래스를 일절 방출하지 않는다 — 인라인 스타일과
 *   중복되면 어느 쪽이 이기는지가 불투명해진다.
 * - **포커스는 트랩이 아니라 roving** 이다. 모달과 달리 메뉴는 배경을 막지 않으므로
 *   `useFocusTrap` 대신 `useListNavigation` 이 활성 아이템만 `tabIndex=0` 으로
 *   올리고 나머지는 `-1` 로 내린다. `FloatingFocusManager` 는 `modal={false}` 로
 *   두어 닫힐 때 트리거로 포커스를 되돌리는 역할만 맡는다.
 * - 마우스로 열면 포커스가 트리거에 남고(초점 도둑질 방지), 키보드로 열면
 *   `focusItemOnOpen: 'auto'` 가 첫 아이템으로 포커스를 보낸다.
 * - **z-index 는 `--z-sidesheet`(9000)** — 드롭다운은 헤더(8000) 위, 모달(10000) 아래다.
 */
export function Dropdown({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  placement = "bottom-start",
  size = "default",
  closeOnSelect = true,
  children,
}: DropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  // useListNavigation 이 순서대로 접근할 아이템 DOM. FloatingList 가 채워 준다
  const elementsRef = useRef<Array<HTMLElement | null>>([]);
  // useTypeahead 가 쓰는 아이템 라벨(문자열 children 만 수집된다)
  const labelsRef = useRef<Array<string | null>>([]);

  // 컨텍스트로 통째로 내려야 하므로 반환 타입을 명시해 추론 흔들림을 막는다
  const floating: ReturnType<typeof useFloating> = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    // 스크롤·리사이즈·레이아웃 변화에 따라 위치를 다시 계산한다
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip(), shift({ padding: 8 })],
  });

  const { context } = floating;

  const click = useClick(context);
  const dismiss = useDismiss(context);
  // role="menu" + 트리거의 aria-haspopup="menu" · aria-expanded 를 함께 방출한다
  const role = useRole(context, { role: "menu" });
  // ↑↓ 이동 · Home/End · 활성 아이템 포커스를 전담한다
  const listNavigation = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
  });
  // 문자 입력으로 아이템 점프 (라벨이 문자열인 아이템만 대상)
  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    activeIndex,
    onMatch: setActiveIndex,
    enabled: open,
  });

  const interactions = useInteractions([
    click,
    dismiss,
    role,
    listNavigation,
    typeahead,
  ]);

  const value = useMemo<DropdownContextValue>(
    () => ({
      open,
      setOpen,
      size,
      closeOnSelect,
      activeIndex,
      elementsRef,
      labelsRef,
      floating,
      interactions,
    }),
    [open, setOpen, size, closeOnSelect, activeIndex, floating, interactions],
  );

  return (
    <DropdownContext.Provider value={value}>
      {children}
    </DropdownContext.Provider>
  );
}

/* -------------------------------------------------------------------------
 * Dropdown.Trigger
 * ---------------------------------------------------------------------- */

export interface DropdownTriggerProps {
  /**
   * 트리거로 쓸 **단일 요소**. `Button`·`IconButton` 을 그대로 넘긴다.
   * 이벤트 핸들러와 `aria-haspopup`·`aria-expanded` 가 이 요소에 주입된다.
   */
  children: ReactElement<HTMLProps<HTMLElement>>;
}

/**
 * 자체 DOM 을 만들지 않고 자식 요소를 복제해 앵커로 삼는다.
 * 래퍼 `<span>` 을 끼우면 `aria-haspopup` 이 실제 버튼이 아닌 껍데기에 붙고
 * 레이아웃도 한 겹 더 생기므로 cloneElement 방식을 쓴다.
 */
export function DropdownTrigger({ children }: DropdownTriggerProps) {
  const { floating, interactions } = useDropdownContext("Dropdown.Trigger");

  // React 19 에서 ref 는 일반 prop 이라 children.props 안에 들어 있다.
  // 사용처가 트리거에 직접 ref 를 걸었을 수 있으므로 합쳐 준다.
  const ref = useMergeRefs<HTMLElement>([
    floating.refs.setReference,
    children.props.ref,
  ]);

  const triggerProps = interactions.getReferenceProps(
    children.props,
  ) as HTMLProps<HTMLElement>;

  return cloneElement(children, { ...triggerProps, ref });
}

/* -------------------------------------------------------------------------
 * Dropdown.Menu
 * ---------------------------------------------------------------------- */

/**
 * DESIGN.md §11 "큰 팝오버": min-width 280 · padding 6 · 세로 gap 8 ·
 * radius medium · shadow-popover. 컴팩트는 "액션 팝오버" width 128.
 */
const menuSizeClasses: Record<DropdownSize, string> = {
  default: "min-w-70", // 280
  compact: "w-32", // 128
};

/** §11 "카테고리 컨테이너 max-height 280 · overflow auto" 를 패널 자체에 적용했다 */
const menuBaseClasses = cn(
  "flex max-h-70 flex-col gap-2 overflow-auto p-1.5",
  "rounded-medium bg-surface shadow-popover",
  "z-(--z-sidesheet)",
);

export type DropdownMenuProps = Omit<HTMLAttributes<HTMLDivElement>, "role">;

export function DropdownMenu({
  className = "",
  style,
  children,
  ...props
}: DropdownMenuProps) {
  const { open, size, floating, interactions, elementsRef, labelsRef } =
    useDropdownContext("Dropdown.Menu");
  const { refs, floatingStyles, context } = floating;

  if (!open) return null;

  return (
    <FloatingPortal>
      {/* modal={false} — 메뉴는 배경을 막지 않는다. 포커스 복원만 맡는다.
          initialFocus={-1} 로 두어 포커스 이동은 useListNavigation 이 결정한다 */}
      <FloatingFocusManager
        context={context}
        modal={false}
        initialFocus={-1}
        returnFocus
      >
        <div
          ref={refs.setFloating}
          data-slot="menu"
          // 위치는 floating-ui 가 계산한 inline style 이 전담한다
          style={{ ...floatingStyles, ...style }}
          className={cn(menuBaseClasses, menuSizeClasses[size], className)}
          {...interactions.getFloatingProps(props)}
        >
          {/* 아이템이 자기 index 를 스스로 알아내게 해 준다 */}
          <FloatingList elementsRef={elementsRef} labelsRef={labelsRef}>
            {children}
          </FloatingList>
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}

/* -------------------------------------------------------------------------
 * Dropdown.Item
 * ---------------------------------------------------------------------- */

export type DropdownItemTone = "default" | "critical";
export type DropdownItemRole =
  "menuitem" | "menuitemradio" | "menuitemcheckbox";

/**
 * DESIGN.md §11 메뉴 아이템: width 100% · flex · gap 4 · radius medium ·
 * padding 8 12 · 타이포 label-medium. 상태 전환은 design-core.md 의 0.1s.
 */
const itemBaseClasses = cn(
  "flex w-full items-center gap-1 rounded-medium px-3 py-2 text-left label-medium",
  "transition-colors duration-100 ease-in-out",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
);

/** 글자·아이콘 색만 담당한다. 배경은 아래 state 클래스가 전담해 속성이 겹치지 않는다 */
const itemToneClasses: Record<DropdownItemTone, string> = {
  default: "text-text-secondary",
  critical: "text-text-critical",
};

/**
 * 배경만 담당한다. default 와 selected 는 서로 배타적으로 하나만 방출되므로
 * `cn()` 이 클래스 병합을 하지 않아도 같은 속성이 중복되지 않는다.
 * selected = 약한 선택(`action-primary-tonal`) — design-core.md "선택 상태 2종".
 */
const itemStateClasses = {
  default:
    "bg-transparent hover:bg-action-secondary-hover active:bg-action-secondary-pressed",
  selected:
    "bg-action-primary-tonal hover:bg-action-primary-tonal-hover active:bg-action-primary-tonal-pressed",
} as const;

export interface DropdownItemProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "role" | "disabled"
> {
  /** 좌측 아이콘 슬롯. lucide 아이콘은 size 16 · strokeWidth 1.2 로 넘긴다 */
  leftIcon?: ReactNode;
  /** 우측 아이콘 슬롯. 라벨이 `flex-1` 이라 자동으로 오른쪽 끝에 붙는다 */
  rightIcon?: ReactNode;
  /** 위험 액션은 `critical` — 글자·아이콘이 `text-critical` 로 바뀐다 */
  tone?: DropdownItemTone;
  /** 선택/활성 상태. 배경이 `action-primary-tonal` 로 바뀐다 */
  selected?: boolean;
  /**
   * 비활성. 네이티브 `disabled` 대신 `aria-disabled` 를 쓴다 —
   * 메뉴 아이템은 비활성이어도 스크린리더가 읽고 지나갈 수 있어야 한다.
   * `useListNavigation` 도 `aria-disabled` 를 보고 건너뛴다.
   */
  disabled?: boolean;
  /**
   * 기본 `menuitem`. 체크/라디오 의미가 있으면 바꾼다 —
   * 이때만 `selected` 가 `aria-checked` 로 노출된다.
   */
  role?: DropdownItemRole;
  /** 선택됨. `closeOnSelect` 가 true 면 호출 후 메뉴가 닫힌다 */
  onSelect?: () => void;
  children?: ReactNode;
}

export function DropdownItem({
  leftIcon,
  rightIcon,
  tone = "default",
  selected = false,
  disabled = false,
  role = "menuitem",
  onSelect,
  onClick,
  className = "",
  children,
  ...props
}: DropdownItemProps) {
  const { activeIndex, interactions, setOpen, closeOnSelect } =
    useDropdownContext("Dropdown.Item");

  // FloatingList 안에서 자기 순번을 받아 온다. label 은 typeahead 용
  const { ref, index } = useListItem({
    label: typeof children === "string" ? children : undefined,
  });
  const isActive = activeIndex === index;

  // 색 계열이 disabled 하나로 덮이도록 tone/state 를 각각 한 줄만 고른다
  const toneClass = disabled ? "text-text-disabled" : itemToneClasses[tone];
  const stateClass = disabled
    ? "cursor-not-allowed bg-transparent"
    : selected
      ? itemStateClasses.selected
      : itemStateClasses.default;

  const itemProps = {
    ...props,
    // roving tabindex — 활성 아이템 하나만 Tab 순서에 남는다
    tabIndex: isActive ? 0 : -1,
    onClick(event: ReactMouseEvent<HTMLButtonElement>) {
      if (disabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
      onSelect?.();
      if (closeOnSelect) setOpen(false);
    },
  };

  return (
    <button
      ref={ref}
      type="button"
      role={role}
      aria-disabled={disabled || undefined}
      aria-checked={role === "menuitem" ? undefined : selected}
      data-selected={selected || undefined}
      data-active={isActive || undefined}
      className={cn(itemBaseClasses, toneClass, stateClass, className)}
      {...interactions.getItemProps(itemProps)}
    >
      {leftIcon ? (
        <span data-slot="left-icon" className="flex shrink-0 items-center">
          {leftIcon}
        </span>
      ) : null}

      <span data-slot="label" className="min-w-0 flex-1 truncate">
        {children}
      </span>

      {rightIcon ? (
        <span data-slot="right-icon" className="flex shrink-0 items-center">
          {rightIcon}
        </span>
      ) : null}
    </button>
  );
}

/* -------------------------------------------------------------------------
 * Dropdown.Divider
 * ---------------------------------------------------------------------- */

export type DropdownDividerProps = Omit<
  DividerProps,
  "orientation" | "decorative"
>;

/**
 * 메뉴 안의 그룹 경계. 기존 `Divider` 를 그대로 쓰되 `decorative={false}` 로
 * `role="separator"` 를 노출한다 — 메뉴 안의 구분선은 장식이 아니라 구조다.
 * 좌우 여백을 따로 주지 않는다(패널의 `gap-2` 가 이미 간격을 만든다).
 */
export function DropdownDivider(props: DropdownDividerProps) {
  return <Divider decorative={false} {...props} />;
}

/* -------------------------------------------------------------------------
 * 조합 API — <Dropdown.Item> 형태로도 쓸 수 있게 정적 속성으로 붙인다.
 * 개별 named export 도 그대로 유지한다.
 * ---------------------------------------------------------------------- */

Dropdown.Trigger = DropdownTrigger;
Dropdown.Menu = DropdownMenu;
Dropdown.Item = DropdownItem;
Dropdown.Divider = DropdownDivider;
