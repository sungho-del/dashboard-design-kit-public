import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "../../../lib/cn";
import { buttonBaseClasses } from "../Button/variants";
import { IconButton } from "../IconButton";
import { Select, type SelectProps } from "../Select";
import {
  getPaginationRange,
  isPaginationEllipsis,
  type PaginationItem,
} from "./range";

/**
 * 페이지 버튼·생략 부호 공통 골격 — min-w 32 · h 32 · padding 0 · radius small.
 * (DESIGN.md §8)
 */
const pageSlotClasses = "h-8 min-w-8 rounded-small label-medium-bold";

/**
 * 선택되지 않은 페이지 버튼의 색 상태.
 * selected와 **상호배타로만** 방출한다 — `cn()`은 병합을 하지 않으므로
 * 두 세트를 같이 내보내면 background-color 승자가 스타일시트 순서에 좌우된다.
 */
const pageIdleClasses = cn(
  "bg-transparent text-text-secondary",
  "hover:bg-action-secondary-hover active:bg-action-secondary-pressed",
  "disabled:bg-transparent disabled:text-text-disabled",
  "disabled:pointer-events-none",
);

/** 선택된 페이지 — 강한 선택(near-black + inverse)이며 hover에도 고정이다 */
const pageSelectedClasses = "bg-action-primary text-text-inverse";

export interface PaginationProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "onChange"
> {
  /** 현재 페이지 (1-based) */
  page: number;
  totalPages: number;
  /** 페이지 버튼·화살표 클릭 시 호출. 같은 페이지·범위 밖이면 호출되지 않는다 */
  onPageChange: (page: number) => void;
  /** 현재 페이지 좌우로 항상 보여줄 개수 (기본 1) */
  siblingCount?: number;
  /** 처음·끝에 항상 보여줄 개수 (기본 1) */
  boundaryCount?: number;
  /** nav의 접근성 이름 */
  label?: string;
  /** 좌측 슬롯 — 총 건수 표시 등 (grid 1fr, flex-start) */
  start?: ReactNode;
  /** 우측 슬롯 — 페이지당 개수 셀렉트 등 (grid 1fr, flex-end) */
  end?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/**
 * DESIGN.md §8. `1fr auto 1fr` 3분할이라 좌·우 슬롯의 폭과 무관하게
 * 버튼 그룹이 항상 컨테이너 정중앙에 온다.
 *
 * 화살표는 IconButton(size small = 32 · ghost)을 재사용한다. ghost의 hover·pressed가
 * `action-secondary-*`로 §8 스펙과 같기 때문이다. 다만 `icon-sub` 색은 버튼이 아니라
 * **아이콘 노드**에 걸어, 비활성일 때는 버튼의 `text-disabled`가 그대로 상속되게 한다.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  label = "페이지네이션",
  start,
  end,
  className = "",
  ref,
  ...props
}: PaginationProps) {
  const items: PaginationItem[] = getPaginationRange({
    page,
    totalPages,
    siblingCount,
    boundaryCount,
  });

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  const goTo = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    onPageChange(next);
  };

  return (
    <nav
      ref={ref}
      aria-label={label}
      className={cn(
        "grid w-full grid-cols-[1fr_auto_1fr] items-center py-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-start">{start}</div>

      <ul className="flex items-center justify-center gap-0.5">
        <li className="flex">
          <IconButton
            label="이전 페이지"
            size="small"
            variant="ghost"
            disabled={isFirst}
            className="disabled:pointer-events-none"
            onClick={() => goTo(page - 1)}
            icon={
              <ChevronLeft
                strokeWidth={1.2}
                aria-hidden
                className={isFirst ? undefined : "text-icon-sub"}
              />
            }
          />
        </li>

        {items.map((item) =>
          isPaginationEllipsis(item) ? (
            <li key={item} className="flex">
              <span
                aria-hidden
                data-pagination-ellipsis
                className={cn(
                  "inline-flex items-center justify-center",
                  pageSlotClasses,
                  "text-text-disabled",
                )}
              >
                …
              </span>
            </li>
          ) : (
            <li key={item} className="flex">
              <button
                type="button"
                aria-current={item === page ? "page" : undefined}
                data-selected={item === page || undefined}
                onClick={() => goTo(item)}
                className={cn(
                  buttonBaseClasses,
                  pageSlotClasses,
                  // 선택/비선택은 절대 함께 방출하지 않는다
                  item === page ? pageSelectedClasses : pageIdleClasses,
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}

        <li className="flex">
          <IconButton
            label="다음 페이지"
            size="small"
            variant="ghost"
            disabled={isLast}
            className="disabled:pointer-events-none"
            onClick={() => goTo(page + 1)}
            icon={
              <ChevronRight
                strokeWidth={1.2}
                aria-hidden
                className={isLast ? undefined : "text-icon-sub"}
              />
            }
          />
        </li>
      </ul>

      <div className="flex items-center justify-end">{end}</div>
    </nav>
  );
}

/** 페이지당 개수 기본 후보. 사용처가 `sizes`로 갈아끼울 수 있다 */
const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

/**
 * 트리거 폭 — DESIGN.md §8 "개수 셀렉트 width 140".
 *
 * 140은 4px 그리드 위의 값이라(`w-35` = 4 × 35) 임의값이 필요 없다.
 *
 * 폭은 **Select 루트(`className`)에만** 건다. Select 트리거는 자체적으로
 * `w-full`을 방출하므로, `triggerClassName`으로 `w-35`를 또 주면 `width`가
 * 두 곳에서 나온다 — `cn()`은 병합을 하지 않아 승자가 Tailwind의 규칙 순서에
 * 좌우된다. 루트에 폭을 주고 트리거의 `w-full`이 그 폭을 채우게 하면
 * `width` 선언이 각 요소마다 하나씩만 남는다.
 *
 * `shrink-0`은 페이지네이션의 `end` 슬롯이 flex 컨테이너라서 필요하다.
 * 좌측 슬롯 문구가 길어질 때 140이 눌리지 않게 고정한다.
 */
const sizeSelectRootClasses = "w-35 shrink-0";

/** DESIGN.md §8 개수 셀렉트 패널 max-height */
const SIZE_SELECT_PANEL_MAX_HEIGHT = 292;

export interface PaginationSizeSelectProps extends Omit<
  SelectProps,
  "options" | "value" | "defaultValue" | "onValueChange"
> {
  /** 고를 수 있는 페이지당 개수 (기본 10 · 20 · 50 · 100) */
  sizes?: number[];
  /** 제어 모드의 현재 개수 */
  value?: number;
  /** 비제어 모드의 초기 개수 */
  defaultValue?: number;
  /** 개수를 바꿨을 때. 문자열이 아니라 숫자로 돌려준다 */
  onSizeChange?: (size: number) => void;
  /** 옵션 문구 생성기 (기본 `10개씩 보기`) */
  formatLabel?: (size: number) => string;
}

const formatPageSizeLabel = (size: number) => `${size}개씩 보기`;

/**
 * 페이지네이션의 **개수 셀렉트** — DESIGN.md §8 마지막 행.
 *
 * ```tsx
 * <Pagination
 *   page={page}
 *   totalPages={totalPages}
 *   onPageChange={setPage}
 *   end={<PaginationSizeSelect value={pageSize} onSizeChange={setPageSize} />}
 * />
 * ```
 *
 * ## 왜 `Pagination`의 prop이 아니라 별도 컴포넌트인가
 *
 * 개수 셀렉트가 놓이는 자리는 이미 `end` 슬롯이 차지하고 있다. `pageSize` prop을
 * 받아 Pagination이 직접 그리면 **한 자리를 두 API가 다투게 된다** — `end`를 이미
 * 쓰는 사용처에서 둘 중 무엇이 이기는지 규칙을 새로 만들어야 하고, 개수 셀렉트와
 * 다른 요소를 나란히 두고 싶을 때는 결국 `end`로 되돌아가야 한다.
 * 슬롯에 넣어 쓰는 별도 컴포넌트로 두면 기존 `end` 사용처는 그대로 동작하고,
 * §8의 규격(폭 140)은 이 컴포넌트를 쓰는 순간 보장된다.
 *
 * 셀렉트 자체는 **기존 `Select`를 그대로 재사용**한다. 이 컴포넌트가 더하는 것은
 * 규격(폭)과 숫자 API(`number` ↔ `string` 변환)뿐이다.
 *
 * ## 패널 `max-height 292`에 대해
 *
 * §8의 292는 4px 그리드 밖 값이 아니다 — 292 = 4 × 73이라 `max-h-73`으로 떨어진다
 * (옵션 40 × 6 + gap 4 × 5 + 패딩 16 × 2 = 292, 즉 "6줄까지 보인다"는 뜻이다).
 *
 * `Select`는 패널 `max-height`를 floating-ui `size` 미들웨어의 inline style로
 * 넣는데(뷰포트가 좁으면 `availableHeight`로 더 줄여야 하므로), 그 상한은
 * `panelMaxHeight` prop으로 열려 있다. 기본값은 §5-2의 232이고 여기서는
 * §8 규격인 292를 넘긴다.
 */
export function PaginationSizeSelect({
  sizes = DEFAULT_PAGE_SIZES,
  value,
  defaultValue,
  onSizeChange,
  formatLabel = formatPageSizeLabel,
  label,
  className = "",
  ...props
}: PaginationSizeSelectProps) {
  const options = sizes.map((size) => ({
    value: String(size),
    label: formatLabel(size),
  }));

  return (
    <Select
      options={options}
      value={value === undefined ? undefined : String(value)}
      defaultValue={
        defaultValue === undefined ? undefined : String(defaultValue)
      }
      onValueChange={(next) => onSizeChange?.(Number(next))}
      label={label}
      /*
        보이는 라벨을 두지 않는 자리라(페이지네이션 하단) 트리거에 접근성 이름이
        남지 않는다. label을 주면 <label for>가 이름이 되므로 그때는 붙이지 않는다.
      */
      aria-label={label ? undefined : "페이지당 개수"}
      // §8 개수 셀렉트 패널 규격. 292 = 옵션 40 × 6 + gap 4 × 5 + 패딩 16 × 2
      panelMaxHeight={SIZE_SELECT_PANEL_MAX_HEIGHT}
      className={cn(sizeSelectRootClasses, className)}
      {...props}
    />
  );
}
