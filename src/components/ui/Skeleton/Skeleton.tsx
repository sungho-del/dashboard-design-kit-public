import { cn } from "../../../lib/cn";

/* =========================================================================
 * Skeleton — 아직 오지 않은 데이터의 자리 (규격: docs/DESIGN.md §26 · §26-2)
 *
 * ## 무엇을 말하는 부품인가
 *
 * **올 것의 형태만** 회색 면으로 그려 두는 장식이다. 값을 말하지 않고 **자리의
 * 존재**를 말한다. 자식도 텍스트도 없는 단일 요소다.
 *
 * ## 색 — §26 원문(`surface-sub`)을 뒤집었다
 *
 * §26 은 `bg: surface-sub` 라 적었지만 **그 색으로는 보이지 않는다.**
 *
 * | 면 색                        | 흰 면 위 | `surface-sub` 타일 위 |
 * | ---------------------------- | -------- | --------------------- |
 * | `surface-sub`(slate-50)      | 1.05     | **1.00 — 같은 색**    |
 * | **`surface-skeleton`**(slate-100) | **1.26** | **1.20**         |
 *
 * `surface-sub` 는 `plain` StatTile 의 **배경 그 자체**다(`StatTile.tsx` 참조).
 * 원문대로 만들면 **가장 자주 쓸 자리에서 스켈레톤이 통째로 사라진다.**
 * 그래서 전용 토큰 `surface-skeleton`(slate-100)을 신설했다.
 *
 * ⚠️ 값이 같다고 `surface-slate-secondary` 를 빌려 쓰지 말 것 — 그것은 **hover 면
 * 토큰**이라 hover 를 재매핑하는 날 스켈레톤이 조용히 깨진다.
 * (`progress-warning` 을 따로 만든 것과 같은 논리다.)
 *
 * ## 높이의 정본 — 숫자로 받지 않는다
 *
 * `line` 은 **그 자리의 타이포 프리셋 줄 높이**를 그대로 쓴다(`h-lh` = `height: 1lh`).
 * 부모의 `body-medium` 이면 20, `label-medium` 이면 24가 된다. 숫자 prop 으로 받으면
 * 프리셋을 바꿀 때마다 호출부를 모두 찾아 고쳐야 하고, 그러다 어긋나면 로드 후
 * **레이아웃 시프트** — 스켈레톤이 막으려던 바로 그 증상이 난다.
 *
 * `block` 은 **높이 클래스를 하나도 방출하지 않는다.** 기본값으로 `h-full` 을 두면
 * `className="h-60"` 과 두 갈래가 `height` 를 방출하는데, `cn()` 은 병합하지 않으므로
 * 승자를 스타일시트 순서가 정한다. 높이는 `className` 이나 부모가 준다.
 *
 * 폭도 같은 이유로 클래스가 0개다. 루트가 `display: block` 이라 **기본값이 이미
 * "부모를 채운다"** 이고, `className="w-24"` 는 그 위에 얹히는 것이 아니라 유일한
 * 폭 선언이 된다.
 *
 * ## 접근성 — 절대 읽히지 않는다
 *
 * **항상 `aria-hidden`. role 없음, 이름 없음, 텍스트 노드 없음.**
 * `Spinner` 는 화면당 하나라 `role="status"` 가 맞지만, 스켈레톤은 한 화면에 수십 개라
 * 같은 문법이면 **"로딩 중"이 서른 번 낭독된다.** 로딩 사실은 **컨테이너의
 * `aria-busy="true"`** 가 한 번만 말한다(`DataTableShell` 의 `isLoading` 이 그렇게 한다).
 *
 * ⚠️ **지연 타이머를 이 부품에 넣지 말 것.** 30개가 따로 돌면 화면이 튄다.
 * §D8-1 의 시간 규칙(< 1s 는 표시자를 넣지 않는다)은 **호출부**가 지킨다.
 *
 * ## 상태가 하나뿐이다
 *
 * enabled 하나. hover/focus/selected/disabled 전부 없다. **탭이 서지 않고 어느
 * 조건에서도 `<button>` 이 되지 않는다.** 로딩 중인 타일·행을 눌리게 두지 말 것.
 *
 * ## 애니메이션 없음 (§26 유지)
 *
 * `design-core.md` 모션 표에서 무한 반복은 스피너 하나뿐이다. 표 5행 × 6열이면
 * 상자 30개가 동시에 맥동한다. 애니메이션이 없으므로 `prefers-reduced-motion` 을
 * 다룰 일도 없다.
 *
 * ## ⚠️ DOM props spread 가 없는 것은 의도다
 *
 * `ProgressBar`·`StatTile` 은 받은 DOM props 를 루트로 흘려보낸다 — `Tooltip` 이
 * `cloneElement` 로 주입하는 핸들러·`ref`·`aria-describedby` 가 DOM 까지 닿아야
 * 툴팁이 열리기 때문이다. **스켈레톤은 그 대상이 아니다.** 항상 `aria-hidden` 인
 * 장식이라 접근성 트리에 없고, 마우스를 올릴 이유도 설명할 값도 없다.
 * `aria-describedby` 를 받아도 낭독되지 않는다.
 *
 * **"왜 얘만 spread 가 없지?" 하고 되살리지 말 것.** spread 를 열면 `role` ·
 * `aria-label` · `onClick` 이 들어올 통로가 함께 열리고, 그 순간 이 부품은
 * "읽히지 않는다"는 유일한 접근성 계약을 잃는다.
 *
 * ## 쓰지 않는 곳 `[외부]` Carbon
 *
 * 토스트 · 드롭다운 항목 · 오버플로 메뉴 · 모달. 그리고 **고정 텍스트**(표 헤더 ·
 * 카드 제목 · 타일 라벨 · 툴바)는 스켈레톤으로 만들지 않는다 — 어차피 안 바뀌므로
 * 실제 텍스트로 렌더하고 **변하는 것만** 가린다.
 * ====================================================================== */

export type SkeletonShape = "line" | "block";

export interface SkeletonProps {
  /**
   * 무엇의 자리인가. 기본 `line`.
   *
   * - `line` — 글자 한 줄. 높이는 **그 자리의 타이포 프리셋 줄 높이**(`h-lh`) ·
   *   radius `small`(6)
   * - `block` — 면(차트 · 썸네일 · 타일 전체). **높이는 부모나 `className` 이 준다** ·
   *   radius `medium`(8)
   *
   * `circle` 은 없다 — 이 저장소의 `Avatar` 사용처는 한 곳뿐이고 비동기 로드가 아니다.
   */
  shape?: SkeletonShape;
  /**
   * **폭**(그리고 `block` 의 높이)을 주는 통로. 4px 그리드 유틸만 쓴다 —
   * `w-24` · `w-1/2` · `w-full` · `h-60`. 주지 않으면 부모 폭을 채운다.
   *
   * ⚠️ **radius · 배경색을 여기서 덮으려 하지 말 것.** `cn()` 은 클래스를 병합하지
   * 않으므로 두 값이 함께 방출되고, 승자를 스타일시트 순서가 정한다.
   * ⚠️ `shape="line"` 에 `h-*` 를 주는 것도 같은 이유로 금지다 — 줄 높이는
   * 타이포 프리셋이 정본이다.
   */
  className?: string;
}

/**
 * shape 별 클래스 — **분기마다 radius 를 한 번씩만 방출한다.**
 *
 * `line` 만 높이를 갖는다. `block` 의 높이 자리를 비워 두는 것이 핵심이다
 * (위 주석 "높이의 정본" 참조).
 */
const shapeClasses: Record<SkeletonShape, string> = {
  line: "h-lh rounded-small",
  block: "rounded-medium",
};

export function Skeleton({ shape = "line", className }: SkeletonProps) {
  return (
    /*
      `<span>` + `display: block` 이다. `<div>` 였다면 `<p>` 나 텍스트 자리에 넣는
      순간 무효 HTML 이 되고, 브라우저가 DOM 을 재구성하면서 레이아웃이 어긋난다.

      `aria-hidden` 은 prop 으로 뚫지 못한다 — 이 부품의 유일한 접근성 계약이다.
    */
    <span
      aria-hidden
      data-skeleton={shape}
      className={cn(
        "block bg-surface-skeleton",
        shapeClasses[shape],
        className,
      )}
    />
  );
}
