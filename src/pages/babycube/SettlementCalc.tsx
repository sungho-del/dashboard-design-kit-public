import { CalcBreakdown, type CalcLine } from "./CalcBreakdown";
import {
  NOTE_GROUP_LABEL,
  STATEMENT_GROUPS,
  type StatementLine,
} from "./SellerSettlementPage.data";

/* =========================================================================
 * 산출 내역 — 정산 3화면 공용 부품 (페이지 부품이라 stories 없음)
 *
 * 쓰는 곳: 셀러 정산 목록(전 입점사 합산 · 지급 실행 모달) · 셀러 정산 상세 · 정산 명세서 상세(셀러·본사)
 *
 * ## 모양 (사용자 승인 2026-11-03)
 * ```
 * 매출   확정 거래액  할인 후                 489,700원
 *        셀러 쿠폰  셀러 부담                 −15,000원
 *        정산 매출  수수료 부과 기준          474,700원   ← 소계(굵게)
 * 차감   판매 수수료 · PG 수수료 · 취소·반품 환수 ⓘ
 * 가산   안심케어 보전 ⓘ
 * ─────  지급액                               436,138원   ← 가장 굵게 · 큰 프리셋
 *        미회수  리틀스텝 · 별도 청구 ⓘ        77,400원   ← 경고색은 여기만
 * 참고   포인트 사용분 본사 부담  정산 영향 없음  3,000원  ← 보조 글자색
 * ⓘ 안내 상자(notes)
 * ```
 * 최대 폭 `max-w-3xl` — 이름과 금액이 화면 양 끝으로 벌어지지 않게. 금액은 오른쪽 · `tabular-nums`.
 *
 * ## 그대로 두는 것 / 갈아끼울 것
 * 줄 데이터(이름·값·묶음·종류·보조 글자·도움말)는 전부 `.data.ts` 의 `statementLinesOf` 류가 준다.
 * 이 파일은 `group`·`kind` 만 보고 그린다 — 금액을 계산하거나 부호를 붙이지 않는다.
 * 묶음에 줄이 없으면 묶음도 그리지 않는다.
 *
 * 그리는 것은 공용 `CalcBreakdown` — 이 파일은 정산 줄을 묶음으로 나누는 어댑터다.
 * 줄마다 `<dt>`(이름 → 보조 글자 → ⓘ) + `<dd>`(값). 테스트는 `[data-settlement-calc]` 안을 읽는다.
 * ====================================================================== */

const toCalc = (line: StatementLine): CalcLine => ({
  ...line,
  kind: line.kind === "unpaid" ? "warning" : line.kind,
});

export interface SettlementCalcProps {
  lines: StatementLine[];
  /** 산출 내역 아래 안내 상자 줄 — 없으면 상자 없음 */
  notes?: readonly string[];
  className?: string;
}

export function SettlementCalc({
  lines,
  notes,
  className,
}: SettlementCalcProps) {
  const ofKind = (kind: StatementLine["kind"]) =>
    lines.filter((line) => !line.group && line.kind === kind).map(toCalc);
  return (
    <CalcBreakdown
      dataAttr="data-settlement-calc"
      className={className}
      notes={notes}
      blocks={[
        ...STATEMENT_GROUPS.map((group) => ({
          key: group.key,
          label: group.label,
          lines: lines.filter((line) => line.group === group.key).map(toCalc),
        })),
        /* 지급액 + 미회수 — 지급액과 별개 금액이라 지급액 바로 아래 경고 줄로 */
        {
          key: "total",
          emphasis: true,
          lines: [...ofKind("total"), ...ofKind("unpaid")],
        },
        { key: "note", label: NOTE_GROUP_LABEL, lines: ofKind("note") },
      ]}
    />
  );
}
