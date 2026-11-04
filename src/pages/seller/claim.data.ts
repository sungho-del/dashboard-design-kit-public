import type { CalcBlock, CalcLine } from "../babycube/CalcBreakdown";
import {
  historyOf,
  payTotalOf,
  pointOf,
  productRef,
  shipFeeOf,
  unitTime,
} from "./orderUnit.data";
import type { OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 클레임(취소·반품·교환) 도메인 — 판매 클레임 3화면 + 상세가 같이 쓴다(렌트 클레임도 이 식을 쓴다).
 *
 * ## 원본 (기획 v0.4 `apps/admin-seller/index.html`)
 * | 여기                 | 원본                      | 줄   |
 * | -------------------- | ------------------------- | ---- |
 * | `CLAIM_FLOW`·`CLAIM_EXCEPTIONS` | `RMA_MAIN`·`RMA_EXC` | 1663 |
 * | `CLAIM_BUCKETS`      | `RMA_BUCKET`(접수·진행·완료) | 1679 |
 * | `CLAIM_DONE`         | `RMA_DONE`                | 1684 |
 * | `faultOf`            | `faultOf`(P-008)          | 1657 |
 * | `claimFeeOf`         | `udOrderInfo` `rmaFee`    | 4738 |
 * | 주문정보 클레임 6줄  | `udOrderInfo(u, rmaType)` | 4732 |
 * | `claimHistoryOf`     | `udHistory(u, rmaType)`   | 4908 |
 * | 명세 클레임 몫       | `udPriceBox(u, rmaType)`  | 4836 |
 *
 * ## 원본과 다르게 둔 곳
 * - **D-61 (판정 회신 3차)** — 단순 변심 반품은 **출고비를 환불하지 않는다**(반품 배송비는 지금처럼 환불액에서 차감).
 *   셀러 책임 반품은 출고비까지 환불(원본 계산과 같다). 원본 v0.4 는 변심 반품에도 출고비를 돌려줬다.
 *   ponytail: 묶음 배송 「그 셀러의 마지막 상품일 때만 출고비 환불」은 처리단위마다 따로 센다 — 시드의 결제 1건은 처리단위 1개다
 * - 명세 결과 묶음은 본사 주문 상세와 같은 꼴(결제금액 → 차감 → 환불 예정액 · 종결이면 「환불 완료」 ·
 *   반려·거부·재반송은 「환불 없음 — 원거래 유지」). 원본은 반려 건에도 환불 예정액을 냈다
 * - 처리 이력: 원본은 거부·교환으로 변경 건도 「{유형} 반려」 줄을 냈다 → 실제 상태 줄로
 * - 렌트는 본사 주문 상세와 같다 — 취소 = 「환불」(결제금액 전액) + 「보증금」(반환) 두 묶음(무료 취소만 ·
 *   사용자 결정 2026-11-02. 원본은 보증금 반환만 있어 렌트료 환불이 빠졌다) · 반품 = 「결제」 + 「보증금」
 *   (보증금 → 고객 귀책 반품 배송비 − → 반환 예정액 · 원본처럼 보증금만 돌려준다)
 * - **D-312·Q-64 (판정 회신 10차)** — 포인트를 쓴 취소는 환불 묶음에 「포인트 복구 nP」 줄. 카드 몫이 0 이면
 *   카드 환불 줄을 뺀다. 판매는 결제금액 식에 포인트가 없어(원본) 렌트 취소에만 걸린다
 * ====================================================================== */

export type ClaimType = "취소" | "반품" | "교환";

/** 정상 흐름 — 원본 `RMA_MAIN` */
export const CLAIM_FLOW: Record<ClaimType, readonly string[]> = {
  취소: ["취소 요청", "환불 처리중", "취소 완료"],
  반품: [
    "반품 신청",
    "반품 승인",
    "반품 지연",
    "반품 수거중",
    "반품 수거완료",
    "반품 검수",
    "환불 처리중",
    "반품 완료",
  ],
  교환: [
    "교환 신청",
    "교환 승인",
    "교환 지연",
    "교환 수거중",
    "교환 수거완료",
    "교환 검수",
    "교환 재배송",
    "교환 완료",
  ],
};
/** 예외 종결 — 반려·거부 = 클레임 불성립(거래 유지) · 재반송 = 그 뒤 고객에게 되돌려 보낸 종결 · 원본 `RMA_EXC` */
export const CLAIM_EXCEPTIONS: Record<ClaimType, readonly string[]> = {
  취소: [],
  반품: ["반품 반려", "반품 거부", "재반송", "교환으로 변경"],
  교환: ["교환 반려", "교환 거부", "재반송"],
};
/** 상세 상태 셀렉트 선택지 — 원본 `rmaOpts` = 흐름 + 예외 */
export const claimStatuses = (type: ClaimType) => [
  ...CLAIM_FLOW[type],
  ...CLAIM_EXCEPTIONS[type],
];

/**
 * 반품·교환 상태 카드 = 처리 단계 버킷 3장(원본 2026-08-05 A안). 접수 = 판매자 결정 대기 ·
 * 진행 = 수거·검수·환불(재배송) · 완료 = 정상 완료 + 반려·거부·재반송 종결
 */
export const CLAIM_BUCKETS: Record<
  "반품" | "교환",
  Record<"접수" | "진행" | "완료", readonly string[]>
> = {
  반품: {
    접수: ["반품 신청", "반품 지연"],
    진행: [
      "반품 승인",
      "반품 수거중",
      "반품 수거완료",
      "반품 검수",
      "환불 처리중",
    ],
    완료: ["반품 완료", "반품 반려", "반품 거부", "재반송", "교환으로 변경"],
  },
  교환: {
    접수: ["교환 신청", "교환 지연"],
    진행: [
      "교환 승인",
      "교환 수거중",
      "교환 수거완료",
      "교환 검수",
      "교환 재배송",
    ],
    완료: ["교환 완료", "교환 반려", "교환 거부", "재반송"],
  },
};

/** 종결·이관 — GNB 처리 대기에서 빠진다(원본 `RMA_DONE`) */
export const CLAIM_DONE = [
  "취소 완료",
  "반품 완료",
  "교환 완료",
  "재반송",
  "교환으로 변경",
];

export const claimTypeOf = (u: OrderUnit) =>
  u.req?.type as ClaimType | undefined;
export const claimStatOf = (u: OrderUnit) => u.req?.stat ?? "";

/** 반려·거부·재반송 — 클레임 불성립(환불 없음 · 거래 유지) */
const isRefused = (u: OrderUnit) =>
  /(반려|거부)$/.test(claimStatOf(u)) || claimStatOf(u) === "재반송";
/** 환불·교환이 끝난 종결 */
const isClaimFinished = (u: OrderUnit) =>
  ["취소 완료", "반품 완료", "교환 완료"].includes(claimStatOf(u));

/** 원본 `faultOf`(P-008) — 하자·배송 문제는 판매자, 단순 변심은 고객 */
export const faultOf = (reason: string | undefined) =>
  /불량|하자|파손|손상|오배송|오발송|배송\s*(문제|지연|오류)|누락|결함/.test(
    reason ?? "",
  )
    ? ("판매자" as const)
    : ("고객" as const);

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

const wonText = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/* -------------------------------------------------------------------------
 * 주문정보 클레임 6줄 — 원본 `udOrderInfo(u, rmaType)`
 * ---------------------------------------------------------------------- */

export const isShipped = (u: OrderUnit) => !!u.ship && u.ship !== "-";
/** 신청 구분 — 원본은 유형의 **첫 단계**(취소 요청·반품 신청·교환 신청)를 배지로 */
export const claimKindLabelOf = (type: ClaimType) => CLAIM_FLOW[type][0];
export const appliedAtOf = (u: OrderUnit) => unitTime(u, 4);
export const shippedTextOf = (u: OrderUnit) =>
  isShipped(u) ? `발송 후 · ${u.ship}` : "발송 전";

export function feeBurdenOf(u: OrderUnit) {
  const type = claimTypeOf(u);
  if (faultOf(u.req?.reason) === "판매자")
    return "판매자 부담 (하자·배송 문제)";
  if (type === "교환") return "판매자 부담 (교환 배송비 미징수 · 1차)";
  if (type === "취소") return "해당 없음 (발송 전 취소)";
  if (u.type === "렌트")
    return `고객 부담 — 반품 배송비(편도) ${wonText(claimFeeOf(u))} · 보증금에서 차감`;
  const ship = unrefundedShipFeeOf(u);
  return `고객 부담 — 반품 배송비(편도) ${wonText(claimFeeOf(u))} · 환불액에서 차감${ship ? " · 출고 배송비 환불 없음" : ""}`;
}

/* -------------------------------------------------------------------------
 * 처리 이력 — 원본 `udHistory(u, rmaType)`: 주문 흐름 + 클레임이 실제로 거친 단계
 * ---------------------------------------------------------------------- */

export function claimHistoryOf(u: OrderUnit): [string, string][] {
  const rows = historyOf(u);
  const type = claimTypeOf(u);
  if (!type) return rows;
  const cur = claimStatOf(u);
  const flow = CLAIM_FLOW[type];
  if (CLAIM_EXCEPTIONS[type].includes(cur)) {
    rows.push([flow[0], unitTime(u, 4)]);
    if (cur === "재반송") {
      rows.push([`${type} 반려`, unitTime(u, 5)]);
      rows.push(["재반송", unitTime(u, 6)]);
    } else rows.push([cur, unitTime(u, 5)]);
    return rows;
  }
  const ci = Math.max(0, flow.indexOf(cur));
  flow.slice(0, ci + 1).forEach((s, k) => rows.push([s, unitTime(u, 4 + k)]));
  return rows;
}

/* -------------------------------------------------------------------------
 * 명세 클레임 몫 — 결제금액(기준) → 차감 → 결과. 본사 주문 상세와 같은 꼴
 * ---------------------------------------------------------------------- */

const MINUS = "−";
const line = (
  key: string,
  label: string,
  value: string,
  extra: Partial<CalcLine> = {},
): CalcLine => ({ key, label, value, ...extra });
const message = (label: string): CalcLine => ({
  key: "result",
  label,
  kind: "message",
});
const payLine = (u: OrderUnit) =>
  line("pay", "결제금액", wonText(payTotalOf(u)), { kind: "subtotal" });

/** 「별도」 보증금 — 결제금액 밖의 돈이라 결과 아래 따로(본사 명세와 같다) */
export const DEPOSIT_HINT = "결제금액에 포함 안 됨 · 반납 검수 후 환급";
export const depositAsideOf = (u: OrderUnit): CalcBlock[] =>
  u.type === "렌트"
    ? [
        {
          key: "deposit",
          label: "별도",
          lines: [
            line("deposit", "보증금", wonText(u.dep ?? 0), {
              kind: "note",
              hint: DEPOSIT_HINT,
            }),
          ],
        },
      ]
    : [];

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
              line("returnFee", "반품 배송비", `${MINUS}${wonText(fee)}`, {
                hint: "편도 · 고객 귀책 · 환불액에서 차감",
              }),
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
