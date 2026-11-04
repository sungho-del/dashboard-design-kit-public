import { useState } from "react";
import { ArrowDownToLine, CircleHelp, Search } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  DataTableShell,
  DatePicker,
  EmptyState,
  FilterBar,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
  Select,
  Skeleton,
  StatGrid,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
  Tooltip,
  useToast,
} from "../../components/ui";
import { cn } from "../../lib/cn";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import { StatusTag } from "./OrderGates";
import {
  LIST_COPY,
  PAGE_SIZE,
  PAGE_SIZES,
  SEARCH_PLACEHOLDER,
  SELLER_PERIOD_PRESETS,
} from "./processList.data";
import {
  DATE_FIELDS,
  EMPTY_FILTERS,
  MY_PRODUCTS,
  PRICE_TIP,
  PRODUCT_COPY,
  SALE_STATS,
  SEARCH_FIELDS,
  SHOW_OPTIONS,
  STAT_TIP,
  TYPE_OPTIONS,
  categoryOptionsOf,
  detailPathOf,
  filterSummary,
  isRent,
  isSale,
  matchesExceptStat,
  matchesFilters,
  priceOf,
  rentPriceOf,
  reviewOf,
  saleStatOf,
  salePriceOf,
  showStatOf,
  won,
  type PriceDraft,
  type PriceField,
  type ProductFilters,
  type SaleStat,
} from "./ProductsPage.data";
import type { SellerProduct } from "./seed/products.data";
import { SellerShell, type SellerNavProps } from "./SettleParts";

/* =========================================================================
 * 상품 관리 (SO-PRD-001) — 목록형 · 뼈대. 본사 상품 관리와 같은 틀(상태 카드 = 상태 필터 · 좌우 고정 열)
 *
 * [ 판매 상태 카드 6 | 검색조건(펼침+요약) | 목록 (총 N건) · 엑셀 · 수정 저장 | 표 | 페이지 ]
 *
 * 본사와 다른 것(원본 셀러 화면): 처분(승인·반려)이 없고 **가격 5칸을 표에서 바로 고친다** →
 * 체크한 행만 [수정 저장]. 셀러명·KC·이미지 열 대신 렌트가·보증금·판매가·배송비 3종·적립금이 있다.
 * 도메인·문구는 `./ProductsPage.data.ts`.
 *
 * ## 퍼블 범위
 * 가격 칸은 이 화면 state 만 바꾸고 「변경됨」 표식을 단다. [수정 저장]은 원본 알림 문구만(행 값은 남는다).
 * 상품명·[수정] → 상품 상세(`/products/{id}` — 원본 `openProductForm` 수정 모드).
 *
 * ## 원본과 다르게 둔 곳 (본사 상품 관리와 같은 이유)
 * - 반려 사유는 밑줄 태그가 아니라 태그 아래 [사유 보기](`Tag` 는 표시 전용)
 * - 유형 라디오 → 셀렉트 · 조건을 바꾸면 선택·페이지가 풀린다(가격 고친 값은 남는다)
 * - 가격 열 ⓘ 는 머리 글자 옆 도움말 아이콘(원본 `th-help`)
 * ====================================================================== */

/** 좌측 고정 5열 52 / 72 / 112 / 112 / 232 → left 누적합(합 580). `<colgroup>` 과 함께 고친다 */
const FROZEN_LEFT = ["left-0", "left-13", "left-31", "left-59", "left-87"];
const FROZEN_LEAD_WIDTH = 580;
const FROZEN_TRAIL_WIDTH = 84;
const LAST_LEFT = FROZEN_LEFT.length - 1;
const EDGE_RIGHT =
  "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-divide after:content-['']";
const EDGE_LEFT =
  "before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-divide before:content-['']";
const frozenTh = (i: number) =>
  i > LAST_LEFT
    ? undefined
    : cn("sticky z-2", FROZEN_LEFT[i], i === LAST_LEFT && EDGE_RIGHT);
const frozenTd = (i: number) =>
  i > LAST_LEFT
    ? undefined
    : cn(
        "sticky z-1 bg-inherit",
        FROZEN_LEFT[i],
        i === LAST_LEFT && EDGE_RIGHT,
      );
const TRAIL_TH = cn("sticky right-0 z-2", EDGE_LEFT);
const TRAIL_TD = cn("sticky right-0 z-1 bg-inherit", EDGE_LEFT);

const withCommas = (n: number) => n.toLocaleString("ko-KR");

function HeadHelp({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {label}
      <Tooltip content={PRICE_TIP}>
        <span
          tabIndex={0}
          aria-label={`${label} 도움말`}
          className="inline-flex"
        >
          <CircleHelp
            size={16}
            strokeWidth={1.2}
            aria-hidden
            className="text-icon-sub"
          />
        </span>
      </Tooltip>
    </span>
  );
}

/** 가격 열 — 유형에 따라 반대 유형 열을 뺀다(원본 `drop`) */
const RENT_COLS = ["rent", "rentDisc", "rentPrice", "dep"] as const;
const SALE_COLS = ["sale", "saleDisc", "salePrice"] as const;
type PriceCol = (typeof RENT_COLS)[number] | (typeof SALE_COLS)[number];
const PRICE_HEAD: Record<PriceCol, { label: string; help: boolean }> = {
  rent: { label: "렌트 원가", help: true },
  rentDisc: { label: "할인 금액", help: true },
  rentPrice: { label: "렌트가", help: false },
  dep: { label: "보증금", help: true },
  sale: { label: "판매 원가", help: true },
  saleDisc: { label: "판매 할인", help: true },
  salePrice: { label: "판매가", help: false },
};

export function ProductsPage(props: SellerNavProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PriceDraft>>({});
  const [filterOpen, setFilterOpen] = useState(true);
  const [reasonOf, setReasonOf] = useState<SellerProduct | null>(null);
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const patch = (next: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
    setSelected([]);
  };
  const reset = () => patch(EMPTY_FILTERS);

  const ctx = MY_PRODUCTS.filter((p) => matchesExceptStat(p, filters));
  const filtered = ctx.filter((p) => matchesFilters(p, filters));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);
  const pageIds = paged.map((p) => p.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someChecked =
    pageIds.some((id) => selected.includes(id)) && !allChecked;

  const cols: PriceCol[] =
    filters.type === "렌트"
      ? [...RENT_COLS]
      : filters.type === "판매"
        ? [...SALE_COLS]
        : [...RENT_COLS, ...SALE_COLS];
  const columnCount = 5 + cols.length + 8 + 1;

  const setPrice = (id: string, f: PriceField, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [f]: digits === "" ? 0 : Number(digits) },
    }));
  };

  /** 원본 `pSaveSelected` — 체크한 행 중 고친 값이 있는 것만 센다(퍼블은 알림만) */
  const saveSelected = () => {
    if (selected.length === 0) return toast(PRODUCT_COPY.saveNone);
    const n = selected.filter((id) => drafts[id]).length;
    toast(n ? PRODUCT_COPY.saved(n) : PRODUCT_COPY.saveNoChange);
  };
  const exportCsv = () => {
    const picked = selected.length > 0;
    const n = picked ? selected.length : filtered.length;
    toast(n === 0 ? LIST_COPY.excelEmpty : LIST_COPY.excel(n, picked));
  };
  const open = (p: SellerProduct) => props.onNavSelect(detailPathOf(p));

  const moneyCell = (p: SellerProduct, f: PriceField, label: string) => (
    <Input
      size="small"
      /* 폭을 주지 않으면 네이티브 input 기본 폭(약 190)이 `w-max` 표의 열을 225 까지 밀어낸다 — 본사 옵션가 칸과 같은 w-28 */
      className="w-28"
      inputMode="numeric"
      aria-label={`${p.name} ${label}`}
      value={withCommas(priceOf(p, drafts[p.id], f))}
      onChange={(event) => setPrice(p.id, f, event.target.value)}
    />
  );
  const priceCell = (p: SellerProduct, col: PriceCol) => {
    const rent = isRent(p);
    const sale = isSale(p);
    switch (col) {
      case "rent":
      case "rentDisc":
      case "dep":
        return rent ? moneyCell(p, col, PRICE_HEAD[col].label) : "-";
      case "rentPrice":
        return rent ? (
          <span className="body-medium-bold whitespace-nowrap tabular-nums">
            {won(rentPriceOf(p, drafts[p.id]))}/일
          </span>
        ) : (
          "-"
        );
      case "sale":
      case "saleDisc":
        return sale ? moneyCell(p, col, PRICE_HEAD[col].label) : "-";
      case "salePrice":
        return sale ? (
          <span className="body-medium-bold whitespace-nowrap tabular-nums">
            {won(salePriceOf(p, drafts[p.id]))}
          </span>
        ) : (
          "-"
        );
    }
  };

  return (
    <SellerShell {...props} header={<PageHeader title="상품 관리" />}>
      {/* 판매 상태별 건수 — 그 자체가 상태 필터(원본 `StatDash` · 처음엔 판매중). 건수는 상태 밖 조건을 따른다 */}
      <Card>
        <CardBody>
          <StatGrid
            items={SALE_STATS.map((s) => ({
              value: s,
              label: s,
              count: String(ctx.filter((p) => saleStatOf(p) === s).length),
              unit: "개",
              tip: STAT_TIP[s],
            }))}
            selected={filters.stat}
            onSelect={(value) => patch({ stat: value as SaleStat })}
            ariaLabel="판매 상태별 건수"
            columns={6}
          />
        </CardBody>
      </Card>

      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary(filters)}
        onReset={reset}
      >
        <Select
          className="w-32"
          aria-label="기간 기준"
          options={[...DATE_FIELDS]}
          value={filters.dateField}
          onValueChange={(value) => patch({ dateField: value })}
        />
        <DatePicker
          mode="range"
          aria-label="기간"
          presets={SELLER_PERIOD_PRESETS}
          value={filters.period}
          onChange={(next) => patch({ period: next })}
        />
        <Select
          className="w-36"
          aria-label="전시 상태"
          options={[...SHOW_OPTIONS]}
          value={filters.show}
          onValueChange={(value) => patch({ show: value })}
        />
        <Select
          className="w-32"
          aria-label="유형"
          options={[...TYPE_OPTIONS]}
          value={filters.type}
          onValueChange={(value) => patch({ type: value, cat: "" })}
        />
        {/* 잠긴 동안에는 셀렉트 자신이 이유를 말한다(「유형 먼저 선택」) */}
        <Select
          className="w-40"
          aria-label="카테고리"
          options={categoryOptionsOf(filters.type)}
          value={filters.cat}
          disabled={filters.type === "all"}
          onValueChange={(value) => patch({ cat: value })}
        />
        <Select
          className="w-28"
          aria-label="검색 대상"
          options={[...SEARCH_FIELDS]}
          value={filters.searchField}
          onValueChange={(value) => patch({ searchField: value })}
        />
        <Input
          aria-label="검색어"
          placeholder={SEARCH_PLACEHOLDER}
          value={filters.keyword}
          onChange={(event) => patch({ keyword: event.target.value })}
          leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        />
      </FilterBar>

      <DataTableShell
        scrollLeadWidth={FROZEN_LEAD_WIDTH}
        scrollTrailWidth={FROZEN_TRAIL_WIDTH}
        variant="soft"
        bodyClassName={dimWhile(dataStatus)}
        aria-busy={isBusy(dataStatus)}
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        toolbarEnd={
          <span className="flex items-center gap-2">
            <Button variant="secondary" onClick={exportCsv}>
              <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
              엑셀 다운로드
            </Button>
            {/* 목록 머리 처리 버튼 — 판매 묶음 결정(일괄 버튼은 목록 머리) */}
            <Button onClick={saveSelected}>수정 저장</Button>
          </span>
        }
        isEmpty={dataStatus === "empty" || filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            sticky
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title={LIST_COPY.emptyTitle}
            description={LIST_COPY.emptyDescription}
          >
            <Button variant="secondary" onClick={reset}>
              필터 초기화
            </Button>
          </EmptyState>
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
            <col className="w-18" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-58" />
            {/* 입력 열 144(입력칸 112 + 여백) · 계산 열(렌트가·판매가) 128 */}
            {cols.map((c) => (
              <col
                key={c}
                className={
                  c === "rentPrice" || c === "salePrice" ? "w-32" : "w-36"
                }
              />
            ))}
            <col className="w-24" />
            <col className="w-26" />
            <col className="w-26" />
            <col className="w-32" />
            <col className="w-20" />
            <col className="w-24" />
            <col className="w-44" />
            <col className="w-44" />
            <col className="w-21" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh className={frozenTh(0)}>
                <Checkbox
                  size="small"
                  aria-label="이 페이지 전체 선택"
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={() =>
                    setSelected((prev) =>
                      allChecked
                        ? prev.filter((id) => !pageIds.includes(id))
                        : [
                            ...prev,
                            ...pageIds.filter((id) => !prev.includes(id)),
                          ],
                    )
                  }
                />
              </TableTh>
              <TableTh align="center" className={frozenTh(1)}>
                유형
              </TableTh>
              <TableTh align="center" className={frozenTh(2)}>
                판매 상태
              </TableTh>
              <TableTh className={frozenTh(3)}>상품코드</TableTh>
              <TableTh className={frozenTh(4)}>상품명</TableTh>
              {cols.map((c) => (
                <TableTh key={c}>
                  {PRICE_HEAD[c].help ? (
                    <HeadHelp label={PRICE_HEAD[c].label} />
                  ) : (
                    PRICE_HEAD[c].label
                  )}
                </TableTh>
              ))}
              <TableTh>배송비</TableTh>
              <TableTh>반품배송비</TableTh>
              <TableTh>교환배송비</TableTh>
              <TableTh>카테고리</TableTh>
              <TableTh>적립금</TableTh>
              <TableTh align="center">전시 상태</TableTh>
              <TableTh>상품등록일</TableTh>
              <TableTh>최종수정일</TableTh>
              <TableTh align="center" className={TRAIL_TH}>
                관리
              </TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataStatus === "loading"
              ? Array.from({ length: pageSize }, (_, row) => (
                  <TableRow key={`skeleton-${row}`}>
                    {Array.from({ length: columnCount }, (_, cell) => (
                      <TableTd key={cell} className={frozenTd(cell)}>
                        <span className="body-small block">
                          <Skeleton />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : paged.map((p) => {
                  const stat = saleStatOf(p);
                  const review = reviewOf(p);
                  return (
                    <TableRow key={p.id}>
                      <TableTd className={frozenTd(0)}>
                        <Checkbox
                          size="small"
                          aria-label={`${p.name} 선택`}
                          checked={selected.includes(p.id)}
                          onChange={() =>
                            setSelected((prev) =>
                              prev.includes(p.id)
                                ? prev.filter((v) => v !== p.id)
                                : [...prev, p.id],
                            )
                          }
                        />
                      </TableTd>
                      <TableTd align="center" className={frozenTd(1)}>
                        <Tag size="small">
                          {p.mode === "sale" ? "판매" : "렌트"}
                        </Tag>
                      </TableTd>
                      <TableTd align="center" className={frozenTd(2)}>
                        <span className="flex flex-col items-center gap-1">
                          <StatusTag status={stat} />
                          {review && (
                            <TextButton
                              size="small"
                              tone="secondary"
                              onClick={() => setReasonOf(p)}
                            >
                              사유 보기
                            </TextButton>
                          )}
                        </span>
                      </TableTd>
                      <TableTd className={cn("tabular-nums", frozenTd(3))}>
                        {p.code || "-"}
                      </TableTd>
                      <TableTd className={frozenTd(4)}>
                        <span className="flex items-center gap-2">
                          <TextButton onClick={() => open(p)}>
                            <span className="line-clamp-2 text-left break-keep">
                              {p.name}
                            </span>
                          </TextButton>
                          {drafts[p.id] && (
                            <Tag tone="warning" size="small">
                              변경됨
                            </Tag>
                          )}
                        </span>
                      </TableTd>
                      {cols.map((c) => (
                        <TableTd key={c}>{priceCell(p, c)}</TableTd>
                      ))}
                      <TableTd className="tabular-nums">
                        {won(p.shipFee || 0)}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {won(p.returnFee || 0)}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {won(p.exchangeFee || 0)}
                      </TableTd>
                      <TableTd>{p.cat}</TableTd>
                      <TableTd className="tabular-nums">
                        {(p.point || 0).toLocaleString("ko-KR")}P
                      </TableTd>
                      <TableTd align="center">
                        <StatusTag status={showStatOf(p)} />
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {p.createdAt || "-"}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {p.updatedAt || "-"}
                      </TableTd>
                      <TableTd align="center" className={TRAIL_TD}>
                        <Button
                          variant="secondary"
                          size="small"
                          aria-label={`${p.name} 수정`}
                          onClick={() => open(p)}
                        >
                          수정
                        </Button>
                      </TableTd>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* 반려 사유 — 원본 `prodReason` 창 문구 그대로 */}
      <Modal open={!!reasonOf} onClose={() => setReasonOf(null)} size="small">
        <ModalHeader closeLabel="대화상자 닫기" title="반려 사유" />
        {reasonOf && (
          <ModalBody>
            <StatusTag status={saleStatOf(reasonOf)} />
            <p className="body-medium text-text">
              상품: <span className="body-medium-bold">{reasonOf.name}</span>
            </p>
            <p className="body-medium rounded-medium bg-surface-sub p-4 break-keep text-text">
              {reviewOf(reasonOf)?.reason || PRODUCT_COPY.reasonEmpty}
            </p>
            <p className="body-small break-keep text-text-sub">
              {[
                reviewOf(reasonOf)?.at ? `${reviewOf(reasonOf)?.at} 처리` : "",
                saleStatOf(reasonOf) === "재심사요청"
                  ? PRODUCT_COPY.reasonWaiting
                  : PRODUCT_COPY.reasonGuide,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </ModalBody>
        )}
        <ModalFooter>
          <Button size="large" onClick={() => setReasonOf(null)}>
            확인
          </Button>
        </ModalFooter>
      </Modal>
    </SellerShell>
  );
}
