import {
  APPLICATIONS,
  REVIEWABLE_STATUS,
  type Application,
  type ApplicationKind,
} from "./SellerReviewPage.data";

/* -------------------------------------------------------------------------
 * S04-D 입점 심사 상세 (BO-SEL-004) — 도메인 층
 *
 * 짝이 되는 뼈대: `SellerReviewDetailPage.tsx`
 *
 * ## ⚠️ 신청 레코드와 심사 규칙은 **목록과 같은 것을 쓴다**
 * `SellerReviewPage.data.ts` 의 `APPLICATIONS` · `REVIEW_COPY`(승인·반려 문구) ·
 * `commissionError`(수수료율 규칙) · `HYGIENE_OPTIONS` 를 그대로 읽는다.
 * 따로 두면 같은 신청이 화면마다 다르게 보이거나, 목록 일괄과 상세 승인의 규칙이 갈린다.
 *
 * ## 갈아끼울 것 (이 파일 전체)
 *
 * | 실물 이름             | 역할                                             |
 * | --------------------- | ------------------------------------------------ |
 * | `findApplication`     | 경로의 id → 신청 레코드                          |
 * | `SECTIONS`            | 섹션 제목 2종 (원본 `sellerReview.form` 순서)    |
 * | `KIND_LABEL`          | 상품 취급 유형 어휘 (`렌트+판매` …)              |
 * | `COMMISSION_HINT`      | 수수료율 안내 문구 (개발 그대로) — 위생인증 안내는 부록 A C73 으로 지웠다 |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - **승인요청 상태만 심사할 수 있다**(`REVIEWABLE_STATUS`). 이미 승인·반려된 건은
 *   읽기 전용이고 하단 바에 [승인]·[반려] 가 뜨지 않는다(원본 — 종결 건은 [목록]만)
 * - **승인하려면 수수료율이 있어야 한다**(0 초과 100 이하 · 소수 둘째 자리 — 목록 일괄과 같은 규칙)
 * ---------------------------------------------------------------------- */

export const findApplication = (id: string): Application | undefined =>
  APPLICATIONS.find((application) => application.id === id);

/** 원본 `sellerReview.form` 의 섹션 구성 순서 */
export const SECTIONS = {
  apply: "신청 정보 (입점 전)",
  /* 부록 A A18 · 판정 Q11 — 「(입점 승인 후)」를 뺐다(반려 건에도 같은 제목) */
  result: "심사 결과",
} as const;

/** 상품 취급 유형 — 원본 `[렌트+판매][렌트][판매]` */
export const KIND_LABEL: Record<ApplicationKind, string> = {
  both: "렌트+판매",
  rent: "렌트",
  sale: "판매",
};

/** 이 신청을 심사할 수 있는가 — 승인요청 상태만 */
export const isReviewable = (application: Application) =>
  application.status === REVIEWABLE_STATUS;

/** 수수료율 안내 — 개발 문구 그대로(디자인 §3 #12 · 판정 Q20-5 · SellerReviewDetailScreen) */
export const COMMISSION_HINT =
  "신청 접수 시 0%로 시작하며, 최고관리자가 심사 시 0보다 크고 100 이하(소수 둘째 자리까지)로 직접 입력합니다.";

/** 수수료율 자리표시 — 개발 그대로 */
export const COMMISSION_PLACEHOLDER = "0.01~100";
