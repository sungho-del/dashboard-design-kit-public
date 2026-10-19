import { useState } from "react";
import { Plus } from "lucide-react";
import {
  AppShell,
  Button,
  DataTableShell,
  Skeleton,
  EmptyState,
  FormField,
  Gnb,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  useToast,
} from "../../components/ui";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import {
  CREATED_MESSAGE,
  DELETE_NOTICE,
  DELETE_WARNING,
  EMPTY_DESCRIPTION,
  EMPTY_TITLE,
  MONTH_FROM_ERROR,
  MONTH_PLACEHOLDER,
  MONTH_TO_HINT,
  NAME_ERROR,
  NAME_MAX,
  NAME_PLACEHOLDER,
  NOTE_EMPTY,
  NOTE_MAX,
  NOTE_PLACEHOLDER,
  STAGES,
  UPDATED_MESSAGE,
  count,
  deletedMessage,
  monthRangeText,
  parseMonth,
  stageCountsOf,
  type GrowthStage,
} from "./GrowthStageListPage.data";
import { stageOf } from "./ProductDetailPage.data";
import { PRODUCTS } from "./ProductListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 성장단계 관리 (S07) — 목록형 · 뼈대
 *
 * ## 화면 유형: 목록형
 * 아이 월령 구간별 성장단계를 등록·수정·삭제한다. 행이 4개뿐인 설정 화면이라
 * 표보다 **모달**이 화면의 무게중심이다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./GrowthStageListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                           |
 * | --------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위 | `GrowthStageListPage.data.ts` **전체**         |
 * | 등록 상품수 계산      | `.data.ts` 의 `stageCountsOf` + 상품 단계 배정 `stageOf` |
 * | 표 컬럼 구성          | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 행 액션               | `관리` 셀의 Button 2개 (수정·삭제)             |
 *
 * ## 검증은 **둘뿐이다**
 * 저장 전에 보는 것은 `명칭이 비었는가` · `시작 개월이 비었는가` 두 가지다(원본 `stageSave`).
 * 구간 겹침·빈틈·이름 중복은 원본에 없어 보지 않는다 — 누가 막을지는 서버 정책으로 남아 있다.
 *
 * ## 편집은 알림만 띄운다 (퍼블 범위 · 2026-10-19 사용자 결정)
 * 등록·수정·삭제를 확정하면 원본 문구의 알림만 띄우고 표·`STAGES`·상품 배정은 그대로 둔다.
 * 처리 결과로 데이터를 바꾸는 것은 개발 영역이다(카테고리 관리와 같은 기준).
 *
 * ## 템플릿(`OrderListPage`)과 갈라지는 지점
 * 1. **요약 카드가 없다.** 성장단계 수에는 추세라는 것이 없다
 * 2. **세그먼트 필터·검색이 없다.** 4건짜리 목록이라 조작만 늘린다.
 *    빈 상태(`isEmpty`)는 남겨 둔다 — 성장단계를 아직 만들지 않은 서비스가 있다
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **월령 구간 겹침 검사**(`findOverlappingStage` · `overlapErrorOf`).
 *   그럴듯했지만 원본에 없는 규칙이었다 — 겹침은 서버가 판정해 그 메시지를 띄운다
 * - `종료 개월은 시작 개월보다 크거나 같아야 합니다.` · `종료 개월은 숫자만…` 문구
 * - **페이지네이션**(`PAGE_SIZE`) · 요약 카드 · PageHeader 도움말 툴팁
 * ====================================================================== */

/**
 * 열 폭의 **정본**. 표와 로딩 뼈대가 **같은 것을 쓴다** — 폭을 두 번 적으면
 * 로딩이 끝나는 순간 열이 밀린다. table-fixed 라 폭 지정 필수(합 100%).
 */
const COLGROUP = (
  <colgroup>
    <col className="w-20" />
    <col className="w-23" />
    <col className="w-40" />
    <col className="w-20" />
    <col className="w-35" />
  </colgroup>
);

/** 로딩 자리의 셀 폭 — 실제 값의 글자 수에 가깝게 둬야 도착했을 때 덜 튄다 */
const SKELETON_WIDTHS = ["w-12", "w-16", "w-56", "w-10", "w-24"];

/**
 * 로딩 뼈대. **헤더는 실제 글자 그대로** 두고 본문만 가린다 —
 * 고정 텍스트는 어차피 바뀌지 않으므로 스켈레톤으로 만들지 않는다(§D8-1).
 * 행 수는 샘플(원본 4단계)과 같은 4줄이다.
 */
const loadingTable = (
  <Table>
    {COLGROUP}
    <TableHead>
      <TableRow>
        <TableTh>단계 명칭</TableTh>
        <TableTh>월령 구간</TableTh>
        <TableTh>내용 (사용자 안내 문구)</TableTh>
        <TableTh>등록 상품수</TableTh>
        <TableTh>관리</TableTh>
      </TableRow>
    </TableHead>
    <TableBody>
      {Array.from({ length: 4 }, (_, row) => (
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
 * 등록 상품수 — **상품 목록과 같은 샘플**(본사 직영 포함)에서 센다.
 * 상품의 단계는 상품 상세의 처음 값과 같은 `stageOf` 로 정해진다.
 * 상품 데이터가 `.data.ts` 를 import 하므로 계산은 순환이 없는 이 뼈대에서 묶는다.
 */
const PRODUCT_COUNTS = stageCountsOf(STAGES, PRODUCTS.map(stageOf));
const productCountOf = (stage: GrowthStage) =>
  PRODUCT_COUNTS.get(stage.id) ?? 0;

export interface GrowthStageListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 등록과 수정은 필드가 같아 한 모달을 나눠 쓴다 */
interface EditTarget {
  mode: "create" | "edit";
  stage: GrowthStage | null;
}

export function GrowthStageListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: GrowthStageListPageProps) {
  const { toast } = useToast();

  /* 편집은 알림만이라 표는 시드 그대로다 — 실 API 를 붙이면 그 자리에서 다시 받는다 */
  const stages = STAGES;

  /*
    실 API 를 붙이면 이 한 줄을 fetch 상태로 바꾼다 — 지금은 `?preview=` 로 미리 본다
    (`/stages?preview=loading` · `empty` · `refreshing`). 다른 목록 화면과 같은 방식이다.
  */
  const status = asStatus(useSearchParams().get("preview"));

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [name, setName] = useState("");
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GrowthStage | null>(null);

  const openCreate = () => {
    setEditTarget({ mode: "create", stage: null });
    setName("");
    setMonthFrom("");
    setMonthTo("");
    setNote("");
    setTouched(false);
  };

  const openEdit = (stage: GrowthStage) => {
    setEditTarget({ mode: "edit", stage });
    setName(stage.name);
    setMonthFrom(String(stage.monthFrom));
    /* 열린 구간(`monthTo === null`)은 **빈칸**으로 연다 — 그것이 '이상'의 입력 형태다 */
    setMonthTo(stage.monthTo === null ? "" : String(stage.monthTo));
    setNote(stage.note);
    setTouched(false);
  };

  const closeEdit = () => {
    setEditTarget(null);
    setTouched(false);
  };

  /*
   * 검증 — 값만 보고 계산한다(제출 여부는 아래에서 곱한다).
   * `monthTo` 는 **비는 것이 정상**(= 이상)이라 아예 보지 않는다.
   * 입력 단계에서 숫자만 받으므로 "숫자가 아니다" 라는 오류도 생기지 않는다.
   */
  const fromValue = parseMonth(monthFrom);

  const nameError = name.trim() === "" ? NAME_ERROR : undefined;
  const fromError = fromValue === null ? MONTH_FROM_ERROR : undefined;

  /* 통과하면 알림만 — 입력한 값은 어디에도 남지 않는다(퍼블 범위) */
  const submitEdit = () => {
    setTouched(true);
    if (nameError || fromError) return;

    toast(editTarget?.mode === "edit" ? UPDATED_MESSAGE : CREATED_MESSAGE);
    closeEdit();
  };

  /**
   * 삭제. 결과 문구가 **'없음'으로 밀려난 상품 수**까지 말한다 —
   * 그 상품들이 방치되면 앱의 성장단계 추천에서 통째로 빠진다.
   * 쓰는 상품이 있어도 막지 않는다(원본과 같다). 알림만 띄우고 표는 그대로다.
   */
  const confirmDelete = () => {
    if (!deleteTarget) return;
    toast(deletedMessage(deleteTarget.name, productCountOf(deleteTarget)));
    setDeleteTarget(null);
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
      header={<PageHeader title="성장단계 관리" />}
    >
      <DataTableShell
        /* 상태 대시·검색조건과 같은 층(§Card soft) */
        variant="soft"
        /*
          남는 세로 공간을 표가 흡수한다. 4행짜리 설정 화면이라 기본값으로 두면
          표 아래가 페이지 회색으로 넓게 비어 "덜 만든 화면"으로 읽힌다.
        */
        fill
        className="flex-1"
        bodyClassName={dimWhile(status)}
        aria-busy={isBusy(status)}
        isLoading={status === "loading"}
        loading={loadingTable}
        toolbarStart={
          /* 페이지네이션이 없는 화면이라 총 건수를 툴바가 든다 */
          <h2 className="heading-medium-bold text-text">
            목록 (총 {stages.length}건)
          </h2>
        }
        toolbarEnd={
          <Button onClick={openCreate}>
            <Plus size={16} strokeWidth={1.2} aria-hidden />
            단계 추가
          </Button>
        }
        isEmpty={status === "empty" || stages.length === 0}
        empty={
          /* CTA 는 툴바의 `단계 추가` 가 이미 들고 있다 — 빈 상태에도 툴바는 남는다 */
          <EmptyState
            size="table"
            icon={<Plus strokeWidth={1.2} aria-hidden />}
            title={EMPTY_TITLE}
            description={EMPTY_DESCRIPTION}
          />
        }
      >
        <Table>
          {COLGROUP}
          <TableHead>
            <TableRow>
              {/* 우측 정렬은 쓰지 않는다 — 전부 좌측 (DESIGN.md §7-2) */}
              <TableTh>단계 명칭</TableTh>
              <TableTh>월령 구간</TableTh>
              <TableTh>내용 (사용자 안내 문구)</TableTh>
              <TableTh>등록 상품수</TableTh>
              <TableTh>관리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {stages.map((stage) => (
              <TableRow key={stage.id}>
                {/* 원본도 단계 명칭을 굵게 낸다 — 카테고리 관리의 이름 열과 같다 */}
                <TableTd className="body-medium-bold">{stage.name}</TableTd>
                {/* 월령·상품수는 **등폭**이다(§D6-2) — 비례폭이면 자릿수가 세로로 어긋난다 */}
                <TableTd className="tabular-nums">
                  {monthRangeText(stage)}
                </TableTd>
                <TableTd ellipsis>
                  {/* 안내 문구는 비울 수 있다 — 원본도 `-` 를 흐리게 낸다 */}
                  {stage.note === "" ? (
                    <span className="text-text-minimal">{NOTE_EMPTY}</span>
                  ) : (
                    stage.note
                  )}
                </TableTd>
                <TableTd className="tabular-nums">
                  {count(productCountOf(stage))}
                </TableTd>
                <TableTd>
                  {/*
                    액션이 둘뿐이라 드롭다운으로 감추지 않고 그대로 드러낸다(원본 `actrow`).
                    좌측 정렬 열이라 `justify-*` 를 걸지 않는다 — flex 자식에게는
                    `text-align` 이 먹지 않아 여기서 접으면 셀만 왼쪽이고 내용은 가운데가 된다.
                  */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="small"
                      variant="secondary"
                      aria-label={`${stage.name} 수정`}
                      onClick={() => openEdit(stage)}
                    >
                      수정
                    </Button>
                    <Button
                      size="small"
                      variant="critical"
                      aria-label={`${stage.name} 삭제`}
                      onClick={() => setDeleteTarget(stage)}
                    >
                      삭제
                    </Button>
                  </div>
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* 성장단계 추가·수정 — 필드가 같아 한 모달을 나눠 쓴다 */}
      <Modal open={editTarget !== null} onClose={closeEdit} size="large">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={
            editTarget?.mode === "create" ? "성장단계 추가" : "성장단계 수정"
          }
          description={editTarget?.stage?.name}
        />
        <ModalBody>
          <FormField
            label="단계 명칭"
            required
            error={touched ? nameError : undefined}
          >
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={NAME_PLACEHOLDER}
              maxLength={NAME_MAX}
            />
          </FormField>

          {/*
            컨트롤 병치는 flex + `flex-1 min-w-0` (§29-4) — 2열 grid 를 쓰지 않는다.
            자식 `Input` 의 래퍼가 `min-w-60`(240) 이라 두 칸에 488px 이상이 필요해
            이 모달만 `size="large"`(640) 를 쓴다.
          */}
          <div className="flex gap-2">
            <FormField
              label="시작 개월"
              required
              className="min-w-0 flex-1"
              error={touched ? fromError : undefined}
            >
              <Input
                value={monthFrom}
                /* 숫자만 받는다 — "숫자가 아니다" 라는 오류 문구가 원본에 없다 */
                onChange={(event) =>
                  setMonthFrom(event.target.value.replace(/[^\d]/g, ""))
                }
                placeholder={MONTH_PLACEHOLDER}
                inputMode="numeric"
                rightIcon={
                  <span className="body-medium text-text-sub">개월</span>
                }
              />
            </FormField>

            <FormField
              label="종료 개월"
              className="min-w-0 flex-1"
              description={MONTH_TO_HINT}
            >
              <Input
                value={monthTo}
                onChange={(event) =>
                  setMonthTo(event.target.value.replace(/[^\d]/g, ""))
                }
                placeholder={MONTH_PLACEHOLDER}
                inputMode="numeric"
                rightIcon={
                  <span className="body-medium text-text-sub">개월</span>
                }
              />
            </FormField>
          </div>

          <FormField label="내용" description={NOTE_PLACEHOLDER}>
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={NOTE_MAX}
            />
          </FormField>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="large" onClick={closeEdit}>
            취소
          </Button>
          <Button size="large" onClick={submitEdit}>
            저장
          </Button>
        </ModalFooter>
      </Modal>

      {/* 성장단계 삭제 확인 */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        size="small"
      >
        <ModalHeader closeLabel="대화상자 닫기" title="성장단계 삭제" />
        <ModalBody>
          {/*
            위험 안내는 **한 문단에 묻지 않는다.** "'없음'으로 바뀐다"(되돌릴 수 있는 결과)와
            "되돌릴 수 없다"는 무게가 다른 말이라, 이어 붙이면 뒤엣것이 읽히지 않는다.
          */}
          <p className="body-medium text-text-sub">{DELETE_NOTICE}</p>
          <p className="body-medium-bold text-text-critical">
            {DELETE_WARNING}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setDeleteTarget(null)}
          >
            취소
          </Button>
          <Button variant="critical" size="large" onClick={confirmDelete}>
            삭제
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
