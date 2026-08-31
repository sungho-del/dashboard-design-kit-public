import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../../lib/cn";

export type SegmentedControlVariant = "solid" | "outline" | "raised";
export type SegmentedControlFill = "filled" | "plain";
export type SegmentedControlSize = "small" | "medium" | "large";

export interface SegmentedControlItem {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  items: SegmentedControlItem[];
  /** 제어 모드. 넘기면 선택 상태의 소유권이 사용처로 넘어간다 */
  value?: string;
  /** 비제어 모드의 초기 선택값. 생략하면 첫 번째 활성 항목이 선택된다 */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** 인디케이터 표현 방식 (DESIGN.md §10) */
  variant?: SegmentedControlVariant;
  /** 트랙 배경 — filled(surface-sub + padding 4) / plain(투명 + padding 0) */
  fill?: SegmentedControlFill;
  size?: SegmentedControlSize;
  /** 컨테이너 가로를 채우고 항목을 균등 분배한다 */
  fullWidth?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/** DESIGN.md §10 — 컨테이너: inline-flex · relative · radius medium */
const containerBaseClasses = "relative inline-flex items-center rounded-medium";

const fillClasses: Record<SegmentedControlFill, string> = {
  filled: "bg-surface-sub p-1",
  plain: "bg-transparent p-0",
};

/**
 * 인디케이터 — absolute · top 50% · radius small · pointer-events none · z 0.
 * 위치·크기는 선택된 항목을 실측해 inline style로 넣는다(아래 measure 참조).
 *
 * 이동은 design-core.md 모션 표의 "이동·변형" 계열이라 0.2s ease-in-out.
 */
const indicatorBaseClasses = cn(
  "pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 rounded-small",
  "transition-[left,width] duration-200 ease-in-out",
);

const indicatorVariantClasses: Record<SegmentedControlVariant, string> = {
  solid: "bg-action-primary",
  outline: "outline-2 -outline-offset-2 outline-action-primary",
  raised: "bg-action-secondary shadow-raised-button",
};

/**
 * 항목 공통 — relative · z 1 · transition color 0.3s (DESIGN.md §10).
 *
 * 타이포는 §10에 명시가 없다. design-core.md 기준 인라인 UI 라벨의 기본은
 * `label-medium-bold`(14/24)이고, 이 값이 아래 size별 높이(32/36/44)와도 맞는다.
 */
const itemBaseClasses = cn(
  "relative z-1 rounded-small whitespace-nowrap label-medium-bold",
  "transition-[color] duration-300 ease-out",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
);

/**
 * size — padding 4/12 · 6/12 · 10/12 → 높이 32 / 36 / 44 (라벨 행간 24 기준).
 *
 * min-width 54 / 60 / 64 중 **60·64는 4px 그리드에 떨어진다** — `--spacing: 4px` 라
 * `min-w-15`(60) · `min-w-16`(64) 이 그대로 성립한다(Tailwind v4 는 임의 정수 배수를 발행한다).
 * **54만** 4의 배수가 아니라 임의값이 불가피하다 (DESIGN.md §10 원본 수치).
 */
const sizeClasses: Record<SegmentedControlSize, string> = {
  small: "min-w-[54px] px-3 py-1",
  medium: "min-w-15 px-3 py-1.5",
  large: "min-w-16 px-3 py-2.5",
};

/** 선택된 항목의 글자색 — solid만 반전, outline·raised는 기본 text (DESIGN.md §10) */
const selectedTextClasses: Record<SegmentedControlVariant, string> = {
  solid: "text-text-inverse",
  outline: "text-text",
  raised: "text-text",
};

/** 이동 키 — radiogroup은 화살표로 선택을 옮기는 것이 표준 동작이다 */
const MOVE_KEYS = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];

interface IndicatorMetrics {
  left: number;
  width: number;
  height: number;
}

/**
 * DESIGN.md §10 SegmentedControl.
 *
 * 제어(`value` + `onValueChange`) / 비제어(`defaultValue`) 모두 지원한다.
 *
 * 접근성은 **radiogroup 패턴**을 택했다. tablist는 "각 탭이 패널을 제어한다"는
 * 전제를 깔지만, SegmentedControl은 정렬 기준·기간 필터처럼 패널 없이 값만
 * 고르는 자리에도 쓰인다. 값 하나를 고르는 의미가 그대로 드러나는
 * `role="radiogroup"` + `role="radio"` + `aria-checked`가 더 정확하다.
 * (패널을 전환하는 자리라면 Tabs를 쓸 것)
 */
export function SegmentedControl({
  items,
  value,
  defaultValue,
  onValueChange,
  variant = "solid",
  fill = "filled",
  size = "medium",
  fullWidth = false,
  className = "",
  ref,
  ...props
}: SegmentedControlProps) {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    () => defaultValue ?? items.find((item) => !item.disabled)?.value ?? "",
  );
  const selectedValue = isControlled ? value : uncontrolledValue;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [metrics, setMetrics] = useState<IndicatorMetrics | null>(null);

  /**
   * 선택된 버튼을 실측해 인디케이터 위치를 잡는다.
   *
   * 값이 같으면 이전 객체를 그대로 반환해 리렌더를 끊는다 — `items`를 인라인
   * 배열로 넘기는 사용처에서 effect가 매 렌더 돌아도 무한 루프가 되지 않게 하는 가드.
   */
  const measure = useCallback(() => {
    const node = itemRefs.current[selectedValue];
    if (!node) {
      setMetrics(null);
      return;
    }
    const next: IndicatorMetrics = {
      left: node.offsetLeft,
      width: node.offsetWidth,
      height: node.offsetHeight,
    };
    setMetrics((prev) =>
      prev &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.height === next.height
        ? prev
        : next,
    );
  }, [selectedValue]);

  // 페인트 전에 측정해야 인디케이터가 한 프레임 어긋나 보이지 않는다
  useLayoutEffect(() => {
    measure();
  });

  // 리렌더 없이 컨테이너 폭만 바뀌는 경우(fullWidth + 창 크기 변경)를 위한 재측정
  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return; // jsdom 등 미구현 환경 가드
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  /**
   * 내부 측정용 ref와 사용처가 넘긴 ref를 함께 채운다.
   * 매 렌더 새 함수를 만들면 React가 ref를 떼었다 붙이므로 useCallback으로 고정한다.
   */
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  function select(next: string) {
    if (!isControlled) setUncontrolledValue(next);
    onValueChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!MOVE_KEYS.includes(event.key)) return;

    const enabled = items.filter((item) => !item.disabled);
    if (enabled.length === 0) return;

    event.preventDefault();

    const current = enabled.findIndex((item) => item.value === selectedValue);
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const nextIndex =
      current < 0
        ? forward
          ? 0
          : enabled.length - 1
        : (current + (forward ? 1 : -1) + enabled.length) % enabled.length;

    const nextValue = enabled[nextIndex].value;
    select(nextValue);
    itemRefs.current[nextValue]?.focus();
  }

  return (
    <div
      ref={setRefs}
      role="radiogroup"
      onKeyDown={handleKeyDown}
      className={cn(
        containerBaseClasses,
        fillClasses[fill],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      <div
        data-part="indicator"
        aria-hidden="true"
        className={cn(indicatorBaseClasses, indicatorVariantClasses[variant])}
        // 실측값이라 토큰 대상이 아니다 — 디자인 수치가 아닌 런타임 좌표
        style={
          metrics
            ? {
                left: metrics.left,
                width: metrics.width,
                height: metrics.height,
              }
            : { width: 0, height: 0 }
        }
      />
      {items.map((item) => {
        const isSelected = item.value === selectedValue;
        return (
          <button
            key={item.value}
            ref={(node) => {
              itemRefs.current[item.value] = node;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={item.disabled}
            // roving tabindex — Tab 키로는 그룹 전체에 한 번만 들어온다
            tabIndex={isSelected ? 0 : -1}
            onClick={() => select(item.value)}
            className={cn(
              itemBaseClasses,
              sizeClasses[size],
              fullWidth && "flex-1",
              // cn()은 클래스를 병합하지 않으므로 색 클래스는 상태별로 하나만 방출한다.
              // §10에 hover 색 정의가 없어 hover 전환은 넣지 않는다.
              item.disabled
                ? "cursor-not-allowed text-text-disabled"
                : isSelected
                  ? selectedTextClasses[variant]
                  : "text-text-secondary",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
