import type { SelectOption, TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S15 정산 내역/명세서 — **도메인 층** (BabyCube 본사 운영 어드민)
 * 원본 어드민: `_plan/babycube-admin/chunks/2ptepflk0w6t1.js` (`/settle-statement`)
 *
 * 짝이 되는 뼈대: `SettlementStatementPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 이 화면이 무엇인가
 * 확정된 정산을 **명세서 단위**로 조회하고 문서를 확인한다.
 * S12(셀러 정산)가 "회차를 진행시키는 곳"이라면 여기는 "확정된 것을 되찾아 보는 곳"이다.
 * 그래서 정산 대상이 셀러뿐 아니라 **자체(본사 직영)** 도 섞인다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(명세서번호) · `date`(`YYYY-MM-DD HH:mm`) 를 반드시 갖는다.
 *   `date` 는 **명세 확정 일시**다. ⚠️ 원본 필터에 기간 축이 아예 없어 미리보기에서만 쓴다
 * - `STATUS_META` 의 키는 `Statement["status"]` 와 정확히 일치한다
 * - `TARGET_FILTERS[0].value` · `STATUS_FILTERS[0].value` 는 `"all"`(필터 해제)
 * - **지급액은 데이터가 계산한다**(`payoutOf` = 매출 − 차감). 뼈대는 렌더만 한다
 * - 이 화면에는 금액 요약이 없다 — 원본에 `note` 슬롯이 없다
 *
 * ## 금액의 범위 (⛔ S12 와 맞물린다 — 한쪽만 고치지 말 것)
 * - **매출** = 거래액(정가) − 셀러쿠폰
 * - **차감** = 수수료 + PG수수료 + 취소·반품 차감 − 안심케어 보전
 * - **지급액** = 매출 − 차감
 *
 * S12 는 같은 돈을 **여섯 조각**으로, 여기서는 **두 조각**으로 접는다. 접는 규칙이
 * 위와 같아서 같은 회차의 지급액이 두 화면에서 정확히 일치한다:
 * - 베베마켓 2026-06 → `ST-202606-0002` = S12 `2026-06-SEL0142` = **206,268,000원**
 * - 아이누리 2026-07 → `ST-202607-0021` = S12 `2026-07-SEL0311` = **50,613,000원**
 *
 * ## 원본 대조 (`/settle-statement`)
 * 가져온 것: 컬럼 8개의 이름·순서·정렬(`차감(수수료·PG·취소)` 포함) ·
 * 정산 대상을 **배지 + 이름**으로 한 칸에 넣는 것 · 정산월 표기 `2026.07` ·
 * 상태 어휘 6종 · 필터 축 **둘**(정산 대상 · 상태) · 검색 조건 2종 ·
 * 차감이 0 이면 `-` · 엑셀 파일명 `정산내역명세서`.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * - **`명세서 도움법` 도움말 툴팁** — 지어낸 문장이었다
 * - **명세서 다운로드 토스트** — 원본 `명세서` 버튼은 **명세서 화면으로 가는 링크**지
 *   파일을 내려받는 버튼이 아니다. 이 목록에서 내려받는 것은 엑셀(CSV)뿐이다
 *
 * ## 원본에 있는데 빠뜨렸던 것 (되살린 것)
 * - **상태 필터** — 원본은 `정산 대상`·`상태` 두 축을 함께 든다. 상태 열만 보여 주고
 *   거를 수단이 없으면 "이의제기 난 명세만 보기"가 불가능하다
 * - **검색 조건 선택**(명세서번호/정산 대상) — 한 칸에 뭉뚱그리지 않는다
 * ---------------------------------------------------------------------- */

/** 명세서가 딸린 정산 회차의 상태 — 원본 `chips[settleStat].values` 6종 */
export type SettleStatus =
  "waiting" | "requested" | "agreed" | "paid" | "disputed" | "held";

/** 정산 대상. 본사 직영 매출인지 입점 셀러 매출인지 */
export type TargetKind = "hq" | "seller";

export interface Statement {
  /** 명세서번호 — 고유 키 */
  id: string;
  targetKind: TargetKind;
  /** 정산 대상 이름 (자체는 "본사 직영") */
  target: string;
  /** 정산월 `YYYY-MM` */
  month: string;
  /** 매출 — 거래액(정가)에서 셀러쿠폰을 뺀 값 */
  revenue: number;
  /** 차감 — 수수료 + PG수수료 + 취소·반품 차감 − 안심케어 보전 */
  deduction: number;
  status: SettleStatus;
  /** 명세 확정 일시 `YYYY-MM-DD HH:mm` */
  date: string;
}

/**
 * 상태값 → 라벨 · Tag tone.
 *
 * ## 색 배정 근거 (`docs/screen-templates.md` §3-1)
 * S12 와 같은 어휘라 같은 기준으로 배정했다 — **문구가 아니라 규칙을 공유한다.**
 * 파일마다 따로 드는 것은 의도된 것이다(단위·상태는 도메인이라 공용화하면
 * 서비스 교체 시 뼈대를 고쳐야 한다).
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
 * ⚠️ 정상 종결(지급완료)과 비정상(이의제기·보류)을 같은 톤으로 묶지 않는다.
 * 명세서 목록은 대부분 지급완료라, 그 사이에 섞인 이의제기·보류가 눈에 띄어야
 * "아직 안 끝난 명세가 몇 장인가"를 라벨을 읽기 전에 알 수 있다.
 */
export const STATUS_META: Record<
  SettleStatus,
  { label: string; tone: TagTone }
> = {
  waiting: { label: "지급대기", tone: "default" },
  requested: { label: "확인요청", tone: "success" },
  agreed: { label: "확인완료", tone: "warning" },
  paid: { label: "지급완료", tone: "default" },
  disputed: { label: "이의제기", tone: "critical" },
  held: { label: "보류", tone: "critical" },
};

/**
 * 정산 대상 구분 — **대등한 분류**(자체 ↔ 입점사)라 상태색을 쓰지 않는다 (§3-1).
 * 원본은 자체를 파랑(`b-blue`)으로 칠하지만, 한쪽만 칠하면 그쪽이 특별한 장부로
 * 보인다. 같은 행에 상태 `Tag` 가 이미 색을 쓰고 있어 축이 둘로 다투기도 한다.
 */
export const TARGET_KIND_LABEL: Record<TargetKind, string> = {
  hq: "자체",
  seller: "입점사",
};

export const STATEMENTS: Statement[] = [
  {
    id: "ST-202607-0001",
    targetKind: "hq",
    target: "본사 직영",
    month: "2026-07",
    revenue: 412_850_000,
    deduction: 61_927_000,
    status: "paid",
    date: "2026-08-10 10:00",
  },
  {
    id: "ST-202607-0014",
    targetKind: "seller",
    target: "코코베이비",
    month: "2026-07",
    revenue: 128_400_000,
    deduction: 23_112_000,
    status: "agreed",
    date: "2026-08-01 09:00",
  },
  {
    /*
     * ⛔ S12 의 `2026-06-SEL0142`(베베마켓 6월)와 **같은 돈**이다.
     * 여섯 조각을 두 조각으로 접는 규칙:
     *   매출 = 거래액(정가) − 셀러쿠폰          262,400,000 − 6,290,000
     *   차감 = 수수료 + PG + 취소·반품 − 안심케어 보전
     *          35,424,000 + 5,898,000 + 10,140,000 − 1,620,000
     * → 256,110,000 − 49,842,000 = 206,268,000
     */
    id: "ST-202606-0002",
    targetKind: "seller",
    target: "베베마켓",
    month: "2026-06",
    revenue: 256_110_000,
    deduction: 49_842_000,
    status: "paid",
    date: "2026-07-10 10:00",
  },
  {
    /* ⛔ S12 의 `2026-07-SEL0311`(아이누리 7월)과 같은 돈 — 보류 상태까지 같다 */
    id: "ST-202607-0021",
    targetKind: "seller",
    target: "아이누리",
    month: "2026-07",
    /* 74,800,000 − 1,790,000 = 73,010,000 / 8,976,000 + 1,681,000 + 14,220,000 − 2,480,000 */
    revenue: 73_010_000,
    deduction: 22_397_000,
    status: "held",
    date: "2026-08-01 09:00",
  },
  {
    id: "ST-202606-0018",
    targetKind: "seller",
    target: "리틀스텝",
    month: "2026-06",
    revenue: 142_900_000,
    deduction: 27_151_000,
    status: "paid",
    date: "2026-07-10 10:00",
  },
  {
    id: "ST-202608-0003",
    targetKind: "hq",
    target: "본사 직영",
    month: "2026-08",
    revenue: 96_240_000,
    deduction: 14_436_000,
    status: "waiting",
    date: "2026-08-31 23:59",
  },
  {
    id: "ST-202607-0033",
    targetKind: "seller",
    target: "쁘띠하우스",
    month: "2026-07",
    revenue: 51_600_000,
    deduction: 9_288_000,
    status: "disputed",
    date: "2026-08-05 14:20",
  },
];

/**
 * 지급액 = 매출 − 차감.
 * 표·미리보기가 모두 이 함수를 부른다. 뼈대에서 따로 빼면 두 곳이 어긋난다.
 */
export const payoutOf = (row: Statement) => row.revenue - row.deduction;

/** 표의 주요 수치 포맷. 단위가 도메인이라 여기 둔다 (원 · 건 · 장) */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/** **금액이 없는 칸의 표기.** 원본 그대로 `0원` 이 아니라 `-` 다 */
export const NO_AMOUNT = "-";

/**
 * **차감 항목 표기 규칙.** 0 원에는 부호를 붙이지 않는다 —
 * `-0원` 은 읽는 사람을 멈추게 하고, `0원` 은 "0을 차감했다"로 읽힌다.
 */
export const deduct = (value: number) =>
  value === 0 ? NO_AMOUNT : "-" + won(value);

/** 정산월 표기 — 원본 그대로 `2026-07` → `2026.07` */
export const ym = (month: string) => month.slice(0, 7).replace("-", ".");

/** 정산 대상 필터. 첫 항목은 반드시 `"all"` — 원본 `chips[grp]` */
export const TARGET_FILTERS = [
  { value: "all", label: "전체" },
  { value: "hq", label: "자체" },
  { value: "seller", label: "입점사" },
];

/**
 * 상태 필터. 첫 항목은 반드시 `"all"` — 원본 `chips[settleStat]`.
 *
 * ⚠️ 원본 칩은 **다중 선택**(콤마로 이어 URL 에 넣는다)이지만 여기서는 단일 선택이다.
 * 이 저장소의 세그먼트가 한 값만 들기 때문이고, 다른 배치도 같은 규칙으로 옮겼다.
 */
export const STATUS_FILTERS = [
  { value: "all", label: "전체" },
  { value: "waiting", label: "지급대기" },
  { value: "requested", label: "확인요청" },
  { value: "agreed", label: "확인완료" },
  { value: "paid", label: "지급완료" },
  { value: "disputed", label: "이의제기" },
  { value: "held", label: "보류" },
];

/** 검색 조건 — 원본 `search.fieldOpts` 그대로 두 가지다 */
export const SEARCH_FIELDS: SelectOption[] = [
  { value: "no", label: "명세서번호" },
  { value: "target", label: "정산 대상" },
];

/** 검색 조건에 따라 훑을 문자열. 조건을 늘리면 여기만 고친다 */
export const searchHaystack = (row: Statement, field: string) =>
  field === "target" ? row.target : row.id;

/** 엑셀 파일명 — 원본 `exportName: "정산내역명세서"` */
export const EXPORT_NAME = "정산내역명세서";

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 원본 기본값 10 이지만 **샘플이 7건뿐이라 페이징 동작이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 5;
