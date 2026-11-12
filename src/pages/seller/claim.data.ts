import type { CalcBlock } from "../babycube/CalcBreakdown";
import { payTotalOf, pointOf, productRef, shipFeeOf } from "./orderUnit.data";
import type { OrderUnit } from "./seed/orders.data";
import {
  claimTypeOf,
  faultOf,
  wonText,
  line,
  MINUS,
  isClaimFinished,
  isRefused,
  message,
  depositAsideOf,
} from "./claim.labels";

export * from "./claim.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./claim.labels`(개발 요청 2026-11-12 46번) */

/** 고객이 지는 클레임 배송비 — 반품만(편도 · 상품 반품배송비, 없으면 3,000). 교환은 1차 미징수(Q-11) */
export const claimFeeOf = (u: OrderUnit) =>
  claimTypeOf(u) === "반품" && faultOf(u.req?.reason) !== "판매자"
    ? Number(productRef(u).returnFee) || 3000
    : 0;

/** D-61 — 단순 변심 **판매** 반품은 출고비를 환불하지 않는다(렌트 반품은 렌트료를 돌려주지 않는다) */
export const unrefundedShipFeeOf = (u: OrderUnit) =>
  u.type === "판매" &&
  claimTypeOf(u) === "반품" &&
  faultOf(u.req?.reason) !== "판매자"
    ? shipFeeOf(u)
    : 0;

/** 환불 예정액 — 결제금액 − (변심 반품) 출고비 − 반품 배송비. 취소는 결제금액 전액 */
export const refundOf = (u: OrderUnit) =>
  Math.max(0, payTotalOf(u) - unrefundedShipFeeOf(u) - claimFeeOf(u));

/** 렌트 보증금 반환액 — 보증금 − (고객 귀책 반품) 반품 배송비. 원본 `udPriceBox` 렌트 갈래 */
export const claimDepositRefundOf = (u: OrderUnit) =>
  Math.max(0, (u.dep ?? 0) - claimFeeOf(u));

export function feeBurdenOf(u: OrderUnit) {
  const type = claimTypeOf(u);
  if (faultOf(u.req?.reason) === "판매자")
    return "판매자 부담 (하자·배송 문제)";
  if (type === "교환") return "판매자 부담";
  if (type === "취소") return "해당 없음 (발송 전 취소)";
  if (u.type === "렌트")
    return `고객 부담 — 반품 배송비(편도) ${wonText(claimFeeOf(u))} · 보증금에서 차감`;
  const ship = unrefundedShipFeeOf(u);
  return `고객 부담 — 반품 배송비(편도) ${wonText(claimFeeOf(u))} · 환불액에서 차감${ship ? " · 출고 배송비 환불 없음" : ""}`;
}
const payLine = (u: OrderUnit) =>
  line("pay", "결제금액", wonText(payTotalOf(u)), { kind: "subtotal" });

/** 렌트 「보증금」 묶음 — 보증금 → (고객 귀책) 반품 배송비 − → 반환 예정액/완료 */
function depositBlock(u: OrderUnit, done: boolean): CalcBlock {
  const fee = claimFeeOf(u);
  return {
    key: "depositRefund",
    label: "보증금",
    emphasis: true,
    lines: [
      line("deposit", "보증금", wonText(u.dep ?? 0), {
        hint: "결제금액에 포함 안 됨",
      }),
      ...(fee
        ? [
            /* 렌트 반품 줄은 기획 답 붙임 1 #16(판매 반품 상세) 밖이라 그대로 둔다 */
            line("returnFee", "반품 배송비", `${MINUS}${wonText(fee)}`, {
              hint: "편도 · 고객 귀책 · 보증금에서 차감",
            }),
          ]
        : []),
      line(
        "depositRefund",
        done ? "보증금 반환 완료" : "보증금 반환 예정액",
        wonText(claimDepositRefundOf(u)),
        { kind: "total" },
      ),
    ],
  };
}

export function claimBlocksOf(u: OrderUnit): CalcBlock[] {
  const type = claimTypeOf(u);
  if (!type) return [];
  const done = isClaimFinished(u);
  const rent = u.type === "렌트";
  if (isRefused(u))
    return [
      { key: "pay", label: "결제", lines: [payLine(u)] },
      {
        key: "result",
        label: "결과",
        emphasis: true,
        lines: [
          message(
            type === "교환"
              ? "교환 불가 — 원거래 유지"
              : "환불 없음 — 원거래 유지",
          ),
        ],
      },
      ...depositAsideOf(u),
    ];
  if (rent && type === "반품")
    return [
      { key: "pay", label: "결제", lines: [payLine(u)] },
      depositBlock(u, done),
    ];
  if (type === "교환")
    return [
      { key: "pay", label: "결제", lines: [payLine(u)] },
      {
        key: "result",
        label: "교환",
        emphasis: true,
        lines: [
          message(
            done ? "환불 없음 — 재배송 완료" : "환불 없음 — 검수 후 재배송",
          ),
        ],
      },
    ];
  const ship = unrefundedShipFeeOf(u);
  const fee = claimFeeOf(u);
  const refund = refundOf(u);
  /*
   * D-312 — 포인트 사용분은 포인트로 돌려준다. 렌트 취소만(판매 결제금액엔 포인트가 없다 · 렌트 반품은
   * 렌트료가 아니라 보증금을 돌려준다). 카드 몫이 0 이면 카드 줄 대신 문장 하나
   */
  const point = rent && type === "취소" ? pointOf(u) : 0;
  return [
    {
      key: "refund",
      label: "환불",
      emphasis: true,
      lines: [
        payLine(u),
        ...(ship
          ? [
              line("shipFee", "출고 배송비", `${MINUS}${wonText(ship)}`, {
                hint: "단순 변심 · 환불 제외",
              }),
            ]
          : []),
        ...(fee
          ? [
              line(
                "returnFee",
                "반품 배송비(편도) 차감",
                `${MINUS}${wonText(fee)}`,
                { hint: "고객 귀책" },
              ),
            ]
          : []),
        ...(point && refund === 0
          ? [
              message(
                `${done ? "환불 완료" : "환불 예정"} — 포인트 ${point.toLocaleString("ko-KR")}P 복구`,
              ),
            ]
          : [
              line(
                "refund",
                done ? "환불 완료" : "환불 예정액",
                wonText(refund),
                {
                  kind: "total",
                  ...(type === "취소" ? { hint: "결제금액 전액" } : {}),
                },
              ),
              ...(point
                ? [
                    line(
                      "pointRestore",
                      "포인트 복구",
                      `${point.toLocaleString("ko-KR")}P`,
                      { kind: "total", hint: "사용한 포인트로 복구" },
                    ),
                  ]
                : []),
            ]),
      ],
    },
    ...(rent ? [depositBlock(u, done)] : []),
  ];
}

/** 클레임 결과 줄만 — 주문정보 「{유형} 정보」의 결과 줄이 읽는다(명세와 같은 값·문구) */
export const claimResultsOf = (u: OrderUnit) =>
  claimBlocksOf(u)
    .flatMap((block) => block.lines)
    .filter((l) => l.kind === "total" || l.kind === "message");
