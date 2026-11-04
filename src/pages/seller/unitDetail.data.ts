import type { CalcBlock, CalcLine } from "../babycube/CalcBreakdown";
import { claimBlocksOf, depositAsideOf } from "./claim.data";
import type { ProcessScreen } from "./gate.data";
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
  stageIdx,
  unitHash,
  unitTime,
} from "./orderUnit.data";
import type { OrderUnit } from "./seed/orders.data";
import { UNIT_EXTRA } from "./seed/unitExtra.data";

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
export const depositStatusOf = (u: OrderUnit) => u.depStat || "점유중";
export const careTextOf = (u: OrderUnit) =>
  careOf(u)
    ? "가입 — 복원가능 손상 본사 부담"
    : "미가입 — 손상 배상은 보증금에서 차감(본사 부담 없음)";

/** 대여 정보 — 대여 기간 · 대여 시작 · 반납 예정일(연장이면 연장 전 예정일 병기) */
export function rentTermOf(u: OrderUnit) {
  const [start = "-", end = "-"] = (u.period || "-").split("~");
  const extended = u.stat === "대여중(연장)" || /\(연장\)/.test(u.period ?? "");
  const due = end.replace(/\(연장\)/, "").trim() || NONE;
  return {
    period: u.period || NONE,
    start: start.replace("예정", "").trim() || NONE,
    /* 원본은 라벨을 「반납 예정일 (연장 전 예정일)」로 늘렸다 — 라벨 폭(120)에서 두 줄이 돼 값 쪽에 적는다 */
    due: extended && u.preDue ? `${due} (연장 전 ${u.preDue})` : due,
  };
}

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

const perDay = (amount: number) => `${won(amount)}/일`;
const shipLine = (fee: number) => (fee > 0 ? more(fee) : "무료");

/**
 * 렌트 주문 몫 — 원본 `udPriceBox` 렌트 갈래: 렌트 원가(원/일) → 할인 → 렌트가 → 렌트일 → 장기 렌트 할인 →
 * 소계 · 구성품(일가 × 렌트일) · 쿠폰 · 포인트(플랫폼 부담) · 안심케어(정산 미포함) · 배송비 · 회수 배송비
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
        ...(point
          ? [line("point", "포인트 할인", less(point), { hint: "플랫폼 부담" })]
          : []),
      ],
    },
    {
      key: "extra",
      label: "추가",
      lines: [
        ...(careOf(u)
          ? [line("care", "안심케어", more(CARE_FEE), { hint: "정산 미포함" })]
          : []),
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
} & (
  | { to: string }
  | { special: "address" | "track" | "toReturn" }
  /** 다른 메뉴로(원본 [대여·연체 관리로]) */
  | { go: string }
);

/**
 * 렌트 상세의 중간 구역 — 상품정보와 배송정보 사이(원본 `shipImg` · `midSections`).
 * 출고 이미지(발주·배송) · 대여 정보(대여·연체 · 검수·반납) · 검수 판정 · 보증금 정산 · 안심케어 청구(가입 건만) ·
 * 상품 상태 이미지(검수·반납)
 */
export type RentSectionKey =
  "shipImages" | "rentInfo" | "inspect" | "deposit" | "care" | "photos";

/** 대여 정보의 수거 송장 칸 — 원본 `udRetShipRows(u, mode)`: req [수거 신청] · edit [송장수정] · ro */
export type CollectMode = "request" | "edit" | "ro";

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
  sections?: readonly RentSectionKey[];
  /** 상품정보에 보증금(고정액)·보증금 상태 — 대여·연체 · 검수·반납(원본 `depInProd`) */
  depositInProduct?: boolean;
  collectMode?: (u: OrderUnit) => CollectMode;
}

/* -------------------------------------------------------------------------
 * 검수 판정 · 보증금 정산 · 안심케어 청구 — 원본 `rentInspDetail`(5077) · `inspSet`·`inspReset`·
 * `depDeductSet`·`careClaimSet`(4631~4675) · `applyStat(…,'rentInspect')`(1770)
 *
 * 퍼블 범위(GPT 검토 A안): 판정·차감액·청구 금액은 **화면 안에서만** 바뀐다. 원본은 판정과 함께 주문 상태를
 * 검수완료로, 보증금 상태를 환급대기로 바꿨다 — 그 상태 변경은 하지 않는다(개발 영역).
 *
 * ## 원본 결함을 의도대로 고친 곳(기획 확인)
 * - 판정값은 「이상없음」인데 원본의 0원 초기화·차감 칸 숨김은 「정상」을 봤다 → 이상없음 = 차감 0 · 차감 칸 없음
 * - 안심케어 **반려** 건도 원본은 「본사 부담」으로 차감을 잠갔다(바로 아래 문구는 차감을 다시 판단하라고 한다) →
 *   반려면 차감을 다시 연다(재청구 통로는 없다)
 * ---------------------------------------------------------------------- */

export type Judgment =
  "이상없음" | "파손(복원가능)" | "파손(복원불가)" | "파손" | "분실";

/** 판정 선택지 — 가입은 복원가능/불가를 가르고(복원가능 = 본사 부담), 미가입은 파손 하나(둘 다 차감이라 구분 무의미) */
export const judgmentOptionsOf = (
  u: OrderUnit,
): { value: Judgment; label: string; desc: string; warn?: true }[] =>
  careOf(u)
    ? [
        {
          value: "이상없음",
          label: "이상없음",
          desc: "손상 없음 · 보증금 전액 반환",
        },
        {
          value: "파손(복원가능)",
          label: "파손 (복원가능)",
          desc: "안심케어 — 본사 부담(보증금 미차감) · 복원비 청구",
        },
        {
          value: "파손(복원불가)",
          label: "파손 (복원불가)",
          desc: "보증금 차감 · 초과 금액은 고객과 협의",
        },
        {
          value: "분실",
          label: "분실",
          desc: "보증금 전액 차감 · 초과 금액은 고객과 협의",
          warn: true,
        },
      ]
    : [
        {
          value: "이상없음",
          label: "이상없음",
          desc: "손상 없음 · 보증금 전액 반환",
        },
        {
          value: "파손",
          label: "파손",
          desc: "보증금 차감 · 초과 금액은 고객과 협의",
        },
        {
          value: "분실",
          label: "분실",
          desc: "보증금 전액 차감 · 초과 금액은 고객과 협의",
          warn: true,
        },
      ];

/** 판정 결과 설명 — 원본 `JUDGE_DESC` */
export const judgmentDescOf = (u: OrderUnit, j: Judgment) =>
  ({
    이상없음: "손상 없음 — 보증금 전액 반환.",
    "파손(복원가능)": careOf(u)
      ? "복원가능 손상 — 안심케어 적용, 복원 비용 본사 부담(보증금 미차감). 아래 안심케어 청구에서 복원비를 접수하세요."
      : "복원가능 손상 — 보증금에서 배상액 차감(상한=보증금).",
    "파손(복원불가)": "보증금 차감 · 초과 금액은 고객과 협의",
    파손: "보증금 차감 · 초과 금액은 고객과 협의",
    분실: "보증금 전액 차감 · 초과 금액은 고객과 협의",
  })[j];

/** 시드의 판정 — 미검수·없음이면 판정 전 */
export const judgmentOf = (u: OrderUnit): Judgment | null =>
  u.inspect && u.inspect !== "미검수" && u.inspect !== "-"
    ? (u.inspect as Judgment)
    : null;

/** 안심케어가 손상을 메운다 — 가입 · 복원가능 파손 · 본사 반려가 아님 */
export const careCoveredOf = (u: OrderUnit, j: Judgment | null) =>
  careOf(u) && j === "파손(복원가능)" && u.careStat !== "반려";

/** 판정을 고를 때의 차감 초깃값 — 원본 `applyStat(…,'rentInspect')`. 상한 = 보증금 */
export function initialDeductOf(u: OrderUnit, j: Judgment) {
  const dep = u.dep ?? 0;
  const now = Number(u.deduct) || 0;
  const next =
    j === "이상없음"
      ? 0
      : j === "분실"
        ? dep
        : j === "파손(복원가능)"
          ? careCoveredOf(u, j)
            ? 0
            : now || Math.round((dep * 0.3) / 100) * 100
          : now;
  return Math.min(next, dep);
}

/** 상세 화면 안 알림 — 원본 글자 그대로 */
export const INSPECT_COPY = {
  judged: (u: OrderUnit, j: Judgment) =>
    `'${j}' 판정. ${careCoveredOf(u, j) ? "안심케어 적용 — 본사 부담(보증금 미차감). 복원비를 청구하세요." : "보증금 정산에 반영되었습니다."}`,
  reset: "검수 판정을 초기화했습니다. 다시 선택하세요.",
  deductCapped: (cap: number) =>
    `차감액은 보증금 잔액 ${won(cap)}을 초과할 수 없습니다.`,
  deducted: (v: number, back: number) =>
    `배상 차감액 ${won(v)} 반영. 반환 예정액 ${won(back)}.`,
  careEmpty: "복원 비용을 입력해주세요.",
  careClaimed: (v: number) =>
    `안심케어 청구 접수 (복원비 ${won(v)}). 본사 승인 후 정산에 보전됩니다.`,
  imageMax: (room: number) =>
    room > 0
      ? `이미지는 최대 10장까지 등록할 수 있습니다. (${room}장만 등록)`
      : "이미지는 최대 10장까지 등록할 수 있습니다.",
} as const;
