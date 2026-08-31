import { useState } from "react";
import { ArrowDownToLine, Check, Search, X } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  Checkbox,
  DataTableShell,
  DatePicker,
  EmptyState,
  FormField,
  Gnb,
  InfoItem,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Pagination,
  SegmentedControl,
  Select,
  SelectionBar,
  SelectionBarButton,
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
  APPLICATIONS,
  count,
  DATE_FIELDS,
  dealKinds,
  FILTERS,
  HYGIENE_OPTIONS,
  KIND_META,
  PAGE_SIZE,
  parseRate,
  PROCESSED_AT,
  REVIEWABLE_STATUS,
  REVIEW_COPY,
  SEARCH_FIELDS,
  STATUS_META,
  ymd,
  ymdhms,
  type Application,
  type ApplicationStatus,
} from "./SellerReviewPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S04 입점 심사 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 목록형 (+ 행 선택 · 일괄 심사)
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 — 임의로 더하지 말 것
 *
 * ```
 * 상태 대시 (전체·승인요청·승인·반려 건수, 누르면 필터)      ← 원본 StatDash
 * 검색조건 바 (기간 기준+기간 · 검색조건+검색어)             ← 원본 filter/search
 * [ 총 N건 · 엑셀 다운로드 | 표(선택 체크박스) | 페이지네이션 ]
 * 선택 일괄 심사 (승인 처리 / 반려 처리)                     ← 원본 toolsRight 의 "심사" 셀렉트
 * ```
 *
 * ## 원본에 없어서 걷어낸 것들 (되살리지 말 것)
 *
 * - **증감 요약 카드 3장**(승인요청 대기/이번 달 승인/반려율 + ±% + 비교 기준).
 *   원본 상단 카드는 상태별 **건수**뿐이다
 * - **미리보기 모달의 단건 심사 버튼**(승인 처리·반려 처리). 원본 목록의 심사 경로는
 *   **선택 → 일괄 처리** 하나뿐이고, 단건은 상세 화면의 일이다 —
 *   원본 상태 안내도 "심사는 상세에서 서류를 보고 처리합니다"라고 말한다
 * - **상태 세그먼트**. 원본은 `chip.dash: true` 라 상태 축을 **건수 카드로만** 그린다
 * - **PageHeader 도움말 툴팁**. 상태 설명은 원본대로 **대시 카드의 툴팁**으로 내려갔다
 *
 * ## 원본에서 되살린 것 (이전에 빠져 있던 것)
 * - **연락처 열** — 원본 컬럼 배열에 있는데 우리 표에 없었다(검색은 되는데 확인할 곳이 없었다)
 * - **승인일·반려일의 조건부 노출** — 원본은 그 상태로 좁혔을 때만 열을 밀어 넣는다.
 *   늘 세워 두면 대부분의 행이 `-` 인 열이 둘이나 생긴다
 * - **유형 `전체` 를 두 배지로 펴기** — 렌트·판매를 함께 하겠다는 신청이다
 * - **기간 기준 셀렉트**(신청일/승인일/반려일)
 * - **승인 게이트** — 원본 승인 모달은 단순 확인이 아니라 **셀러별 수수료율·위생인증을
 *   확정하는 입력 화면**이다. 이전 구현은 확인 문구만 있었다
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./SellerReviewPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `SellerReviewPage.data.ts` **전체**            |
 * | 심사 안내 문구         | 같은 파일의 `REVIEW_COPY`                      |
 * | 심사 가능 상태         | 같은 파일의 `REVIEWABLE_STATUS`                |
 * | 수수료율 검증 규칙     | 같은 파일의 `parseRate`                        |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 필터 구성              | `toolbarEnd` 슬롯                              |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · 조건부 열에 따라 갈리는 `colgroup` 3벌 ·
 * 페이지 범위 클램프 · `inPeriod` 날짜 필터 · 선택 → 일괄 작업 바 → 확인 모달 흐름 ·
 * 부분 선택(indeterminate) 처리 · 처리 후 선택 해제 ·
 * **흰 카드 = 그룹 / 연한 그레이 상자 = 항목** 두 층 · 상자 안 **라벨 좌상단 · 수치 우하단** ·
 * **분류 배지에 상태색을 쓰지 않는** 규칙
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 1. **일괄 심사를 `SelectionBar`(§25)로 낸다** — 원본은 툴바 우측의 `심사` 셀렉트
 *    (`승인 처리`/`반려 처리`)다. 액션 이름은 그대로 두고 자리만 옮겼다.
 *    셀렉트를 액션 메뉴로 쓰는 것은 우리 시스템에 없는 패턴이고, 선택이 있어야만
 *    의미가 있는 버튼이라 §25 가 정확히 이 자리를 위한 것이다.
 *    그래서 원본의 "선택된 항목이 없습니다." 는 **필요가 없어졌다** — 선택이 없으면 바가 없다
 * 2. **처음 열릴 때 `전체`** — 원본은 `defaultStat: "승인요청"` 이다.
 *    대시가 이미 상태별 건수를 다 보여주므로 숨길 이유가 없다
 * 3. **셀러명이 미리보기 모달을 연다** — 원본은 `/seller-review/{id}` 상세로 나가지만
 *    그 화면은 기획서 `gaps` 라 이 배치에 없다
 * ====================================================================== */

/**
 * 기준 날짜가 선택한 기간 안에 드는지.
 *
 * `"YYYY-MM-DD HH:mm"` 형식인데 공백 구분자는 브라우저별 파싱이 갈린다.
 * `T` 로 바꿔 ISO 형태로 만든 뒤 넘긴다. 시작일은 00:00, 종료일은 23:59:59 까지 포함한다.
 *
 * ⚠️ 값이 **없는** 행(아직 승인되지 않은 건의 승인일)은 기간을 걸면 **빠진다.**
 * "승인일 8월"로 물었는데 아직 승인되지 않은 건이 함께 나오면 질문에 대한 답이 아니다.
 */
const inPeriod = (dateText: string | null, range?: DateRange) => {
  if (!range?.from) return true;
  if (!dateText) return false;

  const at = new Date(dateText.replace(" ", "T"));
  if (Number.isNaN(at.getTime())) return true;

  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);

  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);

  return at >= from && at <= to;
};

/** 심사 결과 — 처리한 건에만 덮어씌운다 */
interface ReviewResult {
  status: ApplicationStatus;
  approvedAt: string | null;
  rejectedAt: string | null;
  commissionRate?: number;
  hygieneCertified?: boolean;
}

/** 승인 게이트에서 운영자가 확정해 나가는 값. 입력 중이라 수수료율은 문자열이다 */
interface GateDraft {
  rate: string;
  hygiene: string;
}

export interface SellerReviewPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function SellerReviewPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerReviewPageProps) {
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [dateField, setDateField] = useState(DATE_FIELDS[0].value);
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<Application | null>(null);

  /* 심사 모달 — 어떤 처리인지와 대상이 무엇인지를 함께 들고 있는다 */
  const [reviewMode, setReviewMode] = useState<"approve" | "reject" | null>(
    null,
  );
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, GateDraft>>({});
  const [rateError, setRateError] = useState(false);
  const [reason, setReason] = useState("");

  /*
   * 처리 결과. 실서비스라면 목록을 다시 불러오지만, 여기서는 처리한 건만 덮어써
   * **승인이 화면에서도 되돌아가지 않는다**는 사실을 그대로 보여준다.
   */
  const [results, setResults] = useState<Record<string, ReviewResult>>({});

  const rows: Application[] = APPLICATIONS.map((item) => {
    const result = results[item.id];
    return result ? { ...item, ...result } : item;
  });

  /* 검색 조건이 "어느 값을 훑을지"를 정한다 — 뼈대는 필드 이름을 모른다 */
  const pick =
    SEARCH_FIELDS.find((field) => field.value === searchField)?.pick ??
    SEARCH_FIELDS[0].pick;

  /* 기간 기준도 같은 방식이다 — 뼈대는 "신청일"이라는 말을 모른다 */
  const dateAxis =
    DATE_FIELDS.find((field) => field.value === dateField) ?? DATE_FIELDS[0];

  /*
   * 상태를 **뺀** 나머지 조건으로 좁힌 집합. 상태별 건수를 여기서 센다.
   * 이미 상태로 좁힌 결과에서 세면 하나를 고르는 순간 나머지가 전부 0 이 된다.
   */
  const scoped = rows.filter((item) => {
    const matchKeyword =
      keyword.trim() === "" || pick(item).includes(keyword.trim());
    return matchKeyword && inPeriod(dateAxis.pick(item), period);
  });

  const filtered = scoped.filter(
    (item) => filter === "all" || item.status === filter,
  );

  /* 원본 상태 대시(`StatDash`) — 건수를 보여주면서 그 자체가 상태 필터다 */
  const dash = FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count:
      item.value === "all"
        ? scoped.length
        : scoped.filter((row) => row.status === item.value).length,
    /* 원본은 상태 카드에 `tip`(statusTips)을 달아 뜻을 설명한다. 전체에는 없다 */
    tip:
      item.value === "all"
        ? undefined
        : STATUS_META[item.value as ApplicationStatus].description,
  }));

  const selectStatus = (value: string) => {
    setFilter(value);
    setPage(1);
  };

  /*
   * 승인일·반려일은 **그 상태로 좁혔을 때만** 열이 붙는다(원본과 같다).
   * 늘 세워 두면 대부분의 행이 `-` 인 열이 둘이나 생긴다.
   */
  const showApprovedAt = filter === "approved";
  const showRejectedAt = filter === "rejected";

  /* 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다 — 마지막 페이지로 당긴다 */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /* 심사할 수 있는 것은 승인요청 건뿐이다 — 선택 가능 여부가 여기서 갈린다 */
  const reviewable = paged.filter((item) => item.status === REVIEWABLE_STATUS);
  const selectedOnPage = reviewable.filter((item) =>
    selected.includes(item.id),
  );
  const allSelected =
    reviewable.length > 0 && selectedOnPage.length === reviewable.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;

  const toggleAll = () => {
    const ids = reviewable.map((item) => item.id);
    setSelected((current) =>
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])],
    );
  };

  const toggleOne = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  /* 초기화는 **한 곳에서만 정의한다** — 선택까지 함께 비운다 */
  const resetFilters = () => {
    setFilter("all");
    setDateField(DATE_FIELDS[0].value);
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPeriod(undefined);
    setPage(1);
    setSelected([]);
  };

  /** 대상 행들 — 모달이 이름·초깃값을 여기서 읽는다 */
  const pending = rows.filter((item) => pendingIds.includes(item.id));

  const openReview = (mode: "approve" | "reject", ids: string[]) => {
    setPendingIds(ids);
    setReason("");
    setRateError(false);
    /*
      승인 게이트의 초깃값은 **신청자가 적어 낸 값**이다(원본 `initial: W`).
      제안하지 않았으면(`0`) 빈 칸으로 열어 입력을 요구한다 — 0% 를 채워 두면
      "0% 로 합의됐다"로 읽힌다.
    */
    setDrafts(
      Object.fromEntries(
        rows
          .filter((item) => ids.includes(item.id))
          .map((item) => [
            item.id,
            {
              rate: item.commissionRate > 0 ? String(item.commissionRate) : "",
              hygiene: item.hygieneCertified ? "certified" : "none",
            },
          ]),
      ),
    );
    setReviewMode(mode);
    setPreview(null);
  };

  const closeReview = () => {
    setReviewMode(null);
    setPendingIds([]);
    setDrafts({});
    setRateError(false);
    setReason("");
  };

  /**
   * 승인 확정 — 원본과 같이 **전부 통과해야 전부 처리된다.**
   * 하나라도 범위를 벗어나면 아무것도 처리하지 않고 오류만 낸다
   * ("요청 전체가 함께 승인되거나 함께 취소됩니다").
   */
  const applyApprove = () => {
    const next: Record<string, ReviewResult> = {};
    for (const item of pending) {
      const rate = parseRate(drafts[item.id]?.rate ?? "");
      if (rate === null) {
        setRateError(true);
        return;
      }
      next[item.id] = {
        status: "approved",
        approvedAt: PROCESSED_AT,
        rejectedAt: null,
        commissionRate: rate,
        hygieneCertified: drafts[item.id]?.hygiene === "certified",
      };
    }

    setResults((current) => ({ ...current, ...next }));
    setSelected((current) => current.filter((id) => !pendingIds.includes(id)));
    toast(`${count(pendingIds.length)} 승인 처리되었습니다.`);
    closeReview();
  };

  const applyReject = () => {
    const next: Record<string, ReviewResult> = {};
    for (const id of pendingIds) {
      next[id] = {
        status: "rejected",
        approvedAt: null,
        rejectedAt: PROCESSED_AT,
      };
    }

    setResults((current) => ({ ...current, ...next }));
    setSelected((current) => current.filter((id) => !pendingIds.includes(id)));
    toast({
      message: `${count(pendingIds.length)} 반려 처리되었습니다.`,
      tone: "critical",
    });
    closeReview();
  };

  const previewStatus = preview ? STATUS_META[preview.status] : null;
  /* 원본 모달 제목은 여러 건일 때만 건수를 붙인다 */
  const countSuffix =
    pendingIds.length > 1 ? ` (${count(pendingIds.length)})` : "";

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
      header={<PageHeader title="입점 심사" />}
    >
      {/*
        상태 대시 — 원본 `StatDash`. 건수를 보여주면서 그 자체가 상태 필터다.
        흰 카드(그룹) 안에 연한 그레이 상자(항목) 넷이 들어간다.
      */}
      <Card>
        <CardBody>
          {/*
            건수 대시 = 필터. 상자의 시각 규격 · 선택/hover 축 분리 · 접근가능 이름
            조립 · 툴팁 분기는 전부 `StatGrid` 가 맡는다 (docs/DESIGN-dashboard.md §D4).
            여기서는 **무엇을 세는지**만 말한다.
          */}
          <StatGrid
            items={dash.map((item) => ({
              value: item.value,
              label: item.label,
              count: item.count.toLocaleString("ko-KR"),
              unit: "건",
              tip: item.tip,
            }))}
            selected={filter}
            onSelect={selectStatus}
            ariaLabel="심사 상태"
            columns={4}
          />
        </CardBody>
      </Card>

      {/* 심사 목록 — DataTableShell 이 §7-1 셸 구조를 책임진다 */}
      <DataTableShell
        toolbarStart={
          /* 원본 `toolsLeft` 는 엑셀 다운로드 하나다 (`입점심사_N건.csv`) */
          <Button
            variant="secondary"
            onClick={() =>
              toast(`조회 결과 ${filtered.length}건을 내려받았습니다`)
            }
          >
            <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
            엑셀 다운로드
          </Button>
        }
        toolbarEnd={
          <>
            {/* 기간 기준은 **신청일 / 승인일 / 반려일 세 축**이다(원본 `date.fields`) */}
            <Select
              aria-label="기간 기준"
              options={DATE_FIELDS}
              value={dateField}
              onValueChange={(value) => {
                setDateField(value);
                setPage(1);
              }}
            />
            <DatePicker
              mode="range"
              value={period}
              onChange={(next) => {
                setPeriod(next);
                setPage(1);
              }}
              startPlaceholder={`${dateAxis.label} 시작`}
              endPlaceholder={`${dateAxis.label} 종료`}
            />
            <Select
              aria-label="검색 조건"
              options={SEARCH_FIELDS}
              value={searchField}
              onValueChange={(value) => {
                setSearchField(value);
                setPage(1);
              }}
            />
            <Input
              placeholder="검색어 입력"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
            />
            <TextButton tone="secondary" onClick={resetFilters}>
              초기화
            </TextButton>
          </>
        }
        isEmpty={filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title="해당 조건의 신청이 없습니다"
            description="조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요."
          >
            <Button variant="secondary" onClick={resetFilters}>
              필터를 초기화
            </Button>
          </EmptyState>
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            start={
              /* 원본 `ListHead` 의 "목록 (총 N건)" 과 같은 정보다 */
              <span className="body-small text-text-sub">
                총 {filtered.length}건
              </span>
            }
          />
        }
      >
        <Table>
          {/*
            table-fixed 라 폭 지정 필수. 한 컬럼만 auto 로 두면 여백을 독식한다.
            승인일·반려일은 **상호배타**(`filter` 가 하나만 될 수 있다)라 `<col>` 묶음은
            9열·8열 **두 벌**이다.

            폭은 **원본 어드민의 컬럼 정의(`minWidth`)** 를 옮긴 값이다(§DESIGN.md §7-2) —
            셀러명 140 · 대표명 90 · 연락처 130 · 유형 110 · 사업자 80 · 신청일 160 ·
            승인/반려일 110 · 상태 100 을 4px 격자로 올렸다. 선택 열은 원본 정의에 없어
            실측(40)을 쓴다.

            ⚠️ 신청일만 넓은 것은 **이 화면에서 유일하게 시각까지 찍기 때문**이다
            (원본 `ymdhms`). 다른 화면의 날짜 열은 전부 112 다.
          */}
          {showApprovedAt || showRejectedAt ? (
            /* 9열 — 선택·셀러명·대표명·연락처·유형·사업자·신청일·[승인일|반려일]·상태 */
            <colgroup>
              <col className="w-10" />
              <col className="w-35" />
              <col className="w-23" />
              <col className="w-33" />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-40" />
              <col className="w-28" />
              <col className="w-25" />
            </colgroup>
          ) : (
            /* 8열 — 조건부 열이 빠진 기본 구성 */
            <colgroup>
              <col className="w-10" />
              <col className="w-35" />
              <col className="w-23" />
              <col className="w-33" />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-40" />
              <col className="w-25" />
            </colgroup>
          )}
          <TableHead>
            <TableRow>
              <TableTh>
                {/*
                  전체 선택은 **현재 페이지의 심사 가능한 행**만 고른다.
                  처리 완료 건까지 함께 골라 주면 곧바로 "선택했는데 처리할 수 없다"가 된다.
                  `Checkbox` 는 루트가 이미 `<label>` 이라 `FormField` 로 감싸지 않는다.
                */}
                <Checkbox
                  size="small"
                  aria-label="전체 선택"
                  checked={allSelected}
                  indeterminate={someSelected}
                  disabled={reviewable.length === 0}
                  onChange={toggleAll}
                />
              </TableTh>
              <TableTh>셀러명</TableTh>
              <TableTh>대표명</TableTh>
              <TableTh>연락처</TableTh>
              <TableTh align="center">유형</TableTh>
              <TableTh>사업자</TableTh>
              <TableTh>신청일</TableTh>
              {showApprovedAt ? <TableTh>승인일</TableTh> : null}
              {showRejectedAt ? <TableTh>반려일</TableTh> : null}
              <TableTh align="center">상태</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((item) => {
              const status = STATUS_META[item.status];
              const selectable = item.status === REVIEWABLE_STATUS;
              return (
                <TableRow key={item.id}>
                  <TableTd>
                    <Checkbox
                      size="small"
                      aria-label={`${item.name} 선택`}
                      checked={selected.includes(item.id)}
                      disabled={!selectable}
                      onChange={() => toggleOne(item.id)}
                    />
                  </TableTd>
                  {/*
                    원본에서 셀러명은 `/seller-review/{id}` 로 가는 링크다.
                    행 전체를 누르게 만들지 않는다 — 원본에 없는 어포던스다.
                  */}
                  <TableTd>
                    <TextButton
                      className="max-w-full"
                      onClick={() => setPreview(item)}
                    >
                      <span className="truncate">{item.name}</span>
                    </TextButton>
                  </TableTd>
                  <TableTd>{item.ceo}</TableTd>
                  <TableTd>{item.phone}</TableTd>
                  <TableTd align="center">
                    {/*
                      유형은 분류다 — 상태색을 쓰지 않는다.
                      `전체` 신청은 렌트·판매 **두 배지**로 편다(원본과 같다).
                    */}
                    <span className="flex flex-wrap items-center justify-center gap-1">
                      {dealKinds(item.kind).map((kind) => (
                        <Tag key={kind} tone={KIND_META[kind].tone}>
                          {KIND_META[kind].label}
                        </Tag>
                      ))}
                    </span>
                  </TableTd>
                  <TableTd>{item.business}</TableTd>
                  {/* 신청일만 시각까지 낸다 — 같은 날 접수 순서가 곧 심사 순서다 */}
                  <TableTd>{ymdhms(item.date)}</TableTd>
                  {showApprovedAt ? (
                    <TableTd>{ymd(item.approvedAt)}</TableTd>
                  ) : null}
                  {showRejectedAt ? (
                    <TableTd>{ymd(item.rejectedAt)}</TableTd>
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

      {/*
        선택 일괄 심사 (§25) — 선택이 있을 때만 떠오른다.
        원본은 툴바 우측의 `심사` 셀렉트(승인 처리 / 반려 처리)였고, 액션 이름은 그대로다.
      */}
      <SelectionBar
        open={selected.length > 0}
        count={selected.length}
        countLabel={(value) => `${count(value)} 선택됨`}
        label="선택한 신청 일괄 심사"
        onClear={() => setSelected([])}
      >
        <SelectionBarButton
          icon={<Check size={16} strokeWidth={1.2} aria-hidden />}
          onClick={() => openReview("approve", selected)}
        >
          승인 처리
        </SelectionBarButton>
        <SelectionBarButton
          icon={<X size={16} strokeWidth={1.2} aria-hidden />}
          onClick={() => openReview("reject", selected)}
        >
          반려 처리
        </SelectionBarButton>
      </SelectionBar>

      {/*
        입점 신청 미리보기 — 원본의 `/seller-review/{id}` 자리를 받는 빠른 확인용이다.
        ⚠️ 여기에 심사 버튼을 두지 않는다. 원본 목록의 심사 경로는 선택 → 일괄 처리 하나뿐이고,
        상태 안내도 "심사는 상세에서 서류를 보고 처리합니다"라고 말한다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="입점 신청 미리보기" description={preview?.name} />
        <ModalBody>
          <InfoList>
            <InfoItem label="대표명">{preview?.ceo}</InfoItem>
            <InfoItem label="연락처">{preview?.phone}</InfoItem>
            <InfoItem label="사업자">{preview?.business}</InfoItem>
            <InfoItem label="신청일">{ymdhms(preview?.date ?? null)}</InfoItem>
          </InfoList>
          {previewStatus ? (
            <div className="flex flex-col gap-2">
              <Tag tone={previewStatus.tone} dot>
                {previewStatus.label}
              </Tag>
              <p className="body-small text-text-sub">
                {previewStatus.description}
              </p>
            </div>
          ) : null}
        </ModalBody>
      </Modal>

      {/*
        승인 게이트 — 원본 `SellerReviewBulkApproveGate`.
        ⚠️ 단순 확인 모달이 아니다. **셀러별 수수료율과 위생인증을 여기서 확정한다.**
        승인과 동시에 셀러가 생성되므로 이 두 값이 비어 있으면 셀러를 만들 수 없다.
      */}
      <Modal open={reviewMode === "approve"} onClose={closeReview} size="large">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={`입점 심사 일괄 승인 (${count(pendingIds.length)})`}
        />
        <ModalBody>
          <p className="body-medium text-text-sub">
            {REVIEW_COPY.approveIntro}
          </p>
          <ul className="flex flex-col gap-3">
            {pending.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate label-medium-bold text-text">
                  {item.name}
                </span>
                <Input
                  inputMode="decimal"
                  aria-label={`${item.name} 수수료율`}
                  value={drafts[item.id]?.rate ?? ""}
                  onChange={(event) => {
                    /* 원본과 같이 숫자와 소수점만 남긴다 */
                    const next = event.target.value.replace(/[^0-9.]/g, "");
                    setDrafts((current) => ({
                      ...current,
                      [item.id]: {
                        rate: next,
                        hygiene: current[item.id]?.hygiene ?? "none",
                      },
                    }));
                    setRateError(false);
                  }}
                  rightIcon={
                    <span className="body-medium text-text-sub">%</span>
                  }
                />
                {/*
                  `SegmentedControl` 은 `role="radiogroup"` 이라 이름이 필요하다.
                  모달 안에서 같은 컨트롤이 여러 벌이라 셀러명을 붙여 구별한다.
                */}
                <SegmentedControl
                  className="shrink-0"
                  aria-label={`${item.name} 위생인증`}
                  items={HYGIENE_OPTIONS}
                  value={drafts[item.id]?.hygiene ?? "none"}
                  onValueChange={(value) =>
                    setDrafts((current) => ({
                      ...current,
                      [item.id]: {
                        rate: current[item.id]?.rate ?? "",
                        hygiene: value,
                      },
                    }))
                  }
                />
              </li>
            ))}
          </ul>
          {rateError ? (
            <p role="alert" className="body-small text-text-critical">
              {REVIEW_COPY.rateError}
            </p>
          ) : null}
          <p className="body-small-bold text-text-critical">
            {REVIEW_COPY.approveWarning}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="large" onClick={closeReview}>
            취소
          </Button>
          <Button size="large" onClick={applyApprove}>
            승인 처리
          </Button>
        </ModalFooter>
      </Modal>

      {/* 반려 사유 입력 — 사유 없이는 반려할 수 없다 (원본도 빈 사유면 버튼이 잠긴다) */}
      <Modal open={reviewMode === "reject"} onClose={closeReview} size="small">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={`입점 심사 반려 사유${countSuffix}`}
        />
        <ModalBody>
          {/* `FormField` 는 Input·Textarea·Select 전용이다 — Textarea 라 그대로 쓴다 */}
          <FormField label="반려 사유" required>
            <Textarea
              minRows={4}
              value={reason}
              placeholder={REVIEW_COPY.rejectPrompt}
              onChange={(event) => setReason(event.target.value)}
            />
          </FormField>
          <p className="body-small text-text-sub">
            {REVIEW_COPY.rejectWarning}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="large" onClick={closeReview}>
            취소
          </Button>
          <Button
            variant="critical"
            size="large"
            disabled={reason.trim() === ""}
            onClick={applyReject}
          >
            반려 처리
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
