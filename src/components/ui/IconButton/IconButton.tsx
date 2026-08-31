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
} from "../Button/variants";

export type IconButtonVariant = ButtonVariant;
export type IconButtonSize = ButtonSize;

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "children"
> {
  /**
   * 스크린리더용 이름. 아이콘만 있는 버튼이라 **필수**다.
   * (DESIGN_참고.md §8 — 단독으로 의미를 갖는 아이콘 버튼은 aria-label 필수)
   */
  label: string;
  /** 아이콘 노드. 크기는 size에 맞춰 자동 강제된다 */
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** radius를 full로 (원형) */
  pill?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  /** 팝오버·툴팁 앵커, 포커스 제어용. React 19는 ref를 일반 prop으로 받는다 */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * DESIGN.md §2. 정사각 컨트롤이라 padding 대신 고정 크기 + center 정렬로 구현한다.
 * 아이콘 크기는 자식 svg에 직접 강제해, 사용처가 size를 따로 맞출 필요가 없게 한다.
 */
const sizeClasses: Record<IconButtonSize, string> = {
  large:
    "h-(--size-control-large) w-(--size-control-large) [&>svg]:size-6 [&>svg]:shrink-0",
  medium:
    "h-(--size-control-medium) w-(--size-control-medium) [&>svg]:size-4 [&>svg]:shrink-0",
  small:
    "h-(--size-control-small) w-(--size-control-small) [&>svg]:size-4 [&>svg]:shrink-0",
  xsmall:
    "h-(--size-control-xsmall) w-(--size-control-xsmall) [&>svg]:size-4 [&>svg]:shrink-0",
};

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "medium",
  pill = false,
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  ref,
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      className={cn(
        buttonBaseClasses,
        sizeClasses[size],
        pill ? "rounded-full" : buttonRadiusClasses[size],
        buttonVariantClasses[variant],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size={buttonSpinnerSize[size]} tone="current" />
      ) : (
        icon
      )}
    </button>
  );
}
