import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";
import { StatTile } from "../StatTile";
import { Tooltip } from "../Tooltip";

/* =========================================================================
 * StatGrid — 건수 대시 = 필터 (규격: docs/DESIGN-dashboard.md §D4)
 *
 * ## 이것은 지표가 아니라 필터다
 *
 * 목록 화면 상단의 "건수 카드"는 보여주기만 하는 지표처럼 생겼지만, **누르면
 * 아래 표가 걸러진다.** 그래서 `aria-pressed` 를 가진 토글 버튼이고, 묶음 전체가
 * `role="group"` 으로 "무엇을 고르는 곳인지"를 먼저 알린다.
 *
 * ## 왜 이 컴포넌트가 생겼나
 *
 * 이 패턴이 **11곳**에 있었고, 매번 아래 네 가지를 손으로 다시 조립했다:
 *
 * 1. `role="group"` + `aria-label`
 * 2. **접근가능 이름 조립** — 라벨과 수치가 두 요소로 갈라져 있어 그대로 두면
 *    브라우저마다 다르게 이어붙는다("정상 3명" / "정상 3 명"). 한 문자열로 못 박지
 *    않으면 스크린리더와 테스트가 서로 다른 이름을 본다.
 * 3. **선택은 테두리, hover 는 면** (`design-core.md` 필수규칙 3) — 이유가 길어
 *    잊히기 쉬운데, 그 설명 주석까지 11번 복사돼 있었다.
 * 4. 툴팁이 붙는 항목과 안 붙는 항목의 분기
 *
 * 넷 다 **틀리기 쉽고 틀려도 조용한** 것들이다. 한 곳에 가둔다.
 *
 * ## 열 수는 조립하지 않는다
 *
 * ⚠️ `` `grid-cols-${n}` `` 으로 만들면 Tailwind 스캔이 놓쳐 **배포 CSS 에서 규칙이
 * 통째로 사라진다.** 완전한 문자열을 맵에 적어 둔다 (`DESIGN.md` §28-1 과 같은 함정).
 * ====================================================================== */

export interface StatGridItem {
  /** 필터 값 — `selected` 와 비교되고 `key` 로도 쓰인다 */
  value: string;
  /** 무엇을 세는가 */
  label: string;
  /** **이미 포맷된 문자열** — `1,234` 처럼. 단위는 넣지 않는다 */
  count: string;
  /** 값과 다른 요소로 렌더된다. 접근가능 이름에는 붙여서 들어간다 */
  unit?: string;
  /** 주면 상자를 툴팁으로 감싼다. 없는 항목("전체" 등)은 감싸지 않는다 */
  tip?: ReactNode;
}

export interface StatGridProps {
  items: StatGridItem[];
  /** 현재 선택된 `item.value` */
  selected: string;
  onSelect: (value: string) => void;
  /** `role="group"` 의 이름 — "무엇을 고르는 묶음인지" */
  ariaLabel: string;
  /** 2~6. 항목 수에 맞춘다 */
  columns: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

/** ⚠️ 완전한 문자열이어야 Tailwind 가 찾는다 — 인덱스로 조립하지 말 것 */
const COLUMN_CLASS: Record<StatGridProps["columns"], string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

export function StatGrid({
  items,
  selected,
  onSelect,
  ariaLabel,
  columns,
  className,
}: StatGridProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      /*
        거터 12 — 필터 묶음은 **한 덩어리로 읽혀야 한다.** 카드 사이 간격(24)보다
        좁아야 묶음 안이 묶음 사이보다 가깝게 보인다. 규격: §D4-3
      */
      className={cn("grid gap-3", COLUMN_CLASS[columns], className)}
    >
      {items.map((item) => {
        const tile = (
          <StatTile
            key={item.value}
            label={item.label}
            value={item.count}
            unit={item.unit}
            compact
            selected={selected === item.value}
            onSelect={() => onSelect(item.value)}
            selectLabel={`${item.label} ${item.count}${item.unit ?? ""}`}
          />
        );

        /*
          툴팁이 있는 항목만 감싼다. **두 갈래가 만드는 DOM 은 같다** —
          `Tooltip` 은 `cloneElement` 로 트리거를 그대로 복제할 뿐 래퍼를 만들지 않고
          (패널은 `FloatingPortal` 로 문서 끝에 나간다), 그래서 어느 쪽이든
          그리드의 직접 자식은 `StatTile` 하나다. 폭·높이가 어긋날 일이 없다.

          ⚠️ 한때 툴팁 없는 쪽을 `<div className="flex">` 로 감싸고 "Tooltip 이 래퍼를
          두므로 층을 맞춘다"고 적어 두었는데 **사실이 아니었다.** 오히려 그 div 가
          한쪽에만 층을 더해 비대칭을 만들고 있었다.
        */
        return item.tip ? (
          <Tooltip key={item.value} variant="rich" content={item.tip}>
            {tile}
          </Tooltip>
        ) : (
          tile
        );
      })}
    </div>
  );
}
