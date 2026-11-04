import { PAYORDERS, UNITS } from "./orders.data";
import { PRODUCTS } from "./products.data";
import {
  SELLER_ASKS,
  SELLER_NOTICES,
  SL_INQUIRIES,
  SL_REVIEWS,
} from "./board.data";
import { COUPONS, HQ_OPS_CAL, SL_OPS_CAL, STORE } from "./store.data";

/**
 * 원본 시드 — **덤프가 원본과 같은가**의 최소 점검.
 * 수치는 원본(기획 v0.4)을 브라우저로 열어 센 값이다. 덤프를 다시 뽑았는데 여기가 깨지면
 * 원본이 바뀐 것이다 — 화면 숫자(배지·대시보드·정산)도 같이 바뀌었는지 본다.
 */
describe("셀러 원본 시드", () => {
  it("건수가 원본과 같다", () => {
    expect(PRODUCTS).toHaveLength(60);
    expect(PAYORDERS).toHaveLength(182);
    expect(UNITS).toHaveLength(183);
    expect(COUPONS).toHaveLength(5);
    expect(SELLER_NOTICES).toHaveLength(4);
    expect(SL_INQUIRIES).toHaveLength(6);
    expect(SL_REVIEWS).toHaveLength(3);
    expect(SELLER_ASKS).toHaveLength(2);
    expect(HQ_OPS_CAL).toHaveLength(8);
    expect(SL_OPS_CAL).toHaveLength(2);
  });

  it("스토어는 리틀베이비 — 처리단위·상품의 판매자는 이 스토어와 본사 둘뿐이다", () => {
    expect(STORE.name).toBe("리틀베이비");
    expect(new Set(UNITS.map((u) => u.seller))).toEqual(
      new Set(["리틀베이비", "본사"]),
    );
    expect(new Set(PRODUCTS.map((p) => p.seller))).toEqual(
      new Set(["리틀베이비", "본사"]),
    );
  });

  it("처리단위 id·상품 id 가 겹치지 않는다 — 상세 경로의 키다", () => {
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(UNITS.length);
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
  });

  it("처리단위는 판매 89 · 렌트 94", () => {
    expect(UNITS.filter((u) => u.type === "판매")).toHaveLength(89);
    expect(UNITS.filter((u) => u.type === "렌트")).toHaveLength(94);
  });
});
