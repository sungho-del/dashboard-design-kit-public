import {
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type Ref,
} from "react";
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useMergeRefs,
  useRole,
  useTypeahead,
  type Placement,
} from "@floating-ui/react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/cn";

export interface SelectOption {
  value: string;
  /**
   * 옵션 라벨. **문자열만 받는다** — SegmentedControl·Tabs 의 `ReactNode` 와 다른 점이다.
   * 타이핑 검색(`useTypeahead`)이 라벨 문자열을 매칭에 쓰므로, 노드를 허용하면
   * 키보드 사용자만 검색이 되지 않는 반쪽짜리 API 가 된다.
   */
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "defaultValue" | "onChange" | "type" | "role" | "children"
> {
  /** 옵션 목록. 배열 API 는 SegmentedControl·Tabs 와 동일한 형태를 유지한다 */
  options: SelectOption[];
  /** 제어 모드. 넘기면 선택 상태의 소유권이 사용처로 넘어간다 */
  value?: string;
  /** 비제어 모드의 초기 선택값. 생략하면 아무것도 선택되지 않은 상태로 시작한다 */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** 값이 없을 때 보여줄 문구. `text-minimal` 로 표시된다 */
  placeholder?: string;
  /** 트리거 위에 붙는 필드 라벨. `<label for>` 로 연결된다 */
  label?: string;
  /** 에러 상태 (DESIGN.md §5 error 규칙을 셀렉트 트리거에 적용) */
  invalid?: boolean;
  disabled?: boolean;
  /** 패널 배치. flip() 이 공간에 따라 자동으로 뒤집는다 */
  placement?: Placement;
  /**
   * 패널 최대 높이(px). 기본은 §5-2 검색 결과 패널 규격(232)이다.
   *
   * 쓰는 자리마다 규격이 다르기 때문에 열어둔다 — 예를 들어 §8 페이지네이션의
   * 개수 셀렉트는 **292**다. 뷰포트가 좁으면 이 값과 무관하게
   * `availableHeight` 로 더 줄어든다.
   */
  panelMaxHeight?: number;
  /** 트리거 버튼에 붙일 className. `className` 은 라벨을 포함한 루트에 붙는다 */
  triggerClassName?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * 패널 최대 높이의 **기본값** — DESIGN.md §5-2 "검색 결과 패널 max-height 230" 을
 * 4px 그리드에 맞춰 232 로 쓴다. 쓰는 자리마다 규격이 달라(§8 개수 셀렉트는 292)
 * `panelMaxHeight` prop 으로 덮을 수 있다.
 *
 * 클래스(`max-h-58`) 가 아니라 `size` 미들웨어의 inline style 로 넣는다.
 * 뷰포트가 좁으면 `availableHeight` 로 더 줄여야 하는데, 같은 `max-height` 속성을
 * 클래스와 inline style 두 곳에서 방출하면 승자가 불투명해진다.
 */
const MAX_PANEL_HEIGHT = 232;

/**
 * 트리거 공통 — DESIGN.md §6: height 40 · padding 0 12 · space-between · gap 8 ·
 * radius medium. 배경·경계선은 상태별로 하나씩만 방출되도록 아래에서 분기한다.
 */
const triggerBaseClasses = cn(
  "flex h-(--size-control-medium) w-full items-center justify-between gap-2 px-3",
  "rounded-medium text-left label-medium",
  "transition-[background-color] duration-100 ease-out",
);

/**
 * 패널 — DESIGN.md §5-2: radius large(12) · shadow-layer · bg surface · 세로 gap 4.
 *
 * **padding 은 §5-2 의 16 이 아니라 §11 팝오버의 6(`p-1.5`) 을 쓴다.**
 * §5-2 의 `padding 16` 은 "컬럼" 값이다 — 검색 셀렉트처럼 여러 컬럼을 나란히 놓고
 * `inset -1px 0 0 border` 로 컬럼을 가르는 큰 패널의 여백이다. 단순 옵션 리스트는
 * 컬럼이 하나뿐이라 16 을 그대로 쓰면 40px 옵션 주위에 16px 테두리 여백이 생겨
 * 트리거(40) 대비 패널이 과하게 커진다. 같은 문서의 팝오버 여백 6 이 실제 형태에
 * 맞고, 이미 구현된 Dropdown 패널(`p-1.5`)과도 층이 일치한다.
 *
 * `overflow-hidden`(§5-2) 과 `overflow-y-auto` 를 각각 다른 요소에 나눠 달면
 * `role="listbox"` 와 `role="option"` 사이에 익명 div 가 끼어 소유 관계가 끊긴다.
 * 그래서 한 요소가 리스트박스이자 스크롤러다 — `overflow-y: auto` 만 지정해도
 * CSS 규칙상 `overflow-x` 가 `visible` 에서 `auto` 로 계산되어 radius 클리핑은 유지된다.
 */
const panelClasses = cn(
  "flex flex-col gap-1 overflow-y-auto overscroll-contain p-1.5",
  "rounded-large bg-surface shadow-layer",
  "z-(--z-sidesheet)",
);

/**
 * 옵션 — DESIGN.md §5-2: min-width 108 · padding 8 12 · radius medium · 14/24/400.
 * 배경은 아래 상태 분기에서 한 줄만 고른다.
 *
 * ⚠️ **`shrink-0` 이 없으면 글자가 위아래로 잘린다.**
 * 목록은 세로 flex 인데, `truncate` 가 `overflow: hidden` 을 걸면 그 항목의
 * **자동 최소 크기(`min-height: auto`)가 0 으로 떨어진다** — CSS 상 자동 최소 크기는
 * `overflow: visible` 일 때만 내용 크기를 지킨다. 그래서 옵션이 많아 목록이
 * 최대 높이를 넘으면, 스크롤이 생기는 대신 **항목들이 납작하게 눌려** 글자가 잘렸다.
 * `shrink-0` 으로 눌림을 막으면 넘치는 만큼 컨테이너가 스크롤한다.
 */
const optionBaseClasses = cn(
  "min-w-27 shrink-0 truncate rounded-medium px-3 py-2 label-medium",
  "transition-colors duration-100 ease-in-out",
);

/**
 * DESIGN.md §6 Select 트리거 + §5-2 드롭다운 패널.
 *
 * ```tsx
 * <Select
 *   label="주문 상태"
 *   options={[{ value: "paid", label: "결제완료" }]}
 *   value={status}
 *   onValueChange={setStatus}
 * />
 * ```
 *
 * ## 구현 메모
 *
 * - **포커스는 트리거에서 움직이지 않는다(virtual focus).** `useListNavigation` 을
 *   `virtual: true` 로 두면 DOM 포커스는 `role="combobox"` 버튼에 남고, 활성 옵션은
 *   `aria-activedescendant` 로만 가리킨다. WAI-ARIA 의 select-only combobox 패턴이며,
 *   옵션에 실제 포커스를 옮기는 Dropdown(roving tabindex) 과 다른 점이다.
 *   그래서 `FloatingFocusManager` 를 쓰지 않는다 — 포커스가 나간 적이 없으므로
 *   복원할 것이 없고, 오히려 focus manager 가 포커스를 가져가면 활성 옵션 추적이 깨진다.
 * - 위치·폭·최대 높이는 모두 floating-ui 가 inline style 로 넣는다. 컴포넌트는
 *   위치 관련 Tailwind 클래스를 방출하지 않는다.
 * - **z-index 는 `--z-sidesheet`(9000)** — Dropdown 과 같은 층이다.
 */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "선택",
  label,
  invalid = false,
  disabled = false,
  placement = "bottom-start",
  panelMaxHeight = MAX_PANEL_HEIGHT,
  className = "",
  triggerClassName = "",
  id,
  ref,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `${generatedId}-trigger`;
  const labelId = `${generatedId}-label`;

  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    () => defaultValue ?? "",
  );
  const selectedValue = isControlled ? value : uncontrolledValue;
  const selectedIndex = options.findIndex(
    (option) => option.value === selectedValue,
  );
  const selectedOption =
    selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const [openState, setOpenState] = useState(false);
  // disabled 는 열림 상태보다 우선한다 — 열린 채로 비활성화돼도 패널이 남지 않는다
  const open = openState && !disabled;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // useListNavigation 이 순서대로 훑을 옵션 DOM. 배열 API 라 index 로 직접 채운다
  const elementsRef = useRef<Array<HTMLElement | null>>([]);
  /**
   * useTypeahead 가 쓰는 라벨 배열. **비활성 옵션은 null 로 비워** 검색으로도
   * 선택되지 않게 한다(useTypeahead 는 disabledIndices 를 받지 않는다).
   * 파생값이라 렌더 중에 그대로 덮어쓴다 — 같은 입력이면 같은 결과라 멱등하다.
   */
  const labelsRef = useRef<Array<string | null>>([]);
  labelsRef.current = options.map((option) =>
    option.disabled ? null : option.label,
  );
  /**
   * 타이핑 중인지. state 가 아니라 ref 인 이유 — 아래 트리거 onKeyDown 은
   * useTypeahead 의 핸들러 **다음에** 같은 이벤트에서 실행된다. state 는 그 시점에
   * 아직 갱신 전이라, 검색어에 포함된 공백을 "선택" 으로 오인하게 된다.
   */
  const isTypingRef = useRef(false);

  // 배열 API 라 비활성 index 를 명시할 수 있다 — DOM 속성 추론에 기대지 않는다
  const disabledIndices = options.flatMap((option, index) =>
    option.disabled ? [index] : [],
  );

  /**
   * 열 때의 활성 옵션 — 선택된 값이 있으면 그 항목, 없으면 첫 활성 항목.
   * WAI-ARIA 의 select-only combobox 권장 동작이고, ↑↓ 의 출발점도 여기서 잡힌다.
   * (선택 배경 tonal 이 활성 배경보다 우선하므로 값이 있을 때 화면은 그대로다)
   */
  function handleOpenChange(next: boolean) {
    setOpenState(next);
    if (!next) {
      setActiveIndex(null);
      return;
    }
    const firstEnabledIndex = options.findIndex((option) => !option.disabled);
    const initialIndex = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex;
    setActiveIndex(initialIndex >= 0 ? initialIndex : null);
  }

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: handleOpenChange,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ rects, availableHeight, elements }) {
          // 패널 폭을 트리거와 맞춘다. 값이 런타임 실측이라 토큰 대상이 아니다
          elements.floating.style.width = `${rects.reference.width}px`;
          elements.floating.style.maxHeight = `${Math.min(
            availableHeight,
            panelMaxHeight,
          )}px`;
        },
      }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  // 트리거에 role="combobox" · aria-expanded · aria-controls,
  // 패널에 role="listbox", 옵션에 role="option" · aria-selected 를 방출한다
  const role = useRole(context, { role: "select" });
  const listNavigation = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : null,
    onNavigate: setActiveIndex,
    disabledIndices,
    // 포커스를 옮기지 않고 aria-activedescendant 로만 활성 옵션을 가리킨다
    virtual: true,
    loop: true,
    /**
     * 열 때의 활성 항목은 위 `handleOpenChange` 가 정한다.
     * 라이브러리 기본값(`'auto'`)에 맡기면 **Enter 로 연 경우 마지막 항목**이
     * 활성화된다 — 내부적으로 "끝으로 가는 키가 아니면 max index" 로 판정하는데
     * Enter 가 그 조건에 걸린다. 마우스로 열었을 때 뜻 없는 하이라이트가 생기는 것도 막는다.
     */
    focusItemOnOpen: false,
  });
  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    activeIndex,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : null,
    // 열려 있으면 이동만, 닫혀 있으면 곧바로 선택 — 네이티브 <select> 와 같은 동작
    onMatch: open ? setActiveIndex : selectOption,
    onTypingChange(nextIsTyping) {
      isTypingRef.current = nextIsTyping;
    },
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [click, dismiss, role, listNavigation, typeahead],
  );

  const triggerRef = useMergeRefs<HTMLButtonElement>([refs.setReference, ref]);

  function selectOption(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;

    if (!isControlled) setUncontrolledValue(option.value);
    onValueChange?.(option.value);
    setOpenState(false);
    setActiveIndex(null);
  }

  /**
   * 선택 확정. 활성 옵션이 있을 때만 가로챈다.
   *
   * Space 는 타이핑 중일 때 검색어의 일부이므로 그때는 넘긴다. 가로챈 키에
   * `preventDefault()` 를 걸어야 버튼의 기본 동작(keyup 시 click → 다시 토글)이
   * 이어지지 않는다.
   */
  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!open || activeIndex === null) return;
    const isSelectKey =
      event.key === "Enter" || (event.key === " " && !isTypingRef.current);
    if (!isSelectKey) return;

    event.preventDefault();
    selectOption(activeIndex);
  }

  const triggerTextClass = disabled
    ? "text-text-disabled"
    : selectedOption
      ? "text-text"
      : "text-text-minimal";

  /**
   * 배경 — 상태마다 한 줄만 방출한다. cn() 은 클래스를 병합하지 않으므로
   * `bg-*` 를 두 곳에서 내면 승자가 Tailwind 의 규칙 순서로 정해져 버린다.
   */
  const triggerBgClass = disabled
    ? "cursor-not-allowed bg-field-disabled"
    : invalid
      ? "cursor-pointer bg-surface-critical-secondary"
      : "cursor-pointer bg-surface";

  /**
   * 경계선 — DESIGN.md §6. 열림/포커스는 2px + offset -2 로 두께가 바뀌므로
   * 기본선과 같은 줄에 둘 수 없다. 상태별로 통째로 갈아 끼운다.
   */
  const triggerOutlineClass = disabled
    ? "outline-0"
    : open
      ? "outline-2 -outline-offset-2 outline-focus"
      : cn(
          "outline-1 -outline-offset-1 outline-border",
          invalid
            ? "hover:outline-border-critical-hover"
            : "hover:outline-border-hover",
          // 포커스는 hover 위에서도 유지돼야 한다 (Input 과 같은 규칙)
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
          "focus-visible:hover:outline-focus",
        );

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label ? (
        <label
          id={labelId}
          htmlFor={triggerId}
          className="label-medium text-text-sub"
        >
          {label}
        </label>
      ) : null}

      {/*
        ref·id·className 은 JSX 에 직접 둔다 — floating-ui 의 prop getter 는
        `HTMLProps<Element>` 를 받는데, `Ref<HTMLButtonElement>` 는 `Ref<Element>` 로
        좁혀지지 않는다(RefObject 의 current 가 불변 위치라 반공변이 아니다).
        반대로 onKeyDown 은 반드시 getter 안으로 넣어야 한다 — 밖에 두면
        useListNavigation·useTypeahead 의 핸들러를 덮어써 키보드 조작이 통째로 죽는다.
      */}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        data-slot="trigger"
        data-open={open || undefined}
        data-invalid={invalid || undefined}
        aria-invalid={invalid || undefined}
        className={cn(
          triggerBaseClasses,
          triggerBgClass,
          triggerOutlineClass,
          triggerTextClass,
          triggerClassName,
        )}
        {...getReferenceProps({ ...props, onKeyDown: handleTriggerKeyDown })}
      >
        <span data-slot="value" className="min-w-0 flex-1 truncate">
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.2}
          aria-hidden
          className={cn(
            "shrink-0 transition-transform duration-200",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {open ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            data-slot="panel"
            // 위치·폭·최대 높이는 floating-ui 가 계산한 inline style 이 전담한다
            style={floatingStyles}
            aria-labelledby={label ? labelId : undefined}
            className={panelClasses}
            {...getFloatingProps()}
          >
            {options.map((option, index) => {
              const isSelected = option.value === selectedValue;
              const isActive = activeIndex === index;

              /**
               * 배경·글자색을 한 줄로 고른다. 활성(키보드 하이라이트)에도 hover 와
               * 같은 배경을 주는 이유 — 포커스가 트리거에 남아 있어(virtual focus)
               * 브라우저의 포커스 링이 옵션에 그려지지 않기 때문이다.
               */
              const optionStateClass = option.disabled
                ? "cursor-not-allowed bg-field-disabled text-text-disabled"
                : isSelected
                  ? "cursor-pointer bg-action-primary-tonal text-text"
                  : isActive
                    ? "cursor-pointer bg-action-secondary-hover text-text"
                    : "cursor-pointer bg-transparent text-text hover:bg-action-secondary-hover";

              return (
                <div
                  key={option.value}
                  ref={(node) => {
                    elementsRef.current[index] = node;
                  }}
                  {...getItemProps({
                    // useRole 이 이 두 값을 보고 role="option" · aria-selected 를 만든다.
                    // DOM 으로는 새어 나가지 않는다(mergeProps 가 걸러낸다)
                    active: isActive,
                    selected: isSelected,
                    "aria-disabled": option.disabled || undefined,
                    onMouseDown(event: ReactMouseEvent<HTMLElement>) {
                      // 패널(tabIndex -1)로 포커스가 넘어가면 트리거의
                      // aria-activedescendant 추적이 끊긴다. 기본 동작만 막는다
                      event.preventDefault();
                    },
                    onClick() {
                      selectOption(index);
                    },
                  })}
                  /*
                    id 는 반드시 getItemProps **뒤에** 온다 — useRole 은 활성 옵션에
                    `${floatingId}-fui-option` 이라는 공용 id 를 붙이고, floating-ui 는
                    그 id 를 보면 임의의 난수 id 로 갈아치운다. 우리가 뒤에서 덮어써
                    aria-activedescendant 가 안정적인 값을 가리키게 한다.
                  */
                  id={`${generatedId}-option-${index}`}
                  data-selected={isSelected || undefined}
                  data-active={isActive || undefined}
                  className={cn(optionBaseClasses, optionStateClass)}
                >
                  {option.label}
                </div>
              );
            })}
          </div>
        </FloatingPortal>
      ) : null}
    </div>
  );
}
