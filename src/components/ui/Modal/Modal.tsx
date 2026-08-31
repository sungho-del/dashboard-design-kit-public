import {
  createContext,
  useContext,
  useId,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../../lib/cn";
import { useFocusTrap } from "../../../lib/useFocusTrap";
import { Button } from "../Button";
import { IconButton } from "../IconButton";

/* -------------------------------------------------------------------------
 * Context — 제목 id 와 닫기 핸들러를 하위 조합 컴포넌트에 내려준다
 * ---------------------------------------------------------------------- */

interface ModalContextValue {
  titleId: string;
  descriptionId: string;
  onClose: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext(component: string): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error(`<${component}>는 <Modal> 안에서만 사용할 수 있다.`);
  }
  return context;
}

/* -------------------------------------------------------------------------
 * Modal
 * ---------------------------------------------------------------------- */

export type ModalSize = "small" | "medium" | "large";

/**
 * DESIGN.md §13 에는 모달 폭 규격이 없다. 4px 그리드 위에서 흔한 3단으로 잡았다. [유추]
 * `max-w-*` 는 좁은 화면에서 폭을 양보하기 위한 상한이고, 실제 폭은 `w-full` 이 맡는다.
 */
const sizeClasses: Record<ModalSize, string> = {
  small: "max-w-100", // 400
  medium: "max-w-120", // 480
  large: "max-w-160", // 640
};

export interface ModalProps {
  /** 열림 상태. 제어형만 지원한다 */
  open: boolean;
  /** 닫기 요청(Escape·딤 클릭·닫기 버튼). 상태를 내리는 쪽에서 open 을 false 로 만든다 */
  onClose: () => void;
  size?: ModalSize;
  /** 딤 클릭으로 닫기 (기본 true) */
  closeOnOverlayClick?: boolean;
  /** Escape 로 닫기 (기본 true) */
  closeOnEscape?: boolean;
  /**
   * 다이얼로그 이름이 될 요소의 id.
   * 기본값은 `Modal.Title`(=`Modal.Header`의 title)이 붙이는 id 다.
   * 제목을 직접 렌더할 때만 지정한다.
   */
  labelledBy?: string;
  /** 다이얼로그 설명이 될 요소의 id */
  describedBy?: string;
  /** 컨테이너(패널) 오버라이드 className */
  className?: string;
  children?: ReactNode;
}

/**
 * DESIGN.md §13 Modal / Dialog. `[유추]` — 중앙 정렬 모달의 Clay 베이스 CSS 가
 * 캡처된 원본에 없어, 문서에 남은 조각(바디 gap 20 / padding 24 0, 버튼 영역 좌우 24,
 * 푸터 flex-end, 컨테이너 radius 16)만 그대로 쓰고 나머지는 Clay 규격에서 유추했다.
 *
 * ## 구조
 *
 * ```tsx
 * <Modal open={open} onClose={close}>
 *   <Modal.Header title="배송지 수정" />
 *   <Modal.Body>…</Modal.Body>
 *   <Modal.Footer>…</Modal.Footer>
 * </Modal>
 * ```
 *
 * ## 구현 메모
 *
 * - **Portal**: `document.body` 에 렌더한다. 조상의 `overflow: hidden`·`transform`
 *   때문에 `position: fixed` 가 잘리거나 기준이 바뀌는 사고를 원천 차단한다.
 * - **딤과 패널은 형제**다. 패널을 딤의 자식으로 두면 패널 클릭이 딤으로 버블링해
 *   `event.target === currentTarget` 같은 방어 코드가 필요해진다. 형제로 두고
 *   중앙 정렬 레이어를 `pointer-events-none` 으로 만들면, 여백 클릭은 딤으로
 *   그대로 통과하고 패널 클릭은 아무 데도 닿지 않는다.
 * - 포커스 트랩·Escape·스크롤 잠금·포커스 복원은 `useFocusTrap` 이 전담한다.
 */
export function Modal({
  open,
  onClose,
  size = "medium",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  labelledBy,
  describedBy,
  className = "",
  children,
}: ModalProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;
  const panelRef = useFocusTrap<HTMLDivElement>({
    open,
    onClose,
    closeOnEscape,
  });

  if (!open) return null;

  return createPortal(
    <ModalContext.Provider value={{ titleId, descriptionId, onClose }}>
      {/* 딤 — DESIGN.md §13: fixed inset-0 · overlay-sub(50%) · z-modal */}
      <div
        data-slot="overlay"
        aria-hidden
        onClick={closeOnOverlayClick ? onClose : undefined}
        className="fixed inset-0 z-(--z-modal) bg-overlay-sub"
      />

      {/* 중앙 정렬 레이어 — 딤과 같은 z 에서 뒤에 쌓이므로 위에 온다 */}
      <div className="pointer-events-none fixed inset-0 z-(--z-modal) flex items-center justify-center p-6">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy ?? titleId}
          aria-describedby={describedBy}
          tabIndex={-1}
          data-slot="panel"
          className={cn(
            "pointer-events-auto flex w-full flex-col",
            // 컨테이너: bg-surface · radius xlarge(16) · shadow-modal
            "rounded-xlarge bg-surface shadow-modal",
            // 바디의 overflow-auto 가 실제로 동작하려면 컨테이너 높이가 화면에 갇혀야 한다
            "max-h-full overflow-hidden",
            // 포커스 링을 제거하지 않는다(design-core.md). tabIndex -1 컨테이너는
            // 키보드로 도달할 수 없고 프로그래매틱 포커스는 :focus-visible 을
            // 만족시키지 않으므로, 아무것도 하지 않아도 링이 그려지지 않는다.
            sizeClasses[size],
            className,
          )}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body,
  );
}

/* -------------------------------------------------------------------------
 * Modal.Title / Modal.Description
 * ---------------------------------------------------------------------- */

export type ModalTitleProps = HTMLAttributes<HTMLHeadingElement>;

/** `aria-labelledby` 가 가리키는 제목. Modal 이 만든 id 를 그대로 쓴다 */
export function ModalTitle({
  className = "",
  children,
  ...props
}: ModalTitleProps) {
  const { titleId } = useModalContext("Modal.Title");

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

export type ModalDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

/** 제목 아래 보조 설명. 여러 줄로 흐르는 문장이라 label 이 아닌 body 프리셋을 쓴다 */
export function ModalDescription({
  className = "",
  children,
  ...props
}: ModalDescriptionProps) {
  const { descriptionId } = useModalContext("Modal.Description");

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
 * Modal.Header
 * ---------------------------------------------------------------------- */

export interface ModalHeaderProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "title"
> {
  title: ReactNode;
  description?: ReactNode;
  /** 우측 닫기(X) 버튼 노출 (기본 true) */
  showClose?: boolean;
  /** 닫기 버튼의 스크린리더 이름 */
  closeLabel?: string;
}

/**
 * 제목 + 닫기 버튼. 좌우 패딩 24 는 §13 "버튼 영역 padding 0 24" 를 모달 전체의
 * 좌우 여백으로 확장 적용한 것이다(바디는 상하 24 만 갖는다).
 */
export function ModalHeader({
  title,
  description,
  showClose = true,
  closeLabel = "닫기",
  className = "",
  ...props
}: ModalHeaderProps) {
  const { onClose } = useModalContext("Modal.Header");

  return (
    <header
      data-slot="header"
      className={cn(
        "flex items-start justify-between gap-2 px-6 pt-6",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <ModalTitle>{title}</ModalTitle>
        {description ? (
          <ModalDescription>{description}</ModalDescription>
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
 * Modal.Body / Modal.Footer
 * ---------------------------------------------------------------------- */

export type ModalBodyProps = HTMLAttributes<HTMLDivElement>;

/** DESIGN.md §13 바디: 세로 flex · gap 20 · padding 24 0 · overflow auto */
export function ModalBody({
  className = "",
  children,
  ...props
}: ModalBodyProps) {
  return (
    <div
      data-slot="body"
      className={cn(
        "flex flex-col gap-5 px-6 py-6",
        // flex 자식의 기본 min-height:auto 는 콘텐츠 높이만큼 버텨 스크롤을 막는다
        "min-h-0 flex-1 overflow-auto",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type ModalFooterProps = HTMLAttributes<HTMLElement>;

/**
 * DESIGN.md §13 푸터: flex · justify-end. 좌우 24 는 헤더·바디와 같은 gutter,
 * 하단 24 는 바디의 상하 24 와 대칭을 맞춘 값이다.
 */
export function ModalFooter({
  className = "",
  children,
  ...props
}: ModalFooterProps) {
  return (
    <footer
      data-slot="footer"
      className={cn("flex justify-end gap-2 px-6 pb-6", className)}
      {...props}
    >
      {children}
    </footer>
  );
}

/* -------------------------------------------------------------------------
 * ConfirmModal — 삭제 확인 변형
 * ---------------------------------------------------------------------- */

export type ConfirmModalTone = "critical" | "primary";

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  /** 확인 버튼 클릭. 닫기는 호출한 쪽에서 결정한다(비동기 처리 후 닫는 경우가 많다) */
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  /**
   * 상단 아이콘. 72 × 72 프레임 안에 중앙 정렬된다(DESIGN.md §13 삭제 확인 모달).
   * 프레임만 잡아 주므로 아이콘 자체 크기는 넘기는 쪽에서 정한다.
   */
  icon?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 파괴적 작업이면 critical (기본), 일반 확인이면 primary */
  tone?: ConfirmModalTone;
  /** 확인 버튼 로딩. 배경만 pressed 로 내려가고 라벨 색은 유지된다 */
  loading?: boolean;
  size?: ModalSize;
  /**
   * 딤 클릭으로 닫기. **기본 false** — 확인/취소가 명시적으로 있는 결정형 다이얼로그라
   * 실수로 흘려 닫히지 않게 막는다. (일반 Modal 의 기본값은 true)
   */
  closeOnOverlayClick?: boolean;
  className?: string;
}

/**
 * DESIGN.md §13 "삭제 확인 모달": 세로 center · gap 16 · 아이콘 72 × 72.
 *
 * 바디를 `Modal.Body` 로 조합하지 않고 직접 렌더한다 — `Modal.Body` 는 `gap-5`(20)를
 * 이미 방출하므로 className 으로 `gap-4`(16)를 덧붙이면 같은 속성이 두 번 나온다.
 * `cn()` 은 Tailwind 클래스 병합을 하지 않아 승자가 CSS 정의 순서로 결정된다.
 *
 * 하단 버튼은 large(48) — 모달 하단 주요 버튼의 기본 높이다. (DESIGN_참고.md §2)
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  icon,
  confirmLabel = "확인",
  cancelLabel = "취소",
  tone = "critical",
  loading = false,
  size = "small",
  closeOnOverlayClick = false,
  className = "",
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size={size}
      className={className}
      closeOnOverlayClick={closeOnOverlayClick}
    >
      <div
        data-slot="body"
        className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-auto px-6 py-6 text-center"
      >
        {icon ? (
          <div
            data-slot="icon"
            // size-18 = 4px × 18 = 72. DESIGN.md §13 의 아이콘 프레임
            className="flex size-18 shrink-0 items-center justify-center"
          >
            {icon}
          </div>
        ) : null}

        <ModalTitle>{title}</ModalTitle>
        {description ? (
          <ModalDescription>{description}</ModalDescription>
        ) : null}
      </div>

      <ModalFooter>
        <Button
          variant="secondary"
          size="large"
          onClick={onClose}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={tone === "critical" ? "critical" : "primary"}
          size="large"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/* -------------------------------------------------------------------------
 * 조합 API — <Modal.Header> 형태로도 쓸 수 있게 정적 속성으로 붙인다.
 * 개별 named export 도 그대로 유지한다.
 * ---------------------------------------------------------------------- */

Modal.Header = ModalHeader;
Modal.Title = ModalTitle;
Modal.Description = ModalDescription;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
