import {
  useId,
  useState,
  type ChangeEvent,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../../../lib/cn";

export type TextareaResize = "none" | "vertical";

export interface TextareaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "rows"
> {
  /**
   * 에러 상태. 배경을 critical로 바꾸고 `aria-invalid`를 함께 노출한다.
   * (DESIGN.md §5 — error)
   */
  invalid?: boolean;
  /**
   * 최소 높이를 행 수로 지정한다. 기본 3행.
   * 네이티브 `rows`와 `min-height`를 함께 세팅하므로, 사용자가 리사이즈로
   * 이 높이 아래로 줄일 수 없다. (`rows`만으로는 바닥이 생기지 않는다)
   */
  minRows?: number;
  /** 리사이즈 방향. 기본 세로만 허용 */
  resize?: TextareaResize;
  /** 내부 `<textarea>`에 붙일 className. `className`은 바깥 필드(래퍼)에 붙는다 */
  textareaClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * 한 행의 높이. DESIGN.md §5 inner input "14 / 24 / 400" — 즉 `label-medium`
 * 프리셋의 line-height 24px이다. `minRows`를 실제 px 바닥값으로 바꿀 때 쓴다.
 */
const LINE_HEIGHT = 24;

/**
 * 필드 공통 — DESIGN.md §26 Textarea("§5 Input 규격 준용, min-height만 별도").
 *
 * 경계선은 border가 아니라 `outline` + 음수 offset으로 그린다.
 * (design-core.md "경계선·포커스") 두께가 1 → 2로 바뀌어도 박스 크기가 변하지 않는다.
 *
 * **§5에서 의도적으로 벗어난 지점: padding.**
 * §5 Input은 `0 12`(세로 패딩 없음)다 — 높이 40 필드 안에서 24px 한 줄을
 * 세로 중앙정렬하는 구조라 패딩이 필요 없기 때문이다. textarea는 여러 줄이
 * 위에서부터 쌓이므로 세로 패딩이 없으면 첫 줄이 경계선에 붙는다.
 * 그래서 §5의 가로값 12를 사방에 적용해 `p-3`(12)으로 두었다.
 * 새 값을 만들지 않고 §5 안의 값을 재사용한 것이며,
 * 덕분에 기본 min-height가 24 × 3행 + 12 × 2 = **96**으로 정확히 떨어진다.
 *
 * 래퍼는 flex가 아니라 블록이다. flex 아이템이 되면 `flex-basis`가 주축 크기를
 * 결정해버려 사용자가 리사이즈로 준 inline height가 먹지 않는다.
 * 블록으로 두면 textarea 높이가 그대로 래퍼 높이가 된다.
 */
const fieldBaseClasses = cn(
  "min-w-60 px-3 pt-3",
  "rounded-medium",
  "transition-[background-color] duration-100 ease-out",
);

/**
 * 아래 패딩 — 카운터가 있으면 8(카운터 줄이 원본 실측 `bottom 8` 에 앉는다), 없으면 12.
 * 배타적으로 하나만 방출한다(cn 은 병합하지 않는다).
 */
const bottomPadding = (showCount: boolean) => (showCount ? "pb-2" : "pb-3");

/** 포커스: 2px / offset -2 / focus 색. hover 상태에서도 유지된다 */
const fieldFocusClasses = cn(
  "focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-focus",
  "focus-within:hover:outline-focus",
);

const resizeClasses: Record<TextareaResize, string> = {
  none: "resize-none",
  vertical: "resize-y",
};

/** value가 문자열이 아닐 수도 있어(number 등) 안전하게 길이를 센다 */
function lengthOf(value: TextareaProps["value"]): number {
  if (value === undefined || value === null) return 0;
  return String(value).length;
}

/**
 * DESIGN.md §26 Textarea.
 *
 * 원본 Clay CSS에서 확인된 유일한 실측값은 글자수 카운터의 위치
 * (`style_textareaCount` — `position: absolute; bottom: 8; right: 12`)다.
 * 나머지 색·경계선·타이포·상태는 §5 Input 규격을 그대로 준용한다.
 *
 * 카운터는 `maxLength`가 있을 때만 나타난다. **절대배치가 아니라 textarea 아래 자기 줄**에
 * 오른쪽 정렬로 둔다(필드 기준 bottom 8 · right 12 는 같다). 절대배치일 때는 세로 리사이즈
 * 손잡이(textarea 오른쪽 아래 모서리)와 카운터가 같은 자리에 포개졌다(2026-11-03).
 * 자기 줄이라 글자가 카운터 밑으로 흐를 일도 없어 textarea 아래 여백(`pb-4`)도 필요 없다.
 */
export function Textarea({
  invalid = false,
  minRows = 3,
  resize = "vertical",
  disabled = false,
  maxLength,
  value,
  defaultValue,
  onChange,
  id,
  style,
  className = "",
  textareaClassName = "",
  "aria-describedby": ariaDescribedby,
  ref,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const countId = `${textareaId}-count`;

  // 비제어 입력의 글자수는 직접 센다. 제어 입력이면 value가 정본이라 상태를 쓰지 않는다
  const isControlled = value !== undefined;
  const [uncontrolledLength, setUncontrolledLength] = useState(() =>
    lengthOf(defaultValue),
  );
  const valueLength = isControlled ? lengthOf(value) : uncontrolledLength;

  const showCount = maxLength !== undefined;

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    if (!isControlled) setUncontrolledLength(event.target.value.length);
    onChange?.(event);
  }

  return (
    <div
      data-disabled={disabled || undefined}
      data-invalid={invalid || undefined}
      className={cn(
        fieldBaseClasses,
        bottomPadding(showCount),
        // 배경·경계선은 상태별로 한 번씩만 방출한다. cn()은 클래스 병합을 하지 않아
        // 같은 속성을 두 곳에서 내보내면 스타일시트 순서가 승자를 정하기 때문이다
        disabled
          ? // disabled: 배경 교체 + 경계선 제거. 포커스가 들어올 수 없어 focus 규칙은 생략
            "cursor-not-allowed bg-field-disabled outline-0"
          : cn(
              // error: 배경만 critical로. 경계선은 hover에서만 critical로 바뀐다 (§5)
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
      <textarea
        ref={ref}
        id={textareaId}
        rows={minRows}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        aria-invalid={invalid || undefined}
        // 카운터를 포커스 시 함께 읽어준다. 사용처가 넘긴 describedby는 유지
        aria-describedby={
          cn(ariaDescribedby, showCount && countId).trim() || undefined
        }
        // 리사이즈 하한선. Tailwind로는 런타임 값(minRows)을 표현할 수 없어 인라인이며,
        // 사용처가 style을 넘기면 그쪽이 이기도록 뒤에 펼친다
        style={{ minHeight: minRows * LINE_HEIGHT, ...style }}
        className={cn(
          // inner textarea: outline none · bg transparent · 14 / 24 / 400 (§5)
          "block w-full bg-transparent outline-none label-medium",
          "text-text placeholder:text-text-minimal",
          "disabled:cursor-not-allowed disabled:text-text-disabled disabled:placeholder:text-text-disabled",
          resizeClasses[resize],
          textareaClassName,
        )}
        {...props}
      />

      {showCount && (
        // 원본 실측 위치(필드 기준 bottom 8 / right 12 · `style_textareaCount`)를 **자기 줄**로 낸다 —
        // 래퍼 pb-2 · px-3 이 그 자리다. textarea 와 4 띄워 리사이즈 손잡이와 겹치지 않는다
        <span
          id={countId}
          data-part="count"
          className={cn(
            "mt-1 block text-right select-none",
            "body-small",
            disabled ? "text-text-disabled" : "text-text-minimal",
          )}
        >
          {valueLength}/{maxLength}
        </span>
      )}
    </div>
  );
}
