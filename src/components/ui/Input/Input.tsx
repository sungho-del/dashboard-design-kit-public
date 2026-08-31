import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import { cn } from "../../../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 필드 앞(좌측)에 붙는 아이콘 슬롯. 아이콘 라이브러리에 의존하지 않는다 */
  leftIcon?: ReactNode;
  /** 필드 뒤(우측)에 붙는 아이콘 슬롯 */
  rightIcon?: ReactNode;
  /**
   * 에러 상태. 배경을 critical로 바꾸고 `aria-invalid`를 함께 노출한다.
   * (DESIGN.md §5 — error)
   */
  invalid?: boolean;
  /** 내부 `<input>`에 붙일 className. `className`은 바깥 필드(래퍼)에 붙는다 */
  inputClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * DESIGN.md §5 Input.
 *
 * 핵심 규칙: **border를 쓰지 않고 `outline` + 음수 offset으로 경계를 그린다.**
 * border는 상태가 바뀔 때(1px → 2px) 박스 크기를 바꿔 레이아웃을 밀지만,
 * outline은 박스 밖에 그려지므로 음수 offset으로 안쪽에 당겨 놓으면
 * 두께가 변해도 레이아웃이 흔들리지 않는다. (design-core.md "경계선·포커스")
 *
 * focus는 hover 위에서도 유지되어야 한다. cn()은 클래스 병합을 하지 않고
 * Tailwind의 variant 정렬 순서상 hover가 focus-within보다 뒤에 올 수 있으므로,
 * variant를 2개 겹친 `focus-within:hover:*`로 명시도를 높여 hover를 덮는다.
 */
const fieldBaseClasses = cn(
  "flex items-center",
  // 필드: height 40 · min-width 240 · padding 0 12 · gap 8
  "h-(--size-control-medium) min-w-60 gap-2 px-3",
  "rounded-medium",
  "transition-[background-color] duration-100 ease-out",
);

/** 포커스: 2px / offset -2 / focus 색. hover 상태에서도 유지된다 */
const fieldFocusClasses = cn(
  "focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-focus",
  "focus-within:hover:outline-focus",
);

export function Input({
  leftIcon,
  rightIcon,
  invalid = false,
  disabled = false,
  className = "",
  inputClassName = "",
  ref,
  ...props
}: InputProps) {
  return (
    <div
      data-disabled={disabled || undefined}
      data-invalid={invalid || undefined}
      className={cn(
        fieldBaseClasses,
        // 배경·경계선은 상태별로 **한 번씩만** 방출한다.
        // cn() 은 클래스를 병합하지 않으므로 base 에서 bg/outline 을 먼저 내보내고
        // disabled 에서 덮으려 하면 명시도가 같아(둘 다 (0,1,0)) 스타일시트 순서가
        // 승자를 정한다. 실제로 그렇게 두었더니 disabled 가 흰 배경 + 1px 경계선으로
        // 그려져 활성 상태와 구분되지 않았다. 그래서 완전 배타 분기로 바꿨다.
        disabled
          ? // disabled: 배경 교체 + 경계선 제거. 포커스가 들어올 수 없어 focus 규칙은 생략
            "cursor-not-allowed bg-field-disabled outline-0"
          : cn(
              // error: 배경만 critical로. 경계선은 hover 에서만 critical-hover 로 바뀐다 (§5)
              invalid ? "bg-surface-critical-secondary" : "bg-surface",
              "outline-1 -outline-offset-1 outline-border",
              invalid
                ? "hover:outline-border-critical-hover"
                : "hover:outline-border-hover",
              fieldFocusClasses,
            ),
        className,
      )}
    >
      {leftIcon && (
        <span className="flex shrink-0 items-center">{leftIcon}</span>
      )}
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          // inner input: height 24 · flex 1 1 0 · outline none · bg transparent · 14/24/400
          "h-6 flex-1 bg-transparent outline-none label-medium",
          // flex 아이템의 기본 min-width:auto는 input의 기본 폭(size 속성)만큼 버텨
          // 래퍼를 넓혀버린다. flex-1이 실제로 줄어들 수 있게 min-w-0을 함께 준다
          "min-w-0",
          "text-text placeholder:text-text-minimal",
          "disabled:cursor-not-allowed disabled:text-text-disabled disabled:placeholder:text-text-disabled",
          inputClassName,
        )}
        {...props}
      />
      {rightIcon && (
        <span className="flex shrink-0 items-center">{rightIcon}</span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * 5-1. 부착형 버튼 그룹
 * ---------------------------------------------------------------------- */

export interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * DESIGN.md §5-1 부착 그룹 — 필드 **우측**에 버튼을 붙인다.
 * (원본 `.sjcokif`: `inline-flex` · `align-items: stretch` · `flex-shrink: 0`)
 *
 * 원본은 필드에 별도 클래스(`.sjcokie`)를 얹어 우측 radius를 지웠지만, 여기서는
 * 그룹이 자식 선택자로 처리한다 — `Input`에 "지금 붙어 있나" 상태를 들려주지
 * 않아도 되므로 조합 순서만 지키면 알아서 맞는다.
 *
 * 마지막 자식의 우측 radius는 붙는 쪽(`InputAttachedButton`)이 자기 몫으로
 * 갖는다. 여기서 다시 방출하면 `cn()`이 병합을 안 해 같은 속성이 두 번 나온다.
 */
export function InputGroup({
  className = "",
  children,
  ref,
  ...props
}: InputGroupProps) {
  return (
    <div
      ref={ref}
      data-input-group
      className={cn(
        "inline-flex shrink-0 items-stretch",
        // 맞닿는 면의 radius만 지운다. 바깥쪽 두 모서리는 각 요소가 그대로 유지
        "[&>*:not(:last-child)]:rounded-r-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface InputAttachedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 드롭다운이 열린 상태 등 "눌려 있음" 표시 (원본 `.sjcokih`) */
  active?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * DESIGN.md §5-1 부착형 버튼 — **height 40 × width 56** · padding 8 · gap 8 ·
 * `bg: action-secondary` · `color: text-secondary` · 14 / 20 / 600.
 *
 * ## 경계선이 왜 `outline`이 아니라 inset box-shadow인가
 *
 * 이 프로젝트의 기본 규칙은 `outline` + 음수 offset이지만, 여기서는 **3면**
 * (위·오른쪽·아래)만 그려야 한다. 좌측은 필드와 맞닿는 면이라 필드의 outline이
 * 이미 그 자리를 차지하고 있어, 여기서 또 그리면 2px로 겹쳐 보인다.
 * `outline`은 4면 일괄이라 면을 고를 수 없다.
 *
 * 그래서 원본(`.sjcokig`)과 똑같이 inset box-shadow 3개로 그린다.
 * box-shadow 는 박스 크기에 영향을 주지 않아 40×56 이 그대로 유지되고,
 * 색은 `var(--color-border)` 를 참조하므로 테마 전환도 따라간다.
 */
export function InputAttachedButton({
  active = false,
  type = "button",
  disabled = false,
  className = "",
  children,
  ref,
  ...props
}: InputAttachedButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      data-active={active || undefined}
      className={cn(
        // height 40 × width 56 · padding 8 · gap 8 · 우측 모서리만 radius
        "flex h-(--size-control-medium) w-14 shrink-0 items-center justify-center gap-2 rounded-r-medium p-2",
        // §5-1 은 14 / 20 / 600. `label-medium-bold`(leading 24)가 아니라
        // `body-medium-bold`(leading 20)가 원본 `.sjcokig`와 일치한다.
        "whitespace-nowrap body-medium-bold",
        "transition-[background-color] duration-100 ease-in-out",
        // 3면(위·오른쪽·아래) 경계선. 좌측은 필드의 outline 이 이미 그린다
        "shadow-[inset_0_1px_0_var(--color-border),inset_-1px_0_0_var(--color-border),inset_0_-1px_0_var(--color-border)]",
        // 배경·전경은 상태별로 상호배타 또는 명시도 순으로만 방출한다 (cn()은 병합하지 않는다).
        //   base(0,1,0) < disabled(0,2,0) · active(0,2,0) < hover(0,3,0) < active+hover(0,4,0)
        // `enabled:`를 끼워 disabled와 hover가 동시에 성립하지 않게 못박는다.
        "bg-action-secondary text-text-secondary",
        "enabled:hover:bg-action-secondary-hover",
        "data-[active]:bg-action-primary-tonal",
        "enabled:data-[active]:hover:bg-action-primary-tonal",
        "disabled:cursor-not-allowed disabled:bg-field-disabled disabled:text-text-disabled",
        // active 와 disabled 는 동시에 성립할 수 있는데 둘 다 (0,2,0) 이라 순서 의존이 된다.
        // disabled 를 한 단계 올려 항상 이기게 한다.
        "disabled:data-[active]:bg-field-disabled",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
