import type { CalcBlock } from "./CalcBreakdown";
import { MEMBERS } from "./MemberListPage.data";
import { ORDERS, STATUS_META, type FlowStatus } from "./OrderListPage.data";
import { calcBlocksOf, findDeposit } from "./RentDepositDetailPage.data";
import { won, ymd, type DepositRow } from "./RentDepositListPage.data";

/* -------------------------------------------------------------------------
 * 대여 상세 — **도메인 층** (BabyCube 본사 운영 어드민 · 추가 작업 요청 2026-11-09 A2)
 *
 * 짝이 되는 뼈대: `RentContractDetailPage.tsx` · 경로 `/rent-detail/{처리단위}`
 * 기준: develop `rent-detail/RentDetailScreen.tsx` + 11/4 회신 부록 A(C22~C25 · C80~C83) — **조회 전용**
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `findContract(처리단위)` → 보증금 행(`DepositRow`) | `undefined`. 렌트 건만 열린다.
 *   보증금 상세와 **같은 행**이다 — 상태·검수 판정·보증금·연체 경과가 두 화면에서 같은 값이다
 * - `FLOW_STEPS` 5단계 + `stepIndexOf(row)`(-1 이면 어느 단계에도 서지 않는다)
 * - `extensionsOf(row)` 가 비면 「연장」 줄·「연장 이력」 구획이 없다
 * - 금액 상자는 `depositBlocksOf(row)` — 보증금 상세의 블록에서 줄 이름만 「변상 차감」으로
 *
 * ## 예시 데이터 — 새로 만들지 않고 주문 처리단위에서 읽는다
 * 연장 이력만 씨앗 1건(`EXTENSION_SEEDS`)을 둔다 — 회원 홍다인의 연장 결제(회원 결제 내역의 `extension` 건)와
 * 금액·결제일시가 같은 값이다(그 결제 건에서 읽는다). 주문 목록의 이용 기간은 **주문 당시 값**이라 그대로 두고,
 * 이 화면의 대여기간만 연장 후 종료일을 보인다.
 *
 * ## develop 과 다르게 둔 것
 * - 회수 상태 값이 주문 예시에 없다 — 회수가 끝난 단계(검수중 이후)는 「회수 종료」, 그 전은 develop 의
 *   빈 값 기본 표시 「수거예약」
 * - 담당 배지 글자는 「본사 / 셀러」(판정 Q10) · 변상 차감은 기본 글자색(계산 내역 공통 규칙)
 * ---------------------------------------------------------------------- */

export const LIST_PATH = "/orders-all";

export const SECTIONS = {
  flow: "진행 상태",
  info: "계약 정보",
  extensions: "연장 이력",
  proc: "발송 / 반납 / 검수",
  deposit: "보증금 정산",
  images: "발송 전 / 파손 이미지 (검수 대조)",
} as const;

export const COPY = {
  notFoundTitle: "찾을 수 없는 대여 건입니다",
  notFoundDescription: "주소가 잘못되었거나 렌트가 아닌 건일 수 있습니다.",
  unregistered: "미등록",
  beforeInspection: "검수 전",
  noPayOrder: "결제 주문 미연결",
  depositStatus: "보증금 상태:",
  /* 부록 A C25 */
  evidenceNote: "발송 전 이미지와 파손 이미지를 비교해 확인하세요.",
};

/** 처리단위 → 대여 건. 렌트가 아니거나 없으면 `undefined` */
export const findContract = (id: string): DepositRow | undefined =>
  findDeposit(id);

/** 머리 설명 — 주문 상세와 같은 꼴 */
export const headlineOf = (row: DepositRow) =>
  `${row.orderNo} · ${row.id} · ${row.product} · ${row.seller}`;

/** 계약 ID = `{주문번호}-{순번}` — 순번은 같은 주문번호 처리단위의 코드 순 */
export const contractIdOf = (row: DepositRow) => {
  const ids = ORDERS.filter((item) => item.orderNo === row.orderNo)
    .map((item) => item.id)
    .sort();
  return `${row.orderNo}-${ids.indexOf(row.id) + 1}`;
};

/** 주문번호 → 결제 상세 */
export const paymentPathOf = (orderNo: string) => `/order-detail/${orderNo}`;

/* =========================================================================
 * 진행 상태 — develop `FLOW_STEPS` 5단계
 * 연체중은 단계가 아니라 「수거 신청」 자리에 서고 아래 연체 줄이 알린다.
 * ⚠️ 대여중(연장)·검수완료·배송 전 단계·클레임 상태는 이 5단계에 없어 **어느 단계에도 서지 않는다**(develop 실동작 그대로)
 * ====================================================================== */

const FLOW_KEYS: FlowStatus[] = [
  "shipping",
  "renting",
  "pickup",
  "inspecting",
  "returned",
];

export const FLOW_STEPS = FLOW_KEYS.map((key) => ({
  key,
  ...STATUS_META[key],
}));

/**
 * 지금 서 있는 단계. 연체중은 「수거 신청」(develop 과 같다). 대여중(연장)은 「대여중」, 검수완료는 「검수중」 자리에
 * 세운다 — develop 은 두 상태를 어느 단계에도 세우지 않아 줄 전체가 꺼져 보인다(퍼블이 정한 표현)
 */
const STEP_ALIAS: Partial<Record<DepositRow["orderStatus"], FlowStatus>> = {
  overdue: "pickup",
  extended: "renting",
  inspected: "inspecting",
};

export const stepIndexOf = (row: DepositRow) =>
  FLOW_KEYS.indexOf(
    STEP_ALIAS[row.orderStatus] ?? (row.orderStatus as FlowStatus),
  );

/* =========================================================================
 * 연장 이력
 * ====================================================================== */

export interface Extension {
  unitId: string;
  /** 원 주문번호 — 결제 상세 「렌트 연장」 줄이 읽는다 */
  orderNo: string;
  seq: number;
  /** 신청일시 `YYYY-MM-DD HH:mm` = 연장 결제일시 */
  appliedAt: string;
  /** `YYYY-MM-DD` */
  prevEnd: string;
  newEnd: string;
  addedDays: number;
  fee: number;
  /** 연장 결제 주문번호 — 결제 연결이 없으면 `null` */
  payOrderNo: string | null;
  /** 연장 취소 — 예시 건은 없다 */
  cancel: { at: string; penalty: number; refund: number } | null;
}

const EXTENSION_SEEDS = [
  { unitId: "U-R12", payOrderNo: "20261015418862", addedDays: 7 },
];

const addDays = (day: string, days: number) => {
  const at = new Date(`${day}T00:00:00`);
  at.setDate(at.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
};

const PAYMENTS = MEMBERS.flatMap((member) => member.payments);

/** 씨앗 순서대로 — 같은 처리단위의 연장은 앞 연장의 종료일에서 이어진다 */
export const EXTENSIONS: Extension[] = EXTENSION_SEEDS.reduce<Extension[]>(
  (list, seed) => {
    const order = ORDERS.find((item) => item.id === seed.unitId);
    const payment = PAYMENTS.find(
      (item) => item.orderNo === seed.payOrderNo && item.extension,
    );
    if (!order || !payment) {
      throw new Error(`연장 예시 연결 실패: ${seed.unitId}`);
    }
    const before = list.filter((item) => item.unitId === seed.unitId);
    const prevEnd =
      before[before.length - 1]?.newEnd ?? order.period.split(" ~ ")[1];
    return [
      ...list,
      {
        unitId: seed.unitId,
        orderNo: order.orderNo,
        seq: before.length + 1,
        appliedAt: payment.paidAt,
        prevEnd,
        newEnd: addDays(prevEnd, seed.addedDays),
        addedDays: seed.addedDays,
        fee: payment.amount,
        payOrderNo: seed.payOrderNo,
        cancel: null,
      },
    ];
  },
  [],
);

export const extensionsOf = (row: DepositRow) =>
  EXTENSIONS.filter((item) => item.unitId === row.id);

const dot = (day: string) => day.replace(/-/g, ".");

/** 살아 있는(취소되지 않은) 연장 — 없으면 `null`(「연장」 줄을 감춘다) */
export const liveExtensionOf = (row: DepositRow) => {
  const live = extensionsOf(row).filter((item) => !item.cancel);
  if (live.length === 0) return null;
  return {
    originalEnd: dot(live[0].prevEnd),
    currentEnd: dot(live[live.length - 1].newEnd),
    count: live.length,
  };
};

/** 대여기간 `YYYY.MM.DD ~ YYYY.MM.DD` — 끝은 연장 후 종료일 */
export const periodOf = (row: DepositRow) => {
  const [start, end] = row.period.split(" ~ ");
  return `${dot(start)} ~ ${liveExtensionOf(row)?.currentEnd ?? dot(end)}`;
};

/** 연장 이력 한 행의 글자 칸 — 「연장 전 → 후」의 화살표는 뼈대가 도형으로 그린다 */
export const extensionCellsOf = (item: Extension) => ({
  seq: `${item.seq}회`,
  appliedAt: ymd(item.appliedAt),
  prevEnd: dot(item.prevEnd),
  newEnd: dot(item.newEnd),
  addedDays: `${item.addedDays}일`,
  fee: won(item.fee),
  cancel: item.cancel
    ? `${ymd(item.cancel.at)} · 위약금 ${won(item.cancel.penalty)} · 환불 ${won(item.cancel.refund)}`
    : "-",
});

/* =========================================================================
 * 발송 / 반납 / 검수
 * ====================================================================== */

/** 출고 송장 「{택배사} {송장}」 — 없으면 `null`(화면은 「미등록」) */
export const invoiceOf = (row: DepositRow) =>
  row.order.trackingNo ? `${row.order.carrier} ${row.order.trackingNo}` : null;

const PICKED_UP: FlowStatus[] = ["inspecting", "inspected", "returned"];

/** 회수 상태 — 회수가 끝난 단계는 「회수 종료」 + 도움말, 그 전은 「수거예약」 */
export const returnStatusOf = (row: DepositRow) =>
  PICKED_UP.includes(row.order.baseStatus)
    ? {
        label: "회수 종료",
        tip: "실물을 회수했거나, 끝내 돌아오지 않은(미반납) 건을 검수로 넘깁니다",
      }
    : { label: "수거예약", tip: null };

/* =========================================================================
 * 보증금 정산 — 보증금 상세와 같은 값. 줄 이름만 develop 「변상 차감」
 * ====================================================================== */

export const depositBlocksOf = (row: DepositRow): CalcBlock[] =>
  calcBlocksOf(row).map((block) => ({
    ...block,
    lines: block.lines.map((line) =>
      line.key === "deduction" ? { ...line, label: "변상 차감" } : line,
    ),
  }));
