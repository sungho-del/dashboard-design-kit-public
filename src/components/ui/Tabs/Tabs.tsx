import {
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../../lib/cn";

export interface TabItem {
  /** 탭을 식별하는 값. `value`/`defaultValue`와 대응한다 */
  value: string;
  label: ReactNode;
  disabled?: boolean;
  /** 이 탭이 제어하는 패널 요소의 id — `aria-controls`로 연결된다 */
  controls?: string;
  /**
   * 탭 버튼 자체의 id. 패널에서 `aria-labelledby`로 되짚어야 할 때 지정한다.
   * 생략하면 `useId()` 기반으로 자동 생성되어 인스턴스 간 충돌하지 않는다.
   */
  id?: string;
}

export interface TabsProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  items: TabItem[];
  /** 제어 모드. 넘기면 선택 상태의 소유권이 사용처로 넘어간다 */
  value?: string;
  /** 비제어 모드의 초기 선택값. 생략하면 첫 번째 활성 탭이 선택된다 */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  ref?: Ref<HTMLDivElement>;
}

/**
 * DESIGN.md §9. 탭 리스트 — flex · gap 16.
 */
const listClasses = "flex gap-4";

/**
 * 탭 공통 — inline-block · relative · padding 12 0 · 16/24/600.
 *
 * 색 전환은 "콘텐츠 전환" 계열이라 0.3s ease-out이다 (design-core.md 모션 표).
 * 포커스 링은 DESIGN.md §9에 명시가 없지만, 키보드 이동이 필수 요건이라
 * 다른 컨트롤과 동일한 규칙(2px · offset -2 · focus 색)을 그대로 쓴다.
 */
const tabBaseClasses = cn(
  "relative inline-block py-3 label-large-bold",
  "transition-[color] duration-300 ease-out",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
);

/**
 * selected 밑줄 — `::after`로 그린다. height 2 · left/right 0 · bottom 0 ·
 * `action-primary` · radius full. (DESIGN.md §9)
 *
 * `h-0.5`은 4px 그리드 기준 2px다(`--spacing: 4px`).
 */
const tabSelectedClasses = cn(
  "text-text",
  "after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5",
  "after:rounded-full after:bg-action-primary after:content-['']",
);

/** 이동 키 — 좌우 화살표(필수) + Home/End */
const MOVE_KEYS = ["ArrowRight", "ArrowLeft", "Home", "End"];

/**
 * DESIGN.md §9 Tabs (underline).
 *
 * 제어(`value` + `onValueChange`) / 비제어(`defaultValue`) 모두 지원한다.
 * 접근성은 WAI-ARIA Tabs 패턴을 따른다 — `role="tablist"` / `role="tab"` +
 * `aria-selected`, roving tabindex(선택된 탭만 0), 좌우 화살표 이동.
 * 화살표 이동은 자동 활성화(automatic activation) 방식이다: 포커스가 옮겨가면
 * 선택도 함께 옮겨간다. 탭 전환 비용이 큰 화면이 아니라 이 방식이 적합하다.
 */
export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  className = "",
  ref,
  ...props
}: TabsProps) {
  const instanceId = useId();
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    () => defaultValue ?? items.find((item) => !item.disabled)?.value ?? "",
  );
  const selectedValue = isControlled ? value : uncontrolledValue;

  // 화살표 이동 시 포커스를 옮기려면 각 탭 DOM 노드가 필요하다
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function select(next: string) {
    if (!isControlled) setUncontrolledValue(next);
    onValueChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!MOVE_KEYS.includes(event.key)) return;

    // disabled 탭은 이동 대상에서 제외한다
    const enabled = items.filter((item) => !item.disabled);
    if (enabled.length === 0) return;

    event.preventDefault();

    const current = enabled.findIndex((item) => item.value === selectedValue);
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = current < 0 ? 0 : (current + 1) % enabled.length;
        break;
      case "ArrowLeft":
        nextIndex =
          current < 0
            ? enabled.length - 1
            : (current - 1 + enabled.length) % enabled.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      default:
        nextIndex = enabled.length - 1;
    }

    const nextValue = enabled[nextIndex].value;
    select(nextValue);
    tabRefs.current[nextValue]?.focus();
  }

  return (
    <div
      ref={ref}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(listClasses, className)}
      {...props}
    >
      {items.map((item) => {
        const isSelected = item.value === selectedValue;
        return (
          <button
            key={item.value}
            ref={(node) => {
              tabRefs.current[item.value] = node;
            }}
            type="button"
            role="tab"
            id={item.id ?? `${instanceId}-${item.value}`}
            aria-selected={isSelected}
            aria-controls={item.controls}
            disabled={item.disabled}
            // roving tabindex — Tab 키로는 선택된 탭 하나에만 들어온다
            tabIndex={isSelected ? 0 : -1}
            onClick={() => select(item.value)}
            className={cn(
              tabBaseClasses,
              // cn()은 클래스를 병합하지 않으므로 색 클래스는 상태별로 하나만 방출한다
              item.disabled
                ? "cursor-not-allowed text-text-disabled"
                : isSelected
                  ? tabSelectedClasses
                  : "text-text-minimal hover:text-text-sub",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
