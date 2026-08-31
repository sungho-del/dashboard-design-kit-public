import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../../lib/cn";

export type EmptyStateSize =
  "page" | "table" | "section" | "search" | "compact";

export interface EmptyStateProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  /**
   * 놓이는 자리의 크기 프리셋. 높이·gap·아이콘 크기가 한 묶음으로 움직인다.
   * (DESIGN.md §16 — 5종)
   *
   * | size      | §16 행         | min-height | gap | 아이콘 |
   * | --------- | -------------- | ---------- | --- | ------ |
   * | `page`    | 콘텐츠 전역    | 400        | 20  | 72     |
   * | `table`   | 테이블         | 320        | 20  | 72     |
   * | `section` | 필터 결과 없음 | 240        | 4   | 48     |
   * | `search`  | 검색 결과 없음 | 214        | 8   | 48     |
   * | `compact` | 리스트 내      | 120        | 8   | 48     |
   *
   * `section`(필터)과 `search`(검색)는 크기만 다른 게 아니라 쓰는 자리가 다르다 —
   * 필터는 조건 패널 아래 결과 영역, 검색은 검색어 입력 결과 영역이다.
   */
  size?: EmptyStateSize;
  /** 안내 아이콘. 크기는 size에 맞춰 자동 강제되므로 사용처가 맞출 필요가 없다 */
  icon?: ReactNode;
  /** 무엇이 비었는지 한 줄로. 빈 상태는 반드시 문구를 준다 (DESIGN_참고.md §7) */
  title: ReactNode;
  /** 왜 비었는지·다음에 무엇을 할지. 선택 */
  description?: ReactNode;
  /**
   * 테이블 빈 상태 전용. 가로 스크롤이 있는 표 안에서도 화면 중앙에 머무른다.
   * (DESIGN.md §16 — `position: sticky; left: 50%; transform: translateX(-50%)`)
   */
  sticky?: boolean;
  /** 액션 슬롯. Button 1~2개를 넣는다 */
  children?: ReactNode;
  /** 스크롤 이동·포커스 제어용. React 19는 ref를 일반 prop으로 받는다 */
  ref?: Ref<HTMLDivElement>;
}

/**
 * DESIGN.md §16의 height / gap 표.
 *
 * 높이는 `--spacing: 4px` 기반 4px 그리드 유틸로 그대로 계산된다
 * (`min-h-100` = 4 × 100 = 400px, `min-h-80` = 320, `min-h-60` = 240, `min-h-30` = 120).
 * 임의값(`h-[400px]`)이 필요 없다.
 *
 * **예외는 `search`(214)뿐이다.** 214는 4로 나누어떨어지지 않는 유일한 값이라
 * 정수 유틸이 없다. 그래도 임의 px(`min-h-[…px]`)는 쓰지 않는다 —
 * Tailwind v4의 spacing 유틸은 소수 배수를 받으므로 `min-h-53.5`가
 * `calc(var(--spacing) * 53.5)`로 컴파일된다(= 214px). 즉 값의 출처가 여전히
 * `--spacing` 토큰이며, 토큰이 바뀌면 다른 프리셋과 같은 비율로 함께 움직인다.
 * 임의 px였다면 이 한 종류만 스케일에서 떨어져 나간다.
 *
 * `height`가 아니라 `min-height`를 쓴다 — 문구가 길거나 액션이 2줄로 접히면
 * 고정 높이에서는 내용이 넘쳐 잘리기 때문이다. 비어 있을 때 확보해야 할
 * 최소 면적이라는 표의 의도는 그대로 유지된다.
 */
const sizeClasses: Record<EmptyStateSize, string> = {
  page: "min-h-100 gap-5", // 콘텐츠 전역 400 / gap 20
  table: "min-h-80 gap-5", // 테이블 320 / gap 20
  section: "min-h-60 gap-1", // 필터 결과 없음 240 / gap 4
  search: "min-h-53.5 gap-2", // 검색 결과 없음 214(= 4 × 53.5) / gap 8
  compact: "min-h-30 gap-2", // 리스트 내 120 / gap 8
};

/**
 * DESIGN.md §16 · design-core.md "아이콘" — 빈 상태 72, 작은 빈 상태 48.
 * 더 좁은 자리(32)가 필요하면 사용처에서 `size-8`을 className으로 덧붙인다.
 */
const iconSizeClasses: Record<EmptyStateSize, string> = {
  page: "size-18", // 72
  table: "size-18", // 72
  section: "size-12", // 48
  search: "size-12", // 48
  compact: "size-12", // 48
};

/**
 * 타이포는 프레임 크기에 맞춰 한 단계씩 내린다 (Avatar와 같은 원칙).
 *
 * §16에 타이포 지정이 없어 판단이 필요했다. page·table은 72px 아이콘을 두는
 * 넓은 면적이라 제목이 14px이면 시각 위계가 무너진다 — 페이지 제목(24) ·
 * 섹션 제목(20) 아래 단계인 `heading-medium-bold`(16/24)를 쓴다.
 * section·search·compact는 표·리스트 안에 끼어드는 좁은 자리이므로 기본 본문
 * `body-medium-bold`(14/20)로 낮춘다. 모두 프리셋 클래스이며 임의 크기는 없다.
 */
const titleClasses: Record<EmptyStateSize, string> = {
  page: "heading-medium-bold",
  table: "heading-medium-bold",
  section: "body-medium-bold",
  search: "body-medium-bold",
  compact: "body-medium-bold",
};

/** 설명은 제목보다 한 단계 아래 + `text-sub`로 위계를 만든다 (DESIGN_참고.md §1-4) */
const descriptionClasses: Record<EmptyStateSize, string> = {
  page: "body-medium",
  table: "body-medium",
  section: "body-small",
  search: "body-small",
  compact: "body-small",
};

/**
 * 데이터가 없을 때 자리를 채우는 안내 블록. (DESIGN.md §16)
 *
 * 목록·표·대시보드 위젯은 빈 상태를 반드시 처리한다 — 빈 영역을 그대로
 * 두지 않는다. (DESIGN_참고.md §7)
 */
export function EmptyState({
  size = "page",
  icon,
  title,
  description,
  sticky = false,
  className = "",
  children,
  ref,
  ...props
}: EmptyStateProps) {
  return (
    <div
      ref={ref}
      data-size={size}
      className={cn(
        // 공통: 세로 flex center · text-center · pre-wrap
        // (문구에 넣은 줄바꿈을 그대로 살리기 위해 pre-wrap이 필요하다)
        "flex flex-col items-center justify-center text-center whitespace-pre-wrap",
        sizeClasses[size],
        // 가로 스크롤되는 표 안에서 중앙 고정. sticky는 자기 폭을 기준으로
        // 밀려나므로 w-fit으로 내용 폭까지 줄여야 translateX(-50%)가 맞는다
        sticky && "sticky left-1/2 w-fit -translate-x-1/2",
        className,
      )}
      {...props}
    >
      {icon && (
        // 장식용 아이콘이라 접근성 트리에서 숨긴다. 색은 currentColor로 내려간다
        <span
          data-empty-state-icon
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center text-icon-minimal",
            "[&>svg]:size-full",
            iconSizeClasses[size],
          )}
        >
          {icon}
        </span>
      )}

      {/* 제목·설명은 한 덩어리로 붙여 두고(gap 4), 바깥 gap이 아이콘·액션과의
          거리를 담당한다. 문서 구조상의 제목이 아니므로 h 태그를 쓰지 않는다 */}
      <div className="flex flex-col gap-1">
        <p className={cn("text-text", titleClasses[size])}>{title}</p>
        {description && (
          <p className={cn("text-text-sub", descriptionClasses[size])}>
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      )}
    </div>
  );
}
