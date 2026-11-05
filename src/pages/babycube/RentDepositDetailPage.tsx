import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Gnb,
  IconButton,
  InfoItem,
  InfoList,
  PageHeader,
  Skeleton,
  Tag,
  TextButton,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import {
  DEPOSIT_STATUS_META,
  ORDER_STATUS_META,
  ymd,
  type DepositRow,
} from "./RentDepositListPage.data";
import {
  CARE_JOINED_NOTE,
  LIST_LABEL,
  LIST_PATH,
  OWNER_LABEL,
  POLICY_NOTES,
  SECTIONS,
  calcBlocksOf,
  findDeposit,
  headlineOf,
  inspectionOf,
  memberPathOf,
  orderPathOf,
  overdueOf,
  periodText,
  procTextOf,
  refundDueNoteOf,
  sellerPathOf,
} from "./RentDepositDetailPage.data";
import { CalcBreakdown } from "./CalcBreakdown";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 보증금 상세 — 조회형 · 뼈대 (원본 v0.4 `rentDepositDetail`)
 *
 * ## 구성
 * ```
 * 보증금 정보 · 정산 계산 · 처리 상태 (조회 전용)     (3구역, 각각 접기)
 * 정산 계산 = 공용 `CalcBreakdown`(보증금 / 차감 / 반환 예정액 · 최대 폭 768 · 정책 안내 상자)
 *            반환 예정액 아래·안내 상자 위에 환급 실패 안내 한 줄(결제사 기간 경과 건만 · 개발 §3-2-8)
 * [목록]                               [취소] [확인]  ← 하단 고정 바
 * ```
 * 보증금 내역 행이 이 화면으로 온다(`/rent-deposit/{처리단위}`). 고치는 값이 없다 —
 * 접기·링크 이동·하단 버튼뿐이다. 처리단위가 바뀌면 `key` 로 처음부터.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./RentDepositDetailPage.data.ts` 에 있다
 * | 갈아끼울 것                   | 위치                                  |
 * | ----------------------------- | ------------------------------------- |
 * | 대상 찾기·구역 제목·문구·링크 | `RentDepositDetailPage.data.ts`       |
 * | 상태 라벨·금액 포맷           | `RentDepositListPage.data.ts`(목록과 같은 표) |
 *
 * ## 원본과 맞춘 것
 * - 하단 [확인]·[취소] — 원본처럼 **둘 다 목록으로 간다**(사용자 결정 2026-11-02 원본 버튼 유지).
 *   버튼 순서는 형제 상세 하단 바 규칙([취소] 보조 → 주 버튼 오른쪽 끝)
 * - 주문번호 → 주문 상세 · 회원 → 회원 상세 · 셀러 → 셀러 상세 링크(원본 `idLink`)
 *
 * ## 원본과 다르게 둔 것
 * - 머리를 그린다(원본은 넘긴 값을 그리지 않는 결함) — 제목 + 부제 + 보증금 상태 배지
 * - 읽는 값은 비활성 입력칸이 아니라 `InfoList`(형제 상세와 같다)
 * ====================================================================== */

export interface RentDepositDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 라벨 폭 — 「보증금 상태」·「상태 변경일」이 기본 80 에서 쪼개진다. 모든 구역이 같은 폭(§30-3) */
const LABEL_WIDTH = 104;

/** 접을 수 있는 구역 한 장 — 형제 상세와 같은 규격 */
function Section({
  title,
  busy,
  dim,
  children,
}: {
  title: string;
  busy: boolean;
  dim: string | undefined;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card variant="soft" aria-busy={busy}>
      <CardHeader
        title={title}
        action={
          <IconButton
            variant="ghost"
            size="small"
            label={`${title} ${open ? "접기" : "펼치기"}`}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            icon={
              open ? (
                <ChevronUp strokeWidth={1.2} aria-hidden />
              ) : (
                <ChevronDown strokeWidth={1.2} aria-hidden />
              )
            }
          />
        }
      />
      {open ? <CardBody className={dim}>{children}</CardBody> : null}
    </Card>
  );
}

function LoadingLines({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="body-medium block w-1/2">
          <Skeleton />
        </span>
      ))}
    </div>
  );
}

const Item = ({ label, children }: { label: string; children: ReactNode }) => (
  <InfoItem label={label} labelWidth={LABEL_WIDTH}>
    {children}
  </InfoItem>
);

export function RentDepositDetailPage(props: RentDepositDetailPageProps) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  /* 경로는 `/rent-deposit/{처리단위}` **한 조각**이어야 한다 */
  const rest = pathname.slice(LIST_PATH.length + 1);
  const row = rest.includes("/")
    ? undefined
    : findDeposit(lastPathSegment(pathname));

  if (!row) {
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
        header={<PageHeader title="보증금 상세" />}
      >
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<Wallet strokeWidth={1.2} aria-hidden />}
              title="찾을 수 없는 보증금 내역입니다"
              description="주소가 잘못되었거나 보증금이 없는 건일 수 있습니다."
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                {LIST_LABEL}으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  /* 처리단위마다 처음부터 — 접힘이 다음 건에 묻어가지 않게 */
  return <RentDepositDetailBody key={row.id} row={row} {...props} />;
}

function RentDepositDetailBody({
  row,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: RentDepositDetailPageProps & { row: DepositRow }) {
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const depositMeta = DEPOSIT_STATUS_META[row.status];
  const orderMeta = ORDER_STATUS_META[row.orderStatus];
  const inspection = inspectionOf(row);
  const overdue = overdueOf(row);
  const sellerPath = sellerPathOf(row);
  const refundDue = refundDueNoteOf(row.order);
  const toList = () => onNavSelect(LIST_PATH);

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
          title="보증금 상세"
          description={headlineOf(row)}
          badges={
            <Tag tone={depositMeta.tone} dot>
              {depositMeta.cellLabel}
            </Tag>
          }
        />
      }
    >
      <Section title={SECTIONS.info} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={8} />
        ) : (
          <InfoList>
            <Item label="주문번호">
              <TextButton onClick={() => onNavSelect(orderPathOf(row))}>
                {row.orderNo}
              </TextButton>
            </Item>
            <Item label="회원">
              <TextButton onClick={() => onNavSelect(memberPathOf(row))}>
                {row.member}
              </TextButton>
            </Item>
            <Item label="담당">
              <span className="flex items-center gap-2">
                {/* 담당은 분류라 상태색을 쓰지 않는다 — 중립색 */}
                <Tag size="small">{OWNER_LABEL[row.sellerKind]}</Tag>
                {row.sellerKind === "seller" &&
                  (sellerPath ? (
                    <TextButton onClick={() => onNavSelect(sellerPath)}>
                      {row.seller}
                    </TextButton>
                  ) : (
                    row.seller
                  ))}
              </span>
            </Item>
            <Item label="상품">{row.product}</Item>
            <Item label="이용 기간">{periodText(row.period)}</Item>
            <Item label="안심케어">
              {row.care ? (
                <span className="flex items-center gap-2">
                  <Tag size="small">가입</Tag>
                  {CARE_JOINED_NOTE}
                </span>
              ) : (
                <span className="text-text-minimal">미가입</span>
              )}
            </Item>
            {overdue && (
              <Item label="연체 경과">
                <span className="body-medium-bold text-text-warning">
                  D+{overdue.days}
                </span>{" "}
                (반납 예정일 {overdue.due})
              </Item>
            )}
            <Item label="검수 판정">
              {inspection ? (
                <Tag tone={inspection.tone} size="small">
                  {inspection.label}
                </Tag>
              ) : (
                <span className="text-text-minimal">검수 전</span>
              )}
            </Item>
            <Item label="주문 상태">
              <Tag tone={orderMeta.tone} dot size="small">
                {orderMeta.label}
              </Tag>
            </Item>
            <Item label="보증금 상태">
              <Tag tone={depositMeta.tone} dot size="small">
                {depositMeta.cellLabel}
              </Tag>
            </Item>
            <Item label="상태 변경일">{ymd(row.changedAt)}</Item>
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.calc} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={3} />
        ) : (
          /* 정산 명세와 같은 계산 내역 부품 — 보증금 / 차감 / 반환 예정액 + 정책 안내 상자 */
          <CalcBreakdown blocks={calcBlocksOf(row)} notes={POLICY_NOTES}>
            {/* 환급이 결제사 기간 경과로 실패한 건만 — 반환 예정액 아래·안내 상자 위(개발 §3-2-8) */}
            {refundDue ? (
              <p className="body-small text-text-warning">{refundDue}</p>
            ) : null}
          </CalcBreakdown>
        )}
      </Section>

      <Section title={SECTIONS.proc} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={1} />
        ) : (
          <p className="body-medium text-text-sub">{procTextOf(row)}</p>
        )}
      </Section>

      {/* 하단 바 — 원본 [목록] · [확인] · [취소]. 셋 다 목록으로 간다(원본 그대로) */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={toList}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={toList}>
              취소
            </Button>
            <Button onClick={toList}>확인</Button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
