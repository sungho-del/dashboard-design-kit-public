import { useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  AppShell,
  Button,
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
  COUPONS,
  EMPTY_TITLE,
  NEW_PATH,
  PAGE_SIZE,
  PAGE_SIZES,
  STATUS_META,
  conditionText,
  couponStatus,
  detailPathOf,
  discountParts,
  periodParts,
  ymd,
} from "./CouponListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 쿠폰관리 — 목록형 · 뼈대 (BabyCube 본사 운영 어드민 · 조회 전용)
 *
 * ## 구성 — 원본 v0.4 `SCREENS.promo` (proto.html 3944~3948)
 * ```
 * 목록 (총 N건) / 표 No + 7열 / 페이지네이션 10·20·50·100
 * ```
 * 원본 화면은 `tableCard` 하나뿐이다 — 상태 대시·검색조건·체크박스·엑셀·정렬이 없다.
 * 쿠폰명 링크 · 행 클릭 → 쿠폰 상세(`/promo/{쿠폰코드}` — 본사 쿠폰이면 상세가 수정 폼을 그린다).
 *
 * ## 원본과 다르게 둔 곳 — 추가 기획 보드 06·07 (개발 70a3e88)
 * - 「목록 (총 N건)」 줄 오른쪽 [+ 쿠폰 등록](주 버튼 · 새 줄 없이) → `/promo/new`
 * - 본사 쿠폰(`coupon.hq`)의 셀러명 칸은 **[본사] 배지만**(글자 없이) · 기간 칸은 `periodParts`
 *   (가입 시 자동 = 「발급 후 N일」)
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./CouponListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·라벨·단위·판정  | `CouponListPage.data.ts` **전체**              |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 *
 * ## 그대로 두는 것 (형제 목록과 같다)
 * No = 원장 순번(페이지를 넘겨도 이어진다 — 원본은 자르기 전 배열에서 센다) ·
 * 크기를 바꾸면 1페이지로 · `?preview=loading|empty|refreshing`
 * ====================================================================== */

export interface CouponListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

const COLUMN_COUNT = 8;

export function CouponListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: CouponListPageProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const totalPages = Math.max(1, Math.ceil(COUPONS.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = COUPONS.slice(start, start + pageSize);

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
      header={<PageHeader title="쿠폰관리" />}
    >
      <DataTableShell
        variant="soft"
        bodyClassName={dimWhile(dataStatus)}
        aria-busy={isBusy(dataStatus)}
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {COUPONS.length}건)
          </h2>
        }
        toolbarEnd={
          <Button onClick={() => onNavSelect(NEW_PATH)}>
            <Plus size={16} strokeWidth={1.2} aria-hidden />
            쿠폰 등록
          </Button>
        }
        isEmpty={dataStatus === "empty" || COUPONS.length === 0}
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
          {/* 열 폭 = 실측 글자 폭(4px 격자) · 합 976 = 1280 화면의 표 폭이라 상태 열까지 스크롤 없이 보인다.
              1440 에서는 표가 비율대로 늘어난다. 쿠폰명이 남는 폭을 받고 넘치면 단어 단위로 줄바꿈 */}
          <colgroup>
            <col className="w-14" />
            <col className="w-26" />
            <col className="w-43" />
            <col className="w-28" />
            <col className="w-36" />
            <col className="w-47" />
            <col className="w-25" />
            <col className="w-25" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>No</TableTh>
              <TableTh>셀러명</TableTh>
              <TableTh>쿠폰명</TableTh>
              <TableTh>내용</TableTh>
              <TableTh>조건</TableTh>
              <TableTh>기간</TableTh>
              <TableTh>발행일</TableTh>
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
              : paged.map((coupon, index) => {
                  const discount = discountParts(coupon);
                  const condition = conditionText(coupon);
                  const period = periodParts(coupon);
                  const meta = STATUS_META[couponStatus(coupon)];
                  const open = () => onNavSelect(detailPathOf(coupon.id));
                  return (
                    <TableRow key={coupon.id} clickable onClick={open}>
                      <TableTd className="tabular-nums">
                        {start + index + 1}
                      </TableTd>
                      <TableTd>
                        {coupon.hq ? (
                          <Tag size="small">본사</Tag>
                        ) : (
                          coupon.seller
                        )}
                      </TableTd>
                      {/* 버튼은 기본이 한 줄(nowrap)이라 그대로면 열 폭을 밀어낸다 — 안쪽 글자만 단어 단위로 줄바꿈 */}
                      <TableTd className="break-keep wrap-anywhere">
                        <TextButton className="max-w-full" onClick={open}>
                          <span className="text-left whitespace-normal">
                            {coupon.name}
                          </span>
                        </TextButton>
                      </TableTd>
                      {/* 최대 할인 한도는 부가 정보 — 둘째 줄 보조 글자(원본 `muted`).
                          공백은 읽기 도구·글자 비교용(줄 끝이라 보이지 않는다) */}
                      <TableTd>
                        {discount.main}
                        {discount.note !== null && (
                          <>
                            {" "}
                            <span className="body-small block text-text-minimal">
                              {discount.note}
                            </span>
                          </>
                        )}
                      </TableTd>
                      <TableTd>
                        <span
                          className={
                            condition.unset ? "text-text-minimal" : "text-text"
                          }
                        >
                          {condition.text}
                        </span>
                      </TableTd>
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
                      <TableTd>{ymd(coupon.issuedOn)}</TableTd>
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
