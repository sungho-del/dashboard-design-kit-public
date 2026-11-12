import { DEMO_TODAY } from "./processList.data";
import type { CsSettings, OpsDay } from "./seed/store.data";

/* 셀러 `SystemPages.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./SystemPages.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

export type { CsSettings };

export const STORE_COPY = {
  guide:
    "스토어 정보(상호·대표자·사업자등록번호·정산 계좌·연락처·소개)는 **본사가 관리**합니다. 변경이 필요하면 **1:1 문의**로 요청해 주세요 — 본사가 확인 후 셀러 정보에 직접 반영합니다.",
  askButton: "1:1 문의로 정보 변경 요청",
  /** 직영 계정(Q-69) — 변경 요청 통로 대신 본사 셀러 관리로 안내(`?account=direct` 미리보기 · develop 문구 = Q-69 회신 원문 · 개발 요청 42번) */
  directGuide:
    "스토어 정보(상호·대표자·사업자등록번호·정산 계좌·연락처·소개)는 **본사가 관리**합니다. 본사 어드민 **[셀러 관리]**에서 수정합니다.",
  infoSummary: "본사 관리 · 읽기 전용",
  csHelp:
    "사용자 앱 **스토어 페이지·주문 문의**에 노출되는 내 스토어 고객 응대 정보입니다. 이 구획은 **셀러가 직접 관리**합니다.",
  privacy:
    "개인정보 처리방침은 **플랫폼 공통(본사 관리)**입니다 — 셀러가 따로 작성하지 않으며, 사용자 앱 푸터의 본사 방침이 그대로 적용됩니다. 본문 수정이 필요하면 1:1 문의로 요청해 주세요.",
  /** 직영 계정 — 끝 문장만 [약관 관리](develop · 개발 요청 42번) */
  privacyDirect:
    "개인정보 처리방침은 **플랫폼 공통(본사 관리)**입니다 — 셀러가 따로 작성하지 않으며, 사용자 앱 푸터의 본사 방침이 그대로 적용됩니다. 본문 수정이 필요하면 본사 어드민 [약관 관리]에서 수정합니다.",
  privacySummary: "본사 공통 · 셀러 작성 없음",
  saved: "설정이 저장되었습니다.",
} as const;

export const CS_FIELDS: {
  key: keyof CsSettings;
  label: string;
  placeholder: string;
  max: number;
  required: boolean;
  width: string;
}[] = [
  {
    key: "csPhone",
    label: "상담 전화 번호",
    placeholder: "예) 02-1234-5678",
    max: 30,
    required: true,
    width: "max-w-60",
  },
  {
    key: "csHours",
    label: "업무 시간",
    placeholder: "예) 운영시간. 평일 10:00 ~ 17:00 (주말·공휴일 휴무)",
    max: 80,
    required: true,
    width: "max-w-130",
  },
  {
    key: "csLunch",
    label: "점심 시간",
    placeholder: "예) 점심시간. 평일 13:00 ~ 14:00",
    max: 80,
    required: false,
    width: "max-w-130",
  },
];

/* ---------- 공휴일 ---------- */

export interface OpsRow extends OpsDay {
  /** 자사 등록분 — 본사 등록분은 수정·삭제·선택 불가 */
  own: boolean;
}

const endOf = (o: OpsDay) => o.to || o.from;

/** 연도 칩 — 등록 기간에 있는 해만(「전체」 없음) */
export const yearsOf = (rows: OpsDay[]) =>
  [
    ...new Set(rows.flatMap((o) => [o.from.slice(0, 4), endOf(o).slice(0, 4)])),
  ].sort();

export const inYear = (o: OpsDay, y: string) =>
  o.from.slice(0, 4) <= y && endOf(o).slice(0, 4) >= y;

export const byStart = (a: OpsDay, b: OpsDay) => (a.from < b.from ? -1 : 1);

/** 기간 표기 — 하루면 한 날짜, 아니면 「시작 ~ 끝」(점 표기) */
export function rangeOf(o: OpsDay) {
  const f = o.from.replace(/-/g, ".");
  const t = endOf(o).replace(/-/g, ".");
  return f === t ? f : `${f} ~ ${t}`;
}

/** 기본 연도 — 시연 기준일의 해(없으면 최신 해) */
export const REFERENCE_YEAR = DEMO_TODAY.slice(0, 4);

export const OPS_COPY = {
  lockTip: "본사가 등록한 공휴일이라 수정·삭제할 수 없습니다.",
  formTitle: (edit: boolean) => `공휴일 ${edit ? "수정" : "등록"} · 자사`,
  formHelp:
    "종료일을 비우면 시작일 하루만 등록됩니다. 본사 공휴일과 겹쳐도 등록할 수 있습니다.",
  labelPlaceholder: "예) 하계 휴무",
  needStart: "시작일을 선택해주세요.",
  needLabel: "내용을 입력해주세요.",
  created: "등록되었습니다.",
  updated: "수정되었습니다.",
  noSelection: "선택된 공휴일이 없습니다.",
  deleteBody:
    "삭제하면 목록에서 사라지고 대여 불가일 계산에서도 즉시 제외됩니다.",
  deleteWarn: "삭제 후에는 되돌릴 수 없습니다.",
  deleted: (n: number) => `${n}건 삭제되었습니다.`,
} as const;
