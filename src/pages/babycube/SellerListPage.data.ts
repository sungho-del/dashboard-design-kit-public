import type { TagCustomStyle, TagTone } from "../../components/ui";
import {
  categoryNameOf,
  LISTED_PRODUCTS,
  type Product,
} from "./ProductListPage.data";

/* -------------------------------------------------------------------------
 * S03 셀러 관리 (BabyCube 본사 운영 어드민) — 목록형 화면의 **도메인 층**
 *
 * 짝이 되는 뼈대: `SellerListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 갈아끼울 것 (이 파일 전체)
 *
 * | 실물 이름         | 역할                                       |
 * | ----------------- | ------------------------------------------ |
 * | `Seller`          | 표 한 행의 타입                            |
 * | `STATUS_META`     | 상태값 → 라벨·Tag tone·설명(툴팁)          |
 * | `HYGIENE_BADGE`   | 위생인증 **셀러에만** 붙는 자격 배지       |
 * | `HYGIENE_FILTERS` | 위생인증 셀렉트 (원본 `chips.hygiene`)     |
 * | `DATE_FIELDS`     | 기간 기준 셀렉트 (입점일 / 퇴점일)         |
 * | `SELLERS`         | 샘플 데이터                                |
 * | `FILTERS`         | 상태 대시 = 상태 필터                      |
 * | `SEARCH_FIELDS`   | 검색 조건 셀렉트 (검색 필드 선택형)        |
 * | `rate`·`num`·`score`·`ymd`·`productCount` | 표의 수치 포맷 (% · 수 · 평점 · 날짜 · 개) |
 * | `PAGE_SIZE`       | 페이지당 행 수                             |
 * | `HQ_BADGE`        | 본사 계정 셀러명 옆 배지                   |
 * | `filterSummary`   | 접힌 검색조건 줄의 요약                    |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(`YYYY-MM-DD HH:mm`, 기간 필터가 파싱)를 갖는다.
 *   여기서 `date` 는 **입점일**이다
 * - `exitDate` 는 **퇴점 셀러는 퇴점일, 퇴점 처리중 셀러는 퇴점 예정일**이다(원본 `quitAt` 하나에 둘 다 담는다).
 *   입점 셀러는 `null`. 뼈대는 퇴점일 **열**을 상태 필터가 `"closed"` 일 때만 붙인다(원본과 같다) —
 *   예정일은 열로 보이지 않고 퇴점일 기준 기간 필터에만 걸린다
 * - `DATE_FIELDS[].pick` 이 기간 필터가 훑을 값을 고른다 — `null` 이면 그 행은 기간에서 빠진다
 * - **본사 직영(`isHeadquarters`)은 수수료율 처음 0%, 수정 가능**이다 — 목록·상세 모두 입력칸, 본사 행만 0% 이상
 *   (판정 Q20-1 · Q20-5 · 디자인 §3 #15. 2026-10-15 「상태·수수료 잠금」 중 수수료 잠금을 풀었다 — 상태는 잠근다)
 * - **퇴점 처리중·퇴점 셀러는 수수료율 읽기 전용**(`isCommissionLocked` — 판정 Q8). 목록은 값만, 상세는 값 + 안내
 * - `STATUS_META` 의 키는 `Seller["status"]` 유니온과 정확히 일치한다
 * - `FILTERS[0].value` 는 `"all"`(뼈대가 필터 해제로 취급)이고,
 *   나머지 `value` 는 **`SellerStatus` 와 같은 값**이다 — 뼈대가 상태별 건수를 셀 때 쓴다
 * - `HYGIENE_FILTERS[0].value` 도 `"all"`, 나머지는 `"certified"` · `"none"`
 * - `SEARCH_FIELDS[].pick` 이 그 조건으로 무엇을 훑을지 정한다 — 뼈대는 필드 이름을 모른다
 *
 * ## 상태 색 배정 근거 (§3-1 "상태 색 배정")
 * 상태 3개라 겹치지 않는다. **원본 배지 클래스는 참고하지 않았다**
 * (원본은 입점=`b-prog` · 퇴점 처리중=`b-prog` · 퇴점=`b-done` 이라 앞의 둘이 같은 색이다).
 * | 상태        | tone      | 이유                                                          |
 * | ----------- | --------- | ------------------------------------------------------------- |
 * | 입점        | `success` | 심사를 통과해 **영업 중**인 정상 진행 상태                    |
 * | 퇴점 처리중 | `warning` | 잔여 주문·정산을 **운영자가 정리해야 끝난다** — 전형적 warning |
 * | 퇴점        | `default` | 종결 상태. 되돌아가지 않으므로 더 볼 것이 없다                |
 *
 * ## ⚠️ 분류 배지는 상태색을 쓰지 않는다 — 그리고 **한쪽에만** 붙인다
 * 위생인증은 **자격 배지**이지 상태가 아니다. 여기에 `success`/`warning` 을 쓰면
 * 목록을 훑을 때 "지금 주의를 요하는 건"과 섞여 상태 신호가 흐려진다.
 * 그래서 인증 배지는 `custom` tone 에 **highlight 계열 semantic 토큰**을 주입한다 —
 * 초록/노랑/빨강은 상태, 파랑은 분류라는 규칙을 화면 전체에서 지킨다.
 * (원본의 `b-green` 색은 쓰지 않는다. **어휘 `위생인증셀러` 만** 가져왔다)
 *
 * 위생인증은 §3-1 의 **"플래그(있음/없음)"** 이지 대등한 분류가 아니라,
 * 인증된 셀러만 배지를 단다(원본도 인증 셀러에만 배지를 붙인다).
 *
 * ## 원본 저장본(`_plan/babycube-admin/chunks/17parv4prp8n5.js`)과 대조한 결과
 * 원본은 셀러 컬럼 배열을 페이지 안에서 조립하며, `"퇴점" === stat` 일 때만 퇴점일 열을 밀어 넣는다.
 *
 * - **그대로 가져온 것**
 *   - 컬럼 이름과 **순서**: 셀러명 → 위생인증 → 대표명 → 연락처 → 상태 →
 *     수수료율 → 입점일 → [퇴점일] → 상품수 → 평점 (관리 열은 **없다**)
 *   - **퇴점일 열의 조건부 노출**과 그 열의 정렬
 *   - 본사 배지 `본사` · 위생인증 배지 문구 `위생인증셀러`
 *   - 수치 표기(v0.4 `SCREENS.sellers`): 수수료율 `${n}%`(자릿수 패딩 없음) · 상품수 `${n}개` ·
 *     평점 `★ ${n}` · 날짜 `ymd`(**날짜만**)
 *   - 필터 축 3개: 기간(입점일/퇴점일 **두 기준**) · 위생인증(인증/인증안됨) ·
 *     검색 조건(셀러명/대표명/연락처)
 *   - 상태 어휘 3종과 상태별 안내 문구(v0.4 `STAT_TIP` 의 설명 + 다음 단계)
 * - **샘플**: 상세까지 갖춘 7곳(우리가 만든 값) + v0.4 `SELLERS` 의 25곳 + 주문·상품 샘플 셀러 6곳을 간이로(`BRIEF_ROWS`) —
 *   한 상태 탭에 2페이지가 생기도록 38곳이다
 * - **우리 규칙을 우선한 곳**: 값이 없는 셀을 원본은 **빈칸**으로 두지만 우리는 `-`(`EMPTY_CELL`)로
 *   채운다 — 빈 셀은 "값이 없음"인지 "못 불러왔음"인지 구별되지 않는다
 * ---------------------------------------------------------------------- */

export type SellerStatus = "active" | "exiting" | "closed";

/** 사업자 유형 — 원본 `sec.sellers_basic` 의 `[법인][개인]` 택1 */
export type BizType = "corporate" | "individual";

/** 상품 취급 유형 — 원본 `[전체][렌트][판매]` 택1 */
export type DealScope = "all" | "rent" | "sale";

/**
 * 제출 서류 한 건 — 사업자등록증 · 통신판매업신고증.
 *
 * 원본은 파일 링크(`📄 사업자등록증.pdf`)와 번호를 **한 줄에** 두고 `[보기 ▸]` 를 단다.
 * 파일 자체는 서버에 있으므로 여기는 **보여줄 이름과 번호만** 든다.
 */
export interface SellerDocument {
  fileName: string;
  /** 등록번호 · 신고번호 */
  number: string;
}

/**
 * 셀러가 등록한 상품 한 건 — 상세의 "등록 상품" 표가 쓴다 (원본 `sec.sellers_prod`).
 * No 는 들고 있지 않다 — 표가 페이지 안 순번(`start + i + 1`)으로 센다.
 * ⚠️ **임시저장 초안은 담지 않는다**(원본 — 본사 화면 어디에도 내지 않는다).
 */
export interface SellerProduct {
  /** 렌트 / 판매. 둘 다 취급하는 상품은 둘 다 든다(원본 `mode: "both"`) */
  kinds: DealKind[];
  /** 판매 상태 — 상품 관리와 같은 어휘 */
  saleStatus: "onSale" | "soldout" | "stopped" | "rejected" | "rereview";
  code: string;
  name: string;
  category: string;
  /** `YYYY-MM-DD HH:mm:ss` — 원본은 상세 표에서 **초까지** 낸다 */
  createdAt: string;
  updatedAt: string;
  /** 전시중 / 숨김 */
  shown: boolean;
}

/** 이 파일 안에서 쓰는 렌트/판매 두 갈래 */
export type DealKind = "rent" | "sale";

export interface Seller {
  /** 셀러 코드 — 고유키. 표의 No 는 이것이 아니라 조회 결과의 역순 순번이다 */
  id: string;
  name: string;
  /**
   * 본사 직영 계정인지. 본사도 셀러로 등록돼 자기 상품을 판다
   * (쿠폰 발행 주체가 본사/셀러로 갈리는 것과 같은 사실이다 — `CouponListPage.data.ts`).
   * 참이면 셀러명 옆에 `본사` 배지가 붙는다 — 원본과 같다.
   */
  isHeadquarters: boolean;
  /** 대표명 */
  ceo: string;
  phone: string;
  /**
   * 주소 — 셀러 상세 「주소」 행의 두 칸(도로명 주소 / 상세 주소 · 우편번호). 필수가 아니라 없을 수 있다
   * (확인 요청 답(2026-11-06) 11번 · 개발 `SellerDetailScreen`)
   */
  roadAddress?: string;
  detailAddress?: string;
  /** 수수료율(%) — 6~16 범위. **본사 직영은 0 확정** */
  commission: number;
  /** 입점일 `YYYY-MM-DD HH:mm` — 뼈대의 기간 필터가 이 형식을 파싱한다 */
  date: string;
  /** 퇴점일 — 퇴점 셀러는 퇴점한 날, 퇴점 처리중 셀러는 **예정일**. 입점 셀러는 `null` */
  exitDate: string | null;
  /** 등록 상품수 — 입점 셀러는 `catalog` 길이(판정 Q9 · `withListedProducts`). 본사 행만 샘플 값(실제 수는 개발이 센다) */
  products: number;
  /** 평점 (5점 만점, 소수 한 자리) */
  rating: number;
  /** 위생인증 셀러 여부 */
  hygiene: boolean;
  status: SellerStatus;

  /* ── 여기부터는 **셀러 상세(BO-SEL-002)** 가 쓰는 값이다 ──
     목록 표에는 나오지 않지만 같은 레코드에 속한다. 상세만 따로 배열을 두면
     한쪽만 고쳤을 때 같은 셀러의 대표자·연락처가 화면마다 달라진다. */

  bizType: BizType;
  /** 상품 취급 유형 — 본사는 `all` 이다 */
  dealScope: DealScope;
  bizLicense: SellerDocument;
  salesLicense: SellerDocument;
  /** 셀러 소개 — 원본 `소개` 텍스트영역 */
  intro: string;
  /** 등록 상품 — 상세의 표가 그대로 쓴다. 입점 셀러는 상품 목록의 그 셀러 행이다(판정 Q9) */
  catalog: SellerProduct[];
  /**
   * 퇴점 확인 창이 세는 **남은 일** — 원본 `sellerExitCount` 의 셋(판매 중 상품은 `catalog` 에서 센다).
   * 실 API 에서는 렌트·정산·클레임 조회 결과다. 샘플은 정적 값이고, 없으면 모두 0 이다.
   */
  openWork?: { rents: number; settlements: number; claims: number };
  /**
   * 정산 계좌 — 셀러 상세 「정산 정보」 카드(디자인 §3 #6 · 개발 `BankAccountCard`). 없으면 **미등록**.
   * 계좌번호는 마스킹 값만 든다(평문은 본사 화면에도 다시 보이지 않는다 · D-261)
   */
  bankAccount?: SellerBankAccount;
}

/** 정산 계좌 — 본사만 입력한다(셀러 화면은 읽기 전용·마스킹) */
export interface SellerBankAccount {
  /** 등록됨 · 보존 기간이 지나 계좌번호 파기 · 구 형식이라 계좌번호를 못 읽음 */
  state: "registered" | "purged" | "unreadable";
  bankName: string;
  holder: string;
  /** 마스킹된 계좌번호 — 개발 `accountNoMasked` 꼴(`***-***-**6789`) */
  masked: string;
  /** 등록일 `YYYY-MM-DD HH:mm` */
  registeredAt: string;
  registeredBy: string;
  /** 통장사본 — 없으면 「등록된 통장사본이 없습니다.」 */
  bankbook?: { fileName: string; uploadedAt: string };
}

/* -------------------------------------------------------------------------
 * 수수료율 규칙 — 개발 `lib/commission-rate.ts`(M-8 · D-217 · 판정 Q20-5 · 디자인 §3 #12).
 * 셀러 목록 셀 · 셀러 상세 · 입점 심사 일괄 승인 · 입점 심사 상세 승인이 **이 규칙 하나**를 쓴다.
 * 허용 = 0 < r ≤ 100 · 소수 둘째 자리까지. 6~16% 밖은 막지 않고 경고만 한다.
 * **본사 행만 0% 이상**(판정 Q20-1 · Q20-5 · 디자인 §3 #15 · 개발 §2-1 「0 초과 규칙에 예외 추가」) —
 * `parseCommissionRate(값, true)`. 본사 행도 상한 100 · 소수 둘째 자리는 같은 규칙이고, 6~16% 경고는 본사 행에
 * 띄우지 않는다(확인 요청 답(2026-11-06) 3번). 본사 행 오류 문구는 기획에 다시 묻는 중이라 셀러 행과 같은 문구다.
 * ---------------------------------------------------------------------- */

/** 허용 꼴이 아닐 때 — 개발 문구에서 「입점사」만 판정 Q10 대로 「셀러」 */
export const COMMISSION_RATE_MESSAGE =
  "셀러 수수료율은 0보다 크고 100 이하, 소수 둘째 자리까지 입력해 주세요.";

/** 허용 범위 안이지만 일반 범위(6~16) 밖 — 경고 한 줄(저장은 막지 않는다) */
export const COMMISSION_RATE_WARNING =
  "일반적인 범위(6~16%)를 벗어난 요율이에요. 저장 전에 확인해 주세요.";

/** 입력 글자 → 허용 요율 · 아니면 `null` (개발 `parseCommissionRateText`). 본사 행은 0 도 받는다 */
export const parseCommissionRate = (
  value: string,
  headquarters = false,
): number | null => {
  const text = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const rate = Number(text);
  return (headquarters ? rate >= 0 : rate > 0) && rate <= 100 ? rate : null;
};

/** 6~16% 밖인가 — 허용 요율일 때만 참(개발 `isAtypicalCommissionRate`) */
export const isAtypicalCommission = (rate: number | null) =>
  rate !== null && (rate < 6 || rate > 16);

/** 입력칸은 숫자와 점만 받는다(개발 `replace(/[^0-9.]/g, "")`) */
export const commissionInput = (value: string) => value.replace(/[^0-9.]/g, "");

/**
 * 셀러 목록 셀 [수정] 알림 — 개발 `CommissionRateCell` 그대로(목록 셀에는 경고 자리가 없어 알림 뒤에 붙인다).
 * 본사 행은 경고를 붙이지 않는다(확인 요청 답(2026-11-06) 3번 · 개발도 본사 행 제외)
 */
export const COMMISSION_CELL_COPY = {
  saved: (name: string, rate: number, headquarters = false) =>
    `${name} 수수료율을 ${rate}%로 수정했습니다.` +
    (!headquarters && isAtypicalCommission(rate)
      ? ` ${COMMISSION_RATE_WARNING}`
      : ""),
  unchanged: (name: string, rate: number) =>
    `${name} 수수료율은 이미 ${rate}%로 적용되어 있습니다.`,
};

/**
 * 퇴점 처리중·퇴점 셀러는 수수료율 **읽기 전용** — 재입점하면(입점 상태) 다시 열린다(판정 Q8 · 디자인 §1).
 * 목록 셀은 값만 낸다(셀에 안내 줄 자리가 없다 — 퍼블이 정함) · 셀러 상세는 값 + 칸 아래 안내 한 줄.
 */
export const isCommissionLocked = (status: SellerStatus) => status !== "active";

/** 판정 Q8 문구 그대로 */
export const COMMISSION_LOCKED_NOTE =
  "퇴점 처리중·퇴점 셀러는 수수료율을 바꿀 수 없습니다";

/**
 * 상태값 → 표시 라벨 · Tag tone · 설명.
 *
 * `description` 은 원본 v0.4 `STAT_TIP` 의 두 줄(설명 + 다음 단계)을 한 문단으로 이은 것이다 — 퇴점은 부록 A C68 한 문장.
 * 원본은 이 문구를 **상태 대시 카드의 툴팁**으로 띄우므로 우리도 같은 자리에 붙이고,
 * 미리보기 모달에서도 한 번 더 낸다 — **되돌릴 수 있는 상태인지**가 판단의 근거라서다.
 */
export const STATUS_META: Record<
  SellerStatus,
  { label: string; tone: TagTone; description: string }
> = {
  active: {
    label: "입점",
    tone: "success",
    description:
      "입점 심사를 통과해 정상 영업 중인 셀러입니다. 퇴점을 신청하면 [퇴점 처리중]으로 넘어갑니다.",
  },
  exiting: {
    label: "퇴점 처리중",
    tone: "warning",
    description:
      "퇴점 절차가 진행 중인 셀러입니다. 잔여 주문·정산을 마무리하는 단계입니다. 정산까지 끝나면 [퇴점]으로 종결됩니다.",
  },
  closed: {
    label: "퇴점",
    tone: "default",
    description: "퇴점이 완료된 셀러입니다.",
  },
};

/**
 * 분류·자격 배지 전용 색. 상태색(초록/노랑/빨강)과 겹치지 않게 highlight 계열을 쓴다.
 * 주입하는 값은 **semantic 토큰만** — 하드코딩 금지(`Tag.tsx` 의 `TagCustomStyle`).
 */
const CLASSIFICATION_STYLE: TagCustomStyle = {
  "--tag-bg-color": "var(--color-surface-highlight-secondary)",
  "--tag-color": "var(--color-text-highlight)",
};

/**
 * 위생인증 **셀러에만** 붙는 자격 배지. 상태가 아니라 자격이라 상태색을 쓰지 않는다.
 * 문구는 원본 그대로 `위생인증셀러` 다.
 */
export const HYGIENE_BADGE = {
  label: "위생인증셀러",
  tone: "custom" as TagTone,
  style: CLASSIFICATION_STYLE,
};

/**
 * 본사 행 위생인증 — 「인증」 고정 · 표시 「인증 (본사 직영)」(판정 Q20-2 · 디자인 §3 #16).
 * 셀러 목록 본사 행 배지 글자와 셀러 상세 읽는 값이 같은 글자다
 */
export const HQ_HYGIENE_TEXT = "인증 (본사 직영)";

/**
 * 위생인증 필터 — 원본 `chips: [{ key: "hygiene", label: "위생인증", values: ["인증","인증안됨"] }]`.
 * 상태와 **다른 축**이라 상태 대시에 섞지 않고 검색조건 안의 별도 셀렉트로 둔다.
 * 원본은 복수 선택 칩이지만 값이 둘뿐이라 [전체]/[인증]/[인증안됨] 택1 과 결과가 같다.
 * 첫 항목만 라벨에 축 이름을 붙인다 — 셀렉트 트리거에 보이는 글자가 곧 현재 값이라,
 * `전체` 만 적으면 무엇의 전체인지 알 수 없다.
 */
export const HYGIENE_FILTERS = [
  { value: "all", label: "위생인증 전체" },
  { value: "certified", label: "인증" },
  { value: "none", label: "인증안됨" },
];

/**
 * 기간 기준 — 원본 `date.fields: [["join","입점일"], ["quitAt","퇴점일"]]`.
 * 기준이 둘이라 원본도 셀렉트를 띄운다. `pick` 이 `null` 을 내면 그 행은 기간 조건에서 빠진다
 * (아직 퇴점하지 않은 셀러를 퇴점일로 거를 때가 그렇다).
 */
export const DATE_FIELDS = [
  { value: "join", label: "입점일", pick: (seller: Seller) => seller.date },
  { value: "exit", label: "퇴점일", pick: (seller: Seller) => seller.exitDate },
];

/** 값이 없는 셀(입점 셀러의 퇴점일 · 위생인증 없음)에 채우는 글자 */
export const EMPTY_CELL = "-";

/**
 * 본사 직영 계정 배지 — 원본 `<span class="badge b-blue">본사</span>`.
 * 상태가 아니라 **분류**라 위생인증 배지와 같은 highlight 계열을 쓴다.
 */
export const HQ_BADGE = {
  label: "본사",
  tone: "custom" as TagTone,
  style: CLASSIFICATION_STYLE,
};

/* -------------------------------------------------------------------------
 * 간이 샘플 — 원본 v0.4 `SELLERS` 의 25곳 (S-201 ~ S-225) + 주문 쪽 셀러 6곳 (S-226 ~ S-231)
 *
 * 목록을 2페이지 이상으로 채우려고 원본 값을 그대로 옮겼다(이름·대표·연락처·상태·입점일·
 * 평점·수수료율·사업자/취급 유형·위생인증·서류번호·소개·퇴점일). 상품수·등록 상품은 상품 목록에서 센다(판정 Q9 —
 * 아래 `withListedProducts` · 원본 v0.4 의 상품수 숫자는 버렸다).
 * 순서: id · 셀러명 · 대표 · 연락처 · 상태 · 입점일 · 평점 · 수수료율 ·
 *       사업자 유형 · 취급 유형 · 위생인증 · 사업자등록번호 · 통신판매업 신고번호 · 소개 · 퇴점(예정)일
 * ---------------------------------------------------------------------- */
type BriefRow = [
  string,
  string,
  string,
  string,
  SellerStatus,
  string,
  number,
  number,
  BizType,
  DealScope,
  boolean,
  string,
  string,
  string,
  string?,
];

const BRIEF_ROWS: BriefRow[] = [
  [
    "S-201",
    "리틀베이비",
    "김유진",
    "010-3201-1188",
    "active",
    "2024-01-10",
    4.9,
    10,
    "corporate",
    "all",
    true,
    "201-81-45123",
    "2024-서울강남-01021",
    "프리미엄 유아용품 전문 · 왕복 무료배송",
  ],
  [
    "S-202",
    "베이비노리터",
    "오세훈",
    "010-3202-2277",
    "active",
    "2024-03-22",
    4.8,
    11,
    "corporate",
    "all",
    false,
    "202-81-33456",
    "2024-서울마포-00874",
    "친환경 소재 · 전 상품 KC 인증",
  ],
  [
    "S-203",
    "장난감아저씨",
    "한지민",
    "010-3203-3366",
    "exiting",
    "2024-06-01",
    4.7,
    12,
    "individual",
    "rent",
    false,
    "203-14-77012",
    "2024-경기성남-02233",
    "대형완구·놀이용품 렌트 1위",
    "2026-09-30",
  ],
  [
    "S-204",
    "포근하우스",
    "윤서아",
    "010-3204-4455",
    "active",
    "2024-09-14",
    4.9,
    9,
    "corporate",
    "sale",
    true,
    "204-81-51188",
    "2024-서울송파-03310",
    "수면·침구 전문 셀러",
  ],
  [
    "S-205",
    "쑥쑥마켓",
    "정민재",
    "010-3205-5544",
    "active",
    "2025-02-03",
    4.6,
    13,
    "individual",
    "all",
    false,
    "205-22-64099",
    "2025-인천남동-00457",
    "성장단계별 큐레이션 셀러",
  ],
  [
    "S-206",
    "아이사랑컴퍼니",
    "최도윤",
    "010-3206-6710",
    "active",
    "2024-10-02",
    4.8,
    8,
    "corporate",
    "rent",
    true,
    "206-81-20934",
    "2024-서울강서-04120",
    "수유·이유용품 전문 · 위생 인증 셀러",
  ],
  [
    "S-207",
    "튼튼키즈",
    "강하은",
    "010-3207-7820",
    "active",
    "2024-11-11",
    4.7,
    14,
    "individual",
    "sale",
    false,
    "207-31-45560",
    "2024-부산해운대-00981",
    "유아 완구·교구 판매 셀러",
  ],
  [
    "S-208",
    "봄날유아",
    "임서준",
    "010-3208-8930",
    "closed",
    "2024-12-05",
    4.9,
    9.5,
    "corporate",
    "all",
    true,
    "208-81-77821",
    "2024-서울종로-05233",
    "프리미엄 유아패브릭 전문",
    "2026-05-15",
  ],
  [
    "S-209",
    "하이베베",
    "송지아",
    "010-3209-9040",
    "active",
    "2025-01-19",
    4.6,
    11.5,
    "corporate",
    "rent",
    false,
    "209-81-11245",
    "2025-서울영등포-00612",
    "유모차·카시트 렌트 특화",
  ],
  [
    "S-210",
    "초록발자국",
    "조은우",
    "010-3210-1150",
    "active",
    "2025-02-27",
    4.8,
    8.5,
    "individual",
    "sale",
    true,
    "210-19-38870",
    "2025-경기용인-01344",
    "유기농 유아식·이유식 판매",
  ],
  [
    "S-211",
    "미소맘마켓",
    "백서연",
    "010-3211-2260",
    "active",
    "2025-03-14",
    4.9,
    12.5,
    "corporate",
    "all",
    false,
    "211-81-90034",
    "2025-서울강남-06021",
    "육아 필수템 종합 셀러",
  ],
  [
    "S-212",
    "코니베어",
    "유준호",
    "010-3212-3370",
    "active",
    "2025-03-30",
    4.5,
    13.5,
    "individual",
    "rent",
    true,
    "212-27-55190",
    "2025-대구수성-00733",
    "바운서·스윙 렌트 전문",
  ],
  [
    "S-213",
    "폭신폭신",
    "남도현",
    "010-3213-4480",
    "active",
    "2025-04-08",
    4.7,
    7,
    "corporate",
    "sale",
    false,
    "213-81-42277",
    "2025-서울서초-07110",
    "놀이방매트·범퍼침대 판매",
  ],
  [
    "S-214",
    "별빛아기",
    "문채원",
    "010-3214-5590",
    "active",
    "2025-04-22",
    4.8,
    15,
    "individual",
    "all",
    true,
    "214-11-63301",
    "2025-경기고양-02455",
    "수면등·무드케어 전문",
  ],
  [
    "S-215",
    "두리하우스",
    "오하준",
    "010-3215-6600",
    "exiting",
    "2025-05-06",
    4.4,
    6,
    "corporate",
    "rent",
    false,
    "215-81-28844",
    "2025-서울노원-08120",
    "대형 놀이기구 렌트",
    "2026-10-10",
  ],
  [
    "S-216",
    "마미케어",
    "신유나",
    "010-3216-7710",
    "active",
    "2025-05-20",
    4.9,
    10.5,
    "corporate",
    "sale",
    true,
    "216-81-70125",
    "2025-서울강동-09033",
    "산모·신생아 위생용품 전문",
  ],
  [
    "S-217",
    "곰곰상점",
    "홍시우",
    "010-3217-8820",
    "active",
    "2025-06-03",
    4.6,
    16,
    "individual",
    "all",
    false,
    "217-24-51908",
    "2025-인천연수-01722",
    "원목완구·교구 종합",
  ],
  [
    "S-218",
    "뽀송데이",
    "권지호",
    "010-3218-9930",
    "active",
    "2025-06-17",
    4.8,
    9.8,
    "corporate",
    "rent",
    true,
    "218-81-33417",
    "2025-경기수원-03288",
    "제습·공기케어 가전 렌트",
  ],
  [
    "S-219",
    "아기별장",
    "서예린",
    "010-3219-1040",
    "active",
    "2025-07-01",
    4.7,
    11.8,
    "individual",
    "sale",
    false,
    "219-33-60271",
    "2025-부산부산진-00590",
    "수면·침구 세트 판매",
  ],
  [
    "S-220",
    "든든키즈랩",
    "배건우",
    "010-3220-2150",
    "active",
    "2025-07-15",
    4.9,
    12.2,
    "corporate",
    "all",
    true,
    "220-81-84402",
    "2025-서울금천-04901",
    "육아가전·소독가전 종합",
  ],
  [
    "S-221",
    "포근솜사탕",
    "안소율",
    "010-3221-3260",
    "active",
    "2025-08-02",
    4.5,
    8.8,
    "individual",
    "rent",
    false,
    "221-16-47115",
    "2025-경기부천-02066",
    "유아 침구·러그 렌트",
  ],
  [
    "S-222",
    "무럭무럭",
    "황시온",
    "010-3222-4370",
    "active",
    "2025-08-19",
    4.8,
    13.8,
    "corporate",
    "sale",
    true,
    "222-81-19903",
    "2025-서울관악-05744",
    "성장단계 이유식·간식 판매",
  ],
  [
    "S-223",
    "방긋상회",
    "노하율",
    "010-3223-5480",
    "closed",
    "2025-09-05",
    4.3,
    7.5,
    "individual",
    "all",
    false,
    "223-28-72240",
    "2025-광주서구-00318",
    "유아 잡화 종합 셀러",
    "2026-04-28",
  ],
  [
    "S-224",
    "소중한하루",
    "전지안",
    "010-3224-6590",
    "active",
    "2025-09-21",
    4.9,
    14.5,
    "corporate",
    "rent",
    false,
    "224-81-55071",
    "2025-서울동작-06880",
    "외출·이동용품 렌트",
  ],
  [
    "S-225",
    "아이코니",
    "고라온",
    "010-3225-7600",
    "active",
    "2025-10-10",
    4.6,
    6.5,
    "individual",
    "sale",
    true,
    "225-21-40836",
    "2025-경기안양-01099",
    "유아 목욕·위생용품 판매",
  ],
  /* ── 주문·상품 샘플의 셀러 6곳 (2026-11-02 보충 · S-226 ~ S-231) ──
     정산이 셀러별 요율을 셀러 마스터에서 읽는다 — 주문에만 있고 마스터에 없던 셀러를 채웠다.
     입점일 ≤ 그 셀러의 첫 상품 등록일 ≤ 첫 주문일. 상품수는 상품 샘플의 그 셀러 상품 수다 */
  [
    "S-226",
    "베이비루",
    "윤서하",
    "010-3226-8140",
    "active",
    "2026-03-12",
    4.7,
    12,
    "corporate",
    "all",
    true,
    "226-81-30418",
    "2026-서울성동-01207",
    "카시트·아기침대 렌트와 수유용품 판매",
  ],
  [
    "S-227",
    "리틀스텝",
    "정도겸",
    "010-3227-9251",
    "active",
    "2026-04-02",
    4.6,
    11,
    "individual",
    "all",
    false,
    "227-14-62093",
    "2026-경기화성-00852",
    "카시트 전문 · 렌트·판매 겸용",
  ],
  [
    "S-228",
    "맘스케어",
    "한소이",
    "010-3228-1362",
    "active",
    "2026-04-20",
    4.8,
    9.5,
    "corporate",
    "all",
    true,
    "228-81-17736",
    "2026-서울강서-02941",
    "유모차·놀이매트 렌트와 카시트 판매",
  ],
  [
    "S-229",
    "베베하우스",
    "임지후",
    "010-3229-2473",
    "active",
    "2026-05-08",
    4.5,
    9.8,
    "individual",
    "all",
    false,
    "229-27-40685",
    "2026-인천부평-00764",
    "베드사이드 침대 렌트 · 놀이매트·소독기 판매",
  ],
  [
    "S-230",
    "아이랑",
    "오하람",
    "010-3230-3584",
    "active",
    "2026-06-01",
    4.7,
    8,
    "corporate",
    "all",
    false,
    "230-81-95312",
    "2026-서울마포-03318",
    "신생아 카시트 렌트와 놀이매트 판매",
  ],
  [
    "S-231",
    "코지베이비",
    "백시온",
    "010-3231-4695",
    "active",
    "2026-06-15",
    4.6,
    13.5,
    "corporate",
    "all",
    true,
    "231-81-58207",
    "2026-경기고양-04016",
    "디럭스 유모차 렌트와 소독기·매트 판매",
  ],
];

/** 간이 행 → 셀러. 원본 날짜에는 시각이 없어 09:00 으로 채운다(기간 필터가 시각까지 파싱한다) */
const toSeller = ([
  id,
  name,
  ceo,
  phone,
  status,
  join,
  rating,
  commission,
  bizType,
  dealScope,
  hygiene,
  bizNo,
  salesNo,
  intro,
  exit,
]: BriefRow): SellerSeed => ({
  id,
  name,
  isHeadquarters: false,
  ceo,
  phone,
  commission,
  date: `${join} 09:00`,
  exitDate: exit ? `${exit} 00:00` : null,
  rating,
  hygiene,
  status,
  bizType,
  dealScope,
  bizLicense: { fileName: "사업자등록증.pdf", number: bizNo },
  salesLicense: { fileName: "통신판매업 신고증.pdf", number: salesNo },
  intro,
});

const BRIEF_SELLERS = BRIEF_ROWS.map(toSeller);

/** 상품 목록 한 행 → 셀러 상세 「등록 상품」 표 한 행 */
const toSellerProduct = (product: Product): SellerProduct => ({
  kinds: [product.mode],
  saleStatus: product.status,
  code: product.id,
  name: product.name,
  category: categoryNameOf(product),
  createdAt: product.date,
  updatedAt: product.updatedAt,
  shown: product.display === "shown",
});

/** 샘플 한 곳 — 입점 셀러는 상품수·등록 상품을 들지 않는다(`withListedProducts` 가 채운다) */
type SellerSeed = Omit<Seller, "products" | "catalog"> &
  Partial<Pick<Seller, "products" | "catalog">>;

/**
 * 판정 Q9 — **등록 상품수 = 임시저장을 뺀 전체(상품 목록과 같은 수)**. 셀러 목록 「상품수」 · 셀러 상세
 * 「등록 상품수」 · 「등록 상품 (N)」 표가 모두 상품 목록(`LISTED_PRODUCTS`)의 그 셀러 행 하나를 읽는다
 * (상품 목록에는 임시저장 초안이 들어오지 않는다). 상품 목록과 셀러는 셀러명으로 잇는다(상품 행에 셀러 코드가 없다).
 * **본사 행은 샘플 값 그대로** — 직영 상품은 상품 목록에 나오지 않는다 — 실제 수는 개발이 센다(퍼블은 예시 값만).
 */
const withListedProducts = (seed: SellerSeed): Seller => {
  if (seed.isHeadquarters) return { products: 0, catalog: [], ...seed };
  const catalog = LISTED_PRODUCTS.filter(
    (product) => product.seller === seed.name,
  ).map(toSellerProduct);
  return { ...seed, catalog, products: catalog.length };
};

const SELLER_SEEDS: SellerSeed[] = [
  {
    /*
      본사 직영 — 수수료율은 처음 0%, 수정 가능(판정 Q20-1).
      직영 매장 이름·코드는 「베이비크루저 (S-000)」 — 서비스명 통일(Q17) 대상이 아니다
      (확인 요청 답(2026-11-06) §7 · `DM` #15 · 개발과 같음)
    */
    id: "S-000",
    name: "베이비크루저",
    isHeadquarters: true,
    /* 대표자·전화·주소는 설정 화면(`SettingsPage.data.ts`)과 같은 값이다 — 대표자 「이학용」
       (확인 요청 답(2026-11-06) §5). 서로 읽지는 않는다(2026-11-03) */
    ceo: "이학용",
    phone: "02-1588-0000",
    roadAddress: "서울특별시 강남구 테헤란로 501",
    detailAddress: "12층 (06168)",
    commission: 0,
    date: "2025-09-01 09:00",
    exitDate: null,
    products: 412,
    rating: 5.0,
    hygiene: true,
    status: "active",
    bizType: "corporate",
    dealScope: "all",
    bizLicense: { fileName: "사업자등록증.pdf", number: "000-81-00001" },
    salesLicense: {
      fileName: "통신판매업 신고증.pdf",
      number: "2024-서울강남-00001",
    },
    intro:
      "베이비큐브 본사 직영 계정입니다. 본사 기획 상품을 직접 등록·판매합니다.",
    /* 원본 셀러 상세의 "등록 상품 (3)" 표 + 상품 데이터의 본사 직영 HQ240806 — 상품코드가 직영 상품 상세로
       이어지므로 상품 관리 데이터(`ProductListPage.data.ts` 의 `source: "hq"`)와 같은 상품·같은 카테고리로 맞춘다 */
    catalog: [
      {
        kinds: ["sale"],
        saleStatus: "onSale",
        code: "NR270900",
        name: "베이비큐브 시그니처 원목 아기침대",
        category: "수면·침실",
        createdAt: "2026-05-10 09:14:22",
        updatedAt: "2026-06-18 16:02:41",
        shown: true,
      },
      {
        kinds: ["rent"],
        saleStatus: "onSale",
        code: "PR270901",
        name: "본사 기획 사계절 아기 침낭 세트",
        category: "아기침대",
        createdAt: "2026-05-22 11:37:08",
        updatedAt: "2026-05-22 11:37:08",
        shown: true,
      },
      {
        kinds: ["sale"],
        saleStatus: "soldout",
        code: "QR270902",
        name: "베이비큐브 프리미엄 모유저장팩 세트",
        category: "분유·이유식",
        createdAt: "2026-06-05 14:50:13",
        updatedAt: "2026-06-20 10:25:59",
        shown: false,
      },
      {
        kinds: ["sale"],
        saleStatus: "soldout",
        code: "HQ240806",
        name: "폴딩 놀이매트 220 그레이",
        category: "놀이·발달",
        createdAt: "2026-08-06 15:12:36",
        updatedAt: "2026-08-18 17:33:04",
        shown: true,
      },
    ],
  },
  {
    id: "S-1042",
    name: "아기별상사",
    isHeadquarters: false,
    ceo: "김하윤",
    phone: "010-3391-5502",
    roadAddress: "서울특별시 성동구 성수이로 118",
    detailAddress: "4층 402호 (04797)",
    commission: 12,
    date: "2025-11-04 10:20",
    exitDate: null,
    rating: 4.8,
    hygiene: true,
    status: "active",
    openWork: { rents: 3, settlements: 0, claims: 1 },
    bankAccount: {
      state: "registered",
      bankName: "국민은행",
      holder: "(주)아기별상사",
      masked: "***-***-**4417",
      registeredAt: "2025-11-04 14:20",
      registeredBy: "본사 관리자",
      bankbook: {
        fileName: "통장사본_아기별상사.pdf",
        uploadedAt: "2025-11-04 14:18",
      },
    },
    bizType: "corporate",
    dealScope: "all",
    bizLicense: { fileName: "사업자등록증.pdf", number: "214-81-30912" },
    salesLicense: {
      fileName: "통신판매업 신고증.pdf",
      number: "2025-서울성동-01142",
    },
    intro: "신생아 용품을 중심으로 렌트와 판매를 함께 운영합니다.",
  },
  {
    id: "S-1078",
    name: "베이비무브",
    isHeadquarters: false,
    ceo: "박정우",
    phone: "010-7724-1180",
    roadAddress: "부산광역시 해운대구 센텀중앙로 97",
    detailAddress: "A동 1203호 (48058)",
    commission: 9.5,
    date: "2026-01-16 15:42",
    exitDate: null,
    rating: 4.6,
    hygiene: true,
    status: "active",
    bizType: "individual",
    dealScope: "rent",
    bizLicense: { fileName: "사업자등록증.pdf", number: "605-12-88431" },
    salesLicense: {
      fileName: "통신판매업 신고증.pdf",
      number: "2025-부산해운대-00714",
    },
    intro: "이동 장비 전문 — 유모차·카시트만 취급합니다.",
  },
  {
    id: "S-1123",
    name: "포근하루",
    isHeadquarters: false,
    ceo: "이서윤",
    phone: "010-2208-6634",
    commission: 14,
    date: "2026-03-02 09:05",
    exitDate: null,
    rating: 4.4,
    hygiene: false,
    status: "active",
    bizType: "individual",
    dealScope: "sale",
    bizLicense: { fileName: "사업자등록증.pdf", number: "118-09-55207" },
    salesLicense: {
      fileName: "통신판매업 신고증.pdf",
      number: "2025-경기성남-02233",
    },
    intro: "수면 용품과 침구를 판매합니다.",
  },
  {
    /* 퇴점 처리중 — `exitDate` 는 **퇴점 예정일**이다(원본 `quitAt`). 앞으로 나갈 셀러라 미래 날짜다 */
    id: "S-1155",
    name: "튼튼주니어",
    isHeadquarters: false,
    ceo: "최민준",
    phone: "010-5581-3027",
    /* 상세 주소 없이 도로명만 넣은 예시 */
    roadAddress: "경기도 용인시 수지구 풍덕천로 152",
    commission: 8,
    date: "2026-04-21 13:38",
    exitDate: "2026-11-30 00:00",
    rating: 4.1,
    hygiene: false,
    status: "exiting",
    openWork: { rents: 2, settlements: 1, claims: 1 },
    /* 통장사본 없이 계좌만 등록한 예시 */
    bankAccount: {
      state: "registered",
      bankName: "신한은행",
      holder: "튼튼주니어(주)",
      masked: "***-***-**8150",
      registeredAt: "2026-04-22 09:30",
      registeredBy: "본사 관리자",
    },
    bizType: "corporate",
    dealScope: "all",
    bizLicense: { fileName: "사업자등록증.pdf", number: "402-86-11930" },
    salesLicense: {
      fileName: "통신판매업 신고증.pdf",
      number: "2024-인천연수-00588",
    },
    intro: "유아 가구와 안전용품을 취급합니다. 현재 퇴점 절차를 진행 중입니다.",
  },
  {
    id: "S-1190",
    name: "초록숲키즈",
    isHeadquarters: false,
    ceo: "정다인",
    phone: "010-9903-4471",
    commission: 11.5,
    date: "2026-05-09 11:11",
    exitDate: null,
    rating: 4.9,
    hygiene: true,
    status: "active",
    bizType: "individual",
    dealScope: "rent",
    bizLicense: { fileName: "사업자등록증.pdf", number: "733-21-07716" },
    salesLicense: {
      fileName: "통신판매업 신고증.pdf",
      number: "2026-대구수성-01109",
    },
    intro: "친환경 소재 위주로 큐레이션한 렌트 전문 셀러입니다.",
  },
  {
    id: "S-1204",
    name: "하늘담요",
    isHeadquarters: false,
    ceo: "한지호",
    phone: "010-6640-8829",
    commission: 16,
    date: "2026-06-18 16:55",
    exitDate: "2026-07-30 09:40",
    rating: 3.9,
    hygiene: false,
    status: "closed",
    /* 퇴점 셀러 — 카드는 상태 한 줄과 통장사본만 읽는다(입력칸·[계좌 저장] 없음) */
    bankAccount: {
      state: "registered",
      bankName: "광주은행",
      holder: "한지호",
      masked: "***-***-**2093",
      registeredAt: "2026-06-19 10:05",
      registeredBy: "본사 관리자",
      bankbook: {
        fileName: "통장사본_하늘담요.jpg",
        uploadedAt: "2026-06-19 10:03",
      },
    },
    bizType: "individual",
    dealScope: "sale",
    bizLicense: { fileName: "사업자등록증.pdf", number: "890-33-41250" },
    salesLicense: {
      fileName: "통신판매업 신고증.pdf",
      number: "2025-광주서구-00342",
    },
    intro: "담요·속싸개 전문. 퇴점이 완료된 셀러입니다.",
    /* 퇴점한 셀러라 노출 중인 상품이 없다 — 표가 빈 상태가 된다 */
  },
  ...BRIEF_SELLERS,
];

export const SELLERS: Seller[] = SELLER_SEEDS.map(withListedProducts);

/**
 * 상태 대시 = 상태 필터. `value` 는 `SellerStatus` 와 같은 값이다 —
 * 뼈대가 이 값으로 상태별 건수를 센다.
 *
 * ## ⚠️ **[전체] 카드는 없다** (2026-09-21, 원본 v0.4 대조)
 * 원본 주석(`sellers.dash`)이 정책으로 못 박는다 — _"구성 : 상태 1개당 카드 1장 ·
 * [전체] 카드 없음 — 목록은 항상 한 상태만 보여준다"_. 한때 우리는 "필터가 걸린 줄
 * 모르고 읽는 사고"를 막으려고 [전체]를 넣고 기본값으로 뒀는데, 원본은 그 반대를
 * **의도**한 것이었다. 되살리지 말 것.
 *
 * 어휘·순서는 원본 `chip.values`(`["입점","퇴점 처리중","퇴점"]`) 그대로다.
 */
export const FILTERS = [
  { value: "active", label: "입점" },
  { value: "exiting", label: "퇴점 처리중" },
  { value: "closed", label: "퇴점" },
];

/**
 * 화면을 열었을 때 고를 상태. 원본 `sellers.dash` — _"기본 : 화면 진입 시 [입점] 선택"_.
 * **뼈대에 박지 않는다** — 상태 어휘가 바뀌면 활성 항목이 사라지는 사고가 난다.
 */
export const DEFAULT_FILTER = "active";

/**
 * 검색 조건 — 원본 `search.fieldOpts` 의 어휘와 **순서** 그대로다.
 */
export const SEARCH_FIELDS = [
  { value: "name", label: "셀러명", pick: (seller: Seller) => seller.name },
  { value: "ceo", label: "대표명", pick: (seller: Seller) => seller.ceo },
  { value: "phone", label: "연락처", pick: (seller: Seller) => seller.phone },
];

/** 상태 카드의 단위 — 원본 v0.4 상태 카드 `22 건` (상품 관리만 `개`) */
export const SELLER_UNIT = "건";

/** 천 단위 구분만 하는 순수 수치 — 상품수 열과 대시 상자가 함께 쓴다 */
export const num = (value: number) => value.toLocaleString("ko-KR");

/** 수수료율. **원본과 같이 자릿수를 맞추지 않는다** — `12%` · `9.5%` 그대로다 */
export const rate = (value: number) => `${value}%`;

/** 평점 — 원본 v0.4 `★ ${rating}`. 한 자리로 맞춰 `5` 가 `★ 5.0` 으로 나온다 */
export const score = (value: number) => `★ ${value.toFixed(1)}`;

/** 등록 상품수 — 원본 v0.4 `${prod}개` */
export const productCount = (value: number) => `${num(value)}개`;

/**
 * 입점일·퇴점일 표기 — 원본 `ymd` 와 같다.
 * `"2025-09-01 09:00"` → `"2025.09.01"`. **시각은 표에 내지 않는다**.
 */
export const ymd = (dateText: string | null) =>
  dateText ? dateText.slice(0, 10).replace(/-/g, ".") : EMPTY_CELL;

/** 페이지당 행 수 기본값 — 원본 `pager` 기본 10 */
export const PAGE_SIZE = 10;

/** 페이지당 개수 후보 — 원본 표 하단 셀렉트 그대로 */
export const PAGE_SIZES = [10, 20, 50, 100];

/* -------------------------------------------------------------------------
 * 검색조건 요약 — 접힌 `FilterBar` 한 줄 (회원 관리와 같은 규칙)
 *
 * 조건이 없으면 원본 문구 `조건 없음 (전체)`. **상태는 넣지 않는다** — 건수 카드가 이미
 * 선택된 채로 말하고 있다.
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
  hygieneLabel,
  fieldLabel,
  keyword,
}: {
  dateLabel: string;
  from?: Date;
  to?: Date;
  /** 위생인증 조건이 걸렸을 때만(`전체` 면 undefined) */
  hygieneLabel?: string;
  fieldLabel: string;
  keyword: string;
}): string => {
  const parts: string[] = [];
  /* 하루만 고르면 `to` 가 없다 — 그때는 범위가 아니라 그 하루다 */
  if (from)
    parts.push(`${dateLabel} ${dotDate(from)}${to ? `~${dotDate(to)}` : ""}`);
  if (hygieneLabel) parts.push(`위생인증 ${hygieneLabel}`);
  if (keyword.trim() !== "") parts.push(`${fieldLabel} «${keyword.trim()}»`);
  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};
