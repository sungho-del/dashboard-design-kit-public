import {
  CUSTOMER_INQUIRIES,
  LIST_PATH,
  SELLER_ASKS,
  SELLER_LIST_PATH,
  type CustomerInquiry,
  type SellerAsk,
} from "./SupportListPage.data";

/* -------------------------------------------------------------------------
 * S22-D 문의 상세 — 도메인 층 (`/support/{문의 ID}`)
 * 기준 기획: v0.4 `DETAILS.inquiryDetail`(proto.html 5390~5404) · `DETAILS.sellerAskDetail`(5407~5420) ·
 * 저장 `inqReplySave`·`sellerAskReplySave`(4086~4094) · 화면 설명 annotations 82~85
 *
 * 짝이 되는 뼈대: `SupportDetailPage.tsx`
 *
 * ## ⚠️ 문의 행은 **목록과 같은 것을 쓴다** (`SupportListPage.data.ts`)
 *
 * ## 갈아끼울 것 (이 파일 전체)
 * | 실물 이름     | 역할                                                           |
 * | ------------- | -------------------------------------------------------------- |
 * | `findInquiry` | 경로의 ID → 고객 문의 / 셀러 문의 (없으면 「찾을 수 없음」)    |
 * | `KIND_META`   | 종류별 화면 제목 · [목록]이 돌아갈 곳                          |
 * | `kindOfId`    | 찾지 못한 ID 의 종류 — 접두사로 정한다(`SQ-` = 셀러)           |
 * | `COPY`        | 구역 제목 · 답변 자리표시 · 오류 · 알림 문구 (원본 그대로)     |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 경로 하나에 두 종류 — **ID 로 가른다**(고객 `Q-…` · 셀러 `SQ-…`). 셀러 [목록]은 셀러 탭(`?tab=seller`)
 * - 답변 버튼 이름은 **저장된 상태**로 정한다 — 답변완료면 [답변 수정], 아니면 [답변 등록]
 * - 퍼블 범위: 빈 답변(trim)은 막고, 통과하면 **알림만** — 상태·버튼·답변일은 바뀌지 않는다(사용자 결정)
 *
 * ## 원본과 다르게 둔 곳
 * - 미답변 건에도 「답변일 -」 줄을 둔다 — 원본 코드는 줄을 빼지만 화면 설명(annotations 83)은
 *   「답변 전 건의 답변일은 '-'」(사용자 결정). ⚠️ 기획 확인 필요(주석과 코드가 다르다)
 * - 빈 답변 오류는 알림이 아니라 입력칸 아래(형제 화면의 사유 입력과 같은 규칙) — 문구는 원본 그대로
 * - 머리: 원본은 그려지지 않는다(결함) → 형제 상세처럼 제목 + 한 줄 요약 + 상태 배지
 * - 셀러 문의의 「찾을 수 없음」 [목록]은 셀러 탭으로(원본은 고객 탭으로 간다 — 결함)
 * ---------------------------------------------------------------------- */

export type InquiryKind = "customer" | "seller";

export type FoundInquiry =
  | { kind: "customer"; item: CustomerInquiry }
  | { kind: "seller"; item: SellerAsk };

export const findInquiry = (id: string): FoundInquiry | undefined => {
  const customer = CUSTOMER_INQUIRIES.find((row) => row.id === id);
  if (customer) return { kind: "customer", item: customer };
  const seller = SELLER_ASKS.find((row) => row.id === id);
  if (seller) return { kind: "seller", item: seller };
  return undefined;
};

/** 찾지 못한 ID 의 종류 — 셀러 문의는 `SQ-` 로 시작한다 */
export const kindOfId = (id: string): InquiryKind =>
  id.startsWith("SQ-") ? "seller" : "customer";

/** 원본 `DETAIL_TITLES`(6338·6340) · [목록] 복귀 경로 */
export const KIND_META: Record<
  InquiryKind,
  { title: string; listPath: string }
> = {
  customer: { title: "고객 문의 상세", listPath: LIST_PATH },
  seller: { title: "셀러 문의 상세", listPath: SELLER_LIST_PATH },
};

/** 원본 문구 그대로 */
export const COPY = {
  section: "문의 정보",
  answerPlaceholder: "답변 내용을 입력해 주세요",
  answerEmpty: "답변 내용을 입력해주세요.",
  register: "답변 등록",
  update: "답변 수정",
  registered: "답변이 등록되었습니다.",
  updated: "답변이 수정되었습니다.",
  notFoundTitle: "찾을 수 없는 문의입니다",
  notFoundDescription: "주소가 잘못되었거나 삭제된 문의일 수 있습니다.",
  backToList: "문의 관리 목록으로",
} as const;
