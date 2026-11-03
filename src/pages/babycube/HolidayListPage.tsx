import { useState } from "react";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import {
  AppShell,
  Button,
  Checkbox,
  DataTableShell,
  DatePicker,
  EmptyState,
  FormField,
  Gnb,
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
  useToast,
  type DateRange,
} from "../../components/ui";
import {
  HOLIDAYS,
  MESSAGES,
  REFERENCE_YEAR,
  inYear,
  periodText,
  yearsOf,
  ymd,
  type Holiday,
} from "./HolidayListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S25 공휴일 관리 — 뼈대 (원본 v0.4 `SCREENS.opsCalendar` 3653 · 모달 `opsForm` 2293 · `gateOpsDel` 2380)
 *
 * ## 화면 유형: 목록형 (`docs/screen-templates.md` §3-1)
 * ```
 * 카드  목록 (총 N건) + 연도 칩 | [+ 공휴일 등록][선택 삭제]
 *       표 [체크] · No · 내용 · 기간 · 등록/수정일 · 관리([수정])
 * ```
 * 등록·수정은 **모달**이다 — 원본 07-29 모달 제거 메모(2280~2300)에 이 화면은 없다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./HolidayListPage.data.ts` 에 있다
 * | 갈아끼울 것        | 위치                                 |
 * | ------------------ | ------------------------------------ |
 * | 데이터·타입·문구   | `HolidayListPage.data.ts` **전체**   |
 * | 표 컬럼 구성       | 이 파일의 `<colgroup>` + `TableHead` |
 * | 등록/수정 폼 필드  | `<Modal>` 안의 `FormField` 묶음      |
 * | 검증 순서          | `submitForm`                         |
 *
 * ## 이 화면이 지키는 약속
 * 1. **업무 확정은 알림만** — 등록·수정·삭제를 눌러도 목록(행·건수·순서·날짜)은 바뀌지 않는다.
 *    로컬인 것은 입력 초안 · 행 선택 · 모달 열림뿐이다(퍼블 범위)
 * 2. **표는 시작일 오름차순**(원본 3626·3655) — 데이터 순서에 기대지 않는다. No 는 그 순서의 1..N
 * 3. **연도는 한 해만** — 칩은 데이터에서 뽑고 `전체` 가 없다. 기본은 기준 연도, 없으면 마지막 해
 * 4. **검증은 원본 순서** — 시작일 → 내용. 종료<시작은 범위 DatePicker 가 구조적으로 못 만든다
 * 5. **삭제 확인 창에 대상을 적지 않는다**(원본 UI-323) — 2건 이상이면 제목에 건수만
 *
 * ## 원본과 다르게 둔 것
 * - **`관리` 열이 마지막이다.** 원본은 No 다음(3번째)이지만 원본의 다른 표(성장단계·카테고리·회원)는
 *   모두 마지막이고, 4~5열 표에서 버튼이 내용보다 앞서면 행을 식별하는 자리를 버튼이 차지한다
 *   (`DESIGN_참고.md` §7 "행 액션은 마지막 열")
 * - 연도 칩은 `SegmentedControl`(FAQ·공지와 같은 대체)
 *
 * ## 기획 확인 필요 (원본대로 둠)
 * - 연도를 바꿔도 선택이 지워지지 않아(원본 3630 도 같다) **안 보이는 행이 삭제 대상에 남을 수 있다**
 * - 빈 상태 공용 문구의 「필터를 초기화」 — 이 화면엔 필터가 없다
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - 페이지네이션 · 내용 검색 · 초기화 · `전체` 연도 칩 · 행 단위 삭제 · 기간 셀의 일수 꼬리표
 * - 머리 도움말 툴팁 · 모달 설명문 · 툴바의 「· N건 선택」 · 빈 상태의 [공휴일 등록] 버튼
 * ====================================================================== */

/** `YYYY-MM-DD` → `Date`. 공백·`T` 파싱 차이를 피하려고 ISO 형태로 넘긴다 */
const toDate = (text: string) => {
  if (text === "") return undefined;
  const at = new Date(`${text}T00:00:00`);
  return Number.isNaN(at.getTime()) ? undefined : at;
};

/** 시작일 오름차순 (약속 2) */
const byStart = (a: Holiday, b: Holiday) => a.startAt.localeCompare(b.startAt);

export interface HolidayListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function HolidayListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: HolidayListPageProps) {
  const { toast } = useToast();

  /** 사용자가 고른 연도. 목록에 없는 해면 아래에서 기준 연도로 되돌린다 */
  const [pickedYear, setPickedYear] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  // 등록/수정 모달 — editingId 가 null 이면 등록, 아니면 수정
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();

  // 삭제 확인 모달 — 지울 건수. null 이면 닫힘
  const [deleteCount, setDeleteCount] = useState<number | null>(null);

  /* 업무 확정이 목록을 바꾸지 않으므로 원본 샘플을 그대로 읽는다(약속 1) */
  const holidays = HOLIDAYS;
  const years = yearsOf(holidays);
  const activeYear = years.includes(pickedYear)
    ? pickedYear
    : years.includes(REFERENCE_YEAR)
      ? REFERENCE_YEAR
      : (years[years.length - 1] ?? REFERENCE_YEAR);

  const filtered = holidays
    .filter((holiday) => inYear(holiday, activeYear))
    .sort(byStart);

  const allChecked =
    filtered.length > 0 &&
    filtered.every((holiday) => selected.includes(holiday.id));
  const someChecked = filtered.some((holiday) => selected.includes(holiday.id));

  const toggleOne = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  /** 페이지네이션이 없어 "보이는 행"이 곧 연도 필터 결과다 */
  const toggleAll = () => {
    const ids = filtered.map((holiday) => holiday.id);
    setSelected((prev) =>
      allChecked
        ? prev.filter((id) => !ids.includes(id))
        : [...prev, ...ids.filter((id) => !prev.includes(id))],
    );
  };

  const openCreate = () => {
    setEditingId(null);
    setContent("");
    setPeriod(undefined);
    setFormOpen(true);
  };

  const openEdit = (holiday: Holiday) => {
    setEditingId(holiday.id);
    setContent(holiday.content);
    setPeriod({ from: toDate(holiday.startAt), to: toDate(holiday.endAt) });
    setFormOpen(true);
  };

  /** 저장 — 검증만 하고 알림을 띄운다. 목록은 그대로다(약속 1) */
  const submitForm = () => {
    if (!period?.from) {
      toast({ message: MESSAGES.needStart, tone: "critical" });
      return;
    }
    if (content.trim() === "") {
      toast({ message: MESSAGES.needContent, tone: "critical" });
      return;
    }
    toast(editingId === null ? MESSAGES.created : MESSAGES.updated);
    setFormOpen(false);
  };

  const requestBulkDelete = () => {
    if (selected.length === 0) {
      toast({ message: MESSAGES.noSelection, tone: "critical" });
      return;
    }
    setDeleteCount(selected.length);
  };

  /** 삭제 — 알림만. 선택 비우기와 창 닫기는 UI 상태 정리다 */
  const confirmDelete = () => {
    toast(MESSAGES.deleted(deleteCount ?? 0));
    setSelected([]);
    setDeleteCount(null);
  };

  return (
    <AppShell
      sidebar={
        <Gnb
          sections={GNB_SECTIONS}
          activeId={activeNav}
          onSelect={onNavSelect}
          open={navOpen}
          onOpenChange={onNavOpenChange}
          logo={GNB_LOGO_SLOTS.logo}
          collapsedLogo={GNB_LOGO_SLOTS.collapsed}
        />
      }
      header={<PageHeader title="공휴일 관리" />}
    >
      <DataTableShell
        toolbarStart={
          <>
            {/* 페이지네이션이 없는 화면이라 총 건수를 툴바가 든다(원본 3661) */}
            <h2 className="heading-medium-bold text-text">
              목록 (총 {filtered.length}건)
            </h2>
            {years.length > 0 && (
              <SegmentedControl
                size="small"
                aria-label="연도"
                items={years.map((year) => ({ value: year, label: year }))}
                value={activeYear}
                onValueChange={setPickedYear}
              />
            )}
          </>
        }
        toolbarEnd={
          <>
            {/* 원본 순서 [+ 공휴일 등록](주) [선택 삭제](테두리) — 3662 */}
            <Button onClick={openCreate}>
              <Plus size={16} strokeWidth={1.2} aria-hidden />
              공휴일 등록
            </Button>
            {/* 잠그지 않는다 — 선택 없이 누르면 이유로 답한다(원본 UI-226) */}
            <Button variant="secondary" onClick={requestBulkDelete}>
              <Trash2 size={16} strokeWidth={1.2} aria-hidden />
              선택 삭제
            </Button>
          </>
        }
        isEmpty={filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<CalendarOff strokeWidth={1.2} aria-hidden />}
            title={MESSAGES.emptyTitle}
            description={MESSAGES.emptyDescription}
          />
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수 — 비율로 나뉜다 */}
          <colgroup>
            <col className="w-10" />
            <col className="w-14" />
            <col className="w-55" />
            <col className="w-43" />
            <col className="w-28" />
            <col className="w-18" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>
                {/* 좁은 열이라 글자 라벨 대신 `aria-label` */}
                <Checkbox
                  size="small"
                  aria-label="전체 선택"
                  checked={allChecked}
                  indeterminate={!allChecked && someChecked}
                  onChange={toggleAll}
                />
              </TableTh>
              <TableTh>No</TableTh>
              <TableTh>내용</TableTh>
              <TableTh>기간</TableTh>
              <TableTh>등록/수정일</TableTh>
              {/* 행 액션은 마지막 열 — 원본(3번째)과 다르게 둔 이유는 상단 주석 */}
              <TableTh>관리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((holiday, index) => (
              <TableRow key={holiday.id}>
                <TableTd>
                  <Checkbox
                    size="small"
                    aria-label={`${holiday.content} 선택`}
                    checked={selected.includes(holiday.id)}
                    onChange={() => toggleOne(holiday.id)}
                  />
                </TableTd>
                <TableTd>{index + 1}</TableTd>
                <TableTd className="break-keep wrap-anywhere">
                  {holiday.content}
                </TableTd>
                <TableTd>{periodText(holiday)}</TableTd>
                <TableTd>{ymd(holiday.date)}</TableTd>
                <TableTd>
                  {/* 표 안에서는 어느 행의 수정인지 소리로 구분되도록 이름만 늘린다 */}
                  <Button
                    variant="secondary"
                    size="small"
                    aria-label={`${holiday.content} 수정`}
                    onClick={() => openEdit(holiday)}
                  >
                    수정
                  </Button>
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* 등록 / 수정 — 같은 폼을 쓰고 제목과 확인 버튼 라벨만 갈린다(원본 2293) */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} size="medium">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={editingId === null ? "공휴일 등록" : "공휴일 수정"}
        />
        {/* ModalBody 가 필드 간격 20 을 이미 준다 — 페이지가 gap 을 또 붙이지 않는다 */}
        <ModalBody>
          <FormField
            label="기간"
            required
            labelDescription="종료일을 비우면 시작일 하루만 등록됩니다."
          >
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
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="예) 추석 연휴"
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
          <Button size="large" onClick={submitForm}>
            {editingId === null ? "등록" : "저장"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* 삭제 확인 — 원본 문구 그대로 · 대상 표기 없음(UI-323) */}
      <Modal
        open={deleteCount !== null}
        onClose={() => setDeleteCount(null)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={`공휴일 삭제${deleteCount !== null && deleteCount > 1 ? ` (${deleteCount}건)` : ""}`}
        />
        <ModalBody>
          {/* 「계산에서 빠진다」와 「되돌릴 수 없다」는 무게가 달라 문단을 나눈다 */}
          <p className="body-medium break-keep text-text-sub">
            {MESSAGES.deleteBody}
          </p>
          <p className="body-medium-bold text-text-critical">
            {MESSAGES.deleteWarn}
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
          <Button variant="critical" size="large" onClick={confirmDelete}>
            삭제
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
