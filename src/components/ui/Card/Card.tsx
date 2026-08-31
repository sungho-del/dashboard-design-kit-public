import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../../lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 페이지에서 떠 있는 카드(플로팅 패널·강조 배너)일 때만 켠다.
   *
   * 기본값 false — 대시보드의 기본 카드는 **그림자 없이 흰 면 + 보더**다.
   * `shadow-card`를 남발하면 평면 → popover → layer → modal 로 이어지는
   * 엘리베이션 위계가 무너진다. (DESIGN_참고.md §5)
   */
  elevated?: boolean;
  children?: ReactNode;
  /** 스크롤 이동·측정용. React 19는 ref를 일반 prop으로 받는다 */
  ref?: Ref<HTMLDivElement>;
}

/**
 * 관련 있는 정보를 하나의 면으로 묶는 컨테이너. (DESIGN.md §26 `[유추]`)
 *
 * Clay 원본에는 `--shadow-card` 토큰만 있고 카드 CSS가 없어 규격에서 유추했다:
 * `bg: surface` · `radius: medium(8)` · padding 24 · 헤더/바디/푸터 구조.
 * 레거시 Material 카드(radius 2px, `0 1px 3px` 그림자)는 참고하지 않는다.
 *
 * 헤더·바디·푸터는 `CardHeader` / `CardBody` / `CardFooter` named export로
 * 조합한다 (프로젝트 규칙: named export만 — `Card.Header` 같은 정적 속성은 쓰지 않는다).
 */
export function Card({
  elevated = false,
  className = "",
  children,
  ref,
  ...props
}: CardProps) {
  return (
    <div
      ref={ref}
      data-elevated={elevated || undefined}
      className={cn(
        // 헤더·바디·푸터 사이 간격 16 (블록 사이 · DESIGN_참고.md §4).
        // 카드 안쪽 패딩은 24로 고정한다
        "flex flex-col gap-4",
        "rounded-medium bg-surface p-6",
        // 경계는 border가 아니라 안쪽으로 그리는 outline으로 낸다 —
        // 상태가 바뀌어도 레이아웃이 밀리지 않는다 (design-core.md "경계선·포커스").
        // elevated일 때는 그림자가 경계를 대신하므로 보더를 빼 이중 경계를 피한다
        elevated ? "shadow-card" : "outline-1 -outline-offset-1 outline-border",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  /** 카드 제목. `children`을 주면 무시된다 */
  title?: ReactNode;
  /** 우측 액션 슬롯. IconButton·TextButton·Tag 등을 넣는다 */
  action?: ReactNode;
  /** 제목 영역을 통째로 커스텀할 때 사용 (제목 + 보조 설명 등) */
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 카드 제목 + 우측 액션.
 *
 * 제목 타이포는 `heading-medium-bold`(16/24)다. design-core.md 표는
 * `heading-large`(18/28)를 "카드 제목"으로 적어 두었지만, 대시보드에서
 * 카드가 페이지 제목(24) · 섹션 제목(20) 아래에 여러 개 깔리는 구조라
 * 18은 섹션 제목과 위계가 겹친다. 큰 단독 카드에는 사용처에서
 * `children`으로 `heading-large-bold` 제목을 직접 넘긴다.
 *
 * 제목은 `<h3>`로 낸다. 페이지의 heading 레벨이 다르면 `children`으로
 * 알맞은 태그를 직접 넘겨 문서 구조를 맞춘다.
 */
export function CardHeader({
  title,
  action,
  className = "",
  children,
  ref,
  ...props
}: CardHeaderProps) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-between gap-2", className)}
      {...props}
    >
      {/* min-w-0이 있어야 긴 제목이 액션 슬롯을 밀어내지 않는다 */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {children ??
          (title != null && (
            <h3 className="heading-medium-bold text-text">{title}</h3>
          ))}
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </div>
  );
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 카드 본문. 내부 블록은 gap 20으로 벌린다 (DESIGN_참고.md §4 — 본문 블록 사이).
 * 표·리스트를 통째로 넣을 때는 카드 패딩(24)을 상쇄해야 할 수 있으므로
 * 사용처에서 className으로 조정한다.
 */
export function CardBody({
  className = "",
  children,
  ref,
  ...props
}: CardBodyProps) {
  return (
    <div ref={ref} className={cn("flex flex-col gap-5", className)} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 카드 하단 액션 줄. 버튼은 우측 정렬 · 버튼 사이 8 (DESIGN_참고.md §4 기본값).
 */
export function CardFooter({
  className = "",
  children,
  ref,
  ...props
}: CardFooterProps) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-end gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}
