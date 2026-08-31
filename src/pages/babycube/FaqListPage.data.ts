/* -------------------------------------------------------------------------
 * S20 FAQ 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `FaqListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 화면 유형: **목록형** (`docs/screen-templates.md` §3-1)
 *
 * ## 갈아끼울 것 — 이 파일 전체
 * | 역할                | 실물 이름                        |
 * | ------------------- | -------------------------------- |
 * | 표 한 행의 타입     | `Faq`                            |
 * | 카테고리 타입·목록  | `FaqCategory` · `CATEGORIES`     |
 * | 샘플 데이터         | `FAQS`                           |
 * | 카테고리 칩 첫 항목 | `ALL_CATEGORY`                   |
 * | 안내·확인 문구      | `MESSAGES`                       |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유키)를 갖는다
 * - `ALL_CATEGORY.id` 는 `"all"`(필터 해제) 이고 `CATEGORIES` 의 어떤 id 와도 겹치지 않는다
 * - `Faq.categoryId` 는 `CATEGORIES[].id` 중 하나다 (뼈대가 이름을 찾아 배지로 그린다)
 *
 * ## 원본 어드민 대조 (`_plan/babycube-admin/chunks/3sxnfshlohpx5.js` 모듈 61180)
 * 이 화면도 **공용 목록 셸(`20013`)을 쓰지 않는다.** 카드 두 장을 직접 조립한다:
 * ```
 * 카드1 FAQ 카테고리 : 제목 + "N개" + [+ 카테고리 추가]
 *                      태그마다  이름 · FAQ 건수 · ✎ 이름 변경 · ✕ 삭제
 * 카드2 FAQ 목록     : 목록 (총 N건) + 카테고리 칩(전체 + 이름들) | [+ FAQ 추가][선택 삭제]
 *                      표 3열 + 행 선택 체크박스
 * ```
 * 컬럼은 `categoryName 카테고리`(회색 배지) · `question 질문`(링크) ·
 * `answer 답변`(말줄임) **셋뿐**이고 **페이지네이션이 없다**.
 *
 * ### ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **등록일 열.** 원본 컬럼은 3열이다. 따라 `Faq` 에서 `date` 필드도 지웠다
 *   (표에도 필터에도 쓰지 않는 값을 들고 있으면 다음 사람이 열을 되살린다)
 * - **페이지네이션과 `PAGE_SIZE`.** 원본 카드2 는 `ListHead + 표` 뿐이라 페이저가 없다
 * - **상시 노출 안내문**("소속 FAQ가 없는 빈 카테고리만 삭제됩니다."를 카드에 깔아 두던 것).
 *   원본은 그 문장을 **삭제 확인 모달 본문**에서 말한다 — 아래 `categoryDelete` 참고
 *
 * ### 원본에 있었는데 우리가 빠뜨렸던 것 — 되살렸다
 * - **카테고리마다 붙는 행 액션 2개**(✎ 이름 변경 · ✕ 삭제)와 **FAQ 건수**.
 *   우리는 "칩을 고른 뒤 카드 헤더의 버튼을 누르는" 간접 조작이었는데, 원본은
 *   카테고리 태그 자체에 두 버튼이 달려 있다
 * - **`선택 삭제` 툴바 버튼**과 선택 없이 눌렀을 때의 안내(`nothingSelected`)
 * - **카테고리 개수 표시**("N개")
 *
 * ## 카테고리를 이 화면이 함께 관리한다
 * 카테고리는 상수가 아니라 **화면에서 바뀌는 상태**이고, 뼈대가 `useState` 로 들고 있다.
 * 이 파일의 `CATEGORIES` 는 그 초기값이다.
 * **건수(`faqCount`)를 여기 적지 않는다** — 뼈대가 지금 FAQ 목록에서 세므로
 * 태그의 숫자와 표의 행 수가 어긋날 수 없다(원본은 서버가 세어 준다).
 *
 * ## 상태(STATUS_META)가 없는 이유
 * 원본 FAQ 컬럼에 상태가 없다. 공개/비공개 없이 **있으면 노출되는 글**이고,
 * 그래서 삭제 확인 문구가 "삭제하면 사용자 앱 고객센터에서도 즉시 사라집니다"이다 —
 * 내리는 수단이 삭제뿐이라는 뜻이다.
 * ---------------------------------------------------------------------- */

export interface FaqCategory {
  id: string;
  name: string;
}

export interface Faq {
  /** 고유 키 — 뼈대가 행 key·선택 식별자로 쓴다 (원본 `rowKey: e => e.id`) */
  id: string;
  /** `CATEGORIES[].id` 중 하나 */
  categoryId: string;
  question: string;
  answer: string;
}

/** 카테고리 칩의 첫 항목(필터 해제) — 원본도 `let h = "전체"` 를 맨 앞에 붙인다 */
export const ALL_CATEGORY: FaqCategory = { id: "all", name: "전체" };

/** 카테고리 초기값 — 화면에서 추가·이름 변경·삭제된다 */
export const CATEGORIES: FaqCategory[] = [
  { id: "delivery", name: "배송" },
  { id: "rental", name: "대여·반납" },
  { id: "payment", name: "결제·환불" },
  { id: "care", name: "안심케어" },
  /* 소속 FAQ 가 없는 카테고리 — 빈 카테고리만 삭제된다는 규칙을 화면에서 확인할 수 있다 */
  { id: "member", name: "회원" },
];

export const FAQS: Faq[] = [
  {
    id: "F-021",
    categoryId: "delivery",
    question: "배송은 얼마나 걸리나요?",
    answer:
      "주문 후 평균 2~3일 이내에 출고됩니다. 도서산간 지역은 하루가 더 걸릴 수 있습니다.",
  },
  {
    id: "F-020",
    categoryId: "rental",
    question: "대여 기간을 연장할 수 있나요?",
    answer:
      "마이페이지 > 대여 내역에서 반납 예정일 3일 전까지 연장을 신청할 수 있습니다.",
  },
  {
    id: "F-019",
    categoryId: "rental",
    question: "반납할 때 포장은 어떻게 하나요?",
    answer:
      "배송받은 박스를 그대로 사용해 주세요. 박스가 없으면 회수 기사에게 요청할 수 있습니다.",
  },
  {
    id: "F-018",
    categoryId: "payment",
    question: "환불은 언제 처리되나요?",
    answer: "환불 승인 후 영업일 기준 3일 이내에 결제하신 수단으로 환급됩니다.",
  },
  {
    id: "F-017",
    categoryId: "care",
    question: "안심케어에 가입하면 무엇이 보장되나요?",
    answer:
      "생활 파손과 오염에 대한 수리비를 자기부담금 범위에서 보장합니다. 분실은 제외됩니다.",
  },
  {
    id: "F-016",
    categoryId: "delivery",
    question: "배송지를 변경하고 싶어요.",
    answer:
      "출고 전이라면 주문 상세에서 직접 변경할 수 있고, 출고 후에는 고객센터로 문의해 주세요.",
  },
];

/** 카테고리명 입력 길이 제한 — 원본 `maxLength: 20` */
export const CATEGORY_NAME_MAX = 20;

/**
 * 화면 문구 — **원본 어드민의 문구를 그대로 가져왔다**(도메인 내용이라서다).
 * 색·레이아웃은 가져오지 않는다.
 *
 * 삭제 확인 두 개는 원본 `GateBody` 구조를 그대로 옮겼다:
 * `{lead}<b>{emphasis}</b>{tail}` + 줄바꿈 + 굵은 빨강 `irreversible`.
 * 강조 구간을 나눠 두는 이유는, 그 구간이 **되돌릴 수 없는 조치의 범위**를 말하기 때문이다.
 */
export const MESSAGES = {
  /** 카테고리 이름을 비운 채 저장했을 때 */
  categoryNameRequired: "카테고리명을 입력해주세요.",
  categoryNamePlaceholder: "카테고리명 (예: 배송)",
  categoryAdded: "카테고리가 추가되었습니다.",
  categoryRenamed: "카테고리가 수정되었습니다.",
  categoryDeleted: "카테고리가 삭제되었습니다.",
  /** 비어 있지 않은 카테고리의 ✕ 를 눌렀을 때 — 다음에 할 일까지 알려 준다 */
  categoryDeleteBlocked: (name: string, count: number) =>
    `'${name}' 카테고리에 FAQ ${count}건이 있어 삭제할 수 없습니다. 먼저 다른 카테고리로 옮겨주세요.`,
  /** 카테고리 삭제 확인 본문 */
  categoryDelete: {
    lead: "소속 FAQ가 없는 ",
    emphasis: "빈 카테고리만 삭제됩니다",
    tail: ".",
  },
  /** FAQ 삭제 확인 본문 — 파급 범위를 먼저 말한다 */
  faqDelete: {
    lead: "삭제하면 ",
    emphasis: "사용자 앱 고객센터에서도 즉시 사라집니다",
    tail: ".",
  },
  /** 두 삭제 모달이 공유하는 마지막 경고 (원본은 danger 색 + 굵게) */
  irreversible: "삭제 후에는 되돌릴 수 없습니다.",
  /** 선택 없이 `선택 삭제` 를 눌렀을 때 */
  nothingSelected: "선택된 FAQ가 없습니다.",
  /** 삭제 완료 — 원본은 2건 이상일 때만 건수를 밝힌다 */
  faqDeleted: (count: number) =>
    count > 1 ? `${count}건 삭제되었습니다.` : "삭제되었습니다.",
  /** `+ FAQ 추가` — 원본은 `/faq-admin/new` 로 나간다 */
  faqAddOpened: "FAQ 추가 화면을 엽니다",
};

/** 새 카테고리 id 생성 — 화면에서 추가할 때 쓴다 */
export const nextCategoryId = (existing: FaqCategory[]) =>
  `cat-${existing.length + 1}-${Date.now().toString(36)}`;
