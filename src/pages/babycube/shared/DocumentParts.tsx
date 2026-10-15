import { FileText } from "lucide-react";
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextButton,
} from "../../../components/ui";
import { DOCUMENT_COPY, DOCUMENTS, type DocumentView } from "./documents";

/* -------------------------------------------------------------------------
 * 제출 서류 뷰 — 셀러 상세·입점 심사 상세 공용 (원본 `docChip` · `docModalView`)
 *
 * 디자인 시스템 부품이 아니라 **서류명·발급기관을 아는 도메인 조합물**이라
 * `components/ui` 가 아니라 BabyCube 화면 폴더에 둔다.
 * ---------------------------------------------------------------------- */

/**
 * 서류 한 줄 — `📄 사업자등록증.pdf · 등록번호 000-… · 보기 ▸`.
 * 서류는 **보기만** 한다(교체 없음) — 그래서 필수 표시를 달지 않는다.
 */
export function DocumentRow({
  fileName,
  view,
  onOpen,
}: {
  fileName: string;
  view: DocumentView;
  onOpen: () => void;
}) {
  return (
    <span className="body-medium flex flex-wrap items-center gap-2 text-text">
      <FileText size={16} strokeWidth={1.2} aria-hidden />
      <span>{fileName}</span>
      <span className="text-text-sub tabular-nums">
        {DOCUMENTS[view.key].numberLabel} {view.number}
      </span>
      <TextButton onClick={onOpen}>보기</TextButton>
    </span>
  );
}

/**
 * 서류 미리보기 창 — 실제 파일이 없어 **서류 모양의 예시**를 그린다:
 * 서류명 머리 · 번호 · 상호 · 대표자 · 발급기관. 예시라는 사실을 함께 적는다.
 * [다운로드] 는 알림만 띄운다(파일은 개발 영역).
 */
export function DocumentModal({
  view,
  onClose,
  onDownload,
}: {
  /** 열린 서류. `null` 이면 닫혀 있다 */
  view: DocumentView | null;
  onClose: () => void;
  onDownload: (label: string) => void;
}) {
  const meta = view ? DOCUMENTS[view.key] : null;

  return (
    /*
      medium(480) — 다른 확인 창(small 400)과 달리 서류 한 장을 그려 보여 줘야 한다.
      small 에서는 번호·상호 줄이 접혀 서류 모양이 무너진다.
    */
    <Modal open={view !== null} onClose={onClose} size="medium">
      {view && meta ? (
        <>
          <ModalHeader
            /* 푸터에도 "닫기"가 있어 헤더 X 의 기본 라벨과 겹친다 — 이름을 갈라 준다 */
            closeLabel="대화상자 닫기"
            title={DOCUMENT_COPY.title(meta.label, view.owner)}
          />
          <ModalBody>
            <figure className="flex flex-col overflow-hidden rounded-medium bg-surface outline-1 -outline-offset-1 outline-border">
              <figcaption className="label-medium-bold bg-surface-inverse p-3 text-center text-text-inverse">
                {meta.label}
              </figcaption>
              <dl className="body-medium grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 p-6">
                <dt className="text-text-sub">{meta.numberLabel}</dt>
                <dd className="tabular-nums text-text">{view.number}</dd>
                <dt className="text-text-sub">상호(법인)명</dt>
                <dd className="text-text">{view.owner}</dd>
                <dt className="text-text-sub">대표자</dt>
                <dd className="text-text">{view.ceo}</dd>
                <dt className="text-text-sub">발급기관</dt>
                <dd className="text-text">{meta.issuer}</dd>
              </dl>
              <p className="body-small px-6 pb-4 text-text-sub">
                {DOCUMENT_COPY.mock}
              </p>
            </figure>
            <p className="body-small text-text-sub">{DOCUMENT_COPY.note}</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" size="large" onClick={onClose}>
              닫기
            </Button>
            <Button size="large" onClick={() => onDownload(meta.label)}>
              다운로드
            </Button>
          </ModalFooter>
        </>
      ) : null}
    </Modal>
  );
}
