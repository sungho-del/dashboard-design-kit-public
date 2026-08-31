import { useState } from "react";
import { ArrowDownToLine, Check, Search, X } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  DataTableShell,
  DatePicker,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  EmptyState,
  FormField,
  Gnb,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Pagination,
  Select,
  StatGrid,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  Textarea,
  TextButton,
  useToast,
  type DateRange,
} from "../../components/ui";
import {
  CLAIM_STATUS_META,
  CLAIMS,
  DEFAULT_STATUS,
  dateOf,
  EXPORT_NAME,
  FILTERS,
  PAGE_SIZE,
  PERIOD_BASIS,
  REVIEW_COPY,
  REVIEW_GUARD,
  REVIEW_LIMIT,
  REVIEW_NOTICE,
  reviewableOf,
  SEARCH_FIELDS,
  searchHaystack,
  sumRestoreFee,
  VERDICT_META,
  won,
  ymd,
  type ClaimStatus,
} from "./CareClaimListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S14 안심케어 승인 — 뼈대 (BabyCube 본사 운영 어드민)
 * 원본 어드민: `_plan/babycube-admin/chunks/1iqb224ftrumf.js` (`/care-claims`)
 *
 * ## 화면 유형: 목록형
 * 파손·분실 건의 복원비 청구를 본사가 심사해 익월 정산 보전 여부를 결정한다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./CareClaimListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `CareClaimListPage.data.ts` **전체**           |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 심사 모달 문구         | `REVIEW_COPY` (승인/반려 각각)                 |
 * | 조회 조건 구성         | "검색조건" 카드                                |
 *
 * ## 원본 화면 구성 순서 (그대로 따른다)
 * ```
 * 안내 한 줄 (승인한 복원비만 익월 정산에 보전됩니다 …)
 * 상태 대시(건수 카드) — 원본 `chip.dash: !0` 이라 칩이 아니라 카드다
 * 검색조건 (기간 기준 · 기간 · 검색조건 · 검색어)
 * 목록 카드 [ 총 N건 · 엑셀 다운로드 / 일괄 심사 메뉴 / 표 / 페이저 ]
 * ```
 *
 * ## ⭐ 이 화면만의 두 가지 (원본 그대로다)
 * 1. **첫 화면이 `전체` 가 아니라 `청구 접수`** (`defaultStat`). 일감을 보러 오는 화면이라
 *    열자마자 심사 대기 건이 떠야 한다. `초기화` 도 거기로 돌아간다
 * 2. **조건부 열** — 승인일은 상태가 `승인` 일 때만, 반려일은 `반려` 일 때만 붙는다.
 *    전체를 보는 동안 빈 칸 두 줄이 서 있는 것보다 낫다
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * - **`안심케어 심사` 도움말 툴팁** — 지어낸 문장이었다. 상태 설명은 원본
 *   `statusTips` 를 대시 카드 아래 상시 노출로 살렸다
 * - **선택 바(SelectionBar) + 툴바의 `심사` 버튼** — 같은 두 액션으로 가는 길이 둘이었다.
 *   원본은 목록 헤더 우측의 **메뉴 하나**뿐이라 그리로 모았다
 * - **심사 불가 행의 체크박스 잠금** — 원본은 아무 행이나 고르게 두고 **제출할 때**
 *   `청구 접수` 인 것만 골라 심사한다. 그래서 검증 문구 두 개가 살아 있다
 *   (`선택된 항목이 없습니다.` · `청구 접수 상태인 건만 심사할 수 있습니다.`)
 *
 * ## 그대로 두는 것 (도메인 무관 · §7-1 실측 규격)
 * `DataTableShell` 셸 구조 · 페이지 범위 클램프 · `inPeriod` 날짜 필터 ·
 * Modal 확인 흐름 · 조건이 바뀌면 선택 해제
 *
 * ## 표 정렬 — 전 화면 공통 규칙
 * **좌측 기본, 자릿수를 비교하는 수치(여기서는 복원비)만 우측.**
 * 화면마다 정렬이 갈리면 목록을 옮겨 다닐 때 눈이 흔들린다.
 * `TableTh` 와 `TableTd` 를 **함께** 맞춘다.
 * ====================================================================== */

/**
 * 기준 날짜가 선택한 기간 안에 드는지.
 *
 * ⚠️ 이 화면은 기준축이 셋(청구일·승인일·반려일)이라 값이 `null` 일 수 있다.
 * **`null` 은 "그 축에서 아직 일어나지 않은 일"이라 기간을 걸면 걸러낸다** —
 * 승인일로 기간을 좁혔는데 미승인 건이 남아 있으면 목록이 거짓말을 한다.
 * 기간을 걸지 않았을 때만 통과시킨다.
 */
const inPeriod = (dateText: string | null, range?: DateRange) => {
  if (!range?.from) return true;
  if (dateText === null) return false;

  const at = new Date(dateText.replace(" ", "T"));
  if (Number.isNaN(at.getTime())) return true;

  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);

  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);

  return at >= from && at <= to;
};

/** 열려 있는 심사 모달의 종류. `null` 이면 닫힌 상태다 */
type ReviewMode = "approve" | "reject" | null;

export interface CareClaimListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function CareClaimListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: CareClaimListPageProps) {
  const { toast } = useToast();

  /* 첫 화면은 전체가 아니라 청구 접수다 — 원본 `defaultStat` */
  const [filter, setFilter] = useState(DEFAULT_STATUS);
  const [basis, setBasis] = useState("claimed");
  const [searchField, setSearchField] = useState("no");
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<ReviewMode>(null);
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);

  /*
   * ── 상태는 **두 번에 나눠** 적용한다 ──────────────────────────────────
   * 대시 카드의 건수를 전체 데이터에서 세면 검색어를 넣어도 숫자가 안 변해
   * **표와 모순된 숫자**가 화면에 남는다. 상태를 뺀 나머지 조건까지 적용한
   * `matched` 에서 세고, 상태는 그 뒤에 건다. `전체 = 접수 + 승인 + 반려` 도 자동으로 맞는다.
   */
  const matched = CLAIMS.filter((row) => {
    const matchKeyword =
      keyword.trim() === "" ||
      searchHaystack(row, searchField).includes(keyword.trim());
    return matchKeyword && inPeriod(dateOf(row, basis), period);
  });

  const statusCounts: Record<string, number> = {
    all: matched.length,
    received: matched.filter((row) => row.status === "received").length,
    approved: matched.filter((row) => row.status === "approved").length,
    rejected: matched.filter((row) => row.status === "rejected").length,
  };

  const filtered = matched.filter(
    (row) => filter === "all" || row.status === filter,
  );

  /*
   * 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다. 그대로 두면
   * **빈 표**가 그려지므로 마지막 페이지로 당긴다.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /** 조건부 열 — 원본이 상태에 따라 컬럼 배열에 밀어 넣는 두 열 */
  const showApprovedAt = filter === "approved";
  const showRejectedAt = filter === "rejected";

  const allPageSelected =
    paged.length > 0 && paged.every((row) => selected.includes(row.id));
  const somePageSelected =
    !allPageSelected && paged.some((row) => selected.includes(row.id));

  /*
   * 조건이 바뀌면 선택을 푼다. 화면에서 사라진 행이 선택된 채 남아 있으면
   * 모달의 복원비 합계가 **보이지 않는 건까지 더한 값**이 된다.
   */
  const changeCondition = (apply: () => void) => {
    apply();
    setSelected([]);
    setPage(1);
  };

  /* 초기화는 전체가 아니라 **기본 상태(청구 접수)** 로 돌아간다 — 원본과 같다 */
  const resetFilters = () =>
    changeCondition(() => {
      setFilter(DEFAULT_STATUS);
      setBasis("claimed");
      setSearchField("no");
      setKeyword("");
      setPeriod(undefined);
    });

  const toggleRow = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const togglePage = () => {
    const ids = paged.map((row) => row.id);
    setSelected((current) =>
      allPageSelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])],
    );
  };

  /** 모달에 들어가는 것은 고른 것 전부가 아니라 **심사할 수 있는 것**뿐이다 */
  const reviewTargets = reviewableOf(selected);

  /**
   * 일괄 심사 진입 — 원본과 같은 순서로 막는다.
   * 하나도 못 고르게 잠그는 대신 여기서 이유를 말한다.
   */
  const startReview = (next: "approve" | "reject") => {
    if (selected.length === 0) {
      toast(REVIEW_GUARD.empty);
      return;
    }
    if (reviewTargets.length === 0) {
      toast(REVIEW_GUARD.notReviewable);
      return;
    }
    if (reviewTargets.length > REVIEW_LIMIT) {
      toast(REVIEW_GUARD.limit);
      return;
    }
    setMode(next);
  };

  const closeReview = () => {
    setMode(null);
    setReason("");
    setReasonTouched(false);
  };

  const submitApprove = () => {
    toast(REVIEW_COPY.approve.toast(reviewTargets.length));
    setSelected([]);
    closeReview();
  };

  const submitReject = () => {
    /*
     * 사유가 그대로 입점사에게 보이므로 빈 값으로는 넘기지 않는다.
     * 원본은 이때 토스트를 띄우지만 여기서는 **필드 옆에서** 말한다 —
     * 고쳐야 할 자리가 곧 메시지가 뜨는 자리다. 둘 다 띄우면 같은 문장이 화면에 둘이 된다.
     */
    if (reason.trim() === "") {
      setReasonTouched(true);
      return;
    }
    toast({
      message: REVIEW_COPY.reject.toast(reviewTargets.length),
      tone: "critical",
    });
    setSelected([]);
    closeReview();
  };

  const reasonError =
    reasonTouched && reason.trim() === ""
      ? REVIEW_COPY.reject.error
      : undefined;

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
      header={<PageHeader title="안심케어 승인" />}
    >
      {/* 심사 안내 — 원본 목록 맨 위의 muted 한 줄 그대로다 */}
      <p className="body-medium text-text-sub">{REVIEW_NOTICE}</p>

      {/* 상태 대시 — 원본 `chip.dash: !0`. 건수 카드가 곧 상태 필터다 */}
      <Card>
        <CardHeader title="상태" />
        <CardBody>
          {/*
            건수 대시 = 필터. 상자의 시각 규격 · 선택/hover 축 분리 · 접근가능 이름
            조립은 전부 `StatGrid` 가 맡는다 (docs/DESIGN-dashboard.md §D4).
          */}
          <StatGrid
            items={FILTERS.map((item) => ({
              value: item.value,
              label: item.label,
              /* 원본은 콤마를 넣지 않는다 — `num()` 을 쓰면 접근가능 이름이 달라진다 */
              count: String(statusCounts[item.value] ?? 0),
              unit: "건",
            }))}
            selected={filter}
            onSelect={(value) => changeCondition(() => setFilter(value))}
            ariaLabel="상태"
            columns={4}
          />
          {/*
            상태 설명 — 원본 `statusTips` 문구다. 원본은 카드의 `i` 툴팁으로 띄우지만
            마우스를 올려야 보이는 것보다 상시 노출이 낫다.
          */}
          {filter === "all" ? null : (
            <p className="body-small text-text-sub">
              {CLAIM_STATUS_META[filter as ClaimStatus].description}
            </p>
          )}
        </CardBody>
      </Card>

      {/* 검색조건 — 원본 필터바 그대로 기간 기준 · 기간 · 검색 조건 · 검색어 */}
      <Card>
        <CardHeader
          title="검색조건"
          action={
            <TextButton tone="secondary" onClick={resetFilters}>
              초기화
            </TextButton>
          }
        />
        <CardBody>
          {/* §29-4 균등 분할 — 래퍼 flex + 각 항목 flex-1 min-w-0 (2열 grid 금지) */}
          <div className="flex flex-wrap items-start gap-2">
            {/* 기간 기준이 셋이라 어느 날짜로 좁히는지 먼저 고른다 */}
            <FormField label="기간 기준" className="min-w-0">
              <Select
                options={PERIOD_BASIS}
                value={basis}
                onValueChange={(value) =>
                  changeCondition(() => setBasis(value))
                }
              />
            </FormField>
            <FormField label="기간" className="flex-1 min-w-0">
              <DatePicker
                mode="range"
                value={period}
                onChange={(next) => changeCondition(() => setPeriod(next))}
                startPlaceholder="시작일"
                endPlaceholder="종료일"
              />
            </FormField>
            <FormField label="검색조건" className="min-w-0">
              <Select
                options={SEARCH_FIELDS}
                value={searchField}
                onValueChange={(value) =>
                  changeCondition(() => setSearchField(value))
                }
              />
            </FormField>
            <FormField label="검색어" className="flex-1 min-w-0">
              <Input
                placeholder="검색어 입력"
                value={keyword}
                onChange={(event) => {
                  const next = event.target.value;
                  changeCondition(() => setKeyword(next));
                }}
                leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
              />
            </FormField>
          </div>
        </CardBody>
      </Card>

      {/* 목록 — 원본 `ListHead` 의 좌우 슬롯: 총 N건 · 엑셀 다운로드 / 일괄 심사 */}
      <DataTableShell
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        toolbarEnd={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                toast(
                  `${EXPORT_NAME}_${filtered.length}건.csv 를 내려받았습니다`,
                )
              }
            >
              <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
              엑셀 다운로드
            </Button>
            {/*
              원본 `toolsRight` 는 `심사 / 승인 처리 / 반려 처리` 셀렉트다.
              값을 고르는 컨트롤이 아니라 **동작을 고르는 메뉴**라 `Dropdown` 으로 옮겼다.
            */}
            <Dropdown size="compact">
              <DropdownTrigger>
                <Button variant="secondary">일괄 심사</Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="안심케어 일괄 심사">
                <DropdownItem
                  leftIcon={<Check size={16} strokeWidth={1.2} aria-hidden />}
                  onClick={() => startReview("approve")}
                >
                  승인 처리
                </DropdownItem>
                <DropdownItem
                  tone="critical"
                  leftIcon={<X size={16} strokeWidth={1.2} aria-hidden />}
                  onClick={() => startReview("reject")}
                >
                  반려 처리
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </>
        }
        isEmpty={filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title="해당 조건의 항목이 없습니다"
            description="조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요."
          >
            <Button variant="secondary" onClick={resetFilters}>
              필터 초기화
            </Button>
          </EmptyState>
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            start={
              <span className="body-small text-text-sub">
                {currentPage} / {totalPages} 페이지
              </span>
            }
          />
        }
      >
        <Table>
          {/*
            `table-fixed` 라 폭 지정이 필수다. %가 아니라 px 로 준다 —
            합계가 곧 표 폭이 되고, 그만큼 셸의 표 래퍼가 가로로 스크롤한다.
            ⚠️ 조건부 열이 있어 `<col>` 개수도 함께 늘고 준다 — 헤더·본문과 셋이 짝이다.
          */}
          {/*
            폭은 **원본 어드민의 컬럼 정의(`minWidth`)** 를 옮긴 값이다(§DESIGN.md §7-2) —
            주문번호 140 · 셀러 120 · 상품 200 · 검수 판정 120 · 복원비 100 ·
            청구일 110 · 승인/반려일 110 · 상태 110 을 4px 격자로 올렸다.
            선택 열은 원본 정의에 없어 실측(40)을 쓴다.

            승인일·반려일이 **상호배타**라 조건부 `<col>` 을 한 묶음 안에 둔다 —
            묶음을 두 벌로 나누면 나머지 폭을 두 곳에서 관리하게 되어 어긋나기 쉽다.
          */}
          <colgroup>
            <col className="w-10" />
            <col className="w-35" />
            <col className="w-30" />
            <col className="w-50" />
            <col className="w-30" />
            <col className="w-25" />
            <col className="w-28" />
            {showApprovedAt ? <col className="w-28" /> : null}
            {showRejectedAt ? <col className="w-28" /> : null}
            <col className="w-28" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>
                {/*
                  Checkbox 는 루트가 이미 `<label>` 이라 `FormField` 로 감싸지 않는다
                  (§3-4 규칙 6). 표 안에서는 보이는 라벨을 둘 자리가 없으므로
                  `label` 대신 `aria-label` 로 이름만 붙인다.
                */}
                <Checkbox
                  size="small"
                  aria-label="이 페이지 전체 선택"
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={togglePage}
                />
              </TableTh>
              <TableTh>주문번호</TableTh>
              <TableTh>셀러</TableTh>
              <TableTh>상품</TableTh>
              <TableTh align="center">검수 판정</TableTh>
              <TableTh>복원비</TableTh>
              <TableTh>청구일</TableTh>
              {showApprovedAt ? <TableTh>승인일</TableTh> : null}
              {showRejectedAt ? <TableTh>반려일</TableTh> : null}
              <TableTh align="center">상태</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((row) => {
              const status = CLAIM_STATUS_META[row.status];
              const verdict = VERDICT_META[row.verdict];
              return (
                <TableRow key={row.id}>
                  <TableTd>
                    {/*
                      원본은 심사할 수 없는 행도 고를 수 있게 둔다 — 막는 것은 제출할 때다.
                      잠가 버리면 "왜 이 건은 심사가 안 되나"를 말할 자리가 사라진다.
                    */}
                    <Checkbox
                      size="small"
                      aria-label={row.id + " 선택"}
                      checked={selected.includes(row.id)}
                      onChange={() => toggleRow(row.id)}
                    />
                  </TableTd>
                  <TableTd>{row.id}</TableTd>
                  <TableTd>{row.seller}</TableTd>
                  <TableTd ellipsis>{row.product}</TableTd>
                  <TableTd align="center">
                    <Tag tone={verdict.tone} size="small">
                      {verdict.label}
                    </Tag>
                  </TableTd>
                  <TableTd>{won(row.restoreFee)}</TableTd>
                  {/* 원본 `ymd` — 날짜만 낸다 */}
                  <TableTd>{ymd(row.date)}</TableTd>
                  {showApprovedAt ? (
                    <TableTd>{ymd(row.approvedAt)}</TableTd>
                  ) : null}
                  {showRejectedAt ? (
                    <TableTd>{ymd(row.rejectedAt)}</TableTd>
                  ) : null}
                  <TableTd align="center">
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* 안심케어 승인 — 건수·합계는 **고른 것이 아니라 심사 대상**의 것이다 */}
      <Modal open={mode === "approve"} onClose={closeReview} size="small">
        <ModalHeader
          /* 푸터에도 "취소"가 있어 헤더 X 의 기본 라벨과 겹친다 — 이름을 갈라 준다 */
          closeLabel="대화상자 닫기"
          title={REVIEW_COPY.approve.title(reviewTargets.length)}
        />
        <ModalBody>
          {/* 합계는 데이터가 계산한다 — 뼈대에서 더하면 표와 어긋난다 */}
          <p className="body-medium text-text-sub">
            {REVIEW_COPY.approve.body(won(sumRestoreFee(reviewTargets)))}
          </p>
          <p className="body-medium-bold text-text-critical">
            {REVIEW_COPY.approve.warning}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="large" onClick={closeReview}>
            취소
          </Button>
          <Button size="large" onClick={submitApprove}>
            {REVIEW_COPY.approve.confirm}
          </Button>
        </ModalFooter>
      </Modal>

      {/* 안심케어 반려 사유 입력 */}
      <Modal open={mode === "reject"} onClose={closeReview} size="small">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={REVIEW_COPY.reject.title(reviewTargets.length)}
        />
        <ModalBody>
          {/* Textarea 는 FormField 의 대상이다 (Input·Textarea·Select 전용) */}
          <FormField
            label={REVIEW_COPY.reject.label}
            required
            error={reasonError}
          >
            <Textarea
              value={reason}
              minRows={3}
              placeholder={REVIEW_COPY.reject.placeholder}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setReasonTouched(true)}
            />
          </FormField>
          <p className="body-small text-text-sub">{REVIEW_COPY.reject.body}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="large" onClick={closeReview}>
            취소
          </Button>
          <Button variant="critical" size="large" onClick={submitReject}>
            {REVIEW_COPY.reject.confirm}
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
