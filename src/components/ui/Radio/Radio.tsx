import {
  createContext,
  useContext,
  useId,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../../lib/cn";

export type RadioSize = "medium" | "small";

export interface RadioProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  /** 컨트롤 옆에 붙는 라벨 */
  label?: ReactNode;
  /** 라벨 아래 보조 설명. `aria-describedby`로 연결된다 */
  description?: ReactNode;
  /** 원 크기 — medium 20 / small 16 (DESIGN.md §26) */
  size?: RadioSize;
  /** 에러 상태. `aria-invalid` + 경계선 critical */
  invalid?: boolean;
  /** 내부 `<input>`에 붙일 className. `className`은 바깥 `<label>`에 붙는다 */
  inputClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

/** 원 크기 — Checkbox와 동일한 규격을 공유한다 (DESIGN.md §26) */
const circleSizeClasses: Record<RadioSize, string> = {
  medium: "size-5",
  small: "size-4",
};

/**
 * 가운데 점 크기.
 * medium은 §26 규격대로 8. small은 원 크기 비율(16/20)을 그대로 적용한 6 `[유추]`.
 */
const dotSizeClasses: Record<RadioSize, string> = {
  medium: "size-2",
  small: "size-1.5",
};

/** 라벨(행간 24) 첫 줄에 원을 맞추는 상단 여백 — Checkbox와 동일 */
const circleOffsetClasses: Record<RadioSize, string> = {
  medium: "mt-0.5",
  small: "mt-1",
};

/**
 * 원 공통 — 경계선은 `outline` + 음수 offset (design-core.md "경계선·포커스").
 * 상태 색 전환 0.1s.
 */
const circleBaseClasses = cn(
  "inline-flex shrink-0 items-center justify-center",
  "rounded-full outline-1 -outline-offset-1",
  "transition-[background-color,outline-color] duration-100 ease-out",
);

/**
 * 포커스 링 전용 래퍼 — Checkbox와 같은 이유로 한 겹 분리한다.
 * (원 자신은 `outline`을 경계선으로 이미 쓰고 있어 같은 요소에 링을 얹을 수 없다)
 */
const focusRingClasses = cn(
  "inline-flex rounded-full",
  "group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2 group-has-[:focus-visible]:outline-focus",
);

/**
 * 선택 표시 — 인라인 SVG로 직접 그린다 (lucide 비의존).
 * 미선택일 때는 감춘다. variant가 붙은 규칙이 명시도가 높아 base의 hidden을 덮는다.
 */
function DotGlyph({ size }: { size: RadioSize }) {
  return (
    <svg
      viewBox="0 0 8 8"
      aria-hidden="true"
      className={cn(dotSizeClasses[size], "hidden group-has-[:checked]:block")}
    >
      <circle cx="4" cy="4" r="4" fill="currentColor" />
    </svg>
  );
}

interface RadioGroupContextValue {
  name: string;
  /** 그룹이 선택값을 소유하고 있는지. false면 각 Radio가 비제어로 동작한다 */
  managed: boolean;
  value: string | undefined;
  disabled: boolean | undefined;
  onSelect: (value: string) => void;
}

/** RadioGroup → Radio로 name·선택값·disabled를 내려보내는 통로 */
const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

/**
 * DESIGN.md §26 Radio (원본 CSS에 없어 규격에서 유추한 컴포넌트).
 *
 * 네이티브 `<input type="radio">`를 `sr-only`로 두고 시각 표현만 형제 요소로 그린다.
 * 같은 `name`끼리의 그룹 동작·화살표 키 이동·폼 제출이 브라우저 기본 구현으로 따라온다.
 *
 * **선택 표현은 "테두리 + 가운데 점"을 택했다** `[유추]`.
 * §26은 "체크 시 action-primary"라고만 하고 채움/테두리를 못박지 않는데,
 * 대안인 "검은 원 + 흰 점"은 같은 크기의 Checkbox 선택 상태(검은 사각형 + 흰 체크)와
 * 실루엣이 거의 같아져 20px에서 둘을 구분하기 어렵다.
 * design-core.md 필수 규칙 5("색만으로 의미 전달 금지")를 형태에도 적용하면,
 * 링 안의 점이라는 라디오 고유의 실루엣을 유지하는 편이 낫다.
 * 선택 시 테두리는 2px로 굵어져(offset -2) 선택 강도도 함께 올라간다.
 */
export function Radio({
  label,
  description,
  size = "medium",
  invalid = false,
  disabled,
  name,
  value,
  checked,
  onChange,
  id,
  className = "",
  inputClassName = "",
  ref,
  ...props
}: RadioProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const labelTextId = `${inputId}-label`;

  const group = useContext(RadioGroupContext);

  // 그룹 안에 있으면 name·선택값·disabled를 그룹에서 물려받되, 개별 지정이 항상 우선한다
  const resolvedName = name ?? group?.name;
  const resolvedDisabled = disabled ?? group?.disabled ?? false;
  const resolvedChecked =
    checked ?? (group?.managed ? group.value === value : undefined);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange?.(event);
    if (event.target.checked) group?.onSelect(String(value ?? ""));
  }

  const hasText = Boolean(label || description);

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group inline-flex gap-2 select-none",
        hasText ? "items-start" : "items-center",
        resolvedDisabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      <input
        ref={ref}
        id={inputId}
        type="radio"
        name={resolvedName}
        value={value}
        checked={resolvedChecked}
        disabled={resolvedDisabled}
        onChange={handleChange}
        // description이 같은 <label> 안에 있어 그대로 두면 접근성 이름에 설명까지
        // 섞여 읽힌다. 이름은 라벨 텍스트로 못박고 설명은 describedby로만 전달한다
        aria-labelledby={label ? labelTextId : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cn("sr-only", inputClassName)}
        {...props}
      />

      <span
        className={cn(
          focusRingClasses,
          circleSizeClasses[size],
          hasText && circleOffsetClasses[size],
        )}
      >
        <span
          data-part="circle"
          className={cn(
            circleBaseClasses,
            "size-full",
            resolvedDisabled
              ? // disabled: 점까지 icon-disabled로 내린다. 경계선을 지우면 원이
                // 흰 배경에서 사라져 보여 border는 남긴다
                "bg-field-disabled text-icon-disabled outline-border"
              : cn(
                  "bg-field text-action-primary",
                  invalid
                    ? // error: 경계선만 critical. 선택되면 굵기만 2px로 올린다
                      "outline-border-critical group-has-[:checked]:outline-2 group-has-[:checked]:-outline-offset-2"
                    : cn(
                        "outline-border-minimal group-hover:outline-border-hover",
                        "group-has-[:checked]:outline-2 group-has-[:checked]:-outline-offset-2 group-has-[:checked]:outline-action-primary",
                        // hover와 checked는 명시도가 같아 순서에 따라 승자가 갈린다.
                        // variant를 겹쳐 선택 상태가 항상 이기게 한다
                        "group-has-[:checked]:group-hover:outline-action-primary",
                      ),
                ),
          )}
        >
          <DotGlyph size={size} />
        </span>
      </span>

      {hasText && (
        <span className="flex flex-col gap-0.5">
          {label && (
            <span
              id={labelTextId}
              className={cn(
                "label-medium",
                resolvedDisabled ? "text-text-disabled" : "text-text",
              )}
            >
              {label}
            </span>
          )}
          {description && (
            <span
              id={descriptionId}
              className={cn(
                "body-small",
                resolvedDisabled ? "text-text-disabled" : "text-text-sub",
              )}
            >
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}

/* ─────────────────────────────────────────────────────────
 * RadioGroup
 * ───────────────────────────────────────────────────────── */

export type RadioGroupOrientation = "vertical" | "horizontal";

export interface RadioGroupProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue"
> {
  /** 그룹 이름. 생략하면 `useId()`로 자동 생성한다 */
  name?: string;
  /** 제어 모드 */
  value?: string;
  /** 비제어 모드의 초기 선택값 */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** 배치 방향 — 세로(기본) / 가로 */
  orientation?: RadioGroupOrientation;
  /** 그룹의 접근성 이름. 화면에도 보이는 제목으로 렌더링된다 */
  label?: ReactNode;
  /** 그룹 전체 비활성 */
  disabled?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 항목 간격 `[유추]`.
 * design-core.md의 4px 그리드 리듬(4/8/12/16/24) 중, 설명이 붙은 항목까지 고려해
 * 세로는 12(gap-3), 한 줄에 늘어서는 가로는 16(gap-4)을 기본으로 둔다.
 */
const orientationClasses: Record<RadioGroupOrientation, string> = {
  vertical: "flex flex-col gap-3",
  horizontal: "flex flex-row flex-wrap items-center gap-4",
};

/**
 * Radio 그룹 래퍼.
 *
 * 접근성 이름을 갖는 `role="radiogroup"`을 씌운다 — 네이티브 radio는 `name`으로
 * 묶이지만 그 묶음에 "무엇을 고르는 그룹인지"를 알리는 이름이 없기 때문이다.
 *
 * 선택값은 제어(`value`)/비제어(`defaultValue`) 모두 지원한다. 둘 다 넘기지 않으면
 * 그룹은 선택값을 소유하지 않고 `name`만 나눠준다 — 각 Radio의 `defaultChecked`가
 * 그대로 살아 있어야 하고, 비제어에서 제어로 바뀌며 React 경고가 나는 것도 막는다.
 */
export function RadioGroup({
  name,
  value,
  defaultValue,
  onValueChange,
  orientation = "vertical",
  label,
  disabled,
  children,
  className = "",
  ref,
  ...props
}: RadioGroupProps) {
  const generatedId = useId();
  const groupName = name ?? generatedId;
  const labelId = `${generatedId}-label`;

  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const managed = isControlled || defaultValue !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;

  function handleSelect(next: string) {
    if (!isControlled) setUncontrolledValue(next);
    onValueChange?.(next);
  }

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-orientation={orientation}
      aria-labelledby={label ? labelId : undefined}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {label && (
        <span id={labelId} className="label-medium-bold text-text">
          {label}
        </span>
      )}
      <div className={orientationClasses[orientation]}>
        <RadioGroupContext.Provider
          value={{
            name: groupName,
            managed,
            value: currentValue,
            disabled,
            onSelect: handleSelect,
          }}
        >
          {children}
        </RadioGroupContext.Provider>
      </div>
    </div>
  );
}
