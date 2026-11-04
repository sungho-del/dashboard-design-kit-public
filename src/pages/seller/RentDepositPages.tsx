import { useState, type ReactNode } from "react";
import { ArrowDownToLine, Search, Wallet } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  DataTableShell,
  DatePicker,
  EmptyState,
  FilterBar,
  InfoItem,
  InfoList,
  Input,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
  Select,
  Skeleton,
  StatTile,
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
import { cn } from "../../lib/cn";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import { CalcBreakdown } from "../babycube/CalcBreakdown";
import { StatusTag } from "./OrderGates";
import { careOf, payMethodOf, toneOf } from "./orderUnit.data";
import {
  CARE_OPTIONS,
  LIST_COPY,
  PAGE_SIZE,
  PAGE_SIZES,
  SEARCH_PLACEHOLDER,
  SELLER_PERIOD_PRESETS,
} from "./processList.data";
import {
  DEP_LIST_PATH,
  DEP_PROCESS_COPY,
  DEP_SEARCH_FIELDS,
  DEP_STATUS_OPTIONS,
  DEPOSIT_HELP,
  EMPTY_DEP_FILTERS,
  depFilterSummary,
  depProcessOf,
  depositCalcBlocks,
  dueOf,
  findDepositUnit,
  inspLinkable,
  inspPathOf,
  inspectOf,
  matchesDep,
  type DepFilters,
} from "./RentDepositPages.data";
import type { OrderUnit } from "./seed/orders.data";
import {
  Bold,
  NoteBox,
  Section,
  SellerShell,
  type SellerNavProps,
} from "./SettleParts";
import {
  DEPOSIT_LIST,
  depBackOf,
  depCutOf,
  depLabelOf,
  depStatOf,
  depositStats,
  minus,
  won,
} from "./settle.data";

/* =========================================================================
 * 보증금 내역(SO-STL-002) · 보증금 상세(SO-STL-003) — 조회 전용 원장. 본사 보증금 내역과 같은 틀
 *
 * 목록: [ 요약 타일 4 | 검색조건(펼침+요약) | 목록 (총 N건) · 엑셀 | 표 10열 | 페이지 ]
 * 상세: 보증금 정보 · 정산 계산 · 처리 상태(조회 전용) · 구매자 정보 · [목록] … [취소] [확인]
 *
 * 행 액션·일괄 처리는 없다(원본 — 환급 실행은 검수·반납 관리 상세). 선택은 엑셀 선택분만 정한다.
 * 본사와 다른 것: 구분·셀러명 열이 없다(내 스토어 건뿐 — 원본 열 그대로) · 검색에 상품명 · 안심케어 칸.
 *
 * ## 원본과 다르게 둔 곳 (본사 보증금 내역과 같은 이유)
 * - 체크박스·주문번호 좌측 고정 — 1280 에서 가로로 밀면 어느 건인지 사라진다
 * - 금액 3열 오른쪽 + `tabular-nums`(§7-2 계산 영역 예외) · 차감 부호 `−N원` · 경고색 없음
 * - 안심케어 🛡 이모지 → 상품 옆 `Tag` · 상세 「✓ 환급 처리 완료」의 ✓ 는 뺐다
 * ====================================================================== */

const FROZEN_LEFT = ["left-0", "left-13"];
const LAST_FROZEN = FROZEN_LEFT.length - 1;
/** 고정 2열(체크박스 52 · 주문번호 160) */
const FROZEN_LEAD_WIDTH = 212;
const FROZEN_EDGE =
  "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-divide after:content-['']";
const frozenTh = (i: number) =>
  i > LAST_FROZEN
    ? undefined
    : cn("sticky z-2", FROZEN_LEFT[i], i === LAST_FROZEN && FROZEN_EDGE);
const frozenTd = (i: number) =>
  i > LAST_FROZEN
    ? undefined
    : cn(
        "sticky z-1 bg-inherit",
        FROZEN_LEFT[i],
        i === LAST_FROZEN && FROZEN_EDGE,
      );
const COLUMN_COUNT = 10;

/** 보증금 상태 배지 — 셀에서는 긴 라벨(「환급완료(전액차감)」) */
function DepositTag({ u }: { u: OrderUnit }) {
  return (
    <Tag tone={toneOf(depStatOf(u))} dot size="small">
      {depLabelOf(u)}
    </Tag>
  );
}

export function RentDepositPage(props: SellerNavProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<DepFilters>(EMPTY_DEP_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(true);
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const patch = (next: Partial<DepFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
    setSelected([]);
  };
  const reset = () => patch(EMPTY_DEP_FILTERS);

  const filtered = DEPOSIT_LIST.filter((u) => matchesDep(u, filters));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);
  const pageIds = paged.map((u) => u.id);
  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const someChecked =
    pageIds.some((id) => selected.includes(id)) && !allChecked;

  const exportCsv = () => {
    const picked = selected.length > 0;
    const n = picked ? selected.length : filtered.length;
    toast(n === 0 ? LIST_COPY.excelEmpty : LIST_COPY.excel(n, picked));
  };
  const open = (u: OrderUnit) => props.onNavSelect(`${DEP_LIST_PATH}/${u.id}`);
  const stats = depositStats();

  return (
    <SellerShell {...props} header={<PageHeader title="보증금 내역" />}>
      {/* 요약 4값 — 필터와 무관하다(보증금 있는 렌트 전체 · 원본 그대로 · 기획 확인) */}
      {/* 원본 라벨의 괄호 부연은 caption 으로 — 라벨에 두면 1280 에서 두 줄이 되어 값이 이웃 타일보다 내려간다 */}
      <section className="grid grid-cols-4 gap-6" aria-label="보증금 요약">
        {(
          [
            ["점유중 보증금 총액", undefined, stats.hold],
            ["환급 대기액", "판정됨·실행 전", stats.pending],
            ["반환 완료액", undefined, stats.refunded],
            ["차감 수익", "연체료+손상 · 상한=보증금", stats.deducted],
          ] as const
        ).map(([label, caption, value]) => (
          <StatTile
            key={label}
            variant="card"
            label={label}
            value={value.toLocaleString("ko-KR")}
            unit="원"
            caption={caption}
          />
        ))}
      </section>

      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={depFilterSummary(filters)}
        onReset={reset}
      >
        <DatePicker
          mode="range"
          aria-label="상태 변경일"
          presets={SELLER_PERIOD_PRESETS}
          value={filters.period}
          onChange={(next) => patch({ period: next })}
          startPlaceholder="상태 변경일 시작"
          endPlaceholder="상태 변경일 종료"
        />
        <Select
          className="w-40"
          aria-label="보증금 상태"
          options={[...DEP_STATUS_OPTIONS]}
          value={filters.status}
          onValueChange={(value) => patch({ status: value })}
        />
        <Select
          className="w-32"
          aria-label="안심케어"
          options={[...CARE_OPTIONS]}
          value={filters.care}
          onValueChange={(value) => patch({ care: value })}
        />
        <Select
          className="w-28"
          aria-label="검색 대상"
          options={[...DEP_SEARCH_FIELDS]}
          value={filters.searchField}
          onValueChange={(value) => patch({ searchField: value })}
        />
        <Input
          placeholder={SEARCH_PLACEHOLDER}
          value={filters.keyword}
          onChange={(event) => patch({ keyword: event.target.value })}
          leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        />
      </FilterBar>

      <DataTableShell
        scrollLeadWidth={FROZEN_LEAD_WIDTH}
        variant="soft"
        bodyClassName={dimWhile(dataStatus)}
        aria-busy={isBusy(dataStatus)}
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        toolbarEnd={
          <Button variant="secondary" onClick={exportCsv}>
            <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
            엑셀 다운로드
          </Button>
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
          {/* 앞 2개는 `FROZEN_LEFT` 와 짝(합 212). 합 1124 — 1440 카드 안에 스크롤 없이 들어간다 */}
          <colgroup>
            <col className="w-13" />
            <col className="w-40" />
            <col className="w-20" />
            <col className="w-44" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-36" />
            <col className="w-28" />
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
              <TableTh className={frozenTh(1)}>주문번호</TableTh>
              <TableTh>회원</TableTh>
              <TableTh>상품</TableTh>
              <TableTh align="right">보증금액</TableTh>
              <TableTh align="right">차감</TableTh>
              <TableTh align="right">반환 예정액</TableTh>
              <TableTh align="center">주문 상태</TableTh>
              <TableTh align="center">보증금 상태</TableTh>
              <TableTh>상태 변경일</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataStatus === "loading"
              ? Array.from({ length: pageSize }, (_, row) => (
                  <TableRow key={`skeleton-${row}`}>
                    {Array.from({ length: COLUMN_COUNT }, (_, cell) => (
                      <TableTd key={cell} className={frozenTd(cell)}>
                        <span className="body-small block">
                          <Skeleton />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : paged.map((u) => (
                  <TableRow key={u.id} clickable onClick={() => open(u)}>
                    <TableTd className={frozenTd(0)}>
                      <Checkbox
                        size="small"
                        aria-label={`${u.no} ${u.prod} 선택`}
                        checked={selected.includes(u.id)}
                        onChange={() =>
                          setSelected((prev) =>
                            prev.includes(u.id)
                              ? prev.filter((v) => v !== u.id)
                              : [...prev, u.id],
                          )
                        }
                      />
                    </TableTd>
                    <TableTd className={frozenTd(1)}>
                      <TextButton onClick={() => open(u)}>{u.no}</TextButton>
                    </TableTd>
                    <TableTd>{u.mem}</TableTd>
                    <TableTd>
                      {/* 긴 이름은 낱말 단위로 두 줄까지 — 폭을 열 안쪽(176 − 24)에 묶는다 */}
                      <span className="line-clamp-2 block w-38 break-keep">
                        {u.prod}
                        {careOf(u) && (
                          <>
                            {" "}
                            <Tag size="small">안심케어</Tag>
                          </>
                        )}
                      </span>
                    </TableTd>
                    <TableTd
                      align="right"
                      className="whitespace-nowrap tabular-nums"
                    >
                      {won(u.dep || 0)}
                    </TableTd>
                    <TableTd
                      align="right"
                      className="whitespace-nowrap tabular-nums"
                    >
                      {depCutOf(u) > 0 ? minus(depCutOf(u)) : "-"}
                    </TableTd>
                    <TableTd
                      align="right"
                      className="whitespace-nowrap tabular-nums"
                    >
                      {won(depBackOf(u))}
                    </TableTd>
                    <TableTd align="center">
                      <StatusTag status={u.stat ?? ""} />
                    </TableTd>
                    <TableTd align="center">
                      <DepositTag u={u} />
                    </TableTd>
                    <TableTd className="tabular-nums">
                      {u.depStatAt || "-"}
                    </TableTd>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </DataTableShell>
    </SellerShell>
  );
}

/* ---------- 보증금 상세 ---------- */

const LABEL_WIDTH = 120;

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <InfoItem label={label} labelWidth={LABEL_WIDTH}>
      {children}
    </InfoItem>
  );
}

export function RentDepositDetailPage(props: SellerNavProps) {
  const pathname = usePathname();
  const rest = pathname.slice(DEP_LIST_PATH.length + 1);
  const u = rest.includes("/")
    ? undefined
    : findDepositUnit(lastPathSegment(pathname));
  const toList = () => props.onNavSelect(DEP_LIST_PATH);

  if (!u) {
    return (
      <SellerShell {...props} header={<PageHeader title="보증금 내역 상세" />}>
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<Wallet strokeWidth={1.2} aria-hidden />}
              title="찾을 수 없는 보증금입니다"
              description="주소가 잘못되었거나 렌트 주문이 아닐 수 있습니다."
            >
              <Button variant="secondary" onClick={toList}>
                보증금 내역으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </SellerShell>
    );
  }

  const care = careOf(u);
  const insp = inspectOf(u);
  const process = depProcessOf(u);
  const toInsp = () => props.onNavSelect(inspPathOf(u));

  return (
    <SellerShell
      {...props}
      header={
        <PageHeader
          title="보증금 내역 상세"
          description={`${u.no} · 렌트 · ${u.prod} · ${u.mem} · 보증금 ${won(u.dep || 0)}${care ? " · 안심케어" : ""}`}
          badges={<DepositTag u={u} />}
        />
      }
    >
      <Section title="보증금 정보">
        <InfoList>
          <Item label="주문번호">
            <span className="body-medium-bold">{u.no}</span>
          </Item>
          <Item label="결제일시">{u.orderedAt || "-"}</Item>
          <Item label="주문 확인일">{u.confirmedAt || "-"}</Item>
          <Item label="출고 이미지">
            {u.shipImgs?.length ? (
              <Tag tone="success" size="small">
                등록 {u.shipImgs.length}장
              </Tag>
            ) : (
              <span className="text-text-sub">미등록</span>
            )}
          </Item>
          <Item label="결제수단">{payMethodOf(u) || "-"}</Item>
          <Item label="상품">{u.prod}</Item>
          <Item label="이용 기간">{u.period || "-"}</Item>
          <Item label="안심케어">
            {care ? (
              <span className="flex items-center gap-2">
                <Tag size="small">가입</Tag>
                <span className="text-text-sub">복원가능 손상 본사 부담</span>
              </span>
            ) : (
              "미가입"
            )}
          </Item>
          {(u.od ?? 0) > 0 && (
            <Item label="연체 경과">
              <span className="body-medium-bold text-text-critical">
                D+{u.od}
              </span>{" "}
              <span className="text-text-sub">(반납 예정일 {dueOf(u)})</span>
            </Item>
          )}
          <Item label="검수 판정">
            {insp ? (
              <StatusTag status={insp} />
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-text-sub">검수 전</span>
                {inspLinkable(u) && (
                  <TextButton size="small" onClick={toInsp}>
                    검수·반납 상세로
                  </TextButton>
                )}
              </span>
            )}
          </Item>
          <Item label="주문 상태">
            <StatusTag status={u.stat ?? ""} />
          </Item>
          <Item label="보증금 상태">
            <DepositTag u={u} />
          </Item>
          <Item label="상태 변경일">{u.depStatAt || "-"}</Item>
        </InfoList>
      </Section>

      <Section title="정산 계산">
        <CalcBreakdown blocks={depositCalcBlocks(u)} />
        <NoteBox>
          <p>
            <Bold text={DEPOSIT_HELP} />
          </p>
        </NoteBox>
      </Section>

      <Section title="처리 상태 (조회 전용)">
        <p className="body-medium break-keep text-text">
          {process === "holding" ? (
            <>
              {DEP_PROCESS_COPY.holding}
              {(u.od ?? 0) > 0 && DEP_PROCESS_COPY.holdingOverdue}
            </>
          ) : (
            <Bold
              text={DEP_PROCESS_COPY[process]}
              strong="body-medium-bold text-text"
            />
          )}
        </p>
        {process === "pending" && (
          <div>
            <Button variant="secondary" size="small" onClick={toInsp}>
              {DEP_PROCESS_COPY.pendingButton}
            </Button>
          </div>
        )}
      </Section>

      <Section title="구매자 정보">
        <InfoList>
          <Item label="구매자">
            {u.mem}
            {u.memId ? ` · ${u.memId}` : ""}
          </Item>
          <Item label="구매자 ID">{u.email || "-"}</Item>
          <Item label="연락처">{u.tel || "-"}</Item>
          <Item label="수령인">
            {u.receiver || u.mem}
            {u.receiverTel ? ` · ${u.receiverTel}` : ""}
          </Item>
          <Item label="배송지">{u.addr || "-"}</Item>
          <Item label="배송 메모">{u.shipMemo || "-"}</Item>
        </InfoList>
      </Section>

      {/* 하단 바 — 원본 [확인](= 목록) · [취소](= 목록) 그대로 */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={toList}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={toList}>
              취소
            </Button>
            <Button onClick={toList}>확인</Button>
          </div>
        </div>
      </Card>
    </SellerShell>
  );
}
