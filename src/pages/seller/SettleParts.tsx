import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  AppShell,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  IconButton,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
  useToast,
} from "../../components/ui";
import { BulletList } from "../babycube/BulletList";
import { SellerGnb } from "./SellerGnb";
import {
  Irreversible,
  NoticeGateModal,
  RequiredReasonModal,
  StatusTag,
} from "./OrderGates";
import type { OrderUnit } from "./seed/orders.data";
import {
  STMT_GATE,
  TX_RULES,
  txFootOf,
  txNoteOf,
  txStatusOf,
  won,
} from "./settle.data";

/* =========================================================================
 * 정산 화면 공용 조각 — 매출 정산 · 명세서 · 세금계산서 · 보증금 내역(+ 상세)
 *
 * - `SellerShell` — GNB + 머리 (모든 셀러 화면과 같은 틀)
 * - `Section` — 접히는 카드(처리단위 상세 `UnitDetail` 과 같은 규격)
 * - `Bold` — 원본 문구의 굵은 낱말(`**…**`)
 * - `TxTable`·`TxFoot` — 정산 근거 거래 내역(원본 `settleTxTable` — 매출 정산 목록 · 명세서 상세 공용)
 * - `StmtGates` — 정산 [확인]·[이의제기] 창(원본 `gateStmt`·`gateObject`).
 *   **퍼블 범위: 창 + 알림까지** — 명세서 상태는 바뀌지 않는다(렌트 묶음과 같은 원칙 · GPT 검토)
 * ====================================================================== */

export interface SellerNavProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

export function SellerShell({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
  header,
  children,
}: SellerNavProps & { header: ReactNode; children: ReactNode }) {
  return (
    <AppShell
      sidebar={
        <SellerGnb
          activeId={activeNav}
          onSelect={onNavSelect}
          open={navOpen}
          onOpenChange={onNavOpenChange}
        />
      }
      header={header}
    >
      {children}
    </AppShell>
  );
}

/** 접히는 카드 — `summary`(원본 `nvSec` 요약 글)·`action` 은 머리 오른쪽(접기 버튼 앞) */
export function Section({
  title,
  summary,
  action,
  children,
}: {
  title: string;
  summary?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card variant="soft">
      <CardHeader
        title={title}
        action={
          <span className="flex items-center gap-2">
            {summary && (
              <span className="body-small text-text-sub">{summary}</span>
            )}
            {action}
            <IconButton
              variant="ghost"
              size="small"
              label={`${title} ${open ? "접기" : "펼치기"}`}
              aria-expanded={open}
              onClick={() => setOpen((prev) => !prev)}
              icon={
                open ? (
                  <ChevronUp strokeWidth={1.2} aria-hidden />
                ) : (
                  <ChevronDown strokeWidth={1.2} aria-hidden />
                )
              }
            />
          </span>
        }
      />
      {open ? <CardBody>{children}</CardBody> : null}
    </Card>
  );
}

/** 원본 문구의 굵은 낱말 — `**` 사이를 굵게. `strong` = 둘레 글자 크기에 맞춘 굵은 프리셋 */
export function Bold({
  text,
  strong = "body-small-bold text-text",
}: {
  text: string;
  strong?: string;
}) {
  return (
    <>
      {text.split("**").map((part, index) =>
        index % 2 ? (
          <strong key={index} className={strong}>
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** 안내 상자 — 회색 바탕 글 묶음(본사 정산 상세 각주와 같은 꼴) */
export function NoteBox({ children }: { children: ReactNode }) {
  return (
    <div className="body-small flex flex-col gap-2 rounded-medium bg-surface-sub p-4 break-keep text-text-sub">
      {children}
    </div>
  );
}

/**
 * 거래 내역 표 — 원본 열 그대로(주문번호 · 유형 · 상품 · 금액 · 상태 · 정산 반영).
 * 목록은 앞에 체크박스(엑셀 선택분), 상세는 앞에 No(원본 `settleTxTable`).
 * 행 어디를 눌러도 처리단위 상세(셀 안 체크박스는 이동하지 않는다).
 */
export function TxTable({
  units,
  start,
  selection,
  onOpen,
}: {
  units: OrderUnit[];
  /** 페이지 시작 위치 — No 열 */
  start: number;
  /** 있으면 No 대신 체크박스 열 */
  selection?: {
    selected: string[];
    onToggle: (id: string) => void;
    allChecked: boolean;
    someChecked: boolean;
    onTogglePage: () => void;
  };
  onOpen: (u: OrderUnit) => void;
}) {
  return (
    <Table>
      <colgroup>
        {/* 모든 열에 폭 — 합 928(1280 상세 카드 안쪽 폭). 폭 없는 열은 `w-max` 표에서 내용 길이만큼 늘어난다 */}
        <col className={selection ? "w-13" : "w-16"} />
        <col className="w-40" />
        <col className="w-20" />
        <col className="w-44" />
        <col className="w-28" />
        <col className="w-28" />
        <col className="w-56" />
      </colgroup>
      <TableHead>
        <TableRow>
          <TableTh>
            {selection ? (
              <Checkbox
                size="small"
                aria-label="이 페이지 전체 선택"
                checked={selection.allChecked}
                indeterminate={selection.someChecked}
                onChange={selection.onTogglePage}
              />
            ) : (
              "No"
            )}
          </TableTh>
          <TableTh>주문번호</TableTh>
          <TableTh align="center">유형</TableTh>
          <TableTh>상품</TableTh>
          <TableTh>금액</TableTh>
          <TableTh align="center">상태</TableTh>
          <TableTh>정산 반영</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        {units.map((u, index) => {
          const note = txNoteOf(u);
          return (
            <TableRow key={u.id} clickable onClick={() => onOpen(u)}>
              <TableTd className="tabular-nums">
                {selection ? (
                  <Checkbox
                    size="small"
                    aria-label={`${u.no} ${u.prod} 선택`}
                    checked={selection.selected.includes(u.id)}
                    onChange={() => selection.onToggle(u.id)}
                  />
                ) : (
                  start + index + 1
                )}
              </TableTd>
              <TableTd>
                <TextButton onClick={() => onOpen(u)}>{u.no}</TextButton>
              </TableTd>
              <TableTd align="center">
                {/* 유형은 분류라 상태색을 쓰지 않는다 — 중립색 */}
                <Tag size="small">{u.type}</Tag>
              </TableTd>
              <TableTd ellipsis>{u.prod}</TableTd>
              <TableTd className="whitespace-nowrap tabular-nums">
                {won(u.amt)}
              </TableTd>
              <TableTd align="center">
                <StatusTag status={txStatusOf(u)} />
              </TableTd>
              <TableTd>
                {note.main}
                {note.main && note.sub ? " " : null}
                {note.sub ? (
                  <span className="text-text-sub">{note.sub}</span>
                ) : null}
              </TableTd>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** 거래 내역 각주 — 반영 건수·금액 = 명세의 확정 거래액(원본 `settleTxFoot`) */
export function TxFoot({ units }: { units: OrderUnit[] }) {
  const foot = txFootOf(units);
  return (
    <NoteBox>
      <p>
        반영{" "}
        <strong className="body-small-bold text-text">
          {foot.count}건 · {won(foot.amount)}
        </strong>
        (= 확정 거래액) · 제외{" "}
        <strong className="body-small-bold text-text">{foot.excluded}건</strong>
      </p>
      <BulletList
        items={TX_RULES.map((rule) => (
          <Bold key={rule} text={rule} />
        ))}
      />
    </NoteBox>
  );
}

export type StmtGate = "confirm" | "object" | null;

/** 정산 [확인]·[이의제기] 창 — 원본 문구 그대로. 확정하면 알림만(상태는 그대로) */
export function StmtGates({
  gate,
  onClose,
}: {
  gate: StmtGate;
  onClose: () => void;
}) {
  const { toast } = useToast();
  return (
    <>
      <NoticeGateModal
        open={gate === "confirm"}
        title={STMT_GATE.confirmTitle}
        count={1}
        confirmLabel={STMT_GATE.confirmButton}
        onClose={onClose}
        onConfirm={() => {
          onClose();
          toast(STMT_GATE.confirmDone);
        }}
      >
        <p>
          <Bold
            text={STMT_GATE.confirmBody}
            strong="body-medium-bold text-text"
          />
        </p>
        <Irreversible>{STMT_GATE.confirmWarn}</Irreversible>
      </NoticeGateModal>
      <RequiredReasonModal
        open={gate === "object"}
        title={STMT_GATE.objectTitle}
        count={1}
        placeholder={STMT_GATE.objectPlaceholder}
        notice={
          <>
            {STMT_GATE.objectHelp}{" "}
            <Irreversible>{STMT_GATE.objectWarn}</Irreversible>
          </>
        }
        emptyMessage={STMT_GATE.objectEmpty}
        confirmLabel={STMT_GATE.objectButton}
        onClose={onClose}
        onConfirm={() => {
          onClose();
          toast(STMT_GATE.objectDone);
        }}
      />
    </>
  );
}
