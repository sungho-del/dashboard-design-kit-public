import {
  MEMBERS,
  type Member,
  type MemberChild,
  type MemberPayment,
  type PaymentKind,
  type PaymentStatus,
} from "./MemberListPage.data";

/* -------------------------------------------------------------------------
 * S02-D 회원 상세 (BO-MEM-002) — 도메인 층
 *
 * 짝이 되는 뼈대: `MemberDetailPage.tsx`
 *
 * ## ⚠️ 회원 레코드는 **목록과 같은 것을 쓴다**
 * `MemberListPage.data.ts` 의 `MEMBERS` 를 그대로 읽는다. 상세용 배열을 따로 두면
 * 한쪽만 고쳤을 때 **같은 사람의 이름·연락처가 화면마다 달라진다.**
 * 실 API 를 붙이면 이 파일의 `findMember` 가 상세 조회 호출로 바뀐다.
 *
 * ## 갈아끼울 것 (이 파일 전체)
 *
 * | 실물 이름        | 역할                                                    |
 * | ---------------- | ------------------------------------------------------- |
 * | `findMember`     | 경로의 id → 회원 레코드                                 |
 * | `SECTIONS`       | 섹션 제목 4종 (원본 `members.form` 구성 순서)          |
 * | `GENDER_LABEL`   | 성별 표기                                               |
 * | `ACCOUNT_STATES` | 상태 택1 버튼의 값·라벨 (탈퇴는 **고를 수 없다**)      |
 * | `monthsSince`    | 자녀 개월 수 — 원본 "생년월일 · 개월수" 표기용         |
 * | `won` · `ymd`    | 단위 포맷                                               |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `ACCOUNT_STATES` 는 **고를 수 있는 상태만** 담는다. 원본 정책이 "탈퇴 회원은 상태
 *   변경 드롭다운 없이 배지로만 표시"라 탈퇴는 선택지가 아니다
 * - `monthsSince` 는 **저장하지 않고 계산한다** — 개월 수를 데이터에 적어 두면
 *   하루만 지나도 틀린 값이 화면에 남는다
 * ---------------------------------------------------------------------- */

/**
 * 경로의 id(이메일)로 회원을 찾는다.
 *
 * 주소창에 손으로 친 id·지워진 회원이 있을 수 있으므로 **없을 수 있다는 사실을
 * 타입으로 남긴다** — 뼈대가 "없는 회원" 화면을 그리게 하는 것이 이 `undefined` 다.
 */
export const findMember = (id: string): Member | undefined =>
  MEMBERS.find((member) => member.id === id);

/** 원본 `members.form` 의 섹션 구성 순서 — 기본 정보가 최상단이다 */
export const SECTIONS = {
  basic: "기본 정보",
  account: "계정 상태",
  child: "자녀 정보",
  /*
   * ⚠️ 원본 주석(`sec.members_hist`)은 이 섹션을 "이용 이력"이라 부르고 컬럼도
   * "번호·주문번호·셀러·상품·유형·금액·상태"라고 적지만, **원본 화면의 제목은
   * `결제 내역 (N)` 이고 컬럼은 `No·주문번호·결제 일시·구분·상품명·결제금액·상태`** 다.
   * 주석이 구현보다 앞서 있는 자리라 **화면을 따른다**(상품 화면의 행별 드롭다운과 같은 판단).
   */
  payment: "결제 내역",
} as const;

export const GENDER_LABEL: Record<Member["gender"], string> = {
  male: "남",
  female: "여",
};

/** 자녀 성별은 원본 표기가 다르다 — "남아 / 여아" */
export const CHILD_GENDER_LABEL: Record<MemberChild["gender"], string> = {
  male: "남아",
  female: "여아",
};

/**
 * 계정 상태 택1 — 원본 `sec.members_acct` 의 `[정상][휴면][정지]`.
 *
 * **탈퇴는 없다.** 원본 정책이 "탈퇴 회원은 상태 변경 드롭다운 없이 배지로만 표시"다 —
 * 탈퇴를 고를 수 있게 두면 운영자가 화면에서 회원을 탈퇴시킬 수 있다는 뜻이 된다.
 */
export const ACCOUNT_STATES = [
  { value: "active", label: "정상" },
  { value: "dormant", label: "휴면" },
  { value: "suspended", label: "정지" },
];

/**
 * 휴면으로 바꿀 수 없을 때의 안내 — 원본 가드 문구 그대로.
 * 빌려 간 물건이 남아 있는데 계정을 재우면 반납 안내가 닿지 않는다.
 */
export const dormantBlockedText = (activeRents: number) =>
  `진행 중인 렌트 ${activeRents}건이 있어 휴면으로 전환할 수 없습니다 — 반납이 끝나면 전환할 수 있습니다.`;

/** 저장 성공 알림 — 원본 하단 액션 바의 [저장하기] 결과 (휴면·정지는 사유 모달을 거친 뒤) */
export const SAVED_TEXT = "변경 내용을 저장했습니다";

/**
 * 태어난 뒤 지난 개월 수. 원본 자녀 표의 `생년월일 · N개월` 표기용이다.
 *
 * ⚠️ 날짜 차이를 30 으로 나누지 않는다 — 달마다 길이가 달라 실제와 어긋난다.
 * 달 수를 센 뒤 **생일이 아직 안 지났으면 한 달을 뺀다**(만 나이와 같은 셈법).
 */
export const monthsSince = (birth: string, now = new Date()): number => {
  const at = new Date(`${birth}T00:00`);
  if (Number.isNaN(at.getTime())) return 0;

  let months =
    (now.getFullYear() - at.getFullYear()) * 12 +
    (now.getMonth() - at.getMonth());
  if (now.getDate() < at.getDate()) months -= 1;
  return Math.max(0, months);
};

/** 원본 `ymd` — `2026.08.12` 처럼 날짜만 점 표기로 */
export const ymd = (value: string | null) =>
  value ? value.slice(0, 10).replace(/-/g, ".") : "-";

/** 포인트는 원화다 — 원본 `39,000원` */
export const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/** 마케팅 수신 — 원본은 `동의 / 미동의` 두 글자로 낸다 */
export const marketingLabel = (optIn: boolean) => (optIn ? "동의" : "미동의");

/* -------------------------------------------------------------------------
 * 결제 내역 — 원본 `sec.members_hist`
 * ---------------------------------------------------------------------- */

/** 표 위의 탭. 원본은 `[전체][렌트][판매]` 셋이다 */
export const PAYMENT_TABS: { value: "all" | PaymentKind; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "rent", label: "렌트" },
  { value: "sale", label: "판매" },
];

/** 구분 열 표기 — 이 서비스의 두 갈래 */
export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  rent: "렌트",
  sale: "판매",
};

/**
 * 결제 상태 → 라벨 · Tag tone.
 *
 * 원본 배지는 결제완료 `b-prog`(진행) · 결제취소 `b-done`(종료)이다.
 * 취소는 **실패가 아니라 정상 종료**이므로 `critical` 이 아니라 중립으로 둔다 —
 * 목록에서 빨갛게 띄우면 문제가 생긴 주문으로 읽힌다.
 */
export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; tone: "success" | "default" }
> = {
  paid: { label: "결제완료", tone: "success" },
  canceled: { label: "결제취소", tone: "default" },
};

/** 주문의 구분 — 렌트·판매가 섞이면 둘 다다(원본 `modeOf` 의 both) */
export const paymentKinds = (payment: MemberPayment): PaymentKind[] =>
  (["rent", "sale"] as const).filter((kind) =>
    payment.items.some((item) => item.kind === kind),
  );

/** 상품명 칸 — 원본 `prodOf`: 첫 상품 + ` 외 N건` */
export const productText = (payment: MemberPayment) =>
  payment.items.length > 1
    ? `${payment.items[0].product} 외 ${payment.items.length - 1}건`
    : (payment.items[0]?.product ?? "-");

/**
 * 탭으로 거른 결제 내역. `"all"` 이면 그대로 낸다.
 * 섞인 주문은 **[렌트]·[판매] 양쪽에** 나온다 — 원본도 `kindsOf(o).includes(탭)` 으로 거른다.
 */
export const filterPayments = (
  payments: MemberPayment[],
  tab: "all" | PaymentKind,
) =>
  tab === "all"
    ? payments
    : payments.filter((payment) => paymentKinds(payment).includes(tab));

/**
 * 일시 표기 — 원본 `2026.06.29 13:15`. 결제 일시와 휴면·정지 처리 일시가 쓴다.
 * **날짜만 내는 `ymd` 와 다르다** — 같은 날 여러 건을 결제할 수 있어 시각이 필요하다.
 */
export const dateTimeText = (value: string) =>
  `${value.slice(0, 10).replace(/-/g, ".")} ${value.slice(11, 16)}`;

/** 결제 내역이 하나도 없을 때 */
export const PAYMENT_EMPTY_TITLE = "결제 내역이 없습니다";
export const PAYMENT_EMPTY_DESCRIPTION = "가입 후 결제한 주문이 아직 없습니다.";
