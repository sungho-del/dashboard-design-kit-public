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
 * - 표시 순서는 **월령 오름차순**이다 — 구간이 뒤섞이면 표가 읽히지 않는다
 * - 등록 상품수는 행이 들고 있지 않다 — 뼈대가 상품마다 배정된 단계 id 를
 *   `stageCountsOf` 에 넘겨 센다(상품 데이터가 이 파일을 import 하므로 여기서 상품을
 *   import 하면 순환이 된다)
 * - `STATS`(요약 카드) · `FILTERS`(세그먼트) · `PAGE_SIZE` 는 **없다** — 원본에 없다
 *
 * ## 원본 어드민에서 가져온 것 / 버린 것
 * 가져온 것은 도메인뿐이다 — 컬럼명("내용 (사용자 안내 문구)"), 월령 표기 규칙
 * (`36개월~`), 검증 문구 2종, 삭제 안내, 종료 개월 힌트("종료 비우면 '이상'"),
 * 저장·삭제 결과 문구, 4단계 시드. 색·레이아웃은 쓰지 않는다.
 *
 * ## 편집은 알림만 띄운다 (퍼블 범위 · 2026-10-19 사용자 결정)
 * 추가·수정·삭제는 입력·검증까지만 화면에서 하고, 확정하면 원본 문구의 알림만 띄운다 —
 * 표·`STAGES`·상품 배정은 바뀌지 않는다(카테고리 관리와 같은 기준).
 *
 * ⚠️ **원본에 없어서 걷어낸 것 — 되살리지 말 것**
 * - **월령 구간 겹침 검사**(`rangeOverlaps` · `findOverlappingStage` ·
 *   `overlapErrorOf`). 그럴듯했지만 **원본에 없는 규칙**이었다 — 원본이 저장 전에
 *   보는 것은 `명칭이 비었는가` · `시작 개월이 비었는가` 둘뿐이다. 겹침·빈틈을
 *   누가 막을지(서버 정책)는 정해지지 않았다 — 이 화면은 검사하지 않는다
 * - **이름 중복 검사** — 원본에 없다
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
}

/**
 * 성장단계 4종 — **원본 `STAGES` 그대로**(이름·구간·안내 문구), 월령 오름차순.
 *
 * ⚠️ **24개월이 걸음마(13~24)와 유아(24~) 두 단계에 겹친다** — 원본 데이터 그대로다.
 * 기획 확인이 필요한 사항으로 인계 문서에 남겼다(2026-10-19 사용자 결정: 임의로 고치지 않는다).
 * 단계 id 는 상품 상세의 성장단계 값으로 쓰인다.
 */
export const STAGES: GrowthStage[] = [
  {
    id: "newborn",
    name: "신생아",
    monthFrom: 0,
    monthTo: 3,
    note: "갓 태어난 아기를 위한 필수템",
  },
  {
    id: "infant",
    name: "영아",
    monthFrom: 4,
    monthTo: 12,
    note: "뒤집기부터 첫 걸음 준비까지",
  },
  {
    id: "toddler",
    name: "걸음마",
    monthFrom: 13,
    monthTo: 24,
    note: "아장아장 걸음마 시기 용품",
  },
  {
    id: "preschool",
    name: "유아",
    monthFrom: 24,
    monthTo: null,
    note: "놀이와 배움이 커지는 시기",
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

/**
 * 단계별 등록 상품수. `assigned` 는 상품마다 배정된 단계 id 다(원본 `stageUseCnt` —
 * 임시저장만 빼고 본사 직영도 센다). 표와 삭제 알림의 "상품 N개"가 이 결과 하나를 같이 쓴다.
 */
export const stageCountsOf = (
  stages: GrowthStage[],
  assigned: readonly string[],
): Map<string, number> =>
  new Map(
    stages.map((stage) => [
      stage.id,
      assigned.filter((id) => id === stage.id).length,
    ]),
  );

/* =========================================================================
 * 문구 — 전부 원본 어드민에서 그대로 옮긴 것이다
 * ====================================================================== */

/**
 * 저장 전에 보는 것은 이 둘뿐이다 (원본 `stageSave` 의 두 가드).
 */
export const NAME_ERROR = "단계 명칭을 입력해주세요.";
export const MONTH_FROM_ERROR = "시작 개월을 입력해주세요.";

export const NAME_PLACEHOLDER = "예) 신생아";
export const MONTH_PLACEHOLDER = "nn";
export const NOTE_PLACEHOLDER = "30자 이내 — 사용자 안내 팝업·레일 소개 문구";
/** 원본 `개월 (종료 비우면 '이상')` 에서 필드 옆으로 옮긴 힌트 */
export const MONTH_TO_HINT = "종료 비우면 '이상'";

/** 표의 안내 문구가 비었을 때 (원본도 `-`) — 원본 시드는 모두 문구가 있어 수정으로 비울 때의 모습이다 */
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
