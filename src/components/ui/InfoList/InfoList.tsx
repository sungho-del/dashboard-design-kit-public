import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../../lib/cn";

/* -------------------------------------------------------------------------
 * InfoList — DESIGN.md §30
 *
 * 상세 화면에서 "라벨 : 값" 쌍을 나열하는 블록. 원본 실측이 있다.
 *   .style_infoList  { flex-direction:column; padding:16; gap:8;
 *                      background: surface-sub; border-radius: medium }
 *   .style_infoItem  { display:flex; align-items:center; gap:10 }
 *   .style_infoLabel { width:80px; flex-shrink:0 }
 *
 * **단순 `<dl>` 이 아니라 회색(`surface-sub`) 박스**라는 점이 핵심이다 —
 * 문서에 "라벨 80px 고정"만 적혀 있어 이 사실이 오래 빠져 있었다.
 * ---------------------------------------------------------------------- */

export interface InfoListProps extends HTMLAttributes<HTMLDListElement> {
  children?: ReactNode;
  ref?: Ref<HTMLDListElement>;
}

/** padding 16 · 항목 간 gap 8 · `surface-sub` 배경 · radius medium (실측) */
export function InfoList({
  className = "",
  children,
  ref,
  ...props
}: InfoListProps) {
  return (
    <dl
      ref={ref}
      className={cn(
        "flex flex-col gap-2 rounded-medium bg-surface-sub p-4",
        className,
      )}
      {...props}
    >
      {children}
    </dl>
  );
}

export interface InfoItemProps extends HTMLAttributes<HTMLDivElement> {
  /** 좌측 라벨. 기본 폭 80 (실측) */
  label: ReactNode;
  /**
   * 라벨 폭을 px 로 덮어쓴다. 라벨이 80 에 안 들어갈 때만 쓸 것.
   * (기본값일 때만 `w-20` 클래스를 방출한다 — `cn()` 은 병합을 하지 않으므로
   *  같은 속성을 두 곳에서 내보내면 순서가 승자를 정한다)
   */
  labelWidth?: number;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/** 라벨↔값 gap 10 · `align-items:center` (실측) */
export function InfoItem({
  label,
  labelWidth,
  className = "",
  children,
  ref,
  ...props
}: InfoItemProps) {
  const custom = labelWidth !== undefined;

  return (
    <div
      ref={ref}
      className={cn("flex items-center gap-2.5", className)}
      {...props}
    >
      <dt
        className={cn(
          "shrink-0 label-medium text-text-sub",
          custom ? "" : "w-20",
        )}
        style={custom ? { width: labelWidth } : undefined}
      >
        {label}
      </dt>
      <dd className="label-medium min-w-0 text-text">{children}</dd>
    </div>
  );
}
