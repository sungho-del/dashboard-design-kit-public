import {
  CATEGORIES,
  LIST_PATH,
  NEW_ID,
  findFaq,
  type Faq,
} from "./FaqListPage.data";

/* -------------------------------------------------------------------------
 * FAQ 등록/수정 — **도메인 층** (BabyCube 본사 운영 어드민 · 폼형)
 *
 * 짝이 되는 뼈대: `FaqFormPage.tsx`
 * 들어오는 곳: FAQ 관리의 질문·행 클릭(`/faq-admin/{id}`) · [+ FAQ 추가](`/faq-admin/new`)
 * 기준 기획: **v0.4** `DETAILS.faqDetail` (proto.html 5444~5463) · 저장 `faqSave`(3463~3470)
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `targetOf(경로 조각)` → `{ mode: "new" }` | `{ mode: "edit", faq }` | `undefined`(찾을 수 없음)
 * - 선택지 `CATEGORY_OPTIONS` 는 목록과 같은 원장 `CATEGORIES` 에서 — 신규 기본값은 첫 항목(원본 5453 `FAQ_CATS[0]`)
 * - 필수는 카테고리·질문 둘. **답변은 필수가 아니다**(원본 5455)
 *
 * ## 원본과 맞춘 것
 * 구역 하나 「FAQ 내용」(필수 ● · 접기) · 질문 `maxlength 100` · 글자 수 카운터 없음 · 도움말 문구 ·
 * 하단 [목록] | ([삭제] 수정일 때만) [등록|저장] [취소] — [취소]도 목록으로(원본 `nvEditPage` 4737~4740) ·
 * 저장·삭제 알림 문구 · 삭제 확인은 **목록과 같은 창**(`FaqDeleteModal`)
 *
 * ## 원본과 다르게 둔 것
 * - 머리를 그린다 — 원본 `nvEditPage` 는 `title` 을 받고도 버린다(4725, 미렌더 결함).
 *   「FAQ 등록」/「FAQ 수정」(사용자 결정). 질문은 제목에 붙이지 않는다(길다)
 * - 질문이 비면 **입력칸 아래 오류**(원본은 알림 — 형제 폼 §29 규칙)
 * - 저장·등록·삭제는 **알림 후 목록으로만** — 목록에 반영하지 않는다(퍼블 범위 · 화면 간 상태 유지 없음).
 *   그래서 목록에서 추가·이름 변경한 카테고리도 이 화면 선택지에 이어지지 않는다(알려진 한계)
 * - 원본 키는 배열 인덱스(삭제하면 밀린다) — 우리는 고유 id
 *
 * ## ⚠️ 기획 확인 필요
 * - 답변이 필수가 아니다 — 빈 답변 FAQ 가 사용자 앱에 그대로 노출될 수 있다(원본대로 둠)
 * - 신규 저장의 카테고리 대체값이 `FAQ_CATS[마지막]||'기타'`(3468) 로 셀렉트 기본값(`[0]`)과 엇갈린다.
 *   우리는 셀렉트 값만 쓴다(정상 흐름에서는 닿지 않는다)
 * ---------------------------------------------------------------------- */

export { LIST_PATH };
export const LIST_LABEL = "FAQ 관리";

export type FaqFormTarget = { mode: "new" } | { mode: "edit"; faq: Faq };

/** 경로 마지막 조각 → 등록 / 수정 대상 / 없음 */
export const targetOf = (segment: string): FaqFormTarget | undefined => {
  if (segment === NEW_ID) return { mode: "new" };
  const faq = findFaq(segment);
  return faq ? { mode: "edit", faq } : undefined;
};

/** 머리 제목 — 사용자 결정(원본 `title` 인자를 살린 것) */
export const PAGE_TITLE = { new: "FAQ 등록", edit: "FAQ 수정" } as const;
/** 저장 버튼 라벨 — 원본 `saveLabel`(5461) */
export const SAVE_LABEL = { new: "등록", edit: "저장" } as const;
/** 저장 알림 — 원본 `faqSave`(3470) */
export const SAVED_MESSAGE = {
  new: "FAQ가 등록되었습니다.",
  edit: "FAQ가 수정되었습니다.",
} as const;

export const SECTION_TITLE = "FAQ 내용";

export const CATEGORY_OPTIONS = CATEGORIES.map((category) => ({
  value: category.id,
  label: category.name,
}));
export const DEFAULT_CATEGORY_ID = CATEGORIES[0].id;

/** 질문 길이 제한 — 원본 `maxlength="100"`(5454) */
export const QUESTION_MAX = 100;

export const COPY = {
  questionPlaceholder: "질문을 입력해 주세요",
  answerPlaceholder: "답변 내용을 입력해 주세요",
  /** 질문이 비었을 때 — 원본 알림 문구(3465) */
  questionRequired: "질문을 입력해주세요.",
  /** 구역 끝 도움말(5456) — `emphasis` 는 굵게 */
  help: {
    lead: "여기서 저장한 문안이 ",
    emphasis: "사용자 앱 고객센터 FAQ",
    tail: "에 그대로 노출됩니다.",
  },
};

/** 찾을 수 없음 — 원본 `notFound` 설명 문구 그대로(4684) */
export const NOT_FOUND_TITLE = "찾을 수 없는 FAQ입니다";
export const NOT_FOUND_DESCRIPTION =
  "해당 항목이 존재하지 않거나 삭제되었습니다.";
