import {
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../../../lib/cn";

/* -------------------------------------------------------------------------
 * FormField — DESIGN.md §29
 *
 * `Input`·`Textarea`·`Select` 는 라벨·도움말·에러를 담을 곳이 없다
 * (`Checkbox`·`Radio`·`Switch` 는 라벨이 컨트롤 옆에 붙는 형태라 자체 보유).
 * 이 래퍼가 그 자리를 표준화한다 — 폼마다 손으로 조립하면 필드가 늘수록 간격이 흔들린다.
 * ---------------------------------------------------------------------- */

export type FormFieldOrientation = "column" | "row";

export interface FormFieldProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /** 필드 이름. `<label>` 의 접근성 이름이 되므로 설명을 섞지 말 것 (§29-7) */
  label: ReactNode;
  /** 필수 표시 `*`. 시각 기호는 aria-hidden 이고 의미는 `aria-required` 가 전달한다 */
  required?: boolean;
  /** 라벨 아래 부연설명. 라벨 텍스트와 gap **4** (§29-1) */
  labelDescription?: ReactNode;
  /** 라벨 행 우측 액션(TextButton·Tooltip 등). gap **8** · 양끝 정렬 */
  labelAction?: ReactNode;
  /**
   * 배치. 원본에 **세로·가로가 동급 변형으로 존재한다** (§29-3).
   * 토글(Switch)·옵션 행처럼 컨트롤이 작고 라벨이 문장인 경우 `row` 를 쓴다.
   */
  orientation?: FormFieldOrientation;
  /** 입력 아래 도움말. gap **6** */
  description?: ReactNode;
  /** 에러 메시지. 있으면 **`description` 을 대체한다** (§29-5) */
  error?: ReactNode;
  /** 컨트롤의 id 를 직접 지정할 때. 생략하면 자동 생성해 자식에 주입한다 */
  htmlFor?: string;
  /**
   * 자식이 **labelable 요소가 아닐 때** 켠다 — `RadioGroup`·`SegmentedControl` 처럼
   * 루트가 `<div role="radiogroup">` 인 **그룹 컨트롤**이 해당한다.
   *
   * HTML 명세상 `<label for>` 는 `input`·`textarea`·`select`·`button` 등
   * **labelable 요소만** 가리킬 수 있다. `<div>` 를 가리키면 연결이 성립하지 않아
   * **그룹에 접근가능 이름이 아예 없는 상태**가 된다(스크린리더가 "라디오 그룹"으로만 읽음).
   * 이때는 라벨을 `<span>` 으로 렌더하고 `aria-labelledby` 로 잇는다.
   */
  group?: boolean;
  children: ReactNode;
}

/** 라벨 텍스트 ↔ 부연설명 gap 4 · 라벨 ↔ 입력 ↔ 메시지 gap 6 (§29-1) */
export function FormField({
  label,
  required = false,
  labelDescription,
  labelAction,
  orientation = "column",
  description,
  error,
  htmlFor,
  group = false,
  children,
  className = "",
  ...props
}: FormFieldProps) {
  const autoId = useId();
  const fieldId = htmlFor ?? autoId;
  const messageId = `${fieldId}-message`;
  const labelId = `${fieldId}-label`;
  const labelDescriptionId = `${fieldId}-label-description`;

  // 에러가 도움말을 대체한다 — 둘을 동시에 띄우면 레이아웃이 밀리고 시선이 흩어진다
  const message = error ?? description;
  const hasMessage =
    message !== undefined && message !== null && message !== false;
  const hasLabelDescription =
    labelDescription !== undefined &&
    labelDescription !== null &&
    labelDescription !== false;

  /*
   * 설명은 **이름이 아니라 설명으로만** 전달한다.
   * 라벨 부연설명도 여기 합류시킨다 — 화면에는 보이는데 스크린리더에는 전달되지 않으면
   * 그 정보가 존재하지 않는 것과 같다. (`<label>` 안에 넣으면 이름이 오염되므로 그건 금지 §29-7)
   */
  const describedBy =
    [
      hasLabelDescription ? labelDescriptionId : null,
      hasMessage ? messageId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  /*
   * 자식이 단일 요소면 id·설명 연결·에러 상태를 자동 주입한다.
   * 사용처가 매번 id 를 손으로 잇지 않게 하기 위한 것이고, **이미 지정한 값은 존중**한다.
   * `invalid` 는 Input·Textarea·Select 가 공통으로 갖는 prop 이라 시각 표현까지 함께 켜진다.
   *
   * `group` 이면 `id` 대신 `aria-labelledby` 를 준다 — `<div role="radiogroup">` 은
   * labelable 요소가 아니라 `<label for>` 로는 이름이 붙지 않기 때문이다.
   */
  const control = isValidElement(children)
    ? cloneElement(
        children as ReactElement<Record<string, unknown>>,
        (() => {
          const own = children.props as Record<string, unknown>;
          return {
            ...(group
              ? {
                  "aria-labelledby": own["aria-labelledby"] ?? labelId,
                }
              : { id: own.id ?? fieldId }),
            "aria-describedby": own["aria-describedby"] ?? describedBy,
            "aria-required": own["aria-required"] ?? (required || undefined),
            ...(error
              ? {
                  invalid: own.invalid ?? true,
                  "aria-invalid": own["aria-invalid"] ?? true,
                }
              : null),
          };
        })(),
      )
    : children;

  const labelBlock = (
    <>
      <div
        className={cn(
          "flex items-center gap-2",
          labelAction ? "justify-between" : "",
        )}
      >
        {/*
          그룹 컨트롤에는 `<label>` 대신 `<span id>` 를 쓴다. `<label for>` 는 labelable
          요소만 가리킬 수 있어서, `<div role="radiogroup">` 에 걸면 **이름이 아예 안 붙는다.**
        */}
        {group ? (
          <span id={labelId} className="label-medium-bold text-text">
            {label}
            {required && (
              <span aria-hidden className="text-text-critical">
                {" *"}
              </span>
            )}
          </span>
        ) : (
          <label htmlFor={fieldId} className="label-medium-bold text-text">
            {label}
            {required && (
              // 시각 기호일 뿐이라 스크린리더에는 감춘다 — 의미는 aria-required 가 전달한다
              <span aria-hidden className="text-text-critical">
                {" *"}
              </span>
            )}
          </label>
        )}
        {labelAction}
      </div>
      {/*
        부연설명은 `<label>` **바깥**에 둔다. 안에 넣으면 접근성 이름에 섞여
        스크린리더가 "상품명 최대 100자까지 입력할 수 있습니다" 로 읽는다 (§29-7).
        대신 `aria-describedby` 로 이어 붙여 **설명으로는 전달되게** 한다.
      */}
      {hasLabelDescription && (
        <span id={labelDescriptionId} className="body-small text-text-sub">
          {labelDescription}
        </span>
      )}
    </>
  );

  const messageBlock = hasMessage && (
    <span
      id={messageId}
      // 에러는 즉시 읽혀야 하므로 살아있는 영역으로 알린다
      role={error ? "alert" : undefined}
      className={cn(
        "body-small",
        error ? "text-text-critical" : "text-text-sub",
      )}
    >
      {message}
    </span>
  );

  if (orientation === "row") {
    return (
      <div
        // 실측: row-gap 24 / column-gap 12 · 991px 이하에서만 줄바꿈 (§29-3)
        className={cn(
          "flex items-center gap-x-3 gap-y-6 max-desktop:flex-wrap",
          className,
        )}
        {...props}
      >
        {/* 라벨이 남는 폭을 점유한다 — 원본 `cardItemLabel { flex: 1 }` */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">{labelBlock}</div>
        <div className="flex flex-col gap-1.5">
          {control}
          {messageBlock}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      <div className="flex flex-col gap-1">{labelBlock}</div>
      {control}
      {messageBlock}
    </div>
  );
}
