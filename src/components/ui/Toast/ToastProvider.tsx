import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../lib/cn";
import {
  Toast,
  type ToastPosition,
  type ToastSize,
  type ToastTone,
} from "./Toast";
import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastOptions,
} from "./useToast";

/** 큐에 쌓여 있는 토스트 1건 */
interface ToastItem {
  id: string;
  message: ReactNode;
  tone: ToastTone;
  size: ToastSize;
  /** false가 되면 퇴장 애니메이션 중이라는 뜻 */
  open: boolean;
}

export interface ToastProviderProps {
  children?: ReactNode;
  /** 토스트가 뜨는 위치. 진입·퇴장 방향도 함께 결정된다 (기본 top) */
  position?: ToastPosition;
  /** 자동으로 사라지기까지의 기본 시간(ms). 기본 3000 */
  duration?: number;
  /** 토스트 기본 크기 */
  size?: ToastSize;
  /**
   * 포털이 붙을 DOM. 기본은 `document.body`.
   * 스토리북·테스트처럼 렌더 범위를 좁히고 싶을 때만 지정한다.
   */
  container?: HTMLElement | null;
}

/** 퇴장 애니메이션 길이. design-core.md "모션" — 콘텐츠 전환 0.3s */
const EXIT_DURATION = 300;

const DEFAULT_DURATION = 3000;

let sequence = 0;

function createId(): string {
  sequence += 1;
  return `toast-${sequence}`;
}

/**
 * 컨테이너. DESIGN.md §15 —
 * fixed · left 50% translateX(-50%) · padding 32 0 · pointer-events none · z-toast
 *
 * 여러 개가 쌓이면 세로로 스택된다. 새 토스트가 항상 화면 가장자리 쪽
 * (= 눈에 가장 잘 띄는 자리)에 오도록 상단은 역순으로 쌓는다.
 */
const containerBaseClasses = cn(
  "pointer-events-none fixed left-1/2 flex -translate-x-1/2 items-center gap-2 py-8",
  "z-(--z-toast)",
);

const containerPositionClasses: Record<ToastPosition, string> = {
  top: "top-0 flex-col-reverse",
  bottom: "bottom-0 flex-col",
};

/**
 * 전역 토스트 Provider. 앱 최상단을 한 번 감싸 두고 어디서든 `useToast()`로 부른다.
 *
 * ```tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * ```
 *
 * 큐·자동 사라짐 타이머·포털 렌더를 모두 여기서 맡는다.
 * 퇴장은 두 단계다 — 먼저 `open`을 false로 내려 애니메이션을 태우고,
 * 0.3s 뒤에 배열에서 제거한다. 바로 지우면 퇴장 애니메이션을 볼 수 없다.
 */
export function ToastProvider({
  children,
  position = "top",
  duration = DEFAULT_DURATION,
  size = "medium",
  container,
}: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);

  /**
   * 예약된 타이머들. 자동 사라짐은 `id`, 제거는 `id:exit` 키로 넣어 둔다.
   * 언마운트 때 한 번에 정리해야 하므로 ref에 모아 둔다.
   */
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearTimer = useCallback((key: string) => {
    const timer = timersRef.current.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(key);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      // 자동 사라짐 예약이 남아 있으면 취소 — 수동 dismiss가 먼저 이겼다는 뜻
      clearTimer(id);

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, open: false } : item)),
      );

      const exitKey = `${id}:exit`;
      clearTimer(exitKey);
      timersRef.current.set(
        exitKey,
        setTimeout(() => {
          timersRef.current.delete(exitKey);
          setItems((prev) => prev.filter((item) => item.id !== id));
        }, EXIT_DURATION),
      );
    },
    [clearTimer],
  );

  const toast = useCallback(
    (input: ToastInput) => {
      // 문자열 축약형(`toast("메시지")`)을 옵션 객체로 정규화한다
      const options: ToastOptions =
        typeof input === "string" ? { message: input } : input;
      const id = options.id ?? createId();
      const lifetime = options.duration ?? duration;

      setItems((prev) => [
        ...prev,
        {
          id,
          message: options.message,
          tone: options.tone ?? "default",
          size: options.size ?? size,
          open: true,
        },
      ]);

      // duration 0 이하 = 자동으로 사라지지 않음. dismiss(id)로만 닫는다
      if (lifetime > 0) {
        clearTimer(id);
        timersRef.current.set(
          id,
          setTimeout(() => {
            timersRef.current.delete(id);
            dismiss(id);
          }, lifetime),
        );
      }

      return id;
    },
    [clearTimer, dismiss, duration, size],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toast, dismiss }),
    [toast, dismiss],
  );

  const portalTarget =
    container ?? (typeof document === "undefined" ? null : document.body);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portalTarget !== null &&
        items.length > 0 &&
        createPortal(
          <div
            data-position={position}
            className={cn(
              containerBaseClasses,
              containerPositionClasses[position],
            )}
          >
            {items.map((item) => (
              <Toast
                key={item.id}
                message={item.message}
                tone={item.tone}
                size={item.size}
                position={position}
                open={item.open}
              />
            ))}
          </div>,
          portalTarget,
        )}
    </ToastContext.Provider>
  );
}
