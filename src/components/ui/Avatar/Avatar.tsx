import { useEffect, useState, type HTMLAttributes } from "react";
import { cn } from "../../../lib/cn";

export type AvatarSize = "small" | "medium" | "large";

export interface AvatarProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> {
  /**
   * 사용자 이름. 이미지의 `alt`이자 이니셜 fallback의 원본이므로 필수다.
   * 이미지가 없거나 로드에 실패하면 이 값의 첫 글자를 보여준다.
   */
  name: string;
  /** 프로필 이미지 URL. 없거나 로드 실패 시 이니셜로 폴백한다 */
  src?: string;
  /** DESIGN.md §26 — 24 / 32 / 48 */
  size?: AvatarSize;
}

/** 4px 그리드 유틸리티. small 24 · medium 32 · large 48 */
const sizeClasses: Record<AvatarSize, string> = {
  small: "size-6",
  medium: "size-8",
  large: "size-12",
};

/** 프레임이 작을수록 한 단계 작은 타이포 프리셋을 쓴다 */
const initialClasses: Record<AvatarSize, string> = {
  small: "label-xsmall",
  medium: "label-small-bold",
  large: "label-medium-bold",
};

/**
 * 이름의 첫 글자를 이니셜로 뽑는다.
 * `Array.from`으로 쪼개야 이모지 등 서로게이트 페어가 깨지지 않는다.
 * 한글은 `toUpperCase()`가 no-op이라 첫 글자가 그대로 남고,
 * 라틴 문자만 대문자로 정규화된다.
 */
function getInitial(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "";
}

export function Avatar({
  name,
  src,
  size = "medium",
  className = "",
  ...props
}: AvatarProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  // src가 바뀌면 실패 상태를 초기화해 새 이미지를 다시 시도한다
  useEffect(() => {
    setLoadFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !loadFailed;
  const initial = getInitial(name);

  return (
    <span
      // 이미지가 있으면 img의 alt가 이름을 읽어주므로 래퍼는 역할을 갖지 않는다.
      // 이니셜 폴백일 때만 래퍼가 이미지 역할을 맡아 전체 이름을 노출한다
      // (이니셜 "김"만 읽히면 의미가 없으므로).
      role={showImage ? undefined : "img"}
      aria-label={showImage ? undefined : name}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden",
        "select-none rounded-full bg-surface-avatar",
        // DESIGN.md §26 — 1px avatar-deco 테두리. 레이아웃 폭에 영향을 주지
        // 않도록 border 대신 안쪽으로 그리는 outline을 쓴다 (Button secondary와 동일)
        "outline-1 -outline-offset-1 outline-avatar-deco",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          onError={() => setLoadFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        // 배경 surface-avatar(slate-300 #bcc0c6) 대비:
        //   text-inverse(흰색) → 1.83:1 — WCAG AA(4.5:1) 미달
        //   text(slate-900)    → 9.7:1  — AA·AAA 모두 통과
        // 따라서 이니셜은 text-text를 쓴다.
        <span aria-hidden className={cn("text-text", initialClasses[size])}>
          {initial}
        </span>
      )}
    </span>
  );
}
