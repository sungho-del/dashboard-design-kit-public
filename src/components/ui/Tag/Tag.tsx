import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../../lib/cn";

export type TagTone = "default" | "success" | "warning" | "critical" | "custom";

export type TagSize = "small" | "medium" | "large";

/**
 * `tone="custom"`일 때 색을 주입하는 로컬 CSS 변수.
 * 값에는 반드시 semantic 토큰(`var(--color-*)`)을 넣는다 — 하드코딩 금지.
 */
export interface TagCustomStyle extends CSSProperties {
  /** custom tone 배경색 */
  "--tag-bg-color"?: string;
  /** custom tone 글자색 (dot 색도 이 값을 따라간다) */
  "--tag-color"?: string;
}

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  /** 색 조합. 상태 tone은 옅은 배경 + 같은 계열 글자색 (DESIGN_참고.md §1-3) */
  tone?: TagTone;
  size?: TagSize;
  /** 앞쪽 8×8 원형 도트. 색은 tone의 글자색과 동일하다 */
  dot?: boolean;
  style?: TagCustomStyle;
  children?: ReactNode;
}

/**
 * DESIGN.md §4. 타이포 프리셋이 font-weight 600을 이미 포함하므로
 * base에서 굵기를 따로 지정하지 않는다.
 * - small  11/12 · padding 4/6  · min-w 20
 * - medium 12/16 · padding 4/8  · min-w 24
 * - large  14/24 · padding 2/10 · min-w 28
 */
const sizeClasses: Record<TagSize, string> = {
  small: "min-w-5 px-1.5 py-1 label-xsmall",
  medium: "min-w-6 px-2 py-1 label-small-bold",
  large: "min-w-7 px-2.5 py-0.5 label-medium-bold",
};

/**
 * DESIGN.md §4. 상태 tone은 `surface-{상태}-secondary` 배경 +
 * `text-{상태}` 글자 조합이다. custom은 로컬 변수로 색을 주입받는다.
 */
const toneClasses: Record<TagTone, string> = {
  default: "bg-surface-sub text-text-sub",
  success: "bg-surface-success-secondary text-text-success",
  warning: "bg-surface-warning-secondary text-text-warning",
  critical: "bg-surface-critical-secondary text-text-critical",
  custom: "bg-(--tag-bg-color) text-(--tag-color)",
};

/**
 * 상태·분류를 나타내는 라벨. 클릭 대상이 아니라 표시 전용이므로
 * 항상 `<span>`으로 렌더링한다. (인터랙션이 필요하면 Button을 쓴다)
 */
export function Tag({
  tone = "default",
  size = "medium",
  dot = false,
  className = "",
  children,
  ...props
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1",
        "rounded-full whitespace-nowrap",
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        // 도트 색은 tone의 글자색(currentColor)을 그대로 따라간다
        <span
          data-tag-dot
          aria-hidden
          className="size-2 shrink-0 rounded-full bg-current"
        />
      )}
      {children}
    </span>
  );
}
