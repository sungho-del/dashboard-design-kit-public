import { claimDetail } from "./SaleClaimDetailPage.data";
import { UNITS } from "./seed/orders.data";
import { preShipActions, type UnitDetailConfig } from "./unitDetail.data";
import { preShip } from "./RentDetailPages.labels";

export * from "./RentDetailPages.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./RentDetailPages.labels`(개발 요청 2026-11-12 46번) */

/* =========================================================================
 * 렌트 상세 6종 — **도메인 층**(화면 설정). 뼈대는 판매와 같은 공용 `UnitDetail.tsx`.
 * 렌트 발주 상세(SO-RNT-002) · 배송 상세(SO-DLV-004) · 대여·연체 상세(SO-RNT-005) · 검수·반납 상세(SO-INS-002) ·
 * 취소 상세(SO-RMA-010) · 반품 상세(SO-RMA-011)
 *
 * 원본 = 기획 v0.4 `DETAILS.rentOrderDetail|rentShipDetail|rentUseDetail|rentInspDetail|rentRmaCancel|rentRmaReturn`
 * (5023~5141) → `udOrderPage(u, cfg)` · `udRmaDetail(u, {isRent: true})`. 캡처 `orig/17·19·21·23·25·27`.
 * ====================================================================== */

/** 원본 — 렌트 처리단위면 상태를 가리지 않는다(판매 상세와 같다) */
const findRent = (id: string) =>
  UNITS.find((u) => u.id === id && u.type === "렌트");

export const RENT_ORDER_DETAIL: UnitDetailConfig = {
  screen: "rentList",
  title: "렌트 발주 관리 상세",
  listPath: "/rent-list",
  listLabel: "렌트 발주 관리로",
  find: findRent,
  statusOptions: [
    { value: "신규 주문", label: "신규 주문" },
    { value: "배송 준비", label: "배송 준비" },
    { value: "배송 지연", label: "배송 지연" },
    { value: "취소", label: "주문 취소" },
  ],
  shipMode: (u) => (preShip(u.stat) ? "register" : "ro"),
  sections: ["shipImages"],
  /* 출고 전에만 — develop 버튼 순서([배송중 전환] · [준비 완료] · [배송 지연] · [배송지 변경] · [주문 취소] · 개발 요청 29번) */
  actions: (u) => (preShip(u.stat) ? preShipActions(u) : []),
};

export const RENT_SHIP_DETAIL: UnitDetailConfig = {
  screen: "rentDispatch",
  title: "배송 관리 상세(렌트)",
  listPath: "/rent-dispatch",
  listLabel: "배송 관리로",
  find: findRent,
  /* 배송중이 아니면 선택지에 지금 상태가 없어 배지로 선다(원본 `[[u.stat,u.stat]]` 과 같은 결과) */
  statusOptions: [
    { value: "배송중", label: "배송중" },
    { value: "배송 완료", label: "배송 완료 (대여 시작)" },
  ],
  shipMode: () => "edit",
  sections: ["shipImages"],
  actions: (u) =>
    u.stat === "배송중"
      ? [
          { label: "배송 완료 처리 (대여 시작)", to: "배송 완료" },
          { label: "배송 추적", special: "track" },
        ]
      : [{ label: "대여·연체 관리로", go: "/rent-use" }],
};

/** 대여·연체 — 상태 선택지 없음(배지 · 원본 A-2·A-3) · 대여 정보에서 [수거 신청] · 연체 안내 발송 버튼 없음(A-4) */
export const RENT_USE_DETAIL: UnitDetailConfig = {
  screen: "rentUse",
  title: "대여·연체 관리 상세",
  listPath: "/rent-use",
  listLabel: "대여·연체 관리로",
  find: findRent,
  statusOptions: [],
  shipMode: () => "ro",
  sections: ["rentInfo"],
  depositInProduct: true,
  collectMode: () => "request",
  actions: () => [],
};

export const RENT_INSP_DETAIL: UnitDetailConfig = {
  screen: "rentInspReturn",
  title: "검수·반납 관리 상세",
  listPath: "/rent-insp-return",
  listLabel: "검수·반납 관리로",
  find: findRent,
  statusOptions: [
    { value: "수거 신청", label: "수거 신청" },
    { value: "검수중", label: "검수중" },
    { value: "연체중", label: "연체중 (회수 실패)" },
    { value: "검수완료", label: "검수완료" },
    { value: "반납완료", label: "반납완료" },
  ],
  shipMode: () => "ro",
  sections: ["rentInfo", "inspect", "deposit", "care", "photos"],
  depositInProduct: true,
  collectMode: (u) => (u.stat === "수거 신청" ? "edit" : "ro"),
  actions: () => [],
};

export const RENT_CANCEL_DETAIL = claimDetail("취소", "렌트");
export const RENT_RMA_DETAIL = claimDetail("반품", "렌트");
