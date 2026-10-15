import { useId, type ReactNode, type Ref } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "../../../lib/cn";
import { Button } from "../Button";
import { Card, CardBody } from "../Card";
import { TextButton } from "../TextButton";

/* -------------------------------------------------------------------------
 * FilterBar — 목록 화면의 "검색조건" 바
 *
 * 원본 어드민의 `filter` 영역이다. 접힌 채로 열리고, 지금 걸린 조건을 **한 줄로
 * 요약**해 보여 준다:
 *
 * ```
 * 🔍 검색조건  [조건 없음 (전체)]            [초기화] [검색 열기 ⌄]
 * ```
 *
 * ## 왜 접는가
 * 목록 화면 27개가 전부 이 자리를 갖는데, 조건 컨트롤이 3~8개까지 늘어난다.
 * 늘 펼쳐 두면 **표가 첫 화면에서 밀려난다** — 목록 화면에서 먼저 보여야 하는 것은
 * 조건이 아니라 결과다. 그래서 기본은 접힘이고, 조건이 걸려 있으면 요약이 그 사실을
 * 대신 말한다.
 *
 * ## ⚠️ 이 컴포넌트는 **조건을 모른다**
 * 안에 무엇이 들어가는지(기간·셀렉트·검색어), 언제 적용되는지(즉시 / [검색] 버튼),
 * 요약 문구를 어떻게 만드는지는 **화면이 정한다.** 여기는 접기·요약 자리·초기화
 * 버튼이라는 **껍데기**만 준다. 조건을 알게 되는 순간 화면마다 갈라져 공용이 아니게 된다.
 *
 * ## 규격 `[유추]`
 * DESIGN.md 에 이 부품의 실측이 없다(원본 저장본에도 `filter` 의 CSS 는 남아 있지 않다).
 * 그래서 이 저장소의 이웃 규격을 그대로 빌렸다 —
 * - 표면: `Card variant="soft"` (상태 대시·표 셸과 **같은 층**이라 나란히 놓인다)
 * - 줄 간격: `gap-3`(12) · 펼친 영역과의 간격 `gap-4`(16) — `CardBody` 의 기본 리듬
 * - 토글 버튼: `Button variant="secondary"` 기본 높이(40) — 툴바의 다른 버튼과 같은 키
 * ---------------------------------------------------------------------- */

export interface FilterBarProps {
  /**
   * 펼침 여부. 화면이 소유한다 — 조건을 걸어 둔 채 다른 화면에 다녀오면
   * 펼쳐 둔 상태가 유지되어야 하는지는 **화면이 정할 문제**다.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * 접힌 줄에 보이는 현재 조건 요약. 조건이 없을 때도 **반드시 무언가를 낸다** —
   * 원본은 `조건 없음 (전체)` 라고 적는다. 비워 두면 "조건이 없는 것"과
   * "요약을 못 만든 것"이 구별되지 않는다.
   */
  summary: ReactNode;
  /** [초기화]. 넘기지 않으면 버튼이 렌더되지 않는다 */
  onReset?: () => void;
  /** 좌측 라벨. 기본 `검색조건` */
  label?: ReactNode;
  /** 펼쳤을 때 나오는 조건 컨트롤들 */
  children?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * 조건 요약 칩.
 *
 * `Tag` 를 쓰지 않는다 — `Tag` 는 **상태**(정상·정지·반려…)를 나타내는 부품이라
 * tone 이 의미를 갖는다. 여기 들어가는 것은 상태가 아니라 **지금 걸린 값**이므로
 * 색을 얹지 않고 `surface-sub` 상자로만 담는다.
 */
const summaryClasses = cn(
  "inline-flex min-w-0 items-center rounded-small bg-surface-sub px-2 py-1",
  "body-small text-text-sub",
);

export function FilterBar({
  open,
  onOpenChange,
  summary,
  onReset,
  label = "검색조건",
  children,
  className = "",
  ref,
}: FilterBarProps) {
  /* 토글 버튼이 무엇을 펼치는지 보조기술에 알린다 */
  const panelId = useId();

  return (
    <Card variant="soft" className={className} ref={ref}>
      <CardBody>
        <div className="flex items-center gap-3">
          <span className="flex shrink-0 items-center gap-1.5">
            <Search size={16} strokeWidth={1.2} aria-hidden />
            <span className="label-medium-bold text-text">{label}</span>
          </span>

          {/*
            요약은 남는 폭을 전부 가져가되 **줄이지 않는다**(`truncate`).
            조건이 길어 두 줄이 되면 접어 둔 의미가 사라진다.
          */}
          <span className={cn(summaryClasses, "truncate")}>{summary}</span>

          <span className="ml-auto flex shrink-0 items-center gap-2">
            {onReset ? (
              <TextButton tone="secondary" onClick={onReset}>
                초기화
              </TextButton>
            ) : null}
            <Button
              variant="secondary"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => onOpenChange(!open)}
            >
              {open ? "검색 닫기" : "검색 열기"}
              {open ? (
                <ChevronUp size={16} strokeWidth={1.2} aria-hidden />
              ) : (
                <ChevronDown size={16} strokeWidth={1.2} aria-hidden />
              )}
            </Button>
          </span>
        </div>

        {/*
          닫혀 있으면 **DOM 에서 뺀다.** `hidden` 으로 숨기면 안에 있는 입력칸이
          탭 순서에 남아, 보이지 않는 곳으로 포커스가 사라진다.
        */}
        {open ? (
          <div id={panelId} className="flex flex-wrap items-center gap-3">
            {children}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
