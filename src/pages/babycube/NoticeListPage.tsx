import { useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  AppShell,
  Button,
  DataTableShell,
  EmptyState,
  Gnb,
  InfoItem,
  InfoList,
  Modal,
  ModalBody,
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
  TextButton,
  useToast,
} from "../../components/ui";
import {
  AUDIENCES,
  EMPTY_CELL,
  NOTICES,
  PAGE_SIZE,
  PIN_LABEL,
  STATUS_META,
  excerpt,
  periodParts,
  periodText,
  sortForList,
  statusOf,
  ymd,
  type Notice,
  type NoticeAudience,
} from "./NoticeListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S19 공지사항 관리 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형 (`docs/screen-templates.md` §3-1)
 * 고객 공지와 셀러 공지를 **대상별로 나눠** 운영한다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./NoticeListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                          |
 * | --------------------- | --------------------------------------------- |
 * | 데이터·타입·라벨      | `NoticeListPage.data.ts` **전체**             |
 * | 표 컬럼 구성          | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 대상 칩 구성          | `AUDIENCES` (데이터 층)                       |
 * | 화면 제목·액션        | `PageHeader` · 툴바의 공지 작성               |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 페이지 범위 클램프 ·
 * 대상 전환 → 1페이지 복귀 · 제목 클릭 → 미리보기 모달
 *
 * ## 이 화면의 두 가지 약속
 * 1. **대상 전환은 필터가 아니라 작업 대상 전환이다.** 고객·셀러 공지를 섞지 않는다
 *    (이유는 데이터 파일 주석). 그래서 대상 칩에는 "전체"가 없다.
 * 2. **제목 셀은 두 줄이다.** 링크 아래 본문 발췌 60자가 따라온다 —
 *    제목만으로는 어떤 안내인지 목록에서 가려지지 않기 때문이다(원본 구조).
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 원본(`chunks/3ev97mnz8g4z1.js` 모듈 31590)의 목록 파라미터는
 * `{ chips: { aud }, sortKey: "createdAt", sortDir: "desc", page, size }` 가 전부다.
 * - **상태 세그먼트 필터**(전체·게시중·게시 예정·게시 종료)와 **초기화 버튼**이 없다
 * - **고정 토글**이 없다 — 원본 `isPinned` 는 읽기 전용 배지이고, 고정 여부는
 *   공지 작성/상세 화면에서 정한다. 모달 푸터 액션도 그래서 없다
 * - **고정 우선 정렬**이 없다 — 정렬은 등록일 최신순 하나뿐이다
 * - `PageHeader` 설명문도 없다
 * ====================================================================== */

export interface NoticeListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function NoticeListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: NoticeListPageProps) {
  const { toast } = useToast();

  const [audience, setAudience] = useState<NoticeAudience>(AUDIENCES[0].value);
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Notice | null>(null);

  const filtered = sortForList(
    NOTICES.filter((notice) => notice.audience === audience),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const audienceLabel =
    AUDIENCES.find((item) => item.value === audience)?.label ?? "";

  /**
   * 고정 배지. 상태(진행/종료)가 아니라 **운영자가 건 강조**라 상태 tone 4종 중
   * 하나를 빌려 오면 뜻이 섞인다 — §3-1 이 열어 둔 custom tone 에 semantic
   * 토큰만 주입한다(원본 `badge b-gold`).
   */
  const pinCell = (pinned: boolean) =>
    pinned ? (
      <Tag
        tone="custom"
        size="small"
        style={{
          "--tag-bg-color": "var(--color-surface-highlight-secondary)",
          "--tag-color": "var(--color-text-highlight)",
        }}
      >
        {PIN_LABEL}
      </Tag>
    ) : (
      <span className="text-text-minimal">{EMPTY_CELL}</span>
    );

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
      header={<PageHeader title="공지사항 관리" />}
    >
      <DataTableShell
        toolbarStart={
          /* 이 화면이 좁히는 축은 이것 하나다 — 상태 필터도 초기화도 없다 */
          <SegmentedControl
            aria-label="대상"
            items={AUDIENCES}
            value={audience}
            onValueChange={(value) => {
              setAudience(value as NoticeAudience);
              setPage(1);
            }}
          />
        }
        toolbarEnd={
          /* 원본 `toolsRight` 는 이 버튼 하나다 (원본 문구 `+ 공지 작성`) */
          <Button onClick={() => toast(`${audienceLabel} 작성 화면을 엽니다`)}>
            <Plus size={16} strokeWidth={1.2} aria-hidden />
            공지 작성
          </Button>
        }
        isEmpty={filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title={`등록된 ${audienceLabel}가 없습니다`}
            description="새 공지를 작성하면 이 목록에 쌓입니다."
          />
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            start={
              <span className="body-small text-text-sub">
                총 {filtered.length}건
              </span>
            }
          />
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수. 한 컬럼만 auto 로 두면 여백을 독식한다 — 합 100% */}
          <colgroup>
            <col className="w-18" />
            <col className="w-65" />
            <col className="w-43" />
            <col className="w-23" />
            <col className="w-28" />
          </colgroup>
          <TableHead>
            <TableRow>
              {/* 배지만 들어가는 열 — §7-2 가운데 정렬 */}
              <TableTh align="center">고정</TableTh>
              <TableTh>제목</TableTh>
              {/* 원본 컬럼 순서 — 게시 기간이 상태보다 **앞**이다 */}
              <TableTh>게시 기간</TableTh>
              <TableTh align="center">상태</TableTh>
              <TableTh>등록일</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((notice) => {
              const meta = STATUS_META[statusOf(notice)];
              const period = periodParts(notice);
              return (
                <TableRow key={notice.id}>
                  <TableTd align="center">{pinCell(notice.pinned)}</TableTd>
                  {/* 두 줄 — 링크 + 본문 발췌 60자 (원본 구조) */}
                  <TableTd>
                    <div className="flex flex-col items-start gap-1">
                      {/* 원본에서 링크는 이 셀 하나다 — 행 전체는 눌리지 않는다 */}
                      <TextButton onClick={() => setPreview(notice)}>
                        {notice.title}
                      </TextButton>
                      <span className="body-small text-text-minimal">
                        {excerpt(notice.body)}
                      </span>
                    </div>
                  </TableTd>
                  {/*
                    종료일이 없을 때 "상시"로 바뀌는 것은 **꼬리뿐**이다.
                    셀 전체를 갈아치우면 시작일이라는 실제 값이 화면에서 사라진다.
                  */}
                  <TableTd>
                    {period.lead}
                    <span
                      className={
                        period.tailMuted ? "text-text-minimal" : "text-text"
                      }
                    >
                      {period.tail}
                    </span>
                  </TableTd>
                  <TableTd align="center">
                    <Tag tone={meta.tone} dot size="small">
                      {meta.label}
                    </Tag>
                  </TableTd>
                  <TableTd>{ymd(notice.date)}</TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        공지 미리보기 — 목록에서 잘린 본문을 전문으로 확인하는 자리다.
        **푸터 액션을 두지 않는다** — 고정은 읽기 전용이고(원본 `isPinned`),
        수정은 공지 상세 화면의 일이다. 남는 버튼은 모달을 닫는 것뿐이다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="공지 미리보기" description={preview?.title} />
        <ModalBody>
          <InfoList>
            <InfoItem label="게시 기간">
              {preview ? periodText(preview) : ""}
            </InfoItem>
            <InfoItem label="상태">
              {preview && (
                <Tag
                  tone={STATUS_META[statusOf(preview)].tone}
                  dot
                  size="small"
                >
                  {STATUS_META[statusOf(preview)].label}
                </Tag>
              )}
            </InfoItem>
            <InfoItem label="등록일">
              {preview ? ymd(preview.date) : ""}
            </InfoItem>
            <InfoItem label="고정">
              {preview ? pinCell(preview.pinned) : ""}
            </InfoItem>
          </InfoList>
          {/* 표에서 60자로 잘린 본문이 여기서는 전문으로 보인다 */}
          <p className="body-medium text-text-sub">{preview?.body}</p>
        </ModalBody>
      </Modal>
    </AppShell>
  );
}
