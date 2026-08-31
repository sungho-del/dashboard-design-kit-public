import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "../../../lib/cn";
import { IconButton } from "../IconButton";

export interface PageHeaderProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "title"
> {
  /** 페이지 제목. `heading-2xlarge-bold`(24/32)로 렌더된다 */
  title: ReactNode;
  /** 제목 아래 보조 설명. 한 줄 요약에만 쓴다 */
  description?: ReactNode;
  /** 우측 액션 그룹. Button·IconButton·Dropdown 등을 넣는다 */
  actions?: ReactNode;
  /** 제목 바로 옆 배지 슬롯. Tag를 넣는다 */
  badges?: ReactNode;
  /** 넘기면 제목 앞에 32×32 뒤로가기 버튼이 붙는다 */
  onBack?: () => void;
  /** 뒤로가기 버튼의 스크린리더 이름 */
  backLabel?: string;
  /** 하단 탭 슬롯. `Tabs`를 넣는 자리다 */
  tabs?: ReactNode;
  /** 컴팩트/모바일 규격 (min-height 52 · 좌우 16) */
  compact?: boolean;
  /**
   * 스크롤해도 콘텐츠 컬럼 상단에 붙어 있게 한다 (`position: sticky`).
   *
   * ⚠️ `fixed` 가 아니다. `AppShell` 에서 헤더는 GNB **오른쪽** 콘텐츠 컬럼의
   * 자식인데, `fixed` 는 뷰포트 기준이라 `left-0` 이 GNB(224)까지 덮어 버리고
   * 흐름에서도 빠져 본문이 헤더 높이(72)만큼 위로 올라붙는다.
   * `sticky` 는 자기 자리를 레이아웃에 남기므로 둘 다 생기지 않는다.
   * (`ScriptSettingsPage` 의 하단 저장 바가 같은 이유로 `sticky` 다)
   */
  sticky?: boolean;
  /**
   * sticky일 때의 `top` 값 (CSS 길이값). 생략하면 0이다.
   * 헤더 위에 다른 고정 바가 있는 화면에서 그 높이만큼 내려 붙일 때 쓴다.
   * 화면마다 다른 런타임 값이라 클래스가 아니라 인라인 스타일로 건다.
   */
  stickyTop?: CSSProperties["top"];
  ref?: Ref<HTMLElement>;
}

/**
 * DESIGN.md §24 PageHeader — 페이지 최상단의 제목 + 액션 바.
 *
 * ## 수치 (DESIGN.md §24)
 *
 * | | 데스크톱 | 컴팩트 |
 * | --- | --- | --- |
 * | 바 min-height | 72 | 52 |
 * | 바 padding | `16 40 0` | `0 16` |
 * | 바 gap | 16 | 12 |
 * | 타이틀 행 min-height | 40 | 52 |
 *
 * ## 구조
 *
 * ```tsx
 * <PageHeader
 *   title="주문 관리"
 *   badges={<Tag tone="success">운영중</Tag>}
 *   actions={<Button>주문 등록</Button>}
 *   tabs={<Tabs items={items} />}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  actions,
  badges,
  onBack,
  backLabel = "뒤로 가기",
  tabs,
  compact = false,
  sticky = false,
  stickyTop,
  className = "",
  ref,
  ...props
}: PageHeaderProps) {
  return (
    <header
      ref={ref}
      data-compact={compact || undefined}
      data-sticky={sticky || undefined}
      className={cn(
        // 바는 가로 flex(space-between)지만, 하단 탭 슬롯이 아래로 쌓여야 해서
        // 바깥은 세로 컬럼이고 첫 행이 §24의 "바"다.
        "mx-auto flex w-full flex-col bg-surface",
        // 하단선을 border로 그리면 min-height 계산에 1px이 끼어들어
        // 72/52가 73/53이 된다. §24대로 안쪽 그림자로 그린다.
        "shadow-[inset_0_-1px_0_0_var(--color-border)]",
        // cn()은 클래스를 병합하지 않으므로 sticky 관련 클래스는 한 번만 방출한다.
        // 폭은 콘텐츠 컬럼이 이미 정한다 — left/right 를 주면 흐름 밖으로 나가 버린다
        sticky && "sticky top-0 z-(--z-header)",
        className,
      )}
      // sticky가 아니면 top은 아무 영향이 없다. undefined면 React가 무시한다
      style={{ top: sticky ? stickyTop : undefined }}
      {...props}
    >
      {/*
        바 — §24 데스크톱 min-h 72 / padding 16 40 0 / gap 16

        ⚠️ 규격의 **아래 패딩 0 은 탭이 붙는 경우를 전제한 값**이다. 탭이 타이틀 행
        바로 아래에 와서 나머지 높이를 채우기 때문이다.
        탭이 없으면 그 0 이 그대로 드러나 **내용이 아래로 쏠려 보인다** —
        위 16 / 아래 0 이라 타이틀과 우측 액션이 바 중앙보다 내려앉는다.
        그래서 탭이 없을 때만 `py-4` 로 위아래를 맞춘다.
      */}
      <div
        data-slot="bar"
        className={cn(
          "flex justify-between",
          compact ? "min-h-13 gap-3 px-4" : "min-h-18 gap-4 px-10",
          compact ? "" : tabs ? "pt-4" : "py-4",
        )}
      >
        {/* 타이틀 행 — flex · gap 12 · flex-1 · min-w-0 · min-h 40(컴팩트 52) */}
        <div
          data-slot="title-row"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3",
            compact ? "min-h-13" : "min-h-10",
          )}
        >
          {onBack && (
            // 32×32 = IconButton size="small" (`--size-control-small`)
            <IconButton
              size="small"
              label={backLabel}
              onClick={onBack}
              icon={<ChevronLeft strokeWidth={1.2} aria-hidden />}
            />
          )}

          <div className="flex min-w-0 flex-col justify-center gap-1">
            {/* 제목 ↔ 배지 gap 4 (§24 "타이틀 옆 배지") */}
            <div className="flex min-w-0 items-center gap-1">
              <h1 className="truncate heading-2xlarge-bold text-text">
                {title}
              </h1>
              {badges && (
                <div
                  data-slot="badges"
                  className="flex shrink-0 items-center gap-1"
                >
                  {badges}
                </div>
              )}
            </div>

            {description && (
              <p className="truncate body-medium text-text-sub">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* 우측 액션 그룹 — flex · shrink-0 · gap 8 */}
        {actions && (
          <div data-slot="actions" className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/*
        하단 탭 슬롯 — 탭 텍스트가 제목과 같은 좌측 기준선에 서도록
        gutter만큼 들여쓴다 (§24 "탭 정렬 padding-left: 40").
      */}
      {tabs && (
        <div data-slot="tabs" className={compact ? "pl-4" : "pl-10"}>
          {tabs}
        </div>
      )}
    </header>
  );
}
