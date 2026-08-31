import type { SelectOption, TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S16 세금계산서·증빙 — **도메인 층** (BabyCube 본사 운영 어드민)
 * 원본 어드민: `_plan/babycube-admin/chunks/0css0qr5oqaud.js` (`/settle-tax`)
 *
 * 짝이 되는 뼈대: `TaxInvoiceListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 이 화면이 무엇인가
 * 정산 **수수료**에 대한 세금계산서를 발행 상태로 조회한다.
 * 본사가 셀러에게 받는 수수료가 공급가액이고, 거기 붙는 부가세가 세액이다.
 * 그래서 공급자는 항상 본사이고 공급받는자가 셀러다 — 정산 지급 방향과 반대다.
 *
 * ## ⚠️ 이 화면은 **읽기 전용**이다
 * 원본이 쓰는 API 는 목록·엑셀뿐이고(`makeListApi("/admin/tax-invoices")`)
 * 발행·정정 엔드포인트가 없다. 표의 `처리` 열도 **항상 `-`** 를 그린다
 * (`render: () => "-"`). 발행은 지급 처리에 딸려 자동으로 일어난다 —
 * S12 의 지급완료 설명이 "세금계산서가 함께 발행됩니다"라고 못박는다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(계산서번호) · `date`(`YYYY-MM-DD HH:mm` — 작성일) 를 반드시 갖는다
 * - `STATUS_META` 의 키는 `TaxInvoice["status"]` 와 정확히 일치한다
 * - `FILTERS[0].value` 는 `"all"` — 뼈대가 필터 해제로 취급한다
 * - **세액과 합계는 데이터가 계산한다**(`vatOf` · `totalOf`). 뼈대는 렌더만 한다 —
 *   세율이 바뀌면 고칠 자리가 한 곳이어야 한다
 *   (원본은 서버가 `vatAmount`·`totalAmount` 를 내려 준다. 샘플에서는 여기서 만든다)
 * - 이 화면에는 금액 요약이 없다 — 원본에 `note` 슬롯이 없다
 *
 * ## ⛔ S12 와 맞물리는 지점 (바꾸려면 함께 바꾼다)
 * 공급가액은 S12 셀러 정산의 **"수수료" 칸 금액과 같은 돈**이고,
 * 발행상태는 그 회차의 지급 여부를 따라간다(지급완료 → 발행완료).
 * - `TX-202607-0001` 34,152,000원 = S12 `2026-07-SEL0142` 의 수수료
 * - `TX-202606-0001` 35,424,000원 = S12 `2026-06-SEL0142` 의 수수료
 *
 * ## 원본 대조 (`/settle-tax`)
 * 가져온 것: 컬럼 9개의 이름·순서·정렬(`공급가액(수수료)` · `세액(VAT)` · **상태 다음이 처리**) ·
 * 발행 상태 어휘 2종 · 필터 이름(`발행상태`) · 검색 조건 2종 · 작성일 표기 `2026.08.10`.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * - **발행/계산서 보기 버튼과 발행 확인 모달** — 원본 `처리` 열은 **항상 `-`** 다.
 *   쓰기 API 자체가 없다
 * - **엑셀 다운로드** — 이 화면만 공용 목록 셸을 쓰지 않아 `toolsLeft` 가 아예 없다.
 *   다른 목록에 있다고 여기에도 달면 안 된다
 * - **정산월 셀렉트** — 원본 필터는 발행상태와 검색뿐이다. 축이 사라지면서
 *   행의 `month` 필드도 함께 걷어냈다(쓰지 않는 필드를 남기지 않는다)
 * - **`세금계산서 도움말` 툴팁** — 지어낸 문장이었다
 * ---------------------------------------------------------------------- */

/** 계산서가 국세청에 나갔는가 — 원본 `chips[stat].values` 2종 */
export type IssueStatus = "pending" | "issued";

export interface TaxInvoice {
  /** 계산서번호 — 고유 키 */
  id: string;
  /** 공급자 — 수수료를 받는 쪽이라 항상 본사다 */
  supplier: string;
  /** 공급받는자 — 수수료를 내는 셀러 */
  buyer: string;
  /** 공급가액. **S12 의 "수수료" 칸과 같은 금액이다** */
  supply: number;
  status: IssueStatus;
  /** 작성일 `YYYY-MM-DD HH:mm` */
  date: string;
}

/**
 * 발행 상태 → 라벨 · Tag tone · 상태 설명.
 *
 * ## 색 배정 근거 (`docs/screen-templates.md` §3-1)
 * | 상태     | 지금 누가 무엇을 해야 하나          | tone      |
 * | -------- | ----------------------------------- | --------- |
 * | 발행대기 | 아무도 — 지급 처리에 딸려 발행된다  | `warning` |
 * | 발행완료 | 아무도 — 정상 종결                  | `default` |
 *
 * 상태가 둘뿐이라 색이 겹치지 않는다. 발행대기는 **기한이 걸린 일**(정산 지급과 함께
 * 나가야 한다)이라 `warning` 이 맞고, 발행완료는 더 볼 것이 없어 `default` 다.
 * 여기에 `critical` 을 쓸 자리는 없다 — 발행 실패·취소 같은 비정상 상태가
 * 원본 어휘에 없기 때문이다. **없는 상태를 만들지 않는다.**
 */
export const STATUS_META: Record<
  IssueStatus,
  { label: string; tone: TagTone; description: string }
> = {
  pending: {
    label: "발행대기",
    tone: "warning",
    description:
      "정산이 확정돼 계산서가 만들어졌지만 아직 국세청에 전송되지 않은 상태입니다. 지급 처리에 맞춰 함께 발행됩니다.",
  },
  issued: {
    label: "발행완료",
    tone: "default",
    description:
      "국세청 전송이 끝나 공급받는자에게 계산서가 전달된 상태입니다.",
  },
};

/**
 * ⛔ 발행상태는 **S12 회차의 지급 여부를 따라간다.**
 * 지급완료 회차만 발행완료다(S12 `paid` 설명: "세금계산서가 함께 발행됩니다").
 * 7월 회차는 아직 어느 셀러도 지급되지 않아 전부 발행대기다.
 */
export const TAX_INVOICES: TaxInvoice[] = [
  {
    /* S12 `2026-07-SEL0142` (베베마켓 7월 · 확인완료) — 아직 지급 전이라 발행대기 */
    id: "TX-202607-0001",
    supplier: "BabyCube(주)",
    buyer: "베베마켓",
    supply: 34_152_000,
    status: "pending",
    date: "2026-08-10 10:00",
  },
  {
    /* S12 `2026-07-SEL0188` (리틀스텝 7월 · 이의제기) */
    id: "TX-202607-0002",
    supplier: "BabyCube(주)",
    buyer: "리틀스텝",
    supply: 20_184_000,
    status: "pending",
    date: "2026-08-10 10:00",
  },
  {
    /* S12 `2026-07-SEL0203` (맘스케어 7월 · 확인요청) */
    id: "TX-202607-0003",
    supplier: "BabyCube(주)",
    buyer: "맘스케어",
    supply: 11_568_000,
    status: "pending",
    date: "2026-08-10 10:00",
  },
  {
    /* S12 `2026-07-SEL0311` (아이누리 7월 · 보류) */
    id: "TX-202607-0004",
    supplier: "BabyCube(주)",
    buyer: "아이누리",
    supply: 8_976_000,
    status: "pending",
    date: "2026-08-10 10:00",
  },
  {
    /* S12 `2026-07-SEL0357` (쁘띠하우스 7월 · 지급대기) */
    id: "TX-202607-0005",
    supplier: "BabyCube(주)",
    buyer: "쁘띠하우스",
    supply: 5_028_000,
    status: "pending",
    date: "2026-08-10 10:00",
  },
  {
    /* ⛔ S12 `2026-06-SEL0142` (베베마켓 6월 · 지급완료) — 수수료가 같은 돈이다 */
    id: "TX-202606-0001",
    supplier: "BabyCube(주)",
    buyer: "베베마켓",
    supply: 35_424_000,
    status: "issued",
    date: "2026-07-10 10:00",
  },
  {
    /* 6월에 종결된 회차 하나 더 — S12 표에는 남아 있지 않은 지난 회차다 */
    id: "TX-202606-0007",
    supplier: "BabyCube(주)",
    buyer: "리틀스텝",
    supply: 17_148_000,
    status: "issued",
    date: "2026-07-10 10:00",
  },
];

/** 부가가치세율. 세율이 바뀌면 고칠 자리는 여기 하나다 */
export const VAT_RATE = 0.1;

/** 세액 = 공급가액 × 10% (원 단위 절사) */
export const vatOf = (row: TaxInvoice) => Math.floor(row.supply * VAT_RATE);

/** 합계 = 공급가액 + 세액 */
export const totalOf = (row: TaxInvoice) => row.supply + vatOf(row);

/** 표의 주요 수치 포맷. 단위가 도메인이라 여기 둔다 (원 · 건 · 장) */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/** 작성일 표기 — 원본 `ymd` 와 같이 **날짜만** `2026.08.10` 으로 낸다 */
export const ymd = (dateText: string) =>
  dateText.slice(0, 10).replace(/-/g, ".");

/**
 * **처리 칸의 표기.** 원본이 `render: () => "-"` 로 **항상 `-`** 를 그린다.
 * 이 화면에는 쓰기 동작이 없다 — 발행은 지급 처리에 딸려 일어난다.
 */
export const NO_ACTION = "-";

/** 발행상태 필터. 첫 항목은 반드시 `"all"` — 원본 `chips[stat].label: "발행상태"` */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "pending", label: "발행대기" },
  { value: "issued", label: "발행완료" },
];

/** 검색 조건 — 원본 `search.fieldOpts` 그대로 두 가지다 */
export const SEARCH_FIELDS: SelectOption[] = [
  { value: "no", label: "계산서번호" },
  { value: "to", label: "공급받는자" },
];

/** 검색 조건에 따라 훑을 문자열. 조건을 늘리면 여기만 고친다 */
export const searchHaystack = (row: TaxInvoice, field: string) =>
  field === "to" ? row.buyer : row.id;

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스라면 원본 기본값 10 이지만 **샘플이 7건뿐이라 페이징 동작이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 5;
