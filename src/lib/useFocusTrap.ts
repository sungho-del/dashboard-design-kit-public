import { useEffect, useRef, type RefObject } from "react";

/**
 * 포커스를 받을 수 있는 요소의 선택자.
 *
 * `offsetParent`·`getComputedStyle` 로 가시성까지 거르지 않는다 — jsdom 에서는
 * 레이아웃이 계산되지 않아 모든 요소가 "보이지 않음"으로 판정되기 때문이다.
 * 대신 마크업 수준에서 확실히 포커스를 받을 수 없는 것(`disabled`,
 * `aria-hidden`, `tabindex="-1"`)만 제외한다.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true",
  );
}

export interface UseFocusTrapOptions {
  /** 오버레이가 열려 있는지. false 로 바뀌는 순간 포커스를 트리거로 되돌린다 */
  open: boolean;
  /** Escape 키·닫기 요청 시 호출 */
  onClose?: () => void;
  /** Escape 로 닫기 (기본 true) */
  closeOnEscape?: boolean;
  /** 열려 있는 동안 배경 스크롤 잠금 (기본 true) */
  lockScroll?: boolean;
}

/**
 * 모달·사이드시트 같은 오버레이 공용 포커스 트랩.
 *
 * 반환한 ref 를 오버레이 컨테이너(`role="dialog"` 요소)에 연결하면
 * 다음 4가지를 한 번에 처리한다. (DESIGN_참고.md §9 접근성)
 *
 * 1. **초기 포커스** — 열릴 때 컨테이너 자신에게 포커스를 준다.
 *    컨테이너에는 `tabIndex={-1}` 이 필요하다. 첫 번째 포커스 가능 요소(대개 닫기 X
 *    버튼)로 바로 보내면 스크린리더가 다이얼로그 제목 대신 버튼 이름부터 읽는다.
 * 2. **포커스 가두기** — Tab / Shift+Tab 이 컨테이너 안에서만 순환한다.
 * 3. **포커스 복원** — 닫히면 열기 직전에 포커스를 갖고 있던 요소(트리거)로 되돌린다.
 * 4. **배경 스크롤 잠금** — `document.body` 의 `overflow: hidden`.
 *
 * 외부 라이브러리(focus-trap·react-focus-lock)를 쓰지 않는다 — 이 디자인 시스템은
 * 그대로 가져다 쓰는 것이 목적이라 의존성을 최소로 유지한다. (`lib/cn.ts` 와 같은 원칙)
 *
 * @example
 * const panelRef = useFocusTrap<HTMLDivElement>({ open, onClose });
 * return <div ref={panelRef} role="dialog" aria-modal="true" tabIndex={-1}>…</div>;
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>({
  open,
  onClose,
  closeOnEscape = true,
  lockScroll = true,
}: UseFocusTrapOptions): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);

  // 1·3. 초기 포커스 + 포커스 복원.
  // deps 를 [open] 하나로 유지하는 것이 핵심이다. onClose 같은 값이 deps 에 섞이면
  // 부모가 리렌더될 때마다 effect 가 재실행되어 포커스가 컨테이너로 되돌아가 버린다.
  useEffect(() => {
    if (!open) return;

    // effect 는 렌더 커밋 직후에 돌기 때문에, 이 시점의 activeElement 는
    // 아직 오버레이를 연 트리거 요소다.
    const trigger = document.activeElement;
    containerRef.current?.focus();

    return () => {
      if (
        trigger instanceof HTMLElement &&
        document.contains(trigger) &&
        typeof trigger.focus === "function"
      ) {
        trigger.focus();
      }
    };
  }, [open]);

  // 2. Tab 순환. capture 단계에서 잡아 내부 컴포넌트가 먼저 소비하지 못하게 한다.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);

      // 포커스 가능한 요소가 없으면 컨테이너 밖으로 나가지 못하게만 막는다
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // 컨테이너 자신이 포커스를 갖고 있으면(초기 상태) 방향에 맞춰 양 끝으로 보낸다.
      // 브라우저 기본 동작에 맡기면 Shift+Tab 이 컨테이너 "앞" 요소로 빠져나간다.
      if (active === container) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open]);

  // Escape 로 닫기
  useEffect(() => {
    if (!open || !closeOnEscape || !onClose) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  // 4. 배경 스크롤 잠금. 이전 인라인 값을 그대로 되돌려 놓는다
  useEffect(() => {
    if (!open || !lockScroll) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [open, lockScroll]);

  return containerRef;
}
