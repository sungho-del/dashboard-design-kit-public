export type ClassValue = string | number | null | undefined | false;

/**
 * 조건부 className 조합 유틸.
 *
 * 외부 의존성(clsx·tailwind-merge)을 쓰지 않는다 — 이 디자인 시스템은
 * 그대로 가져다 쓰는 것이 목적이라 의존성을 최소로 유지한다.
 * 클래스 충돌 병합은 하지 않으므로, 컴포넌트는 오버라이드용 `className`을
 * 항상 **마지막에** 넘겨 사용처가 이기도록 한다.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
