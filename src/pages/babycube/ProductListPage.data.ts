import type { TagTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * 상품 관리 (S05) — 목록형 화면의 **도메인 층**
 *
 * 짝이 되는 뼈대: `ProductListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 이 화면이 다른 목록과 다른 점
 * 컬럼이 **23개**(선택 + 22)라 가로 스크롤이 전제다. 렌트 상품과 판매 상품이
 * 한 표에 섞여 있고, **열의 의미가 유형마다 다르다** — 렌트 건은 판매 원가·판매가가
 * 비어 있고 판매 건은 렌트 원가·보증금이 비어 있다. 그래서 유형 필터가 상태 필터만큼
 * 중요하다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(상품코드 = 고유 키) · `date`(`YYYY-MM-DD HH:mm`) 를 반드시 갖는다.
 *   ⚠️ 이 화면의 `date` 는 **상품등록일**이다. 기간 조회 대상이 4개(등록·판매시작·
 *   판매종료·최종수정)라 나머지는 `saleStart`·`saleEnd`·`updatedAt` 로 따로 들고,
 *   `DATE_FIELDS` 가 "어느 날짜로 조회할지"를 고른다
 * - `STATUS_META` 의 키는 `Product["status"]` 와 정확히 일치한다
 * - `FILTERS[0].value` 는 `"all"` (뼈대가 필터 해제로 취급) · `MODE_FILTERS` 도 동일
 * - `FILTERS` 는 툴바 세그먼트가 아니라 **상태별 건수 대시**의 카드 목록이다(아래)
 * - 파생 금액(렌트가·판매가)은 뼈대가 아니라 이 파일에서 계산한다
 *
 * ## 원본 어드민에서 가져온 것 / 버린 것
 * 가져온 것은 **도메인뿐**이다 — 컬럼명·컬럼 순서·고정열 범위, 상태 어휘(판매중/반려/
 * 재심사요청/판매중지/품절), 상태 전이 설명(`STATUS_TIPS`), 처분 자격 규칙
 * (`DISPOSITION_ACTIONS`), 안내 문구, 반려 사유 예시, KC·이미지의 `O`/`X` 표기,
 * 검색 대상 3종. 색 체계(b-green/b-blue/b-prog/b-done/b-exc)는 쓰지 않는다.
 * Tag tone 은 우리 규칙(`docs/screen-templates.md` §3-1)으로 다시 판정했다.
 *
 * ⚠️ **원본에 없어서 걷어낸 것 — 되살리지 말 것.**
 * 한때 상단에 요약 카드 3장(`전체 상품 1,284개` · `반려 상품 -4개` · `재심사 대기 +2건`)을
 * 증감 화살표·비교 기준 문구와 함께 두었는데, **원본 상품 목록에 그런 카드가 없다.**
 * 원본이 그 자리에 두는 것은 `StatDash` — **판매 상태별 건수**이고, 카드가 곧 상태
 * 필터다(원본 `chips[0].dash = true` 라 필터바에서 빠지고 대시가 그 역할을 가져간다).
 * 게다가 `1,284개`는 표에 8행뿐인 이 화면에서 **스스로 모순되는 숫자**였다.
 * 지금 건수는 뼈대가 실제 행에서 세므로 어긋날 수 없다.
 * ---------------------------------------------------------------------- */

/** 상품이 나가는 방식. 렌트는 보증금·기간 단가가, 판매는 판매가가 붙는다 */
export type ProductMode = "rent" | "sale";

/** 렌트 단가의 기간 단위 */
export type RentUnit = "day" | "week" | "month";

/**
 * 판매 상태 5종.
 *
 * 입점사 상품은 **승인 절차 없이 즉시 판매**로 들어온다(그냥 두는 것이 곧 승인이다).
 * 본사는 문제가 있는 상품을 골라 사유를 적어 내리고(`rejected`), 셀러가 보완해
 * 이의를 제기하면 `rereview` 로 넘어와 본사 판단을 기다린다.
 */
export type SaleStatus =
  "onSale" | "rejected" | "rereview" | "stopped" | "soldout";

/** 전시 상태 — 판매 상태와 다른 축이다. 반려하면 전시도 함께 내려간다 */
export type DisplayStatus = "shown" | "hidden";

/** KC 인증서류·등록 이미지처럼 "갖췄나 안 갖췄나" 두 값만 갖는 표시 */
export type CheckMark = "ok" | "missing";

/** 기간 조회의 대상이 되는 날짜 필드 */
export type ProductDateField = "date" | "saleStart" | "saleEnd" | "updatedAt";

/** 검색 대상 필드. 원본 `search.fieldOpts` 와 같은 3종(셀러명·상품명·상품코드) */
export type ProductSearchField = "seller" | "name" | "id";

/** 본사가 남긴 반려 사유. 셀러의 상품 관리 화면에 그대로 표시된다 */
export interface RejectRecord {
  reason: string;
  /** 처리 시각 `YYYY-MM-DD HH:mm` */
  at: string;
}

export interface Product {
  /** 상품코드 — 뼈대가 행 key 로 쓴다 */
  id: string;
  mode: ProductMode;
  /** 입점 셀러명. 본사가 직접 등록한 상품은 "본사" */
  seller: string;
  name: string;
  /** 카테고리 3단계 코드 — `CATEGORY_TREE` 의 value 와 이어진다 */
  major: string;
  middle: string;
  minor: string;
  /** 렌트 원가 — 판매 건은 `null` */
  rentBase: number | null;
  /** 렌트 할인 금액 — 판매 건은 `null` */
  rentDiscount: number | null;
  /** 렌트 단가의 기간 단위 — 판매 건은 `null` */
  rentUnit: RentUnit | null;
  /** 보증금 — 판매 건은 `null` */
  deposit: number | null;
  /** 판매 원가 — 렌트 건은 `null` */
  saleBase: number | null;
  /** 판매 할인 — 렌트 건은 `null` */
  saleDiscount: number | null;
  shipFee: number;
  returnFee: number;
  exchangeFee: number;
  kc: CheckMark;
  image: CheckMark;
  status: SaleStatus;
  display: DisplayStatus;
  /** 상품등록일 `YYYY-MM-DD HH:mm` — 기간 필터의 기본 대상 */
  date: string;
  /** 판매시작일 `YYYY-MM-DD HH:mm` */
  saleStart: string;
  /** 판매종료일 `YYYY-MM-DD HH:mm` — 빈 문자열이면 **무기한** */
  saleEnd: string;
  /** 최종수정일 `YYYY-MM-DD HH:mm` */
  updatedAt: string;
  /** 반려·재심사요청 건에만 있다 */
  reject?: RejectRecord;
}

/**
 * 유형 → 라벨·tone.
 *
 * ⚠️ 원본은 렌트=초록 · 판매=파랑으로 **색을 갈랐지만 우리는 둘 다 중립색**이다.
 * `success`/`warning` 은 상태를 뜻하는 색이라(§3-1) 분류에 쓰면 "렌트는 좋은 상태"로
 * 읽힌다. 유형은 상태가 아니라 분류이므로 글자로 구분한다.
 */
export const MODE_META: Record<ProductMode, { label: string; tone: TagTone }> =
  {
    rent: { label: "렌트", tone: "default" },
    sale: { label: "판매", tone: "default" },
  };

/**
 * 판매 상태 → 라벨·tone. 키는 `Product["status"]` 와 일치해야 한다.
 *
 * 색 배정 근거(§3-1):
 * - `onSale`  진행 중이고 정상 → `success`
 * - `rereview` **지금 본사가 판단해야 끝나는 상태** → `warning` (주의를 요하는 상태가 독점)
 * - `rejected` 본사가 내린 비정상 종료 → `critical`
 * - `stopped` 셀러 스스로 멈춘 정상 종료 → `default`
 * - `soldout` 재고 소진으로 멈춘 정상 종료 → `default`
 */
export const STATUS_META: Record<SaleStatus, { label: string; tone: TagTone }> =
  {
    onSale: { label: "판매중", tone: "success" },
    rejected: { label: "반려", tone: "critical" },
    rereview: { label: "재심사요청", tone: "warning" },
    stopped: { label: "판매중지", tone: "default" },
    soldout: { label: "품절", tone: "default" },
  };

/**
 * 상태 한 줄 설명 — **어디서 와서 어디로 가는지**를 적는다.
 *
 * 원본 어드민이 판매 상태 필터 라벨 옆 도움말(`th-help multi`)에 달아 둔 문구다.
 * 다섯 상태가 서로 어떻게 옮겨 가는지 알아야 "지금 내가 무엇을 눌러야 하는지"를
 * 판단할 수 있어서, 상태 어휘와 **한 몸**으로 둔다.
 */
export const STATUS_TIPS: Record<SaleStatus, string> = {
  onSale: "등록 즉시 판매되는 상태 — 그냥 두면 그것이 곧 승인입니다",
  rejected: "본사가 사유를 적어 판매를 내린 상품",
  rereview: "반려 건에 입점사가 이의를 제기해 본사 판단을 기다리는 상태",
  stopped: "입점사 본인이 중지한 상품",
  soldout: "재고가 없어 멈춘 상태(판매 상품에만 적용)",
};

/** 본사가 상품에 내릴 수 있는 처분 */
export type Disposition = "approve" | "reject";

/**
 * 상태별로 **가능한 처분**. 원본의 `productDispositionActions` 를 그대로 옮겼다.
 *
 * 이미 팔리고 있는 상품을 다시 "승인"하거나 이미 내려간 상품을 또 "반려"하는 것은
 * 뜻이 없는 조작이다. 그래서 상태가 곧 자격이 된다 —
 * - 반려: 되살리는 `approve` 만
 * - 재심사요청: 본사 판단 대기이므로 둘 다
 * - 판매중·품절·판매중지: 내리는 `reject` 만
 *
 * ⚠️ 원본은 이 자격을 **상태 필터 칩**(지금 어느 상태를 보고 있나)으로 정한다.
 * 서버가 `expectedStatus` 를 함께 받아 낙관적 동시성 검사를 하기 때문인데,
 * 그 결과 필터가 "전체"면 아무 버튼도 뜨지 않는다. 우리는 같은 규칙을
 * **고른 행의 상태**로 판정한다 — 규칙은 같고, 전체 목록에서도 작동한다.
 */
export const DISPOSITION_ACTIONS: Record<SaleStatus, Disposition[]> = {
  onSale: ["reject"],
  soldout: ["reject"],
  stopped: ["reject"],
  rejected: ["approve"],
  rereview: ["approve", "reject"],
};

/** 이 상품을 승인(판매중으로 되돌리기)할 수 있는가 */
export const canApprove = (product: Product) =>
  DISPOSITION_ACTIONS[product.status].includes("approve");

/** 이 상품을 반려(판매 내리기)할 수 있는가 */
export const canReject = (product: Product) =>
  DISPOSITION_ACTIONS[product.status].includes("reject");

/** 전시 상태 → 라벨·tone. 노출 중이면 정상 진행, 내려가 있으면 중립 종료 */
export const DISPLAY_META: Record<
  DisplayStatus,
  { label: string; tone: TagTone }
> = {
  shown: { label: "전시중", tone: "success" },
  hidden: { label: "전시중지", tone: "default" },
};

/**
 * KC 인증 · 등록 이미지 표기.
 *
 * ⚠️ **원본과 같은 `O`/`X` 다.** 한때 `인증`/`미인증` · `등록`/`누락` 이라는 라벨을
 * 지어내 `Tag` 로 칠했는데, 원본은 두 열을 **같은 한 컴포넌트**로 그리고 값은
 * `O` 아니면 `X` 뿐이다(`X` 만 경고색 굵은 글씨). 두 열이 묻는 것이 "갖췄나"
 * 하나뿐이라 어휘를 늘릴 이유가 없다 — 그래서 맵도 KC·이미지가 공유한다.
 *
 * `X` 쪽만 색을 주는 것은 **비대칭이 의도**이기 때문이다(§3-1 "플래그").
 * 미인증 상품 노출은 본사에 연대책임이 발생하는 사안이라 훑을 때 걸려야 한다.
 */
export const CHECK_LABEL: Record<CheckMark, string> = {
  ok: "O",
  missing: "X",
};

/**
 * 카테고리 3단계(대/중/소).
 *
 * 셀렉트 3개가 **연쇄**한다 — 대분류를 바꾸면 중·소분류 선택이 풀린다.
 * 그 계산은 뼈대가 하고, 여기서는 트리만 든다.
 */
export interface CategoryNode {
  value: string;
  label: string;
  children?: CategoryNode[];
}

export const CATEGORY_TREE: CategoryNode[] = [
  {
    value: "carseat",
    label: "카시트",
    children: [
      {
        value: "carseat-infant",
        label: "신생아 카시트",
        children: [
          { value: "carseat-infant-basket", label: "바구니형" },
          { value: "carseat-infant-swivel", label: "회전형" },
        ],
      },
      {
        value: "carseat-junior",
        label: "주니어 카시트",
        children: [{ value: "carseat-junior-booster", label: "부스터" }],
      },
    ],
  },
  {
    value: "stroller",
    label: "유모차",
    children: [
      {
        value: "stroller-deluxe",
        label: "디럭스",
        children: [{ value: "stroller-deluxe-4wheel", label: "4륜" }],
      },
      {
        value: "stroller-light",
        label: "휴대용",
        children: [{ value: "stroller-light-cabin", label: "기내반입" }],
      },
    ],
  },
  {
    value: "sleep",
    label: "수면·안전",
    children: [
      {
        value: "sleep-bed",
        label: "아기침대",
        children: [{ value: "sleep-bed-side", label: "베드사이드" }],
      },
      {
        value: "sleep-mat",
        label: "놀이매트",
        children: [{ value: "sleep-mat-folding", label: "폴딩매트" }],
      },
    ],
  },
  {
    value: "feeding",
    label: "수유·이유",
    children: [
      {
        value: "feeding-sterilizer",
        label: "젖병소독기",
        children: [{ value: "feeding-sterilizer-uv", label: "UV" }],
      },
    ],
  },
];

export const PRODUCTS: Product[] = [
  {
    id: "R-1042",
    mode: "rent",
    seller: "베이비루",
    name: "회전형 카시트 스핀 360",
    major: "carseat",
    middle: "carseat-infant",
    minor: "carseat-infant-swivel",
    rentBase: 39000,
    rentDiscount: 4000,
    rentUnit: "month",
    deposit: 120000,
    saleBase: null,
    saleDiscount: null,
    shipFee: 0,
    returnFee: 6000,
    exchangeFee: 6000,
    kc: "ok",
    image: "ok",
    status: "onSale",
    display: "shown",
    date: "2026-08-14 09:20",
    saleStart: "2026-08-15 00:00",
    saleEnd: "",
    updatedAt: "2026-08-18 11:02",
  },
  {
    id: "R-1038",
    mode: "rent",
    seller: "맘스케어",
    name: "디럭스 유모차 스톨라 프로",
    major: "stroller",
    middle: "stroller-deluxe",
    minor: "stroller-deluxe-4wheel",
    rentBase: 52000,
    rentDiscount: 7000,
    rentUnit: "month",
    deposit: 180000,
    saleBase: null,
    saleDiscount: null,
    shipFee: 0,
    returnFee: 8000,
    exchangeFee: 8000,
    kc: "ok",
    image: "missing",
    status: "rejected",
    display: "hidden",
    date: "2026-08-12 16:41",
    saleStart: "2026-08-13 00:00",
    saleEnd: "2026-12-31 23:59",
    updatedAt: "2026-08-19 10:15",
    reject: {
      reason:
        "등록 이미지 규격 미달 — 대표 이미지를 1000×1000 이상으로 다시 올려 주세요. 좌석 각도 조절부가 보이는 상세 컷도 필요합니다.",
      at: "2026-08-19 10:15",
    },
  },
  {
    id: "S-2210",
    mode: "sale",
    seller: "베이비루",
    name: "젖병소독기 UV 라이트",
    major: "feeding",
    middle: "feeding-sterilizer",
    minor: "feeding-sterilizer-uv",
    rentBase: null,
    rentDiscount: null,
    rentUnit: null,
    deposit: null,
    saleBase: 129000,
    saleDiscount: 20000,
    shipFee: 3000,
    returnFee: 3000,
    exchangeFee: 6000,
    kc: "ok",
    image: "ok",
    status: "onSale",
    display: "shown",
    date: "2026-08-11 13:05",
    saleStart: "2026-08-12 00:00",
    saleEnd: "",
    updatedAt: "2026-08-17 09:48",
  },
  {
    id: "R-1031",
    mode: "rent",
    seller: "리틀스텝",
    name: "베드사이드 아기침대 슬립온",
    major: "sleep",
    middle: "sleep-bed",
    minor: "sleep-bed-side",
    rentBase: 28000,
    rentDiscount: 0,
    rentUnit: "month",
    deposit: 90000,
    saleBase: null,
    saleDiscount: null,
    shipFee: 0,
    returnFee: 6000,
    exchangeFee: 6000,
    kc: "missing",
    image: "ok",
    status: "rereview",
    display: "hidden",
    date: "2026-08-09 10:32",
    saleStart: "2026-08-10 00:00",
    saleEnd: "2026-11-30 23:59",
    updatedAt: "2026-08-20 14:26",
    reject: {
      reason:
        "KC 인증서류 미제출 — 안전확인 신고번호와 시험성적서를 등록해 주세요.",
      at: "2026-08-16 11:40",
    },
  },
  {
    id: "S-2198",
    mode: "sale",
    seller: "본사",
    name: "폴딩 놀이매트 220 그레이",
    major: "sleep",
    middle: "sleep-mat",
    minor: "sleep-mat-folding",
    rentBase: null,
    rentDiscount: null,
    rentUnit: null,
    deposit: null,
    saleBase: 189000,
    saleDiscount: 30000,
    shipFee: 0,
    returnFee: 12000,
    exchangeFee: 12000,
    kc: "ok",
    image: "ok",
    status: "soldout",
    display: "shown",
    date: "2026-08-06 15:12",
    saleStart: "2026-08-07 00:00",
    saleEnd: "",
    updatedAt: "2026-08-18 17:33",
  },
  {
    id: "S-2185",
    mode: "sale",
    seller: "맘스케어",
    name: "기내반입 휴대용 유모차 라이트",
    major: "stroller",
    middle: "stroller-light",
    minor: "stroller-light-cabin",
    rentBase: null,
    rentDiscount: null,
    rentUnit: null,
    deposit: null,
    saleBase: 249000,
    saleDiscount: 0,
    shipFee: 0,
    returnFee: 8000,
    exchangeFee: 8000,
    kc: "ok",
    image: "ok",
    status: "stopped",
    display: "hidden",
    date: "2026-08-03 11:58",
    saleStart: "2026-08-04 00:00",
    saleEnd: "2026-09-30 23:59",
    updatedAt: "2026-08-15 12:07",
  },
  {
    id: "R-1019",
    mode: "rent",
    seller: "아이랑",
    name: "바구니형 카시트 코지",
    major: "carseat",
    middle: "carseat-infant",
    minor: "carseat-infant-basket",
    rentBase: 24000,
    rentDiscount: 2000,
    rentUnit: "week",
    deposit: 80000,
    saleBase: null,
    saleDiscount: null,
    shipFee: 0,
    returnFee: 6000,
    exchangeFee: 6000,
    kc: "ok",
    image: "ok",
    status: "onSale",
    display: "shown",
    date: "2026-07-29 09:04",
    saleStart: "2026-07-30 00:00",
    saleEnd: "",
    updatedAt: "2026-08-10 08:51",
  },
  {
    id: "S-2170",
    mode: "sale",
    seller: "리틀스텝",
    name: "부스터 주니어 카시트 그로우",
    major: "carseat",
    middle: "carseat-junior",
    minor: "carseat-junior-booster",
    rentBase: null,
    rentDiscount: null,
    rentUnit: null,
    deposit: null,
    saleBase: 98000,
    saleDiscount: 8000,
    shipFee: 3000,
    returnFee: 3000,
    exchangeFee: 6000,
    kc: "ok",
    image: "ok",
    status: "onSale",
    display: "shown",
    date: "2026-07-24 14:22",
    saleStart: "2026-07-25 00:00",
    saleEnd: "",
    updatedAt: "2026-08-05 16:19",
  },
];

/**
 * 상태별 건수 대시의 단위 (원본 `dashUnit: "개"`).
 * 상품은 "건"이 아니라 "개"로 센다 — 주문 화면과 단위가 다른 것이 맞다.
 */
export const DASH_UNIT = "개";

/**
 * 판매 상태 필터 = **상태별 건수 대시의 카드 목록**. 첫 항목은 반드시 `"all"`(필터 해제).
 *
 * 원본은 이 축을 필터바의 칩이 아니라 `StatDash` 로 낸다(`chips[0].dash = true` 라
 * 필터바 렌더에서 건너뛰고 대시가 그 역할을 가져간다). 그래서 **카드를 누르는 것이
 * 곧 상태 필터**다 — 같은 축을 두 군데 두면 어느 쪽이 진짜인지 알 수 없다.
 *
 * 건수는 여기 두지 않는다. 뼈대가 **지금 보이는 행에서 직접 세므로** 표와 어긋날 수 없다.
 */
export const FILTERS = [
  { value: "all", label: "전체" },
  { value: "onSale", label: "판매중" },
  { value: "rejected", label: "반려" },
  { value: "rereview", label: "재심사요청" },
  { value: "stopped", label: "판매중지" },
  { value: "soldout", label: "품절" },
];

/** 유형 라디오 필터. 첫 항목은 `"all"` */
export const MODE_FILTERS = [
  { value: "all", label: "전체" },
  { value: "rent", label: "렌트" },
  { value: "sale", label: "판매" },
];

/**
 * 전시 상태 필터. 첫 항목은 `"all"`.
 *
 * **판매 상태와 다른 축이다** — 판매중이어도 전시를 내려 둘 수 있고, 반려하면
 * 전시가 함께 내려간다. 표에 전시 상태 열이 있으므로 거를 수단도 있어야 한다.
 */
export const DISPLAY_FILTERS = [
  { value: "all", label: "전시 상태 전체" },
  { value: "shown", label: "전시중" },
  { value: "hidden", label: "전시중지" },
];

/**
 * 카테고리 셀렉트 3개의 "전체" 항목 라벨.
 * 값은 셋 다 `"all"` 이고 라벨만 단계마다 다르다 — 어느 셀렉트를 풀었는지 보이게.
 */
export const CATEGORY_ALL_LABEL = {
  major: "카테고리 전체",
  middle: "중분류 전체",
  minor: "소분류 전체",
};

/** 기간 조회 대상 날짜. `value` 가 곧 행 타입의 필드 이름이다 */
export const DATE_FIELDS: { value: ProductDateField; label: string }[] = [
  { value: "date", label: "상품등록일" },
  { value: "saleStart", label: "판매시작일" },
  { value: "saleEnd", label: "판매종료일" },
  { value: "updatedAt", label: "최종수정일" },
];

/**
 * 검색 대상. `value` 가 곧 행 타입의 필드 이름이다 (원본 `search.fieldOpts` 그대로).
 *
 * ⚠️ **한 번에 하나만 검색한다.** 세 필드를 동시에 훑으면 "맘스케어"가 셀러명에서
 * 걸린 것인지 상품명에 들어간 것인지 구별되지 않는다 — 원본이 셀렉트를 둔 이유다.
 */
export const SEARCH_FIELDS: { value: ProductSearchField; label: string }[] = [
  { value: "seller", label: "셀러명" },
  { value: "name", label: "상품명" },
  { value: "id", label: "상품코드" },
];

/** 검색어 입력 placeholder (원본 `ph`) */
export const SEARCH_PLACEHOLDER = "검색어 입력";

/** 렌트 단가의 기간 단위 표기 */
export const RENT_UNIT_LABEL: Record<RentUnit, string> = {
  day: "일",
  week: "주",
  month: "월",
};

/** 표의 금액 포맷. 단위가 도메인이라 여기 둔다 (원 · 개 · 건) */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/**
 * 상품등록일·최종수정일 표기 — 원본 어드민의 포맷터를 그대로 옮겼다:
 * `e.slice(0, 16).replace(/-/g, ".").replace("T", " ")`
 *
 * **분까지** 낸다(초는 자른다). 날짜만으로는 같은 날 안에서 순서를 알 수 없다.
 * 구분자가 점인 것도 원본 규칙이다 — 이 저장소의 모든 화면이 `2026.08.18` 로 쓴다.
 * 표기는 도메인이라 여기 둔다(`won` 과 같은 이유).
 */
export const ymdhm = (dateText: string | null) =>
  dateText ? dateText.slice(0, 16).replace(/-/g, ".").replace("T", " ") : "-";

/**
 * 실제 청구되는 렌트가 = 렌트 원가 − 할인 금액 (음수 방지).
 * **파생값은 뼈대가 아니라 데이터가 계산한다** — 표와 미리보기가 같은 숫자를 써야 한다.
 */
export const rentPriceOf = (product: Product) =>
  Math.max(0, (product.rentBase ?? 0) - (product.rentDiscount ?? 0));

/** 실제 청구되는 판매가 = 판매 원가 − 판매 할인 (음수 방지) */
export const salePriceOf = (product: Product) =>
  Math.max(0, (product.saleBase ?? 0) - (product.saleDiscount ?? 0));

/** "35,000원/월" · 판매 건이면 "-" 자리를 뼈대가 채우므로 여기서는 렌트만 다룬다 */
export const rentPriceText = (product: Product) =>
  won(rentPriceOf(product)) +
  "/" +
  (product.rentUnit ? RENT_UNIT_LABEL[product.rentUnit] : "");

/** 유형에 따라 대표 가격 한 줄. 미리보기·모달이 공유한다 */
export const priceText = (product: Product) =>
  product.mode === "rent" ? rentPriceText(product) : won(salePriceOf(product));

/**
 * 표의 카테고리 열에 찍히는 이름 — **소분류 하나**다.
 *
 * ⚠️ 한때 `카시트 > 신생아 카시트 > 회전형` 처럼 3단 경로를 이어 붙였는데,
 * 원본은 `categoryName` **한 이름**만 찍는다(가운데 정렬 열이다). 계층은 필터의
 * 셀렉트 3개가 이미 보여 주므로, 모든 행에서 상위 두 단계를 반복하면
 * 22열짜리 표에서 폭만 먹고 읽히지 않는다.
 */
export const categoryNameOf = (product: Product) => {
  const major = CATEGORY_TREE.find((node) => node.value === product.major);
  const middle = major?.children?.find((node) => node.value === product.middle);
  const minor = middle?.children?.find((node) => node.value === product.minor);
  return minor?.label ?? middle?.label ?? major?.label ?? "";
};

/**
 * 한 페이지에 보여줄 행 수.
 * 실서비스는 10·20·50·100 이지만 **샘플이 8건뿐이라 페이징 동작이 보이도록** 작게 잡았다.
 */
export const PAGE_SIZE = 4;

/**
 * 화면 상단 **상시 안내 배너**(원본 `data-area="products.note"`).
 *
 * ⚠️ 이 문구를 도움말 툴팁으로 접지 말 것. 원본이 배너로 둔 이유는 마지막 줄
 * (연대책임) 때문이다 — 호버해야 보이는 자리에 두면 **읽지 않은 채로 미인증
 * 상품을 노출시킬 수 있다.** 세 줄로 나눈 것은 무게를 다르게 주기 위해서다.
 */
export const NOTICE_TITLE =
  "입점사가 등록한 상품은 승인 절차 없이 즉시 판매됩니다";
export const NOTICE_BODY =
  "그냥 두면 그것이 곧 승인입니다. 문제가 있으면 상품을 골라 [반려 처리]로 사유를 남겨 주세요 — 사유는 입점사 상품 관리에 그대로 표시되고, 입점사는 보완 후 재심사를 요청합니다.";
export const NOTICE_WARNING = "미인증 상품이 노출되면 연대책임이 발생합니다.";

/** 판매 상태 필터 옆 도움말의 제목 */
export const STATUS_HELP_TITLE = "판매 상태 안내";

/**
 * 처분 결과 문구.
 *
 * 원본이 `${updated}건 처리 · ${skipped}건 제외` 로 **처리한 수와 제외한 수를 함께**
 * 알린다. 고른 행 중 자격이 없는 건(이미 반려된 상품을 또 반려하려는 등)은 조용히
 * 빠지는데, 그 사실을 숨기면 "4건 골랐는데 3건만 바뀐" 이유를 알 수 없다.
 */
export const approveMessage = (done: number, skipped: number) =>
  `${done}개 상품을 승인 처리했습니다 — 판매중으로 되돌렸습니다` +
  (skipped > 0 ? ` · ${skipped}개 제외(승인 대상이 아닌 건)` : "");

export const rejectMessage = (done: number, skipped: number) =>
  `${done}개 상품을 반려 처리했습니다 — 판매 상태를 «반려»로 내렸습니다` +
  (skipped > 0 ? ` · ${skipped}개 제외(반려 대상이 아닌 건)` : "");

/** 반려 사유 입력 모달의 안내 문구 */
export const REJECT_NOTICE =
  "입력한 사유는 입점사 상품 관리에 그대로 표시됩니다. 반려하면 판매 상태가 [반려]가 되고 전시도 함께 내려갑니다.";

/** 반려 사유 입력 placeholder — 실제로 자주 쓰이는 사유를 예시로 든다 */
export const REJECT_PLACEHOLDER =
  "반려 사유를 입력하세요 (예: KC 인증서류 미제출, 등록 이미지 규격 미달, 성분·재질 표기 누락 등)";

/** 사유 없이 반려하면 셀러가 무엇을 고쳐야 할지 알 수 없다 */
export const REJECT_ERROR = "반려 사유를 입력해 주세요.";

/** 반려 사유 보기 모달에서 사유가 비어 있을 때 */
export const REJECT_EMPTY = "등록된 반려 사유가 없습니다.";

/** 재심사요청 건에만 덧붙는 꼬리말 */
export const REREVIEW_NOTE = "셀러가 재심사를 요청한 건입니다.";

/** 빈 상태 문구 */
export const EMPTY_TITLE = "해당 조건의 상품이 없습니다";
export const EMPTY_DESCRIPTION =
  "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.";
