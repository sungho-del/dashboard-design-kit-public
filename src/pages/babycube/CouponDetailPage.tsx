import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Ticket } from "lucide-react";
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
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import {
  STATUS_META,
  conditionText,
  couponStatus,
  periodParts,
  ymd,
  type Coupon,
} from "./CouponListPage.data";
import {
  DISCOUNT_TYPE_LABEL,
  LIST_LABEL,
  LIST_PATH,
  NOT_FOUND_DESCRIPTION,
  NOT_FOUND_TITLE,
  PAGE_TITLE,
  SECTIONS,
  discountDetailOf,
  expiredNoteOf,
  findCoupon,
  headlineOf,
} from "./CouponDetailPage.data";
import { CouponFormPage } from "./CouponFormPage";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 쿠폰 상세 — 조회형 · 뼈대 (원본 v0.4 `couponForm`, 본사 조회 전용)
 *
 * ## 구성
 * ```
 * 기본 정보 · 할인 내용 · 사용 기간 · 상태     (4구역, 각각 접기)
 * [목록]                                       ← 하단 고정 바(오른쪽 비움 — 원본 `noSave`)
 * ```
 * 쿠폰관리의 쿠폰명·행이 이 화면으로 온다(`/promo/{쿠폰코드}`). 고치는 값이 없다 —
 * 접기와 [목록]뿐이다. 쿠폰이 바뀌면 `key` 로 처음부터(접힘이 다음 건에 묻어가지 않게).
 *
 * ## 이 파일은 도메인을 모른다
 * | 갈아끼울 것                         | 위치                                      |
 * | ----------------------------------- | ----------------------------------------- |
 * | 대상 찾기·구역 제목·문구·할인 표기 | `CouponDetailPage.data.ts`                |
 * | 상태·조건·기간 표기                 | `CouponListPage.data.ts`(목록과 같은 함수) |
 *
 * ## 원본과 다르게 둔 것
 * - 머리를 그린다(원본 `bare`) — 제목 「쿠폰 상세」 + 부제 + 상태 배지(형제 상세와 같다)
 * - **본사 쿠폰은 이 조회 화면이 아니라 수정 폼**(`CouponFormPage`)을 그린다 — 같은 경로
 *   `/promo/{쿠폰코드}`(추가 기획 보드 06 「본사 쿠폰 상세」 · 개발 70a3e88 `CouponDetail` 분기).
 *   셀러 쿠폰(직영 매장 포함)은 지금처럼 조회 + [목록]만
 * ====================================================================== */

export interface CouponDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

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

export function CouponDetailPage(props: CouponDetailPageProps) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  /* 경로는 `/promo/{쿠폰코드}` **한 조각**이어야 한다 */
  const rest = pathname.slice(LIST_PATH.length + 1);
  const coupon = rest.includes("/")
    ? undefined
    : findCoupon(lastPathSegment(pathname));

  if (!coupon) {
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
        header={<PageHeader title={PAGE_TITLE} />}
      >
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<Ticket strokeWidth={1.2} aria-hidden />}
              title={NOT_FOUND_TITLE}
              description={NOT_FOUND_DESCRIPTION}
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                {LIST_LABEL}로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  /* 본사가 등록한 쿠폰은 본사가 고친다 — 같은 경로에서 수정 폼으로 */
  if (coupon.hq) return <CouponFormPage {...props} />;
  return <CouponDetailBody key={coupon.id} coupon={coupon} {...props} />;
}

function CouponDetailBody({
  coupon,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: CouponDetailPageProps & { coupon: Coupon }) {
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const meta = STATUS_META[couponStatus(coupon)];
  const discount = discountDetailOf(coupon);
  const condition = conditionText(coupon);
  const period = periodParts(coupon);
  const expiredNote = expiredNoteOf(coupon);

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
          title={PAGE_TITLE}
          description={headlineOf(coupon)}
          badges={
            <Tag tone={meta.tone} dot>
              {meta.label}
            </Tag>
          }
        />
      }
    >
      <Section title={SECTIONS.basic} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={3} />
        ) : (
          <InfoList>
            <InfoItem label="셀러명">{coupon.seller}</InfoItem>
            <InfoItem label="쿠폰명">{coupon.name}</InfoItem>
            <InfoItem label="쿠폰코드">{coupon.id}</InfoItem>
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.content} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={3} />
        ) : (
          <InfoList>
            <InfoItem label="할인 유형">
              {DISCOUNT_TYPE_LABEL[coupon.discountType]}
            </InfoItem>
            <InfoItem label="할인 내용">
              {discount.prefix}{" "}
              <span className="body-medium-bold">{discount.strong}</span>
              {discount.note !== null && (
                <>
                  {" "}
                  <span className="text-text-minimal">{discount.note}</span>
                </>
              )}
            </InfoItem>
            <InfoItem label="사용 조건">
              <span
                className={condition.unset ? "text-text-minimal" : "text-text"}
              >
                {condition.text}
              </span>
            </InfoItem>
            {/* 확인 요청 답(2026-11-06) §5 — 사용 조건 다음 줄(개발 `CouponDetail` 과 같은 자리) */}
            <InfoItem label="적용 대상">{coupon.target}</InfoItem>
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.period} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={1} />
        ) : (
          <InfoList>
            <InfoItem label="사용 기간">
              {period.lead}
              <span
                className={period.tailMuted ? "text-text-minimal" : "text-text"}
              >
                {period.tail}
              </span>
            </InfoItem>
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.status} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={2} />
        ) : (
          <InfoList>
            <InfoItem label="상태">
              <span className="flex flex-wrap items-center gap-2">
                <Tag tone={meta.tone} dot size="small">
                  {meta.label}
                </Tag>
                {expiredNote !== null && (
                  <span className="body-small text-text-minimal">
                    {expiredNote}
                  </span>
                )}
              </span>
            </InfoItem>
            <InfoItem label="발행일">{ymd(coupon.issuedOn)}</InfoItem>
          </InfoList>
        )}
      </Section>

      {/* 하단 바 — 원본 [목록] 하나(조회 전용이라 저장·확인을 두지 않는다) */}
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
