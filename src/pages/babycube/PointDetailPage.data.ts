import { MEMBERS, type Member } from "./MemberListPage.data";
import {
  LIST_PATH,
  POINT_LEDGER,
  ymd,
  type PointEntry,
} from "./PointListPage.data";

/* -------------------------------------------------------------------------
 * 포인트 현황 상세 — **도메인 층** (BabyCube 본사 운영 어드민)
 * 기준 기획: v0.4 `plan-members/proto.html` 5320~5353 (`DETAILS.pointDetail`) · 조정 팝업 3964~4018
 *
 * 짝이 되는 뼈대: `PointDetailPage.tsx` · 목록: `PointListPage.*`(원장·단위 포맷을 그쪽과 공유)
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할                       | 실물 이름                                  |
 * | -------------------------- | ------------------------------------------ |
 * | 대상 찾기                  | `findPointMember`                          |
 * | 이력·잔여·요약 계산        | `pointStatusOf`                            |
 * | 구역 제목 · 머리 부제      | `SECTIONS` · `headlineOf`                  |
 * | 조정 팝업 사유·문구·판정   | `ADJUST_*` · `adjustErrorOf`               |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 경로 마지막 조각 = 회원 아이디(이메일). 회원이 없으면 `undefined` → 「찾을 수 없음」
 *   (원장 회원은 모두 `MEMBERS` 에 있다 — 목록 테스트가 고정한다)
 * - 원장이 0행인 회원도 그린다 — 보유 0P · 지급 기간 `-` · 빈 이력(원본 5323)
 * - `pointStatusOf().history` 는 **최신순**이고, 각 행 `remaining` 은 그 행까지의 잔액이다.
 *   마지막(가장 오래된 것부터 쌓은 끝) 잔액 = 보유
 * - 조정 확인 판정은 `adjustErrorOf` 하나 — 뼈대는 메시지를 입력칸 아래에 둔다
 *
 * ## 원본과 다르게 둔 곳 (사용자 결정 2026-11-03)
 * - 머리를 그린다(제목 + 회원명 · 아이디) · 구역 접기 — 형제 상세 틀(원본은 옛 `dt-card` 틀, 머리 없음)
 * - 조정 [확인]은 **알림만** — 원장·숫자를 바꾸지 않는다(퍼블 범위. 원본은 원장 맨 앞에 행 추가)
 * - 보유 초과 차감 오류는 **입력칸 아래**(원본은 토스트) — 형제 「사유 오류는 입력칸 아래」
 * - 요약 3칸 순서 = 계산 순서(총 지급 → 총 사용(차감) → 보유) · 부호 `+N`/`−N`/0 은 부호 없음 ·
 *   정상 사용에 경고색 없음 — 이력 표도 같다(원본은 보유·지급·차감 순 · 차감 --warn)
 * - 빈 이력 문구 「포인트 이력이 없습니다」 — 원본은 목록용 「해당 조건의 항목이 없습니다 / 필터를 초기화…」
 *   (필터가 없는 곳 — 원본 결함 D10). 회원 상세 「결제 내역이 없습니다」와 같은 꼴
 *
 * ## 기획 확인 필요 (원본 그대로 둠)
 * - 팝업 사유 목록(첨부 시안 그대로) — 「포인트 충전」·「콘텐츠 구매」·「포인트 충전 취소」는 충전 개념이 없는
 *   정책(지급 = 리뷰만 · 현금 환급 불가)과 맞지 않는다
 * ---------------------------------------------------------------------- */

export { LIST_PATH };
export const LIST_LABEL = "포인트 관리";

export const SECTIONS = {
  member: "회원 정보",
  status: "포인트 현황",
  history: "포인트 이력",
} as const;

export const findPointMember = (id: string): Member | undefined =>
  MEMBERS.find((member) => member.id === id);

export const headlineOf = (member: Member) => `${member.name} · ${member.id}`;

export interface PointHistoryRow extends PointEntry {
  /** 그 행까지의 잔액(원본 「잔여 포인트」) */
  remaining: number;
}

export interface PointStatus {
  balance: number;
  granted: number;
  deducted: number;
  /** 지급 기간 = 첫 처리일 ~ 마지막 처리일(날짜만) · 원장이 없으면 `-` */
  period: string;
  /** 최신순 */
  history: PointHistoryRow[];
}

/**
 * 원본 5324~5331 — 오름차순으로 잔액을 쌓고 뒤집는다.
 * 같은 분(分)의 동률은 **원장 배열 위치**로 — 최신이 앞이므로 배열 뒤쪽이 먼저 일어났다.
 */
export const pointStatusOf = (memberId: string): PointStatus => {
  const position = new Map(POINT_LEDGER.map((entry, index) => [entry, index]));
  const asc = POINT_LEDGER.filter((entry) => entry.memberId === memberId).sort(
    (a, b) => a.at.localeCompare(b.at) || position.get(b)! - position.get(a)!,
  );

  let run = 0;
  const rows = asc.map((entry) => {
    run += entry.amount;
    return { ...entry, remaining: run };
  });

  return {
    balance: run,
    granted: asc
      .filter((entry) => entry.amount >= 0)
      .reduce((sum, entry) => sum + entry.amount, 0),
    deducted: asc
      .filter((entry) => entry.amount < 0)
      .reduce((sum, entry) => sum - entry.amount, 0),
    period:
      asc.length > 0
        ? `${ymd(asc[0].at)} ~ ${ymd(asc[asc.length - 1].at)}`
        : "-",
    history: rows.reverse(),
  };
};

/** 숫자 + 부호(읽기 전용) — `+N` · `−N`(U+2212) · 0 은 부호 없이. 단위는 `StatTile` 이 따로 받는다 */
const signed = (value: number, sign: "+" | "−") =>
  value === 0 ? "0" : `${sign}${value.toLocaleString("ko-KR")}`;

/**
 * 요약 3칸 — 원본 `statrow`(5335, 원본 순서 보유·지급·차감).
 * **계산 순서로 놓는다**: 총 지급(+) → 총 사용(차감)(−) → 보유(결과, 부호 없음) — 지급 − 차감 = 보유.
 * 정상 사용은 경고가 아니다 — 경고색을 쓰지 않는다(원본 --warn · 정산 명세 원칙 2026-11-03)
 */
export const statTilesOf = (status: PointStatus) => [
  {
    label: "총 지급 포인트",
    value: signed(status.granted, "+"),
    unit: "P",
  },
  {
    label: "총 사용(차감) 포인트",
    value: signed(status.deducted, "−"),
    unit: "P",
  },
  {
    label: "보유 중인 포인트",
    value: status.balance.toLocaleString("ko-KR"),
    unit: "P",
  },
];

export const HISTORY_EMPTY_TITLE = "포인트 이력이 없습니다";
export const HISTORY_EMPTY_DESCRIPTION =
  "지급·사용·회수·수동조정이 생기면 여기에 쌓입니다.";

/* -------------------------------------------------------------------------
 * 포인트 조정 팝업 — 원본 `ptAdjModal`(3998) · `confirmPointAdj`(3985)
 * ---------------------------------------------------------------------- */

export type AdjustDirection = "plus" | "minus";

/** 조정 유형 세그먼트 — 원본 글자 그대로(전각 ＋/－) */
export const ADJUST_DIRECTIONS: { value: AdjustDirection; label: string }[] = [
  { value: "plus", label: "＋ 지급" },
  { value: "minus", label: "－ 차감" },
];

/** 처리 사유 — 원본 `PT_ADJ_REASONS`(첨부 시안 기준 · 도메인 확정 시 이 배열만 교체) */
export const ADJUST_REASONS: Record<AdjustDirection, string[]> = {
  plus: [
    "거래 보상 지급",
    "프로모션 지급",
    "CS 보상 지급",
    "관리자 지급 조정",
    "포인트 충전",
  ],
  minus: [
    "콘텐츠 구매",
    "포인트 사용",
    "포인트 충전 취소",
    "관리자 회수",
    "포인트 사용 취소",
  ],
};

/** 유형을 바꾸면 사유가 이 값으로 돌아간다 — 원본 `PT_ADJ_DEFAULT` */
export const ADJUST_DEFAULT_REASON: Record<AdjustDirection, string> = {
  plus: "관리자 지급 조정",
  minus: "관리자 회수",
};

export const ADJUST_COPY = {
  title: "포인트 조정",
  description:
    "관리자 수동으로 포인트를 지급하거나 차감합니다. 저장 후에는 수정할 수 없습니다.",
  memoPlaceholder: "저장 후 수정할 수 없습니다. 관리자 메모를 입력해 주세요.",
  overBalance: "보유 포인트를 초과해 차감할 수 없습니다.",
  done: {
    plus: "포인트를 지급했습니다.",
    minus: "포인트를 차감했습니다.",
  } satisfies Record<AdjustDirection, string>,
};

export const MEMO_MAX = 500;

/** [확인]이 눌리는 조건 — 포인트 > 0 이고 메모가 있을 때(원본 4006·4015) */
export const canConfirmAdjust = (amount: number, memo: string) =>
  amount > 0 && memo.trim() !== "";

/** 확인 판정 — 차감이 보유를 넘으면 오류(원본 3988). 통과면 `null` */
export const adjustErrorOf = (
  direction: AdjustDirection,
  amount: number,
  balance: number,
): string | null =>
  direction === "minus" && amount > balance ? ADJUST_COPY.overBalance : null;
