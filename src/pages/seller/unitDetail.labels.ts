import type { CalcLine } from "../babycube/CalcBreakdown";
import type { ProcessScreen } from "./gate.data";
import { careOf, stageIdx, unitTime } from "./orderUnit.labels";
import { DEMO_TODAY, periodOf } from "./processList.data";
import type { OrderUnit } from "./seed/orders.data";

/* 셀러 `unitDetail.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./unitDetail.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

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

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/** 원본 `unitNo` — 주문번호 + 순번(`20260623864962-1`). 하단 [변경 저장] 알림의 표시 축 */
export const unitNo = (u: OrderUnit) => {
  const parts = String(u.id).split("-");
  const last = parts[parts.length - 1];
  return `${u.no}-${/^\d+$/.test(last) ? last : "1"}`;
};

/** 머리 설명 — 같은 주문번호의 다른 처리단위와 구별되게(본사 상세와 같은 꼴) */
export const headlineOf = (u: OrderUnit) => `${unitNo(u)} · ${u.prod}`;

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
export const depositStatusOf = (u: OrderUnit) => u.depStat || "점유중";
export const careTextOf = (u: OrderUnit) =>
  careOf(u) ? "가입" : "미가입 — 손상 배상은 보증금에서 차감(본사 부담 없음)";

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
export const less = (amount: number) =>
  amount > 0 ? `${MINUS}${won(amount)}` : won(0);
export const more = (amount: number) => `+${won(amount)}`;
export const line = (
  key: string,
  label: string,
  value: string,
  extra: Partial<CalcLine> = {},
): CalcLine => ({ key, label, value, ...extra });

export const statementTitleOf = (u: OrderUnit) => `주문 명세 · ${u.no}`;

export const perDay = (amount: number) => `${won(amount)}/일`;
export const shipLine = (fee: number) => (fee > 0 ? more(fee) : "무료");

/* -------------------------------------------------------------------------
 * 상세 공용 문구 — 원본 글자 그대로
 * ---------------------------------------------------------------------- */

export const UNIT_DETAIL_COPY = {
  notFoundTitle: "찾을 수 없는 주문입니다",
  notFoundDescription: "해당 항목이 존재하지 않거나 삭제되었습니다.",
  /** 원본 `act(unitNo + ' 변경 저장')` — 표시 축 = 주문번호+순번(원본 판정 ②) */
  saved: (u: OrderUnit) => `${unitNo(u)} 변경 저장`,
  /** [배송지 변경] 창 — develop `AddressModal` 칸·문구 그대로(개발 요청 2026-11-12 16·29번) */
  addrTitle: "배송지 변경",
  addrPlaceholder: "변경할 배송지를 입력하세요",
  addrChanged: "배송지를 변경했습니다.",
  phonePlaceholder: "-없이 숫자만 입력",
  /** 주소 없이 [변경] */
  addrRequired: "주소를 입력하거나 검색해 선택해 주세요.",
  /** [주소검색]은 외부 주소 API 라 퍼블은 알림만 */
  addrSearchPending: "주소 검색은 개발 연동 시 제공됩니다.",

  /** 송장 — [송장수정](저장)과 하단 [배송중 전환]을 따로(develop · 개발 요청 18번) */
  shipmentSaved: "택배사와 송장번호를 저장했습니다.",
  shipDirtyHint: "변경한 송장 정보를 먼저 저장해 주세요.",

  /** 자체 수령 [준비 완료](develop · 개발 요청 17·29번) */
  readyDone: "준비 완료를 등록했습니다.",
  readyLead: (due: string) =>
    `고객에게 수령 준비 완료 알림(알림톡)을 보냅니다. 수령 기한 ${due}`,
  readyNext:
    "등록 뒤 주문은 '배송중'(수령 대기)으로 바뀌고, 고객이 수령하면 배송 관리에서 [배송 완료 처리]로 수령을 확인합니다.",
  readyHelp:
    "[준비 완료] → 고객 알림 → 배송 관리에서 [배송 완료 처리]로 수령 확인",
  readyNotice: (at: string, due: string) => `${at} · 수령 기한 ${due}`,
} as const;

/** 자체 수령(방문 수령) — 송장 대신 [준비 완료] */
export const isSelfPickup = (u: OrderUnit) => u.shipWay === "방문 수령";

/**
 * 출고 전 하단 버튼 — develop 발주 상세(판매·렌트 같다) 순서 그대로:
 * [배송중 전환](택배 · 준비·지연) · [준비 완료](자체 수령 · 준비·지연) · [배송 지연](이미 지연) ·
 * [배송지 변경](택배) · [주문 취소]
 */
export function preShipActions(u: OrderUnit): DetailAction[] {
  const pickup = isSelfPickup(u);
  const prepared = ["배송 준비", "배송 지연"].includes(u.stat ?? "");
  return [
    ...(prepared && !pickup
      ? [{ label: "배송중 전환", special: "ship" as const }]
      : []),
    ...(prepared && pickup
      ? [{ label: "준비 완료", special: "ready" as const }]
      : []),
    ...(u.stat === "배송 지연"
      ? [{ label: "배송 지연", special: "delayAgain" as const }]
      : []),
    ...(!pickup ? [{ label: "배송지 변경", special: "address" as const }] : []),
    { label: "주문 취소", to: "취소", tone: "criticalTonal" as const },
  ];
}

/**
 * [준비 완료]를 지금 누르면 정해질 수령 기한 — develop `readyDueDate`: 판매 = 오늘 + 7일 · 렌트 = 이용 시작일.
 * 퍼블의 「오늘」은 데모 기준일(`DEMO_TODAY`)
 */
export function readyDueOf(u: OrderUnit) {
  if (u.type === "렌트") return periodOf(u).split(" ~ ")[0];
  const d = new Date(`${DEMO_TODAY}T00:00:00`);
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

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
  | {
      special:
        | "address"
        | "track"
        | "toReturn"
        /** [배송중 전환] — 저장한 송장이 있고 고친 칸이 없을 때만(develop) */
        | "ship"
        /** 자체 수령 [준비 완료] — 확인 창 */
        | "ready"
        /** 이미 배송 지연인 건의 사유 다시 등록 — 셀렉트는 같은 값을 못 고른다 */
        | "delayAgain"
        /** 반품·교환 승인 뒤 [수거 송장 등록] — 택배사·송장 창 */
        | "collect";
    }
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

/**
 * 대여·연체 상세 대여 정보 — develop 문구 그대로(개발 요청 2026-11-12 31번).
 * 회수지 변경 요청 상자(고객 접수 요청을 [확정]하면 그 주소가 회수지) · 연장 이력 표 · 직접 반납 [반납 확인]
 */
export const RENT_USE_COPY = {
  pickupTitle: "회수지 변경 요청",
  pickupConfirm:
    "요청한 주소를 회수지로 확정합니다. 고객에게 확정 안내가 발송됩니다.",
  pickupClosed: "수거 송장이 등록되어 마감됩니다",
  pickupConfirmed: "확정된 회수지",
  pickupHelp:
    "확정하면 회수 송장은 이 주소로 발행합니다. 확정 전 요청은 송장 등록 시 자동 마감됩니다.",
  pickupDone: "회수지 변경을 확정했습니다.",
  pickupGateTitle: "회수지 변경 확정",
  returnReady: "실제 반납 물품을 받은 뒤 검수를 시작합니다.",
  returnTooEarly: "이용 종료 다음 날부터 반납 확인할 수 있습니다.",
  extensionTitle: "연장 이력",
  extensionHeads: [
    "회차",
    "신청일",
    "연장 전 예정일",
    "새 예정일",
    "추가 일수",
    "연장 금액",
    "주문번호",
    "취소",
  ],
  extensionEmpty: "연관 항목 없음",
  extensionHelp:
    "연장·취소는 고객이 사용자 몰에서 결제·실행합니다. 위약금은 정산에서 셀러 귀속입니다.",
  returnAddress: "회수지(변경 확정)",
} as const;
