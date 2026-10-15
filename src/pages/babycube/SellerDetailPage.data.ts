import type { TagTone } from "../../components/ui";
import {
  FILTERS,
  SELLERS,
  type BizType,
  type DealKind,
  type DealScope,
  type Seller,
  type SellerProduct,
  type SellerStatus,
} from "./SellerListPage.data";

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
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - **본사 계정은 상태(입점)와 수수료율(0%)만 잠근다** — 나머지는 일반 셀러처럼 고친다
 *   (2026-10-15 사용자 결정. 원본은 상태만 고정하고 수수료율 입력칸을 열어 두지만, 같은 자리의
 *   안내 문구가 "수수료율 0% 확정"이라 화면이 스스로 모순된다)
 * - 수수료율은 **0~100** 이다. 범위를 벗어난 값은 저장할 수 없다
 * - 퇴점 확인 창의 숫자는 **판매 중 상품 = 판매중 + 품절**, 정산은 금액이 아니라 **회차**다
 *   (원본 `sellerExitCount`). 남은 건이 있어도 **막지 않고 경고만** 한다
 * ---------------------------------------------------------------------- */

/**
 * 경로의 id(셀러 코드)로 셀러를 찾는다.
 *
 * 주소창에 손으로 친 id·지워진 셀러가 있을 수 있으므로 **없을 수 있다는 사실을
 * 타입으로 남긴다** — 뼈대가 "없는 셀러" 화면을 그리게 하는 것이 이 `undefined` 다.
 */
export const findSeller = (id: string): Seller | undefined =>
  SELLERS.find((seller) => seller.id === id);

/** 원본 `sellers.form` 의 섹션 구성 순서 */
export const SECTIONS = {
  basic: "셀러 정보",
  operation: "운영 정보",
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

/** 수수료율 허용 범위. 벗어나면 저장할 수 없다 */
export const COMMISSION_MIN = 0;
export const COMMISSION_MAX = 100;

export const commissionError = (value: string) => {
  if (value.trim() === "") return "수수료율을 입력해 주세요.";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return "숫자만 입력할 수 있습니다.";
  if (parsed < COMMISSION_MIN || parsed > COMMISSION_MAX) {
    return `${COMMISSION_MIN}~${COMMISSION_MAX} 사이로 입력해 주세요.`;
  }
  return null;
};

/** 저장 성공 알림 — 원본 하단 액션 바의 [저장하기] 결과 */
export const SAVED_TEXT = "변경 내용을 저장했습니다";

/* -------------------------------------------------------------------------
 * 퇴점 확인 창 — 원본 `gateQuit` (C-5 ⓐ)
 *
 * 저장된 상태가 퇴점이 아닌데 [퇴점] 으로 바꿔 저장할 때만 뜬다.
 * 0건이어도 줄을 지우지 않는다 — "없음"을 읽는 것이 곧 확인이다.
 * ---------------------------------------------------------------------- */

/** 판매 중인 상품 — **판매중 + 품절**만(원본). 임시저장·반려·재심사요청은 퇴점이 덮지 않는다 */
export const saleableCount = (catalog: SellerProduct[]) =>
  catalog.filter(
    (product) =>
      product.saleStatus === "onSale" || product.saleStatus === "soldout",
  ).length;

export const exitRows = (seller: Seller) => {
  const work = seller.openWork ?? { rents: 0, settlements: 0, claims: 0 };
  return [
    { label: "진행 중인 렌트", count: work.rents, unit: "건" },
    { label: "미지급 정산", count: work.settlements, unit: "회차" },
    { label: "진행 중인 클레임", count: work.claims, unit: "건" },
    {
      label: "판매 중인 상품",
      count: saleableCount(seller.catalog),
      unit: "개",
    },
  ];
};

export const EXIT_COPY = {
  title: (name: string) => `셀러 퇴점 처리 · ${name}`,
  none: "없음",
  note: (products: number) =>
    `퇴점 처리 시 퇴점일이 기록되고 이 셀러의 상품 ${products}개가 판매중지로 전환됩니다(임시저장 초안은 그대로 둡니다).`,
  /* 렌트·정산·클레임이 남았을 때만 덧붙는다 — 막지 않고 알린다 */
  warning:
    "남아 있는 건은 퇴점 후에도 이어서 처리해야 합니다 — 잔여 주문·정산을 먼저 마무리하려면 [퇴점 처리중]으로 두세요.",
  confirm: "퇴점 처리",
  done: (products: number) =>
    products > 0
      ? `퇴점 처리되었습니다 — 등록 상품 ${products}개가 판매중지로 전환되었습니다.`
      : "퇴점 처리되었습니다.",
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
