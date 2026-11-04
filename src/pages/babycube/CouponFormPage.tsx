import { useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Ticket } from "lucide-react";
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
  InfoItem,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  SegmentedControl,
  Skeleton,
  Tag,
  useToast,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import {
  STATUS_META,
  couponStatus,
  ymd,
  type Coupon,
  type IssueMethod,
} from "./CouponListPage.data";
import {
  COPY,
  DC_TYPES,
  ISSUE_METHODS,
  LIST_PATH,
  NAME_MAX,
  NEW_PATH,
  REPLACE_CONFIRM,
  STACK_OPTIONS,
  STAT_OPTIONS,
  TARGET_OPTIONS,
  codeStatsText,
  codeUploadMessage,
  countCodes,
  draftOf,
  findHqCoupon,
  methodLockMessage,
  needsReplaceConfirm,
  validateHqCoupon,
  type DcType,
  type HqCouponDraft,
  type HqCouponField,
} from "./CouponFormPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 본사 쿠폰 등록 · 수정 — 폼형 · 뼈대 (추가 기획 보드 06·07 · 개발 70a3e88 `CouponFormScreen`)
 *
 * ## 구성 — 셀러 쿠폰 폼(`seller/CouponPages`)과 같은 4구역 + 본사 칸
 * ```
 * 기본 정보   ← 쿠폰명* · 발급 방식*(가입 시 자동/다운로드/쿠폰 번호) · [쿠폰 번호면] 번호 파일
 * 할인 내용   ← 할인 유형* · 할인율|할인 금액* · (정률) 최대 할인액 · 사용 조건 · 적용 대상* · 중복 사용*
 * 사용 기간   ← 가입 시 자동: 발급 후 [ ]일*  /  그 밖: 시작일 · 종료일
 * 상태        ← 상태* · (수정) 발행일 · 쿠폰코드
 * [목록]                                   [취소] [쿠폰 등록|저장하기]   ← 하단 바 (화면 아래 고정)
 * ```
 * 경로 `/promo/new` = 신규(`App.tsx` ROUTES) · `/promo/{본사 쿠폰코드}` = 수정(`CouponDetailPage` 가 넘겨준다).
 * 셀러 쿠폰(직영 매장 포함)은 이 폼을 열지 않는다 — 조회 상세가 맡는다.
 *
 * | 갈아끼울 것                         | 위치                          |
 * | ----------------------------------- | ----------------------------- |
 * | 처음 값·검사·잠금·교체 판정·문구    | `CouponFormPage.data.ts`      |
 * | 상태 배지·날짜 표기                 | `CouponListPage.data.ts`(목록과 같은 함수) |
 *
 * ## 그대로 두는 것 (형제 폼과 같다)
 * 구역 접기 · 하단 바(주 버튼 맨 오른쪽 하나) · 찾을 수 없음 · 쿠폰마다 본문 `key` · `?preview=loading|refreshing`
 *
 * ## 퍼블 범위
 * 입력은 이 화면 state 만 바꾼다. [쿠폰 등록]/[저장하기] 는 검사 → (교체 확인) → 알림(+ 신규는 목록으로).
 * 번호 파일은 파일 안 줄을 세어 알림 + 「번호 N개」만 늘린다(저장하지 않는다). 목록에는 반영하지 않는다.
 *
 * ## 원본(개발)과 다르게 둔 곳 — 근거는 `.data.ts` 머리
 * 오류는 칸 아래 인라인 · 교체 확인은 확인 창 · 신규 저장 알림 · 머리(제목 + 부제 + 저장된 상태 배지)
 * ====================================================================== */

export interface CouponFormPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");
const withCommas = (value: string) =>
  value === "" ? "" : Number(value).toLocaleString("ko-KR");
const toDate = (text: string) =>
  text ? new Date(`${text}T00:00:00`) : undefined;
const fromDate = (date?: Date) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : "";

/** 도움말 — `**…**` 를 굵게(셀러 폼 `Bold` 와 같은 규칙) */
function Help({ text }: { text: string }) {
  return (
    <p className="body-small max-w-3xl break-keep text-text-sub">
      {text.split("**").map((part, index) =>
        index % 2 ? (
          <strong key={index} className="body-small-bold text-text">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </p>
  );
}

/** 접을 수 있는 구역 한 장 — 형제 폼과 같은 규격 */
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

function Shell({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
  header,
  children,
}: CouponFormPageProps & { header: ReactNode; children: ReactNode }) {
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
      header={header}
    >
      {children}
    </AppShell>
  );
}

export function CouponFormPage(props: CouponFormPageProps) {
  const pathname = usePathname();
  /* 경로는 `/promo/{조각}` **한 조각**이어야 한다 */
  const rest = pathname.slice(LIST_PATH.length + 1);
  const isNew = pathname === NEW_PATH;
  const coupon =
    isNew || rest.includes("/")
      ? undefined
      : findHqCoupon(lastPathSegment(pathname));

  if (!isNew && !coupon) {
    return (
      <Shell {...props} header={<PageHeader title={COPY.editTitle} />}>
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<Ticket strokeWidth={1.2} aria-hidden />}
              title={COPY.notFoundTitle}
              description={COPY.notFoundDescription}
            >
              <Button
                variant="secondary"
                onClick={() => props.onNavSelect(LIST_PATH)}
              >
                쿠폰관리로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </Shell>
    );
  }
  /* 쿠폰마다 처음부터 — 고치던 값이 다음 쿠폰에 묻어가지 않게 */
  return (
    <CouponFormBody key={coupon?.id ?? "new"} coupon={coupon} {...props} />
  );
}

function CouponFormBody({
  coupon,
  ...props
}: CouponFormPageProps & { coupon: Coupon | undefined }) {
  const { onNavSelect } = props;
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const [draft, setDraft] = useState<HqCouponDraft>(() => draftOf(coupon));
  const [errors, setErrors] = useState<Partial<Record<HqCouponField, string>>>(
    {},
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** 올린 번호 수 — 업로드하면 늘고 곧바로 발급 방식이 잠긴다(개발 3a2df9e) */
  const [codes, setCodes] = useState(
    coupon?.hq?.codes ?? { total: 0, claimed: 0 },
  );
  const picker = useRef<HTMLInputElement>(null);

  const isNew = !coupon;
  const rate = draft.dcType === "rate";
  const signup = draft.issueMethod === "가입자동";
  const methodLock = coupon?.hq
    ? methodLockMessage(coupon.hq.issuedCount, codes.total)
    : null;

  const set = <K extends keyof HqCouponDraft>(k: K, v: HqCouponDraft[K]) => {
    setDraft((prev) => ({ ...prev, [k]: v }));
    if (k in errors) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };
  const toList = () => onNavSelect(LIST_PATH);

  const commit = () => {
    setConfirmOpen(false);
    if (isNew) {
      toast(COPY.created);
      toList();
    } else toast(COPY.saved);
  };

  const save = () => {
    const found = validateHqCoupon(draft);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    if (needsReplaceConfirm(draft, coupon?.id)) setConfirmOpen(true);
    else commit();
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const result = countCodes(await file.text());
    setCodes((prev) => ({ ...prev, total: prev.total + result.added }));
    toast(codeUploadMessage(result));
  };

  const saved = coupon ? STATUS_META[couponStatus(coupon)] : null;

  return (
    <Shell
      {...props}
      header={
        /* 배지는 **저장된** 상태 — 고르는 중인 초안과 섞지 않는다 */
        <PageHeader
          title={isNew ? COPY.newTitle : COPY.editTitle}
          description={
            coupon
              ? [coupon.id, coupon.seller, coupon.name].join(" · ")
              : COPY.newDescription
          }
          badges={
            saved ? (
              <Tag tone={saved.tone} dot>
                {saved.label}
              </Tag>
            ) : undefined
          }
        />
      }
    >
      <Section title="기본 정보" busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={2} />
        ) : (
          <>
            <FormField
              className="max-w-160"
              label="쿠폰명"
              required
              error={errors.name}
              labelAction={
                <span className="body-small text-text-sub tabular-nums">
                  {draft.name.length}/{NAME_MAX}
                </span>
              }
            >
              <Input
                maxLength={NAME_MAX}
                placeholder={COPY.namePlaceholder}
                value={draft.name}
                invalid={Boolean(errors.name)}
                onChange={(event) => set("name", event.target.value)}
              />
            </FormField>
            <FormField
              label="발급 방식"
              required
              group
              description={methodLock ?? undefined}
            >
              <SegmentedControl
                className="self-start"
                items={ISSUE_METHODS.map((item) => ({
                  ...item,
                  disabled: methodLock !== null,
                }))}
                value={draft.issueMethod}
                onValueChange={(v) => set("issueMethod", v as IssueMethod)}
              />
            </FormField>
            {/* 번호 파일 — 저장된 「쿠폰 번호」 쿠폰에서만 올린다(개발 495c8f5 `CodeFileRow`) */}
            {draft.issueMethod === "쿠폰번호" && (
              <FormField label="번호 파일" group>
                <div role="group" className="flex flex-col gap-2">
                  {coupon?.hq?.issueMethod === "쿠폰번호" ? (
                    <>
                      <Button
                        className="self-start"
                        variant="secondary"
                        size="small"
                        onClick={() => picker.current?.click()}
                      >
                        파일 올리기
                      </Button>
                      <input
                        ref={picker}
                        type="file"
                        accept=".txt,text/plain"
                        hidden
                        aria-label="번호 파일 선택"
                        onChange={(event) => {
                          void upload(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      <p className="body-small text-text-sub tabular-nums">
                        {codeStatsText(codes)}
                      </p>
                    </>
                  ) : (
                    <p className="body-small text-text-sub">
                      {isNew ? COPY.codeNeedCreate : COPY.codeNeedSave}
                    </p>
                  )}
                </div>
              </FormField>
            )}
          </>
        )}
      </Section>

      <Section title="할인 내용" busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={4} />
        ) : (
          <>
            <FormField label="할인 유형" required group>
              <SegmentedControl
                className="self-start"
                items={DC_TYPES}
                value={draft.dcType}
                onValueChange={(v) => set("dcType", v as DcType)}
              />
            </FormField>
            <FormField
              label={rate ? "할인율" : "할인 금액"}
              required
              error={errors.dcVal}
              suffix={rate ? "%" : "원"}
            >
              <Input
                className="max-w-52"
                inputMode="numeric"
                placeholder={rate ? "할인율 입력" : "할인 금액 입력"}
                value={rate ? draft.dcVal : withCommas(draft.dcVal)}
                invalid={Boolean(errors.dcVal)}
                onChange={(event) =>
                  set("dcVal", onlyDigits(event.target.value))
                }
              />
            </FormField>
            {rate && (
              <FormField label="최대 할인액" error={errors.cap} suffix="원">
                <Input
                  className="max-w-52"
                  inputMode="numeric"
                  placeholder={COPY.capPlaceholder}
                  value={withCommas(draft.cap)}
                  invalid={Boolean(errors.cap)}
                  onChange={(event) =>
                    set("cap", onlyDigits(event.target.value))
                  }
                />
              </FormField>
            )}
            {rate && <Help text={COPY.capHelp} />}
            <FormField label="사용 조건" suffix="원">
              <Input
                className="max-w-52"
                inputMode="numeric"
                placeholder={COPY.minPlaceholder}
                value={withCommas(draft.min)}
                onChange={(event) => set("min", onlyDigits(event.target.value))}
              />
            </FormField>
            <Help text={COPY.minHelp} />
            <FormField label="적용 대상" required group>
              <SegmentedControl
                className="self-start"
                items={TARGET_OPTIONS}
                value={draft.target}
                onValueChange={(v) =>
                  set("target", v as HqCouponDraft["target"])
                }
              />
            </FormField>
            <FormField label="중복 사용" required group>
              <SegmentedControl
                className="self-start"
                items={STACK_OPTIONS}
                value={draft.stackable ? "Y" : "N"}
                onValueChange={(v) => set("stackable", v === "Y")}
              />
            </FormField>
          </>
        )}
      </Section>

      <Section title="사용 기간" busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={1} />
        ) : signup ? (
          /* 가입 시 자동은 발급분마다 기간이 정해진다 — 일수 칸 하나(고르는 버튼 없음 · 보드 06) */
          <FormField
            label="발급 후"
            required
            error={errors.validDays}
            suffix="일"
          >
            <Input
              className="max-w-52"
              inputMode="numeric"
              placeholder={COPY.validDaysPlaceholder}
              value={draft.validDays}
              invalid={Boolean(errors.validDays)}
              onChange={(event) =>
                set("validDays", onlyDigits(event.target.value))
              }
            />
          </FormField>
        ) : (
          <>
            <div className="flex flex-wrap gap-6">
              <FormField label="시작일">
                <DatePicker
                  className="w-60"
                  value={toDate(draft.start)}
                  onChange={(next) => set("start", fromDate(next))}
                  placeholder="날짜 선택"
                />
              </FormField>
              <FormField label="종료일" error={errors.end}>
                <DatePicker
                  className="w-60"
                  value={toDate(draft.end)}
                  invalid={Boolean(errors.end)}
                  onChange={(next) => set("end", fromDate(next))}
                  placeholder="날짜 선택"
                />
              </FormField>
            </div>
            <Help text={COPY.periodHelp} />
          </>
        )}
      </Section>

      <Section title="상태" busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={2} />
        ) : (
          <>
            <FormField label="상태" required group>
              <SegmentedControl
                className="self-start"
                items={STAT_OPTIONS}
                value={draft.stat}
                onValueChange={(v) => set("stat", v as HqCouponDraft["stat"])}
              />
            </FormField>
            {coupon ? (
              <InfoList>
                <InfoItem label="발행일" labelWidth={120}>
                  {ymd(coupon.issuedOn)}
                </InfoItem>
                <InfoItem label="쿠폰코드" labelWidth={120}>
                  {coupon.id}
                </InfoItem>
              </InfoList>
            ) : (
              <Help text={COPY.issuedHelp} />
            )}
          </>
        )}
      </Section>

      {/* 하단 바 — 주 버튼은 맨 오른쪽 하나(셀러 폼과 같다) */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={toList}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={toList}>
              취소
            </Button>
            <Button onClick={save}>{isNew ? "쿠폰 등록" : "저장하기"}</Button>
          </div>
        </div>
      </Card>

      {/* 가입 쿠폰 교체 확인 — 개발 69ab2f3 문구. 취소하면 저장하지 않는다 */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        size="small"
      >
        <ModalHeader closeLabel="대화상자 닫기" title={REPLACE_CONFIRM.title} />
        <ModalBody>
          <p className="body-medium break-keep text-text">
            {REPLACE_CONFIRM.body}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setConfirmOpen(false)}
          >
            취소
          </Button>
          <Button size="large" onClick={commit}>
            확인
          </Button>
        </ModalFooter>
      </Modal>
    </Shell>
  );
}
