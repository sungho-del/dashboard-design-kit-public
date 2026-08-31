/* -------------------------------------------------------------------------
 * 성장단계 관리 (S07) — 목록형 화면의 **도메인 층**
 *
 * 짝이 되는 뼈대: `GrowthStageListPage.tsx`
 *
 * ## 이 화면의 도메인 핵심은 **월령 구간**이다
 * 성장단계는 "아이가 몇 개월일 때 쓰는 물건인가"를 가르는 축이다.
 * 종료 개월은 **비울 수 있고, 비우면 '이상'** 이다(마지막 단계). 열린 구간을
 * `null` 로 두는 것이 이 도메인의 규칙이라 표기 함수가 `null` 을 따로 다룬다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(고유 키)를 갖는다.
 *   ⚠️ **`date` 는 없다.** 기간 조회가 없는 화면이라 날짜 필드를 만들지 않는다
 * - 표시 순서는 **월령 오름차순**이다 — 구간이 뒤섞이면 표가 읽히지 않는다.
 *   추가·수정 뒤에도 그 순서를 유지하는 것이 `sortStages` 의 일이다
 * - `STATS`(요약 카드) · `FILTERS`(세그먼트) · `PAGE_SIZE` 는 **없다** — 원본에 없다
 *
 * ## 원본 어드민에서 가져온 것 / 버린 것
 * 가져온 것은 도메인뿐이다 — 컬럼명("내용 (사용자 안내 문구)"), 월령 표기 규칙
 * (`36개월~`), 검증 문구 2종, 삭제 안내, 종료 개월 힌트("종료 비우면 '이상'"),
 * 저장·삭제 결과 문구. 색·레이아웃은 쓰지 않는다.
 *
 * ⚠️ **원본에 없어서 걷어낸 것 — 되살리지 말 것**
 * - **월령 구간 겹침 검사**(`rangeOverlaps` · `findOverlappingStage` ·
 *   `overlapErrorOf`). 그럴듯했지만 **원본에 없는 규칙**이었다 — 원본이 저장 전에
 *   보는 것은 `명칭이 비었는가` · `시작 개월이 비었는가` 둘뿐이고, 나머지는 서버가
 *   판정해 그 메시지를 그대로 띄운다. 겹침 금지는 우리가 만든 도메인 규칙이었다
 * - `종료 개월은 시작 개월보다 크거나 같아야 합니다.` · `종료 개월은 숫자만…` 문구
 * - 페이지네이션(`PAGE_SIZE`) · 요약 카드 · 도움말 툴팁 · `monthSpanOf`(쓰이지 않았다)
 * ---------------------------------------------------------------------- */

export interface GrowthStage {
  /** 단계 코드 — 뼈대가 행 key 로 쓴다 */
  id: string;
  /** 단계 명칭 (예: 신생아) — 10자 이내 */
  name: string;
  /** 시작 개월 (이 값 포함) */
  monthFrom: number;
  /** 종료 개월 (이 값 포함). **`null` 이면 '이상'** — 마지막 단계에만 쓴다 */
  monthTo: number | null;
  /** 사용자 안내 문구 — 앱의 성장단계 팝업·추천 레일 소개에 그대로 나간다 (30자 이내) */
  note: string;
  /** 이 단계로 등록된 상품 수. 삭제하면 이 상품들의 성장단계가 '없음'이 된다 */
  productCount: number;
}

/**
 * 성장단계 5종 — **월령 오름차순**.
 *
 * 구간 정합: 0~3 · 4~11 · 12~23 · 24~35 · 36 이상.
 * 서로 겹치지 않고 빈틈도 없다. 이 성질이 깨지면 앱이 아이 월령으로 단계를
 * 찾을 때 둘이 걸리거나 아무것도 안 걸린다 —
 * 다만 **그것을 막는 것은 서버의 일**이라 이 화면은 검사하지 않는다(위 주석).
 */
export const STAGES: GrowthStage[] = [
  {
    id: "newborn",
    name: "신생아",
    monthFrom: 0,
    monthTo: 3,
    note: "목을 못 가누는 시기예요",
    productCount: 42,
  },
  {
    id: "infant",
    name: "영아",
    monthFrom: 4,
    monthTo: 11,
    note: "뒤집고 혼자 앉기 시작해요",
    productCount: 96,
  },
  {
    id: "toddler",
    name: "걸음마",
    monthFrom: 12,
    monthTo: 23,
    note: "붙잡고 서다 혼자 걸어요",
    productCount: 118,
  },
  {
    id: "preschool",
    name: "유아",
    monthFrom: 24,
    monthTo: 35,
    note: "뛰고 계단을 오르내려요",
    productCount: 87,
  },
  {
    id: "kinder",
    name: "취학 전",
    monthFrom: 36,
    monthTo: null,
    /** 안내 문구는 비울 수 있다 — 표에서는 `-` 로 나간다(원본과 같다) */
    note: "",
    productCount: 64,
  },
];

/**
 * 월령 구간 표기 — **원본 표기 그대로**다.
 *
 * 열린 구간은 `36개월~` 이고 닫힌 구간은 `0~3개월` 이다.
 * (`36개월 이상` 이라고 풀어 적던 것을 원본 대조 후 되돌렸다. 물결표 하나로
 *  "여기서부터 끝없이"를 말하는 것이 표 안에서 훨씬 짧게 읽힌다.)
 */
export const monthRangeText = (stage: {
  monthFrom: number;
  monthTo: number | null;
}) =>
  stage.monthTo === null
    ? stage.monthFrom + "개월~"
    : stage.monthFrom + "~" + stage.monthTo + "개월";

/**
 * 입력 문자열 → 개월 수. 비었거나 숫자가 아니면 `null`.
 * 종료 개월은 빈 값이 **정상**(= 이상)이라 판정은 뼈대가 한다.
 */
export const parseMonth = (text: string): number | null => {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
};

/** 등록 상품수 표기. 단위가 도메인이라 여기 둔다 */
export const count = (value: number) => value.toLocaleString("ko-KR") + "개";

/** 입력 길이 제한 — 원본과 같다 */
export const NAME_MAX = 10;
export const NOTE_MAX = 30;

/* =========================================================================
 * 목록 다루기 — 추가·수정·삭제가 **표에 그대로 보여야** 한다
 * ====================================================================== */

/** 표시 순서를 되찾는다. 월령 오름차순이 이 표의 유일한 순서다 */
const sortStages = (rows: GrowthStage[]) =>
  [...rows].sort((a, b) => a.monthFrom - b.monthFrom);

/** 새 단계를 넣고 월령 순서로 다시 세운 배열 */
export const addStage = (
  rows: GrowthStage[],
  stage: Omit<GrowthStage, "productCount">,
) => sortStages([...rows, { ...stage, productCount: 0 }]);

/** 한 단계를 고치고 월령 순서로 다시 세운 배열 */
export const updateStage = (
  rows: GrowthStage[],
  id: string,
  patch: Omit<GrowthStage, "id" | "productCount">,
) =>
  sortStages(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

/** 한 단계를 뺀 배열 */
export const removeStage = (rows: GrowthStage[], id: string) =>
  rows.filter((row) => row.id !== id);

/* =========================================================================
 * 문구 — 전부 원본 어드민에서 그대로 옮긴 것이다
 * ====================================================================== */

/**
 * 저장 전에 보는 것은 이 둘뿐이다 (원본 `A()` 의 두 가드).
 * 나머지는 서버가 판정해 그 메시지를 그대로 띄운다.
 */
export const NAME_ERROR = "단계 명칭을 입력해주세요.";
export const MONTH_FROM_ERROR = "시작 개월을 입력해주세요.";

export const NAME_PLACEHOLDER = "예) 신생아";
export const MONTH_PLACEHOLDER = "nn";
export const NOTE_PLACEHOLDER = "30자 이내 — 사용자 안내 팝업·레일 소개 문구";
/** 원본 `개월 (종료 비우면 '이상')` 에서 필드 옆으로 옮긴 힌트 */
export const MONTH_TO_HINT = "종료 비우면 '이상'";

/** 표의 안내 문구가 비었을 때 (원본도 `-`) */
export const NOTE_EMPTY = "-";

export const DELETE_NOTICE =
  "삭제하면 이 단계를 쓰던 상품의 성장단계가 '없음'으로 바뀝니다.";
export const DELETE_WARNING = "삭제 후에는 되돌릴 수 없습니다.";

export const CREATED_MESSAGE = "성장단계가 등록되었습니다.";
export const UPDATED_MESSAGE = "성장단계가 수정되었습니다.";

/**
 * 삭제 결과.
 *
 * 쓰고 있던 상품이 있으면 **몇 개가 어디로 갔는지와 다음에 할 일**까지 말한다 —
 * 원본이 그렇게 적는 이유는 '없음'으로 밀려난 상품이 그대로 방치되면
 * 앱의 성장단계 추천에서 통째로 빠지기 때문이다.
 */
export const deletedMessage = (name: string, movedToNone: number) =>
  movedToNone > 0
    ? `'${name}' 단계가 삭제되었습니다 — 사용 중이던 상품 ${movedToNone}개는 '없음'으로 대체되었습니다. 상품 관리의 성장단계 필터('없음')로 재설정하세요.`
    : `'${name}' 단계가 삭제되었습니다.`;

/** 빈 상태 — 성장단계를 아직 하나도 만들지 않은 서비스 초기 상태 */
export const EMPTY_TITLE = "등록된 성장단계가 없습니다";
export const EMPTY_DESCRIPTION =
  "월령 구간을 나눠 첫 성장단계를 등록해 주세요.";
