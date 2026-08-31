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
  InfoItem,
  InfoList,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
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
import {
  ALL_CATEGORY,
  CATEGORIES,
  CATEGORY_NAME_MAX,
  FAQS,
  MESSAGES,
  nextCategoryId,
  type Faq,
  type FaqCategory,
} from "./FaqListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S20 FAQ 관리 — 뼈대 (BabyCube 본사 운영 어드민)
 *
 * ## 화면 유형: 목록형 (`docs/screen-templates.md` §3-1)
 * 카드 두 장을 직접 조립한 화면이다(공용 목록 셸을 쓰지 않는다).
 * ```
 * 카드1 FAQ 카테고리 : 제목 + "N개" + [+ 카테고리 추가]
 *                      태그마다  이름 · FAQ 건수 · ✎ 이름 변경 · ✕ 삭제
 * 카드2 FAQ 목록     : 목록 (총 N건) + 카테고리 칩 | [+ FAQ 추가][선택 삭제]
 *                      표 3열 + 행 선택 체크박스
 * ```
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./FaqListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                           |
 * | ---------------------- | ---------------------------------------------- |
 * | 데이터·타입·문구       | `FaqListPage.data.ts` **전체**                 |
 * | 표 컬럼 구성           | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 카테고리 태그의 액션   | `categoryTag` 렌더                             |
 * | 화면 제목·액션         | `PageHeader` · 툴바의 FAQ 추가 / 선택 삭제     |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * `DataTableShell` 셸 구조 · `colgroup` 비율 배분 ·
 * 행 선택 → 확인 모달 흐름 · 카테고리 편집 모달의 검증
 *
 * ## 이 화면이 지키는 세 가지 약속
 * 1. **편집은 태그 자신에 붙는다.** 카테고리마다 ✎·✕ 를 달면 "무엇을 고치는지"가
 *    누르는 자리에서 결정된다. 칩을 고른 뒤 카드 머리의 버튼을 누르는 간접 조작은
 *    `전체` 를 고른 동안 대상이 없어 버튼이 잠기는 죽은 상태를 만든다.
 * 2. **빈 카테고리만 삭제된다.** 규칙은 버튼을 잠그는 대신 **눌렀을 때 이유로** 답한다
 *    (원본도 그렇다) — 몇 건이 남아 무엇을 먼저 해야 하는지까지 함께 말해야 한다.
 * 3. **선택은 보이는 목록에 매인다.** 카테고리를 바꾸면 선택을 비운다. 안 그러면
 *    화면에 없는 행이 선택된 채 삭제되어 무엇을 지웠는지 알 수 없다.
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * 원본(`chunks/3sxnfshlohpx5.js` 모듈 61180) 컬럼은 `categoryName`·`question`·
 * `answer` **3열**이다.
 * - **등록일 열** — 데이터 층에서 `date` 필드도 함께 지웠다
 * - **페이지네이션과 `PAGE_SIZE`** — 원본 카드는 목록 헤더 + 표뿐이다
 * - **상시 노출 안내문** — "빈 카테고리만 삭제됩니다"는 삭제 확인 모달의 말이다
 * - `PageHeader` 설명문
 * ====================================================================== */

/** 카테고리 편집 모달의 대상. `undefined` 면 닫힘, `null` 이면 추가 */
type CategoryFormTarget = FaqCategory | null | undefined;

export interface FaqListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function FaqListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: FaqListPageProps) {
  const { toast } = useToast();

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

  const [preview, setPreview] = useState<Faq | null>(null);

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

  /**
   * 삭제 요청 — 버튼을 잠그지 않고 **눌렀을 때 이유로 답한다**(약속 2).
   * 몇 건이 남았는지와 다음에 할 일을 함께 말해야 막다른 길이 되지 않는다.
   */
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
    /* 보이는 목록 안의 선택만 대상이다 — 화면에 없는 행을 지우지 않는다 */
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
      <Card>
        <CardHeader
          action={
            <TextButton tone="secondary" onClick={() => openCategoryForm(null)}>
              <Plus size={16} strokeWidth={1.2} aria-hidden />
              카테고리 추가
            </TextButton>
          }
        >
          <div className="flex items-center gap-2">
            <h3 className="heading-medium-bold text-text">FAQ 카테고리</h3>
            <span className="body-small text-text-sub">
              {categories.length}개
            </span>
          </div>
        </CardHeader>
        <CardBody>
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
        toolbarStart={
          <>
            <span className="heading-medium-bold text-text">FAQ 목록</span>
            <span className="body-medium text-text-sub">
              총 {filtered.length}건
            </span>
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
            <Button onClick={() => toast(MESSAGES.faqAddOpened)}>
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
        isEmpty={filtered.length === 0}
        empty={
          <EmptyState
            size="table"
            icon={<HelpCircle strokeWidth={1.2} aria-hidden />}
            title="등록된 FAQ가 없습니다"
            description="이 카테고리에는 아직 FAQ가 없습니다. 새 FAQ를 등록해 주세요."
          />
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수. 한 컬럼만 auto 로 두면 여백을 독식한다 — 합 100% */}
          <colgroup>
            <col className="w-10" />
            <col className="w-20" />
            <col className="w-60" />
            <col className="w-100" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableTh>
                {/*
                  라벨 텍스트를 띄우면 5% 폭 컬럼이 무너진다. `label` 대신
                  `aria-label` 을 쓰면 이름은 남고 글자는 나오지 않는다.
                */}
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
            {filtered.map((faq) => (
              <TableRow key={faq.id}>
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
                {/* 원본에서 링크는 이 셀 하나다 — 행 전체는 눌리지 않는다 */}
                <TableTd>
                  <TextButton onClick={() => setPreview(faq)}>
                    {faq.question}
                  </TextButton>
                </TableTd>
                <TableTd ellipsis>{faq.answer}</TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* 카테고리 추가 · 이름 변경 — 같은 폼을 쓰고 제목만 갈린다 */}
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
          {/* FormField 는 Input·Textarea·Select 전용이다 */}
          <FormField label="카테고리명" error={nameError ?? undefined}>
            <Input
              placeholder={MESSAGES.categoryNamePlaceholder}
              maxLength={CATEGORY_NAME_MAX}
              value={categoryName}
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

      {/* 카테고리 삭제 확인 — 원본 `GateBody`: 규칙 + 되돌릴 수 없다는 경고 */}
      <Modal
        open={categoryDeleteTarget !== null}
        onClose={() => setCategoryDeleteTarget(null)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title="FAQ 카테고리 삭제"
          description={categoryDeleteTarget?.name}
        />
        <ModalBody>
          {/*
            강조 구간을 나눠 두는 이유는 그 구간이 **되돌릴 수 없는 조치의 범위**를
            말하기 때문이다. 한 문장으로 이어 붙이면 범위가 읽히지 않는다.
          */}
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

      {/* FAQ 선택 삭제 확인 — 파급 범위를 먼저 말한다 */}
      <Modal
        open={faqDeleteIds !== null}
        onClose={() => setFaqDeleteIds(null)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          /* 2건 이상일 때만 건수를 붙인다 — 1건이면 대상이 하나라 셀 것이 없다 */
          title={`FAQ 삭제${
            faqDeleteIds && faqDeleteIds.length > 1
              ? ` (${faqDeleteIds.length}건)`
              : ""
          }`}
        />
        <ModalBody>
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
          <Button
            variant="secondary"
            size="large"
            onClick={() => setFaqDeleteIds(null)}
          >
            취소
          </Button>
          <Button variant="critical" size="large" onClick={confirmFaqDelete}>
            삭제
          </Button>
        </ModalFooter>
      </Modal>

      {/*
        FAQ 미리보기 — 표에서 두 줄로 잘리는 답변을 온전히 보여 준다.
        **푸터 액션을 두지 않는다** — 수정은 FAQ 상세 화면의 일이다.
      */}
      <Modal open={preview !== null} onClose={() => setPreview(null)}>
        <ModalHeader title="FAQ 미리보기" description={preview?.question} />
        <ModalBody>
          <InfoList>
            <InfoItem label="카테고리">
              {preview ? nameOf(preview.categoryId) : ""}
            </InfoItem>
          </InfoList>
          <p className="body-medium text-text-sub">{preview?.answer}</p>
        </ModalBody>
      </Modal>
    </AppShell>
  );
}
