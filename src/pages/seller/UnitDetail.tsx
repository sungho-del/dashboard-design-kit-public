import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  FormField,
  IconButton,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Select,
  Skeleton,
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
import { cn } from "../../lib/cn";
import { SellerGnb } from "./SellerGnb";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import { CalcBreakdown } from "../babycube/CalcBreakdown";
import {
  appliedAtOf,
  claimHistoryOf,
  claimKindLabelOf,
  claimResultsOf,
  faultOf,
  feeBurdenOf,
  shippedTextOf,
} from "./claim.data";
import {
  ACTION_COPY,
  CLAIM_SCREEN,
  routeGate,
  shipImageMissing,
  statusIn,
  type Gate,
} from "./gate.data";
import { GateHost, NoticeGateModal, StatusTag } from "./OrderGates";
import {
  COURIERS,
  courierOf,
  delayReasonOf,
  historyOf,
  careOf,
  collectFeeOf,
  orderStat,
  payMethodOf,
  payTotalOf,
  pickupOf,
} from "./orderUnit.data";
import {
  CareBody,
  DepositBody,
  InspectBody,
  Item,
  PhotosBody,
  RentInfoBody,
  ShipImagesBody,
} from "./RentSections";
import type { OrderUnit } from "./seed/orders.data";
import { useRentDetail } from "./useRentDetail";
import {
  UNIT_DETAIL_COPY,
  brandOf,
  componentNamesOf,
  depositStatusOf,
  extraTelOf,
  growthStageOf,
  headlineOf,
  isSelfPickup,
  longRentTextOf,
  orNone,
  pickupRequestOf,
  productCodeOf,
  purchasedAtOf,
  reachedAt,
  RENT_USE_COPY,
  pickupChangeOf,
  readyDueOf,
  readyNoticeOf,
  refundNoticeOf,
  reshipOf,
  receiverOf,
  receiverTelOf,
  rentComponentOf,
  rentDaysTextOf,
  shipFeeText,
  statementBlocksOf,
  statementTitleOf,
  type DetailAction,
  type RentSectionKey,
  type UnitDetailConfig,
} from "./unitDetail.data";

/* =========================================================================
 * 처리단위 상세 공용 뼈대 — 판매 상세 5개(발주·배송·취소·반품·교환)가 설정만 바꿔 쓴다
 * (원본도 `udOrderPage(u, cfg)` 한 틀).
 *
 * ## 구성 — 원본 v0.4 `udOrderPage`
 * ```
 * 주문정보(결제금액 [주문 명세] · 클레임이면 「{유형} 정보」) · 상품정보(상태 셀렉트) ·
 * 배송정보(송장 등록/수정/읽기) · 배송지 정보 · 주문 처리 이력           (5구역, 각각 접기)
 * [목록]                         [화면별 처리 버튼…] [취소] [변경 저장]   ← 하단 고정 바
 * ```
 * 화면이 갈아끼우는 것은 `UnitDetailConfig`(`unitDetail.data.ts`) — 레코드 · 상태 선택지 · 송장 칸 · 처리 버튼.
 * 상태 셀렉트와 처리 버튼은 **목록과 같은 게이트**(`gate.data` `routeGate` → `GateHost`)를 지난다.
 *
 * ## 원본을 그대로 둔 것
 * - 지금 상태가 선택지에 없으면 셀렉트 대신 배지 · 클레임 상세는 「상품주문상태」(주문 단계 배지)와
 *   「{유형}상태」(클레임 셀렉트) 두 칸(원본 2026-08-05 판정)
 * - 택배사는 처리단위 값, 없으면 상품 등록 택배사 · 방문 수령은 수령지를 보이고 택배 줄을 뺀다
 *
 * ## 본사 퍼블과 같게 둔 것(톤 · `babycube/OrderDetailPage`)
 * 머리(제목 + 처리단위·상품 + 상태 배지) · 읽는 값은 `InfoList` 한 줄씩 · 클레임 6줄은 주문정보 안
 * 소제목 「{유형} 정보」 + 명세와 같은 결과 줄 · 원본 [상세보기] 는 결제금액 줄의 [주문 명세] ·
 * 처리 이력 폭 `max-w-3xl` · 하단 바 `[목록] … [처분] [취소] [저장]`(진한 버튼은 맨 오른쪽 하나)
 *
 * ## 기획 변경 반영
 * 배송지 정보 「추가 연락처」(D-349·D-345) · 반품 환불의 출고비(D-61 — `claim.data`)
 *
 * ## 퍼블 범위
 * 업무 버튼은 창 + 알림까지 — 값은 바뀌지 않는다(셀렉트는 창을 닫으면 지금 상태로 돌아온다).
 * 택배사·송장번호는 화면 안에서만 적힌다. 처리단위가 바뀌면 `key` 로 처음부터.
 * ====================================================================== */

export interface UnitDetailProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
  config: UnitDetailConfig;
}

const COURIER_OPTIONS = [
  { value: "", label: "선택" },
  ...COURIERS.map((c) => ({ value: c, label: c })),
];

/** 접을 수 있는 구역 — 본사 상세와 같은 규격 */
function Section({
  title,
  busy,
  dim,
  id,
  children,
}: {
  title: string;
  busy: boolean;
  dim: string | undefined;
  /** 다른 화면에서 이 구역으로 데려올 때(출고 이미지 안내 창) */
  id?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card variant="soft" aria-busy={busy} id={id}>
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

function Shell({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
  header,
  children,
}: Omit<UnitDetailProps, "config"> & {
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppShell
      sidebar={
        <SellerGnb
          activeId={activeNav}
          onSelect={onNavSelect}
          open={navOpen}
          onOpenChange={onNavOpenChange}
        />
      }
      header={header}
    >
      {children}
    </AppShell>
  );
}

export function UnitDetail({ config, ...props }: UnitDetailProps) {
  const pathname = usePathname();
  /* 경로는 `{목록}/{처리단위}` **한 조각**이어야 한다 */
  const rest = pathname.slice(config.listPath.length + 1);
  const unit = rest.includes("/")
    ? undefined
    : config.find(lastPathSegment(pathname));

  if (!unit) {
    return (
      <Shell {...props} header={<PageHeader title={config.title} />}>
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<ShoppingCart strokeWidth={1.2} aria-hidden />}
              title={UNIT_DETAIL_COPY.notFoundTitle}
              description={UNIT_DETAIL_COPY.notFoundDescription}
            >
              <Button
                variant="secondary"
                onClick={() => props.onNavSelect(config.listPath)}
              >
                {config.listLabel}
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  /* 처리단위마다 처음부터 — 접힘·적은 송장·열린 창이 다음 건에 묻어가지 않게 */
  return (
    <UnitDetailBody
      key={`${config.screen}:${unit.id}`}
      unit={unit}
      config={config}
      {...props}
    />
  );
}

type Overlay = "address" | "statement" | "ready" | null;

/** [배송지 변경] 창 값 — 받는 분·연락처·요청사항(렌트는 추가 연락처)은 지금 값, 주소·상세주소는 비운다(develop `addressDraftOf`) */
interface AddressDraft {
  receiver: string;
  phone: string;
  subPhone: string;
  address: string;
  detail: string;
  memo: string;
}

const SHIP_IMAGE_SECTION = "unit-section-shipimg";

/** 중간 구역 제목 — 원본 `midSections` · `shipImg` */
const RENT_SECTION_TITLE: Record<RentSectionKey, string> = {
  shipImages: "출고 이미지",
  rentInfo: "대여 정보",
  inspect: "검수 판정",
  deposit: "보증금 정산",
  care: "안심케어 청구",
  photos: "상품 상태 이미지",
};

function UnitDetailBody({
  unit: u,
  config,
  ...props
}: UnitDetailProps & { unit: OrderUnit }) {
  const { onNavSelect } = props;
  const { toast } = useToast();
  const params = useSearchParams();
  const status = asStatus(params.get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const [gate, setGate] = useState<Gate | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [courier, setCourier] = useState(courierOf(u));
  const [invoice, setInvoice] = useState(u.invoice ?? "");
  /** 저장한 송장 — [송장수정]이 여기에 적고, [배송중 전환]은 고친 칸이 없을 때만(develop · 개발 요청 18번) */
  const [savedShip, setSavedShip] = useState({
    courier: courierOf(u),
    invoice: u.invoice ?? "",
  });
  const [address, setAddress] = useState<AddressDraft | null>(null);
  /* 렌트 중간 구역의 화면 안 입력(이미지·판정·차감·수거 송장) — 구역을 접어도 남게 여기서 */
  const rentState = useRentDetail(u);

  const rent = u.type === "렌트";
  const claim = CLAIM_SCREEN[config.screen];
  const current = statusIn(config.screen, u);
  const selectable = config.statusOptions.some((o) => o.value === current);
  const shipMode = config.shipMode(u);
  const pickup = pickupOf(u);
  const components = componentNamesOf(u);
  const sections = config.sections ?? [];
  const finish = (message: string) => {
    setGate(null);
    toast(message);
  };
  /**
   * 게이트가 보는 처리단위 — 이 화면에서 올린 출고 이미지·고른 판정을 반영한다(원본도 화면 값으로 판정).
   * 시드는 바꾸지 않는다
   */
  const live: OrderUnit = {
    ...u,
    shipImgs: rentState.shipImages,
    inspect: rentState.judgment ?? u.inspect,
  };

  /* 출고 이미지 안내 창 [출고 이미지 등록] · 목록에서 `?section=shipimg` 로 온 경우 — 그 구역으로 */
  const toShipImages = () =>
    document
      .getElementById(SHIP_IMAGE_SECTION)
      ?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  const target = params.get("section");
  useEffect(() => {
    if (target === "shipimg") toShipImages();
  }, [target]);

  /** 상태 셀렉트·처리 버튼 — 원본 `rentStatSel`·`rowSet` → `gateRoute`. 같은 값은 아무 일도 없다 */
  const route = (next: string) => {
    if (next === current) return;
    const r = routeGate(next, [live], config.screen);
    if (r.kind === "toast") return toast(r.message);
    setGate(r);
  };

  /**
   * 배송정보 [송장수정] — 출고 전(register)은 택배사·송장을 **저장만** 하고 배송중 전환은 하단 [배송중 전환]이 한다
   * (develop · 개발 요청 18번 — 퍼블 「송장등록 · 배송처리」 한 버튼을 둘로). 출고 뒤(edit)는 원본 `rentInvoiceEdit`
   */
  const shipDirty =
    courier !== savedShip.courier || invoice.trim() !== savedShip.invoice;
  const canSaveShip =
    shipMode === "register"
      ? shipDirty && !!courier && !!invoice.trim()
      : !!invoice.trim();
  const submitInvoice = () => {
    if (shipMode === "edit") return toast(ACTION_COPY.invoiceEdited);
    setSavedShip({ courier, invoice: invoice.trim() });
    toast(UNIT_DETAIL_COPY.shipmentSaved);
  };
  /** [배송중 전환] — 출고 이미지 없는 렌트 건이면 안내 창이 먼저(원본 `rentShipOne`) */
  const startShipping = () => {
    if (shipImageMissing([live]).length)
      return setGate({ kind: "shipRemind", ids: [u.id], act: "배송중" });
    const r = routeGate("배송중", [live], config.screen);
    if (r.kind === "toast") return toast(r.message);
    setGate(r);
  };
  const ready = readyNoticeOf(u);
  const refundNotice = refundNoticeOf(u);
  const reship = reshipOf(u);

  const runAction = (action: DetailAction) => {
    if ("to" in action) return route(action.to);
    if ("go" in action) return onNavSelect(action.go);
    if (action.special === "address") {
      setAddress({
        receiver: receiverOf(u) === "-" ? "" : receiverOf(u),
        phone: receiverTelOf(u) === "-" ? "" : receiverTelOf(u),
        subPhone: extraTelOf(u) === "-" ? "" : extraTelOf(u),
        address: "",
        detail: "",
        memo: u.shipMemo && u.shipMemo !== "-" ? u.shipMemo : "",
      });
      return setOverlay("address");
    }
    if (action.special === "ship") return startShipping();
    if (action.special === "ready") return setOverlay("ready");
    if (action.special === "delayAgain")
      return setGate({ kind: "delay", ids: [u.id] });
    if (action.special === "collect" && (claim === "반품" || claim === "교환"))
      return setGate({ kind: "collectInvoice", ids: [u.id], type: claim });
    /* 원본 `act('배송 추적')` — 알림만(조회는 개발 영역) */
    if (action.special === "track") return toast("배송 추적");
    /* 출고 뒤 취소 → 반품 전환 창(사유 + 고객 안내 동의 · 개발 요청 21번) */
    if (action.special === "toReturn")
      return setGate({ kind: "toReturn", ids: [u.id] });
  };

  const closeAddress = () => {
    setAddress(null);
    setOverlay(null);
  };
  const editAddress = (key: keyof AddressDraft) => (value: string) =>
    setAddress((prev) => (prev ? { ...prev, [key]: value } : prev));

  const statusControl = selectable ? (
    /* 값은 지금 상태에 묶는다 — 창을 닫거나 확인해도 그대로(퍼블 범위) */
    <Select
      className="w-56"
      aria-label={claim ? `${claim}상태` : "상품주문상태"}
      options={[...config.statusOptions]}
      value={current}
      onValueChange={route}
    />
  ) : (
    <StatusTag status={current} />
  );

  return (
    <Shell
      {...props}
      header={
        <PageHeader
          title={config.title}
          description={headlineOf(u)}
          badges={<StatusTag status={current} />}
        />
      }
    >
      {/* 환불 시도 안내 — PG 응답 대기 · 거절(develop 문구 · 개발 요청 22번) */}
      {refundNotice && (
        <Card variant="soft">
          <p
            role={refundNotice.failed ? "alert" : undefined}
            className={cn(
              "body-medium break-keep",
              refundNotice.failed ? "text-text-critical" : "text-text",
            )}
          >
            {refundNotice.text}
          </p>
        </Card>
      )}

      <Section title="주문정보" busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={7} />
        ) : (
          <>
            <InfoList>
              <Item label="주문번호">
                <span className="body-medium-bold">{u.no}</span>
              </Item>
              <Item label="결제일시">{orNone(u.orderedAt)}</Item>
              <Item label="결제수단">{orNone(payMethodOf(u))}</Item>
              <Item label="구매자명">{u.mem}</Item>
              <Item label="구매자 ID">{orNone(u.email)}</Item>
              <Item label="연락처">{orNone(u.tel)}</Item>
              {/* 원본 [상세보기] — 결제금액이 어떻게 나왔는지. 값 곁에 둔다(본사와 같다) */}
              <Item label="결제금액">
                <span className="flex items-center gap-3">
                  <span className="body-medium-bold tabular-nums">
                    {payTotalOf(u).toLocaleString("ko-KR")}원
                  </span>
                  <TextButton
                    size="small"
                    onClick={() => setOverlay("statement")}
                  >
                    주문 명세
                  </TextButton>
                </span>
              </Item>
            </InfoList>
            {/* 클레임 6줄 + 결과 — 같은 카드 안에서 소제목으로 가른다(본사와 같다 · 원본 구획 유지) */}
            {claim && (
              <section className="flex flex-col gap-3">
                <h3 className="label-large-bold text-text">{claim} 정보</h3>
                <InfoList>
                  <Item label="신청 구분">
                    <Tag tone="default" size="small">
                      {claimKindLabelOf(claim)}
                    </Tag>
                  </Item>
                  <Item label="신청일시">{appliedAtOf(u)}</Item>
                  <Item label="발송 여부">{shippedTextOf(u)}</Item>
                  <Item label="귀책 판정">{faultOf(u.req?.reason)} 귀책</Item>
                  <Item label="신청 사유">{orNone(u.req?.reason)}</Item>
                  <Item label="배송비 부담">{feeBurdenOf(u)}</Item>
                  {/* 명세 결과 줄과 같은 값·문구 — 금액이면 굵게, 처리 문장이면 그대로 */}
                  {claimResultsOf(u).map((line) =>
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

      <Section title="상품정보" busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={7} />
        ) : (
          <InfoList>
            <Item label="상품명">
              <span className="body-medium-bold">{u.prod}</span>
            </Item>
            <Item label="상품코드">{productCodeOf(u)}</Item>
            <Item label="브랜드">{brandOf(u)}</Item>
            <Item label="성장단계">{growthStageOf(u)}</Item>
            {claim ? (
              <>
                {/* 주문 자체 단계(조회) · 클레임 진행(변경) — 한 칸에 섞지 않는다(원본 판정) */}
                <Item label="상품주문상태">
                  <StatusTag status={orderStat(u)} />
                </Item>
                <Item label={`${claim}상태`}>{statusControl}</Item>
              </>
            ) : (
              <Item label="상품주문상태">{statusControl}</Item>
            )}
            {rent ? (
              /* 렌트 — 렌트일 · 장기 렌트 할인 · 구성품 하나(일 단가) · (대여·검수) 보증금. 원본 `udProdInfo` */
              <>
                <Item label="렌트일">{rentDaysTextOf(u)}</Item>
                {longRentTextOf(u) && (
                  <Item label="장기 렌트 할인">{longRentTextOf(u)}</Item>
                )}
                {rentComponentOf(u) && (
                  <Item label="구성품">{rentComponentOf(u)}</Item>
                )}
                {config.depositInProduct && !!u.dep && (
                  <>
                    <Item label="보증금">
                      {u.dep.toLocaleString("ko-KR")}원
                    </Item>
                    <Item label="보증금 상태">
                      <StatusTag status={depositStatusOf(u)} />
                    </Item>
                  </>
                )}
              </>
            ) : (
              <>
                <Item label="수량">{Number(u.qty) || 1}개</Item>
                {components.length > 0 && (
                  <Item label="구성품">
                    <span className="flex flex-col">
                      {components.map((name) => (
                        <span key={name}>{name}</span>
                      ))}
                    </span>
                  </Item>
                )}
              </>
            )}
          </InfoList>
        )}
      </Section>

      {/* 렌트 중간 구역 — 상품정보와 배송정보 사이(원본 `shipImg` · `midSections`) */}
      {sections
        .filter((key) => key !== "care" || careOf(u))
        .map((key) => (
          <Section
            key={key}
            id={key === "shipImages" ? SHIP_IMAGE_SECTION : undefined}
            title={RENT_SECTION_TITLE[key]}
            busy={busy}
            dim={dim}
          >
            {loading ? (
              <LoadingLines rows={4} />
            ) : key === "shipImages" ? (
              <ShipImagesBody state={rentState} />
            ) : key === "rentInfo" ? (
              <RentInfoBody
                u={u}
                state={rentState}
                mode={config.collectMode?.(u) ?? "ro"}
                inspection={sections.includes("inspect")}
                onReturnConfirm={() =>
                  setGate({ kind: "returnConfirm", ids: [u.id] })
                }
              />
            ) : key === "inspect" ? (
              <InspectBody u={u} state={rentState} />
            ) : key === "deposit" ? (
              <DepositBody
                /* 판정이 바뀌면 차감 초깃값도 바뀐다 — 입력칸을 새 값으로 다시 채운다 */
                key={rentState.judgment ?? "none"}
                u={u}
                state={rentState}
                onRefund={(deduct) =>
                  setGate({ kind: "depositRefund", ids: [u.id], deduct })
                }
              />
            ) : key === "care" ? (
              <CareBody u={u} state={rentState} />
            ) : (
              <PhotosBody state={rentState} />
            )}
          </Section>
        ))}

      <Section title="배송정보" busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={8} />
        ) : (
          <InfoList>
            {pickup ? (
              /* 방문 수령 — 수령지를 보이고 택배 줄을 뺀다(원본) */
              <Item label="배송 방법">
                <span className="body-medium-bold">방문 수령</span>
                {" · "}
                {pickup.address
                  ? [
                      pickup.address.name,
                      pickup.address.addr,
                      [pickup.address.tel1, pickup.address.tel2]
                        .filter(Boolean)
                        .join(" / "),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "판매자 지정 장소"}
              </Item>
            ) : (
              <Item label="배송 방법">{orNone(u.shipWay)}</Item>
            )}
            <Item label="배송비">{pickup ? "무료" : shipFeeText(u)}</Item>
            {!pickup && (
              <>
                {rent && (
                  <Item label="회수 배송비">
                    {collectFeeOf(u)
                      ? `${collectFeeOf(u).toLocaleString("ko-KR")}원`
                      : "무료"}
                  </Item>
                )}
                <Item label="택배사">
                  {shipMode === "ro" ? (
                    orNone(courier)
                  ) : (
                    <Select
                      className="w-56"
                      aria-label="택배사"
                      options={COURIER_OPTIONS}
                      value={courier}
                      onValueChange={setCourier}
                    />
                  )}
                </Item>
                <Item label="송장번호">
                  {shipMode === "ro" ? (
                    orNone(invoice)
                  ) : (
                    <span className="flex flex-wrap items-center gap-2">
                      <Input
                        className="w-60"
                        inputMode="numeric"
                        aria-label="송장번호"
                        placeholder="송장번호 입력"
                        value={invoice}
                        onChange={(event) => setInvoice(event.target.value)}
                      />
                      <Button
                        variant="secondary"
                        disabled={!canSaveShip}
                        onClick={submitInvoice}
                      >
                        송장수정
                      </Button>
                    </span>
                  )}
                </Item>
              </>
            )}
            {/* 자체 수령 — 준비 완료 안내(등록한 건만) · 안내 문장(develop · 개발 요청 17·29번) */}
            {isSelfPickup(u) && (
              <>
                {ready && (
                  <Item label="준비 완료 안내">
                    {UNIT_DETAIL_COPY.readyNotice(ready.at, ready.due)}
                  </Item>
                )}
                <Item label="안내">{UNIT_DETAIL_COPY.readyHelp}</Item>
              </>
            )}
            {/* 재반송 송장 — 반려·거부된 상품을 되돌려 보낸 송장(개발 요청 23번) */}
            {reship && (
              <Item label="재반송 송장">{`${reship.courier} ${reship.invoice}`}</Item>
            )}
            <Item label="지연 사유">{delayReasonOf(u)}</Item>
            <Item label="주문확인일">{reachedAt(u, 1)}</Item>
            <Item label="배송처리일">{reachedAt(u, 2)}</Item>
            <Item label="배송완료일">{reachedAt(u, 3)}</Item>
            {/* 렌트는 배송 완료 = 대여 시작(원본) */}
            {rent ? (
              <Item label="대여 시작일">{reachedAt(u, 3)}</Item>
            ) : (
              <Item label="구매확정일">{purchasedAtOf(u)}</Item>
            )}
          </InfoList>
        )}
      </Section>

      <Section title="배송지 정보" busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={5} />
        ) : (
          <InfoList>
            <Item label="수령인">{receiverOf(u)}</Item>
            <Item label="수령인 연락처">{receiverTelOf(u)}</Item>
            <Item label="추가 연락처">{extraTelOf(u)}</Item>
            <Item label="배송지">{orNone(u.addr)}</Item>
            {/* 확정된 회수지 — develop 「회수지(변경 확정)」 줄(개발 요청 31번) */}
            {pickupChangeOf(u)?.confirmed && (
              <Item label={RENT_USE_COPY.returnAddress}>
                {pickupChangeOf(u)?.confirmed?.address}
              </Item>
            )}
            <Item label="배송 메모">{orNone(u.shipMemo)}</Item>
            {/* 기획 보드 08 — 손님이 적은 건에만 */}
            {pickupRequestOf(u) && (
              <Item label="수거 요청사항">{pickupRequestOf(u)}</Item>
            )}
          </InfoList>
        )}
      </Section>

      <Section title="주문 처리 이력" busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={3} />
        ) : (
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
                {(claim ? claimHistoryOf(u) : historyOf(u)).map(
                  ([stat, at], index) => (
                    <TableRow key={`${stat}-${index}`}>
                      <TableTd>
                        <StatusTag status={stat} />
                      </TableTd>
                      <TableTd className="tabular-nums">{at}</TableTd>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      {/*
        하단 고정 바 (원본 `nv-bar`) — `[목록]  …  [화면별 처리] [취소] [변경 저장]`.
        진한 버튼은 [변경 저장] 하나고 맨 오른쪽이다(본사 상세와 같은 순서 · 원본은 [변경 저장] 뒤에 [취소]).
        [취소]는 저장하지 않고 목록으로.
      */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            onClick={() => onNavSelect(config.listPath)}
          >
            목록
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {config.actions(u).map((action) => {
              /* [배송중 전환]은 저장한 송장이 있고 고친 칸이 없을 때만(develop) */
              const ship = "special" in action && action.special === "ship";
              return (
                <Button
                  key={action.label}
                  variant={action.tone ?? "secondary"}
                  disabled={ship && (shipDirty || !savedShip.invoice)}
                  title={
                    ship && shipDirty
                      ? UNIT_DETAIL_COPY.shipDirtyHint
                      : undefined
                  }
                  onClick={() => runAction(action)}
                >
                  {action.label}
                </Button>
              );
            })}
            <Button
              variant="secondary"
              onClick={() => onNavSelect(config.listPath)}
            >
              취소
            </Button>
            <Button onClick={() => toast(UNIT_DETAIL_COPY.saved(u))}>
              변경 저장
            </Button>
          </div>
        </div>
      </Card>

      <GateHost
        gate={gate}
        units={[live]}
        onClose={() => setGate(null)}
        onDone={finish}
        onShipImage={toShipImages}
      />

      {/*
        배송지 변경 — develop `AddressModal` 칸 그대로(개발 요청 16·29번): 받는 분 · 연락처 · (렌트) 추가 연락처 ·
        현재 배송지(읽기) · 주소 + [주소검색] · 상세주소 · 요청사항. 받는 분·연락처가 비면 [변경] 잠금, 주소가 비면 안내
      */}
      <Modal
        open={overlay === "address" && address !== null}
        onClose={closeAddress}
        size="medium"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={UNIT_DETAIL_COPY.addrTitle}
        />
        {address && (
          <ModalBody>
            <FormField label="받는 분" required>
              <Input
                maxLength={100}
                value={address.receiver}
                onChange={(event) =>
                  editAddress("receiver")(event.target.value)
                }
              />
            </FormField>
            <FormField label="연락처" required>
              <Input
                inputMode="numeric"
                maxLength={13}
                placeholder={UNIT_DETAIL_COPY.phonePlaceholder}
                value={address.phone}
                onChange={(event) => editAddress("phone")(event.target.value)}
              />
            </FormField>
            {rent && (
              <FormField label="추가 연락처">
                <Input
                  inputMode="numeric"
                  maxLength={13}
                  placeholder={UNIT_DETAIL_COPY.phonePlaceholder}
                  value={address.subPhone}
                  onChange={(event) =>
                    editAddress("subPhone")(event.target.value)
                  }
                />
              </FormField>
            )}
            <FormField label="현재 배송지" group>
              <p className="body-medium break-keep text-text-sub">
                {orNone(u.addr)}
              </p>
            </FormField>
            <FormField label="주소" required group>
              <span className="flex gap-2">
                <Input
                  className="flex-1"
                  aria-label="주소"
                  maxLength={300}
                  placeholder={UNIT_DETAIL_COPY.addrPlaceholder}
                  value={address.address}
                  onChange={(event) =>
                    editAddress("address")(event.target.value)
                  }
                />
                <Button
                  variant="secondary"
                  onClick={() => toast(UNIT_DETAIL_COPY.addrSearchPending)}
                >
                  주소검색
                </Button>
              </span>
            </FormField>
            <FormField label="상세주소">
              <Input
                maxLength={300}
                value={address.detail}
                onChange={(event) => editAddress("detail")(event.target.value)}
              />
            </FormField>
            <FormField label="요청사항">
              <Input
                maxLength={200}
                value={address.memo}
                onChange={(event) => editAddress("memo")(event.target.value)}
              />
            </FormField>
          </ModalBody>
        )}
        <ModalFooter>
          <Button variant="secondary" size="large" onClick={closeAddress}>
            취소
          </Button>
          <Button
            size="large"
            disabled={!address?.receiver.trim() || !address?.phone.trim()}
            onClick={() => {
              if (!address?.address.trim())
                return toast(UNIT_DETAIL_COPY.addrRequired);
              closeAddress();
              toast(UNIT_DETAIL_COPY.addrChanged);
            }}
          >
            변경
          </Button>
        </ModalFooter>
      </Modal>

      {/* 자체 수령 [준비 완료] — 고객 알림이 나가는 전이라 한 번 더 확인(develop 문구 · 개발 요청 17·29번) */}
      <NoticeGateModal
        open={overlay === "ready"}
        title="준비 완료"
        count={1}
        confirmLabel="준비 완료 등록"
        onClose={() => setOverlay(null)}
        onConfirm={() => {
          setOverlay(null);
          toast(UNIT_DETAIL_COPY.readyDone);
        }}
      >
        <span>{UNIT_DETAIL_COPY.readyLead(readyDueOf(u))}</span>
        <span>{UNIT_DETAIL_COPY.readyNext}</span>
      </NoticeGateModal>

      {/* 주문 명세 — 원본 `udPriceBox`. 클레임 상세는 환불·교환 몫이 이어진다 */}
      <Modal
        open={overlay === "statement"}
        onClose={() => setOverlay(null)}
        size="medium"
      >
        <ModalHeader closeLabel="대화상자 닫기" title={statementTitleOf(u)} />
        <ModalBody>
          <CalcBreakdown blocks={statementBlocksOf(u, !!claim)} />
        </ModalBody>
        <ModalFooter>
          <Button size="large" onClick={() => setOverlay(null)}>
            닫기
          </Button>
        </ModalFooter>
      </Modal>
    </Shell>
  );
}
