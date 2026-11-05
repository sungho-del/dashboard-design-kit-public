import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Receipt, UserRound } from "lucide-react";
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
  useToast,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import {
  ACCOUNT_STATES,
  CHILD_GENDER_LABEL,
  dateTimeText,
  filterPayments,
  PAYMENT_EMPTY_DESCRIPTION,
  PAYMENT_EMPTY_TITLE,
  PAYMENT_KIND_LABEL,
  PAYMENT_STATUS_META,
  PAYMENT_TABS,
  paymentKinds,
  productText,
  dormantBlockedText,
  findMember,
  GENDER_LABEL,
  marketingLabel,
  monthsSince,
  SAVED_TEXT,
  SECTIONS,
  won,
  ymd,
} from "./MemberDetailPage.data";
import {
  canSleep,
  needsReason,
  STATUS_META,
  people,
  type MemberStatus,
  type PaymentKind,
} from "./MemberListPage.data";
import { MemberReasonModal } from "./MemberListPage";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S02-D 회원 상세 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 폼형 (읽기 + 상태 한 가지만 고침)
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 (BO-MEM-002)
 *
 * ```
 * 기본 정보   ← 이름 · 아이디(이메일) · 연락처 · 성별 · 생년월일 · 주소
 * 계정 상태   ← [정상][휴면][정지] 택1 · [휴면·정지 사유 · 일시] · 가입일 · 최근 접속일 · 포인트 · 마케팅 수신
 * 자녀 정보   ← 자녀 수 + 표(이름/태명 · 생년월일·개월수 · 성별)
 * 결제 내역 (N) ← [전체][렌트][판매] 탭 + 표
 *                (No · 주문번호 · 결제 일시 · 구분 · 상품명 · 결제금액 · 상태)
 * [목록]                                   [취소] [저장하기]   ← 하단 액션 바 (화면 아래 고정)
 * ```
 * 섹션은 접을 수 있다(원본도 섹션마다 접기 버튼이 있다).
 * 헤더에는 이름과 **저장된** 상태 태그가 붙는다 — 표에서 넘어온 뒤 누구의 어떤 상태인지 남긴다.
 *
 * ## 원본 정책 — 화면이 강제하는 것
 * - **진행 중인 렌트가 있으면 휴면으로 바꿀 수 없다.** 버튼을 잠그고 이유를 문장으로 낸다
 *   (원본 문구 그대로). 빌려 간 물건이 남아 있는데 계정을 재우면 반납 안내가 닿지 않는다
 * - **탈퇴 회원은 상태를 바꿀 수 없다** — 원본은 "드롭다운 없이 배지로만 표시"다.
 *   그래서 이 화면도 탈퇴면 택1 버튼 대신 배지를 낸다
 * - **휴면·정지로 저장하면 사유를 받는다**(원본 C-3 ⓐ) — 목록 일괄 변경과 **같은 모달**
 *   (`MemberReasonModal`)이다. 한때 이 자리에 "원본도 입력 자리를 그리지 않는다"고 적혀
 *   있었는데 기획 v0.4 와 어긋난 판단이었다(2026-10-15 대조).
 *   기록된 사유는 **상태 선택 바로 아래** `정지 사유  …  · 처리 일시`(보조 글자)로 나온다 —
 *   정지 회원에서 가장 먼저 읽을 값이라 가입일·접속일 뒤에 묻지 않는다(2026-11-03 UX 검수).
 *   ⚠️ **저장된** 상태·사유다 — 고르는 중인 값(`draftStatus`)과 짝짓지 않는다. 정지 회원이
 *   [정상] 을 골라도 줄은 그대로, 정상 회원이 [정지] 를 골라도 줄은 생기지 않는다
 *
 * ## ⚠️ 네 번째 섹션은 "이용 이력"이 아니라 **"결제 내역"** 이다 (2026-09-21 정정)
 * 원본 주석(`sec.members_hist`)은 "이용 이력 / 번호·주문번호·셀러·상품·유형·금액·상태"라고
 * 적지만 **원본 화면의 제목은 `결제 내역 (5)`** 이고 컬럼은 `No·주문번호·결제 일시·구분·
 * 상품명·결제금액·상태` 다(셀러 열이 없고 결제 일시가 있다). 화면이 정본이다.
 * 한때 이 자리에 `이용 내역 / 진행 중 렌트` 두 줄짜리 `InfoList` 를 뒀는데 표가 통째로
 * 빠진 것이었다. 진행 중 렌트 건수는 **계정 상태 섹션의 휴면 가드 문구**가 이미 말한다.
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 1. **읽기 전용 값을 비활성 입력칸이 아니라 `InfoList` 로 낸다.** 원본은 회색 입력칸에
 *    값을 담아 두는데, 비활성 입력칸은 **"고칠 수 있을 것 같은데 안 되는 것"** 으로 읽힌다.
 *    이 화면에서 실제로 고치는 값은 상태 하나뿐이라, 나머지는 읽는 값임을 형태로 밝힌다
 * 2. **하단 액션 바를 쓴다.** 이 저장소의 폼 템플릿(`ProductFormPage`)은 저장 버튼을
 *    `PageHeader` 에 두지만, 원본이 하단 바라서 원본을 따랐다. 원본처럼 **화면 아래에
 *    붙는다**(`sticky`) — 섹션이 길어도 끝까지 내리지 않고 저장한다
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./MemberDetailPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                        |
 * | ---------------------- | ------------------------------------------- |
 * | 회원 레코드            | `MemberListPage.data.ts` 의 `MEMBERS`       |
 * | 섹션 제목·상태 선택지  | `MemberDetailPage.data.ts`                  |
 * | 개월 수·단위 포맷      | 같은 파일의 `monthsSince` · `won` · `ymd`   |
 *
 * ## 데이터 상태 (§D8 · `src/lib/dataStatus.ts`)
 * `/members/{id}?preview=loading` · `refreshing` 으로 미리 본다.
 * `empty` 는 이 화면에 없다 — 회원이 없으면 "없는 회원" 화면이지 빈 목록이 아니다.
 * ====================================================================== */

export interface MemberDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 목록 경로 — 뒤로 가는 곳이자, 없는 회원일 때 돌려보내는 곳 */
const LIST_PATH = "/members";

/**
 * 이 화면 InfoList 의 라벨 폭(**화면 상수 하나**) — `아이디(이메일)` 이 실측 83px 라 기본 80 에서
 * **두 줄로 쪼개졌다**(`아이디(이메 / 일)`). 한때 기본 정보에만 96 을 줘 다른 카드(80)와
 * 값 시작선이 16px 어긋났다 — 세 카드가 같은 값을 쓴다(2026-11-03 UX 검수).
 */
const LABEL_WIDTH = 96;

/**
 * 접을 수 있는 섹션 한 장.
 *
 * 접기 버튼은 `IconButton`(ghost·small)이고 아이콘만 있으므로 **이름을 반드시 준다** —
 * "기본 정보 접기"처럼 무엇을 접는지까지 말해야 여러 섹션이 구별된다.
 * `aria-expanded` 로 지금 펼쳐져 있는지도 함께 전달한다.
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

export function MemberDetailPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: MemberDetailPageProps) {
  const { toast } = useToast();
  const pathname = usePathname();
  const status = asStatus(useSearchParams().get("preview"));

  /*
    경로의 마지막 구간이 회원 id(이메일)다. 이메일에는 `@` 와 `.` 이 들어가고
    주소창을 거치며 인코딩되므로 **반드시 디코딩해서** 찾는다.
  */
  const memberId = lastPathSegment(pathname);
  const member = findMember(memberId);

  /*
    고치는 값은 상태 하나뿐이다 — 저장 전까지 화면 안에만 산다.
    **회원 id 와 묶어 둔다.** 주소만 바뀌어 다른 회원으로 가면 컴포넌트가 그대로 남아,
    앞 회원의 고친 값이 다음 회원에게 묻어간다.
  */
  const [draft, setDraft] = useState<{
    id: string;
    status: MemberStatus;
  } | null>(null);
  /** 사유를 기다리는 저장 — 휴면·정지로 바꿀 때 */
  const [reasonOpen, setReasonOpen] = useState(false);
  /*
    다른 회원으로 넘어가면 고치던 값·열린 창을 **버린다.** id 로 묶기만 하면
    A 에서 고치다 B 를 보고 A 로 돌아왔을 때 A 의 고친 값이 되살아난다.
  */
  const [shownId, setShownId] = useState(memberId);
  if (shownId !== memberId) {
    setShownId(memberId);
    setDraft(null);
    setReasonOpen(false);
  }
  /** 결제 내역 탭. 조회용이라 저장 대상이 아니다 */
  const [paymentTab, setPaymentTab] = useState<"all" | PaymentKind>("all");

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
    없는 회원 — 주소를 손으로 고쳤거나 지워진 회원이다.
    **빈 목록이 아니라 잘못된 주소**이므로 돌아갈 곳을 준다(§D8-2: 빈 것과 실패는 다르다).
  */
  if (!member) {
    return (
      <AppShell sidebar={nav} header={<PageHeader title="회원 상세" />}>
        <Card variant="soft">
          <CardBody>
            {/*
              다른 화면의 빈 상태는 거의 `table`(표 안이 비었다)이지만 여기는 **표가 아니라
              화면 전체가 없는 것**이다 — §16 의 `page`(콘텐츠 전역 400)가 그 자리다.
            */}
            <EmptyState
              size="page"
              icon={<UserRound strokeWidth={1.2} aria-hidden />}
              title="찾을 수 없는 회원입니다"
              description="주소가 잘못되었거나 삭제된 회원일 수 있습니다."
            >
              <Button
                variant="secondary"
                onClick={() => onNavSelect(LIST_PATH)}
              >
                회원 목록으로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  const meta = STATUS_META[member.status];
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  /*
    진행 중인 렌트가 있으면 휴면은 잠긴다 — 이유를 문장으로도 낸다.
    판정은 **목록의 일괄 변경과 같은 함수**(`canSleep`)를 쓴다. 각자 적어 두면
    한쪽만 고쳤을 때 목록에서 이 가드를 우회할 수 있다.
  */
  const dormantBlocked = !canSleep(member);
  /** 탈퇴는 되돌릴 수 없는 종결 상태라 이 화면에서 바꾸지 않는다 */
  const editable = member.status !== "withdrawn";
  const draftStatus = draft?.id === member.id ? draft.status : member.status;
  const changed = draftStatus !== member.status;

  /*
    저장 — 휴면·정지는 사유를 받은 뒤(`confirmReason`), 정상은 바로.
    퍼블은 **저장하지 않는다**(토스트만) — 실제 반영은 개발 영역이다.
  */
  const save = () => {
    if (needsReason(draftStatus)) {
      setReasonOpen(true);
      return;
    }
    toast(SAVED_TEXT);
  };

  const confirmReason = () => {
    setReasonOpen(false);
    toast(SAVED_TEXT);
  };

  /** 기록된 사유 — 휴면·정지 회원이고 사유가 있을 때만(자동 휴면에는 사유가 없다) */
  const showReason = needsReason(member.status) && !!member.statusReason;

  /** 탭으로 거른 결제 내역. 제목의 건수는 **거르기 전** 전체 건수다 */
  const visiblePayments = filterPayments(member.payments, paymentTab);

  return (
    <AppShell
      sidebar={nav}
      header={
        /*
          제목 옆에 누구의 상세인지 — 표에서 넘어온 뒤 "누구였더라"가 되지 않게.
          태그는 **저장된** 상태다(고르는 중인 값이 아니다) — 고르기만 하고 떠나면 바뀌지 않는다.
        */
        <PageHeader
          title="회원 상세"
          description={member.name}
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
          <LoadingLines rows={6} />
        ) : (
          <InfoList>
            <InfoItem label="이름" labelWidth={LABEL_WIDTH}>
              {member.name}
            </InfoItem>
            <InfoItem label="아이디(이메일)" labelWidth={LABEL_WIDTH}>
              {member.id}
            </InfoItem>
            <InfoItem label="연락처" labelWidth={LABEL_WIDTH}>
              {member.phone}
            </InfoItem>
            <InfoItem label="성별" labelWidth={LABEL_WIDTH}>
              {GENDER_LABEL[member.gender]}
            </InfoItem>
            <InfoItem label="생년월일" labelWidth={LABEL_WIDTH}>
              {ymd(member.birth)}
            </InfoItem>
            <InfoItem label="주소" labelWidth={LABEL_WIDTH}>
              {member.address}
            </InfoItem>
          </InfoList>
        )}
      </Section>

      <Section title={SECTIONS.account} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={5} />
        ) : (
          <>
            {editable ? (
              /*
                원본은 상태를 **필수**(`req`)로 표시한다. 세그먼트는 `<label for>` 가 닿지 않는
                그룹이라 `group` 으로 이름을 잇는다(§29-6b). 휴면 가드 문구는 설명으로 붙어
                스크린리더도 휴면이 왜 잠겼는지 함께 읽는다.
              */
              <FormField
                label="상태"
                required
                group
                description={
                  dormantBlocked
                    ? dormantBlockedText(member.activeRents)
                    : undefined
                }
              >
                <SegmentedControl
                  /* 제 폭으로 — FormField 세로 배치가 폭 가득 늘리지 않게(셀러 상세와 같다) */
                  className="self-start"
                  /*
                    잠금은 **항목 단위**다 — 휴면만 막고 나머지는 그대로 고를 수 있다.
                    컨트롤 전체를 비활성으로 만들면 정지 처리까지 막혀 버린다.
                  */
                  items={ACCOUNT_STATES.map((state) => ({
                    ...state,
                    disabled: state.value === "dormant" && dormantBlocked,
                  }))}
                  value={draftStatus}
                  onValueChange={(value) =>
                    setDraft({ id: member.id, status: value as MemberStatus })
                  }
                />
              </FormField>
            ) : (
              /* 탈퇴 — 원본과 같이 배지로만 표시한다 */
              <div className="flex flex-col gap-2">
                <span className="label-medium-bold text-text">상태</span>
                <span className="flex items-center gap-2">
                  <Tag tone={meta.tone} dot>
                    {meta.label}
                  </Tag>
                  <span className="body-small text-text-sub">
                    {meta.description}
                  </span>
                </span>
              </div>
            )}

            <InfoList>
              {/*
                사유 — 상태 선택 바로 아래 첫 줄(위 「원본 정책」). **저장된** 상태의 사유라
                고르는 중인 값과 무관하게 나온다. 라벨은 상태에 따라 갈린다(`정지 사유`·`휴면 사유`)
              */}
              {showReason ? (
                <InfoItem label={`${meta.label} 사유`} labelWidth={LABEL_WIDTH}>
                  {member.statusReason}
                  {member.statusAt ? (
                    <span className="body-small text-text-sub tabular-nums">
                      {" "}
                      · {dateTimeText(member.statusAt)}
                    </span>
                  ) : null}
                </InfoItem>
              ) : null}
              <InfoItem label="가입일" labelWidth={LABEL_WIDTH}>
                {ymd(member.date)}
              </InfoItem>
              <InfoItem label="최근 접속일" labelWidth={LABEL_WIDTH}>
                {ymd(member.lastVisit)}
              </InfoItem>
              <InfoItem label="포인트" labelWidth={LABEL_WIDTH}>
                {won(member.points)}
              </InfoItem>
              <InfoItem label="마케팅 수신" labelWidth={LABEL_WIDTH}>
                {marketingLabel(member.marketingOptIn)}
              </InfoItem>
            </InfoList>
          </>
        )}
      </Section>

      <Section title={SECTIONS.child} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={3} />
        ) : (
          <>
            {/* 아래 표와 같은 폭(max-w-160)으로 — 전폭 상자 + 640 표가 서로 다른 덩어리로 보였다 */}
            <InfoList className="max-w-160">
              <InfoItem label="자녀 수" labelWidth={LABEL_WIDTH}>
                {people(member.kids)}
              </InfoItem>
            </InfoList>
            {/*
              열이 셋뿐이라 섹션 전폭(1600 화면에서 약 1350)으로 늘면 열 사이가 600 넘게
              벌어져 한 아이의 값을 가로로 잇기 어렵다. **이 표만** 폭을 묶는다 —
              공용 `Table` 의 `min-w-full` 은 다른 표들이 기대는 계약이라 건드리지 않는다.
            */}
            <div className="max-w-160">
              <Table>
                <colgroup>
                  <col className="w-40" />
                  <col className="w-50" />
                  <col className="w-25" />
                </colgroup>
                <TableHead>
                  <TableRow>
                    <TableTh>이름</TableTh>
                    {/* 원본 표기: `2020.02.23 · 75개월` — 날짜와 개월 수가 한 칸에 있다 */}
                    <TableTh>생년월일 · 개월수</TableTh>
                    <TableTh>성별</TableTh>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {member.children.map((child) => (
                    <TableRow key={`${child.name}-${child.birth}`}>
                      <TableTd>{child.name}</TableTd>
                      <TableTd className="tabular-nums">
                        {`${ymd(child.birth)} · ${monthsSince(child.birth)}개월`}
                      </TableTd>
                      <TableTd>{CHILD_GENDER_LABEL[child.gender]}</TableTd>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Section>

      {/*
        결제 내역 — 원본 `sec.members_hist`. 제목에 **건수**가 붙고(`결제 내역 (5)`),
        표 위에 `[전체][렌트][판매]` 탭이 있다.

        ⚠️ 탭은 **지금 보고 있는 목록만** 거른다 — 제목의 건수는 거르기 전 전체 건수다.
        탭을 따라 제목까지 바뀌면 "이 회원이 몇 번 결제했나"를 읽을 수 없다.
      */}
      <Section
        title={`${SECTIONS.payment} (${member.payments.length})`}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={4} />
        ) : member.payments.length === 0 ? (
          <EmptyState
            size="table"
            icon={<Receipt strokeWidth={1.2} aria-hidden />}
            title={PAYMENT_EMPTY_TITLE}
            description={PAYMENT_EMPTY_DESCRIPTION}
          />
        ) : (
          <>
            <SegmentedControl
              aria-label="결제 구분"
              items={PAYMENT_TABS}
              value={paymentTab}
              onValueChange={(value) =>
                setPaymentTab(value as typeof paymentTab)
              }
            />
            <Table>
              <colgroup>
                <col className="w-12" />
                <col className="w-40" />
                <col className="w-35" />
                <col className="w-18" />
                <col className="w-60" />
                <col className="w-28" />
                <col className="w-24" />
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableTh>No</TableTh>
                  <TableTh>주문번호</TableTh>
                  <TableTh>결제 일시</TableTh>
                  <TableTh align="center">구분</TableTh>
                  <TableTh>상품명</TableTh>
                  <TableTh>결제금액</TableTh>
                  <TableTh align="center">상태</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {visiblePayments.map((payment, index) => {
                  const meta = PAYMENT_STATUS_META[payment.status];
                  return (
                    <TableRow key={payment.orderNo}>
                      {/* 원본 `view.length - i` — **지금 탭에 보이는 것의** 역순 순번 */}
                      <TableTd className="tabular-nums">
                        {visiblePayments.length - index}
                      </TableTd>
                      {/* 주문번호·일시·금액은 **등폭**이다(§D6-2) — 자릿수가 세로로 맞아야 한다 */}
                      <TableTd className="tabular-nums">
                        {payment.orderNo}
                      </TableTd>
                      <TableTd className="tabular-nums">
                        {dateTimeText(payment.paidAt)}
                      </TableTd>
                      {/*
                        구분은 다른 목록(주문·상품)과 같은 **중립 태그**다 — 분류지 상태가 아니다.
                        렌트와 판매가 섞인 주문은 둘 다 낸다(원본 `modeTags(both)` — 예시에는 섞인 주문이 없다 · 디자인 §3 #19).
                      */}
                      <TableTd align="center">
                        <span className="inline-flex gap-1">
                          {paymentKinds(payment).map((kind) => (
                            <Tag key={kind} tone="default" size="small">
                              {PAYMENT_KIND_LABEL[kind]}
                            </Tag>
                          ))}
                        </span>
                      </TableTd>
                      <TableTd ellipsis>{productText(payment)}</TableTd>
                      <TableTd className="tabular-nums">
                        {won(payment.amount)}
                      </TableTd>
                      <TableTd align="center">
                        <Tag tone={meta.tone} dot>
                          {meta.label}
                        </Tag>
                      </TableTd>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {visiblePayments.length === 0 ? (
              /* 탭으로 걸러 0건 — 결제가 없는 것이 아니라 **그 구분이 없는** 것이다 */
              <p className="body-small text-text-sub">
                이 구분의 결제 내역이 없습니다.
              </p>
            ) : null}
          </>
        )}
      </Section>

      {/*
        하단 액션 바 (원본 `nv-bar`). 좌측은 되돌아가는 길, 우측은 이 화면에서 하는 일이다.
        원본처럼 **화면 아래에 붙는다** — 섹션이 길어도 끝까지 내리지 않고 저장한다.
        `bottom-6` 은 본문 아래 여백(py-6)과 같아, 끝까지 내렸을 때 붙은 자리와 제자리가 같다.
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
            <Button disabled={!editable || !changed} onClick={save}>
              저장하기
            </Button>
          </div>
        </div>
      </Card>

      <MemberReasonModal
        target={reasonOpen ? draftStatus : null}
        count={1}
        onClose={() => setReasonOpen(false)}
        onConfirm={confirmReason}
      />
    </AppShell>
  );
}
