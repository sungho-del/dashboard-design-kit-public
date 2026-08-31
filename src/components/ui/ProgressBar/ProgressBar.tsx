import type { HTMLAttributes, Ref } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../../../lib/cn";

/* =========================================================================
 * ProgressBar — 전체 대비 현재 위치 (규격: docs/DESIGN.md §26 ← §19 실측)
 *
 * ## 무엇을 말하는 부품인가
 *
 * **가로 막대 하나와 숫자 하나**로 "전체 중 얼마"를 말한다. 라벨·이름·부가 수치는
 * 담지 않는다 — 그것들은 표의 다른 열이거나 카드의 제목이지 이 부품의 일이 아니다.
 *
 * ## §19(FileUpload 진행바)에서 가져온 것 / 바꾼 것
 *
 * | §19 스펙                                        | 판정                          |
 * | ----------------------------------------------- | ----------------------------- |
 * | height 4 · radius full · track `surface-slate-secondary` · fill `border-slate` | **그대로** |
 * | `width: 100%`                                   | **바꿈** — 값 텍스트을 뺀 남는 폭 전부 |
 * | `transition: width 0.1s ease`                   | **뺌** (아래)                 |
 *
 * ⚠️ **`transition: width` 를 되살리지 말 것.** 파일 업로드에서는 같은 파일의 진행률이
 * 이어서 오르므로 애니메이션이 진실이지만, 표에서는 정렬·페이지 이동 때 React 가
 * DOM 을 재사용한다. 그러면 A학생 90% → B학생 12% 사이를 막대가 미끄러지며
 * **일어나지 않은 변화를 애니메이션이 지어낸다.**
 *
 * ## 값 슬롯 고정이 이 부품의 핵심이다
 *
 * 값 텍스트의 폭이 행마다 달라지면 트랙의 끝 x 좌표가 행마다 달라진다. 그러면
 * **막대 길이끼리의 비교가 무너진다** — 길이를 비교하려면 시작점과 끝점이 같아야 한다.
 * 그래서 값은 `tabular-nums` + 최소 폭 고정(`100%` 기준) + 우측 정렬이다.
 *
 * ## 임계는 부품이 모른다
 *
 * `threshold` 숫자 prop 을 두지 않는다. "몇 % 미만이면 경고"라는 **극성이 부품에 박히면
 * 이탈률처럼 높을수록 나쁜 지표에 못 쓴다.** 판정은 호출부가 하고, 부품은 결과인
 * `tone` 만 받는다. 그래서 `tone` 에 `success` 도 없다 — 좋고 나쁨은 도메인의 말이다.
 *
 * ## 상태가 하나뿐이다
 *
 * enabled 하나. hover/focus/selected/disabled/loading/indeterminate 전부 없다 —
 * **상호작용하지 않는 부품**이라 탭이 서지 않고 어느 조건에서도 버튼이 되지 않는다.
 * 값이 없으면 이 컴포넌트를 렌더하지 말고 호출부가 `—` 를 둔다.
 * **0%("시작 안 함")와 미집계("모름")는 다른 말이다.**
 * ====================================================================== */

export type ProgressBarTone = "default" | "warning";

/**
 * 루트로 그대로 흘려보내는 DOM props.
 *
 * ⚠️ **이 spread 가 없으면 `Tooltip` 이 조용히 죽는다.** `Tooltip` 은 `cloneElement` 로
 * hover·focus 핸들러와 `ref`, `aria-describedby` 를 자식에게 주입하는데, 커스텀
 * 컴포넌트가 그것을 받아 DOM 으로 넘기지 않으면 **에러도 경고도 없이 툴팁만 열리지
 * 않는다**(`StatTile` 이 그 사례다). 진도율 막대는 "42/60명 완주" 같은 보충 설명이
 * 붙기 쉬운 자리라 트리거가 될 가능성이 높다.
 *
 * 컴포넌트가 소유하는 속성(`role` 과 4종 `aria-*`)은 타입에서 빼 둔다 — 사용처가
 * 덮어쓰면 progressbar 계약 자체가 깨지기 때문이다.
 */
type ProgressBarDomProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  | "role"
  | "children"
  | "className"
  | "aria-label"
  | "aria-valuenow"
  | "aria-valuemin"
  | "aria-valuemax"
  | "aria-valuetext"
>;

export interface ProgressBarProps extends ProgressBarDomProps {
  /** `Tooltip` 이 주입하는 ref */
  ref?: Ref<HTMLDivElement>;
  /**
   * **0~100** 이다 (0~1 아님). 범위 밖 값은 클램프한다.
   *
   * 백분율을 그대로 받는 이유는 호출부가 이미 `62.4%` 라는 **표시용 값**을 갖고
   * 있기 때문이다. 0~1 로 받으면 화면의 숫자와 prop 의 숫자가 달라져,
   * 어느 쪽이 진짜인지 매번 다시 계산해야 한다.
   */
  value: number;
  /**
   * 접근가능 이름의 주어 — "무엇의 진행인가". 화면에는 보이지 않는다.
   *
   * 필수다. 막대는 옆의 텍스트를 자기 이름으로 삼지 못한다(표의 셀은 더더욱).
   * 이름이 없으면 스크린리더에 **"진행률 표시줄 62%"** 만 들려 무엇의 62% 인지 모른다.
   */
  ariaLabel: string;
  /**
   * 표시·낭독 문자열을 덮어쓴다. 기본 `` `${Math.round(value)}%` ``
   *
   * 소수 한 자리(`"62.4%"`)나 분수(`"42/60"`)처럼 도메인이 정한 표기가 있을 때 쓴다.
   * **화면에 보이는 글자와 `aria-valuetext` 가 항상 같은 값**이라 둘이 갈라지지 않는다.
   */
  valueText?: string;
  /**
   * 색조. 기본 `default`.
   *
   * ⚠️ **임계 판정은 호출부가 한다** — 위 주석 참조.
   */
  tone?: ProgressBarTone;
  /**
   * `warning` 일 때 낭독에 덧붙는 말. 기본 `"주의"`.
   *
   * 경고는 **막대 색 · 아이콘 · 낭독 문구** 세 채널로 전달된다. 색만으로는
   * 색각 이상·흑백 출력·스크린리더 어느 쪽에도 닿지 않는다.
   */
  warningText?: string;
  /** 값 텍스트 노출. 기본 `true` */
  showValue?: boolean;
  /**
   * 값(④)을 막대의 **어느 쪽**에 둘지. 기본 `"end"`(막대 → 값).
   *
   * ⚠️ **표 셀 안에서는 `"start"` 를 쓴다.** `"end"` 는 값을 셀 오른쪽 끝으로 밀어붙이는데,
   * 표에서는 그 값이 **다음 컬럼의 좌측 정렬 텍스트와 마주 보게** 된다(둘 사이가 셀 패딩
   * 8+8 = 16px 뿐이라 붙어 보이고, 값이 어느 컬럼 소속인지도 모호해진다).
   * `DESIGN.md` §7-2 가 "표의 수치도 좌측"이라 규정한 것과도 어긋난다.
   *
   * `"start"` 여도 값 슬롯은 **우측 정렬 + 고정 폭**을 유지한다 —
   * `%` 기호가 세로로 맞고 막대 시작점이 모든 행에서 같아진다.
   */
  valueSide?: "start" | "end";
  /** 부모가 폭을 배분하는 통로 */
  className?: string;
}

/**
 * 필 색 — **분기마다 배경색을 한 번씩만 방출한다.**
 *
 * `cn()` 은 클래스를 병합하지 않으므로 두 갈래가 `bg-*` 를 함께 내보내면
 * 승자를 스타일시트 순서가 정한다.
 *
 * `progress-warning`(mustard-700)은 이 부품을 위해 만든 전용 토큰이다.
 * `border-warning`(mustard-500)은 트랙 위 **1.51**, `icon-warning`(mustard-600)은
 * **2.25** 로 비텍스트 대비 3:1 에 미달한다. mustard-700 은 트랙 위 **3.66** 으로 통과한다.
 * `text-warning-hover` 가 마침 같은 색이지만 **hover 토큰을 정적 색으로 빌려 쓰면
 * hover 를 재매핑하는 날 조용히 깨지므로** 전용 토큰을 만들었다.
 */
const fillToneClasses: Record<ProgressBarTone, string> = {
  default: "bg-border-slate",
  warning: "bg-progress-warning",
};

export function ProgressBar({
  value,
  ariaLabel,
  valueText,
  tone = "default",
  warningText = "주의",
  showValue = true,
  valueSide = "end",
  className,
  ref,
  ...rest
}: ProgressBarProps) {
  /*
    클램프. `Number.isFinite` 를 먼저 보는 이유는 `NaN` 이 `Math.min/max` 를 그대로
    통과해 `width: NaN%` 라는 무효 CSS 가 되기 때문이다 — 집계 실패가 레이아웃
    파손으로 번지지 않게 0 으로 눕힌다. (값이 아예 없을 때는 이 컴포넌트를
    렌더하지 않는 것이 정본이다 — 위 주석 참조)
  */
  const clamped = Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0;

  /* 화면에 보이는 글자 = `aria-valuetext` 의 글자. 둘을 갈라 두지 않는다 */
  const text = valueText ?? `${Math.round(clamped)}%`;
  const isWarning = tone === "warning";

  /*
    ③④ 묶음 — 아이콘과 값 사이만 gap 4 다(루트는 8).
    둘 다 없으면 묶음 자체를 렌더하지 않는다. 빈 요소를 남기면
    루트의 gap-2 가 트랙 옆에 원인 없는 여백을 만든다.
  */
  const valueGroup =
    isWarning || showValue ? (
      <span className="flex shrink-0 items-center gap-1">
        {/*
          ③ 색을 못 보는 사람에게 경고를 전달하는 두 번째 채널.

          ⚠️ 색은 `icon-warning`(mustard-600)이 아니라 **`progress-warning`(mustard-700)** 이다.
          이 아이콘은 장식이 아니라 **정보를 전달하는 그래픽**이라 WCAG 1.4.11 의 3:1 을 받는데,
          mustard-600 은 흰 배경에서 **2.85** 로 미달한다(mustard-700 은 4.62).
        */}
        {isWarning ? (
          <AlertTriangle
            size={16}
            strokeWidth={1.2}
            aria-hidden
            className="shrink-0 text-progress-warning"
          />
        ) : null}
        {/*
          ④ 값 — `tabular-nums` + 최소 폭 고정(`100%` 기준 40px = min-w-10).
          ⚠️ `tone="warning"` 이어도 **글자색은 건드리지 않는다.**
          `text-warning`(mustard-600)은 흰 배경 2.85:1 로 본문 기준에 미달한다.
        */}
        {showValue ? (
          <span className="min-w-10 text-right text-text tabular-nums label-medium">
            {text}
          </span>
        ) : null}
      </span>
    ) : null;

  return (
    <div
      {...rest}
      ref={ref}
      role="progressbar"
      aria-label={ariaLabel}
      /* min·max 를 명시한다 — 기본값에 기대면 브라우저마다 백분율 환산이 갈린다 */
      aria-valuemin={0}
      aria-valuemax={100}
      /* 반올림하지 않는다. 보이는 글자는 `aria-valuetext` 가 따로 말한다 */
      aria-valuenow={clamped}
      aria-valuetext={isWarning ? `${text} ${warningText}` : text}
      className={cn("flex items-center gap-2", className)}
    >
      {valueSide === "start" ? valueGroup : null}

      {/* ① 트랙 — 값 텍스트를 뺀 남는 폭 전부 */}
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-slate-secondary">
        {/*
          ② 필 — value>0 일 때만. `min-w-1`(=트랙 높이 4)로 최소 폭을 보장한다.
          이것이 없으면 `1%` 가 소수점 폭이 되어 `0%` 와 구별되지 않는다.
          폭은 런타임 값이라 inline style 로 준다 — `w-[62.4%]` 같은 임의값
          클래스는 Tailwind 가 스캔에서 만들 수 없어 배포 CSS 에서 사라진다.
        */}
        {clamped > 0 ? (
          <span
            className={cn(
              "block h-full min-w-1 rounded-full",
              fillToneClasses[tone],
            )}
            style={{ width: `${clamped}%` }}
          />
        ) : null}
      </span>

      {valueSide === "end" ? valueGroup : null}
    </div>
  );
}
