import { useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTableShell,
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
import {
  credit,
  CURRENT_ROUND,
  deduct,
  EXPORT_NAME,
  FILTERS,
  PAGE_SIZE,
  PAYOUT_ON,
  payoutOf,
  SETTLEMENTS,
  STATUS_META,
  SUMMARY_STATS,
  won,
  type Settlement,
  type SettlementStatus,
} from "./SellerSettlementPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S12 셀러 정산 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형
 * 정산 회차별로 셀러 지급액을 확정하고 지급 상태를 진행시키는 정산의 시작점.
 * 신호: `sections` 에 데이터 테이블 + 페이지네이션 + 상태 칩 필터,
 * `components` 에 `Table`·`Pagination` (`docs/screen-templates.md` §2).
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./SellerSettlementPage.data.ts` 에 있다
 *
 * | 갈아끼울 것             | 위치                                           |
 * | ----------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위   | `SellerSettlementPage.data.ts` **전체**        |
 * | 표 컬럼 구성            | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 조회 조건 구성          | "검색조건" 카드                                |
 * | 요약 4값                | 같은 데이터 파일의 `SUMMARY_STATS`             |
 *
 * ## 원본 화면 구성 순서 (그대로 따른다)
 * ```
 * 정산 요약 (원본 `note` 슬롯) — 제목 `YYYY년 M월 정산 요약` · 부제 `지급일 YYYY.MM.DD` · 타일 4장
 * 검색조건 (상태 칩 · 셀러명 검색)     ← 원본 `filter` 는 chip + search 둘뿐이다
 * 목록 카드 [ 총 N건 · 엑셀 다운로드 / 표 / 페이저 ]
 * ```
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * - **요약 타일의 증감(±%)·비교 기준 문구·아이콘.** 원본 타일은 `l`(라벨)·`v`(값)뿐이다.
 *   이전 회차 전체 데이터가 없어 **계산할 수도 없는** 저술값이었다
 * - **행 액션 4종**(`확인요청 발송` · `지급 처리` · `수정 명세 재발송` · `협의 결론 기록`)과
 *   그 확인 모달. 원본 `처리` 컬럼은 상세로 가는 **링크 하나**(`상세`)다
 * - **`정산 대상 N개사` PageHeader 배지** — 원본에서는 요약의 세 번째 항목이다
 * - **`정산 흐름` 도움말 툴팁** — 지어낸 문장이었다. 상태 설명은 원본 `statusTips` 가
 *   갖고 있어 `STATUS_META.description` 으로 들어가고, 고른 상태의 것이 필터 아래 뜬다
 *
 * ## 템플릿(`src/pages/OrderListPage.tsx`)과 갈린 두 곳 (의도된 것)
 * 1. **기간 필터가 없다.** 원본 `filter` 에 `date` 축이 아예 없다.
 *    `date`(회차 마감 일시)는 계약대로 데이터에 두되 미리보기에서만 쓴다 —
 *    쓰지 않는 `DatePicker` 를 세워 두면 "걸려 있는데 아무것도 안 하는 필터"가 된다
 * 2. **표가 가로로 스크롤한다.** 11열이라 `<colgroup>` 을 %가 아니라 px(4px 그리드
 *    유틸)로 준다. 스크롤은 `DataTableShell` 의 표 래퍼(`overflow-auto`) 안에서만
 *    일어난다 — `AppShell` 콘텐츠가 `min-w-0` 이라 페이지 본문은 밀리지 않는다
 *
 * ## 그대로 두는 것 (도메인 무관 · §7-1 실측 규격)
 * `DataTableShell` 셸 구조 · 좌측 기본 정렬(수치만 우측 · 배지만 든 열은 가운데) ·
 * 페이지 범위 클램프 · 행클릭 → Modal(미리보기) 흐름
 * ====================================================================== */

/**
 * 명세서 화면(S15)의 GNB 경로. 이 화면의 **유일한 화면 간 링크**다.
 * 도메인 데이터가 아니라 라우팅 배선이라 뼈대에 둔다.
 */
const STATEMENT_NAV_ID = "/settle-statement";

/**
 * 좌측 고정 2열 (원본 `frozen: !0` — 정산 회차 · 셀러).
 *
 * 폭과 `left` 오프셋이 **짝**이다 — 앞 열의 폭이 다음 열의 오프셋이 된다.
 *   w-32(128) →  left-0 · left-25
 * `<colgroup>` 을 고치면 **여기도 함께 고친다.** 어긋나면 열이 서로 겹쳐 덮는다.
 */
const FROZEN_TH = [
  "sticky left-0 z-1",
  /*
   * 마지막 고정 열만 오른쪽 경계선을 갖는다 — 여기가 "고정 구간의 끝"이라는 표시다.
   * `border-collapse: collapse` 에서는 border 를 셀이 아니라 표가 그려서, 셀이
   * sticky 로 떠 있는 동안 border 만 원래 자리에 남아 함께 스크롤돼 사라진다.
   * 그래서 `::after` 로 그린다 (`Table.tsx` 의 sticky thead 가 쓰는 것과 같은 방식).
   * 배치 기준은 `sticky` 자신이 만든다 — `relative` 를 더하면 position 이 두 번 나온다.
   */
  "sticky left-25 z-1 after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-divide after:content-['']",
];

/**
 * 본문 쪽 고정 열은 배경을 **행에서 물려받는다**(`bg-inherit`).
 * zebra 줄무늬는 `<tr>` 이 칠하는데, 고정 열이 배경 없이 떠 있으면 아래를
 * 지나가는 셀이 비쳐 글자가 겹쳐 보인다.
 */
const FROZEN_TD = FROZEN_TH.map((cls) => cls + " bg-inherit");

export interface SellerSettlementPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function SellerSettlementPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerSettlementPageProps) {
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const [preview, setPreview] = useState<Settlement | null>(null);

  const filtered = SETTLEMENTS.filter((row) => {
    const matchStatus = filter === "all" || row.status === filter;
    const matchKeyword =
      keyword.trim() === "" ||
      row.seller.includes(keyword.trim()) ||
      row.id.includes(keyword.trim());
    return matchStatus && matchKeyword;
  });

  /*
   * 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다(2페이지를 보던 중
   * 1페이지까지만 남는 경우). 그대로 두면 **빈 표**가 그려지므로 마지막 페이지로 당긴다.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /* 초기화는 한 곳에서만 정의한다 — 카드와 빈 상태 두 곳이 부르는데
   * 한쪽만 되돌리면 "초기화했는데 여전히 비어 있음"이 된다 */
  const resetFilters = () => {
    setFilter("all");
    setKeyword("");
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
      header={<PageHeader title="셀러 정산" />}
    >
      {/*
        정산 요약 — 원본 `note` 슬롯. 제목이 **어느 회차의 요약인지** 못박는다.
        표에는 여러 회차가 섞여 있어(최신 회차 + 미종결 이전 회차) 제목이 없으면
        "이 숫자가 무엇의 합인가"를 알 수 없다.
      */}
      <Card>
        <CardHeader>
          <h2 className="heading-medium-bold text-text">
            {CURRENT_ROUND} 정산 요약
          </h2>
          <span className="body-small text-text-sub">지급일 {PAYOUT_ON}</span>
        </CardHeader>
        <CardBody>
          {/*
          거터 12 — **카드 안 항목 묶음**이다(카드 사이 24 와 다른 축).
          묶음 안이 묶음 사이보다 좁아야 하나로 읽힌다. 규격: `DESIGN-dashboard.md` §D4-3
          */}
          <div className="grid grid-cols-4 gap-3">
            {SUMMARY_STATS.map((stat) => (
              /* 고를 수 없는 요약이라 버튼이 아니다 — 상호작용 prop 을 주지 않는다 */
              <StatTile
                key={stat.label}
                compact
                label={stat.label}
                value={stat.value}
                unit={stat.unit}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 검색조건 — 원본 `filter` 는 상태 칩 + 셀러명 검색 둘뿐이다 */}
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
            {/* 그룹 컨트롤은 `group` 이 없으면 접근가능 이름이 아예 없다 (§29-6b) */}
            <FormField label="상태" group className="min-w-0">
              <SegmentedControl
                items={FILTERS}
                value={filter}
                onValueChange={(value) => {
                  setFilter(value);
                  setPage(1);
                }}
              />
            </FormField>
            <FormField label="셀러명" className="flex-1 min-w-0">
              <Input
                placeholder="셀러명 검색"
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setPage(1);
                }}
                leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
              />
            </FormField>
          </div>
          {/*
            상태 설명 — 원본 `statusTips` 문구다. 원본은 상태 칩 옆 `i` 툴팁으로 띄우지만
            마우스를 올려야 보이는 것보다 상시 노출이 낫다. 전체일 때는 고른 상태가 없다.
          */}
          {filter === "all" ? null : (
            <p className="body-small text-text-sub">
              {STATUS_META[filter as SettlementStatus].description}
            </p>
          )}
        </CardBody>
      </Card>

      {/* 목록 — 원본 `ListHead` 의 좌우 슬롯: 총 N건 · 엑셀 다운로드 */}
      <DataTableShell
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        toolbarEnd={
          <Button
            variant="secondary"
            onClick={() =>
              toast(`${EXPORT_NAME}_${filtered.length}건.csv 를 내려받았습니다`)
            }
          >
            <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
            엑셀 다운로드
          </Button>
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
            `table-fixed` 라 폭 지정이 필수다. 11열이라 %가 아니라 px 로 준다 —
            합계가 곧 표 폭이 되고, 그만큼 셸의 표 래퍼가 가로로 스크롤한다.
            ⚠️ 앞 2개는 `FROZEN_TH` 의 left 오프셋과 **짝**이다. 함께 고칠 것.
          */}
          <colgroup>
            <col className="w-25" />
            <col className="w-35" />
            <col className="w-30" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-33" />
            <col className="w-28" />
            <col className="w-30" />
            <col className="w-25" />
            <col className="w-20" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh className={FROZEN_TH[0]}>정산 회차</TableTh>
              <TableTh className={FROZEN_TH[1]}>셀러</TableTh>
              <TableTh>거래액(정가)</TableTh>
              <TableTh>셀러쿠폰</TableTh>
              <TableTh>수수료</TableTh>
              <TableTh>PG수수료</TableTh>
              <TableTh>취소·반품 차감</TableTh>
              <TableTh>안심케어</TableTh>
              <TableTh>지급액</TableTh>
              {/* 배지만 들어가는 열이라 가운데다 (§7-2) */}
              <TableTh align="center">상태</TableTh>
              {/* 버튼이 든 열은 글자 취급이라 좌측이다 */}
              <TableTh>처리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((row) => {
              const status = STATUS_META[row.status];
              return (
                <TableRow
                  key={row.id}
                  clickable
                  onClick={() => setPreview(row)}
                >
                  <TableTd className={FROZEN_TD[0]}>{row.round}</TableTd>
                  <TableTd className={FROZEN_TD[1]}>{row.seller}</TableTd>
                  <TableTd>{won(row.listAmount)}</TableTd>
                  {/* 부호는 데이터가 정한다 — 뼈대는 렌더만 한다 */}
                  <TableTd>{deduct(row.sellerCoupon)}</TableTd>
                  <TableTd>{deduct(row.platformFee)}</TableTd>
                  <TableTd>{deduct(row.pgFee)}</TableTd>
                  <TableTd>{deduct(row.clawback)}</TableTd>
                  <TableTd>{credit(row.careComp)}</TableTd>
                  <TableTd>{won(payoutOf(row))}</TableTd>
                  <TableTd align="center">
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </TableTd>
                  <TableTd>
                    {/*
                      행 전체가 클릭 대상(미리보기)이라 버튼 클릭이 함께 타면
                      같은 모달이 두 번 열린다. 전파를 여기서 끊는다.
                    */}
                    <div
                      role="presentation"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <TextButton onClick={() => setPreview(row)}>
                        상세
                      </TextButton>
                    </div>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        정산 미리보기 — 4항목짜리 빠른 확인용이다.
        제목을 "정산 상세"로 두지 않는다. 금액이 여섯 조각이라 전부 넣으면
        모달이 두 번째 표가 되고, 상세 화면과 이름도 겹친다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader
          title="정산 미리보기"
          description={
            preview ? preview.round + " · " + preview.seller : undefined
          }
        />
        <ModalBody>
          <InfoList>
            <InfoItem label="거래액">
              {preview ? won(preview.listAmount) : ""}
            </InfoItem>
            <InfoItem label="지급액">
              {preview ? won(payoutOf(preview)) : ""}
            </InfoItem>
            <InfoItem label="상태">
              {preview ? STATUS_META[preview.status].label : ""}
            </InfoItem>
            {/* 라벨이 5글자라 기본 폭 80 에 들어간다 — `labelWidth` 를 주지 않는다 */}
            <InfoItem label="회차 마감">{preview?.date}</InfoItem>
          </InfoList>
          <p className="body-small text-text-sub">
            {preview ? STATUS_META[preview.status].description : ""}
          </p>
        </ModalBody>
        <ModalFooter>
          {/*
            푸터는 하나뿐이다 — 이 화면에서 본사가 누를 상태 진행 버튼은 원본에 없다.
            대신 **실재하는 다음 화면**(S15 정산 내역)으로 잇는다.
          */}
          <Button
            size="large"
            variant="secondary"
            onClick={() => {
              setPreview(null);
              onNavSelect(STATEMENT_NAV_ID);
            }}
          >
            명세서 보기
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
