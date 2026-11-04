/* =========================================================================
 * 셀러 원본 시드 — 스토어 · 설정 · 분류 · 쿠폰 · 공휴일
 *
 * ⚠️ **자동 생성 · 손으로 고치지 않는다.** 원본 = 기획 저장소 `rentmall-planning`
 * `apps/admin-seller/index.html` v0.4 (커밋 `f3526f4`) 를 브라우저로 연 직후의 배열을 그대로 뽑았다
 * (원본 런타임 보강까지 끝난 값 · 화면을 돌아도 바뀌지 않음을 확인). 타입은 값 모양에서 추론했다.
 *
 * 화면은 이 값을 **읽기만** 한다 — 업무 버튼은 확인 창 + 알림만이라 목록·저장본이 바뀌지 않는다.
 * 화면에 보이는 파생값(상태 흐름·배지 수·정산 금액)은 각 화면의 `.data.ts` 가 이 시드에서 계산한다.
 * 원본이 바뀌면 덤프부터 다시 뽑는다(`docs/HANDOFF.md` 셀러 절).
 * ====================================================================== */

export interface SellerStore {
  name: string;
  owner: string;
  role: string;
  email: string;
}

export const STORE: SellerStore = {
  name: "리틀베이비",
  owner: "김유진",
  role: "입점사 대표",
  email: "littlebaby@babycube.kr",
};

export interface StoreInfo {
  name: string;
  owner: string;
  bizNo: string;
  bank: string;
  tel: string;
  intro: string;
  addr: string;
  addrDetail: string;
}

export const STORE_INFO: StoreInfo = {
  name: "리틀베이비",
  owner: "김유진",
  bizNo: "201-81-45123",
  bank: "우리은행 1002-***-******",
  tel: "010-3201-1188",
  intro: "프리미엄 유아용품 전문 · 왕복 무료배송",
  addr: "서울특별시 강남구 테헤란로 123 (역삼동, 셀러타워)",
  addrDetail: "7층 701호 (06234)",
};

export interface AddressBookEntry {
  id: string;
  name: string;
  tag: string;
  addr: string;
  tel1: string;
  tel2: string;
}

export const ADDR_BOOK: AddressBookEntry[] = [
  {
    id: "A1",
    name: "리틀베이비 출고지",
    tag: "ship",
    addr: "서울특별시 강남구 테헤란로 123 (역삼동, 셀러타워) 7층 701호 (우 : 06234)",
    tel1: "02-1234-5678",
    tel2: "010-2345-6789",
  },
  {
    id: "A2",
    name: "반품교환지",
    tag: "return",
    addr: "경기도 성남시 분당구 판교역로 235 (삼평동, 에이치스퀘어) 2층 (우 : 13494)",
    tel1: "031-987-6543",
    tel2: "",
  },
  {
    id: "A3",
    name: "공항 픽업존 (인천 T1)",
    tag: "normal",
    addr: "인천국제공항 T1 3층 출국장 H카운터 앞 베이비큐브 픽업존",
    tel1: "1588-2673",
    tel2: "",
  },
  {
    id: "A4",
    name: "공항 픽업존 (김포 국내선)",
    tag: "normal",
    addr: "김포공항 국내선 2층 4번 출구 앞 베이비큐브 픽업존",
    tel1: "1588-1004",
    tel2: "",
  },
];

export interface CsSettings {
  csPhone: string;
  csHours: string;
  csLunch: string;
}

export const SET: CsSettings = {
  csPhone: "02-1234-5678",
  csHours: "운영시간. 평일 10:00 ~ 17:00 (주말·공휴일 휴무)",
  csLunch: "점심시간. 평일 13:00 ~ 14:00",
};

export interface CategoryNode {
  name: string;
  children: never[];
}

export const RENT_CATTREE: CategoryNode[] = [
  { name: "카시트", children: [] },
  { name: "아기침대", children: [] },
  { name: "유모차", children: [] },
  { name: "바운서·스윙", children: [] },
  { name: "장난감", children: [] },
  { name: "보행기·점퍼루", children: [] },
  { name: "유축기", children: [] },
  { name: "육아가전", children: [] },
];

export const SALE_CATTREE: CategoryNode[] = [
  { name: "외출·이동", children: [] },
  { name: "수면·침실", children: [] },
  { name: "놀이·발달", children: [] },
  { name: "수유가전·소독", children: [] },
  { name: "기저귀·물티슈", children: [] },
  { name: "분유·이유식", children: [] },
  { name: "목욕·위생", children: [] },
];

export interface GrowthStage {
  name: string;
  range: string;
  desc: string;
}

export const STAGES: GrowthStage[] = [
  { name: "신생아", range: "0~3개월", desc: "갓 태어난 아기를 위한 필수템" },
  { name: "영아", range: "4~12개월", desc: "뒤집기부터 첫 걸음 준비까지" },
  { name: "걸음마", range: "13~24개월", desc: "아장아장 걸음마 시기 용품" },
  { name: "유아", range: "24개월~", desc: "놀이와 배움이 커지는 시기" },
];

export interface SellerCoupon {
  id: string;
  name: string;
  dcType: string;
  dcVal: number;
  cap: string | number;
  min: number | string;
  start: string;
  end: string;
  issued: string;
  stat: string;
}

export const COUPONS: SellerCoupon[] = [
  {
    id: "CP-2608-01",
    name: "리틀베이비 여름맞이 5,000원",
    dcType: "amt",
    dcVal: 5000,
    cap: "",
    min: 30000,
    start: "2026-08-01",
    end: "2026-10-31",
    issued: "2026-08-01",
    stat: "사용",
  },
  {
    id: "CP-2608-03",
    name: "리틀베이비 상시 5% 할인",
    dcType: "rate",
    dcVal: 5,
    cap: "",
    min: "",
    start: "2026-08-01",
    end: "",
    issued: "2026-08-01",
    stat: "사용",
  },
  {
    id: "CP-2608-04",
    name: "리틀베이비 재구매 10% 할인",
    dcType: "rate",
    dcVal: 10,
    cap: 10000,
    min: "",
    start: "2026-08-02",
    end: "2026-09-30",
    issued: "2026-08-02",
    stat: "사용중지",
  },
  {
    id: "CP-2606-03",
    name: "리틀베이비 웰컴 15%",
    dcType: "rate",
    dcVal: 15,
    cap: 15000,
    min: "",
    start: "2026-06-01",
    end: "2026-08-31",
    issued: "2026-06-01",
    stat: "사용",
  },
  {
    id: "CP-2406-01",
    name: "첫 렌트 30% 할인",
    dcType: "rate",
    dcVal: 30,
    cap: 20000,
    min: 50000,
    start: "2026-06-01",
    end: "2026-12-31",
    issued: "2026-06-01",
    stat: "사용",
  },
];

export interface OpsDay {
  id: string;
  from: string;
  to: string;
  label: string;
  at: string;
}

export const HQ_OPS_CAL: OpsDay[] = [
  {
    id: "HD-01",
    from: "2026-07-30",
    to: "2026-07-30",
    label: "물류센터 정기 점검",
    at: "2026.07.27",
  },
  {
    id: "HD-02",
    from: "2026-08-01",
    to: "2026-08-01",
    label: "전사 재고 실사",
    at: "2026.07.27",
  },
  {
    id: "HD-03",
    from: "2026-08-15",
    to: "2026-08-15",
    label: "광복절",
    at: "2026.07.26",
  },
  {
    id: "HD-04",
    from: "2026-08-17",
    to: "2026-08-17",
    label: "광복절 대체공휴일",
    at: "2026.07.26",
  },
  {
    id: "HD-05",
    from: "2026-09-24",
    to: "2026-09-26",
    label: "추석 연휴",
    at: "2026.07.26",
  },
  {
    id: "HD-06",
    from: "2026-10-03",
    to: "2026-10-03",
    label: "개천절",
    at: "2026.07.26",
  },
  {
    id: "HD-07",
    from: "2026-10-09",
    to: "2026-10-09",
    label: "한글날",
    at: "2026.07.26",
  },
  {
    id: "HD-08",
    from: "2026-12-25",
    to: "2026-12-25",
    label: "성탄절",
    at: "2026.07.26",
  },
];

export const SL_OPS_CAL: OpsDay[] = [
  {
    id: "SD-01",
    from: "2026-08-03",
    to: "2026-08-07",
    label: "하계 휴무 (출고·수거 중단)",
    at: "2026.07.27",
  },
  {
    id: "SD-02",
    from: "2026-09-28",
    to: "2026-09-28",
    label: "추석 연휴 익일 자체 휴무",
    at: "2026.07.27",
  },
];
