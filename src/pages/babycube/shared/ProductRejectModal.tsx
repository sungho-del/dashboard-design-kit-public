import { useState } from "react";
import {
  Button,
  FormField,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "../../../components/ui";
import {
  REJECT_ERROR,
  REJECT_NOTICE,
  REJECT_PLACEHOLDER,
  rejectTitle,
} from "../ProductListPage.data";

/* -------------------------------------------------------------------------
 * 상품 반려 사유 창 — 원본 `_MODAL_CFG.prodreject`. **상품 목록 일괄과 상품 상세가 같은 창을 쓴다.**
 *
 * 입점 심사의 `ReviewRejectModal` 과 모양은 같지만 문구·안내(입점사 상품 관리에 그대로 표시)와
 * 결과(판매·전시가 함께 내려감)가 달라 섞지 않는다.
 * 빈 사유(공백만 포함)는 처리하지 않고 이유를 낸다. 닫거나 처리하면 적던 사유를 비운다.
 * ---------------------------------------------------------------------- */
export function ProductRejectModal({
  count,
  open,
  onClose,
  onConfirm,
}: {
  /** 실제로 반려될 건수 — 제목이 건수를 품는다(2건 이상) */
  count: number;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);

  const clear = () => {
    setReason("");
    setTried(false);
  };

  const close = () => {
    clear();
    onClose();
  };

  const submit = () => {
    if (reason.trim() === "") {
      setTried(true);
      return;
    }
    clear();
    onConfirm();
  };

  return (
    <Modal open={open} onClose={close} size="medium">
      <ModalHeader
        /* 푸터에도 "취소"가 있어 헤더 X 의 기본 라벨과 겹친다 — 이름을 갈라 준다 */
        closeLabel="대화상자 닫기"
        title={rejectTitle(count)}
      />
      <ModalBody>
        <FormField
          label="반려 사유"
          required
          error={tried && reason.trim() === "" ? REJECT_ERROR : undefined}
        >
          <Textarea
            minRows={4}
            value={reason}
            placeholder={REJECT_PLACEHOLDER}
            onChange={(event) => setReason(event.target.value)}
          />
        </FormField>
        <p className="body-small text-text-sub">{REJECT_NOTICE}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={close}>
          취소
        </Button>
        <Button variant="critical" size="large" onClick={submit}>
          반려 처리
        </Button>
      </ModalFooter>
    </Modal>
  );
}
