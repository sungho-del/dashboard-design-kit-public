import { useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
import {
  AppShell,
  Button,
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
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  TextButton,
  useToast,
  type DateRange,
} from "../../components/ui";
import {
  PAGE_SIZE,
  POINT_ACCOUNTS,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  balanceOf,
  point,
  searchHaystack,
  ymdhm,
  type PointAccount,
} from "./PointListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S18 포인트 관리 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형 (`docs/screen-templates.md` §3-1)
 * 회원별 포인트 잔액과 누적 지급·차감을 조회한다. 조작보다 **조회**가 목적인 화면이라
 * 행 액션을 두지 않고, 회원명을 열면 미리보기 모달에서 값을 한 번에 본다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./PointListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                          |
 * | --------------------- | --------------------------------------------- |
 * | 데이터·타입·라벨·단위 | `PointListPage.data.ts` **전체**              |
 * | 표 컬럼 구성          | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 툴바 필터 구성        | `toolbarEnd` 슬롯                             |
 * | 화면 제목·액션        | `PageHeader` · 툴바의 엑셀 다운로드           |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 페이지 범위 클램프 ·
 * `inPeriod` 날짜 필터 · 검색 조건 스코프 · 회원명 클릭 → 미리보기 모달
 *
 * ## 숫자 세 개가 한 행에 있다
 * 보유 = 누적 지급 − 누적 차감. 뼈대는 이 계산을 하지 않고 `balanceOf()` 를 부른다.
 * 계산을 뼈대에서 하면 데이터가 바뀔 때 규칙이 두 곳에 흩어진다.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * **회원 등급이 통째로 발명이었다.** 원본(`chunks/0mbh3uyfg-osc.js` 모듈 7642)에는
 * 등급 컬럼도 등급 세그먼트 필터도 없고, 브론즈·실버·골드·VIP 라는 낱말이
 * 전 청크 어디에도 나오지 않는다. 필터 축은 **업데이트 기간 · 검색** 둘뿐이다.
 * 검색 조건의 `"전체"` 항목도 없다 — 원본 `fieldOpts` 는 회원명·아이디(이메일) 둘뿐이다.
 * 모달 푸터의 `회원 상세 보기`도 없다 — 지급·차감은 상세 화면의 일이고,
 * 원본 포인트 목록에는 행 액션이 없다. `PageHeader` 설명문도 원본에 없다.
 * ====================================================================== */

/**
 * 업데이트 일시가 선택한 기간 안에 드는지.
 *
 * `date` 는 `"YYYY-MM-DD HH:mm"` 형식인데 공백 구분자는 브라우저별 파싱이 갈린다.
 * `T` 로 바꿔 ISO 형태로 만든 뒤 넘긴다. 시작일은 00:00, 종료일은 23:59:59 까지 포함한다.
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

/** 모달의 라벨 열 폭. `누적 차감 포인트` 가 기본 80 에 들어가지 않아 다섯 행에 함께 준다 */
const SHEET_LABEL_WIDTH = 112;

export interface PointListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function PointListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: PointListPageProps) {
  const { toast } = useToast();

  /** 검색 조건의 기본값은 **첫 항목**이다 — 원본도 `fieldOpts[0]` 을 기본으로 쓴다 */
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);

  const [preview, setPreview] = useState<PointAccount | null>(null);

  const filtered = POINT_ACCOUNTS.filter((account) => {
    const matchKeyword =
      keyword.trim() === "" ||
      searchHaystack(account, searchField).includes(keyword.trim());
    return matchKeyword && inPeriod(account.date, period);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /** 초기화는 한 곳에서만 정의한다 — 한쪽만 되돌리면 "초기화했는데 여전히 비어 있음"이 된다 */
  const resetFilters = () => {
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPeriod(undefined);
    setPage(1);
  };

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
      header={<PageHeader title="포인트 관리" />}
    >
      <DataTableShell
        toolbarStart={
          <span className="heading-medium-bold text-text">포인트 목록</span>
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
              startPlaceholder="업데이트 시작일"
              endPlaceholder="종료일"
            />
            <Select
              options={SEARCH_FIELDS}
              value={searchField}
              onValueChange={(value) => {
                setSearchField(value);
                setPage(1);
              }}
              aria-label="검색 조건"
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
            <Button
              variant="secondary"
              onClick={() =>
                toast(`조회 결과 ${filtered.length}건을 내려받았습니다`)
              }
            >
              <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
              엑셀 다운로드
            </Button>
          </>
        }
        isEmpty={filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title="해당 조건의 회원이 없습니다"
            description="업데이트 기간·검색어를 바꿔 다시 조회해 주세요."
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
              <span className="body-small text-text-sub">
                총 {filtered.length}건
              </span>
            }
          />
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수. 한 컬럼만 auto 로 두면 여백을 독식한다 — 합 100% */}
          <colgroup>
            <col className="w-28" />
            <col className="w-50" />
            <col className="w-28" />
            <col className="w-33" />
            <col className="w-33" />
            <col className="w-35" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>회원명</TableTh>
              <TableTh>아이디(이메일)</TableTh>
              {/* 크기를 비교하는 수치 세 열 — §7-2 우측 정렬 (원본 `align: right`) */}
              <TableTh>보유 포인트</TableTh>
              <TableTh>누적 지급 포인트</TableTh>
              <TableTh>누적 차감 포인트</TableTh>
              <TableTh>업데이트 일시</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((account) => (
              <TableRow key={account.id}>
                <TableTd>
                  {/* 원본에서 링크는 이 셀 하나다 — 행 전체는 눌리지 않는다 */}
                  <TextButton onClick={() => setPreview(account)}>
                    {account.name}
                  </TextButton>
                </TableTd>
                <TableTd>{account.email}</TableTd>
                {/*
                  세 수치 중 **보유만 굵다**(원본도 이 열만 `<b>`).
                  나머지 둘은 보유를 설명하는 내역이라 같은 무게로 그리면
                  어느 숫자를 먼저 읽어야 하는지가 사라진다.
                */}
                <TableTd>
                  <span className="body-medium-bold text-text">
                    {point(balanceOf(account))}
                  </span>
                </TableTd>
                <TableTd>{point(account.granted)}</TableTd>
                <TableTd>{point(account.used)}</TableTd>
                <TableTd>{ymdhm(account.date)}</TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        포인트 미리보기 — 표의 값을 한 자리에 모아 보는 빠른 확인용이다.
        **푸터 액션을 두지 않는다** — 지급·차감은 상세 화면의 일이고,
        원본 포인트 목록에는 행 액션이 없다. 남는 버튼은 모달을 닫는 것뿐이다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="포인트 미리보기" description={preview?.name} />
        <ModalBody>
          <InfoList>
            {/* 라벨 폭은 다섯 행에 **똑같이** 준다 — 한 행만 넓히면 라벨 열이 어긋난다 */}
            <InfoItem label="아이디" labelWidth={SHEET_LABEL_WIDTH}>
              {preview?.email}
            </InfoItem>
            <InfoItem label="보유 포인트" labelWidth={SHEET_LABEL_WIDTH}>
              {preview ? point(balanceOf(preview)) : ""}
            </InfoItem>
            <InfoItem label="누적 지급 포인트" labelWidth={SHEET_LABEL_WIDTH}>
              {preview ? point(preview.granted) : ""}
            </InfoItem>
            <InfoItem label="누적 차감 포인트" labelWidth={SHEET_LABEL_WIDTH}>
              {preview ? point(preview.used) : ""}
            </InfoItem>
            <InfoItem label="업데이트 일시" labelWidth={SHEET_LABEL_WIDTH}>
              {preview ? ymdhm(preview.date) : ""}
            </InfoItem>
          </InfoList>
        </ModalBody>
      </Modal>
    </AppShell>
  );
}
