import { cn } from "../../../lib/cn";

export type SpinnerTone =
  | "icon"
  | "accent"
  | "critical"
  | "warning"
  | "on"
  | "inverse"
  /** 부모의 글자색을 그대로 상속. 버튼 내부처럼 배경이 변하는 곳에서 사용 */
  | "current";

export interface SpinnerProps {
  /** 지름(px). Clay 기본값 16 */
  size?: number;
  tone?: SpinnerTone;
  /** 스크린리더용 라벨. 생략하면 장식으로 간주해 숨긴다 */
  label?: string;
  className?: string;
}

const toneClasses: Record<SpinnerTone, string> = {
  icon: "text-icon",
  accent: "text-icon-accent",
  critical: "text-icon-critical",
  warning: "text-icon-warning",
  on: "text-icon-on",
  inverse: "text-icon-inverse",
  current: "text-current",
};

export function Spinner({
  size = 16,
  tone = "icon",
  label,
  className = "",
}: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        toneClasses[tone],
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className="size-full animate-spin"
        aria-hidden
      >
        {/* 트랙 */}
        <circle
          cx="8"
          cy="8"
          r="7"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.2"
        />
        {/* 진행 arc — 원주(2πr≈44)의 1/4 */}
        <path
          d="M8 1a7 7 0 0 1 7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
