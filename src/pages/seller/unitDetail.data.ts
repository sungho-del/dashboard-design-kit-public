import type { CalcBlock } from "../babycube/CalcBreakdown";
import { claimBlocksOf, depositAsideOf } from "./claim.data";
import {
  CARE_FEE,
  careOf,
  collectFeeOf,
  couponOf,
  optionsOf,
  pointOf,
  productRef,
  rentPayTotal,
  rentPlanOf,
  salePayTotal,
  salePrice,
  shipFeeOf,
  unitHash,
} from "./orderUnit.data";
import type { OrderUnit } from "./seed/orders.data";
import { UNIT_EXTRA } from "./seed/unitExtra.data";
import {
  NONE,
  won,
  orNone,
  less,
  line,
  perDay,
  more,
  shipLine,
} from "./unitDetail.labels";

export * from "./unitDetail.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./unitDetail.labels`(개발 요청 2026-11-12 46번) */

/* -------------------------------------------------------------------------
 * 상품정보 — 원본 `udProdInfo`(판매)
 * ---------------------------------------------------------------------- */

export const productCodeOf = (u: OrderUnit) =>
  u.code || productRef(u).code || NONE;
export const brandOf = (u: OrderUnit) => productRef(u).brand || NONE;
export const growthStageOf = (u: OrderUnit) => productRef(u).stage || NONE;
/** 구성품 — 원본은 옵션(기간 옵션 제외) 이름을 줄바꿈으로. 없으면 행 자체가 없다 */
export const componentNamesOf = (u: OrderUnit) =>
  optionsOf(u).map((o) => o.name);

/* -------------------------------------------------------------------------
 * 배송정보 — 원본 `udShipInfo`. 도달한 단계까지만 시각, 아니면 「-」
 * ---------------------------------------------------------------------- */

/** 원본 `fee` — 상품 배송비, 무료면 「무료」 */
export const shipFeeText = (u: OrderUnit) => {
  const fee = shipFeeOf(u);
  return fee > 0 ? won(fee) : "무료";
};
/** 추가 연락처 — 원본 시드에 필드가 없어 보강 시드(`seed/unitExtra.data`)에서 읽는다. 없으면 「-」 */
export const extraTelOf = (u: OrderUnit) => orNone(UNIT_EXTRA[u.id]?.extraTel);
/** 수거 요청사항(보드 08) — 손님이 적은 건에만 행이 선다 */
export const pickupRequestOf = (u: OrderUnit) =>
  UNIT_EXTRA[u.id]?.pickupRequest;

/* -------------------------------------------------------------------------
 * 렌트 상세 — 원본 `udProdInfo`·`udShipInfo` 렌트 갈래 · 대여 정보(`rentUseDetail`·`rentInspDetail`)
 * ---------------------------------------------------------------------- */

/** 렌트일 — 기간 옵션이면 그 일수, 아니면 기본 렌트일(원본 문구) */
export const rentDaysTextOf = (u: OrderUnit) => {
  const plan = rentPlanOf(u);
  return plan.opt ? `${plan.days}일 (기간 옵션)` : `${plan.base}일 (기본)`;
};
/** 장기 렌트 할인 — 기간 옵션 등록가가 정가보다 쌀 때만 */
export const longRentTextOf = (u: OrderUnit) => {
  const plan = rentPlanOf(u);
  return plan.opt && plan.disc > 0
    ? `${less(plan.disc)} (${plan.days}일 등록가 ${won(plan.fee)})`
    : null;
};
/** 구성품 — 원본 렌트 상세는 옵션 **하나**를 해시로 골라 일 단가로 보인다 */
export const rentComponentOf = (u: OrderUnit) => {
  const opts = optionsOf(u);
  if (!opts.length) return null;
  const o = opts[unitHash(u) % opts.length];
  return `${o.name} +${won(Number(o.add) || 0)}/일`;
};

/**
 * 렌트 주문 몫 — 원본 `udPriceBox` 렌트 갈래: 렌트 원가(원/일) → 할인 → 렌트가 → 렌트일 → 장기 렌트 할인 →
 * 소계 · 구성품(일가 × 렌트일) · 쿠폰 · 포인트 · 안심케어(보조 글자 없음 — 기획 답 2026-11-06 §2 #6) · 배송비 · 회수 배송비
 */
function rentOrderBlocks(u: OrderUnit): CalcBlock[] {
  const plan = rentPlanOf(u);
  const coupon = couponOf(u);
  const point = pointOf(u);
  return [
    {
      key: "product",
      label: "상품",
      lines: [
        line("base", "렌트 원가", perDay(u.rent ?? 0)),
        line("discount", "상품 할인", `${less(u.rentDisc ?? 0)}/일`),
        line("price", "렌트가", perDay(plan.dr)),
        line("days", "렌트일", `${plan.days}일`, {
          hint: plan.opt ? "기간 옵션" : `기본 ${plan.base}일`,
        }),
        ...(plan.opt && plan.disc > 0
          ? [
              line("longRent", "장기 렌트 할인", less(plan.disc), {
                hint: `${plan.days}일 등록가 적용`,
              }),
            ]
          : []),
        line("subtotal", "소계", won(plan.fee), {
          kind: "subtotal",
          hint: plan.opt ? "기간 옵션 등록가" : "렌트가 × 렌트일",
        }),
      ],
    },
    {
      key: "component",
      label: "구성품",
      lines: optionsOf(u).map((o, i) =>
        line(
          `component-${i}`,
          `${o.name} (${plan.days}일)`,
          more((Number(o.add) || 0) * plan.days),
        ),
      ),
    },
    {
      key: "discount",
      label: "할인",
      lines: [
        ...(coupon ? [line("coupon", "쿠폰 할인", less(coupon))] : []),
        ...(point ? [line("point", "포인트 할인", less(point))] : []),
      ],
    },
    {
      key: "extra",
      label: "추가",
      lines: [
        ...(careOf(u) ? [line("care", "안심케어", more(CARE_FEE))] : []),
        line("ship", "배송비", shipLine(shipFeeOf(u))),
        line("collect", "회수 배송비", shipLine(collectFeeOf(u))),
      ],
    },
  ];
}

export function statementBlocksOf(u: OrderUnit, claim = false): CalcBlock[] {
  if (u.type === "렌트") {
    const order = rentOrderBlocks(u);
    if (claim && u.req) return [...order, ...claimBlocksOf(u)];
    return [
      ...order,
      {
        key: "pay",
        emphasis: true,
        lines: [
          line("pay", "결제금액", won(rentPayTotal(u)), { kind: "total" }),
        ],
      },
      ...depositAsideOf(u),
    ];
  }
  const price = salePrice(u);
  const qty = Number(u.qty) || 1;
  const coupon = couponOf(u);
  const ship = shipFeeOf(u);
  const order: CalcBlock[] = [
    {
      key: "product",
      label: "상품",
      lines: [
        line("base", "판매 원가", won(u.sale ?? 0)),
        line("discount", "상품 할인", less(u.saleDisc ?? 0)),
        line("price", "판매가", won(price)),
        line("qty", "수량", `${qty}개`),
        line("subtotal", "소계", won(price * qty), {
          kind: "subtotal",
          hint: "판매가 × 수량",
        }),
      ],
    },
    {
      key: "component",
      label: "구성품",
      lines: optionsOf(u).map((o, i) =>
        line(`component-${i}`, o.name, more(Number(o.add) || 0)),
      ),
    },
    {
      key: "discount",
      label: "할인",
      lines: coupon ? [line("coupon", "쿠폰 할인", less(coupon))] : [],
    },
    {
      key: "extra",
      label: "추가",
      lines: [line("ship", "배송비", ship > 0 ? more(ship) : "무료")],
    },
  ];
  if (claim && u.req) return [...order, ...claimBlocksOf(u)];
  return [
    ...order,
    {
      key: "pay",
      emphasis: true,
      lines: [line("pay", "결제금액", won(salePayTotal(u)), { kind: "total" })],
    },
  ];
}
