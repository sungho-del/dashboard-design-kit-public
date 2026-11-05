import { BANNERS, findBanner, type Banner } from "./BannerListPage.data";
import { findPopup, type Popup } from "./PopupListPage.data";

/* -------------------------------------------------------------------------
 * 배너/팝업 등록·수정 — **도메인 층** (원본 v0.4 `dispDetail` proto.html:5365-5387)
 *
 * 짝: 뼈대 `DisplayFormPage.tsx`. 원본은 두 종류가 **몸통 하나를 공유**한다(3694-3695 · 5360
 * 「두 벌로 복사하면 드리프트」) — 다른 것은 다루는 배열·이미지·노출 순서·복귀 화면뿐이다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `targetOf(pathname)` 이 경로에서 **종류 + 대상**을 정한다. `new` = 등록, 실제 id = 수정,
 *   그 밖(없는 id · 조각 둘 이상 · 다른 종류의 id)은 `undefined` = 찾을 수 없음
 * - `KIND_COPY[kind]` 가 화면의 모든 글자를 든다. 배너만 `image`·`order` 를, 팝업만 `body` 를 쓴다
 * - `orderOptions(isNew)` — 고를 수 있는 노출 순서는 등록된 수 안에서만(신규는 맨 뒤 자리 하나 더 · 3709-3711)
 *
 * ## 검증 (원본 bannerSave 3731-3747 + 판정 Q14) — 문구 그대로, 표시는 입력칸 아래(형제 §29)
 * 제목 → (배너) PC 이미지 → 모바일 이미지 / (팝업) 내용 → **시작일 필수**(「시작일을 입력해 주세요」 — 판정 Q14) →
 * 시작·종료가 둘 다 있을 때 순서. 새 등록은 시작일을 오늘(시연 기준일 `DEMO_TODAY`)로 미리 채운다 ·
 * 종료일은 선택(비우면 숨길 때까지 계속 — 디자인 §1).
 * ---------------------------------------------------------------------- */

export type DisplayKind = "banner" | "popup";

export type DisplayTarget =
  | { kind: "banner"; mode: "new" }
  | { kind: "banner"; mode: "edit"; row: Banner }
  | { kind: "popup"; mode: "new" }
  | { kind: "popup"; mode: "edit"; row: Popup };

export const NEW_KEY = "new";

export const LIST_PATH: Record<DisplayKind, string> = {
  banner: "/display",
  popup: "/popups",
};

export const detailPathOf = (kind: DisplayKind, id: string) =>
  `${LIST_PATH[kind]}/${id}`;

const kindOfPath = (pathname: string): DisplayKind | undefined =>
  pathname.startsWith(`${LIST_PATH.popup}/`)
    ? "popup"
    : pathname.startsWith(`${LIST_PATH.banner}/`)
      ? "banner"
      : undefined;

/** 경로 → 종류·대상. 경로는 `/{목록}/{조각}` **한 조각**이어야 한다 */
export const targetOf = (pathname: string): DisplayTarget | undefined => {
  const kind = kindOfPath(pathname);
  if (!kind) return undefined;
  const key = pathname.slice(LIST_PATH[kind].length + 1);
  if (key === "" || key.includes("/")) return undefined;
  if (key === NEW_KEY) return { kind, mode: "new" };
  if (kind === "banner") {
    const row = findBanner(key);
    return row ? { kind, mode: "edit", row } : undefined;
  }
  const row = findPopup(key);
  return row ? { kind, mode: "edit", row } : undefined;
};

/** 노출 순서 선택지 1..N(신규는 N+1) — 시드 수에서 만든다 */
export const orderOptions = (isNew: boolean) =>
  Array.from({ length: BANNERS.length + (isNew ? 1 : 0) }, (_, index) => {
    const value = String(index + 1);
    return { value, label: value };
  });

/** `subject` = 주격 조사까지 붙인 말(배너가 · 팝업이) */
const copyOf = (word: string, subject: string, listLabel: string) => ({
  word,
  listLabel,
  /** 상단 제목 — 원본은 등록·수정 모두 「X 상세」(6339). 형제 FAQ·공지처럼 나눈다 */
  pageTitle: { new: `${word} 등록`, edit: `${word} 수정` },
  sectionTitle: `${word} 정보`,
  titleLabel: `${word} 제목`,
  titlePlaceholder: `${word} 제목을 입력해 주세요`,
  titleEmpty: `${word} 제목을 입력해주세요.`,
  /** 저장 라벨·알림 — 원본 `saveLabel`(5384) · `bannerSave`(3763) */
  saveLabel: { new: "등록", edit: "저장" },
  saved: { new: "등록되었습니다.", edit: "저장되었습니다." },
  notFoundTitle: `찾을 수 없는 ${word}입니다`,
  notFoundDescription: "해당 항목이 존재하지 않거나 삭제되었습니다.",
  /** 목록 [선택 삭제] 를 비우고 눌렀을 때(3768). 원본은 `${word}가` 고정이라 「팝업가」 — 조사만 바로잡았다 */
  noneSelected: `선택된 ${subject} 없습니다.`,
  deleteTitle: (count: number) =>
    `${word} 삭제${count > 1 ? ` (${count}건)` : ""}`,
});

export const KIND_COPY = {
  banner: copyOf("배너", "배너가", "배너 관리"),
  popup: copyOf("팝업", "팝업이", "팝업 관리"),
} as const;

/** 두 종류가 같이 쓰는 글자 */
export const COPY = {
  titleMax: 60,
  imageLabel: "이미지",
  /** 원본 `BF_SPEC.배너`(5364) */
  imageSlots: [
    { field: "pcImage", label: "PC (1080 × 480)", name: "PC 이미지" },
    {
      field: "mobileImage",
      label: "모바일 (720 × 320)",
      name: "모바일 이미지",
    },
  ] as const,
  imageHelp: [
    "JPG, PNG만 등록할 수 있습니다.",
    "10MB 이하만 등록할 수 있습니다.",
  ],
  imageEmpty: {
    pcImage: "PC 이미지를 등록해주세요.",
    mobileImage: "모바일 이미지를 등록해주세요.",
  },
  /** 업로드는 개발 영역 — 상품 상세와 같은 알림 */
  imagePending: "이미지 등록·교체·삭제는 개발 연동 시 제공됩니다.",
  bodyLabel: "내용",
  bodyPlaceholder: "팝업에 표시할 내용을 입력해 주세요",
  bodyHelp: "줄바꿈은 <br>, 굵게는 <b>…</b>로 쓸 수 있습니다.",
  bodyEmpty: "팝업 내용을 입력해주세요.",
  periodLabel: "노출 기간",
  periodHelp: "종료일을 비우면 상시 노출됩니다.",
  /** 판정 Q14 문구 그대로 */
  startEmpty: "시작일을 입력해 주세요",
  periodOrder: "종료일은 시작일보다 빠를 수 없습니다.",
  orderLabel: "노출 순서",
  statusLabel: "노출 여부",
  /** 삭제 확인 — 원본 `gateBannerDel`(2371-2378). 대상 이름은 적지 않는다(UI-323) */
  deleteLead: "삭제하면 목록에서 사라지고 ",
  deleteEmphasis: "사용자 화면에서도 즉시 내려갑니다",
  deleteTail: ".",
  irreversible: "삭제 후에는 되돌릴 수 없습니다.",
  /** `[숨김]을` 은 한 덩어리 — 괄호 뒤에서 줄이 꺾이지 않게 뼈대가 묶는다 */
  hideHint: {
    lead: "잠시 내리려는 것이라면 ",
    keep: "[숨김]을",
    tail: " 쓰세요.",
  },
  deleted: (count: number) =>
    count > 1 ? `${count}건 삭제되었습니다.` : "삭제되었습니다.",
};
