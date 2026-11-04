import { useState } from "react";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  Checkbox,
  DataTableShell,
  DatePicker,
  EmptyState,
  FormField,
  InfoItem,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  SegmentedControl,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tooltip,
  useToast,
  type DateRange,
} from "../../components/ui";
import { LIST_COPY } from "./processList.data";
import { useDirectAccount } from "./sellerAccount";
import { Bold, Section, SellerShell, type SellerNavProps } from "./SettleParts";
import {
  CS_FIELDS,
  OPS_COPY,
  OPS_ROWS,
  REFERENCE_YEAR,
  SET,
  STORE_COPY,
  STORE_INFO,
  byStart,
  inYear,
  rangeOf,
  yearsOf,
  type CsSettings,
  type OpsRow,
} from "./SystemPages.data";

/* =========================================================================
 * 시스템·운영 — 스토어 정보 · 설정(SO-SYS-001) · 공휴일 관리(SO-SYS-002)
 *
 * 스토어: [안내 + 1:1 문의로 정보 변경 요청] · 판매자 정보(읽기) · 고객 센터 정보(입력) · 개인정보 처리방침(안내) · [저장]
 * 공휴일: 목록 (총 N건) + 연도 칩 | [+ 공휴일 등록][선택 삭제] · 표 · 등록/수정 창(자사분만) · 삭제 확인 창
 *
 * 퍼블 범위: 입력은 이 화면 state 만 · 저장·등록·삭제는 원본 알림 문구만(목록은 그대로). 도메인 = `./SystemPages.data.ts`.
 *
 * ## 원본과 다르게 둔 곳 (본사 공휴일 관리와 같은 이유)
 * - 연도 칩 = `SegmentedControl` · 관리([수정]) 열은 맨 끝(원본은 No 다음)
 * - 본사 등록분 [수정]은 잠근 채 툴팁(원본 `title`)으로 이유를 말한다 · 체크박스도 잠금
 * - 「등록/수정일」은 원본 표기(점) 그대로
 * ====================================================================== */

const LABEL_WIDTH = 140;

export function StorePage(props: SellerNavProps) {
  const { toast } = useToast();
  const [cs, setCs] = useState<CsSettings>(SET);
  /* 직영 계정(Q-69) — 안내만 바뀌고 [1:1 문의로 정보 변경 요청]이 빠진다 */
  const direct = useDirectAccount();

  return (
    <SellerShell {...props} header={<PageHeader title="스토어 정보 · 설정" />}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="body-small max-w-160 break-keep text-text-sub">
          <Bold text={direct ? STORE_COPY.directGuide : STORE_COPY.guide} />
        </p>
        {!direct && (
          <Button onClick={() => props.onNavSelect("/seller-ask")}>
            {STORE_COPY.askButton}
          </Button>
        )}
      </div>

      <Section title="판매자 정보" summary={STORE_COPY.infoSummary}>
        <InfoList>
          <InfoItem label="회사명(스토어명)" labelWidth={LABEL_WIDTH}>
            {STORE_INFO.name}
          </InfoItem>
          <InfoItem label="사업자 등록 번호" labelWidth={LABEL_WIDTH}>
            {STORE_INFO.bizNo}
          </InfoItem>
          <InfoItem label="대표자명" labelWidth={LABEL_WIDTH}>
            {STORE_INFO.owner}
          </InfoItem>
          <InfoItem label="전화 번호" labelWidth={LABEL_WIDTH}>
            {STORE_INFO.tel}
          </InfoItem>
          <InfoItem label="주소" labelWidth={LABEL_WIDTH}>
            <span className="flex flex-col">
              <span>{STORE_INFO.addr}</span>
              <span>{STORE_INFO.addrDetail}</span>
            </span>
          </InfoItem>
          <InfoItem label="정산 계좌" labelWidth={LABEL_WIDTH}>
            {STORE_INFO.bank}
          </InfoItem>
          <InfoItem label="스토어 소개" labelWidth={LABEL_WIDTH}>
            {STORE_INFO.intro}
          </InfoItem>
        </InfoList>
      </Section>

      <Section title="고객 센터 정보">
        {CS_FIELDS.map((f) => (
          <FormField key={f.key} label={f.label} required={f.required}>
            <Input
              className={f.width}
              maxLength={f.max}
              placeholder={f.placeholder}
              value={cs[f.key]}
              onChange={(event) =>
                setCs((prev) => ({ ...prev, [f.key]: event.target.value }))
              }
            />
          </FormField>
        ))}
        <p className="body-small max-w-3xl break-keep text-text-sub">
          <Bold text={STORE_COPY.csHelp} />
        </p>
      </Section>

      <Section title="개인정보 처리방침" summary={STORE_COPY.privacySummary}>
        <p className="body-small max-w-3xl break-keep text-text-sub">
          <Bold text={STORE_COPY.privacy} />
        </p>
      </Section>

      {/* 하단 바 — 원본 [저장] 하나(왼쪽 비움) */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-end gap-2">
          <Button onClick={() => toast(STORE_COPY.saved)}>저장</Button>
        </div>
      </Card>
    </SellerShell>
  );
}

/* ---------- 공휴일 관리 ---------- */

const toDate = (s: string) => new Date(`${s}T00:00:00`);

export function OpsCalendarPage(props: SellerNavProps) {
  const { toast } = useToast();
  const [pickedYear, setPickedYear] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OpsRow | null>(null);
  const [label, setLabel] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [deleteCount, setDeleteCount] = useState<number | null>(null);

  const years = yearsOf(OPS_ROWS);
  const year = years.includes(pickedYear)
    ? pickedYear
    : years.includes(REFERENCE_YEAR)
      ? REFERENCE_YEAR
      : (years[years.length - 1] ?? REFERENCE_YEAR);
  const list = OPS_ROWS.filter((o) => inYear(o, year)).sort(byStart);
  /** 전체 선택 = 자사 등록분만(원본 `LASTVIS`) */
  const ownIds = list.filter((o) => o.own).map((o) => o.id);
  const allChecked =
    ownIds.length > 0 && ownIds.every((id) => selected.includes(id));
  const someChecked = ownIds.some((id) => selected.includes(id));

  const openForm = (o: OpsRow | null) => {
    setEditing(o);
    setLabel(o?.label ?? "");
    setPeriod(
      o ? { from: toDate(o.from), to: toDate(o.to || o.from) } : undefined,
    );
    setFormOpen(true);
  };
  const submit = () => {
    if (!period?.from) return toast(OPS_COPY.needStart);
    if (!label.trim()) return toast(OPS_COPY.needLabel);
    toast(editing ? OPS_COPY.updated : OPS_COPY.created);
    setFormOpen(false);
  };

  return (
    <SellerShell {...props} header={<PageHeader title="공휴일 관리" />}>
      <DataTableShell
        variant="soft"
        toolbarStart={
          <>
            <h2 className="heading-medium-bold text-text">
              목록 (총 {list.length}건)
            </h2>
            {years.length > 0 && (
              <SegmentedControl
                size="small"
                aria-label="연도"
                items={years.map((y) => ({ value: y, label: y }))}
                value={year}
                onValueChange={(y) => {
                  setPickedYear(y);
                  setSelected([]);
                }}
              />
            )}
          </>
        }
        toolbarEnd={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                const picked = selected.length > 0;
                toast(
                  LIST_COPY.excel(
                    picked ? selected.length : list.length,
                    picked,
                  ),
                );
              }}
            >
              엑셀 다운로드
            </Button>
            <Button onClick={() => openForm(null)}>
              <Plus size={16} strokeWidth={1.2} aria-hidden />
              공휴일 등록
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                selected.length === 0
                  ? toast(OPS_COPY.noSelection)
                  : setDeleteCount(selected.length)
              }
            >
              <Trash2 size={16} strokeWidth={1.2} aria-hidden />
              선택 삭제
            </Button>
          </>
        }
        isEmpty={list.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<CalendarOff strokeWidth={1.2} aria-hidden />}
            title={LIST_COPY.emptyTitle}
            description={LIST_COPY.emptyDescription}
          />
        }
      >
        <Table>
          <colgroup>
            <col className="w-13" />
            <col className="w-16" />
            <col />
            <col className="w-60" />
            <col className="w-32" />
            <col className="w-24" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>
                <Checkbox
                  size="small"
                  aria-label="자사 등록분 전체 선택"
                  checked={allChecked}
                  indeterminate={!allChecked && someChecked}
                  onChange={() => setSelected(allChecked ? [] : ownIds)}
                />
              </TableTh>
              <TableTh>No</TableTh>
              <TableTh>내용</TableTh>
              <TableTh>기간</TableTh>
              <TableTh>등록/수정일</TableTh>
              <TableTh>관리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((o, i) => (
              <TableRow key={o.id}>
                <TableTd>
                  <Checkbox
                    size="small"
                    aria-label={`${o.label} 선택`}
                    disabled={!o.own}
                    checked={selected.includes(o.id)}
                    onChange={() =>
                      setSelected((prev) =>
                        prev.includes(o.id)
                          ? prev.filter((v) => v !== o.id)
                          : [...prev, o.id],
                      )
                    }
                  />
                </TableTd>
                <TableTd className="tabular-nums">{i + 1}</TableTd>
                <TableTd className="break-keep">{o.label || "-"}</TableTd>
                <TableTd className="tabular-nums">{rangeOf(o)}</TableTd>
                <TableTd className="tabular-nums">{o.at || "-"}</TableTd>
                <TableTd>
                  {o.own ? (
                    <Button
                      variant="secondary"
                      size="small"
                      aria-label={`${o.label} 수정`}
                      onClick={() => openForm(o)}
                    >
                      수정
                    </Button>
                  ) : (
                    <Tooltip content={OPS_COPY.lockTip}>
                      <span tabIndex={0} className="inline-flex">
                        <Button
                          variant="secondary"
                          size="small"
                          disabled
                          aria-label={`${o.label} 수정 (본사 등록분)`}
                        >
                          수정
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} size="medium">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={OPS_COPY.formTitle(!!editing)}
        />
        <ModalBody>
          <FormField label="기간" required labelDescription={OPS_COPY.formHelp}>
            <DatePicker
              mode="range"
              value={period}
              onChange={setPeriod}
              startPlaceholder="시작일"
              endPlaceholder="종료일"
            />
          </FormField>
          <FormField label="내용" required>
            <Input
              value={label}
              placeholder={OPS_COPY.labelPlaceholder}
              onChange={(event) => setLabel(event.target.value)}
            />
          </FormField>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setFormOpen(false)}
          >
            취소
          </Button>
          <Button size="large" onClick={submit}>
            {editing ? "저장" : "등록"}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        open={deleteCount !== null}
        onClose={() => setDeleteCount(null)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={`공휴일 삭제${deleteCount && deleteCount > 1 ? ` (${deleteCount}건)` : ""}`}
        />
        <ModalBody>
          <p className="body-medium break-keep text-text-sub">
            {OPS_COPY.deleteBody}
          </p>
          <p className="body-medium-bold text-text-critical">
            {OPS_COPY.deleteWarn}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setDeleteCount(null)}
          >
            취소
          </Button>
          <Button
            variant="critical"
            size="large"
            onClick={() => {
              toast(OPS_COPY.deleted(deleteCount ?? 0));
              setSelected([]);
              setDeleteCount(null);
            }}
          >
            삭제
          </Button>
        </ModalFooter>
      </Modal>
    </SellerShell>
  );
}
