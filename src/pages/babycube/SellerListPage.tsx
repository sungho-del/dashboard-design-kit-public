import { useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
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
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
  useToast,
  type DateRange,
} from "../../components/ui";
import {
  DATE_FIELDS,
  EMPTY_CELL,
  FILTERS,
  HQ_SUFFIX,
  HYGIENE_BADGE,
  HYGIENE_FILTERS,
  num,
  PAGE_SIZE,
  rate,
  score,
  SEARCH_FIELDS,
  SELLERS,
  SELLER_UNIT,
  STATUS_META,
  ymd,
  type Seller,
  type SellerStatus,
} from "./SellerListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S03 셀러 관리 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 목록형
 * 입점한 셀러의 운영 상태·수수료율·실적(상품수·평점)을 조회하고,
 * 셀러명을 눌러 한 곳을 연다.
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 — 임의로 더하지 말 것
 *
 * ```
 * 상태 대시 (전체·입점·퇴점 처리중·퇴점 건수, 누르면 필터)   ← 원본 StatDash
 * 검색조건 바 (기간 기준+기간 · 위생인증 · 검색조건+검색어)   ← 원본 filter/chips/search
 * [ 총 N건 · 엑셀 다운로드 | 표 | 페이지네이션 ]              ← 원본 ListHead + table + foot
 * ```
 *
 * ## 원본에 없어서 걷어낸 것들 (되살리지 말 것)
 *
 * - **증감 요약 카드 3장**(전체 입점 셀러/퇴점 처리중/평균 평점 + ±% + 비교 기준).
 *   원본 상단 카드는 상태별 **건수**뿐이고 증감도 비교 기준 문구도 없다
 * - **미리보기 모달의 액션 2종**(수수료율 조정 · 퇴점 처리)과 **퇴점 처리 확인 모달**.
 *   원본 셀러 목록에는 행 액션이 하나도 없다 — 조치는 셀러 상세 화면의 일이다
 * - **상태 세그먼트**. 원본은 `chip.dash: true` 라 상태 축을 **건수 카드로만** 그린다
 * - **PageHeader 도움말 툴팁**. 상태 설명은 원본대로 **대시 카드의 툴팁**으로 내려갔다
 *
 * ## 원본에서 되살린 것 (이전에 빠져 있던 축)
 * - **기간 기준 셀렉트**(원본 `date.fields: [입점일, 퇴점일]`). 기준이 둘이라 원본도
 *   셀렉트를 띄운다. 퇴점일 기준으로 거르면 아직 퇴점하지 않은 셀러는 빠진다
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./SellerListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `SellerListPage.data.ts` **전체**              |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 필터 구성              | `toolbarEnd` 슬롯                              |
 * | 화면 제목              | `PageHeader` 의 `title`                        |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · 퇴점일 열이 붙고 빠지는 두 벌 `colgroup` ·
 * 페이지 범위 클램프 · `inPeriod` 날짜 필터 ·
 * **흰 카드 = 그룹 / 연한 그레이 상자 = 항목** 두 층 · 상자 안 **라벨 좌상단 · 수치 우하단** ·
 * **분류 배지에 상태색을 쓰지 않는** 규칙(위생인증은 highlight 계열) ·
 * 상태 건수를 **상태 필터를 뺀 나머지 조건**에서 세는 규칙(아래 `scoped`)
 *
 * ## 원본에 있으나 우리 컴포넌트로 표현하지 못한 것 (미해결)
 * - **정렬 가능한 헤더**(원본 `sortable`: 셀러명·수수료율·입점일·퇴점일·상품수)
 * - **고정열**(원본 `frozen`: 셀러명)
 * - **기간 빠른 선택**(오늘/1주일/1개월/3개월/6개월/1년/전체)
 * - **위생인증의 다중 선택**(원본은 체크박스 칩이라 두 값을 동시에 고를 수 있다).
 *   값이 둘뿐이라 둘 다 고르면 전체와 같아져, 3지 택일 셀렉트로 대신했다
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 1. **처음 열릴 때 `전체`** — 원본은 `defaultStat: "입점"` 이라 입점 셀러만 보인 채 열린다.
 *    대시가 이미 상태별 건수를 다 보여주므로 숨길 이유가 없다
 * 2. **셀러명이 미리보기 모달을 연다** — 원본은 `/sellers/{id}` 상세로 나가지만
 *    그 화면은 기획서 `gaps` 라 이 배치에 없다
 * 3. **값이 없는 셀을 `-` 로 채운다** — 원본은 빈칸이다. 빈 셀은 "값이 없음"인지
 *    "못 불러왔음"인지 구별되지 않는다
 * ====================================================================== */

/**
 * 기준 날짜가 선택한 기간 안에 드는지.
 *
 * `"YYYY-MM-DD HH:mm"` 형식인데 공백 구분자는 브라우저별 파싱이 갈린다.
 * `T` 로 바꿔 ISO 형태로 만든 뒤 넘긴다. 시작일은 00:00, 종료일은 23:59:59 까지 포함한다.
 *
 * ⚠️ 값이 **없는** 행(퇴점하지 않은 셀러의 퇴점일)은 기간을 걸면 **빠진다.**
 * 기간을 걸지 않았을 때만 통과시킨다 — "퇴점일 7월"로 물었는데 퇴점하지 않은 셀러가
 * 함께 나오면 질문에 대한 답이 아니다.
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

export interface SellerListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function SellerListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerListPageProps) {
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [hygieneFilter, setHygieneFilter] = useState(HYGIENE_FILTERS[0].value);
  const [dateField, setDateField] = useState(DATE_FIELDS[0].value);
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);

  const [preview, setPreview] = useState<Seller | null>(null);

  /* 검색 조건이 "어느 값을 훑을지"를 정한다 — 뼈대는 필드 이름을 모른다 */
  const pick =
    SEARCH_FIELDS.find((field) => field.value === searchField)?.pick ??
    SEARCH_FIELDS[0].pick;

  /* 기간 기준도 같은 방식이다 — 뼈대는 "입점일"이라는 말을 모른다 */
  const dateAxis =
    DATE_FIELDS.find((field) => field.value === dateField) ?? DATE_FIELDS[0];

  /*
   * 상태를 **뺀** 나머지 조건으로 좁힌 집합. 상태별 건수를 여기서 센다.
   * 이미 상태로 좁힌 결과에서 세면 하나를 고르는 순간 나머지가 전부 0 이 되어
   * 대시가 비교할 것을 잃는다.
   */
  const scoped = SELLERS.filter((seller) => {
    const matchHygiene =
      hygieneFilter === "all" ||
      (hygieneFilter === "certified") === seller.hygiene;
    const matchKeyword =
      keyword.trim() === "" || pick(seller).includes(keyword.trim());
    return (
      matchHygiene && matchKeyword && inPeriod(dateAxis.pick(seller), period)
    );
  });

  const filtered = scoped.filter(
    (seller) => filter === "all" || seller.status === filter,
  );

  /*
   * 원본 상태 대시(`StatDash`)가 하던 일 — 상태별 건수를 클릭 없이 보여주고,
   * 카드 자체가 그 상태의 필터가 된다.
   */
  const dash = FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count:
      item.value === "all"
        ? scoped.length
        : scoped.filter((seller) => seller.status === item.value).length,
    /* 원본은 상태 카드에 `tip`(statusTips)을 달아 뜻을 설명한다. 전체에는 없다 */
    tip:
      item.value === "all"
        ? undefined
        : STATUS_META[item.value as SellerStatus].description,
  }));

  const selectStatus = (value: string) => {
    setFilter(value);
    setPage(1);
  };

  /*
   * 퇴점일은 **퇴점이 완료된 셀러만** 값이 있다. 전체 목록에서 열을 세워 두면
   * 거의 모든 행이 `-` 라 열 하나를 통째로 낭비한다 — 원본도 상태 필터가 `퇴점` 일 때만
   * 이 열을 컬럼 배열에 밀어 넣는다. 열 개수가 바뀌므로 `<colgroup>` 도 함께 갈린다.
   */
  const showExitDate = filter === "closed";

  /* 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다 — 마지막 페이지로 당긴다 */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /* 초기화는 **한 곳에서만 정의한다** — 툴바와 빈 상태가 서로 다르게 되돌리면 안 된다 */
  const resetFilters = () => {
    setFilter("all");
    setHygieneFilter(HYGIENE_FILTERS[0].value);
    setDateField(DATE_FIELDS[0].value);
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPeriod(undefined);
    setPage(1);
  };

  const previewStatus = preview ? STATUS_META[preview.status] : null;

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
      header={<PageHeader title="셀러 관리" />}
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
              count: num(item.count),
              unit: SELLER_UNIT,
              tip: item.tip,
            }))}
            selected={filter}
            onSelect={selectStatus}
            ariaLabel="셀러 상태"
            columns={4}
          />
        </CardBody>
      </Card>

      {/* 셀러 목록 — DataTableShell 이 §7-1 셸 구조를 책임진다 */}
      <DataTableShell
        toolbarStart={
          /* 원본 `toolsLeft` 는 엑셀 다운로드 하나다 — 툴바 좌측이 그 자리다 */
          <Button
            variant="secondary"
            /*
              내보내기 대상은 화면 전체가 아니라 **지금 조건으로 조회된 결과**다
              (원본도 `셀러관리_N건.csv` 로 저장한다).
            */
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
            {/*
              기간 기준은 **입점일 / 퇴점일 두 축**이다(원본 `date.fields`).
              무엇을 고르는 셀렉트인지는 트리거 글자가 아니라 `aria-label` 이 말한다.
            */}
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
            {/*
              위생인증은 상태와 **다른 축**이라 상태 대시에 섞지 않는다
              (원본도 상태 칩과 별개인 `chips.hygiene` 로 둔다).
            */}
            <Select
              aria-label="위생인증"
              options={HYGIENE_FILTERS}
              value={hygieneFilter}
              onValueChange={(value) => {
                setHygieneFilter(value);
                setPage(1);
              }}
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
            title="해당 조건의 셀러가 없습니다"
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
            퇴점일 열이 붙고 빠지므로 `<col>` 묶음도 두 벌이다.

            폭은 **원본 어드민의 컬럼 정의(`minWidth`)** 를 옮긴 값이다(§DESIGN.md §7-2).
            한때 화면마다 손으로 고른 `%` 였는데, % 는 합이 100 이어야 해서 **열 하나가
            붙고 빠질 때마다 관계없는 열까지 전부 흔들렸다** — 여기 퇴점일이 정확히 그
            경우였다(셀러명 16%↔14%). 이제 퇴점일이 붙어도 나머지는 1px 도 안 움직인다.
            표가 `width:auto; min-width:100%` 라 합이 화면보다 좁으면 비율대로 늘어난다.
          */}
          {showExitDate ? (
            <colgroup>
              <col className="w-35" />
              <col className="w-25" />
              <col className="w-23" />
              <col className="w-33" />
              <col className="w-25" />
              <col className="w-23" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-18" />
            </colgroup>
          ) : (
            <colgroup>
              <col className="w-35" />
              <col className="w-25" />
              <col className="w-23" />
              <col className="w-33" />
              <col className="w-25" />
              <col className="w-23" />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-18" />
            </colgroup>
          )}
          <TableHead>
            <TableRow>
              {/* 식별자가 첫 열이다 — 무엇의 행인지가 가장 먼저 읽혀야 한다 */}
              <TableTh>셀러명</TableTh>
              <TableTh align="center">위생인증</TableTh>
              <TableTh>대표명</TableTh>
              <TableTh>연락처</TableTh>
              <TableTh align="center">상태</TableTh>
              {/* 숫자 열은 우측 정렬 — 자릿수를 세로로 맞춰 비교한다 (§7 · 원본도 right) */}
              <TableTh>수수료율</TableTh>
              <TableTh>입점일</TableTh>
              {showExitDate ? <TableTh>퇴점일</TableTh> : null}
              <TableTh>상품수</TableTh>
              <TableTh>평점</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((seller) => {
              const status = STATUS_META[seller.status];
              return (
                <TableRow key={seller.id}>
                  {/*
                    원본에서 셀러명은 `/sellers/{id}` 로 가는 링크다(`className: "linkish"`).
                    행 전체를 누르게 만들지 않는다 — 원본에 없는 어포던스다.
                  */}
                  <TableTd>
                    <TextButton
                      className="max-w-full"
                      onClick={() => setPreview(seller)}
                    >
                      <span className="truncate">
                        {seller.name}
                        {seller.isHeadquarters ? HQ_SUFFIX : ""}
                      </span>
                    </TextButton>
                  </TableTd>
                  <TableTd align="center">
                    {/*
                      플래그 배지 — "있음"만 붙는다(§3-1). 문구는 원본 그대로 `위생인증셀러`.
                      색은 상태색을 피해 highlight 계열 토큰을 주입받는다.
                    */}
                    {seller.hygiene ? (
                      <Tag
                        tone={HYGIENE_BADGE.tone}
                        style={HYGIENE_BADGE.style}
                      >
                        {HYGIENE_BADGE.label}
                      </Tag>
                    ) : (
                      EMPTY_CELL
                    )}
                  </TableTd>
                  <TableTd>{seller.ceo}</TableTd>
                  <TableTd>{seller.phone}</TableTd>
                  <TableTd align="center">
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </TableTd>
                  <TableTd>{rate(seller.commission)}</TableTd>
                  {/* 원본 `ymd` — 날짜만 낸다 */}
                  <TableTd>{ymd(seller.date)}</TableTd>
                  {showExitDate ? (
                    <TableTd>{ymd(seller.exitDate)}</TableTd>
                  ) : null}
                  {/* 원본 `productCount.toLocaleString("ko-KR")` — 단위를 붙이지 않는다 */}
                  <TableTd>{num(seller.products)}</TableTd>
                  <TableTd>{score(seller.rating)}</TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        셀러 미리보기 — 원본의 `/sellers/{id}` 자리를 받는 4항목짜리 빠른 확인용이다.
        제목을 "셀러 상세"로 두지 않는다. 상세 화면이 생기면 같은 이름의 화면이 둘이 된다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="셀러 미리보기" description={preview?.name} />
        <ModalBody>
          <InfoList>
            {/*
              **셀러 코드는 표에 없다** — 정산·문의를 주고받을 때 쓰는 식별자라
              행을 열었을 때 가장 먼저 필요하다.
            */}
            <InfoItem label="셀러 코드">{preview?.id}</InfoItem>
            <InfoItem label="대표명">{preview?.ceo}</InfoItem>
            <InfoItem label="연락처">{preview?.phone}</InfoItem>
            <InfoItem label="수수료율">
              {preview ? rate(preview.commission) : ""}
            </InfoItem>
          </InfoList>
          {/*
            상태만 보여주고 끝내지 않는다 — "종결 상태라 되돌아가지 않습니다" 같은
            **되돌림 가능 여부**가 곧 조치 판단의 근거다 (원본 `statusTips` 문구 그대로).
          */}
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
        {/*
          ⚠️ 푸터를 두지 않는다. 원본 셀러 목록에는 행 액션이 하나도 없다 —
          수수료율 조정·퇴점 처리는 셀러 상세 화면의 일이라 여기에 버튼을 만들면
          없는 기능을 지어내는 것이다.
        */}
      </Modal>
    </AppShell>
  );
}
