import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../../lib/cn";

export type CheckboxSize = "medium" | "small";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  /** 컨트롤 옆에 붙는 라벨. 넘기면 `<label>`이 클릭 영역을 함께 갖는다 */
  label?: ReactNode;
  /** 라벨 아래 보조 설명. `aria-describedby`로 연결된다 */
  description?: ReactNode;
  /** 박스 크기 — medium 20 / small 16 (DESIGN.md §26) */
  size?: CheckboxSize;
  /**
   * 부분 선택. 테이블 전체선택 헤더처럼 "일부만 선택됨"을 표현한다.
   * 네이티브 `input.indeterminate`를 함께 세팅하므로 스크린리더에도 mixed로 전달된다.
   */
  indeterminate?: boolean;
  /** 에러 상태. `aria-invalid` + 경계선 critical */
  invalid?: boolean;
  /** 내부 `<input>`에 붙일 className. `className`은 바깥 `<label>`에 붙는다 */
  inputClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * 박스 크기 — DESIGN.md §26 "크기 20(라벨 옆 16)".
 * 라벨과 함께 쓰는 자리에서도 20이 기본이고, 테이블 셀처럼 밀도가 높은 곳에서 16을 쓴다.
 */
const boxSizeClasses: Record<CheckboxSize, string> = {
  medium: "size-5",
  small: "size-4",
};

/**
 * 체크 글리프 크기 `[유추]`.
 *
 * DESIGN_참고.md §8의 "아이콘 16/20/24"는 lucide 아이콘을 UI에 배치할 때의 규칙이라
 * 20px 컨트롤 **안에** 들어가는 글리프에는 그대로 적용할 수 없다.
 * 20 박스에는 16(상하좌우 여백 2), 16 박스에는 12(여백 2)로 같은 여백 비율을 유지했다.
 */
const iconSizeClasses: Record<CheckboxSize, string> = {
  medium: "size-4",
  small: "size-3",
};

/**
 * 글리프의 stroke 굵기 `[유추]`.
 *
 * viewBox가 16이므로 size-4(16px)에서는 1.2가 그대로 1.2px로 그려진다.
 * size-3(12px)에서는 0.75배로 줄어들기 때문에 1.6을 넣어 실제 렌더 굵기를
 * 1.2px로 맞췄다 — Clay의 `--border-icon`(1.2px)과 동일한 선 굵기를 유지하기 위함.
 */
const iconStrokeWidth: Record<CheckboxSize, number> = {
  medium: 1.2,
  small: 1.6,
};

/**
 * 라벨(`label-medium`, 행간 24)의 첫 줄 가운데에 박스를 맞추는 상단 여백.
 * (24 - 20) / 2 = 2 → mt-0.5 · (24 - 16) / 2 = 4 → mt-1
 */
const boxOffsetClasses: Record<CheckboxSize, string> = {
  medium: "mt-0.5",
  small: "mt-1",
};

/**
 * 박스 공통 — 경계선은 border가 아니라 `outline` + 음수 offset으로 그린다.
 * (design-core.md "경계선·포커스") 상태 색 전환은 0.1s.
 *
 * radius는 `rounded-small`(6)을 택했다 `[유추]`. design-core.md의
 * "컨트롤이 작아지면 radius도 함께 축소한다(8 → 6)" 규칙의 끝값이 6이고,
 * 남은 후보인 `rounded-xsmall`은 1px이라 사실상 직각이라 문서에서도 "특수"로 분류된다.
 * 20px 박스에 6은 버튼(8)과 같은 계열로 읽히는 값이다.
 */
const boxBaseClasses = cn(
  "inline-flex shrink-0 items-center justify-center",
  "rounded-small outline-1 -outline-offset-1",
  "transition-[background-color,outline-color] duration-100 ease-out",
);

/**
 * 포커스 링 전용 래퍼.
 *
 * 박스는 이미 경계선을 `outline`으로 쓰고 있어 같은 요소에 포커스 링을 얹으면
 * 두 규칙이 같은 CSS 속성을 두고 충돌한다. 그래서 박스와 크기가 동일한 래퍼를 한 겹 두고
 * 링(2px / offset +2 / focus)만 이 래퍼가 그린다.
 * (§26 "focus는 outline 2px focus, offset 2")
 */
const focusRingClasses = cn(
  "inline-flex rounded-small",
  "group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2 group-has-[:focus-visible]:outline-focus",
);

/** 체크 표시 — lucide에 의존하지 않고 직접 그린다 (Clay가 인라인 SVG 방식) */
function CheckGlyph({ size }: { size: CheckboxSize }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      // 미선택일 때는 감춘다. variant가 붙은 규칙이 명시도가 높아 base의 hidden을 덮는다
      className={cn(iconSizeClasses[size], "hidden group-has-[:checked]:block")}
    >
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth={iconStrokeWidth[size]}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 부분 선택 표시 — 가로 막대 */
function IndeterminateGlyph({ size }: { size: CheckboxSize }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={iconSizeClasses[size]}
    >
      <path
        d="M3.5 8h9"
        stroke="currentColor"
        strokeWidth={iconStrokeWidth[size]}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * DESIGN.md §26 Checkbox (원본 CSS에 없어 규격에서 유추한 컴포넌트).
 *
 * 네이티브 `<input type="checkbox">`를 `sr-only`로 두고 시각 표현만 형제 요소로 그린다.
 * 폼 제출·키보드(Space)·스크린리더 동작이 브라우저 기본 구현 그대로 따라오므로
 * `role="checkbox"`를 손으로 구현하지 않는다.
 *
 * 선택 상태는 CSS(`group-has-[:checked]`)로 읽는다 — 제어/비제어 어느 쪽이든,
 * 그리고 `form.reset()` 같은 브라우저 동작에도 표현이 항상 실제 값과 일치한다.
 * 반면 `indeterminate`·`disabled`·`invalid`는 사용처가 명시적으로 넘기는 값이라
 * JS에서 분기한다(같은 CSS 속성을 두 규칙이 다투지 않게 하려는 의도).
 */
export function Checkbox({
  label,
  description,
  size = "medium",
  indeterminate = false,
  invalid = false,
  disabled = false,
  id,
  className = "",
  inputClassName = "",
  ref,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const labelTextId = `${inputId}-label`;

  const innerRef = useRef<HTMLInputElement | null>(null);

  /** 내부 ref(indeterminate 세팅용)와 사용처 ref를 함께 채운다 */
  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  /**
   * `indeterminate`는 속성이 아니라 DOM 프로퍼티라 React가 렌더로 반영해주지 않는다.
   * 또한 사용자가 클릭하면 브라우저가 이 값을 스스로 false로 되돌리므로,
   * deps 없이 매 렌더 다시 맞춰 prop과 DOM이 어긋나지 않게 한다.
   */
  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  });

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
        ref={setRefs}
        id={inputId}
        type="checkbox"
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
          boxSizeClasses[size],
          hasText && boxOffsetClasses[size],
        )}
      >
        <span
          data-part="box"
          className={cn(
            boxBaseClasses,
            "size-full",
            disabled
              ? // disabled: 배경·아이콘 모두 비활성 토큰. 경계선까지 지우면
                // 20px 박스가 흰 배경에서 사라져 보여 border는 남긴다
                "bg-field-disabled text-icon-disabled outline-border"
              : indeterminate
                ? // 부분 선택도 "선택된 상태"의 일종이라 선택과 같은 채움을 쓴다
                  "bg-action-primary text-text-inverse outline-action-primary"
                : cn(
                    "bg-field text-text-inverse",
                    invalid
                      ? // error: 경계선만 critical로. 선택되면 채움은 그대로 primary
                        "outline-border-critical group-has-[:checked]:bg-action-primary"
                      : cn(
                          "outline-border-minimal group-hover:outline-border-hover",
                          "group-has-[:checked]:bg-action-primary group-has-[:checked]:outline-action-primary",
                          // hover와 checked는 명시도가 같아 순서에 따라 승자가 갈린다.
                          // variant를 겹쳐 명시도를 한 단계 올려 선택 상태가 항상 이기게 한다
                          "group-has-[:checked]:group-hover:outline-action-primary",
                        ),
                  ),
          )}
        >
          {indeterminate ? (
            <IndeterminateGlyph size={size} />
          ) : (
            <CheckGlyph size={size} />
          )}
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
