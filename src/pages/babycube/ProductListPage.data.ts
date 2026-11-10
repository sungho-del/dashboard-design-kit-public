import type { TagTone } from "../../components/ui";
import { CATEGORIES, type Category } from "./CategoryListPage.data";

/* -------------------------------------------------------------------------
 * 상품 관리 (S05) — 목록형 화면의 **도메인 층**
 *
 * 짝이 되는 뼈대: `ProductListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 *
 * ## 이 화면이 다른 목록과 다른 점
 * 컬럼이 **23개**(선택 + 22)라 가로 스크롤이 전제다. 렌트 상품과 판매 상품이
 * 한 표에 섞여 있고, **열의 의미가 유형마다 다르다** — 렌트 건은 판매 원가·판매가가
 * 비어 있고 판매 건은 렌트 원가·보증금이 비어 있다. 그래서 유형 필터가 상태 필터만큼
 * 중요하다. 카테고리 트리도 유형마다 따로다(카테고리 관리 화면의 `CATEGORIES`).
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `id`(상품코드 = 고유 키) · `date`(`YYYY-MM-DD HH:mm:ss`) 를 반드시 갖는다.
 *   ⚠️ 이 화면의 `date` 는 **상품등록일**이다. 기간 조회 대상이 4개(등록·판매시작·
 *   판매종료·최종수정)라 나머지는 `saleStart`·`saleEnd`·`updatedAt` 로 따로 들고,
 *   `DATE_FIELDS` 가 "어느 날짜로 조회할지"를 고른다
 * - 뼈대는 `LISTED_PRODUCTS` 만 읽는다 — **본사 직영 상품은 이 화면에 없다**(원본
 *   `SCREENS.products` 의 `base`). 상태 건수·조회·선택·엑셀·일괄 처리가 모두 이 집합 위에서 돈다.
 *   셀러가 저장만 한 초안(임시저장)은 데이터에 애초에 들어오지 않는다고 본다
 * - `STATUS_META` 의 키는 `Product["status"]` 와 정확히 일치한다
 * - `MODE_FILTERS[0].value` 는 `"all"` (뼈대가 필터 해제로 취급)
 * - `FILTERS` 는 툴바 세그먼트가 아니라 **상태별 건수 대시**의 카드 목록이다(아래)
 * - 파생 금액(렌트가·판매가)은 뼈대가 아니라 이 파일에서 계산한다
 *
 * ## 원본 어드민에서 가져온 것 / 버린 것
 * 가져온 것은 **도메인뿐**이다 — 컬럼명·컬럼 순서·고정열 범위, 상태 어휘(판매중/반려/
 * 재심사요청/판매중지/품절), 상태 설명(`STATUS_META.description` — 자리 = v0.4 `STAT_TIP` · 문구 = 부록 A C61~C65),
 * 처분 자격 규칙(`DISPOSITION_ACTIONS`), 안내·모달·알림 문구, KC·이미지의 `O`/`△`/`X`,
 * 상품코드 형식(영문 2 + 숫자 6), 검색 대상 3종. 색 체계(b-green/b-blue/b-prog/b-done/b-exc)는
 * 쓰지 않는다. Tag tone 은 우리 규칙(`docs/screen-templates.md` §3-1)으로 다시 판정했다.
 *
 * ⚠️ **원본에 없어서 걷어낸 것 — 되살리지 말 것.**
 * 한때 상단에 요약 카드 3장(`전체 상품 1,284개` · `반려 상품 -4개` · `재심사 대기 +2건`)을
 * 증감 화살표·비교 기준 문구와 함께 두었는데, **원본 상품 목록에 그런 카드가 없다.**
 * 원본이 그 자리에 두는 것은 `StatDash` — **판매 상태별 건수**이고, 카드가 곧 상태
 * 필터다(원본 `chips[0].dash = true` 라 필터바에서 빠지고 대시가 그 역할을 가져간다).
 * 지금 건수는 뼈대가 실제 행에서 세므로 어긋날 수 없다.
 * ---------------------------------------------------------------------- */

/** 상품이 나가는 방식. 렌트는 보증금·기간 단가가, 판매는 판매가가 붙는다 */
export type ProductMode = "rent" | "sale";

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

/** KC 인증서류·등록 이미지 — 제출 / 보완 필요 / 미제출 (원본 `_mark` 의 O·△·X) */
export type CheckMark = "ok" | "partial" | "missing";

/** 기간 조회의 대상이 되는 날짜 필드 */
export type ProductDateField = "date" | "saleStart" | "saleEnd" | "updatedAt";

/** 검색 대상 필드. 원본 `search.fieldOpts` 와 같은 3종(셀러명·상품명·상품코드) */
export type ProductSearchField = "seller" | "name" | "id";

/** 본사가 남긴 반려 사유. 셀러의 상품 관리 화면에 그대로 표시된다 */
export interface RejectRecord {
  reason: string;
  /** 처리 시각 `YYYY-MM-DD HH:mm:ss` */
  at: string;
}

export interface Product {
  /** 상품코드(영문 2 + 숫자 6) — 뼈대가 행 key 로 쓴다 */
  id: string;
  mode: ProductMode;
  /**
   * 누가 등록했나. **본사 직영(`hq`)은 이 화면에 나오지 않는다**(`LISTED_PRODUCTS`).
   * 셀러명 글자("본사")로 가르지 않는다 — 이름은 바뀔 수 있고 출처는 바뀌지 않는다.
   */
  source: "seller" | "hq";
  /** 입점 셀러명 */
  seller: string;
  name: string;
  /** 소분류 카테고리 코드 — `CATEGORIES`(카테고리 관리)의 `id`. 대·중분류는 거기서 따라 올라간다 */
  category: string;
  /**
   * 렌트 원가 **원/일** — 판매 건은 `null`.
   * 렌트 단위는 **일 고정**이다(원본 v0.4 「렌트 단위 드롭다운 폐지 → 일 단위 고정」).
   * 한때 주·월 단가가 섞여 있었는데, 상세의 「렌트가 × 기본 렌트일」 계산이 일 단가를 전제한다.
   */
  rentBase: number | null;
  /** 렌트 할인 금액 — 판매 건은 `null` */
  rentDiscount: number | null;
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
  /** 상품등록일 `YYYY-MM-DD HH:mm:ss` — 기간 필터의 기본 대상 */
  date: string;
  /** 판매시작일 `YYYY-MM-DD HH:mm:ss` */
  saleStart: string;
  /** 판매종료일 `YYYY-MM-DD HH:mm:ss` — 빈 문자열이면 **무기한** */
  saleEnd: string;
  /** 최종수정일 `YYYY-MM-DD HH:mm:ss` */
  updatedAt: string;
  /** 반려·재심사요청 건에 있다(사유 없이 내려간 옛 건은 없을 수 있다) */
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
 * 판매 상태 → 라벨·tone·설명. 키는 `Product["status"]` 와 일치해야 한다.
 *
 * 색 배정 근거(§3-1):
 * - `onSale`  진행 중이고 정상 → `success`
 * - `rereview` **지금 본사가 판단해야 끝나는 상태** → `warning` (주의를 요하는 상태가 독점)
 * - `rejected` 본사가 내린 비정상 종료 → `critical`
 * - `stopped` 셀러 스스로 멈춘 정상 종료 → `default`
 * - `soldout` 재고 소진으로 멈춘 정상 종료 → `default`
 *
 * `description` 은 상태 카드 툴팁이다 — 다섯 상태 모두 부록 A C61~C65 바꿈 문구(다음 단계 한 문장 · 판정 Q10 「셀러」)다.
 * 다섯 상태가 서로 어떻게 옮겨 가는지 알아야 "지금 무엇을 눌러야 하는지" 판단할 수 있다.
 */
export const STATUS_META: Record<
  SaleStatus,
  { label: string; tone: TagTone; description: string }
> = {
  onSale: {
    label: "판매중",
    tone: "success",
    description: "재고가 0이 되면 품절, [반려 처리]하면 반려가 됩니다.",
  },
  rejected: {
    label: "반려",
    tone: "critical",
    description: "셀러가 재심사를 요청하면 재심사요청으로 바뀝니다.",
  },
  rereview: {
    label: "재심사요청",
    tone: "warning",
    description: "[승인 처리]하면 판매중, [반려 처리]하면 반려가 됩니다.",
  },
  stopped: {
    label: "판매중지",
    tone: "default",
    description: "셀러가 판매를 다시 시작하면 판매중이 됩니다.",
  },
  soldout: {
    label: "품절",
    tone: "default",
    description: "재고를 채우면 판매중으로 돌아갑니다.",
  },
};

/** 본사가 상품에 내릴 수 있는 처분 */
export type Disposition = "approve" | "reject";

/**
 * 상태별로 **가능한 처분**. 원본의 `productDispositionActions`(`list.bulk.by`)를 그대로 옮겼다.
 *
 * 이미 팔리고 있는 상품을 다시 "승인"하거나 이미 내려간 상품을 또 "반려"하는 것은
 * 뜻이 없는 조작이다. 그래서 상태가 곧 자격이 된다 —
 * - 반려: 되살리는 `approve` 만
 * - 재심사요청: 본사 판단 대기이므로 둘 다
 * - 판매중·품절·판매중지: 내리는 `reject` 만 (판매중지는 셀러 자율이라 본사가 풀 수 없다)
 *
 * 원본은 이 자격을 **지금 고른 상태 카드**로 정한다. 우리는 **고른 행의 상태**로 판정하는데,
 * 상태 카드를 바꾸면 선택이 풀리므로(뼈대) 고른 행은 늘 지금 카드의 상태다 — 결과가 같다.
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

/** 반려 사유를 열어 볼 수 있는 상태 — 원본은 이 둘의 상태 태그에 밑줄을 긋는다 */
export const hasRejectReason = (product: Product) =>
  product.status === "rejected" || product.status === "rereview";

/** 전시 상태 → 라벨·tone. 노출 중이면 정상 진행, 내려가 있으면 중립 종료 */
export const DISPLAY_META: Record<
  DisplayStatus,
  { label: string; tone: TagTone }
> = {
  shown: { label: "전시중", tone: "success" },
  hidden: { label: "전시중지", tone: "default" },
};

/**
 * KC 인증 · 등록 이미지 표기 — 원본 `_mark` 그대로 `O`(제출) / `△`(보완 필요) / `X`(미제출).
 *
 * 두 열이 묻는 것은 "자료를 갖췄나" 하나라 맵을 공유한다. 배지가 아니라 글자인 것도
 * 원본과 같다 — 상태가 아니라 자료 유무다. 색은 **`X` 쪽만** 준다(비대칭이 의도, §3-1
 * "플래그"). 미인증 상품 노출은 본사에 연대책임이 발생하는 사안이라 훑을 때 걸려야 한다.
 */
export const CHECK_LABEL: Record<CheckMark, string> = {
  ok: "O",
  partial: "△",
  missing: "X",
};

/* -------------------------------------------------------------------------
 * 카테고리 — **유형마다 트리가 따로다** (원본 `RENT_CATTREE` · `SALE_CATTREE`)
 *
 * 트리는 카테고리 관리 화면(`CategoryListPage.data.ts`)의 `CATEGORIES` 를 그대로 읽는다.
 * 따로 두면 같은 분류가 두 화면에서 다른 이름이 된다.
 * ---------------------------------------------------------------------- */

/** 셀렉트 3개가 **연쇄**하는 트리 노드. 그 계산은 뼈대가 하고, 여기서는 트리만 든다 */
export interface CategoryNode {
  value: string;
  label: string;
  children?: CategoryNode[];
}

const nodesUnder = (domain: ProductMode, parentId: string | null) =>
  CATEGORIES.filter(
    (category) => category.domain === domain && category.parentId === parentId,
  ).map((category): CategoryNode => ({
    value: category.id,
    label: category.name,
    children: nodesUnder(domain, category.id),
  }));

export const CATEGORY_TREES: Record<ProductMode, CategoryNode[]> = {
  rent: nodesUnder("rent", null),
  sale: nodesUnder("sale", null),
};

const categoryById = (id: string): Category | undefined =>
  CATEGORIES.find((category) => category.id === id);

/** 소분류 코드 → [대, 중, 소] 코드. 필터가 어느 단계를 골라도 이 경로에 들었는지만 보면 된다 */
export const categoryPathOf = (product: Product): string[] => {
  const path: string[] = [];
  let current = categoryById(product.category);
  while (current) {
    path.unshift(current.id);
    current = current.parentId ? categoryById(current.parentId) : undefined;
  }
  return path;
};

/**
 * 표의 카테고리 열에 찍히는 이름 — **소분류 하나**다.
 * 원본은 `categoryName` 한 이름만 찍는다. 계층은 필터의 셀렉트 3개가 이미 보여 준다.
 */
export const categoryNameOf = (product: Product) =>
  categoryById(product.category)?.name ?? "";

/**
 * 유형을 고르기 전 카테고리 셀렉트의 안내 — 원본 `catSelectHint` 「유형에서 렌트 또는 판매 먼저 선택」을
 * **잠긴 셀렉트 안에** 들어가게 줄였다(144px). 옆에 따로 두면 줄바꿈 뒤 다른 칸의 설명으로 읽힌다.
 */
export const CATEGORY_HINT = "유형 먼저 선택";

/* -------------------------------------------------------------------------
 * 샘플
 * ---------------------------------------------------------------------- */

/** 반려 사유·이미지·재심사 같은 **상세 사례**를 갖춘 9건 (2건은 본사 직영 판매·렌트 — 화면에서 빠진다) */
const DETAILED: Product[] = [
  {
    id: "BL240814",
    mode: "rent",
    source: "seller",
    seller: "베이비루",
    name: "회전형 카시트 스핀 360",
    category: "carseat-infant-swivel",
    rentBase: 1500,
    rentDiscount: 200,
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
    date: "2026-08-14 09:20:13",
    saleStart: "2026-08-15 00:00:00",
    saleEnd: "",
    updatedAt: "2026-08-18 11:02:47",
  },
  {
    id: "MC240812",
    mode: "rent",
    source: "seller",
    seller: "맘스케어",
    name: "디럭스 유모차 스톨라 프로",
    category: "stroller-deluxe-4wheel",
    rentBase: 2200,
    rentDiscount: 300,
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
    date: "2026-08-12 16:41:05",
    saleStart: "2026-08-13 00:00:00",
    saleEnd: "2026-12-31 23:59:59",
    updatedAt: "2026-08-19 10:15:32",
    reject: {
      reason:
        "등록 이미지 규격 미달 — 대표 이미지를 1000×1000 이상으로 다시 올려 주세요. 좌석 각도 조절부가 보이는 상세 컷도 필요합니다.",
      at: "2026-08-19 10:15:32",
    },
  },
  {
    id: "BL240811",
    mode: "sale",
    source: "seller",
    seller: "베이비루",
    name: "젖병소독기 UV 라이트",
    category: "sale-feeding-sterilizer-uv",
    rentBase: null,
    rentDiscount: null,
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
    date: "2026-08-11 13:05:41",
    saleStart: "2026-08-12 00:00:00",
    saleEnd: "",
    updatedAt: "2026-08-17 09:48:20",
  },
  {
    id: "LS240809",
    mode: "rent",
    source: "seller",
    seller: "리틀스텝",
    name: "베드사이드 아기침대 슬립온",
    category: "sleep-bed-side",
    rentBase: 1200,
    rentDiscount: 0,
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
    date: "2026-08-09 10:32:18",
    saleStart: "2026-08-10 00:00:00",
    saleEnd: "2026-11-30 23:59:59",
    updatedAt: "2026-08-20 14:26:09",
    reject: {
      reason:
        "KC 인증서류 미제출 — 안전확인 신고번호와 시험성적서를 등록해 주세요.",
      at: "2026-08-16 11:40:52",
    },
  },
  {
    /* 본사 직영 — 원본처럼 이 화면에는 나오지 않는다(`LISTED_PRODUCTS` 가 거른다) */
    id: "HQ240806",
    mode: "sale",
    source: "hq",
    seller: "본사",
    name: "폴딩 놀이매트 220 그레이",
    category: "sale-sleep-mat-folding",
    rentBase: null,
    rentDiscount: null,
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
    date: "2026-08-06 15:12:36",
    saleStart: "2026-08-07 00:00:00",
    saleEnd: "",
    updatedAt: "2026-08-18 17:33:04",
  },
  {
    /* 본사 직영 렌트 — 원본에도 자체 렌트가 있다(보증금 「자체」·주문 「본사」 렌트가 0건이 아니게).
       셀러 상세 「베이비크루저」 등록 상품의 PR270901 과 같은 상품이다(코드·이름·등록일) */
    id: "PR270901",
    mode: "rent",
    source: "hq",
    seller: "본사",
    name: "본사 기획 사계절 아기 침낭 세트",
    category: "sleep-bed-side",
    rentBase: 900,
    rentDiscount: 0,
    deposit: 50000,
    saleBase: null,
    saleDiscount: null,
    shipFee: 0,
    returnFee: 6000,
    exchangeFee: 6000,
    kc: "ok",
    image: "ok",
    status: "onSale",
    display: "shown",
    date: "2026-05-22 11:37:08",
    saleStart: "2026-05-23 00:00:00",
    saleEnd: "",
    updatedAt: "2026-05-22 11:37:08",
  },
  /* 본사 직영 판매 2건 — 셀러 상세 「베이비크루저」 등록 상품의 NR270900·QR270902 와 같은 상품이다(코드·이름·등록일·상태).
     상품코드를 누르면 직영 상품 상세가 열려야 해서 두 데이터를 맞췄다(디자인 §3 #3) */
  {
    id: "NR270900",
    mode: "sale",
    source: "hq",
    seller: "본사",
    name: "베이비큐브 시그니처 원목 아기침대",
    category: "sale-sleep",
    rentBase: null,
    rentDiscount: null,
    deposit: null,
    saleBase: 459000,
    saleDiscount: 30000,
    shipFee: 0,
    returnFee: 30000,
    exchangeFee: 60000,
    kc: "ok",
    image: "ok",
    status: "onSale",
    display: "shown",
    date: "2026-05-10 09:14:22",
    saleStart: "2026-05-11 00:00:00",
    saleEnd: "",
    updatedAt: "2026-06-18 16:02:41",
  },
  {
    id: "QR270902",
    mode: "sale",
    source: "hq",
    seller: "본사",
    name: "베이비큐브 프리미엄 모유저장팩 세트",
    category: "sale-formula",
    rentBase: null,
    rentDiscount: null,
    deposit: null,
    saleBase: 24000,
    saleDiscount: 0,
    shipFee: 3000,
    returnFee: 3000,
    exchangeFee: 6000,
    kc: "ok",
    image: "ok",
    status: "soldout",
    display: "hidden",
    date: "2026-06-05 14:50:13",
    saleStart: "2026-06-06 00:00:00",
    saleEnd: "",
    updatedAt: "2026-06-20 10:25:59",
  },
  {
    id: "MC240803",
    mode: "sale",
    source: "seller",
    seller: "맘스케어",
    name: "기내반입 휴대용 유모차 라이트",
    category: "sale-stroller-light-cabin",
    rentBase: null,
    rentDiscount: null,
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
    date: "2026-08-03 11:58:27",
    saleStart: "2026-08-04 00:00:00",
    saleEnd: "2026-09-30 23:59:59",
    updatedAt: "2026-08-15 12:07:51",
  },
  {
    id: "AR240729",
    mode: "rent",
    source: "seller",
    seller: "아이랑",
    name: "바구니형 카시트 코지",
    category: "carseat-infant-basket",
    rentBase: 1300,
    rentDiscount: 100,
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
    date: "2026-07-29 09:04:55",
    saleStart: "2026-07-30 00:00:00",
    saleEnd: "",
    updatedAt: "2026-08-10 08:51:14",
  },
  {
    id: "LS240724",
    mode: "sale",
    source: "seller",
    seller: "리틀스텝",
    name: "부스터 주니어 카시트 그로우",
    category: "sale-carseat-junior-booster",
    rentBase: null,
    rentDiscount: null,
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
    date: "2026-07-24 14:22:09",
    saleStart: "2026-07-25 00:00:00",
    saleEnd: "",
    updatedAt: "2026-08-05 16:19:38",
  },
];

/*
 * 간이 샘플 23건 — 판매중이 10건을 넘어 **페이지 넘김이 보이도록** 채운다.
 * 한 줄 = 한 상품, `|` 로 나눈 칸:
 *   상품코드 | 유형 | 셀러 | 상품명 | 소분류 | 원가(렌트는 원/일) | 할인 | 보증금 |
 *   배송비 | 반품배송비 | 교환배송비 | KC | 이미지 | 판매 상태 | 전시 | 등록일 | 수정일 |
 *   반려 사유 | 반려일
 * 판매 건은 보증금이 비고, 원가·할인이 판매 원가·판매 할인이 된다.
 * 판매기간은 **시작 = 등록일 · 종료 무기한**으로 단순화했다.
 */
const BRIEF_ROWS = [
  "GJ811204|rent|리틀베이비|휴대용 유모차 에어 라이트|stroller-light-cabin|1400|100|100000|0|6000|6000|O|O|onSale|shown|2026-08-20 10:14:22|2026-08-21 09:30:11",
  "KB820417|sale|코지베이비|UV 젖병소독기 미니|sale-feeding-sterilizer-uv|69000|5000||3000|3000|6000|O|△|onSale|shown|2026-08-19 15:02:48|2026-08-20 11:12:05",
  "AS730125|rent|아기별상사|신생아 바구니 카시트 클라우드|carseat-infant-basket|1200|0|85000|0|6000|6000|△|O|onSale|shown|2026-08-18 09:41:10|2026-08-18 09:41:10",
  "BH612093|sale|베베하우스|폴딩 놀이매트 사계절 대형 (240×140, 양면 방수, 층간소음 완화형)|sale-sleep-mat-folding|159000|20000||0|12000|12000|O|O|onSale|shown|2026-08-17 14:25:37|2026-08-19 16:40:02",
  "LB905531|rent|리틀베이비|주니어 부스터 카시트 세이프|carseat-junior-booster|900|100|60000|0|6000|6000|O|O|onSale|shown|2026-08-16 11:08:54|2026-08-17 10:00:31",
  "MC447210|rent|맘스케어|롤매트 소프트 220|sleep-mat-roll|700|0|40000|0|6000|6000|O|X|onSale|shown|2026-08-15 17:33:19|2026-08-16 08:22:47",
  "KB119374|rent|코지베이비|휴대용 유모차 스냅|stroller-light-cabin|1300|100|90000|0|6000|6000|X|△|rejected|hidden|2026-08-14 10:03:27|2026-08-18 15:20:00",
  "KB338806|rent|코지베이비|디럭스 유모차 오로라|stroller-deluxe-4wheel|2000|200|160000|0|8000|8000|O|O|onSale|hidden|2026-08-13 13:47:02|2026-08-15 12:05:58",
  "AR408861|sale|아이랑|폴딩매트 키즈 플레이|sale-sleep-mat-folding|129000|10000||0|12000|12000|△|O|rereview|hidden|2026-08-11 13:15:44|2026-08-20 17:42:09|성분·재질 표기 누락 — 매트 소재(PE·TPU)와 두께를 상세 설명에 적어 주세요.|2026-08-15 10:30:12",
  "AR271948|sale|아이랑|부스터 시트 그로우 미니|sale-carseat-junior-booster|79000|0||3000|3000|6000|O|O|onSale|shown|2026-08-10 10:20:41|2026-08-11 09:12:30",
  "BL560372|rent|베이비루|UV 소독기 렌탈 플러스|feeding-sterilizer-uv|600|100|30000|0|4000|4000|O|O|onSale|shown|2026-08-08 16:55:13|2026-08-10 14:31:09",
  "KB781520|sale|코지베이비|폴딩 놀이매트 슬림|sale-sleep-mat-folding|139000|10000||0|12000|12000|O|O|soldout|shown|2026-08-07 10:28:31|2026-08-19 08:15:44",
  "LS184620|rent|리틀스텝|회전형 카시트 360 프라임|carseat-infant-swivel|1600|200|130000|0|6000|6000|O|△|onSale|shown|2026-08-05 09:12:36|2026-08-07 18:02:44",
  "AS902715|sale|아기별상사|기내반입 유모차 포켓|sale-stroller-light-cabin|219000|19000||0|8000|8000|O|O|onSale|shown|2026-08-02 14:48:27|2026-08-04 10:19:55",
  "GJ994106|sale|리틀베이비|휴대용 유모차 미니 폴드|sale-stroller-light-cabin|189000|9000||0|8000|8000|O|O|soldout|shown|2026-07-31 15:12:09|2026-08-16 12:58:27",
  "BH731058|rent|베베하우스|베드사이드 침대 코모|sleep-bed-side|1100|0|80000|0|6000|6000|O|O|onSale|shown|2026-07-30 11:26:03|2026-08-01 13:44:21",
  "GJ650283|sale|리틀베이비|젖병소독기 스팀 클린|sale-feeding-sterilizer-uv|99000|10000||3000|3000|6000|O|O|onSale|shown|2026-07-27 15:37:50|2026-07-29 09:05:16",
  "BL377415|rent|베이비루|아기침대 슬립 베이직|sleep-bed-side|1000|0|70000|0|6000|6000|O|O|stopped|hidden|2026-07-25 10:44:08|2026-08-02 09:00:41",
  "MC209836|sale|맘스케어|주니어 카시트 부스터 라이트|sale-carseat-junior-booster|59000|4000||3000|3000|6000|O|O|stopped|hidden|2026-07-22 14:09:33|2026-07-31 16:28:15",
  "LB846102|rent|리틀베이비|디럭스 유모차 클래식|stroller-deluxe-4wheel|1900|200|150000|0|8000|8000|O|O|stopped|hidden|2026-07-20 09:51:20|2026-07-28 11:37:52",
  "AS563019|rent|아기별상사|롤매트 베이직 200|sleep-mat-roll|500|0|30000|0|6000|6000|O|△|stopped|hidden|2026-07-18 16:22:47|2026-07-26 10:05:33",
  "BH295740|sale|베베하우스|UV 소독기 컴팩트|sale-feeding-sterilizer-uv|59000|0||3000|3000|6000|O|O|stopped|hidden|2026-07-15 11:38:02|2026-07-24 14:50:19",
  "LS672384|rent|리틀스텝|바구니 카시트 라이트|carseat-infant-basket|1000|100|70000|0|6000|6000|O|O|stopped|hidden|2026-07-12 13:04:55|2026-07-21 09:46:08",
];

const MARK: Record<string, CheckMark> = {
  O: "ok",
  "△": "partial",
  X: "missing",
};

const toProduct = (row: string): Product => {
  const [
    id,
    mode,
    seller,
    name,
    category,
    base,
    discount,
    deposit,
    ship,
    returnFee,
    exchangeFee,
    kc,
    image,
    status,
    display,
    date,
    updatedAt,
    reason,
    rejectAt,
  ] = row.split("|");
  const isRent = mode === "rent";

  return {
    id,
    mode: mode as ProductMode,
    source: "seller",
    seller,
    name,
    category,
    rentBase: isRent ? Number(base) : null,
    rentDiscount: isRent ? Number(discount) : null,
    deposit: isRent ? Number(deposit) : null,
    saleBase: isRent ? null : Number(base),
    saleDiscount: isRent ? null : Number(discount),
    shipFee: Number(ship),
    returnFee: Number(returnFee),
    exchangeFee: Number(exchangeFee),
    kc: MARK[kc],
    image: MARK[image],
    status: status as SaleStatus,
    display: display as DisplayStatus,
    date,
    saleStart: date,
    saleEnd: "",
    updatedAt,
    reject: reason ? { reason, at: rejectAt } : undefined,
  };
};

/** 전체 상품 — 본사 직영 포함. 화면은 이것을 직접 읽지 않는다 */
export const PRODUCTS: Product[] = [...DETAILED, ...BRIEF_ROWS.map(toProduct)];

/**
 * 이 화면이 다루는 상품 — **입점사 상품만**(원본 `SCREENS.products` 의 `base`).
 * 본사 직영 상품은 본사가 스스로 올린 것이라 반려·승인할 대상이 아니다.
 */
export const LISTED_PRODUCTS = PRODUCTS.filter(
  (product) => product.source === "seller",
);

/**
 * 상태별 건수 대시의 단위 (원본 `dashUnit: "개"`).
 * 상품은 "건"이 아니라 "개"로 센다. 처리 알림은 원본대로 "건"이다(처리 건수라서).
 */
export const DASH_UNIT = "개";

/**
 * 판매 상태 필터 = **상태별 건수 대시의 카드 목록**.
 *
 * 원본은 이 축을 필터바의 칩이 아니라 `StatDash` 로 낸다. 그래서 **카드를 누르는 것이
 * 곧 상태 필터**다 — 같은 축을 두 군데 두면 어느 쪽이 진짜인지 알 수 없다.
 *
 * ## ⚠️ **[전체] 카드는 없다** (원본 `products.dash` — "목록은 항상 한 상태만 보여준다")
 * 건수는 여기 두지 않는다. 뼈대가 **지금 보이는 행에서 직접 세므로** 표와 어긋날 수 없다.
 */
export const FILTERS = [
  { value: "onSale", label: "판매중" },
  { value: "rejected", label: "반려" },
  { value: "rereview", label: "재심사요청" },
  { value: "stopped", label: "판매중지" },
  { value: "soldout", label: "품절" },
];

/** 화면을 열었을 때 고를 상태. 원본 `products.dash` — "기본 : 화면 진입 시 [판매중] 선택" */
export const DEFAULT_FILTER = "onSale";

/** 페이지당 개수 후보 — 원본 표 하단의 셀렉트 */
export const PAGE_SIZES = [10, 20, 50, 100];

/** 한 페이지에 보여줄 행 수 — 원본 기본값 */
export const PAGE_SIZE = 10;

/** 유형 셀렉트(원본은 라디오 — 2026-10-19 사용자 결정으로 셀렉트). 첫 항목은 `"all"` */
export const MODE_FILTERS = [
  { value: "all", label: "유형 전체" },
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

/** 표의 금액 포맷. 단위가 도메인이라 여기 둔다 (원 · 개 · 건) */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/**
 * 상품등록일·최종수정일·반려일 표기 — 원본처럼 **초까지**, 구분자는 점.
 * 표기는 도메인이라 여기 둔다(`won` 과 같은 이유).
 */
export const ymdhms = (dateText: string | null | undefined) =>
  dateText ? dateText.replace(/-/g, ".").replace("T", " ") : "-";

/**
 * 실제 청구되는 렌트가 = 렌트 원가 − 할인 금액 (음수 방지).
 * **파생값은 뼈대가 아니라 데이터가 계산한다.**
 */
export const rentPriceOf = (product: Product) =>
  Math.max(0, (product.rentBase ?? 0) - (product.rentDiscount ?? 0));

/** 실제 청구되는 판매가 = 판매 원가 − 판매 할인 (음수 방지) */
export const salePriceOf = (product: Product) =>
  Math.max(0, (product.saleBase ?? 0) - (product.saleDiscount ?? 0));

/** "1,300원/일" — 렌트 단위는 일 고정. 판매 건이면 "-" 자리를 뼈대가 채우므로 렌트만 다룬다 */
/** 렌트 일 단가 — 목록의 렌트 원가·할인·렌트가 세 열이 같은 단위(원/일)를 쓴다 */
export const perDay = (value: number) => won(value) + "/일";

export const rentPriceText = (product: Product) => perDay(rentPriceOf(product));

/**
 * 화면 상단 **상시 안내 배너**(원본 `data-area="products.note"`) — 부록 A C60 바꿈 문구 두 문장.
 * 원본은 한 문단이고, 우리는 무게를 다르게 주려고 문장마다 줄을 나눴다(제목 · 본문).
 * 옛 셋째 줄(연대책임 경고)은 C60 바꿈 문구에 없어 지웠다.
 */
export const NOTICE_TITLE = "셀러 상품은 등록 즉시 판매됩니다.";
export const NOTICE_BODY = "문제가 있으면 상품을 골라 [반려 처리]하세요.";

/**
 * 처분 결과 문구 — 원본 `prodApprove` · `confirmProdReject` 그대로(단위 "건").
 *
 * 승인은 고른 행 중 자격이 없는 건이 **조용히 빠지므로** 제외 수를 함께 알린다
 * (원본 UI-225). 숨기면 "4건 골랐는데 3건만 바뀐" 이유를 알 수 없다.
 */
export const approveMessage = (done: number, skipped: number) =>
  `${done}건 승인 처리되었습니다. 판매중으로 되돌렸습니다.` +
  (skipped > 0 ? ` · ${skipped}건 제외(반려 상태가 아닌 건)` : "");

export const rejectMessage = (done: number) =>
  `${done}건 반려 처리되었습니다. 상태를 «반려»로 내렸습니다.`;

/** 반려 사유 입력 모달 — 제목은 원본처럼 건수를 품는다(대상 줄 없음, 원본 판정 ⑪ⓑ) */
export const rejectTitle = (count: number) =>
  count > 1 ? `상품 반려 사유 입력 (${count}건)` : "상품 반려 사유 입력";

/** 반려 사유 입력 모달의 안내 문구 — 원본 `_MODAL_CFG.prodreject.note` */
export const REJECT_NOTICE =
  "입력한 사유는 셀러에게 그대로 보입니다. 반려하면 판매와 전시가 함께 내려갑니다.";

/** 반려 사유 입력 placeholder — 실제로 자주 쓰이는 사유를 예시로 든다 */
export const REJECT_PLACEHOLDER =
  "반려 사유를 입력하세요 (예: KC 인증서류 미제출, 등록 이미지 규격 미달, 성분·재질 표기 누락 등)";

/** 사유 없이 반려하면 셀러가 무엇을 고쳐야 할지 알 수 없다 (원본 문구) */
export const REJECT_ERROR = "반려 사유를 입력해주세요.";

/** 반려 사유 보기 모달에서 사유가 비어 있을 때 */
export const REJECT_EMPTY = "등록된 반려 사유가 없습니다.";

/** 재심사요청 건에만 덧붙는 꼬리말 */
export const REREVIEW_NOTE = "셀러가 재심사를 요청한 건입니다.";

/** 빈 상태 문구 — 다른 목록과 같은 틀(명사만 이 화면의 것) */
export const EMPTY_TITLE = "해당 조건의 상품이 없습니다";
export const EMPTY_DESCRIPTION =
  "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.";

/* -------------------------------------------------------------------------
 * 검색조건 요약 — 접힌 `FilterBar` 한 줄에 들어가는 글자
 *
 * 순서는 필터 행 순서(기간 → 전시 → 유형 → 카테고리 → 검색어)이고, 표기는 원본
 * `fbSummary` 처럼 **"항목명 값"** 이다(`유형 렌트` · `전시 상태 전시중`). 검색어만 다른
 * 목록 화면과 같은 `셀러명 «…»` 로 둔다.
 *
 * ⚠️ **판매 상태는 요약에 넣지 않는다.** 상태 축은 위의 건수 카드가 이미 선택된 채로
 * 보여 주고 있어, 여기서 또 적으면 같은 사실이 두 곳에서 말해진다.
 * ---------------------------------------------------------------------- */

/** 조건이 하나도 없을 때 — 원본 문구 그대로 */
export const NO_FILTER_TEXT = "조건 없음 (전체)";

/** 라벨 목록에서 값에 해당하는 라벨을 찾는다. 못 찾으면 값을 그대로 쓴다 */
const labelOf = (
  options: { value: string; label: string }[],
  value: string,
): string => options.find((option) => option.value === value)?.label ?? value;

/** 걸린 조건을 사람이 읽는 한 줄로. 카테고리는 **가장 깊이 고른 것 하나만** 적는다 */
export const filterSummary = ({
  mode,
  display,
  category,
  dateField,
  from,
  to,
  searchField,
  keyword,
}: {
  mode: string;
  display: string;
  /** 가장 깊이 고른 카테고리 코드, 없으면 `"all"` */
  category: string;
  dateField: string;
  from?: Date;
  to?: Date;
  searchField: string;
  keyword: string;
}): string => {
  const parts: string[] = [];

  if (from) {
    const day = (value: Date) =>
      `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, "0")}.${String(
        value.getDate(),
      ).padStart(2, "0")}`;
    parts.push(
      `${labelOf(DATE_FIELDS, dateField)} ${day(from)}${to ? `~${day(to)}` : ""}`,
    );
  }

  if (display !== "all") {
    parts.push(`전시 상태 ${labelOf(DISPLAY_FILTERS, display)}`);
  }
  if (mode !== "all") parts.push(`유형 ${labelOf(MODE_FILTERS, mode)}`);
  if (category !== "all") {
    parts.push(categoryById(category)?.name ?? category);
  }

  if (keyword.trim() !== "") {
    parts.push(`${labelOf(SEARCH_FIELDS, searchField)} «${keyword.trim()}»`);
  }

  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};
