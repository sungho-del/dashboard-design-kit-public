import type { HTMLAttributes } from "react";
import { cn } from "../../../lib/cn";

export type DividerOrientation = "horizontal" | "vertical";
export type DividerTone = "divide" | "divide-sub" | "divide-minimal";

export interface DividerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "role" | "aria-orientation" | "children"
> {
  /** 가로(기본) / 세로 구분선 */
  orientation?: DividerOrientation;
  /** 선 색. DESIGN.md §26의 `divide` 계열 3종 */
  tone?: DividerTone;
  /**
   * vertical일 때의 길이(px). DESIGN.md §26 기본값 16.
   * Tailwind 임의값 클래스는 런타임 값으로 만들 수 없으므로 Spinner와
   * 동일하게 inline style로 처리한다. (기본 16 = `h-4`와 같은 값)
   */
  length?: number;
  /**
   * 장식용 여부. 기본 true — 시각적 구분만 하는 선은 스크린리더에서 숨긴다.
   * 목록/그룹의 경계처럼 의미가 있으면 false로 두어
   * `role="separator"` + `aria-orientation`을 노출한다.
   */
  decorative?: boolean;
}

/** DESIGN.md §26 — 세로 구분선 지원과 flex 내부 제어를 위해 `<hr>`가 아닌 `<div>` */
const toneClasses: Record<DividerTone, string> = {
  divide: "bg-divide",
  "divide-sub": "bg-divide-sub",
  "divide-minimal": "bg-divide-minimal",
};

export function Divider({
  orientation = "horizontal",
  tone = "divide",
  length = 16,
  decorative = true,
  className = "",
  style,
  ...props
}: DividerProps) {
  const isVertical = orientation === "vertical";

  return (
    <div
      role={decorative ? undefined : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      aria-hidden={decorative ? true : undefined}
      className={cn(
        "shrink-0",
        // 가로: 부모 너비를 채우고 두께 1px / 세로: 두께 1px + 길이는 style로
        isVertical ? "w-px" : "h-px w-full",
        toneClasses[tone],
        className,
      )}
      style={isVertical ? { height: length, ...style } : style}
      {...props}
    />
  );
}
