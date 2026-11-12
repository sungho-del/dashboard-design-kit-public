import { PRODUCTS } from "./seed/products.data";
import type { SellerProduct } from "./seed/products.data";
import { RENT_CATTREE, SALE_CATTREE } from "./seed/store.data";
import { STAGE_OPTIONS } from "./ProductFormPage.data";
import {
  CATEGORY_ALL_LABEL,
  CATEGORY_HINT,
  categorySelectOptions,
  stageSelectOptions,
  type CategoryNode,
} from "./ProductsPage.labels";

export * from "./ProductsPage.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./ProductsPage.labels`(개발 요청 2026-11-12 46번) */

/** 내 상품 — 본사 등록분 제외(원본 `(p.src||'셀러')!=='본사'`) */
export const MY_PRODUCTS = PRODUCTS.filter((p) => (p.src || "셀러") !== "본사");

/**
 * 예시 하위 분류 — 셀러 시드 카테고리는 대분류뿐이라 3단 셀렉트(개발 요청 4번)가 보이도록 대분류 셋에만
 * 본사 카테고리 관리(`babycube/CategoryListPage.data`)의 같은 이름 아래 중·소분류를 붙였다. 실제 값은 서버 카테고리 원장
 */
const SAMPLE_SUB: Record<string, CategoryNode[]> = {
  카시트: [
    {
      name: "신생아 카시트",
      children: [
        { name: "바구니형", children: [] },
        { name: "회전형", children: [] },
      ],
    },
    {
      name: "주니어 카시트",
      children: [{ name: "부스터", children: [] }],
    },
  ],
  유모차: [
    { name: "디럭스", children: [{ name: "4륜", children: [] }] },
    { name: "휴대용", children: [{ name: "기내반입", children: [] }] },
  ],
  "외출·이동": [
    {
      name: "주니어 카시트",
      children: [{ name: "부스터", children: [] }],
    },
    {
      name: "휴대용 유모차",
      children: [{ name: "기내반입", children: [] }],
    },
  ],
};
/** 예시 상품의 중·소분류 — 3단으로 걸러지는 것이 보이도록 셋만 */
const SAMPLE_PATH: Record<string, [string, string]> = {
  "P-002": ["디럭스", "4륜"],
  "P-200": ["신생아 카시트", "회전형"],
  "P-009": ["주니어 카시트", "부스터"],
};
/** 상품의 [대, 중, 소] 카테고리 이름 */
export const catPathOf = (p: SellerProduct): string[] => [
  p.cat,
  ...(SAMPLE_PATH[p.id] ?? []),
];

const treeOf = (type: string): CategoryNode[] =>
  (type === "렌트" ? RENT_CATTREE : type === "판매" ? SALE_CATTREE : []).map(
    (c) => ({ name: c.name, children: SAMPLE_SUB[c.name] ?? [] }),
  );

/** 카테고리 3단 — 고른 칸의 하위 분류. 비어 있으면 그 셀렉트를 그리지 않는다 */
export function categoryLevelsOf(type: string, cat: string, cat2: string) {
  const large = treeOf(type);
  const middle = large.find((n) => n.name === cat)?.children ?? [];
  const small = middle.find((n) => n.name === cat2)?.children ?? [];
  return {
    large: categorySelectOptions(
      large,
      type === "all" ? CATEGORY_HINT : CATEGORY_ALL_LABEL.large,
    ),
    middle: middle.length
      ? categorySelectOptions(middle, CATEGORY_ALL_LABEL.middle)
      : null,
    small: small.length
      ? categorySelectOptions(small, CATEGORY_ALL_LABEL.small)
      : null,
  };
}

/** 성장단계 선택지 — 상품 폼과 같은 단계(원본 `PF_STAGES`) · 앞뒤에 전체 · 없음 */
export const STAGE_FILTER_OPTIONS = stageSelectOptions(STAGE_OPTIONS);

/**
 * 정률 할인 예시 — 예전에 「%」로 저장된 상품(개발 요청 6번). 시드에는 할인 방식이 없어 한 건에만 10% 를 둔다.
 * 이 상품은 목록에서 할인 칸이 잠긴다
 */
const RATE_DISCOUNT: Record<string, number> = { "P-002": 10 };
export const rateDiscountOf = (p: SellerProduct): number | undefined =>
  RATE_DISCOUNT[p.id];

/**
 * 저장 충돌 예시 — 다른 작업이 먼저 고친 상품(개발 요청 5번 · 서버 409 자리).
 * 이 상품을 골라 [수정 저장]하면 저장 결과 줄이 충돌 안내가 되고 [서버값 다시 불러오기]가 나온다
 */
export const CONFLICT_SAMPLE_ID = "P-003";
