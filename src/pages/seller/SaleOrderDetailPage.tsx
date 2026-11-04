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
  DelayReasonModal,
  SellerCancelModal,
  StatusConfirmModal,
  StatusTag,
} from "./OrderGates";
import {
  COURIERS,
  courierOf,
  delayReasonOf,
  historyOf,
  pickupOf,
  salePayTotal,
} from "./orderUnit.data";
import {
  DETAIL_COPY,
  LIST_PATH,
  STATUS_OPTIONS,
  brandOf,
  componentNamesOf,
  extraTelOf,
  findSaleUnit,
  growthStageOf,
  hasStatusSelect,
  headlineOf,
  isPreShip,
  orNone,
  productCodeOf,
  purchasedAtOf,
  reachedAt,
  receiverOf,
  receiverTelOf,
  shipFeeText,
  statementBlocksOf,
  statementTitleOf,
} from "./SaleOrderDetailPage.data";
import { COPY, won } from "./SaleProcPage.data";
import type { OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 발주 관리 상세(SO-ORD-002) — 상세형 · 처리 화면 (BabyCube 입점사 어드민)
 *
 * ## 구성 — 원본 v0.4 `udOrderPage`(판매 · `saleOrderDetail`)
 * ```
 * 주문정보(결제금액 [주문 명세]) · 상품정보(상태 셀렉트) · 배송정보(택배사·송장 등록) ·
 * 배송지 정보 · 주문 처리 이력                                           (5구역, 각각 접기)
 * [목록]                       [배송지 변경] [주문 취소] [취소] [변경 저장]   ← 하단 고정 바
 * ```
 * 도메인(레코드·상태 선택지·날짜·명세 묶음·문구)은 `./SaleOrderDetailPage.data.ts`,
 * 처리단위 파생값은 `./orderUnit.data.ts`, 상태 전이 창은 `./OrderGates.tsx`(목록과 같은 창).
 *
 * ## 원본을 그대로 둔 것
 * - 상품주문상태 셀렉트(신규 주문·배송 준비·배송 지연·주문 취소) — 고르면 **목록과 같은 게이트**를 지난다
 *   (배송 준비 = 상태 변경 확인 · 배송 지연 = 사유 창 · 주문 취소 = 셀러 사정 취소 창)
 * - 지금 상태가 선택지에 없으면(배송중 이후) 셀렉트 대신 배지 · 배송정보는 읽기만 · 처리 버튼 없음
 * - 택배사는 처리단위 값, 없으면 상품 등록 택배사가 미리 골라져 있다 · [송장등록 · 배송처리]
 * - 방문 수령은 수령지를 보이고 택배 줄을 뺀다
 *
 * ## 본사 퍼블과 같게 둔 것(톤 · `babycube/OrderDetailPage`)
 * 머리(제목 + 처리단위·상품 + 상태 배지) · 읽는 값은 `InfoList` 한 줄씩(원본 2열 짝을 편다) ·
 * 원본 [상세보기] 는 **결제금액 줄의 [주문 명세]** · 명세는 `CalcBreakdown` · 처리 이력 폭 `max-w-3xl` ·
 * 하단 바 순서 `[목록] … [처분] [취소] [저장]`(진한 버튼은 맨 오른쪽 하나) · `?preview=loading|refreshing`
 *
 * ## 기획 변경 반영
 * 배송지 정보 「추가 연락처」(D-349·D-345 — 판매 상세에도, 없으면 「-」)
 *
 * ## 퍼블 범위
 * 업무 버튼은 창 + 알림까지 — 값은 바뀌지 않는다(셀렉트는 창을 닫으면 지금 상태로 돌아온다).
 * 택배사·송장번호는 화면 안에서만 적힌다. 처리단위가 바뀌면 `key` 로 처음부터.
 * ====================================================================== */

export interface SaleOrderDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

/** 라벨 폭 — 가장 긴 라벨 「상품주문상태」·「수령인 연락처」가 한 줄에 들도록. 모든 구역이 같은 폭(§30-3) */
const LABEL_WIDTH = 120;

const COURIER_OPTIONS = [
  { value: "", label: "선택" },
  ...COURIERS.map((c) => ({ value: c, label: c })),
];

type Gate =
  | { kind: "confirm"; next: string }
  | { kind: "delay" }
  | { kind: "cancel" }
  | { kind: "address" }
  | { kind: "statement" }
  | null;

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
}: SaleOrderDetailPageProps & { header: ReactNode; children: ReactNode }) {
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

export function SaleOrderDetailPage(props: SaleOrderDetailPageProps) {
  const pathname = usePathname();
  /* 경로는 `/sale-proc/{처리단위}` **한 조각**이어야 한다 */
  const rest = pathname.slice(LIST_PATH.length + 1);
  const unit = rest.includes("/")
    ? undefined
    : findSaleUnit(lastPathSegment(pathname));

  if (!unit) {
    return (
      <Shell {...props} header={<PageHeader title={DETAIL_COPY.title} />}>
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<ShoppingCart strokeWidth={1.2} aria-hidden />}
              title={DETAIL_COPY.notFoundTitle}
              description={DETAIL_COPY.notFoundDescription}
            >
              <Button
                variant="secondary"
                onClick={() => props.onNavSelect(LIST_PATH)}
              >
                발주 관리로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  /* 처리단위마다 처음부터 — 접힘·적은 송장·열린 창이 다음 건에 묻어가지 않게 */
  return <SaleOrderDetailBody key={unit.id} unit={unit} {...props} />;
}

function SaleOrderDetailBody({
  unit: u,
  ...props
}: SaleOrderDetailPageProps & { unit: OrderUnit }) {
  const { onNavSelect } = props;
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const [gate, setGate] = useState<Gate>(null);
  const [courier, setCourier] = useState(courierOf(u));
  const [invoice, setInvoice] = useState(u.invoice ?? "");
  const [address, setAddress] = useState("");

  const preShip = isPreShip(u);
  const pickup = pickupOf(u);
  const components = componentNamesOf(u);
  const close = () => setGate(null);
  const finish = (message: string) => {
    setGate(null);
    toast(message);
  };

  /** 상태 셀렉트 — 원본 `rentStatSel` → `gateRoute`. 같은 값은 아무 일도 없다 */
  const pickStatus = (next: string) => {
    if (next === u.stat) return;
    if (next === "취소") return setGate({ kind: "cancel" });
    if (next === "배송 지연") return setGate({ kind: "delay" });
    setGate({ kind: "confirm", next });
  };

  /** [송장등록 · 배송처리] — 원본 `rentShipOne`(판매는 출고 이미지 확인이 없다) */
  const shipOne = () => {
    if (!courier) return toast(COPY.courierFirst);
    if (!invoice.trim()) return toast(COPY.invoiceFirst);
    toast(COPY.shipped(1));
  };

  const closeAddress = () => {
    setAddress("");
    close();
  };

  return (
    <Shell
      {...props}
      header={
        <PageHeader
          title={DETAIL_COPY.title}
          description={headlineOf(u)}
          badges={<StatusTag status={u.stat ?? ""} />}
        />
      }
    >
      <Section title="주문정보" busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={7} />
        ) : (
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
                  {won(salePayTotal(u))}
                </span>
                <TextButton
                  size="small"
                  onClick={() => setGate({ kind: "statement" })}
                >
                  주문 명세
                </TextButton>
              </span>
            </Item>
          </InfoList>
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
            <Item label="상품주문상태">
              {hasStatusSelect(u) ? (
                /* 값은 지금 상태에 묶는다 — 창을 닫거나 확인해도 그대로(퍼블 범위) */
                <Select
                  className="w-56"
                  aria-label="상품주문상태"
                  options={[...STATUS_OPTIONS]}
                  value={u.stat ?? ""}
                  onValueChange={pickStatus}
                />
              ) : (
                <StatusTag status={u.stat ?? ""} />
              )}
            </Item>
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
                  {preShip ? (
                    <Select
                      className="w-56"
                      aria-label="택배사"
                      options={COURIER_OPTIONS}
                      value={courier}
                      onValueChange={setCourier}
                    />
                  ) : (
                    orNone(courier)
                  )}
                </Item>
                <Item label="송장번호">
                  {preShip ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <Input
                        className="w-60"
                        inputMode="numeric"
                        aria-label="송장번호"
                        placeholder="송장번호 입력"
                        value={invoice}
                        onChange={(event) => setInvoice(event.target.value)}
                      />
                      <Button variant="secondary" onClick={shipOne}>
                        송장등록 · 배송처리
                      </Button>
                    </span>
                  ) : (
                    orNone(invoice)
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
                {historyOf(u).map(([stat, at]) => (
                  <TableRow key={stat}>
                    <TableTd>
                      <StatusTag status={stat} />
                    </TableTd>
                    <TableTd className="tabular-nums">{at}</TableTd>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      {/*
        하단 고정 바 (원본 `nv-bar`) — `[목록]  …  [배송지 변경] [주문 취소] [취소] [변경 저장]`.
        진한 버튼은 [변경 저장] 하나고 맨 오른쪽이다(본사 상세와 같은 순서 · 원본은 [변경 저장] 뒤에 [취소]).
        [배송지 변경]·[주문 취소]는 출고 전에만(원본 `preShip`). [취소]는 저장하지 않고 목록으로.
      */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            {preShip && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setGate({ kind: "address" })}
                >
                  배송지 변경
                </Button>
                <Button
                  variant="criticalTonal"
                  onClick={() => setGate({ kind: "cancel" })}
                >
                  주문 취소
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
              취소
            </Button>
            <Button onClick={() => toast(DETAIL_COPY.saved(u))}>
              변경 저장
            </Button>
          </div>
        </div>
      </Card>

      <StatusConfirmModal
        open={gate?.kind === "confirm"}
        count={1}
        current={u.stat ?? null}
        next={gate?.kind === "confirm" ? gate.next : ""}
        onClose={close}
        onConfirm={() =>
          gate?.kind === "confirm" && finish(COPY.changed(gate.next, 1))
        }
      />
      <DelayReasonModal
        open={gate?.kind === "delay"}
        count={1}
        onClose={close}
        onConfirm={(reason) => finish(COPY.delayed(reason, 1))}
      />
      <SellerCancelModal
        open={gate?.kind === "cancel"}
        count={1}
        onClose={close}
        onConfirm={() => finish(COPY.canceled)}
      />

      {/* 배송지 변경 — 원본은 브라우저 입력창(prompt). 빈 칸이면 원본처럼 아무 일도 없다 → 버튼 잠금 */}
      <Modal
        open={gate?.kind === "address"}
        onClose={closeAddress}
        size="small"
      >
        <ModalHeader closeLabel="대화상자 닫기" title={DETAIL_COPY.addrTitle} />
        <ModalBody>
          <FormField label={DETAIL_COPY.addrLabel}>
            <Input
              placeholder={DETAIL_COPY.addrPlaceholder}
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
              setAddress("");
              finish(DETAIL_COPY.addrChanged);
            }}
          >
            변경
          </Button>
        </ModalFooter>
      </Modal>

      {/* 주문 명세 — 원본 `udPriceBox`(판매) */}
      <Modal open={gate?.kind === "statement"} onClose={close} size="medium">
        <ModalHeader closeLabel="대화상자 닫기" title={statementTitleOf(u)} />
        <ModalBody>
          <CalcBreakdown blocks={statementBlocksOf(u)} />
        </ModalBody>
        <ModalFooter>
          <Button size="large" onClick={close}>
            닫기
          </Button>
        </ModalFooter>
      </Modal>
    </Shell>
  );
}
