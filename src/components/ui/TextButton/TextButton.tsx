import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../../lib/cn";

export type TextButtonTone =
  "accent" | "secondary" | "critical" | "warning" | "on";

export type TextButtonSize = "large" | "medium" | "small";

export interface TextButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  /** 색 계열. 기본은 링크형의 기본값인 accent (DESIGN.md §3) */
  tone?: TextButtonTone;
  size?: TextButtonSize;
  type?: "button" | "submit" | "reset";
  children?: ReactNode;
  /** 팝오버·툴팁 앵커, 포커스 제어용. React 19는 ref를 일반 prop으로 받는다 */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * DESIGN.md §3. 배경이 없는 링크형 버튼이라 높이·radius가 없고
 * 타이포와 상하 padding만으로 크기가 결정된다.
 * - large / medium: padding 0 · gap 2
 * - small: 상하 4 · gap 1 (아이콘이 붙어도 라인이 커지지 않게)
 *
 * gap은 base가 아니라 size에 둔다 — base에 두면 small의 `gap-px`와
 * 같은 요소에서 충돌하는데, cn()은 클래스 병합을 하지 않아 승자가
 * 스타일시트 순서에 좌우되기 때문이다.
 */
const sizeClasses: Record<TextButtonSize, string> = {
  large: "gap-0.5 p-0 label-large-bold",
  medium: "gap-0.5 p-0 label-medium-bold",
  small: "gap-px px-0 py-1 label-small-bold",
};

/**
 * DESIGN.md §3. tone별 default / hover / disabled.
 *
 * `on`만 예외 — 어두운 배경 위에 얹는 흰 텍스트라 hover에서 색을 바꾸지 않고
 * opacity 0.75로 눌러 표현한다. disabled에서는 그 opacity를 되돌려야 하므로
 * variant가 2개 붙은 `disabled:hover:opacity-100`으로 명시도를 높여 덮는다.
 */
const toneClasses: Record<TextButtonTone, string> = {
  accent: cn(
    "text-text-accent hover:text-text-accent-hover",
    "disabled:text-text-disabled",
  ),
  secondary: cn(
    "text-text-secondary hover:text-text-secondary-hover",
    "disabled:text-text-disabled",
  ),
  critical: cn(
    "text-text-critical hover:text-text-critical-hover",
    "disabled:text-text-disabled",
  ),
  warning: cn(
    "text-text-warning hover:text-text-warning-hover",
    "disabled:text-text-disabled",
  ),
  on: cn(
    "text-text-on hover:opacity-75",
    "disabled:text-text-disabled disabled:hover:opacity-100",
  ),
};

export function TextButton({
  tone = "accent",
  size = "medium",
  disabled = false,
  type = "button",
  className = "",
  children,
  ref,
  ...props
}: TextButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        // base: DESIGN.md §3 — inline-flex center · bg transparent (gap은 size에서)
        "inline-flex items-center justify-center bg-transparent whitespace-nowrap",
        // 상태 전이 0.1s ease-out (design-core.md). on tone의 opacity도 같이 태운다
        "transition-[color,opacity] duration-100 ease-out",
        "disabled:cursor-not-allowed",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
