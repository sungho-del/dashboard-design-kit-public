import { useRef, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2, ZoomIn } from "lucide-react";
import {
  Button,
  IconButton,
  InfoItem,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalHeader,
  Select,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  useToast,
} from "../../components/ui";
import { cn } from "../../lib/cn";
import { CalcBreakdown } from "../babycube/CalcBreakdown";
import { ACTION_COPY, DEPOSIT_COPY } from "./gate.data";
import { NoticeGateModal, StatusTag } from "./OrderGates";
import { COURIERS, careOf } from "./orderUnit.data";
import { collectAllowed } from "./processList.data";
import type { OrderUnit } from "./seed/orders.data";
import type { RentDetailState } from "./useRentDetail";
import {
  INSPECT_COPY,
  careCoveredOf,
  careTextOf,
  judgmentDescOf,
  judgmentOptionsOf,
  RENT_INSP_COPY,
  type Judgment,
  RENT_USE_COPY,
  extensionsOf,
  orNone,
  pickupChangeOf,
  receiverOf,
  receiverTelOf,
  rentTermOf,
  type CollectMode,
} from "./unitDetail.data";

/* =========================================================================
 * 렌트 상세의 중간 구역 — 원본 `udShipImgBody` · 대여 정보 · 검수 판정 · 보증금 정산 · 안심케어 청구 ·
 * `udInspPhoto`(기획 v0.4 4615~4694 · 5056~5141). 뼈대 `UnitDetail` 이 상품정보와 배송정보 사이에 끼운다.
 *
 * 퍼블 범위(GPT 검토 A안): 판정·차감액·청구 금액·이미지·수거 송장은 **화면 안에서만** 바뀐다(시드는 그대로 ·
 * 다른 건으로 가면 처음부터). 상태 전이(검수완료·환급대기·청구 접수)는 하지 않는다. 환급 실행은 창 + 알림.
 * 상태는 `useRentDetail` 하나가 갖는다 — 구역을 접어도 적은 것이 사라지지 않게.
 * ====================================================================== */

/** 라벨 폭 — 가장 긴 라벨 「상품주문상태」·「수령인 연락처」가 한 줄에 들도록. 모든 구역이 같은 폭(§30-3) */
const LABEL_WIDTH = 120;
export const Item = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <InfoItem label={label} labelWidth={LABEL_WIDTH}>
    {children}
  </InfoItem>
);

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const MAX_IMAGES = 10;
const IMAGE_ACCEPT = ".jpg,.jpeg,.png";

/* -------------------------------------------------------------------------
 * 이미지 칸 — 원본 `pimg-row`(확대 · 교체 · 삭제 · + 상자). 최대 10장, JPG·PNG
 * ---------------------------------------------------------------------- */

function ImageGrid({
  label,
  images,
  onChange,
  makeUrl,
  replaceable = false,
}: {
  label: string;
  images: string[];
  /** 없으면 읽기(확대만) */
  onChange?: (next: string[]) => void;
  makeUrl?: (file: File) => string;
  replaceable?: boolean;
}) {
  const { toast } = useToast();
  const [zoom, setZoom] = useState<number | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const replacing = useRef<number | null>(null);

  const pick = (index: number | null) => {
    replacing.current = index;
    picker.current?.click();
  };
  const onFiles = (files: File[]) => {
    if (!files.length || !onChange || !makeUrl) return;
    const at = replacing.current;
    if (at !== null) {
      onChange(images.map((src, i) => (i === at ? makeUrl(files[0]) : src)));
      return;
    }
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return toast(INSPECT_COPY.imageMax(0));
    if (files.length > room) toast(INSPECT_COPY.imageMax(room));
    onChange([...images, ...files.slice(0, room).map(makeUrl)]);
  };

  return (
    <>
      <ul className="flex flex-wrap gap-3" aria-label={label}>
        {images.map((src, index) => (
          <li
            key={`${src.slice(-24)}-${index}`}
            className="relative size-24 overflow-hidden rounded-medium outline outline-1 -outline-offset-1 outline-border"
          >
            <img
              src={src}
              alt={`${label} ${index + 1}`}
              className="size-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-surface/80 p-1">
              <IconButton
                variant="ghost"
                size="small"
                label={`${label} ${index + 1} 확대`}
                icon={<ZoomIn strokeWidth={1.2} aria-hidden />}
                onClick={() => setZoom(index)}
              />
              {onChange && replaceable && (
                <IconButton
                  variant="ghost"
                  size="small"
                  label={`${label} ${index + 1} 교체`}
                  icon={<Pencil strokeWidth={1.2} aria-hidden />}
                  onClick={() => pick(index)}
                />
              )}
              {onChange && (
                <IconButton
                  variant="ghost"
                  size="small"
                  label={`${label} ${index + 1} 삭제`}
                  icon={<Trash2 strokeWidth={1.2} aria-hidden />}
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                />
              )}
            </span>
          </li>
        ))}
        {onChange && images.length < MAX_IMAGES && (
          <li>
            <button
              type="button"
              aria-label={`${label} 추가`}
              onClick={() => pick(null)}
              className="flex size-24 items-center justify-center rounded-medium bg-surface-sub text-icon-sub outline outline-1 -outline-offset-1 outline-border hover:outline-border-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
              <Plus size={24} strokeWidth={1.2} aria-hidden />
            </button>
          </li>
        )}
      </ul>
      {onChange && (
        <input
          ref={picker}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          hidden
          aria-label={`${label} 파일 선택`}
          onChange={(event) => {
            onFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      )}
      <Modal open={zoom !== null} onClose={() => setZoom(null)} size="large">
        <ModalHeader closeLabel="대화상자 닫기" title={label} />
        <ModalBody>
          {zoom !== null && images[zoom] && (
            <img
              src={images[zoom]}
              alt={`${label} ${zoom + 1}`}
              className="w-full rounded-medium"
            />
          )}
        </ModalBody>
      </Modal>
    </>
  );
}

const Help = ({ children }: { children: ReactNode }) => (
  <p className="body-small break-keep text-text-sub">{children}</p>
);
const Warn = ({ children }: { children: ReactNode }) => (
  <b className="text-text-critical">{children}</b>
);

/** 출고 이미지 — 원본 `udShipImgBody`(선택 등록 · 최대 10장 · 분쟁 책임 고지) */
export function ShipImagesBody({ state }: { state: RentDetailState }) {
  return (
    <div className="flex flex-col gap-3">
      <ImageGrid
        label="출고 이미지"
        images={state.shipImages}
        onChange={state.setShipImages}
        makeUrl={state.makeUrl}
        replaceable
      />
      <Help>
        이미지 크기 : 최대 1000 X 1000px, 최소 300 X 300px 이상 · 이미지 형식 :
        jpg,png 형식의 이미지만 등록 가능합니다. · 이미지 용량 : 1MB 이하 (최대
        5MB) · 출고 이미지는 <b>선택 등록 · 최대 10장</b>입니다.
      </Help>
      <Help>
        출고 당시 상품 상태 이미지를 등록해두면 반납 검수 시 <b>대조 근거</b>가
        됩니다. <Warn>미등록 시 발생하는 파손 분쟁의 책임은 셀러에게 귀속</Warn>
        될 수 있습니다(반납 이미지 단독으로는 보증금 차감을 주장할 수 없습니다).
      </Help>
    </div>
  );
}

const COURIER_OPTIONS = [
  { value: "", label: "선택" },
  ...COURIERS.map((c) => ({ value: c, label: c })),
];

/**
 * 대여 정보 — 원본 `rentUseDetail`·`rentInspDetail` `rentInfo`. 대여·연체는 [수거 신청](수거 송장 등록),
 * 검수·반납은 안심케어·검수 판정 줄이 더 서고 수거 신청 건만 [송장수정]
 */
/**
 * 회수지 변경 요청 상자 — develop `PickupChangeBox` 를 퍼블 부품으로(개발 요청 31번).
 * 고객 접수 요청을 [확정]하면 그 주소가 회수지가 된다. 확정 전 요청은 수거 송장 등록 때 자동 마감
 */
function PickupChangeBox({ u }: { u: OrderUnit }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const change = pickupChangeOf(u);
  if (!change) return null;
  const { request, confirmed } = change;
  /* 수거 송장이 이미 있으면 확정할 수 없다(마감) */
  const canConfirm = !u.retInvoice;
  return (
    <div className="flex flex-col gap-2 rounded-medium bg-surface-sub p-4">
      {request && (
        <div className="flex flex-wrap items-center gap-2">
          <b className="label-medium-bold text-text">
            {RENT_USE_COPY.pickupTitle}
          </b>
          <span className="body-medium break-keep text-text">
            접수 {request.at} · {receiverOf(u)} · {receiverTelOf(u)} ·{" "}
            {request.address}
            {request.note ? ` · 메모 ${request.note}` : ""}
          </span>
          {canConfirm ? (
            <Button
              variant="secondary"
              size="small"
              title={RENT_USE_COPY.pickupConfirm}
              onClick={() => setOpen(true)}
            >
              확정
            </Button>
          ) : (
            <span className="body-small text-text-sub">
              {RENT_USE_COPY.pickupClosed}
            </span>
          )}
        </div>
      )}
      {confirmed && (
        <p className="body-medium break-keep text-text">
          <b>{RENT_USE_COPY.pickupConfirmed}</b> · {confirmed.at} ·{" "}
          {confirmed.address}
        </p>
      )}
      <p className="body-small break-keep text-text-sub">
        {RENT_USE_COPY.pickupHelp}
      </p>
      <NoticeGateModal
        open={open}
        title={RENT_USE_COPY.pickupGateTitle}
        count={1}
        confirmLabel="확정"
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          toast(RENT_USE_COPY.pickupDone);
        }}
      >
        <span>{RENT_USE_COPY.pickupConfirm}</span>
      </NoticeGateModal>
    </div>
  );
}

/** 연장 이력 표 — develop 열 그대로(개발 요청 31번). 없으면 「연관 항목 없음」 */
function ExtensionHistory({ u }: { u: OrderUnit }) {
  const rows = extensionsOf(u);
  return (
    <section className="flex flex-col gap-3">
      <h3 className="label-large-bold text-text">
        {RENT_USE_COPY.extensionTitle}
      </h3>
      <Table>
        <TableHead>
          <TableRow>
            {RENT_USE_COPY.extensionHeads.map((head) => (
              <TableTh key={head}>{head}</TableTh>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length ? (
            rows.map((cells) => (
              <TableRow key={cells[0]}>
                {cells.map((cell, index) => (
                  <TableTd key={index} className="tabular-nums">
                    {cell}
                  </TableTd>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableTd colSpan={8} className="text-text-sub">
                {RENT_USE_COPY.extensionEmpty}
              </TableTd>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <p className="body-small break-keep text-text-sub">
        {RENT_USE_COPY.extensionHelp}
      </p>
    </section>
  );
}

export function RentInfoBody({
  u,
  state,
  mode,
  inspection,
  onReturnConfirm,
}: {
  u: OrderUnit;
  state: RentDetailState;
  mode: CollectMode;
  /** 검수·반납 — 안심케어 · 검수 판정 줄 */
  inspection?: boolean;
  /** 자체 수령 직접 반납 [반납 확인] — 확인 창을 연다(개발 요청 31번) */
  onReturnConfirm?: () => void;
}) {
  const { toast } = useToast();
  const term = rentTermOf(u);
  const { collect, setCollect } = state;
  const submit = () => {
    if (mode === "edit") {
      if (!collect.invoice.trim()) return toast(ACTION_COPY.retInvoiceFirst);
      return toast(ACTION_COPY.retInvoiceEdited);
    }
    if (!collect.courier || !collect.invoice.trim())
      return toast(ACTION_COPY.collectFirst);
    if (!collectAllowed(u)) return toast(ACTION_COPY.collectTooEarly);
    toast(ACTION_COPY.collectRequested(1));
  };
  const ro = mode === "ro";
  /* 대여·연체 상세의 자체 수령 — 택배 수거 대신 「직접 반납」 + [반납 확인](develop · 개발 요청 31번) */
  const direct = mode === "request" && u.shipWay === "방문 수령";
  const returnReady = collectAllowed(u);
  /* 이용 종료일이 지났으면 연체 안내가 나간다(D-101) */
  const overdue = collectAllowed(u);
  const [failOpen, setFailOpen] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <PickupChangeBox u={u} />
      <InfoList>
        <Item label="대여 기간">{term.period}</Item>
        <Item label="상태">
          <StatusTag status={u.stat ?? ""} />
        </Item>
        {inspection ? (
          <>
            <Item label="안심케어">{careTextOf(u)}</Item>
            <Item label="검수 판정">
              {state.judgment ? (
                <StatusTag status={state.judgment} />
              ) : (
                "검수 전"
              )}
            </Item>
          </>
        ) : (
          <>
            <Item label="대여 시작">{term.start}</Item>
            <Item label="반납 예정일">{term.due}</Item>
          </>
        )}
        <Item label="수거 택배사">
          {direct ? (
            "직접 반납"
          ) : ro ? (
            orNone(collect.courier)
          ) : (
            <Select
              className="w-56"
              aria-label="수거 택배사"
              options={COURIER_OPTIONS}
              value={collect.courier}
              onValueChange={(courier) => setCollect({ ...collect, courier })}
            />
          )}
        </Item>
        <Item label="수거 송장번호">
          {direct ? (
            <Button
              variant="secondary"
              disabled={!returnReady}
              title={
                returnReady
                  ? RENT_USE_COPY.returnReady
                  : RENT_USE_COPY.returnTooEarly
              }
              onClick={onReturnConfirm}
            >
              반납 확인
            </Button>
          ) : ro ? (
            orNone(collect.invoice)
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <Input
                className="w-60"
                inputMode="numeric"
                aria-label="수거 송장번호"
                placeholder="수거 송장번호 입력"
                value={collect.invoice}
                onChange={(event) =>
                  setCollect({ ...collect, invoice: event.target.value })
                }
              />
              <Button variant="secondary" onClick={submit}>
                {mode === "request" ? "수거 신청" : "송장수정"}
              </Button>
              {/* 검수·반납 수거 신청 건 — 회수 종료 · 회수 실패(미반납)(develop · 개발 요청 32번) */}
              {mode === "edit" && (
                <>
                  <Button
                    variant="secondary"
                    title={RENT_INSP_COPY.collectDoneTip}
                    onClick={() => toast(RENT_INSP_COPY.collectDone)}
                  >
                    회수 종료
                  </Button>
                  <Button
                    variant="criticalTonal"
                    title={RENT_INSP_COPY.failTip(overdue)}
                    onClick={() => setFailOpen(true)}
                  >
                    회수 실패(미반납)
                  </Button>
                </>
              )}
            </span>
          )}
        </Item>
      </InfoList>
      <NoticeGateModal
        open={failOpen}
        title={RENT_INSP_COPY.failTitle}
        count={1}
        confirmLabel={RENT_INSP_COPY.failConfirm}
        onClose={() => setFailOpen(false)}
        onConfirm={() => {
          setFailOpen(false);
          toast(RENT_INSP_COPY.failDone(overdue));
        }}
      >
        <span>{RENT_INSP_COPY.failNotice(overdue)}</span>
      </NoticeGateModal>
      {mode === "request" && <ExtensionHistory u={u} />}
    </div>
  );
}

/** 검수 판정 — 고르면 결과·설명 + [판정 초기화](반환 처리 전만). 원본 `judge` */
export function InspectBody({
  u,
  state,
}: {
  u: OrderUnit;
  state: RentDetailState;
}) {
  const { toast } = useToast();
  const j = state.judgment;
  const settled = !!u.depDone;
  /** 고른 판정 — [판정 저장]을 눌러야 반영된다(develop · 개발 요청 32번) */
  const [draft, setDraft] = useState<Judgment | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="label-medium-bold text-text">판정 결과</span>
        {j ? (
          <StatusTag status={j} />
        ) : (
          <span className="label-medium text-text-sub">검수 전</span>
        )}
        {careOf(u) && <Tag size="small">안심케어</Tag>}
      </div>
      {j ? (
        <>
          <p className="body-medium break-keep text-text">
            {judgmentDescOf(u, j)}
          </p>
          {settled ? (
            <Help>반환 처리 완료 후에는 판정을 변경할 수 없습니다.</Help>
          ) : (
            <span>
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  state.reset();
                  setDraft(null);
                  toast(INSPECT_COPY.reset);
                }}
              >
                판정 초기화 · 다시 선택
              </Button>
            </span>
          )}
        </>
      ) : draft ? (
        <>
          <p className="label-medium-bold flex items-center gap-2 text-text">
            {RENT_INSP_COPY.picked} · <StatusTag status={draft} />
          </p>
          {draft === "이상없음" ? (
            <Help>{RENT_INSP_COPY.fullRefund}</Help>
          ) : careCoveredOf(u, draft) ? (
            <Help>{RENT_INSP_COPY.careCovered}</Help>
          ) : null}
          <span className="flex flex-wrap gap-2">
            <Button
              size="small"
              onClick={() => {
                state.judge(draft);
                setDraft(null);
                toast(INSPECT_COPY.judged(u, draft));
              }}
            >
              판정 저장
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setDraft(null)}
            >
              다시 선택
            </Button>
          </span>
        </>
      ) : (
        <div
          role="group"
          aria-label="검수 판정"
          className="flex flex-wrap gap-2"
        >
          {/* 선택지 카드 — 이름 + 결과 한 줄(원본 `dp-choice`). 분실은 위험 외곽선 */}
          {judgmentOptionsOf(u).map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setDraft(o.value)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-medium bg-surface px-4 py-3 text-left outline outline-1 -outline-offset-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
                o.warn
                  ? "outline-border-critical hover:outline-border-critical-hover"
                  : "outline-border hover:outline-border-hover",
              )}
            >
              <span
                className={cn(
                  "label-medium-bold",
                  o.warn ? "text-text-critical" : "text-text",
                )}
              >
                {o.label}
              </span>
              <span className="body-small text-text-sub">{o.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 보증금 정산 — 보증금 → 차감 → 반환 예정액 · 차감액 직접 입력(보증금 한도) · [환급 처리] → 환급 실행 창.
 * 연체료는 자동 산정하지 않는다(원본 `depOdFee = 0`)
 */
export function DepositBody({
  u,
  state,
  onRefund,
}: {
  u: OrderUnit;
  state: RentDetailState;
  /** 환급 실행 창을 연다(원본 `depProcess` → `gateDep`) */
  onRefund: (deduct: number) => void;
}) {
  const { toast } = useToast();
  const dep = u.dep ?? 0;
  const j = state.judgment;
  const covered = careCoveredOf(u, j);
  const deduct = covered ? 0 : state.deduct;
  const settled = !!u.depDone;
  const [draft, setDraft] = useState(deduct ? String(deduct) : "");
  const manual = !!j && j !== "이상없음" && !covered && !settled;
  const applyDeduct = () => {
    let v = Number(draft.replace(/[^\d]/g, "")) || 0;
    if (v > dep) {
      v = dep;
      toast(INSPECT_COPY.deductCapped(dep));
    }
    state.setDeduct(v);
    setDraft(v ? String(v) : "");
    toast(INSPECT_COPY.deducted(v, Math.max(0, dep - v)));
  };
  const label = deduct ? "차감 후 환급" : "전액환급";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="label-medium-bold text-text">정산 상태</span>
        <StatusTag status={u.depStat || "점유중"} />
      </div>
      <CalcBreakdown
        blocks={[
          {
            key: "deposit",
            emphasis: true,
            lines: [
              {
                key: "deposit",
                label: "보증금 총액",
                value: won(dep),
                kind: "subtotal",
              },
              {
                key: "deduct",
                label: covered ? "차감 — 안심케어 본사 부담" : "차감",
                value: deduct ? `−${won(deduct)}` : won(0),
              },
              {
                key: "refund",
                label: "반환 예정액",
                value: won(Math.max(0, dep - deduct)),
                kind: "total",
              },
            ],
          },
        ]}
      />
      {manual && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-medium-bold text-text">차감액</span>
          <Input
            className="w-44"
            inputMode="numeric"
            aria-label="차감액"
            placeholder="0"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rightIcon={<span className="body-medium text-text-sub">원</span>}
          />
          <Button variant="secondary" size="small" onClick={applyDeduct}>
            차감 반영
          </Button>
          <Help>보증금 잔액 {won(dep)} 내 수동 입력</Help>
        </div>
      )}
      <Help>
        연체료는 자동 산정하지 않습니다 — 셀러가 위 <b>차감액</b>에 재량으로
        반영하고, 보증금을 초과하는 금액은 <b>고객과 직접 협의·청구</b>합니다.
      </Help>
      {settled ? (
        <Help>
          ✓ <b>{label} 처리 완료</b> — 진행 상태를 <b>반납완료</b>로 전환할 수
          있습니다.
        </Help>
      ) : j ? (
        <>
          <span>
            <Button variant="secondary" onClick={() => onRefund(deduct)}>
              {label} 처리
            </Button>
          </span>
          <Help>
            반환 <b>처리 완료가 반납완료 전환의 전제조건</b>입니다. 검수 완료 후
            3영업일 내 환급 처리(고객 안내 기준 7영업일 이내) · 매출 정산과
            분리(차감 수익은 보증금 원장에서 처리). {DEPOSIT_COPY.refundPath}
          </Help>
        </>
      ) : (
        <Help>
          검수 판정 후 반환을 처리할 수 있습니다. 처리 완료 전에는{" "}
          <b>반납완료</b>로 전환할 수 없습니다.
        </Help>
      )}
    </div>
  );
}

/**
 * 안심케어 청구(가입 건만) — 복원가능 파손의 복원비를 본사에 청구. 접수·승인·반려는 원본 문구 그대로 읽기.
 * 반려는 재청구 통로가 없다(2026-08-13 판정 ⑶)
 */
export function CareBody({
  u,
  state,
}: {
  u: OrderUnit;
  state: RentDetailState;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const j = state.judgment;
  const claim = won(u.careClaim ?? 0);
  const status = ["청구 접수", "승인", "반려"].includes(u.careStat ?? "")
    ? u.careStat
    : null;
  let body: ReactNode;
  if (j === "파손(복원가능)" && u.careStat === "승인")
    body = (
      <>
        <b className="body-medium-bold">복원비 {claim} 승인 완료</b>
        <Help>
          본사가 승인해 <b>익월 매출 정산에 안심케어 보전(+)</b>으로 지급됩니다.
          이 건의 보증금은 차감 없이 종결됩니다.
        </Help>
      </>
    );
  else if (j === "파손(복원가능)" && u.careStat === "반려")
    body = (
      <>
        <b className="body-medium-bold">복원비 {claim} 청구 반려됨</b>
        <Help>
          사유 — <Warn>{orNone(u.careRejectReason)}</Warn> (
          {orNone(u.careRejectedAt)})
        </Help>
        <Help>
          본사 보전 대상이 아닙니다 — 손상분은 위 <b>보증금 차감</b>으로
          처리할지 다시 판단해 주세요(재청구 통로는 없습니다).
        </Help>
      </>
    );
  else if (j === "파손(복원가능)" && u.careStat === "청구 접수")
    body = (
      <>
        <b className="body-medium-bold">복원비 {claim} 청구 접수됨</b>
        <Help>
          본사 승인 후 익월 매출 정산에 <b>안심케어 보전(+)</b>으로 지급됩니다.
        </Help>
      </>
    );
  else if (j === "파손(복원가능)")
    body = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-52"
            inputMode="numeric"
            aria-label="복원 비용"
            placeholder="복원 비용 입력"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            rightIcon={<span className="body-medium text-text-sub">원</span>}
          />
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              const v = Number(amount.replace(/[^\d]/g, "")) || 0;
              toast(v ? INSPECT_COPY.careClaimed(v) : INSPECT_COPY.careEmpty);
            }}
          >
            안심케어 청구
          </Button>
        </div>
        <Help>
          복원 견적·증빙은 반납 옵션사진으로 갈음합니다.{" "}
          <b>복원가능 손상만 본사 부담</b> — 복원불가·분실은 케어 범위 밖이며,
          연체료는 케어와 무관하게 셀러 재량으로 보증금에서 차감(초과분 고객
          직접 청구)합니다.
        </Help>
      </>
    );
  else if (j)
    body = (
      <Help>
        이 판정은 안심케어 적용 대상이 아닙니다 —{" "}
        <b>복원가능 손상만 본사 부담</b>
        (복원불가·분실은 고객 부담).
      </Help>
    );
  else
    body = (
      <Help>
        검수 판정 전 — <b>파손(복원가능)</b> 판정 시 복원비를 본사에 청구할 수
        있습니다.
      </Help>
    );
  return (
    <div className="flex flex-col gap-3">
      {/* 구역 제목이 이미 「안심케어 청구」라 안쪽은 상태 줄만(원본 카드 머리의 배지) */}
      {(status || j === "파손(복원가능)") && (
        <div className="flex items-center gap-2">
          <span className="label-medium-bold text-text">청구 상태</span>
          {status ? (
            <StatusTag status={status} />
          ) : (
            <span className="label-medium text-text-sub">미청구</span>
          )}
        </div>
      )}
      {body}
    </div>
  );
}

/** 상품 상태 이미지 — 위 = 출고 이미지(읽기 · 대조 기준) · 아래 = 반납 후 상품 상태(최대 10). 원본 `udInspPhoto` */
export function PhotosBody({ state }: { state: RentDetailState }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h3 className="label-large-bold text-text">
          출고 이미지 <Tag size="small">출고 시 등록 · 읽기전용</Tag>
        </h3>
        {state.shipImages.length ? (
          <ImageGrid label="출고 이미지" images={state.shipImages} />
        ) : (
          <Help>
            출고 시 등록된 <b>출고 이미지</b>가 없습니다. [렌트 발주 관리]
            상세의 <b>출고 이미지</b> 영역에 등록하면 이 자리에 출고 기준
            이미지로 표시됩니다.
          </Help>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="label-large-bold text-text">
          반납 후 상품 상태{" "}
          <Tag size="small">{`${state.returnImages.length}/${MAX_IMAGES}`}</Tag>
        </h3>
        <ImageGrid
          label="반납 후 상품 상태"
          images={state.returnImages}
          onChange={state.setReturnImages}
          makeUrl={state.makeUrl}
        />
        <Help>
          반납 검수 시 촬영한 실제 상품 상태를 등록하세요. 출고 상태 이미지와
          대조해 <b>손상 판정·분쟁의 근거</b>가 됩니다. (보정 없는 실제 이미지 ·
          최대 10장)
        </Help>
      </section>
    </div>
  );
}
