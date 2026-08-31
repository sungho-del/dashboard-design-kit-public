import { createContext, useContext, type ReactNode } from "react";
import type { ToastSize, ToastTone } from "./Toast";

export interface ToastOptions {
  message: ReactNode;
  tone?: ToastTone;
  size?: ToastSize;
  /**
   * 자동으로 사라지기까지의 시간(ms). 생략하면 Provider의 기본값(3000).
   * `0` 이하를 주면 자동으로 사라지지 않으므로 반드시 `dismiss(id)`로 닫아야 한다.
   */
  duration?: number;
  /** 직접 id를 지정하고 싶을 때. 생략하면 자동 발급된다 */
  id?: string;
}

/** `toast("메시지")` 축약형과 옵션 객체를 모두 받는다 */
export type ToastInput = string | ToastOptions;

export interface ToastContextValue {
  /** 토스트를 띄우고 id를 돌려준다. 이 id로 나중에 직접 닫을 수 있다 */
  toast: (input: ToastInput) => string;
  /** 해당 토스트의 퇴장 애니메이션을 시작한다 */
  dismiss: (id: string) => void;
}

/**
 * Context는 Provider(.tsx)가 아니라 이 파일에 둔다.
 * 컴포넌트 파일이 컴포넌트 외의 값을 함께 내보내면
 * react-refresh(HMR)가 모듈 전체를 새로 고쳐 상태가 날아가기 때문이다.
 */
export const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * 전역 토스트 호출 훅.
 *
 * ```tsx
 * const { toast } = useToast();
 * toast("저장되었습니다");
 * toast({ message: "삭제에 실패했습니다", tone: "critical", duration: 5000 });
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast는 <ToastProvider> 안에서만 사용할 수 있습니다. 앱 최상단을 ToastProvider로 감싸주세요.",
    );
  }

  return context;
}
