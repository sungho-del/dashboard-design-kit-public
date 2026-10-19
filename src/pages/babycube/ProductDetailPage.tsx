import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Package, Plus, X } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  DatePicker,
  EmptyState,
  FormField,
  Gnb,
  IconButton,
  Input,
  PageHeader,
  Radio,
  RadioGroup,
  SegmentedControl,
  Select,
  Skeleton,
  Tag,
  Textarea,
  TextButton,
  useToast,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import {
  CATEGORY_TREES,
  DISPLAY_META,
  STATUS_META,
  approveMessage,
  canApprove,
  canReject,
  hasRejectReason,
  rejectMessage,
  ymdhms,
  type Product,
  type ProductMode,
} from "./ProductListPage.data";
import {
  COMMENT_MAX,
  COPY,
  GRADES,
  NAME_MAX,
  PERIOD_MAX,
  SECTION_OF,
  TAGS_MAX,
  discountOf,
  draftOf,
  findProduct,
  num,
  periodSummary,
  slotName,
  validate,
  won,
  type DiscountType,
  type FieldKey,
  type ProductDraft,
  type SectionKey,
} from "./ProductDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";
import { ProductRejectModal } from "./shared/ProductRejectModal";

/* =========================================================================
 * 상품 상세 (BO-PRD-002) — 폼형 · 뼈대
 *
 * ## ⚠️ 구성은 **원본 v0.4 상품 등록 폼의 수정 모드** 그대로다 (`openProductForm(id,'seller')`)
 *
 * ```
 * 상품명 · 유형 · 카테고리 · 가격(· 렌트 기간) · 렌트 수량 | 재고 수량 · 노출 관리
 * [목록]                 [승인 처리] [반려 처리] [수정 저장] [취소]   ← 하단 고정 바
 * ```
 * 섹션은 **전부 펼친 채로** 시작하고 각각 접을 수 있다(원본 `nvSec`).
 * 렌트 수량과 재고 수량은 서로 대체된다 — 렌트면 렌트 수량, 판매면 재고 수량 하나만 나온다.
 *
 * ⚠️ **1단계** (2026-10-19) — 상품이미지·상세설명·상품 주요정보·배송·옵션 섹션은 2단계에서 붙는다.
 * 그때까지 상품 목록은 이 화면으로 이동하지 않는다(상품명·[수정] = 준비 중 알림).
 *
 * ## 원본 정책 — 화면이 강제하는 것
 * - **판매 상태는 고치지 않는다** — 처분(하단 바)으로만 바뀐다. 처분 건(반려·재심사요청)은 전시 상태도 잠근다
 * - 처분 버튼은 상태가 정한다(`canApprove`/`canReject` — 목록과 같은 규칙)
 * - 반려는 사유 필수 — 상품 목록과 **같은 창**(`shared/ProductRejectModal`). 승인은 확인 창 없이
 * - [수정 저장] 은 원본 `pfValidate` 를 통과해야 한다. 통과하면 알림 후 **목록으로 간다**(원본 흐름)
 * - [취소]·[목록] 은 확인 없이 목록으로 간다(원본 `pfCancel`)
 * - 등록 주체·유형도 고칠 수 있다(원본 — 2026-10-19 사용자 결정 「기획대로 열기」).
 *   유형을 바꾸면 트리가 달라 카테고리를 비운다(원본은 비우지 않아 다른 유형의 분류가 남았다)
 *
 * ## 퍼블 범위
 * 입력·계산·행 추가/삭제·슬롯 토글은 **이 상품 본문의 state** 만 바꾼다. 저장·승인·반려는 알림만 띄우고,
 * 처분 뒤에도 배지·잠금·버튼은 그대로다(입점 심사 상세와 같다). 상품이 바뀌면 `key` 로 처음부터.
 *
 * ## 원본과 다르게 둔 곳
 * - 머리에 상품명·상품코드·셀러와 **저장된** 판매·전시 상태 배지(원본은 제목만) — 다른 상세와 같은 머리
 * - 저장 오류는 첫 오류 토스트가 아니라 **칸 아래 인라인** + 접힌 섹션을 펼치고 첫 오류로 이동(폼 규격 §29)
 * - 기간 옵션이 5개면 [추가] 를 잠그고 안내를 늘 보인다 — 원본은 6번째에 띄울 경고 창이 그려지지 않는다
 * - 판매 상태 안내는 그 상태에 **실제로 있는 버튼**을 가리킨다(원본은 반려 건에도 [반려 처리]를 가리킨다)
 * - 렌트 수량의 「초과 상태 — 신규 예약 차단 중」 은 진행 중 예약 데이터가 없어 그리지 않는다
 * ====================================================================== */

export interface ProductDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 목록 경로 — 돌아가는 곳이자, 없는 상품일 때 돌려보내는 곳 */
const LIST_PATH = "/products";

/** 칸 → 입력칸 id. 첫 오류로 이동할 때 이 id 를 찾는다 */
const fieldId = (key: FieldKey) => `product-field-${key}`;

/** 숫자 칸 — 저장은 숫자 글자만, 보이기는 천 단위 쉼표 */
const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");
const withCommas = (value: string) =>
  value === "" ? "" : Number(value).toLocaleString("ko-KR");

/** 할인 단위 — 원본 `%` / `원` */
const DISCOUNT_TYPES: { value: DiscountType; label: string }[] = [
  { value: "rate", label: "%" },
  { value: "amt", label: "원" },
];

const ON_OFF = [
  { value: "on", label: "설정함" },
  { value: "off", label: "설정안함" },
];

/** 접을 수 있는 섹션 한 장 — 회원·셀러 상세와 같은 규격. 열림은 본문이 쥔다(오류가 있으면 펼친다) */
function Section({
  title,
  required = false,
  open,
  onToggle,
  busy,
  dim,
  children,
}: {
  title: string;
  required?: boolean;
  open: boolean;
  onToggle: () => void;
  busy: boolean;
  dim: string | undefined;
  children: ReactNode;
}) {
  return (
    <Card variant="soft" aria-busy={busy}>
      <CardHeader
        title={
          required ? (
            <>
              {title}
              {/* 원본 필수 ● — 시각 기호라 읽지 않는다. 필수 여부는 안의 칸이 말한다 */}
              <span aria-hidden className="text-text-critical">
                {" "}
                *
              </span>
            </>
          ) : (
            title
          )
        }
        action={
          <IconButton
            variant="ghost"
            size="small"
            label={`${title} ${open ? "접기" : "펼치기"}`}
            aria-expanded={open}
            onClick={onToggle}
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

/** 계산된 값 — 고치는 칸이 아니라 읽는 줄이다(원본 렌트가·최종 렌트 금액) */
function ReadField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label-medium-bold text-text">{label}</span>
      <div className="body-medium flex flex-wrap items-center gap-2 text-text">
        {children}
      </div>
    </div>
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

export function ProductDetailPage(props: ProductDetailPageProps) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  /*
    경로는 `/products/{상품코드}` **한 조각**이어야 한다. `lastPathSegment` 만 보면
    `/products/아무거나/BL240814` 도 열려 버린다.
  */
  const rest = pathname.slice(LIST_PATH.length + 1);
  const product = rest.includes("/")
    ? undefined
    : findProduct(lastPathSegment(pathname));

  if (!product) {
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
        header={<PageHeader title={COPY.title} />}
      >
        <Card variant="soft">
          <CardBody>
            {/* 표가 아니라 **화면 전체가 없는 것**이다 — §16 의 `page` 가 그 자리다(다른 상세와 같다) */}
            <EmptyState
              size="page"
              icon={<Package strokeWidth={1.2} aria-hidden />}
              title="찾을 수 없는 상품입니다"
              description="주소가 잘못되었거나 삭제된 상품일 수 있습니다."
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                상품 관리 목록으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  /* 상품마다 처음부터 — 고친 값·오류·접힘·열린 창이 다음 상품에 묻어가지 않게 */
  return <ProductDetailBody key={product.id} product={product} {...props} />;
}

function ProductDetailBody({
  product,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: ProductDetailPageProps & { product: Product }) {
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const [draft, setDraft] = useState<ProductDraft>(() => draftOf(product));
  const [closed, setClosed] = useState<SectionKey[]>([]);
  /** [수정 저장] 을 한 번 누른 뒤부터 오류를 보인다 — 입력 도중에 빨갛게 하지 않는다 */
  const [tried, setTried] = useState(false);
  const [focusTarget, setFocusTarget] = useState<FieldKey | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const isOpen = (key: SectionKey) => !closed.includes(key);
  const toggle = (key: SectionKey) =>
    setClosed((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const errors = tried ? validate(draft) : {};
  const rent = draft.mode === "rent";

  /* 첫 오류로 이동 — 섹션을 펼친 **다음 그림**에서야 입력칸이 생기므로 효과에서 옮긴다 */
  useEffect(() => {
    if (!focusTarget) return;
    document.getElementById(fieldId(focusTarget))?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  const save = () => {
    setTried(true);
    const found = validate(draft);
    const keys = Object.keys(found) as FieldKey[];
    if (keys.length > 0) {
      /* 오류가 든 섹션은 펼친다 — 접힌 채로 두면 "저장이 안 되는데 이유가 안 보인다" */
      const sections = keys.map((key) => SECTION_OF[key]);
      setClosed((prev) => prev.filter((key) => !sections.includes(key)));
      setFocusTarget(keys[0]);
      return;
    }
    toast(COPY.saved);
    onNavSelect(LIST_PATH);
  };

  /* 유형을 바꾸면 트리가 달라 카테고리를 비운다 */
  const changeMode = (mode: ProductMode) =>
    setDraft((prev) => ({
      ...prev,
      mode,
      major: "",
      middle: "",
      minor: "",
    }));

  /* 카테고리 3단 연쇄 — 유형별 트리, 하위가 있을 때만 다음 셀렉트가 나온다(원본) */
  const tree = CATEGORY_TREES[draft.mode];
  const majorNode = tree.find((node) => node.value === draft.major);
  const middleNode = majorNode?.children?.find(
    (node) => node.value === draft.middle,
  );
  const optionsOf = (nodes: { value: string; label: string }[] = []) =>
    nodes.map((node) => ({ value: node.value, label: node.label }));

  /* 가격 계산 — 원본 `pfDiscAbs` */
  const rentDisc = discountOf(
    draft.rentBase,
    draft.rentDiscOn,
    draft.rentDiscType,
    draft.rentDiscVal,
  );
  const dayRate = Math.max(0, num(draft.rentBase) - rentDisc);
  const baseDays = num(draft.baseRentDays);
  const saleDisc = discountOf(
    draft.saleBase,
    draft.saleDiscOn,
    draft.saleDiscType,
    draft.saleDiscVal,
  );
  const salePrice = Math.max(0, num(draft.saleBase) - saleDisc);

  const setPeriod = (id: number, key: "days" | "price", value: string) =>
    set(
      "periods",
      draft.periods.map((row) =>
        row.id === id ? { ...row, [key]: onlyDigits(value) } : row,
      ),
    );
  const addPeriod = () =>
    set("periods", [
      ...draft.periods,
      {
        id: Math.max(0, ...draft.periods.map((row) => row.id)) + 1,
        days: "",
        price: "",
      },
    ]);
  /* 마지막 한 줄을 지우면 빈 줄 하나가 남는다(원본) */
  const removePeriod = (id: number) => {
    const rows = draft.periods.filter((row) => row.id !== id);
    set(
      "periods",
      rows.length > 0 ? rows : [{ id: id + 1, days: "", price: "" }],
    );
  };

  /* 렌트 수량 — 줄이면 범위를 벗어난 중지 슬롯을 정리한다(원본 `pfQtySet`) */
  const setRentQty = (value: string) => {
    const qty = onlyDigits(value);
    setDraft((prev) => ({
      ...prev,
      rentQty: qty,
      slotOff: prev.slotOff.filter((n) => n <= num(qty)),
    }));
  };
  const toggleSlot = (n: number) =>
    set(
      "slotOff",
      draft.slotOff.includes(n)
        ? draft.slotOff.filter((value) => value !== n)
        : [...draft.slotOff, n],
    );

  const statusMeta = STATUS_META[product.status];
  const displayMeta = DISPLAY_META[product.display];
  const locked = hasRejectReason(product);
  const approvable = canApprove(product);
  const rejectable = canReject(product);
  const saleStatusHelp =
    approvable && rejectable
      ? COPY.saleStatusHelp.both
      : approvable
        ? COPY.saleStatusHelp.approve
        : COPY.saleStatusHelp.reject;

  /** 할인 블록 — 원본 「설정함/설정안함 + 값 + %/원」 */
  const discountBlock = (
    kind: "rent" | "sale",
    label: string,
    errorKey: FieldKey,
  ) => {
    const on = kind === "rent" ? draft.rentDiscOn : draft.saleDiscOn;
    const type = kind === "rent" ? draft.rentDiscType : draft.saleDiscType;
    const value = kind === "rent" ? draft.rentDiscVal : draft.saleDiscVal;
    const amount = kind === "rent" ? rentDisc : saleDisc;
    return (
      <>
        <FormField label={label} group>
          <SegmentedControl
            className="self-start"
            items={ON_OFF}
            value={on ? "on" : "off"}
            onValueChange={(next) =>
              set(kind === "rent" ? "rentDiscOn" : "saleDiscOn", next === "on")
            }
          />
        </FormField>
        {on ? (
          <FormField
            label={`${label} 값`}
            htmlFor={fieldId(errorKey)}
            error={errors[errorKey]}
            description={amount > 0 ? `${won(amount)} 할인` : undefined}
            suffix={
              <Select
                className="w-20"
                aria-label={`${label} 단위`}
                options={DISCOUNT_TYPES}
                value={type}
                onValueChange={(next) =>
                  set(
                    kind === "rent" ? "rentDiscType" : "saleDiscType",
                    next as DiscountType,
                  )
                }
              />
            }
          >
            <Input
              id={fieldId(errorKey)}
              inputMode="numeric"
              placeholder={kind === "rent" ? "렌트가에서" : "판매가에서"}
              value={type === "amt" ? withCommas(value) : value}
              invalid={Boolean(errors[errorKey])}
              onChange={(event) =>
                set(
                  kind === "rent" ? "rentDiscVal" : "saleDiscVal",
                  onlyDigits(event.target.value),
                )
              }
            />
          </FormField>
        ) : null}
      </>
    );
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
        /* 배지는 **저장된** 상태다(회원·셀러 상세와 같다) — 화면에서 고친 전시 선택과 섞지 않는다 */
        <PageHeader
          title={COPY.title}
          description={`${product.name} · ${product.id} · ${product.seller}`}
          badges={
            <>
              <Tag tone={statusMeta.tone} dot>
                {statusMeta.label}
              </Tag>
              <Tag tone={displayMeta.tone}>{displayMeta.label}</Tag>
            </>
          }
        />
      }
    >
      {/* ① 상품명 */}
      <Section
        title={COPY.sections.name}
        required
        open={isOpen("name")}
        onToggle={() => toggle("name")}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={1} />
        ) : (
          <FormField
            label="상품명"
            required
            htmlFor={fieldId("name")}
            error={errors.name}
            labelAction={
              <span className="body-small text-text-sub tabular-nums">
                {draft.name.length}/{NAME_MAX}
              </span>
            }
          >
            <Input
              id={fieldId("name")}
              maxLength={NAME_MAX}
              placeholder={COPY.namePlaceholder}
              value={draft.name}
              invalid={Boolean(errors.name)}
              onChange={(event) => set("name", event.target.value)}
            />
          </FormField>
        )}
      </Section>

      {/* ② 유형 — 판매면 상품 상태, 중고면 최초 구매일·등급 */}
      <Section
        title={COPY.sections.mode}
        required
        open={isOpen("mode")}
        onToggle={() => toggle("mode")}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={2} />
        ) : (
          <>
            <FormField label="유형" required group>
              <SegmentedControl
                className="self-start"
                items={[
                  { value: "rent", label: "렌트" },
                  { value: "sale", label: "판매" },
                ]}
                value={draft.mode}
                onValueChange={(next) => changeMode(next as ProductMode)}
              />
            </FormField>
            {draft.mode === "sale" ? (
              <FormField label="상품 상태" required group>
                <SegmentedControl
                  className="self-start"
                  items={[
                    { value: "new", label: "새상품" },
                    { value: "used", label: "중고 상품" },
                  ]}
                  value={draft.condition}
                  onValueChange={(next) =>
                    set("condition", next as ProductDraft["condition"])
                  }
                />
              </FormField>
            ) : null}
            {draft.mode === "sale" && draft.condition === "used" ? (
              <>
                <FormField label="최초 구매일" required>
                  <DatePicker
                    className="w-60"
                    value={
                      draft.firstBuyDate
                        ? new Date(`${draft.firstBuyDate}T00:00:00`)
                        : undefined
                    }
                    onChange={(next) =>
                      set(
                        "firstBuyDate",
                        next
                          ? `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`
                          : "",
                      )
                    }
                    placeholder="날짜 선택"
                  />
                </FormField>
                <FormField label="상품 등급" required group>
                  <RadioGroup
                    value={draft.grade}
                    onValueChange={(next) => set("grade", next)}
                    orientation="horizontal"
                  >
                    {GRADES.map((grade) => (
                      <Radio key={grade} value={grade} label={grade} />
                    ))}
                  </RadioGroup>
                </FormField>
              </>
            ) : null}
          </>
        )}
      </Section>

      {/* ③ 카테고리 — 유형별 트리 3단. 대분류가 필수다(원본은 소분류까지 요구하지 않는다) */}
      <Section
        title={COPY.sections.category}
        required
        open={isOpen("category")}
        onToggle={() => toggle("category")}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={1} />
        ) : (
          <FormField
            label={`카테고리 (${rent ? "렌트" : "판매"})`}
            required
            group
            error={errors.category}
          >
            <div role="group" className="flex flex-wrap gap-2">
              <Select
                id={fieldId("category")}
                className="w-60"
                aria-label="대분류"
                placeholder="대분류 선택"
                options={optionsOf(tree)}
                value={draft.major}
                invalid={Boolean(errors.category)}
                onValueChange={(next) =>
                  setDraft((prev) => ({
                    ...prev,
                    major: next,
                    middle: "",
                    minor: "",
                  }))
                }
              />
              {majorNode?.children?.length ? (
                <Select
                  className="w-60"
                  aria-label="중분류"
                  placeholder="중분류 선택"
                  options={optionsOf(majorNode.children)}
                  value={draft.middle}
                  onValueChange={(next) =>
                    setDraft((prev) => ({ ...prev, middle: next, minor: "" }))
                  }
                />
              ) : null}
              {middleNode?.children?.length ? (
                <Select
                  className="w-60"
                  aria-label="소분류"
                  placeholder="소분류 선택"
                  options={optionsOf(middleNode.children)}
                  value={draft.minor}
                  onValueChange={(next) => set("minor", next)}
                />
              ) : null}
            </div>
          </FormField>
        )}
      </Section>

      {/* ④ 가격 — 렌트는 「가격 · 렌트 기간」(일 단가 · 기본 렌트일 · 기간 옵션) */}
      <Section
        title={rent ? COPY.sections.priceRent : COPY.sections.priceSale}
        required
        open={isOpen("price")}
        onToggle={() => toggle("price")}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={5} />
        ) : rent ? (
          <>
            <FormField
              label="렌트 원가"
              required
              htmlFor={fieldId("rentBase")}
              description={COPY.rentBaseHelp}
              error={errors.rentBase}
              suffix="원/일"
            >
              <Input
                id={fieldId("rentBase")}
                inputMode="numeric"
                placeholder="0"
                value={withCommas(draft.rentBase)}
                invalid={Boolean(errors.rentBase)}
                onChange={(event) =>
                  set("rentBase", onlyDigits(event.target.value))
                }
              />
            </FormField>
            {discountBlock("rent", "렌트 할인", "rentDisc")}
            <ReadField label="렌트가">
              <span className="label-large-bold">{won(dayRate)}/일</span>
              {rentDisc > 0 ? (
                <span className="text-text-sub">({won(rentDisc)} 할인)</span>
              ) : null}
            </ReadField>
            <FormField
              label="기본 렌트일"
              required
              description={COPY.baseRentDaysHelp}
              suffix="일"
            >
              <Input
                inputMode="numeric"
                placeholder="0"
                value={draft.baseRentDays}
                onChange={(event) =>
                  set("baseRentDays", onlyDigits(event.target.value))
                }
              />
            </FormField>
            <ReadField label="최종 렌트 금액">
              <span className="label-large-bold">
                {won(dayRate * baseDays)}
              </span>
              <span className="text-text-sub">
                {baseDays > 0
                  ? `렌트가 ${won(dayRate)}/일 × 기본 렌트일 ${baseDays}일`
                  : COPY.finalRentEmpty}
              </span>
            </ReadField>
            <p className="body-small -mt-3 text-text-sub">
              {COPY.finalRentHelp}
            </p>
            <FormField
              label="보증금"
              description={COPY.depositHelp}
              suffix="원"
            >
              <Input
                inputMode="numeric"
                placeholder="0"
                value={withCommas(draft.deposit)}
                onChange={(event) =>
                  set("deposit", onlyDigits(event.target.value))
                }
              />
            </FormField>
            <FormField label="기간 옵션" group>
              <SegmentedControl
                className="self-start"
                items={ON_OFF}
                value={draft.periodOn ? "on" : "off"}
                onValueChange={(next) => set("periodOn", next === "on")}
              />
            </FormField>
            {draft.periodOn ? (
              <div className="flex flex-col gap-3">
                <p className="body-small text-text-sub">{COPY.periodHelp}</p>
                {draft.periods.map((row, index) => {
                  const summary = periodSummary(row, dayRate);
                  const label = `기간 옵션 ${index + 1}`;
                  return (
                    <div
                      key={row.id}
                      role="group"
                      aria-label={label}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Input
                        id={index === 0 ? fieldId("periods") : undefined}
                        className="w-60"
                        aria-label={`${label} 일수`}
                        inputMode="numeric"
                        placeholder="일수"
                        value={row.days}
                        invalid={Boolean(errors.periods)}
                        onChange={(event) =>
                          setPeriod(row.id, "days", event.target.value)
                        }
                        rightIcon={
                          <span className="body-small text-text-sub">일</span>
                        }
                      />
                      <span className="body-medium text-text-sub">
                        장기 렌트 할인가
                      </span>
                      <Input
                        className="w-60"
                        aria-label={`${label} 장기 렌트 할인가`}
                        inputMode="numeric"
                        placeholder="숫자만 입력"
                        value={withCommas(row.price)}
                        invalid={Boolean(errors.periods)}
                        onChange={(event) =>
                          setPeriod(row.id, "price", event.target.value)
                        }
                        rightIcon={
                          <span className="body-small text-text-sub">원</span>
                        }
                      />
                      {summary ? (
                        <span className="body-medium flex items-center gap-2 text-text">
                          <span aria-hidden>→</span>
                          <span className="label-medium-bold">
                            {summary.label}
                          </span>
                          {summary.percent > 0 ? (
                            <>
                              <s className="text-text-minimal">
                                {won(summary.regular)}
                              </s>
                              <span className="label-medium-bold">
                                {won(summary.price)}
                              </span>
                              <span className="text-text-sub">
                                {summary.percent}% 할인
                              </span>
                            </>
                          ) : summary.price > 0 ? (
                            <span>= {won(summary.price)}</span>
                          ) : null}
                        </span>
                      ) : null}
                      <IconButton
                        variant="ghost"
                        size="small"
                        label={`${label} 삭제`}
                        onClick={() => removePeriod(row.id)}
                        icon={<X strokeWidth={1.2} aria-hidden />}
                      />
                    </div>
                  );
                })}
                {errors.periods ? (
                  <p role="alert" className="body-small text-text-critical">
                    {errors.periods}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <TextButton
                    disabled={draft.periods.length >= PERIOD_MAX}
                    onClick={addPeriod}
                  >
                    <Plus size={16} strokeWidth={1.2} aria-hidden />
                    기간 옵션 추가
                  </TextButton>
                  {/* 잠긴 버튼은 이유를 스스로 말하지 못한다 — 툴팁이 아니라 곁에 늘 적는다 */}
                  {draft.periods.length >= PERIOD_MAX ? (
                    <span className="body-small text-text-sub">
                      {COPY.periodFull}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <FormField
              label="판매 원가"
              required
              htmlFor={fieldId("saleBase")}
              description={COPY.saleBaseHelp}
              error={errors.saleBase}
              suffix="원"
            >
              <Input
                id={fieldId("saleBase")}
                inputMode="numeric"
                placeholder="0"
                value={withCommas(draft.saleBase)}
                invalid={Boolean(errors.saleBase)}
                onChange={(event) =>
                  set("saleBase", onlyDigits(event.target.value))
                }
              />
            </FormField>
            {discountBlock("sale", "판매 할인", "saleDisc")}
            <ReadField label="판매가">
              <span className="label-large-bold">{won(salePrice)}</span>
              {saleDisc > 0 ? (
                <span className="text-text-sub">({won(saleDisc)} 할인)</span>
              ) : null}
            </ReadField>
          </>
        )}
      </Section>

      {/* ⑤ 렌트 수량(렌트) / 재고 수량(판매) — 둘 중 하나만 */}
      <Section
        title={rent ? COPY.sections.rentQty : COPY.sections.stock}
        required
        open={isOpen("quantity")}
        onToggle={() => toggle("quantity")}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={2} />
        ) : rent ? (
          <>
            <FormField
              label="렌트 수량"
              required
              htmlFor={fieldId("rentQty")}
              description={COPY.rentQtyHelp}
              error={errors.rentQty}
              suffix="개"
            >
              <Input
                id={fieldId("rentQty")}
                inputMode="numeric"
                placeholder="0"
                value={draft.rentQty}
                invalid={Boolean(errors.rentQty)}
                onChange={(event) => setRentQty(event.target.value)}
              />
            </FormField>
            {num(draft.rentQty) > 0 ? (
              <ul className="flex flex-col gap-2" aria-label="렌트 슬롯">
                {Array.from({ length: num(draft.rentQty) }, (_, index) => {
                  const n = index + 1;
                  const name = slotName(product.id, n);
                  const off = draft.slotOff.includes(n);
                  return (
                    <li key={n} className="flex items-center gap-3">
                      <span className="label-medium-bold w-28 text-text tabular-nums">
                        {name}
                      </span>
                      <SegmentedControl
                        aria-label={`${name} 상태`}
                        items={[
                          { value: "on", label: "활성" },
                          { value: "off", label: "중지" },
                        ]}
                        value={off ? "off" : "on"}
                        onValueChange={() => toggleSlot(n)}
                      />
                      {off ? (
                        <span className="body-small text-text-sub">
                          {COPY.slotOffNote}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </>
        ) : (
          /* 원본도 재고 수량을 검사하지 않는다 — 0 은 품절이라는 정상 상태다 */
          <FormField
            label="재고 수량"
            required
            description={COPY.stockHelp}
            suffix="개"
          >
            <Input
              inputMode="numeric"
              placeholder="0"
              value={draft.stock}
              onChange={(event) => set("stock", onlyDigits(event.target.value))}
            />
          </FormField>
        )}
      </Section>

      {/* ⑫ 노출 관리 — 판매 상태는 처분으로만 · 처분 건은 전시도 잠금 */}
      <Section
        title={COPY.sections.display}
        open={isOpen("display")}
        onToggle={() => toggle("display")}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={4} />
        ) : (
          <>
            <ReadField label="판매 상태">
              <Tag tone={statusMeta.tone} dot>
                {statusMeta.label}
              </Tag>
            </ReadField>
            <div className="-mt-3 flex flex-col gap-2">
              <p className="body-small text-text-sub">{saleStatusHelp}</p>
              {locked ? (
                <p className="body-medium text-text-warning">
                  {product.reject?.reason ?? "등록된 반려 사유가 없습니다."}
                  {product.reject ? (
                    <span className="text-text-sub tabular-nums">
                      {" "}
                      ({ymdhms(product.reject.at)})
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
            {locked ? (
              <>
                <ReadField label="전시 상태">
                  <Tag tone={displayMeta.tone}>{displayMeta.label}</Tag>
                </ReadField>
                <p className="body-small -mt-3 text-text-sub">
                  {product.status === "rereview"
                    ? COPY.displayLocked.rereview
                    : COPY.displayLocked.rejected}
                </p>
              </>
            ) : (
              <FormField label="전시 상태" group>
                <SegmentedControl
                  className="self-start"
                  items={[
                    { value: "shown", label: "전시중" },
                    { value: "hidden", label: "전시중지" },
                  ]}
                  value={draft.display}
                  onValueChange={(next) =>
                    set("display", next as ProductDraft["display"])
                  }
                />
              </FormField>
            )}
            <FormField
              label="상품 코멘트"
              description={COPY.commentHelp}
              /* 글자 수는 `Textarea` 가 maxLength 로 스스로 센다 — 머리에 또 두지 않는다 */
            >
              <Textarea
                minRows={2}
                maxLength={COMMENT_MAX}
                placeholder={COPY.commentPlaceholder}
                value={draft.comment}
                onChange={(event) => set("comment", event.target.value)}
              />
            </FormField>
            <FormField
              label="검색 태그"
              htmlFor={fieldId("tags")}
              description={COPY.tagsHelp}
              error={errors.tags}
              labelAction={
                <span className="body-small text-text-sub tabular-nums">
                  {draft.tags.length}/{TAGS_MAX}
                </span>
              }
            >
              <Input
                id={fieldId("tags")}
                maxLength={TAGS_MAX}
                placeholder={COPY.tagsPlaceholder}
                value={draft.tags}
                invalid={Boolean(errors.tags)}
                onChange={(event) => set("tags", event.target.value)}
              />
            </FormField>
          </>
        )}
      </Section>

      {/*
        하단 고정 바 (원본 `nv-bar`) — `[목록]  …  [처분] [수정 저장] [취소]`.
        진한 버튼은 [수정 저장] 하나다. 처분 버튼은 상태가 정한다(목록과 같은 자격 규칙).
      */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            {approvable ? (
              <Button
                variant="secondary"
                onClick={() => toast(approveMessage(1, 0))}
              >
                승인 처리
              </Button>
            ) : null}
            {rejectable ? (
              <Button
                variant="criticalTonal"
                onClick={() => setRejectOpen(true)}
              >
                반려 처리
              </Button>
            ) : null}
            <Button onClick={save}>수정 저장</Button>
            <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
              취소
            </Button>
          </div>
        </div>
      </Card>

      <ProductRejectModal
        count={1}
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={() => {
          setRejectOpen(false);
          toast({ message: rejectMessage(1), tone: "critical" });
        }}
      />
    </AppShell>
  );
}
