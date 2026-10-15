import {
  APPLICATIONS,
  REVIEWABLE_STATUS,
  type Application,
  type ApplicationKind,
  type ReviewBizType,
} from "./SellerReviewPage.data";

/* -------------------------------------------------------------------------
 * S04-D 입점 심사 상세 (BO-SEL-004) — 도메인 층
 *
 * 짝이 되는 뼈대: `SellerReviewDetailPage.tsx`
 *
 * ## ⚠️ 신청 레코드는 **목록과 같은 것을 쓴다**
 * `SellerReviewPage.data.ts` 의 `APPLICATIONS` 를 그대로 읽는다. 상세용 배열을 따로
 * 두면 한쪽만 고쳤을 때 **같은 신청의 대표명·연락처가 화면마다 달라진다.**
 *
 * ## 갈아끼울 것 (이 파일 전체)
 *
 * | 실물 이름             | 역할                                             |
 * | --------------------- | ------------------------------------------------ |
 * | `findApplication`     | 경로의 id → 신청 레코드                          |
 * | `SECTIONS`            | 섹션 제목 2종 (원본 `sellerReview.form` 순서)    |
 * | `BIZ_TYPES`·`KINDS`   | 사업자 유형 · 상품 취급 유형 어휘                |
 * | `HYGIENE_OPTIONS`     | 위생인증 택1                                     |
 * | `commissionError`     | 수수료율 검증 (승인의 전제)                      |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - **승인요청 상태만 심사할 수 있다**(`REVIEWABLE_STATUS`). 이미 승인·반려된 건은
 *   읽기 전용이고 하단 바에 [승인]·[반려] 가 뜨지 않는다
 * - **승인하려면 수수료율이 있어야 한다.** 원본이 _"신청 접수 시 0%로 시작하며,
 *   최고관리자가 심사 시 직접 입력합니다"_ 라고 못 박는다 — 0% 로 승인하면
 *   플랫폼 수수료가 영영 0 인 셀러가 생긴다
 * ---------------------------------------------------------------------- */

export const findApplication = (id: string): Application | undefined =>
  APPLICATIONS.find((application) => application.id === id);

/** 원본 `sellerReview.form` 의 섹션 구성 순서 */
export const SECTIONS = {
  apply: "신청 정보 (입점 전)",
  result: "심사 결과 (입점 승인 후)",
} as const;

export const BIZ_TYPE_LABEL: Record<ReviewBizType, string> = {
  corporate: "법인",
  individual: "개인",
};

/** 상품 취급 유형 — 원본 `[렌트+판매][렌트][판매]` */
export const KIND_LABEL: Record<ApplicationKind, string> = {
  both: "렌트+판매",
  rent: "렌트",
  sale: "판매",
};

/** 위생인증 택1 — 원본 `[인증][인증안됨]` */
export const HYGIENE_OPTIONS = [
  { value: "certified", label: "인증" },
  { value: "none", label: "인증안됨" },
];

export const hygieneValue = (certified: boolean) =>
  certified ? "certified" : "none";

/** 이 신청을 심사할 수 있는가 — 승인요청 상태만 */
export const isReviewable = (application: Application) =>
  application.status === REVIEWABLE_STATUS;

/** 수수료율 안내 — 원본 문구 그대로 */
export const COMMISSION_HINT =
  "신청 접수 시 0%로 시작하며, 최고관리자가 심사 시 직접 입력합니다.";

/** 위생인증 안내 — 원본 문구 그대로 */
export const HYGIENE_HINT =
  "위생인증은 입점 승인 후 관리하는 항목입니다. 기본값은 '인증안됨'이며 승인 셀러에 한해 부여합니다.";

export const COMMISSION_MIN = 0;
export const COMMISSION_MAX = 100;

/**
 * 수수료율 검증. **승인 직전에만** 부른다 — 반려에는 요율이 필요 없다.
 *
 * `0` 과 빈 칸을 모두 막는다. 원본이 "심사 시 직접 입력"이라고 적은 값이라,
 * 접수 기본값 0% 그대로 승인하면 수수료를 정하지 않은 채 입점시키는 것이 된다.
 */
export const commissionError = (value: string) => {
  if (value.trim() === "") return "수수료율을 입력해 주세요.";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return "숫자만 입력할 수 있습니다.";
  if (parsed <= COMMISSION_MIN || parsed > COMMISSION_MAX) {
    return `${COMMISSION_MIN}보다 크고 ${COMMISSION_MAX} 이하로 입력해 주세요.`;
  }
  return null;
};

/** 반려 사유는 필수다 — 셀러가 무엇을 고쳐야 하는지 알아야 재신청이 성립한다 */
export const REJECT_REASON_REQUIRED = "반려 사유를 입력해 주세요.";
export const REJECT_PLACEHOLDER =
  "반려 사유를 입력하세요 (예: 사업자등록증 사본 불명확, 통신판매업 신고번호 불일치 등)";
export const REJECT_NOTICE =
  "입력한 사유는 신청 셀러에게 그대로 전달됩니다. 반려해도 셀러는 보완 후 다시 신청할 수 있습니다.";

export const approvedMessage = (name: string, rate: string) =>
  `${name} 을(를) 승인했습니다 — 수수료율 ${rate}%`;

export const rejectedMessage = (name: string) =>
  `${name} 의 신청을 반려했습니다`;

/** 서류 [보기] — 파일은 서버에 있으므로 이 저장소에서는 알림만 낸다 */
export const documentOpenText = (fileName: string) =>
  `${fileName} 을(를) 새 창에서 엽니다`;

/** 신청일·승인일·반려일 — 날짜와 시각을 함께 낸다 */
export const stampText = (value: string | null) =>
  value
    ? `${value.slice(0, 10).replace(/-/g, ".")} ${value.slice(11, 16)}`
    : "-";
