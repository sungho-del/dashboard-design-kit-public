/* -------------------------------------------------------------------------
 * 예약 상세(S02) 화면의 **도메인 층** — 차트온(병·의원 예약·진료 관리 SaaS).
 *
 * 짝이 되는 뼈대: `ReservationDetailPage.tsx` (카드 조립·InfoList 규격, 도메인 무관)
 * 원본 템플릿: `OrderDetailPage.data.ts` (이커머스) — 역할과 모양만 상속했다.
 *
 * ## 이 파일이 채우는 역할
 *
 * | 역할                           | 이 파일의 이름 | 템플릿(이커머스)의 이름 |
 * | ------------------------------ | -------------- | ----------------------- |
 * | 화면이 보여줄 **레코드 한 건** | `RESERVATION`  | `ORDER`                 |
 * | 단위 포맷                      | `won`          | 동일                    |
 * | 명세 소계 — 단가×수량의 합     | `itemsTotal`   | 동일                    |
 * | 최종 합계 — 소계 + 가산 − 차감 | `total`        | 동일                    |
 *
 * `RESERVATION` 의 중첩 키(`patient`·`items`·`payment`·`doctor`)는
 * **카드 하나 = 관점 하나**에 대응한다. 카드 수는 데이터가 아니라 기획서가 정한다
 * (기획서 S02 의 sections 5개 = 카드 5개).
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `RESERVATION.status.tone` 은 `TagTone` 중 하나다. `PageHeader` 배지와
 *   "예약 정보" 카드가 **같은 값을 함께 쓴다**
 *   (진료완료 = 정상 종료라 `default` — 예약 목록의 `STATUS_META` 와 같은 배정이다)
 * - `RESERVATION.items` 는 배열이고 `name` 이 **표의 행 key** 로 쓰인다 — 중복되면 안 된다
 * - `itemsTotal`·`total` 은 반드시 **계산 결과**여야 한다. 합계를 손으로 적어두면
 *   항목이 바뀌어도 값이 따라가지 않는다 (테스트가 이걸 검사한다)
 * - 금액은 전부 `number` 로 두고 포맷은 `won` 이 전담한다 — 문자열로 저장하면 합계가 깨진다
 *
 * ## 이 레코드는 예약 목록의 샘플 3행과 같은 건이다
 * `ReservationListPage.data.ts` 의 `RS-20260819-0033`(최유나 · 이비인후과 · 오세영 ·
 * 2026-08-19 10:30 · 진료완료). 목록에서 행을 열고 들어왔을 때 값이 어긋나지 않게 맞췄다.
 * ---------------------------------------------------------------------- */

export const RESERVATION = {
  id: "RS-20260819-0033",
  reservedAt: "2026-08-19 10:30",
  /** 접수경로 — 전화·온라인·현장 접수 */
  channel: "전화 접수",
  /** `tone` 은 `TagTone` — PageHeader 배지와 "예약 정보" 카드가 같이 쓴다 */
  status: { label: "진료완료", tone: "default" as const },
  patient: {
    chartNo: "P-2019-0842",
    name: "최유나",
    birth: "1994-03-11",
    phone: "010-3317-8064",
    guardianPhone: "010-3317-8065",
    insurance: "건강보험",
  },
  /** 명세 표의 행. `name` 이 행 key 라 중복 금지 */
  items: [
    { name: "재진 진찰료", category: "외래", qty: 1, price: 11800 },
    { name: "후두 내시경", category: "진단용", qty: 1, price: 24000 },
    { name: "네뷸라이저", category: "처치", qty: 2, price: 8350 },
  ],
  payment: {
    method: "신용카드 (국민 4412)",
    paidAt: "2026-08-19 11:12",
  },
  /** 합계에 더하는 값 — 진단서 1부 */
  certFee: 3000,
  /** 합계에서 빼는 값 — 뼈대는 화면에 `-` 를 붙여 표시한다 */
  insuranceCover: 21000,
  doctor: {
    name: "오세영",
    department: "이비인후과",
    room: "3진료실",
    nextVisit: "2026-09-02 10:00",
  },
};

/** 금액 포맷. 단위가 도메인이라 여기 둔다 (원 · 분 · 회 …) */
export const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/**
 * 진료 항목 소계 — 단가×수량의 합. **화면에 박지 말고 여기서 센다**
 * 11,800 + 24,000 + 8,350×2 = 52,500
 */
export const itemsTotal = RESERVATION.items.reduce(
  (sum, item) => sum + item.price * item.qty,
  0,
);

/**
 * 총 수납금액 — 소계 + 가산(제증명 수수료) − 차감(건강보험 공제).
 * 52,500 + 3,000 − 21,000 = 34,500
 */
export const total =
  itemsTotal + RESERVATION.certFee - RESERVATION.insuranceCover;
