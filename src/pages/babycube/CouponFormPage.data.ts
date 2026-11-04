import {
  COUPONS,
  LIST_PATH,
  NEW_PATH,
  findCoupon,
  type ApplyTarget,
  type Coupon,
  type IssueMethod,
  type StoredStatus,
} from "./CouponListPage.data";

/* -------------------------------------------------------------------------
 * 본사 쿠폰 등록 · 수정 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `CouponFormPage.tsx` · 들어오는 곳: 쿠폰관리 [+ 쿠폰 등록](`/promo/new`) ·
 * 본사 쿠폰 행(`/promo/{쿠폰코드}` — `CouponDetailPage` 가 본사 쿠폰이면 이 폼을 그린다)
 * 기준: 추가 기획 보드 06(본사 쿠폰) · 07(쿠폰 번호) · 본사 개발 저장소 `promo/CouponFormScreen.tsx`
 * (70a3e88 등록·수정 · 69ab2f3 교체 확인 문구 · 495c8f5 번호 파일 · 3a2df9e 업로드 뒤 잠금)
 *
 * ## 이 폼이 무엇인가 — 셀러 쿠폰 폼 + 본사 칸 3개
 * 셀러 쿠폰 폼(기본 정보 · 할인 내용 · 사용 기간 · 상태)을 그대로 두고 더한다:
 *   ① 기본 정보 · 쿠폰명 아래 「발급 방식」 [가입 시 자동] [다운로드] [쿠폰 번호] (+ 쿠폰 번호면 「번호 파일」)
 *   ② 할인 내용 · 적용 대상 아래 「중복 사용」 [가능] [불가]
 *   ③ 사용 기간 · 가입 시 자동이면 「발급 후 [ ] 일」, 그 밖은 시작일 · 종료일
 * 할인 금액·일수는 전부 운영자 입력값이다 — 화면에 상수로 넣지 않는다(개발 주석 그대로).
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `findHqCoupon(쿠폰코드)` → **본사 쿠폰만** (셀러 쿠폰·없는 코드는 `undefined`)
 * - `draftOf(쿠폰?)` → 폼 처음 값 · `validateHqCoupon(초안)` → 칸별 오류(키 = `HqCouponField`)
 * - `methodLockMessage` → 발급 방식 잠금 문구 | `null` · `needsReplaceConfirm` → 가입 쿠폰 교체 확인 여부
 * - `countCodes` · `codeUploadMessage` → 번호 파일 올린 결과 알림
 *
 * ## 개발 저장소와 같게 둔 것
 * - 새 쿠폰 처음 값: 다운로드 · 정률 · 적용 대상 전체 · 중복 가능 · 사용(개발 `emptyHqDraft`)
 * - 검사 문구 6종(`ERRORS`) · 가입 시 자동은 일수 필수, 그 밖은 종료일 < 시작일만 막는다
 * - 발급 방식 잠금: 발급 1장 이상 → 「이미 발급된…」, 번호만 올렸으면 → 「번호 파일을 올린…」(새 쿠폰은 잠그지 않는다)
 * - 번호 파일: 새 쿠폰은 「먼저 등록한 뒤」, 저장된 다른 방식 쿠폰을 [쿠폰 번호]로 바꾼 채면 「저장한 뒤」 안내,
 *   저장된 쿠폰 번호 쿠폰만 [파일 올리기](txt) + 「번호 N개 · 사용 M개」
 * - 가입 시 자동 + 사용으로 저장할 때 **다른** 가입 쿠폰이 사용 중이면 교체 확인(69ab2f3 문구) — 취소하면 저장하지 않는다
 * - 신규 저장 → 목록으로 · 수정 저장 → 제자리 「저장되었습니다.」
 *
 * ## 원본(개발)과 다르게 둔 곳
 * - 검사 오류는 첫 오류 한 줄이 아니라 **칸 아래 인라인**(폼 규격 §29) — 문구는 개발 그대로
 * - 교체 확인은 브라우저 `confirm` 대신 확인 창(문구 첫 문장 = 제목, 나머지 = 본문)
 * - 신규 저장은 알림 「쿠폰이 등록되었습니다.」 + 목록(개발은 알림 없이 목록 — 셀러 폼 문구를 따랐다)
 * - 번호 파일 결과는 퍼블이라 **파일 안 줄만 센다**(빈 줄 제외 · 같은 파일 안 중복). 기존 번호와의 중복 ·
 *   형식 오류는 서버 판정이라 0 으로 둔다. 올린 수만큼 「번호 N개」가 늘고 곧바로 잠긴다(3a2df9e)
 *
 * ## ⚠️ 기획 확인 필요
 * - 보드 06 은 발급 방식 2개(가입 시 자동 · 다운로드)인데 보드 07 · 개발이 [쿠폰 번호]를 더했다 — 개발을 따랐다
 * - 적용 대상 도움말(셀러 폼의 [렌트 전용]/[구매 전용] 배지 안내)은 본사 쿠폰에 맞지 않아(사용자 몰은 [전 상품]) 뺐다 — 개발도 없다
 * - 다운로드 · 쿠폰 번호의 시작일 · 종료일은 필수가 아니다(개발 그대로) — 기간 없는 본사 쿠폰을 허용할지
 * ---------------------------------------------------------------------- */

export { LIST_PATH, NEW_PATH };

/** 본사 쿠폰만 이 폼으로 연다 — 셀러 쿠폰(직영 매장 포함)은 조회 상세 */
export const findHqCoupon = (code: string): Coupon | undefined => {
  const coupon = findCoupon(code);
  return coupon?.hq ? coupon : undefined;
};

export type DcType = Coupon["discountType"];

export interface HqCouponDraft {
  name: string;
  issueMethod: IssueMethod;
  dcType: DcType;
  /** 숫자 글자만(보이기는 뼈대가 쉼표) */
  dcVal: string;
  cap: string;
  min: string;
  target: ApplyTarget;
  stackable: boolean;
  validDays: string;
  /** `YYYY-MM-DD` · 비면 `""` */
  start: string;
  end: string;
  stat: StoredStatus;
}

const digits = (value: number | null) => (value === null ? "" : String(value));

export const draftOf = (coupon?: Coupon): HqCouponDraft =>
  coupon?.hq
    ? {
        name: coupon.name,
        issueMethod: coupon.hq.issueMethod,
        dcType: coupon.discountType,
        dcVal: String(coupon.discountValue),
        cap: digits(coupon.discountMax),
        min: digits(coupon.minOrderAmount),
        target: coupon.hq.target,
        stackable: coupon.hq.stackable,
        validDays: digits(coupon.hq.validDays),
        start: coupon.startsOn ?? "",
        end: coupon.endsOn ?? "",
        stat: coupon.stored,
      }
    : {
        name: "",
        issueMethod: "다운로드",
        dcType: "rate",
        dcVal: "",
        cap: "",
        min: "",
        target: "전체",
        stackable: true,
        validDays: "",
        start: "",
        end: "",
        stat: "사용",
      };

export const NAME_MAX = 40;

export type HqCouponField = "name" | "dcVal" | "cap" | "validDays" | "end";

/** 검사 문구 — 개발 `toHqMutation` 그대로 */
export const ERRORS = {
  name: "쿠폰명을 입력하세요.",
  amount: "할인 금액을 입력하세요.",
  rate: "할인율을 입력하세요.",
  rateRange: "할인율은 1~100 사이로 입력하세요.",
  cap: "최대 할인액은 1원 이상 입력하거나 비워 주세요.",
  validDays: "발급 후 사용 일수를 입력하세요.",
  end: "종료일은 시작일보다 빠를 수 없습니다.",
} as const;

export function validateHqCoupon(d: HqCouponDraft) {
  const e: Partial<Record<HqCouponField, string>> = {};
  const rate = d.dcType === "rate";
  if (!d.name.trim()) e.name = ERRORS.name;
  if (!(Number(d.dcVal) > 0)) e.dcVal = rate ? ERRORS.rate : ERRORS.amount;
  else if (rate && Number(d.dcVal) > 100) e.dcVal = ERRORS.rateRange;
  if (rate && d.cap !== "" && !(Number(d.cap) > 0)) e.cap = ERRORS.cap;
  if (d.issueMethod === "가입자동") {
    if (!(Number(d.validDays) >= 1)) e.validDays = ERRORS.validDays;
  } else if (d.start && d.end && d.end < d.start) {
    e.end = ERRORS.end;
  }
  return e;
}

/** 발급 방식 잠금 — 개발 `methodLockMessage` 그대로. 잠그지 않으면 `null` */
export function methodLockMessage(issuedCount: number, codeTotal: number) {
  if (issuedCount > 0) return "이미 발급된 쿠폰은 발급 방식을 바꿀 수 없어요.";
  if (codeTotal > 0)
    return "번호 파일을 올린 쿠폰은 발급 방식을 바꿀 수 없어요.";
  return null;
}

/**
 * 가입 쿠폰 교체 확인 — 가입 시 자동 + 사용으로 저장하는데 **다른** 가입 쿠폰이 사용 중일 때만
 * (가입 시 자동 쿠폰은 사용 상태 1개만 · 개발 D-378 은 서버가 판정한다)
 */
export const needsReplaceConfirm = (draft: HqCouponDraft, selfId?: string) =>
  draft.issueMethod === "가입자동" &&
  draft.stat === "사용" &&
  COUPONS.some(
    (c) =>
      c.id !== selfId &&
      c.hq?.issueMethod === "가입자동" &&
      c.stored === "사용",
  );

/** 교체 확인 창 — 개발 `REPLACE_SIGNUP_CONFIRM`(69ab2f3 · 11/3 기획 회신)을 제목·본문으로 나눴다 */
export const REPLACE_CONFIRM = {
  title: "기존 쿠폰을 사용중지로 바꿀까요?",
  body: "새 가입 회원부터 새 쿠폰이 나가요. 이미 받은 회원은 만료일까지 쓸 수 있어요.",
} as const;

/** 번호 파일(txt · 한 줄에 번호 하나) — 빈 줄은 건너뛰고 같은 파일 안 중복만 센다(퍼블 범위) */
export function countCodes(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const added = new Set(lines).size;
  return { added, duplicated: lines.length - added, invalid: 0 };
}

const count = (n: number) => n.toLocaleString("ko-KR");

/** 올린 결과 알림 — 개발 `codeUploadMessage` 그대로 */
export const codeUploadMessage = (r: ReturnType<typeof countCodes>) =>
  `번호 ${count(r.added)}개 추가 · 중복 ${count(r.duplicated)} · 형식 오류 ${count(r.invalid)}`;

export const codeStatsText = (codes: { total: number; claimed: number }) =>
  `번호 ${count(codes.total)}개 · 사용 ${count(codes.claimed)}개`;

export const ISSUE_METHODS = [
  { value: "가입자동", label: "가입 시 자동" },
  { value: "다운로드", label: "다운로드" },
  { value: "쿠폰번호", label: "쿠폰 번호" },
];
export const DC_TYPES = [
  { value: "rate", label: "정률 (%)" },
  { value: "amount", label: "정액 (원)" },
];
export const TARGET_OPTIONS = [
  { value: "전체", label: "전체" },
  { value: "렌트", label: "렌트" },
  { value: "판매", label: "판매" },
];
export const STACK_OPTIONS = [
  { value: "Y", label: "가능" },
  { value: "N", label: "불가" },
];
export const STAT_OPTIONS = [
  { value: "사용", label: "사용" },
  { value: "사용중지", label: "사용중지" },
];

/** 문구 — 개발 `CouponFormScreen.tsx` 그대로(`**…**` 는 굵게) */
export const COPY = {
  newTitle: "쿠폰 등록",
  editTitle: "쿠폰 상세 (수정)",
  newDescription: "새 쿠폰을 등록합니다.",
  namePlaceholder: "예) 첫 렌트 30% 할인",
  capPlaceholder: "최대 할인액 (선택)",
  capHelp: "정률 할인의 **최대 할인 금액** 상한(선택). 비우면 상한 없음.",
  minPlaceholder: "최소 구매 금액 (선택)",
  minHelp:
    "입력한 **주문 금액 이상** 구매할 때만 쿠폰을 사용할 수 있습니다. 비우면 **구매 금액 조건 없음**.",
  validDaysPlaceholder: "일수 입력",
  periodHelp:
    "쿠폰을 사용할 수 있는 기간입니다. **종료일이 지나면 더는 받을 수 없습니다.**",
  issuedHelp: "등록 시 오늘 날짜로 **발행일**이 기록됩니다.",
  codeNeedCreate: "쿠폰을 먼저 등록한 뒤 번호 파일을 올려 주세요",
  codeNeedSave: "발급 방식을 쿠폰 번호로 저장한 뒤 번호 파일을 올려 주세요",
  created: "쿠폰이 등록되었습니다.",
  saved: "저장되었습니다.",
  notFoundTitle: "찾을 수 없는 쿠폰입니다",
  notFoundDescription: "해당 항목이 존재하지 않거나 삭제되었습니다.",
} as const;
