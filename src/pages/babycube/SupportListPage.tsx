import { useState } from "react";
import { Search } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  DataTableShell,
  DatePicker,
  EmptyState,
  Gnb,
  InfoItem,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalHeader,
  PageHeader,
  Pagination,
  Select,
  StatGrid,
  StatTile,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tabs,
  Tag,
  TextButton,
  type DateRange,
} from "../../components/ui";
import {
  AUDIENCE_TABS,
  CUSTOMER_INQUIRIES,
  customerHaystack,
  PAGE_SIZE,
  PERIOD_FIELDS,
  REFERENCE_MONTH,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  SELLER_ASKS,
  SELLER_SUMMARY,
  STATUS_FILTERS,
  STATUS_META,
  TYPE_FILTERS,
  TYPE_LABELS,
  ymd,
  type CustomerInquiry,
  type SellerAsk,
  type SupportAudience,
} from "./SupportListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S22 문의 관리 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 목록형 (`docs/screen-templates.md` §3-1)
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 — 탭마다 몸통이 통째로 다르다
 *
 * ```
 * 탭: [고객 문의][셀러 문의]                       ← 기본 "고객 문의"
 *
 * 고객 문의 : 상태 대시(툴팁 O) → 검색조건 → [ 표 7열 | 총 N건 · 페이지네이션 ]
 * 셀러 문의 : 요약 2칸(미답변/전체) → [ 표 5열 ]   ← 필터도 페이저도 없다
 * ```
 *
 * 원본이 두 컴포넌트(`j`, `y`)를 따로 두고 탭 칩으로 갈아 끼운다. 컬럼도 다르다 —
 * 셀러 표에는 **유형과 답변일이 없다.**
 *
 * ## 왜 탭이 `PageHeader` 에 있나 (공지 화면과 다른 이유)
 * 공지의 대상 칩(`SegmentedControl`)은 **같은 표에서 행만 바뀌는** 범위 전환이라
 * 표 위에 둔다. 여기 탭은 **컬럼·필터·요약이 전부 바뀌는** 화면 단위 전환이라
 * 페이지 제목에 붙는 탭이 맞다.
 *
 * ## 원본에 없어서 걷어낸 것들 (되살리지 말 것)
 *
 * - **셀러 요약의 증감(±건)·비교 기준.** 원본 `statrow` 는 라벨과 건수뿐이다
 * - **상태 세그먼트.** 원본이 `chip.dash: true` 라 상태 축은 **건수 카드로만** 그린다 —
 *   카드와 세그먼트를 함께 두면 한 축에 컨트롤이 둘이 된다
 * - **엑셀 다운로드.** 이 화면은 공용 목록 셸(`20013`)을 쓰지 않아 툴바 버튼이 없다
 * - **답변 등록**(모달 푸터 + 상태 변경). 원본 목록에 조치가 없다
 * - **행 전체 클릭.** 원본에서 눌리는 것은 `제목` 하나다(`className: "linkish"`)
 * - **PageHeader 안내 문장.** 원본 어드민에는 페이지 설명문이 없다
 *
 * ## 원본에 있었는데 빠뜨렸던 것 — 되살렸다
 * - **상태 대시의 설명 툴팁**(원본 `statusTips`)
 * - **검색 조건 셀렉트**(회원명 / 유형 / 제목+내용) — 검색 상자 하나로 뭉쳐 있었다
 * - **탭마다 다른 컬럼** — 한 표를 돌려쓰며 첫 열 이름만 바꾸고 있었다
 * - **날짜 표기**(`ymd`)와 답변일이 없을 때의 `-`
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./SupportListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                          |
 * | --------------------- | --------------------------------------------- |
 * | 데이터·타입·문구      | `SupportListPage.data.ts` **전체**            |
 * | 표 컬럼 구성          | `CustomerTab` · `SellerTab` 의 표             |
 * | 툴바 필터 구성        | `CustomerTab` 의 `toolbarEnd`                 |
 * | 화면 제목·탭          | `PageHeader`                                  |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 페이지 범위 클램프 ·
 * `inPeriod` 날짜 필터 · **흰 카드 = 그룹 / 연한 그레이 상자 = 항목** 두 층 ·
 * 상자 안 **라벨 좌상단 · 수치 우하단** ·
 * 대시 건수는 **상태 필터를 뺀 나머지 조건**에서 센다(아래 `scoped`)
 *
 * ## 원본에 있으나 우리 컴포넌트로 표현하지 못한 것 (미해결)
 * - **문의 상세**(원본 제목 → `/inquiry-detail?id=` · `/support/seller-asks/{id}`,
 *   답변을 등록하는 화면) — 기획서 `gaps` 라 이 배치에 없다. 미리보기 모달로 받는다
 * - **기간 빠른 선택**(오늘/1주일/…) — `DatePicker` 에 프리셋 슬롯이 없다
 * ====================================================================== */

/**
 * 날짜 문자열이 선택한 기간 안에 드는지.
 *
 * `null` 은 **필터에서 빠진다** — 답변일 기준으로 물었는데 답변이 없는 문의는
 * "그 기간에 처리한 문의"가 아니기 때문이다.
 * `"YYYY-MM-DD HH:mm"` 의 공백 구분자는 브라우저별 파싱이 갈려 `T` 로 바꿔 넘긴다.
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

/* ── 고객 문의 탭 (원본 컴포넌트 `j`) ─────────────────────────────────── */

function CustomerTab({
  onOpen,
}: {
  onOpen: (inquiry: CustomerInquiry) => void;
}) {
  const [status, setStatus] = useState(STATUS_FILTERS[0].value);
  const [type, setType] = useState(TYPE_FILTERS[0].value);
  const [periodField, setPeriodField] = useState(PERIOD_FIELDS[0].value);
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  /* 원본 정렬은 `createdAt desc` 하나뿐이다(사용자가 바꿀 수 없다) */
  const sorted = [...CUSTOMER_INQUIRIES].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  /*
   * 상태를 **뺀** 나머지 조건으로 좁힌 집합. 상태별 건수를 여기서 센다.
   * 이미 상태로 좁힌 결과에서 세면 "미답변"을 고르는 순간 나머지가 0 이 되어
   * 대시가 비교할 것을 잃는다.
   */
  const scoped = sorted.filter((inquiry) => {
    const matchType = type === "all" || inquiry.type === type;
    const matchKeyword =
      keyword.trim() === "" ||
      customerHaystack(inquiry, searchField).includes(keyword.trim());
    /* 접수일로 재는지 답변일로 재는지는 사용자가 고른다 */
    const target =
      periodField === "answered" ? inquiry.answeredAt : inquiry.date;
    return matchType && matchKeyword && inPeriod(target, period);
  });

  const filtered = scoped.filter(
    (inquiry) => status === "all" || inquiry.status === status,
  );

  const dash = STATUS_FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count:
      item.value === "all"
        ? scoped.length
        : scoped.filter((inquiry) => inquiry.status === item.value).length,
    /* 원본은 상태 카드에만 `tip` 을 단다 — "전체"에는 없다 */
    tip:
      item.value === "all"
        ? undefined
        : STATUS_META[item.value as keyof typeof STATUS_META].description,
  }));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /* 초기화는 **한 곳에서만 정의한다** — 한쪽이 기간을 빠뜨리면 "초기화했는데 여전히 비어 있음"이 된다 */
  const resetFilters = () => {
    setStatus(STATUS_FILTERS[0].value);
    setType(TYPE_FILTERS[0].value);
    setPeriodField(PERIOD_FIELDS[0].value);
    setPeriod(undefined);
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPage(1);
  };

  return (
    <>
      {/*
        상태 대시 — 원본 `StatDash`. 건수를 보여주면서 그 자체가 상태 필터다.
        원본 필터 설정이 `chip.dash: true` 라, 상태를 고르는 컨트롤은 **이것뿐**이다.
      */}
      <Card>
        <CardBody>
          {/*
            건수 대시 = 필터. 상자의 시각 규격 · 선택/hover 축 분리 · 접근가능 이름
            조립 · 툴팁 분기는 전부 `StatGrid` 가 맡는다 (docs/DESIGN-dashboard.md §D4).
          */}
          <StatGrid
            items={dash.map((item) => ({
              value: item.value,
              label: item.label,
              /* 원본은 콤마를 넣지 않는다 — 포맷을 바꾸면 접근가능 이름이 달라진다 */
              count: String(item.count),
              unit: "건",
              tip: item.tip,
            }))}
            selected={status}
            onSelect={(value) => {
              setStatus(value);
              setPage(1);
            }}
            ariaLabel="문의 상태"
            columns={3}
          />
        </CardBody>
      </Card>

      <DataTableShell
        toolbarEnd={
          <>
            {/* 원본 `date.fields` 가 2개라 **기간 기준 셀렉트**가 함께 뜬다 */}
            <Select
              aria-label="기간 기준"
              options={PERIOD_FIELDS}
              value={periodField}
              onValueChange={(value) => {
                setPeriodField(value);
                setPage(1);
              }}
            />
            <DatePicker
              mode="range"
              value={period}
              defaultMonth={REFERENCE_MONTH}
              onChange={(next) => {
                setPeriod(next);
                setPage(1);
              }}
              startPlaceholder="시작일"
              endPlaceholder="종료일"
            />
            <Select
              aria-label="문의 유형"
              options={TYPE_FILTERS}
              value={type}
              onValueChange={(value) => {
                setType(value);
                setPage(1);
              }}
            />
            {/* 검색은 "조건 선택 + 검색어" 2단이다(원본 `search.fieldOpts` + `ph`) */}
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
              placeholder={SEARCH_PLACEHOLDER}
              aria-label="검색어"
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
            title="해당 조건의 문의가 없습니다"
            /* 본문 문구는 원본 공용 빈 상태 그대로다 */
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
          {/* table-fixed 라 폭 지정 필수. 한 컬럼만 auto 로 두면 여백을 독식한다 */}
          <colgroup>
            <col className="w-25" />
            <col className="w-25" />
            <col className="w-60" />
            <col className="w-65" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-23" />
          </colgroup>
          {/* 컬럼 이름·순서는 원본 `b = [...]` 그대로다 */}
          <TableHead>
            <TableRow>
              <TableTh>회원명</TableTh>
              <TableTh>유형</TableTh>
              <TableTh>제목</TableTh>
              <TableTh>내용</TableTh>
              <TableTh>접수일</TableTh>
              <TableTh>답변일</TableTh>
              <TableTh align="center">상태</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((inquiry) => {
              const meta = STATUS_META[inquiry.status];
              return (
                <TableRow key={inquiry.id}>
                  <TableTd>{inquiry.member}</TableTd>
                  {/* 유형은 **대등한 분류**라 배지로 칠하지 않는다 (§3-1 · 원본도 맨 글자다) */}
                  <TableTd>{TYPE_LABELS[inquiry.type]}</TableTd>
                  {/*
                    원본에서 제목은 `/inquiry-detail?id=` 로 가는 링크다.
                    행 전체를 누르게 만들지 않는다 — 원본에 없는 어포던스다.
                  */}
                  <TableTd>
                    <TextButton onClick={() => onOpen(inquiry)}>
                      {inquiry.title}
                    </TextButton>
                  </TableTd>
                  <TableTd ellipsis>{inquiry.body}</TableTd>
                  <TableTd>{ymd(inquiry.date)}</TableTd>
                  {/* 답변이 없으면 원본과 같이 `-` 다 (상태 열이 이미 미답변을 말한다) */}
                  <TableTd>{ymd(inquiry.answeredAt)}</TableTd>
                  <TableTd align="center">
                    <Tag tone={meta.tone} dot>
                      {meta.label}
                    </Tag>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>
    </>
  );
}

/* ── 셀러 문의 탭 (원본 컴포넌트 `y`) ─────────────────────────────────── */

function SellerTab({ onOpen }: { onOpen: (ask: SellerAsk) => void }) {
  /*
   * 원본은 필터도 페이저도 두지 않고 `size: 100` 으로 한 번에 받아 전부 보여준다.
   * 그래서 이 탭에는 상태가 하나도 없다. 정렬만 원본과 같이 `createdAt desc` 다.
   */
  const sorted = [...SELLER_ASKS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      {/*
        셀러 요약 — 원본 `statrow`. **라벨과 건수뿐이다**(증감도 비교 기준도 없다).
        건수는 목록에서 세므로 요약과 표가 어긋날 수 없다.
      */}
      <Card>
        <CardBody>
          {/*
          거터 12 — **카드 안 항목 묶음**이다(카드 사이 24 와 다른 축).
          묶음 안이 묶음 사이보다 좁아야 하나로 읽힌다. 규격: `DESIGN-dashboard.md` §D4-3
          */}
          <div className="grid grid-cols-2 gap-3">
            {SELLER_SUMMARY.map((item) => {
              const count = sorted.filter(
                (ask) => item.status === null || ask.status === item.status,
              ).length;
              return (
                /* 고를 수 없는 요약이라 버튼이 아니다 — 상호작용 prop 을 주지 않는다 */
                <StatTile
                  key={item.label}
                  label={item.label}
                  value={String(count)}
                  unit="건"
                  compact
                  /* 원본도 미답변 값에만 주의색을 준다(`color: var(--warn)`) */
                  tone={item.warn ? "warning" : "default"}
                />
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* 원본 셀러 카드는 표 하나뿐이다 — 목록 헤더도 페이지네이션도 없다 */}
      <DataTableShell
        isEmpty={sorted.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title="접수된 셀러 문의가 없습니다"
            description="셀러가 문의를 남기면 이곳에 표시됩니다."
          />
        }
      >
        <Table>
          <colgroup>
            <col className="w-35" />
            <col className="w-65" />
            <col className="w-65" />
            <col className="w-28" />
            <col className="w-23" />
          </colgroup>
          {/* 컬럼 이름·순서는 원본 `m = [...]` 그대로다 — **유형과 답변일이 없다** */}
          <TableHead>
            <TableRow>
              <TableTh>셀러</TableTh>
              <TableTh>제목</TableTh>
              <TableTh>내용</TableTh>
              <TableTh>접수일</TableTh>
              <TableTh align="center">상태</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((ask) => {
              const meta = STATUS_META[ask.status];
              return (
                <TableRow key={ask.id}>
                  <TableTd>{ask.seller}</TableTd>
                  <TableTd>
                    <TextButton onClick={() => onOpen(ask)}>
                      {ask.title}
                    </TextButton>
                  </TableTd>
                  <TableTd ellipsis>{ask.body}</TableTd>
                  <TableTd>{ymd(ask.date)}</TableTd>
                  <TableTd align="center">
                    <Tag tone={meta.tone} dot>
                      {meta.label}
                    </Tag>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>
    </>
  );
}

export interface SupportListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 미리보기 모달에 담기는 것 — 두 탭의 행이 공통으로 가진 것만 추린다 */
type Preview = {
  id: string;
  /** 회원명 또는 셀러명 */
  partyLabel: string;
  party: string;
  title: string;
  body: string;
  status: keyof typeof STATUS_META;
  date: string;
  /** 셀러 문의에는 답변일이 없다 */
  answeredAt: string | null | undefined;
  type: string | undefined;
};

export function SupportListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SupportListPageProps) {
  /* 원본 기본 탭은 `k[0]` = 고객 문의다 — 뼈대에 문자열을 박지 않는다 */
  const [audience, setAudience] = useState<SupportAudience>(
    AUDIENCE_TABS[0].value,
  );
  const [preview, setPreview] = useState<Preview | null>(null);

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
      header={
        <PageHeader
          title="문의 관리"
          tabs={
            <Tabs
              items={AUDIENCE_TABS}
              value={audience}
              onValueChange={(value) => {
                setAudience(value as SupportAudience);
                setPreview(null);
              }}
            />
          }
        />
      }
    >
      {audience === "seller" ? (
        <SellerTab
          onOpen={(ask) =>
            setPreview({
              id: ask.id,
              partyLabel: "셀러",
              party: ask.seller,
              title: ask.title,
              body: ask.body,
              status: ask.status,
              date: ask.date,
              answeredAt: undefined,
              type: undefined,
            })
          }
        />
      ) : (
        <CustomerTab
          onOpen={(inquiry) =>
            setPreview({
              id: inquiry.id,
              partyLabel: "회원명",
              party: inquiry.member,
              title: inquiry.title,
              body: inquiry.body,
              status: inquiry.status,
              date: inquiry.date,
              answeredAt: inquiry.answeredAt,
              type: TYPE_LABELS[inquiry.type],
            })
          }
        />
      )}

      {/*
        문의 미리보기 — 원본의 상세 화면 자리를 받는다.
        표가 내용을 두 줄에서 자르므로, 이 모달의 값어치는 **본문 전문**에 있다.

        ⚠️ 푸터를 두지 않는다. 원본 문의 목록에는 행 액션이 하나도 없고,
        답변 등록은 상세 화면의 일이다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="문의 미리보기" description={preview?.title} />
        <ModalBody>
          <InfoList>
            <InfoItem label={preview?.partyLabel ?? ""}>
              {preview?.party}
            </InfoItem>
            {/* 유형은 고객 문의에만 있다 — 셀러 표에는 그 열 자체가 없다 */}
            {preview?.type !== undefined ? (
              <InfoItem label="유형">{preview.type}</InfoItem>
            ) : null}
            <InfoItem label="접수일">
              {preview ? ymd(preview.date) : ""}
            </InfoItem>
            {preview?.answeredAt !== undefined ? (
              <InfoItem label="답변일">{ymd(preview.answeredAt)}</InfoItem>
            ) : null}
            <InfoItem label="상태">
              {preview ? STATUS_META[preview.status].label : ""}
            </InfoItem>
          </InfoList>
          {/* 표에서 잘린 내용의 전문 */}
          <p className="body-medium text-text-sub">{preview?.body}</p>
        </ModalBody>
      </Modal>
    </AppShell>
  );
}
