/* =========================================================================
 * 셀러 원본 시드 — 게시판 — 본사 공지 · 고객 문의 · 리뷰 · 1:1 문의
 *
 * ⚠️ **자동 생성 · 손으로 고치지 않는다.** 원본 = 기획 저장소 `rentmall-planning`
 * `apps/admin-seller/index.html` v0.4 (커밋 `f3526f4`) 를 브라우저로 연 직후의 배열을 그대로 뽑았다
 * (원본 런타임 보강까지 끝난 값 · 화면을 돌아도 바뀌지 않음을 확인). 타입은 값 모양에서 추론했다.
 *
 * 화면은 이 값을 **읽기만** 한다 — 업무 버튼은 확인 창 + 알림만이라 목록·저장본이 바뀌지 않는다.
 * 화면에 보이는 파생값(상태 흐름·배지 수·정산 금액)은 각 화면의 `.data.ts` 가 이 시드에서 계산한다.
 * 원본이 바뀌면 덤프부터 다시 뽑는다(`docs/HANDOFF.md` 셀러 절).
 * ====================================================================== */

export interface SellerNotice {
  id: string;
  pin: boolean;
  title: string;
  date: string;
  body: string;
}

export const SELLER_NOTICES: SellerNotice[] = [
  {
    id: "N-S26",
    pin: true,
    title: "[정산] 7월 정산 명세 확인 요청 발송 안내 (7/1)",
    date: "2026.06.28",
    body: "7월 1일에 6월분 정산 확인요청이 발송됩니다. 확인 기한은 3일이며, 무응답 시 자동 확인완료 처리됩니다.",
  },
  {
    id: "N-S25",
    pin: false,
    title: "[운영] 여름 성수기 배송 지연 대비 출고 가이드",
    date: "2026.06.24",
    body: "7~8월 성수기에는 택배사 물량 증가로 배송 지연이 잦습니다. 출고 예정일보다 1일 이른 발송 처리를 권장합니다.",
  },
  {
    id: "N-S24",
    pin: false,
    title: "[정책] 출고 이미지 등록 안내 — 미등록 시 분쟁 대조 근거 없음",
    date: "2026.06.20",
    body: "렌트 발송 처리 시 주문건별 출고 이미지를 등록해주세요. 미등록 건은 파손 분쟁 시 대조 근거가 없어 반납 이미지 단독으로 보증금 차감을 주장할 수 없습니다.",
  },
  {
    id: "N-S23",
    pin: false,
    title: "[시스템] 상품 등록 폼 개편(옵션·기간 특가·인증 정보) 안내",
    date: "2026.06.15",
    body: "상품 등록 폼에 렌트 수량·기간 특가·인증 정보·상품 주요 정보(행 편집형) 섹션이 추가되었습니다.",
  },
];

export interface SellerInquiry {
  id: string;
  type: string;
  no?: string;
  mem: string;
  prod: string;
  q: string;
  date: string;
  stat: string;
  secret: boolean;
  a: string;
}

export const SL_INQUIRIES: SellerInquiry[] = [
  {
    id: "Q-8842",
    type: "주문",
    no: "20260621452502",
    mem: "정하늘",
    prod: "디럭스 유모차 프리미엄",
    q: "주문한 지 3일인데 아직 배송 출발 안내가 없어요. 언제 출고되나요?",
    date: "2026.06.21",
    stat: "접수",
    secret: false,
    a: "",
  },
  {
    id: "Q-8841",
    type: "상품",
    mem: "정하늘",
    prod: "디럭스 유모차 프리미엄",
    q: "출고 시 레인커버도 같이 오나요? 장마철이라 걱정돼요.",
    date: "2026.06.21",
    stat: "접수",
    secret: false,
    a: "",
  },
  {
    id: "Q-8840",
    type: "상품",
    mem: "최민호",
    prod: "하이체어 원목형",
    q: "벨트 부분 세척은 어떻게 하는지 알려주세요.",
    date: "2026.06.21",
    stat: "접수",
    secret: true,
    a: "",
  },
  {
    id: "Q-8839",
    type: "주문",
    no: "20260620514785",
    mem: "김서준",
    prod: "하이체어 원목형",
    q: "방문 수령으로 변경 가능할까요? 직접 픽업하고 싶습니다.",
    date: "2026.06.20",
    stat: "답변완료",
    secret: false,
    a: "안녕하세요. 상품 준비 전이라 방문 수령으로 변경해 드렸습니다. 수령 장소는 주문 상세에서 확인하실 수 있습니다.",
  },
  {
    id: "Q-8838",
    type: "상품",
    mem: "이준영",
    prod: "아기 침대 프리미엄",
    q: "매트리스 커버 여분 구성이 있나요?",
    date: "2026.06.20",
    stat: "답변완료",
    secret: false,
    a: "안녕하세요. 기본 구성에 커버 1매가 포함되며, 옵션으로 여분 커버를 추가하실 수 있습니다.",
  },
  {
    id: "Q-8835",
    type: "상품",
    mem: "박서연",
    prod: "디지털 체온계",
    q: "체온계가 배터리 교체형인가요?",
    date: "2026.06.20",
    stat: "답변완료",
    secret: false,
    a: "네, CR2032 배터리 교체형입니다.",
  },
];

export interface SellerReview {
  id: string;
  mem: string;
  prod: string;
  rate: number;
  txt: string;
  date: string;
  reply: string;
}

export const SL_REVIEWS: SellerReview[] = [
  {
    id: "RV-31",
    mem: "두아이맘",
    prod: "디럭스 유모차 프리미엄",
    rate: 5,
    txt: "성장단계 추천으로 골랐는데 우리 아이한테 딱 맞아요. 배송도 빨랐어요.",
    date: "2026.06.25",
    reply: "",
  },
  {
    id: "RV-30",
    mem: "정하늘",
    prod: "하이체어 원목형",
    rate: 4,
    txt: "상태가 새것 같아요. 벨트가 살짝 빡빡한 것 빼면 만족합니다.",
    date: "2026.06.22",
    reply:
      "소중한 리뷰 감사합니다. 벨트는 사용 2~3일 후 자연스럽게 부드러워집니다.",
  },
  {
    id: "RV-29",
    mem: "초보아빠",
    prod: "아기 침대 프리미엄",
    rate: 5,
    txt: "조립 기사님이 친절했고 위생 상태 최고예요.",
    date: "2026.06.18",
    reply: "",
  },
];

export interface SellerAsk {
  id: string;
  title: string;
  date: string;
  stat: string;
  body: string;
  a: string;
}

export const SELLER_ASKS: SellerAsk[] = [
  {
    id: "SQ-12",
    title: "정산 명세서에 6/30 반품 건이 이중 차감된 것 같습니다",
    date: "2026.07.02",
    stat: "답변완료",
    body: "6월 정산 명세 취소 차감 항목을 확인 부탁드립니다.",
    a: "확인 결과 취소 차감 규칙(G-6) 정정 대상 건으로, 7월 명세에서 정정 반영됩니다.",
  },
  {
    id: "SQ-11",
    title: "공항 픽업 등록 시 김해공항도 선택 가능한가요?",
    date: "2026.06.30",
    stat: "접수",
    body: "부산 지역 셀러입니다. 김해공항 픽업을 제공하고 싶습니다.",
    a: "",
  },
];
