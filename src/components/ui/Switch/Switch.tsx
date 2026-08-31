import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../../lib/cn";

export type SwitchSize = "medium" | "small";

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  /** 컨트롤 옆에 붙는 라벨 */
  label?: ReactNode;
  /** 라벨 아래 보조 설명. `aria-describedby`로 연결된다 */
  description?: ReactNode;
  /** 트랙 높이 — medium 24 / small 20 (DESIGN.md §26) */
  size?: SwitchSize;
  /** 에러 상태. `aria-invalid` + 경계선 critical */
  invalid?: boolean;
  /** 내부 `<input>`에 붙일 className. `className`은 바깥 `<label>`에 붙는다 */
  inputClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * 트랙 크기.
 *
 * 높이는 §26 규격(small 20 / medium 24). **폭은 원본에 없어 유추했다** `[유추]`.
 * thumb는 트랙보다 4 작고 좌우 여백이 2이므로, thumb가 자기 지름만큼 이동할 때
 * 양끝 여백이 정확히 2로 남는 값을 골랐다.
 *   small : 폭 36 = 2 + 16(thumb) + 16(이동) + 2
 *   medium: 폭 44 = 2 + 20(thumb) + 20(이동) + 2
 * 둘 다 4px 그리드 위의 값이고, on/off를 한눈에 구분할 만큼의 이동 거리를 준다.
 */
const trackSizeClasses: Record<SwitchSize, string> = {
  medium: "h-6 w-11",
  small: "h-5 w-9",
};

/** thumb — 트랙보다 4 작다 (medium 20 / small 16) */
const thumbSizeClasses: Record<SwitchSize, string> = {
  medium: "size-5",
  small: "size-4",
};

/** thumb 이동 거리 = thumb 지름 (medium 20 / small 16) */
const thumbTranslateClasses: Record<SwitchSize, string> = {
  medium: "group-has-[:checked]:translate-x-5",
  small: "group-has-[:checked]:translate-x-4",
};

/**
 * 라벨(`label-medium`, 행간 24) 첫 줄에 트랙을 맞추는 상단 여백.
 * medium은 트랙 높이가 24라 그대로 맞고, small은 (24 - 20) / 2 = 2.
 */
const trackOffsetClasses: Record<SwitchSize, string> = {
  medium: "",
  small: "mt-0.5",
};

/**
 * 트랙 공통. 색 전환은 design-core.md 모션 표의 "상태 색 변화" 0.1s.
 * thumb 이동은 "이동·변형" 0.2s로 따로 잡는다.
 */
const trackBaseClasses = cn(
  "relative inline-flex shrink-0 rounded-full",
  "transition-[background-color,outline-color] duration-100 ease-in-out",
);

/**
 * 포커스 링 전용 래퍼 — Checkbox·Radio와 동일한 구조.
 * invalid일 때 트랙이 `outline`을 경계선으로 쓰기 때문에 링은 한 겹 밖에서 그린다.
 */
const focusRingClasses = cn(
  "inline-flex rounded-full",
  "group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2 group-has-[:focus-visible]:outline-focus",
);

/**
 * DESIGN.md §26 Switch (원본 CSS에 없어 규격에서 유추한 컴포넌트).
 *
 * 네이티브 `<input type="checkbox" role="switch">`를 `sr-only`로 두고 시각 표현만
 * 형제 요소로 그린다. Space 토글·폼 제출·스크린리더의 on/off 안내가 기본 구현으로 따라온다.
 * `role="switch"`만 얹어 "선택"이 아니라 "켜짐/꺼짐"으로 읽히게 한다.
 *
 * **disabled를 opacity로 표현하지 않는다.** 반투명 처리는 배경이 무엇이냐에 따라
 * 결과 색이 달라져 토큰 체계 밖으로 새어 나간다. 대신 design-core.md의
 * "선택 상태 2종"(강한 선택 = `action-primary` / 약한 선택 = `action-primary-tonal`)을
 * 그대로 한 단계 낮춰 쓴다 — 켜짐은 tonal, 꺼짐은 tonal-disabled.
 * 이렇게 하면 비활성 상태에서도 켜짐이 꺼짐보다 진해 on/off 구분이 유지된다.
 */
export function Switch({
  label,
  description,
  size = "medium",
  invalid = false,
  disabled = false,
  id,
  className = "",
  inputClassName = "",
  ref,
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const labelTextId = `${inputId}-label`;

  const hasText = Boolean(label || description);

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group inline-flex gap-2 select-none",
        hasText ? "items-start" : "items-center",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        role="switch"
        disabled={disabled}
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
          trackSizeClasses[size],
          hasText && trackOffsetClasses[size],
        )}
      >
        <span
          data-part="track"
          className={cn(
            trackBaseClasses,
            "size-full",
            disabled
              ? cn(
                  "bg-action-primary-tonal-disabled",
                  "group-has-[:checked]:bg-action-primary-tonal",
                )
              : cn(
                  // off 트랙 — §26이 지정한 action-toggle(slate-tint-15)
                  "bg-action-toggle group-has-[:checked]:bg-action-primary",
                  invalid &&
                    "outline-1 -outline-offset-1 outline-border-critical",
                ),
          )}
        >
          <span
            data-part="thumb"
            className={cn(
              // 좌우·상하 여백 2 — 트랙보다 4 작은 thumb가 정확히 가운데 놓인다
              "absolute top-0.5 left-0.5 rounded-full",
              thumbSizeClasses[size],
              thumbTranslateClasses[size],
              "transition-transform duration-200 ease-in-out",
              disabled
                ? // 비활성은 그림자를 걷어 "떠 있지 않은" 상태로 만든다 (opacity 미사용)
                  "bg-surface shadow-none"
                : "bg-surface shadow-raised-button",
            )}
          />
        </span>
      </span>

      {hasText && (
        <span className="flex flex-col gap-0.5">
          {label && (
            <span
              id={labelTextId}
              className={cn(
                "label-medium",
                disabled ? "text-text-disabled" : "text-text",
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
                disabled ? "text-text-disabled" : "text-text-sub",
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
