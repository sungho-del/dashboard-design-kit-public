import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, FileText, Store } from "lucide-react";
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
  PageHeader,
  SegmentedControl,
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
import { usePathname, useSearchParams } from "../../lib/router";
import {
  BIZ_TYPES,
  COMMISSION_HINT,
  commissionError,
  countText,
  DEAL_KIND_LABEL,
  DEAL_SCOPES,
  documentOpenText,
  findSeller,
  HEADQUARTERS_NOTICE,
  HYGIENE_OPTIONS,
  hygieneValue,
  PRODUCT_EMPTY_DESCRIPTION,
  PRODUCT_EMPTY_TITLE,
  ratingText,
  SALE_STATUS_META,
  SAVED_TEXT,
  SECTIONS,
  shownLabel,
  stampText,
  ymd,
} from "./SellerDetailPage.data";
import { STATUS_META, type SellerDocument } from "./SellerListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S03-D 셀러 상세 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 폼형 (읽기 + 운영 값 몇 개를 고침)
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 (BO-SEL-002)
 *
 * ```
 * 셀러 정보   ← 셀러명 · 대표자 · 연락처 · 사업자 유형 · 상품 취급 유형 ·
 *               사업자등록증 · 통신판매업신고증 · 상태 · 소개
 * 운영 정보   ← 수수료율(%) · 위생인증 · 입점일 · 등록 상품수 · 평점
 * 등록 상품 (N) ← 표(No · 유형 · 판매 상태 · 상품코드 · 상품명 · 카테고리 ·
 *                     상품등록일 · 최종수정일 · 전시상태)
 * [목록]                                   [저장하기] [취소]   ← 하단 액션 바
 * ```
 * 섹션은 접을 수 있다(원본도 섹션마다 접기 버튼이 있다).
 *
 * ## 원본 정책 — 화면이 강제하는 것
 * - **본사 계정은 운영 값을 고칠 수 없다.** 원본이 그 자리에 문구를 낸다 —
 *   _"본사 행 — 퇴점·심사 관리 대상이 아닙니다 (수수료율 0% 확정)"_.
 *   자기 자신에게 수수료를 매기지 않으므로 입력칸을 열어 두면 안 된다
 * - 수수료율은 **0~100** 이다. 범위를 벗어나면 저장을 막고 이유를 낸다
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 1. **읽기 전용 값을 비활성 입력칸이 아니라 `InfoList` 로 낸다.** 원본은 회색 입력칸에
 *    값을 담아 두는데, 비활성 입력칸은 **"고칠 수 있을 것 같은데 안 되는 것"** 으로 읽힌다.
 *    여기서 실제로 고치는 값은 수수료율·위생인증·취급 유형뿐이다
 * 2. **서류는 [보기] 버튼만 둔다.** 원본은 `📄 파일명.pdf … 보기 ▸` 한 줄인데,
 *    파일 자체가 서버에 있어 이 저장소에서는 알림으로 대신한다
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./SellerDetailPage.data.ts` 에 있다
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
 * `셀러 정보` 블록만 라벨 폭을 넓힌다 — `상품 취급 유형`·`통신판매업신고증` 이
 * 기본 80 에 들어가지 않는다. §30-3 대로 `labelWidth` 는 **블록 전체가 함께** 가져간다.
 */
const BASIC_LABEL_WIDTH = 128;

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
 * 제출 서류 한 줄 — 파일명 · 번호 · [보기].
 * 원본이 셋을 한 줄에 두므로 같은 줄에 둔다.
 */
function DocumentRow({
  document,
  onOpen,
}: {
  document: SellerDocument;
  onOpen: () => void;
}) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <FileText size={16} strokeWidth={1.2} aria-hidden />
      <span>{document.fileName}</span>
      <span className="text-text-sub tabular-nums">{document.number}</span>
      <TextButton onClick={onOpen}>보기</TextButton>
    </span>
  );
}

export function SellerDetailPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: SellerDetailPageProps) {
  const { toast } = useToast();
  const pathname = usePathname();
  const status = asStatus(useSearchParams().get("preview"));

  const sellerId = decodeURIComponent(pathname.split("/").pop() ?? "");
  const seller = findSeller(sellerId);

  /* 고치는 값 — 저장 전까지 화면 안에만 산다 */
  const [commission, setCommission] = useState(
    seller?.commission === null ? "" : String(seller?.commission ?? ""),
  );
  const [hygiene, setHygiene] = useState(
    hygieneValue(seller?.hygiene ?? false),
  );
  const [scope, setScope] = useState(seller?.dealScope ?? "all");
  const [touched, setTouched] = useState(false);

  const nav = (
    <Gnb
      sections={GNB_SECTIONS}
      activeId={activeNav}
      onSelect={onNavSelect}
      open={navOpen}
      onOpenChange={onNavOpenChange}
      logo={GNB_LOGO_SLOTS.logo}
      collapsedLogo={GNB_LOGO_SLOTS.collapsed}
    />
  );

  /*
    없는 셀러 — 주소를 손으로 고쳤거나 지워진 셀러다.
    **빈 목록이 아니라 잘못된 주소**이므로 돌아갈 곳을 준다(§D8-2).
  */
  if (!seller) {
    return (
      <AppShell sidebar={nav} header={<PageHeader title="셀러 상세" />}>
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

  const meta = STATUS_META[seller.status];
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  /** 본사 계정은 운영 값이 확정이라 고칠 수 없다 (원본 문구가 그 자리를 대신한다) */
  const editable = !seller.isHeadquarters;

  const error = editable ? commissionError(commission) : null;
  const changed =
    editable &&
    (commission !== String(seller.commission ?? "") ||
      hygiene !== hygieneValue(seller.hygiene) ||
      scope !== seller.dealScope);

  const reset = () => {
    setCommission(seller.commission === null ? "" : String(seller.commission));
    setHygiene(hygieneValue(seller.hygiene));
    setScope(seller.dealScope);
    setTouched(false);
  };

  const save = () => {
    setTouched(true);
    if (error) return;
    toast(SAVED_TEXT);
  };

  return (
    <AppShell
      sidebar={nav}
      header={
        /* 제목 옆에 누구의 상세인지 — 표에서 넘어온 뒤 "어느 셀러였더라"가 되지 않게 */
        <PageHeader title="셀러 상세" description={seller.name} />
      }
    >
      <Section title={SECTIONS.basic} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={8} />
        ) : (
          <>
            <InfoList>
              <InfoItem label="셀러명" labelWidth={BASIC_LABEL_WIDTH}>
                {seller.name}
              </InfoItem>
              <InfoItem label="대표자" labelWidth={BASIC_LABEL_WIDTH}>
                {seller.ceo}
              </InfoItem>
              <InfoItem label="연락처" labelWidth={BASIC_LABEL_WIDTH}>
                {seller.phone}
              </InfoItem>
              <InfoItem label="사업자 유형" labelWidth={BASIC_LABEL_WIDTH}>
                {BIZ_TYPES.find((item) => item.value === seller.bizType)?.label}
              </InfoItem>
              <InfoItem label="사업자등록증" labelWidth={BASIC_LABEL_WIDTH}>
                <DocumentRow
                  document={seller.bizLicense}
                  onOpen={() =>
                    toast(documentOpenText(seller.bizLicense.fileName))
                  }
                />
              </InfoItem>
              <InfoItem label="통신판매업신고증" labelWidth={BASIC_LABEL_WIDTH}>
                <DocumentRow
                  document={seller.salesLicense}
                  onOpen={() =>
                    toast(documentOpenText(seller.salesLicense.fileName))
                  }
                />
              </InfoItem>
              <InfoItem label="상태" labelWidth={BASIC_LABEL_WIDTH}>
                <span className="flex items-center gap-2">
                  <Tag tone={meta.tone} dot>
                    {meta.label}
                  </Tag>
                  {seller.isHeadquarters ? (
                    <span className="body-small text-text-sub">
                      {HEADQUARTERS_NOTICE}
                    </span>
                  ) : null}
                </span>
              </InfoItem>
              <InfoItem label="소개" labelWidth={BASIC_LABEL_WIDTH}>
                {seller.intro}
              </InfoItem>
            </InfoList>

            {/* 취급 유형은 **고치는 값**이라 InfoList 밖에 둔다 */}
            <div className="flex flex-col gap-2">
              <span className="label-medium-bold text-text">
                상품 취급 유형
              </span>
              <SegmentedControl
                aria-label="상품 취급 유형"
                items={DEAL_SCOPES.map((item) => ({
                  ...item,
                  disabled: !editable,
                }))}
                value={scope}
                onValueChange={(value) => setScope(value as typeof scope)}
              />
            </div>
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
              본사는 0% 로 확정이라 입력칸을 열지 않고 안내 문구가 그 자리를 대신한다.
            */}
            {editable ? (
              <FormField
                label="수수료율"
                description={COMMISSION_HINT}
                error={touched ? (error ?? undefined) : undefined}
              >
                {/* 단위는 입력칸 밖에 둔다 — 목록의 수수료율 셀과 같은 모양이다 */}
                <span className="flex items-center gap-2">
                  <Input
                    className="w-24"
                    inputMode="decimal"
                    value={commission}
                    onChange={(event) => setCommission(event.target.value)}
                  />
                  <span className="body-small text-text-sub">%</span>
                </span>
              </FormField>
            ) : (
              <InfoList>
                <InfoItem label="수수료율">0%</InfoItem>
              </InfoList>
            )}

            <div className="flex flex-col gap-2">
              <span className="label-medium-bold text-text">위생인증</span>
              <SegmentedControl
                aria-label="위생인증"
                items={HYGIENE_OPTIONS.map((item) => ({
                  ...item,
                  disabled: !editable,
                }))}
                value={hygiene}
                onValueChange={setHygiene}
              />
            </div>

            <InfoList>
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
      */}
      <Section
        title={`${SECTIONS.products} (${seller.catalog.length})`}
        busy={busy}
        dim={dim}
      >
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
          <Table>
            <colgroup>
              <col className="w-12" />
              <col className="w-18" />
              <col className="w-24" />
              <col className="w-30" />
              <col className="w-60" />
              <col className="w-28" />
              <col className="w-40" />
              <col className="w-40" />
              <col className="w-22" />
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
              {seller.catalog.map((product) => {
                const saleMeta = SALE_STATUS_META[product.saleStatus];
                return (
                  <TableRow key={product.code}>
                    <TableTd className="tabular-nums">{product.no}</TableTd>
                    <TableTd align="center">
                      {DEAL_KIND_LABEL[product.kind]}
                    </TableTd>
                    <TableTd align="center">
                      <Tag tone={saleMeta.tone} dot>
                        {saleMeta.label}
                      </Tag>
                    </TableTd>
                    <TableTd className="tabular-nums">{product.code}</TableTd>
                    <TableTd ellipsis>{product.name}</TableTd>
                    <TableTd>{product.category}</TableTd>
                    <TableTd className="tabular-nums">
                      {stampText(product.createdAt)}
                    </TableTd>
                    <TableTd className="tabular-nums">
                      {stampText(product.updatedAt)}
                    </TableTd>
                    <TableTd align="center">
                      {shownLabel(product.shown)}
                    </TableTd>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>

      {/*
        하단 액션 바 (원본). 좌측은 되돌아가는 길, 우측은 이 화면에서 하는 일이다.
        [취소] 는 **고친 것을 되돌릴 뿐** 화면을 떠나지 않는다 — 떠나는 것은 [목록] 이다.
      */}
      <Card variant="soft">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => onNavSelect(LIST_PATH)}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={!changed} onClick={reset}>
              취소
            </Button>
            <Button disabled={!changed} onClick={save}>
              저장하기
            </Button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
