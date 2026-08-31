import { useState } from "react";
import { HelpCircle, MessageSquare, Plus, Trash2 } from "lucide-react";
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
  Pagination,
  SegmentedControl,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  Textarea,
  Tooltip,
  useToast,
  type DateRange,
} from "../../components/ui";
import {
  DELETE_BLOCKED_IDS,
  PAGE_SIZE,
  POPUPS,
  STATUS_ITEMS,
  STATUS_META,
  nextPopupId,
  periodText,
  stamp,
  toYmd,
  ymd,
  type Popup,
} from "./PopupListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S24 팝업 관리 — 뼈대
 *
 * ## 화면 유형: 목록형 (`src/pages/OrderListPage.tsx` 변형)
 * 판정 근거 — `sections` 에 "데이터 테이블 · 페이지네이션", `components` 에
 * `Table`·`Pagination`·`Checkbox`·`EmptyState`. §2 신호표 목록형 1행.
 *
 * ## 배너(S23)와 같은 골격이다
 * 상태 3종(전시중·전시중지·숨김) + 기간(종료일 없으면 상시)이라는 축이 같고,
 * 행 선택 → `선택 삭제` → 확인 모달 → 부분 실패 안내라는 흐름도 같다.
 * 행 클릭은 상세가 아니라 **수정 모달**을 연다(이 도메인에 상세 화면이 없다).
 * 그래서 체크박스 셀은 `stopPropagation` 으로 행 클릭을 막는다.
 *
 * | 갈아끼울 것             | 위치                                 |
 * | ----------------------- | ------------------------------------ |
 * | 데이터·타입·라벨·상태색 | `PopupListPage.data.ts` **전체**     |
 * | 표 컬럼 구성            | 이 파일의 `<colgroup>` + `TableHead` |
 * | 등록/수정 폼 필드       | `<Modal>` 안의 `FormField` 묶음      |
 * | 삭제 안내 문구          | 삭제 확인 `<Modal>` 의 본문          |
 *
 * ## 그대로 두는 것
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 페이지 범위 클램프 ·
 * 행 선택/전체 선택 규칙 · 빈 상태 분기 · 간격은 컨테이너가 책임진다
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **노출 유형 세그먼트(상시/기간 지정) · 제목·내용 검색 · 초기화.**
 *   원본 `/popups` 는 `popupsApi.all()` 로 전량을 받아 `card > ListHead + Table`
 *   한 덩어리로 그린다 — 툴바에 조건 축이 하나도 없다
 * - **행 `관리` 드롭다운(수정·삭제).** 수정은 행 클릭으로, 삭제는 선택 →
 *   `선택 삭제` 한 길로만 간다. 되살리면 삭제 입구가 둘이 되어 확인 모달의 대상이 갈린다
 * - **노출 기간 셀의 `상시` 배지.** 같은 행에 상태 `Tag` 가 이미 색을 쓰고 있어
 *   배지가 둘이 되면 한 행에서 색이 두 축을 다툰다 — 원본도 글자로만 적는다
 * ====================================================================== */

/** `YYYY-MM-DD` → `Date`. 공백·`T` 파싱 차이를 피하려고 ISO 형태로 넘긴다 */
const toDate = (text: string) => {
  if (text === "") return undefined;
  const at = new Date(`${text}T00:00:00`);
  return Number.isNaN(at.getTime()) ? undefined : at;
};

export interface PopupListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function PopupListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: PopupListPageProps) {
  const { toast } = useToast();

  const [popups, setPopups] = useState<Popup[]>(POPUPS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  // 등록/수정 모달 — editingId 가 null 이면 등록, 아니면 수정
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [content, setContent] = useState("");
  const [contentTouched, setContentTouched] = useState(false);
  const [status, setStatus] = useState("visible");
  const [period, setPeriod] = useState<DateRange | undefined>();

  // 삭제 확인 모달 — 행 1건과 선택 N건이 같은 모달을 쓴다
  const [deleteTargets, setDeleteTargets] = useState<Popup[] | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /*
    원본 `/popups` 의 툴바에는 **조건 축이 하나도 없다** — 목록 제목 하나뿐이다.
    (한때 노출 유형 세그먼트·검색·초기화를 두었는데 원본 대조에서 걷어냈다)
  */
  const filtered = popups;

  // 삭제로 결과가 줄면 현재 페이지가 범위를 벗어난다 → 마지막 페이지로 당긴다
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const pageIds = paged.map((popup) => popup.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someChecked = pageIds.some((id) => selected.includes(id));

  const toggleOne = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  /** 헤더 체크박스는 **현재 페이지**만 다룬다 — 보이지 않는 행이 조용히 선택되면 위험하다 */
  const togglePage = () => {
    setSelected((prev) =>
      allChecked
        ? prev.filter((id) => !pageIds.includes(id))
        : [...prev, ...pageIds.filter((id) => !prev.includes(id))],
    );
  };

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setTitleTouched(false);
    setContent("");
    setContentTouched(false);
    setStatus("visible");
    setPeriod(undefined);
    setFormOpen(true);
  };

  const openEdit = (popup: Popup) => {
    setEditingId(popup.id);
    setTitle(popup.title);
    setTitleTouched(false);
    setContent(popup.content);
    setContentTouched(false);
    setStatus(popup.status);
    setPeriod(
      popup.startAt === ""
        ? undefined
        : { from: toDate(popup.startAt), to: toDate(popup.endAt) },
    );
    setFormOpen(true);
  };

  const titleError =
    titleTouched && title.trim() === ""
      ? "팝업 제목을 입력해주세요."
      : undefined;
  const contentError =
    contentTouched && content.trim() === ""
      ? "내용을 입력해주세요."
      : undefined;

  const submitForm = () => {
    setTitleTouched(true);
    setContentTouched(true);
    if (title.trim() === "" || content.trim() === "") {
      toast({
        message: "입력하지 않은 필수 항목이 있습니다.",
        tone: "critical",
      });
      return;
    }
    if (!period?.from) {
      toast({ message: "노출 시작일을 선택해주세요.", tone: "critical" });
      return;
    }

    const draft = {
      title: title.trim(),
      content: content.trim(),
      status: status as Popup["status"],
      /* 저장 형식은 하이픈(`2026-08-18`) — 화면에 낼 때 `ymd` 가 점으로 바꾼다 */
      startAt: toYmd(period.from),
      endAt: toYmd(period.to),
    };

    if (editingId === null) {
      setPopups((prev) => [
        { id: nextPopupId(prev), ...draft, date: stamp() },
        ...prev,
      ]);
      toast("등록되었습니다.");
    } else {
      setPopups((prev) =>
        prev.map((popup) =>
          popup.id === editingId ? { ...popup, ...draft } : popup,
        ),
      );
      toast("수정되었습니다.");
    }
    setFormOpen(false);
  };

  const requestBulkDelete = () => {
    if (selected.length === 0) {
      toast({ message: "선택된 팝업이 없습니다.", tone: "critical" });
      return;
    }
    setDeleteError(null);
    setDeleteTargets(popups.filter((popup) => selected.includes(popup.id)));
  };

  /**
   * 삭제 실행. 서버가 일부만 지우는 경우가 있어 **전부 실패 / 일부 실패 / 성공**을 나눈다.
   * 실패가 남으면 모달을 닫지 않는다 — 무엇이 남았는지 바로 확인해야 하기 때문이다.
   */
  const confirmDelete = () => {
    const targets = deleteTargets ?? [];
    const blocked = targets.filter((popup) =>
      DELETE_BLOCKED_IDS.includes(popup.id),
    );
    const removable = targets.filter(
      (popup) => !DELETE_BLOCKED_IDS.includes(popup.id),
    );

    setPopups((prev) =>
      prev.filter((popup) => !removable.some((item) => item.id === popup.id)),
    );
    setSelected((prev) =>
      prev.filter((id) => !removable.some((item) => item.id === id)),
    );

    if (blocked.length === targets.length) {
      /*
        토스트는 2.6초 뒤 사라지므로 **모달 안에도 같은 말을 남긴다.**
        토스트만 띄우면 "왜 안 지워졌지"가 화면에서 없어진다.
      */
      toast({ message: "팝업을 삭제하지 못했습니다.", tone: "critical" });
      setDeleteError(
        "삭제 실패 — 팝업을 삭제하지 못했습니다. 문제를 확인한 뒤 다시 시도해 주세요.",
      );
      return;
    }
    if (blocked.length > 0) {
      toast({
        message:
          "요청한 팝업이 모두 삭제되지 않았습니다. 목록을 다시 확인해 주세요.",
        tone: "critical",
      });
      setDeleteError(
        "삭제 실패 — 일부가 남았습니다. 문제를 확인한 뒤 다시 시도해 주세요.",
      );
      setDeleteTargets(blocked);
      return;
    }

    /* 2건 이상이면 건수를 앞에 단다 — 몇 건이 사라졌는지가 곧 결과다 */
    toast(
      removable.length > 1
        ? `${removable.length}건 삭제되었습니다.`
        : "삭제되었습니다.",
    );
    setDeleteTargets(null);
    setDeleteError(null);
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
          title="팝업 관리"
          badges={
            <Tooltip
              title="팝업 관리"
              content="사용자 화면 진입 시 뜨는 팝업입니다. 종료일을 비우면 상시 노출되고, 숨김으로 바꾸면 즉시 내려갑니다."
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
                팝업 등록
              </Button>
            </>
          }
        />
      }
    >
      <DataTableShell
        /*
          원본 툴바에는 조건 축이 없다 — 목록 제목 하나뿐이다.
          선택 건수를 여기 붙여 두어야 "몇 개 골랐는지"가 삭제 버튼 근처에서 보인다.
        */
        toolbarStart={
          <>
            <h2 className="heading-medium-bold text-text">
              목록 (총 {filtered.length}건)
            </h2>
            {/* 선택 건수는 **별도 노드**로 둔다 — 제목에 이어 붙이면 한 덩어리가 되어
                "몇 건 골랐나"만 따로 읽을 수 없다 */}
            {selected.length > 0 && (
              <span className="body-small text-text-sub">
                {selected.length}건 선택
              </span>
            )}
          </>
        }
        isEmpty={filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<MessageSquare strokeWidth={1.2} aria-hidden />}
            title="등록된 팝업이 없습니다"
            description="팝업을 등록하면 사용자 화면 진입 시 노출됩니다."
          >
            <Button onClick={openCreate}>
              <Plus size={16} strokeWidth={1.2} aria-hidden />
              팝업 등록
            </Button>
          </EmptyState>
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수 — 합 100% */}
          <colgroup>
            <col className="w-10" />
            <col className="w-50" />
            <col className="w-60" />
            <col className="w-23" />
            <col className="w-45" />
            <col className="w-28" />
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
                  onChange={togglePage}
                />
              </TableTh>
              <TableTh>팝업 제목</TableTh>
              <TableTh>내용</TableTh>
              <TableTh align="center">상태</TableTh>
              <TableTh>노출 기간</TableTh>
              <TableTh>등록일</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((popup) => {
              const meta = STATUS_META[popup.status];
              return (
                <TableRow
                  key={popup.id}
                  clickable
                  onClick={() => openEdit(popup)}
                >
                  <TableTd>
                    <div
                      role="presentation"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        size="small"
                        aria-label={`${popup.title} 선택`}
                        checked={selected.includes(popup.id)}
                        onChange={() => toggleOne(popup.id)}
                      />
                    </div>
                  </TableTd>
                  <TableTd>{popup.title}</TableTd>
                  <TableTd ellipsis>{popup.content}</TableTd>
                  <TableTd align="center">
                    <Tag tone={meta.tone} dot>
                      {meta.label}
                    </Tag>
                  </TableTd>
                  {/* 상시는 `periodText` 가 글자로 적는다 — 배지를 두 개 쓰지 않는다 */}
                  <TableTd>{periodText(popup)}</TableTd>
                  <TableTd>{ymd(popup.date)}</TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* 등록 / 수정 — 같은 폼을 쓰고 제목만 갈린다 */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} size="medium">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={editingId === null ? "팝업 등록" : "팝업 수정"}
          description="사용자 화면 진입 시 뜨는 팝업입니다."
        />
        {/* ModalBody 가 필드 간격 20 을 이미 준다 — 페이지가 gap 을 또 붙이지 않는다 */}
        <ModalBody>
          <FormField label="팝업 제목" required error={titleError}>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => setTitleTouched(true)}
              placeholder="예) 8월 정기 점검 안내"
            />
          </FormField>

          <FormField
            label="내용"
            required
            description="팝업 본문에 그대로 노출됩니다"
            error={contentError}
          >
            <Textarea
              minRows={4}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onBlur={() => setContentTouched(true)}
              placeholder="예) 8/25(화) 02:00~04:00 서비스 점검이 있습니다."
            />
          </FormField>

          {/* SegmentedControl 루트는 `<div role="radiogroup">` 이라 group 이 필요하다 */}
          <FormField label="상태" group>
            <SegmentedControl
              items={STATUS_ITEMS}
              value={status}
              onValueChange={setStatus}
            />
          </FormField>

          <FormField
            label="노출 기간"
            required
            labelDescription="종료일을 비우면 상시 노출됩니다"
          >
            <DatePicker
              mode="range"
              value={period}
              onChange={setPeriod}
              startPlaceholder="시작일"
              endPlaceholder="종료일"
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
            저장
          </Button>
        </ModalFooter>
      </Modal>

      {/* 삭제 확인 — 문구는 원본 그대로다(도메인) */}
      <Modal
        open={deleteTargets !== null}
        onClose={() => {
          setDeleteTargets(null);
          setDeleteError(null);
        }}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          /*
            2건 이상이면 제목에 건수를 단다 — 여러 건을 지우는 자리에서
            "무엇을" 대신 "몇 건을" 이 먼저 필요하다. 1건이면 이름이 곧 대상이라 붙이지 않는다.
          */
          title={
            deleteTargets && deleteTargets.length > 1
              ? `팝업 삭제 (${deleteTargets.length}건)`
              : "팝업 삭제"
          }
          description={
            deleteTargets && deleteTargets.length === 1
              ? deleteTargets[0].title
              : `선택한 ${deleteTargets?.length ?? 0}건`
          }
        />
        <ModalBody>
          {/*
            위험 안내는 **한 문단에 묻지 않는다.** "즉시 내려간다"(되돌릴 수 있는 결과)와
            "되돌릴 수 없다"(되돌릴 수 없는 결과)는 무게가 다른 말이라,
            같은 문단에 이어 붙이면 뒤엣것이 읽히지 않는다.
          */}
          <p className="body-medium text-text-sub">
            삭제하면 목록에서 사라지고 사용자 화면에서도 즉시 내려갑니다. 잠시
            내리려는 것이라면 [숨김]을 쓰세요.
          </p>
          <p className="body-medium text-text-critical">
            삭제 후에는 되돌릴 수 없습니다.
          </p>
          {deleteError && (
            <p role="alert" className="body-small text-text-critical">
              {deleteError}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => {
              setDeleteTargets(null);
              setDeleteError(null);
            }}
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
