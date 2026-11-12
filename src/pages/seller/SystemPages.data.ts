import { HQ_OPS_CAL, SET, SL_OPS_CAL, STORE_INFO } from "./seed/store.data";
import { type OpsRow } from "./SystemPages.labels";

export * from "./SystemPages.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./SystemPages.labels`(개발 요청 2026-11-12 46번) */

/* =========================================================================
 * 시스템·운영 — 스토어 정보 · 설정(SO-SYS-001) · 공휴일 관리(SO-SYS-002) · 도메인
 *
 * 원본 = 기획 v0.4 `SCREENS.store`(3793) · `STORE_INFO`·`SET`(3778) · `setSave`(3788) ·
 * `SCREENS.opsCalendar`(3755) · `HQ_OPS_CAL`·`SL_OPS_CAL`(3707~3724) · `opsFormSave`(3734) · `gateOpsDel`(2765).
 *
 * ## 원본 그대로
 * - 판매자 정보는 **본사 관리 · 읽기 전용**(변경은 1:1 문의) · 고객 센터 정보만 셀러가 고친다 · [저장] = 알림
 * - 공휴일 = 본사 등록분(수정·삭제 불가 · 체크박스·[수정] 잠금) + 자사 등록분 · 연도 칩은 등록 기간에서 뽑는다
 *
 * ## 기획 확인 필요
 * - 고객 센터 「상담 전화 번호·업무 시간」 필수 표시(●)인데 원본 [저장]이 비어 있어도 저장한다 — 원본대로 둔다
 * - 공휴일 기본 연도 = 원본은 실제 오늘의 해 · 우리는 시연 기준일(2026-06-29)의 해(본사 공휴일 관리와 같다)
 * ====================================================================== */

export { STORE_INFO, SET };

export const OPS_ROWS: OpsRow[] = [
  ...HQ_OPS_CAL.map((o) => ({ ...o, own: false })),
  ...SL_OPS_CAL.map((o) => ({ ...o, own: true })),
];
