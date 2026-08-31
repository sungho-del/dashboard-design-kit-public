import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../../lib/cn";
import { Divider, type DividerProps } from "../Divider";

/* -------------------------------------------------------------------------
 * SelectionBar (루트)
 * ---------------------------------------------------------------------- */

/**
 * 위치 전용 래퍼. DESIGN.md §25 —
 * fixed · bottom 80 · left 50% (가운데 정렬) · z-index `--z-modal`
 *
 * 위치(`-translate-x-1/2`)와 진입 애니메이션(`translate-y-*`)을 **다른 요소**가
 * 나눠 갖는다. ToastProvider ↔ Toast 와 같은 분리로, 한 요소가 두 축의 translate를
 * 동시에 다투지 않게 하려는 의도다.
 *
 * `w-max` 라 컨테이너 박스가 바 크기에 정확히 맞는다 — 화면을 덮지 않으므로
 * Toast 컨테이너와 달리 `pointer-events-none` 이 필요 없다.
 */
const containerClasses = cn(
  "fixed bottom-20 left-1/2 w-max -translate-x-1/2",
  "z-(--z-modal)",
);

/**
 * 바 본체. DESIGN.md §25 —
 * padding 10 12 · flex gap 12 · bg surface-toast · radius large(12) · shadow-toast
 *
 * 모션은 design-core.md "모션" — 콘텐츠 전환 0.3s ease-out. `[유추]`
 * (§25에 애니메이션 규격은 없다. 화면 하단에서 떠오르는 요소라
 *  Toast 하단 등장과 같은 0.3s ease-out · 16px 오프셋을 그대로 썼다.)
 */
const barClasses = cn(
  "flex items-center gap-3 px-3 py-2.5",
  "rounded-large bg-surface-toast shadow-toast",
  "transition-[opacity,transform] duration-300 ease-out",
  "motion-reduce:transition-none",
);

export interface SelectionBarProps {
  /** 열림 상태. 보통 `selected.length > 0` 를 그대로 넘긴다 */
  open: boolean;
  /** 선택된 항목 수. 라이브 리전으로 읽힌다 */
  count: number;
  /**
   * 선택 해제(X) 클릭. 넘기지 않으면 해제 버튼 자체가 렌더되지 않는다.
   * `[유추]` — 개수 표시·해제 버튼은 §25에 규격이 없다. 목록 일괄 작업 바에서
   * "몇 개를 고쳤는지"와 "되돌리기"는 항상 붙어 다니므로 루트가 맡는다.
   */
  onClear?: () => void;
  /**
   * 개수 문구. 기본 `N개 선택됨`. `[유추]` — 원본에 문구 규격이 없다.
   * i18n·단위 변경(건/명)을 위해 함수로 열어 둔다.
   */
  countLabel?: (count: number) => ReactNode;
  /** 해제 버튼의 스크린리더 이름 `[유추]` */
  clearLabel?: string;
  /** 바 전체의 스크린리더 이름 `[유추]` */
  label?: string;
  /**
   * 포털이 붙을 DOM. 기본은 `document.body`.
   * 조상의 `overflow: hidden`·`transform` 이 `position: fixed` 를 잘라내거나
   * 기준을 바꾸는 사고를 막기 위해 Modal 과 같은 이유로 포털을 쓴다.
   */
  container?: HTMLElement | null;
  /** 바 본체 오버라이드 className */
  className?: string;
  /** 일괄 작업 버튼들. `SelectionBar.Button` · `SelectionBar.Divider` 로 조합한다 */
  children?: ReactNode;
}

/**
 * DESIGN.md §25 Selection Floating Bar — 목록에서 여러 행을 고르면
 * 화면 하단에 떠오르는 일괄 작업 바.
 *
 * ## 구조
 *
 * ```tsx
 * <SelectionBar
 *   open={selected.length > 0}
 *   count={selected.length}
 *   onClear={() => setSelected([])}
 * >
 *   <SelectionBar.Button icon={<Trash2 size={16} strokeWidth={1.2} />}>
 *     삭제
 *   </SelectionBar.Button>
 *   <SelectionBar.Divider />
 *   <SelectionBar.Button icon={<Download size={16} strokeWidth={1.2} />}>
 *     내보내기
 *   </SelectionBar.Button>
 * </SelectionBar>
 * ```
 *
 * ## 구현 메모
 *
 * - **개수는 `role="status"` 라이브 리전**이다. 체크박스를 하나 더 켜면 바는 그대로
 *   있고 숫자만 바뀌므로, 라이브 리전이 없으면 스크린리더 사용자는 변화를 알 수 없다.
 * - 바 자체는 `role="group"` 이다. `toolbar` 는 화살표 키 로빙 내비게이션을 약속하는
 *   역할이라, 그 구현 없이 붙이면 오히려 기대를 깨뜨린다.
 * - **퇴장 애니메이션은 없다** `[유추]`. `open` 이 곧 선택 상태라 해제는 즉시
 *   반영되는 편이 자연스럽고, Toast 와 달리 언마운트 시점을 잡아 줄 Provider 도 없다.
 * - 진입은 Toast 와 같은 rAF 한 프레임 지연 기법을 쓴다. 처음부터 보이는 상태로
 *   렌더하면 브라우저가 시작 값과 끝 값을 같은 프레임에서 계산해 transition 이
 *   아예 걸리지 않는다.
 */
export function SelectionBar({
  open,
  count,
  onClear,
  countLabel = (value) => `${value}개 선택됨`,
  clearLabel = "선택 해제",
  label = "선택 항목 일괄 작업",
  container,
  className = "",
  children,
}: SelectionBarProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const portalTarget =
    container ?? (typeof document === "undefined" ? null : document.body);

  if (!open || portalTarget === null) return null;

  return createPortal(
    <div data-slot="container" className={containerClasses}>
      <div
        role="group"
        aria-label={label}
        data-slot="bar"
        className={cn(
          barClasses,
          entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          className,
        )}
      >
        {/* 개수 타이포는 버튼과 같은 12/16/600 으로 맞춰 한 줄에 광학 정렬한다 `[유추]`.
            바 배경이 검정(dim-toast)이라 글자색은 on-dark 토큰 `text-on` 을 쓴다 */}
        <p
          role="status"
          aria-live="polite"
          data-slot="count"
          className="whitespace-nowrap text-text-on label-small-bold"
        >
          {countLabel(count)}
        </p>

        {onClear ? (
          <SelectionBarButton
            data-slot="clear"
            aria-label={clearLabel}
            onClick={onClear}
            icon={<X size={16} strokeWidth={1.2} aria-hidden />}
          />
        ) : null}

        {/* 개수 영역과 액션 영역을 나누는 구분선 `[유추]`.
            액션이 없으면(=개수 표시 전용) 선도 그리지 않는다 */}
        {children ? <SelectionBarDivider /> : null}

        {children}
      </div>
    </div>,
    portalTarget,
  );
}

/* -------------------------------------------------------------------------
 * SelectionBar.Button
 * ---------------------------------------------------------------------- */

/**
 * DESIGN.md §25 버튼 — inline-flex center · padding 6 · radius small ·
 * transparent · color text-secondary · 12 / 16 / 600 · transition 0.1s ease-out ·
 * hover 시 bg surface(흰색).
 *
 * `12 / 16 / 600` 은 프리셋 `label-small-bold`(text-xsmall 12 · leading-4 16 ·
 * semibold 600)와 정확히 일치한다. 6 + 16 + 6 = 28 이라 컨트롤 높이 4단의
 * xsmall(28)과도 맞는다.
 *
 * `Button`/`IconButton` 의 `ghost` variant 를 재사용하지 않은 이유:
 * ghost 의 hover 는 `action-secondary-hover`(옅은 회색)라 검은 바 위에서 거의
 * 보이지 않고, 버튼 계열은 높이를 `--size-control-*` 로 고정해 padding 6 규격과
 * 어긋난다.
 *
 * `focus-visible` 에서도 배경을 `surface` 로 올린다 — `--color-focus` 는
 * slate-900 이라 검은 바 위에 그대로 그리면 링이 보이지 않는다. 흰 배경으로
 * 바뀐 뒤 안쪽(offset -2)에 그려지므로 규칙(2px / -2 / focus)을 지키면서도
 * 실제로 보인다. hover 와 값이 같아 배경이 두 번 정의돼도 결과가 갈리지 않는다.
 */
const selectionBarButtonClasses = cn(
  "group inline-flex shrink-0 items-center justify-center gap-1 p-1.5",
  "rounded-small whitespace-nowrap label-small-bold",
  // 글자색은 배경을 따라 뒤집는다 — 아래 주석 참고
  "bg-transparent text-text-on",
  "transition-[background-color,color] duration-100 ease-out",
  "hover:bg-surface hover:text-text-secondary-hover",
  "focus-visible:bg-surface focus-visible:text-text-secondary-hover",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
  // disabled:hover: 는 의사클래스가 하나 더 붙어 명시도가 높으므로 hover: 규칙을
  // 확실히 이긴다. 순서에 기대지 않는 의도된 오버라이드다.
  "disabled:cursor-not-allowed disabled:text-text-disabled",
  "disabled:hover:bg-transparent disabled:hover:text-text-disabled",
);

export interface SelectionBarButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  /**
   * 좌측 아이콘. lucide 아이콘은 `size={16} strokeWidth={1.2}` 로 넘긴다.
   * 라벨(children) 없이 아이콘만 넘길 때는 `aria-label` 을 반드시 함께 준다.
   */
  icon?: ReactNode;
  /** React 19 는 ref 를 일반 prop 으로 받는다 */
  ref?: Ref<HTMLButtonElement>;
}

export function SelectionBarButton({
  icon,
  disabled = false,
  className = "",
  children,
  ref,
  ...props
}: SelectionBarButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={cn(selectionBarButtonClasses, className)}
      {...props}
    >
      {icon ? (
        // §25 "↳ 아이콘: icon-on". 텍스트와 값은 같지만 icon-* 계열 토큰을 쓰는 게
        // 의미상 맞으므로 별도 요소에서 방출한다.
        // 배경이 흰색으로 바뀌는 hover/focus 에서 원본과 같이 색을 뒤집는다
        // (원본: `svg { icon-on }` → `:hover svg { icon-secondary-hover }`).
        <span
          aria-hidden
          data-slot="icon"
          className={cn(
            "inline-flex shrink-0",
            disabled
              ? "text-icon-disabled"
              : cn(
                  "text-icon-on",
                  "group-hover:text-icon-secondary-hover",
                  "group-focus-visible:text-icon-secondary-hover",
                ),
          )}
        >
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------
 * SelectionBar.Divider
 * ---------------------------------------------------------------------- */

export type SelectionBarDividerProps = Omit<
  DividerProps,
  "orientation" | "length" | "tone"
>;

/**
 * §25 구분선 — 1 × 10px · bg divide.
 * 기존 `Divider` 의 세로 모드가 그대로 규격을 만족하므로 길이만 고정해 감싼다.
 */
export function SelectionBarDivider(props: SelectionBarDividerProps) {
  return (
    <Divider orientation="vertical" tone="divide" length={10} {...props} />
  );
}

/* -------------------------------------------------------------------------
 * 조합 API — <SelectionBar.Button> 형태로도 쓸 수 있게 정적 속성으로 붙인다.
 * 개별 named export 도 그대로 유지한다.
 * ---------------------------------------------------------------------- */

SelectionBar.Button = SelectionBarButton;
SelectionBar.Divider = SelectionBarDivider;
