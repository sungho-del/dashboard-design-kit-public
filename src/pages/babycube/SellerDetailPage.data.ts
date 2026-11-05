import type { TagTone } from "../../components/ui";
import {
  COMMISSION_RATE_MESSAGE,
  FILTERS,
  parseCommissionRate,
  SELLERS,
  type BizType,
  type DealKind,
  type DealScope,
  type Seller,
  type SellerBankAccount,
  type SellerProduct,
  type SellerStatus,
} from "./SellerListPage.data";
import { COUPONS, couponStatus } from "./CouponListPage.data";

/* -------------------------------------------------------------------------
 * S03-D 셀러 상세 (BO-SEL-002) — 도메인 층
 *
 * 짝이 되는 뼈대: `SellerDetailPage.tsx`
 *
 * ## ⚠️ 셀러 레코드는 **목록과 같은 것을 쓴다**
 * `SellerListPage.data.ts` 의 `SELLERS` 를 그대로 읽는다. 상세용 배열을 따로 두면
 * 한쪽만 고쳤을 때 **같은 셀러의 대표자·연락처가 화면마다 달라진다.**
 * 실 API 를 붙이면 이 파일의 `findSeller` 가 상세 조회 호출로 바뀐다.
 *
 * ## 갈아끼울 것 (이 파일 전체)
 *
 * | 실물 이름            | 역할                                              |
 * | -------------------- | ------------------------------------------------- |
 * | `findSeller`         | 경로의 id → 셀러 레코드                           |
 * | `SECTIONS`           | 섹션 제목 3종 (원본 `sellers.form` 구성 순서)     |
 * | `FIELD_COPY`         | 입력칸 라벨·자리표시자·글자 수 한도·빈 값 오류    |
 * | `BIZ_TYPES`          | 사업자 유형 택1 (법인/개인)                       |
 * | `DEAL_SCOPES`        | 상품 취급 유형 택1 (전체/렌트/판매)               |
 * | `SELLER_STATES`      | 상태 택1 (입점/퇴점 처리중/퇴점)                  |
 * | `HYGIENE_OPTIONS`    | 위생인증 택1                                      |
 * | `SALE_STATUS_META`   | 등록 상품 표의 판매 상태 배지                     |
 * | `EXIT_COPY`          | 퇴점 확인 창 문구                                 |
 * | `BANK_COPY`          | 정산 정보 카드 문구 (개발 `BankAccountCard` 그대로) |
 * | `bankStatusText`     | 정산 계좌 상태 한 줄 (미등록·파기·못 읽음·등록됨)  |
 * | `bankAccountError`   | [계좌 저장] 검사 (개발 `validateBankAccount`)      |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - **본사 계정은 상태(입점)만 잠근다** — 나머지는 일반 셀러처럼 고친다. 수수료율은 본사 행도 입력칸(처음 0%)
 *   (판정 Q20-1 · 디자인 §3 #15 — 2026-10-15 「수수료율 0% 잠금」을 풀었다)
 * - 수수료율은 **0 초과 100 이하 · 소수 둘째 자리까지**, **본사 행만 0 이상**(판정 Q20-5 · `SellerListPage.data.ts` 의 공용 규칙).
 *   벗어난 값은 저장할 수 없다. 6~16% 밖은 막지 않고 칸 아래 경고만(디자인 §3 #12)
 * - 퇴점 확인 창은 다섯 줄이다(디자인 §3 #11 · 개발 `ExitGate`) — 진행 중 렌트 · 미정산 회차 · 미해결 클레임 ·
 *   **판매 가능한 상품 = 판매중 + 품절** · 유효 쿠폰(이 셀러 쿠폰 중 지금 「사용」). 정산은 금액이 아니라 **회차**다.
 *   남은 건이 있어도 **막지 않고 경고만** 한다 — 경고 판정에서 쿠폰은 뺀다(미종결 건이 아니라 함께 내려가는 대상)
 * ---------------------------------------------------------------------- */

/**
 * 경로의 id(셀러 코드)로 셀러를 찾는다.
 *
 * 주소창에 손으로 친 id·지워진 셀러가 있을 수 있으므로 **없을 수 있다는 사실을
 * 타입으로 남긴다** — 뼈대가 "없는 셀러" 화면을 그리게 하는 것이 이 `undefined` 다.
 */
export const findSeller = (id: string): Seller | undefined =>
  SELLERS.find((seller) => seller.id === id);

/** 원본 `sellers.form` 의 섹션 구성 순서 — 정산 정보는 운영 정보와 등록 상품 사이(디자인 §3 #6 · 개발 S-7) */
export const SECTIONS = {
  basic: "셀러 정보",
  operation: "운영 정보",
  bank: "정산 정보",
  products: "등록 상품",
} as const;

/**
 * 고치는 글자 값 — 원본 `gInput(t, key, placeholder, max)` 그대로.
 * 형식 검사(전화번호 패턴 등)는 원본에 없어 더하지 않는다. 빈 값만 막는다(원본 `req`).
 */
export const FIELD_COPY = {
  name: {
    label: "셀러명",
    placeholder: "셀러(상호)명",
    max: 40,
    empty: "셀러명을 입력해 주세요.",
  },
  ceo: {
    label: "대표자",
    placeholder: "대표자명",
    max: 20,
    empty: "대표자를 입력해 주세요.",
  },
  phone: {
    label: "연락처",
    placeholder: "010-0000-0000",
    max: 20,
    empty: "연락처를 입력해 주세요.",
  },
} as const;

export type TextFieldKey = keyof typeof FIELD_COPY;

/** 소개 — 원본 `gText(t, "intro", "셀러 소개를 입력하세요")` (필수 아님) */
export const INTRO_PLACEHOLDER = "셀러 소개를 입력하세요";

/** 사업자 유형 택1 — 원본 `[법인][개인]` */
export const BIZ_TYPES: { value: BizType; label: string }[] = [
  { value: "corporate", label: "법인" },
  { value: "individual", label: "개인" },
];

/** 상품 취급 유형 택1 — 원본 `[전체][렌트][판매]` */
export const DEAL_SCOPES: { value: DealScope; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "rent", label: "렌트" },
  { value: "sale", label: "판매" },
];

/** 상태 택1 — 원본 `[입점][퇴점 처리중][퇴점]`. 목록의 상태 카드와 같은 어휘·순서다 */
export const SELLER_STATES = FILTERS as {
  value: SellerStatus;
  label: string;
}[];

/**
 * 위생인증 택1 — 원본 `[인증][인증안됨]`.
 *
 * 값이 불리언인데 버튼이 둘이라, 화면은 문자열로 다룬다.
 * (`SegmentedControl` 은 문자열 값을 쓴다)
 */
export const HYGIENE_OPTIONS = [
  { value: "certified", label: "인증" },
  { value: "none", label: "인증안됨" },
];

export const hygieneValue = (certified: boolean) =>
  certified ? "certified" : "none";

/** 등록 상품 표의 `유형` 열 — 둘 다 취급하는 상품은 배지 둘(원본 `modeTags`) */
export const DEAL_KIND_LABEL: Record<DealKind, string> = {
  rent: "렌트",
  sale: "판매",
};

/**
 * 등록 상품 표의 `판매 상태` 배지 — **상품 관리와 같은 어휘·색**이다.
 *
 * 판매중은 진행, 품절·판매중지는 정상적으로 멈춘 상태라 중립,
 * 재심사요청은 본사가 판단해야 끝나는 상태라 warning, 반려는 본사가 내린 비정상 종료라 critical.
 */
export const SALE_STATUS_META: Record<
  SellerProduct["saleStatus"],
  { label: string; tone: TagTone }
> = {
  onSale: { label: "판매중", tone: "success" },
  rereview: { label: "재심사요청", tone: "warning" },
  rejected: { label: "반려", tone: "critical" },
  stopped: { label: "판매중지", tone: "default" },
  soldout: { label: "품절", tone: "default" },
};

/** 전시 상태 배지 — 원본 `전시중 / 숨김` */
export const SHOWN_META = {
  shown: { label: "전시중", tone: "success" as TagTone },
  hidden: { label: "숨김", tone: "default" as TagTone },
};

/** 본사 행 등록 상품 — 직영 상품 등록 · 상품코드 → 상품 상세(디자인 §3 #3) */
export const PRODUCT_NEW_PATH = "/products/new";
export const PRODUCT_PATH = (code: string) => `/products/${code}`;

/** 등록 상품 표 페이지 — 원본 `pager("sellerProds")`, 목록과 같은 규격 */
export const PRODUCT_PAGE_SIZE = 10;
export const PRODUCT_PAGE_SIZES = [10, 20, 50, 100];

/**
 * 본사 계정 안내 — 원본 문구 그대로.
 * 본사는 자기 자신에게 수수료를 매기지 않고 퇴점·심사 대상도 아니다.
 */
export const HEADQUARTERS_NOTICE =
  "본사 행 — 퇴점·심사 관리 대상이 아닙니다 (수수료율 0% 확정)";

/** 수수료율 입력 아래 안내 — 원본 문구 그대로 */
export const COMMISSION_HINT =
  "셀러 정산(플랫폼 수수료) 계산의 기준 요율입니다.";

/**
 * 수수료율 검사 — 허용 꼴(0 초과 100 이하 · 소수 둘째 자리 · 본사 행만 0 이상)이 아니면 개발 문구 한 줄
 * (빈 칸·글자·범위 모두). 본사 행 오류 문구는 기획 확인 요청 3번 답 전까지 같은 문구다
 */
export const commissionError = (value: string, headquarters = false) =>
  parseCommissionRate(value, headquarters) === null
    ? COMMISSION_RATE_MESSAGE
    : null;

/** 저장 성공 알림 — 원본 하단 액션 바의 [저장하기] 결과 */
export const SAVED_TEXT = "변경 내용을 저장했습니다";

/* -------------------------------------------------------------------------
 * 퇴점 확인 창 — 원본 `gateQuit` (C-5 ⓐ) · 개발 `ExitGate`(디자인 §3 #11 · D-218)
 *
 * 저장된 상태가 퇴점이 아닌데 [퇴점] 으로 바꿔 저장할 때만 뜬다.
 * 0건이어도 줄을 지우지 않는다 — "없음"을 읽는 것이 곧 확인이다.
 * ---------------------------------------------------------------------- */

/** 판매 가능한 상품 — **판매중 + 품절**만(원본). 임시저장·반려·재심사요청은 퇴점이 덮지 않는다 */
export const saleableCount = (catalog: SellerProduct[]) =>
  catalog.filter(
    (product) =>
      product.saleStatus === "onSale" || product.saleStatus === "soldout",
  ).length;

/**
 * 유효 쿠폰 — 이 셀러가 발행한 쿠폰 중 지금 「사용」 상태(중지·만료 제외).
 * 개발은 서버 값(`activeCouponCount`)이다. 퍼블은 쿠폰관리 원장(`COUPONS`)에서 센다
 */
export const activeCouponCount = (seller: Seller) =>
  COUPONS.filter(
    (coupon) =>
      coupon.hq === null &&
      coupon.seller === seller.name &&
      couponStatus(coupon) === "active",
  ).length;

/** 경고를 판정하는 줄 수 — 앞 네 줄. 쿠폰은 미종결 건이 아니라 퇴점과 함께 내려가는 대상이라 뺀다(개발) */
export const UNRESOLVED_ROWS = 4;

export const exitRows = (seller: Seller) => {
  const work = seller.openWork ?? { rents: 0, settlements: 0, claims: 0 };
  return [
    { label: "진행 중 렌트", count: work.rents, unit: "건" },
    { label: "미정산 회차", count: work.settlements, unit: "회" },
    { label: "미해결 클레임", count: work.claims, unit: "건" },
    {
      label: "판매 가능한 상품",
      count: saleableCount(seller.catalog),
      unit: "개",
    },
    { label: "유효 쿠폰", count: activeCouponCount(seller), unit: "장" },
  ];
};

export const EXIT_COPY = {
  title: (name: string) => `퇴점 처리 확인 · ${name}`,
  none: "없음",
  /** 첫 안내 — 개발 문장에서 「임시저장·반려·재심사요청 이력은 덮지 않습니다.」 만 뺐다(부록 A C71) */
  note: (products: number, coupons: number) =>
    `퇴점하면 로그인할 수 없고 판매 가능한 상품 ${products}개는 판매중지·전시중지로 전환됩니다.` +
    (coupons > 0
      ? ` 유효 쿠폰 ${coupons}장은 사용중지로 전환되어 고객 쿠폰함·주문서에서 사라집니다.`
      : ""),
  /** 둘째 안내(D-218 · D-219) — 앱 이름은 「입점사 어드민」(판정 Q10 「메뉴·앱 이름은 그대로」) */
  notice:
    "퇴점 처리 시 셀러에게 알림톡(퇴점 처리 완료)이 발송되고 입점사 어드민 세션이 종료됩니다.",
  /* 렌트·정산·클레임이 남았을 때만 덧붙는다 — 막지 않고 알린다 */
  warning:
    "남아 있는 건은 퇴점 후에도 이어서 처리해야 합니다 — 잔여 주문·정산을 먼저 마무리하려면 [퇴점 처리중]으로 두세요.",
  confirm: "퇴점 처리",
  /** 완료 알림 — 개발 그대로(0 인 줄은 붙이지 않는다) */
  done: (products: number, coupons: number) =>
    "퇴점 처리했습니다." +
    (products > 0 ? ` 상품 ${products}개를 판매중지했습니다.` : "") +
    (coupons > 0 ? ` 쿠폰 ${coupons}장을 사용중지했습니다.` : ""),
};

/* -------------------------------------------------------------------------
 * 정산 정보 카드 — 개발 `BankAccountCard`(S-7 · D-261·265) 문구·검사 그대로
 *
 * 본사만 입력한다. 저장 뒤 입력칸을 비우고 마스킹 값만 보인다(평문 재표시 없음).
 * 퇴점 셀러는 상태 한 줄·통장사본만 읽는다. 퍼블은 저장·업로드·문서 보기를 하지 않는다(알림만).
 * ---------------------------------------------------------------------- */

export const BANK_COPY = {
  hq: "본사 행은 정산 계좌를 등록하지 않습니다.",
  unregistered:
    "정산 계좌가 등록되지 않았습니다. 등록 전에는 [지급 처리]가 막힙니다.",
  purged: "보존 기간이 지나 계좌번호를 파기했습니다.",
  unreadable: "계좌번호를 읽을 수 없습니다(구 형식). 다시 등록해 주세요.",
  accountNoPlaceholder: "숫자와 하이픈만",
  noBankbook: "등록된 통장사본이 없습니다.",
  bankbookView: "문서 보기",
  bankbookHelp: "PDF·JPG·PNG · 최대 10MB",
  notice:
    "계좌번호는 암호화해 보관하며 본사 정산 담당자만 열람합니다. 정산 완료 후 관계 법령에 따라 5년 보관 뒤 파기하고, 통장 사본은 입점 종료 시 파기합니다.",
  saved: "정산 계좌를 저장했습니다.",
  needNames: "은행명·예금주를 입력해 주세요.",
  badAccountNo: "계좌번호는 숫자와 하이픈만 6~30자로 입력해 주세요.",
  /** 문서 열기는 파일 연동이라 퍼블은 알림만(상품 이미지·주소록과 같은 꼴) */
  viewPending: "통장사본 보기는 개발 연동 시 제공됩니다.",
  save: "계좌 저장",
} as const;

/** 입력 글자 수 한도 — 개발 `maxLength` */
export const BANK_MAX = { bankName: 50, holder: 100, accountNo: 30 } as const;

/** 정산 계좌 상태 한 줄 — 개발 `bankAccountStatus` */
export const bankStatusText = (account: SellerBankAccount | undefined) => {
  if (!account) return BANK_COPY.unregistered;
  if (account.state === "purged") return BANK_COPY.purged;
  if (account.state === "unreadable") return BANK_COPY.unreadable;
  return `등록됨 ${account.bankName} ${account.masked} (${account.holder}) · ${ymd(account.registeredAt)} · ${account.registeredBy}`;
};

/** 계좌번호 — 숫자·하이픈 6~30자 · 숫자 6개 이상(개발 `ACCOUNT_NO`) */
const ACCOUNT_NO = /^[0-9-]{6,30}$/;

/** [계좌 저장] 검사 — 개발 `validateBankAccount`. 통과하면 `null` */
export const bankAccountError = (form: {
  bankName: string;
  holder: string;
  accountNo: string;
}) => {
  if (!form.bankName.trim() || !form.holder.trim()) return BANK_COPY.needNames;
  const no = form.accountNo.trim();
  if (!ACCOUNT_NO.test(no) || (no.match(/[0-9]/g) ?? []).length < 6)
    return BANK_COPY.badAccountNo;
  return null;
};

/** 날짜만 점 표기로 — 원본 `ymd` */
export const ymd = (value: string | null) =>
  value ? value.slice(0, 10).replace(/-/g, ".") : "-";

/**
 * 등록 상품 표의 일시 — 원본은 여기서 **초까지** 낸다
 * (`2026.05.10 09:14:22`). 목록 화면의 `ymd` 와 다르다.
 */
export const stampText = (value: string) =>
  `${value.slice(0, 10).replace(/-/g, ".")} ${value.slice(11)}`;

/** 평점 — 원본 v0.4 `★ ${rating}` (목록과 같은 표기) */
export const ratingText = (value: number) => `★ ${value.toFixed(1)}`;

/** 등록 상품수 */
export const countText = (value: number) =>
  `${value.toLocaleString("ko-KR")}개`;

/** 등록 상품이 하나도 없을 때 */
export const PRODUCT_EMPTY_TITLE = "등록된 상품이 없습니다";
export const PRODUCT_EMPTY_DESCRIPTION =
  "이 셀러가 등록한 상품이 아직 없습니다.";
