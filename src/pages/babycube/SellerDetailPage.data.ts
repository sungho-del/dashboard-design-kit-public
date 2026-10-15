import {
  SELLERS,
  type BizType,
  type DealKind,
  type DealScope,
  type Seller,
  type SellerProduct,
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
 * | `BIZ_TYPES`          | 사업자 유형 택1 (법인/개인)                       |
 * | `DEAL_SCOPES`        | 상품 취급 유형 택1 (전체/렌트/판매)               |
 * | `HYGIENE_OPTIONS`    | 위생인증 택1                                      |
 * | `SALE_STATUS_META`   | 등록 상품 표의 판매 상태 배지                     |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - **본사 계정은 고칠 수 없다.** `isHeadquarters` 가 참이면 수수료율·상태가 확정이라
 *   원본이 "본사 행 — 퇴점·심사 관리 대상이 아닙니다 (수수료율 0% 확정)"를 낸다
 * - 수수료율은 **0~100** 이다. 범위를 벗어난 값은 저장할 수 없다
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

/**
 * 위생인증 택1 — 원본 `[인증][인증안됨]`.
 *
 * 값이 불리언인데 버튼이 둘이라, 화면은 문자열로 다루고 저장할 때 되돌린다.
 * (`SegmentedControl` 은 문자열 값을 쓴다)
 */
export const HYGIENE_OPTIONS = [
  { value: "certified", label: "인증" },
  { value: "none", label: "인증안됨" },
];

export const hygieneValue = (certified: boolean) =>
  certified ? "certified" : "none";

/** 등록 상품 표의 `유형` 열 */
export const DEAL_KIND_LABEL: Record<DealKind, string> = {
  rent: "렌트",
  sale: "판매",
};

/**
 * 등록 상품 표의 `판매 상태` 배지.
 *
 * 판매중은 진행, 품절·판매중지는 **정상적으로 멈춘 상태**라 중립으로 둔다 —
 * 빨갛게 띄우면 문제가 생긴 상품으로 읽힌다(상품 관리 화면과 같은 규칙).
 */
export const SALE_STATUS_META: Record<
  SellerProduct["saleStatus"],
  { label: string; tone: "success" | "default" }
> = {
  onSale: { label: "판매중", tone: "success" },
  soldout: { label: "품절", tone: "default" },
  stopped: { label: "판매중지", tone: "default" },
};

/** 전시 상태 — 원본 `전시중 / 숨김` */
export const shownLabel = (shown: boolean) => (shown ? "전시중" : "숨김");

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

/** 서류 [보기] — 파일은 서버에 있으므로 이 저장소에서는 알림만 낸다 */
export const documentOpenText = (fileName: string) =>
  `${fileName} 을(를) 새 창에서 엽니다`;

/** 날짜만 점 표기로 — 원본 `ymd` */
export const ymd = (value: string | null) =>
  value ? value.slice(0, 10).replace(/-/g, ".") : "-";

/**
 * 등록 상품 표의 일시 — 원본은 여기서 **초까지** 낸다
 * (`2026.05.10 09:14:22`). 목록 화면의 `ymd` 와 다르다.
 */
export const stampText = (value: string) =>
  `${value.slice(0, 10).replace(/-/g, ".")} ${value.slice(11)}`;

/** 평점은 소수 둘째 자리까지 — 원본 `4.91` */
export const ratingText = (value: number) => value.toFixed(2);

/** 등록 상품수 */
export const countText = (value: number) =>
  `${value.toLocaleString("ko-KR")}개`;

/** 등록 상품이 하나도 없을 때 */
export const PRODUCT_EMPTY_TITLE = "등록된 상품이 없습니다";
export const PRODUCT_EMPTY_DESCRIPTION =
  "이 셀러가 등록한 상품이 아직 없습니다.";
