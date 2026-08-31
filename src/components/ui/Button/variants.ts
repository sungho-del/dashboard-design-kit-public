import { cn } from "../../../lib/cn";

export type ButtonVariant =
  | "primary"
  | "primaryTonal"
  | "ghost"
  | "secondary"
  | "critical"
  | "criticalTonal"
  | "accent"
  | "accentTonal";

export type ButtonSize = "large" | "medium" | "small" | "xsmall";

/**
 * DESIGN.md §1-2. 각 variant는 default / hover / active(pressed) / disabled /
 * loading 5개 상태를 모두 정의한다.
 *
 * `disabled:data-[loading=true]:*` 는 선택자가 하나 더 붙어 명시도가 높으므로
 * 같은 요소의 `disabled:*` 규칙을 이긴다 → loading이 disabled 스타일을 덮는다.
 *
 * Button과 IconButton이 공유한다 (DESIGN.md §2: "variant·상태 전이는 Button과 완전히 동일").
 */
export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-action-primary text-text-inverse",
    "hover:bg-action-primary-hover active:bg-action-primary-pressed",
    "disabled:bg-action-primary-disabled disabled:text-text-disabled",
    "disabled:data-[loading=true]:bg-action-primary-pressed disabled:data-[loading=true]:text-text-inverse",
  ),
  primaryTonal: cn(
    "bg-action-primary-tonal text-text-secondary",
    "hover:bg-action-primary-tonal-hover active:bg-action-primary-tonal-pressed",
    "disabled:bg-action-primary-tonal-disabled disabled:text-text-disabled",
    "disabled:data-[loading=true]:bg-action-primary-tonal-pressed disabled:data-[loading=true]:text-text-secondary",
  ),
  ghost: cn(
    "bg-transparent text-text-secondary",
    "hover:bg-action-secondary-hover active:bg-action-secondary-pressed",
    "disabled:bg-transparent disabled:text-text-disabled",
    "disabled:data-[loading=true]:bg-action-secondary-pressed disabled:data-[loading=true]:text-text-secondary",
  ),
  secondary: cn(
    "bg-action-secondary text-text-secondary outline-1 -outline-offset-1 outline-border",
    "hover:bg-action-secondary-hover hover:outline-border-hover",
    "active:bg-action-secondary-pressed active:outline-border-sub",
    "disabled:bg-action-secondary-disabled disabled:text-text-disabled disabled:outline-transparent",
    "disabled:data-[loading=true]:bg-action-secondary-pressed disabled:data-[loading=true]:text-text-secondary disabled:data-[loading=true]:outline-border-sub",
  ),
  critical: cn(
    "bg-action-critical text-text-on",
    "hover:bg-action-critical-hover active:bg-action-critical-pressed",
    "disabled:bg-action-critical-disabled disabled:text-text-disabled",
    "disabled:data-[loading=true]:bg-action-critical-pressed disabled:data-[loading=true]:text-text-on",
  ),
  criticalTonal: cn(
    "bg-action-critical-tonal text-text-critical",
    "hover:bg-action-critical-tonal-hover active:bg-action-critical-tonal-pressed",
    "disabled:bg-action-critical-tonal-disabled disabled:text-text-disabled",
    "disabled:data-[loading=true]:bg-action-critical-tonal-pressed disabled:data-[loading=true]:text-text-critical",
  ),
  accent: cn(
    "bg-action-accent text-text",
    "hover:bg-action-accent-hover active:bg-action-accent-pressed",
    "disabled:bg-action-accent-disabled disabled:text-text-disabled",
    "disabled:data-[loading=true]:bg-action-accent-pressed disabled:data-[loading=true]:text-text",
  ),
  accentTonal: cn(
    "bg-action-accent-tonal text-text-accent",
    "hover:bg-action-accent-tonal-hover active:bg-action-accent-tonal-pressed",
    "disabled:bg-action-accent-tonal-disabled disabled:text-text-disabled",
    "disabled:data-[loading=true]:bg-action-accent-tonal-pressed disabled:data-[loading=true]:text-text-accent",
  ),
};

/** 컨트롤이 작아지면 radius도 함께 줄인다 (design-core.md) */
export const buttonRadiusClasses: Record<ButtonSize, string> = {
  large: "rounded-medium",
  medium: "rounded-medium",
  small: "rounded-small",
  xsmall: "rounded-small",
};

/** 버튼 계열 공통 base — 정렬·트랜지션·포커스 링 */
export const buttonBaseClasses = cn(
  "inline-flex items-center justify-center whitespace-nowrap",
  "transition-[background-color,color,outline-color] duration-100 ease-out",
  "disabled:cursor-not-allowed",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
);

/** 로딩 스피너 크기 — 라벨 크기에 맞춘 값 [유추] */
export const buttonSpinnerSize: Record<ButtonSize, number> = {
  large: 20,
  medium: 16,
  small: 16,
  xsmall: 12,
};
