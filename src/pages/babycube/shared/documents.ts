/* -------------------------------------------------------------------------
 * 제출 서류 — 셀러 상세·입점 심사 상세가 함께 쓰는 **도메인** (원본 `_DOC_META` · `docModalView`)
 *
 * 두 화면 모두 사업자등록증·통신판매업신고증을 같은 모양으로 보여 주고 같은 미리보기 창을 연다.
 * 한쪽 페이지의 data 파일을 다른 페이지가 읽으면 페이지끼리 묶이므로 여기에 둔다.
 * 뷰는 `DocumentParts.tsx` 다.
 * ---------------------------------------------------------------------- */

/** 서류 2종 — 레코드의 필드 이름(`bizLicense`·`salesLicense`)이 곧 키다 */
export const DOCUMENTS = {
  bizLicense: {
    label: "사업자등록증",
    numberLabel: "등록번호",
    issuer: "국세청",
  },
  salesLicense: {
    label: "통신판매업신고증",
    numberLabel: "신고번호",
    issuer: "관할 시·군·구청",
  },
} as const;

export type DocumentKey = keyof typeof DOCUMENTS;

export const DOCUMENT_KEYS = Object.keys(DOCUMENTS) as DocumentKey[];

/** 미리보기 창 문구 — 실제 파일이 아니라는 사실을 함께 밝힌다 */
export const DOCUMENT_COPY = {
  title: (label: string, owner: string) => `${label} — ${owner}`,
  note: "첨부된 서류 이미지입니다. 아래 다운로드로 원본을 내려받을 수 있습니다.",
  /* 퍼블 기준본이라 실제 서류가 연결돼 있지 않다 — 예시를 실물로 오해하지 않게 */
  mock: "예시 미리보기 · 실제 서류 미연동",
  downloaded: (label: string) => `${label} 다운로드`,
};

/** 미리보기 창이 그리는 값 — 페이지가 자기 레코드에서 채운다 */
export interface DocumentView {
  key: DocumentKey;
  number: string;
  /** 상호(법인)명 */
  owner: string;
  ceo: string;
}
