import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../../lib/cn";

export type CardVariant = "flat" | "soft";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 페이지에서 떠 있는 카드(플로팅 패널·강조 배너)일 때만 켠다.
   *
   * 기본값 false — 대시보드의 기본 카드는 **그림자 없이 흰 면 + 보더**다.
   * `shadow-card`를 남발하면 평면 → popover → layer → modal 로 이어지는
   * 엘리베이션 위계가 무너진다. (DESIGN_참고.md §5)
   */
  elevated?: boolean;
  /**
   * 표면. 기본 `flat` — 흰 면 + 보더 · radius 8 (지금까지의 카드).
   *
   * `soft` 는 shadcn 대시보드(`dashboard-01` SectionCards)의 표면을 Clay 토큰으로 옮긴 것이다:
   * 흰 면 + `shadow-xsmall` + radius **12**. 보더는 그대로 둔다 — 그림자가 너무 옅어
   * 경계를 대신하지 못한다.
   *
   * ## ⚠️ 그라디언트는 **뺐다** (2026-09-18 → 09-21, 사용자 판단)
   * shadcn 원본은 여기에 `bg-linear-to-t from-primary/5 to-card` 를 얹는다. 실제로 넣어 보니
   * `[실측]` 바닥이 `#f2f2f3` 이 되어 **안쪽 회색 항목 상자(`surface-sub`)보다 짙어졌다** —
   * 카드 중간 높이에서 상자와 면의 밝기가 교차해 **항목 경계가 사라지고**(셀러 지표 1·2행이
   * 글자만 떠 보였다) 아래쪽에서는 상자가 카드보다 **밝아져** 층이 뒤집혔다.
   * shadcn 카드에는 안쪽 회색 상자가 없어서 성립하던 장식이다. 이 저장소의
   * **"흰 카드 = 그룹 / 회색 상자 = 항목"** 두 층 문법과 구조적으로 충돌하므로 되살리지 말 것.
   * (세기를 낮춰도 교차점이 옮겨갈 뿐이다.)
   *
   * ⚠️ **대시보드 화면 전용이다.** 그림자가 `xsmall` 이라 엘리베이션 위계(§5)의 "평면" 층을
   * 벗어나지 않지만, 한 화면에 flat 과 soft 를 섞으면 면이 두 종류로 읽힌다.
   */
  variant?: CardVariant;
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
/**
 * 표면(radius · 배경)과 경계(그림자 · 보더)를 **분기마다 한 번씩만** 방출한다.
 * `cn()` 은 병합하지 않으므로 `rounded-medium` 과 `rounded-large` 가 함께 나가면
 * 승자를 스타일시트 순서가 정한다.
 */
const surfaceClasses: Record<CardVariant, string> = {
  flat: "rounded-medium bg-surface",
  /* 면은 flat 과 같은 흰색이다 — 다른 것은 radius(12)와 아래 `edge` 의 그림자뿐 */
  soft: "rounded-large bg-surface",
};

export function Card({
  elevated = false,
  variant = "flat",
  className = "",
  children,
  ref,
  ...props
}: CardProps) {
  /*
    경계는 border가 아니라 안쪽으로 그리는 outline으로 낸다 —
    상태가 바뀌어도 레이아웃이 밀리지 않는다 (design-core.md "경계선·포커스").
    elevated일 때는 그림자가 경계를 대신하므로 보더를 빼 이중 경계를 피한다.
    soft 는 보더 + 아주 옅은 그림자를 **함께** 쓴다(그림자만으로는 경계가 서지 않는다).
  */
  const edge = elevated
    ? "shadow-card"
    : variant === "soft"
      ? "shadow-xsmall outline-1 -outline-offset-1 outline-border"
      : "outline-1 -outline-offset-1 outline-border";

  return (
    <div
      ref={ref}
      data-elevated={elevated || undefined}
      data-variant={variant === "flat" ? undefined : variant}
      className={cn(
        // 헤더·바디·푸터 사이 간격 16 (블록 사이 · DESIGN_참고.md §4).
        // 카드 안쪽 패딩은 24로 고정한다
        "flex flex-col gap-4 p-6",
        surfaceClasses[variant],
        edge,
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
