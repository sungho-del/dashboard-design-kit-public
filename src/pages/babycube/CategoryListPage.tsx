import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Shapes,
  Trash2,
} from "lucide-react";
import {
  AppShell,
  Button,
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
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  useToast,
} from "../../components/ui";
import { cn } from "../../lib/cn";
import {
  CATEGORIES,
  DEFAULT_DOMAIN,
  DELETE_NOTICE,
  DELETE_WARNING,
  DOMAIN_TABS,
  EMPTY_DESCRIPTION,
  EMPTY_TITLE,
  ICON_GUIDE,
  ICON_REMOVED,
  ICON_SAVED,
  LEVEL_META,
  NAME_ERROR,
  addChildCategory,
  addRootCategory,
  addedChildMessage,
  addedRootMessage,
  canAddChild,
  count,
  deleteBlockReasonOf,
  deletedMessage,
  domainLabel,
  isFirstSibling,
  isLastSibling,
  moveCategory,
  removeCategory,
  renameCategory,
  renamedMessage,
  setCategoryIcon,
  type Category,
  type CategoryDomain,
  type CategoryLevel,
} from "./CategoryListPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * 카테고리 관리 (S06) — 목록형 · 뼈대
 *
 * ## 화면 유형: 목록형
 * 대·중·소 3단계 카테고리 **트리**를 관리한다. 조회보다 **편집**(순서·하위 추가·
 * 이름변경·삭제·아이콘)이 중심이라 행 액션과 모달 3종이 화면의 절반이다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./CategoryListPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                           |
 * | --------------------- | ---------------------------------------------- |
 * | 데이터·타입·라벨·단위 | `CategoryListPage.data.ts` **전체**            |
 * | 표 컬럼 구성          | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀 |
 * | 트리 조작 규칙        | `.data.ts` 의 `moveCategory`·`addChildCategory` |
 * | 행 액션               | `관리` 셀의 버튼 5개                           |
 *
 * ## 트리가 **둘**이라는 것이 이 화면의 첫 사실이다
 * 원본이 `categoryApi.tree("렌트" | "판매")` 로 아예 다른 트리를 받아 오고,
 * 화면 위 칩으로 그 둘을 오간다. 그래서 상태는 **한 배열**(두 트리를 이어 붙인 것)이고
 * 화면은 `domain` 으로 잘라 본다 — 순서 이동·하위 추가가 도메인 경계를 넘지 않도록
 * 판정 함수들이 전부 `domain` 을 함께 본다(`.data.ts` `blockLengthAt`).
 *
 * ## 템플릿(`OrderListPage`)과 갈라지는 지점 — 셋 다 의도된 것이다
 * 1. **페이지네이션이 없다.** 행이 트리라 페이지를 나누면 부모와 자식이 갈라진다.
 *    총 건수는 툴바의 "목록 (총 N건)"이 대신한다
 * 2. **요약 카드가 없다.** 카테고리 수에는 추세라는 것이 없다
 * 3. **행을 눌러 여는 미리보기 모달이 없다.** 행에 보이는 것이 이 카테고리의 전부다
 *
 * ## ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것
 * - **단계 세그먼트 필터 · 카테고리명 검색 · 초기화 버튼.**
 *   특히 단계 필터는 트리를 깨뜨린다 — 소분류만 남기면 부모 없는 자식이 나열되어
 *   들여쓰기가 가리킬 곳을 잃는다
 * - **PageHeader 도움말 툴팁**
 * - **행 액션을 `Dropdown` 에 접는 것.** 원본은 다섯 개를 한 줄(`actrow`)에 편다 —
 *   순서 이동은 연달아 누르는 동작이라 매번 메뉴를 여는 순간 못 쓰게 된다
 * ====================================================================== */

/**
 * 단계별 들여쓰기 — 표가 트리임을 보여주는 신호다.
 * 셀 자체가 아니라 **안쪽 span** 에 건다(td 는 이미 `p-2 first:pl-6` 를 갖고 있어
 * 같은 속성을 두 곳에서 방출하면 `cn()` 이 병합하지 않아 순서가 승자를 정한다).
 */
const LEVEL_INDENT: Record<CategoryLevel, string> = {
  major: "pl-0",
  middle: "pl-4",
  minor: "pl-8",
};

/**
 * 새로 등록한 아이콘의 자리를 채우는 **프로토타입 대체물**.
 *
 * 실서비스는 업로드한 이미지를 그리지만 이 디자인 시스템에는 `Thumbnail` 이 없다
 * (`.data.ts` `Category.icon` 주석). 등록/교체/삭제 흐름을 살리려면 "아이콘이 생겼다"를
 * 눈으로 확인할 무언가가 필요해서, 빈 자리 표식(`ImageIcon`)과 **구별되는** 도형을 쓴다.
 * 업로드가 붙으면 이 상수는 통째로 사라진다.
 */
const UPLOADED_ICON = Shapes;

export interface CategoryListPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

/** 이름 모달은 셋을 겸한다 — 입력 한 칸짜리 폼이 똑같기 때문이다 */
type NameTarget =
  | { mode: "root" }
  | { mode: "child"; parent: Category }
  | { mode: "rename"; category: Category };

export function CategoryListPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: CategoryListPageProps) {
  const { toast } = useToast();

  const [rows, setRows] = useState<Category[]>(CATEGORIES);
  const [domain, setDomain] = useState<CategoryDomain>(DEFAULT_DOMAIN);

  const [nameTarget, setNameTarget] = useState<NameTarget | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [iconTargetId, setIconTargetId] = useState<string | null>(null);

  /** 새 행의 키. 도메인을 가로질러 유일하기만 하면 되는 **기술 키**다 */
  const seq = useRef(0);
  const makeId = () => `category-new-${(seq.current += 1)}`;

  /* 화면은 지금 보고 있는 트리만 그린다 — 상태는 두 트리를 이어 붙인 한 배열이다 */
  const visible = rows.filter((category) => category.domain === domain);

  const openCreateRoot = () => {
    setNameTarget({ mode: "root" });
    setNameValue("");
    setNameTouched(false);
  };

  const openAddChild = (parent: Category) => {
    setNameTarget({ mode: "child", parent });
    setNameValue("");
    setNameTouched(false);
  };

  const openRename = (category: Category) => {
    setNameTarget({ mode: "rename", category });
    setNameValue(category.name);
    setNameTouched(false);
  };

  const closeName = () => {
    setNameTarget(null);
    setNameValue("");
    setNameTouched(false);
  };

  const nameInvalid = nameTouched && nameValue.trim() === "";

  const submitName = () => {
    setNameTouched(true);
    const name = nameValue.trim();
    if (name === "" || nameTarget === null) return;

    if (nameTarget.mode === "root") {
      setRows((prev) => addRootCategory(prev, domain, makeId(), name));
      toast(addedRootMessage(domain, name));
    } else if (nameTarget.mode === "child") {
      const { parent } = nameTarget;
      setRows((prev) => addChildCategory(prev, parent, makeId(), name));
      toast(addedChildMessage(parent.name, name));
    } else {
      const { category } = nameTarget;
      setRows((prev) => renameCategory(prev, category.id, name));
      toast(renamedMessage(category.name, name));
    }
    closeName();
  };

  /** 막힌 이유가 있으면 삭제 버튼을 잠그고 **그 문장을** 보여준다 */
  const deleteBlockReason = deleteTarget
    ? deleteBlockReasonOf(rows, deleteTarget)
    : null;

  const confirmDelete = () => {
    if (!deleteTarget || deleteBlockReason) return;
    setRows((prev) => removeCategory(prev, deleteTarget.id));
    toast(deletedMessage(deleteTarget.name));
    setDeleteTarget(null);
  };

  /* 아이콘 모달은 **id 로** 대상을 기억한다 — 아이콘을 바꾸면 행 객체가 새로 만들어져
     객체를 붙들고 있으면 모달이 옛 아이콘을 계속 보여준다 */
  const iconTarget = rows.find((category) => category.id === iconTargetId);
  const IconPreview = iconTarget?.icon ?? null;

  const applyIcon = (icon: typeof UPLOADED_ICON | null) => {
    if (!iconTarget) return;
    setRows((prev) => setCategoryIcon(prev, iconTarget.id, icon));
    toast(icon === null ? ICON_REMOVED : ICON_SAVED);
    setIconTargetId(null);
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
      header={<PageHeader title="카테고리 관리" />}
    >
      <DataTableShell
        toolbarStart={
          <>
            {/* 페이지네이션이 없는 화면이라 총 건수를 툴바가 든다 */}
            <h2 className="heading-medium-bold text-text">
              목록 (총 {visible.length}건)
            </h2>
            {/* 원본 `data-area="categories.tabs"` 의 칩 2개 — 트리를 통째로 갈아 끼운다 */}
            <SegmentedControl
              aria-label="유형"
              items={DOMAIN_TABS}
              value={domain}
              onValueChange={(value) => setDomain(value as CategoryDomain)}
            />
          </>
        }
        toolbarEnd={
          <Button onClick={openCreateRoot}>
            <Plus size={16} strokeWidth={1.2} aria-hidden />
            {domainLabel(domain)} 대분류 추가
          </Button>
        }
        isEmpty={visible.length === 0}
        empty={
          /* 필터가 없는 화면이라 "조건을 바꿔 보라"고 할 수 없다 —
             비어 있다면 정말로 그 트리에 카테고리가 하나도 없는 것이다 */
          <EmptyState
            size="table"
            icon={<Plus strokeWidth={1.2} aria-hidden />}
            title={EMPTY_TITLE}
            description={EMPTY_DESCRIPTION}
          />
        }
      >
        <Table>
          {/* table-fixed 라 폭 지정 필수. 합 100% */}
          <colgroup>
            <col className="w-20" />
            <col className="w-12" />
            <col className="w-33" />
            <col className="w-20" />
            <col className="w-58" />
          </colgroup>
          <TableHead>
            <TableRow>
              {/* 배지만 들어가는 열이라 가운데, 나머지는 좌측 (DESIGN.md §7-2) */}
              <TableTh align="center">단계</TableTh>
              <TableTh>아이콘</TableTh>
              <TableTh>카테고리</TableTh>
              <TableTh>등록 상품수</TableTh>
              <TableTh>관리</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((category) => {
              const levelMeta = LEVEL_META[category.level];
              const Icon = category.icon;

              return (
                <TableRow key={category.id}>
                  <TableTd align="center">
                    <Tag tone={levelMeta.tone} size="small">
                      {levelMeta.label}
                    </Tag>
                  </TableTd>
                  <TableTd>
                    <IconButton
                      size="small"
                      variant="ghost"
                      label={`${category.name} 아이콘 관리`}
                      onClick={() => setIconTargetId(category.id)}
                      icon={
                        Icon ? (
                          <Icon strokeWidth={1.2} aria-hidden />
                        ) : (
                          <ImageIcon strokeWidth={1.2} aria-hidden />
                        )
                      }
                    />
                  </TableTd>
                  <TableTd>
                    {/*
                      들여쓰기와 가지 기호가 이 표를 트리로 읽게 하는 유일한 신호다.
                      가지는 **부모가 있는 행에만** 붙는다 — 대분류는 매달릴 곳이 없다.
                    */}
                    <span
                      className={cn(
                        "inline-block",
                        LEVEL_INDENT[category.level],
                      )}
                    >
                      {category.parentId === null ? "" : "└"}
                      {category.name}
                    </span>
                  </TableTd>
                  <TableTd>{count(category.productCount)}</TableTd>
                  <TableTd>
                    {/*
                      원본 `actrow` — 다섯 개를 한 줄에 편다(드롭다운에 접지 않는다).
                      좌측 정렬 열이라 `justify-*` 를 걸지 않는다 — flex 자식에게는
                      `text-align` 이 먹지 않아 여기서 접으면 셀만 왼쪽이고 내용은 가운데가 된다.
                    */}
                    <div className="flex items-center gap-1">
                      <IconButton
                        size="small"
                        variant="secondary"
                        label={`${category.name} 위로`}
                        disabled={isFirstSibling(rows, category)}
                        onClick={() =>
                          setRows((prev) => moveCategory(prev, category.id, -1))
                        }
                        icon={<ChevronUp strokeWidth={1.2} aria-hidden />}
                      />
                      <IconButton
                        size="small"
                        variant="secondary"
                        label={`${category.name} 아래로`}
                        disabled={isLastSibling(rows, category)}
                        onClick={() =>
                          setRows((prev) => moveCategory(prev, category.id, 1))
                        }
                        icon={<ChevronDown strokeWidth={1.2} aria-hidden />}
                      />
                      {/* 소분류(3단계)가 마지막이라 그 아래로는 만들 수 없다 */}
                      {canAddChild(category) && (
                        <Button
                          size="small"
                          variant="secondary"
                          aria-label={`${category.name} 하위 추가`}
                          onClick={() => openAddChild(category)}
                        >
                          + 하위
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="secondary"
                        aria-label={`${category.name} 이름변경`}
                        onClick={() => openRename(category)}
                      >
                        이름변경
                      </Button>
                      <Button
                        size="small"
                        variant="critical"
                        aria-label={`${category.name} 삭제`}
                        onClick={() => setDeleteTarget(category)}
                      >
                        삭제
                      </Button>
                    </div>
                  </TableTd>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {/* 대분류 추가 · 하위 추가 · 이름변경 — 입력 한 칸짜리 폼이 같아 한 모달을 나눠 쓴다 */}
      <Modal open={nameTarget !== null} onClose={closeName} size="small">
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={
            nameTarget?.mode === "root"
              ? `${domainLabel(domain)} 대분류 추가`
              : nameTarget?.mode === "child"
                ? "하위 카테고리 추가"
                : "카테고리명 변경"
          }
          description={
            nameTarget?.mode === "child"
              ? nameTarget.parent.name
              : nameTarget?.mode === "rename"
                ? nameTarget.category.name
                : undefined
          }
        />
        <ModalBody>
          <FormField
            label="카테고리명"
            required
            error={nameInvalid ? NAME_ERROR : undefined}
          >
            <Input
              value={nameValue}
              onChange={(event) => setNameValue(event.target.value)}
              maxLength={30}
            />
          </FormField>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" size="large" onClick={closeName}>
            취소
          </Button>
          <Button size="large" onClick={submitName}>
            저장
          </Button>
        </ModalFooter>
      </Modal>

      {/* 카테고리 삭제 확인 — 막힌 이유가 있으면 잠그고 그 이유를 말한다 */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title="카테고리 삭제"
          description={deleteTarget?.name}
        />
        <ModalBody>
          <p className="body-medium text-text-sub">{DELETE_NOTICE}</p>
          {deleteBlockReason ? (
            <p role="alert" className="body-medium text-text-critical">
              {deleteBlockReason}
            </p>
          ) : (
            <p className="body-medium text-text-critical">{DELETE_WARNING}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setDeleteTarget(null)}
          >
            취소
          </Button>
          <Button
            variant="critical"
            size="large"
            disabled={deleteBlockReason !== null}
            onClick={confirmDelete}
          >
            삭제
          </Button>
        </ModalFooter>
      </Modal>

      {/* 아이콘 관리 — 이 모달 자체가 "확대 미리보기"다 */}
      <Modal
        open={iconTarget !== undefined}
        onClose={() => setIconTargetId(null)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title="카테고리 아이콘"
          description={iconTarget?.name}
        />
        <ModalBody>
          <div className="flex flex-col items-center gap-3">
            <span className="flex size-24 items-center justify-center rounded-medium bg-surface-sub text-icon-sub">
              {IconPreview ? (
                <IconPreview size={48} strokeWidth={1.2} aria-hidden />
              ) : (
                <ImageIcon size={48} strokeWidth={1.2} aria-hidden />
              )}
            </span>
            {/* 아이콘이 있으면 교체·삭제, 없으면 등록 — 원본 `pimg-ops` 와 같은 갈래다 */}
            {IconPreview ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => applyIcon(UPLOADED_ICON)}
                >
                  <RefreshCw size={16} strokeWidth={1.2} aria-hidden />
                  교체
                </Button>
                <Button variant="critical" onClick={() => applyIcon(null)}>
                  <Trash2 size={16} strokeWidth={1.2} aria-hidden />
                  삭제
                </Button>
              </div>
            ) : (
              <Button onClick={() => applyIcon(UPLOADED_ICON)}>
                <Plus size={16} strokeWidth={1.2} aria-hidden />
                아이콘 등록
              </Button>
            )}
          </div>

          {/* 규격 안내 3줄 — 원본 `pimg-help` 문구 그대로다 */}
          <ul className="flex flex-col gap-1">
            {ICON_GUIDE.map((line) => (
              <li key={line} className="body-small text-text-minimal">
                {line}
              </li>
            ))}
          </ul>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            size="large"
            onClick={() => setIconTargetId(null)}
          >
            닫기
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
