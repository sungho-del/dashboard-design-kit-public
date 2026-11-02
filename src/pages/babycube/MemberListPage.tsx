import { useState } from "react";
import { ArrowDownToLine, Search } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  Checkbox,
  DataTableShell,
  DatePicker,
  EmptyState,
  FilterBar,
  FormField,
  Gnb,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Pagination,
  PaginationSizeSelect,
  Select,
  SelectionBar,
  SelectionBarButton,
  Skeleton,
  StatGrid,
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
  type DateRange,
  type TableSortDirection,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { PERIOD_PRESETS } from "../../lib/periodPresets";
import { useSearchParams } from "../../lib/router";
import {
  BULK_TARGETS,
  bulkStatusMessage,
  canChangeStatus,
  DEFAULT_FILTER,
  FILTERS,
  filterSummary,
  MEMBER_UNIT,
  MEMBERS,
  needsReason,
  num,
  PAGE_SIZE,
  PAGE_SIZES,
  people,
  REASON_COPY,
  SEARCH_FIELDS,
  STATUS_META,
  usageText,
  ymd,
  type Member,
  type MemberStatus,
} from "./MemberListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S02 회원 관리 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 목록형
 * 전체 회원을 상태·기간·검색으로 좁혀 조회하고, 이름이나 `상세` 로 한 사람을 연다.
 *
 * ## ⚠️ 구성은 **원본 어드민 그대로**다 — 임의로 더하지 말 것
 *
 * ```
 * 상태 대시 (정상·정지·휴면·탈퇴 건수, 누르면 필터)        ← 원본 StatDash
 * 검색조건 바 (기간 · 검색 조건 + 검색어 · 초기화)          ← 원본 filter
 * [ 목록 (총 N건) · 엑셀 다운로드 | 표 | 페이지네이션 ]    ← 원본 ListHead + table + foot
 * 체크 후 일괄 상태 변경 바 → 휴면·정지면 사유 모달         ← 원본 목록 툴바 + memstat
 * ```
 *
 * 원본 목록 셸(`20013`)의 섹션 순서가 `note → dash → filter → card[head→table→foot]` 이고
 * 회원 화면은 `note` 를 넘기지 않는다. 위 3단이 전부다.
 *
 * ## 원본에 없어서 걷어낸 것들 (되살리지 말 것)
 *
 * 한때 이 화면에는 다음이 있었는데 **원본 어디에도 없어서** 전부 뺐다:
 * - **증감 요약 카드 3장**(전체/휴면/탈퇴 회원 + ±% + 비교 기준). 원본의 상단 카드는
 *   상태별 **건수**뿐이고 증감도 비교 기준 문구도 없다
 * - **행 드롭다운 3종**(상세 보기 · 연락처 복사 · 이용 정지)과 **이용 정지 확인 모달**.
 *   원본 `관리` 컬럼은 `상세` 링크 버튼 하나다. 한 사람의 상태는 회원 상세에서 바꾼다.
 *   ⚠️ 원본 주석(`screen.members`)에는 "행별 상태 드롭다운"이 적혀 있지만 **원본 화면의
 *   상태 칸은 배지뿐이다**(v0.4 실물 대조). 주석이 구현보다 앞서 있는 것이라 따르지 않는다 —
 *   여럿을 한꺼번에 바꾸는 길은 아래 **체크 + 일괄 변경**으로 열려 있다
 * - **상태 세그먼트**. 원본은 `chip.dash: true` 라 상태 축을 **건수 카드로만** 그린다 —
 *   카드와 세그먼트를 함께 두면 한 축에 컨트롤이 둘이 된다
 * - **PageHeader 도움말 툴팁**. 상태 설명은 원본대로 **대시 카드의 툴팁**으로 내려갔다
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./MemberListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위  | `MemberListPage.data.ts` **전체**              |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 필터 구성              | `toolbarEnd` 슬롯                              |
 * | 화면 제목              | `PageHeader` 의 `title`                        |
 *
 * ## 데이터 상태 (§D8 · `src/lib/dataStatus.ts`)
 * 실 API 를 붙이면 `status` 를 fetch 상태로 바꾼다. 지금은 주소로 미리 본다 —
 * `/members?preview=loading` · `empty` · `refreshing`.
 * 로딩 뼈대는 표와 **같은 `COLGROUP`** 을 써서 도착 후 열이 밀리지 않는다.
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 페이지 범위 클램프 ·
 * `inPeriod` 날짜 필터 · **흰 카드 = 그룹 / 연한 그레이 상자 = 항목** 두 층 ·
 * 상자 안 **라벨 좌상단 · 수치 우하단** · 상태 건수를 **상태 필터를 뺀 나머지 조건**에서
 * 세는 규칙(아래 `scoped`)
 *
 * ## 원본 기능 복원 (2026-09-21)
 * - ✅ **체크 후 일괄 상태 변경**(원본 `rowchk` + 목록 툴바) — 머리글 체크박스는 **이 페이지의
 *   행만** 고르고, 갈 수 있는 상태가 없으면 바 자체가 열리지 않는다.
 *   ⚠️ 자격 판정은 **데이터 층의 `canChangeStatus`** 가 한다 — 상세 화면의 휴면 가드
 *   (`canSleep`)를 목록이 우회하지 못하게 판정을 한 벌만 둔다
 * - ✅ **정렬 가능한 헤더**(원본 `sortable`: 이름·가입일·자녀) — `TableTh sortable` 신설.
 *   오름 → 내림 → **해제** 3단이고 `aria-sort` 로 스크린리더에 전달된다
 * - ✅ **기간 빠른 선택**(오늘/1주일/1개월/3개월/6개월/1년/전체) — `DatePicker presets` 신설.
 *   어휘·계산은 도메인이라 `PERIOD_PRESETS`(데이터 층)가 들고 온다
 *
 * ## 기획 v0.4 대조로 채운 것 (2026-10-15)
 * - ✅ **휴면·정지 사유 모달**(원본 C-3 ⓐ) — 일괄 변경이 휴면·정지면 사유를 받고, 빈 사유는 막는다.
 *   회원 상세의 [저장하기] 도 **같은 모달**(`MemberReasonModal`)을 지난다
 * - ✅ 사유를 받은 일괄 처리는 **전환된 상태 카드로 옮겨 간다**(원본). [정상] 복귀는 제자리에서 선택만 푼다.
 *   ⚠️ 퍼블은 **저장하지 않는다**(토스트만) — 옮겨 간 카드에 처리한 회원이 없는 것은 그래서다
 * - ✅ **No 는 조회 결과의 역순 순번**(원본 `all.length - start - i`) — 레코드 번호가 아니다
 * - ✅ 페이지당 10·20·50·100(기본 10) · 샘플 30명
 * - ✅ **엑셀 다운로드 대상 알림**(원본 `exportCsv`) — 고른 행이 있으면 그것만, 없으면 조회 결과 전체.
 *   파일은 만들지 않는다 — 실제 내보내기는 개발 저장소의 `src/lib/export.ts` 몫이다(No 열 제외 규칙 등)
 *
 * ## 아직 표현하지 못한 것 (미해결)
 * - **고정열**(원본 `frozen`: 이름) — 이 표는 열 폭 합이 988(체크박스 열 48 포함)이라
 *   **가로 스크롤이 나지 않아**
 *   지금은 필요가 없다. 열이 늘어 스크롤이 생기면 `DataTableShell` 의 `scrollLeadWidth` 와 짝을 맞춘다
 * - **기간 기준 셀렉트**(원본은 `가입일` 한 항목뿐인 select 를 강제로 띄운다) —
 *   고를 것이 하나뿐이라 `DatePicker` 자리표시자로 "가입일 시작/종료"라고 밝히는 데 그쳤다
 *
 * ## 원본과 의도적으로 다르게 둔 곳 (근거를 남긴다)
 * 1. **빈 상태 제목이 "회원"** — 원본은 공용 셸이라 "해당 조건의 항목이 없습니다."로
 *    도메인을 모른다. 본문 문구는 원본 그대로다
 * 2. **일괄 변경 바가 화면 하단에 뜬다** — 원본은 목록 위에 버튼 두 개를 늘 띄워 둔다.
 *    이 저장소는 그 자리를 §25 `SelectionBar` 로 두는데, 고른 행이 스크롤로 사라져도
 *    무엇을 고른 채인지 남기 때문이다
 *
 * > 한때 이 자리에 **"처음 열릴 때 전체"** 와 **"`상세` 가 미리보기 모달을 연다"** 두 항목이
 * > 근거와 함께 적혀 있었다. 둘 다 지금은 사실이 아니다 — 기본값은 원본대로 `정상` 이고
 * > (`DEFAULT_FILTER`), 회원 상세(`/members/{id}`)는 실제로 만들어졌다. 옛 근거를 남겨 두면
 * > 다음 사람이 "의도된 이탈"로 읽고 되돌린다.
 * ====================================================================== */

/**
 * 가입일이 선택한 기간 안에 드는지.
 *
 * `date` 는 `"YYYY-MM-DD HH:mm"` 형식인데 공백 구분자는 브라우저별 파싱이 갈린다.
 * `T` 로 바꿔 ISO 형태로 만든 뒤 넘긴다. 시작일은 00:00, 종료일은 23:59:59 까지 포함한다
 * (종료일을 그대로 쓰면 그날 낮에 가입한 회원이 빠진다).
 */
const inPeriod = (dateText: string, range?: DateRange) => {
  if (!range?.from) return true;

  const at = new Date(dateText.replace(" ", "T"));
  if (Number.isNaN(at.getTime())) return true;

  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);

  const to = new Date(range.to ?? range.from);
  to.setHours(23, 59, 59, 999);

  return at >= from && at <= to;
};

export interface MemberListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/* -------------------------------------------------------------------------
 * 정렬 — 원본 어드민의 `sortable` 열 (이름 · 가입일 · 자녀)
 * ---------------------------------------------------------------------- */

/** 정렬 가능한 열. 값은 `Member` 의 키와 같다 */
type SortKey = "date" | "kids";

interface SortState {
  key: SortKey;
  direction: TableSortDirection;
}

/**
 * 열마다 **무엇을 어떻게 비교하는지**. 표는 비교 규칙을 모른다(§`Table` 주석).
 *
 *
 * ⚠️ **이름은 정렬 열이 아니다.** 원본 표 헤더에서 ↕ 가 붙은 것은 **가입일·자녀** 둘뿐인데
 * 한때 이름까지 정렬되게 만들어 뒀다(2026-09-21 원본 v0.4 대조로 바로잡음).
 * - 가입일: `"YYYY-MM-DD HH:mm"` 이라 **문자열 비교로 시간 순서가 맞는다**
 *   (자리수가 고정이고 큰 단위가 앞이다). `Date` 로 바꾸면 파싱 비용만 든다.
 * - 자녀: 수치 비교.
 */
const COMPARATORS: Record<SortKey, (a: Member, b: Member) => number> = {
  date: (a, b) => a.date.localeCompare(b.date),
  kids: (a, b) => a.kids - b.kids,
};

/**
 * 다음 정렬 상태. **오름 → 내림 → 해제** 3단이다.
 *
 * 2단(오름↔내림)으로 두면 **원래 순서로 되돌릴 방법이 없다.** 목록의 기본 순서는
 * 그 자체로 의미가 있어(가입 역순으로 들어온 데이터) 되돌아갈 자리를 남긴다.
 * `aria-sort` 가 none/ascending/descending 세 값을 그대로 전달한다.
 */
const nextSort = (
  current: SortState | null,
  key: SortKey,
): SortState | null => {
  if (current?.key !== key) return { key, direction: "asc" };
  if (current.direction === "asc") return { key, direction: "desc" };
  return null;
};

/* -------------------------------------------------------------------------
 * 표 골격
 * ---------------------------------------------------------------------- */

/**
 * 열 폭의 **정본**. 표와 로딩 뼈대가 **같은 것을 쓴다** — 폭을 두 번 적으면
 * 로딩이 끝나는 순간 열이 밀린다(`DataTableShell.loading` 주석의 요구사항이다).
 *
 * table-fixed 라 폭 지정 필수. 한 컬럼만 auto 로 두면 여백을 독식한다.
 * 값은 **원본 어드민의 컬럼 정의(`minWidth`)** 를 옮긴 것이다 —
 * 110·200·130·110·70·90·140·80 을 4px 격자로 올림했다(§DESIGN.md §7-2).
 * 표가 `width:auto; min-width:100%` 라, 합(940)이 화면보다 좁으면 비율대로 늘어난다.
 */
const COLGROUP = (
  <colgroup>
    {/* 체크박스 열 — 원본 `rowchk`. 값이 아니라 조작이라 가장 좁게 둔다 */}
    <col className="w-12" />
    <col className="w-16" />
    <col className="w-28" />
    <col className="w-50" />
    <col className="w-33" />
    <col className="w-28" />
    <col className="w-18" />
    <col className="w-23" />
    <col className="w-35" />
    <col className="w-20" />
  </colgroup>
);

/** 로딩 자리의 셀 폭 — 실제 값의 글자 수에 가깝게 둬야 도착했을 때 덜 튄다 */
const SKELETON_WIDTHS = [
  "w-4",
  "w-6",
  "w-16",
  "w-40",
  "w-28",
  "w-24",
  "w-10",
  "w-12",
  "w-24",
  "w-12",
];

/**
 * 로딩 뼈대. **헤더는 실제 글자 그대로** 두고 본문만 가린다 —
 * 고정 텍스트는 어차피 바뀌지 않으므로 스켈레톤으로 만들지 않는다(§D8-1).
 */
const loadingTable = (
  <Table>
    {COLGROUP}
    <TableHead sticky>
      <TableRow>
        {/* 로딩 중에는 고를 것이 없으므로 체크박스를 그리지 않는다 — 자리만 맞춘다 */}
        <TableTh />
        <TableTh>No</TableTh>
        <TableTh>이름</TableTh>
        <TableTh>아이디(이메일)</TableTh>
        <TableTh>연락처</TableTh>
        <TableTh>가입일</TableTh>
        <TableTh>자녀</TableTh>
        <TableTh align="center">상태</TableTh>
        <TableTh>이용</TableTh>
        <TableTh>관리</TableTh>
      </TableRow>
    </TableHead>
    <TableBody>
      {Array.from({ length: PAGE_SIZE }, (_, row) => (
        <TableRow key={row}>
          {SKELETON_WIDTHS.map((width, cell) => (
            <TableTd key={cell}>
              <span className="body-small block">
                <Skeleton className={width} />
              </span>
            </TableTd>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

/**
 * 휴면·정지 사유 입력 — 원본 C-3 ⓐ. **목록 일괄과 회원 상세 저장이 같은 이 모달**을 쓴다.
 *
 * 빈 사유는 막고, 그 사실을 **필드 옆에서** 말한다(안심케어 반려 모달과 같은 규칙 —
 * 고쳐야 할 자리가 곧 메시지가 뜨는 자리다).
 */
export function MemberReasonModal({
  target,
  count,
  onClose,
  onConfirm,
}: {
  /** 바꿀 상태. `null` 이면 닫혀 있다 */
  target: MemberStatus | null;
  /** 대상 인원 — 2명 이상이면 제목에 붙는다(원본) */
  count: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);

  /* 닫을 때 비운다 — 다음 대상에게 앞사람의 사유가 남지 않게 */
  const clear = () => {
    setReason("");
    setTried(false);
  };

  if (target === null) return null;

  const close = () => {
    clear();
    onClose();
  };

  const submit = () => {
    if (reason.trim() === "") {
      setTried(true);
      return;
    }
    onConfirm(reason.trim());
    clear();
  };

  return (
    <Modal open onClose={close} size="small">
      <ModalHeader
        /* 푸터에도 "취소"가 있어 헤더 X 의 기본 라벨과 겹친다 — 이름을 갈라 준다 */
        closeLabel="대화상자 닫기"
        title={REASON_COPY.title(target, count)}
      />
      <ModalBody>
        <FormField
          label={REASON_COPY.label(target)}
          required
          error={
            tried && reason.trim() === ""
              ? REASON_COPY.error(target)
              : undefined
          }
        >
          <Textarea
            value={reason}
            minRows={3}
            placeholder={REASON_COPY.placeholder(target)}
            onChange={(event) => setReason(event.target.value)}
          />
        </FormField>
        <p className="body-small text-text-sub">{REASON_COPY.note(target)}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="large" onClick={close}>
          취소
        </Button>
        <Button
          /* 정지는 회원의 이용을 막는 처분이라 critical. 휴면은 되살릴 수 있는 보관이다 */
          variant={target === "suspended" ? "critical" : "primary"}
          size="large"
          onClick={submit}
        >
          {REASON_COPY.confirm(target)}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function MemberListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: MemberListPageProps) {
  const { toast } = useToast();

  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  /** 일괄 변경 대상 — 회원 id(이메일)를 담는다 */
  const [selected, setSelected] = useState<string[]>([]);
  /** 검색조건 펼침. **기본은 펼침**이다(사용자 결정 2026-10-19 — 원본은 접힘) */
  const [filterOpen, setFilterOpen] = useState(true);
  /** 사유를 기다리는 일괄 변경 — 휴면·정지는 사유를 받아야 처리된다 */
  const [pending, setPending] = useState<{
    target: MemberStatus;
    ids: string[];
    skipped: number;
  } | null>(null);

  /**
   * 회원 상세로 이동 — 원본의 "이름 또는 [상세] 클릭 → 회원 상세로 이동".
   *
   * id 가 이메일이라 `@` 와 `.` 이 들어간다. 주소에 그대로 넣으면 브라우저마다
   * 다르게 다루므로 **인코딩해서** 넘기고, 상세 화면이 디코딩해 읽는다.
   */
  const openDetail = (member: Member) =>
    onNavSelect(`/members/${encodeURIComponent(member.id)}`);
  const [sort, setSort] = useState<SortState | null>(null);

  /*
    실 API 를 붙이면 이 한 줄을 fetch 상태로 바꾼다 — 지금은 `?preview=` 로 미리 본다
    (`/members?preview=loading` · `empty` · `refreshing`). 대시보드와 같은 방식이다.
  */
  const status = asStatus(useSearchParams().get("preview"));

  /** 요약 줄에 쓰는 현재 검색 조건의 이름(«이름» · «연락처» …) */
  const searchFieldLabel =
    SEARCH_FIELDS.find((field) => field.value === searchField)?.label ??
    SEARCH_FIELDS[0].label;

  /* 검색 조건이 "어느 값을 훑을지"를 정한다 — 뼈대는 필드 이름을 모른다 */
  const pick =
    SEARCH_FIELDS.find((field) => field.value === searchField)?.pick ??
    SEARCH_FIELDS[0].pick;

  /*
   * 상태를 **뺀** 나머지 조건으로 좁힌 집합. 상태별 건수를 여기서 센다.
   * 이미 상태로 좁힌 결과에서 세면 "정상"을 고르는 순간 나머지가 전부 0 이 되어
   * 대시가 비교할 것을 잃는다 — 건수를 보여주는 이유가 통째로 사라진다.
   */
  const scoped = MEMBERS.filter((member) => {
    const matchKeyword =
      keyword.trim() === "" || pick(member).includes(keyword.trim());
    return matchKeyword && inPeriod(member.date, period);
  });

  const matched = scoped.filter((member) => member.status === filter);

  /*
    정렬은 **페이지를 나누기 전에** 한다. 페이지 안에서만 정렬하면 "이름 오름차순"이
    페이지마다 따로 걸려, 2페이지의 첫 이름이 1페이지의 마지막보다 앞서는 일이 생긴다.

    ⚠️ **복사한 뒤 정렬한다.** `sort` 는 제자리 정렬이라 저장소 배열의 순서를
    영구히 바꿔 "정렬 해제"가 원래 순서로 돌아가지 못한다. `toSorted` 는 이 저장소의
    TS 타깃(ES2020)에 없다.
  */
  const filtered = sort
    ? [...matched].sort((a, b) => {
        const order = COMPARATORS[sort.key](a, b);
        return sort.direction === "asc" ? order : -order;
      })
    : matched;

  /** 헤더를 눌렀을 때. 정렬이 바뀌면 1페이지로 돌아간다 — 보던 페이지의 내용이 통째로 바뀐다 */
  const toggleSort = (key: SortKey) => {
    setSort((current) => nextSort(current, key));
    setPage(1);
  };

  /** 이 열이 정렬 중이면 방향, 아니면 `undefined`(= `aria-sort="none"`) */
  const directionOf = (key: SortKey) =>
    sort?.key === key ? sort.direction : undefined;

  /*
   * 원본 상태 대시(`StatDash`)가 하던 일 — 상태별 건수를 클릭 없이 보여주고,
   * 카드 자체가 그 상태의 필터가 된다.
   * `FILTERS[].value` 가 `"all"` 또는 `MemberStatus` 라 데이터 쪽 어휘를 그대로 쓴다.
   */
  const dash = FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count: scoped.filter((member) => member.status === item.value).length,
    /* 원본은 상태 카드마다 `tip`(statusTips)을 달아 뜻을 설명한다 */
    tip: STATUS_META[item.value as MemberStatus].description,
  }));

  const selectStatus = (value: string) => {
    setFilter(value);
    setPage(1);
  };

  /*
   * 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다(2페이지를 보던 중 1페이지까지만
   * 남는 경우). 그대로 두면 **빈 표**가 그려지므로 마지막 페이지로 당긴다.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  /*
   * 초기화는 **한 곳에서만 정의한다.** 툴바와 빈 상태에 각각 쓰다 보면 한쪽이
   * 기간이나 검색 조건을 되돌리지 않아 "초기화했는데 여전히 비어 있음"이 된다.
   */
  const resetFilters = () => {
    setFilter(DEFAULT_FILTER);
    setSearchField(SEARCH_FIELDS[0].value);
    setKeyword("");
    setPeriod(undefined);
    setPage(1);
  };

  /* -------------------------------------------------------------------
   * 일괄 상태 변경 (원본 목록 툴바)
   *
   * 선택은 **id 로** 들고 있다. 인덱스로 들면 정렬·필터·페이지가 바뀌는 순간
   * 다른 사람이 선택된 것이 된다 — 일괄 처리에서는 그것이 곧 사고다.
   * ---------------------------------------------------------------- */
  const pageIds = paged.map((member) => member.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const somePageSelected =
    pageIds.some((id) => selected.includes(id)) && !allPageSelected;

  const toggleOne = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );

  /** 머리글 체크박스는 **이 페이지**만 고르고 푼다 — 안 보이는 행까지 고르지 않는다 */
  const togglePage = () =>
    setSelected((current) =>
      allPageSelected
        ? current.filter((id) => !pageIds.includes(id))
        : [...new Set([...current, ...pageIds])],
    );

  const selectedMembers = MEMBERS.filter((member) =>
    selected.includes(member.id),
  );

  /*
    원본 툴바는 지금 보고 있는 상태에서 **갈 수 있는 곳만** 낸다([정상] 탭에서는
    [휴면으로 변경][정지로 변경] 둘). 탈퇴 탭에서는 아무것도 못 바꾸므로 비어 있고,
    그때는 `SelectionBar` 자체가 열리지 않는다.
  */
  const bulkTargets = BULK_TARGETS.filter((target) =>
    selectedMembers.some((member) => canChangeStatus(member, target.value)),
  );

  const applyBulk = (target: MemberStatus) => {
    const ids = selectedMembers
      .filter((member) => canChangeStatus(member, target))
      .map((member) => member.id);
    const skipped = selectedMembers.length - ids.length;

    /* 휴면·정지는 사유를 받은 뒤에 처리한다 — 회원 상세 저장과 같은 게이트다 */
    if (needsReason(target)) {
      setPending({ target, ids, skipped });
      return;
    }

    toast(bulkStatusMessage(target, ids.length, skipped));
    setSelected([]);
  };

  const confirmReason = () => {
    if (!pending) return;
    toast(
      bulkStatusMessage(pending.target, pending.ids.length, pending.skipped),
    );
    setSelected([]);
    /*
      원본: 일괄 처리분은 **전환된 상태 카드로 옮겨** 결과를 보여 준다. 제자리에 두면
      처리한 행이 목록에서 사라져 무엇이 됐는지 확인할 길이 없다.
    */
    setFilter(pending.target);
    setPage(1);
    setPending(null);
  };

  /*
    엑셀 다운로드 — 원본 `exportCsv`. **고른 행이 있으면 그것만, 없으면 조회 결과 전체**다.
    페이지로 자르기 전(`filtered`)에서 센다 — 원본이 "1페이지만 받는 사고"를 막으려 정한 자리다.
    퍼블은 대상 건수만 알린다. 파일 생성은 개발 영역이다.
  */
  const exportCsv = () => {
    const picked = filtered.filter((member) => selected.includes(member.id));
    const rows = picked.length > 0 ? picked : filtered;
    if (rows.length === 0) {
      toast("다운로드할 데이터가 없습니다");
      return;
    }
    toast(
      picked.length > 0
        ? `선택한 ${rows.length}건을 내려받았습니다`
        : `조회 결과 ${rows.length}건을 내려받았습니다`,
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
      header={<PageHeader title="회원 관리" />}
    >
      {/*
        상태 대시 — 원본 `StatDash`. 건수를 보여주면서 그 자체가 상태 필터다.
        흰 카드(그룹) 안에 연한 그레이 상자(항목) 다섯이 들어간다.
      */}
      <Card variant="soft" aria-busy={isBusy(status)}>
        <CardBody className={dimWhile(status)}>
          {/*
            건수 대시 = 필터. 상자의 시각 규격 · 선택/hover 축 분리 · 접근가능 이름
            조립 · 툴팁 분기는 전부 `StatGrid` 가 맡는다 (docs/DESIGN-dashboard.md §D4).
            여기서는 **무엇을 세는지**만 말한다.
          */}
          <StatGrid
            items={dash.map((item) => ({
              value: item.value,
              label: item.label,
              count: num(item.count),
              unit: MEMBER_UNIT,
              tip: item.tip,
            }))}
            selected={filter}
            onSelect={selectStatus}
            ariaLabel="회원 상태"
            /* 상태가 넷이라 4칸 — 5칸에 넣으면 오른쪽 한 칸이 비어 균형이 깨진다 */
            columns={4}
          />
        </CardBody>
      </Card>

      {/*
        검색조건 — 원본 `filter` 영역. **접힌 채로 열리고** 걸린 조건은 요약이 말한다.
        컨트롤 구성(기간 · 조건 셀렉트 + 검색어)은 원본 그대로다.

        ⚠️ 원본은 [검색] 버튼을 눌러야 조건이 적용된다(Enter 동일). 이 화면은
        **입력 즉시 적용**이다 — 건수 카드가 조건에 따라 같이 움직여야 하는데
        버튼을 기다리면 카드와 목록이 서로 다른 조건을 말하는 순간이 생긴다.
      */}
      <FilterBar
        open={filterOpen}
        onOpenChange={setFilterOpen}
        summary={filterSummary({
          from: period?.from,
          to: period?.to,
          fieldLabel: searchFieldLabel,
          keyword,
        })}
        onReset={resetFilters}
      >
        <DatePicker
          mode="range"
          presets={PERIOD_PRESETS}
          value={period}
          onChange={(next) => {
            setPeriod(next);
            setPage(1);
          }}
          startPlaceholder="가입일 시작"
          endPlaceholder="가입일 종료"
        />
        {/*
          검색은 "조건 선택 + 검색어" 2단이다(원본 `search.fieldOpts` + `ph`).
          트리거에 보이는 글자는 현재 조건이라, 무엇을 고르는 셀렉트인지는
          `aria-label` 이 대신 말한다.
        */}
        <Select
          aria-label="검색 조건"
          options={SEARCH_FIELDS}
          value={searchField}
          onValueChange={(value) => {
            setSearchField(value);
            setPage(1);
          }}
        />
        <Input
          placeholder="검색어 입력"
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            setPage(1);
          }}
          leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        />
      </FilterBar>

      {/* 회원 목록 — DataTableShell 이 §7-1 셸 구조를 책임진다 */}
      <DataTableShell
        variant="soft"
        /*
          남는 세로 공간을 표가 흡수한다. 2560×1215 에서 콘텐츠가 661px 에서 끝나
          아래 550px 이 비어 있었다. 페이지네이션은 셸 맨 아래에 붙고, 행이 많아지면
          표 래퍼 안에서 스크롤된다(그래서 헤더를 sticky 로 둔다).
        */
        fill
        className="flex-1"
        bodyClassName={dimWhile(status)}
        isLoading={status === "loading"}
        loading={loadingTable}
        toolbarStart={
          /* 원본 `ListHead` 의 "목록 (총 N건)" — 주문·정산 목록과 같은 자리·같은 글자 */
          <h2 className="heading-medium-bold text-text">
            목록 (총 {filtered.length}건)
          </h2>
        }
        toolbarEnd={
          <Button variant="secondary" onClick={exportCsv}>
            <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
            엑셀 다운로드
          </Button>
        }
        isEmpty={status === "empty" || filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title="해당 조건의 회원이 없습니다"
            description="조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요."
          >
            <Button variant="secondary" onClick={resetFilters}>
              필터를 초기화
            </Button>
          </EmptyState>
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            end={
              /* 원본 표 하단의 페이지당 개수 셀렉트. 바꾸면 1페이지로 돌아간다 */
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
          {COLGROUP}
          {/*
            헤더는 **표 래퍼 안에서 스크롤될 때 위에 붙는다**(`fill` 로 표가 늘어나
            행이 많으면 여기서 세로 스크롤이 생긴다). 붙지 않으면 스크롤 한 번에
            어느 열이 무엇인지 알 수 없다.
          */}
          <TableHead sticky>
            <TableRow>
              {/*
                전체 선택 — 원본 `rowchk` 의 머리글. **이 페이지의 행만** 고른다.
                일부만 골랐을 때는 `indeterminate` 로 "부분 선택"을 표시한다.
              */}
              <TableTh align="center">
                <Checkbox
                  size="small"
                  aria-label="이 페이지 전체 선택"
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={togglePage}
                />
              </TableTh>
              {/*
                원본 표의 첫 열 — **조회 결과의 역순 순번**(`all.length - start - i`)이다.
                레코드 번호가 아니라서 필터·정렬을 바꾸면 다시 센다(건너뛰는 번호가 없다).
              */}
              <TableTh>No</TableTh>
              <TableTh>이름</TableTh>
              <TableTh>아이디(이메일)</TableTh>
              <TableTh>연락처</TableTh>
              <TableTh
                sortable
                sortDirection={directionOf("date")}
                onSort={() => toggleSort("date")}
              >
                가입일
              </TableTh>
              {/*
                ⚠️ 수치 열도 **좌측 정렬**이다 — 이 저장소는 회계 관행을 알면서
                좌측을 택했다(§7-2 · §D6-4). 한때 이 자리에 "우측 정렬" 주석이
                달려 있었는데 코드와 어긋난 설명이었다.
              */}
              <TableTh
                sortable
                sortDirection={directionOf("kids")}
                onSort={() => toggleSort("kids")}
              >
                자녀
              </TableTh>
              <TableTh align="center">상태</TableTh>
              <TableTh>이용</TableTh>
              <TableTh>관리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((member, index) => {
              const status = STATUS_META[member.status];
              return (
                <TableRow key={member.id}>
                  <TableTd align="center">
                    <Checkbox
                      size="small"
                      /* 이름을 함께 읽어 줘야 어느 행을 고르는지 알 수 있다 */
                      aria-label={`${member.name} 선택`}
                      checked={selected.includes(member.id)}
                      onChange={() => toggleOne(member.id)}
                    />
                  </TableTd>
                  <TableTd className="tabular-nums">
                    {filtered.length - (currentPage - 1) * pageSize - index}
                  </TableTd>
                  {/*
                    원본에서 이름은 `/members/{id}` 로 가는 링크다(`className: "linkish"`).
                    행 전체를 누르게 만들지 않는다 — 원본에 없는 어포던스다.
                  */}
                  <TableTd>
                    <TextButton onClick={() => openDetail(member)}>
                      {member.name}
                    </TextButton>
                  </TableTd>
                  <TableTd>
                    {/*
                      ⚠️ `line-clamp-1` 이 아니라 `truncate` 다. clamp 은 **줄 수가
                      한도를 넘을 때만** 말줄임을 넣는데, 이메일은 줄바꿈 기회가 없어
                      (UAX#14 — `.`·`@` 뒤로 끊기지 않는다) 언제나 한 줄이다.
                      그래서 clamp 이 발동하지 않고 `overflow: hidden` 이 글자를 그냥 잘랐다.
                      `block` 은 필수다 — 인라인 박스에는 `overflow`·`text-overflow` 가
                      적용되지 않아 span 을 블록 컨테이너로 만들어야 `…` 가 나온다.
                    */}
                    <span className="block truncate">{member.id}</span>
                  </TableTd>
                  <TableTd className="tabular-nums">{member.phone}</TableTd>
                  {/*
                    원본 `ymd` — 날짜만 낸다.
                    날짜·수치 열은 **등폭**이다(§D6-2) — 비례폭이면 자릿수가 세로로
                    어긋나 위아래 행을 비교할 수 없다. 큰 글자(타일 수치)와 달리
                    표는 "줄이 맞는 곳"이라 등폭이 맞다.
                  */}
                  <TableTd className="tabular-nums">{ymd(member.date)}</TableTd>
                  <TableTd className="tabular-nums">
                    {people(member.kids)}
                  </TableTd>
                  <TableTd align="center">
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </TableTd>
                  {/* 렌트 / 구매를 나눠 적는다 — 합계 하나로 접으면 이 서비스의 핵심 구분이 사라진다 */}
                  <TableTd className="tabular-nums">
                    {usageText(member)}
                  </TableTd>
                  <TableTd>
                    {/* 원본 `관리` 컬럼은 `상세` 버튼 하나다 (`btn line sm`) */}
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => openDetail(member)}
                    >
                      상세
                    </Button>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/*
        일괄 처리 바 — 원본 목록 위의 `[휴면으로 변경] [정지로 변경]`.
        이 저장소는 그 자리를 §25 `SelectionBar`(화면 하단 고정)로 둔다. 고른 행이
        화면 밖으로 스크롤돼도 무엇을 고른 채인지 사라지지 않기 때문이다.

        **갈 수 있는 곳이 없으면 열지 않는다** — 탈퇴 회원만 골랐을 때 버튼 없는
        빈 바가 뜨면 "왜 아무것도 못 하지"가 된다.
      */}
      <SelectionBar
        open={selected.length > 0 && bulkTargets.length > 0}
        count={selected.length}
        /* 기본 문구는 "N개" 다 — 세는 것이 사람이라 단위를 바꾼다 */
        countLabel={(value) => `${value}명 선택됨`}
        onClear={() => setSelected([])}
      >
        {bulkTargets.map((target) => (
          <SelectionBarButton
            key={target.value}
            onClick={() => applyBulk(target.value)}
          >
            {target.label}
          </SelectionBarButton>
        ))}
      </SelectionBar>

      <MemberReasonModal
        target={pending?.target ?? null}
        count={pending?.ids.length ?? 0}
        onClose={() => setPending(null)}
        onConfirm={confirmReason}
      />
    </AppShell>
  );
}
