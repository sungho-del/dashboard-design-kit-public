/** 생략 부호 자리. 앞쪽·뒤쪽을 구분해 key 충돌을 피한다 */
export type PaginationEllipsis = "start-ellipsis" | "end-ellipsis";

/** 페이지 번호(1-based) 또는 생략 부호 */
export type PaginationItem = number | PaginationEllipsis;

export function isPaginationEllipsis(
  item: PaginationItem,
): item is PaginationEllipsis {
  return item === "start-ellipsis" || item === "end-ellipsis";
}

/** start부터 end까지의 정수 배열. end < start면 빈 배열 */
function range(start: number, end: number): number[] {
  const length = Math.max(end - start + 1, 0);
  return Array.from({ length }, (_, index) => start + index);
}

export interface PaginationRangeOptions {
  /** 현재 페이지 (1-based) */
  page: number;
  totalPages: number;
  /** 현재 페이지 좌우로 항상 보여줄 개수 (기본 1) */
  siblingCount?: number;
  /** 처음·끝에 항상 보여줄 개수 (기본 1) */
  boundaryCount?: number;
}

/**
 * 페이지 번호 목록을 축약해 만든다.
 *
 * 기본값(sibling 1 · boundary 1)에서 총 20페이지 · 현재 5페이지면
 * `[1, "start-ellipsis", 4, 5, 6, "end-ellipsis", 20]`을 돌려준다.
 *
 * 핵심 규칙: 생략 부호는 **감추는 페이지가 2개 이상일 때만** 넣는다.
 * 1개만 감춰진다면 `…` 대신 그 번호를 그대로 보여주는 편이 낫다
 * (자리 폭이 같은데 클릭 가능한 정보가 늘어나므로).
 * 그래서 목록 길이는 현재 페이지 위치와 무관하게 항상 일정하다.
 */
export function getPaginationRange({
  page,
  totalPages,
  siblingCount = 1,
  boundaryCount = 1,
}: PaginationRangeOptions): PaginationItem[] {
  const total = Math.floor(totalPages);
  if (!Number.isFinite(total) || total < 1) return [];

  const siblings = Math.max(0, Math.floor(siblingCount));
  const boundaries = Math.max(1, Math.floor(boundaryCount));
  const current = Math.min(Math.max(1, Math.floor(page)), total);

  const startPages = range(1, Math.min(boundaries, total));
  const endPages = range(
    Math.max(total - boundaries + 1, boundaries + 1),
    total,
  );

  // 현재 페이지 주변 블록. 양끝에 붙어도 길이가 유지되도록 위·아래로 민다.
  const siblingsStart = Math.max(
    Math.min(current - siblings, total - boundaries - siblings * 2 - 1),
    boundaries + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(current + siblings, boundaries + siblings * 2 + 2),
    endPages.length > 0 ? endPages[0] - 2 : total - 1,
  );

  return [
    ...startPages,

    // 앞쪽: 2개 이상 감춰지면 …, 딱 1개면 그 번호를 그대로 노출
    ...(siblingsStart > boundaries + 2
      ? (["start-ellipsis"] as PaginationItem[])
      : boundaries + 1 < total - boundaries
        ? [boundaries + 1]
        : []),

    ...range(siblingsStart, siblingsEnd),

    // 뒤쪽: 같은 규칙
    ...(siblingsEnd < total - boundaries - 1
      ? (["end-ellipsis"] as PaginationItem[])
      : total - boundaries > boundaries
        ? [total - boundaries]
        : []),

    ...endPages,
  ];
}
