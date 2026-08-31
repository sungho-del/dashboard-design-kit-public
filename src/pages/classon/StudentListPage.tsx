import { useState } from "react";
import { ArrowDownToLine, Mail, Search } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  Checkbox,
  DataTableShell,
  DatePicker,
  EmptyState,
  Gnb,
  InfoItem,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Pagination,
  ProgressBar,
  SelectionBar,
  SelectionBarButton,
  StatGrid,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  TextButton,
  useToast,
  type DateRange,
} from "../../components/ui";
import {
  FILTERS,
  num,
  PAGE_SIZE,
  pct,
  searchable,
  STATUS_META,
  STUDENTS,
  STUDENT_UNIT,
  type Student,
  type StudentStatus,
} from "./StudentListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S02 수강생 관리 (클래스온 — 온라인 강의 플랫폼 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 목록형 (템플릿 원형 `src/pages/OrderListPage.tsx`)
 * 수강생을 상태·기간·검색어로 걸러 조회하고, 진도가 밀린 사람을 골라 독려 메일을 보낸다.
 *
 * ## 구성은 기획서 sections 그대로다
 *
 * ```
 * 상태 건수 대시 (전체·수강중·완료·중단·환불 — 누르면 필터)   ← F04 · StatGrid
 * 목록 액션 + 검색 조건 (엑셀 다운로드 | 등록일 기간 · 검색어 · 초기화) ← F05·F09
 * 수강생 표 (선택 · 이름 · 이메일 · 강의 · 진도율 · 최근 학습 · 상태 · 관리) ← F06
 * 선택 → 독려 메일 (SelectionBar → 확인 모달 → toast)          ← F08
 * 행 클릭 → 우측 요약 패널 (SideSheet)                          ← F07
 * ```
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./StudentListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                           |
 * | --------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위 | `StudentListPage.data.ts` **전체**             |
 * | 표 컬럼 구성          | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 검색·기간 구성        | `toolbarEnd` 슬롯                              |
 * | 화면 제목             | `PageHeader` 의 `title`                        |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 페이지 범위 클램프 ·
 * `inPeriod` 날짜 필터 · **상태 건수를 상태 축을 뺀 나머지 조건에서 세는 규칙**(아래 `scoped`) ·
 * 선택 → SelectionBar → 확인 모달 흐름
 *
 * ## ⚠️ 상단 건수 카드는 `StatGrid` 다 — `<button>` 을 직접 조립하지 말 것
 * 접근가능 이름 조립("수강중 4명") · `role="group"` · **선택은 테두리 / hover 는 면** ·
 * 툴팁 분기를 전부 `StatGrid` 가 책임진다(`docs/DESIGN-dashboard.md` §D4).
 * 이 패턴을 손으로 짠 복붙이 10개 화면에 퍼졌다가 걷어낸 이력이 있다.
 *
 * ## ⚠️ 증감 요약 카드 3장을 두지 않는다
 * 목록형 템플릿의 상단은 `StatTile variant="card"` 3장이지만, 기획서 S02 의 상단은
 * **상태 건수 대시**이고 증감·비교 기준의 근거가 기획서 어디에도 없다. 지어내지 않는다.
 *
 * ## ⚠️ 진도율 막대는 셀 안에 그대로 둔다
 * `colgroup` 이 열 폭을 고정하므로 **모든 행의 막대가 같은 길이 기준**을 갖는다.
 * (카드 목록에는 폭을 고정해 줄 것이 없어 이름과 다른 줄에 둔다 — S01 이 그 경우다)
 *
 * ## 기획서 gap 을 이 화면이 정한 것 (근거는 pipeline/05-screen-plan.json)
 * 1. `상세` 버튼과 행 클릭은 **같은 요약 시트**를 연다 — 수강생 상세 화면이 기획서에 없다
 * 2. 요약 시트에 **푸터를 두지 않는다** — 갈 곳도 없고, 버튼을 만들면 없는 기능을 지어내게 된다
 * 3. 독려 메일은 **확인 모달 1단계 + 결과 toast** 까지만. 템플릿 선택·본문 편집은 미정의다
 * ====================================================================== */

/**
 * 등록일이 선택한 기간 안에 드는지.
 *
 * `date` 는 `"YYYY-MM-DD HH:mm"` 형식인데 공백 구분자는 브라우저별 파싱이 갈린다.
 * `T` 로 바꿔 ISO 형태로 만든 뒤 넘긴다. 시작일은 00:00, 종료일은 23:59:59 까지 포함한다
 * (종료일을 그대로 쓰면 그날 낮에 등록한 수강생이 빠진다).
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

export interface StudentListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function StudentListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: StudentListPageProps) {
  const { toast } = useToast();

  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);

  /** 선택된 수강 ID — 독려 메일(F08)의 대상이다 */
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<Student | null>(null);
  const [mailOpen, setMailOpen] = useState(false);

  /*
   * 상태를 **뺀** 나머지 조건(검색어·등록일)으로 좁힌 집합. 상태별 건수를 여기서 센다.
   * 이미 상태로 좁힌 결과에서 세면 '수강중'을 고르는 순간 나머지가 전부 0 이 되어
   * 대시가 비교할 것을 잃는다 — 건수를 보여주는 이유가 통째로 사라진다.
   */
  const scoped = STUDENTS.filter(
    (student) =>
      (keyword.trim() === "" || searchable(student).includes(keyword.trim())) &&
      inPeriod(student.date, period),
  );

  const filtered = scoped.filter(
    (student) => filter === "all" || student.status === filter,
  );

  /* 건수는 상수가 아니라 지금 남아 있는 행에서 센다 — 박아 두면 표와 어긋난다 */
  const dash = FILTERS.map((item) => ({
    value: item.value,
    label: item.label,
    count:
      item.value === "all"
        ? scoped.length
        : scoped.filter((student) => student.status === item.value).length,
    /* '전체'는 설명할 것이 없다 — 나머지 넷만 기획서의 상태 정의를 툴팁으로 단다 */
    tip:
      item.value === "all"
        ? undefined
        : STATUS_META[item.value as StudentStatus].description,
  }));

  /*
   * 필터로 결과가 줄면 현재 페이지가 범위를 벗어날 수 있다(2페이지를 보던 중 1페이지까지만
   * 남는 경우). 그대로 두면 **빈 표**가 그려지므로 마지막 페이지로 당긴다.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /* 지금 페이지의 선택 상태 — 헤더 체크박스가 이 둘로 갈린다 */
  const pageIds = paged.map((student) => student.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const somePageSelected =
    !allPageSelected && pageIds.some((id) => selected.includes(id));

  const toggleRow = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );

  const togglePage = () =>
    setSelected((prev) =>
      allPageSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])],
    );

  /*
   * 초기화는 **한 곳에서만 정의한다.** 툴바와 빈 상태에 각각 쓰다 보면 한쪽이 기간을
   * 되돌리지 않아 "초기화했는데 여전히 비어 있음"이 된다.
   */
  const resetFilters = () => {
    setFilter("all");
    setKeyword("");
    setPeriod(undefined);
    setPage(1);
  };

  const sendMail = () => {
    toast(`${num(selected.length)}${STUDENT_UNIT}에게 독려 메일을 보냈습니다`);
    setSelected([]);
    setMailOpen(false);
  };

  const previewStatus = preview ? STATUS_META[preview.status] : null;

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
      header={<PageHeader title="수강생 관리" />}
    >
      {/*
        상태 건수 대시 (F04). 건수를 보여주면서 그 자체가 상태 필터다.
        흰 카드(그룹) 안에 연한 그레이 상자(항목) 다섯이 들어간다 — 층이 둘이라야
        상자들이 한 묶음으로 읽힌다.
      */}
      <Card>
        <CardBody>
          <StatGrid
            items={dash.map((item) => ({
              value: item.value,
              label: item.label,
              /* `count` 는 **이미 포맷된 문자열**이고 단위는 `unit` 이 따로 든다 */
              count: num(item.count),
              unit: STUDENT_UNIT,
              tip: item.tip,
            }))}
            selected={filter}
            onSelect={(value) => {
              setFilter(value);
              setPage(1);
            }}
            ariaLabel="수강 상태"
            columns={5}
          />
        </CardBody>
      </Card>

      {/* 수강생 목록 — DataTableShell 이 §7-1 셸 구조를 책임진다 */}
      <DataTableShell
        toolbarStart={
          <Button
            variant="secondary"
            /*
              내려받는 대상은 화면 전체가 아니라 **지금 조건으로 조회된 결과**다(F09).
              건수를 밝히지 않으면 필터를 걸어 둔 줄 모르고 받아 간다.
            */
            onClick={() =>
              toast(
                `조회 결과 ${num(filtered.length)}${STUDENT_UNIT}을 내려받았습니다`,
              )
            }
          >
            <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
            엑셀 다운로드
          </Button>
        }
        toolbarEnd={
          <>
            <DatePicker
              mode="range"
              value={period}
              onChange={(next) => {
                setPeriod(next);
                setPage(1);
              }}
              startPlaceholder="등록일 시작"
              endPlaceholder="등록일 종료"
            />
            <Input
              placeholder="이름·이메일·강의명 검색"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
            />
            <TextButton tone="secondary" onClick={resetFilters}>
              초기화
            </TextButton>
          </>
        }
        isEmpty={filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<Search strokeWidth={1.2} aria-hidden />}
            title="조건에 맞는 수강생이 없습니다"
            description="검색어나 등록일 기간을 바꿔 보세요."
          >
            <Button variant="secondary" onClick={resetFilters}>
              필터 초기화
            </Button>
          </EmptyState>
        }
        footer={
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            start={
              <span className="body-small text-text-sub">
                총 {num(filtered.length)}
                {STUDENT_UNIT}
              </span>
            }
          />
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수. 한 컬럼만 auto 로 두면 여백을 독식한다 */}
          {/*
            **진도율을 이름 바로 옆에 둔다.**

            처음엔 `… 이메일 · 강의 · 진도율 · 최근 학습 …` 순서였는데,
            **진도율과 최근 학습이 붙어 있으면 섞여 읽힌다** — 둘 다 학습 수치라
            "62%"가 최근 학습에 딸린 비율처럼 보인다. 실제로 그 혼동이 보고됐다.

            부품(막대)이나 폭을 고쳐도 옆에 있는 한 헷갈린다. **떼어 놓는 것이 답이다.**
            이름 옆이면 "누가 얼마나 했나"가 한 줄로 읽히고, 이 표의 목적
            ("진도가 밀린 사람을 찾는다" · F06·UF1)과도 맞는다.
          */}
          <colgroup>
            <col className="w-[4%]" />
            <col className="w-[10%]" />
            <col className="w-[16%]" />
            <col className="w-[19%]" />
            <col className="w-[21%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
          </colgroup>
          <TableHead>
            <TableRow>
              {/* 체크박스 열은 좌측이다 — 가운데로 밀면 첫 칸의 24px 거터가 무너진다(§7-2) */}
              <TableTh>
                <Checkbox
                  size="small"
                  aria-label="이 페이지 전체 선택"
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={togglePage}
                />
              </TableTh>
              <TableTh>이름</TableTh>
              <TableTh>진도율</TableTh>
              <TableTh>이메일</TableTh>
              <TableTh>수강 강의</TableTh>
              <TableTh>최근 학습</TableTh>
              {/* 배지만 들어가는 열이 가운데다 (§7-2) */}
              <TableTh align="center">상태</TableTh>
              <TableTh>관리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.map((student) => {
              const status = STATUS_META[student.status];
              return (
                <TableRow
                  key={student.id}
                  clickable
                  /* 기획서 F07 — "표의 행을 누르면 우측에서 요약을 본다" */
                  onClick={() => setPreview(student)}
                >
                  <TableTd>
                    {/* 선택은 행 열기와 다른 동작이라 클릭을 여기서 멈춘다 */}
                    <div
                      role="presentation"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        size="small"
                        aria-label={`${student.name} 선택`}
                        checked={selected.includes(student.id)}
                        onChange={() => toggleRow(student.id)}
                      />
                    </div>
                  </TableTd>
                  <TableTd>{student.name}</TableTd>
                  <TableTd>
                    {/*
                      진도율 = 막대 + 숫자(F06). 셀 안이라 열 폭이 고정돼 있어
                      **모든 행의 막대가 같은 기준**으로 그려진다.
                      ⚠️ 임계 색을 쓰지 않는다 — 기획서 thresholds 의 40% 주의는
                      `appliesTo: ["S01"]`(강의 완주율)로 못 박혀 있다. 여기서 색을 칠하면
                      기획서에 없는 판정을 화면이 지어내는 것이 된다.
                    */}
                    <ProgressBar
                      value={student.progress}
                      ariaLabel={`${student.name} 진도율`}
                      valueText={pct(student.progress)}
                      /*
                        표 셀에서는 값을 **막대 앞**에 둔다. 뒤에 두면 셀 오른쪽 끝으로 밀려
                        다음 컬럼 텍스트와 셀 패딩 16px 을 사이에 두고 마주 본다.
                        `DESIGN.md` §7-2(표의 수치는 좌측)와도 맞는다.
                      */
                      valueSide="start"
                    />
                  </TableTd>
                  {/*
                    ⚠️ `line-clamp-1` 이 아니라 `truncate` 다. clamp 은 줄 수가 한도를
                    넘을 때만 말줄임을 넣는데, 이메일은 줄바꿈 기회가 없어(UAX#14 — `.`·`@`
                    뒤로 끊기지 않는다) 언제나 한 줄이라 clamp 이 발동하지 않는다.
                  */}
                  <TableTd>
                    <span className="block truncate">{student.email}</span>
                  </TableTd>
                  <TableTd>
                    <span className="block truncate">{student.course}</span>
                  </TableTd>
                  <TableTd>{student.lastStudiedAt}</TableTd>
                  <TableTd align="center">
                    <Tag tone={status.tone} dot>
                      {status.label}
                    </Tag>
                  </TableTd>
                  <TableTd>
                    {/*
                      상세 화면이 기획서에 없어 **행 클릭과 같은 요약 시트**를 연다.
                      행 클릭이 이미 열지만 버튼을 남기는 이유는 기획서 F06 의 `관리` 열이
                      그것이고, 키보드 사용자에게는 행이 아니라 이 버튼이 입구이기 때문이다.
                    */}
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPreview(student);
                      }}
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
        선택 행 일괄 작업 (F08). 서비스의 정체성 액션이라 화면 하단에 떠오른다.
        버튼은 하나뿐이다 — 기획서의 목록 액션은 엑셀 다운로드(툴바)와 독려 메일 둘뿐이다.
      */}
      <SelectionBar
        open={selected.length > 0}
        count={selected.length}
        onClear={() => setSelected([])}
        countLabel={(count) => `${num(count)}${STUDENT_UNIT} 선택됨`}
      >
        <SelectionBarButton
          icon={<Mail size={16} strokeWidth={1.2} aria-hidden />}
          onClick={() => setMailOpen(true)}
        >
          독려 메일 보내기
        </SelectionBarButton>
      </SelectionBar>

      {/* 발송 확인 — 되돌릴 수 없는 조치라 한 단계 둔다 */}
      <Modal open={mailOpen} onClose={() => setMailOpen(false)} size="small">
        <ModalHeader
          /* 헤더 X 의 기본 이름이 "닫기"라 푸터의 "닫기"와 겹친다 — 이름을 갈라 준다 */
          closeLabel="대화상자 닫기"
          title="선택한 수강생에게 독려 메일을 보낼까요?"
          description={`${num(selected.length)}${STUDENT_UNIT} 선택`}
        />
        <ModalBody>
          <p className="body-medium text-text-sub">
            학습이 밀린 수강생에게 이어서 듣도록 안내하는 메일이 발송됩니다.
            보낸 메일은 회수할 수 없습니다.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setMailOpen(false)}
          >
            닫기
          </Button>
          <Button size="large" onClick={sendMail}>
            독려 메일 보내기
          </Button>
        </ModalFooter>
      </Modal>

      {/*
        수강생 요약 패널 (F07) — 우측에서 밀려 들어온다.
        제목을 "수강생 상세"로 두지 않는다. 상세 화면이 생기면 같은 이름의 화면이 둘이 되고,
        시트에 전체 정보를 밀어 넣으라는 신호로 읽힌다.
        ⚠️ 푸터를 두지 않는다 — 갈 상세 화면도, 기획서가 정한 단건 액션도 없다.

        ⚠️ **미리보기는 `Modal`(딤 + 가운데)이다.** 기획서가 "우측에서 요약을 본다"고 적어
        한때 `SideSheet` 로 만들었지만, 이 저장소는 **팝업을 전부 가운데 모달로 통일**한다
        (사용자 결정 · `DESIGN.md` §13-1). 기획서의 배치 서술보다 시스템 규칙이 앞선다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="수강생 미리보기" description={preview?.name} />
        <ModalBody>
          <InfoList>
            <InfoItem label="수강 강의">{preview?.course}</InfoItem>
            <InfoItem label="진도율">
              {preview ? pct(preview.progress) : ""}
            </InfoItem>
            {/*
              `labelWidth` 를 주지 않는다 — 네 라벨 모두 기본 80 에 들어간다.
              §30-3 은 배타 분기라, 기본값(80)을 명시하면 `w-20` 대신 인라인 폭이 나가고
              한 항목에만 주면 값 시작선이 어긋나 InfoList 의 정렬 이점이 사라진다.
            */}
            <InfoItem label="최근 학습">{preview?.lastStudiedAt}</InfoItem>
            <InfoItem label="등록일">{preview?.date}</InfoItem>
          </InfoList>
          {/*
            상태는 라벨만 보여주고 끝내지 않는다 — '중단 = 30일 이상 접속 없음' 처럼
            **뜻이 곧 조치 판단의 근거**라 기획서의 정의를 함께 낸다.
          */}
          {previewStatus ? (
            <div className="flex flex-col gap-2">
              <Tag tone={previewStatus.tone} dot>
                {previewStatus.label}
              </Tag>
              <p className="body-small text-text-sub">
                {previewStatus.description}
              </p>
            </div>
          ) : null}
        </ModalBody>
      </Modal>
    </AppShell>
  );
}
