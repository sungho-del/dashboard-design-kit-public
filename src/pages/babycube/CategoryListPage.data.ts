import { Baby, Car, type LucideIcon } from "lucide-react";
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
 * 4. **편집은 알림만 띄운다**(퍼블 범위 · 사용자 결정 2026-10-19). 추가·하위 추가·
 *    이름변경·삭제·순서·아이콘은 입력·검증까지만 화면에서 하고, 확정하면 원본 문구의
 *    알림만 띄운다 — 표·`CATEGORIES`·상품 데이터는 바뀌지 않는다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유 키)를 갖는다. **두 트리를 한 배열에 담으므로 id 는 도메인을
 *   가로질러 유일해야 한다** (`hasChildren` 이 id 로만 판정한다)
 *   ⚠️ **`date` 는 없다.** 기간 조회가 없는 화면이라 날짜 필드를 만들 이유가 없다
 * - `LEVEL_META` 의 키는 `Category["level"]` 과 정확히 일치한다
 * - 배열은 **표시 순서 그대로**다. 부모 바로 뒤에 그 자손이 연속으로 온다
 * - 등록 상품수는 행이 들고 있지 않다 — 뼈대가 상품 샘플을 `productCountsOf` 에
 *   넘겨 계산한다(상품 목록과 숫자가 어긋나지 않게)
 *
 * ## 원본 어드민에서 가져온 것 / 버린 것
 * 가져온 것은 도메인뿐이다 — 컬럼명(단계·아이콘·카테고리·등록 상품수·관리),
 * 행 액션 5종(▲ ▼ + 하위 · 이름변경 · 삭제), 삭제 가드 문구, 이름 중복 검사,
 * 아이콘 규격 안내 3줄, 처리 결과 문구, 대분류 시드. 색 체계(대분류=파랑 · 중분류=회색 · 소분류=금색)는 쓰지 않는다.
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

/** 하위를 더 만들 수 있는가 — 소분류(3단계)가 마지막이다 */
export const canAddChild = (category: Category) => category.level !== "minor";

/** 행 하나 — 시드가 길어 반복을 줄인다 */
const row = (
  domain: CategoryDomain,
  level: CategoryLevel,
  id: string,
  name: string,
  parentId: string | null = null,
  icon: LucideIcon | null = null,
): Category => ({ id, domain, level, name, parentId, icon });

/**
 * 두 트리를 **표시 순서대로 편 배열**. 부모 바로 아래에 그 자손이 연속으로 온다.
 *
 * 대분류의 이름·순서·개수(렌트 8 · 판매 7)와 아이콘 보유(렌트 카시트·유모차 2개)는
 * 원본 `RENT_CATTREE`·`SALE_CATTREE` 그대로다. ⚠️ **원본은 대분류만 시드한다** —
 * 하위는 들여쓰기·순서·삭제 차단·상품 화면의 3단 선택을 보여 주려고 **일부 대분류에만**
 * 붙인 시연용이다. 상품 샘플(`ProductListPage.data.ts`)의 `category` 가 소분류 id 를
 * 가리키므로 **소분류 id 를 바꾸면 상품 쪽도 함께 바꿔야 한다.**
 * 하위도 상품도 없는 대분류(바운서·스윙 등)가 "삭제할 수 있는" 예시다.
 */
export const CATEGORIES: Category[] = [
  /* ── 렌트 트리 ─────────────────────────────────────────── */
  row("rent", "major", "carseat", "카시트", null, Car),
  row("rent", "middle", "carseat-infant", "신생아 카시트", "carseat"),
  row("rent", "minor", "carseat-infant-basket", "바구니형", "carseat-infant"),
  row("rent", "minor", "carseat-infant-swivel", "회전형", "carseat-infant"),
  row("rent", "middle", "carseat-junior", "주니어 카시트", "carseat"),
  row("rent", "minor", "carseat-junior-booster", "부스터", "carseat-junior"),
  row("rent", "major", "bed", "아기침대"),
  row("rent", "middle", "sleep-bed", "일반 침대", "bed"),
  row("rent", "minor", "sleep-bed-side", "베드사이드", "sleep-bed"),
  row("rent", "major", "stroller", "유모차", null, Baby),
  row("rent", "middle", "stroller-deluxe", "디럭스", "stroller"),
  row("rent", "minor", "stroller-deluxe-4wheel", "4륜", "stroller-deluxe"),
  row("rent", "middle", "stroller-light", "휴대용", "stroller"),
  row("rent", "minor", "stroller-light-cabin", "기내반입", "stroller-light"),
  row("rent", "major", "bouncer", "바운서·스윙"),
  row("rent", "major", "toy", "장난감"),
  row("rent", "middle", "sleep-mat", "놀이매트", "toy"),
  row("rent", "minor", "sleep-mat-roll", "롤매트", "sleep-mat"),
  row("rent", "major", "walker", "보행기·점퍼루"),
  row("rent", "major", "pump", "유축기"),
  row("rent", "major", "appliance", "육아가전"),
  row("rent", "middle", "feeding-sterilizer", "젖병소독기", "appliance"),
  row("rent", "minor", "feeding-sterilizer-uv", "UV", "feeding-sterilizer"),

  /* ── 판매 트리 ─────────────────────────────────────────── */
  row("sale", "major", "sale-outing", "외출·이동"),
  row("sale", "middle", "sale-carseat-junior", "주니어 카시트", "sale-outing"),
  row(
    "sale",
    "minor",
    "sale-carseat-junior-booster",
    "부스터",
    "sale-carseat-junior",
  ),
  row("sale", "middle", "sale-stroller-light", "휴대용 유모차", "sale-outing"),
  row(
    "sale",
    "minor",
    "sale-stroller-light-cabin",
    "기내반입",
    "sale-stroller-light",
  ),
  row("sale", "major", "sale-sleep", "수면·침실"),
  row("sale", "major", "sale-play", "놀이·발달"),
  row("sale", "middle", "sale-sleep-mat", "놀이매트", "sale-play"),
  row("sale", "minor", "sale-sleep-mat-folding", "폴딩매트", "sale-sleep-mat"),
  row("sale", "major", "sale-feeding", "수유가전·소독"),
  row(
    "sale",
    "middle",
    "sale-feeding-sterilizer",
    "젖병소독기",
    "sale-feeding",
  ),
  row(
    "sale",
    "minor",
    "sale-feeding-sterilizer-uv",
    "UV",
    "sale-feeding-sterilizer",
  ),
  row("sale", "major", "sale-diaper", "기저귀·물티슈"),
  row("sale", "major", "sale-formula", "분유·이유식"),
  row("sale", "major", "sale-bath", "목욕·위생"),
];

/** 등록 상품수 표기. 단위가 도메인이라 여기 둔다 */
export const count = (value: number) => value.toLocaleString("ko-KR") + "개";

/**
 * 카테고리별 등록 상품수 — **하위 포함 합계**(사용자 결정 2026-10-19).
 *
 * 원본 `catDirectCount` 는 직접 걸린 수만 세지만, 원본 시드는 대분류만 있어 그것이 곧
 * 합계였다. 우리 상품은 소분류에만 걸리므로 직접 수로 세면 대·중분류가 전부 0이 된다.
 * 상품은 **인자로 받는다** — 상품 데이터가 이 파일을 import 하므로 여기서 상품을
 * import 하면 순환이 된다. 표시와 삭제 판정이 반드시 **이 결과 하나**를 같이 쓴다.
 */
export const productCountsOf = (
  rows: Category[],
  products: readonly { category: string }[],
): Map<string, number> => {
  const counts = new Map<string, number>();
  const total = (category: Category): number => {
    const own = products.filter(
      (product) => product.category === category.id,
    ).length;
    const sum = rows
      .filter((child) => child.parentId === category.id)
      .reduce((acc, child) => acc + total(child), own);
    counts.set(category.id, sum);
    return sum;
  };
  rows.filter((category) => category.parentId === null).forEach(total);
  return counts;
};

/** 하위 카테고리가 하나라도 있으면 삭제할 수 없다 */
export const hasChildren = (rows: Category[], category: Category) =>
  rows.some((item) => item.parentId === category.id);

/**
 * 삭제가 막히는 이유. 원본 `onDelete` 의 두 가드를 순서·문구까지 그대로 옮겼다.
 * 막히면 **확인 창 없이** 이 문장을 알림으로 띄운다(원본 UI-325).
 */
export const deleteBlockReasonOf = (
  rows: Category[],
  category: Category,
  productCount: number,
): string | null => {
  if (hasChildren(rows, category))
    return "하위 카테고리가 있어 삭제할 수 없습니다.";
  if (productCount > 0)
    return `등록 상품 ${productCount}건이 있어 삭제할 수 없습니다.`;
  return null;
};

/**
 * 같은 이름이 **지금 보는 트리 전체**(단계 무관)에 있는가 — 원본 `catExists`.
 * 다른 유형 트리의 같은 이름은 허용한다. 이름변경은 자기 자신을 뺀다.
 */
export const isDuplicateName = (
  rows: Category[],
  domain: CategoryDomain,
  name: string,
  exceptId?: string,
) =>
  rows.some(
    (row) => row.domain === domain && row.name === name && row.id !== exceptId,
  );

/* ▲▼ 잠금 판정 — 같은 부모를 가진 형제 안에서 첫째·막내인가 (원본 `isFirst`·`isLast`) */
const siblingsOf = (rows: Category[], category: Category) =>
  rows.filter(
    (row) =>
      row.domain === category.domain && row.parentId === category.parentId,
  );

export const isFirstSibling = (rows: Category[], category: Category) =>
  siblingsOf(rows, category)[0] === category;

export const isLastSibling = (rows: Category[], category: Category) => {
  const siblings = siblingsOf(rows, category);
  return siblings[siblings.length - 1] === category;
};

/* =========================================================================
 * 문구 — 전부 원본 어드민에서 그대로 옮긴 것이다
 * ====================================================================== */

/** 삭제 확인 모달 본문 두 줄 */
export const DELETE_NOTICE =
  "하위 카테고리와 등록 상품이 없는 빈 카테고리만 삭제됩니다.";
export const DELETE_WARNING = "삭제 후에는 되돌릴 수 없습니다.";

/** 이름 입력 검증 — 중복 문구는 원본 토스트 문구를 칸 아래 오류로 옮긴 것이다 */
export const NAME_ERROR = "카테고리명을 입력해 주세요.";
export const DUPLICATE_ERROR = "이미 존재하는 카테고리명입니다.";

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
export const addedRootMessage = (name: string) =>
  `'${name}' 대분류가 추가되었습니다.`;
export const addedChildMessage = (parent: string, name: string) =>
  `'${parent}' 하위에 '${name}' 추가되었습니다.`;
export const renamedMessage = (before: string, after: string) =>
  `'${before}' → '${after}'(으)로 변경되었습니다.`;
export const deletedMessage = (name: string) =>
  `'${name}' 카테고리가 삭제되었습니다.`;
/** ⚠️ 원본에는 없다 — 원본은 실제로 옮기기만 하고 알리지 않는다. 퍼블은 옮기지 않으므로 알림으로 대신한다 */
export const MOVED_MESSAGE = "카테고리 순서가 변경되었습니다.";
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
