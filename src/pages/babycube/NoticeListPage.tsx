import { useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  AppShell,
  Button,
  DataTableShell,
  EmptyState,
  Gnb,
  PageHeader,
  SegmentedControl,
  Skeleton,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import {
  AUDIENCES,
  EMPTY_CELL,
  EMPTY_DESCRIPTION,
  EMPTY_TITLE,
  NOTICES,
  PIN_LABEL,
  STATUS_META,
  audienceOf,
  excerpt,
  formPathOf,
  newPathOf,
  periodParts,
  ymd,
  type NoticeAudience,
} from "./NoticeListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S19 공지사항 관리 — 뼈대 (BabyCube 본사 운영 어드민 · BO-CSC-002)
 *
 * ## 화면 유형: 목록형 (`docs/screen-templates.md` §3-1)
 * 원본 = 기획 v0.4 `SCREENS.notices`(proto.html:3415-3432). 도메인은 `./NoticeListPage.data.ts`.
 *
 * ```
 * [고객 공지][셀러 공지]                      ← 대상 전환, 카드 **위**(원본 칩 위치)
 * 카드[ 목록 (총 N건)          + 공지 작성 ]
 *     [ 고정 · 제목(+본문 60자) · 게시 기간 · 상태 · 등록일 ]
 * ```
 *
 * | 갈아끼울 것      | 위치                                              |
 * | ---------------- | ------------------------------------------------- |
 * | 데이터·문구·경로 | `NoticeListPage.data.ts` **전체**                 |
 * | 표 컬럼 구성     | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀    |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 · 대상 탭 ↔ 주소 `?aud=` · 행 클릭 → 상세 · `?preview=` 데이터 상태
 *
 * ## 이 화면의 약속
 * 1. **대상 전환은 필터가 아니라 작업 대상 전환이다** — 「전체」가 없다(원본).
 *    탭은 주소(`?aud=seller`)에 실린다 — 상세에서 [목록]·[취소]·뒤로 오면 보던 탭으로 돌아온다
 *    (원본은 전역 변수 `NOTICE_AUD` 로 같은 일을 한다).
 * 2. **행 어디를 눌러도 공지 상세(등록/수정)로** 간다(2026-11-02 결정 · 원본은 제목 링크).
 *    `+ 공지 작성` 은 지금 탭의 대상으로 새 폼을 연다(원본 `NOTICE_AUD`).
 * 3. **정렬하지 않는다** — 데이터 순서 그대로(원본). 「상단 고정」도 정렬에 쓰지 않는다.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 페이지네이션(원본 `pager()` 호출 없음) · 상태 필터 · 고정 토글 · 미리보기 모달 ·
 * 체크박스·No·엑셀 · `PageHeader` 설명문
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
  const params = useSearchParams();
  const dataStatus = asStatus(params.get("preview"));
  const [audience, setAudience] = useState<NoticeAudience>(() =>
    audienceOf(params.get("aud")),
  );

  /* 탭을 주소에 싣는다 — 히스토리는 늘리지 않는다(뒤로 가기 = 이전 화면) */
  const changeAudience = (next: NoticeAudience) => {
    setAudience(next);
    const query = new URLSearchParams(window.location.search);
    if (next === AUDIENCES[0].value) query.delete("aud");
    else query.set("aud", next);
    const search = query.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
  };

  const list = NOTICES.filter((notice) => notice.audience === audience);

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
      {/* 원본 칩 자리 — 카드 밖 위. 형식은 문의 관리와 같은 세그먼트 */}
      <SegmentedControl
        className="self-start"
        aria-label="대상"
        items={AUDIENCES}
        value={audience}
        onValueChange={(value) => changeAudience(value as NoticeAudience)}
      />

      <DataTableShell
        variant="soft"
        bodyClassName={dimWhile(dataStatus)}
        aria-busy={isBusy(dataStatus)}
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {list.length}건)
          </h2>
        }
        toolbarEnd={
          <Button onClick={() => onNavSelect(newPathOf(audience))}>
            <Plus size={16} strokeWidth={1.2} aria-hidden />
            공지 작성
          </Button>
        }
        isEmpty={dataStatus === "empty" || list.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title={EMPTY_TITLE(audience)}
            description={EMPTY_DESCRIPTION}
          />
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수 — 합 100% */}
          <colgroup>
            <col className="w-18" />
            <col className="w-65" />
            <col className="w-43" />
            <col className="w-23" />
            <col className="w-28" />
          </colgroup>
          <TableHead>
            <TableRow>
              {/* 배지만 들어가는 열 — §7-2 가운데 */}
              <TableTh align="center">고정</TableTh>
              <TableTh>제목</TableTh>
              {/* 원본 순서 — 게시 기간이 상태보다 **앞**이다 */}
              <TableTh>게시 기간</TableTh>
              <TableTh align="center">상태</TableTh>
              <TableTh>등록일</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataStatus === "loading"
              ? list.map((notice) => (
                  <TableRow key={notice.id}>
                    {Array.from({ length: 5 }, (_, cell) => (
                      <TableTd key={cell}>
                        <span className="body-small block">
                          <Skeleton />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : list.map((notice) => {
                  const meta = STATUS_META[notice.status];
                  const period = periodParts(notice);
                  const open = () => onNavSelect(formPathOf(notice.id));
                  return (
                    <TableRow key={notice.id} clickable onClick={open}>
                      <TableTd align="center">
                        {/* 구분 배지는 무채색(원본 b-gold 도 회색) */}
                        {notice.pinned ? (
                          <Tag size="small">{PIN_LABEL}</Tag>
                        ) : (
                          <span className="text-text-minimal">
                            {EMPTY_CELL}
                          </span>
                        )}
                      </TableTd>
                      {/* 두 줄 — 링크 + 본문 발췌 60자 (원본 구조). 한국어 단어 중간에서 끊지 않는다 */}
                      <TableTd className="break-keep wrap-anywhere">
                        <div className="flex flex-col items-start gap-1">
                          <TextButton onClick={open}>{notice.title}</TextButton>
                          <span className="body-small text-text-minimal">
                            {excerpt(notice.body)}
                          </span>
                        </div>
                      </TableTd>
                      {/* 「상시」로 바뀌는 것은 꼬리뿐 — 시작일은 실제 값이다 */}
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
    </AppShell>
  );
}
