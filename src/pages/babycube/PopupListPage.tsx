import { useState } from "react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import {
  AppShell,
  Button,
  Checkbox,
  DataTableShell,
  EmptyState,
  Gnb,
  PageHeader,
  Skeleton,
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
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import { STATUS_META, periodText, ymd } from "./BannerListPage.data";
import { POPUPS, plainText } from "./PopupListPage.data";
import { DisplayDeleteModal } from "./DisplayFormPage";
import { COPY, KIND_COPY, NEW_KEY, detailPathOf } from "./DisplayFormPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 팝업 관리 — 뼈대 (BabyCube 본사 운영 어드민 · 원본 v0.4 `SCREENS.popups` 3838-3851)
 *
 * ## 화면 유형: 목록형 (`docs/screen-templates.md` §3-1) — 배너 관리와 같은 뼈대
 * ```
 * 카드[ 목록 (총 N건)                    [+ 팝업 등록][선택 삭제] ]
 *     [ 체크 · No · 팝업 제목 · 내용 · 상태 · 노출 기간 · 등록일 ]
 * ```
 * 배너와 다른 점: 노출 순서가 없다(데이터 순서 그대로 — 원본은 신규를 맨 앞에 넣는다) ·
 * 내용 열은 HTML 원문을 **글자로 바꿔** 2줄 말줄임(원본 1줄 — FAQ 답변과 같은 표 공용 2줄).
 *
 * | 갈아끼울 것      | 위치                                          |
 * | ---------------- | --------------------------------------------- |
 * | 데이터·글자 변환 | `PopupListPage.data.ts` **전체**              |
 * | 경로·글자        | `DisplayFormPage.data.ts`(상세와 공유)        |
 * | 표 컬럼 구성     | 이 파일의 `COLGROUP` + `TableHead` + 본문 셀  |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 · 행 클릭 → 상세 · 선택 → 확인 창 → 알림 · `?preview=`
 *
 * ## 퍼블 범위
 * [선택 삭제] 확정은 **알림 + 선택 비움만** — 행·건수는 바뀌지 않는다.
 *
 * ## 원본과 다르게 둔 것 / 걷어낸 것
 * 배너 관리와 같다(행 클릭 · 게시 초록 · 빈 상태 문구 / 모달 · 페이지네이션 · 툴팁 · 「N건 선택」 ·
 * 삭제 창 대상 이름 · 삭제 실패 시뮬레이션 · 「전시중지」). 원본 정책 안내(최근 1건만 노출 ·
 * 오늘 하루 보지 않기)는 원본 화면에도 안 보여(`note()` 비활성) 넣지 않았다.
 * ====================================================================== */

export interface PopupListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/* table-fixed — 합 952 ≤ 1280 화면의 표 폭이라 등록일까지 스크롤 없이 보인다. 내용이 남는 폭을 받는다 */
const COLGROUP = (
  <colgroup>
    <col className="w-10" />
    <col className="w-14" />
    <col className="w-48" />
    <col className="w-64" />
    <col className="w-24" />
    <col className="w-48" />
    <col className="w-28" />
  </colgroup>
);
const COLUMN_COUNT = 7;

const copy = KIND_COPY.popup;

export function PopupListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: PopupListPageProps) {
  const { toast } = useToast();
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const rows = dataStatus === "empty" ? [] : POPUPS;
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteCount, setDeleteCount] = useState<number | null>(null);

  const allChecked = rows.length > 0 && selected.length === rows.length;
  const someChecked = selected.length > 0 && !allChecked;

  const toggleRow = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const requestDelete = () => {
    if (selected.length === 0) {
      toast({ message: copy.noneSelected, tone: "critical" });
      return;
    }
    setDeleteCount(selected.length);
  };

  const confirmDelete = () => {
    toast(COPY.deleted(deleteCount ?? 0));
    setSelected([]);
    setDeleteCount(null);
  };

  const open = (id: string) => onNavSelect(detailPathOf("popup", id));

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
      header={<PageHeader title={copy.listLabel} />}
    >
      <DataTableShell
        variant="soft"
        bodyClassName={dimWhile(dataStatus)}
        aria-busy={isBusy(dataStatus)}
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {rows.length}건)
          </h2>
        }
        toolbarEnd={
          <>
            <Button onClick={() => open(NEW_KEY)}>
              <Plus size={16} strokeWidth={1.2} aria-hidden />
              팝업 등록
            </Button>
            <Button variant="secondary" onClick={requestDelete}>
              <Trash2 size={16} strokeWidth={1.2} aria-hidden />
              선택 삭제
            </Button>
          </>
        }
        isEmpty={dataStatus !== "loading" && rows.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<MessageSquare strokeWidth={1.2} aria-hidden />}
            title="등록된 팝업이 없습니다"
            description="팝업을 등록하면 사용자 홈 진입 시 노출됩니다."
          />
        }
      >
        <Table>
          {COLGROUP}
          <TableHead>
            <TableRow>
              <TableTh>
                <Checkbox
                  size="small"
                  aria-label="전체 선택"
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={() =>
                    setSelected(allChecked ? [] : rows.map((row) => row.id))
                  }
                />
              </TableTh>
              <TableTh>No</TableTh>
              <TableTh>팝업 제목</TableTh>
              <TableTh>내용</TableTh>
              <TableTh align="center">상태</TableTh>
              <TableTh>노출 기간</TableTh>
              <TableTh>등록일</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataStatus === "loading"
              ? Array.from({ length: 3 }, (_, row) => (
                  <TableRow key={`skeleton-${row}`}>
                    {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                      <TableTd key={cell}>
                        <span className="body-small block">
                          <Skeleton />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : rows.map((popup, index) => {
                  const meta = STATUS_META[popup.status];
                  return (
                    <TableRow
                      key={popup.id}
                      clickable
                      onClick={() => open(popup.id)}
                    >
                      <TableTd>
                        <Checkbox
                          size="small"
                          aria-label={`${popup.title} 선택`}
                          checked={selected.includes(popup.id)}
                          onChange={() => toggleRow(popup.id)}
                        />
                      </TableTd>
                      <TableTd>{index + 1}</TableTd>
                      <TableTd className="break-keep wrap-anywhere">
                        <TextButton onClick={() => open(popup.id)}>
                          {popup.title}
                        </TextButton>
                      </TableTd>
                      {/* 원문의 `<b>`·`<br>` 는 표에서 글자로만 — 원문은 상세에서 그대로 편집 */}
                      <TableTd ellipsis className="break-keep wrap-anywhere">
                        {plainText(popup.body)}
                      </TableTd>
                      <TableTd align="center">
                        <Tag tone={meta.tone} dot size="small">
                          {meta.label}
                        </Tag>
                      </TableTd>
                      <TableTd>{periodText(popup)}</TableTd>
                      <TableTd>{ymd(popup.date)}</TableTd>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>

      <DisplayDeleteModal
        kind="popup"
        count={deleteCount}
        onClose={() => setDeleteCount(null)}
        onConfirm={confirmDelete}
      />
    </AppShell>
  );
}
