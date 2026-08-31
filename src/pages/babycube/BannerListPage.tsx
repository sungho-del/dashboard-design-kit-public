import { useState } from "react";
import { HelpCircle, Images, Plus, Trash2 } from "lucide-react";
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
  Tooltip,
  useToast,
  type DateRange,
} from "../../components/ui";
import {
  BANNERS,
  DELETE_BLOCKED_IDS,
  PAGE_SIZE,
  STATUS_ITEMS,
  STATUS_META,
  nextBannerId,
  periodText,
  stamp,
  toYmd,
  ymd,
  type Banner,
} from "./BannerListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S23 배너 관리 — 뼈대
 *
 * ## 화면 유형: 목록형 (`src/pages/OrderListPage.tsx` 변형)
 * 판정 근거 — `sections` 에 "데이터 테이블 · 페이지네이션", `components` 에
 * `Table`·`Pagination`·`EmptyState`. `screen-templates.md` §2 신호표의 목록형 1행.
 *
 * ## 템플릿에서 더한 것 — **행 선택 + 선택 삭제**
 * 이커머스 목록형에는 없던 축이다. 세 가지가 함께 온다.
 *   1) 헤더 체크박스(전체 선택 · `indeterminate`) + 행 체크박스
 *   2) 선택 개수 표시 (페이지네이션 좌측 슬롯)
 *   3) 선택 삭제 → 확인 모달 → 부분 실패 안내
 * 행 클릭은 상세가 아니라 **수정 모달**을 연다(이 도메인에 상세 화면이 없다).
 * 그래서 체크박스 셀과 관리 셀은 `stopPropagation` 으로 행 클릭을 막는다.
 *
 * | 갈아끼울 것             | 위치                                    |
 * | ----------------------- | --------------------------------------- |
 * | 데이터·타입·라벨·상태색 | `BannerListPage.data.ts` **전체**       |
 * | 표 컬럼 구성            | 이 파일의 `<colgroup>` + `TableHead`    |
 * | 등록/수정 폼 필드       | `<Modal>` 안의 `FormField` 묶음         |
 * | 삭제 안내 문구          | 삭제 확인 `<Modal>` 의 본문             |
 *
 * ## 그대로 두는 것
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 페이지 범위 클램프 ·
 * 빈 상태 2종 분기(등록 0건 / 조건 불일치) · 간격은 컨테이너가 책임진다
 * ====================================================================== */

/** `YYYY-MM-DD` → `Date`. 공백·`T` 파싱 차이를 피하려고 ISO 형태로 넘긴다 */
const toDate = (text: string) => {
  if (text === "") return undefined;
  const at = new Date(`${text}T00:00:00`);
  return Number.isNaN(at.getTime()) ? undefined : at;
};

export interface BannerListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function BannerListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: BannerListPageProps) {
  const { toast } = useToast();

  const [banners, setBanners] = useState<Banner[]>(BANNERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  // 등록/수정 모달 — 열려 있는 동안 editingId 가 null 이면 등록, 아니면 수정
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [order, setOrder] = useState("");
  const [status, setStatus] = useState("visible");
  const [period, setPeriod] = useState<DateRange | undefined>();

  // 삭제 확인 모달 — 행 1건과 선택 N건이 같은 모달을 쓴다
  const [deleteTargets, setDeleteTargets] = useState<Banner[] | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /*
    원본 `/display` 의 툴바에는 **조건 축이 하나도 없다** — 상태 세그먼트도,
    제목 검색도, 초기화도 없이 표 한 덩어리다. 그래서 여기서 좁히지 않는다.
    (한때 셋을 다 두었는데 원본 대조에서 걷어냈다. 되살리지 말 것)
  */
  const filtered = banners;

  // 삭제로 결과가 줄면 현재 페이지가 범위를 벗어난다 → 마지막 페이지로 당긴다
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const pageIds = paged.map((banner) => banner.id);
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
    setOrder(String(banners.length + 1));
    setStatus("visible");
    setPeriod(undefined);
    setFormOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setTitle(banner.title);
    setTitleTouched(false);
    setOrder(String(banner.order));
    setStatus(banner.status);
    setPeriod(
      banner.startAt === ""
        ? undefined
        : { from: toDate(banner.startAt), to: toDate(banner.endAt) },
    );
    setFormOpen(true);
  };

  const titleError =
    titleTouched && title.trim() === ""
      ? "배너 제목을 입력해주세요."
      : undefined;

  const submitForm = () => {
    setTitleTouched(true);
    if (title.trim() === "") {
      toast({ message: "배너 제목을 입력해주세요.", tone: "critical" });
      return;
    }
    if (!period?.from) {
      toast({ message: "노출 시작일을 선택해주세요.", tone: "critical" });
      return;
    }

    const draft = {
      title: title.trim(),
      order: Number(order) || banners.length + 1,
      status: status as Banner["status"],
      /* 저장 형식은 하이픈(`2026-08-18`) — 화면에 낼 때 `ymd` 가 점으로 바꾼다 */
      startAt: toYmd(period.from),
      endAt: toYmd(period.to),
    };

    if (editingId === null) {
      setBanners((prev) => [
        { id: nextBannerId(prev), ...draft, date: stamp() },
        ...prev,
      ]);
      toast("등록되었습니다.");
    } else {
      setBanners((prev) =>
        prev.map((banner) =>
          banner.id === editingId ? { ...banner, ...draft } : banner,
        ),
      );
      toast("수정되었습니다.");
    }
    setFormOpen(false);
  };

  const requestBulkDelete = () => {
    if (selected.length === 0) {
      toast({ message: "선택된 배너가 없습니다.", tone: "critical" });
      return;
    }
    setDeleteError(null);
    setDeleteTargets(banners.filter((banner) => selected.includes(banner.id)));
  };

  /**
   * 삭제 실행. 서버가 일부만 지우는 경우가 있어 **전부 실패 / 일부 실패 / 성공**을 나눈다.
   * 실패가 남으면 모달을 닫지 않는다 — 무엇이 남았는지 목록에서 바로 확인해야 하기 때문이다.
   */
  const confirmDelete = () => {
    const targets = deleteTargets ?? [];
    const blocked = targets.filter((banner) =>
      DELETE_BLOCKED_IDS.includes(banner.id),
    );
    const removable = targets.filter(
      (banner) => !DELETE_BLOCKED_IDS.includes(banner.id),
    );

    setBanners((prev) =>
      prev.filter((banner) => !removable.some((item) => item.id === banner.id)),
    );
    setSelected((prev) =>
      prev.filter((id) => !removable.some((item) => item.id === id)),
    );

    if (blocked.length === targets.length) {
      /*
        토스트는 2.6초 뒤 사라지므로 **모달 안에도 같은 말을 남긴다.**
        토스트만 띄우면 "왜 안 지워졌지"가 화면에서 없어진다.
      */
      toast({ message: "배너를 삭제하지 못했습니다.", tone: "critical" });
      setDeleteError(
        "삭제 실패 — 배너를 삭제하지 못했습니다. 목록을 다시 확인한 뒤 재시도해 주세요.",
      );
      return;
    }
    if (blocked.length > 0) {
      toast({
        message:
          "요청한 배너가 모두 삭제되지 않았습니다. 목록을 다시 확인해 주세요.",
        tone: "critical",
      });
      setDeleteError(
        "삭제 실패 — 일부가 남았습니다. 목록을 다시 확인한 뒤 재시도해 주세요.",
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
          title="배너 관리"
          badges={
            <Tooltip
              title="배너 관리"
              content="사용자 홈 상단에 도는 배너입니다. 노출 순서가 작을수록 위에 보이고, 숨김으로 바꾸면 즉시 내려갑니다."
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
                배너 등록
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
          banners.length === 0 ? (
            <EmptyState
              size="table"
              icon={<Images strokeWidth={1.2} aria-hidden />}
              title="등록된 배너가 없습니다"
              description="배너를 등록하면 사용자 홈 상단에 노출됩니다."
            >
              <Button onClick={openCreate}>
                <Plus size={16} strokeWidth={1.2} aria-hidden />
                배너 등록
              </Button>
            </EmptyState>
          ) : null
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
            <col className="w-60" />
            <col className="w-23" />
            <col className="w-23" />
            <col className="w-48" />
            <col className="w-28" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>
                {/*
                  라벨 텍스트를 띄우면 5% 폭 컬럼이 무너진다. `label` 대신
                  `aria-label` 을 쓰면 이름은 남고 글자는 나오지 않는다
                  (Checkbox 는 `label` 이 없을 때만 `aria-label` 이 유효하다).
                */}
                <Checkbox
                  size="small"
                  aria-label="전체 선택"
                  checked={allChecked}
                  indeterminate={!allChecked && someChecked}
                  onChange={togglePage}
                />
              </TableTh>
              <TableTh>배너 제목</TableTh>
              <TableTh>노출 순서</TableTh>
              <TableTh align="center">상태</TableTh>
              <TableTh>노출 기간</TableTh>
              <TableTh>등록일</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((banner) => {
              const meta = STATUS_META[banner.status];
              return (
                <TableRow
                  key={banner.id}
                  clickable
                  onClick={() => openEdit(banner)}
                >
                  <TableTd>
                    <div
                      role="presentation"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        size="small"
                        aria-label={`${banner.title} 선택`}
                        checked={selected.includes(banner.id)}
                        onChange={() => toggleOne(banner.id)}
                      />
                    </div>
                  </TableTd>
                  <TableTd>{banner.title}</TableTd>
                  <TableTd>{banner.order}</TableTd>
                  <TableTd align="center">
                    <Tag tone={meta.tone} dot>
                      {meta.label}
                    </Tag>
                  </TableTd>
                  <TableTd>{periodText(banner)}</TableTd>
                  <TableTd>{ymd(banner.date)}</TableTd>
                  {/*
                    ⚠️ 여기 있던 행 `관리` 드롭다운(수정·삭제)은 **원본에 없다.**
                    수정은 행 클릭으로, 삭제는 선택 → `선택 삭제` 한 길로만 간다.
                    되살리면 삭제 입구가 둘이 되어 확인 모달의 대상이 갈린다.
                  */}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* 등록 / 수정 — 같은 폼을 쓰고 제목과 버튼 라벨만 갈린다 */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} size="medium">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={editingId === null ? "배너 등록" : "배너 수정"}
          description="사용자 홈 상단에 노출되는 배너입니다."
        />
        {/* ModalBody 가 필드 간격 20 을 이미 준다 — 페이지가 gap 을 또 붙이지 않는다 */}
        <ModalBody>
          <FormField label="배너 제목" required error={titleError}>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => setTitleTouched(true)}
              placeholder="예) 여름 정기 세일 안내"
            />
          </FormField>

          <FormField
            label="노출 순서"
            description="숫자가 작을수록 홈 상단에 먼저 노출됩니다"
          >
            <Input
              value={order}
              onChange={(event) =>
                setOrder(event.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="1"
              inputMode="numeric"
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
              ? `배너 삭제 (${deleteTargets.length}건)`
              : "배너 삭제"
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
            삭제하면 목록에서 사라지고 사용자 홈에서도 즉시 내려갑니다. 잠시
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
