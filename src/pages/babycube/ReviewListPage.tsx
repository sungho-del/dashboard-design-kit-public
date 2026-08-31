import { useState } from "react";
import { MessageSquare, Star } from "lucide-react";
import {
  AppShell,
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
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
} from "../../components/ui";
import {
  PAGE_SIZE,
  RATING_MAX,
  REVIEWS,
  STATUS_META,
  bodyText,
  ratingLabel,
  ymd,
  type Review,
} from "./ReviewListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S21 리뷰 관리 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형 (`docs/screen-templates.md` §3-1)
 * 상품 리뷰를 **조회만** 하는 목록이다. 원본 페이지 컴포넌트가 40줄이고
 * 카드 프레임에 `total` 과 `table` 둘만 넘긴다 — 즉 툴바가 통째로 없다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./ReviewListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                          |
 * | --------------------- | --------------------------------------------- |
 * | 데이터·타입·문구      | `ReviewListPage.data.ts` **전체**             |
 * | 표 컬럼 구성          | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 별점 만점·문구        | `RATING_MAX` · `ratingLabel` (데이터 층)      |
 * | 화면 제목             | `PageHeader`                                  |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 페이지 범위 클램프 ·
 * 별점 렌더 · 내용 클릭 → 미리보기 모달
 *
 * ## 숨김 리뷰는 목록에서 사라지지 않는다
 * 원본 내용 셀은 `((hidden ? "(숨김) " : "") + body).trim() || "-"` 다.
 * 숨겨도 행은 남고 **표시만 달라진다** — 접두어가 없으면 숨김 리뷰와 노출 리뷰를
 * 화면에서 구별할 수 없다. 숨김·복원 자체는 리뷰 **상세** 화면의 일이다.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 원본(`chunks/1gh8hvu-ixb27.js` 모듈 17716·26766)의 목록 파라미터는
 * `{ sortKey: "createdAt", sortDir: "desc", page, size }` 가 전부다.
 * - **상태 요약 대시 2장 + 증감(±건) + 비교 기준("어제 대비")** — 지어낸 수치였다
 * - **검색어 입력 · 초기화 · 엑셀 다운로드** — 원본 툴바가 비어 있다
 * - **답글 등록**(상태 변경 + 토스트) — 원본 목록에는 조치가 하나도 없다
 * - **낮은 별점 강조**(툴팁 · 2점 이하 규칙) — 원본에 없는 운영 규칙이었다
 * - `PageHeader` 설명문
 * ====================================================================== */

/** 목록 정렬 — 작성일 최신순 하나뿐이다 (원본 `createdAt desc`) */
const sortForList = (list: Review[]) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date));

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
  const [preview, setPreview] = useState<Review | null>(null);

  const filtered = sortForList(REVIEWS);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /**
   * 별점 — 채운 별과 빈 별의 **개수**가 값이고, 숫자는 접근가능 이름으로 준다.
   * 별 그림만으로는 스크린리더가 점수를 읽지 못한다.
   */
  const renderRating = (rating: number) => (
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
        /* 원본 카드 머리에 남는 것은 목록 제목과 건수뿐이다 — 조건 축도 액션도 없다 */
        toolbarStart={
          <>
            <span className="heading-medium-bold text-text">리뷰 목록</span>
            <span className="body-medium text-text-sub">
              총 {filtered.length}건
            </span>
          </>
        }
        isEmpty={filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<MessageSquare strokeWidth={1.2} aria-hidden />}
            title="등록된 리뷰가 없습니다"
            description="구매·대여한 회원이 리뷰를 남기면 이 목록에 쌓입니다."
          />
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
          {/* table-fixed 라 폭 지정 필수. 한 컬럼만 auto 로 두면 여백을 독식한다 — 합 100% */}
          <colgroup>
            <col className="w-28" />
            <col className="w-30" />
            <col className="w-45" />
            <col className="w-23" />
            <col className="w-65" />
            <col className="w-28" />
            <col className="w-23" />
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
            {paged.map((review) => {
              const meta = STATUS_META[review.status];
              return (
                <TableRow key={review.id}>
                  <TableTd>{review.author}</TableTd>
                  <TableTd>{review.seller}</TableTd>
                  <TableTd>{review.product}</TableTd>
                  <TableTd>{renderRating(review.rating)}</TableTd>
                  {/* 원본에서 링크는 이 셀 하나다 — 행 전체는 눌리지 않는다 */}
                  <TableTd ellipsis>
                    <TextButton onClick={() => setPreview(review)}>
                      {bodyText(review)}
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

      {/*
        리뷰 미리보기 — 표에서 잘리는 본문을 온전히 보여 준다.
        **푸터 액션을 두지 않는다** — 원본 목록에는 조치가 하나도 없고,
        숨김·복원은 리뷰 상세 화면의 것이다. 남는 버튼은 모달을 닫는 것뿐이다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="리뷰 미리보기" description={preview?.product} />
        <ModalBody>
          <InfoList>
            <InfoItem label="작성자">{preview?.author}</InfoItem>
            <InfoItem label="셀러">{preview?.seller}</InfoItem>
            {/* 별 그림 대신 **숫자로** 적는다 — 정의 목록은 값을 읽는 자리다 */}
            <InfoItem label="별점">
              {preview ? ratingLabel(preview.rating) : ""}
            </InfoItem>
            <InfoItem label="작성일">
              {preview ? ymd(preview.date) : ""}
            </InfoItem>
            <InfoItem label="상태">
              {preview && (
                <Tag tone={STATUS_META[preview.status].tone} dot size="small">
                  {STATUS_META[preview.status].label}
                </Tag>
              )}
            </InfoItem>
          </InfoList>
          {/* 표에서 두 줄로 잘린 본문이 여기서는 전문으로 보인다 */}
          <p className="body-medium text-text-sub">
            {preview ? bodyText(preview) : ""}
          </p>
        </ModalBody>
      </Modal>
    </AppShell>
  );
}
