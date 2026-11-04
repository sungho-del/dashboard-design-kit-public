import { useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
  Tag,
  Textarea,
  useToast,
} from "../../components/ui";
import { REASON_MAX, tipOf, toneOf } from "./orderUnit.data";

/* =========================================================================
 * 상태 전이 게이트 — 원본 `gateRoute` 가 여는 창(기획 v0.4 · 2026-08-06 게이트 판정).
 * **목록 머리 버튼 · 상세 상태 셀렉트 · 상세 버튼이 같은 창을 쓴다.** 판매·렌트 처리 화면 공용.
 *
 * - 「상태 변경 확인」(원본 `gateConfirm`) — 전용 창이 없는 정상 전이. 어느 상태로 바뀌는지만 말한다
 *   (원본 2026-08-07 판정: 「대상: 주문번호 · 상품명」 줄을 두지 않는다 — 고른 건마다 문면이 달라진다)
 * - 사유 입력(원본 `delay` · `gateSellerCancel`) — 프리셋 + 직접입력(50자)
 *
 * 퍼블 범위: [확인] 은 **알림까지**다. 상태는 바뀌지 않는다(원본은 실제로 바꾼다 — 개발 영역).
 * 알림 문구는 부르는 화면이 원본 그대로 낸다.
 * ====================================================================== */

const titleWithCount = (title: string, count: number) =>
  count > 1 ? `${title} (${count}건)` : title;

/** 상태 배지 — 본사와 같은 꼴(점 + 작은 칩) */
export function StatusTag({ status }: { status: string }) {
  return (
    <Tag tone={toneOf(status)} dot size="small">
      {status}
    </Tag>
  );
}

export interface StatusConfirmModalProps {
  open: boolean;
  /** 고른 건수 — 머리의 (N건) */
  count: number;
  /**
   * 지금 상태. 다건인데 섞여 있으면 `null` — 대표 하나를 세우면 나머지 건의 현재 상태를
   * 잘못 말하게 된다(원본 주석) — 그때는 「대상 · 선택한 N건」을 낸다
   */
  current: string | null;
  /** 바뀔 상태(배지 글자) */
  next: string;
  /** 렌트 화면이면 렌트용 설명 */
  rent?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** 원본 `gateConfirm` — 현재 → 변경 후 + 그 상태의 설명 한 줄 */
export function StatusConfirmModal({
  open,
  count,
  current,
  next,
  rent = false,
  onClose,
  onConfirm,
}: StatusConfirmModalProps) {
  const tip = tipOf(next, rent);
  return (
    <Modal open={open} onClose={onClose} size="small">
      <ModalHeader
        closeLabel="대화상자 닫기"
        title={titleWithCount("상태 변경 확인", count)}
      />
      <ModalBody>
        {/*
          전이 상자 — 이 창의 결정거리를 회색 면으로 떼어 아래 설명과 역할을 가른다(원본 판정 ⑤ⓐ).
          라벨이 「이 상태로 변경합니다」 문장을 대신한다. 배지 뒤에 조사를 붙이지 않는다(받침마다 갈린다).
        */}
        <div className="flex items-center gap-4 rounded-medium bg-surface-sub p-4">
          <div className="flex flex-1 flex-col gap-1">
            <span className="label-small text-text-sub">
              {current ? "현재" : "대상"}
            </span>
            {current ? (
              <span>
                <StatusTag status={current} />
              </span>
            ) : (
              <strong className="label-medium-bold text-text">
                선택한 {count}건
              </strong>
            )}
          </div>
          <ArrowRight
            size={16}
            strokeWidth={1.2}
            aria-hidden
            className="text-icon-sub"
          />
          <div className="flex flex-1 flex-col gap-1">
            <span className="label-small text-text-sub">변경 후</span>
            <span>
              <StatusTag status={next} />
            </span>
          </div>
        </div>
        {tip && <p className="body-small break-keep text-text-sub">{tip.d}</p>}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={onClose}>
          취소
        </Button>
        <Button variant="primary" size="large" onClick={onConfirm}>
          확인
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export interface ReasonModalProps {
  open: boolean;
  /** 머리 — 「배송 지연 사유」 · 「주문 취소 사유」 */
  title: string;
  count: number;
  /** 프리셋. 마지막이 「직접입력」이다(원본) */
  presets: readonly string[];
  /** 프리셋 위 안내 한 줄(원본 배송 지연에만 있다) */
  intro?: string;
  /** 직접입력일 때 글상자 안내 — 「지연 사유를 직접 입력해주세요 (최대 50자)」 */
  customPlaceholder: string;
  /** 직접입력인데 비었을 때 알림 — 「지연 사유를 입력해주세요.」 */
  emptyMessage: string;
  /** 글상자 아래 고지(원본 주문 취소 — 수수료 면제 · 고객 노출) */
  notice?: ReactNode;
  confirmLabel: string;
  /** 되돌릴 수 없는 전이(주문 취소)는 위험 버튼 */
  danger?: boolean;
  onClose: () => void;
  /** 확정된 사유(프리셋 글자 또는 직접 입력한 글) */
  onConfirm: (reason: string) => void;
}

const CUSTOM = "직접입력";

/**
 * 원본 `delay` · `gateSellerCancel` — 사유를 하나 고르고, 「직접입력」이면 50자까지 적는다.
 * 직접입력이 아니면 글상자는 잠긴다. 닫거나 확정하면 고른 것·적은 것을 비운다.
 */
export function ReasonModal({
  open,
  title,
  count,
  presets,
  intro,
  customPlaceholder,
  emptyMessage,
  notice,
  confirmLabel,
  danger = false,
  onClose,
  onConfirm,
}: ReasonModalProps) {
  const { toast } = useToast();
  const [choice, setChoice] = useState<string>(presets[0]);
  const [custom, setCustom] = useState("");
  const isCustom = choice === CUSTOM;

  const clear = () => {
    setChoice(presets[0]);
    setCustom("");
  };
  const close = () => {
    clear();
    onClose();
  };
  const submit = () => {
    const reason = isCustom ? custom.trim() : choice;
    /* 원본: 직접입력인데 비었으면 알림만 내고 창은 그대로 */
    if (!reason) {
      toast(emptyMessage);
      return;
    }
    clear();
    onConfirm(reason);
  };

  return (
    <Modal open={open} onClose={close} size="small">
      <ModalHeader
        closeLabel="대화상자 닫기"
        title={titleWithCount(title, count)}
      />
      <ModalBody>
        {intro && <p className="body-small text-text-sub">{intro}</p>}
        <RadioGroup aria-label={title} value={choice} onValueChange={setChoice}>
          {presets.map((preset) => (
            <Radio key={preset} value={preset} label={preset} />
          ))}
        </RadioGroup>
        <Textarea
          aria-label={`${title} 직접입력`}
          minRows={3}
          maxLength={REASON_MAX}
          disabled={!isCustom}
          placeholder={
            isCustom ? customPlaceholder : "직접입력 선택 시 작성할 수 있습니다"
          }
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
        />
        {notice && (
          <p className="body-small break-keep text-text-sub">{notice}</p>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={close}>
          취소
        </Button>
        <Button
          variant={danger ? "critical" : "primary"}
          size="large"
          onClick={submit}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
