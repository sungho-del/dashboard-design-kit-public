import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn 층 전용 className 조합 유틸 — **`src/shadcn/` 안에서만** 쓴다.
 *
 * 키트의 `cn()`(`./cn.ts`)과 **일부러 나눠 둔다.** 둘은 동작이 다르다:
 *
 * | 유틸              | 충돌 병합 | 쓰는 곳                         |
 * | ----------------- | --------- | ------------------------------- |
 * | `cn` (`cn.ts`)    | 안 한다   | `src/components/ui/*` · 페이지 |
 * | `cn` (이 파일)    | 한다      | `src/shadcn/*` (CLI 가 import)  |
 *
 * shadcn 원본은 "뒤에 온 클래스가 앞의 것을 지운다"(tailwind-merge)는 전제로 쓰였다.
 * 병합 없는 키트 `cn` 에 물리면 같은 속성 클래스 두 개가 CSS 순서로 승부해
 * 조용히 틀린 쪽이 이긴다. 반대로 키트 컴포넌트에 이 파일을 쓰면
 * tailwind-merge 가 Clay 프리셋(`body-medium` 등)을 모르는 클래스로 취급한다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
