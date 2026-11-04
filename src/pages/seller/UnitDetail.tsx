import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  FormField,
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
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import { CalcBreakdown } from "../babycube/CalcBreakdown";
import {
  SELLER_GNB_LOGO_SLOTS,
  SELLER_GNB_SECTIONS,
} from "../sellerGnbSections";
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
  statusIn,
  type Gate,
} from "./gate.data";
import { GateHost, StatusTag } from "./OrderGates";
import {
  COURIERS,
  courierOf,
  delayReasonOf,
  historyOf,
  orderStat,
  pickupOf,
  salePayTotal,
} from "./orderUnit.data";
import type { OrderUnit } from "./seed/orders.data";
import {
  UNIT_DETAIL_COPY,
  brandOf,
  componentNamesOf,
  extraTelOf,
  growthStageOf,
  headlineOf,
  orNone,
  productCodeOf,
  purchasedAtOf,
  reachedAt,
  receiverOf,
  receiverTelOf,
  shipFeeText,
  statementBlocksOf,
  statementTitleOf,
  type DetailAction,
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

/** 라벨 폭 — 가장 긴 라벨 「상품주문상태」·「수령인 연락처」가 한 줄에 들도록. 모든 구역이 같은 폭(§30-3) */
const LABEL_WIDTH = 120;

const COURIER_OPTIONS = [
  { value: "", label: "선택" },
  ...COURIERS.map((c) => ({ value: c, label: c })),
];

/** 접을 수 있는 구역 — 본사 상세와 같은 규격 */
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
        <Gnb
          sections={SELLER_GNB_SECTIONS}
          activeId={activeNav}
          onSelect={onNavSelect}
          open={navOpen}
          onOpenChange={onNavOpenChange}
          logo={SELLER_GNB_LOGO_SLOTS.logo}
          collapsedLogo={SELLER_GNB_LOGO_SLOTS.collapsed}
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
    <UnitDetailBody key={unit.id} unit={unit} config={config} {...props} />
  );
}

type Overlay = "address" | "statement" | null;

function UnitDetailBody({
  unit: u,
  config,
  ...props
}: UnitDetailProps & { unit: OrderUnit }) {
  const { onNavSelect } = props;
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const [gate, setGate] = useState<Gate | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [courier, setCourier] = useState(courierOf(u));
  const [invoice, setInvoice] = useState(u.invoice ?? "");
  const [address, setAddress] = useState("");

  const claim = CLAIM_SCREEN[config.screen];
  const current = statusIn(config.screen, u);
  const selectable = config.statusOptions.some((o) => o.value === current);
  const shipMode = config.shipMode(u);
  const pickup = pickupOf(u);
  const components = componentNamesOf(u);
  const finish = (message: string) => {
    setGate(null);
    toast(message);
  };

  /** 상태 셀렉트·처리 버튼 — 원본 `rentStatSel`·`rowSet` → `gateRoute`. 같은 값은 아무 일도 없다 */
  const route = (next: string) => {
    if (next === current) return;
    const r = routeGate(next, [u], config.screen);
    if (r.kind === "toast") return toast(r.message);
    setGate(r);
  };

  /** 배송정보 송장 버튼 — 등록(원본 `rentShipOne`) · 수정(`rentInvoiceEdit`) */
  const submitInvoice = () => {
    if (shipMode === "register" && !courier)
      return toast(ACTION_COPY.courierFirst);
    if (!invoice.trim()) return toast(ACTION_COPY.invoiceFirst);
    toast(
      shipMode === "register"
        ? ACTION_COPY.shipped(1)
        : ACTION_COPY.invoiceEdited,
    );
  };

  const runAction = (action: DetailAction) => {
    if ("to" in action) return route(action.to);
    if (action.special === "address") {
      /* 지금 배송지를 채워 연다 — 고쳐 쓰는 흐름(GPT 검토 2026-11-04) */
      setAddress(u.addr && u.addr !== "-" ? u.addr : "");
      return setOverlay("address");
    }
    /* 원본 `act('배송 추적')` — 알림만(조회는 개발 영역) */
    if (action.special === "track") return toast("배송 추적");
    toast(UNIT_DETAIL_COPY.toReturn);
  };

  const closeAddress = () => {
    setAddress("");
    setOverlay(null);
  };

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
              <Item label="결제수단">{orNone(u.payMethod)}</Item>
              <Item label="구매자명">{u.mem}</Item>
              <Item label="구매자 ID">{orNone(u.email)}</Item>
              <Item label="연락처">{orNone(u.tel)}</Item>
              {/* 원본 [상세보기] — 결제금액이 어떻게 나왔는지. 값 곁에 둔다(본사와 같다) */}
              <Item label="결제금액">
                <span className="flex items-center gap-3">
                  <span className="body-medium-bold tabular-nums">
                    {salePayTotal(u).toLocaleString("ko-KR")}원
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
          </InfoList>
        )}
      </Section>

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
                      <Button variant="secondary" onClick={submitInvoice}>
                        {shipMode === "register"
                          ? "송장등록 · 배송처리"
                          : "송장수정"}
                      </Button>
                    </span>
                  )}
                </Item>
              </>
            )}
            <Item label="지연 사유">{delayReasonOf(u)}</Item>
            <Item label="주문확인일">{reachedAt(u, 1)}</Item>
            <Item label="배송처리일">{reachedAt(u, 2)}</Item>
            <Item label="배송완료일">{reachedAt(u, 3)}</Item>
            <Item label="구매확정일">{purchasedAtOf(u)}</Item>
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
            <Item label="배송 메모">{orNone(u.shipMemo)}</Item>
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
            {config.actions(u).map((action) => (
              <Button
                key={action.label}
                variant={action.tone ?? "secondary"}
                onClick={() => runAction(action)}
              >
                {action.label}
              </Button>
            ))}
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
        units={[u]}
        onClose={() => setGate(null)}
        onDone={finish}
      />

      {/* 배송지 변경 — 원본은 브라우저 입력창(prompt). 빈 칸이면 원본처럼 아무 일도 없다 → 버튼 잠금 */}
      <Modal open={overlay === "address"} onClose={closeAddress} size="small">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={UNIT_DETAIL_COPY.addrTitle}
        />
        <ModalBody>
          <FormField label={UNIT_DETAIL_COPY.addrLabel}>
            <Input
              placeholder={UNIT_DETAIL_COPY.addrPlaceholder}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </FormField>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="large" onClick={closeAddress}>
            취소
          </Button>
          <Button
            size="large"
            disabled={!address.trim()}
            onClick={() => {
              closeAddress();
              toast(UNIT_DETAIL_COPY.addrChanged);
            }}
          >
            변경
          </Button>
        </ModalFooter>
      </Modal>

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
