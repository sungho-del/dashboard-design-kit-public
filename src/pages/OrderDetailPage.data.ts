/* -------------------------------------------------------------------------
 * 상세형 화면의 **도메인 층** — 여기가 서비스마다 통째로 갈리는 부분이다.
 *
 * 짝이 되는 뼈대: `OrderDetailPage.tsx` (카드 조립·InfoList 규격, 도메인 무관)
 *
 * ## 다른 서비스로 바꿀 때
 * 이 파일을 **전부 새로 쓴다.** 아래 4개 **역할**을 채우면
 * 뼈대는 카드 제목과 라벨 문자열만 고치면 된다.
 *
 * ⚠️ **계약은 이름이 아니라 역할과 모양이다.** 아래 "실물 이름"은 이 파일이 이커머스라서
 * 그런 것이고, 병원 화면이라면 `RESERVATION`·`minutes` 로 짓는 것이 옳다.
 * 템플릿 이름을 그대로 복사하면 병원 화면에 `ORDER` 가 남는다.
 *
 * | 역할                                | 실물 이름    | 예: A/S 접수 SaaS       |
 * | ----------------------------------- | ------------ | ----------------------- |
 * | 화면이 보여줄 **레코드 한 건**      | `ORDER`      | 수리 접수 건            |
 * | 단위 포맷                           | `won`        | 원 · pt · 시간          |
 * | 명세 소계 — 단가×수량의 합          | `itemsTotal` | 교체 부품 합계          |
 * | 최종 합계 — 소계 + 가산 − 차감      | `total`      | 청구액(공임 + 보증할인) |
 *
 * `ORDER` 의 중첩 키(`payment`·`buyer`·`shipping`·`items`)는 **카드 하나 = 관점 하나**에
 * 대응한다. 관점이 늘거나 줄면 뼈대의 카드도 같이 고친다 — 카드 수는 데이터가 정하지 않는다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `ORDER.status.tone` 은 `TagTone` 중 하나다(`default`·`success`·`warning`·`critical`).
 *   `PageHeader` 배지와 "주문 정보" 카드가 **같은 값을 함께 쓴다**
 * - `ORDER.items` 는 배열이고 `name` 이 **표의 행 key** 로 쓰인다 — 중복되면 안 된다
 * - `itemsTotal`·`total` 은 반드시 **계산 결과**여야 한다. 합계를 손으로 적어두면
 *   항목이 바뀌어도 값이 따라가지 않는다 (테스트가 이걸 검사한다)
 * - 금액은 전부 `number` 로 두고 포맷은 `won` 이 전담한다 — 문자열로 저장하면 합계가 깨진다
 * ---------------------------------------------------------------------- */

export const ORDER = {
  id: "ORD-2026-0142",
  placedAt: "2026-08-19 14:22",
  /** `tone` 은 `TagTone` — PageHeader 배지와 요약 카드가 같이 쓴다 */
  status: { label: "배송준비중", tone: "default" as const },
  payment: {
    method: "신용카드 (신한 1234)",
    approvedAt: "2026-08-19 14:23",
    channel: "PC 웹",
  },
  buyer: {
    name: "김지현",
    phone: "010-1234-5678",
    email: "jihyun.kim@example.com",
  },
  shipping: {
    receiver: "김지현",
    phone: "010-1234-5678",
    address: "서울특별시 성동구 왕십리로 100, 삼성아파트 101동 1004호 (04766)",
    message: "부재 시 경비실에 맡겨주세요",
    courier: "미등록",
  },
  /** 명세 표의 행. `name` 이 행 key 라 중복 금지 */
  items: [
    { name: "오버핏 코튼 셔츠", option: "화이트 / L", qty: 1, price: 42000 },
    { name: "린넨 와이드 팬츠", option: "베이지 / M", qty: 2, price: 38000 },
  ],
  /** 합계에서 빼는 값 — 뼈대는 화면에 `-` 를 붙여 표시한다 */
  discount: 5000,
  /** 합계에 더하는 값 */
  shippingFee: 3000,
};

/** 금액 포맷. 단위가 도메인이라 여기 둔다 (원 · pt · 시간 …) */
export const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/** 명세 소계 — 단가×수량의 합. **화면에 박지 말고 여기서 센다** */
export const itemsTotal = ORDER.items.reduce(
  (sum, i) => sum + i.price * i.qty,
  0,
);

/** 최종 합계 — 소계 + 가산(배송비) − 차감(할인) */
export const total = itemsTotal + ORDER.shippingFee - ORDER.discount;
