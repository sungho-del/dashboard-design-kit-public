import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * 글머리 목록 — 본사·입점사 화면 공용(정산 각주·정책 · 상품 폼 도움말).
 *
 * ⚠️ 점은 **도형**(4px 원)이다. `list-disc` 나 「·」「•」 글자로 그리지 않는다 —
 * 글자 점은 글꼴마다 크기·높이가 달라지고, 디자인 도구로 옮기면 텍스트 레이어가 된다.
 *
 * 점은 첫 줄 높이(`h-lh`) 가운데에 선다 — 항목이 여러 줄이 되어도 첫 줄에 붙는다.
 * 색은 글자색(`bg-current`)을 따르고, 글자 크기·색은 `className`(목록 전체)으로 준다.
 */
export function BulletList({
  items,
  className,
}: {
  items: readonly ReactNode[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <span aria-hidden className="flex h-lh shrink-0 items-center">
            <span className="size-1 rounded-full bg-current" />
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}
