import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
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
import { STATUS_META, won, type Order } from "./OrderListPage.data";
import {
  DEPOSIT_STATUS_META,
  MODES,
  NONE,
  SECTIONS,
  UNREGISTERED,
  claimResultsOf,
  claimTypeTextOf,
  delayReasonOf,
  depositStatusOf,
  faultTextOf,
  feeBurdenOf,
  feeText,
  findOrder,
  headlineOf,
  historyOf,
  isParcel,
  modeOfPath,
  paidAtText,
  payTotalOf,
  componentTextsOf,
  longRentTextOf,
  rentDaysTextOf,
  placeOf,
  reachedAt,
  refundDueNoteOf,
  requestedAtText,
  shippedTextOf,
  stageTextOf,
  stamp,
  statementBlocksOf,
  statementTitleOf,
  titleOf,
  type DetailMode,
} from "./OrderDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 주문 상세 (BO-ORD-002) — 조회형 · 뼈대
 *
 * ## 구성 — 원본 v0.4 `hqOrderDetailPage` (본사 조회 전용)
 * ```
 * 주문정보(결제금액 [주문 명세]) · 상품정보 · 배송정보 · 배송지 정보 · 주문 처리 이력   (5구역, 각각 접기)
 * [목록]                                                                    ← 하단 고정 바
 * ```
 * 원본 [상세보기]는 이미 상세 화면이라 무엇의 상세인지 몰라 **[주문 명세]** 로 부른다 — 결제금액 줄 곁에 둔다.
 * 명세 팝업은 `CalcBreakdown`(묶음·소계·결과) — 묶음은 `.data.ts` `statementBlocksOf` 가 준다.
 * 주문 목록의 주문번호가 이 화면으로 온다(`/orders-all/{처리단위}`). 렌트·판매는 한 화면에서 갈린다 —
 * 렌트만 렌트일·보증금·회수 배송비·대여 시작일이, 판매만 수량·구매확정일이 있다.
 * 상품정보 조건부 줄(추가 작업 요청 2026-11-09 B11): 렌트일 뒤 「(기간 옵션)」/「(기본)」 · 기간 옵션 건만 「장기 렌트 할인」 ·
 * 구성품이 있는 건만 「구성품」(렌트는 보증금 앞 · 판매는 수량 뒤). 값은 `.data.ts` `rentDaysTextOf`·`longRentTextOf`·
 * `componentTextsOf` — **기간 옵션·구성품 예시 건은 없다**(결제금액이 바뀐다). 명세 끝은 결제금액 → 주문 전체 승인액.
 * 방문 수령·공항 픽업은 배송정보 라벨이 「픽업 요금」·「반납 요금」이고 「준비 완료 알림일」·「수령 확인일」 두 줄이 더 있다
 * (확인 요청 답(2026-11-06) 14번·17번 — develop 자체 수령 분기).
 * 「보증금 상태」 배지 아래 환급 실패 안내 한 줄은 결제사 기간 경과로 환급이 실패한 건만(개발 §3-2-8 · `refundDueNoteOf`).
 *
 * ## 클레임 모드 — 취소·반품·교환 상세도 이 화면이다 (원본 `hqOrderDetailPage(u, {rma})`)
 * `/orders-cancel|return|exchange/{처리단위}` 로 들어오면 경로가 모드를 정한다(`.data.ts` `MODES`).
 주문정보 카드 **안에** 소제목 「{취소|반품|교환} 정보」 묶음(신청 구분·신청일시·발송 여부·귀책·사유·
 * 배송비 부담 + 팝업과 같은 환불·반환 결과 줄 `claimResultsOf`)이 따로 선다(새 카드가 아니다 — 원본 구획 유지),
 * 상품정보에 상태 두 칸, 명세에 클레임 묶음, 처리 이력에 클레임이 **실제로 거친 단계**가 붙는다. [목록]은 그 클레임 목록으로.
 * 모드와 맞지 않는 처리단위(취소 경로로 반품 건 · 렌트 교환)는 「찾을 수 없음」이다.
 * 번호 없이 들어오면(`/orders-cancel/`) 예시 건을 그리지 않고 그 목록으로 보낸다(개발 §2-4 · 부록 A B10).
 * 없는 번호·조각 둘은 「찾을 수 없음」 그대로다.
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
 * - 주문정보에 결제금액 한 줄(원본은 팝업 안에만) — 팝업과 같은 `payTotalOf`
 * - 처리 이력 표는 읽기 폭 `max-w-3xl` · 상태 열 160 — 배지와 시각이 화면 양 끝으로 벌어지지 않게
 * - 추가 기획 보드: 배송지 정보 「수령인 연락처」 아래 **「추가 연락처」**(보드 02 · 개발 d53c51d — 판매·렌트,
 *   값 없으면 `-`) · 결제수단 **「네이버페이」**(보드 01 — 값은 주문 샘플 `payMethod`). 둘 다 같은 라벨 폭
 * ====================================================================== */

export interface OrderDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/**
 * 라벨 폭 — 가장 긴 라벨(「보증금 반환 예정액」)이 기본 80 에서 두 줄로 쪼개진다.
 * §30-3 대로 **모든 블록이 같은 폭**을 쓴다 — 구역마다 다르면 값 시작선이 어긋난다.
 * 120 = 「보증금 반환 예정액」 실측 104 + 여유(104 에서는 값에 붙어 읽혔다).
 */
const LABEL_WIDTH = 120;

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
  /* 경로가 모드를 정한다 — 목록 경로가 돌아가는 곳이자 없는 건일 때 돌려보내는 곳이다 */
  const mode = modeOfPath(pathname);
  const { listPath, listLabel, noun } = MODES[mode];
  /* 경로는 `{목록}/{처리단위}` **한 조각**이어야 한다 */
  const rest = pathname.slice(listPath.length + 1);
  /* 번호 없이 들어온 상세(`/orders-all/`)는 그 목록으로 — 예시 건을 그리지 않는다(개발 §2-4).
     주소를 바꿔 단다(replace) — 쌓으면 목록에서 「뒤로」가 빈 주소로 돌아가 다시 목록으로 튕긴다 */
  const blank = rest === "";
  useEffect(() => {
    if (blank) navigate(listPath, { replace: true });
  }, [blank, listPath]);
  const order = rest.includes("/")
    ? undefined
    : findOrder(lastPathSegment(pathname), mode);

  if (blank) return null;
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
        header={<PageHeader title={`${noun} 상세`} />}
      >
        <Card variant="soft">
          <CardBody>
            {/* 표가 아니라 **화면 전체가 없는 것**이다 — §16 의 `page` 가 그 자리다(다른 상세와 같다) */}
            <EmptyState
              size="page"
              icon={<ShoppingCart strokeWidth={1.2} aria-hidden />}
              title={
                mode === "order"
                  ? "찾을 수 없는 주문입니다"
                  : `찾을 수 없는 ${noun} 건입니다`
              }
              description={`주소가 잘못되었거나 삭제된 ${noun} 건일 수 있습니다.`}
            >
              <Button variant="secondary" onClick={() => onNavSelect(listPath)}>
                {listLabel}으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  /*
    처리단위·모드마다 처음부터 — 접힘·열린 명세가 다음 건에 묻어가지 않게.
    같은 처리단위라도 주문 상세 ↔ 클레임 상세는 다른 화면이라 모드까지 key 에 넣는다
  */
  return (
    <OrderDetailBody
      key={`${mode}:${order.id}`}
      order={order}
      mode={mode}
      {...props}
    />
  );
}

function OrderDetailBody({
  order,
  mode,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: OrderDetailPageProps & { order: Order; mode: DetailMode }) {
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";
  const [statementOpen, setStatementOpen] = useState(false);

  const rent = order.type === "rent";
  const parcel = isParcel(order);
  const meta = STATUS_META[order.status];
  const deposit = DEPOSIT_STATUS_META[depositStatusOf(order)];
  const refundDue = refundDueNoteOf(order);
  const longRentText = longRentTextOf(order);
  /* 구성품 — 있을 때만 한 줄에 하나씩(렌트는 보증금 앞 · 판매는 수량 뒤에 놓인다) */
  const componentTexts = componentTextsOf(order);
  const componentsItem =
    componentTexts.length > 0 ? (
      <Item label="구성품">
        <span className="flex flex-col gap-1">
          {componentTexts.map((text) => (
            <span key={text}>{text}</span>
          ))}
        </span>
      </Item>
    ) : null;
  /* 클레임 모드 — 경로가 클레임이고 그 클레임이 있다(`findOrder` 가 이미 맞춰 봤다) */
  const claimMode = mode !== "order" && order.claim !== null;
  const { listPath, noun } = MODES[mode];
  /* 상품주문상태 — 클레임 모드는 주문 자체의 단계(원래 단계), 클레임 상태는 옆 칸이 말한다 */
  const orderMeta = claimMode ? STATUS_META[order.baseStatus] : meta;
  const history = historyOf(order, claimMode ? "all" : "last");

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
          title={titleOf(order, mode)}
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
              {/* 원본 [상세보기] — 결제금액이 어떻게 나왔는지 명세 팝업으로. 값 곁에 둔다 */}
              <Item label="결제금액">
                <span className="flex items-center gap-3">
                  <span className="body-medium-bold tabular-nums">
                    {won(payTotalOf(order))}
                  </span>
                  <TextButton
                    size="small"
                    onClick={() => setStatementOpen(true)}
                  >
                    주문 명세
                  </TextButton>
                </span>
              </Item>
            </InfoList>
            {/* 클레임 6항목 + 결과 — 같은 카드 안에서 소제목·간격으로 가른다(원본 구획 유지) */}
            {claimMode && (
              <section className="flex flex-col gap-3">
                <h3 className="label-large-bold text-text">{noun} 정보</h3>
                <InfoList>
                  <Item label="신청 구분">
                    <Tag tone="default" size="small">
                      {claimTypeTextOf(order)}
                    </Tag>
                  </Item>
                  <Item label="신청일시">{requestedAtText(order)}</Item>
                  <Item label="발송 여부">{shippedTextOf(order)}</Item>
                  <Item label="귀책 판정">{faultTextOf(order)}</Item>
                  <Item label="신청 사유">{order.claim?.reason}</Item>
                  <Item label="배송비 부담">{feeBurdenOf(order)}</Item>
                  {/* 팝업 결과 줄과 같은 값·문구 — 금액이면 굵게, 처리 문장이면 그대로 */}
                  {claimResultsOf(order).map((line) =>
                    line.kind === "message" ? (
                      <Item key={line.key} label="처리 결과">
                        {line.label}
                      </Item>
                    ) : (
                      <Item key={line.key} label={line.label}>
                        <span className="body-medium-bold tabular-nums">
                          {line.value}
                        </span>
                      </Item>
                    ),
                  )}
                </InfoList>
              </section>
            )}
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
              <Tag tone={orderMeta.tone} dot size="small">
                {orderMeta.label}
              </Tag>
            </Item>
            {claimMode && (
              <Item label={`${noun}상태`}>
                <Tag tone={meta.tone} dot size="small">
                  {meta.label}
                </Tag>
              </Item>
            )}
            {rent ? (
              <>
                {/* 「(기간 옵션)」/「(기본)」 · 기간 옵션 건만 장기 렌트 할인 줄(develop) */}
                <Item label="렌트일">{rentDaysTextOf(order)}</Item>
                {longRentText ? (
                  <Item label="장기 렌트 할인">{longRentText}</Item>
                ) : null}
                {componentsItem}
                <Item label="보증금">{won(order.deposit ?? 0)}</Item>
                <Item label="보증금 상태">
                  {/* 환급이 결제사 기간 경과로 실패한 건만 배지 아래 안내 한 줄(개발 §3-2-8 · develop 과 같은 조건) */}
                  <span className="flex flex-col items-start gap-1">
                    <Tag tone={deposit.tone} size="small">
                      {deposit.label}
                    </Tag>
                    {refundDue ? (
                      <span className="body-small text-text-warning">
                        {refundDue}
                      </span>
                    ) : null}
                  </span>
                </Item>
              </>
            ) : (
              <>
                <Item label="수량">{order.qty}개</Item>
                {componentsItem}
              </>
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
            {/* 방문 수령·공항 픽업은 「픽업 요금」(확인 요청 답(2026-11-06) 14번 — develop 자체 수령 분기) */}
            <Item label={parcel ? "배송비" : "픽업 요금"}>
              {feeText(parcel ? order.shipFee : 0)}
            </Item>
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
            {/*
              방문 수령·공항 픽업만 — 셀러 [준비 완료] 알림 시각 · 수령 확인 시각(확인 요청 답 17번 · develop 순서).
              퍼블은 예시 값이라 출고·수령 단계 시각을 끌어온다. 아직 닿지 않았으면 다른 날짜 줄처럼 `-`
            */}
            {!parcel && (
              <>
                <Item label="준비 완료 알림일">
                  {reachedAt(order, "shipping")}
                </Item>
                <Item label="수령 확인일">{reachedAt(order, "delivered")}</Item>
              </>
            )}
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
          <LoadingLines rows={5} />
        ) : (
          <InfoList>
            <Item label="수령인">{order.receiver}</Item>
            <Item label="수령인 연락처">{order.receiverPhone}</Item>
            {/* 보드 02 · 개발 d53c51d — 판매·렌트 모두, 없으면 `-` */}
            <Item label="추가 연락처">{order.receiverSubPhone ?? NONE}</Item>
            <Item label="배송지">{order.address}</Item>
            <Item label="배송 메모">{order.shipMemo || NONE}</Item>
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.history} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={4} />
        ) : (
          /* 읽기 폭을 묶고 상태 열을 160 으로 — 배지와 시각이 1,000px 넘게 벌어지지 않게 */
          <div className="w-full max-w-3xl">
            <Table>
              <colgroup>
                <col className="w-40" />
                <col />
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
                      <TableTd className="tabular-nums">
                        {stamp(row.at)}
                      </TableTd>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      {/* 하단 바 — 본사는 조회 전용이라 [목록] 하나뿐이다(원본 `noSave`) */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(listPath)}>
            목록
          </Button>
        </div>
      </Card>

      {/* 주문 명세 — 원본 `udPriceBox`. 보증금은 「별도」 묶음 — 결제금액에 들지 않는다 */}
      <Modal
        open={statementOpen}
        onClose={() => setStatementOpen(false)}
        size="medium"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={statementTitleOf(order)}
        />
        <ModalBody>
          <CalcBreakdown blocks={statementBlocksOf(order, claimMode)} />
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
