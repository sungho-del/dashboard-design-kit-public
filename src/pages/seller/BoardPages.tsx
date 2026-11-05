import { useState, type ReactNode } from "react";
import { ArrowDownToLine, Lock, Plus, Search, Star } from "lucide-react";
import {
  Button,
  Checkbox,
  DataTableShell,
  EmptyState,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
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
  ASK_NEW_KEY,
  ASK_PATH,
  EMPTY_CELL,
  INQ_TYPE_ALL,
  INQ_TYPE_TABS,
  NOTICE_PATH,
  PIN_LABEL,
  RATING_MAX,
  REVIEWS_PATH,
  SECRET_LABEL,
  SUPPORT_PATH,
  boardToneOf,
  detailPathOf,
  inqTypeOf,
  NOTICE_ROWS,
  ratingLabel,
  replyStatOf,
} from "./BoardPages.data";
import { LIST_COPY, PAGE_SIZE, PAGE_SIZES } from "./processList.data";
import { SELLER_ASKS, SL_INQUIRIES, SL_REVIEWS } from "./seed/board.data";
import { SellerShell, type SellerNavProps } from "./SettleParts";

/* =========================================================================
 * 게시판 관리 4목록 — 원본 기획 v0.4 `SCREENS.sellerNotice`(3590) · `support`(3623) ·
 * `sellerReviews`(3658) · `sellerAsk`(3693). 도메인은 `./BoardPages.data.ts`.
 *
 * ## 화면 유형: 목록형 (네 화면 같은 틀 — `BoardTable`)
 * ```
 * (문의 관리만) [전체][상품 문의][주문 문의]        ← 원본 칩 자리 · 카드 위
 * 카드[ 목록 (총 N건)     [엑셀 다운로드] (1:1 만 [+ 문의 작성]) ]
 *     [ ☐ · 원본 열 그대로 ]
 *     [ 페이지 · 10/20/50/100 ]
 * ```
 * 행 어디를 눌러도 상세 `{목록}/{id}`(셀 안 체크박스는 이동하지 않는다).
 * 체크박스 = 엑셀 선택분(원본 `EXPORT_SPEC` 이 네 화면을 가진다). 엑셀은 알림만(퍼블 범위).
 *
 * ## 갈아끼울 것 → `./BoardPages.data.ts` · 열 구성은 각 화면의 `columns` 배열
 *
 * ## 그대로 두는 것
 * 페이지 범위 클램프 · 페이지 단위 전체 선택 · 유형을 바꾸면 페이지·선택 해제(`key`)
 *
 * ## 원본과 다르게 둔 곳 (형제 화면 규칙)
 * - 행 어디를 눌러도 상세(원본은 제목·내용 글자만)
 * - 열은 왼쪽 정렬, 배지 열만 가운데(원본은 전부 가운데)
 * - 문의 유형 배지는 중립색 — 분류라 상태색을 쓰지 않는다(원본 주문 문의 파랑 · 정산 거래 표와 같은 규칙)
 * - 상태 배지는 본사 문의·리뷰 화면 톤(접수·답글 대기 = 주의) — 원본은 「답글 대기」만 진행색
 * - 🔒 → 자물쇠 아이콘 · ★☆ 글자 → 별 아이콘(본사 리뷰 목록과 같은 그림)
 * - [+ 문의 작성]은 카드 밖 위 → 목록 머리 맨 오른쪽 주 버튼(본사 공지 [공지 작성]과 같은 자리)
 *
 * ## 기획 확인 필요 → `BoardPages.data.ts` 머리 주석
 * ====================================================================== */

/** 게시판 상태 배지 — 주문 상태 사전(`StatusTag`)과 따로 둔다 */
export function BoardTag({ status }: { status: string }) {
  return (
    <Tag tone={boardToneOf(status)} dot size="small">
      {status}
    </Tag>
  );
}

/** 별점 — 본사 리뷰 목록 `RatingStars` 와 같은 그림 */
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

/** 비밀글 표시 — 원본 🔒 */
export const SecretMark = () => (
  <Lock
    size={16}
    strokeWidth={1.2}
    role="img"
    aria-label={SECRET_LABEL}
    className="shrink-0"
  />
);

/**
 * 원본 링크 자리 — 한 줄 말줄임(원본 `cell-ell`). 버튼은 줄바꿈을 안 해서 안쪽 span 이 자른다.
 * ⚠️ `truncate`(nowrap) 가 아니라 `line-clamp-1` — nowrap 은 칸의 최소 폭이 글 전체 길이가 되어
 * `w-max` 표에서 `<col>` 폭을 무시하고 열을 늘린다(공지 내용 874px).
 */
function LinkCell({
  open,
  lead,
  children,
}: {
  open: () => void;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <TextButton className="max-w-full" onClick={open}>
      {lead}
      <span className="line-clamp-1 text-left break-all whitespace-normal">
        {children}
      </span>
    </TextButton>
  );
}

const Ellipsis = ({ children }: { children: ReactNode }) => (
  <span className="line-clamp-1 break-all">{children}</span>
);

interface Column<T> {
  head: string;
  /** `<col>` 폭 — **모든 열에 준다**. 표가 `w-max` 라 폭 없는 열은 내용 길이만큼 늘어나
   *  1280 에서 오른쪽 열(게시일·상태)이 밀려난다. 합이 화면보다 좁으면 `min-w-full` 이 비율대로 늘린다 */
  width: string;
  center?: boolean;
  cell: (row: T, open: () => void) => ReactNode;
}

function BoardTable<T extends { id: string }>({
  rows,
  columns,
  rowLabel,
  onOpen,
  action,
}: {
  rows: T[];
  columns: Column<T>[];
  /** 체크박스 읽기 이름 */
  rowLabel: (row: T) => string;
  onOpen: (row: T) => void;
  /** 머리 맨 오른쪽 주 버튼(1:1 [+ 문의 작성]) */
  action?: ReactNode;
}) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<string[]>([]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);
  const pageIds = paged.map((row) => row.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someChecked =
    !allChecked && pageIds.some((id) => selected.includes(id));

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  const togglePage = () =>
    setSelected((prev) =>
      allChecked
        ? prev.filter((id) => !pageIds.includes(id))
        : [...prev, ...pageIds.filter((id) => !prev.includes(id))],
    );
  /* 원본 `exportCsv` — 고른 행이 있으면 그것만, 없으면 목록 전체 */
  const exportCsv = () => {
    if (rows.length === 0) return toast(LIST_COPY.excelEmpty);
    const picked = selected.length > 0;
    toast(LIST_COPY.excel(picked ? selected.length : rows.length, picked));
  };

  return (
    <DataTableShell
      variant="soft"
      toolbarStart={
        <h2 className="heading-medium-bold text-text">
          목록 (총 {rows.length}건)
        </h2>
      }
      toolbarEnd={
        <span className="flex items-center gap-2">
          <Button variant="secondary" onClick={exportCsv}>
            <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
            엑셀 다운로드
          </Button>
          {action}
        </span>
      }
      isEmpty={rows.length === 0}
      empty={
        <EmptyState
          size="table"
          icon={<Search strokeWidth={1.2} aria-hidden />}
          title={LIST_COPY.emptyTitle}
          description={LIST_COPY.emptyDescription}
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
        <colgroup>
          <col className="w-13" />
          {columns.map((c) => (
            <col key={c.head} className={c.width} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow>
            <TableTh>
              <Checkbox
                size="small"
                aria-label="이 페이지 전체 선택"
                checked={allChecked}
                indeterminate={someChecked}
                onChange={togglePage}
              />
            </TableTh>
            {columns.map((c) => (
              <TableTh key={c.head} align={c.center ? "center" : "left"}>
                {c.head}
              </TableTh>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {paged.map((row) => {
            const open = () => onOpen(row);
            return (
              <TableRow key={row.id} clickable onClick={open}>
                <TableTd>
                  <Checkbox
                    size="small"
                    aria-label={`${rowLabel(row)} 선택`}
                    checked={selected.includes(row.id)}
                    onChange={() => toggle(row.id)}
                  />
                </TableTd>
                {columns.map((c) => (
                  <TableTd key={c.head} align={c.center ? "center" : "left"}>
                    {c.cell(row, open)}
                  </TableTd>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}

const DATE_COL = "w-28";
const TAG_COL = "w-28";
const dateCell = (date: string) => <span className="tabular-nums">{date}</span>;

/* ---------- 공지사항 (SO-CSC-002) — 본사 공지 읽기 전용 ---------- */

export function SellerNoticePage(props: SellerNavProps) {
  return (
    <SellerShell {...props} header={<PageHeader title="공지사항" />}>
      <BoardTable
        rows={NOTICE_ROWS}
        rowLabel={(n) => n.title}
        onOpen={(n) => props.onNavSelect(detailPathOf(NOTICE_PATH, n.id))}
        columns={[
          {
            head: "고정",
            width: "w-20",
            center: true,
            cell: (n) =>
              n.pin ? (
                <Tag size="small">{PIN_LABEL}</Tag>
              ) : (
                <span className="text-text-minimal">{EMPTY_CELL}</span>
              ),
          },
          {
            head: "제목",
            width: "w-90",
            cell: (n, open) => <LinkCell open={open}>{n.title}</LinkCell>,
          },
          {
            head: "내용",
            width: "w-80",
            cell: (n) => <Ellipsis>{n.body}</Ellipsis>,
          },
          { head: "게시일", width: DATE_COL, cell: (n) => dateCell(n.date) },
        ]}
      />
    </SellerShell>
  );
}

/* ---------- 문의 관리 (SO-CSC-001) — 고객 → 입점사 (상품 문의 · 주문 문의) ---------- */

export function SupportPage(props: SellerNavProps) {
  const [type, setType] = useState(INQ_TYPE_ALL);
  const rows = SL_INQUIRIES.filter(
    (q) => type === INQ_TYPE_ALL || inqTypeOf(q) === type,
  );

  return (
    <SellerShell {...props} header={<PageHeader title="문의 관리" />}>
      {/* 원본 칩 자리 — 카드 밖 위. 본사 문의·공지와 같은 부품 */}
      <SegmentedControl
        className="self-start"
        aria-label="문의 유형"
        items={INQ_TYPE_TABS}
        value={type}
        onValueChange={setType}
      />
      <BoardTable
        key={type}
        rows={rows}
        rowLabel={(q) => `${q.mem} ${q.q}`}
        onOpen={(q) => props.onNavSelect(detailPathOf(SUPPORT_PATH, q.id))}
        columns={[
          {
            head: "유형",
            width: TAG_COL,
            center: true,
            cell: (q) => <Tag size="small">{inqTypeOf(q)}</Tag>,
          },
          { head: "회원", width: "w-24", cell: (q) => q.mem },
          {
            head: "상품/주문번호",
            width: "w-56",
            cell: (q) => (
              <span className="flex flex-col">
                <span className="break-keep">{q.prod}</span>
                {q.type === "주문" && q.no ? (
                  <span className="body-small text-text-sub tabular-nums">
                    주문번호 {q.no}
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            head: "내용",
            width: "w-64",
            cell: (q, open) => (
              <LinkCell open={open} lead={q.secret ? <SecretMark /> : null}>
                {q.q}
              </LinkCell>
            ),
          },
          { head: "접수일", width: DATE_COL, cell: (q) => dateCell(q.date) },
          {
            head: "상태",
            width: TAG_COL,
            center: true,
            cell: (q) => <BoardTag status={q.stat} />,
          },
        ]}
      />
    </SellerShell>
  );
}

/* ---------- 리뷰 관리 (SO-CSC-003) — 자기 상품 리뷰 · 답글 유무 ---------- */

export function SellerReviewsPage(props: SellerNavProps) {
  return (
    <SellerShell {...props} header={<PageHeader title="리뷰 관리" />}>
      <BoardTable
        rows={SL_REVIEWS}
        rowLabel={(r) => `${r.mem} ${r.txt}`}
        onOpen={(r) => props.onNavSelect(detailPathOf(REVIEWS_PATH, r.id))}
        columns={[
          { head: "작성자", width: "w-24", cell: (r) => r.mem },
          {
            head: "상품",
            width: "w-48",
            cell: (r) => <Ellipsis>{r.prod}</Ellipsis>,
          },
          {
            head: "별점",
            width: "w-28",
            cell: (r) => <RatingStars rating={r.rate} />,
          },
          {
            head: "내용",
            width: "w-72",
            cell: (r, open) => <LinkCell open={open}>{r.txt}</LinkCell>,
          },
          { head: "작성일", width: DATE_COL, cell: (r) => dateCell(r.date) },
          {
            head: "답글",
            width: TAG_COL,
            center: true,
            cell: (r) => <BoardTag status={replyStatOf(!!r.reply)} />,
          },
        ]}
      />
    </SellerShell>
  );
}

/* ---------- 1:1 문의 (SO-CSC-004) — 입점사 → 본사 ---------- */

export function SellerAskPage(props: SellerNavProps) {
  return (
    <SellerShell {...props} header={<PageHeader title="1:1 문의" />}>
      <BoardTable
        rows={SELLER_ASKS}
        rowLabel={(q) => q.title}
        onOpen={(q) => props.onNavSelect(detailPathOf(ASK_PATH, q.id))}
        action={
          <Button
            onClick={() =>
              props.onNavSelect(detailPathOf(ASK_PATH, ASK_NEW_KEY))
            }
          >
            <Plus size={16} strokeWidth={1.2} aria-hidden />
            문의 작성
          </Button>
        }
        columns={[
          {
            head: "제목",
            width: "w-90",
            cell: (q, open) => <LinkCell open={open}>{q.title}</LinkCell>,
          },
          {
            head: "내용",
            width: "w-80",
            cell: (q) => <Ellipsis>{q.body}</Ellipsis>,
          },
          { head: "접수일", width: DATE_COL, cell: (q) => dateCell(q.date) },
          {
            head: "상태",
            width: TAG_COL,
            center: true,
            cell: (q) => <BoardTag status={q.stat} />,
          },
        ]}
      />
    </SellerShell>
  );
}
