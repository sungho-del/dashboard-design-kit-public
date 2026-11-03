import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Coins, UserRound } from "lucide-react";
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
  SegmentedControl,
  Select,
  Skeleton,
  StatTile,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  Textarea,
  useToast,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import {
  lastPathSegment,
  usePathname,
  useSearchParams,
} from "../../lib/router";
import type { Member } from "./MemberListPage.data";
import { KIND_LABEL, point, signedPoint, ymdhm } from "./PointListPage.data";
import {
  ADJUST_COPY,
  ADJUST_DEFAULT_REASON,
  ADJUST_DIRECTIONS,
  ADJUST_REASONS,
  HISTORY_EMPTY_DESCRIPTION,
  HISTORY_EMPTY_TITLE,
  LIST_LABEL,
  LIST_PATH,
  MEMO_MAX,
  SECTIONS,
  adjustErrorOf,
  canConfirmAdjust,
  findPointMember,
  headlineOf,
  pointStatusOf,
  statTilesOf,
  type AdjustDirection,
} from "./PointDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 포인트 현황 상세 — 상세형 · 뼈대 (원본 v0.4 `pointDetail`)
 *
 * ## 구성
 * ```
 * 회원 정보 · 포인트 현황([포인트 조정] · 지급 기간 한 줄 · 요약 3칸 총 지급 → 총 사용(차감) → 보유) ·
 * 포인트 이력 (N)                                                (3구역, 각각 접기)
 * [목록]                                                        [포인트 조정]  ← 하단 고정 바
 * ```
 * 목록 행이 이 화면으로 온다(`/points/{회원 id}`). 회원이 바뀌면 `key` 로 처음부터.
 * [포인트 조정]은 카드 머리와 하단에 **둘**(원본 그대로) — 같은 팝업을 연다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./PointDetailPage.data.ts` 에 있다
 * | 갈아끼울 것                         | 위치                          |
 * | ----------------------------------- | ----------------------------- |
 * | 대상·이력 계산·구역 제목·팝업 문구  | `PointDetailPage.data.ts`     |
 * | 구분 라벨·단위 포맷                 | `PointListPage.data.ts`(목록과 같은 표) |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * 접는 구역 · 하단 바 · 찾을 수 없음 · `?preview=` · 팝업: 유형을 바꾸면 사유 기본값 ·
 * [확인] 비활성 규칙 · 오류는 입력칸 아래 · 닫으면 입력 초기화
 *
 * ## 원본과 다르게 둔 것 — `PointDetailPage.data.ts` 머리 주석 참고
 * 머리·접기(형제 상세 틀) · 조정은 알림만 · 오류 위치 · 빈 이력 문구 · 구분 배지 무채색 ·
 * 요약 계산 순서 · 부호 `+N` / `−N`(0 은 부호 없음) · 정상 사용에 경고색 없음 · 연관 거래 보통 굵기
 *
 * ## 이력 표 열 폭
 * 고정 폭은 실측 글자 폭(처리일 날짜·시각 한 줄 160 등) · **내용 열은 폭을 주지 않아 남는 폭**을 받는다
 * (고정 합 752 — 1280 에서도 처리자까지 스크롤 없이 보인다). 메모가 아주 길면 표만 가로로 민다
 * ====================================================================== */

export interface PointDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 라벨 폭 — 「아이디(이메일)」이 기본 80 에서 쪼개진다. 모든 구역이 같은 폭(§30-3) */
const LABEL_WIDTH = 96;

/** 접을 수 있는 구역 한 장 — 형제 상세와 같은 규격. `action` 은 접기 버튼 왼쪽 */
function Section({
  title,
  action,
  busy,
  dim,
  children,
}: {
  title: string;
  action?: ReactNode;
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
          <span className="flex items-center gap-2">
            {action}
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
          </span>
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

const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");
const withCommas = (value: string) =>
  value === "" ? "" : Number(value).toLocaleString("ko-KR");

/**
 * 포인트 조정 팝업 — 원본 `ptAdjModal`.
 * [확인]은 포인트 > 0 · 메모가 있을 때만 눌린다. 통과하면 **알림만**(원장·숫자는 그대로 — 퍼블 범위).
 * 닫거나 확인하면 입력을 비운다 — 다시 열면 처음부터(지급 · 기본 사유).
 */
function PointAdjustModal({
  open,
  balance,
  onClose,
  onDone,
}: {
  open: boolean;
  balance: number;
  onClose: () => void;
  onDone: (direction: AdjustDirection) => void;
}) {
  const [direction, setDirection] = useState<AdjustDirection>("plus");
  const [reason, setReason] = useState(ADJUST_DEFAULT_REASON.plus);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const clear = () => {
    setDirection("plus");
    setReason(ADJUST_DEFAULT_REASON.plus);
    setAmount("");
    setMemo("");
    setError(null);
  };

  const close = () => {
    clear();
    onClose();
  };

  const value = Number(amount || 0);

  const submit = () => {
    const next = adjustErrorOf(direction, value, balance);
    if (next) {
      setError(next);
      return;
    }
    clear();
    onDone(direction);
  };

  return (
    <Modal open={open} onClose={close}>
      <ModalHeader
        closeLabel="대화상자 닫기"
        title={ADJUST_COPY.title}
        description={ADJUST_COPY.description}
      />
      <ModalBody>
        <FormField label="조정 유형" group>
          <SegmentedControl
            className="self-start"
            items={ADJUST_DIRECTIONS}
            value={direction}
            onValueChange={(next) => {
              const dir = next as AdjustDirection;
              setDirection(dir);
              setReason(ADJUST_DEFAULT_REASON[dir]);
              setError(null);
            }}
          />
        </FormField>
        <FormField label="처리 사유" required>
          <Select
            options={ADJUST_REASONS[direction].map((item) => ({
              value: item,
              label: item,
            }))}
            value={reason}
            onValueChange={setReason}
          />
        </FormField>
        <FormField label="포인트" required suffix="P" error={error}>
          <Input
            inputMode="numeric"
            placeholder="0"
            inputClassName="text-right"
            invalid={Boolean(error)}
            value={withCommas(amount)}
            onChange={(event) => {
              setAmount(onlyDigits(event.target.value));
              setError(null);
            }}
          />
        </FormField>
        {/* 글자 수는 `Textarea` 가 maxLength 로 스스로 센다 */}
        <FormField label="메모" required>
          <Textarea
            minRows={4}
            maxLength={MEMO_MAX}
            placeholder={ADJUST_COPY.memoPlaceholder}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
          />
        </FormField>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={close}>
          취소
        </Button>
        <Button
          size="large"
          disabled={!canConfirmAdjust(value, memo)}
          onClick={submit}
        >
          확인
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function PointDetailPage(props: PointDetailPageProps) {
  const { navOpen, onNavOpenChange, activeNav, onNavSelect } = props;
  const pathname = usePathname();
  /* 경로는 `/points/{회원 id}` **한 조각**이어야 한다 */
  const rest = pathname.slice(LIST_PATH.length + 1);
  const member = rest.includes("/")
    ? undefined
    : findPointMember(lastPathSegment(pathname));

  if (!member) {
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
        header={<PageHeader title="포인트 현황 상세" />}
      >
        <Card variant="soft">
          <CardBody>
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
                {LIST_LABEL}로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </AppShell>
    );
  }

  /* 회원마다 처음부터 — 접힘·열린 팝업이 다음 회원에 묻어가지 않게 */
  return <PointDetailBody key={member.id} member={member} {...props} />;
}

function PointDetailBody({
  member,
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: PointDetailPageProps & { member: Member }) {
  const { toast } = useToast();
  const status = asStatus(useSearchParams().get("preview"));
  const busy = isBusy(status);
  const dim = dimWhile(status);
  const loading = status === "loading";

  const [adjustOpen, setAdjustOpen] = useState(false);
  const summary = pointStatusOf(member.id);
  const toList = () => onNavSelect(LIST_PATH);
  const openAdjust = () => setAdjustOpen(true);

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
        <PageHeader title="포인트 현황 상세" description={headlineOf(member)} />
      }
    >
      <Section title={SECTIONS.member} busy={busy} dim={dim}>
        {loading ? (
          <LoadingLines rows={3} />
        ) : (
          <InfoList>
            <Item label="회원명">{member.name}</Item>
            <Item label="아이디(이메일)">{member.id}</Item>
            <Item label="연락처">{member.phone || "-"}</Item>
          </InfoList>
        )}
      </Section>

      <Section
        title={SECTIONS.status}
        busy={busy}
        dim={dim}
        action={
          <Button size="small" variant="secondary" onClick={openAdjust}>
            포인트 조정
          </Button>
        }
      >
        {loading ? (
          <LoadingLines rows={2} />
        ) : (
          <>
            {/* 지급 기간 — 요약을 읽는 기준 한 줄(보조 글자). 라벨·값 짝은 그대로 `<dt>`/`<dd>` */}
            <dl className="body-small flex flex-wrap gap-x-2">
              <dt className="text-text-sub">지급 기간</dt>
              <dd className="text-text tabular-nums">{summary.period}</dd>
            </dl>
            {/* 요약 3칸 — 원본 `statrow`. 계산 순서: 총 지급 → 총 사용(차감) → 보유 */}
            <section
              className="grid grid-cols-3 gap-4"
              aria-label="포인트 요약"
            >
              {statTilesOf(summary).map(({ label, value, unit }) => (
                <StatTile key={label} label={label} value={value} unit={unit} />
              ))}
            </section>
          </>
        )}
      </Section>

      <Section
        title={`${SECTIONS.history} (${summary.history.length})`}
        busy={busy}
        dim={dim}
      >
        {loading ? (
          <LoadingLines rows={4} />
        ) : summary.history.length === 0 ? (
          <EmptyState
            size="table"
            icon={<Coins strokeWidth={1.2} aria-hidden />}
            title={HISTORY_EMPTY_TITLE}
            description={HISTORY_EMPTY_DESCRIPTION}
          />
        ) : (
          /* 메모가 길면 표가 카드보다 넓어진다 — 표만 가로로 민다(형제 상세와 같은 처리) */
          <div className="overflow-x-auto">
            <Table>
              <colgroup>
                <col className="w-40" />
                <col className="w-28" />
                <col className="w-24" />
                {/* 내용 — 폭 없음: 남는 폭을 받는다 */}
                <col />
                <col className="w-40" />
                <col className="w-28" />
                <col className="w-28" />
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableTh>처리일</TableTh>
                  <TableTh>포인트</TableTh>
                  <TableTh align="center">구분</TableTh>
                  <TableTh>내용</TableTh>
                  <TableTh>연관 거래</TableTh>
                  <TableTh>잔여 포인트</TableTh>
                  <TableTh>처리자</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableTd className="tabular-nums">
                      {ymdhm(entry.at)}
                    </TableTd>
                    {/* 부호로 구분 — 정상 사용·회수는 경고가 아니라 기본 글자색(원본 `ptAmt` 는 --warn) */}
                    <TableTd className="tabular-nums">
                      <span className="body-medium-bold">
                        {signedPoint(entry.amount)}
                      </span>
                    </TableTd>
                    {/* 구분은 분류라 무채색(사용자 결정 — 원본 4색) */}
                    <TableTd align="center">
                      <Tag tone="default" size="small">
                        {KIND_LABEL[entry.kind]}
                      </Tag>
                    </TableTd>
                    <TableTd className="break-keep wrap-anywhere">
                      <span className="flex flex-col">
                        {entry.reason}
                        {entry.memo ? (
                          <span className="body-small text-text-sub">
                            {entry.memo}
                          </span>
                        ) : null}
                      </span>
                    </TableTd>
                    <TableTd className="tabular-nums">
                      {/* 주문번호는 참조 값 — 보통 굵기(회원 상세 결제 내역과 같다) */}
                      {entry.orderNo ? (
                        entry.orderNo
                      ) : (
                        <span className="text-text-minimal">-</span>
                      )}
                    </TableTd>
                    <TableTd className="tabular-nums">
                      {point(entry.remaining)}
                    </TableTd>
                    <TableTd>{entry.by}</TableTd>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      {/* 하단 바 — 원본 [목록](왼쪽) · [포인트 조정](오른쪽, 주 버튼) */}
      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={toList}>
            목록
          </Button>
          <Button onClick={openAdjust}>포인트 조정</Button>
        </div>
      </Card>

      <PointAdjustModal
        open={adjustOpen}
        balance={summary.balance}
        onClose={() => setAdjustOpen(false)}
        onDone={(direction) => {
          setAdjustOpen(false);
          toast(ADJUST_COPY.done[direction]);
        }}
      />
    </AppShell>
  );
}
