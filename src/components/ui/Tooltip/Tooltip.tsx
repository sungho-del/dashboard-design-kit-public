import {
  cloneElement,
  useId,
  useRef,
  useState,
  type HTMLProps,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  FloatingArrow,
  FloatingFocusManager,
  FloatingPortal,
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
  type Placement,
} from "@floating-ui/react";
import { X } from "lucide-react";
import { cn } from "../../../lib/cn";
import { IconButton } from "../IconButton";

export type TooltipVariant = "compact" | "rich";

export interface TooltipDelay {
  open: number;
  close: number;
}

/**
 * DESIGN.md §12 컨테이너: max-width 256 · bg surface · radius medium · shadow-layer.
 * z-index 는 `--z-toast`(11000) — 툴팁은 모달 위에서도 떠야 하므로 항상 최상위다.
 */
const tooltipBaseClasses = cn(
  "max-w-64 rounded-medium bg-surface shadow-layer",
  "z-(--z-toast)",
);

/**
 * §12 본문형 padding 12 16 · gap 8 / 컴팩트형 padding 6 8.
 * 두 값은 배타적으로 하나만 방출되므로 `cn()` 이 병합하지 않아도 겹치지 않는다.
 * 컴팩트는 한 줄짜리라 타이포를 컨테이너에서 바로 준다.
 */
const tooltipVariantClasses: Record<TooltipVariant, string> = {
  compact: "px-2 py-1.5 text-text label-small",
  rich: "flex flex-col gap-2 px-4 py-3",
};

/**
 * 닫기 버튼이 있는 본문형.
 *
 * **§12 이탈 지점**: 본문형 padding 은 12 16 이지만, 우측만 **36**(`pr-9`)으로 넓힌다.
 * 닫기 버튼이 `right: 8` 에 놓인 28(`--size-control-xsmall`) 정사각이라
 * 우측 8~36 구간을 차지한다. 규격대로 16을 유지하면 제목·본문이 버튼 아래로
 * 흘러 들어가 겹친다. 상·하·좌(12/12/16)는 규격 그대로다.
 * 36 = 8 + 28 이라 4px 그리드에서도 벗어나지 않는다.
 *
 * `rich` 와 배타적으로 하나만 방출되므로 `cn()` 이 병합하지 않아도
 * padding 이 두 곳에서 나오지 않는다.
 */
const tooltipRichClosableClasses = "flex flex-col gap-2 py-3 pl-4 pr-9";

/** 화살표 크기. FloatingArrow 기본값(14 × 7)을 그대로 쓴다 */
const ARROW_HEIGHT = 7;
/** 화살표 꼭짓점이 라운드 코너를 넘지 않게 하는 여유 */
const ARROW_PADDING = 8;

export interface TooltipProps {
  /** 툴팁 본문. 컴팩트형은 이것만, 본문형은 `title` 아래에 놓인다 */
  content: ReactNode;
  /** 본문형 제목. 주면 `variant` 기본값이 `rich` 가 된다 */
  title?: ReactNode;
  /** 생략하면 `title` 유무로 결정한다 */
  variant?: TooltipVariant;
  /** 앵커 기준 배치. flip() 이 공간에 따라 자동으로 뒤집는다 */
  placement?: Placement;
  /** 제어형 열림 상태. 넘기지 않으면 hover/focus 로 알아서 열고 닫는다 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * hover 지연(ms). **[유추]** — DESIGN.md 에 툴팁 지연 규정이 없다.
   * 마우스가 스쳐 지나갈 때 깜빡이지 않도록 여는 쪽만 200ms 늦춘다.
   */
  delay?: TooltipDelay;
  /**
   * 닫기 버튼(§12 — absolute · top/right 8)을 띄운다. **본문형 전용**이다.
   *
   * 컴팩트형은 한 줄짜리 hover 보조 설명이라 padding 이 6 8 밖에 안 된다.
   * 28짜리 버튼이 들어갈 자리도 없고, 마우스를 떼면 알아서 사라지므로
   * 명시적으로 닫을 이유 자체가 없다. `variant="compact"` 를 직접 지정하면
   * 이 prop 은 무시된다.
   *
   * 켜면 열림/닫힘 방식이 hover → **클릭 토글**로 바뀐다. 아래 구현 메모 참고.
   */
  closable?: boolean;
  /** 닫기 버튼의 접근 가능한 이름 (아이콘만 있는 버튼이라 필수 값이다) */
  closeLabel?: string;
  /** 앵커를 가리키는 화살표 (기본 true) */
  showArrow?: boolean;
  /** 컨테이너 오버라이드 className */
  className?: string;
  /**
   * 트리거로 쓸 **단일 요소**. `Button`·`IconButton` 을 그대로 넘긴다.
   * hover·focus 핸들러와 `aria-describedby` 가 이 요소에 주입된다.
   */
  children: ReactElement<HTMLProps<HTMLElement>>;
}

/**
 * DESIGN.md §12 Tooltip / Popover.
 *
 * ## 구조
 *
 * ```tsx
 * <Tooltip content="복사">
 *   <IconButton label="복사" icon={<Copy size={16} strokeWidth={1.2} />} />
 * </Tooltip>
 *
 * <Tooltip title="재고 동기화" content="10분마다 자동으로 갱신됩니다.">
 *   <Button variant="ghost">도움말</Button>
 * </Tooltip>
 * ```
 *
 * ## 구현 메모
 *
 * - **hover 와 focus 를 모두 지원한다.** 마우스가 없는 사용자도 같은 정보를 얻어야
 *   하므로 `useHover` + `useFocus` 를 함께 건다. `useFocus` 는 기본이
 *   `visibleOnly` 라 마우스 클릭으로 생긴 포커스에는 반응하지 않는다.
 * - 접근성 이름이 아니라 **설명**이다 — `useRole({ role: "tooltip" })` 이 트리거에
 *   `aria-describedby` 를 붙인다. 아이콘 버튼의 이름은 여전히 `label` 이 맡는다.
 * - 화살표는 `arrow()` 미들웨어 + `FloatingArrow` 가 그린다. 패널과 같은 면이므로
 *   `fill` 은 `--color-surface`.
 * - **DESIGN.md §12 마지막 문단의 앱 레이어 커스텀 툴팁(width 292, `#d7d7d7` 보더)은
 *   토큰 이탈이라 구현 대상이 아니다.** 여기서는 Clay 규격만 따른다.
 * - 위치는 floating-ui 가 inline style 로 넣는다. 위치 관련 Tailwind 클래스를
 *   따로 방출하지 않는다. 같은 이유로 §12 의 `position: relative` 도 클래스로
 *   내보내지 않는다 — floating-ui 가 inline `position: absolute` 를 걸어 두므로
 *   패널은 이미 절대배치의 기준(containing block)이다. 화살표도 이 위에서 뜬다.
 *
 * ## 닫기 버튼(`closable`)의 열림/닫힘 설계
 *
 * hover 툴팁에 닫기 버튼을 달면 **버튼이 아무 의미가 없다.** 눌러 닫아도 포인터가
 * 아직 트리거 위에 있으면 곧바로 다시 열리고, 열려 있는 동안에는 마우스를 떼는
 * 것만으로 닫히기 때문이다. 그래서 `closable` 을 켜면 상호작용 모델을 통째로 바꾼다.
 *
 * - `useHover` / `useFocus` 를 끄고 `useClick` 으로 **트리거 클릭 토글**을 건다.
 *   (키보드는 Enter/Space 가 click 으로 오므로 별도 처리가 필요 없다)
 * - 닫는 경로는 세 가지 — 닫기 버튼 · Escape · 바깥 클릭(`useDismiss`).
 * - `role` 을 `tooltip` 이 아니라 `dialog` 로 바꾼다. 클릭으로 열고 명시적으로 닫는
 *   패널은 스크린리더에게 "설명"이 아니라 열고 닫는 컨테이너로 알려야 하고,
 *   `role="tooltip"` 안의 버튼은 보조기기에서 도달 경로가 보장되지 않는다.
 *   트리거에는 `aria-expanded` / `aria-haspopup` 이 붙는다.
 * - `FloatingFocusManager`(`modal={false}`) 로 패널 안에 포커스를 가두지 않되,
 *   닫힐 때 포커스를 트리거로 되돌린다. 포털로 body 에 렌더되므로 이게 없으면
 *   닫은 뒤 포커스가 문서 처음으로 튄다.
 */
export function Tooltip({
  content,
  title,
  variant,
  placement = "top",
  open: controlledOpen,
  onOpenChange,
  delay = { open: 200, close: 0 },
  closable = false,
  closeLabel = "닫기",
  showArrow = true,
  className = "",
  children,
}: TooltipProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  // 닫기 버튼은 본문형에서만 의미가 있으므로 variant 를 안 주면 rich 로 올린다
  const resolvedVariant: TooltipVariant =
    variant ?? (title || closable ? "rich" : "compact");

  // variant="compact" 를 명시하면 closable 은 무시된다 — 버튼도, 클릭 모드도 없다
  const hasCloseButton = closable && resolvedVariant === "rich";

  // role="dialog" 는 스스로 이름을 만들지 않으므로 패널 안의 텍스트로 라벨링한다
  const titleId = useId();
  const contentId = useId();

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      // 화살표가 있으면 그 높이만큼 앵커에서 띄운다 (없으면 4px). [유추]
      offset(showArrow ? ARROW_HEIGHT + 1 : 4),
      flip({ padding: ARROW_PADDING }),
      shift({ padding: ARROW_PADDING }),
      arrow({ element: arrowRef, padding: ARROW_PADDING }),
    ],
  });

  // 닫기 버튼이 있으면 hover/focus 로 열지 않는다 — 그래야 "닫았는데 곧바로 다시
  // 열리는" 상태가 생기지 않는다. 대신 클릭 토글로 연다.
  const hover = useHover(context, {
    enabled: !hasCloseButton,
    delay,
    move: false,
  });
  const focus = useFocus(context, { enabled: !hasCloseButton });
  const click = useClick(context, { enabled: hasCloseButton });
  const dismiss = useDismiss(context);
  // tooltip: 트리거에 aria-describedby / dialog: aria-expanded·aria-haspopup
  const role = useRole(context, {
    role: hasCloseButton ? "dialog" : "tooltip",
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    click,
    dismiss,
    role,
  ]);

  // React 19 에서 ref 는 일반 prop 이라 children.props 안에 들어 있다
  const triggerRef = useMergeRefs<HTMLElement>([
    refs.setReference,
    children.props.ref,
  ]);

  const triggerProps = getReferenceProps(
    children.props,
  ) as HTMLProps<HTMLElement>;

  const trigger = cloneElement(children, {
    ...triggerProps,
    ref: triggerRef,
  });

  const panel = (
    <div
      ref={refs.setFloating}
      data-slot="tooltip"
      // 위치는 floating-ui 가 계산한 inline style 이 전담한다
      style={floatingStyles}
      className={cn(
        tooltipBaseClasses,
        // 셋 중 하나만 방출된다 — padding 이 겹치지 않는다
        hasCloseButton
          ? tooltipRichClosableClasses
          : tooltipVariantClasses[resolvedVariant],
        className,
      )}
      {...getFloatingProps()}
      // 제목이 있으면 제목이, 없으면 본문이 dialog 의 이름이 된다
      aria-labelledby={
        hasCloseButton ? (title ? titleId : contentId) : undefined
      }
    >
      {resolvedVariant === "rich" ? (
        <>
          {title ? (
            <span
              id={titleId}
              data-slot="title"
              className="text-text label-medium-bold"
            >
              {title}
            </span>
          ) : null}
          <span
            id={contentId}
            data-slot="content"
            className="text-text-sub body-small"
          >
            {content}
          </span>
        </>
      ) : (
        content
      )}

      {hasCloseButton ? (
        // §12 닫기 버튼 — absolute · top/right 8.
        // 28(xsmall)은 컨트롤 높이 4단(48/40/32/28)의 최소값이라 툴팁처럼
        // 좁은 패널에 넣을 수 있는 유일한 크기다. IconButton 을 그대로 쓴다.
        <IconButton
          label={closeLabel}
          size="xsmall"
          variant="ghost"
          onClick={() => setOpen(false)}
          icon={<X size={16} strokeWidth={1.2} aria-hidden />}
          className="absolute top-2 right-2"
        />
      ) : null}

      {showArrow ? (
        <FloatingArrow
          ref={arrowRef}
          context={context}
          data-slot="arrow"
          // 패널과 같은 면이므로 --color-surface 로 채운다
          className="fill-surface"
        />
      ) : null}
    </div>
  );

  return (
    <>
      {trigger}

      {open ? (
        <FloatingPortal>
          {hasCloseButton ? (
            // 포커스를 가두지는 않되(modal=false), 닫히면 트리거로 되돌린다
            <FloatingFocusManager context={context} modal={false}>
              {panel}
            </FloatingFocusManager>
          ) : (
            panel
          )}
        </FloatingPortal>
      ) : null}
    </>
  );
}
