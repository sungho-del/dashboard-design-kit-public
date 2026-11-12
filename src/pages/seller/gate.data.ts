import { CLAIM_FLOW, claimStatOf, type ClaimType } from "./claim.labels";
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
  | "saleProc"
  | "shipping"
  | "saleCancel"
  | "saleReturn"
  | "saleExchange"
  | "rentList"
  | "rentDispatch"
  | "rentUse"
  | "rentInspReturn"
  | "rentCancel"
  | "rentRma";

export const CLAIM_SCREEN: Partial<Record<ProcessScreen, ClaimType>> = {
  saleCancel: "취소",
  saleReturn: "반품",
  saleExchange: "교환",
  rentCancel: "취소",
  rentRma: "반품",
};

/** 렌트 처리 화면 — 확인 창 설명이 렌트용 다음 단계를 쓴다(원본 `statTipOf`) */
export const isRentScreen = (screen: ProcessScreen) =>
  screen.startsWith("rent");

/** 원본 `_shipImgMiss` — 출고 이미지가 없는 **렌트** 처리단위(판매는 출고 이미지 기능이 없다) */
export const shipImageMissing = (units: OrderUnit[]) =>
  units.filter((u) => u.type === "렌트" && !(u.shipImgs ?? []).length);

/** 검수 판정됐는가 — 미검수·없음이 아니면(원본 `inspect` 판정값) */
export const inspectedOf = (u: OrderUnit) =>
  !!u.inspect && u.inspect !== "미검수" && u.inspect !== "-";

/** 이 화면에서 처리단위의 「상태」 — 클레임 화면은 클레임 진행 상태 */
export const statusIn = (screen: ProcessScreen, u: OrderUnit) =>
  CLAIM_SCREEN[screen] ? claimStatOf(u) : (u.stat ?? "");

export type Gate =
  | {
      kind: "confirm";
      ids: string[];
      next: string;
      current: string | null;
      /** 조건이 안 맞아 빠지는 건수(검수완료 — 미판정) */
      skipped?: number;
    }
  | { kind: "delay"; ids: string[] }
  | { kind: "sellerCancel"; ids: string[] }
  | { kind: "reject"; ids: string[]; stat: string }
  | { kind: "toExchange"; ids: string[] }
  /** 출고 뒤 취소 → 반품 전환(사유 + 고객 안내 동의 · 개발 요청 21번) */
  | { kind: "toReturn"; ids: string[] }
  /** 반품·교환 승인 뒤 수거 송장 등록(택배사·송장 · 개발 요청 23번) */
  | { kind: "collectInvoice"; ids: string[]; type: "반품" | "교환" }
  | { kind: "reship"; ids: string[] }
  | { kind: "exchangeShip"; ids: string[] }
  | { kind: "refundStart"; ids: string[] }
  | { kind: "refundDone"; ids: string[]; stat: string }
  | { kind: "saleDone"; ids: string[] }
  /* 렌트 */
  | { kind: "rentBegin"; ids: string[] }
  | { kind: "retDone"; ids: string[] }
  | { kind: "shipRemind"; ids: string[]; act: "배송 준비" | "배송중" }
  | { kind: "depositRefund"; ids: string[]; deduct: number };

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
  /* 연장 = 고객이 새 반납일을 고르고 추가 결제하는 전이(도메인모델 #4 · A-2) */
  if (v === "대여중(연장)")
    return { kind: "toast", message: GATE_TOAST.extend };
  /* 연체중 = 수거 신청 뒤 미반납일 때만(H-3 · A-3). **전 대상을 거른다** — 창 없이 바로(원본) */
  if (v === "연체중") {
    const ok = units.filter((u) => u.stat === "수거 신청").length;
    if (!ok) return { kind: "toast", message: GATE_TOAST.overdueBlocked };
    if (ok < ids.length)
      return {
        kind: "toast",
        message: GATE_TOAST.overduePartial(ok, ids.length - ok),
      };
    return { kind: "toast", message: GATE_DONE.overdue(ids.length) };
  }
  /* 주문 취소는 단건만(2026-08-06 사용자 지시) — 잠금은 안내, 차단은 여기 */
  if (v === "취소" && ids.length > 1)
    return { kind: "toast", message: GATE_TOAST.singleCancel };
  if (v === "취소" && (screen === "saleProc" || screen === "rentList")) {
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
  /* 렌트 배송 완료 = 대여 시작(반납 예정일·연체 계산의 기준) */
  if (v === "배송 완료" && units[0]?.type === "렌트")
    return { kind: "rentBegin", ids };
  /* 검수완료 — 검수 판정된 건만(판정이 전제) · 섞이면 확인 창 완료 알림이 제외 건수를 말한다 */
  let skipped = 0;
  if (v === "검수완료" && screen === "rentInspReturn") {
    const ok = units.filter(inspectedOf).length;
    if (!ok) return { kind: "toast", message: GATE_TOAST.inspectFirst };
    skipped = ids.length - ok;
  }
  /* 반납완료 — 보증금 처리 완료 건만 · 렌트 매출 확정 고지 */
  if (v === "반납완료" && units[0]?.type === "렌트") {
    const ok = units.filter((u) => u.depDone).map((u) => u.id);
    if (!ok.length) return { kind: "toast", message: GATE_TOAST.depositFirst };
    return { kind: "retDone", ids: ok };
  }
  /* 배송 지연은 사유 창이 곧 확인 창이다(원본 — 여기서 잡으면 창이 두 번 뜬다) */
  if (v === "배송 지연") return { kind: "delay", ids };
  /* 배송 준비 — 출고 이미지 없는 렌트 건이 섞이면 안내 창이 받는다(원본 UI-274) */
  if (v === "배송 준비" && shipImageMissing(units).length)
    return { kind: "shipRemind", ids, act: "배송 준비" };
  /* 일반 확인 — 다건인데 지금 상태가 섞이면 대표를 세우지 않는다(원본) */
  const current = statusIn(screen, units[0]);
  const mixed = units.some((u) => statusIn(screen, u) !== current);
  return {
    kind: "confirm",
    ids,
    next: v,
    current: mixed || !current ? null : current,
    ...(skipped ? { skipped } : {}),
  };
}

/**
 * develop 문구(개발 요청 2026-11-12 21·23·24·25번) — 유형 전환 동의 체크 · 반품 전환 · 수거 송장 등록 ·
 * 자체 수령 재배송 · 환불 실행 확인 창(누르는 순간 환불이 실행된다 — 퍼블 「완료되었음을 확정」은 실제와 달랐다)
 */
export const CLAIM_GATE_COPY = {
  consent: "고객에게 유형 전환과 비가역성을 안내하고 동의를 확인했습니다.",
  toReturnLead:
    "출고 또는 대여 시작 후에는 취소할 수 없어 반품 트랙으로 전환합니다. 이 전환은 되돌릴 수 없습니다.",
  toReturnPlaceholder: "처리 근거를 입력해 주세요.",
  collectTitle: "수거 송장 등록",
  collectLead:
    "실제 수거 택배사와 송장번호를 등록하면 수거중 단계로 전환됩니다.",
  pickupRedeliverTitle: "재배송 등록",
  pickupRedeliverLead: "자체 수령 주문이라 송장 없이 재수령 안내로 진행합니다.",
  refundDone: {
    "취소 완료":
      "환불 실행 확정 · 되돌릴 수 없음. 결제 승인 취소(PG)와 포인트·쿠폰 복원이 함께 실행되고 고객에게 환불 완료 안내가 나갑니다.",
    "반품 완료":
      "환불 실행 확정 · 되돌릴 수 없음. 반품 배송비를 뺀 금액이 카드로 취소되고 재고가 복원되며 고객에게 환불 완료 안내가 나갑니다.",
  } as Record<string, string>,
} as const;

/** 창 없이 끝나는 알림 — 원본 글자 그대로 */
export const GATE_TOAST = {
  purchase:
    "구매확정은 고객이 직접 확정하거나 배송 완료 후 7일이 지나면 자동 처리됩니다 — 어드민에서는 변경할 수 없습니다.",
  singleCancel:
    "주문 취소는 한 건씩만 처리할 수 있습니다 — 선택을 1건으로 줄이거나 주문 상세에서 취소해주세요.",
  shippedCancel: "출고 후에는 취소할 수 없습니다 — 반품으로 처리해주세요.",
  /** 재반송·교환 재배송 창 — 택배사 없음 */
  courierPick: "택배사를 선택해주세요.",
  extend:
    "연장은 고객이 직접 신청하고 추가 결제하는 절차입니다 — 어드민에서는 변경할 수 없습니다.",
  overdueBlocked:
    "연체는 수거 신청 후 고객이 반납하지 않은 경우에만 처리할 수 있습니다 — 수거 송장을 먼저 등록해주세요.",
  overduePartial: (ok: number, rest: number) =>
    `수거 신청 상태인 ${ok}건만 연체 처리합니다 — 나머지 ${rest}건은 제외되었습니다.`,
  inspectFirst:
    "검수 판정 후 검수완료로 전환할 수 있습니다 — [검수·반납 관리] 상세의 검수 판정에서 처리하세요.",
  depositFirst:
    "보증금 반환·청구 처리 완료 후 반납완료로 전환할 수 있습니다 — [검수·반납 관리] 상세의 보증금 정산에서 처리하세요.",
  /** 출고 이미지 안내 창 [출고 이미지 등록] — 다건은 목록에 남는다(원본 2026-08-07) */
  shipImageInDetail:
    "출고 이미지는 주문 상세에서 등록합니다 — 목록에서 주문번호를 눌러 이동해주세요.",
} as const;

/** 창 [확인] 뒤 알림 — 원본 `gate*Go`. 갈래는 **고른 건수**로 가른다(원본 주석) */
export const GATE_DONE = {
  confirm: (v: string, n: number, skipped = 0) => {
    const suffix = /승인$/.test(v) ? " 수거 절차를 진행해주세요." : "";
    const rest = skipped ? ` (${skipped}건 제외 — 상태 조건)` : "";
    return n > 1
      ? `${n - skipped}건 '${v}' 처리되었습니다.${rest}${suffix}`
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
  /** 원본 `rmaToReturn` — 출고 뒤 취소 건 */
  toReturn: "반품으로 전환했습니다 → [반품 관리]에서 처리하세요.",
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
  overdue: (n: number) =>
    n > 1
      ? `${n}건 연체 처리되었습니다 — [대여·연체 관리]로 이동했습니다.`
      : "연체 처리되었습니다 — [대여·연체 관리]로 이동했습니다.",
  rentBegin: (n: number) =>
    n > 1
      ? `${n}건 배송 완료 (대여 시작) → [대여·연체 관리]로 이동했습니다.`
      : "배송 완료 (대여 시작) → [대여·연체 관리]로 이동했습니다.",
  retDone: (n: number) =>
    n > 1
      ? `${n}건 반납완료 처리되었습니다 — 렌트 매출이 확정되었습니다.`
      : "반납완료 처리되었습니다 — 렌트 매출이 확정되었습니다.",
  /** 출고 이미지 안내 창 왼쪽 버튼 — 그 자리에서 원래 일어날 전이(원본 `shipGateGo`) */
  shipRemind: (act: "배송 준비" | "배송중", n: number) =>
    act === "배송중"
      ? ACTION_COPY.shipped(n)
      : n > 1
        ? `${n}건 '배송 준비' 처리되었습니다.`
        : "'배송 준비' 상태로 변경했습니다.",
  depositRefund: (deducted: boolean) =>
    `보증금 ${deducted ? "차감 후 환급" : "전액환급"} 처리 완료. 반납완료로 전환할 수 있습니다.`,
} as const;

/**
 * 보증금 환급 — 원본 `gateDep`·`depProcess`. 환급 경로 문구는 기획 보드 01(문서)
 * 「환급은 결제 카드 결제 취소 경로로 실행됩니다.」로 바꿨다(원본 「결제 카드 취소 경로」)
 */
export const DEPOSIT_COPY = {
  refundPath: "환급은 결제 카드 결제 취소 경로로 실행됩니다.",
  reasonEmpty: "차감 사유를 입력해주세요.",
} as const;

/* -------------------------------------------------------------------------
 * 행·상세의 송장 버튼 — 창 없이 검사 후 알림(원본 `rentShipOne` · `rentInvoiceEdit` ·
 * `rmaCollectShip`). 목록 행과 상세 배송정보가 같은 문구를 낸다
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
  collectFirst: "수거 택배사와 수거 송장번호를 입력해주세요.",
  /**
   * 반품·교환 행 [송장등록] → 수거중. 원본은 흐름 배열의 3번째(`seq[2]`)를 써서 「반품 지연」으로
   * 진행했다(주석은 「수거중」 — 승인 단계가 끼며 한 칸 밀린 결함). 주석 의도대로 수거중으로 둔다(기획 확인)
   */
  collected: (type: "반품" | "교환") =>
    `수거 송장 등록 완료 → '${CLAIM_FLOW[type][3]}'로 진행했습니다.`,
  /** 렌트 수거 신청 — 원본 `rentCollectOne`·`rentCollectBulk` */
  collectRequested: (n: number) =>
    `${n > 1 ? `${n}건 수거 신청` : "수거 송장 등록 완료"} → [검수·반납 관리]로 이동했습니다. 등록 시점부터 고객의 연장·회수지 변경이 마감됩니다.`,
  collectTooEarly:
    "이용 종료 전에는 수거 신청할 수 없습니다 — 종료일부터 등록할 수 있어요(등록 시 고객의 연장이 마감됩니다).",
  retInvoiceFirst: "수거 송장번호를 입력해주세요.",
  retInvoiceEdited: "수거 송장번호를 수정했습니다.",
} as const;
