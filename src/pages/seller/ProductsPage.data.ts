import { PRODUCTS } from "./seed/products.data";
import { RENT_CATTREE, SALE_CATTREE } from "./seed/store.data";
import { CATEGORY_HINT } from "./ProductsPage.labels";

export * from "./ProductsPage.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./ProductsPage.labels`(개발 요청 2026-11-12 46번) */

/** 내 상품 — 본사 등록분 제외(원본 `(p.src||'셀러')!=='본사'`) */
export const MY_PRODUCTS = PRODUCTS.filter((p) => (p.src || "셀러") !== "본사");
export const categoryOptionsOf = (type: string) => [
  { value: "", label: type === "all" ? CATEGORY_HINT : "카테고리 전체" },
  ...(type === "렌트" ? RENT_CATTREE : type === "판매" ? SALE_CATTREE : []).map(
    (c) => ({ value: c.name, label: c.name }),
  ),
];
