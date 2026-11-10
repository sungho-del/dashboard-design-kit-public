import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ReceiptText } from "lucide-react";
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
  navigate,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import { CalcBreakdown } from "./CalcBreakdown";
import { PAYMENT_STATUS_META } from "./MemberDetailPage.data";
import {
  COPY,
  LIST_PATH,
  SECTIONS,
  findPayment,
  headlineOf,
  memberPathOf,
  paymentPathOf,
  rentPathOf,
  summaryBlocksOf,
  type Payment,
} from "./OrderPaymentDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 결제 상세 — 조회형 · 뼈대 (develop `OrderDetailScreen` + 부록 A)
 *
 * ## 구성
 * ```
 * 주문 정보 · 결제 요약        (2구역, 각각 접기)
 * [목록]                       ← 하단 고정 바 → 주문 목록
 * ```
 * 주문 정보 = 주문번호 · 회원(→ 회원 상세) · 결제일시 · 결제수단 · 부분 취소·반품 · 결제상태 ·
 * (연장 결제 주문만) 렌트 연장 — 원 주문(→ 그 결제 상세) · 대여 건(→ 대여 상세).
 * 결제 요약 = 공용 `CalcBreakdown`(판매 합계 · 렌탈료 합계 · 보증금 · 결제 합계).
 * 결제상태 안내 문단 · 「안내」 구획은 부록 A C26 · C28 로 없다.
 *
 * ## 퍼블 범위
 * 고치는 값이 없다 — 접기·링크 이동·[목록]뿐. 주문번호가 바뀌면 `key` 로 처음부터.
 * 번호 없이 들어오면(`/order-detail/`) 예시 건을 그리지 않고 주문 목록으로 보낸다(부록 A B10 — 주문 상세와 같은 처리).
 * 없는 번호·조각 둘은 「찾을 수 없음」.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./OrderPaymentDetailPage.data.ts` 에 있다
 * 결제상태 라벨·색은 회원 상세 결제 내역과 같은 표(`PAYMENT_STATUS_META`)다.
 * ====================================================================== */

export interface OrderPaymentDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 라벨 폭 — 「부분 취소·반품」이 기본 80 에서 쪼개진다. 형제 상세(보증금 상세)와 같은 104 */
const LABEL_WIDTH = 104;

const PREFIX = "/order-detail/";

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

export function OrderPaymentDetailPage(props: OrderPaymentDetailPageProps) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  /* 경로는 `/order-detail/{주문번호}` **한 조각**이어야 한다 */
  const rest = pathname.slice(PREFIX.length);
  const blank = rest === "";
  useEffect(() => {
    if (blank) navigate(LIST_PATH, { replace: true });
  }, [blank]);
  const payment = rest.includes("/")
    ? undefined
    : findPayment(lastPathSegment(pathname));

  if (blank) return null;
  if (!payment) {
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
        header={<PageHeader title="결제 상세" />}
      >
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<ReceiptText strokeWidth={1.2} aria-hidden />}
              title={COPY.notFoundTitle}
              description={COPY.notFoundDescription}
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                주문 목록으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  /* 주문번호마다 처음부터 — 접힘이 다음 건(원 주문 링크)에 묻어가지 않게 */
  return (
    <OrderPaymentDetailBody
      key={payment.orderNo}
      payment={payment}
      {...props}
    />
  );
}

function OrderPaymentDetailBody({
  payment,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: OrderPaymentDetailPageProps & { payment: Payment }) {
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";
  const meta = PAYMENT_STATUS_META[payment.status];
  const { extension } = payment;

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
          title="결제 상세"
          description={headlineOf(payment)}
          badges={
            <Tag tone={meta.tone} dot>
              {meta.label}
            </Tag>
          }
        />
      }
    >
      <Section title={SECTIONS.info} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={6} />
        ) : (
          <InfoList>
            <Item label="주문번호">
              <span className="body-medium-bold tabular-nums">
                {payment.orderNo}
              </span>
            </Item>
            <Item label="회원">
              <TextButton onClick={() => onNavSelect(memberPathOf(payment))}>
                {payment.memberName}
              </TextButton>
            </Item>
            <Item label="결제일시">
              <span className="tabular-nums">{payment.paidAt}</span>
            </Item>
            <Item label="결제수단">{payment.payMethod}</Item>
            <Item label="부분 취소·반품">
              {payment.claimedCount > 0 ? (
                <Tag tone="warning" size="small">
                  {COPY.claimed(payment.unitCount, payment.claimedCount)}
                </Tag>
              ) : (
                <span className="text-text-minimal">{COPY.noClaim}</span>
              )}
            </Item>
            <Item label="결제상태">
              <Tag tone={meta.tone} dot size="small">
                {meta.label}
              </Tag>
            </Item>
            {/* 연장 결제 주문만 — 처리단위 0건이 판매로 읽히지 않게 무엇의 결제인지 밝힌다(부록 A B15) */}
            {extension ? (
              <Item label="렌트 연장">
                <span>
                  {COPY.extensionHead(extension.seq)}{" "}
                  <TextButton
                    onClick={() =>
                      onNavSelect(paymentPathOf(extension.orderNo))
                    }
                  >
                    {extension.orderNo}
                  </TextButton>
                  {" · "}
                  {COPY.extensionUnit}{" "}
                  <TextButton
                    onClick={() => onNavSelect(rentPathOf(extension.unitId))}
                  >
                    {extension.unitId}
                  </TextButton>
                </span>
              </Item>
            ) : null}
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.summary} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={4} />
        ) : (
          <CalcBreakdown blocks={summaryBlocksOf(payment)} />
        )}
      </Section>

      {/* 하단 바 — 조회 전용이라 [목록] 하나뿐이다(develop `noSave`) */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
            목록
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
