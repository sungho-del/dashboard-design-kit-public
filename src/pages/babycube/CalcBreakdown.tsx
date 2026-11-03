import { Info } from "lucide-react";
import { IconButton, Tooltip } from "../../components/ui";
import { cn } from "../../lib/cn";

/* =========================================================================
 * 계산 내역 — 금액 산출을 묶음·소계·결과 줄로 보여 주는 화면 부품 (stories 없음)
 *
 * 쓰는 곳: `SettlementCalc`(정산 3화면) · 주문 명세 · 보증금 정산 계산
 *
 * ## 모양 (사용자 승인 2026-11-03 — 정산 명세 고도화에서 확정)
 * ```
 * 매출   확정 거래액  할인 후                 489,700원
 *        정산 매출                            474,700원   ← subtotal(굵게)
 * 차감   판매 수수료                          −13,080원   ← 차감도 기본 글자색
 * ─────  지급액                               436,138원   ← emphasis 묶음의 total(가장 굵게)
 *        미회수  별도 청구 ⓘ                    77,400원   ← warning(경고색은 이것만)
 * 참고   포인트 사용분  정산 영향 없음          3,000원   ← note(보조 글자색)
 *        환불 없음 — 원거래 유지                           ← message(값 없이 한 줄 문장)
 * ⓘ 안내 상자(notes)
 * ```
 * 최대 폭 `max-w-3xl` — 이름과 금액이 양 끝으로 벌어지지 않게(좁은 곳에서는 줄어든다).
 * 금액은 오른쪽 · `tabular-nums`. ⚠️ 표 일반 규칙(왼쪽 정렬)의 **계산 영역 한정 예외** — `docs/DESIGN.md` §7-2.
 *
 * ## 이 파일은 도메인을 모른다
 * 묶음 순서·이름·줄(이름·값·보조 글자·도움말·종류)은 전부 화면의 `.data.ts` 어댑터가 준다.
 * 금액을 계산하거나 부호를 붙이지 않는다. **받은 줄은 받은 순서대로 모두 그린다** · 줄 없는 묶음은 그리지 않는다.
 * 줄마다 `<dt>`(이름 → 보조 글자 → ⓘ) + `<dd>`(값). `message` 는 `<dd>` 없이 문장 한 줄.
 * ====================================================================== */

export interface CalcLine {
  key: string;
  label: string;
  /** `message` 줄은 비워 둔다 */
  value?: string;
  kind?: "item" | "subtotal" | "total" | "warning" | "note" | "message";
  /** 이름 옆 작은 보조 글자 */
  hint?: string;
  /** ⓘ 도움말 */
  tip?: string;
}

export interface CalcBlock {
  key: string;
  /** 왼쪽 묶음 이름 열 — 없으면 빈 열로 줄만 맞춘다 */
  label?: string;
  lines: CalcLine[];
  /** 결과 묶음 — 회색 바탕 · 넉넉한 위아래 */
  emphasis?: boolean;
}

const LABEL_CLASS = {
  item: "body-medium text-text",
  subtotal: "body-medium-bold text-text",
  total: "body-large-bold text-text",
  warning: "body-medium-bold text-text-critical",
  note: "body-medium text-text-sub",
  message: "body-medium text-text-sub",
} as const;

const VALUE_CLASS = {
  item: "body-medium text-text",
  subtotal: "body-medium-bold text-text",
  total: "heading-large-bold text-text",
  warning: "body-medium-bold text-text-critical",
  note: "body-medium text-text-sub",
  message: "",
} as const;

function Line({ line }: { line: CalcLine }) {
  const kind = line.kind ?? "item";
  return (
    <div
      data-line={line.key}
      className="flex min-h-7 items-center justify-between gap-4"
    >
      <dt className="flex min-w-0 flex-wrap items-center gap-x-2">
        <span className={LABEL_CLASS[kind]}>{line.label}</span>
        {line.hint ? (
          <span
            className={cn(
              "body-small",
              kind === "warning" ? "text-text-critical" : "text-text-sub",
            )}
          >
            {line.hint}
          </span>
        ) : null}
        {line.tip ? (
          <Tooltip content={line.tip}>
            <IconButton
              variant="ghost"
              size="xsmall"
              label={`${line.label} 도움말`}
              icon={<Info strokeWidth={1.2} aria-hidden />}
            />
          </Tooltip>
        ) : null}
      </dt>
      {kind === "message" ? null : (
        <dd
          className={cn(
            "shrink-0 text-right whitespace-nowrap tabular-nums",
            VALUE_CLASS[kind],
          )}
        >
          {line.value}
        </dd>
      )}
    </div>
  );
}

function Block({ block }: { block: CalcBlock }) {
  if (block.lines.length === 0) return null;
  return (
    <div
      data-block={block.key}
      className={cn(
        "flex gap-4 px-4",
        block.emphasis ? "bg-surface-sub py-4" : "py-3",
      )}
    >
      <span
        aria-hidden
        className="body-small flex h-7 w-10 shrink-0 items-center text-text-sub"
      >
        {block.label}
      </span>
      <dl
        aria-label={block.label}
        className="flex min-w-0 flex-1 flex-col gap-1"
      >
        {block.lines.map((line) => (
          <Line key={line.key} line={line} />
        ))}
      </dl>
    </div>
  );
}

export interface CalcBreakdownProps {
  blocks: CalcBlock[];
  /** 아래 안내 상자 줄 — 없으면 상자 없음 */
  notes?: readonly string[];
  className?: string;
  /** 테스트·스타일 훅 — 정산은 `data-settlement-calc` 를 쓴다 */
  dataAttr?: string;
}

export function CalcBreakdown({
  blocks,
  notes,
  className,
  dataAttr = "data-calc",
}: CalcBreakdownProps) {
  return (
    <div
      {...{ [dataAttr]: "" }}
      className={cn("flex w-full max-w-3xl flex-col gap-3", className)}
    >
      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-medium outline-1 -outline-offset-1 outline-border">
        {blocks.map((block) => (
          <Block key={block.key} block={block} />
        ))}
      </div>
      {notes && notes.length > 0 ? (
        <div className="flex gap-2 rounded-medium bg-surface-sub px-4 py-3">
          <Info
            size={16}
            strokeWidth={1.2}
            aria-hidden
            className="mt-0.5 shrink-0 text-icon-sub"
          />
          <ul className="body-small flex flex-col gap-1 text-text-sub">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
