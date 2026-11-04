import type { CalcBlock, CalcLine } from "../babycube/CalcBreakdown";
import { claimBlocksOf } from "./claim.data";
import type { ProcessScreen } from "./gate.data";
import {
  couponOf,
  optionsOf,
  productRef,
  salePayTotal,
  salePrice,
  shipFeeOf,
  stageIdx,
  unitTime,
} from "./orderUnit.data";
import type { OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 처리단위 상세 공용 **도메인** — 판매 상세 5개(발주·배송·취소·반품·교환)가 같이 읽는 값.
 * 뼈대는 `UnitDetail.tsx`, 화면별 설정은 각 `*DetailPage.data.ts`.
 *
 * 원본 = 기획 v0.4 `udOrderPage`(4930) · `udOrderInfo`(4732) · `udPriceBox`(4787) · `udProdInfo` ·
 * `udShipInfo` · `udAddrInfo`. 대조 문서 `docs/seller/pilot-saleProc.md` B 절.
 *
 * ## 기획 변경 반영 (원본 v0.4 이후 · `docs/seller/plan-changes.md`)
 * - D-349·D-345 — 배송지 정보에 「추가 연락처」 행(수령인 연락처 아래). 없으면 「-」.
 *   처리단위 시드에 값이 없어 지금은 모두 「-」다(렌트 묶음에서 보강 시드를 붙인다)
 * ====================================================================== */

/** 값 없음 — 원본도 `-` (본사 상세와 같다) */
export const NONE = "-";
export const orNone = (value: string | undefined) =>
  !value || value.trim() === "" || value === "-" ? NONE : value;

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 원본 `unitNo` — 주문번호 + 순번(`20260623864962-1`). 하단 [변경 저장] 알림의 표시 축 */
export const unitNo = (u: OrderUnit) => {
  const parts = String(u.id).split("-");
  const last = parts[parts.length - 1];
  return `${u.no}-${/^\d+$/.test(last) ? last : "1"}`;
};

/** 머리 설명 — 같은 주문번호의 다른 처리단위와 구별되게(본사 상세와 같은 꼴) */
export const headlineOf = (u: OrderUnit) => `${unitNo(u)} · ${u.prod}`;

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

/** 원본 `t(k)` — 1 주문확인 · 2 배송처리 · 3 배송완료 */
export const reachedAt = (u: OrderUnit, k: 1 | 2 | 3) =>
  stageIdx(u) >= k ? unitTime(u, k) : NONE;
/** 구매확정일 — 구매확정 건만(원본) */
export const purchasedAtOf = (u: OrderUnit) =>
  u.stat === "구매확정" ? unitTime(u, 4) : NONE;

/* -------------------------------------------------------------------------
 * 배송지 정보 — 원본 `udAddrInfo` + 「추가 연락처」(D-349·D-345)
 * ---------------------------------------------------------------------- */

export const receiverOf = (u: OrderUnit) => u.receiver || u.mem;
export const receiverTelOf = (u: OrderUnit) => orNone(u.receiverTel || u.tel);
/** 추가 연락처 — 시드에 필드가 없다. 보강 시드가 붙으면 여기서 읽는다 */
export const extraTelOf = (u: OrderUnit & { extraTel?: string }) =>
  orNone(u.extraTel);

/* -------------------------------------------------------------------------
 * 주문 명세 — 원본 `udPriceBox`(판매) → `CalcBreakdown` 묶음
 *
 * 원본 줄: 판매 원가 · 할인 금액 · 판매가 · 수량 · 소계 · 구성품(각 +금액) · 쿠폰 할인 · 배송비 · 결제 금액.
 * 묶음은 본사 주문 명세와 같은 꼴(상품 · 구성품 · 할인 · 추가 · 결과). 「할인 금액」은 옆 「할인」 묶음과
 * 헷갈려 본사처럼 「상품 할인」으로 부른다. **포인트는 판매 명세에 없다**(원본 — 결제금액 식에도 없다).
 * 클레임 상세는 결과 묶음 대신 클레임 몫(`claim.data` `claimBlocksOf` — 결제금액이 기준 줄이 된다)
 * ---------------------------------------------------------------------- */

const MINUS = "−";
const less = (amount: number) =>
  amount > 0 ? `${MINUS}${won(amount)}` : won(0);
const more = (amount: number) => `+${won(amount)}`;
const line = (
  key: string,
  label: string,
  value: string,
  extra: Partial<CalcLine> = {},
): CalcLine => ({ key, label, value, ...extra });

export const statementTitleOf = (u: OrderUnit) => `주문 명세 · ${u.no}`;

export function statementBlocksOf(u: OrderUnit, claim = false): CalcBlock[] {
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

/* -------------------------------------------------------------------------
 * 상세 공용 문구 — 원본 글자 그대로
 * ---------------------------------------------------------------------- */

export const UNIT_DETAIL_COPY = {
  notFoundTitle: "찾을 수 없는 주문입니다",
  notFoundDescription: "해당 항목이 존재하지 않거나 삭제되었습니다.",
  /** 원본 `act(unitNo + ' 변경 저장')` — 표시 축 = 주문번호+순번(원본 판정 ②) */
  saved: (u: OrderUnit) => `${unitNo(u)} 변경 저장`,
  /** 원본 `saleChangeAddr` — prompt 문구 · 완료 알림 */
  addrTitle: "배송지 변경",
  addrLabel: "변경할 배송지",
  addrPlaceholder: "변경할 배송지를 입력하세요",
  addrChanged: "배송지를 변경했습니다.",

  /** 원본 `rmaToReturn` — 출고 뒤 취소 건 */
  toReturn: "반품으로 전환했습니다 → [반품 관리]에서 처리하세요.",
} as const;

/* -------------------------------------------------------------------------
 * 화면 설정 — 원본 `udOrderPage(u, cfg)` 의 cfg. 상세 5개가 이 꼴로 준다
 * ---------------------------------------------------------------------- */

/** 배송정보 송장 칸 — 원본 `udShipInfo(u, mode)`: reg = 송장 등록 · edit = 송장 수정 · ro = 읽기 */
export type ShipMode = "register" | "edit" | "ro";

/**
 * 하단 바 처리 버튼 — `to` 는 상태 값(게이트 라우터를 지난다). `special` 은 게이트 밖 동작:
 * 배송지 변경 창 · 배송 추적 알림 · 반품 전환 알림
 */
export type DetailAction = {
  label: string;
  /** 위험한 전이(주문 취소·반려)는 `criticalTonal` — 진한 버튼은 [변경 저장] 하나다 */
  tone?: "secondary" | "criticalTonal";
} & ({ to: string } | { special: "address" | "track" | "toReturn" });

export interface UnitDetailConfig {
  screen: ProcessScreen;
  /** 원본 탑바 h1(TITLES) */
  title: string;
  listPath: string;
  /** 없는 건 화면의 되돌아가기 버튼 */
  listLabel: string;
  find: (id: string) => OrderUnit | undefined;
  /** 상태 셀렉트 선택지 — 지금 상태가 여기 없으면 배지(원본 `udStatSel`) */
  statusOptions: readonly { value: string; label: string }[];
  shipMode: (u: OrderUnit) => ShipMode;
  actions: (u: OrderUnit) => DetailAction[];
}
