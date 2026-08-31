import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S22 문의 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `SupportListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 화면 유형: **목록형** (`docs/screen-templates.md` §3-1)
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할                 | 실물 이름                              |
 * | -------------------- | -------------------------------------- |
 * | 탭(고객/셀러)        | `AUDIENCE_TABS`                        |
 * | 고객 문의 행 타입    | `CustomerInquiry` · `CUSTOMER_INQUIRIES` |
 * | 셀러 문의 행 타입    | `SellerAsk` · `SELLER_ASKS`            |
 * | 상태 → 라벨·톤·설명  | `STATUS_META`                          |
 * | 문의 유형            | `TYPE_LABELS` · `TYPE_FILTERS`         |
 * | 검색 조건·기간 기준  | `SEARCH_FIELDS` · `PERIOD_FIELDS`      |
 * | 셀러 요약 라벨       | `SELLER_SUMMARY`                       |
 * | 페이지당 행 수       | `PAGE_SIZE`                            |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 두 행 타입 모두 `id`(고유키) · `date`(접수일 `YYYY-MM-DD HH:mm`) 를 갖는다
 * - `CustomerInquiry.answeredAt` 은 답변일. **미답변이면 `null`** 이고,
 *   답변일 기준 기간 필터에서 빠진다
 * - `STATUS_FILTERS[0].value` · `TYPE_FILTERS[0].value` 는 `"all"`(필터 해제)
 * - `SEARCH_FIELDS[0]` · `PERIOD_FIELDS[0]` 이 **기본값**이다 —
 *   뼈대가 `useState(SEARCH_FIELDS[0].value)` 로 받아 가므로 문자열을 뼈대에 박지 않는다
 *
 * ## 원본 어드민 대조 (`_plan/babycube-admin/chunks/1au6ppob25_5m.js` 모듈 45533)
 * 이 화면은 **탭마다 몸통이 통째로 다르다.** 원본이 두 컴포넌트(`j`, `y`)를 따로 두고
 * 탭 칩으로 갈아 끼운다:
 * ```
 * 탭 칩: [고객 문의][셀러 문의]           ← 기본 "고객 문의"
 *
 * 고객 문의 : 상태 대시(툴팁 O) → 검색조건 바 → 카드[총 N건 + 표 7열 + 페이지네이션]
 *             컬럼 회원명·유형·제목·내용·접수일·답변일·상태
 * 셀러 문의 : 요약 2칸(미답변/전체) → 카드[표 5열]        ← 필터도 목록 헤더도 페이저도 없다
 *             컬럼 셀러·제목·내용·접수일·상태
 * ```
 *
 * ### ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **셀러 요약의 증감(±건)과 비교 기준("어제 대비"·"지난주 대비").**
 *   원본 `statrow` 는 **라벨과 건수 두 줄이 전부**다. 그 수치는 우리가 지어낸 것이었다
 * - **상태 세그먼트.** 원본 필터 설정이 `chip: { key: "stat", dash: true, … }` 라
 *   상태 축을 **건수 카드로만** 그린다. 세그먼트를 함께 두면 한 축에 컨트롤이 둘이 된다
 * - **엑셀 다운로드.** 이 화면은 공용 목록 셸(`20013`)을 쓰지 않아 툴바 버튼이 없다
 * - **답변 등록**(모달 푸터 + 상태 변경 + 토스트). 원본 목록에 조치가 없다 —
 *   제목이 상세(`/inquiry-detail?id=`)로 나가고, 답변은 거기서 한다
 * - **유형 5종.** 원본 유형 셀렉트는 `회원정보 · 포인트 · 플랫폼 오류` **3종**이다.
 *   `배송·회수` 와 `정산` 은 우리가 늘린 것이라 지웠다
 * - **셀러 탭의 유형·답변일 열.** 원본 셀러 컬럼은 5열이고 그 둘이 없다
 *
 * ### 원본에 있었는데 우리가 빠뜨렸던 것 — 되살렸다
 * - **상태 대시의 설명 툴팁**(`STATUS_META[].description`) — 원본 `statusTips` 문구 그대로
 * - **검색 조건 셀렉트**(회원명 / 유형 / 제목+내용). 검색 상자 하나로 뭉쳐 놓아
 *   범위를 좁힐 수단이 없었다. 안내 문구도 원본대로 "검색어 입력"이다
 * - **접수일·답변일의 날짜 표기**(`ymd`)와 **답변일이 없을 때의 `-`**
 *
 * ## 상태 색 배정 (§3-1)
 * - `pending`(미답변) = **누가 무언가를 해야 끝나는 상태** → `warning`
 * - `done`(답변완료) = 정상 종료. 원본 툴팁도 "더 진행할 단계가 없습니다" 라고 말한다 → `default`
 * ---------------------------------------------------------------------- */

export type SupportAudience = "customer" | "seller";
export type SupportStatus = "pending" | "done";
/** 원본 유형 셀렉트의 3종 그대로다 */
export type SupportType = "account" | "point" | "platform";

/** 고객 문의 한 행 (원본 `inquiriesApi` + 컬럼 배열 `b`) */
export interface CustomerInquiry {
  /** 고유 키 — 뼈대가 행 key 로 쓴다 */
  id: string;
  /** 회원명 */
  member: string;
  type: SupportType;
  title: string;
  body: string;
  status: SupportStatus;
  /** 접수일 `YYYY-MM-DD HH:mm`. 표에는 `ymd` 로 날짜만 낸다 */
  date: string;
  /** 답변일. **미답변이면 `null`** */
  answeredAt: string | null;
}

/**
 * 셀러 문의 한 행 (원본 `sellerAsksApi` + 컬럼 배열 `m`).
 * **유형도 답변일도 없다** — 원본 셀러 컬럼이 5열이다.
 */
export interface SellerAsk {
  id: string;
  seller: string;
  title: string;
  body: string;
  status: SupportStatus;
  /** 접수일 `YYYY-MM-DD HH:mm` */
  date: string;
}

/** 탭 — 원본 `k = ["고객 문의", "셀러 문의"]`, 기본값은 첫 항목 */
export const AUDIENCE_TABS: { value: SupportAudience; label: string }[] = [
  { value: "customer", label: "고객 문의" },
  { value: "seller", label: "셀러 문의" },
];

/**
 * 상태값 → 라벨 · Tag tone · 설명.
 *
 * `description` 은 원본 `statusTips` 문구 그대로다. 원본은 줄바꿈 두 번으로
 * "지금 무엇인가 / 다음에 무엇을 하나"를 나누는데, 우리 `Tooltip` 은 한 문단이라
 * 한 줄로 이었다.
 */
export const STATUS_META: Record<
  SupportStatus,
  { label: string; tone: TagTone; description: string }
> = {
  pending: {
    label: "미답변",
    tone: "warning",
    description:
      "접수됐으나 아직 답변하지 않은 문의입니다. 답변을 등록하면 [답변완료]가 됩니다.",
  },
  done: {
    label: "답변완료",
    tone: "default",
    description:
      "답변이 등록되어 종결된 문의입니다. 더 진행할 단계가 없습니다.",
  },
};

/**
 * 상태 대시 카드. 첫 항목은 `"all"`(필터 해제) —
 * 원본 `chip.all` 도 `"전체"` 다.
 */
export const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: STATUS_META.pending.label },
  { value: "done", label: STATUS_META.done.label },
];

/** 문의 유형 → 라벨 (원본 유형 셀렉트의 어휘 그대로) */
export const TYPE_LABELS: Record<SupportType, string> = {
  account: "회원정보",
  point: "포인트",
  platform: "플랫폼 오류",
};

/**
 * 유형 셀렉트. 첫 항목 라벨이 "전체"가 아니라 **"유형 전체"** 다 —
 * 상태 대시에 이미 "전체"가 있어서, 화면에도 스크린리더에도 같은 이름이 둘이 된다.
 * (원본 `opts[0]` 도 `["", "유형 전체"]` 다)
 */
export const TYPE_FILTERS = [
  { value: "all", label: "유형 전체" },
  { value: "account", label: TYPE_LABELS.account },
  { value: "point", label: TYPE_LABELS.point },
  { value: "platform", label: TYPE_LABELS.platform },
];

/**
 * 검색 조건 셀렉트 — 원본 `search.fieldOpts` 그대로(값 키까지 같다).
 * **첫 항목이 기본값**이다.
 */
export const SEARCH_FIELDS = [
  { value: "mem", label: "회원명" },
  { value: "kind", label: "유형" },
  { value: "all", label: "제목+내용" },
];

/** 검색어 입력의 안내 문구 — 원본 `search.ph` 그대로 */
export const SEARCH_PLACEHOLDER = "검색어 입력";

/**
 * 기간 기준 셀렉트 — 원본 `date.fields` 그대로.
 * **첫 항목이 기본값**이다(뼈대가 `useState(PERIOD_FIELDS[0].value)` 로 받는다).
 */
export const PERIOD_FIELDS = [
  { value: "received", label: "접수일" },
  { value: "answered", label: "답변일" },
];

/**
 * 셀러 문의 요약 — **셀러 탭에서만** 뜬다 (원본 `statrow`).
 *
 * ⚠️ 원본은 **라벨과 건수뿐**이다. 증감(±)도 비교 기준 문구도 없다 —
 * 한때 여기에 "-3건 / 어제 대비" 같은 수치를 붙였는데 전부 지어낸 값이었다.
 *
 * `status: null` 은 전체 건수라는 뜻이다. 건수는 뼈대가 목록에서 세므로 여기 적지 않는다.
 * `warn: true` 인 칸만 수치를 주의색으로 낸다(원본도 미답변 값에만 `--warn` 을 준다).
 */
export const SELLER_SUMMARY: {
  status: SupportStatus | null;
  label: string;
  warn: boolean;
}[] = [
  { status: "pending", label: "미답변 셀러 문의", warn: true },
  { status: null, label: "전체 셀러 문의", warn: false },
];

export const CUSTOMER_INQUIRIES: CustomerInquiry[] = [
  {
    id: "Q-2411",
    member: "김보라",
    type: "point",
    title: "포인트가 적립되지 않았어요",
    body: "8월 20일 주문 건의 적립 포인트가 아직 들어오지 않았습니다.",
    status: "pending",
    date: "2026-08-24 09:30",
    answeredAt: null,
  },
  {
    id: "Q-2409",
    member: "이준서",
    type: "account",
    title: "비밀번호 재설정 메일이 오지 않아요",
    body: "재설정 메일을 세 번 요청했는데 받은 편지함에 도착하지 않습니다.",
    status: "pending",
    date: "2026-08-23 14:05",
    answeredAt: null,
  },
  {
    id: "Q-2405",
    member: "한서윤",
    type: "platform",
    title: "알림이 오지 않습니다",
    body: "배송 시작 알림을 켜 두었는데 앱에서 알림이 뜨지 않습니다.",
    status: "pending",
    date: "2026-08-22 18:30",
    answeredAt: null,
  },
  {
    id: "Q-2406",
    member: "박하늘",
    type: "account",
    title: "휴대폰 번호를 바꾸고 싶어요",
    body: "회원정보 수정 화면에서 번호 변경이 되지 않습니다.",
    status: "done",
    date: "2026-08-22 10:20",
    answeredAt: "2026-08-22 15:40",
  },
  {
    id: "Q-2402",
    member: "최시우",
    type: "platform",
    title: "결제 화면에서 오류가 납니다",
    body: "결제하기를 누르면 흰 화면이 뜨고 넘어가지 않습니다.",
    status: "done",
    date: "2026-08-21 19:12",
    answeredAt: "2026-08-22 09:10",
  },
  {
    id: "Q-2398",
    member: "정다인",
    type: "point",
    title: "포인트 유효기간이 궁금해요",
    body: "적립된 포인트는 언제까지 사용할 수 있나요?",
    status: "done",
    date: "2026-08-20 11:45",
    answeredAt: "2026-08-20 16:02",
  },
];

export const SELLER_ASKS: SellerAsk[] = [
  {
    id: "Q-2412",
    seller: "아이몽컴퍼니",
    title: "정산 금액이 다릅니다",
    body: "8월 1차 정산액이 예상과 다릅니다. 산정 내역을 확인 부탁드립니다.",
    status: "pending",
    date: "2026-08-24 08:40",
  },
  {
    id: "Q-2410",
    seller: "베이비루션",
    title: "상품 등록 중 오류가 납니다",
    body: "대표 이미지를 올리면 저장 버튼이 눌리지 않습니다.",
    status: "pending",
    date: "2026-08-23 17:25",
  },
  {
    id: "Q-2407",
    seller: "쿠쿠베베",
    title: "담당자 정보를 변경하고 싶습니다",
    body: "셀러 담당자 연락처를 바꾸려면 어디에서 수정하나요?",
    status: "done",
    date: "2026-08-22 13:10",
  },
  {
    id: "Q-2404",
    seller: "아이몽컴퍼니",
    title: "세금계산서 재발행 요청",
    body: "8월 계산서에 사업자번호가 잘못 기재되어 재발행이 필요합니다.",
    status: "done",
    date: "2026-08-21 15:50",
  },
  {
    id: "Q-2399",
    seller: "베이비루션",
    title: "회수 지연 문의",
    body: "회수 신청 후 3일째 수거가 진행되지 않고 있습니다.",
    status: "pending",
    date: "2026-08-20 09:05",
  },
];

/**
 * 샘플 데이터의 **기준 월**. 달력을 열었을 때 이 달이 먼저 보인다.
 * 실서비스로 이식하면 넘기지 않는다 — 오늘이 기준이 된다.
 */
export const REFERENCE_MONTH = new Date("2026-08-01T00:00:00");

/**
 * 날짜 표기 — **날짜만, 점 구분자**. 원본 공용 포맷터(모듈 32916) 그대로다:
 * `e => e ? e.slice(0, 10).replace(/-/g, ".") : "-"`.
 * 답변일이 `null` 이면 `-` 가 되는 것도 원본과 같다.
 */
export const EMPTY_CELL = "-";

export const ymd = (dateText: string | null) =>
  dateText ? dateText.slice(0, 10).replace(/-/g, ".") : EMPTY_CELL;

/**
 * 고객 문의 검색 대상 — `SEARCH_FIELDS` 의 값에 대응한다.
 * 원본 `search.fields` 가 `["title","body"]` 라 `all` 은 **제목+내용**이다.
 */
export const customerHaystack = (inquiry: CustomerInquiry, field: string) => {
  if (field === "mem") return inquiry.member;
  if (field === "kind") return TYPE_LABELS[inquiry.type];
  return `${inquiry.title} ${inquiry.body}`;
};

/**
 * 한 페이지에 보여줄 행 수 — **고객 탭에만** 쓴다.
 * 셀러 탭은 원본이 `size: 100` 으로 한 번에 받고 페이저를 두지 않는다.
 */
export const PAGE_SIZE = 4;
