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
  Checkbox,
  useToast,
} from "../../components/ui";
import { CalcBreakdown } from "../babycube/CalcBreakdown";
import {
  ACTION_COPY,
  CLAIM_GATE_COPY,
  RETURN_CONFIRM_GATE,
  DEPOSIT_COPY,
  GATE_DONE,
  GATE_TOAST,
  shipImageMissing,
  type Gate,
} from "./gate.data";
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

export interface RequiredReasonModalProps {
  open: boolean;
  title: string;
  count: number;
  /** 입력칸 위 고지(교환으로 변경 — 비가역 · 수거 송장 삭제) */
  lead?: ReactNode;
  placeholder: string;
  notice?: ReactNode;
  emptyMessage: string;
  confirmLabel: string;
  /** 고객 안내 동의 체크 — 있으면 사유와 체크가 다 있어야 확정(develop · 개발 요청 21번) */
  consent?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/** 사유 필수 창 — 비면 알림만 내고 창은 그대로(원본). 닫거나 확정하면 비운다 */
export function RequiredReasonModal({
  open,
  title,
  count,
  lead,
  placeholder,
  notice,
  emptyMessage,
  confirmLabel,
  consent,
  onClose,
  onConfirm,
}: RequiredReasonModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const close = () => {
    setReason("");
    setAgreed(false);
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
        {notice && (
          <p className="body-small break-keep text-text-sub">{notice}</p>
        )}
        {consent && (
          <Checkbox
            label={consent}
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={close}>
          취소
        </Button>
        <Button
          variant="critical"
          size="large"
          disabled={!!consent && (!reason.trim() || !agreed)}
          onClick={() => {
            if (!reason.trim()) return toast(emptyMessage);
            setReason("");
            setAgreed(false);
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
  invoiceOptional = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  count: number;
  lead: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** 자체 수령 교환 재배송 — 송장 칸 없이 확정(develop · 개발 요청 24번) */
  invoiceOptional?: boolean;
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
        {!invoiceOptional && (
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
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={close}>
          취소
        </Button>
        <Button
          variant={danger ? "critical" : "primary"}
          size="large"
          onClick={() => {
            if (!invoiceOptional) {
              if (!courier) return toast(GATE_TOAST.courierPick);
              if (!invoice.trim()) return toast(ACTION_COPY.invoiceFirst);
            }
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
export function NoticeGateModal({
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
export function Irreversible({ children }: { children: ReactNode }) {
  return (
    <strong className="label-medium-bold text-text-critical">{children}</strong>
  );
}

/** 보증금 환급 실행 — 원본 `gateDep`. 차감이 있으면 사유 필수(고객 화면에 합계 차감액과 함께 노출) */
function DepositRefundModal({
  open,
  deposit,
  deduct,
  onClose,
  onConfirm,
}: {
  open: boolean;
  deposit: number;
  deduct: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const close = () => {
    setReason("");
    onClose();
  };
  const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
  return (
    /* 계산표가 드는 창 — [환불 처리]·주문 명세와 같은 medium */
    <Modal open={open} onClose={close} size="medium">
      <ModalHeader closeLabel="대화상자 닫기" title="보증금 환급 실행" />
      <ModalBody>
        <CalcBreakdown
          blocks={[
            {
              key: "deposit",
              emphasis: true,
              lines: [
                { key: "deposit", label: "보증금", value: won(deposit) },
                ...(deduct > 0
                  ? [
                      {
                        key: "deduct",
                        label: "차감액",
                        value: `−${won(deduct)}`,
                      },
                    ]
                  : []),
                {
                  key: "refund",
                  label: "환급 예정액",
                  value: won(Math.max(0, deposit - deduct)),
                  kind: "total" as const,
                },
              ],
            },
          ]}
        />
        {deduct > 0 && (
          <Textarea
            aria-label="차감 사유"
            minRows={3}
            placeholder="차감(통합) 사유를 입력해주세요 (필수)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        )}
        <p className="body-small break-keep text-text-sub">
          {deduct > 0 &&
            "차감 사유는 필수이며 합계 차감액과 함께 고객 화면에 노출됩니다. "}
          {DEPOSIT_COPY.refundPath} (검수 완료 후 3영업일 내 처리 · 고객 안내
          기준 7영업일 이내){" "}
          <Irreversible>실행 후 되돌릴 수 없습니다.</Irreversible>
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={close}>
          취소
        </Button>
        <Button
          size="large"
          onClick={() => {
            if (deduct > 0 && !reason.trim())
              return toast(DEPOSIT_COPY.reasonEmpty);
            setReason("");
            onConfirm();
          }}
        >
          {deduct > 0 ? "차감 후 환급 실행" : "전액환급 실행"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export interface GateHostProps {
  gate: Gate | null;
  /** 창 대상 처리단위 — 환불 창이 1건일 때 명세를 그린다 */
  units: OrderUnit[];
  onClose: () => void;
  /** 확정 — 원본 완료 알림 문구를 받는다(퍼블 범위: 상태는 그대로) */
  onDone: (message: string) => void;
  /** 출고 이미지 안내 창 [출고 이미지 등록](1건) — 그 건의 출고 이미지 자리로 데려간다 */
  onShipImage?: (unit: OrderUnit) => void;
  /**
   * 출고 이미지 장수를 모르는 자리(렌트 목록) — 「없다」고 단정하지 않는 첫 줄(develop · 개발 요청 28번).
   * 상세는 장수를 알아 이미지 0장일 때만 열고 원래 문구
   */
  shipImagesUnknown?: boolean;
}

/**
 * 게이트 창 모음 — `gate.data` `routeGate` 가 고른 창 하나를 연다. 목록과 상세가 같이 쓴다.
 * 각 창의 [확인] 은 원본 완료 알림(`GATE_DONE`)을 낸다.
 */
export function GateHost({
  gate,
  units,
  onClose,
  onDone,
  onShipImage,
  shipImagesUnknown = false,
}: GateHostProps) {
  const { toast } = useToast();
  const n = gate?.ids.length ?? 0;
  const targets = units.filter((u) => gate?.ids.includes(u.id));
  const one = n === 1 ? targets[0] : undefined;
  const rent = targets[0]?.type === "렌트";
  /** 자체 수령 — 교환 재배송을 송장 없이 */
  const selfPickup = !!one && one.shipWay === "방문 수령";
  const stat =
    gate?.kind === "reject" || gate?.kind === "refundDone" ? gate.stat : "";
  const act = gate?.kind === "shipRemind" ? gate.act : "배송 준비";
  const missing = shipImageMissing(targets).length;
  return (
    <>
      <StatusConfirmModal
        open={gate?.kind === "confirm"}
        count={n}
        current={gate?.kind === "confirm" ? gate.current : null}
        next={gate?.kind === "confirm" ? gate.next : ""}
        rent={rent}
        onClose={onClose}
        onConfirm={() =>
          gate?.kind === "confirm" &&
          onDone(
            gate.next === "배송중"
              ? ACTION_COPY.shipped(n)
              : GATE_DONE.confirm(gate.next, n, gate.skipped),
          )
        }
      />
      <NoticeGateModal
        open={gate?.kind === "rentBegin"}
        title="배송 완료 (대여 시작) 처리"
        count={n}
        confirmLabel="배송 완료 처리"
        onClose={onClose}
        onConfirm={() => onDone(GATE_DONE.rentBegin(n))}
      >
        <span>
          배송 완료 처리와 동시에 <b>&apos;대여중&apos;으로 전환</b>됩니다.
        </span>
        <span>
          이 시점이 <b>대여 시작일</b>이며 반납 예정일·연체 계산의 기준이
          됩니다.
        </span>
      </NoticeGateModal>
      <NoticeGateModal
        open={gate?.kind === "retDone"}
        title="반납완료 처리"
        count={n}
        confirmLabel="반납완료 처리"
        onClose={onClose}
        onConfirm={() => onDone(GATE_DONE.retDone(n))}
      >
        <span>
          반납완료는 <b>렌트 매출 확정 시점</b>입니다.
        </span>
        <Irreversible>전환 후 되돌릴 수 없습니다.</Irreversible>
      </NoticeGateModal>
      {/* 자체 수령 직접 반납 [반납 확인] — develop 문구(개발 요청 30·31번) */}
      <NoticeGateModal
        open={gate?.kind === "returnConfirm"}
        title={RETURN_CONFIRM_GATE.title}
        count={n}
        confirmLabel={RETURN_CONFIRM_GATE.confirm}
        onClose={onClose}
        onConfirm={() => onDone(RETURN_CONFIRM_GATE.done(n))}
      >
        <span>{RETURN_CONFIRM_GATE.body}</span>
      </NoticeGateModal>
      {/* 출고 이미지 안내 — 원본 `shipRemind`. 왼쪽 = 이미지 없이 원래 전이 · 오른쪽 = 등록하러 */}
      <Modal open={gate?.kind === "shipRemind"} onClose={onClose} size="small">
        <ModalHeader closeLabel="대화상자 닫기" title="출고 이미지 등록 안내" />
        <ModalBody>
          <div className="body-medium flex flex-col gap-1 break-keep text-text">
            <b>
              {shipImagesUnknown
                ? n > 1
                  ? `고른 ${n}건의 출고 이미지 등록 여부를 확인해주세요.`
                  : "출고 이미지 등록 여부를 확인해주세요."
                : n > 1
                  ? `고른 ${n}건 중 ${missing}건은 출고 이미지가 등록되지 않았습니다.`
                  : "출고 이미지가 아직 등록되지 않았습니다."}
            </b>
            <span>
              출고 당시 상품 상태 이미지를 등록해두면 반납 검수 시{" "}
              <b>대조 근거</b>가 됩니다.
            </span>
            <span>
              <Irreversible>
                미등록 시 발생하는 파손 분쟁의 책임은 셀러에게 귀속
              </Irreversible>
              될 수 있습니다(반납 이미지 단독으로는 보증금 차감을 주장할 수
              없습니다).
            </span>
            <span>이대로 배송 처리하시겠어요?</span>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => onDone(GATE_DONE.shipRemind(act, n))}
          >
            {act === "배송중" ? "배송중으로 변경" : "배송 준비로 변경"}
          </Button>
          <Button
            size="large"
            onClick={() => {
              /* 다건은 목록에 남는다 — 선택·상태 그대로, 어디서 등록하는지만(원본) */
              onClose();
              if (one && onShipImage) onShipImage(one);
              else toast(GATE_TOAST.shipImageInDetail);
            }}
          >
            출고 이미지 등록
          </Button>
        </ModalFooter>
      </Modal>
      <DepositRefundModal
        open={gate?.kind === "depositRefund"}
        deposit={one?.dep ?? 0}
        deduct={gate?.kind === "depositRefund" ? gate.deduct : 0}
        onClose={onClose}
        onConfirm={() =>
          gate?.kind === "depositRefund" &&
          onDone(GATE_DONE.depositRefund(gate.deduct > 0))
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
        consent={CLAIM_GATE_COPY.consent}
        onClose={onClose}
        onConfirm={() => onDone(GATE_DONE.toExchange(n))}
      />
      {/* 출고 뒤 취소 → 반품 전환 — 사유 + 고객 안내 동의(develop · 개발 요청 21번) */}
      <RequiredReasonModal
        open={gate?.kind === "toReturn"}
        title="반품 전환"
        count={n}
        lead={CLAIM_GATE_COPY.toReturnLead}
        placeholder={CLAIM_GATE_COPY.toReturnPlaceholder}
        emptyMessage="사유를 입력해주세요."
        confirmLabel="반품 전환"
        consent={CLAIM_GATE_COPY.consent}
        onClose={onClose}
        onConfirm={() => onDone(GATE_DONE.toReturn)}
      />
      {/* 반품·교환 승인 뒤 수거 송장 등록(develop · 개발 요청 23번) */}
      <InvoiceGateModal
        open={gate?.kind === "collectInvoice"}
        title={CLAIM_GATE_COPY.collectTitle}
        count={n}
        lead={CLAIM_GATE_COPY.collectLead}
        confirmLabel={CLAIM_GATE_COPY.collectTitle}
        onClose={onClose}
        onConfirm={() =>
          gate?.kind === "collectInvoice" &&
          onDone(ACTION_COPY.collected(gate.type))
        }
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
      {/* 자체 수령 교환은 송장 없이 — 제목·본문·버튼을 develop 문구로(개발 요청 24번) */}
      <InvoiceGateModal
        open={gate?.kind === "exchangeShip"}
        title={
          selfPickup
            ? CLAIM_GATE_COPY.pickupRedeliverTitle
            : "교환 재배송 송장 등록"
        }
        count={n}
        lead={
          selfPickup
            ? CLAIM_GATE_COPY.pickupRedeliverLead
            : "검수를 마친 교환 상품의 재배송 송장을 등록해주세요. 등록과 함께 '교환 재배송'으로 전환됩니다."
        }
        confirmLabel={
          selfPickup ? CLAIM_GATE_COPY.pickupRedeliverTitle : "재배송 처리"
        }
        invoiceOptional={selfPickup}
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
        {/* 누르는 순간 환불이 실행된다 — develop 문구(개발 요청 25번) */}
        <Irreversible>{CLAIM_GATE_COPY.refundDone[stat]}</Irreversible>
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
