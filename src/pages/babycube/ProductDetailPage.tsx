import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Package,
  Plus,
  X,
  ZoomIn,
} from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  DatePicker,
  EmptyState,
  FormField,
  Gnb,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Radio,
  RadioGroup,
  SegmentedControl,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  Textarea,
  TextButton,
  useToast,
} from "../../components/ui";
import { cn } from "../../lib/cn";
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
  ADDRESSES,
  AIRPORTS,
  CERT_TYPES,
  COMMENT_MAX,
  COPY,
  COURIERS,
  EXTRA_IMAGE_MAX,
  GRADES,
  INFO_REF_TEXT,
  NAME_MAX,
  OPTION_AXIS_MAX,
  OPTION_SORTS,
  PERIOD_MAX,
  SECTION_OF,
  SELLER_OPTIONS,
  STAGE_OPTIONS,
  TAGS_MAX,
  applyOptions,
  discountOf,
  draftOf,
  findProduct,
  num,
  needsCertNumber,
  optionKey,
  periodSummary,
  slotName,
  sortOptions,
  validate,
  won,
  type DiscountType,
  type CertRow,
  type Fee,
  type FieldKey,
  type InfoRow,
  type OptionRow,
  type OptionSort,
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
 * 상품명 · 유형 · 카테고리 · 가격(· 렌트 기간) · 렌트 수량 | 재고 수량 ·
 * 상품이미지 · 상세설명 · 상품 주요정보 · 배송 · 옵션 · 노출 관리                (11개)
 * [목록]                 [승인 처리] [반려 처리] [취소] [수정 저장]   ← 하단 고정 바(주 버튼 맨 오른쪽)
 * ```
 * 섹션은 **전부 펼친 채로** 시작하고 각각 접을 수 있다(원본 `nvSec`).
 * 렌트 수량과 재고 수량은 서로 대체된다 — 렌트면 렌트 수량, 판매면 재고 수량 하나만 나온다.
 *
 * 상품 목록의 상품명·[수정] 이 이 화면으로 온다.
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
 * - 상세설명은 **평문 입력칸**이다(원본은 서식 편집기 — 2026-10-19 사용자 결정, 편집기는 개발 연동 때)
 * - 상품이미지는 **자리 표시 + 확대**만, 등록·교체·삭제·순서 바꾸기는 알림(사용자 결정 — 업로드는 개발 영역).
 *   확대는 닫기가 있는 창이다(원본은 문구·닫기 없는 전체 오버레이)
 * - 주소록은 **고르기만** 화면 안에서 하고 등록·수정·삭제는 알림(판매자 계정 데이터)
 * - 공항 픽업 요금 이름을 「공항 픽업 요금/공항 반납 요금」 으로 갈랐다(원본은 방문 수령과 같은 이름이 두 번)
 * - 렌트 **보증금은 필수**(`*`) — 비었거나 1 미만이면 칸 아래 「보증금을 입력해 주세요.」(Q-63 · 개발 26c59cb.
 *   개발은 게시 검증만 걸고 임시저장은 통과시킨다 — 이 화면에는 임시저장이 없어 [수정 저장]마다 검사)
 * - 옵션목록 머리는 한 줄(축 이름)이다 — 원본의 2단 머리(「옵션명」 묶음)를 접었다.
 *   일괄수정의 옵션가 +/− 부호는 뺐다(원본도 「표기용 — 정액만 적용」 미결)
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
/**
 * 도움말 읽기 폭 — 입력칸은 240 인데 설명 문단만 카드 폭(1,090px)으로 퍼지면 한 줄을 끝까지 따라 읽기 어렵다.
 * 입력이 좁은 필드와 페이지가 직접 쓰는 도움말 문단에만 건다(넓은 입력·표·인증 줄은 그대로).
 */
const HELP_WIDTH = "max-w-3xl";

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

/**
 * 금액 + 「무료」 — 무료면 금액 칸이 잠긴다(원본 `_freeMoney`).
 * 「무료」 는 칸마다 같은 글자라 접근가능 이름에 칸 이름을 붙인다.
 */
function FeeField({
  label,
  fee,
  onChange,
}: {
  label: string;
  fee: Fee;
  onChange: (patch: Partial<Fee>) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <FormField label={label} suffix="원">
        <Input
          inputMode="numeric"
          placeholder="숫자만 입력"
          disabled={fee.free}
          value={fee.free ? "" : withCommas(fee.amount)}
          onChange={(event) =>
            onChange({ amount: onlyDigits(event.target.value) })
          }
        />
      </FormField>
      {/* 입력칸과 같은 높이에 세운다 — 라벨 줄이 아니라 입력 줄에 붙은 선택이다 */}
      <Checkbox
        className="h-(--size-control-medium)"
        label="무료"
        /* `Checkbox` 는 보이는 글자로 이름을 잇는다(aria-labelledby). 칸마다 같은 「무료」 라 그 연결을 풀고 칸 이름을 붙인다 */
        aria-labelledby={undefined}
        aria-label={`${label} 무료`}
        checked={fee.free}
        onChange={(event) => onChange({ free: event.target.checked })}
      />
    </div>
  );
}

/** 상품이미지 자리 — 실제 파일이 없어 이름만 그린다(카테고리 아이콘과 같은 대체물) */
function ImageSlot({
  label,
  onZoom,
  onPending,
}: {
  label: string;
  onZoom: () => void;
  onPending: () => void;
}) {
  return (
    /* `self-start` — 세로로 쌓인 부모가 폭 가득 늘려 가운데로 보내지 않게 */
    <div className="flex flex-col items-center gap-1.5 self-start">
      <span className="body-small flex size-32 flex-col items-center justify-center gap-1 rounded-medium bg-surface-sub text-text-sub">
        <ImageIcon size={24} strokeWidth={1.2} aria-hidden />
        {label}
      </span>
      <div className="flex items-center gap-1">
        <IconButton
          variant="ghost"
          size="small"
          label={`${label} 확대`}
          onClick={onZoom}
          icon={<ZoomIn strokeWidth={1.2} aria-hidden />}
        />
        <TextButton size="small" tone="secondary" onClick={onPending}>
          교체
        </TextButton>
        <TextButton size="small" tone="secondary" onClick={onPending}>
          삭제
        </TextButton>
      </div>
    </div>
  );
}

/** 빈 이미지 자리 — 누르면 등록(업로드는 개발 영역이라 알림) */
function EmptyImageSlot({
  label,
  onPending,
}: {
  label: string;
  onPending: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} 등록`}
      onClick={onPending}
      className="flex size-32 items-center justify-center self-start rounded-medium bg-surface text-icon-sub outline-1 -outline-offset-1 outline-border focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
    >
      <Plus size={24} strokeWidth={1.2} aria-hidden />
    </button>
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

  /* 상품이미지 — 확대해 볼 칸의 이름(「대표이미지」·「추가이미지 2」). 업로드류는 알림만 */
  const [zoomed, setZoomed] = useState<string | null>(null);
  const imagePending = () => toast(COPY.imagePending);

  /* 인증 정보 · 고시 — 줄마다 id 로 고친다(지우고 더해도 입력칸이 엉키지 않게) */
  const nextId = (rows: { id: number }[]) =>
    Math.max(0, ...rows.map((row) => row.id)) + 1;
  const setCert = (id: number, patch: Partial<CertRow>) =>
    set(
      "certs",
      draft.certs.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  const setInfo = (id: number, patch: Partial<InfoRow>) =>
    set(
      "info",
      draft.info.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  /* 「상품상세참조」 — 켜면 내용이 그 글자로 채워지고, 끄면 비운다(원본 `pfInfoRef`) */
  const refInfo = (id: number, on: boolean) =>
    setInfo(id, { ref: on, value: on ? INFO_REF_TEXT : "" });
  const refAllInfo = () => {
    set(
      "info",
      draft.info.map((row) => ({ ...row, ref: true, value: INFO_REF_TEXT })),
    );
    toast(COPY.infoRefAll);
  };

  /* 배송 */
  const setFee = (
    key:
      | "shipFee"
      | "collectFee"
      | "pickupFee"
      | "pickupReturnFee"
      | "airportFee"
      | "airportReturnFee",
    patch: Partial<Fee>,
  ) => set(key, { ...draft[key], ...patch });
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const pickedAddress = ADDRESSES.find(
    (address) => address.id === draft.pickupAddress,
  );

  /* 옵션 — 선택은 조합 열쇠로 든다(정렬해도 고른 줄이 바뀌지 않게) */
  const [optionPicked, setOptionPicked] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkUse, setBulkUse] = useState("Y");
  const setOptionInput = (
    id: number,
    patch: Partial<{ name: string; values: string }>,
  ) =>
    set(
      "optionInputs",
      draft.optionInputs.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    );
  /* 옵션명 개수 — 늘리면 빈 줄을 붙이고, 줄이면 뒤에서 자른다(원본 `pfOptAxisN`) */
  const setAxisCount = (count: number) => {
    const rows = draft.optionInputs.slice(0, count);
    while (rows.length < count)
      rows.push({ id: nextId(rows), name: "", values: "" });
    set("optionInputs", rows);
  };
  const canApplyOptions = draft.optionInputs.some(
    (row) => row.name.trim() !== "" && row.values.trim() !== "",
  );
  const applyOptionList = () => {
    const result = applyOptions(
      draft.optionInputs,
      draft.options,
      draft.optionSort,
    );
    if (!result) {
      toast(COPY.optionEmptyInput);
      return;
    }
    setDraft((prev) => ({
      ...prev,
      options: result.rows,
      optionAxes: result.axes,
    }));
    setOptionPicked([]);
    toast(COPY.optionApplied(result.rows.length));
  };
  const setOptionRow = (key: string, patch: Partial<OptionRow>) =>
    set(
      "options",
      draft.options.map((row) =>
        optionKey(row) === key ? { ...row, ...patch } : row,
      ),
    );
  const removeOptionRows = (keys: string[]) => {
    set(
      "options",
      draft.options.filter((row) => !keys.includes(optionKey(row))),
    );
    setOptionPicked((prev) => prev.filter((key) => !keys.includes(key)));
  };
  const allOptionsPicked =
    draft.options.length > 0 && optionPicked.length === draft.options.length;
  /* 일괄수정 — 고른 줄에 옵션가·재고·사용여부를 **덮어쓴다**(빈 칸은 그대로 둔다) */
  const bulkEdit = () => {
    if (optionPicked.length === 0) {
      toast(COPY.optionNoneSelected);
      return;
    }
    set(
      "options",
      draft.options.map((row) =>
        optionPicked.includes(optionKey(row))
          ? {
              ...row,
              price: bulkPrice === "" ? row.price : bulkPrice,
              stock: bulkStock === "" ? row.stock : bulkStock,
              use: bulkUse === "Y",
            }
          : row,
      ),
    );
    toast(COPY.optionBulkDone(optionPicked.length));
  };
  /* 표 머리의 축 — 목록이 실제로 가진 조합 길이로 정한다(입력칸 개수로 정하면 적용 전에 어긋난다) */
  const optionAxes = draft.optionAxes.length
    ? draft.optionAxes
    : [COPY.sections.option];

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
              className={HELP_WIDTH}
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
                <span className="body-small text-text-sub">
                  {won(rentDisc)} 할인
                </span>
              ) : null}
            </ReadField>
            <FormField
              className={HELP_WIDTH}
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
            <p className={cn("body-small -mt-3 text-text-sub", HELP_WIDTH)}>
              {COPY.finalRentHelp}
            </p>
            <FormField
              className={HELP_WIDTH}
              label="보증금"
              required
              htmlFor={fieldId("deposit")}
              description={COPY.depositHelp}
              error={errors.deposit}
              suffix="원"
            >
              <Input
                id={fieldId("deposit")}
                inputMode="numeric"
                placeholder="0"
                value={withCommas(draft.deposit)}
                invalid={Boolean(errors.deposit)}
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
                <p className={cn("body-small text-text-sub", HELP_WIDTH)}>
                  {COPY.periodHelp}
                </p>
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
                      {/* 삭제는 입력칸 바로 뒤 — 길이가 변하는 요약 뒤에 두면 줄바꿈 때 다음 줄 왼쪽으로 떨어진다 */}
                      <IconButton
                        variant="ghost"
                        size="small"
                        label={`${label} 삭제`}
                        onClick={() => removePeriod(row.id)}
                        icon={<X strokeWidth={1.2} aria-hidden />}
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
              className={HELP_WIDTH}
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
                <span className="body-small text-text-sub">
                  {won(saleDisc)} 할인
                </span>
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
              className={HELP_WIDTH}
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
            className={HELP_WIDTH}
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

      {/* ⑥ 상품이미지 — 대표 1(필수) + 추가 최대 9. 보기·확대만, 등록·교체·삭제·순서는 알림 */}
      <Section
        title={COPY.sections.images}
        required
        open={isOpen("images")}
        onToggle={() => toggle("images")}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={2} />
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="label-medium-bold text-text">
                대표이미지
                <span aria-hidden className="text-text-critical">
                  {" "}
                  *
                </span>
              </span>
              {draft.mainImage ? (
                <ImageSlot
                  label="대표이미지"
                  onZoom={() => setZoomed("대표이미지")}
                  onPending={imagePending}
                />
              ) : (
                <EmptyImageSlot label="대표이미지" onPending={imagePending} />
              )}
              <p className={cn("body-small text-text-sub", HELP_WIDTH)}>
                {COPY.imageHelp}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="label-medium-bold text-text">
                추가이미지{" "}
                <span className="text-text-sub tabular-nums">
                  ({draft.extraImages}/{EXTRA_IMAGE_MAX})
                </span>
              </span>
              <div className="flex flex-wrap items-start gap-3">
                {Array.from({ length: draft.extraImages }, (_, index) => {
                  const label = `추가이미지 ${index + 1}`;
                  return (
                    <ImageSlot
                      key={label}
                      label={label}
                      onZoom={() => setZoomed(label)}
                      onPending={imagePending}
                    />
                  );
                })}
                {draft.extraImages < EXTRA_IMAGE_MAX ? (
                  <EmptyImageSlot label="추가이미지" onPending={imagePending} />
                ) : null}
              </div>
              <p className={cn("body-small text-text-sub", HELP_WIDTH)}>
                {COPY.imageHelp} {COPY.imageDragHelp}
              </p>
            </div>
          </>
        )}
      </Section>

      {/* ⑦ 상세설명 — 원본은 서식 편집기. 우리는 평문(사용자 결정 — 편집기는 개발 연동 때) */}
      <Section
        title={COPY.sections.detail}
        open={isOpen("detail")}
        onToggle={() => toggle("detail")}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={3} />
        ) : (
          <FormField label="상세설명" description={COPY.detailHelp}>
            <Textarea
              minRows={6}
              placeholder={COPY.detailPlaceholder}
              value={draft.detail}
              onChange={(event) => set("detail", event.target.value)}
            />
          </FormField>
        )}
      </Section>

      {/* ⑧ 상품 주요정보 — 등록 주체 · 성장단계 · 인증 정보 · 상품정보제공고시 */}
      <Section
        title={COPY.sections.mainInfo}
        required
        open={isOpen("mainInfo")}
        onToggle={() => toggle("mainInfo")}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={4} />
        ) : (
          <>
            {/* 원본 — 본사가 셀러 상품의 등록 주체를 바꿀 수 있다(2026-10-19 사용자 결정 「기획대로 열기」) */}
            <FormField
              label="등록 주체"
              required
              htmlFor={fieldId("seller")}
              error={errors.seller}
            >
              <Select
                id={fieldId("seller")}
                className="w-60"
                placeholder="셀러 선택"
                options={SELLER_OPTIONS}
                value={draft.seller}
                invalid={Boolean(errors.seller)}
                onValueChange={(next) => set("seller", next)}
              />
            </FormField>
            <FormField
              className={HELP_WIDTH}
              label="성장단계"
              required
              htmlFor={fieldId("stage")}
              description={COPY.stageHelp}
              error={errors.stage}
            >
              <Select
                id={fieldId("stage")}
                className="w-60"
                placeholder="성장단계 선택"
                options={STAGE_OPTIONS}
                value={draft.stage}
                invalid={Boolean(errors.stage)}
                onValueChange={(next) => set("stage", next)}
              />
            </FormField>
            <FormField
              label="인증 정보"
              required
              group
              description={COPY.certHelp}
              error={errors.certs}
            >
              <div role="group" className="flex flex-col gap-2">
                {draft.certs.map((row, index) => {
                  const label = `인증 ${index + 1}`;
                  return (
                    <div
                      key={row.id}
                      role="group"
                      aria-label={label}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Select
                        id={index === 0 ? fieldId("certs") : undefined}
                        className="w-60"
                        aria-label={`${label} 유형`}
                        placeholder="인증 유형 선택"
                        options={CERT_TYPES.map((type) => ({
                          value: type,
                          label: type,
                        }))}
                        value={row.type}
                        invalid={Boolean(errors.certs) && row.type === ""}
                        onValueChange={(next) =>
                          setCert(row.id, {
                            type: next,
                            no: needsCertNumber(next) ? row.no : "",
                          })
                        }
                      />
                      <Input
                        className="w-60"
                        aria-label={`${label} 인증번호`}
                        placeholder="인증번호 예) CB-B2026-1234"
                        disabled={row.type === "해당없음"}
                        value={row.no}
                        invalid={
                          Boolean(errors.certs) &&
                          needsCertNumber(row.type) &&
                          row.no.trim() === ""
                        }
                        onChange={(event) =>
                          setCert(row.id, { no: event.target.value })
                        }
                      />
                      <Input
                        className="w-60"
                        aria-label={`${label} 비고`}
                        placeholder="비고(선택)"
                        value={row.note}
                        onChange={(event) =>
                          setCert(row.id, { note: event.target.value })
                        }
                      />
                      <IconButton
                        variant="ghost"
                        size="small"
                        label={`${label} 삭제`}
                        onClick={() =>
                          set(
                            "certs",
                            draft.certs.filter((cert) => cert.id !== row.id),
                          )
                        }
                        icon={<X strokeWidth={1.2} aria-hidden />}
                      />
                    </div>
                  );
                })}
                <TextButton
                  className="self-start"
                  onClick={() =>
                    set("certs", [
                      ...draft.certs,
                      { id: nextId(draft.certs), type: "", no: "", note: "" },
                    ])
                  }
                >
                  <Plus size={16} strokeWidth={1.2} aria-hidden />
                  인증 추가
                </TextButton>
              </div>
            </FormField>
            <FormField
              label="상품 주요 정보"
              required
              group
              description={COPY.infoHelp}
            >
              <div role="group" className="flex flex-col gap-2">
                <Button
                  className="self-start"
                  variant="secondary"
                  size="small"
                  onClick={refAllInfo}
                >
                  전체 상품상세참조
                </Button>
                {draft.info.map((row) => {
                  const name = row.key || "추가 항목";
                  return (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center gap-3"
                    >
                      {row.fixed ? (
                        <span className="label-medium-bold w-56 text-text">
                          {row.key}
                        </span>
                      ) : (
                        <Input
                          className="w-56"
                          aria-label={`추가 항목 ${row.id} 항목명`}
                          placeholder="항목명"
                          value={row.key}
                          onChange={(event) =>
                            setInfo(row.id, { key: event.target.value })
                          }
                        />
                      )}
                      <Input
                        className="min-w-60 flex-1"
                        aria-label={`${name} 내용`}
                        placeholder="내용 입력"
                        disabled={row.ref}
                        value={row.value}
                        onChange={(event) =>
                          setInfo(row.id, { value: event.target.value })
                        }
                      />
                      <Checkbox
                        label="상품상세참조"
                        aria-labelledby={undefined}
                        aria-label={`${name} 상품상세참조`}
                        checked={row.ref}
                        onChange={(event) =>
                          refInfo(row.id, event.target.checked)
                        }
                      />
                      {/* 기본 세트는 지울 수 없다 — 자리만 맞춘다 */}
                      {row.fixed ? (
                        <span aria-hidden className="size-8" />
                      ) : (
                        <IconButton
                          variant="ghost"
                          size="small"
                          label={`${name} 삭제`}
                          onClick={() =>
                            set(
                              "info",
                              draft.info.filter((info) => info.id !== row.id),
                            )
                          }
                          icon={<X strokeWidth={1.2} aria-hidden />}
                        />
                      )}
                    </div>
                  );
                })}
                <TextButton
                  className="self-start"
                  onClick={() =>
                    set("info", [
                      ...draft.info,
                      {
                        id: nextId(draft.info),
                        key: "",
                        value: "",
                        ref: false,
                        fixed: false,
                      },
                    ])
                  }
                >
                  <Plus size={16} strokeWidth={1.2} aria-hidden />
                  항목 추가
                </TextButton>
              </div>
            </FormField>
          </>
        )}
      </Section>

      {/* ⑨ 배송 — 택배(늘 제공) + 방문 수령·공항 픽업(추가 선택). 회수·반납 요금은 렌트만 */}
      <Section
        title={COPY.sections.shipping}
        required
        open={isOpen("shipping")}
        onToggle={() => toggle("shipping")}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={5} />
        ) : (
          <>
            <ReadField label="배송 방법">
              <Tag>택배</Tag>
              <span className="body-small text-text-sub">
                {COPY.shipMethodHelp}
              </span>
            </ReadField>
            <FormField label="택배사">
              <Select
                className="w-60"
                placeholder="택배사 선택"
                options={COURIERS.map((courier) => ({
                  value: courier,
                  label: courier,
                }))}
                value={draft.courier}
                onValueChange={(next) => set("courier", next)}
              />
            </FormField>
            <FeeField
              label="배송비"
              fee={draft.shipFee}
              onChange={(patch) => setFee("shipFee", patch)}
            />
            {rent ? (
              <FeeField
                label="회수 배송비"
                fee={draft.collectFee}
                onChange={(patch) => setFee("collectFee", patch)}
              />
            ) : null}
            <FormField label="반품배송비 (편도)" suffix="원">
              <Input
                inputMode="numeric"
                placeholder="숫자만 입력"
                value={withCommas(draft.returnFee)}
                onChange={(event) =>
                  set("returnFee", onlyDigits(event.target.value))
                }
              />
            </FormField>
            <FormField label="교환배송비 (왕복)" suffix="원">
              <Input
                inputMode="numeric"
                placeholder="숫자만 입력"
                value={withCommas(draft.exchangeFee)}
                onChange={(event) =>
                  set("exchangeFee", onlyDigits(event.target.value))
                }
              />
            </FormField>
            <div className="flex flex-col gap-2">
              <Checkbox
                className={HELP_WIDTH}
                label="방문 수령 추가 제공"
                description={COPY.pickupHelp}
                checked={draft.pickupOn}
                onChange={(event) => set("pickupOn", event.target.checked)}
              />
              {draft.pickupOn ? (
                <div className="flex flex-col gap-2 pl-7">
                  <Button
                    id={fieldId("pickupAddress")}
                    className="self-start"
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setAddressQuery("");
                      setAddressOpen(true);
                    }}
                  >
                    판매자 주소록
                  </Button>
                  {pickedAddress ? (
                    <div className="body-medium flex flex-col gap-1 text-text">
                      <span className="label-medium-bold">
                        {pickedAddress.name}{" "}
                        <Tag size="small">{pickedAddress.tag}</Tag>
                      </span>
                      <span className="text-text-sub">
                        {pickedAddress.address}
                      </span>
                      <span className="text-text-sub tabular-nums">
                        {pickedAddress.phone1 || "-"} /{" "}
                        {pickedAddress.phone2 || "-"}
                      </span>
                    </div>
                  ) : (
                    <p
                      role={errors.pickupAddress ? "alert" : undefined}
                      className={
                        errors.pickupAddress
                          ? "body-small text-text-critical"
                          : "body-small text-text-sub"
                      }
                    >
                      {errors.pickupAddress ?? COPY.pickupEmpty}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
            {draft.pickupOn ? (
              <>
                <FeeField
                  label="픽업 요금"
                  fee={draft.pickupFee}
                  onChange={(patch) => setFee("pickupFee", patch)}
                />
                {rent ? (
                  <FeeField
                    label="반납 요금"
                    fee={draft.pickupReturnFee}
                    onChange={(patch) => setFee("pickupReturnFee", patch)}
                  />
                ) : null}
              </>
            ) : null}
            <div className="flex flex-col gap-2">
              <Checkbox
                className={HELP_WIDTH}
                label="공항 픽업 추가 제공"
                description={COPY.airportHelp}
                checked={draft.airportOn}
                onChange={(event) => set("airportOn", event.target.checked)}
              />
              {draft.airportOn ? (
                <div className="flex flex-col gap-1.5 pl-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      id={fieldId("airport")}
                      className="w-60"
                      aria-label="공항"
                      placeholder="공항 선택"
                      options={AIRPORTS.map((airport) => ({
                        value: airport,
                        label: airport,
                      }))}
                      value={draft.airport}
                      invalid={Boolean(errors.airport)}
                      onValueChange={(next) => set("airport", next)}
                    />
                    <Input
                      className="w-80"
                      aria-label="수령 장소"
                      placeholder="수령 장소 예) 3층 출국장 H카운터 앞"
                      value={draft.airportPlace}
                      onChange={(event) =>
                        set("airportPlace", event.target.value)
                      }
                    />
                  </div>
                  {errors.airport ? (
                    <p role="alert" className="body-small text-text-critical">
                      {errors.airport}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {/* 원본은 방문 수령과 같은 「픽업 요금/반납 요금」 이름이라 두 쌍이 구별되지 않는다 */}
            {draft.airportOn ? (
              <>
                <FeeField
                  label="공항 픽업 요금"
                  fee={draft.airportFee}
                  onChange={(patch) => setFee("airportFee", patch)}
                />
                {rent ? (
                  <FeeField
                    label="공항 반납 요금"
                    fee={draft.airportReturnFee}
                    onChange={(patch) => setFee("airportReturnFee", patch)}
                  />
                ) : null}
              </>
            ) : null}
          </>
        )}
      </Section>

      {/* ⑩ 옵션 — 축(최대 3) × 값의 모든 조합. 옵션가는 주문당 1회 정액 */}
      <Section
        title={COPY.sections.option}
        open={isOpen("option")}
        onToggle={() => toggle("option")}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={3} />
        ) : (
          <>
            <FormField
              className={HELP_WIDTH}
              label="옵션 설정"
              group
              description={draft.optionOn ? COPY.optionHelp : undefined}
            >
              <SegmentedControl
                className="self-start"
                items={ON_OFF}
                value={draft.optionOn ? "on" : "off"}
                onValueChange={(next) => set("optionOn", next === "on")}
              />
            </FormField>
            {draft.optionOn ? (
              <>
                <div className="flex flex-wrap gap-4">
                  <FormField label="옵션명 개수" required>
                    <Select
                      className="w-40"
                      options={[1, 2, 3].map((count) => ({
                        value: String(count),
                        label: `${count}개`,
                      }))}
                      value={String(draft.optionInputs.length)}
                      onValueChange={(next) => setAxisCount(Number(next))}
                    />
                  </FormField>
                  <FormField label="정렬 순서" required>
                    <Select
                      className="w-40"
                      options={OPTION_SORTS}
                      value={draft.optionSort}
                      onValueChange={(next) => {
                        const sort = next as OptionSort;
                        setDraft((prev) => ({
                          ...prev,
                          optionSort: sort,
                          options: sortOptions(prev.options, sort),
                        }));
                      }}
                    />
                  </FormField>
                </div>
                <FormField label="옵션입력" required group>
                  <div role="group" className="flex flex-col gap-2">
                    {draft.optionInputs.map((row, index) => {
                      const label = `옵션 ${index + 1}`;
                      const last = index === draft.optionInputs.length - 1;
                      return (
                        <div
                          key={row.id}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <Input
                            className="w-60"
                            aria-label={`${label} 옵션명`}
                            placeholder="예시:컬러"
                            value={row.name}
                            onChange={(event) =>
                              setOptionInput(row.id, {
                                name: event.target.value,
                              })
                            }
                          />
                          <Input
                            className="min-w-60 flex-1"
                            aria-label={`${label} 옵션값`}
                            placeholder="예시 : 빨강,노랑 ( , 로 구분 )"
                            value={row.values}
                            onChange={(event) =>
                              setOptionInput(row.id, {
                                values: event.target.value,
                              })
                            }
                          />
                          {draft.optionInputs.length > 1 ? (
                            <IconButton
                              variant="ghost"
                              size="small"
                              label={`${label} 삭제`}
                              onClick={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  optionInputs: prev.optionInputs.filter(
                                    (input) => input.id !== row.id,
                                  ),
                                }))
                              }
                              icon={<X strokeWidth={1.2} aria-hidden />}
                            />
                          ) : null}
                          {last &&
                          draft.optionInputs.length < OPTION_AXIS_MAX ? (
                            <IconButton
                              variant="ghost"
                              size="small"
                              label="옵션명 추가"
                              onClick={() =>
                                setAxisCount(draft.optionInputs.length + 1)
                              }
                              icon={<Plus strokeWidth={1.2} aria-hidden />}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                    <Button
                      className="self-start"
                      variant="secondary"
                      disabled={!canApplyOptions}
                      onClick={applyOptionList}
                    >
                      옵션목록으로 적용
                    </Button>
                  </div>
                </FormField>
                <div className="flex flex-col gap-3">
                  <span className="label-medium-bold text-text">
                    옵션목록{" "}
                    <span className="text-text-sub tabular-nums">
                      (총 {draft.options.length}개)
                    </span>
                  </span>
                  {/* 일괄 바 — 고른 줄의 옵션가·재고·사용여부를 덮어쓴다(빈 칸은 그대로) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() =>
                        optionPicked.length
                          ? removeOptionRows(optionPicked)
                          : toast(COPY.optionNoneSelected)
                      }
                    >
                      선택삭제
                    </Button>
                    <Input
                      size="small"
                      className="w-28"
                      aria-label="일괄 옵션가"
                      inputMode="numeric"
                      placeholder="옵션가"
                      value={withCommas(bulkPrice)}
                      onChange={(event) =>
                        setBulkPrice(onlyDigits(event.target.value))
                      }
                    />
                    <Input
                      size="small"
                      className="w-28"
                      aria-label="일괄 재고수량"
                      inputMode="numeric"
                      placeholder="재고수량"
                      value={bulkStock}
                      onChange={(event) =>
                        setBulkStock(onlyDigits(event.target.value))
                      }
                    />
                    <Select
                      className="w-24"
                      aria-label="일괄 사용여부"
                      options={[
                        { value: "Y", label: "Y" },
                        { value: "N", label: "N" },
                      ]}
                      value={bulkUse}
                      onValueChange={setBulkUse}
                    />
                    <Button variant="secondary" size="small" onClick={bulkEdit}>
                      선택목록 일괄수정
                    </Button>
                  </div>
                  {draft.options.length === 0 ? (
                    /* 화면이 아니라 카드 안 한 구획(옵션목록)이 빈 것 — 표 자리지만 표가 아직 없다(§16 `section`) */
                    <EmptyState
                      size="section"
                      icon={<Package strokeWidth={1.2} aria-hidden />}
                      title={COPY.optionEmptyTitle}
                      description={COPY.optionEmptyDescription}
                    />
                  ) : (
                    /* 표가 카드보다 넓어질 수 있어 가로 스크롤은 이 안에서만 */
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableTh>
                              <Checkbox
                                size="small"
                                aria-label="옵션 전체 선택"
                                checked={allOptionsPicked}
                                indeterminate={
                                  optionPicked.length > 0 && !allOptionsPicked
                                }
                                onChange={() =>
                                  setOptionPicked(
                                    allOptionsPicked
                                      ? []
                                      : draft.options.map(optionKey),
                                  )
                                }
                              />
                            </TableTh>
                            {optionAxes.map((axis) => (
                              <TableTh key={axis}>{axis}</TableTh>
                            ))}
                            <TableTh>옵션가(원·1회)</TableTh>
                            <TableTh>재고수량</TableTh>
                            <TableTh align="center">판매상태</TableTh>
                            <TableTh>관리코드</TableTh>
                            <TableTh align="center">추천</TableTh>
                            <TableTh>사용여부</TableTh>
                            <TableTh align="center">삭제</TableTh>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {draft.options.map((row) => {
                            const key = optionKey(row);
                            const name = row.combo.join(" / ");
                            return (
                              <TableRow key={key}>
                                <TableTd>
                                  <Checkbox
                                    size="small"
                                    aria-label={`${name} 선택`}
                                    checked={optionPicked.includes(key)}
                                    onChange={() =>
                                      setOptionPicked((prev) =>
                                        prev.includes(key)
                                          ? prev.filter((k) => k !== key)
                                          : [...prev, key],
                                      )
                                    }
                                  />
                                </TableTd>
                                {optionAxes.map((axis, index) => (
                                  <TableTd key={axis}>
                                    {row.combo[index] ?? "-"}
                                  </TableTd>
                                ))}
                                <TableTd>
                                  <Input
                                    size="small"
                                    className="w-28"
                                    aria-label={`${name} 옵션가`}
                                    inputMode="numeric"
                                    value={withCommas(row.price)}
                                    onChange={(event) =>
                                      setOptionRow(key, {
                                        price: onlyDigits(event.target.value),
                                      })
                                    }
                                  />
                                </TableTd>
                                <TableTd>
                                  <Input
                                    size="small"
                                    className="w-20"
                                    aria-label={`${name} 재고수량`}
                                    inputMode="numeric"
                                    value={row.stock}
                                    onChange={(event) =>
                                      setOptionRow(key, {
                                        stock: onlyDigits(event.target.value),
                                      })
                                    }
                                  />
                                </TableTd>
                                {/* 품절은 재고에서 정해진다 — 고치는 칸이 아니다 */}
                                <TableTd align="center">
                                  {num(row.stock) > 0 ? "판매중" : "품절"}
                                </TableTd>
                                <TableTd>
                                  <Input
                                    size="small"
                                    className="w-28"
                                    aria-label={`${name} 관리코드`}
                                    placeholder="-"
                                    value={row.code}
                                    onChange={(event) =>
                                      setOptionRow(key, {
                                        code: event.target.value,
                                      })
                                    }
                                  />
                                </TableTd>
                                <TableTd align="center">
                                  <Checkbox
                                    size="small"
                                    aria-label={`${name} 추천`}
                                    checked={row.recommended}
                                    onChange={(event) =>
                                      setOptionRow(key, {
                                        recommended: event.target.checked,
                                      })
                                    }
                                  />
                                </TableTd>
                                <TableTd>
                                  <Select
                                    className="w-24"
                                    aria-label={`${name} 사용여부`}
                                    options={[
                                      { value: "Y", label: "Y" },
                                      { value: "N", label: "N" },
                                    ]}
                                    value={row.use ? "Y" : "N"}
                                    onValueChange={(next) =>
                                      setOptionRow(key, { use: next === "Y" })
                                    }
                                  />
                                </TableTd>
                                <TableTd align="center">
                                  <IconButton
                                    variant="ghost"
                                    size="small"
                                    label={`${name} 삭제`}
                                    onClick={() => removeOptionRows([key])}
                                    icon={<X strokeWidth={1.2} aria-hidden />}
                                  />
                                </TableTd>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </>
        )}
      </Section>

      {/* ⑪ 노출 관리 — 판매 상태는 처분으로만 · 처분 건은 전시도 잠금 */}
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
              <p className={cn("body-small text-text-sub", HELP_WIDTH)}>
                {saleStatusHelp}
              </p>
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
        하단 고정 바 (원본 `nv-bar`) — `[목록]  …  [처분] [취소] [수정 저장]`.
        진한 버튼은 [수정 저장] 하나고 **맨 오른쪽**이다 — 공지·FAQ·셀러 상세의 [취소][저장]과 같은 순서
        (원본은 [수정 저장] 뒤에 [취소]). 처분 버튼은 상태가 정한다(목록과 같은 자격 규칙).
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
            <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
              취소
            </Button>
            <Button onClick={save}>수정 저장</Button>
          </div>
        </div>
      </Card>

      {/* 이미지 확대 — 원본은 화면 전체를 덮는 오버레이(문구·닫기 없음). 우리는 닫기가 있는 창 */}
      <Modal
        open={zoomed !== null}
        onClose={() => setZoomed(null)}
        size="medium"
      >
        <ModalHeader closeLabel="대화상자 닫기" title={zoomed ?? ""} />
        <ModalBody>
          <span className="body-medium flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-medium bg-surface-sub text-text-sub">
            <ImageIcon size={48} strokeWidth={1.2} aria-hidden />
            {zoomed}
          </span>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setZoomed(null)}
          >
            닫기
          </Button>
        </ModalFooter>
      </Modal>

      {/* 판매자 주소록 — 고르기는 화면 안에서, 등록·수정·삭제는 알림(판매자 계정 데이터) */}
      <Modal
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        size="medium"
      >
        <ModalHeader closeLabel="대화상자 닫기" title="주소록" />
        <ModalBody>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="body-small text-text-sub">
              총{" "}
              {
                ADDRESSES.filter((address) =>
                  address.name.includes(addressQuery.trim()),
                ).length
              }
              개 · 최근 등록순
            </span>
            <Input
              className="w-60"
              aria-label="관리이름 검색"
              placeholder="관리이름 검색"
              value={addressQuery}
              onChange={(event) => setAddressQuery(event.target.value)}
            />
          </div>
          <ul className="flex flex-col gap-2">
            {ADDRESSES.filter((address) =>
              address.name.includes(addressQuery.trim()),
            ).map((address) => (
              <li
                key={address.id}
                className="body-medium flex flex-col gap-1 rounded-medium p-3 text-text outline-1 -outline-offset-1 outline-border"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="label-medium-bold">
                    {address.name} <Tag size="small">{address.tag}</Tag>
                  </span>
                  <span className="flex items-center gap-2">
                    <TextButton
                      aria-label={`${address.name} 선택`}
                      onClick={() => {
                        set("pickupAddress", address.id);
                        setAddressOpen(false);
                        toast(COPY.pickupSelected);
                      }}
                    >
                      선택
                    </TextButton>
                    <TextButton
                      tone="secondary"
                      onClick={() => toast(COPY.addressPending)}
                    >
                      수정
                    </TextButton>
                    <TextButton
                      tone="secondary"
                      onClick={() => toast(COPY.addressPending)}
                    >
                      삭제
                    </TextButton>
                  </span>
                </div>
                <span className="text-text-sub">{address.address}</span>
                <span className="text-text-sub tabular-nums">
                  {address.phone1 || "-"} / {address.phone2 || "-"}
                </span>
              </li>
            ))}
          </ul>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => toast(COPY.addressPending)}
          >
            신규등록
          </Button>
          <Button size="large" onClick={() => setAddressOpen(false)}>
            닫기
          </Button>
        </ModalFooter>
      </Modal>

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
