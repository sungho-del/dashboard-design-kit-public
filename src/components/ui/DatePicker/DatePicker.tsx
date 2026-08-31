import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DayFlag,
  DayPicker,
  SelectionState,
  UI,
  type ClassNames,
  type CustomComponents,
  type DateRange,
  type Formatters,
  type Labels,
  type Matcher,
} from "react-day-picker";
// 로케일은 react-day-picker 가 재수출하는 것을 쓴다.
// date-fns 는 react-day-picker 의 **전이 의존**일 뿐 우리 package.json 에 없으므로
// `date-fns/locale/ko` 를 직접 import 하면 호이스팅에 기대는 취약한 참조가 된다.
// `react-day-picker/locale` 의 ko 는 date-fns ko + 번역된 aria 라벨을 함께 준다.
import { ko } from "react-day-picker/locale";
import { cn } from "../../../lib/cn";
import { IconButton } from "../IconButton";

export type { DateRange };

/* -------------------------------------------------------------------------
 * 스타일 주입 전략 (v10)
 *
 * **react-day-picker 의 기본 CSS(`react-day-picker/style.css`)를 import 하지 않는다.**
 *
 * - 기본 CSS 는 `--rdp-accent-color: blue`, `--rdp-range_start-color: white` 같은
 *   **하드코딩 색상**을 `.rdp-root` 에 심는다. 우리 규칙(semantic 토큰만)과 정면으로 충돌한다.
 * - `.rdp-selected { font-size: large }`, `.rdp-disabled { opacity: .5 }` 처럼
 *   §17 과 어긋나는 규칙(§17 은 disabled 를 "opacity 1 강제"로 못박는다)이 섞여 있어
 *   import 하면 전부 되돌리는 상쇄 CSS 를 써야 한다.
 * - CSS 를 import 하지 않으면 `--rdp-*` 변수는 **아무도 읽지 않는 죽은 변수**가 된다.
 *   즉 변수 재정의로 규격을 맞추는 길은 애초에 성립하지 않는다.
 *
 * 그래서 `classNames` prop 으로 UI 파트마다 우리 Tailwind 유틸리티를 직접 주입한다.
 * 결과 수치는 DESIGN.md §17 과 1:1 로 맞춘다.
 *
 * ## 특이도 설계 (중요)
 *
 * react-day-picker 는 **수식자(selected·range_middle·today·disabled) 클래스를
 * `<td>`(UI.Day)에** 붙이고, 여러 클래스를 그냥 이어 붙인다(`className.join(" ")`).
 * `cn()` 과 마찬가지로 병합이 없으므로, 같은 속성을 두 클래스가 방출하면
 * 승자가 **Tailwind 가 만든 스타일시트의 정의 순서**로 결정된다 — 제어 불가.
 *
 * 그래서 겹치는 규칙은 **특이도로 순서를 고정**했다. td 에는 rdp 가
 * `data-selected` · `data-disabled` · `data-today` · `data-outside` 를 함께 달아 주므로,
 * 나중에 이겨야 하는 쪽만 `data-*:` variant 로 감싸 특이도를 (0,2,0)으로 올린다.
 *
 *   selected      `bg-action-primary`                 → .cls            (0,1,0)
 *   range 중간    `data-selected:bg-surface-sub`      → .cls[data-selected] (0,2,0) ✅ 이김
 *
 * range 모드에서 `isSelected` 는 **범위 안의 모든 날**에 true 라서(useRange.js),
 * 중간 날에도 selected 클래스가 함께 붙는다. 위 특이도 차이가 그 충돌을 해결한다.
 *
 * hover 는 `not-data-selected:` 로 **구조적으로** 선택된 날을 제외한다.
 * (`:not([data-selected]):hover` — 순서가 아니라 매칭 자체에서 걸러진다)
 * ---------------------------------------------------------------------- */

/** 셀 40 × 40 · radius full · 14/24/400 · text (DESIGN.md §17) */
const dayCellClasses = cn(
  "relative size-10 rounded-full p-0 text-center align-middle",
  "text-text label-medium",
  "transition-[background-color] duration-100 ease-in-out",
  // hover(미선택만) — action-secondary-hover
  "not-data-selected:hover:bg-action-secondary-hover",
);

/**
 * 날짜 버튼은 셀을 꽉 채우는 투명 히트영역이다.
 * 색·타이포는 `<td>` 에서 상속받는다 (Tailwind preflight 가 button 에
 * `font: inherit; color: inherit` 을 걸어 준다).
 */
const dayButtonClasses = cn(
  "flex size-10 cursor-pointer items-center justify-center rounded-full bg-transparent",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
  "disabled:cursor-not-allowed",
);

/**
 * today: `::after` 4px 점 · bottom 6 · bg icon (DESIGN.md §17).
 * 선택된 날 위에서는 near-black 점이 near-black 배경에 묻히므로 inverse 로 뒤집는다.
 */
const todayClasses = cn(
  "after:absolute after:bottom-1.5 after:left-1/2 after:size-1",
  "after:-translate-x-1/2 after:rounded-full after:bg-icon",
  "data-selected:after:bg-icon-inverse",
);

/**
 * 월 이동 버튼. rdp 는 `disabled` 대신 `aria-disabled` + `tabIndex=-1` 로 비활성을
 * 표현하므로(Nav.js), IconButton 의 `disabled:*` 규칙이 걸리지 않는다.
 * `aria-disabled:` variant 로 직접 비활성 표현을 얹고, hover 배경도 되돌린다.
 * (`aria-disabled:hover:*` 는 (0,3,0) 이라 IconButton 의 `hover:*` (0,2,0) 을 이긴다)
 */
const navButtonClasses = cn(
  "aria-disabled:cursor-not-allowed aria-disabled:text-text-disabled",
  "aria-disabled:hover:bg-transparent",
);

/** 본문 좌우 padding 20 · 세로 gap 16 (DESIGN.md §17) */
const monthsBaseClasses = "relative flex flex-wrap px-5";

function buildCalendarClassNames(numberOfMonths: number): Partial<ClassNames> {
  return {
    [UI.Root]: "relative w-fit",
    // 월 간격: multi-month 32 / single 24 (DESIGN.md §17)
    [UI.Months]: cn(monthsBaseClasses, numberOfMonths > 1 ? "gap-8" : "gap-6"),
    [UI.Month]: "flex flex-col gap-4",
    // 캡션 높이 32 = --size-control-small. 우측 nav 버튼과 같은 줄에 맞춘다
    [UI.MonthCaption]: "flex h-8 items-center",
    [UI.CaptionLabel]: "text-text label-medium-bold",
    // nav 는 Root(relative) 기준 우상단. right-5 로 본문 좌우 padding 20 에 맞춘다
    [UI.Nav]: "absolute top-0 right-5 flex items-center gap-1",
    [UI.PreviousMonthButton]: navButtonClasses,
    [UI.NextMonthButton]: navButtonClasses,
    // 셀 간격 border-spacing 4 · margin -4 (DESIGN.md §17).
    // border-spacing 은 border-collapse: separate 에서만 동작한다
    [UI.MonthGrid]: "-m-1 border-separate border-spacing-1",
    // 요일 헤더 40 × 44 · text-sub · 14/24/400 · padding 6/8
    [UI.Weekday]:
      "h-11 w-10 px-2 py-1.5 text-center text-text-sub label-medium",
    [UI.Day]: dayCellClasses,
    [UI.DayButton]: dayButtonClasses,
    // selected — 강한 선택(bg action-primary + text-inverse). design-core.md 필수규칙 3
    [SelectionState.selected]: "bg-action-primary text-text-inverse",
    // range 중간 — 위 "특이도 설계" 주석 참고. selected 를 (0,2,0) 으로 덮는다
    [SelectionState.range_middle]:
      "data-selected:bg-surface-sub data-selected:text-text",
    [DayFlag.today]: todayClasses,
    // §17: disabled 는 text-disabled 이고 **opacity 는 1 로 강제**한다
    [DayFlag.disabled]:
      "data-disabled:text-text-disabled data-disabled:opacity-100",
    // §17 에 규정 없음. 다른 달 날짜는 "약한 텍스트" 위계인 text-minimal 을 쓴다
    // (DESIGN_참고.md §1-4). 선택된 날에는 적용하지 않는다
    [DayFlag.outside]: "not-data-selected:data-outside:text-text-minimal",
    [DayFlag.hidden]: "invisible",
  };
}

/* -------------------------------------------------------------------------
 * 월 이동 버튼 — 기존 IconButton 재사용
 * ---------------------------------------------------------------------- */

interface CalendarNavButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  /** rdp 가 aria-label 을 주지 않을 때의 대체 이름 */
  fallbackLabel: string;
}

/**
 * rdp 의 nav 버튼 자리에 디자인 시스템 IconButton 을 끼운다.
 *
 * rdp 가 넘기는 props 를 통째로 스프레드하지 않고 필요한 것만 골라 넘긴다 —
 * rdp 는 children 으로 자체 Chevron SVG 를 함께 넘기는데, IconButton 은
 * children 을 받지 않고 `icon` 슬롯만 쓰기 때문이다.
 */
function CalendarNavButton({
  icon,
  fallbackLabel,
  ...props
}: CalendarNavButtonProps) {
  return (
    <IconButton
      type="button"
      variant="ghost"
      size="small"
      label={props["aria-label"] ?? fallbackLabel}
      icon={icon}
      className={props.className}
      style={props.style}
      tabIndex={props.tabIndex}
      aria-disabled={props["aria-disabled"]}
      onClick={props.onClick}
    />
  );
}

/** 아이콘 16 · strokeWidth 1.2 (DESIGN_참고.md §8) */
const calendarComponents: Partial<CustomComponents> = {
  PreviousMonthButton: (props) => (
    <CalendarNavButton
      {...props}
      fallbackLabel="이전 달"
      icon={<ChevronLeft size={16} strokeWidth={1.2} aria-hidden />}
    />
  ),
  NextMonthButton: (props) => (
    <CalendarNavButton
      {...props}
      fallbackLabel="다음 달"
      icon={<ChevronRight size={16} strokeWidth={1.2} aria-hidden />}
    />
  ),
};

/* -------------------------------------------------------------------------
 * 한국어 표기
 * ---------------------------------------------------------------------- */

/**
 * ko 로케일의 기본 캡션은 "8월 2026" 이다. 한국식 표기는 "2026년 8월" 이므로
 * 직접 만든다. 문자열 조합이라 date-fns 포맷 토큰에 의존하지 않는다.
 */
const calendarFormatters: Partial<Formatters> = {
  formatCaption: (month) =>
    `${month.getFullYear()}년 ${month.getMonth() + 1}월`,
};

/**
 * 날짜 버튼의 스크린리더 이름. rdp 기본값은 "Today, …", ", selected" 처럼
 * 영어가 섞여 나오므로(labelDayButton.js) 전부 한국어로 바꾼다.
 */
const calendarLabels: Partial<Labels> = {
  labelDayButton: (date, modifiers) => {
    let label = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    if (modifiers.today) label = `오늘, ${label}`;
    if (modifiers.selected) label = `${label}, 선택됨`;
    return label;
  },
};

/** 트리거 기본 표기 — 2026.08.14 */
function formatDateDefault(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day}`;
}

/* -------------------------------------------------------------------------
 * 패널 / 트리거 클래스
 * ---------------------------------------------------------------------- */

/**
 * 패널: w-fit · max-height 440 · padding-top 20 / bottom 24 · bg surface (§17).
 * 440 을 넘기면 스크롤이 필요하므로 `overflow-y-auto` 를 함께 둔다.
 */
const panelBaseClasses = "max-h-110 w-fit overflow-y-auto bg-surface pt-5 pb-6";

/**
 * 트리거: height 40 · padding 0 12 · gap 8 · radius medium ·
 * outline 1 border(offset -1) · hover border-hover · focus 2px focus (§17-1).
 *
 * §17-1 의 실측 padding 은 11 이지만 4px 그리드에 없는 값이라 12(px-3)로 정규화했다.
 * (design-core.md — 4px 그리드)
 *
 * ## 배경·경계선을 base 가 아니라 enabled 쪽에 두는 이유
 *
 * `cn()` 은 클래스를 병합하지 않는다. base 가 `bg-surface`·`outline-1` 을 무조건
 * 내보내고 disabled 가 `bg-field-disabled`·`outline-0` 을 덧붙이면 넷 다 명시도가
 * (0,1,0) 으로 같아 **스타일시트 순서가 승자**를 정한다. 실제 빌드 CSS 순서가
 * `.bg-surface` > `.bg-field-disabled`, `.outline-1` > `.outline-0` 이라
 * **비활성 트리거가 활성과 똑같이 흰 배경 + 1px 경계선**으로 그려졌다.
 * (`Input` 에서 먼저 발견된 것과 같은 사고 — PROGRESS.md Phase 6.5 함정 ①)
 *
 * 그래서 소재 클래스는 disabled / enabled 완전 배타 분기에서 **한 번씩만** 방출한다.
 * base 에는 상태와 무관한 레이아웃·radius·타이포·transition 만 남긴다.
 *
 * 열림 상태(`data-open`)에도 focus 아웃라인을 유지한다. hover 규칙과 특이도가 같아
 * 순서에 좌우되므로, Input 과 같은 방식으로 variant 를 하나 더 겹쳐
 * `data-open:hover:*`(0,3,0) 로 hover(0,2,0) 를 확실히 덮는다.
 */
const triggerBaseClasses = cn(
  "inline-flex items-center",
  "h-(--size-control-medium) gap-2 px-3",
  "rounded-medium label-medium",
  "transition-[background-color,outline-color] duration-100 ease-out",
);

/** disabled: 배경 교체 + 경계선 제거. 포커스가 들어올 수 없어 focus 규칙은 생략 */
const triggerDisabledClasses = "cursor-not-allowed bg-field-disabled outline-0";

/**
 * `invalid` 는 §5 Input 과 같은 방식으로 표현한다 — **배경만 critical**, 경계선은 hover 에서만.
 * 배타 분기인 이유는 위 주석과 같다: `cn()` 이 병합을 안 해서 배경을 두 번 방출하면
 * 스타일시트 순서가 승자를 정한다.
 */
const triggerEnabledClasses = (invalid: boolean) =>
  cn(
    "cursor-pointer",
    invalid ? "bg-surface-critical-secondary" : "bg-surface",
    "outline-1 -outline-offset-1 outline-border",
    invalid
      ? "hover:outline-border-critical-hover"
      : "hover:outline-border-hover",
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
    "focus-visible:hover:outline-focus",
    "data-open:outline-2 data-open:-outline-offset-2 data-open:outline-focus",
    "data-open:hover:outline-focus",
  );

/* -------------------------------------------------------------------------
 * Props
 * ---------------------------------------------------------------------- */

export type DatePickerMode = "single" | "range";

interface DatePickerBaseProps {
  /**
   * 트리거 없이 달력만 그린다. 부유형이 아니므로 radius 0 · 그림자 없음 (§17).
   * 카드·사이드시트 안에 캘린더를 직접 얹을 때 쓴다.
   */
  inline?: boolean;
  /** 트리거 비활성. 선택 불가 **날짜**는 `disabledDates` 로 지정한다 */
  disabled?: boolean;
  /** 한 번에 보여줄 달 수. 2 이상이면 월 간격이 32 로 넓어진다 (§17) */
  numberOfMonths?: number;
  /** 처음 보여줄 달 (비제어) */
  defaultMonth?: Date;
  /** 선택 불가 날짜. react-day-picker 의 Matcher 를 그대로 받는다 */
  disabledDates?: Matcher | Matcher[];
  /** 트리거의 날짜 표기 방식. 기본 `2026.08.14` */
  formatDate?: (date: Date) => string;
  /** 다른 달 날짜 노출 (기본 false) */
  showOutsideDays?: boolean;
  /**
   * 선택이 끝나면 패널을 닫는다 (기본 true).
   * single 은 날짜를 고른 순간, range 는 시작·종료가 모두 채워진 순간이다.
   */
  closeOnSelect?: boolean;
  /** 패널(dialog)의 접근성 이름 */
  panelLabel?: string;
  /** 트리거(인라인일 때는 패널)에 붙는 오버라이드 className */
  className?: string;
  id?: string;
  "aria-label"?: string;
  /**
   * 에러 상태. 배경을 critical 로 바꾸고 `aria-invalid` 를 함께 노출한다 (§5 준용).
   * `FormField` 가 `error` 를 받으면 이 값을 자동 주입한다 — `Input`·`Textarea`·`Select` 와 같은 계약.
   */
  invalid?: boolean;
  /*
   * 아래 셋은 `FormField` 가 `cloneElement` 로 주입하는 것들이다.
   * **받아서 트리거 버튼에 실어 보내지 않으면 연결이 끊긴다** — 도움말·에러가 화면에는
   * 보이는데 스크린리더에는 전달되지 않는 상태가 된다(실제로 그랬다).
   */
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean;
}

export interface DatePickerSingleProps extends DatePickerBaseProps {
  mode?: "single";
  /** 선택된 날짜 (제어형) */
  value?: Date;
  onChange?: (value: Date | undefined) => void;
  /** 값이 없을 때 트리거에 보일 문구 */
  placeholder?: string;
}

export interface DatePickerRangeProps extends DatePickerBaseProps {
  mode: "range";
  /** 선택된 기간 (제어형) */
  value?: DateRange;
  onChange?: (value: DateRange | undefined) => void;
  /** 시작일이 없을 때의 문구 */
  startPlaceholder?: string;
  /** 종료일이 없을 때의 문구 */
  endPlaceholder?: string;
}

export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;

/* -------------------------------------------------------------------------
 * DatePicker
 * ---------------------------------------------------------------------- */

/**
 * DESIGN.md §17 DatePicker + §17-1 트리거.
 *
 * ## 구조
 *
 * ```tsx
 * // 단일 날짜
 * <DatePicker value={date} onChange={setDate} />
 *
 * // 기간
 * <DatePicker mode="range" value={range} onChange={setRange} numberOfMonths={2} />
 *
 * // 인라인 (트리거 없음)
 * <DatePicker inline value={date} onChange={setDate} />
 * ```
 *
 * ## 구현 메모
 *
 * - **스타일**: react-day-picker 기본 CSS 를 import 하지 않고 `classNames` 로
 *   Tailwind 유틸리티를 주입한다. 이유는 파일 상단 "스타일 주입 전략" 주석 참고.
 * - **부유**: `@floating-ui/react` — `offset(4)` + `flip()` + `shift()`.
 *   `autoUpdate` 로 스크롤·리사이즈를 추적한다.
 * - **닫기**: `useDismiss` 가 Escape 와 바깥 클릭을 모두 담당한다.
 * - **포커스**: `FloatingFocusManager`(modal=false)가 패널로 포커스를 옮기고
 *   닫을 때 트리거로 되돌린다. 딤이 없는 팝오버라 모달 트랩은 쓰지 않는다.
 * - **z-index**: 팝오버는 자신을 띄운 레이어(모달 포함) 위에 떠야 하므로
 *   `--z-modal` 을 쓴다. 토스트(11000)보다는 아래다. (design-core.md z-index 4단)
 */
export function DatePicker(props: DatePickerProps) {
  const {
    inline = false,
    disabled = false,
    numberOfMonths = 1,
    defaultMonth,
    disabledDates,
    formatDate = formatDateDefault,
    showOutsideDays = false,
    closeOnSelect = true,
    panelLabel = "날짜 선택",
    className = "",
    id,
    invalid = false,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-required": ariaRequired,
    "aria-invalid": ariaInvalid,
  } = props;

  const [open, setOpen] = useState(false);

  /**
   * 패널이 열린 뒤 몇 번째 선택인지 센다.
   *
   * range 모드의 **첫 클릭은 `{ from: d, to: d }`** 라는 하루짜리 완성 범위를 돌려준다
   * (react-day-picker v10 useRange). 그래서 "from·to 가 다 찼는가"만 보면 첫 클릭에서
   * 패널이 닫혀 종료일을 고를 수 없다. 클릭 횟수로 "시작 → 종료" 흐름을 구분한다.
   */
  const selectCountRef = useRef(0);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (next) => {
      if (next) selectCountRef.current = 0;
      setOpen(next);
    },
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context, { enabled: !disabled });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "dialog" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  // union 을 클로저 안에서도 안전하게 쓰기 위해 **const 로 미리 좁혀 둔다**.
  // 파라미터(props)에 걸린 좁힘은 콜백 안까지 유지되지 않는다.
  const isRange = props.mode === "range";
  const rangeValue = props.mode === "range" ? props.value : undefined;
  const onRangeChange = props.mode === "range" ? props.onChange : undefined;
  const singleValue = props.mode === "range" ? undefined : props.value;
  const onSingleChange = props.mode === "range" ? undefined : props.onChange;
  const startPlaceholder =
    props.mode === "range" ? (props.startPlaceholder ?? "시작일") : "시작일";
  const endPlaceholder =
    props.mode === "range" ? (props.endPlaceholder ?? "종료일") : "종료일";
  const placeholder =
    props.mode === "range" ? "날짜 선택" : (props.placeholder ?? "날짜 선택");

  const sharedCalendarProps = {
    locale: ko,
    numberOfMonths,
    defaultMonth,
    showOutsideDays,
    formatters: calendarFormatters,
    labels: calendarLabels,
    components: calendarComponents,
    classNames: buildCalendarClassNames(numberOfMonths),
  };

  const calendar = isRange ? (
    <DayPicker
      {...sharedCalendarProps}
      mode="range"
      selected={rangeValue}
      onSelect={(next) => {
        onRangeChange?.(next);
        selectCountRef.current += 1;
        // 두 번째 선택(=종료일)에서, 범위가 실제로 완성됐을 때만 닫는다
        if (
          closeOnSelect &&
          selectCountRef.current >= 2 &&
          next?.from &&
          next.to
        ) {
          setOpen(false);
        }
      }}
      disabled={disabledDates}
    />
  ) : (
    <DayPicker
      {...sharedCalendarProps}
      mode="single"
      selected={singleValue}
      onSelect={(next) => {
        onSingleChange?.(next);
        if (closeOnSelect && next) setOpen(false);
      }}
      disabled={disabledDates}
    />
  );

  /* ── 인라인형 — 트리거도 부유도 없다 (radius 0 · 그림자 없음) ── */
  if (inline) {
    return (
      <div
        id={id}
        aria-label={ariaLabel}
        data-slot="panel"
        className={cn(panelBaseClasses, "rounded-none", className)}
      >
        {calendar}
      </div>
    );
  }

  /* ── 트리거 라벨 ── */
  const tone = (hasValue: boolean) =>
    disabled
      ? "text-text-disabled"
      : hasValue
        ? "text-text"
        : "text-text-minimal";

  return (
    <>
      <button
        ref={refs.setReference}
        id={id}
        type="button"
        disabled={disabled}
        data-slot="trigger"
        data-open={open || undefined}
        {...getReferenceProps()}
        // getReferenceProps() 뒤에 명시해 값이 확실히 우리 것이 되게 한다
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        /*
          `FormField` 가 주입한 것들을 트리거에 실어 보낸다.
          여기서 흘리면 도움말·에러가 **화면에는 보이는데 스크린리더에는 전달되지 않는다.**
          `aria-invalid` 는 명시값이 우선이고, 없으면 `invalid` 를 따른다.
        */
        aria-describedby={ariaDescribedBy}
        aria-required={ariaRequired}
        aria-invalid={ariaInvalid ?? (invalid || undefined)}
        className={cn(
          triggerBaseClasses,
          disabled ? triggerDisabledClasses : triggerEnabledClasses(invalid),
          className,
        )}
      >
        {isRange ? (
          <>
            {/* 날짜 텍스트 min-width 84 (§17-1). 84 는 4px 그리드 위 값(21 × 4) */}
            <span
              className={cn(
                "min-w-21 text-left",
                tone(Boolean(rangeValue?.from)),
              )}
            >
              {rangeValue?.from
                ? formatDate(rangeValue.from)
                : startPlaceholder}
            </span>
            {/*
              §17-1 의 중앙 아이콘은 18px 이지만, DESIGN_참고.md §8 은 아이콘 크기를
              16 / 20 / 24 로 제한한다. 더 좁은 규칙을 따라 16 을 쓴다.
            */}
            <ArrowRight
              size={16}
              strokeWidth={1.2}
              className={
                disabled
                  ? "shrink-0 text-icon-disabled"
                  : "shrink-0 text-icon-sub"
              }
              aria-hidden
            />
            <span
              className={cn(
                "min-w-21 text-left",
                tone(Boolean(rangeValue?.to)),
              )}
            >
              {rangeValue?.to ? formatDate(rangeValue.to) : endPlaceholder}
            </span>
          </>
        ) : (
          // 단일 날짜 모드의 날짜 텍스트는 min-width 192 (§17-1)
          <span
            className={cn("min-w-48 text-left", tone(Boolean(singleValue)))}
          >
            {singleValue ? formatDate(singleValue) : placeholder}
          </span>
        )}
      </button>

      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              data-slot="panel"
              {...getFloatingProps()}
              role="dialog"
              aria-label={panelLabel}
              className={cn(
                panelBaseClasses,
                // 부유형: radius large(12) + shadow-layer (§17)
                "z-(--z-modal) rounded-large shadow-layer",
              )}
            >
              {calendar}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  );
}
