import { MEMBERS } from "./MemberListPage.data";
import { ORDERS } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * 포인트 관리 (목록) — **도메인 층** (BabyCube 본사 운영 어드민)
 * 기준 기획: v0.4 `plan-members/proto.html` 3954~4064 (`POINT_LEDGER` · `ptSummaries` · `SCREENS.points`)
 *
 * 짝이 되는 뼈대: `PointListPage.tsx` · 상세: `PointDetailPage.*`(`/points/{회원 id}`)
 *
 * ## 이 화면이 무엇인가 (조회 전용)
 * 포인트 **원장**(지급·사용·회수·수동조정, 추가 전용 감사 기록) 하나에서 회원별 합계를 뽑아 본다
 * (원본 `ptSummaries`). 목록에는 행 액션이 없다 — 수동 정정은 상세의 [포인트 조정]에서.
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할                    | 실물 이름                                 |
 * | ----------------------- | ----------------------------------------- |
 * | 원장 한 줄 · 샘플       | `PointEntry` · `POINT_LEDGER`             |
 * | 회원별 합계(표 한 행)   | `PointSummary` · `POINT_SUMMARIES`        |
 * | 검색 대상 · 검색 판정   | `SEARCH_FIELDS` · `matchesKeyword`        |
 * | 검색조건 요약           | `filterSummary`                           |
 * | 단위 포맷               | `point` · `signedPoint` · `ymdhm` · `ymd` |
 * | 상세 경로               | `LIST_PATH` · `detailPathOf`              |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 표 한 행 = `PointSummary`. 키는 `id`(회원 아이디 = 이메일) — 상세 경로가 이 값을 쓴다
 * - `updatedAt`(`YYYY-MM-DD HH:mm`)이 기간축이다(원본 「업데이트 기간」)
 * - `POINT_SUMMARIES` 의 **배열 순서가 기본 순서**다 — 원장 첫 등장 순 = 최근 업데이트 순(원본)
 * - 숫자 셋(보유·누적 지급·누적 차감)은 **원장에서 계산한다** — 따로 적지 않는다.
 *   보유 = 원장 합 = 누적 지급 − 누적 차감 · 상세 이력 마지막 행의 잔여 = 보유
 *
 * ## 샘플 — 다른 화면과 맞물린다 (형제 「구매자 = MEMBERS」 원칙)
 * - 회원 = `MEMBERS` 의 사람(이름·이메일을 거기서 읽는다). 11명 · 원장 25행 · 구분 4종 모두
 * - **사용 2건 = 주문의 포인트 할인 그대로** — U-R11 안지성 2,000P · U-S35 노하린 3,000P.
 *   금액·시각·주문번호를 `ORDERS` 에서 읽는다(정산이 같은 값을 읽는다 — 본사 부담)
 * - 지급 = 리뷰(포토 500P · 일반 100P)만, 연관 거래는 그 회원의 실제 주문. 리뷰는 **판매 구매확정 · 렌트 반납완료 뒤**
 *   (판정 Q12 · 디자인 §1) — 그 처리단위 `confirmedAt` 다음 날(같은 시각 · U-S32 는 회수 전이라 같은 날 저녁).
 *   ⚠️ 처리단위가 아직 확정 전인 6행은 그대로다(아래 `SEEDS` 머리 — 처리단위 교체·행 삭제 미정)
 * - 수동조정 4건(지급 3 · 차감 1) — 사유는 조정 팝업 목록 안의 것 + 메모(원본 D4: 팝업으로 못 만드는 행을 두지 않는다)
 * - 회수 1건(오세린 — 지급 후 회수로 보유 0P)
 * - 시연 기준일(2026-10-19) 이후 사건 없음
 * - ⚠️ 회원 상세 「포인트」(`MemberListPage.data.ts` `points`)는 **이 원장 합과 같은 값**으로 적어 두었다
 *   (순환 import 를 피하려 계산 대신 값 — 어긋나면 `PointListPage.test.tsx` 「원장 합 = 회원 상세」가 잡는다)
 *
 * ## 기획 확인 필요 (원본 그대로 둠)
 * - 사용 한도 문구 충돌 — 화면 설명 「소계 50%」 vs 코드 주석 「주문 소계의 100%」(우리 샘플은 둘 다 안에 든다)
 * - 리뷰 회수 — 리뷰 관리는 「자동 회수 없음, 포인트 관리에서 수동 처리」인데 원본 원장에는
 *   「리뷰 삭제로 회수 · 시스템 자동」 행이 있다. 원본대로 그 행을 둔다
 * - 지급 원천 — 「지급 = 리뷰만」인데 원장·팝업 사유에 이벤트·CS·「포인트 충전」 등이 있다
 * - 어휘 — 목록 「누적 차감」 vs 상세 「총 사용(차감)」, 설명 「적립」 vs 화면 「지급」 — 화면 문구 그대로
 *
 * ## 원본과 다르게 둔 곳 (공통 규칙)
 * 검색조건 바는 펼친 채로 열리고 입력 즉시 적용 · 행 어디를 눌러도 상세로 · 열 왼쪽 정렬
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 엑셀 다운로드(`EXPORT_SPEC` 미등록) · 회원명 클릭 미리보기 모달 · 회원 등급 축 · 검색 대상 「전체」 ·
 * 회원 샘플에 없는 사람 6명(김보라 등)
 * ---------------------------------------------------------------------- */

export const LIST_PATH = "/points";
/** 회원 id 는 이메일이라 `@`·`.` 이 들어간다 — 회원 상세 경로와 같은 방식으로 감싼다 */
export const detailPathOf = (memberId: string) =>
  `${LIST_PATH}/${encodeURIComponent(memberId)}`;

/* -------------------------------------------------------------------------
 * 원장 — 원본 `POINT_LEDGER`(4021). **최신이 앞**(추가 전용 — 새 행은 맨 앞에 붙는다)
 * ---------------------------------------------------------------------- */

export type PointKind = "earn" | "use" | "clawback" | "manual";

/** 구분 — 원본 `POINT_KO`. 배지는 무채색(사용자 결정 — 원본은 4색) */
export const KIND_LABEL: Record<PointKind, string> = {
  earn: "지급",
  use: "사용",
  clawback: "회수",
  manual: "수동조정",
};

export type PointActor = "시스템 자동" | "본사 관리자";

export interface PointEntry {
  /** 원장 번호 `PT-YYMM-NN` — 행 키 */
  id: string;
  /** 회원 아이디(이메일) = `MEMBERS.id` */
  memberId: string;
  kind: PointKind;
  /** 내용 — 원본 `reason` */
  reason: string;
  /** 관리자 메모 — 수동조정만. 없으면 빈 문자열 */
  memo: string;
  /** 연관 거래(주문번호 14자리) — 없으면 빈 문자열 */
  orderNo: string;
  /** 지급 `+` · 사용·회수·차감 `-` */
  amount: number;
  /** 처리 일시 `YYYY-MM-DD HH:mm` */
  at: string;
  by: PointActor;
}

type Seed = Omit<PointEntry, "id">;

const orderOf = (unit: string) => {
  const order = ORDERS.find((item) => item.id === unit);
  if (!order) throw new Error(`포인트 원장: 주문 처리단위가 없습니다 ${unit}`);
  return order;
};

/** 리뷰 지급 — 포토 500P · 일반 100P(원본 정책). 회원 = 그 주문의 구매자 */
const review = (at: string, unit: string, photo: boolean): Seed => {
  const order = orderOf(unit);
  return {
    memberId: order.buyerId,
    kind: "earn",
    reason: photo ? "포토 후기 작성" : "일반 후기 작성",
    memo: "",
    orderNo: order.orderNo,
    amount: photo ? 500 : 100,
    at,
    by: "시스템 자동",
  };
};

/** 결제 사용 — **주문의 포인트 할인 그대로**(금액·결제 시각·주문번호) */
const orderUse = (unit: string, reason: string): Seed => {
  const order = orderOf(unit);
  return {
    memberId: order.buyerId,
    kind: "use",
    reason,
    memo: "",
    orderNo: order.orderNo,
    amount: -order.point,
    at: order.date,
    by: "시스템 자동",
  };
};

/** 리뷰 삭제 회수 — ⚠️ 처리자 「시스템 자동」은 원본 그대로(기획 확인 필요 — 위 머리 주석) */
const clawback = (at: string, unit: string, amount: number): Seed => {
  const order = orderOf(unit);
  return {
    memberId: order.buyerId,
    kind: "clawback",
    reason: "리뷰 삭제로 회수",
    memo: "",
    orderNo: order.orderNo,
    amount: -amount,
    at,
    by: "시스템 자동",
  };
};

/** 수동조정 — 조정 팝업으로 남긴 행(사유 = 팝업 목록 · 메모 필수) */
const manual = (
  at: string,
  memberId: string,
  reason: string,
  memo: string,
  amount: number,
): Seed => ({
  memberId,
  kind: "manual",
  reason,
  memo,
  orderNo: "",
  amount,
  at,
  by: "본사 관리자",
});

/*
  최신이 앞이다. 같은 분(分)의 두 행이 생기면 **배열 뒤쪽이 먼저** 일어난 것으로 본다(원본 5326) — 상세의 잔여 포인트가
  이 순서로 쌓인다(지금 예시에는 같은 분 행이 없다)
*/
const SEEDS: Seed[] = [
  /* 리뷰 지급은 처리단위가 반납완료·구매확정된 뒤만(판정 Q12) — 확정 전 처리단위에 붙어 있던 6행
     (U-R09 · U-R22 · U-S07 · U-S08 · U-R10 · U-R17)은 뺐다(퍼블이 정함 · 2026-11-05) */
  review("2026-10-15 17:30", "U-S09", true),
  review("2026-10-14 10:05", "U-R19", false),
  orderUse("U-R11", "렌트 결제 사용"),
  manual(
    "2026-10-06 14:00",
    "dain.hong@example.com",
    "CS 보상 지급",
    "CS 응대 지연 보상",
    1000,
  ),
  review("2026-10-05 15:25", "U-S10", true),
  clawback("2026-10-02 10:05", "U-S32", 500),
  review("2026-10-01 20:40", "U-S31", true),
  review("2026-10-01 19:30", "U-S32", true),
  manual(
    "2026-10-01 10:00",
    "jisung.ahn@example.com",
    "프로모션 지급",
    "가을맞이 이벤트 지급",
    2000,
  ),
  /* U-R18 백도윤 리뷰 지급은 없다 — 고객 문의 Q-8835 「반납(10-09) 후 포토 리뷰 적립금 미지급」과 맞춘다 */
  review("2026-09-23 12:00", "U-R32", true),
  manual(
    "2026-09-23 10:30",
    "hajun.seo@example.com",
    "관리자 회수",
    "일반 후기 오지급 정정 (포토 500P → 일반 100P)",
    -400,
  ),
  review("2026-09-22 13:20", "U-R31", true),
  review("2026-09-20 19:20", "U-S35", true),
  review("2026-09-20 18:10", "U-R30", true),
  review("2026-09-18 19:30", "U-R28", true),
  review("2026-09-18 16:00", "U-S34", true),
  review("2026-09-16 11:00", "U-R29", false),
  orderUse("U-S35", "구매 결제 사용"),
  manual(
    "2026-08-14 10:00",
    "harin.noh@example.com",
    "프로모션 지급",
    "여름맞이 이벤트 지급",
    3000,
  ),
];

/** 원장 번호 — 오래된 것부터 1번(원본 `PT-2606-01` 꼴) */
export const POINT_LEDGER: PointEntry[] = SEEDS.map((seed, index) => ({
  ...seed,
  id: `PT-${seed.at.slice(2, 4)}${seed.at.slice(5, 7)}-${String(SEEDS.length - index).padStart(2, "0")}`,
}));

/** 그 회원의 원장 합 = 보유 포인트(원본 `ptAdjBalance`) */
export const ledgerBalanceOf = (memberId: string) =>
  POINT_LEDGER.filter((entry) => entry.memberId === memberId).reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );

/* -------------------------------------------------------------------------
 * 회원별 합계 — 원본 `ptSummaries`(4044)
 * ---------------------------------------------------------------------- */

export interface PointSummary {
  /** 회원 아이디(이메일) — 행 키 · 상세 경로 */
  id: string;
  name: string;
  /** 아이디(이메일) 열 — 회원이 없으면 `-`(원본) */
  email: string;
  /** 보유 = 원장 합 */
  balance: number;
  /** 누적 지급 = 양수 합 */
  granted: number;
  /** 누적 차감 = 음수 절댓값 합(사용·회수·수동 차감) */
  deducted: number;
  /** 업데이트 일시 = 가장 늦은 처리 일시 */
  updatedAt: string;
}

const summarize = (ledger: PointEntry[]): PointSummary[] => {
  const byMember = new Map<string, PointSummary>();
  for (const entry of ledger) {
    let row = byMember.get(entry.memberId);
    if (!row) {
      const member = MEMBERS.find((item) => item.id === entry.memberId);
      row = {
        id: entry.memberId,
        name: member?.name ?? entry.memberId,
        email: member?.id ?? "-",
        balance: 0,
        granted: 0,
        deducted: 0,
        updatedAt: "",
      };
      byMember.set(entry.memberId, row);
    }
    if (entry.amount >= 0) row.granted += entry.amount;
    else row.deducted -= entry.amount;
    row.balance += entry.amount;
    if (entry.at > row.updatedAt) row.updatedAt = entry.at;
  }
  return [...byMember.values()];
};

/** 표의 행 — 원장 첫 등장 순(= 최근 업데이트 순) */
export const POINT_SUMMARIES = summarize(POINT_LEDGER);

/* -------------------------------------------------------------------------
 * 검색조건 — 원본 `FILTERS.points`(2065~2068): 업데이트 기간 · 검색(회원명/아이디)
 * ---------------------------------------------------------------------- */

export type PointSearchField = "mem" | "email";

/** 검색 대상 — 원본 `fieldOpts` 그대로, **첫 항목이 기본**이고 「전체」는 없다 */
export const SEARCH_FIELDS: { value: PointSearchField; label: string }[] = [
  { value: "mem", label: "회원명" },
  { value: "email", label: "아이디(이메일)" },
];

export const SEARCH_PLACEHOLDER = "회원명·아이디(이메일) 검색";
export const DATE_LABEL = "업데이트 기간";

/** 검색 판정 — 대소문자 무시 `includes`(원본 2597) */
export const matchesKeyword = (
  row: PointSummary,
  field: PointSearchField,
  keyword: string,
) => {
  const word = keyword.trim().toLowerCase();
  if (word === "") return true;
  const value = field === "email" ? row.email : row.name;
  return value.toLowerCase().includes(word);
};

export const NO_FILTER_TEXT = "조건 없음 (전체)";

const dotDay = (value: Date) =>
  `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, "0")}.${String(value.getDate()).padStart(2, "0")}`;

/** 검색조건 요약 한 줄 — 형제 목록과 같은 꼴 */
export const filterSummary = ({
  from,
  to,
  field,
  keyword,
}: {
  from?: Date;
  to?: Date;
  field: PointSearchField;
  keyword: string;
}): string => {
  const parts: string[] = [];
  if (from) {
    parts.push(`${DATE_LABEL} ${dotDay(from)}${to ? `~${dotDay(to)}` : ""}`);
  }
  if (keyword.trim() !== "") {
    const label = SEARCH_FIELDS.find((item) => item.value === field)?.label;
    parts.push(`${label} «${keyword.trim()}»`);
  }
  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};

export const EMPTY_TITLE = "해당 조건의 항목이 없습니다";
export const EMPTY_DESCRIPTION =
  "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.";

/* -------------------------------------------------------------------------
 * 단위 — 1P = 1원이지만 이 화면들의 단위는 `P`(원본). 회원 상세는 원본대로 「원」
 * ---------------------------------------------------------------------- */

export const point = (value: number) => `${value.toLocaleString("ko-KR")}P`;

/**
 * 부호 표기(읽기 전용) — 지급 `+500P` · 차감 `−600P`(U+2212, 붙여 씀) · 0 은 부호 없이 `0P`.
 * 정산 명세와 같은 꼴(공통 결정 2026-11-03). 원본은 `+500P` · `-600P`. 원장 부호는 그대로다
 */
export const signedPoint = (value: number) =>
  value === 0 ? point(0) : `${value < 0 ? "−" : "+"}${point(Math.abs(value))}`;

/** 처리·업데이트 일시 — 분까지, 점 구분(원본) */
export const ymdhm = (value: string) =>
  value.slice(0, 16).replace(/-/g, ".").replace("T", " ");

export const ymd = (value: string) => value.slice(0, 10).replace(/-/g, ".");

export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];
