import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../../lib/cn";

export type ToastTone = "default" | "critical";
export type ToastSize = "large" | "medium" | "small";
/** 컨테이너가 붙는 위치. 진입·퇴장 방향도 이 값이 결정한다 */
export type ToastPosition = "top" | "bottom";

export interface ToastProps {
  /**
   * 토스트 본문. 문자열이 기본이지만 ReactNode라
   * `<><Icon /><span>저장되었습니다</span></>` 처럼 아이콘을 함께 넘길 수 있다.
   * (본체가 `gap-2`를 가지는 이유)
   */
  message: ReactNode;
  tone?: ToastTone;
  size?: ToastSize;
  /** 진입·퇴장 방향. 보통 ToastProvider가 자신의 위치를 그대로 내려준다 */
  position?: ToastPosition;
  /**
   * false가 되면 퇴장 애니메이션이 시작된다.
   * DOM에서 실제로 걷어내는 것은 애니메이션이 끝난 뒤 ToastProvider가 한다.
   */
  open?: boolean;
  className?: string;
}

/**
 * 본체 공통. DESIGN.md §15 —
 * flex center · gap 8 · min-width 180 / max-width 480 · radius full ·
 * shadow-toast · backdrop-filter blur(2px) · color text-on
 *
 * 컨테이너가 `pointer-events-none`이므로 본체에서만 다시 켠다.
 * 모션은 design-core.md "모션" — 콘텐츠 전환 0.3s ease-out.
 */
const toastBaseClasses = cn(
  "pointer-events-auto flex items-center justify-center gap-2 text-center",
  "min-w-45 max-w-120 rounded-full shadow-toast backdrop-blur-[2px]",
  "text-text-on",
  "transition-[opacity,transform] duration-300 ease-out",
  "motion-reduce:transition-none",
);

/**
 * 높이는 컨트롤 높이 4단 토큰을 쓴다 —
 * design-core.md "크기 체계"가 토스트를 버튼·아이콘버튼과 같은 계열로 묶어 둔다.
 * (large 48 / medium 40 / small 32, 좌우 패딩 20 / 16 / 12)
 *
 * ⚠️ **`h-` 가 아니라 `min-h-` 다.** 토스트 문구는 길이가 정해져 있지 않다 —
 * `max-w-120`(480)에서 좌우 패딩을 빼면 본문이 448px 뿐이라, 한글 서른 자쯤 되는
 * 문장(`"요청한 배너가 모두 삭제되지 않았습니다. 목록을 다시 확인해 주세요."`)은
 * 두 줄이 된다. 높이를 고정하면 두 줄이 상자 높이와 같아져 `rounded-full` 캡과
 * 글자가 물리고, 세 줄이면 알약 **밖으로 삐져나온다**(overflow 를 걸지 않았다).
 *
 * 세로 패딩을 함께 준다 — `min-h` 만으로는 두 줄일 때 글자가 위아래 끝에 붙는다.
 * 한 줄일 때는 `min-h` 가 이겨서 40/48/32 규격이 그대로 유지된다.
 */
const sizeClasses: Record<ToastSize, string> = {
  large: "min-h-(--size-control-large) px-5 py-3 body-large",
  medium: "min-h-(--size-control-medium) px-4 py-2.5 body-medium",
  small: "min-h-(--size-control-small) px-3 py-2 body-small",
};

const toneClasses: Record<ToastTone, string> = {
  default: "bg-surface-toast",
  critical: "bg-surface-toast-critical",
};

/**
 * 숨은 상태의 오프셋. 상단 토스트는 위(-16)에서 내려오고
 * 하단 토스트는 아래(+16)에서 올라온다. (DESIGN.md §15 애니메이션)
 */
const hiddenOffsetClasses: Record<ToastPosition, string> = {
  top: "-translate-y-4 opacity-0",
  bottom: "translate-y-4 opacity-0",
};

/**
 * DESIGN.md §15 Toast — 프레젠테이션 전용 컴포넌트.
 *
 * 큐·타이머·포털은 전부 ToastProvider가 맡고, 여기서는 "보이는 상태"만 다룬다.
 * 그래서 스토리북·테스트에서 인라인으로 그냥 렌더해 볼 수 있다.
 *
 * 진입 애니메이션을 위해 마운트 직후 한 프레임 뒤에 상태를 뒤집는다.
 * 처음부터 보이는 상태로 렌더하면 브라우저가 시작 값과 끝 값을 같은 프레임에서
 * 계산해 transition이 아예 걸리지 않기 때문이다.
 */
export function Toast({
  message,
  tone = "default",
  size = "medium",
  position = "top",
  open = true,
  className = "",
}: ToastProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const shown = open && entered;

  return (
    <div
      // critical은 즉시 읽어야 하는 알림이라 assertive로 올린다
      role="status"
      aria-live={tone === "critical" ? "assertive" : "polite"}
      data-tone={tone}
      data-size={size}
      data-position={position}
      data-open={open || undefined}
      className={cn(
        toastBaseClasses,
        sizeClasses[size],
        toneClasses[tone],
        shown ? "translate-y-0 opacity-100" : hiddenOffsetClasses[position],
        className,
      )}
    >
      {message}
    </div>
  );
}
