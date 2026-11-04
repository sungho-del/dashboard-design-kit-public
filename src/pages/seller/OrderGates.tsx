import { useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
  Select,
  Tag,
  Textarea,
  useToast,
} from "../../components/ui";
import { CalcBreakdown } from "../babycube/CalcBreakdown";
import { ACTION_COPY, GATE_DONE, GATE_TOAST, type Gate } from "./gate.data";
import {
  CANCEL_GATE,
  COURIERS,
  DELAY_GATE,
  DELAY_PRESETS,
  REASON_MAX,
  SELLER_CANCEL_PRESETS,
  tipOf,
  toneOf,
} from "./orderUnit.data";
import type { OrderUnit } from "./seed/orders.data";
import { statementBlocksOf } from "./unitDetail.data";

/* =========================================================================
 * 상태 전이 게이트 — 원본 `gateRoute` 가 여는 창(기획 v0.4 · 2026-08-06 게이트 판정).
 * **목록 머리 버튼 · 상세 상태 셀렉트 · 상세 버튼이 같은 창을 쓴다.** 판매·렌트 처리 화면 공용.
 *
 * - 「상태 변경 확인」(원본 `gateConfirm`) — 전용 창이 없는 정상 전이. 어느 상태로 바뀌는지만 말한다
 *   (원본 2026-08-07 판정: 「대상: 주문번호 · 상품명」 줄을 두지 않는다 — 고른 건마다 문면이 달라진다)
 * - 사유 입력(원본 `delay` · `gateSellerCancel`) — 프리셋 + 직접입력(50자)
 *
 * - 클레임·배송 완료 창(아래 `GateHost`) — 사유 필수 · 송장 입력 · 환불 미리보기 · 고지 확인
 *
 * 어느 창을 열지는 `gate.data` `routeGate` 가 정한다. 화면은 `GateHost` 하나만 둔다.
 * 퍼블 범위: [확인] 은 **알림까지**다. 상태는 바뀌지 않는다(원본은 실제로 바꾼다 — 개발 영역).
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

type GateModalProps = Pick<
  ReasonModalProps,
  "open" | "count" | "onClose" | "onConfirm"
>;

/** 배송 지연 사유 창 — 목록 [배송 지연] · 상세 셀렉트가 같은 창을 연다 */
export function DelayReasonModal(props: GateModalProps) {
  return (
    <ReasonModal
      {...props}
      title={DELAY_GATE.title}
      presets={DELAY_PRESETS}
      intro={DELAY_GATE.intro}
      customPlaceholder={DELAY_GATE.placeholder}
      emptyMessage={DELAY_GATE.empty}
      confirmLabel={DELAY_GATE.confirm}
    />
  );
}

/** 셀러 직권 취소 사유 창 — 목록 [주문 취소] · 상세 셀렉트·[주문 취소]가 같은 창을 연다(원본 고지문 그대로) */
export function SellerCancelModal(props: GateModalProps) {
  return (
    <ReasonModal
      {...props}
      title={CANCEL_GATE.title}
      presets={SELLER_CANCEL_PRESETS}
      customPlaceholder={CANCEL_GATE.placeholder}
      emptyMessage={CANCEL_GATE.empty}
      notice={
        <>
          고객이 요청하지 않은 <b>셀러 사정 취소</b>라 사유를 남겨야 합니다.
          셀러 사정 취소로 기록되어 <b>취소 수수료가 면제</b>되고 결제 금액이
          전액 환불되며, 입력한 사유는 <b>고객 주문 내역에 노출</b>됩니다.
        </>
      }
      confirmLabel={CANCEL_GATE.confirm}
      danger
    />
  );
}

/* =========================================================================
 * 클레임·배송 완료 게이트 — 원본 `gateReject`·`gateToExch`·`gateReship`·`gateExchShip`·
 * `gateRefundStart`·`gateRefundDone`·`gateSaleDone`. 문구는 원본 글자 그대로
 * ====================================================================== */

interface RequiredReasonModalProps {
  open: boolean;
  title: string;
  count: number;
  /** 입력칸 위 고지(교환으로 변경 — 비가역 · 수거 송장 삭제) */
  lead?: ReactNode;
  placeholder: string;
  notice: ReactNode;
  emptyMessage: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/** 사유 필수 창 — 비면 알림만 내고 창은 그대로(원본). 닫거나 확정하면 비운다 */
function RequiredReasonModal({
  open,
  title,
  count,
  lead,
  placeholder,
  notice,
  emptyMessage,
  confirmLabel,
  onClose,
  onConfirm,
}: RequiredReasonModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const close = () => {
    setReason("");
    onClose();
  };
  return (
    <Modal open={open} onClose={close} size="small">
      <ModalHeader
        closeLabel="대화상자 닫기"
        title={titleWithCount(title, count)}
      />
      <ModalBody>
        {lead && <p className="body-medium break-keep text-text">{lead}</p>}
        <Textarea
          aria-label={`${title} 사유`}
          minRows={3}
          placeholder={placeholder}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <p className="body-small break-keep text-text-sub">{notice}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={close}>
          취소
        </Button>
        <Button
          variant="critical"
          size="large"
          onClick={() => {
            if (!reason.trim()) return toast(emptyMessage);
            setReason("");
            onConfirm(reason.trim());
          }}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

const GATE_COURIERS = [
  { value: "", label: "택배사 선택" },
  ...COURIERS.map((c) => ({ value: c, label: c })),
];

/** 송장 입력 창 — 재반송·교환 재배송. 택배사 → 송장번호 순으로 막는다(원본) */
function InvoiceGateModal({
  open,
  title,
  count,
  lead,
  confirmLabel,
  danger = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  count: number;
  lead: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { toast } = useToast();
  const [courier, setCourier] = useState("");
  const [invoice, setInvoice] = useState("");
  const clear = () => {
    setCourier("");
    setInvoice("");
  };
  const close = () => {
    clear();
    onClose();
  };
  return (
    <Modal open={open} onClose={close} size="small">
      <ModalHeader
        closeLabel="대화상자 닫기"
        title={titleWithCount(title, count)}
      />
      <ModalBody>
        <p className="body-medium break-keep text-text">{lead}</p>
        <div className="flex gap-2">
          <Select
            className="w-40"
            aria-label="택배사"
            options={GATE_COURIERS}
            value={courier}
            onValueChange={setCourier}
          />
          <Input
            inputMode="numeric"
            aria-label="송장번호"
            placeholder="송장번호 입력"
            value={invoice}
            onChange={(event) => setInvoice(event.target.value)}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={close}>
          취소
        </Button>
        <Button
          variant={danger ? "critical" : "primary"}
          size="large"
          onClick={() => {
            if (!courier) return toast(GATE_TOAST.courierPick);
            if (!invoice.trim()) return toast(ACTION_COPY.invoiceFirst);
            clear();
            onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/** 고지 확인 창 — 되돌릴 수 없는 전이의 결과를 먼저 말한다(환불 완료·배송 완료) */
function NoticeGateModal({
  open,
  title,
  count,
  children,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  count: number;
  children: ReactNode;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} size="small">
      <ModalHeader
        closeLabel="대화상자 닫기"
        title={titleWithCount(title, count)}
      />
      <ModalBody>
        <div className="body-medium flex flex-col gap-1 break-keep text-text">
          {children}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={onClose}>
          취소
        </Button>
        <Button size="large" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/** 되돌릴 수 없음 고지 — 원본 빨간 굵은 글자 */
function Irreversible({ children }: { children: ReactNode }) {
  return (
    <strong className="label-medium-bold text-text-critical">{children}</strong>
  );
}

export interface GateHostProps {
  gate: Gate | null;
  /** 창 대상 처리단위 — 환불 창이 1건일 때 명세를 그린다 */
  units: OrderUnit[];
  onClose: () => void;
  /** 확정 — 원본 완료 알림 문구를 받는다(퍼블 범위: 상태는 그대로) */
  onDone: (message: string) => void;
}

/**
 * 게이트 창 모음 — `gate.data` `routeGate` 가 고른 창 하나를 연다. 목록과 상세가 같이 쓴다.
 * 각 창의 [확인] 은 원본 완료 알림(`GATE_DONE`)을 낸다.
 */
export function GateHost({ gate, units, onClose, onDone }: GateHostProps) {
  const n = gate?.ids.length ?? 0;
  const one = n === 1 ? units.find((u) => u.id === gate?.ids[0]) : undefined;
  const stat =
    gate?.kind === "reject" || gate?.kind === "refundDone" ? gate.stat : "";
  return (
    <>
      <StatusConfirmModal
        open={gate?.kind === "confirm"}
        count={n}
        current={gate?.kind === "confirm" ? gate.current : null}
        next={gate?.kind === "confirm" ? gate.next : ""}
        onClose={onClose}
        onConfirm={() =>
          gate?.kind === "confirm" && onDone(GATE_DONE.confirm(gate.next, n))
        }
      />
      <DelayReasonModal
        open={gate?.kind === "delay"}
        count={n}
        onClose={onClose}
        onConfirm={(reason) => onDone(GATE_DONE.delay(reason, n))}
      />
      <SellerCancelModal
        open={gate?.kind === "sellerCancel"}
        count={n}
        onClose={onClose}
        onConfirm={() => onDone(GATE_DONE.sellerCancel)}
      />
      <RequiredReasonModal
        open={gate?.kind === "reject"}
        title={`${stat} 사유 입력`}
        count={n}
        placeholder="사유를 입력해주세요 (필수)"
        notice="사유 없이 처리할 수 없습니다. 입력한 사유는 고객 주문 내역에 그대로 노출됩니다."
        emptyMessage="사유를 입력해주세요."
        confirmLabel={`${stat} 처리`}
        onClose={onClose}
        onConfirm={() => onDone(GATE_DONE.reject(stat, n))}
      />
      <RequiredReasonModal
        open={gate?.kind === "toExchange"}
        title="교환으로 변경"
        count={n}
        lead={
          <>
            반품(환불) 건을 <b>교환(재배송)</b>으로 바꿉니다. 등록된{" "}
            <b>수거 송장이 삭제</b>되고 이후 진행은 [교환 관리]에서 이어집니다.{" "}
            <Irreversible>변경 후 반품으로 되돌릴 수 없습니다.</Irreversible>
          </>
        }
        placeholder="유형 변경 사유를 입력해주세요 (필수 — 예: 고객 요청으로 동일 상품 교환 합의, 단순 부품 불량이라 교환으로 처리)"
        notice={
          <>
            입력한 사유는 <b>고객에게 통지</b>되고 클레임 이력에 기록됩니다.
            고객이 환불을 기대하고 있던 건이므로 합의 내용을 구체적으로
            적어주세요.
          </>
        }
        emptyMessage="유형 변경 사유를 입력해주세요."
        confirmLabel="교환으로 변경"
        onClose={onClose}
        onConfirm={() => onDone(GATE_DONE.toExchange(n))}
      />
      <InvoiceGateModal
        open={gate?.kind === "reship"}
        title="재반송 처리"
        count={n}
        lead={
          <>
            <Irreversible>
              재반송은 종결 상태입니다 — 처리 후 되돌릴 수 없습니다.
            </Irreversible>{" "}
            반려·거부된 상품을 고객에게 되돌려 보내는 송장을 등록해주세요.
          </>
        }
        confirmLabel="재반송 처리"
        danger
        onClose={onClose}
        onConfirm={() => onDone(GATE_DONE.reship)}
      />
      <InvoiceGateModal
        open={gate?.kind === "exchangeShip"}
        title="교환 재배송 송장 등록"
        count={n}
        lead="검수를 마친 교환 상품의 재배송 송장을 등록해주세요. 등록과 함께 '교환 재배송'으로 전환됩니다."
        confirmLabel="재배송 처리"
        onClose={onClose}
        onConfirm={() => onDone(GATE_DONE.exchangeShip(n))}
      />
      {/* 환불 처리 — 원본 `gateRefundStart`: 1건이면 그 건의 명세(환불 미리보기) */}
      <Modal
        open={gate?.kind === "refundStart"}
        onClose={onClose}
        size="medium"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={titleWithCount("환불 처리", n)}
        />
        <ModalBody>
          {one && <CalcBreakdown blocks={statementBlocksOf(one, true)} />}
          <p className="body-small text-text-sub">
            {one ? "위 내역" : "선택한 건의 환불 내역"} 기준으로 환불이
            진행됩니다. 확정하면 &apos;환불 처리중&apos;으로 변경됩니다.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="large" onClick={onClose}>
            취소
          </Button>
          <Button size="large" onClick={() => onDone(GATE_DONE.refundStart(n))}>
            환불 처리 시작
          </Button>
        </ModalFooter>
      </Modal>
      <NoticeGateModal
        open={gate?.kind === "refundDone"}
        title={`${stat} 처리`}
        count={n}
        confirmLabel={`${stat} 처리`}
        onClose={onClose}
        onConfirm={() => onDone(GATE_DONE.refundDone(stat, n))}
      >
        <span>환불 실행이 완료되었음을 확정합니다.</span>
        <Irreversible>처리 후 되돌릴 수 없습니다.</Irreversible>
      </NoticeGateModal>
      <NoticeGateModal
        open={gate?.kind === "saleDone"}
        title="배송 완료 처리"
        count={n}
        confirmLabel="배송 완료 처리"
        onClose={onClose}
        onConfirm={() => onDone(GATE_DONE.saleDone(n))}
      >
        <span>배송 완료로 전환합니다.</span>
        <span>
          완료일로부터 <b>7일 경과 시 자동 구매확정</b>되며, 구매확정 후에는
          취소·반품·교환 접수가 종결됩니다.
        </span>
      </NoticeGateModal>
    </>
  );
}
