import type { TagTone } from "../../components/ui";
import { MEMBERS } from "./MemberListPage.data";

/* -------------------------------------------------------------------------
 * S22 문의 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 * 기준 기획: v0.4 `SCREENS.support`(proto.html 4083~4119) · 데이터 `INQUIRIES`·`SELLER_ASKS`(4067~4082) ·
 * 필터 설정 `FILTERS.support`(2069~2074) · 상태 툴팁 `STAT_TIP`(2828~2829)
 *
 * 짝이 되는 뼈대: `SupportListPage.tsx` · 상세 `SupportDetailPage.*`(`/support/{문의 ID}`)
 * 화면 유형: **목록형** (`docs/screen-templates.md` §3-1)
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할                    | 실물 이름                                   |
 * | ----------------------- | ------------------------------------------- |
 * | 탭(고객/셀러)           | `AUDIENCE_TABS` · `SELLER_TAB_QUERY`        |
 * | 고객 문의 행            | `CustomerInquiry` · `CUSTOMER_INQUIRIES`    |
 * | 셀러 문의 행            | `SellerAsk` · `SELLER_ASKS`                 |
 * | 상태 → 라벨·톤·툴팁     | `STATUS_META` · `FILTERS` · `DEFAULT_FILTER`|
 * | 문의 유형               | `TYPE_LABELS` · `TYPE_FILTERS`              |
 * | 검색 조건·기간 기준     | `SEARCH_FIELDS` · `PERIOD_FIELDS`           |
 * | 셀러 요약 라벨          | `SELLER_SUMMARY`                            |
 * | 검색조건 요약           | `filterSummary`                             |
 * | 상세 경로               | `LIST_PATH` · `detailPathOf`                |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 두 행 타입 모두 `id`(고유키 — 고객 `Q-…` · 셀러 `SQ-…`) · `date`(접수일 `YYYY-MM-DD HH:mm`) 를 갖는다.
 *   상세 경로는 `/support/{id}` 하나이고 ID 로 고객·셀러를 가른다
 * - **배열 순서가 표의 순서**다 — 원본도 정렬하지 않고 최신순 배열을 그대로 그린다
 * - `CustomerInquiry.answeredAt` 은 답변일. **미답변이면 `null`** 이고, 답변일 기준 기간 필터에서 빠진다
 * - `answer` 는 등록된 답변 — 상세의 답변 입력칸을 채운다(미답변이면 빈 문자열)
 * - `SEARCH_FIELDS[0]` · `PERIOD_FIELDS[0]` · `TYPE_FILTERS[0]`(`all`) 이 기본값이다
 *
 * ## 샘플 — 원본 6 + 3건 그대로, **사람만 우리 공통 데이터로** (사용자 결정 2026-11-03)
 * 문구·유형·상태·ID 는 원본 그대로다. 바꾼 것은 둘뿐이다.
 * 1. 고객 문의의 회원 → `MEMBERS`(이름을 거기서 읽는다). 원본 회원의 상태(휴면·정지)를 지켰다
 *    | 원본           | 우리      | 근거                                                         |
 *    | -------------- | --------- | ------------------------------------------------------------ |
 *    | Q-8841 정하늘  | 노하린    | 주문 U-S35(09-10 · 포인트 3,000 사용) — 문의 「3,000원 사용」  |
 *    | Q-8840 최민호(휴면) | 구민재(휴면) | 원본 상태 유지                                       |
 *    | Q-8838 이준영  | 박수진    | 정상 회원                                                    |
 *    | Q-8835 박서연  | 백도윤    | 주문 U-R18 반납완료(10-09) — 「반납 후 포토 리뷰」            |
 *    | Q-8831 강지우(정지) | 신우진(정지) | 원본 상태 유지                                       |
 *    | Q-8828 윤서아  | 윤서아    | 회원 상세 마케팅 수신 미동의 — 답변 「해지 처리」와 맞는다    |
 * 2. 날짜 → 주문(9~10월) 뒤 · 시연 기준일(2026-10-19) 이전으로 **간격을 지켜** 옮겼다
 *    (고객 06.18~06.21 → 10.15~10.18 · 셀러 06.30·07.02·07.03 → 10.16·10.18·10.19).
 *    본문·답변 속 날짜·달도 함께 옮겼다(「6/21 수정 배포」→「10/18」 · 「6월 정산」→「9월」 등)
 *
 * ## 기획 확인 필요 (원본 그대로 둠)
 * - SQ-13 「상품 승인이 지연 … 아직 심사 중」 — 2026-08-20 등록 검수가 폐지되어 「등록 즉시 판매중」이다
 * - SQ-12 포근하우스 「정산 명세 반품 이중 차감」 — 우리 정산 샘플에서 포근하우스는 주문이 없어 차감이 없다.
 *   제목은 「반품」, 본문은 「취소 차감」으로 원본 안에서도 어긋난다
 * - 휴면 회원(구민재 · 윤서아)이 문의를 남긴다 — 원본도 휴면 회원(최민호)의 문의가 있다
 * - 화면 설명의 「[전체]/[미답변]/[답변완료] 카드」(annotations 88) vs 코드·194 「[전체] 없음」 → 코드대로
 *
 * ## 상태 색 배정 (§3-1)
 * - `pending`(미답변) = 누가 무언가를 해야 끝나는 상태 → `warning` · `done`(답변완료) = 종결 → `default`
 * ---------------------------------------------------------------------- */

export type SupportAudience = "customer" | "seller";
export type SupportStatus = "pending" | "done";
/** 원본 유형 셀렉트의 3종 그대로다 */
export type SupportType = "account" | "point" | "platform";

/** 고객 문의 한 행 (원본 `INQUIRIES`) */
export interface CustomerInquiry {
  /** 고유 키 `Q-…` — 상세 경로가 이 값을 쓴다 */
  id: string;
  /** 회원 아이디(이메일) — `MEMBERS` 의 키 */
  memberId: string;
  /** 회원명 — `MEMBERS` 에서 읽은 값 */
  member: string;
  type: SupportType;
  title: string;
  body: string;
  status: SupportStatus;
  /** 접수일 `YYYY-MM-DD HH:mm`. 표에는 `ymd` 로 날짜만 낸다 */
  date: string;
  /** 답변일. **미답변이면 `null`** */
  answeredAt: string | null;
  /** 등록된 답변 — 미답변이면 `""` */
  answer: string;
  /**
   * 문의가 가리키는 주문 처리단위 — **화면에 나오지 않는다**(원본에 열이 없다).
   * 샘플 시각이 그 주문과 맞는지 테스트가 확인하는 데만 쓴다
   */
  orderUnit?: string;
}

/**
 * 셀러 문의 한 행 (원본 `SELLER_ASKS`).
 * **유형도 답변일도 없다** — 원본 셀러 표는 5열이고 상세에도 답변일 줄이 없다.
 */
export interface SellerAsk {
  /** 고유 키 `SQ-…` */
  id: string;
  /** 셀러명 — `SELLERS` 에 있는 이름 */
  seller: string;
  title: string;
  body: string;
  status: SupportStatus;
  /** 접수일 `YYYY-MM-DD HH:mm` */
  date: string;
  /** 등록된 답변 — 미답변이면 `""` */
  answer: string;
}

/** 탭 — 원본 칩 `['고객 문의','셀러 문의']`, 기본값은 첫 항목 */
export const AUDIENCE_TABS: { value: SupportAudience; label: string }[] = [
  { value: "customer", label: "고객 문의" },
  { value: "seller", label: "셀러 문의" },
];

/** 셀러 탭으로 바로 여는 쿼리 — 셀러 문의 상세의 [목록]이 돌아오는 곳(원본 `supTab='셀러 문의'`) */
export const SELLER_TAB_QUERY = "seller";

export const LIST_PATH = "/support";
export const SELLER_LIST_PATH = `${LIST_PATH}?tab=${SELLER_TAB_QUERY}`;
export const detailPathOf = (id: string) =>
  `${LIST_PATH}/${encodeURIComponent(id)}`;

/** 상태값 → 라벨 · Tag tone · 툴팁. 툴팁은 원본 `STAT_TIP` 두 문장 그대로 */
export const STATUS_META: Record<
  SupportStatus,
  { label: string; tone: TagTone; tip: string }
> = {
  pending: {
    label: "미답변",
    tone: "warning",
    tip: "접수됐으나 아직 답변하지 않은 문의입니다. 답변을 등록하면 [답변완료]가 됩니다.",
  },
  done: {
    label: "답변완료",
    tone: "default",
    tip: "답변이 등록되어 종결된 문의입니다. 더 진행할 단계가 없습니다.",
  },
};

/** 상태 카드 = 상태 필터 — 원본 `chip.values` 2장. **[전체] 카드는 없다**(`dash:true`) */
export const FILTERS: { value: SupportStatus; label: string }[] = [
  { value: "pending", label: STATUS_META.pending.label },
  { value: "done", label: STATUS_META.done.label },
];

/** 들어오면 「미답변」 — 원본 `chip.def`. [초기화]도 여기로 돌아간다 */
export const DEFAULT_FILTER: SupportStatus = "pending";

/** 건수 단위 */
export const UNIT = "건";

/** 문의 유형 → 라벨 (원본 유형 셀렉트의 어휘 그대로) */
export const TYPE_LABELS: Record<SupportType, string> = {
  account: "회원정보",
  point: "포인트",
  platform: "플랫폼 오류",
};

/** 유형 셀렉트 — 원본 `opts[0]` 이 `유형 전체` 다 */
export const TYPE_FILTERS = [
  { value: "all", label: "유형 전체" },
  { value: "account", label: TYPE_LABELS.account },
  { value: "point", label: TYPE_LABELS.point },
  { value: "platform", label: TYPE_LABELS.platform },
];

/**
 * 검색 조건 — 원본 `search.fieldOpts` 그대로. **첫 항목이 기본값**이다.
 * 원본 `search.fields` 가 `["title","body"]` 라 `all` 은 **제목+내용**이다.
 */
export const SEARCH_FIELDS = [
  {
    value: "mem",
    label: "회원명",
    pick: (row: CustomerInquiry) => row.member,
  },
  {
    value: "kind",
    label: "유형",
    pick: (row: CustomerInquiry) => TYPE_LABELS[row.type],
  },
  {
    value: "all",
    label: "제목+내용",
    pick: (row: CustomerInquiry) => `${row.title} ${row.body}`,
  },
];

/** 검색어 입력의 안내 문구 — 원본 `search.ph` 그대로 */
export const SEARCH_PLACEHOLDER = "검색어 입력";

/** 기간 기준 — 원본 `date.fields`. `pick` 이 `null` 이면 그 행은 기간에서 빠진다 */
export const PERIOD_FIELDS = [
  {
    value: "date",
    label: "접수일",
    pick: (row: CustomerInquiry) => row.date,
  },
  {
    value: "ansDate",
    label: "답변일",
    pick: (row: CustomerInquiry) => row.answeredAt,
  },
];

/**
 * 셀러 문의 요약 — **셀러 탭에서만** 뜬다 (원본 `statrow`). 라벨과 건수뿐 — 누를 수 없다.
 * `status: null` 은 전체 건수. `warn: true` 칸만 수치를 주의색으로(원본 `--warn`).
 */
export const SELLER_SUMMARY: {
  status: SupportStatus | null;
  label: string;
  warn: boolean;
}[] = [
  { status: "pending", label: "미답변 셀러 문의", warn: true },
  { status: null, label: "전체 셀러 문의", warn: false },
];

/** 회원 아이디 → 회원명. 없는 회원이면 샘플 연결이 끊긴 것이라 던진다 */
const memberName = (memberId: string) => {
  const member = MEMBERS.find((item) => item.id === memberId);
  if (!member) throw new Error(`문의 샘플 회원 연결 실패: ${memberId}`);
  return member.name;
};

type InquirySeed = Omit<CustomerInquiry, "member">;

const INQUIRY_SEEDS: InquirySeed[] = [
  {
    id: "Q-8841",
    memberId: "harin.noh@example.com",
    type: "point",
    title: "적립금이 사용 내역과 다르게 차감됐어요",
    body: "구매 시 3,000원을 사용했는데 적립금 내역에는 5,000원이 빠져 있습니다. 확인 부탁드려요.",
    status: "pending",
    date: "2026-10-18 15:20",
    answeredAt: null,
    answer: "",
    orderUnit: "U-S35",
  },
  {
    id: "Q-8840",
    memberId: "minjae.koo@example.com",
    type: "account",
    title: "휴대폰 번호 변경이 안 됩니다",
    body: "기기를 바꾸면서 번호가 변경됐는데 마이페이지에서 수정이 안 됩니다.",
    status: "pending",
    date: "2026-10-18 09:45",
    answeredAt: null,
    answer: "",
  },
  {
    id: "Q-8838",
    memberId: "sujin.park@example.com",
    type: "platform",
    title: "결제 화면이 계속 멈춰요",
    body: "결제하기를 누르면 로딩만 계속되고 다음으로 넘어가지 않습니다. 안드로이드 최신 버전입니다.",
    status: "done",
    date: "2026-10-17 21:10",
    answeredAt: "2026-10-18 10:20",
    answer:
      "안녕하세요 고객님, 특정 안드로이드 버전에서 결제 모듈이 멈추는 현상을 확인해 10/18 수정 배포했습니다. 앱을 최신 버전으로 업데이트하신 뒤 다시 시도해 주세요. 불편을 드려 죄송합니다.",
  },
  {
    id: "Q-8835",
    memberId: "doyoon.baek@example.com",
    type: "point",
    title: "리뷰 적립금이 지급되지 않았어요",
    body: "렌트 반납 후 포토 리뷰를 작성했는데 일주일이 지나도 적립금이 들어오지 않았습니다.",
    status: "pending",
    date: "2026-10-17 20:30",
    answeredAt: null,
    answer: "",
    orderUnit: "U-R18",
  },
  {
    id: "Q-8831",
    memberId: "woojin.shin@example.com",
    type: "platform",
    title: "앱 로그인 시 오류 코드가 떠요",
    body: "로그인 버튼을 누르면 오류 코드 E-402 화면이 뜨고 더 진행되지 않습니다.",
    status: "pending",
    date: "2026-10-16 19:40",
    answeredAt: null,
    answer: "",
  },
  {
    id: "Q-8828",
    memberId: "seoa.yoon@example.com",
    type: "account",
    title: "마케팅 수신 동의를 해지하고 싶어요",
    body: "문자와 앱 알림을 모두 받지 않도록 변경하고 싶은데 설정 위치를 못 찾겠습니다.",
    status: "done",
    date: "2026-10-15 11:05",
    answeredAt: "2026-10-16 14:00",
    answer:
      "안녕하세요 고객님, 마이 › 내 정보 › 마케팅 수신 동의에서 문자·앱 알림을 각각 해지하실 수 있습니다. 요청하신 대로 10/16 자로 두 항목 모두 해지 처리해 드렸습니다.",
  },
];

/** 고객 문의 — 원본 6건 · 미답변 4 / 답변완료 2 · 최신순 */
export const CUSTOMER_INQUIRIES: CustomerInquiry[] = INQUIRY_SEEDS.map(
  (seed) => ({ ...seed, member: memberName(seed.memberId) }),
);

/** 셀러 문의 — 원본 3건 · 미답변 2 / 답변완료 1 · 셀러 3곳 모두 `SELLERS` 에 있다 */
export const SELLER_ASKS: SellerAsk[] = [
  {
    id: "SQ-14",
    seller: "베이비노리터",
    title: "공항 픽업 등록 시 김해공항도 선택 가능한가요?",
    body: "부산 지역 셀러입니다. 김해공항 픽업을 제공하고 싶습니다.",
    status: "pending",
    date: "2026-10-19 10:20",
    answer: "",
  },
  {
    id: "SQ-13",
    seller: "리틀베이비",
    /* ⚠️ 기획 확인 필요 — 등록 검수 폐지(2026-08-20) 뒤의 「심사 중」. 원본 그대로 둔다 */
    title: "상품 승인이 지연되고 있어요",
    body: "3일 전 등록한 상품이 아직 심사 중입니다. 확인 부탁드립니다.",
    status: "pending",
    date: "2026-10-18 16:40",
    answer: "",
  },
  {
    id: "SQ-12",
    seller: "포근하우스",
    /* ⚠️ 기획 확인 필요 — 포근하우스는 우리 정산 샘플에 차감 건이 없다. 원본 그대로 둔다 */
    title: "정산 명세서에 반품 건이 이중 차감된 것 같습니다",
    body: "9월 정산 명세의 취소 차감 항목을 확인 부탁드립니다.",
    status: "done",
    date: "2026-10-16 09:30",
    answer:
      "확인 결과 취소 차감 규칙 정정 대상 건으로, 10월 명세에서 정정 반영됩니다.",
  },
];

/**
 * 날짜 표기 — **날짜만, 점 구분자**(원본 `2026.06.21`). 값이 없으면 `-`(원본 「미답변 행의 답변일은 '-'」).
 */
export const EMPTY_CELL = "-";

export const ymd = (dateText: string | null) =>
  dateText ? dateText.slice(0, 10).replace(/-/g, ".") : EMPTY_CELL;

/** 한 페이지 행 수 — **고객 탭에만** 쓴다. 셀러 탭은 원본이 페이저 없이 전부 보인다 */
export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];

/* -------------------------------------------------------------------------
 * 검색조건 요약 — 접은 `FilterBar` 한 줄 (형제 화면과 같은 규칙).
 * 원본 `fbSummary` 순서: 기간 → 셀렉트(유형) → 검색어. 상태는 넣지 않는다 — 건수 카드가 말한다.
 * ---------------------------------------------------------------------- */

export const NO_FILTER_TEXT = "조건 없음 (전체)";

const dotDate = (value: Date) =>
  `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, "0")}.${String(
    value.getDate(),
  ).padStart(2, "0")}`;

export const filterSummary = ({
  dateLabel,
  from,
  to,
  typeLabel,
  fieldLabel,
  keyword,
}: {
  dateLabel: string;
  from?: Date;
  to?: Date;
  /** 유형 셀렉트 — 「유형 전체」면 `undefined` */
  typeLabel?: string;
  fieldLabel: string;
  keyword: string;
}): string => {
  const parts: string[] = [];
  if (from)
    parts.push(`${dateLabel} ${dotDate(from)}${to ? `~${dotDate(to)}` : ""}`);
  if (typeLabel) parts.push(typeLabel);
  if (keyword.trim() !== "") parts.push(`${fieldLabel} «${keyword.trim()}»`);
  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};
