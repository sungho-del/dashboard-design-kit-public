import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../../lib/cn";
import { Spinner } from "../Spinner";
import {
  buttonBaseClasses,
  buttonRadiusClasses,
  buttonSpinnerSize,
  buttonVariantClasses,
  type ButtonSize,
  type ButtonVariant,
} from "./variants";

export type { ButtonVariant, ButtonSize };

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 컨테이너 가로를 채운다 */
  fullWidth?: boolean;
  /** radius를 full로 (알약 형태) */
  pill?: boolean;
  /**
   * 로딩 상태. 자동으로 클릭을 막지만 disabled와 다르게 보인다 —
   * 배경만 pressed로 내려가고 텍스트·아이콘 색은 그대로 유지한다. (DESIGN.md §1-3)
   */
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  children?: ReactNode;
  /** 팝오버·툴팁 앵커, 포커스 제어용. React 19는 ref를 일반 prop으로 받는다 */
  ref?: Ref<HTMLButtonElement>;
}

/** DESIGN.md §1-1 */
const sizeClasses: Record<ButtonSize, string> = {
  large: "h-(--size-control-large) min-w-20 gap-2 px-4 label-large-bold",
  medium: "h-(--size-control-medium) min-w-16 gap-2 px-3 label-medium-bold",
  small: "h-(--size-control-small) min-w-12 gap-1 px-3 label-medium-bold",
  xsmall: "h-(--size-control-xsmall) min-w-10 gap-1 px-2 label-small-bold",
};

export function Button({
  variant = "primary",
  size = "medium",
  fullWidth = false,
  pill = false,
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn(
        buttonBaseClasses,
        sizeClasses[size],
        pill ? "rounded-full" : buttonRadiusClasses[size],
        buttonVariantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Spinner size={buttonSpinnerSize[size]} tone="current" />}
      {children}
    </button>
  );
}
