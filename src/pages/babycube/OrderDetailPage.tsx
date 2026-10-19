import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  EmptyState,
  Gnb,
  IconButton,
  InfoItem,
  InfoList,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
} from "../../components/ui";
import { cn } from "../../lib/cn";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import { STATUS_META, won, type Order } from "./OrderListPage.data";
import {
  DEPOSIT_STATUS_META,
  NONE,
  SECTIONS,
  UNREGISTERED,
  delayReasonOf,
  depositStatusOf,
  feeText,
  findOrder,
  headlineOf,
  historyOf,
  isParcel,
  paidAtText,
  placeOf,
  reachedAt,
  stageTextOf,
  stamp,
  statementOf,
  statementTitleOf,
  titleOf,
} from "./OrderDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 주문 상세 (BO-ORD-002) — 조회형 · 뼈대
 *
 * ## 구성 — 원본 v0.4 `hqOrderDetailPage` (본사 조회 전용)
 * ```
 * 주문정보 [상세보기] · 상품정보 · 배송정보 · 배송지 정보 · 주문 처리 이력   (5구역, 각각 접기)
 * [목록]                                                                    ← 하단 고정 바
 * ```
 * 주문 목록의 주문번호가 이 화면으로 온다(`/orders-all/{처리단위}`). 렌트·판매는 한 화면에서 갈린다 —
 * 렌트만 렌트일·보증금·회수 배송비·대여 시작일이, 판매만 수량·구매확정일이 있다.
 *
 * ## 퍼블 범위
 * 고치는 값이 없다 — 접기·명세 팝업·[목록] 이동뿐이다. 처리단위가 바뀌면 `key` 로 처음부터.
 *
 * ## 원본과 다르게 둔 곳
 * - 머리: 원본은 상단 바 제목만(UI-287). 다른 상세처럼 제목 + 주문번호·처리단위·상품·판매자 + 상태 배지
 * - 읽는 값은 비활성 입력칸이 아니라 `InfoList`(회원 상세와 같다). 원본의 2열 짝은 한 줄씩 편다
 * - 원본 결함은 의도대로 고쳤다 — `.data.ts` 머리 주석(처리 이력·시각·방문/공항·명세 금액·배지)
 * - 클레임 건은 처리 이력 끝에 클레임 상태 한 줄(원본은 주문 목록에서 들어오면 안 보인다)
 * - 브랜드는 상품 샘플에 없어 `-` 다(원본 행은 남긴다)
 * ====================================================================== */

export interface OrderDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 목록 경로 — 돌아가는 곳이자, 없는 주문일 때 돌려보내는 곳 */
const LIST_PATH = "/orders-all";

/**
 * 라벨 폭 — 가장 긴 라벨(「보증금 (고정액)」·「수령인 연락처」)이 기본 80 에서 두 줄로 쪼개진다.
 * §30-3 대로 **모든 블록이 같은 폭**을 쓴다 — 구역마다 다르면 값 시작선이 어긋난다.
 */
const LABEL_WIDTH = 104;

/** 접을 수 있는 구역 한 장 — 회원 상세와 같은 규격. 열림은 구역이 쥔다(고치는 값이 없다) */
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

/** 한 줄 — 라벨 폭은 화면 전체가 같다 */
const Item = ({ label, children }: { label: string; children: ReactNode }) => (
  <InfoItem label={label} labelWidth={LABEL_WIDTH}>
    {children}
  </InfoItem>
);

export function OrderDetailPage(props: OrderDetailPageProps) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  /* 경로는 `/orders-all/{처리단위}` **한 조각**이어야 한다 */
  const rest = pathname.slice(LIST_PATH.length + 1);
  const order = rest.includes("/")
    ? undefined
    : findOrder(lastPathSegment(pathname));

  if (!order) {
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
        header={<PageHeader title="주문 상세" />}
      >
        <Card variant="soft">
          <CardBody>
            {/* 표가 아니라 **화면 전체가 없는 것**이다 — §16 의 `page` 가 그 자리다(다른 상세와 같다) */}
            <EmptyState
              size="page"
              icon={<ShoppingCart strokeWidth={1.2} aria-hidden />}
              title="찾을 수 없는 주문입니다"
              description="주소가 잘못되었거나 삭제된 주문일 수 있습니다."
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

  /* 처리단위마다 처음부터 — 접힘·열린 명세가 다음 주문에 묻어가지 않게 */
  return <OrderDetailBody key={order.id} order={order} {...props} />;
}

function OrderDetailBody({
  order,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: OrderDetailPageProps & { order: Order }) {
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";
  const [statementOpen, setStatementOpen] = useState(false);

  const rent = order.type === "rent";
  const parcel = isParcel(order);
  const meta = STATUS_META[order.status];
  const deposit = DEPOSIT_STATUS_META[depositStatusOf(order)];
  const history = historyOf(order);

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
          title={titleOf(order)}
          description={headlineOf(order)}
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
          <>
            <InfoList>
              <Item label="주문번호">
                <span className="body-medium-bold">{order.orderNo}</span>
              </Item>
              <Item label="결제일시">{paidAtText(order)}</Item>
              <Item label="결제수단">{order.payMethod}</Item>
              <Item label="구매자명">{order.buyerName}</Item>
              <Item label="구매자 ID">{order.buyerId}</Item>
              <Item label="연락처">{order.buyerPhone}</Item>
            </InfoList>
            {/* 원본 [상세보기] — 결제 금액이 어떻게 나왔는지 명세 팝업으로 */}
            <div>
              <Button
                variant="secondary"
                onClick={() => setStatementOpen(true)}
              >
                상세보기
              </Button>
            </div>
          </>
        )}
      </Section>

      <Section title={SECTIONS.product} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={6} />
        ) : (
          <InfoList>
            <Item label="상품명">
              <span className="body-medium-bold">{order.productName}</span>
            </Item>
            <Item label="상품코드">{order.productCode}</Item>
            <Item label="브랜드">{NONE}</Item>
            <Item label="성장단계">{stageTextOf(order)}</Item>
            {/* 본사는 조회 전용 — 배지만(원본) */}
            <Item label="상품주문상태">
              <Tag tone={meta.tone} dot size="small">
                {meta.label}
              </Tag>
            </Item>
            {rent ? (
              <>
                <Item label="렌트일">{order.rentDays}일</Item>
                <Item label="보증금 (고정액)">{won(order.deposit ?? 0)}</Item>
                <Item label="보증금 상태">
                  <Tag tone={deposit.tone} size="small">
                    {deposit.label}
                  </Tag>
                </Item>
              </>
            ) : (
              <Item label="수량">{order.qty}개</Item>
            )}
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.shipping} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={6} />
        ) : (
          <InfoList>
            {/*
              방문 수령·공항 픽업은 **장소**를 보이고 택배 줄을 뺀다 — 원본은 이 분기가 실행되지 않아
              방문 수령 건에도 택배사·송장이 찍혔다
            */}
            <Item label="배송 방법">
              {parcel ? (
                order.shipMethod
              ) : (
                <>
                  <span className="body-medium-bold">{order.shipMethod}</span>
                  {" · "}
                  {placeOf(order)}
                </>
              )}
            </Item>
            <Item label="배송비">{feeText(parcel ? order.shipFee : 0)}</Item>
            {rent && (
              <Item label={parcel ? "회수 배송비" : "반납 요금"}>
                {feeText(parcel ? order.shipFee : 0)}
              </Item>
            )}
            {parcel && (
              <>
                <Item label="택배사">{order.carrier || NONE}</Item>
                <Item label="송장번호">
                  {order.trackingNo || (
                    <span className="text-text-minimal">{UNREGISTERED}</span>
                  )}
                </Item>
              </>
            )}
            <Item label="지연 사유">{delayReasonOf(order)}</Item>
            <Item label="주문확인일">{reachedAt(order, "ready")}</Item>
            <Item label="배송처리일">{reachedAt(order, "shipping")}</Item>
            <Item label="배송완료일">{reachedAt(order, "delivered")}</Item>
            {rent ? (
              <Item label="대여 시작일">{reachedAt(order, "renting")}</Item>
            ) : (
              <Item label="구매확정일">{reachedAt(order, "confirmed")}</Item>
            )}
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.address} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={4} />
        ) : (
          <InfoList>
            <Item label="수령인">{order.receiver}</Item>
            <Item label="수령인 연락처">{order.receiverPhone}</Item>
            <Item label="배송지">{order.address}</Item>
            <Item label="배송 메모">{order.shipMemo || NONE}</Item>
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.history} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={4} />
        ) : (
          <Table>
            <colgroup>
              <col className="w-1/2" />
              <col className="w-1/2" />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableTh>처리 상태</TableTh>
                <TableTh>처리 일시</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((row) => {
                const rowMeta = STATUS_META[row.status];
                return (
                  <TableRow key={row.status}>
                    <TableTd>
                      <Tag tone={rowMeta.tone} dot size="small">
                        {rowMeta.label}
                      </Tag>
                    </TableTd>
                    <TableTd className="tabular-nums">{stamp(row.at)}</TableTd>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* 하단 바 — 본사는 조회 전용이라 [목록] 하나뿐이다(원본 `noSave`) */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
            목록
          </Button>
        </div>
      </Card>

      {/* 주문 명세 — 원본 `udPriceBox`. 보증금은 한 줄로 보이지만 결제금액에 들지 않는다 */}
      <Modal
        open={statementOpen}
        onClose={() => setStatementOpen(false)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={statementTitleOf(order)}
        />
        <ModalBody>
          <dl className="flex flex-col gap-2">
            {statementOf(order).map((item) => (
              <div key={item.label} className="flex flex-col gap-2">
                {item.tone === "total" && <Divider />}
                <div className="flex items-center justify-between gap-4">
                  <dt
                    className={cn(
                      item.tone === "total"
                        ? "body-large-bold text-text"
                        : "body-medium text-text-sub",
                    )}
                  >
                    {item.label}
                  </dt>
                  <dd
                    className={cn(
                      "tabular-nums",
                      item.tone === "total"
                        ? "body-large-bold text-text"
                        : item.tone === "strong"
                          ? "body-medium-bold text-text"
                          : item.tone === "minus"
                            ? "body-medium text-text-critical"
                            : "body-medium text-text",
                    )}
                  >
                    {item.value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </ModalBody>
        <ModalFooter>
          <Button size="large" onClick={() => setStatementOpen(false)}>
            닫기
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
