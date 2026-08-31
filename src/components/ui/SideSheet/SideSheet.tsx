import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../../lib/cn";
import { useFocusTrap } from "../../../lib/useFocusTrap";
import { IconButton } from "../IconButton";

/**
 * 슬라이드 전환 시간(ms). DESIGN.md §14 `transition: transform 0.2s linear` 와
 * 짝을 이룬다. 닫힐 때 이 시간만큼 언마운트를 미뤄야 나가는 애니메이션이 보인다.
 * 클래스(`duration-200`)와 값이 어긋나면 잔상이 남으므로 함께 바꿀 것.
 */
const SLIDE_DURATION_MS = 200;

/* -------------------------------------------------------------------------
 * Context
 * ---------------------------------------------------------------------- */

interface SideSheetContextValue {
  titleId: string;
  descriptionId: string;
  onClose: () => void;
}

const SideSheetContext = createContext<SideSheetContextValue | null>(null);

function useSideSheetContext(component: string): SideSheetContextValue {
  const context = useContext(SideSheetContext);
  if (!context) {
    throw new Error(`<${component}>는 <SideSheet> 안에서만 사용할 수 있다.`);
  }
  return context;
}

/* -------------------------------------------------------------------------
 * SideSheet
 * ---------------------------------------------------------------------- */

export interface SideSheetProps {
  /** 열림 상태. 제어형만 지원한다 */
  open: boolean;
  /** 닫기 요청(Escape·오버레이 클릭·닫기 버튼) */
  onClose: () => void;
  /** 오버레이 클릭으로 닫기 (기본 true) */
  closeOnOverlayClick?: boolean;
  /** Escape 로 닫기 (기본 true) */
  closeOnEscape?: boolean;
  /**
   * 다이얼로그 이름이 될 요소의 id.
   * 기본값은 `SideSheet.Title`(=`SideSheet.Header`의 title)이 붙이는 id 다.
   */
  labelledBy?: string;
  /** 다이얼로그 설명이 될 요소의 id */
  describedBy?: string;
  /** 패널 오버라이드 className */
  className?: string;
  children?: ReactNode;
}

/**
 * DESIGN.md §14 SideSheet / Drawer — 우측에서 밀려 들어오는 드로어.
 *
 * ## 구조
 *
 * ```tsx
 * <SideSheet open={open} onClose={close}>
 *   <SideSheet.Header title="주문 미리보기" divided />
 *   <SideSheet.Body>…</SideSheet.Body>
 *   <SideSheet.Footer>…</SideSheet.Footer>
 * </SideSheet>
 * ```
 *
 * ## 구현 메모
 *
 * - **애니메이션에 필요한 상태가 2개**다. `open`(논리적 열림)과 `mounted`(DOM 존재).
 *   닫힐 때 곧바로 언마운트하면 나가는 트랜지션을 볼 수 없으므로,
 *   `open: false` → 슬라이드 아웃 → 200ms 뒤 언마운트 순서로 처리한다.
 *   반대로 열 때는 `translate-x-full` 로 한 번 그린 뒤 다음 프레임에
 *   `translate-x-0` 으로 바꿔야 트랜지션이 걸린다(같은 프레임에 두 값을 주면
 *   브라우저가 최종값만 반영한다). rAF 를 두 번 겹치는 건 첫 rAF 가 아직
 *   페인트 전이라 브라우저가 두 스타일을 한 프레임으로 합쳐버리기 때문이다.
 * - **포커스·스크롤 잠금은 `mounted` 가 아니라 `open` 을 따른다.** 닫기를 누른
 *   순간(=애니메이션 시작) 바로 트리거로 포커스가 돌아가야 자연스럽다.
 * - 배치 컨테이너에 `top-0 bottom-0` 을 함께 준다. 우측 하단 고정(§14) 은
 *   `items-end` 로 유지하면서, 패널의 `max-h-full` 이 "화면 높이 − 여백 24"
 *   기준으로 계산되게 하려면 높이가 잡힌 부모가 필요하다.
 */
export function SideSheet({
  open,
  onClose,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  labelledBy,
  describedBy,
  className = "",
  children,
}: SideSheetProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;
  const panelRef = useFocusTrap<HTMLElement>({ open, onClose, closeOnEscape });

  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  // 열기: 렌더 중에 마운트시킨다.
  // effect 로 미루면 useFocusTrap 의 초기 포커스 effect 가 더 먼저 도는데,
  // 그 시점엔 패널이 아직 DOM 에 없어 컨테이너 ref 가 null 이라 포커스가 유실된다.
  // (React 의 "렌더 중 상태 조정" 패턴 — 같은 컴포넌트 상태에만 허용된다)
  if (open && !mounted) setMounted(true);

  // 닫기: 슬라이드 아웃 후 언마운트
  useEffect(() => {
    if (open) return;

    setEntered(false);
    const timer = window.setTimeout(() => setMounted(false), SLIDE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  // 마운트된 다음 프레임에 열림 위치로 전환 → 트랜지션이 실제로 재생된다
  useEffect(() => {
    if (!open || !mounted) return;

    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open, mounted]);

  if (!mounted) return null;

  return createPortal(
    <SideSheetContext.Provider value={{ titleId, descriptionId, onClose }}>
      {/* 오버레이 — DESIGN.md §14: fixed inset-0 · overlay(15%) · 0.2s */}
      <div
        data-slot="overlay"
        aria-hidden
        onClick={closeOnOverlayClick ? onClose : undefined}
        className={cn(
          "fixed inset-0 z-(--z-sidesheet) bg-overlay",
          "transition-opacity duration-200 ease-in-out",
          entered ? "opacity-100" : "opacity-0",
        )}
      />

      {/* 배치 — 우측 하단 고정 · 여백 12 · transform 0.2s linear */}
      <div
        data-slot="positioner"
        className={cn(
          "pointer-events-none fixed top-0 right-0 bottom-0 z-(--z-sidesheet)",
          "flex items-end p-3",
          "transition-transform duration-200 ease-linear",
          entered ? "translate-x-0" : "translate-x-full",
        )}
      >
        <aside
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy ?? titleId}
          aria-describedby={describedBy}
          tabIndex={-1}
          data-slot="panel"
          className={cn(
            "pointer-events-auto flex flex-col",
            // 패널: bg-surface · radius large(12) · width 380 · max-height 100% · shadow-page-side
            "w-(--size-sidesheet) max-h-full rounded-large bg-surface shadow-page-side",
            // 포커스 링을 제거하지 않는다(design-core.md). tabIndex -1 컨테이너는
            // 키보드로 도달할 수 없고 프로그래매틱 포커스는 :focus-visible 을
            // 만족시키지 않으므로, 아무것도 하지 않아도 링이 그려지지 않는다.
            "overflow-hidden",
            className,
          )}
        >
          {children}
        </aside>
      </div>
    </SideSheetContext.Provider>,
    document.body,
  );
}

/* -------------------------------------------------------------------------
 * SideSheet.Title / SideSheet.Description
 * ---------------------------------------------------------------------- */

export type SideSheetTitleProps = HTMLAttributes<HTMLHeadingElement>;

export function SideSheetTitle({
  className = "",
  children,
  ...props
}: SideSheetTitleProps) {
  const { titleId } = useSideSheetContext("SideSheet.Title");

  return (
    <h2
      id={titleId}
      data-slot="title"
      className={cn("text-text heading-large-bold", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export type SideSheetDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export function SideSheetDescription({
  className = "",
  children,
  ...props
}: SideSheetDescriptionProps) {
  const { descriptionId } = useSideSheetContext("SideSheet.Description");

  return (
    <p
      id={descriptionId}
      data-slot="description"
      className={cn("text-text-sub body-medium", className)}
      {...props}
    >
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------
 * SideSheet.Header
 * ---------------------------------------------------------------------- */

export interface SideSheetHeaderProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "title"
> {
  title: ReactNode;
  description?: ReactNode;
  /**
   * 하단 구분선. DESIGN.md §14 "하단 border 조건부" — 바디가 스크롤되는 화면에서만
   * 켜서 제목과 콘텐츠를 분리한다.
   */
  divided?: boolean;
  /** 우측 닫기(X) 버튼 노출 (기본 true) */
  showClose?: boolean;
  closeLabel?: string;
}

/** DESIGN.md §14 헤더: flex · gap 4 · space-between · 타이틀 영역 세로 gap 12 */
export function SideSheetHeader({
  title,
  description,
  divided = false,
  showClose = true,
  closeLabel = "닫기",
  className = "",
  ...props
}: SideSheetHeaderProps) {
  const { onClose } = useSideSheetContext("SideSheet.Header");

  return (
    <header
      data-slot="header"
      className={cn(
        "flex items-start justify-between gap-1 px-6 py-4",
        divided && "border-b border-divide",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <SideSheetTitle>{title}</SideSheetTitle>
        {description ? (
          <SideSheetDescription>{description}</SideSheetDescription>
        ) : null}
      </div>

      {showClose ? (
        <IconButton
          label={closeLabel}
          size="small"
          variant="ghost"
          onClick={onClose}
          icon={<X size={16} strokeWidth={1.2} aria-hidden />}
        />
      ) : null}
    </header>
  );
}

/* -------------------------------------------------------------------------
 * SideSheet.Body / SideSheet.Footer
 * ---------------------------------------------------------------------- */

export type SideSheetBodyProps = HTMLAttributes<HTMLDivElement>;

/** DESIGN.md §14 바디: padding 16 24 · padding-bottom 0 · flex 1 · overflow-y auto */
export function SideSheetBody({
  className = "",
  children,
  ...props
}: SideSheetBodyProps) {
  return (
    <div
      data-slot="body"
      className={cn(
        "px-6 pt-4 pb-0",
        // min-h-0 이 없으면 flex 자식이 콘텐츠 높이만큼 버텨 스크롤이 생기지 않는다
        "min-h-0 flex-1 overflow-y-auto",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type SideSheetFooterProps = HTMLAttributes<HTMLElement>;

/** DESIGN.md §14 푸터: 세로 flex · gap 20 · padding 16 24 */
export function SideSheetFooter({
  className = "",
  children,
  ...props
}: SideSheetFooterProps) {
  return (
    <footer
      data-slot="footer"
      className={cn("flex flex-col gap-5 px-6 py-4", className)}
      {...props}
    >
      {children}
    </footer>
  );
}

/* -------------------------------------------------------------------------
 * 조합 API
 * ---------------------------------------------------------------------- */

SideSheet.Header = SideSheetHeader;
SideSheet.Title = SideSheetTitle;
SideSheet.Description = SideSheetDescription;
SideSheet.Body = SideSheetBody;
SideSheet.Footer = SideSheetFooter;
