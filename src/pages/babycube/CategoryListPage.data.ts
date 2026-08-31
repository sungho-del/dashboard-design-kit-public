import { Baby, Car, Milk, Moon, type LucideIcon } from "lucide-react";
import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * 카테고리 관리 (S06) — 목록형 화면의 **도메인 층**
 *
 * 짝이 되는 뼈대: `CategoryListPage.tsx`
 *
 * ## 이 화면이 다른 목록과 다른 점
 * 1. **행이 트리다.** 대·중·소 3단계가 한 표에 표시 순서대로 늘어서고, 중·소분류는
 *    들여쓰기로 부모에 매달린다. 그래서 **페이지네이션을 두지 않는다** —
 *    페이지를 나누면 부모와 자식이 갈라져 트리가 끊긴다(원본에도 없다).
 * 2. **트리가 렌트용·판매용 둘이다.** 원본이 `categoryApi.tree("렌트" | "판매")` 로
 *    아예 다른 트리를 받아 오고, 화면 맨 위 칩으로 그 둘을 오간다. 상품 관리 화면이
 *    "유형에서 렌트 또는 판매 먼저 선택"이라고 막는 것도 같은 이유다.
 * 3. **조회 필터가 없다.** 기간·상태·검색 어느 것도 원본에 없다 — 트리를 통째로
 *    보고 고치는 화면이지 찾는 화면이 아니다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유 키)를 갖는다. **두 트리를 한 배열에 담으므로 id 는 도메인을
 *   가로질러 유일해야 한다** (`hasChildren` 이 id 로만 판정한다)
 *   ⚠️ **`date` 는 없다.** 기간 조회가 없는 화면이라 날짜 필드를 만들 이유가 없다
 * - `LEVEL_META` 의 키는 `Category["level"]` 과 정확히 일치한다
 * - 배열은 **표시 순서 그대로**다. 부모 바로 뒤에 그 자손이 연속으로 온다 —
 *   순서 이동(`moveCategory`)이 이 연속성을 전제로 블록을 통째로 옮긴다
 * - 부모의 `productCount` 는 **자식 합계와 일치해야 한다**
 *
 * ## 원본 어드민에서 가져온 것 / 버린 것
 * 가져온 것은 도메인뿐이다 — 컬럼명(단계·아이콘·카테고리·등록 상품수·관리),
 * 행 액션 5종(▲ ▼ + 하위 · 이름변경 · 삭제), 삭제 가드 문구, 아이콘 규격 안내 3줄,
 * 처리 결과 문구. 색 체계(대분류=파랑 · 중분류=회색 · 소분류=금색)는 쓰지 않는다.
 *
 * ⚠️ **원본에 없어서 걷어낸 것 — 되살리지 말 것:** 단계 세그먼트 필터 ·
 * 카테고리명 검색 · 초기화 버튼 · PageHeader 도움말 툴팁 · "정사각형 이미지를
 * 권장합니다" 류의 아이콘 안내 문구. 특히 **단계 필터는 트리를 깨뜨린다** —
 * 소분류만 남기면 부모 없는 자식이 나열되어 계층이 뜻을 잃는다.
 * ---------------------------------------------------------------------- */

/** 카테고리 트리는 렌트용·판매용이 따로다 (원본 `categoryApi.tree(도메인)`) */
export type CategoryDomain = "rent" | "sale";

/** 카테고리 3단계 */
export type CategoryLevel = "major" | "middle" | "minor";

export interface Category {
  /** 카테고리 코드 — 뼈대가 행 key 로 쓴다. **두 도메인을 통틀어 유일** */
  id: string;
  domain: CategoryDomain;
  level: CategoryLevel;
  name: string;
  /** 상위 카테고리 코드. 대분류는 `null` */
  parentId: string | null;
  /**
   * 이 카테고리에 등록된 상품 수.
   * 상위 카테고리는 하위 합계를 들고 있어야 한다 — 표에서 나란히 보이므로
   * 어긋나면 화면이 스스로 모순된다.
   */
  productCount: number;
  /**
   * 카테고리 아이콘.
   *
   * ⚠️ 실서비스는 **업로드 이미지**지만 이 디자인 시스템에는 `Thumbnail` 이 없다
   * (컴포넌트 33종에 포함되지 않는다). 여기서는 lucide 아이콘 참조로 대신하고,
   * 아이콘이 없는 상태(`null`)를 함께 다뤄 등록/교체/삭제 흐름을 그대로 살렸다.
   */
  icon: LucideIcon | null;
}

/** 화면 맨 위 도메인 전환 (원본 `data-area="categories.tabs"` 의 칩 2개) */
export const DOMAIN_TABS: { value: CategoryDomain; label: string }[] = [
  { value: "rent", label: "렌트" },
  { value: "sale", label: "판매" },
];

/** 원본 기본값도 `useState("렌트")` 다 */
export const DEFAULT_DOMAIN: CategoryDomain = "rent";

/** 도메인 라벨 — 버튼 문구가 "+ 렌트 대분류 추가" 처럼 도메인을 품는다 */
export const domainLabel = (domain: CategoryDomain) =>
  DOMAIN_TABS.find((tab) => tab.value === domain)?.label ?? "";

/**
 * 단계 → 라벨·tone.
 *
 * ⚠️ 원본은 단계마다 색을 갈랐지만(파랑/회색/금색) 우리는 **셋 다 중립색**이다.
 * `success`·`warning`·`critical` 은 상태를 뜻하는 색이라(§3-1 "분류 배지") 계층에
 * 쓰면 "대분류는 좋은 상태"처럼 읽힌다. 계층은 **들여쓰기와 글자**가 이미 전달한다.
 */
export const LEVEL_META: Record<
  CategoryLevel,
  { label: string; tone: TagTone }
> = {
  major: { label: "대분류", tone: "default" },
  middle: { label: "중분류", tone: "default" },
  minor: { label: "소분류", tone: "default" },
};

/** 계층 깊이 — 순서 이동이 "자기 자신 + 자손" 구간을 재는 데 쓴다 */
export const LEVEL_DEPTH: Record<CategoryLevel, number> = {
  major: 1,
  middle: 2,
  minor: 3,
};

/** 하위를 더 만들 수 있는가 — 소분류(3단계)가 마지막이다 */
export const canAddChild = (category: Category) => category.level !== "minor";

/** 다음 단계. 소분류에는 하위가 없다 */
export const childLevelOf = (category: Category): CategoryLevel | null =>
  category.level === "major"
    ? "middle"
    : category.level === "middle"
      ? "minor"
      : null;

/**
 * 두 트리를 **표시 순서대로 편 배열**. 부모 바로 아래에 그 자손이 연속으로 온다.
 *
 * 상품 수 정합 —
 *   [렌트] 카시트 128 = 신생아 74(31+43) + 주니어 54(54)
 *          유모차 96 = 디럭스 52(52) + 휴대용 44(44)
 *          수면·안전 33 = 아기침대 33(33) + 놀이매트 0(0)
 *          수유·이유 0 = 젖병소독기 0(0)
 *   [판매] 카시트 42 · 유모차 18 · 수면·안전 26 · 수유·이유 37 (각 1:1:1 체인)
 */
export const CATEGORIES: Category[] = [
  /* ── 렌트 트리 ─────────────────────────────────────────── */
  {
    id: "carseat",
    domain: "rent",
    level: "major",
    name: "카시트",
    parentId: null,
    productCount: 128,
    icon: Car,
  },
  {
    id: "carseat-infant",
    domain: "rent",
    level: "middle",
    name: "신생아 카시트",
    parentId: "carseat",
    productCount: 74,
    icon: null,
  },
  {
    id: "carseat-infant-basket",
    domain: "rent",
    level: "minor",
    name: "바구니형",
    parentId: "carseat-infant",
    productCount: 31,
    icon: null,
  },
  {
    id: "carseat-infant-swivel",
    domain: "rent",
    level: "minor",
    name: "회전형",
    parentId: "carseat-infant",
    productCount: 43,
    icon: null,
  },
  {
    id: "carseat-junior",
    domain: "rent",
    level: "middle",
    name: "주니어 카시트",
    parentId: "carseat",
    productCount: 54,
    icon: null,
  },
  {
    id: "carseat-junior-booster",
    domain: "rent",
    level: "minor",
    name: "부스터",
    parentId: "carseat-junior",
    productCount: 54,
    icon: null,
  },
  {
    id: "stroller",
    domain: "rent",
    level: "major",
    name: "유모차",
    parentId: null,
    productCount: 96,
    icon: Baby,
  },
  {
    id: "stroller-deluxe",
    domain: "rent",
    level: "middle",
    name: "디럭스",
    parentId: "stroller",
    productCount: 52,
    icon: null,
  },
  {
    id: "stroller-deluxe-4wheel",
    domain: "rent",
    level: "minor",
    name: "4륜",
    parentId: "stroller-deluxe",
    productCount: 52,
    icon: null,
  },
  {
    id: "stroller-light",
    domain: "rent",
    level: "middle",
    name: "휴대용",
    parentId: "stroller",
    productCount: 44,
    icon: null,
  },
  {
    id: "stroller-light-cabin",
    domain: "rent",
    level: "minor",
    name: "기내반입",
    parentId: "stroller-light",
    productCount: 44,
    icon: null,
  },
  {
    id: "sleep",
    domain: "rent",
    level: "major",
    name: "수면·안전",
    parentId: null,
    productCount: 33,
    icon: Moon,
  },
  {
    id: "sleep-bed",
    domain: "rent",
    level: "middle",
    name: "아기침대",
    parentId: "sleep",
    productCount: 33,
    icon: null,
  },
  {
    id: "sleep-bed-side",
    domain: "rent",
    level: "minor",
    name: "베드사이드",
    parentId: "sleep-bed",
    productCount: 33,
    icon: null,
  },
  {
    id: "sleep-mat",
    domain: "rent",
    level: "middle",
    name: "놀이매트",
    parentId: "sleep",
    productCount: 0,
    icon: null,
  },
  {
    /** 상품도 하위도 없어 **삭제되는** 카테고리 */
    id: "sleep-mat-roll",
    domain: "rent",
    level: "minor",
    name: "롤매트",
    parentId: "sleep-mat",
    productCount: 0,
    icon: null,
  },
  {
    /** 상품은 0이지만 하위가 있어 삭제되지 않는다 */
    id: "feeding",
    domain: "rent",
    level: "major",
    name: "수유·이유",
    parentId: null,
    productCount: 0,
    icon: null,
  },
  {
    id: "feeding-sterilizer",
    domain: "rent",
    level: "middle",
    name: "젖병소독기",
    parentId: "feeding",
    productCount: 0,
    icon: null,
  },
  {
    id: "feeding-sterilizer-uv",
    domain: "rent",
    level: "minor",
    name: "UV",
    parentId: "feeding-sterilizer",
    productCount: 0,
    icon: null,
  },

  /* ── 판매 트리 ─────────────────────────────────────────── */
  {
    id: "sale-carseat",
    domain: "sale",
    level: "major",
    name: "카시트",
    parentId: null,
    productCount: 42,
    icon: Car,
  },
  {
    id: "sale-carseat-junior",
    domain: "sale",
    level: "middle",
    name: "주니어 카시트",
    parentId: "sale-carseat",
    productCount: 42,
    icon: null,
  },
  {
    id: "sale-carseat-junior-booster",
    domain: "sale",
    level: "minor",
    name: "부스터",
    parentId: "sale-carseat-junior",
    productCount: 42,
    icon: null,
  },
  {
    id: "sale-stroller",
    domain: "sale",
    level: "major",
    name: "유모차",
    parentId: null,
    productCount: 18,
    icon: Baby,
  },
  {
    id: "sale-stroller-light",
    domain: "sale",
    level: "middle",
    name: "휴대용",
    parentId: "sale-stroller",
    productCount: 18,
    icon: null,
  },
  {
    id: "sale-stroller-light-cabin",
    domain: "sale",
    level: "minor",
    name: "기내반입",
    parentId: "sale-stroller-light",
    productCount: 18,
    icon: null,
  },
  {
    id: "sale-sleep",
    domain: "sale",
    level: "major",
    name: "수면·안전",
    parentId: null,
    productCount: 26,
    icon: Moon,
  },
  {
    id: "sale-sleep-mat",
    domain: "sale",
    level: "middle",
    name: "놀이매트",
    parentId: "sale-sleep",
    productCount: 26,
    icon: null,
  },
  {
    id: "sale-sleep-mat-folding",
    domain: "sale",
    level: "minor",
    name: "폴딩매트",
    parentId: "sale-sleep-mat",
    productCount: 26,
    icon: null,
  },
  {
    id: "sale-feeding",
    domain: "sale",
    level: "major",
    name: "수유·이유",
    parentId: null,
    productCount: 37,
    icon: Milk,
  },
  {
    id: "sale-feeding-sterilizer",
    domain: "sale",
    level: "middle",
    name: "젖병소독기",
    parentId: "sale-feeding",
    productCount: 37,
    icon: null,
  },
  {
    id: "sale-feeding-sterilizer-uv",
    domain: "sale",
    level: "minor",
    name: "UV",
    parentId: "sale-feeding-sterilizer",
    productCount: 37,
    icon: null,
  },
];

/** 등록 상품수 표기. 단위가 도메인이라 여기 둔다 */
export const count = (value: number) => value.toLocaleString("ko-KR") + "개";

/** 하위 카테고리가 하나라도 있으면 삭제할 수 없다 */
export const hasChildren = (rows: Category[], category: Category) =>
  rows.some((item) => item.parentId === category.id);

/**
 * 삭제 가능 여부와 **그 이유**. 원본 `onDelete` 의 두 가드를 문구까지 그대로 옮겼다.
 *
 * 막힌 이유를 문장으로 돌려주는 것이 이 함수의 존재 이유다 —
 * 버튼만 잠그면 운영자는 무엇을 치워야 지울 수 있는지 알 수 없다.
 */
export const deleteBlockReasonOf = (
  rows: Category[],
  category: Category,
): string | null => {
  if (hasChildren(rows, category))
    return "하위 카테고리가 있어 삭제할 수 없습니다.";
  if (category.productCount > 0)
    return `등록 상품 ${category.productCount}건이 있어 삭제할 수 없습니다.`;
  return null;
};

/* =========================================================================
 * 표시 순서 다루기
 *
 * 배열이 **표시 순서 그대로**라, 어떤 행의 자손은 그 뒤에 **연속으로** 온다.
 * 그 연속 구간을 "블록"이라 부르고, 순서 이동은 형제 블록끼리 통째로 맞바꾼다 —
 * 부모만 옮기고 자식을 두고 오면 트리가 끊긴다.
 * ====================================================================== */

/**
 * `index` 행의 블록 길이 = 자기 자신 + 뒤따르는 모든 자손.
 *
 * ⚠️ **도메인 경계에서 반드시 멈춘다.** 두 트리를 한 배열에 담고 있어서, 깊이만 보면
 * 렌트 마지막 대분류의 블록이 판매 트리를 삼킬 수 있다.
 */
const blockLengthAt = (rows: Category[], index: number) => {
  const { level, domain } = rows[index];
  const depth = LEVEL_DEPTH[level];
  let end = index + 1;
  while (
    end < rows.length &&
    rows[end].domain === domain &&
    LEVEL_DEPTH[rows[end].level] > depth
  )
    end += 1;
  return end - index;
};

/** 같은 부모를 가진 형제들의 인덱스 (표시 순서) */
const siblingIndexes = (rows: Category[], category: Category) =>
  rows.reduce<number[]>((acc, row, index) => {
    if (row.domain === category.domain && row.parentId === category.parentId)
      acc.push(index);
    return acc;
  }, []);

/** 형제 중 첫째인가 — ▲ 버튼을 잠그는 판정 (원본 `isFirst`) */
export const isFirstSibling = (rows: Category[], category: Category) =>
  siblingIndexes(rows, category)[0] === rows.indexOf(category);

/** 형제 중 막내인가 — ▼ 버튼을 잠그는 판정 (원본 `isLast`) */
export const isLastSibling = (rows: Category[], category: Category) => {
  const siblings = siblingIndexes(rows, category);
  return siblings[siblings.length - 1] === rows.indexOf(category);
};

/**
 * 형제 블록과 자리를 맞바꾼 새 배열. `delta` 는 `-1`(위) 또는 `1`(아래).
 * 옮길 수 없으면 **같은 배열을 그대로** 돌려준다.
 */
export const moveCategory = (
  rows: Category[],
  id: string,
  delta: -1 | 1,
): Category[] => {
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return rows;

  const category = rows[index];
  const siblings = siblingIndexes(rows, category);
  const at = siblings.indexOf(index);
  const partner = siblings[at + delta];
  if (partner === undefined) return rows;

  const length = blockLengthAt(rows, index);
  const partnerLength = blockLengthAt(rows, partner);
  const block = rows.slice(index, index + length);
  const partnerBlock = rows.slice(partner, partner + partnerLength);

  return delta < 0
    ? [
        ...rows.slice(0, partner),
        ...block,
        ...partnerBlock,
        ...rows.slice(index + length),
      ]
    : [
        ...rows.slice(0, index),
        ...partnerBlock,
        ...block,
        ...rows.slice(partner + partnerLength),
      ];
};

/** 이름만 바꾼 새 배열 */
export const renameCategory = (rows: Category[], id: string, name: string) =>
  rows.map((row) => (row.id === id ? { ...row, name } : row));

/** 그 행 하나만 뺀 새 배열. 삭제는 **빈 카테고리만** 되므로 블록 길이는 언제나 1 */
export const removeCategory = (rows: Category[], id: string) =>
  rows.filter((row) => row.id !== id);

/** 도메인 마지막에 대분류를 붙인 새 배열 */
export const addRootCategory = (
  rows: Category[],
  domain: CategoryDomain,
  id: string,
  name: string,
): Category[] => {
  const lastIndex = rows.reduce(
    (found, row, index) => (row.domain === domain ? index : found),
    -1,
  );
  const created: Category = {
    id,
    domain,
    level: "major",
    name,
    parentId: null,
    productCount: 0,
    icon: null,
  };
  return [
    ...rows.slice(0, lastIndex + 1),
    created,
    ...rows.slice(lastIndex + 1),
  ];
};

/** 부모 블록의 **끝**에 자식을 넣은 새 배열 (막내로 붙는다) */
export const addChildCategory = (
  rows: Category[],
  parent: Category,
  id: string,
  name: string,
): Category[] => {
  const level = childLevelOf(parent);
  if (!level) return rows;

  const index = rows.indexOf(parent);
  const at = index + blockLengthAt(rows, index);
  const created: Category = {
    id,
    domain: parent.domain,
    level,
    name,
    parentId: parent.id,
    productCount: 0,
    icon: null,
  };
  return [...rows.slice(0, at), created, ...rows.slice(at)];
};

/** 아이콘만 바꾼 새 배열. `null` 이면 삭제 */
export const setCategoryIcon = (
  rows: Category[],
  id: string,
  icon: LucideIcon | null,
) => rows.map((row) => (row.id === id ? { ...row, icon } : row));

/* =========================================================================
 * 문구 — 전부 원본 어드민에서 그대로 옮긴 것이다
 * ====================================================================== */

/** 삭제 확인 모달 본문 두 줄 */
export const DELETE_NOTICE =
  "하위 카테고리와 등록 상품이 없는 빈 카테고리만 삭제됩니다.";
export const DELETE_WARNING = "삭제 후에는 되돌릴 수 없습니다.";

/** 이름 입력 검증 */
export const NAME_ERROR = "카테고리명을 입력해 주세요.";

/**
 * 아이콘 규격 안내 3줄 (원본 `pimg-help`).
 * ⚠️ 한때 "앱 홈의 카테고리 레일에 노출됩니다 · 정사각형 권장" 이라고 적혀 있었는데
 * **원본에 없는 문장**이었다. 원본이 여기서 말하는 것은 규격 셋뿐이다.
 */
export const ICON_GUIDE = [
  "이미지 크기 : 최대 1000 X 1000px, 최소 300 X 300px 이상",
  "이미지 형식 : jpg,png 형식의 이미지만 등록 가능합니다.",
  "이미지 용량 : 1MB 이하 (최대 5MB)",
];

/** 처리 결과 문구 — 원본은 무엇이 무엇으로 바뀌었는지를 **이름째** 알린다 */
export const addedRootMessage = (domain: CategoryDomain, name: string) =>
  `'${name}' ${domainLabel(domain)} 대분류가 추가되었습니다.`;
export const addedChildMessage = (parent: string, name: string) =>
  `'${parent}' 하위에 '${name}' 추가되었습니다.`;
export const renamedMessage = (before: string, after: string) =>
  `'${before}' → '${after}'(으)로 변경되었습니다.`;
export const deletedMessage = (name: string) =>
  `'${name}' 카테고리가 삭제되었습니다.`;
export const ICON_SAVED = "카테고리 아이콘을 등록했습니다.";
export const ICON_REMOVED = "카테고리 아이콘을 삭제했습니다.";

/**
 * 빈 상태.
 * 필터가 없는 화면이라 "조건을 바꿔 보라"고 할 수 없다 — 비어 있다면 정말로
 * 그 도메인에 카테고리가 하나도 없는 것이고, 할 일은 1단계부터 만드는 것뿐이다.
 */
export const EMPTY_TITLE = "등록된 카테고리가 없습니다";
export const EMPTY_DESCRIPTION =
  "대분류(1단계)부터 만든 뒤 하위 카테고리를 붙여 주세요.";
