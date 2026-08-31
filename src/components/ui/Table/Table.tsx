import {
  createContext,
  useContext,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "../../../lib/cn";

export type TableAlign = "left" | "center" | "right";

/**
 * 셀 정렬. base에는 text-align을 넣지 않고 여기서만 방출한다 —
 * `cn()`은 클래스 병합을 하지 않으므로 같은 속성을 두 곳에서 내보내면
 * 승자가 스타일시트 순서에 좌우된다. (DESIGN_참고.md §7: 숫자 컬럼은 우측 정렬)
 */
const alignClasses: Record<TableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * th·td 공통 — padding **좌우 12 · 상하 8** · 첫/마지막 셀만 좌우 24. (DESIGN.md §7)
 *
 * ⚠️ 좌우가 8 이던 때는 **셀 사이가 16px** 밖에 안 되어, 이웃한 두 값이 붙어 보이고
 * 어느 열의 값인지 헷갈린다는 보고가 있었다. 12 로 넓혀 **셀 사이 24**(카드 간격과 같은 값)를
 * 만든다. 상하는 8 그대로다 — 행 높이 48 규격을 건드리지 않는다.
 *
 * `first:pl-6`는 `.first\:pl-6:first-child`(0,2,0)라 `.p-2`(0,1,0)를 명시도로
 * 확실히 이긴다. 순서에 의존하지 않는 의도된 오버라이드다.
 */
const cellBaseClasses = "px-3 py-2 align-middle first:pl-6 last:pr-6";

/**
 * 세로 구분선 — `border-right: 1px solid divide`. (DESIGN.md §7)
 *
 * ⚠️ 이 디자인 시스템의 경계선 기본 규칙은 `outline` + 음수 offset이지만,
 * §7은 세로 구분선만 명시적으로 `border-right`로 규정한다. `outline`은 셀의
 * 네 면을 한꺼번에 그리므로 컬럼 사이 1px만 그릴 수단이 없어 예외를 둔 것이다.
 *
 * 색은 `border-r-divide`(border-right-color)만 방출한다 — `border-divide`처럼
 * 네 면을 칠하면 noBackground 모드의 행 클래스(`[&>td]:border-divide`)와
 * 같은 속성을 두 곳에서 내보내게 된다.
 *
 * `last:border-r-0`은 `.last\:border-r-0:last-child`(0,2,0)라 `.border-r`(0,1,0)를
 * 명시도로 확실히 이긴다 — `cellBaseClasses`의 `first:pl-6`와 같은 방식이며
 * 스타일시트 순서에 의존하지 않는다.
 */
const dividerBorderClasses = "border-r border-r-divide last:border-r-0";

/**
 * sticky 헤더 셀용 세로 구분선.
 *
 * `border-collapse: collapse`에서는 border를 셀이 아니라 표가 그린다. 그래서
 * 셀이 sticky로 떠 있는 동안 border만 원래 자리에 남아 함께 스크롤돼 사라진다.
 * (`TableHead sticky`의 하단 1px이 이미 같은 이유로 `::after`를 쓴다 — 그 선례를 따른다)
 *
 * border 계열 클래스는 하나도 방출하지 않으므로 `dividerBorderClasses`와
 * 상호배타로만 쓰인다.
 */
const dividerAfterClasses =
  "relative after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-divide after:content-[''] last:after:hidden";

/** 둘 중 하나만 고른다 — 같은 1px을 두 방식으로 동시에 그리지 않기 위함이다 */
function dividerClassesFor(stickyHead: boolean) {
  return stickyHead ? dividerAfterClasses : dividerBorderClasses;
}

interface TableContextValue {
  /** 홀수 행 surface · 짝수 행 surface-sub 줄무늬 적용 여부 */
  zebra: boolean;
  /** 컬럼 사이 세로 구분선 적용 여부 (DESIGN.md §7) */
  dividers: boolean;
  /** 이 셀이 sticky thead 안에 있는지 — 세로선을 border로 그릴지 ::after로 그릴지 가른다 */
  stickyHead: boolean;
}

/**
 * Table → TableRow(zebra) / TableTh·TableTd(dividers)로 설정을 내려보낸다.
 * TableHead는 부모 값을 그대로 이어받되 zebra=false로 덮어써서 헤더 행이
 * 줄무늬를 타지 않게 하고, 자신의 sticky 여부를 셀에 알린다.
 */
const TableContext = createContext<TableContextValue>({
  zebra: true,
  dividers: false,
  stickyHead: false,
});

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /**
   * zebra 줄무늬. false면 DESIGN.md §7의 `noBackground` 모드가 되어
   * 줄무늬 대신 td 하단 구분선으로 행을 나눈다.
   */
  zebra?: boolean;
  /**
   * 컬럼 사이 세로 구분선(DESIGN.md §7). 기본 false —
   * 컬럼이 많아 열 경계가 필요한 표에서만 켠다. 마지막 컬럼에는 붙지 않는다.
   * 셀 단위로 끄고 켜려면 `TableTh`/`TableTd`의 `divider`를 쓴다.
   */
  dividers?: boolean;
  children?: ReactNode;
  /** 가로 스크롤 제어·측정용. React 19는 ref를 일반 prop으로 받는다 */
  ref?: Ref<HTMLTableElement>;
}

/**
 * DESIGN.md §7. 대시보드 목록형 화면의 기본 표시 수단이다.
 *
 * `table-fixed`라 컬럼 폭은 `<colgroup>`의 `<col>`이 정한다.
 * 가로 스크롤이 필요하면 `overflow-auto` 래퍼로 감싸 쓴다 (§7-1 테이블 셸).
 *
 * ## ⚠️ `w-max`여야 한다 — `w-auto`면 가로 스크롤이 **아예 생기지 않는다**
 *
 * `width: auto`인 표는 **shrink-to-fit**으로 계산된다:
 * `min(내용이 원하는 폭, 쓸 수 있는 폭)`. 즉 **컨테이너보다 넓어질 수 없다.**
 * `<col>`에 3,532px어치를 선언해도 표는 화면 폭으로 눌리고, 열이 비율대로 압축되며
 * **넘치는 것이 없으니 래퍼의 `overflow-auto`도 스크롤바를 만들지 않는다.**
 * (한때 `w-auto`였고, 24열짜리 주문 표가 잘린 채 스크롤이 불가능했다.)
 *
 * `width: max-content`면 shrink-to-fit이 적용되지 않아 **선언한 열 폭의 합이
 * 그대로 표 폭**이 된다. 넘치면 스크롤바가 생기고, 합이 화면보다 좁으면
 * `min-w-full`이 화면을 채우며 열이 비율대로 늘어난다.
 *
 * 원본 Clay/어드민은 같은 결과를 다른 방법으로 낸다 — 셀에 `min-width`를 걸어
 * 표의 **최소 내용 폭**을 끌어올린다. 우리는 `<col>` + `w-max` 로 같은 곳에 도달한다.
 */
export function Table({
  zebra = true,
  dividers = false,
  className = "",
  children,
  ref,
  ...props
}: TableProps) {
  return (
    <TableContext.Provider value={{ zebra, dividers, stickyHead: false }}>
      <table
        ref={ref}
        className={cn(
          "w-max min-w-full table-fixed border-collapse",
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </TableContext.Provider>
  );
}

export interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {
  /**
   * 스크롤 컨테이너 상단에 헤더를 고정한다.
   * `border-collapse: collapse`에서는 sticky 상태의 border가 함께 스크롤되므로
   * 하단 1px을 `::after`로 그린다. (DESIGN.md §7)
   *
   * ⚠️ **표를 감싼 스크롤 컨테이너에 높이 제한이 있어야 동작한다.**
   * sticky 는 "가장 가까운 스크롤포트" 기준인데, `DataTableShell` 에서 그것은
   * `overflow-auto` 인 표 래퍼다. 래퍼에 `max-h-*` 가 없으면 세로로 스크롤할 것이
   * 없고, 바깥 셸은 `overflow-hidden` 이라 **페이지 스크롤이 여기까지 닿지 못한다**
   * — 즉 이 prop 이 조용히 무시된다. `bodyClassName="max-h-150"` 처럼 함께 준다.
   */
  sticky?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLTableSectionElement>;
}

export function TableHead({
  sticky = false,
  className = "",
  children,
  ref,
  ...props
}: TableHeadProps) {
  const inherited = useContext(TableContext);

  return (
    // 헤더 행은 줄무늬 대상이 아니다. dividers는 Table의 값을 그대로 잇고,
    // sticky 여부만 헤더 셀에 추가로 알린다.
    <TableContext.Provider
      value={{ ...inherited, zebra: false, stickyHead: sticky }}
    >
      <thead
        ref={ref}
        className={cn(
          "bg-surface",
          // sticky일 때만 ::after로 1px을 그린다 — 둘 중 하나만 방출해 충돌을 없앤다
          sticky
            ? "sticky top-0 z-2 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-divide after:content-['']"
            : "relative border-b border-divide",
          className,
        )}
        {...props}
      >
        {children}
      </thead>
    </TableContext.Provider>
  );
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children?: ReactNode;
  ref?: Ref<HTMLTableSectionElement>;
}

export function TableBody({
  className = "",
  children,
  ref,
  ...props
}: TableBodyProps) {
  return (
    <tbody ref={ref} className={cn(className)} {...props}>
      {children}
    </tbody>
  );
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /**
   * 행 전체가 클릭 대상일 때. hover 배경 + pointer 커서를 준다.
   * (DESIGN_참고.md §7 — 행 클릭이 가능하면 반드시 둘 다 준다)
   */
  clickable?: boolean;
  /** Table의 zebra 설정을 이 행에서만 덮어쓴다 */
  zebra?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLTableRowElement>;
}

/**
 * 행 높이는 48 고정(`--size-table-row`).
 *
 * zebra와 hover는 둘 다 background-color라 명시도 싸움이 난다.
 * `odd:bg-surface`(0,2,0)를 이기려고 hover도 `odd:hover:`/`even:hover:`로
 * 겹쳐서 (0,3,0)으로 올린다 — 스타일시트 순서에 기대지 않기 위함이다.
 */
export function TableRow({
  clickable = false,
  zebra: zebraProp,
  className = "",
  children,
  ref,
  ...props
}: TableRowProps) {
  const { zebra: zebraFromTable } = useContext(TableContext);
  const zebra = zebraProp ?? zebraFromTable;

  return (
    <tr
      ref={ref}
      data-clickable={clickable || undefined}
      className={cn(
        "h-(--size-table-row)",
        clickable &&
          "cursor-pointer transition-[background-color] duration-200",
        zebra
          ? cn(
              "odd:bg-surface even:bg-surface-sub",
              // 마지막 행이 홀수(흰색)면 바닥 경계가 사라지므로 1px 보정
              "last:odd:border-b last:odd:border-divide",
              clickable && "odd:hover:bg-surface-sub even:hover:bg-surface-sub",
            )
          : cn(
              // noBackground 모드 — 줄무늬 대신 td 하단 구분선
              "[&>td]:border-b [&>td]:border-divide",
              clickable && "hover:bg-surface-sub",
            ),
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export interface TableThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: TableAlign;
  /** 세로 구분선을 이 셀에서만 켜고 끈다. 기본은 Table의 `dividers` */
  divider?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLTableCellElement>;
}

/**
 * 헤더 셀. 타이포는 레거시 13/500에 가장 가까운 `body-small-bold`를 쓴다.
 * `bg-surface`를 th에도 주는 이유는 sticky 헤더에서 thead 배경만으로는
 * 본문이 비쳐 보이는 브라우저가 있기 때문이다.
 */
export function TableTh({
  align = "left",
  divider: dividerProp,
  className = "",
  children,
  scope = "col",
  ref,
  ...props
}: TableThProps) {
  const { dividers, stickyHead } = useContext(TableContext);
  const divider = dividerProp ?? dividers;

  return (
    <th
      ref={ref}
      scope={scope}
      className={cn(
        cellBaseClasses,
        "bg-surface whitespace-nowrap body-small-bold text-text-sub",
        divider && dividerClassesFor(stickyHead),
        alignClasses[align],
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export interface TableTdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: TableAlign;
  /** 2줄까지만 보이고 넘치면 말줄임 (DESIGN.md §7) */
  ellipsis?: boolean;
  /** 세로 구분선을 이 셀에서만 켜고 끈다. 기본은 Table의 `dividers` */
  divider?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLTableCellElement>;
}

/**
 * 본문 셀. 배경은 행(zebra)이 담당하므로 여기서 칠하지 않는다.
 * `line-clamp`는 `display: -webkit-box`를 요구해 셀에 직접 걸면 표 레이아웃이
 * 깨지므로 내부 span에 건다.
 */
export function TableTd({
  align = "left",
  ellipsis = false,
  divider: dividerProp,
  className = "",
  children,
  ref,
  ...props
}: TableTdProps) {
  const { dividers, stickyHead } = useContext(TableContext);
  const divider = dividerProp ?? dividers;

  return (
    <td
      ref={ref}
      className={cn(
        cellBaseClasses,
        "body-medium text-text",
        divider && dividerClassesFor(stickyHead),
        alignClasses[align],
        className,
      )}
      {...props}
    >
      {ellipsis ? (
        <span data-table-ellipsis className="line-clamp-2">
          {children}
        </span>
      ) : (
        children
      )}
    </td>
  );
}

// 합성 컴포넌트 표기(`<Table.Row>`)도 쓸 수 있게 붙여둔다.
// 개별 named export와 완전히 동일한 컴포넌트다.
Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Th = TableTh;
Table.Td = TableTd;
