import { useState } from "react";
import { Search, Star } from "lucide-react";
import {
  AppShell,
  DataTableShell,
  EmptyState,
  Gnb,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
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
  EMPTY_TITLE,
  PAGE_SIZE,
  PAGE_SIZES,
  RATING_MAX,
  REVIEWS,
  STATUS_META,
  bodyParts,
  detailPathOf,
  ratingLabel,
  reviewStatus,
  ymd,
  type Review,
} from "./ReviewListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 리뷰 관리 — 목록형 · 뼈대 (BabyCube 본사 운영 어드민 · 조회 전용)
 *
 * ## 구성 — 원본 v0.4 `SCREENS.reviewsAdmin` (proto.html 3603~3611)
 * ```
 * 목록 (총 N건) / 표 7열 / 페이지네이션 10·20·50·100
 * ```
 * 원본 화면은 `tableCard` 하나뿐이다 — 대시·검색조건·체크박스·No·엑셀·정렬 머리가 없다.
 * 내용 링크 · 행 클릭 → 리뷰 상세(`/reviews-admin/{리뷰 id}`). 숨김·복원은 상세에서 한다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./ReviewListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·라벨·단위·판정  | `ReviewListPage.data.ts` **전체**              |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 별점 만점·문구         | `RATING_MAX` · `ratingLabel` (데이터 층)       |
 *
 * ## 그대로 두는 것 (형제 목록과 같다)
 * 작성일 최신순 · 크기를 바꾸면 1페이지로 · `?preview=loading|empty|refreshing` ·
 * 숨김 리뷰는 목록에서 사라지지 않고 흐린 `숨김` 접두어만 붙는다(원본 `(숨김)`)
 * ====================================================================== */

/** 목록 정렬 — 작성일 최신순 하나뿐이다(원본 배열 = 날짜 내림차순) */
const sortForList = (list: Review[]) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date));

const COLUMN_COUNT = 7;

/**
 * 별점 — 채운 별의 **개수**가 값이고, 숫자는 접근가능 이름으로 준다.
 * 리뷰 상세도 같은 그림을 쓴다.
 */
export function RatingStars({ rating }: { rating: number }) {
  return (
    <span
      className="flex items-center gap-0.5"
      role="img"
      aria-label={ratingLabel(rating)}
    >
      {Array.from({ length: RATING_MAX }, (_, index) => (
        <Star
          key={index}
          size={16}
          strokeWidth={1.2}
          aria-hidden
          className={
            index < rating ? "fill-current text-icon" : "text-icon-minimal"
          }
        />
      ))}
    </span>
  );
}

export interface ReviewListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function ReviewListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: ReviewListPageProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const rows = sortForList(REVIEWS);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

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
      header={<PageHeader title="리뷰 관리" />}
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
        isEmpty={dataStatus === "empty" || rows.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title={EMPTY_TITLE}
          />
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            end={
              <PaginationSizeSelect
                sizes={PAGE_SIZES}
                value={pageSize}
                onSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            }
          />
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수. 폭 = 실측 글자 폭(4px 격자) · 합 976 = 1280 화면의 표 폭 —
              상태 열까지 스크롤 없이 보인다. 남는 폭은 내용(긴 글)이 받는다 */}
          <colgroup>
            <col className="w-20" />
            <col className="w-22" />
            <col className="w-36" />
            <col className="w-28" />
            <col className="w-93" />
            <col className="w-25" />
            <col className="w-20" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>작성자</TableTh>
              <TableTh>셀러</TableTh>
              <TableTh>상품</TableTh>
              <TableTh>별점</TableTh>
              <TableTh>내용</TableTh>
              <TableTh>작성일</TableTh>
              {/* 배지만 들어가는 열 — §7-2 가운데 정렬 */}
              <TableTh align="center">상태</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataStatus === "loading"
              ? Array.from({ length: pageSize }, (_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`}>
                    {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                      <TableTd key={cell}>
                        <span className="body-small block">
                          <Skeleton />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : paged.map((review) => {
                  const meta = STATUS_META[reviewStatus(review)];
                  const body = bodyParts(review);
                  const open = () => onNavSelect(detailPathOf(review.id));
                  return (
                    <TableRow key={review.id} clickable onClick={open}>
                      <TableTd>{review.author}</TableTd>
                      <TableTd>{review.seller}</TableTd>
                      <TableTd className="break-keep wrap-anywhere">
                        {review.product}
                      </TableTd>
                      <TableTd>
                        <RatingStars rating={review.rating} />
                      </TableTd>
                      {/* 원본 링크 자리 — 한 줄 말줄임(원본 `cell-ell`). 버튼은 줄바꿈을 안 해서
                          그대로 두면 열 폭을 밀어낸다 — 안쪽 span 이 말줄임한다 */}
                      <TableTd>
                        <TextButton className="max-w-full" onClick={open}>
                          <span className="truncate">
                            {body.prefix !== null && (
                              <>
                                <span className="text-text-minimal">
                                  {body.prefix}
                                </span>{" "}
                              </>
                            )}
                            {body.text}
                          </span>
                        </TextButton>
                      </TableTd>
                      <TableTd>{ymd(review.date)}</TableTd>
                      <TableTd align="center">
                        <Tag tone={meta.tone} dot size="small">
                          {meta.label}
                        </Tag>
                      </TableTd>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>
    </AppShell>
  );
}
