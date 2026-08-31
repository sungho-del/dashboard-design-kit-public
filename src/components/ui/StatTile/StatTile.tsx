import type { HTMLAttributes, ReactNode, Ref } from "react";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../../../lib/cn";
import { Tag } from "../Tag";

/* =========================================================================
 * StatTile — 대시보드의 기본 단위 (규격: docs/DESIGN-dashboard.md §D3)
 *
 * ## 왜 이 컴포넌트가 생겼나
 *
 * 같은 타일이 **이름만 다섯 개로 갈라져 10개 파일에 복붙**돼 있었다
 * (`dashBoxClasses` `statusBoxClasses` `typeBoxClasses` `dashCardClasses` `summaryBoxClasses`).
 * 클래스 문자열뿐 아니라 **그 위의 JSDoc 주석까지 통째로** 복사돼 있었고,
 * 그 주석이 설명하는 규칙(`design-core.md` 필수규칙 3)은 어디에도 강제되지 않았다.
 * 규칙은 문서에 있는데 그것을 담을 그릇이 없었다 — 이 파일이 그 그릇이다.
 *
 * ## 두 방언을 variant 로 흡수한다
 *
 * | variant | 생김새                              | 쓰이는 곳                     |
 * | ------- | ----------------------------------- | ----------------------------- |
 * | `plain` | 회색 면 · 값/단위 분리 · 클릭 가능  | 필터 대시 · 지표 그룹 카드 안 |
 * | `card`  | 흰 카드 · 아이콘칩 · 증감 · caption | 통계형 화면 상단 KPI 행       |
 *
 * **`plain` 은 "항목"이고 `card` 는 "그 자체로 카드"다.** `plain` 은 흰 카드(`Card`) 안에
 * 들어가는 부품이라 배경이 `surface-sub` 여야 층이 생긴다. 이 구분을 지키지 않으면
 * **회색 면 위에 회색 면**이 얹혀 경계가 사라진다.
 *
 * ## 세 가지 상호작용 (셋은 서로 배타적이다)
 *
 * | prop       | 뜻            | 렌더       | 표식                  |
 * | ---------- | ------------- | ---------- | --------------------- |
 * | 없음       | 값만 보여준다 | `<div>`    | —                     |
 * | `onOpen`   | 다른 화면으로 | `<button>` | `ArrowUpRight`        |
 * | `onSelect` | 목록을 거른다 | `<button>` | `aria-pressed` + 테두리 |
 *
 * **누를 수 없는 버튼은 키보드 사용자에게 빈 정거장이다** — 탭은 멈추는데 아무 일도 없다.
 * 그래서 갈 곳이 있을 때만 버튼이 되고, 표식도 그때만 붙는다.
 * ====================================================================== */

export type StatTileVariant = "plain" | "card";

/**
 * 증감 — **방향(`up`)과 감정(`good`)은 다른 축이다** (§D6-5).
 *
 * 반품률이 **올랐는데**(up) 그건 **나쁘다**(good=false). 하나로 겸용하면
 * 화살표는 ↑인데 색이 초록으로 나가 화면이 거짓말을 한다.
 */
export interface StatTileDelta {
  /** 부호가 포함된 변화량 — `"+12.3%"`. **색만으로 전달하지 않으므로 부호는 필수다** */
  text: string;
  /** 방향 — 올랐나 내렸나. 화살표 아이콘이 이것을 따른다 */
  up: boolean;
  /** 감정 — 그 변화가 좋은가. 색이 이것을 따른다 */
  good: boolean;
}

/**
 * 루트로 그대로 흘려보내는 DOM props.
 *
 * ⚠️ **이 spread 가 없으면 `Tooltip` 이 조용히 죽는다.** `Tooltip` 은 `cloneElement` 로
 * hover·focus 핸들러와 `ref`, `aria-describedby` 를 **자식에게 주입**하는데, 커스텀
 * 컴포넌트가 그것을 받아 DOM 으로 넘기지 않으면 주입된 props 가 어디로도 가지 않는다.
 * 에러도 경고도 없이 **툴팁만 열리지 않는다.**
 *
 * 래퍼 `<div>` 로 감싸는 우회는 쓰지 않는다 — 그러면 `aria-describedby` 가 버튼이 아니라
 * 래퍼에 붙어, 스크린리더가 버튼과 설명을 잇지 못한다.
 *
 * ⚠️ `button` 이 아니라 **`HTMLElement` 기준**이어야 한다. 루트가 상호작용 유무에 따라
 * `<button>` 과 `<div>` 로 갈리는데, `ComponentPropsWithRef<"button">` 을 쓰면 모든
 * 이벤트 핸들러가 `HTMLButtonElement` 로 고정되어 `<div>` 분기에서 타입이 깨진다.
 * 핸들러 파라미터는 반공변이라 **더 넓은 `HTMLElement` 기준이 양쪽 모두에 들어맞는다.**
 */
type StatTileDomProps = Omit<
  HTMLAttributes<HTMLElement>,
  "onSelect" | "children" | "className"
>;

export interface StatTileProps extends StatTileDomProps {
  /**
   * `Tooltip` 이 주입하는 ref.
   *
   * 루트가 상호작용 유무에 따라 `<button>` 과 `<div>` 로 갈리므로 **둘의 상위인
   * `HTMLElement` 로 받아** 각 분기에서 그 태그의 ref 로 좁힌다. 좁히기가 안전한 이유는
   * 실제로 들어오는 값이 `Tooltip` 의 콜백 ref 하나뿐이고, 그것이 노드를 읽기만 하기
   * 때문이다. `ComponentPropsWithRef<"button">` 의 ref 를 그대로 두면 `<div>` 분기에서
   * `HTMLButtonElement` 를 요구해 타입이 깨진다.
   */
  ref?: Ref<HTMLElement>;
  /** 무엇을 세는가 */
  label: string;
  /** **이미 포맷된 문자열.** 단위는 넣지 않는다 — `unit` 이 따로 받는다 */
  value: string;
  /** 값과 다른 요소로 렌더된다 (§D3-3). `items-baseline` 이라 밑선이 맞는다 */
  unit?: string;
  /** 기본 `plain` */
  variant?: StatTileVariant;
  /**
   * 값의 색조. `warning` 은 **주의가 필요한 수치**에만 쓴다(미답변 건수 등).
   *
   * ⚠️ 색만으로 전달하지 않는다 — 라벨이 이미 무엇인지 말하고 있어야 한다.
   * 색은 "이 줄을 먼저 보라"는 보조 신호이지, 그것 없이는 뜻이 통하지 않는 채널이 아니다.
   */
  tone?: "default" | "warning";
  /**
   * 좁은 칸용 — **여백을 줄이고 화살표를 뗀다.** 라벨 크기는 건드리지 않는다.
   *
   * 상태 흐름은 절반 폭에 4칸이 들어가는데 화살표까지 넣으면 라벨이 두 줄로 접힌다.
   * 게다가 흐름에서는 **모든 단계가 링크**라 화살표가 구별하는 것이 없다 —
   * 지표에서는 갈 수 있는 것과 없는 것을 가르지만 여기서는 전부 같다.
   *
   * ⚠️ 한때 이 플래그가 **라벨 타이포까지** 함께 줄였는데, 그 바람에 `StatGrid` 를 쓰는
   * 필터 대시 10화면의 라벨이 승격 과정에서 14 → 12 로 조용히 작아졌다.
   * 여백과 글자 크기는 **다른 축**이라 갈라 둔다 — 글자를 줄여야 하면 `denseLabel` 을 쓴다.
   */
  compact?: boolean;
  /**
   * 라벨을 한 단 줄인다(`body-medium` → `body-small`).
   *
   * **칸이 아주 좁을 때만** — 상태 흐름처럼 절반 폭에 4칸 + 연결자가 함께 들어가는 자리다.
   * 필터 대시(`StatGrid`)는 칸이 그만큼 좁지 않으므로 쓰지 않는다.
   */
  denseLabel?: boolean;

  /**
   * 주면 상자 전체가 **이동 버튼**이 된다.
   *
   * ⚠️ **`variant="card"` 에서는 무시된다** — card 는 표시 전용이다.
   * KPI 행은 지표를 읽는 자리이고, 드릴다운은 그 아래 목록·차트가 맡는다.
   * card 를 눌리게 만들 일이 생기면 그때 분기를 추가하되, 지금은 조용히 버려지지 않도록
   * 이 계약을 테스트가 고정하고 있다(`StatTile.test.tsx` "card 는 표시 전용").
   */
  onOpen?: () => void;
  /** 이동 버튼의 접근가능 이름. 아이콘이 아니라 이 문자열이 뜻을 든다 */
  openLabel?: string;

  /** 주면 상자 전체가 **선택 버튼**(필터)이 된다. ⚠️ `variant="card"` 에서는 무시된다 */
  onSelect?: () => void;
  /** 선택 여부 — `aria-pressed` 와 테두리에 함께 반영된다 */
  selected?: boolean;
  /**
   * 선택 버튼의 접근가능 이름.
   *
   * 라벨과 수치가 두 요소로 갈라져 있어 그대로 두면 브라우저마다 다르게 이어붙는다
   * ("정상 3명" / "정상 3 명"). 한 문자열로 못 박아 스크린리더와 테스트가
   * 같은 이름을 보게 한다. 주지 않으면 `label value unit` 로 조립한다.
   */
  selectLabel?: string;

  /** `card` 전용 — 우상단 아이콘칩에 들어갈 아이콘 */
  icon?: ReactNode;
  /**
   * `card` 전용 — 증감. **부호·아이콘·색을 이 컴포넌트가 책임진다** (§D6-5).
   *
   * 호출부가 `Tag` 를 직접 조립하던 때는 5개 화면이 같은 코드를 복붙했고,
   * 그 색이 `text-success`(#00b505)라 틴트 배경 위에서 **명암비 2.61** 로
   * 작은 글자 기준(4.5:1)에 미달했다. 지금은 `chart-delta-*` 를 쓴다(6.28 / 5.32).
   */
  delta?: StatTileDelta;
  /** `card` 전용 — 비교 기준을 밝힌다("지난주 대비"). 지표마다 다를 수 있어 데이터가 들고 온다 */
  caption?: string;

  className?: string;
}

/**
 * 상자 하나의 공통 형태.
 *
 * ⚠️ `w-full` 이 **필수다.** 상자는 `<button>` 으로도 렌더되는데, 폼 컨트롤은
 * `display:flex` 를 줘도 폭이 **shrink-to-fit** 이라 부모를 채우지 않는다.
 * 그러면 우하단으로 밀어 둔 수치가 밀 공간이 없어 좌측에 붙는다 —
 * 그리드 자식(`stretch`)인 지표는 멀쩡한데 흐름만 어긋나 보이는 증상으로 나타난다.
 */
const PLAIN_BASE =
  "flex w-full flex-col justify-between gap-4 rounded-medium bg-surface-sub text-left";

/**
 * `card` 는 **`Card` + `CardBody` 를 한 겹으로 접은 것**이다.
 * 간격 20(`gap-5`)은 `CardBody` 실측 규격 그대로다 — 16 으로 줄이면 승격 전 화면들과
 * 요소 간격이 어긋난다. padding 24 · radius 8 · 경계선도 `Card` 와 같다.
 */
const CARD_BASE =
  "flex w-full flex-col gap-5 rounded-medium bg-surface p-6 text-left outline-1 -outline-offset-1 outline-border";

/**
 * 눌리는 상자의 공통 인터랙션.
 *
 * **`outline-color` 도 함께 트랜지션한다.** 선택을 테두리로 그리므로(아래 `outlineFor`)
 * 테두리 색이 곧 상태 변화다 — 배경만 부드럽고 테두리는 딱 끊기면 한 동작이 둘로 보인다.
 * 승격 전 11곳 중 **`ProductListPage` 만** 이 값을 갖고 있었다. 복붙이 갈라진 흔적이라,
 * 더 완전한 쪽으로 통일했다(`design-core.md` 모션 — 상태 색 0.1s ease-out).
 *
 * ⚠️ hover 배경으로 `action-secondary-hover` 를 쓰면 안 된다 — 그 토큰과 `surface-sub` 이
 * **둘 다 `slate-50`** 이라 아무 변화가 없다. 한 단계 진한 중립 면인
 * `surface-slate-secondary`(`slate-100`)를 쓴다.
 */
const PRESSABLE =
  "group cursor-pointer transition-[background-color,outline-color] duration-100 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";

/**
 * hover 면 — **고른 상자에는 걸지 않는다.**
 *
 * 선택은 테두리로 그리는데(위 `outlineFor`), 고른 상자에까지 hover 면을 걸면
 * 마우스를 올리는 순간 배경이 진해져 **골라 둔 것이 오히려 흐려 보인다.**
 * hover 는 "고를 수 있다"는 신호이므로, 이미 고른 것에는 할 말이 없다.
 */
const HOVER_FILL = "hover:bg-surface-slate-secondary";

/**
 * 선택 상태 — **선택은 테두리, hover 는 면** (`design-core.md` 필수규칙 3).
 *
 * `action-primary-tonal` 은 `rgba(113,118,128,0.1)` 이라 흰 배경 위에서 `#f1f1f2` 가 되는데,
 * 바탕인 `surface-sub`(`#f8f9fb`)와는 **2.4% 밖에 차이가 안 나면서** hover 인
 * `surface-slate-secondary`(`#e2e5e9`)보다는 **밝다.** 즉 마우스만 올린 것이
 * 골라 둔 것보다 진해져 **선택 신호가 hover 에 진다.** 그래서 두 신호가
 * 서로 다른 축(선/면)을 쓰게 갈랐다. 되돌리지 말 것.
 *
 * ⚠️ 두 갈래가 외곽선색을 **각각 한 번씩만** 방출한다. `cn()` 은 클래스를 병합하지
 * 않으므로 두 값을 함께 내보내면 승자를 스타일시트 순서가 정하게 된다.
 */
const outlineFor = (selected: boolean) =>
  cn(
    "outline-1 -outline-offset-1",
    selected ? "outline-action-primary" : "outline-transparent",
  );

export function StatTile({
  label,
  value,
  unit,
  variant = "plain",
  tone = "default",
  compact = false,
  denseLabel = false,
  onOpen,
  openLabel,
  onSelect,
  selected = false,
  selectLabel,
  icon,
  delta,
  caption,
  className,
  ref,
  ...rest
}: StatTileProps) {
  /*
    수치는 **우하단**에 붙인다. 라벨(좌상단)과 대각선으로 벌어지면서 같은 정보로
    상자 면적을 끝까지 쓴다 — 내용에 딱 맞춰 두면 흰 카드 안에서 회색 면이 작아 보여
    시각적 균형이 깨진다. 숫자를 오른쪽에 모으면 상자끼리 자릿수 비교도 쉬워진다.

    ⚠️ 값에 `tabular-nums` 를 붙이지 않는다 — 등폭은 모든 숫자에 `0` 의 폭을 주므로
    큰 글자에서 `121` 이 헐거워 보인다. 등폭은 세로로 줄이 맞아야 하는 곳
    (표의 수치 열 · 차트 축 눈금)에만 쓴다. 규격: §D6-2
  */
  const plainBody = (
    <span className="flex items-baseline justify-end gap-1">
      <strong
        className={cn(
          "metric-small",
          tone === "warning" ? "text-text-warning" : "text-text",
        )}
      >
        {value}
      </strong>
      {unit ? <span className="body-medium text-text-sub">{unit}</span> : null}
    </span>
  );

  /* card 는 **표시 전용**이다 — 아래 분기가 `onOpen`·`onSelect` 를 쓰지 않는다 */
  if (variant === "card") {
    return (
      <div
        {...rest}
        ref={ref as Ref<HTMLDivElement>}
        className={cn(CARD_BASE, className)}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="body-medium text-text-sub">{label}</span>
          {icon ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-medium bg-surface-sub text-icon-sub">
              {icon}
            </span>
          ) : null}
        </div>
        <span className="flex items-baseline gap-1">
          <strong
            className={cn(
              "metric-medium",
              tone === "warning" ? "text-text-warning" : "text-text",
            )}
          >
            {value}
          </strong>
          {unit ? (
            <span className="body-medium text-text-sub">{unit}</span>
          ) : null}
        </span>
        {delta || caption ? (
          <div className="flex items-center gap-1">
            {delta ? (
              /*
                배경은 상태 틴트를 그대로 쓰고 **글자색만** `chart-delta-*` 로 바꾼다.
                `text-success`/`text-critical` 은 그 틴트 위에서 4.5:1 에 못 미친다.
              */
              <Tag
                tone="custom"
                size="small"
                style={{
                  "--tag-color": delta.good
                    ? "var(--color-chart-delta-up)"
                    : "var(--color-chart-delta-down)",
                  "--tag-bg-color": delta.good
                    ? "var(--color-surface-success-secondary)"
                    : "var(--color-surface-critical-secondary)",
                }}
              >
                {delta.up ? (
                  <TrendingUp size={12} strokeWidth={1.2} aria-hidden />
                ) : (
                  <TrendingDown size={12} strokeWidth={1.2} aria-hidden />
                )}
                {delta.text}
              </Tag>
            ) : null}
            {caption ? (
              <span className="body-small text-text-minimal">{caption}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  /* `min-h` 로 상자에 존재감을 준다 — `justify-between` 이 라벨과 수치를 양 끝으로 민다 */
  const box = cn(PLAIN_BASE, compact ? "min-h-24 p-4" : "min-h-28 p-5");

  /*
    ⚠️ `truncate` 를 상자에 두면 안 된다 — 버튼 분기가 같은 요소에 `flex` 를 얹는다.
    `text-overflow` 는 **블록 컨테이너에만** 적용되므로, flex 컨테이너가 되는 순간
    말줄임(…)이 사라지고 `overflow: hidden` 이 글자를 중간에서 그냥 자른다.
    말줄임은 **글자를 직접 담는 요소**에 건다(아래 라벨 span).
  */
  /* 라벨 크기는 `compact`(여백)와 **다른 축**이다 — §D3-2 는 라벨을 `body-medium` 으로 규정한다 */
  const labelText = cn(
    "text-text-sub",
    denseLabel ? "body-small" : "body-medium",
  );

  /* 값만 보여줄 때 — 버튼이 아니다 */
  if (!onOpen && !onSelect) {
    return (
      <div
        {...rest}
        ref={ref as Ref<HTMLDivElement>}
        className={cn(box, className)}
      >
        <span className={labelText}>{label}</span>
        {plainBody}
      </div>
    );
  }

  /* 필터(선택) — `aria-pressed` 로 토글임을 알리고, 테두리로 선택을 그린다 */
  if (onSelect) {
    return (
      <button
        {...rest}
        ref={ref as Ref<HTMLButtonElement>}
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={selectLabel ?? `${label} ${value}${unit ?? ""}`}
        className={cn(
          box,
          outlineFor(selected),
          PRESSABLE,
          selected ? null : HOVER_FILL,
          className,
        )}
      >
        <span className={labelText}>{label}</span>
        {plainBody}
      </button>
    );
  }

  /* 이동(드릴다운) — 화살표가 "여기서 나갈 수 있다"를 눌러보지 않고도 알린다 */
  return (
    <button
      {...rest}
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      onClick={onOpen}
      aria-label={openLabel}
      className={cn(box, outlineFor(false), PRESSABLE, HOVER_FILL, className)}
    >
      <span
        className={cn(labelText, "flex items-center justify-between gap-1")}
      >
        {/*
          말줄임은 **이 분기에만** 건다. 화살표와 한 줄을 나눠 쓰므로 라벨이 길면
          아이콘을 밀어내기 때문이다. 다른 분기는 라벨이 한 줄을 통째로 쓰므로
          두 줄로 접히게 두는 편이 낫다 — 잘라 버리면 무엇을 세는지 알 수 없다.
        */}
        <span className="truncate">{label}</span>
        {compact ? null : (
          <ArrowUpRight
            size={16}
            strokeWidth={1.2}
            aria-hidden
            className="shrink-0 text-icon-sub transition-colors duration-100 group-hover:text-icon"
          />
        )}
      </span>
      {plainBody}
    </button>
  );
}
