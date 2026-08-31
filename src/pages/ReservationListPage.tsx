import { useState } from "react";
import {
  ArrowDownToLine,
  CalendarX,
  CircleCheck,
  Eye,
  HelpCircle,
  MoreVertical,
  Plus,
  Search,
} from "lucide-react";
import {
  AppShell,
  Button,
  DataTableShell,
  DatePicker,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  EmptyState,
  Gnb,
  IconButton,
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
  StatTile,
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
  type DateRange,
} from "../components/ui";
import {
  FILTERS,
  PAGE_SIZE,
  RESERVATIONS,
  STATS,
  STATUS_META,
  type Reservation,
} from "./ReservationListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "./gnbSections";

/* =========================================================================
 * 예약 목록 (S01) — 목록형
 *
 * ## 화면 유형: 목록형
 * 예약 집합을 표로 보여주고 상태·기간·검색으로 좁힌 뒤,
 * 행을 열어 미리보기를 확인하거나 확정·취소를 처리한다.
 * 데스크 직원이 전화 접수 중 가장 오래 머무는 화면이다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./ReservationListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                              |
 * | --------------------- | ------------------------------------------------- |
 * | 데이터·타입·라벨      | `ReservationListPage.data.ts` **전체**            |
 * | 표 컬럼 구성          | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀    |
 * | 툴바 필터 구성        | `toolbarStart` / `toolbarEnd` 슬롯                |
 * | 행 액션               | `Dropdown` 항목 3개                               |
 * | 화면 제목·도움말      | `PageHeader` 의 `title` · `badges`                |
 *
 * ## 그대로 두는 것 (도메인 무관 · §7-1 실측 규격)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 셀 좌측 정렬 ·
 * 페이지 범위 클램프 · `inPeriod` 날짜 필터 · 행클릭→Modal→Modal 확인 흐름
 *
 * ## 템플릿(`OrderListPage`)과 의도적으로 다른 곳
 * - **금액 열이 없다.** 예약 시점에는 진료비가 확정되지 않는다. 템플릿의 결제금액
 *   `<TableTd>` 와 Modal 의 금액 항목을 걷어냈고, `.data.ts` 에 수치 포맷터도 두지 않았다.
 *   진료비는 진료가 끝난 뒤 확정되므로 **예약 상세**에만 나온다
 * - **컬럼이 7개인 것은 같지만 구성이 다르다** — 진료과·담당의가 들어오고 상품·주문자가 빠졌다
 * - `연락처`는 표가 아니라 Modal 에만 둔다. 전화 접수 중 필요하지만
 *   표에 8열을 만들면 예약일시가 눌린다
 * ====================================================================== */

/**
 * 예약일시가 선택한 기간 안에 드는지.
 *
 * `date` 는 `"YYYY-MM-DD HH:mm"` 형식인데 공백 구분자는 브라우저별 파싱이 갈린다.
 * `T` 로 바꿔 ISO 형태로 만든 뒤 넘긴다. 시작일은 00:00, 종료일은 23:59:59 까지 포함한다
 * (종료일을 그대로 쓰면 그날 오후 예약이 빠진다).
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

export interface ReservationListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function ReservationListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: ReservationListPageProps) {
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<Reservation | null>(null);
  const [target, setTarget] = useState<Reservation | null>(null);

  const filtered = RESERVATIONS.filter((reservation) => {
    const matchStatus = filter === "all" || reservation.status === filter;
    const matchKeyword =
      keyword.trim() === "" ||
      reservation.id.includes(keyword) ||
      reservation.patient.includes(keyword) ||
      reservation.doctor.includes(keyword);
    return matchStatus && matchKeyword && inPeriod(reservation.date, period);
  });

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

  /* 초기화는 **한 곳에서만 정의한다** — 툴바와 빈 상태가 같은 함수를 부른다 */
  const resetFilters = () => {
    setFilter("all");
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
      header={
        <PageHeader
          title="예약 목록"
          badges={
            <Tooltip
              title="예약 목록"
              content="상태·기간·진료과로 예약을 확인하고 확정·취소·노쇼를 처리합니다. 취소 건은 진료 현황 집계에서 제외됩니다."
            >
              <IconButton
                size="small"
                label="도움말"
                icon={<HelpCircle strokeWidth={1.2} aria-hidden />}
              />
            </Tooltip>
          }
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => toast("예약 목록을 엑셀로 내려받았습니다")}
              >
                <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
                내보내기
              </Button>
              <Button onClick={() => toast("예약을 등록했습니다")}>
                <Plus size={16} strokeWidth={1.2} aria-hidden />
                예약 등록
              </Button>
            </>
          }
        />
      }
    >
      {/* 요약 지표 */}
      <section className="grid grid-cols-3 gap-6">
        {STATS.map(
          ({ label, value, unit, delta, up, good, caption, icon: Icon }) => (
            /*
            ⚠️ **아이콘은 `up`(방향), 색은 `good`(좋고 나쁨)** — 다른 축이다.
            내려가면 좋은 지표가 있어서(노쇼율·이탈률·확정 대기), 하나로 겸용하면
            화살표는 ↓인데 색이 빨강으로 나가 화면이 거짓말을 한다.
            비교 기준(`caption`)도 지표마다 다르다 — 데이터가 카드마다 들고 온다.
          */
            <StatTile
              key={label}
              variant="card"
              label={label}
              value={value}
              unit={unit}
              icon={<Icon size={20} strokeWidth={1.2} aria-hidden />}
              caption={caption}
              delta={{ text: delta, up, good }}
            />
          ),
        )}
      </section>

      {/* 예약 테이블 — DataTableShell 이 §7-1 셸 구조를 책임진다 */}
      <DataTableShell
        toolbarStart={
          <SegmentedControl
            items={FILTERS}
            value={filter}
            onValueChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
          />
        }
        toolbarEnd={
          <>
            <DatePicker
              mode="range"
              value={period}
              onChange={setPeriod}
              startPlaceholder="시작일"
              endPlaceholder="종료일"
            />
            <Input
              placeholder="예약번호·환자명·담당의 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
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
            title="조건에 맞는 예약이 없습니다"
            description="필터를 바꾸거나 기간을 다시 선택해 보세요."
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
                총 {filtered.length}건
              </span>
            }
          />
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수. 한 컬럼만 auto 로 두면 여백을 독식한다 */}
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
            <col className="w-[13%]" />
            <col className="w-[12%]" />
            <col className="w-[22%]" />
            <col className="w-[7%]" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>예약번호</TableTh>
              <TableTh>환자</TableTh>
              <TableTh>진료과</TableTh>
              <TableTh>담당의</TableTh>
              <TableTh>상태</TableTh>
              <TableTh>예약일시</TableTh>
              <TableTh align="center">관리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((reservation) => {
              const status = STATUS_META[reservation.status];
              return (
                <TableRow
                  key={reservation.id}
                  clickable
                  onClick={() => setDetail(reservation)}
                >
                  <TableTd>{reservation.id}</TableTd>
                  <TableTd>{reservation.patient}</TableTd>
                  <TableTd>{reservation.department}</TableTd>
                  <TableTd>{reservation.doctor}</TableTd>
                  <TableTd>
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </TableTd>
                  <TableTd>{reservation.date}</TableTd>
                  <TableTd align="center">
                    <div
                      role="presentation"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Dropdown size="compact" placement="bottom-end">
                        <DropdownTrigger>
                          <IconButton
                            size="small"
                            label={reservation.id + " 관리"}
                            icon={
                              <MoreVertical strokeWidth={1.2} aria-hidden />
                            }
                          />
                        </DropdownTrigger>
                        <DropdownMenu>
                          <DropdownItem
                            leftIcon={<Eye size={16} strokeWidth={1.2} />}
                            onClick={() => setDetail(reservation)}
                          >
                            상세 보기
                          </DropdownItem>
                          <DropdownItem
                            leftIcon={
                              <CircleCheck size={16} strokeWidth={1.2} />
                            }
                            onClick={() =>
                              toast(
                                reservation.patient +
                                  " 님의 예약을 확정했습니다",
                              )
                            }
                          >
                            확정 처리
                          </DropdownItem>
                          <DropdownItem
                            tone="critical"
                            leftIcon={<CalendarX size={16} strokeWidth={1.2} />}
                            onClick={() => setTarget(reservation)}
                          >
                            예약 취소
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* 예약 미리보기 — 4항목짜리 빠른 확인용이다 */}
      <Modal open={detail !== null} onClose={() => setDetail(null)}>
        <ModalHeader title="예약 미리보기" description={detail?.id} />
        <ModalBody>
          <InfoList>
            <InfoItem label="환자">{detail?.patient}</InfoItem>
            <InfoItem label="연락처">{detail?.phone}</InfoItem>
            <InfoItem label="진료과">{detail?.department}</InfoItem>
            <InfoItem label="예약일시">{detail?.date}</InfoItem>
          </InfoList>
        </ModalBody>
        <ModalFooter>
          {/*
            이 모달은 빠른 미리보기다 — 진료 항목 표와 수납 내역은 여기 들어가지 않는다.
            전체 정보는 예약 상세(`reservation-detail`)에서 본다.
          */}
          <Button
            size="large"
            variant="secondary"
            onClick={() => {
              setDetail(null);
              onNavSelect("reservation-detail");
            }}
          >
            전체 상세 보기
          </Button>
          <Button
            size="large"
            onClick={() => {
              toast("예약을 확정했습니다");
              setDetail(null);
            }}
          >
            확정 처리
          </Button>
        </ModalFooter>
      </Modal>

      {/* 예약 취소 확인 */}
      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        size="small"
      >
        <ModalHeader
          /* 헤더 X 의 기본 라벨이 "닫기"라 푸터 버튼과 이름이 겹친다 — 따로 붙인다 */
          closeLabel="대화상자 닫기"
          title="예약을 취소할까요?"
          description={target ? target.id + " · " + target.patient : undefined}
        />
        <ModalBody>
          <p className="body-medium text-text-sub">
            취소한 예약은 되돌릴 수 없습니다. 환자에게 취소 안내 문자가
            발송되고, 해당 시간대는 다시 예약을 받을 수 있게 열립니다.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setTarget(null)}
          >
            닫기
          </Button>
          <Button
            variant="critical"
            size="large"
            onClick={() => {
              toast({ message: "예약을 취소했습니다", tone: "critical" });
              setTarget(null);
            }}
          >
            예약 취소
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
