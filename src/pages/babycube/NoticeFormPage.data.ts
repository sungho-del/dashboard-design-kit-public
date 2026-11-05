import type { NoticeAudience } from "./NoticeListPage.data";
import { audienceLabel } from "./NoticeListPage.data";

/* -------------------------------------------------------------------------
 * 공지 상세 (등록/수정) — **도메인 층** (BabyCube 본사 운영 어드민 · BO-CSC-007)
 *
 * 짝이 되는 뼈대: `NoticeFormPage.tsx`
 * 화면 유형: **폼형** · 원본 = 기획 v0.4 `DETAILS.noticeForm`(proto.html:5009-5030)
 * 샘플·타입·경로·상태 어휘는 목록과 같은 것을 쓴다(`NoticeListPage.data.ts`) — 여기에는 폼 문구만.
 *
 * ## 갈아끼울 것
 * | 역할            | 실물 이름          |
 * | --------------- | ------------------ |
 * | 화면 문구·라벨  | `FORM_COPY`        |
 * | 머리 설명       | `formDescription`  |
 *
 * ## 검사 — 제목 · 게시 시작일 (판정 ⑬ · 디자인 §3 #14)
 * 필수는 **제목 · 게시 시작일**. 새 등록은 시작일을 오늘(시연 기준일 `DEMO_TODAY`)로 미리 채운다.
 * 종료일은 선택(비우면 상시). 글자 수 제한·시작>종료 검사는 없다(원본 `noticeSave`).
 * ---------------------------------------------------------------------- */

export const FORM_COPY = {
  /**
   * 머리 제목 — 신규 「공지 등록」 · 수정 「공지 수정」. 형제 FAQ 폼(「FAQ 등록」/「FAQ 수정」 · 사용자 결정)과
   * 같은 꼴이고, 원본 title 인자(`고객 공지 작성` / `고객 공지 수정 · N-U31`)의 뜻을 따른다.
   * (원본 상단바 「공지 상세 (등록/수정)」 — 신규 화면에서 「상세」로 읽혀 바꿨다)
   */
  pageTitle: { new: "공지 등록", edit: "공지 수정" },
  sectionContent: "공지 내용",
  sectionSetting: "게시 설정",
  titleLabel: "제목",
  titlePlaceholder: "제목을 입력해 주세요",
  /** 원본 토스트 문구 — 우리는 입력칸 아래 오류로 낸다(폼 규격 §29) */
  titleEmpty: "제목을 입력해주세요.",
  bodyLabel: "본문",
  bodyPlaceholder: "본문을 입력해 주세요",
  audienceLabel: "공지 대상",
  idLabel: "공지 ID",
  statusLabel: "노출 여부",
  pinLabel: "상단 고정",
  pinCheckbox: "목록 상단에 고정(핀)",
  periodLabel: "게시 기간",
  /** 원본 `(종료 비우면 상시)` — 형제 배너 「종료일을 비우면 상시 노출됩니다」와 같은 꼴로 */
  periodHint: "종료일을 비우면 상시 게시됩니다",
  /** 판정 ⑬ 「Q14와 같은 규칙」 → Q14 「비우면 「시작일을 입력해 주세요」」 그대로(대장 4부 NF03) */
  startEmpty: "시작일을 입력해 주세요",
  created: "공지가 등록되었습니다.",
  updated: "공지가 수정되었습니다.",
  createLabel: "등록",
  updateLabel: "저장",
  notFoundTitle: "찾을 수 없는 공지입니다",
  notFoundDescription: "주소가 잘못되었거나 삭제된 공지일 수 있습니다.",
  backToList: "공지사항 관리로",
} as const;

/**
 * 머리 설명 — 원본 `nvEditPage` 의 title 인자(`고객 공지 작성` / `고객 공지 수정 · N-U31`)는
 * 그려지지 않았다(원본 결함). 형제 상세처럼 머리 설명으로 보인다.
 */
export const formDescription = (audience: NoticeAudience, id?: string) =>
  id ? `${audienceLabel(audience)} · ${id}` : `${audienceLabel(audience)} 작성`;
