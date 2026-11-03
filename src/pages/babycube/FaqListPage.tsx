import { useState } from "react";
import { HelpCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  DataTableShell,
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
import { useSearchParams } from "../../lib/router";
import {
  ALL_CATEGORY,
  CATEGORIES,
  CATEGORY_NAME_MAX,
  FAQS,
  MESSAGES,
  NEW_ID,
  detailPathOf,
  nextCategoryId,
  type FaqCategory,
} from "./FaqListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S20 FAQ 관리 — 뼈대 (BabyCube 본사 운영 어드민 · 원본 v0.4 `SCREENS.faqAdmin`)
 *
 * ## 화면 유형: 목록형 (`docs/screen-templates.md` §3-1)
 * 카드 두 장을 직접 조립한 화면이다(공용 목록 셸을 쓰지 않는다).
 * ```
 * 카드1 FAQ 카테고리 : 제목 + "N개" + [+ 카테고리 추가]
 *                      태그마다  이름 · FAQ 건수 · ✎ 이름 변경 · ✕ 삭제
 * 카드2 목록 (총 N건) + 카테고리 칩 | [+ FAQ 추가][선택 삭제]
 *                      표 [체크] 카테고리 · 질문 · 답변 — 행 클릭 → `/faq-admin/{id}`
 * ```
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./FaqListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·문구·경로  | `FaqListPage.data.ts` **전체**                 |
 * | 표 컬럼 구성           | 이 파일의 `COLGROUP` + `TableHead` + 본문 셀   |
 * | 카테고리 태그의 액션   | 카드1 태그 렌더                                |
 * | 화면 제목·액션         | `PageHeader` · 툴바의 FAQ 추가 / 선택 삭제     |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 · 행 선택 → 확인 모달 흐름 ·
 * 카테고리 편집 모달의 검증(빈 값 · 중복) · `?preview=loading|empty|refreshing`
 *
 * ## 이 화면이 지키는 약속
 * 1. **편집은 태그 자신에 붙는다.** 카테고리마다 ✎·✕ 를 단다(원본 3515).
 * 2. **빈 카테고리만 삭제된다.** 버튼을 잠그지 않고 **눌렀을 때 이유로** 답한다(원본 3488).
 * 3. **선택은 보이는 목록에 매인다.** 카테고리를 바꾸면 선택을 비운다(원본 3460).
 * 4. **삭제 확인은 하나다.** 목록 [선택 삭제]와 상세 [삭제]가 `FaqDeleteModal` 하나를 쓴다
 *    (원본 3471 「통로가 여럿이어도 게이트 하나」).
 *
 * ## 원본과 다르게 둔 것
 * - **행 어디를 눌러도 상세**(사용자 결정 2026-11-02 — 원본은 질문 글자만 링크). 질문 글자도 링크로 남긴다.
 *   체크박스 클릭은 행 클릭이 아니다(`TableRow clickable`)
 * - 카테고리명 빈 값·중복은 **입력칸 아래 오류**(원본은 알림 — 형제 규칙)
 * - 카테고리 칩은 `SegmentedControl`(공지·공휴일과 같은 대체) · 질문·답변 열 왼쪽 정렬(원본 가운데 — UI-293 위반)
 * - 답변 셀 말줄임은 표 공용 2줄(원본 1줄 — 사용자 결정)
 * - `?preview=` 데이터 상태(형제 목록과 같다 — 원본엔 없음)
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - 등록일 열 · 페이지네이션 · 엑셀 · 검색조건 · `PageHeader` 설명문 · 상시 안내문
 * - **FAQ 미리보기 모달** — 원본은 07-29 에 모달을 걷고 상세 페이지로 바꿨다(2280·3461)
 * - 카테고리 삭제 창의 대상 이름(원본 UI-323 「대상 표기 없음」)
 * ====================================================================== */

/** 카테고리 편집 모달의 대상. `undefined` 면 닫힘, `null` 이면 추가 */
type CategoryFormTarget = FaqCategory | null | undefined;

export interface FaqListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/* table-fixed 라 폭 지정 필수 — 비율로 나뉜다. 「취소/교환/반품」 배지가 들어갈 폭을 준다 */
const COLGROUP = (
  <colgroup>
    <col className="w-10" />
    <col className="w-32" />
    <col className="w-90" />
    <col className="w-100" />
  </colgroup>
);

/** 로딩 자리의 셀 폭 — 실제 값의 글자 수에 가깝게 */
const SKELETON_WIDTHS = ["w-4", "w-16", "w-56", "w-72"];

/**
 * FAQ 삭제 확인 — **목록 [선택 삭제]와 상세 [삭제]가 함께 쓴다**(원본 `gateFaqDel` 2362~2369).
 * 제목은 2건 이상일 때만 건수를 붙인다. 대상 이름은 적지 않는다(UI-323).
 */
export function FaqDeleteModal({
  count,
  onClose,
  onConfirm,
}: {
  /** 지울 건수. `null` 이면 닫힘 */
  count: number | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={count !== null} onClose={onClose} size="small">
      <ModalHeader
        closeLabel="대화상자 닫기"
        title={`FAQ 삭제${count !== null && count > 1 ? ` (${count}건)` : ""}`}
      />
      <ModalBody>
        {/* 강조 구간이 **되돌릴 수 없는 조치의 범위**다 — 한 문장으로 이어 붙이지 않는다 */}
        <p className="body-medium text-text-sub">
          {MESSAGES.faqDelete.lead}
          <strong className="body-medium-bold text-text">
            {MESSAGES.faqDelete.emphasis}
          </strong>
          {MESSAGES.faqDelete.tail}
        </p>
        <p className="body-medium-bold text-text-critical">
          {MESSAGES.irreversible}
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

export function FaqListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: FaqListPageProps) {
  const { toast } = useToast();
  /* `?preview=loading|empty|refreshing` 으로 데이터 상태를 미리 본다(형제 목록과 같다) */
  const dataStatus = asStatus(useSearchParams().get("preview"));

  const [categories, setCategories] = useState(CATEGORIES);
  const [faqs, setFaqs] = useState(FAQS);
  const [categoryId, setCategoryId] = useState(ALL_CATEGORY.id);
  const [selected, setSelected] = useState<string[]>([]);

  const [formTarget, setFormTarget] = useState<CategoryFormTarget>(undefined);
  const [categoryName, setCategoryName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const [categoryDeleteTarget, setCategoryDeleteTarget] =
    useState<FaqCategory | null>(null);
  const [faqDeleteIds, setFaqDeleteIds] = useState<string[] | null>(null);

  const isAllSelected = categoryId === ALL_CATEGORY.id;
  const filtered = faqs.filter(
    (faq) => isAllSelected || faq.categoryId === categoryId,
  );

  /** 태그의 숫자는 **지금 목록에서 센다** — 값으로 적어 두면 표와 어긋난다 */
  const countOf = (id: string) =>
    faqs.filter((faq) => faq.categoryId === id).length;

  const nameOf = (id: string) =>
    categories.find((item) => item.id === id)?.name ?? "";

  /* 전체 선택은 **보이는 목록 전체**(현재 카테고리)에 걸린다 */
  const allChecked = filtered.length > 0 && selected.length === filtered.length;
  const someChecked = selected.length > 0 && !allChecked;

  const changeCategory = (next: string) => {
    setCategoryId(next);
    setSelected([]);
  };

  const toggleRow = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const toggleAll = () => {
    setSelected(allChecked ? [] : filtered.map((faq) => faq.id));
  };

  /** `null` 이면 추가, 카테고리를 넘기면 이름 변경 */
  const openCategoryForm = (target: FaqCategory | null) => {
    setFormTarget(target);
    setCategoryName(target?.name ?? "");
    setNameError(null);
  };

  const submitCategoryForm = () => {
    const name = categoryName.trim();
    if (name === "") {
      setNameError(MESSAGES.categoryNameRequired);
      return;
    }
    /* 중복은 자기 자신을 빼고 센다 — 이름을 그대로 두고 저장해도 막히지 않게(원본 3482) */
    if (
      categories.some(
        (item) => item.name === name && item.id !== formTarget?.id,
      )
    ) {
      setNameError(MESSAGES.categoryNameDuplicate);
      return;
    }

    if (formTarget) {
      const targetId = formTarget.id;
      setCategories((current) =>
        current.map((item) =>
          item.id === targetId ? { ...item, name } : item,
        ),
      );
      toast(MESSAGES.categoryRenamed);
    } else {
      setCategories((current) => [
        ...current,
        { id: nextCategoryId(current), name },
      ]);
      toast(MESSAGES.categoryAdded);
    }

    setFormTarget(undefined);
  };

  /** 삭제 요청 — 버튼을 잠그지 않고 **눌렀을 때 이유로 답한다**(약속 2) */
  const requestCategoryDelete = (category: FaqCategory) => {
    const count = countOf(category.id);
    if (count > 0) {
      toast(MESSAGES.categoryDeleteBlocked(category.name, count));
      return;
    }
    setCategoryDeleteTarget(category);
  };

  const confirmCategoryDelete = () => {
    const target = categoryDeleteTarget;
    if (!target) return;

    setCategories((current) => current.filter((item) => item.id !== target.id));
    setCategoryDeleteTarget(null);
    if (categoryId === target.id) changeCategory(ALL_CATEGORY.id);
    toast(MESSAGES.categoryDeleted);
  };

  const requestFaqDelete = () => {
    /* 보이는 목록 안의 선택만 대상이다 — 화면에 없는 행을 지우지 않는다(원본 3497) */
    const visible = new Set(filtered.map((faq) => faq.id));
    const targets = selected.filter((id) => visible.has(id));
    if (targets.length === 0) {
      toast(MESSAGES.nothingSelected);
      return;
    }
    setFaqDeleteIds(targets);
  };

  const confirmFaqDelete = () => {
    const targets = faqDeleteIds ?? [];
    setFaqs((current) => current.filter((faq) => !targets.includes(faq.id)));
    setSelected([]);
    setFaqDeleteIds(null);
    toast(MESSAGES.faqDeleted(targets.length));
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
      header={<PageHeader title="FAQ 관리" />}
    >
      {/* 카드1 — 카테고리. 태그마다 이름 변경·삭제가 붙는다(약속 1) */}
      <Card variant="soft" aria-busy={isBusy(dataStatus)}>
        <CardHeader
          action={
            /* 원본 `btn line sm` — 테두리 버튼 */
            <Button variant="secondary" onClick={() => openCategoryForm(null)}>
              <Plus size={16} strokeWidth={1.2} aria-hidden />
              카테고리 추가
            </Button>
          }
        >
          <div className="flex items-center gap-2">
            <h3 className="heading-medium-bold text-text">FAQ 카테고리</h3>
            <span className="body-small text-text-sub">
              {categories.length}개
            </span>
          </div>
        </CardHeader>
        <CardBody className={dimWhile(dataStatus)}>
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((category) => (
              <span
                key={category.id}
                className="flex items-center gap-1.5 rounded-small bg-surface-sub py-1 pr-1 pl-2.5 outline-1 -outline-offset-1 outline-border"
              >
                <span className="label-medium text-text">{category.name}</span>
                {/* 건수는 이름 바로 옆 — 삭제 가능 여부를 판단하는 근거다 */}
                <span className="label-medium-bold text-text-sub">
                  {countOf(category.id)}
                </span>
                <IconButton
                  size="xsmall"
                  variant="ghost"
                  label={`${category.name} 이름 변경`}
                  icon={<Pencil strokeWidth={1.2} aria-hidden />}
                  onClick={() => openCategoryForm(category)}
                />
                <IconButton
                  size="xsmall"
                  variant="ghost"
                  label={`${category.name} 삭제`}
                  icon={<X strokeWidth={1.2} aria-hidden />}
                  onClick={() => requestCategoryDelete(category)}
                />
              </span>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* 카드2 — FAQ 목록. 원본 카드에는 페이지네이션이 없다 */}
      <DataTableShell
        variant="soft"
        bodyClassName={dimWhile(dataStatus)}
        aria-busy={isBusy(dataStatus)}
        toolbarStart={
          <>
            {/* 페이지네이션이 없는 화면이라 총 건수를 툴바가 든다(원본 3517) */}
            <h2 className="heading-medium-bold text-text">
              목록 (총 {filtered.length}건)
            </h2>
            <SegmentedControl
              size="small"
              aria-label="카테고리"
              items={[ALL_CATEGORY, ...categories].map((category) => ({
                value: category.id,
                label: category.name,
              }))}
              value={categoryId}
              onValueChange={changeCategory}
            />
          </>
        }
        toolbarEnd={
          <>
            {/* 원본 key `'new'` — 등록 폼 페이지로 간다(3462) */}
            <Button onClick={() => onNavSelect(detailPathOf(NEW_ID))}>
              <Plus size={16} strokeWidth={1.2} aria-hidden />
              FAQ 추가
            </Button>
            {/* 잠그지 않는다 — 선택 없이 누르면 이유로 답한다(원본 규칙) */}
            <Button variant="secondary" onClick={requestFaqDelete}>
              <Trash2 size={16} strokeWidth={1.2} aria-hidden />
              선택 삭제
            </Button>
          </>
        }
        isEmpty={
          dataStatus !== "loading" &&
          (dataStatus === "empty" || filtered.length === 0)
        }
        empty={
          <EmptyState
            size="table"
            icon={<HelpCircle strokeWidth={1.2} aria-hidden />}
            title={MESSAGES.emptyTitle}
            description={MESSAGES.emptyDescription}
          />
        }
      >
        <Table>
          {COLGROUP}
          <TableHead>
            <TableRow>
              <TableTh>
                {/* 좁은 열이라 글자 라벨 대신 `aria-label` */}
                <Checkbox
                  size="small"
                  aria-label="전체 선택"
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={toggleAll}
                />
              </TableTh>
              {/* 배지만 들어가는 열 — §7-2 가운데 정렬 */}
              <TableTh align="center">카테고리</TableTh>
              <TableTh>질문</TableTh>
              <TableTh>답변</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* 원본 카드에는 페이저가 없다 — 조회된 FAQ 를 한 화면에 모두 낸다 */}
            {dataStatus === "loading"
              ? Array.from({ length: 5 }, (_, row) => (
                  <TableRow key={`skeleton-${row}`}>
                    {SKELETON_WIDTHS.map((width, cell) => (
                      <TableTd key={cell}>
                        <span className="body-small block">
                          <Skeleton className={width} />
                        </span>
                      </TableTd>
                    ))}
                  </TableRow>
                ))
              : filtered.map((faq) => (
                  <TableRow
                    key={faq.id}
                    clickable
                    onClick={() => onNavSelect(detailPathOf(faq.id))}
                  >
                    <TableTd>
                      <Checkbox
                        size="small"
                        aria-label={`${faq.question} 선택`}
                        checked={selected.includes(faq.id)}
                        onChange={() => toggleRow(faq.id)}
                      />
                    </TableTd>
                    <TableTd align="center">
                      <Tag size="small">{nameOf(faq.categoryId)}</Tag>
                    </TableTd>
                    {/* 원본 링크는 질문 글자 — 행 클릭과 같은 곳으로 간다 */}
                    <TableTd>
                      <TextButton
                        onClick={() => onNavSelect(detailPathOf(faq.id))}
                      >
                        {faq.question}
                      </TextButton>
                    </TableTd>
                    {/* 2줄 말줄임 — 한국어 단어 중간에서 끊지 않는다(공백 없는 긴 문자열만 강제 줄바꿈) */}
                    <TableTd ellipsis className="break-keep wrap-anywhere">
                      {faq.answer}
                    </TableTd>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* 카테고리 추가 · 이름 변경 — 같은 폼을 쓰고 제목만 갈린다(원본 `catForm` 2282) */}
      <Modal
        open={formTarget !== undefined}
        onClose={() => setFormTarget(undefined)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={`FAQ 카테고리 ${formTarget ? "수정" : "추가"}`}
        />
        <ModalBody>
          {/* 원본엔 라벨이 없지만 접근성상 둔다. FormField 는 Input·Textarea·Select 전용이다 */}
          <FormField label="카테고리명" error={nameError ?? undefined}>
            <Input
              placeholder={MESSAGES.categoryNamePlaceholder}
              maxLength={CATEGORY_NAME_MAX}
              value={categoryName}
              invalid={nameError !== null}
              onChange={(event) => {
                setCategoryName(event.target.value);
                if (nameError !== null) setNameError(null);
              }}
            />
          </FormField>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setFormTarget(undefined)}
          >
            취소
          </Button>
          <Button size="large" onClick={submitCategoryForm}>
            저장
          </Button>
        </ModalFooter>
      </Modal>

      {/* 카테고리 삭제 확인 — 원본 `gateFaqCatDel`(2406~2413) · 대상 이름 없음(UI-323) */}
      <Modal
        open={categoryDeleteTarget !== null}
        onClose={() => setCategoryDeleteTarget(null)}
        size="small"
      >
        <ModalHeader closeLabel="대화상자 닫기" title="FAQ 카테고리 삭제" />
        <ModalBody>
          <p className="body-medium text-text-sub">
            {MESSAGES.categoryDelete.lead}
            <strong className="body-medium-bold text-text">
              {MESSAGES.categoryDelete.emphasis}
            </strong>
            {MESSAGES.categoryDelete.tail}
          </p>
          <p className="body-medium-bold text-text-critical">
            {MESSAGES.irreversible}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setCategoryDeleteTarget(null)}
          >
            취소
          </Button>
          <Button
            variant="critical"
            size="large"
            onClick={confirmCategoryDelete}
          >
            삭제
          </Button>
        </ModalFooter>
      </Modal>

      <FaqDeleteModal
        count={faqDeleteIds?.length ?? null}
        onClose={() => setFaqDeleteIds(null)}
        onConfirm={confirmFaqDelete}
      />
    </AppShell>
  );
}
