import { CLAIM_FLOW, claimStatOf, type ClaimType } from "./claim.data";
import type { OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 상태 전이 라우터 — 원본 `gateRoute`(1786). **목록 머리 버튼 · 상세 셀렉트 · 상세 버튼이 전부 여기를 지난다**
 * (원본 주석: 통로를 하나씩 막으면 한 곳이 남아 뚫린다). 어느 창을 열지, 아니면 알림만 낼지를 정한다.
 * 창 모양은 `OrderGates.tsx`, 창을 고르는 규칙과 완료 알림 문구는 여기(원본 글자 그대로).
 *
 * 퍼블 범위: 창의 [확인]은 알림까지다 — 상태는 바뀌지 않는다(원본 `applyStat` 은 개발 영역).
 * ====================================================================== */

/** 전이를 일으키는 화면 — 원본 `CUR`(scr). 클레임 화면은 클레임 상태(`req.stat`)를 바꾼다 */
export type ProcessScreen =
  "saleProc" | "shipping" | "saleCancel" | "saleReturn" | "saleExchange";

export const CLAIM_SCREEN: Partial<Record<ProcessScreen, ClaimType>> = {
  saleCancel: "취소",
  saleReturn: "반품",
  saleExchange: "교환",
};

/** 이 화면에서 처리단위의 「상태」 — 클레임 화면은 클레임 진행 상태 */
export const statusIn = (screen: ProcessScreen, u: OrderUnit) =>
  CLAIM_SCREEN[screen] ? claimStatOf(u) : (u.stat ?? "");

export type Gate =
  | { kind: "confirm"; ids: string[]; next: string; current: string | null }
  | { kind: "delay"; ids: string[] }
  | { kind: "sellerCancel"; ids: string[] }
  | { kind: "reject"; ids: string[]; stat: string }
  | { kind: "toExchange"; ids: string[] }
  | { kind: "reship"; ids: string[] }
  | { kind: "exchangeShip"; ids: string[] }
  | { kind: "refundStart"; ids: string[] }
  | { kind: "refundDone"; ids: string[]; stat: string }
  | { kind: "saleDone"; ids: string[] };

export type Route = Gate | { kind: "toast"; message: string };

const SHIPPED = ["배송중", "배송 완료", "구매확정"];

/** 원본 `gateRoute(ids, v, scr)` — 갈래 순서 그대로 */
export function routeGate(
  v: string,
  units: OrderUnit[],
  screen: ProcessScreen,
): Route {
  const ids = units.map((u) => u.id);
  if (v === "구매확정") return { kind: "toast", message: GATE_TOAST.purchase };
  /* 주문 취소는 단건만(2026-08-06 사용자 지시) — 잠금은 안내, 차단은 여기 */
  if (v === "취소" && ids.length > 1)
    return { kind: "toast", message: GATE_TOAST.singleCancel };
  if (v === "취소" && screen === "saleProc") {
    const ok = units.filter((u) => !SHIPPED.includes(u.stat ?? ""));
    if (!ok.length) return { kind: "toast", message: GATE_TOAST.shippedCancel };
    return { kind: "sellerCancel", ids: ok.map((u) => u.id) };
  }
  if (CLAIM_SCREEN[screen]) {
    if (/(거부|반려)$/.test(v)) return { kind: "reject", ids, stat: v };
    if (v === "교환으로 변경") return { kind: "toExchange", ids };
    if (v === "재반송") return { kind: "reship", ids };
    if (v === "교환 재배송") return { kind: "exchangeShip", ids };
    if (v === "환불 처리중") return { kind: "refundStart", ids };
    if (v === "취소 완료" || v === "반품 완료")
      return { kind: "refundDone", ids, stat: v };
  }
  if (v === "배송 완료" && units[0]?.type === "판매")
    return { kind: "saleDone", ids };
  /* 배송 지연은 사유 창이 곧 확인 창이다(원본 — 여기서 잡으면 창이 두 번 뜬다) */
  if (v === "배송 지연") return { kind: "delay", ids };
  /* 일반 확인 — 다건인데 지금 상태가 섞이면 대표를 세우지 않는다(원본) */
  const current = statusIn(screen, units[0]);
  const mixed = units.some((u) => statusIn(screen, u) !== current);
  return {
    kind: "confirm",
    ids,
    next: v,
    current: mixed || !current ? null : current,
  };
}

/** 창 없이 끝나는 알림 — 원본 글자 그대로 */
export const GATE_TOAST = {
  purchase:
    "구매확정은 고객이 직접 확정하거나 배송 완료 후 7일이 지나면 자동 처리됩니다 — 어드민에서는 변경할 수 없습니다.",
  singleCancel:
    "주문 취소는 한 건씩만 처리할 수 있습니다 — 선택을 1건으로 줄이거나 주문 상세에서 취소해주세요.",
  shippedCancel: "출고 후에는 취소할 수 없습니다 — 반품으로 처리해주세요.",
  /** 재반송·교환 재배송 창 — 택배사 없음 */
  courierPick: "택배사를 선택해주세요.",
} as const;

/** 창 [확인] 뒤 알림 — 원본 `gate*Go`. 갈래는 **고른 건수**로 가른다(원본 주석) */
export const GATE_DONE = {
  confirm: (v: string, n: number) => {
    const suffix = /승인$/.test(v) ? " 수거 절차를 진행해주세요." : "";
    return n > 1
      ? `${n}건 '${v}' 처리되었습니다.${suffix}`
      : `'${v}' 상태로 변경했습니다.${suffix}`;
  },
  delay: (reason: string, n: number) =>
    n > 1
      ? `${n}건을 배송 지연 처리했습니다. (사유: ${reason})`
      : `배송 지연 처리했습니다. (사유: ${reason})`,
  sellerCancel:
    "주문 취소 처리되었습니다 — 셀러 사정 취소로 기록되어 취소 수수료가 면제됩니다. → [취소 관리]에서 환불을 진행하세요.",
  reject: (stat: string, n: number) =>
    n > 1
      ? `${n}건 '${stat}' 처리되었습니다 — 입력한 사유가 고객 주문 내역에 노출됩니다.`
      : `'${stat}' 처리되었습니다 — 입력한 사유가 고객 주문 내역에 노출됩니다.`,
  toExchange: (n: number) =>
    n > 1
      ? `${n}건 교환으로 변경되었습니다 — 사유가 고객에게 통지되고 [교환 관리]로 이동했습니다.`
      : "교환으로 변경되었습니다 — 사유가 고객에게 통지되고 [교환 관리]로 이동했습니다.",
  reship: "재반송 처리되었습니다 — 종결 상태로 이후 되돌릴 수 없습니다.",
  exchangeShip: (n: number) =>
    n > 1
      ? `${n}건 교환 재배송 처리되었습니다 — 송장이 등록되었습니다.`
      : "교환 재배송 처리되었습니다 — 송장이 등록되었습니다.",
  refundStart: (n: number) =>
    n > 1
      ? `${n}건 환불 처리중으로 변경되었습니다.`
      : "환불 처리중으로 변경되었습니다 — 확정된 내역으로 환불이 진행됩니다.",
  refundDone: (stat: string, n: number) =>
    n > 1
      ? `${n}건 '${stat}' 처리되었습니다 — 환불 실행이 확정되었습니다.`
      : `'${stat}' 처리되었습니다 — 환불 실행이 확정되었습니다.`,
  saleDone: (n: number) =>
    n > 1
      ? `${n}건 배송 완료 처리되었습니다 — 완료일부터 7일 경과 시 자동 구매확정됩니다.`
      : "배송 완료 처리되었습니다 — 완료일부터 7일 경과 시 자동 구매확정됩니다.",
} as const;

/* -------------------------------------------------------------------------
 * 행·상세의 송장 버튼 — 창 없이 검사 후 알림(원본 `rentShipOne` · `rentInvoiceEdit` ·
 * `cancelToReturn` · `rmaCollectShip`). 목록 행과 상세 배송정보가 같은 문구를 낸다
 * ---------------------------------------------------------------------- */

export const ACTION_COPY = {
  noSelection: "선택된 항목이 없습니다.",
  singleOnly: "한 건씩만 처리할 수 있습니다 — 선택을 1건으로 줄여주세요.",
  courierFirst: "택배사를 먼저 선택해주세요.",
  invoiceFirst: "송장번호를 입력해주세요.",
  courierAndInvoice: "택배사와 송장번호를 입력해주세요.",
  /** 배송중(송장 등록) 완료 — 원본 `_rentShipGo` */
  shipped: (n: number) =>
    n > 1
      ? `${n}건 배송중 전환 → [배송 관리]로 이동했습니다.`
      : "송장 등록 완료 → [배송 관리]로 이동했습니다.",
  invoiceEdited: "송장번호를 수정했습니다.",
  invoiceEditedBulk: (n: number, skipped: number) =>
    `${n}건 송장번호 수정 완료${skipped ? ` · ${skipped}건 제외(송장번호 없음)` : ""}`,
  /** 취소 관리 행 [송장등록] — 송장이 수거 송장으로 넘어가 반품으로 전환(원본 `cancelToReturn`) */
  cancelToReturn:
    "송장 등록 → 반품 처리로 전환되어 [반품 관리]로 이동했습니다.",
  collectFirst: "수거 택배사와 수거 송장번호를 입력해주세요.",
  /**
   * 반품·교환 행 [송장등록] → 수거중. 원본은 흐름 배열의 3번째(`seq[2]`)를 써서 「반품 지연」으로
   * 진행했다(주석은 「수거중」 — 승인 단계가 끼며 한 칸 밀린 결함). 주석 의도대로 수거중으로 둔다(기획 확인)
   */
  collected: (type: "반품" | "교환") =>
    `수거 송장 등록 완료 → '${CLAIM_FLOW[type][3]}'로 진행했습니다.`,
} as const;
