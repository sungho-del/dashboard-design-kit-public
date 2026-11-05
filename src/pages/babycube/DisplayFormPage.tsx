import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Plus,
  ZoomIn,
} from "lucide-react";
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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  SegmentedControl,
  Select,
  Skeleton,
  Textarea,
  TextButton,
  useToast,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { usePathname, useSearchParams } from "../../lib/router";
import { STATUS_OPTIONS, type BannerStatus } from "./BannerListPage.data";
import { DEMO_TODAY } from "./OrderListPage.data";
import {
  COPY,
  KIND_COPY,
  LIST_PATH,
  orderOptions,
  targetOf,
  type DisplayKind,
  type DisplayTarget,
} from "./DisplayFormPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 배너/팝업 등록·수정 — 폼형 · 뼈대 (원본 v0.4 `dispDetail` 5365-5387 · 규격 `nvEditPage`)
 *
 * ## 구성 — 두 종류가 이 화면 하나를 쓴다(원본 「몸통 하나 공유」 3694-3695)
 * ```
 * [배너 등록 | 배너 수정]  /  [팝업 등록 | 팝업 수정]
 * 배너 정보 * (접기)  제목* · 이미지*(PC·모바일) · 노출 기간*(시작일 필수) · 노출 순서* · 노출 여부
 * 팝업 정보 * (접기)  제목* · 내용*(HTML 원문)  · 노출 기간*(시작일 필수) ·              노출 여부
 * [목록]                         ([삭제]) [취소] [등록|저장]   ← 하단 고정 바
 * ```
 * 경로 `/display/new|{id}` · `/popups/new|{id}` — 종류는 경로가 정한다. 그 밖은 「찾을 수 없음」.
 * 종류 + 대상이 바뀌면 `key` 로 처음부터(초안·오류·접힘이 다음 건에 묻어가지 않게).
 *
 * ## 이 파일은 도메인을 모른다
 * | 갈아끼울 것                         | 위치                                   |
 * | ----------------------------------- | -------------------------------------- |
 * | 경로 해석·글자·검증 문구·순서 선택지 | `DisplayFormPage.data.ts`              |
 * | 샘플·상태 의미표                    | `BannerListPage.data.ts` · `PopupListPage.data.ts` |
 *
 * ## 그대로 두는 것
 * 폼 간격은 직접 지정하지 않는다(§29) · 저장 → 검증 → 알림 → 목록 · 오류면 구역을 펼치고 제목칸 포커스 ·
 * 삭제 확인 창은 목록 [선택 삭제]와 같은 `DisplayDeleteModal`(원본 게이트 하나 3765)
 *
 * ## 퍼블 범위
 * 등록·저장·삭제는 **알림 후 목록 이동만** — 목록의 행·건수·순서·날짜는 바뀌지 않는다.
 * 이미지는 자리 표시 + 확대만, [+]·교체·삭제는 알림(상품 상세와 같은 결정). 그래서 **신규 배너는
 * 이미지 필수 오류까지만** 시연된다 — 검증을 지우지 않는다(⚠️ 기획 확인 필요로 보고).
 *
 * ## 원본과 다르게 둔 곳
 * 1. 머리 제목 등록/수정으로 나눔(원본은 「X 상세」 하나 — 형제 FAQ·공지와 같게)
 * 2. 검증은 입력칸 아래 오류(원본은 알림 — 문구는 원본 그대로)
 * 3. 하단 버튼 [삭제][취소][등록|저장] 순서(형제 결정 — 원본은 [삭제][저장][취소])
 * 4. 없는 id 는 「찾을 수 없는 X입니다」 + [X 관리로](형제 — 원본은 [목록]만 있는 빈 구역)
 * 5. 노출 시작일 필수 · 새 등록은 오늘로 미리 채움(판정 Q14 — 원본은 시작일 필수 아님)
 * 5. 날짜는 단일 달력 두 칸 — 원본처럼 시작·종료를 **각자** 비울 수 있다(기간 달력은 한쪽만 못 고른다)
 * ====================================================================== */

export interface DisplayFormPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** `YYYY-MM-DD` ↔ `Date`(로컬 자정). 빈 문자열은 값 없음 */
const toDate = (text: string) => {
  if (!text) return undefined;
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const TITLE_ID = "display-form-title";

/**
 * 여러 칸을 묶은 `FormField group` 의 자식. FormField 가 오류 때 주입하는 `invalid` 를
 * DOM 에 흘리지 않고(div 에는 없는 속성) `aria-labelledby`·`aria-invalid` 만 받는다.
 */
function FieldGroup({
  invalid,
  ...rest
}: ComponentProps<"div"> & { invalid?: boolean }) {
  void invalid;
  return <div role="group" {...rest} />;
}

/**
 * 삭제 확인 — **목록 [선택 삭제]와 상세 [삭제]가 함께 쓴다**(원본 `gateBannerDel` 2371-2378).
 * 제목은 2건 이상일 때만 건수. 대상 이름은 적지 않는다(UI-323).
 */
export function DisplayDeleteModal({
  kind,
  count,
  onClose,
  onConfirm,
}: {
  kind: DisplayKind;
  /** 지울 건수. `null` 이면 닫힘 */
  count: number | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={count !== null} onClose={onClose} size="small">
      <ModalHeader
        closeLabel="대화상자 닫기"
        title={KIND_COPY[kind].deleteTitle(count ?? 0)}
      />
      <ModalBody>
        {/* 「즉시 내려감」과 「되돌릴 수 없음」은 무게가 달라 한 문단에 묻지 않는다 */}
        <p className="body-medium break-keep text-text-sub">
          {COPY.deleteLead}
          <strong className="body-medium-bold text-text">
            {COPY.deleteEmphasis}
          </strong>
          {COPY.deleteTail}
        </p>
        <p className="body-medium break-keep text-text-sub">
          <strong className="body-medium-bold text-text-critical">
            {COPY.irreversible}
          </strong>{" "}
          {COPY.hideHint.lead}
          <span className="whitespace-nowrap">{COPY.hideHint.keep}</span>
          {COPY.hideHint.tail}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={onClose}>
          취소
        </Button>
        <Button variant="critical" size="large" onClick={onConfirm}>
          삭제
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function Shell({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
  title,
  children,
}: DisplayFormPageProps & { title: string; children: ReactNode }) {
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
      header={<PageHeader title={title} />}
    >
      {children}
    </AppShell>
  );
}

export function DisplayFormPage(props: DisplayFormPageProps) {
  const pathname = usePathname();
  const target = targetOf(pathname);

  if (!target) {
    const kind: DisplayKind = pathname.startsWith(`${LIST_PATH.popup}/`)
      ? "popup"
      : "banner";
    const copy = KIND_COPY[kind];
    return (
      <Shell {...props} title={copy.pageTitle.edit}>
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<ImageIcon strokeWidth={1.2} aria-hidden />}
              title={copy.notFoundTitle}
              description={copy.notFoundDescription}
            >
              <Button
                variant="secondary"
                onClick={() => props.onNavSelect(LIST_PATH[kind])}
              >
                {copy.listLabel}로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  return (
    <DisplayFormBody
      key={`${target.kind}:${target.mode === "edit" ? target.row.id : "new"}`}
      target={target}
      {...props}
    />
  );
}

interface Draft {
  title: string;
  pcImage: boolean;
  mobileImage: boolean;
  body: string;
  start: Date | undefined;
  end: Date | undefined;
  order: string;
  status: BannerStatus;
}

const draftOf = (target: DisplayTarget): Draft => {
  const row = target.mode === "edit" ? target.row : undefined;
  const banner =
    target.kind === "banner" && row && "order" in row ? row : undefined;
  const popup =
    target.kind === "popup" && row && "body" in row ? row : undefined;
  return {
    title: row?.title ?? "",
    pcImage: banner?.pcImage ?? false,
    mobileImage: banner?.mobileImage ?? false,
    body: popup?.body ?? "",
    /* 새 등록은 시작일을 오늘로 미리 채운다(판정 Q14) — 종료일은 비워 둔다(상시) */
    start: toDate(row ? row.startAt : DEMO_TODAY),
    end: toDate(row?.endAt ?? ""),
    /* 신규 배너는 맨 뒤 자리(원본 `ord: arr.length + 1` 3704) */
    order: String(banner?.order ?? orderOptions(true).length),
    /* 신규는 게시(원본 3703-3704) */
    status: row?.status ?? "posted",
  };
};

/** 이미지 자리 — 실제 파일이 없어 이름만 그린다(상품 상세 `ImageSlot` 과 같은 대체물) */
function ImageSlot({
  label,
  name,
  filled,
  onZoom,
  onPending,
}: {
  label: string;
  name: string;
  filled: boolean;
  onZoom: () => void;
  onPending: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label-small-bold text-text-sub">{label}</span>
      {filled ? (
        <>
          {/* 미리보기 비율 = 이미지 규격 2.25:1(원본 270×120 · 786-791) */}
          <span className="body-small flex aspect-9/4 w-68 flex-col items-center justify-center gap-1 rounded-medium bg-surface-sub text-text-sub">
            <ImageIcon size={24} strokeWidth={1.2} aria-hidden />
            {name}
          </span>
          <div className="flex items-center gap-1">
            <IconButton
              variant="ghost"
              size="small"
              label={`${name} 확대`}
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
        </>
      ) : (
        <button
          type="button"
          aria-label={`${name} 등록`}
          onClick={onPending}
          className="flex aspect-9/4 w-68 items-center justify-center rounded-medium bg-surface text-icon-sub outline-1 -outline-offset-1 outline-border focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          <Plus size={24} strokeWidth={1.2} aria-hidden />
        </button>
      )}
    </div>
  );
}

function DisplayFormBody({
  target,
  ...props
}: DisplayFormPageProps & { target: DisplayTarget }) {
  const { onNavSelect } = props;
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const loading = status === "loading";

  const { kind, mode } = target;
  const isBanner = kind === "banner";
  const copy = KIND_COPY[kind];
  const listPath = LIST_PATH[kind];

  const [draft, setDraft] = useState(() => draftOf(target));
  /** [등록|저장] 을 누른 뒤부터 오류를 보인다 */
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [zoomed, setZoomed] = useState<string | null>(null);
  /* 접힌 구역을 펼친 **다음 그림**에서야 입력칸이 생긴다 — 포커스는 그때 옮긴다 */
  const focusPending = useRef(false);

  const set =
    <K extends keyof Draft>(field: K) =>
    (value: Draft[K]) =>
      setDraft((prev) => ({ ...prev, [field]: value }));

  /* 원본 검증 순서(3735-3747) — 칸마다 첫 오류 하나 */
  const errors = {
    title: draft.title.trim() === "" ? copy.titleEmpty : undefined,
    image: !isBanner
      ? undefined
      : !draft.pcImage
        ? COPY.imageEmpty.pcImage
        : !draft.mobileImage
          ? COPY.imageEmpty.mobileImage
          : undefined,
    body: !isBanner && draft.body.trim() === "" ? COPY.bodyEmpty : undefined,
    /* 시작일 필수(판정 Q14) → 시작·종료가 **둘 다** 있을 때 순서(원본 3747) */
    period: !draft.start
      ? COPY.startEmpty
      : draft.end && draft.end < draft.start
        ? COPY.periodOrder
        : undefined,
  };
  const shown = (message: string | undefined) =>
    touched ? message : undefined;

  const backToList = () => onNavSelect(listPath);

  const save = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) {
      setOpen(true);
      if (errors.title) focusPending.current = true;
      return;
    }
    toast(copy.saved[mode]);
    backToList();
  };

  const confirmDelete = () => {
    setDeleting(false);
    toast(COPY.deleted(1));
    backToList();
  };

  const imagePending = () => toast(COPY.imagePending);

  return (
    <Shell {...props} title={copy.pageTitle[mode]}>
      <Card variant="soft" aria-busy={busy}>
        <CardHeader
          title={
            <>
              {copy.sectionTitle}
              {/* 원본 필수 ● — 시각 기호라 읽지 않는다. 필수 여부는 안의 칸이 말한다 */}
              <span aria-hidden className="text-text-critical">
                {" "}
                *
              </span>
            </>
          }
          action={
            <IconButton
              variant="ghost"
              size="small"
              label={`${copy.sectionTitle} ${open ? "접기" : "펼치기"}`}
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
        {open ? (
          <CardBody className={dimWhile(status)}>
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <span key={index} className="body-medium block w-1/2">
                  <Skeleton />
                </span>
              ))
            ) : (
              <>
                <FormField
                  label={copy.titleLabel}
                  required
                  htmlFor={TITLE_ID}
                  error={shown(errors.title)}
                >
                  <Input
                    id={TITLE_ID}
                    ref={(element) => {
                      if (element && focusPending.current) {
                        focusPending.current = false;
                        element.focus();
                      }
                    }}
                    className="max-w-160"
                    maxLength={COPY.titleMax}
                    placeholder={copy.titlePlaceholder}
                    value={draft.title}
                    onChange={(event) => set("title")(event.target.value)}
                  />
                </FormField>

                {isBanner ? (
                  <FormField
                    label={COPY.imageLabel}
                    required
                    group
                    description={
                      <>
                        {COPY.imageHelp[0]}
                        <br />
                        {COPY.imageHelp[1]}
                      </>
                    }
                    error={shown(errors.image)}
                  >
                    <FieldGroup className="flex flex-wrap gap-4">
                      {COPY.imageSlots.map((slot) => (
                        <ImageSlot
                          key={slot.field}
                          label={slot.label}
                          name={slot.name}
                          filled={draft[slot.field]}
                          onZoom={() => setZoomed(slot.name)}
                          onPending={imagePending}
                        />
                      ))}
                    </FieldGroup>
                  </FormField>
                ) : (
                  <FormField
                    label={COPY.bodyLabel}
                    required
                    htmlFor="display-form-body"
                    description={COPY.bodyHelp}
                    error={shown(errors.body)}
                  >
                    {/* HTML 원문을 그대로 편집한다(원본 5378) — 미리보기는 만들지 않는다 */}
                    <Textarea
                      id="display-form-body"
                      className="max-w-195"
                      minRows={6}
                      placeholder={COPY.bodyPlaceholder}
                      value={draft.body}
                      onChange={(event) => set("body")(event.target.value)}
                    />
                  </FormField>
                )}

                <FormField
                  label={COPY.periodLabel}
                  required
                  group
                  labelDescription={COPY.periodHelp}
                  error={shown(errors.period)}
                >
                  {/* 원본 날짜칸 160 × 2 — 시작·종료를 각자 비울 수 있다 */}
                  <FieldGroup className="flex items-center gap-2">
                    <DatePicker
                      className="w-40"
                      aria-label="노출 시작일"
                      placeholder="시작일"
                      invalid={touched && !draft.start}
                      value={draft.start}
                      onChange={set("start")}
                    />
                    <span aria-hidden className="body-medium text-text-sub">
                      ~
                    </span>
                    <DatePicker
                      className="w-40"
                      aria-label="노출 종료일"
                      placeholder="종료일"
                      value={draft.end}
                      onChange={set("end")}
                    />
                  </FieldGroup>
                </FormField>

                {isBanner ? (
                  <FormField
                    label={COPY.orderLabel}
                    required
                    htmlFor="display-form-order"
                  >
                    <Select
                      id="display-form-order"
                      className="w-30"
                      options={orderOptions(mode === "new")}
                      value={draft.order}
                      onValueChange={set("order")}
                    />
                  </FormField>
                ) : null}

                <FormField label={COPY.statusLabel} group>
                  <SegmentedControl
                    className="self-start"
                    items={STATUS_OPTIONS}
                    value={draft.status}
                    onValueChange={(value) =>
                      set("status")(value as BannerStatus)
                    }
                  />
                </FormField>
              </>
            )}
          </CardBody>
        ) : null}
      </Card>

      {/*
        하단 고정 바 (원본 `nv-bar` 4737-4740) — `[목록]  …  ([삭제]) [취소] [등록|저장]`.
        순서는 공지·FAQ 폼과 같게(원본은 [저장][취소]). 진한 버튼은 [등록|저장] 하나다.
      */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={backToList}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            {mode === "edit" ? (
              <Button variant="criticalTonal" onClick={() => setDeleting(true)}>
                삭제
              </Button>
            ) : null}
            <Button variant="secondary" onClick={backToList}>
              취소
            </Button>
            <Button onClick={save}>{copy.saveLabel[mode]}</Button>
          </div>
        </div>
      </Card>

      <DisplayDeleteModal
        kind={kind}
        count={deleting ? 1 : null}
        onClose={() => setDeleting(false)}
        onConfirm={confirmDelete}
      />

      {/* 이미지 확대 — 상품 상세와 같은 창(원본은 화면 전체 오버레이) */}
      <Modal
        open={zoomed !== null}
        onClose={() => setZoomed(null)}
        size="medium"
      >
        <ModalHeader closeLabel="대화상자 닫기" title={zoomed ?? ""} />
        <ModalBody>
          <span className="body-medium flex aspect-9/4 w-full flex-col items-center justify-center gap-2 rounded-medium bg-surface-sub text-text-sub">
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
    </Shell>
  );
}
