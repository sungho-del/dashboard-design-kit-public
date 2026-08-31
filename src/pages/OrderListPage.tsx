import { useState } from "react";
import {
  ArrowDownToLine,
  Copy,
  HelpCircle,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
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
  StatGrid,
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
  ORDERS,
  PAGE_SIZE,
  STATS,
  STATUS_META,
  won,
  type Order,
} from "./OrderListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "./gnbSections";

/* =========================================================================
 * 목록형 화면 템플릿 — 뼈대
 *
 * ## 화면 유형: 목록형
 * 데이터 집합을 표로 보여주고 필터·검색·기간으로 좁힌 뒤,
 * 행을 열어 상세를 확인하거나 개별 액션을 수행한다.
 * 관리자 화면에서 가장 자주 쓰이는 형태다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./OrderListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것          | 위치                                                |
 * | -------------------- | --------------------------------------------------- |
 * | 데이터·타입·라벨·단위 | `OrderListPage.data.ts` **전체**                    |
 * | 표 컬럼 구성          | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀       |
 * | 툴바 필터 구성        | `toolbarStart` / `toolbarEnd` 슬롯                  |
 * | 행 액션               | `Dropdown` 항목 3개                                 |
 * | 화면 제목·도움말      | `PageHeader` 의 `title` · `badges`                  |
 *
 * ## 그대로 두는 것 (도메인 무관 · §7-1 실측 규격)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 셀 좌측 정렬 ·
 * 페이지 범위 클램프 · `inPeriod` 날짜 필터 · 행클릭→Modal→Modal 확인 흐름
 *
 * > **네 화면 중 근거가 가장 강하다.** §7-1 테이블 셸 구조가 여기서 확정돼
 * > `DataTableShell` 로 추출됐고, 셀 정렬·colgroup 비율 배분도 이 화면에서 정해졌다.
 * ====================================================================== */

/**
 * 주문일시가 선택한 기간 안에 드는지.
 *
 * `date` 는 `"YYYY-MM-DD HH:mm"` 형식인데 공백 구분자는 브라우저별 파싱이 갈린다.
 * `T` 로 바꿔 ISO 형태로 만든 뒤 넘긴다. 시작일은 00:00, 종료일은 23:59:59 까지 포함한다
 * (종료일을 그대로 쓰면 그날 낮에 들어온 주문이 빠진다).
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

export interface OrderListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function OrderListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: OrderListPageProps) {
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<Order | null>(null);
  const [target, setTarget] = useState<Order | null>(null);

  /*
   * 상태를 **뺀** 나머지 조건으로 좁힌 집합. 상태별 건수를 여기서 센다.
   * 이미 상태로 좁힌 결과에서 세면 "결제완료"를 고르는 순간 나머지가 전부 0 이 되어
   * 대시가 비교할 것을 잃는다 — 건수를 보여주는 이유가 통째로 사라진다.
   */
  const scoped = ORDERS.filter((order) => {
    const matchKeyword =
      keyword.trim() === "" ||
      order.product.includes(keyword) ||
      order.id.includes(keyword) ||
      order.customer.includes(keyword);
    return matchKeyword && inPeriod(order.date, period);
  });

  const filtered = scoped.filter(
    (order) => filter === "all" || order.status === filter,
  );

  /* 건수 대시 = 필터. 라벨은 `FILTERS`, 수치는 위 `scoped` 에서 센다 */
  const dash = FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count: String(
      item.value === "all"
        ? scoped.length
        : scoped.filter((order) => order.status === item.value).length,
    ),
    unit: "건",
  }));

  const selectStatus = (value: string) => {
    setFilter(value);
    setPage(1);
  };

  /*
   * 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다(3페이지를 보던 중 2페이지까지만
   * 남는 경우). 그대로 두면 **빈 표**가 그려지므로 마지막 페이지로 당긴다.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /*
   * 초기화는 **한 곳에서만 정의한다.** 툴바와 빈 상태에 각각 쓰다 보니
   * 한쪽만 기간을 되돌리지 않아, 기간 필터를 켜는 순간 "초기화했는데 여전히 비어 있음"이
   * 되는 상태였다. 되돌릴 항목이 늘어도 여기만 고치면 된다.
   */
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
          title="주문 관리"
          badges={
            <Tooltip
              title="주문 관리"
              content="결제·배송 상태별로 주문을 확인하고 처리합니다. 취소 건은 정산에서 제외됩니다."
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
                onClick={() => toast("엑셀 파일을 내려받았습니다")}
              >
                <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
                내보내기
              </Button>
              <Button onClick={() => toast("주문을 등록했습니다")}>
                <Plus size={16} strokeWidth={1.2} aria-hidden />
                주문 등록
              </Button>
            </>
          }
        />
      }
    >
      {/* 통계 요약 */}
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

      {/*
        건수 대시 = 필터. 상자의 시각 규격 · 선택/hover 축 분리 · 접근가능 이름 조립 ·
        툴팁 분기는 전부 `StatGrid` 가 맡는다 (docs/DESIGN-dashboard.md §D4).
        여기서는 **무엇을 세는지**만 말한다.

        ⚠️ 상태 축의 컨트롤은 **이것 하나뿐이다.** 예전에는 툴바에 `SegmentedControl` 을
        두었는데, 건수 대시와 함께 두면 **한 축에 컨트롤이 둘**이 되어 어느 쪽이 참인지
        읽는 사람이 판단해야 한다. 세그먼트는 기간·단위처럼 **건수가 없는 축**에 쓴다.
      */}
      <Card>
        <CardBody>
          <StatGrid
            items={dash}
            selected={filter}
            onSelect={selectStatus}
            ariaLabel="주문 상태"
            columns={4}
          />
        </CardBody>
      </Card>

      {/* 주문 목록 — DataTableShell 이 §7-1 셸 구조를 책임진다 */}
      <DataTableShell
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
              placeholder="주문번호·상품·주문자 검색"
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
            title="조건에 맞는 주문이 없습니다"
            description="검색어나 기간을 바꿔보세요."
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
            <col className="w-[16%]" />
            <col className="w-[24%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[17%]" />
            <col className="w-[7%]" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>주문번호</TableTh>
              <TableTh>상품</TableTh>
              <TableTh>주문자</TableTh>
              <TableTh>상태</TableTh>
              <TableTh>결제금액</TableTh>
              <TableTh>주문일시</TableTh>
              <TableTh align="center">관리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((order) => {
              const status = STATUS_META[order.status];
              return (
                <TableRow
                  key={order.id}
                  clickable
                  onClick={() => setDetail(order)}
                >
                  <TableTd>{order.id}</TableTd>
                  <TableTd>{order.product}</TableTd>
                  <TableTd>{order.customer}</TableTd>
                  <TableTd>
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </TableTd>
                  <TableTd>{won(order.amount)}</TableTd>
                  <TableTd>{order.date}</TableTd>
                  <TableTd align="center">
                    <div
                      role="presentation"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Dropdown size="compact" placement="bottom-end">
                        <DropdownTrigger>
                          <IconButton
                            size="small"
                            label={order.id + " 관리"}
                            icon={
                              <MoreVertical strokeWidth={1.2} aria-hidden />
                            }
                          />
                        </DropdownTrigger>
                        <DropdownMenu>
                          <DropdownItem
                            leftIcon={<Pencil size={16} strokeWidth={1.2} />}
                            onClick={() => setDetail(order)}
                          >
                            상세 보기
                          </DropdownItem>
                          <DropdownItem
                            leftIcon={<Copy size={16} strokeWidth={1.2} />}
                            onClick={() => toast("주문번호를 복사했습니다")}
                          >
                            번호 복사
                          </DropdownItem>
                          <DropdownItem
                            tone="critical"
                            leftIcon={<Trash2 size={16} strokeWidth={1.2} />}
                            onClick={() => setTarget(order)}
                          >
                            주문 취소
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

      {/*
        주문 미리보기 — 4항목짜리 빠른 확인용이다.
        제목을 "주문 상세"로 두지 않는다. 상세형 화면(`OrderDetailPage`)의 제목이 이미 "주문 상세"라
        같은 이름의 화면이 둘이 되고, 푸터의 "전체 상세 보기"가 어디로 가는지도 흐려진다.
      */}
      <Modal open={detail !== null} onClose={() => setDetail(null)}>
        <ModalHeader title="주문 미리보기" description={detail?.id} />
        <ModalBody>
          {/*
            원래 여기서 dl/dt/dd 를 손으로 조립했는데 실측과 어긋나 있었다
            (gap 16/16 · items-start · 배경 없음 → 실측은 8/10 · items-center · surface-sub 박스).
            `InfoList` 로 교체해 §30 규격을 한 곳에서 지키게 했다.
          */}
          <InfoList>
            <InfoItem label="상품">{detail?.product}</InfoItem>
            <InfoItem label="주문자">{detail?.customer}</InfoItem>
            <InfoItem label="결제금액">
              {detail ? won(detail.amount) : ""}
            </InfoItem>
            <InfoItem label="주문일시">{detail?.date}</InfoItem>
          </InfoList>
        </ModalBody>
        <ModalFooter>
          {/* 이 모달은 빠른 미리보기다 — 전체 정보는 상세 페이지에서 본다 */}
          <Button
            size="large"
            variant="secondary"
            onClick={() => {
              setDetail(null);
              onNavSelect("order-detail");
            }}
          >
            전체 상세 보기
          </Button>
          <Button
            size="large"
            onClick={() => {
              toast("배송 처리했습니다");
              setDetail(null);
            }}
          >
            배송 처리
          </Button>
        </ModalFooter>
      </Modal>

      {/* 주문 취소 확인 */}
      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        size="small"
      >
        <ModalHeader
          /*
            헤더 X 의 기본 라벨이 "닫기"인데 푸터에도 "닫기" 버튼이 있어
            **접근가능 이름이 같은 버튼이 한 대화상자에 둘** 있었다.
            스크린리더가 같은 이름을 두 번 읽고 어느 쪽인지 구분되지 않는다.
          */
          closeLabel="대화상자 닫기"
          title="주문을 취소할까요?"
          description={target ? target.id + " · " + target.product : undefined}
        />
        <ModalBody>
          <p className="body-medium text-text-sub">
            취소한 주문은 되돌릴 수 없고, 결제 금액은 영업일 기준 3일 내
            환불됩니다.
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
              toast({ message: "주문을 취소했습니다", tone: "critical" });
              setTarget(null);
            }}
          >
            주문 취소
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
