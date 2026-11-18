import { useState } from "react";
import {
  Button,
  FormField,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
  Textarea,
  useToast,
} from "../../components/ui";
import {
  ADJUST_COPY,
  ADJUSTMENT_KINDS,
  adjustReasonError,
  feeLineOf,
  parseAdjustAmount,
  signedWon,
  type AdjustmentKind,
  type SettlementAdjustment,
  type SettlementRow,
} from "./settlement.data";

/* =========================================================================
 * 정산 명세 「조정」 구역 — 개발 2차 요청 B-1 (develop `SettlementAdjustments` · 17차 기획 회신)
 *
 * 셀러 정산 상세 = 조작(`editable`) · 정산 내역/명세서 상세 = 반영분만 읽기(행이 없으면 구역 자체가 없다).
 * - 머리: 「조정」 + [조정 추가](조작 화면 · `canAdjust` 회차만)
 * - 표: 유형 태그 · 금액(부호 · 오른쪽) + 매출 정정 수수료 보조 줄 · 사유 · 상태(조작 화면만 — 초안이면
 *   「재발송 전」 + [수정] [삭제], 반영된 행은 빈칸). 비면 「조정 내역이 없습니다.」
 * - 표 아래(조작 화면만): 초안이 있으면 재발송 뒤 예상 지급액 · 반영된 행이 있으면 상쇄 안내
 * - 창: 유형 · 금액(원) · 사유. 확인완료 회차에 **새로** 넣을 때만 같은 창 안에서 확인 문장으로 한 번 더
 *   (확인 단계 [취소]는 입력값 그대로 입력 화면으로). 수정은 확인 단계가 없다. 삭제 확인 창은 없다(develop 그대로)
 *
 * ## 퍼블 범위
 * 저장·삭제는 알림만 — 행은 그대로다(실제 반영·재계산은 서버 몫).
 * ====================================================================== */

export function SettlementAdjustments({
  row,
  editable,
}: {
  /** 정산 행 — 읽기 전용 화면에는 반영된 행만 담아 넘긴다 */
  row: Pick<
    SettlementRow,
    "adjustments" | "canAdjust" | "adjustLocksImmediately" | "payoutAfterDraft"
  >;
  editable: boolean;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<{
    target: SettlementAdjustment | null;
  } | null>(null);
  const rows = row.adjustments;
  const canAdd = editable && row.canAdjust;
  const hasDraft = rows.some((adjustment) => !adjustment.locked);
  const hasLocked = rows.some((adjustment) => adjustment.locked);

  if (!editable && rows.length === 0) return null;

  return (
    <div
      aria-label={ADJUST_COPY.title}
      role="group"
      className="flex max-w-3xl flex-col gap-3"
      data-settlement-adjustments
    >
      <div className="flex items-center justify-between gap-3">
        <span className="label-medium-bold text-text">{ADJUST_COPY.title}</span>
        {canAdd ? (
          <Button
            variant="secondary"
            size="small"
            onClick={() => setForm({ target: null })}
          >
            {ADJUST_COPY.add}
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="body-medium text-text-sub">{ADJUST_COPY.empty}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>유형</TableTh>
              <TableTh className="text-right">금액</TableTh>
              <TableTh>사유</TableTh>
              {editable ? <TableTh>상태</TableTh> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((adjustment) => {
              const fee = feeLineOf(adjustment);
              return (
                <TableRow key={adjustment.id}>
                  <TableTd>
                    <Tag size="small">{adjustment.kind}</Tag>
                  </TableTd>
                  <TableTd className="text-right tabular-nums">
                    <span className="body-medium-bold text-text">
                      {signedWon(adjustment.amount)}
                    </span>
                    {fee ? (
                      <span className="body-small block text-text-sub">
                        {fee}
                      </span>
                    ) : null}
                  </TableTd>
                  <TableTd className="break-keep wrap-anywhere">
                    {adjustment.reason}
                  </TableTd>
                  {editable ? (
                    <TableTd>
                      {/* 반영된 행 — [수정]·[삭제] 자리는 비운다 */}
                      {adjustment.locked ? null : (
                        <span className="flex flex-wrap items-center gap-2">
                          <Tag tone="warning" size="small">
                            {ADJUST_COPY.draft}
                          </Tag>
                          <TextButton
                            onClick={() => setForm({ target: adjustment })}
                          >
                            수정
                          </TextButton>
                          <TextButton
                            onClick={() => toast(ADJUST_COPY.removed)}
                          >
                            삭제
                          </TextButton>
                        </span>
                      )}
                    </TableTd>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {editable && hasDraft ? (
        <p className="body-medium text-text" role="status">
          {ADJUST_COPY.afterDraft(row.payoutAfterDraft.toLocaleString("ko-KR"))}
        </p>
      ) : null}
      {editable && hasLocked ? (
        <p className="body-small text-text-sub">{ADJUST_COPY.offset}</p>
      ) : null}
      {form ? (
        <AdjustmentForm
          target={form.target}
          locksImmediately={row.adjustLocksImmediately}
          onClose={() => setForm(null)}
          onSaved={(message) => {
            setForm(null);
            toast(message);
          }}
        />
      ) : null}
    </div>
  );
}

function AdjustmentForm({
  target,
  locksImmediately,
  onClose,
  onSaved,
}: {
  /** `null` = 추가 · 행 = 초안 수정 */
  target: SettlementAdjustment | null;
  locksImmediately: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [kind, setKind] = useState<AdjustmentKind>(target?.kind ?? "지급 조정");
  const [amount, setAmount] = useState(target ? String(target.amount) : "");
  const [reason, setReason] = useState(target?.reason ?? "");
  const [tried, setTried] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const parsed = parseAdjustAmount(amount);
  const reasonError = adjustReasonError(reason);
  /* 확인완료 회차에 새로 넣는 행은 저장 즉시 반영된다 — 저장 전 한 번 더 묻는다 */
  const needsConfirm = !target && locksImmediately;

  const save = () => {
    setTried(true);
    if (parsed === null || reasonError) return;
    if (needsConfirm && !confirming) {
      setConfirming(true);
      return;
    }
    onSaved(target ? ADJUST_COPY.edited : ADJUST_COPY.added);
  };

  return (
    <Modal open onClose={onClose} size="medium">
      <ModalHeader
        /* 푸터에도 "취소"가 있어 헤더 X 의 기본 라벨과 겹친다 — 이름을 갈라 준다 */
        closeLabel="대화상자 닫기"
        title={target ? ADJUST_COPY.edit : ADJUST_COPY.add}
      />
      <ModalBody>
        {confirming ? (
          <p className="body-medium break-keep text-text">
            {ADJUST_COPY.confirmNow}
          </p>
        ) : (
          <>
            <RadioGroup
              label="유형"
              value={kind}
              onValueChange={(next) => setKind(next as AdjustmentKind)}
            >
              {ADJUSTMENT_KINDS.map((item) => (
                <Radio
                  key={item}
                  value={item}
                  label={item}
                  description={
                    /* 단어 중간에서 끊기지 않게 */
                    <span className="break-keep">
                      {ADJUST_COPY.kindHelp[item]}
                    </span>
                  }
                />
              ))}
            </RadioGroup>
            <FormField
              label={ADJUST_COPY.amountLabel}
              required
              description={ADJUST_COPY.amountHelp}
              error={
                tried && parsed === null ? ADJUST_COPY.amountInvalid : undefined
              }
            >
              <Input
                inputMode="numeric"
                value={amount}
                placeholder={ADJUST_COPY.amountPlaceholder}
                invalid={tried && parsed === null}
                onChange={(event) => setAmount(event.target.value)}
              />
            </FormField>
            <FormField
              label="사유"
              required
              error={tried ? reasonError : undefined}
            >
              <Textarea
                minRows={3}
                value={reason}
                placeholder={ADJUST_COPY.reasonPlaceholder}
                onChange={(event) => setReason(event.target.value)}
              />
            </FormField>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="secondary"
          size="large"
          onClick={confirming ? () => setConfirming(false) : onClose}
        >
          취소
        </Button>
        <Button size="large" onClick={save}>
          저장
        </Button>
      </ModalFooter>
    </Modal>
  );
}
