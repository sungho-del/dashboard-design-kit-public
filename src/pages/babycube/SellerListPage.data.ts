import type { TagCustomStyle, TagTone } from "../../components/ui";

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
 * | `rate`·`num`·`score`·`ymd` | 표의 수치 포맷 (% · 수 · 평점 · 날짜) |
 * | `PAGE_SIZE`       | 페이지당 행 수                             |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키) · `date`(`YYYY-MM-DD HH:mm`, 기간 필터가 파싱)를 갖는다.
 *   여기서 `date` 는 **입점일**이다
 * - `exitDate` 는 **퇴점이 완료된 셀러만** 갖는다. 나머지는 `null` 이고,
 *   뼈대는 퇴점일 열 자체를 상태 필터가 `"closed"` 일 때만 붙인다(원본과 같다)
 * - `DATE_FIELDS[].pick` 이 기간 필터가 훑을 값을 고른다 — `null` 이면 그 행은 기간에서 빠진다
 * - `commission` 은 **본사 직영에서 `null`** 이다 — 자기 자신에게 수수료를 매기지 않는다
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
 *   - 숫자 열 3종(수수료율·상품수·평점)의 우측 정렬 · **퇴점일 열의 조건부 노출**
 *   - 본사 표시 `(본사)` · 위생인증 배지 문구 `위생인증셀러`
 *   - 수치 표기: 수수료율 `${n}%`(자릿수 패딩 없음) · 상품수 `toLocaleString`(**단위 없음**) ·
 *     평점 `toFixed(2)` · 날짜 `ymd`(**날짜만**)
 *   - 필터 축 3개: 기간(입점일/퇴점일 **두 기준**) · 위생인증(인증/인증안됨) ·
 *     검색 조건(셀러명/대표명/연락처)
 *   - 상태 어휘 3종과 상태별 안내 문구(원본 `statusTips`)
 * - **값 출처가 불명해 그대로 둔 것**: 표 데이터·건수는 원본에서 API(`sellersApi`) 응답이라
 *   청크에 없다. 샘플 7건은 우리가 만든 값이다
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

/** 셀러가 등록한 상품 한 건 — 상세의 "등록 상품" 표가 쓴다 (원본 `sec.sellers_prod`) */
export interface SellerProduct {
  no: number;
  /** 렌트 / 판매 */
  kind: DealKind;
  /** 판매 상태 — 원본 배지 어휘 그대로 */
  saleStatus: "onSale" | "soldout" | "stopped";
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
  /** 셀러 코드 — 고유키 */
  id: string;
  /**
   * 원본 표의 **No** 열. 화면이 세는 순번이 아니라 **레코드에 붙은 번호**다 —
   * 정렬을 바꾸거나 필터를 걸어도 같은 셀러는 같은 번호를 유지한다.
   * (행 인덱스로 그리면 "3번 셀러"라고 말했을 때 서로 다른 행을 보게 된다.)
   */
  no: number;
  name: string;
  /**
   * 본사 직영 계정인지. 본사도 셀러로 등록돼 자기 상품을 판다
   * (쿠폰 발행 주체가 본사/셀러로 갈리는 것과 같은 사실이다 — `CouponListPage.data.ts`).
   * 참이면 셀러명 뒤에 `(본사)` 가 붙는다 — 원본과 같다.
   */
  isHeadquarters: boolean;
  /** 대표명 */
  ceo: string;
  phone: string;
  /** 수수료율(%) — 6~16 범위. **본사 직영은 수수료가 없어 `null`** */
  commission: number | null;
  /** 입점일 `YYYY-MM-DD HH:mm` — 뼈대의 기간 필터가 이 형식을 파싱한다 */
  date: string;
  /** 퇴점일. **퇴점이 완료된 셀러만** 값이 있다(처리중이면 아직 확정되지 않았다) */
  exitDate: string | null;
  /** 등록 상품수 */
  products: number;
  /** 평점 (5점 만점) */
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
  /** 등록 상품 — 상세의 표가 그대로 쓴다. `products` 수와 다를 수 있다(샘플은 일부만 든다) */
  catalog: SellerProduct[];
}

/**
 * 상태값 → 표시 라벨 · Tag tone · 설명.
 *
 * `description` 은 원본 어드민의 `statusTips` 를 그대로 옮긴 것이다.
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
    description: "심사를 통과해 영업 중인 셀러입니다.",
  },
  exiting: {
    label: "퇴점 처리중",
    tone: "warning",
    description:
      "퇴점을 신청해 잔여 주문·정산을 정리하는 중입니다. 정리가 끝나면 [퇴점]이 됩니다.",
  },
  closed: {
    label: "퇴점",
    tone: "default",
    description: "퇴점이 완료된 셀러입니다. 종결 상태라 되돌아가지 않습니다.",
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
 * 위생인증 필터 — 원본 `chips: [{ key: "hygiene", label: "위생인증", values: ["인증","인증안됨"] }]`.
 * 상태와 **다른 축**이라 상태 대시에 섞지 않고 별도 셀렉트로 둔다.
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

/** 값이 없는 셀(퇴점 전 셀러의 퇴점일 · 본사의 수수료율 등)에 채우는 글자 */
export const EMPTY_CELL = "-";

/** 본사 직영 계정의 셀러명 뒤에 붙는 표시 — 원본과 같다 */
export const HQ_SUFFIX = " (본사)";

export const SELLERS: Seller[] = [
  {
    /* 본사 직영 — 자기 자신에게 수수료를 매기지 않아 `commission` 이 null 이다 */
    id: "S-0001",
    no: 7,
    name: "베이비큐브",
    isHeadquarters: true,
    ceo: "서지호",
    phone: "1670-0114",
    commission: null,
    date: "2025-09-01 09:00",
    exitDate: null,
    products: 412,
    rating: 4.91,
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
    /* 원본 셀러 상세의 "등록 상품 (3)" 표를 그대로 옮겼다 */
    catalog: [
      {
        no: 1,
        kind: "sale",
        saleStatus: "onSale",
        code: "NR270900",
        name: "BabyCube 시그니처 원목 아기침대",
        category: "아기침대",
        createdAt: "2026-05-10 09:14:22",
        updatedAt: "2026-06-18 16:02:41",
        shown: true,
      },
      {
        no: 2,
        kind: "rent",
        saleStatus: "onSale",
        code: "PR270901",
        name: "본사 기획 사계절 아기 침낭 세트",
        category: "아기침대",
        createdAt: "2026-05-22 11:37:08",
        updatedAt: "2026-05-22 11:37:08",
        shown: true,
      },
      {
        no: 3,
        kind: "sale",
        saleStatus: "soldout",
        code: "QR270902",
        name: "BabyCube 프리미엄 모유저장팩 세트",
        category: "분유·이유식",
        createdAt: "2026-06-05 14:50:13",
        updatedAt: "2026-06-20 10:25:59",
        shown: false,
      },
    ],
  },
  {
    id: "S-1042",
    no: 6,
    name: "아기별상사",
    isHeadquarters: false,
    ceo: "김하윤",
    phone: "010-3391-5502",
    commission: 12,
    date: "2025-11-04 10:20",
    exitDate: null,
    products: 184,
    rating: 4.82,
    hygiene: true,
    status: "active",
    bizType: "corporate",
    dealScope: "all",
    bizLicense: { fileName: "사업자등록증.pdf", number: "214-81-30912" },
    salesLicense: {
      fileName: "통신판매업 신고증.pdf",
      number: "2025-서울성동-01142",
    },
    intro: "신생아 용품을 중심으로 렌트와 판매를 함께 운영합니다.",
    catalog: [
      {
        no: 1,
        kind: "rent",
        saleStatus: "onSale",
        code: "AR118203",
        name: "잘레토 전동 바운서 4세대",
        category: "바운서·스윙",
        createdAt: "2026-02-14 10:02:31",
        updatedAt: "2026-08-01 09:18:45",
        shown: true,
      },
      {
        no: 2,
        kind: "sale",
        saleStatus: "onSale",
        code: "AS118477",
        name: "휴대용 젖병 소독기",
        category: "분유·이유식",
        createdAt: "2026-03-02 15:41:09",
        updatedAt: "2026-03-02 15:41:09",
        shown: true,
      },
    ],
  },
  {
    id: "S-1078",
    no: 5,
    name: "베이비무브",
    isHeadquarters: false,
    ceo: "박정우",
    phone: "010-7724-1180",
    commission: 9.5,
    date: "2026-01-16 15:42",
    exitDate: null,
    products: 96,
    rating: 4.64,
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
    catalog: [
      {
        no: 1,
        kind: "rent",
        saleStatus: "onSale",
        code: "BR220154",
        name: "디럭스 유모차 스톨라 프로",
        category: "유모차",
        createdAt: "2026-01-20 11:22:03",
        updatedAt: "2026-07-14 13:55:20",
        shown: true,
      },
    ],
  },
  {
    id: "S-1123",
    no: 4,
    name: "포근하루",
    isHeadquarters: false,
    ceo: "이서윤",
    phone: "010-2208-6634",
    commission: 14,
    date: "2026-03-02 09:05",
    exitDate: null,
    products: 57,
    rating: 4.35,
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
    catalog: [
      {
        no: 1,
        kind: "sale",
        saleStatus: "onSale",
        code: "CS330871",
        name: "원목 범퍼 아기침대",
        category: "아기침대",
        createdAt: "2026-04-08 16:30:55",
        updatedAt: "2026-06-02 10:04:12",
        shown: true,
      },
      {
        no: 2,
        kind: "sale",
        saleStatus: "stopped",
        code: "CS330902",
        name: "사계절 순면 이불 세트",
        category: "침구",
        createdAt: "2026-04-19 09:12:40",
        updatedAt: "2026-08-25 17:41:06",
        shown: false,
      },
    ],
  },
  {
    /* 퇴점 처리중 — 퇴점일이 아직 확정되지 않아 `exitDate` 가 null 이다 */
    id: "S-1155",
    no: 3,
    name: "튼튼주니어",
    isHeadquarters: false,
    ceo: "최민준",
    phone: "010-5581-3027",
    commission: 8,
    date: "2026-04-21 13:38",
    exitDate: null,
    products: 23,
    rating: 4.12,
    hygiene: false,
    status: "exiting",
    bizType: "corporate",
    dealScope: "all",
    bizLicense: { fileName: "사업자등록증.pdf", number: "402-86-11930" },
    salesLicense: {
      fileName: "통신판매업 신고증.pdf",
      number: "2024-인천연수-00588",
    },
    intro: "유아 가구와 안전용품을 취급합니다. 현재 퇴점 절차를 진행 중입니다.",
    catalog: [
      {
        no: 1,
        kind: "rent",
        saleStatus: "stopped",
        code: "DR440215",
        name: "3in1 유아 카시트",
        category: "카시트",
        createdAt: "2025-11-03 14:20:18",
        updatedAt: "2026-09-01 08:35:44",
        shown: false,
      },
    ],
  },
  {
    id: "S-1190",
    no: 2,
    name: "초록숲키즈",
    isHeadquarters: false,
    ceo: "정다인",
    phone: "010-9903-4471",
    commission: 11.5,
    date: "2026-05-09 11:11",
    exitDate: null,
    products: 132,
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
    catalog: [
      {
        no: 1,
        kind: "rent",
        saleStatus: "onSale",
        code: "ER550330",
        name: "접이식 아기 욕조",
        category: "목욕·위생",
        createdAt: "2026-06-11 10:45:02",
        updatedAt: "2026-06-11 10:45:02",
        shown: true,
      },
    ],
  },
  {
    id: "S-1204",
    no: 1,
    name: "하늘담요",
    isHeadquarters: false,
    ceo: "한지호",
    phone: "010-6640-8829",
    commission: 16,
    date: "2026-06-18 16:55",
    exitDate: "2026-07-30 09:40",
    products: 0,
    rating: 3.87,
    hygiene: false,
    status: "closed",
    bizType: "individual",
    dealScope: "sale",
    bizLicense: { fileName: "사업자등록증.pdf", number: "890-33-41250" },
    salesLicense: {
      fileName: "통신판매업 신고증.pdf",
      number: "2025-광주서구-00342",
    },
    intro: "담요·속싸개 전문. 퇴점이 완료된 셀러입니다.",
    /* 퇴점한 셀러라 노출 중인 상품이 없다 — 표가 빈 상태가 된다 */
    catalog: [],
  },
];

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

/** 셀러 수의 단위. 단위가 곧 도메인이라 여기 둔다 */
export const SELLER_UNIT = "개사";

/** 천 단위 구분만 하는 순수 수치 — 상품수 열과 대시 상자가 함께 쓴다 */
export const num = (value: number) => value.toLocaleString("ko-KR");

/** 셀러 수에 단위를 붙여 한 덩이로 읽히는 자리 */
export const companies = (value: number) => `${num(value)}${SELLER_UNIT}`;

/**
 * 수수료율. **원본과 같이 자릿수를 맞추지 않는다** — `12%` · `9.5%` 그대로다.
 * **본사 직영(`null`)은 수수료가 없다** — 0% 로 적으면 "면제받았다"로 읽히므로 `-` 로 낸다.
 */
export const rate = (value: number | null) =>
  value === null ? EMPTY_CELL : `${value}%`;

/**
 * 평점. **소수 두 자리**로 고정한다 — 원본 `rating.toFixed(2)` 와 같다.
 */
export const score = (value: number) => value.toFixed(2);

/**
 * 입점일·퇴점일 표기 — 원본 `ymd` 와 같다.
 * `"2025-09-01 09:00"` → `"2025.09.01"`. **시각은 표에 내지 않는다**.
 */
export const ymd = (dateText: string | null) =>
  dateText ? dateText.slice(0, 10).replace(/-/g, ".") : EMPTY_CELL;

/**
 * 한 페이지에 보여줄 행 수의 **기본값**.
 * 실서비스는 10·20·50·100(기본 10)이지만 **샘플이 7건뿐이라 페이징이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 4;

/**
 * 페이지당 개수 후보 — 원본 표 하단의 셀렉트(기본 10개).
 *
 * 맨 앞 4는 **샘플 전용**이다. 실데이터를 붙이면 이 줄에서 4를 빼고 기본값을 10으로
 * 올리면 된다 — 7건짜리 샘플에서 10을 기본으로 두면 페이지네이션이 한 장으로 접혀
 * 기획자가 그 기능을 볼 수 없다.
 */
export const PAGE_SIZES = [4, 10, 20, 50];
