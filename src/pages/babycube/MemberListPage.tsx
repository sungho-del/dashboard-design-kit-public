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
  FILTERS,
  MEMBERS,
  MEMBER_UNIT,
  num,
  PAGE_SIZE,
  people,
  SEARCH_FIELDS,
  STATUS_META,
  usageText,
  ymd,
  type Member,
  type MemberStatus,
} from "./MemberListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S02 회원 관리 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 목록형
 * 전체 회원을 상태·기간·검색으로 좁혀 조회하고, 이름이나 `상세` 로 한 사람을 연다.
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 — 임의로 더하지 말 것
 *
 * ```
 * 상태 대시 (전체·정상·정지·휴면·탈퇴 건수, 누르면 필터)   ← 원본 StatDash
 * 검색조건 바 (기간 · 검색 조건 + 검색어 · 초기화)          ← 원본 filter
 * [ 총 N건 · 엑셀 다운로드 | 표 | 페이지네이션 ]            ← 원본 ListHead + table + foot
 * ```
 *
 * 원본 목록 셸(`20013`)의 섹션 순서가 `note → dash → filter → card[head→table→foot]` 이고
 * 회원 화면은 `note` 를 넘기지 않는다. 위 3단이 전부다.
 *
 * ## 원본에 없어서 걷어낸 것들 (되살리지 말 것)
 *
 * 한때 이 화면에는 다음이 있었는데 **원본 어디에도 없어서** 전부 뺐다:
 * - **증감 요약 카드 3장**(전체/휴면/탈퇴 회원 + ±% + 비교 기준). 원본의 상단 카드는
 *   상태별 **건수**뿐이고 증감도 비교 기준 문구도 없다
 * - **행 드롭다운 3종**(상세 보기 · 연락처 복사 · 이용 정지)과 **이용 정지 확인 모달**.
 *   원본 `관리` 컬럼은 `상세` 링크 버튼 하나다. 정지/해제는 목록이 아니라 회원 상세의 일이다
 * - **상태 세그먼트**. 원본은 `chip.dash: true` 라 상태 축을 **건수 카드로만** 그린다 —
 *   카드와 세그먼트를 함께 두면 한 축에 컨트롤이 둘이 된다
 * - **PageHeader 도움말 툴팁**. 상태 설명은 원본대로 **대시 카드의 툴팁**으로 내려갔다
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./MemberListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `MemberListPage.data.ts` **전체**              |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 필터 구성              | `toolbarEnd` 슬롯                              |
 * | 화면 제목              | `PageHeader` 의 `title`                        |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 페이지 범위 클램프 ·
 * `inPeriod` 날짜 필터 · **흰 카드 = 그룹 / 연한 그레이 상자 = 항목** 두 층 ·
 * 상자 안 **라벨 좌상단 · 수치 우하단** · 상태 건수를 **상태 필터를 뺀 나머지 조건**에서
 * 세는 규칙(아래 `scoped`)
 *
 * ## 원본에 있으나 우리 컴포넌트로 표현하지 못한 것 (미해결)
 * - **정렬 가능한 헤더**(원본 `sortable`: 이름·가입일·자녀) — `Table` 에 정렬 어포던스가 없다
 * - **고정열**(원본 `frozen`: 이름) — 가로 스크롤 시 첫 열 고정 수단이 없다
 * - **기간 빠른 선택**(오늘/1주일/1개월/3개월/6개월/1년/전체) — `DatePicker` 에 프리셋 슬롯이 없다
 * - **기간 기준 셀렉트**(원본은 `가입일` 한 항목뿐인 select 를 강제로 띄운다) —
 *   고를 것이 하나뿐이라 `DatePicker` 자리표시자로 "가입일 시작/종료"라고 밝히는 데 그쳤다
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 1. **처음 열릴 때 `전체`** — 원본은 `defaultStat: "정상"` 이라 정상 회원만 보인 채 열린다.
 *    대시가 이미 상태별 건수를 다 보여주므로 숨길 이유가 없고, 필터가 걸린 줄 모르고
 *    "회원이 이것뿐인가" 하고 읽는 사고를 막는다
 * 2. **`상세` 가 미리보기 모달을 연다** — 원본은 `/members/{id}` 상세 화면으로 나가지만
 *    그 화면은 기획서 `gaps` 라 이 배치에 없다. 죽은 링크 대신 4항목 미리보기로 받는다
 * 3. **빈 상태 제목이 "회원"** — 원본은 공용 셸이라 "해당 조건의 항목이 없습니다."로
 *    도메인을 모른다. 본문 문구는 원본 그대로다
 * ====================================================================== */

/**
 * 가입일이 선택한 기간 안에 드는지.
 *
 * `date` 는 `"YYYY-MM-DD HH:mm"` 형식인데 공백 구분자는 브라우저별 파싱이 갈린다.
 * `T` 로 바꿔 ISO 형태로 만든 뒤 넘긴다. 시작일은 00:00, 종료일은 23:59:59 까지 포함한다
 * (종료일을 그대로 쓰면 그날 낮에 가입한 회원이 빠진다).
 */
const inPeriod = (dateText: string, range?: DateRange) => {
  if (!range?.from) return true;

  const at = new Date(dateText.replace(" ", "T"));
  if (Number.isNaN(at.getTime())) return true;

  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);

  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);

  return at >= from && at <= to;
};

export interface MemberListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function MemberListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: MemberListPageProps) {
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);

  const [preview, setPreview] = useState<Member | null>(null);

  /* 검색 조건이 "어느 값을 훑을지"를 정한다 — 뼈대는 필드 이름을 모른다 */
  const pick =
    SEARCH_FIELDS.find((field) => field.value === searchField)?.pick ??
    SEARCH_FIELDS[0].pick;

  /*
   * 상태를 **뺀** 나머지 조건으로 좁힌 집합. 상태별 건수를 여기서 센다.
   * 이미 상태로 좁힌 결과에서 세면 "정상"을 고르는 순간 나머지가 전부 0 이 되어
   * 대시가 비교할 것을 잃는다 — 건수를 보여주는 이유가 통째로 사라진다.
   */
  const scoped = MEMBERS.filter((member) => {
    const matchKeyword =
      keyword.trim() === "" || pick(member).includes(keyword.trim());
    return matchKeyword && inPeriod(member.date, period);
  });

  const filtered = scoped.filter(
    (member) => filter === "all" || member.status === filter,
  );

  /*
   * 원본 상태 대시(`StatDash`)가 하던 일 — 상태별 건수를 클릭 없이 보여주고,
   * 카드 자체가 그 상태의 필터가 된다.
   * `FILTERS[].value` 가 `"all"` 또는 `MemberStatus` 라 데이터 쪽 어휘를 그대로 쓴다.
   */
  const dash = FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count:
      item.value === "all"
        ? scoped.length
        : scoped.filter((member) => member.status === item.value).length,
    /* 원본은 상태 카드에 `tip`(statusTips)을 달아 뜻을 설명한다. 전체에는 없다 */
    tip:
      item.value === "all"
        ? undefined
        : STATUS_META[item.value as MemberStatus].description,
  }));

  const selectStatus = (value: string) => {
    setFilter(value);
    setPage(1);
  };

  /*
   * 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다(2페이지를 보던 중 1페이지까지만
   * 남는 경우). 그대로 두면 **빈 표**가 그려지므로 마지막 페이지로 당긴다.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /*
   * 초기화는 **한 곳에서만 정의한다.** 툴바와 빈 상태에 각각 쓰다 보면 한쪽이
   * 기간이나 검색 조건을 되돌리지 않아 "초기화했는데 여전히 비어 있음"이 된다.
   */
  const resetFilters = () => {
    setFilter("all");
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
      header={<PageHeader title="회원 관리" />}
    >
      {/*
        상태 대시 — 원본 `StatDash`. 건수를 보여주면서 그 자체가 상태 필터다.
        흰 카드(그룹) 안에 연한 그레이 상자(항목) 다섯이 들어간다.
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
              unit: MEMBER_UNIT,
              tip: item.tip,
            }))}
            selected={filter}
            onSelect={selectStatus}
            ariaLabel="회원 상태"
            columns={5}
          />
        </CardBody>
      </Card>

      {/* 회원 목록 — DataTableShell 이 §7-1 셸 구조를 책임진다 */}
      <DataTableShell
        toolbarStart={
          /* 원본 `toolsLeft` 는 엑셀 다운로드 하나다 — 툴바 좌측이 그 자리다 */
          <Button
            variant="secondary"
            /*
              내보내기 대상은 화면 전체가 아니라 **지금 조건으로 조회된 결과**다
              (원본도 `회원관리_N건.csv` 로 저장한다).
              건수를 밝히지 않으면 필터를 걸어 둔 줄 모르고 받아 간다.
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
            <DatePicker
              mode="range"
              value={period}
              onChange={(next) => {
                setPeriod(next);
                setPage(1);
              }}
              startPlaceholder="가입일 시작"
              endPlaceholder="가입일 종료"
            />
            {/*
              검색은 "조건 선택 + 검색어" 2단이다(원본 `search.fieldOpts` + `ph`).
              트리거에 보이는 글자는 현재 조건이라, 무엇을 고르는 셀렉트인지는
              `aria-label` 이 대신 말한다.
            */}
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
            title="해당 조건의 회원이 없습니다"
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

            폭은 **원본 어드민의 컬럼 정의(`minWidth`)** 를 옮긴 값이다 —
            110·200·130·110·70·90·140·80 을 4px 격자로 올림했다(§DESIGN.md §7-2).
            표가 `width:auto; min-width:100%` 라, 합(940)이 화면보다 좁으면 비율대로 늘어난다.
          */}
          <colgroup>
            <col className="w-28" />
            <col className="w-50" />
            <col className="w-33" />
            <col className="w-28" />
            <col className="w-18" />
            <col className="w-23" />
            <col className="w-35" />
            <col className="w-20" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>이름</TableTh>
              <TableTh>아이디(이메일)</TableTh>
              <TableTh>연락처</TableTh>
              <TableTh>가입일</TableTh>
              {/* 숫자 컬럼은 우측 정렬 — 자릿수를 세로로 맞춰 비교한다 (§7 · 원본도 right) */}
              <TableTh>자녀</TableTh>
              <TableTh align="center">상태</TableTh>
              <TableTh>이용</TableTh>
              <TableTh>관리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((member) => {
              const status = STATUS_META[member.status];
              return (
                <TableRow key={member.id}>
                  {/*
                    원본에서 이름은 `/members/{id}` 로 가는 링크다(`className: "linkish"`).
                    행 전체를 누르게 만들지 않는다 — 원본에 없는 어포던스다.
                  */}
                  <TableTd>
                    <TextButton onClick={() => setPreview(member)}>
                      {member.name}
                    </TextButton>
                  </TableTd>
                  <TableTd>
                    {/*
                      ⚠️ `line-clamp-1` 이 아니라 `truncate` 다. clamp 은 **줄 수가
                      한도를 넘을 때만** 말줄임을 넣는데, 이메일은 줄바꿈 기회가 없어
                      (UAX#14 — `.`·`@` 뒤로 끊기지 않는다) 언제나 한 줄이다.
                      그래서 clamp 이 발동하지 않고 `overflow: hidden` 이 글자를 그냥 잘랐다.
                      `block` 은 필수다 — 인라인 박스에는 `overflow`·`text-overflow` 가
                      적용되지 않아 span 을 블록 컨테이너로 만들어야 `…` 가 나온다.
                    */}
                    <span className="block truncate">{member.id}</span>
                  </TableTd>
                  <TableTd>{member.phone}</TableTd>
                  {/* 원본 `ymd` — 날짜만 낸다 */}
                  <TableTd>{ymd(member.date)}</TableTd>
                  <TableTd>{people(member.kids)}</TableTd>
                  <TableTd align="center">
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </TableTd>
                  {/* 렌트 / 구매를 나눠 적는다 — 합계 하나로 접으면 이 서비스의 핵심 구분이 사라진다 */}
                  <TableTd>{usageText(member)}</TableTd>
                  <TableTd>
                    {/* 원본 `관리` 컬럼은 `상세` 버튼 하나다 (`btn line sm`) */}
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setPreview(member)}
                    >
                      상세
                    </Button>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        회원 미리보기 — 원본의 `/members/{id}` 자리를 받는 4항목짜리 빠른 확인용이다.
        제목을 "회원 상세"로 두지 않는다. 상세 화면이 생기면 같은 이름의 화면이 둘이 되고,
        모달에 전체 정보를 밀어 넣으라는 신호로 읽힌다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="회원 미리보기" description={preview?.name} />
        <ModalBody>
          <InfoList>
            <InfoItem label="아이디">{preview?.id}</InfoItem>
            <InfoItem label="연락처">{preview?.phone}</InfoItem>
            <InfoItem label="자녀">
              {preview ? people(preview.kids) : ""}
            </InfoItem>
            <InfoItem label="가입일">{preview?.date}</InfoItem>
          </InfoList>
          {/*
            상태만 보여주고 끝내지 않는다 — "정지를 풀면 [정상]으로 돌아갑니다" 같은
            **되돌림 가능 여부**가 곧 조치 판단의 근거라서 설명을 함께 낸다
            (원본 `statusTips` 문구 그대로).
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
          ⚠️ 푸터를 두지 않는다. 원본 회원 목록에는 행 액션이 하나도 없다 —
          정지·해제는 회원 상세 화면의 일이라 여기에 버튼을 만들면 없는 기능을 지어내는 것이다.
        */}
      </Modal>
    </AppShell>
  );
}
