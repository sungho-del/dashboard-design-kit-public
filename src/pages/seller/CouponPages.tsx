import { useState, type ComponentProps } from "react";
import { ArrowDownToLine, Plus, Ticket } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  DataTableShell,
  DatePicker,
  EmptyState,
  FormField,
  InfoItem,
  InfoList,
  Input,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
  SegmentedControl,
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
import { lastPathSegment, usePathname } from "../../lib/router";
import {
  COUPONS,
  COUPON_COPY,
  DC_TYPES,
  LIST_PATH,
  NAME_MAX,
  NEW_PATH,
  STATUS_TONE,
  STAT_OPTIONS,
  TARGET_OPTIONS,
  conditionOf,
  contentOf,
  couponStatusOf,
  dotDate,
  draftOf,
  findCoupon,
  periodOf,
  validateCoupon,
  type CouponDraft,
  type CouponField,
  type DcType,
} from "./CouponPages.data";
import { LIST_COPY, PAGE_SIZE, PAGE_SIZES } from "./processList.data";
import type { SellerCoupon } from "./seed/store.data";
import { Bold, Section, SellerShell, type SellerNavProps } from "./SettleParts";

/* =========================================================================
 * 쿠폰관리(SO-MKT-001) 목록 · 쿠폰 등록/수정(SO-MKT-002) 폼 — 원본 `SCREENS.promo` · `DETAILS.couponForm`
 *
 * 목록: [ 목록 (총 N건) · 엑셀 · [+ 쿠폰 등록] | 표(체크박스 · No · 쿠폰명 · 내용 · 조건 · 기간 · 발행일 · 상태) | 페이지 ]
 *   원본에 검색조건·상태 카드가 없다(그대로). 행 어디를 눌러도 수정 폼(`/promo/{쿠폰코드}`).
 * 폼: 기본 정보 · 할인 내용 · 사용 기간 · 상태 (각각 접기) · [목록] … [취소] [쿠폰 등록|저장하기]
 *
 * 도메인·문구 = `./CouponPages.data.ts`. 퍼블 범위: 입력은 이 화면 state 만, 저장은 알림(+ 신규는 목록으로).
 * 쿠폰이 바뀌면 `key` 로 처음부터.
 * ====================================================================== */

function CouponStatusTag({ c }: { c: SellerCoupon }) {
  const s = couponStatusOf(c);
  return (
    <Tag tone={STATUS_TONE[s]} dot size="small">
      {s}
    </Tag>
  );
}

export function CouponListPage(props: SellerNavProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<string[]>([]);

  const totalPages = Math.max(1, Math.ceil(COUPONS.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paged = COUPONS.slice(start, start + pageSize);
  const ids = paged.map((c) => c.id);
  const allChecked = ids.length > 0 && ids.every((id) => selected.includes(id));
  const someChecked = selected.length > 0 && !allChecked;
  const open = (c: SellerCoupon) => props.onNavSelect(`${LIST_PATH}/${c.id}`);

  return (
    <SellerShell {...props} header={<PageHeader title="쿠폰관리" />}>
      <DataTableShell
        variant="soft"
        toolbarStart={
          <h2 className="heading-medium-bold text-text">
            목록 (총 {COUPONS.length}건)
          </h2>
        }
        toolbarEnd={
          <span className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                const picked = selected.length > 0;
                toast(
                  LIST_COPY.excel(
                    picked ? selected.length : COUPONS.length,
                    picked,
                  ),
                );
              }}
            >
              <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
              엑셀 다운로드
            </Button>
            <Button onClick={() => props.onNavSelect(NEW_PATH)}>
              <Plus size={16} strokeWidth={1.2} aria-hidden />
              쿠폰 등록
            </Button>
          </span>
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            end={
              <PaginationSizeSelect
                sizes={PAGE_SIZES}
                value={pageSize}
                onSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            }
          />
        }
      >
        <Table>
          <colgroup>
            {/* 모든 열에 폭 — 합 976(1280 본문 폭). 본사 쿠폰 목록과 같은 값(셀러명 열 자리를 체크박스·쿠폰명이 나눈다) */}
            <col className="w-13" />
            <col className="w-14" />
            <col className="w-48" />
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-47" />
            <col className="w-25" />
            <col className="w-25" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>
                <Checkbox
                  size="small"
                  aria-label="이 페이지 전체 선택"
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={() =>
                    setSelected(
                      allChecked
                        ? selected.filter((id) => !ids.includes(id))
                        : ids,
                    )
                  }
                />
              </TableTh>
              <TableTh>No</TableTh>
              <TableTh>쿠폰명</TableTh>
              <TableTh>내용</TableTh>
              <TableTh>조건</TableTh>
              <TableTh>기간</TableTh>
              <TableTh>발행일</TableTh>
              <TableTh align="center">상태</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((c, i) => {
              const content = contentOf(c);
              const cond = conditionOf(c);
              const period = periodOf(c);
              return (
                <TableRow key={c.id} clickable onClick={() => open(c)}>
                  <TableTd>
                    <Checkbox
                      size="small"
                      aria-label={`${c.name} 선택`}
                      checked={selected.includes(c.id)}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(c.id)
                            ? prev.filter((v) => v !== c.id)
                            : [...prev, c.id],
                        )
                      }
                    />
                  </TableTd>
                  <TableTd className="tabular-nums">{start + i + 1}</TableTd>
                  {/* 버튼은 한 줄(nowrap)이라 안쪽 글자만 단어 단위로 줄바꿈 — 본사 쿠폰 목록과 같다 */}
                  <TableTd className="break-keep wrap-anywhere">
                    <TextButton className="max-w-full" onClick={() => open(c)}>
                      <span className="text-left whitespace-normal">
                        {c.name}
                      </span>
                    </TextButton>
                  </TableTd>
                  <TableTd>
                    {content.main}
                    {content.sub && (
                      <span className="text-text-sub"> {content.sub}</span>
                    )}
                  </TableTd>
                  <TableTd className={cond.unset ? "text-text-sub" : undefined}>
                    {cond.text}
                  </TableTd>
                  <TableTd className="tabular-nums">
                    {period.lead}
                    {period.tail && (
                      <span className="text-text-sub">{period.tail}</span>
                    )}
                  </TableTd>
                  <TableTd className="tabular-nums">
                    {dotDate(c.issued)}
                  </TableTd>
                  <TableTd align="center">
                    <CouponStatusTag c={c} />
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>
    </SellerShell>
  );
}

/* ---------- 쿠폰 등록/수정 ---------- */

const onlyDigits = (v: string) => v.replace(/[^0-9]/g, "");
const withCommas = (v: string) =>
  v === "" ? "" : Number(v).toLocaleString("ko-KR");
const toDate = (s: string) => (s ? new Date(`${s}T00:00:00`) : undefined);
const fromDate = (d?: Date) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";

function Help({ text }: { text: string }) {
  return (
    <p className="body-small max-w-3xl break-keep text-text-sub">
      <Bold text={text} />
    </p>
  );
}

/**
 * 날짜칸 + [지우기]를 묶은 `FormField group` 의 자식. FormField 가 오류 때 주입하는 `invalid` 를
 * DOM 에 흘리지 않는다(본사 `DisplayFormPage` 와 같다)
 */
function FieldGroup({
  invalid,
  ...rest
}: ComponentProps<"div"> & { invalid?: boolean }) {
  void invalid;
  return <div role="group" {...rest} />;
}

export function CouponFormPage(props: SellerNavProps) {
  const pathname = usePathname();
  const rest = pathname.slice(LIST_PATH.length + 1);
  const key = lastPathSegment(pathname);
  const isNew = pathname === NEW_PATH;
  const coupon = isNew || rest.includes("/") ? undefined : findCoupon(key);

  if (!isNew && !coupon) {
    return (
      <SellerShell {...props} header={<PageHeader title="쿠폰 상세 (수정)" />}>
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<Ticket strokeWidth={1.2} aria-hidden />}
              title={COUPON_COPY.notFoundTitle}
              description={COUPON_COPY.notFoundDescription}
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
      </SellerShell>
    );
  }
  return (
    <CouponFormBody key={coupon?.id ?? "new"} coupon={coupon} {...props} />
  );
}

function CouponFormBody({
  coupon,
  ...props
}: SellerNavProps & { coupon?: SellerCoupon }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<CouponDraft>(() => draftOf(coupon));
  const [errors, setErrors] = useState<Partial<Record<CouponField, string>>>(
    {},
  );
  const isNew = !coupon;
  const rate = draft.dcType === "rate";
  const set = <K extends keyof CouponDraft>(k: K, v: CouponDraft[K]) => {
    setDraft((prev) => ({ ...prev, [k]: v }));
    if (k in errors) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };
  const toList = () => props.onNavSelect(LIST_PATH);

  const save = () => {
    const e = validateCoupon(draft);
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    if (isNew) {
      toast(COUPON_COPY.created);
      toList();
    } else toast(COUPON_COPY.saved);
  };

  return (
    <SellerShell
      {...props}
      header={
        <PageHeader
          title={isNew ? "쿠폰 등록" : "쿠폰 상세 (수정)"}
          description={
            isNew
              ? "새 쿠폰을 등록합니다."
              : `${coupon.name} · ${coupon.id} · 발행 ${dotDate(coupon.issued)}`
          }
          badges={coupon ? <CouponStatusTag c={coupon} /> : undefined}
        />
      }
    >
      <Section title="기본 정보">
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
            placeholder={COUPON_COPY.namePlaceholder}
            value={draft.name}
            invalid={Boolean(errors.name)}
            onChange={(event) => set("name", event.target.value)}
          />
        </FormField>
      </Section>

      <Section title="할인 내용">
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
            onChange={(event) => set("dcVal", onlyDigits(event.target.value))}
          />
        </FormField>
        {rate && (
          <FormField label="최대 할인액" suffix="원">
            <Input
              className="max-w-52"
              inputMode="numeric"
              placeholder={COUPON_COPY.capPlaceholder}
              value={withCommas(draft.cap)}
              onChange={(event) => set("cap", onlyDigits(event.target.value))}
            />
          </FormField>
        )}
        {rate && <Help text={COUPON_COPY.capHelp} />}
        <FormField label="사용 조건" suffix="원">
          <Input
            className="max-w-52"
            inputMode="numeric"
            placeholder={COUPON_COPY.minPlaceholder}
            value={withCommas(draft.min)}
            onChange={(event) => set("min", onlyDigits(event.target.value))}
          />
        </FormField>
        <Help text={COUPON_COPY.minHelp} />
        <FormField label="적용 대상" required group>
          <SegmentedControl
            className="self-start"
            items={TARGET_OPTIONS}
            value={draft.target}
            onValueChange={(v) => set("target", v as CouponDraft["target"])}
          />
        </FormField>
        <Help text={COUPON_COPY.targetHelp} />
      </Section>

      <Section title="사용 기간">
        {/* [시작일|종료일 지우기]는 값이 있을 때만 — 단일 달력은 비우는 손잡이가 없어 비워서 「상시」·「기한 없음」으로 되돌린다(개발 요청 12번) */}
        <div className="flex flex-wrap gap-6">
          <FormField label="시작일" group>
            <FieldGroup className="flex flex-wrap items-center gap-2">
              <DatePicker
                className="w-60"
                aria-label="시작일"
                value={toDate(draft.start)}
                onChange={(next) => set("start", fromDate(next))}
                placeholder="날짜 선택"
              />
              {draft.start ? (
                <TextButton
                  tone="secondary"
                  size="small"
                  onClick={() => set("start", "")}
                >
                  시작일 지우기
                </TextButton>
              ) : null}
            </FieldGroup>
          </FormField>
          <FormField label="종료일" group>
            <FieldGroup className="flex flex-wrap items-center gap-2">
              <DatePicker
                className="w-60"
                aria-label="종료일"
                value={toDate(draft.end)}
                onChange={(next) => set("end", fromDate(next))}
                placeholder="날짜 선택"
              />
              {draft.end ? (
                <TextButton
                  tone="secondary"
                  size="small"
                  onClick={() => set("end", "")}
                >
                  종료일 지우기
                </TextButton>
              ) : null}
            </FieldGroup>
          </FormField>
        </div>
        <Help text={COUPON_COPY.periodHelp} />
      </Section>

      <Section title="상태">
        <FormField label="상태" required group>
          <SegmentedControl
            className="self-start"
            items={STAT_OPTIONS}
            value={draft.stat}
            onValueChange={(v) => set("stat", v as CouponDraft["stat"])}
          />
        </FormField>
        {isNew ? (
          <Help text={COUPON_COPY.issuedHelp} />
        ) : (
          <InfoList>
            <InfoItem label="발행일" labelWidth={120}>
              {dotDate(coupon.issued)}
            </InfoItem>
            <InfoItem label="쿠폰코드" labelWidth={120}>
              {coupon.id}
            </InfoItem>
          </InfoList>
        )}
      </Section>

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
    </SellerShell>
  );
}
