import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S12 셀러 정산 — **도메인 층** (BabyCube 본사 운영 어드민)
 * 원본 어드민: `_plan/babycube-admin/chunks/2o7h5tt6cgkxc.js` (`/settle-seller`)
 *
 * 짝이 되는 뼈대: `SellerSettlementPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 이 화면이 무엇인가
 * 정산 회차별로 셀러 지급액을 확정하고 지급 상태를 진행시키는 **정산의 시작점**.
 * 한 행이 "회차 × 셀러" 하나이고, 그 행의 돈은 여섯 조각으로 쪼개져 있다 —
 * 거래액에서 셀러쿠폰·수수료·PG수수료·취소반품차감을 빼고 안심케어 복원비를 더한 것이 지급액이다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(`YYYY-MM-DD HH:mm`) 를 반드시 갖는다.
 *   ⚠️ 이 화면에는 기간 필터가 없다(원본 `filter` 에 `date` 축이 아예 없다).
 *   `date` 는 **회차 마감 일시**로 미리보기에서만 쓴다 — 계약을 지키되 거짓 필터를 만들지 않는다
 * - `STATUS_META` 의 키는 `Settlement["status"]` 와 정확히 일치한다
 * - `FILTERS[0].value` 는 `"all"` — 뼈대가 필터 해제로 취급한다
 * - **지급액은 데이터가 계산한다** (`payoutOf`). 뼈대는 렌더만 한다 —
 *   파생값을 뼈대에서 더하면 표와 미리보기가 각자 계산해 서로 어긋난다
 * - **요약 4값도 데이터가 계산한다** (`ROUND_SUMMARY` → `SUMMARY_STATS`). 아래 "숫자 정합" 참고
 * - **부호 표기도 데이터가 정한다** (`deduct` = 차감이라 `-`, `credit` = 보전이라 `+`).
 *   뼈대가 `"-" + won(x)` 를 조립하면 "0원"에도 마이너스가 붙는다
 *
 * ## 원본 대조 (`/settle-seller`)
 * 가져온 것: 컬럼 11개의 이름·순서·정렬·고정열 · 상태 어휘 6종 · 상태 설명(`statusTips`) 문구 ·
 * 금액 부호 규칙(`-수수료` / `+안심케어`) · **없는 금액은 `0원` 이 아니라 `-`** ·
 * 요약 **4값**의 이름·순서·단위(거래액 → 수수료 수익 → 정산 대상 → 지급 예정 총액) ·
 * 요약 섹션 제목 `YYYY년 M월 정산 요약` 과 부제 `지급일 YYYY.MM.DD` · 엑셀 파일명 `셀러정산`.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * - **요약 카드의 증감(±%)·비교 기준 문구·아이콘.** 원본 타일은 `l`(라벨)·`v`(값)뿐이다.
 *   한때 "본사 수수료 수익 -3.6% / 수수료율 13.5% 였던 6월 회차 대비" 같은 문장을 붙였는데,
 *   **이전 회차 전체 데이터가 없어 계산할 수 없는 저술값**이었다
 * - **행 액션 4종**(`확인요청 발송` · `지급 처리` · `수정 명세 재발송` · `협의 결론 기록`)과
 *   그 확인 모달. 원본 `처리` 컬럼은 상세 페이지로 가는 **링크 하나**다.
 *   특히 `확인요청 발송` 은 원본 설명과 정면으로 어긋났다 — "익월 1일에 **자동 발송**"이라
 *   본사가 누르는 버튼이 아니다
 * - **`정산 대상 N개사` PageHeader 배지** — 원본에서는 요약의 세 번째 항목이다. 제자리로 되돌렸다
 * - **`정산 흐름` 도움말 툴팁** — 원본에 없는 지어낸 문장이었다.
 *   상태 설명은 원본 `statusTips` 가 이미 갖고 있어 `STATUS_META.description` 으로 들어간다
 *
 * ## 숫자 정합 (⚠️ 손으로 적지 말 것)
 * 요약 4값은 전부 **현재 회차 행들의 합에서 파생**된다(`ROUND_SUMMARY`).
 * 한때 요약을 손으로 적었다가 "본사 수수료 수익 = 거래액의 10.0%"인데 표의 모든 행은
 * 12.0% 인 화면이 나왔다. 합계를 손으로 적으면 반드시 어긋난다.
 *
 * ## ⛔ 다른 화면과 맞물린 금액 (바꾸려면 셋을 함께 바꾼다)
 * - `2026-06-SEL0142` 의 지급액 206,268,000원 == S15 `ST-202606-0002` 의 지급액
 * - `2026-07-SEL0142` 의 수수료 34,152,000원 == S16 `TX-202607-0001` 의 공급가액
 * ---------------------------------------------------------------------- */

/**
 * 정산 회차의 진행 상태 6종.
 * 회차 마감 → 셀러 확인 → 지급으로 흐르고, 이의제기·보류가 옆길이다.
 */
export type SettlementStatus =
  "waiting" | "requested" | "agreed" | "paid" | "disputed" | "held";

/**
 * 지급액을 이루는 **여섯 조각**. 표의 금액 컬럼 6개가 이것이고, 순서도 원본 그대로다.
 *
 * 행 하나에도 회차 전체 합계에도 똑같이 쓰이므로 따로 뽑아 둔다 —
 * 이 덕분에 `payoutOf` 하나가 행의 지급액과 회차의 지급 예정 총액을 **같은 식으로** 계산한다.
 */
export interface SettlementMoney {
  /** 거래액(정가) — 셀러가 판 금액의 정가 합 */
  listAmount: number;
  /** 셀러쿠폰 — 셀러가 부담한 할인. **차감** */
  sellerCoupon: number;
  /** 본사 수수료. **차감** */
  platformFee: number;
  /** PG 수수료. **차감** */
  pgFee: number;
  /** 취소·반품 차감. **차감** */
  clawback: number;
  /** 안심케어 복원비 보전. **가산** (승인된 청구만 들어온다 — S14) */
  careComp: number;
}

export interface Settlement extends SettlementMoney {
  /** 고유 키 — `회차-셀러` 조합 (예: `2026-07-SEL0142`) */
  id: string;
  /** 정산 회차 표시값 */
  round: string;
  seller: string;
  status: SettlementStatus;
  /** 회차 마감 일시 `YYYY-MM-DD HH:mm` */
  date: string;
}

/**
 * 상태값 → 표시 라벨 · Tag tone · 상태 설명.
 *
 * `description` 은 원본 `statusTips` 문구다 — 원본은 상태 카드의 `i` 툴팁으로 띄우지만
 * 마우스를 올려야 보이는 것보다 상시 노출이 낫다(선택한 상태의 설명이 필터 아래 뜬다).
 *
 * ## 색 배정 근거 (`docs/screen-templates.md` §3-1)
 * 상태가 6개고 상태를 뜻하는 tone 은 4종이라 겹침이 불가피하다. 아래 순서로 배정했다.
 *
 * | 상태     | 지금 누가 무엇을 해야 하나          | tone       |
 * | -------- | ----------------------------------- | ---------- |
 * | 지급대기 | 아무도 — 익월 1일 자동 발송         | `default`  |
 * | 확인요청 | 셀러 (3일 무응답이면 자동 확인완료) | `success`  |
 * | 확인완료 | **본사가 지급을 실행한다**          | `warning`  |
 * | 지급완료 | 아무도 — 정상 종결                  | `default`  |
 * | 이의제기 | **본사가 검토해 수정 명세를 낸다**  | `critical` |
 * | 보류     | **본사가 협의 결론을 기록한다**     | `critical` |
 *
 * - `warning` 은 "지금 주의를 요하는 상태"가 독점한다 → 확인완료(지급 실행 대기)
 * - `critical` 은 비정상 경로가 나눠 쓴다 → 이의제기 · 보류.
 *   ⚠️ **정상 종결(지급완료)을 이 둘과 같은 색으로 묶지 않는다.** 목록을 훑을 때
 *   "손이 가야 하는 회차가 몇 개인가"가 라벨을 읽기 전에 보여야 한다
 * - 겹치는 쪽(지급대기 ↔ 지급완료)은 **둘 다 지금 할 일이 없는 상태**라 가장 덜 아프다.
 *   라벨이 항상 함께 나오므로 구별은 글자가 한다
 *
 * ⚠️ 원본 색(`b-prog`/`b-done`/`b-exc`)을 옮기지 않았다 — 원본은 확인요청·확인완료·보류를
 * 전부 `b-prog` 로 묶어 "지금 본사가 지급해야 하는 회차"가 보이지 않는다.
 */
export const STATUS_META: Record<
  SettlementStatus,
  { label: string; tone: TagTone; description: string }
> = {
  waiting: {
    label: "지급대기",
    tone: "default",
    description:
      "회차가 마감돼 명세가 만들어진 단계입니다. 익월 1일에 확인요청이 자동 발송됩니다.",
  },
  requested: {
    label: "확인요청",
    tone: "success",
    description:
      "셀러에게 명세를 보내 확인을 기다리는 단계입니다. 확인·이의제기 기한은 3일이며, 무응답이면 자동으로 확인완료가 됩니다.",
  },
  agreed: {
    label: "확인완료",
    tone: "warning",
    description: "셀러가 명세에 동의했습니다. 지급일(매월 10일)에 지급합니다.",
  },
  paid: {
    label: "지급완료",
    tone: "default",
    description:
      "지급이 끝나 회차가 종결됐습니다. 세금계산서가 함께 발행됩니다.",
  },
  disputed: {
    label: "이의제기",
    tone: "critical",
    description:
      "셀러가 명세에 이의를 제기했습니다(회차당 1회). 본사가 검토해 [수정 명세 재발송]을 하면 확인요청으로 돌아갑니다 — 확인완료는 셀러가 다시 누릅니다.",
  },
  held: {
    label: "보류",
    tone: "critical",
    description:
      "9일까지 합의되지 않아 외부 협의로 넘어간 회차입니다. 협의 결론 요지를 기록한 뒤 익영업일에 지급합니다.",
  },
};

export const SETTLEMENTS: Settlement[] = [
  {
    id: "2026-07-SEL0142",
    round: "2026년 7월",
    seller: "베베마켓",
    status: "agreed",
    listAmount: 284_600_000,
    sellerCoupon: 6_820_000,
    platformFee: 34_152_000,
    pgFee: 6_395_000,
    clawback: 12_480_000,
    careComp: 1_240_000,
    date: "2026-07-31 23:59",
  },
  {
    id: "2026-07-SEL0188",
    round: "2026년 7월",
    seller: "리틀스텝",
    status: "disputed",
    listAmount: 168_200_000,
    sellerCoupon: 4_040_000,
    platformFee: 20_184_000,
    pgFee: 3_780_000,
    clawback: 9_620_000,
    careComp: 860_000,
    date: "2026-07-31 23:59",
  },
  {
    id: "2026-07-SEL0203",
    round: "2026년 7월",
    seller: "맘스케어",
    status: "requested",
    listAmount: 96_400_000,
    sellerCoupon: 2_310_000,
    platformFee: 11_568_000,
    pgFee: 2_167_000,
    clawback: 3_140_000,
    careComp: 0,
    date: "2026-07-31 23:59",
  },
  {
    id: "2026-07-SEL0311",
    round: "2026년 7월",
    seller: "아이누리",
    status: "held",
    listAmount: 74_800_000,
    sellerCoupon: 1_790_000,
    platformFee: 8_976_000,
    pgFee: 1_681_000,
    clawback: 14_220_000,
    careComp: 2_480_000,
    date: "2026-07-31 23:59",
  },
  {
    id: "2026-07-SEL0357",
    round: "2026년 7월",
    seller: "쁘띠하우스",
    status: "waiting",
    listAmount: 41_900_000,
    sellerCoupon: 1_000_000,
    platformFee: 5_028_000,
    pgFee: 942_000,
    clawback: 1_860_000,
    careComp: 0,
    date: "2026-07-31 23:59",
  },
  {
    /*
     * 종결된 이전 회차. 원본 요약이 "최신 회차 + 미종결 이전 회차"를 한 표에 섞어
     * 보여준다고 말하므로 지난 회차 행을 하나 남긴다.
     *
     * ⛔ 이 행의 지급액 206,268,000원은 **S15 `ST-202606-0002` 의 지급액과 같은 돈이다.**
     *    한쪽만 고치면 두 화면이 서로 다른 금액을 말한다.
     */
    id: "2026-06-SEL0142",
    round: "2026년 6월",
    seller: "베베마켓",
    status: "paid",
    listAmount: 262_400_000,
    sellerCoupon: 6_290_000,
    platformFee: 35_424_000,
    pgFee: 5_898_000,
    clawback: 10_140_000,
    careComp: 1_620_000,
    date: "2026-06-30 23:59",
  },
];

/**
 * 요약이 대상으로 삼는 회차. 원본은 서버가 "처리 대상 회차"를 골라 주지만,
 * 여기서는 표의 행에서 골라야 요약과 표가 어긋나지 않는다.
 */
export const CURRENT_ROUND = "2026년 7월";

/** 지급일 — 원본 부제 `지급일 YYYY.MM.DD`. 매월 10일이 규칙이다 */
export const PAYOUT_ON = "2026.08.10";

/** 엑셀 파일명 — 원본 `exportName: "셀러정산"` */
export const EXPORT_NAME = "셀러정산";

/** 표의 주요 수치 포맷. 단위가 도메인이라 여기 둔다 (원 · 건 · 개사 …) */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/**
 * 단위를 뗀 수치. 요약 상자가 **값과 단위를 다른 크기로** 그리므로
 * (원본 `dsv`/`dsu`) 붙여 둔 문자열로는 쓸 수 없다.
 */
export const num = (value: number) => value.toLocaleString("ko-KR");

/**
 * 지급액 = 거래액 − 셀러쿠폰 − 수수료 − PG수수료 − 취소·반품 차감 **+ 안심케어 보전**.
 *
 * 안심케어만 부호가 반대다 — 승인된 복원비는 본사가 셀러에게 **보전**해 주는 돈이라
 * 지급액을 늘린다(S14 안심케어 승인에서 확정된다).
 * 표·미리보기·요약이 모두 이 함수를 부른다. 뼈대에서 따로 더하면 세 곳이 어긋난다.
 */
export const payoutOf = (row: SettlementMoney) =>
  row.listAmount -
  row.sellerCoupon -
  row.platformFee -
  row.pgFee -
  row.clawback +
  row.careComp;

/**
 * **현재 회차 요약 — 표의 행에서 합산한 파생값이다.**
 *
 * 원본은 서버(`settlementsApi.summary()`)가 내려 주지만, 화면 하나에서 요약과 표가
 * 다른 출처를 보면 반드시 어긋난다. 여기서는 표의 현재 회차 행을 그대로 더한다 —
 * 사용자가 "정산 대상 5개사"를 보고 표를 세어도 5줄이고, 수수료 합을 두드려 봐도 맞는다.
 */
export const ROUND_SUMMARY = SETTLEMENTS.filter(
  (row) => row.round === CURRENT_ROUND,
).reduce(
  (sum, row) => ({
    sellerCount: sum.sellerCount + 1,
    listAmount: sum.listAmount + row.listAmount,
    sellerCoupon: sum.sellerCoupon + row.sellerCoupon,
    platformFee: sum.platformFee + row.platformFee,
    pgFee: sum.pgFee + row.pgFee,
    clawback: sum.clawback + row.clawback,
    careComp: sum.careComp + row.careComp,
  }),
  {
    sellerCount: 0,
    listAmount: 0,
    sellerCoupon: 0,
    platformFee: 0,
    pgFee: 0,
    clawback: 0,
    careComp: 0,
  },
);

/**
 * 처리 대상 정산 요약 **4값** — 원본 `settleSeller.stats` 그대로다.
 *
 * ## 순서·단위가 원본이다
 * `입점사 거래액(정가) → 본사 수수료 수익 → 정산 대상(개사) → 지급 예정 총액`.
 * 읽는 순서가 **"얼마가 팔렸나 → 본사가 얼마를 가져가나 → 몇 개사에 → 얼마가 나가나"** 로
 * 맞아떨어진다. 원본이 마지막 값에만 강조(`st hl`)를 준 것도 그래서다.
 *
 * ⚠️ `value` 는 전부 **파생값**이다(`ROUND_SUMMARY`). 저술값이 하나도 없어야 한다 —
 * 표의 현재 회차 5행을 더한 것이 곧 이 네 값이다.
 *
 * ⚠️ 증감(±%)·비교 기준 문구를 **붙이지 않는다.** 원본에 없고, 이전 회차 전체 데이터가
 * 없어 계산할 수도 없다(6월 행은 베베마켓 하나뿐이다).
 */
export const SUMMARY_STATS = [
  {
    label: "입점사 거래액(정가)",
    value: num(ROUND_SUMMARY.listAmount),
    unit: "원",
  },
  {
    label: "본사 수수료 수익",
    value: num(ROUND_SUMMARY.platformFee),
    unit: "원",
  },
  { label: "정산 대상", value: num(ROUND_SUMMARY.sellerCount), unit: "개사" },
  {
    label: "지급 예정 총액",
    value: num(payoutOf(ROUND_SUMMARY)),
    unit: "원",
  },
];

/**
 * **금액이 없는 칸의 표기.** 원본 그대로 `0원` 이 아니라 `-` 를 쓴다.
 * 금액 컬럼이 6개라 `0원` 이 섞이면 "0을 정산했다"처럼 읽히고 눈이 그 칸에서 멈춘다.
 */
export const NO_AMOUNT = "-";

/**
 * **차감 항목 표기 규칙.** 셀러쿠폰·수수료·PG수수료·취소반품차감이 쓴다.
 * 0 원에는 부호를 붙이지 않는다 — `-0원` 은 읽는 사람을 멈추게 한다.
 */
export const deduct = (value: number) =>
  value === 0 ? NO_AMOUNT : "-" + won(value);

/** **가산 항목 표기 규칙.** 안심케어 복원비 보전이 쓴다 */
export const credit = (value: number) =>
  value === 0 ? NO_AMOUNT : "+" + won(value);

/** 상태 칩. 첫 항목은 반드시 `"all"`(필터 해제) — 원본 `chip.all: "전체"` */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "waiting", label: "지급대기" },
  { value: "requested", label: "확인요청" },
  { value: "agreed", label: "확인완료" },
  { value: "paid", label: "지급완료" },
  { value: "disputed", label: "이의제기" },
  { value: "held", label: "보류" },
];

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 원본 기본값 10 이지만 **샘플이 6건뿐이라 페이징 동작이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 4;
