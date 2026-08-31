import { useState } from "react";
import { CalendarOff, HelpCircle, Plus, Trash2 } from "lucide-react";
import {
  AppShell,
  Button,
  Checkbox,
  DataTableShell,
  DatePicker,
  EmptyState,
  FormField,
  Gnb,
  IconButton,
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
import {
  HOLIDAYS,
  inYear,
  nextHolidayId,
  periodText,
  stamp,
  toYmd,
  yearsOf,
  ymd,
  type Holiday,
} from "./HolidayListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S25 공휴일 관리 — 뼈대
 *
 * ## 화면 유형: 목록형 (`src/pages/OrderListPage.tsx` 변형)
 * 판정 근거 — `sections` 에 "목록 헤더 · 데이터 테이블", `components` 에
 * `Table`·`Checkbox`·`EmptyState`. 폼이 있긴 하지만 **모달 안**이라 화면 자체는 목록이다
 * (§2 "한 화면의 유형 판정이 갈릴 때 목록형을 우선한다").
 *
 * ## ⚠️ 이 화면의 핵심 규칙 — **종료일은 선택값이다**
 * 비우면 시작일 하루만 등록된다. 뼈대는 그 규칙을 **세 곳에서 같은 근거로** 다룬다.
 *   1) 기간 필드의 `labelDescription` — 사용자에게 알린다
 *   2) 저장 시 `endAt: toYmd(period.to)` — 안 고르면 빈 문자열이 그대로 저장된다
 *   3) 표의 기간 셀 `periodText` — 하루짜리는 **날짜 하나만** 찍는다
 * 일수는 세지 않는다 — `(3일)`·`(하루)` 꼬리표는 원본에 없다.
 *
 * ## ⚠️ 연도 축은 상수가 아니라 **데이터에서 뽑는다**
 * 원본은 행에서 연도를 모아 칩으로 깔고(`yearsOf`), **항상 한 해만** 보여 준다.
 * 그래서 `전체` 칩이 없다. 고른 연도가 목록에서 사라지면(삭제·수정) 올해로,
 * 올해도 없으면 마지막 연도로 되돌린다 — 원본 `A` 의 판정 그대로다.
 *
 * ## ⚠️ 원본과 **의도적으로 다른 것** — `관리` 열이 마지막이다
 * 원본 `/ops-calendar` 는 `관리` 를 체크박스 바로 다음(맨 앞)에 둔다. 그대로 옮겼다가
 * 되돌렸다 — 4열짜리 표에서 첫 열이 "수정" 반복이면 **행을 식별하는 자리(내용)를
 * 버튼이 차지한다.** 체크박스까지 합쳐 컨트롤 둘을 지나야 정보가 시작된다.
 * 열이 많은 표(`OrderListPage` 19열)라면 좌측 배치가 유리하지만 여기는 4열이라
 * 그 이득이 없다. 같은 사이드바의 `Category`·`GrowthStage`·`Member` 도 전부 마지막이다.
 * 규칙: `DESIGN_참고.md` §7 "행 액션은 마지막 열".
 *
 * | 갈아끼울 것        | 위치                                 |
 * | ------------------ | ------------------------------------ |
 * | 데이터·타입·라벨   | `HolidayListPage.data.ts` **전체**   |
 * | 표 컬럼 구성       | 이 파일의 `<colgroup>` + `TableHead` |
 * | 등록/수정 폼 필드  | `<Modal>` 안의 `FormField` 묶음      |
 * | 검증 순서·문구     | `submitForm`                         |
 *
 * ## 그대로 두는 것
 * `DataTableShell` 셸 구조 · 행 선택/전체 선택 규칙 · 빈 상태 ·
 * 간격은 컨테이너가 책임진다(`ModalBody` gap-5 · `FormField` gap-1.5)
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **페이지네이션.** 연도로 걸러 보는 화면이라 한 해 치가 한 화면에 들어간다.
 *   총 건수는 페이지네이션 좌측이 아니라 **툴바**가 들고 있다
 * - **내용 검색 · 초기화 · `전체` 연도 칩**
 * - **행 단위 삭제.** `관리` 열에는 `수정` 버튼 하나뿐이고, 삭제는 선택 → `선택 삭제` 뿐이다
 * - **삭제 부분 실패 경로(`DELETE_BLOCKED_IDS`).** 원본 삭제는 성공/실패뿐이다
 * - **기간 셀의 일수 꼬리표(`(3일)`·`(하루)`)**
 * ====================================================================== */

/** `YYYY-MM-DD` → `Date`. 공백·`T` 파싱 차이를 피하려고 ISO 형태로 넘긴다 */
const toDate = (text: string) => {
  if (text === "") return undefined;
  const at = new Date(`${text}T00:00:00`);
  return Number.isNaN(at.getTime()) ? undefined : at;
};

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

  const [holidays, setHolidays] = useState<Holiday[]>(HOLIDAYS);
  /** 사용자가 고른 연도. 목록에 없는 해가 되면 아래에서 자동으로 되돌린다 */
  const [pickedYear, setPickedYear] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  // 등록/수정 모달 — editingId 가 null 이면 등록, 아니면 수정
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();

  // 삭제 확인 모달 — 행 1건과 선택 N건이 같은 모달을 쓴다
  const [deleteTargets, setDeleteTargets] = useState<Holiday[] | null>(null);

  const years = yearsOf(holidays);
  /*
    고른 해가 목록에 남아 있으면 그것, 아니면 올해, 올해도 없으면 마지막 해.
    (원본 `/ops-calendar` 의 `A` 와 같은 판정 — `전체` 라는 선택지 자체가 없다)
  */
  const thisYear = String(new Date().getFullYear());
  const activeYear = years.includes(pickedYear)
    ? pickedYear
    : years.includes(thisYear)
      ? thisYear
      : (years[years.length - 1] ?? thisYear);

  const filtered = holidays.filter((holiday) => inYear(holiday, activeYear));

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
    setPeriod({
      from: toDate(holiday.startAt),
      to: toDate(holiday.endAt),
    });
    setFormOpen(true);
  };

  /**
   * 저장. 검증 순서는 **원본 그대로** — 시작일 → 내용이다.
   * 종료일을 고르지 않으면 `toYmd(undefined)` 가 빈 문자열을 내고,
   * 그 빈 문자열이 곧 "시작일 하루" 라는 뜻이다(`periodText` 가 그렇게 읽는다).
   */
  const submitForm = () => {
    if (!period?.from) {
      toast({ message: "시작일을 선택해주세요.", tone: "critical" });
      return;
    }
    if (content.trim() === "") {
      toast({ message: "내용을 입력해주세요.", tone: "critical" });
      return;
    }

    const draft = {
      content: content.trim(),
      startAt: toYmd(period.from),
      endAt: toYmd(period.to),
      date: stamp(),
    };

    if (editingId === null) {
      setHolidays((prev) => [{ id: nextHolidayId(prev), ...draft }, ...prev]);
      /* 방금 넣은 해로 칩을 옮겨 준다 — 다른 해를 보고 있으면 결과가 안 보인다 */
      setPickedYear(draft.startAt.slice(0, 4));
      toast("등록되었습니다.");
    } else {
      setHolidays((prev) =>
        prev.map((holiday) =>
          holiday.id === editingId ? { ...holiday, ...draft } : holiday,
        ),
      );
      setPickedYear(draft.startAt.slice(0, 4));
      toast("수정되었습니다.");
    }
    setFormOpen(false);
  };

  const requestBulkDelete = () => {
    if (selected.length === 0) {
      toast({ message: "선택된 공휴일이 없습니다.", tone: "critical" });
      return;
    }
    setDeleteTargets(
      holidays.filter((holiday) => selected.includes(holiday.id)),
    );
  };

  /**
   * 삭제 실행. 원본은 성공/실패뿐이라 부분 실패 경로가 없다.
   * 결과 문구는 **1건이어도 건수를 단다** — 원본 `${t.length}건 삭제되었습니다.` 그대로다.
   */
  const confirmDelete = () => {
    const targets = deleteTargets ?? [];
    const ids = targets.map((holiday) => holiday.id);

    setHolidays((prev) => prev.filter((holiday) => !ids.includes(holiday.id)));
    setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    setDeleteTargets(null);
    toast(`${targets.length}건 삭제되었습니다.`);
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
      header={
        <PageHeader
          title="공휴일 관리"
          badges={
            <Tooltip
              title="공휴일 관리"
              content="여기 등록한 날짜는 대여 불가일 계산에 그대로 반영됩니다. 종료일을 비우면 시작일 하루만 등록됩니다."
            >
              <IconButton
                size="small"
                label="도움말"
                icon={<HelpCircle strokeWidth={1.2} aria-hidden />}
              />
            </Tooltip>
          }
          actions={
            <>
              <Button variant="secondary" onClick={requestBulkDelete}>
                <Trash2 size={16} strokeWidth={1.2} aria-hidden />
                선택 삭제
              </Button>
              <Button onClick={openCreate}>
                <Plus size={16} strokeWidth={1.2} aria-hidden />
                공휴일 등록
              </Button>
            </>
          }
        />
      }
    >
      <DataTableShell
        toolbarStart={
          <>
            {/*
              페이지네이션이 없어 총 건수를 툴바가 들고 있다.
              선택 건수를 **같은 노드**에 이어 붙인다 — 원본 `ListHead` 도 한 줄이다.
            */}
            <span className="body-medium text-text-sub">
              목록 (총 {filtered.length}건)
              {selected.length > 0 ? ` · ${selected.length}건 선택` : ""}
            </span>
            {years.length > 0 && (
              <SegmentedControl
                aria-label="연도"
                items={years.map((year) => ({ value: year, label: year }))}
                value={activeYear}
                onValueChange={setPickedYear}
              />
            )}
          </>
        }
        isEmpty={filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<CalendarOff strokeWidth={1.2} aria-hidden />}
            title="등록된 공휴일이 없습니다"
            description="공휴일을 등록하면 대여 불가일 계산에 반영됩니다."
          >
            <Button onClick={openCreate}>
              <Plus size={16} strokeWidth={1.2} aria-hidden />
              공휴일 등록
            </Button>
          </EmptyState>
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수 — 합 100% */}
          <colgroup>
            <col className="w-10" />
            <col className="w-55" />
            <col className="w-43" />
            <col className="w-28" />
            <col className="w-18" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>
                {/*
                  라벨 텍스트를 띄우면 5% 폭 컬럼이 무너진다. `label` 대신
                  `aria-label` 을 쓰면 이름은 남고 글자는 나오지 않는다.
                */}
                <Checkbox
                  size="small"
                  aria-label="전체 선택"
                  checked={allChecked}
                  indeterminate={!allChecked && someChecked}
                  onChange={toggleAll}
                />
              </TableTh>
              <TableTh>내용</TableTh>
              <TableTh>기간</TableTh>
              <TableTh>등록/수정일</TableTh>
              {/* 행 액션은 마지막 열이다 — `DESIGN_참고.md` §7 */}
              <TableTh>관리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((holiday) => (
              <TableRow key={holiday.id}>
                <TableTd>
                  <Checkbox
                    size="small"
                    aria-label={`${holiday.content} 선택`}
                    checked={selected.includes(holiday.id)}
                    onChange={() => toggleOne(holiday.id)}
                  />
                </TableTd>
                <TableTd>{holiday.content}</TableTd>
                <TableTd>{periodText(holiday)}</TableTd>
                <TableTd>{ymd(holiday.date)}</TableTd>
                <TableTd>
                  {/*
                    버튼 글자는 `수정` 한 단어지만, 표 안에서는 어느 행의 수정인지
                    소리로 구분되지 않는다. 이름만 `aria-label` 로 늘려 준다.
                  */}
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

      {/* 등록 / 수정 — 같은 폼을 쓰고 제목과 확인 버튼 라벨만 갈린다 */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} size="medium">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={editingId === null ? "공휴일 등록" : "공휴일 수정"}
          description="등록한 날짜는 대여 불가일 계산에 반영됩니다."
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

      {/* 삭제 확인 — 문구는 원본 그대로다(도메인) */}
      <Modal
        open={deleteTargets !== null}
        onClose={() => setDeleteTargets(null)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          /*
            2건 이상이면 제목에 건수를 단다 — 여러 건을 지우는 자리에서
            "무엇을" 대신 "몇 건을" 이 먼저 필요하다.
          */
          title={
            deleteTargets && deleteTargets.length > 1
              ? `공휴일 삭제 (${deleteTargets.length}건)`
              : "공휴일 삭제"
          }
          description={
            deleteTargets && deleteTargets.length === 1
              ? deleteTargets[0].content
              : `선택한 ${deleteTargets?.length ?? 0}건`
          }
        />
        <ModalBody>
          {/*
            위험 안내는 **한 문단에 묻지 않는다.** "계산에서 빠진다"(되돌릴 수 있는 결과)와
            "되돌릴 수 없다"는 무게가 다른 말이라, 이어 붙이면 뒤엣것이 읽히지 않는다.
          */}
          <p className="body-medium text-text-sub">
            삭제하면 목록에서 사라지고 대여 불가일 계산에서도 즉시 제외됩니다.
          </p>
          <p className="body-medium text-text-critical">
            삭제 후에는 되돌릴 수 없습니다.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setDeleteTargets(null)}
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
