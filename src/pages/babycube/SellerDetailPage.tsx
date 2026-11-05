import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Plus, Store } from "lucide-react";
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
  Pagination,
  PaginationSizeSelect,
  SegmentedControl,
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
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import {
  BIZ_TYPES,
  COMMISSION_HINT,
  commissionError,
  countText,
  DEAL_KIND_LABEL,
  DEAL_SCOPES,
  EXIT_COPY,
  exitRows,
  FIELD_COPY,
  findSeller,
  HEADQUARTERS_NOTICE,
  HQ_COMMISSION_NOTE,
  HYGIENE_OPTIONS,
  hygieneValue,
  INTRO_PLACEHOLDER,
  PRODUCT_EMPTY_DESCRIPTION,
  PRODUCT_EMPTY_TITLE,
  PRODUCT_NEW_PATH,
  PRODUCT_PATH,
  PRODUCT_PAGE_SIZE,
  PRODUCT_PAGE_SIZES,
  ratingText,
  SALE_STATUS_META,
  saleableCount,
  SAVED_TEXT,
  SECTIONS,
  SELLER_STATES,
  SHOWN_META,
  stampText,
  ymd,
  type TextFieldKey,
} from "./SellerDetailPage.data";
import {
  HQ_BADGE,
  STATUS_META,
  type BizType,
  type DealScope,
  type Seller,
  type SellerStatus,
} from "./SellerListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";
import { DocumentModal, DocumentRow } from "./shared/DocumentParts";
import {
  DOCUMENT_COPY,
  DOCUMENT_KEYS,
  DOCUMENTS,
  type DocumentKey,
  type DocumentView,
} from "./shared/documents";

/* =========================================================================
 * S03-D 셀러 상세 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 폼형 (셀러 정보·운영 값을 고친다)
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 (BO-SEL-002 · 기획 v0.4 `DETAIL.sellers`)
 *
 * ```
 * 셀러 정보   ← 셀러명* · 대표자* · 연락처* · 사업자 유형* · 상품 취급 유형* ·
 *               사업자등록증 · 통신판매업신고증 · 상태* · 소개
 * 운영 정보   ← 수수료율(%) · 위생인증 · 입점일 · 등록 상품수 · 평점
 * 등록 상품 (N) ← (본사 행) [+ 상품 등록] · 표(No · 유형 · 판매 상태 · 상품코드 · 상품명 · 카테고리 ·
 *                     상품등록일 · 최종수정일 · 전시상태) + 페이지
 *                 본사 행의 상품코드 → 직영 상품 상세(`/products/{코드}`) · [+ 상품 등록] → `/products/new`
 * [목록]                                   [취소] [저장하기]   ← 하단 액션 바 (화면 아래 고정)
 * ```
 * 섹션은 접을 수 있다(원본도 섹션마다 접기 버튼이 있다).
 *
 * ## 원본 정책 — 화면이 강제하는 것
 * - **본사 계정은 상태(입점)·수수료율(0%)만 잠근다** — 나머지는 일반 셀러처럼 고친다
 *   (2026-10-15 사용자 결정. 원본은 수수료율 입력칸을 열어 두지만 안내 문구가 "0% 확정"이다)
 * - 셀러명·대표자·연락처는 **필수**, 글자 수 한도 40·20·20(원본 `gInput`)
 * - 수수료율은 **0~100** 이다. 범위를 벗어나면 저장을 막고 이유를 낸다
 * - **[퇴점] 으로 바꿔 저장하면 확인 창**(원본 `gateQuit`) — 남은 렌트·정산·클레임·판매 중 상품을
 *   세어 보여 주고, 남은 건이 있어도 **막지 않고 경고만** 한다
 *
 * ## 퍼블 범위 (2026-10-15 사용자 결정)
 * 저장·퇴점 처리·서류 다운로드는 **토스트만** 띄운다. 고친 값은 화면 안에만 산다.
 *
 * ## 셀러가 바뀌면 화면을 통째로 새로 시작한다
 * 주소만 `/sellers/A` → `/sellers/B` 로 바뀌면 같은 컴포넌트가 남아, A 에서 고치던 값이
 * B 화면에 묻어가고 [저장하기]까지 켜졌다. 본문을 `key={seller.id}` 로 그려 **고친 값·
 * 검증 표시·상품 페이지·열린 창·섹션 접힘**이 셀러마다 처음부터 시작한다(원본 `efInit` 과 같은 뜻).
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 1. **입점일·등록 상품수·평점은 `InfoList` 로 낸다.** 원본은 회색 비활성 입력칸인데,
 *    비활성 입력칸은 "고칠 수 있을 것 같은데 안 되는 것"으로 읽힌다
 * 2. 하단 바 버튼 순서 [취소][저장하기] · 저장 알림 문구 — 회원 상세와 같게 맞췄다
 * 3. 등록 상품이 없으면 표 대신 빈 상태 안내(원본은 표 머리 + "연관 항목 없음")
 * 4. **본사 계정의 수수료율은 운영 정보 `InfoList` 첫 줄**(`0%` + 보조 글자 「본사 고정」) — 읽는 값이
 *    한 카드 안에서 「라벨 위 맨 글자」와 「회색 상자」 두 모양으로 갈리지 않게(2026-11-03 UX 검수).
 *    일반 셀러는 입력칸(`noMinWidth` · `w-24` — 몇 자리 숫자라 240 최소폭을 푼다)
 * 5. **등록 상품 표는 가로 스크롤 상자 안**(`overflow-x-auto`)에 둔다 — 상자 없이 열 합이 카드보다
 *    넓어 페이지 전체가 가로로 밀렸다(1440 +20 · 1280 +180). 열 합 1084 라 1440 에서는 스크롤 없음,
 *    일시 두 열은 168 · 줄바꿈 없음(초까지 한 줄)
 *
 * ## 데이터 상태 (§D8 · `src/lib/dataStatus.ts`)
 * `/sellers/{id}?preview=loading` · `refreshing` 으로 미리 본다.
 * `empty` 는 이 화면에 없다 — 셀러가 없으면 "없는 셀러" 화면이지 빈 목록이 아니다.
 * ====================================================================== */

export interface SellerDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 목록 경로 — 뒤로 가는 곳이자, 없는 셀러일 때 돌려보내는 곳 */
const LIST_PATH = "/sellers";

/**
 * 접을 수 있는 섹션 한 장. (회원 상세와 같은 규격 —
 * 접기 버튼은 아이콘만 있으므로 "무엇을 접는지"까지 이름에 넣는다)
 */
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

/** 로딩 자리 — 실제 줄 높이를 그대로 써서 도착했을 때 화면이 튀지 않는다 */
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

/**
 * 라벨이 위에 있는 **읽는 값** 한 칸 — 같은 섹션의 입력칸(`FormField`)과 라벨 위치를 맞춘다.
 * `FormField` 는 입력 전용이라 읽는 값에 쓰지 않는다.
 */
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
      {children}
    </div>
  );
}

export function SellerDetailPage(props: SellerDetailPageProps) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  const seller = findSeller(lastPathSegment(pathname));

  /*
    없는 셀러 — 주소를 손으로 고쳤거나 지워진 셀러다.
    **빈 목록이 아니라 잘못된 주소**이므로 돌아갈 곳을 준다(§D8-2).
  */
  if (!seller) {
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
        header={<PageHeader title="셀러 상세" />}
      >
        <Card variant="soft">
          <CardBody>
            {/* 표가 아니라 화면 전체가 없는 것이다 — §16 의 `page` 가 그 자리다 */}
            <EmptyState
              size="page"
              icon={<Store strokeWidth={1.2} aria-hidden />}
              title="찾을 수 없는 셀러입니다"
              description="주소가 잘못되었거나 삭제된 셀러일 수 있습니다."
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                셀러 목록으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  /* 셀러마다 처음부터 — 위 「셀러가 바뀌면 화면을 통째로 새로 시작한다」 */
  return <SellerDetailBody key={seller.id} seller={seller} {...props} />;
}

/** 고치는 값 묶음 — 저장 전까지 화면 안에만 산다 */
interface Draft {
  name: string;
  ceo: string;
  phone: string;
  bizType: BizType;
  dealScope: DealScope;
  status: SellerStatus;
  intro: string;
  /** 입력 중인 문자열 그대로(`9.` 같은 중간 상태를 담는다) */
  commission: string;
  hygiene: string;
}

const draftOf = (seller: Seller): Draft => ({
  name: seller.name,
  ceo: seller.ceo,
  phone: seller.phone,
  bizType: seller.bizType,
  dealScope: seller.dealScope,
  status: seller.status,
  intro: seller.intro,
  commission: String(seller.commission),
  hygiene: hygieneValue(seller.hygiene),
});

function SellerDetailBody({
  seller,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerDetailPageProps & { seller: Seller }) {
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));

  const [draft, setDraft] = useState(() => draftOf(seller));
  /** [저장하기] 를 한 번 누른 뒤부터 오류를 보인다 — 입력 도중에 빨갛게 하지 않는다 */
  const [touched, setTouched] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [openDocument, setOpenDocument] = useState<DocumentKey | null>(null);
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(PRODUCT_PAGE_SIZE);

  const set =
    <K extends keyof Draft>(key: K) =>
    (value: Draft[K]) =>
      setDraft((prev) => ({ ...prev, [key]: value }));

  const meta = STATUS_META[seller.status];
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";
  const hq = seller.isHeadquarters;

  /* 검증 — 빈 필수값 · 수수료율 범위. 본사는 수수료율을 고치지 않으므로 검사하지 않는다 */
  const emptyError = (key: TextFieldKey) =>
    draft[key].trim() === "" ? FIELD_COPY[key].empty : undefined;
  const errors = {
    name: emptyError("name"),
    ceo: emptyError("ceo"),
    phone: emptyError("phone"),
    commission: hq
      ? undefined
      : (commissionError(draft.commission) ?? undefined),
  };
  const invalid = Object.values(errors).some(Boolean);
  const changed = (Object.keys(draft) as (keyof Draft)[]).some(
    (key) => draft[key] !== draftOf(seller)[key],
  );

  /*
    저장 — 원본 `sellerSave`. 저장된 상태가 퇴점이 아닌데 [퇴점] 으로 바꿨으면 확인 창을 거친다.
    퍼블은 **저장하지 않는다**(토스트만).
  */
  const save = () => {
    setTouched(true);
    if (invalid) return;
    if (draft.status === "closed" && seller.status !== "closed") {
      setExitOpen(true);
      return;
    }
    toast(SAVED_TEXT);
  };

  const confirmExit = () => {
    setExitOpen(false);
    toast(EXIT_COPY.done(saleableCount(seller.catalog)));
  };

  const errorOf = (message: string | undefined) =>
    touched ? message : undefined;

  /* 등록 상품 페이지 — 셀러가 바뀌면 본문이 새로 그려져 1페이지로 돌아간다(원본 C2) */
  const productPages = Math.max(
    1,
    Math.ceil(seller.catalog.length / productPageSize),
  );
  const currentProductPage = Math.min(productPage, productPages);
  const productStart = (currentProductPage - 1) * productPageSize;
  const visibleProducts = seller.catalog.slice(
    productStart,
    productStart + productPageSize,
  );

  const textField = (key: TextFieldKey) => (
    <FormField
      label={FIELD_COPY[key].label}
      required
      error={errorOf(errors[key])}
    >
      <Input
        className="max-w-120"
        value={draft[key]}
        maxLength={FIELD_COPY[key].max}
        placeholder={FIELD_COPY[key].placeholder}
        onChange={(event) => set(key)(event.target.value)}
      />
    </FormField>
  );

  /** 서류 뷰가 그리는 값 — 이 셀러의 레코드에서 채운다 */
  const documentView = (key: DocumentKey): DocumentView => ({
    key,
    number: seller[key].number,
    owner: seller.name,
    ceo: seller.ceo,
  });

  const exitWork = exitRows(seller);
  const hasOpenWork = exitWork.slice(0, 3).some((row) => row.count > 0);

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
        /*
          제목 옆에 누구의 상세인지 — 표에서 넘어온 뒤 "어느 셀러였더라"가 되지 않게.
          배지는 **저장된** 상태다(회원 상세와 같다) — 고치는 중인 값과 섞지 않는다.
        */
        <PageHeader
          title="셀러 상세"
          description={seller.name}
          badges={
            <>
              {hq ? (
                <Tag tone={HQ_BADGE.tone} style={HQ_BADGE.style}>
                  {HQ_BADGE.label}
                </Tag>
              ) : null}
              <Tag tone={meta.tone} dot>
                {meta.label}
              </Tag>
            </>
          }
        />
      }
    >
      <Section title={SECTIONS.basic} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={8} />
        ) : (
          <>
            {textField("name")}
            {textField("ceo")}
            {textField("phone")}
            {/*
              세그먼트는 `<label for>` 가 닿지 않는 그룹이라 `group` 으로 이름을 잇는다(§29-6b).
              `self-start` — FormField 의 세로 배치(flex-col)가 자식을 폭 가득 늘려, 회색 바탕이
              카드 끝까지 번졌다. 버튼 몇 개짜리 선택은 제 폭이어야 고를 것이 한눈에 들어온다.
            */}
            <FormField label="사업자 유형" required group>
              <SegmentedControl
                className="self-start"
                items={BIZ_TYPES}
                value={draft.bizType}
                onValueChange={(value) => set("bizType")(value as BizType)}
              />
            </FormField>
            <FormField label="상품 취급 유형" required group>
              <SegmentedControl
                className="self-start"
                items={DEAL_SCOPES}
                value={draft.dealScope}
                onValueChange={(value) => set("dealScope")(value as DealScope)}
              />
            </FormField>
            {DOCUMENT_KEYS.map((kind) => (
              <ReadField key={kind} label={DOCUMENTS[kind].label}>
                <DocumentRow
                  fileName={seller[kind].fileName}
                  view={documentView(kind)}
                  onOpen={() => setOpenDocument(kind)}
                />
              </ReadField>
            ))}
            {hq ? (
              /* 본사 — 상태는 입점으로 고정이다. 원본 그대로 배지 + 안내 문구 */
              <ReadField label="상태">
                <span className="flex flex-wrap items-center gap-2">
                  <Tag tone={HQ_BADGE.tone} style={HQ_BADGE.style}>
                    {HQ_BADGE.label}
                  </Tag>
                  <Tag tone={meta.tone} dot>
                    {meta.label}
                  </Tag>
                  <span className="body-small text-text-sub">
                    {HEADQUARTERS_NOTICE}
                  </span>
                </span>
              </ReadField>
            ) : (
              <FormField label="상태" required group>
                <SegmentedControl
                  className="self-start"
                  items={SELLER_STATES}
                  value={draft.status}
                  onValueChange={(value) =>
                    set("status")(value as SellerStatus)
                  }
                />
              </FormField>
            )}
            <FormField label="소개">
              <Textarea
                value={draft.intro}
                minRows={3}
                placeholder={INTRO_PLACEHOLDER}
                onChange={(event) => set("intro")(event.target.value)}
              />
            </FormField>
          </>
        )}
      </Section>

      <Section title={SECTIONS.operation} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={5} />
        ) : (
          <>
            {/*
              수수료율 — 이 화면에서 가장 중요한 입력이다.
              본사는 0% 확정이라 입력칸을 열지 않는다(안내 문구는 상태 줄에 있다).
            */}
            {hq ? null : (
              <FormField
                label="수수료율"
                description={COMMISSION_HINT}
                error={errorOf(errors.commission)}
                suffix="%"
              >
                <Input
                  noMinWidth
                  className="w-24"
                  inputMode="decimal"
                  placeholder="0"
                  value={draft.commission}
                  onChange={(event) => set("commission")(event.target.value)}
                />
              </FormField>
            )}

            <FormField label="위생인증" group>
              <SegmentedControl
                className="self-start"
                items={HYGIENE_OPTIONS}
                value={draft.hygiene}
                onValueChange={set("hygiene")}
              />
            </FormField>

            <InfoList>
              {/* 본사 — 0% 확정이라 입력칸 대신 읽는 값 한 줄(위 「다르게 둔 곳」 4) */}
              {hq ? (
                <InfoItem label="수수료율">
                  <span className="flex items-center gap-2">
                    <span>0%</span>
                    <span className="body-small text-text-sub">
                      {HQ_COMMISSION_NOTE}
                    </span>
                  </span>
                </InfoItem>
              ) : null}
              <InfoItem label="입점일">{ymd(seller.date)}</InfoItem>
              <InfoItem label="등록 상품수">
                {countText(seller.products)}
              </InfoItem>
              <InfoItem label="평점">{ratingText(seller.rating)}</InfoItem>
            </InfoList>
          </>
        )}
      </Section>

      {/*
        등록 상품 — 원본 `sec.sellers_prod`. 제목에 **건수**가 붙는다.
        ⚠️ 이 표의 일시는 **초까지** 낸다(원본 `2026.05.10 09:14:22`) — 목록 화면의
        `ymd`(날짜만)와 다르다. 같은 상품을 하루에 여러 번 고치는 자리라서다.
        No 는 **페이지 안 순번**(원본 `start + i + 1`) — 목록의 역순 번호와 다르다.
      */}
      <Section
        title={`${SECTIONS.products} (${seller.catalog.length})`}
        busy={busy}
        dim={dim}
      >
        {/* 본사 행 — 직영 상품 등록 진입점(디자인 §3 #3 · 개발 「사이드바 메뉴 없음 · 07-03 삭제」) */}
        {hq && !loading ? (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="small"
              onClick={() => onNavSelect(PRODUCT_NEW_PATH)}
            >
              <Plus size={16} strokeWidth={1.2} aria-hidden />
              상품 등록
            </Button>
          </div>
        ) : null}
        {loading ? (
          <LoadingLines rows={3} />
        ) : seller.catalog.length === 0 ? (
          <EmptyState
            size="table"
            icon={<Store strokeWidth={1.2} aria-hidden />}
            title={PRODUCT_EMPTY_TITLE}
            description={PRODUCT_EMPTY_DESCRIPTION}
          />
        ) : (
          <>
            {/*
              가로 스크롤 상자 — 좁은 화면에서도 넘침이 **표 안에서** 끝난다(페이지는 밀리지 않는다).
              열 합 1084(1440 의 카드 본문 1088 안, 실측 글자 폭 기준): No 52(첫 칸 왼쪽 여백 24 포함) · 유형 92(배지 둘) ·
              판매 상태 104(「재심사요청」) · 코드 96 · 상품명 212(남는 폭 · 소수점 여유 4 · 긴 이름은 두 줄 말줄임) ·
              카테고리 96 · 일시 168×2(초까지 한 줄) · 전시 96(끝 칸 오른쪽 여백 24 포함)
            */}
            <div className="overflow-x-auto">
              <Table>
                <colgroup>
                  <col className="w-13" />
                  <col className="w-23" />
                  <col className="w-26" />
                  <col className="w-24" />
                  <col className="w-53" />
                  <col className="w-24" />
                  <col className="w-42" />
                  <col className="w-42" />
                  <col className="w-24" />
                </colgroup>
                <TableHead>
                  <TableRow>
                    <TableTh>No</TableTh>
                    <TableTh align="center">유형</TableTh>
                    <TableTh align="center">판매 상태</TableTh>
                    <TableTh>상품코드</TableTh>
                    <TableTh>상품명</TableTh>
                    <TableTh>카테고리</TableTh>
                    <TableTh>상품등록일</TableTh>
                    <TableTh>최종수정일</TableTh>
                    <TableTh align="center">전시상태</TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleProducts.map((product, index) => {
                    const saleMeta = SALE_STATUS_META[product.saleStatus];
                    const shown =
                      SHOWN_META[product.shown ? "shown" : "hidden"];
                    return (
                      <TableRow key={product.code}>
                        <TableTd className="tabular-nums">
                          {productStart + index + 1}
                        </TableTd>
                        {/* 유형은 분류라 중립 배지 — 회원 결제 내역의 「구분」과 같다 */}
                        <TableTd align="center">
                          <span className="inline-flex gap-1">
                            {product.kinds.map((kind) => (
                              <Tag key={kind} size="small">
                                {DEAL_KIND_LABEL[kind]}
                              </Tag>
                            ))}
                          </span>
                        </TableTd>
                        <TableTd align="center">
                          <Tag tone={saleMeta.tone} dot>
                            {saleMeta.label}
                          </Tag>
                        </TableTd>
                        {/*
                          본사 행은 직영 상품 상세(수정)로 잇는다(디자인 §3 #3). 입점 셀러 행을 이을지는
                          기획 확인 중이라(질문 16) 글자로 둔다
                        */}
                        <TableTd className="tabular-nums">
                          {hq ? (
                            <TextButton
                              onClick={() =>
                                onNavSelect(PRODUCT_PATH(product.code))
                              }
                            >
                              {product.code}
                            </TextButton>
                          ) : (
                            product.code
                          )}
                        </TableTd>
                        <TableTd ellipsis>{product.name}</TableTd>
                        <TableTd>{product.category}</TableTd>
                        <TableTd className="whitespace-nowrap tabular-nums">
                          {stampText(product.createdAt)}
                        </TableTd>
                        <TableTd className="whitespace-nowrap tabular-nums">
                          {stampText(product.updatedAt)}
                        </TableTd>
                        <TableTd align="center">
                          <Tag tone={shown.tone} dot>
                            {shown.label}
                          </Tag>
                        </TableTd>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={currentProductPage}
              totalPages={productPages}
              onPageChange={setProductPage}
              end={
                <PaginationSizeSelect
                  sizes={PRODUCT_PAGE_SIZES}
                  value={productPageSize}
                  onSizeChange={(size) => {
                    setProductPageSize(size);
                    setProductPage(1);
                  }}
                />
              }
            />
          </>
        )}
      </Section>

      {/*
        하단 액션 바 (원본 `nv-bar`). 좌측은 되돌아가는 길, 우측은 이 화면에서 하는 일이다.
        원본처럼 **화면 아래에 붙는다**(회원 상세와 같다 — `bottom-6` = 본문 아래 여백).
        [취소] 는 원본대로 **저장하지 않고 목록으로** 간다(`nav(listScr)`).
      */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
              취소
            </Button>
            <Button disabled={!changed} onClick={save}>
              저장하기
            </Button>
          </div>
        </div>
      </Card>

      {/*
        퇴점 확인 창 — 원본 `gateQuit`. 0건이어도 줄을 지우지 않는다("없음"을 읽는 것이 확인이다).
        [취소] 는 고른 값을 그대로 둔다 — 처리한 것처럼 보이게 하지 않는다.
      */}
      <Modal open={exitOpen} onClose={() => setExitOpen(false)} size="small">
        <ModalHeader
          /* 푸터에도 "취소"가 있어 헤더 X 의 기본 라벨과 겹친다 — 이름을 갈라 준다 */
          closeLabel="대화상자 닫기"
          title={EXIT_COPY.title(seller.name)}
        />
        <ModalBody>
          <dl className="body-medium flex flex-col gap-2">
            {exitWork.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-text">{row.label}</dt>
                <dd
                  className={
                    row.count > 0
                      ? "label-medium-bold tabular-nums text-text-warning"
                      : "text-text-sub"
                  }
                >
                  {row.count > 0 ? `${row.count}${row.unit}` : EXIT_COPY.none}
                </dd>
              </div>
            ))}
          </dl>
          <p className="body-small text-text-sub">
            {EXIT_COPY.note(saleableCount(seller.catalog))}
          </p>
          {hasOpenWork ? (
            <p className="body-small text-text-warning">{EXIT_COPY.warning}</p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setExitOpen(false)}
          >
            취소
          </Button>
          <Button variant="critical" size="large" onClick={confirmExit}>
            {EXIT_COPY.confirm}
          </Button>
        </ModalFooter>
      </Modal>

      {/* 서류 미리보기 — 원본 `docModalView`. [다운로드] 는 알림만(파일은 개발 영역) */}
      <DocumentModal
        view={openDocument ? documentView(openDocument) : null}
        onClose={() => setOpenDocument(null)}
        onDownload={(label) => toast(DOCUMENT_COPY.downloaded(label))}
      />
    </AppShell>
  );
}
