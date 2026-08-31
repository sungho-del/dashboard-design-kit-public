import { useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  DataTableShell,
  EmptyState,
  Gnb,
  InfoItem,
  InfoList,
  Modal,
  ModalBody,
  ModalHeader,
  PageHeader,
  Pagination,
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
} from "../../components/ui";
import {
  COUPONS,
  COUPON_UNIT,
  DASHES,
  HQ_LABEL,
  PAGE_SIZE,
  STATUS_META,
  conditionText,
  couponStatus,
  discountParts,
  discountText,
  num,
  periodParts,
  periodText,
  ymd,
  type Coupon,
  type CouponStatus,
} from "./CouponListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S17 쿠폰 관리 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형 (`docs/screen-templates.md` §3-1)
 * 본사·셀러가 발행한 쿠폰을 **상태로만** 좁혀 보는 화면이다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./CouponListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `CouponListPage.data.ts` **전체**              |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 상태 대시 구성         | `DASHES` (데이터 층)                           |
 * | 화면 제목·액션         | `PageHeader` · 툴바의 엑셀 다운로드            |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 페이지 범위 클램프 ·
 * 대시 토글(같은 카드를 다시 누르면 해제) · 쿠폰명 클릭 → 미리보기 모달
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 원본 페이지 컴포넌트는 공용 목록 셸(`20013`)에 `filter: c` 를 넘기는데
 * 바로 윗줄이 `c = {}` 다. **검색 조건 축이 하나도 없다** —
 * 접이식 검색조건 박스 · 발행일 기간 · 빠른 기간 프리셋 · 할인 유형 체크박스 ·
 * 발행 주체 라디오 · 검색어 · 초기화가 전부 발명이라 지웠다.
 * 좁히는 수단은 상태 대시(원본 `StatDash`) 하나뿐이다.
 *
 * 모달 푸터의 `쿠폰 코드 복사`도 없다 — 원본 쿠폰 레코드에 **코드 필드가 없다.**
 * 행 전체 클릭도 없다 — 원본에서 링크는 쿠폰명 셀 하나다(`linkish`).
 * `PageHeader` 설명문도 없다 — 원본 어드민에 페이지 설명문이 없다.
 * ====================================================================== */

export interface CouponListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function CouponListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: CouponListPageProps) {
  const { toast } = useToast();

  /** 선택된 상태 대시. 빈 문자열이면 전체다(원본 `defaultStat: ""`) */
  const [stat, setStat] = useState<CouponStatus | "">("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Coupon | null>(null);

  const filtered =
    stat === ""
      ? COUPONS
      : COUPONS.filter((item) => couponStatus(item) === stat);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /**
   * 대시의 건수는 **전체에서 센다.** 좁힌 결과에서 세면 고른 카드만 남고
   * 나머지가 0 이 되어 "다음으로 무엇을 볼 수 있나"가 화면에서 사라진다.
   */
  const countOf = (value: CouponStatus) =>
    COUPONS.filter((item) => couponStatus(item) === value).length;

  /** 같은 카드를 다시 누르면 해제 — 이 화면에는 `전체` 카드도 초기화 버튼도 없다 */
  const selectStat = (value: CouponStatus) => {
    setStat((current) => (current === value ? "" : value));
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
      header={<PageHeader title="쿠폰 관리" />}
    >
      {/*
        상태 대시 — 원본 `StatDash`. 건수를 보여주면서 그 자체가 상태 필터다.
        흰 카드(그룹) 안에 연한 그레이 상자(항목) 넷이 들어간다.
        ⚠️ 증감(±)·비교 기준은 두지 않는다 — 원본 카드는 `{ value, label, count }` 뿐이다.
      */}
      <Card>
        <CardBody>
          {/*
            건수 대시 = 필터. 상자의 시각 규격 · 선택/hover 축 분리 · 접근가능 이름
            조립 · 툴팁 분기는 전부 `StatGrid` 가 맡는다 (docs/DESIGN-dashboard.md §D4).
            여기서는 **무엇을 세는지**만 말한다.
          */}
          <StatGrid
            items={DASHES.map((value) => ({
              value,
              label: STATUS_META[value].label,
              count: num(countOf(value)),
              unit: COUPON_UNIT,
            }))}
            selected={stat}
            onSelect={(value) => selectStat(value as CouponStatus)}
            ariaLabel="쿠폰 상태"
            columns={4}
          />
        </CardBody>
      </Card>

      {/* 쿠폰 목록 */}
      <DataTableShell
        toolbarStart={
          <>
            <span className="heading-medium-bold text-text">쿠폰 목록</span>
            <span className="body-medium text-text-sub">
              총 {filtered.length}
              {COUPON_UNIT}
            </span>
          </>
        }
        toolbarEnd={
          /* 원본 `toolsLeft` 는 엑셀 다운로드 하나뿐이다 — 등록 버튼이 없다 */
          <Button
            variant="secondary"
            onClick={() =>
              toast(
                `조회 결과 ${filtered.length}${COUPON_UNIT}을 내려받았습니다`,
              )
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
            title="해당 상태의 쿠폰이 없습니다"
            description="다른 상태 카드를 눌러 다시 조회해 주세요."
          />
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수. 한 컬럼만 auto 로 두면 여백을 독식한다 — 합 100% */}
          <colgroup>
            <col className="w-28" />
            <col className="w-50" />
            <col className="w-40" />
            <col className="w-33" />
            <col className="w-45" />
            <col className="w-28" />
            <col className="w-23" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>셀러명</TableTh>
              <TableTh>쿠폰명</TableTh>
              <TableTh>내용</TableTh>
              <TableTh>조건</TableTh>
              <TableTh>기간</TableTh>
              <TableTh>발행일</TableTh>
              {/* 배지만 들어가는 열 — §7-2 가운데 정렬 */}
              <TableTh align="center">상태</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((coupon) => {
              const discount = discountParts(coupon);
              const condition = conditionText(coupon);
              const period = periodParts(coupon);
              const meta = STATUS_META[couponStatus(coupon)];
              return (
                <TableRow key={coupon.id}>
                  {/* 본사↔셀러는 대등한 분류라 배지로 칠하지 않는다 (§3-1) */}
                  <TableTd>{coupon.seller ?? HQ_LABEL}</TableTd>
                  <TableTd>
                    {/* 원본에서 링크는 이 셀 하나다 — 행 전체는 눌리지 않는다 */}
                    <TextButton onClick={() => setPreview(coupon)}>
                      {coupon.name}
                    </TextButton>
                  </TableTd>
                  {/* 최대 할인 한도는 부가 정보라 농도를 낮춘다(원본 `muted`) */}
                  <TableTd>
                    {discount.main}
                    {discount.note !== null && (
                      <>
                        {" "}
                        <span className="text-text-minimal">
                          {discount.note}
                        </span>
                      </>
                    )}
                  </TableTd>
                  {/*
                    "조건 없음"·"기한 없음"·"상시"는 값이 빠진 게 아니라 **의미 있는 상태**다.
                    지우지 않고 글자 농도만 낮춰 실제 값과 구별한다.
                  */}
                  <TableTd>
                    <span
                      className={
                        condition.unset ? "text-text-minimal" : "text-text"
                      }
                    >
                      {condition.text}
                    </span>
                  </TableTd>
                  <TableTd>
                    {period.lead}
                    <span
                      className={
                        period.tailMuted ? "text-text-minimal" : "text-text"
                      }
                    >
                      {period.tail}
                    </span>
                  </TableTd>
                  <TableTd>{ymd(coupon.date)}</TableTd>
                  <TableTd align="center">
                    <Tag tone={meta.tone} dot size="small">
                      {meta.label}
                    </Tag>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        쿠폰 미리보기 — 표에 있는 값을 한 자리에 모아 보는 빠른 확인용이다.
        기획서 S17 에도 원본에도 쿠폰 상세 화면이 없어 **푸터 액션을 두지 않는다** —
        남는 버튼은 모달을 닫는 것뿐이다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader
          title="쿠폰 미리보기"
          description={
            preview && (
              <span className="flex flex-wrap items-center gap-2">
                {preview.name}
                <Tag
                  tone={STATUS_META[couponStatus(preview)].tone}
                  dot
                  size="small"
                >
                  {STATUS_META[couponStatus(preview)].label}
                </Tag>
              </span>
            )
          }
        />
        <ModalBody>
          <InfoList>
            <InfoItem label="셀러명">
              {preview ? (preview.seller ?? HQ_LABEL) : ""}
            </InfoItem>
            <InfoItem label="내용">
              {preview ? discountText(preview) : ""}
            </InfoItem>
            <InfoItem label="조건">
              {preview ? conditionText(preview).text : ""}
            </InfoItem>
            <InfoItem label="기간">
              {preview ? periodText(preview) : ""}
            </InfoItem>
            <InfoItem label="발행일">
              {preview ? ymd(preview.date) : ""}
            </InfoItem>
          </InfoList>
        </ModalBody>
      </Modal>
    </AppShell>
  );
}
