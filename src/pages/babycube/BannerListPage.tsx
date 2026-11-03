import { useState } from "react";
import { Images, Plus, Trash2 } from "lucide-react";
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
import {
  STATUS_META,
  periodText,
  sortedBanners,
  ymd,
} from "./BannerListPage.data";
import { DisplayDeleteModal } from "./DisplayFormPage";
import { COPY, KIND_COPY, NEW_KEY, detailPathOf } from "./DisplayFormPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 배너 관리 — 뼈대 (BabyCube 본사 운영 어드민 · 원본 v0.4 `SCREENS.display` 3782-3794)
 *
 * ## 화면 유형: 목록형 (`docs/screen-templates.md` §3-1) — 팝업 관리와 같은 뼈대
 * ```
 * 카드[ 목록 (총 N건)                    [+ 배너 등록][선택 삭제] ]
 *     [ 체크 · No · 배너 제목 · 노출 순서 · 상태 · 노출 기간 · 등록일 ]
 * ```
 * 노출 순서 오름차순으로 그리고 No 는 그 순서대로 1..N(원본 UI-233). 팝업과 다른 점은
 * 노출 순서 열과 정렬뿐이다.
 *
 * | 갈아끼울 것      | 위치                                          |
 * | ---------------- | --------------------------------------------- |
 * | 데이터·의미표    | `BannerListPage.data.ts` **전체**             |
 * | 경로·글자        | `DisplayFormPage.data.ts`(상세와 공유)        |
 * | 표 컬럼 구성     | 이 파일의 `COLGROUP` + `TableHead` + 본문 셀  |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 · 행 클릭 → 상세(`TableRow clickable` — 체크박스 클릭은 행 클릭이 아니다) ·
 * 선택 → 확인 창 → 알림 · `?preview=loading|empty|refreshing`
 *
 * ## 퍼블 범위
 * [선택 삭제] 확정은 **알림 + 선택 비움만** — 행·건수·순서는 바뀌지 않는다(업무 확정은 개발 영역).
 *
 * ## 원본과 다르게 둔 것
 * - 행 어디를 눌러도 상세(사용자 결정 2026-11-02 — 원본은 제목 글자만). 제목 글자도 링크로 남긴다
 * - 열 왼쪽 정렬 · 상태 가운데(§7-2 — 원본은 제목·순서도 가운데) · 게시 초록(원본 회색 결함 보정)
 * - 빈 상태 문구는 이 화면 것(원본 공용 문구 「필터를 초기화」는 필터 없는 화면에 맞지 않는다)
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 등록/수정 모달(원본 3779 에서 제거 — 상세 페이지로) · 페이지네이션 · 도움말 툴팁 · 검색조건 ·
 * 「N건 선택」 · 삭제 창 대상 이름 · 삭제 실패 시뮬레이션 · 상태 「전시중지」
 * ====================================================================== */

export interface BannerListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/* table-fixed 라 폭 지정 필수 — 비율로 나뉜다. 제목이 남는 폭을 받는다 */
const COLGROUP = (
  <colgroup>
    <col className="w-10" />
    <col className="w-14" />
    <col className="w-90" />
    <col className="w-24" />
    <col className="w-24" />
    <col className="w-50" />
    <col className="w-28" />
  </colgroup>
);
const COLUMN_COUNT = 7;

const copy = KIND_COPY.banner;

export function BannerListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: BannerListPageProps) {
  const { toast } = useToast();
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const rows = dataStatus === "empty" ? [] : sortedBanners();
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteCount, setDeleteCount] = useState<number | null>(null);

  /* 전체 선택은 **보이는 목록 전체**(페이지가 없다) */
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

  const open = (id: string) => onNavSelect(detailPathOf("banner", id));

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
            {/* 원본 순서 — 등록(진한) 다음 선택 삭제(3792) */}
            <Button onClick={() => open(NEW_KEY)}>
              <Plus size={16} strokeWidth={1.2} aria-hidden />
              배너 등록
            </Button>
            {/* 잠그지 않는다 — 선택 없이 누르면 이유로 답한다(원본 3768) */}
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
            icon={<Images strokeWidth={1.2} aria-hidden />}
            title="등록된 배너가 없습니다"
            description="배너를 등록하면 사용자 홈 상단에 노출됩니다."
          />
        }
      >
        <Table>
          {COLGROUP}
          <TableHead>
            <TableRow>
              <TableTh>
                {/* 좁은 열이라 글자 라벨 대신 `aria-label` */}
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
              <TableTh>배너 제목</TableTh>
              <TableTh>노출 순서</TableTh>
              {/* 배지만 들어가는 열 — §7-2 가운데 */}
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
              : rows.map((banner, index) => {
                  const meta = STATUS_META[banner.status];
                  return (
                    <TableRow
                      key={banner.id}
                      clickable
                      onClick={() => open(banner.id)}
                    >
                      <TableTd>
                        <Checkbox
                          size="small"
                          aria-label={`${banner.title} 선택`}
                          checked={selected.includes(banner.id)}
                          onChange={() => toggleRow(banner.id)}
                        />
                      </TableTd>
                      {/* No = 정렬 순 — 노출 순서 값과는 별개다 */}
                      <TableTd>{index + 1}</TableTd>
                      <TableTd className="break-keep wrap-anywhere">
                        <TextButton onClick={() => open(banner.id)}>
                          {banner.title}
                        </TextButton>
                      </TableTd>
                      <TableTd>{banner.order}</TableTd>
                      <TableTd align="center">
                        <Tag tone={meta.tone} dot size="small">
                          {meta.label}
                        </Tag>
                      </TableTd>
                      <TableTd>{periodText(banner)}</TableTd>
                      <TableTd>{ymd(banner.date)}</TableTd>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>

      <DisplayDeleteModal
        kind="banner"
        count={deleteCount}
        onClose={() => setDeleteCount(null)}
        onConfirm={confirmDelete}
      />
    </AppShell>
  );
}
