import { useState } from "react";
import { asStatus, dimWhile, isBusy } from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Plus,
  RefreshCw,
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
import { cn } from "../../lib/cn";
import {
  CATEGORIES,
  DEFAULT_DOMAIN,
  DELETE_NOTICE,
  DELETE_WARNING,
  DOMAIN_TABS,
  DUPLICATE_ERROR,
  EMPTY_DESCRIPTION,
  EMPTY_TITLE,
  ICON_GUIDE,
  ICON_REMOVED,
  ICON_SAVED,
  LEVEL_META,
  MOVED_MESSAGE,
  NAME_ERROR,
  addedChildMessage,
  addedRootMessage,
  canAddChild,
  count,
  deleteBlockReasonOf,
  deletedMessage,
  domainLabel,
  isDuplicateName,
  isFirstSibling,
  isLastSibling,
  productCountsOf,
  renamedMessage,
  type Category,
  type CategoryDomain,
  type CategoryLevel,
} from "./CategoryListPage.data";
import { PRODUCTS } from "./ProductListPage.data";
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
 * | 상품수 계산·삭제 가드 | `.data.ts` 의 `productCountsOf`·`deleteBlockReasonOf` |
 * | 행 액션               | `관리` 셀의 버튼 5개 (행 [삭제]는 `criticalTonal`, 확인 창만 `critical` · 소분류는 [+ 하위] 자리를 비워 세로줄을 맞춘다) |
 *
 * ## 트리가 **둘**이라는 것이 이 화면의 첫 사실이다
 * 원본이 `categoryApi.tree("렌트" | "판매")` 로 아예 다른 트리를 받아 오고,
 * 화면 위 칩으로 그 둘을 오간다. 데이터는 **한 배열**(두 트리를 이어 붙인 것)이고
 * 화면은 `domain` 으로 잘라 본다 — ▲▼ 잠금·이름 중복 판정도 `domain` 을 함께 본다.
 *
 * ## 편집은 알림만 띄운다 (퍼블 범위 · 2026-10-19 사용자 결정)
 * 원본은 저장 버튼 없이 즉시 반영하는 화면이지만, 처리 결과로 데이터를 바꾸는 것은
 * 개발 영역이다(상품 승인·반려, 상품 이미지 업로드와 같은 기준). 그래서
 * - 이름 입력·검증(빈 이름·중복·그대로)은 화면에서 하고, 확정하면 **알림만**
 * - 삭제는 막히면 **창 없이** 이유 알림(원본 UI-325), 빈 카테고리만 확인 창 → 알림
 * - ▲▼·아이콘 등록/교체/삭제도 알림만. 아이콘 창은 처리 뒤에도 열려 있다(원본)
 * 표·`CATEGORIES`·상품 데이터는 바뀌지 않는다 — 실 API 를 붙이면 그 자리에서 다시 받는다.
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
 * 등록 상품수 — **상품 목록과 같은 샘플**에서 센다(하위 포함 합계).
 * 표와 삭제 가드가 이 한 결과를 같이 쓴다. 상품 데이터가 `.data.ts` 를 import 하므로
 * 계산은 순환이 없는 이 뼈대에서 묶는다.
 */
const PRODUCT_COUNTS = productCountsOf(CATEGORIES, PRODUCTS);
const productCountOf = (category: Category) =>
  PRODUCT_COUNTS.get(category.id) ?? 0;

/**
 * 열 폭의 **정본**. 표와 로딩 뼈대가 **같은 것을 쓴다** — 폭을 두 번 적으면
 * 로딩이 끝나는 순간 열이 밀린다. table-fixed 라 폭 지정 필수(합 100%).
 */
const COLGROUP = (
  <colgroup>
    <col className="w-20" />
    <col className="w-12" />
    <col className="w-33" />
    <col className="w-20" />
    <col className="w-58" />
  </colgroup>
);

/** 로딩 자리의 셀 폭 */
const SKELETON_WIDTHS = ["w-12", "w-8", "w-24", "w-10", "w-40"];

/**
 * 로딩 뼈대. **헤더는 실제 글자 그대로** 두고 본문만 가린다(§D8-1).
 * 트리라 행 수가 들쭉날쭉하지만, 뼈대는 **렌트 대분류 수(8)** 에 맞춰 둔다.
 */
const loadingTable = (
  <Table>
    {COLGROUP}
    <TableHead>
      <TableRow>
        <TableTh align="center">단계</TableTh>
        <TableTh>아이콘</TableTh>
        <TableTh>카테고리</TableTh>
        <TableTh>등록 상품수</TableTh>
        <TableTh>관리</TableTh>
      </TableRow>
    </TableHead>
    <TableBody>
      {Array.from({ length: 8 }, (_, row) => (
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

  const [domain, setDomain] = useState<CategoryDomain>(DEFAULT_DOMAIN);

  /*
    실 API 를 붙이면 이 한 줄을 fetch 상태로 바꾼다 — 지금은 `?preview=` 로 미리 본다
    (`/categories?preview=loading` · `empty` · `refreshing`).
  */
  const status = asStatus(useSearchParams().get("preview"));

  const [nameTarget, setNameTarget] = useState<NameTarget | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [iconTarget, setIconTarget] = useState<Category | null>(null);

  /* 화면은 지금 보고 있는 트리만 그린다 — 데이터는 두 트리를 이어 붙인 한 배열이다 */
  const rows = CATEGORIES;
  const visible = rows.filter((category) => category.domain === domain);
  const IconPreview = iconTarget?.icon ?? null;

  const openName = (target: NameTarget) => {
    setNameTarget(target);
    setNameValue(target.mode === "rename" ? target.category.name : "");
    setNameTouched(false);
  };

  const closeName = () => {
    setNameTarget(null);
    setNameValue("");
    setNameTouched(false);
  };

  /* 오류는 [저장]을 한 번 누른 뒤부터 입력에 따라 바뀐다 */
  const name = nameValue.trim();
  const nameProblem =
    name === ""
      ? NAME_ERROR
      : isDuplicateName(
            rows,
            domain,
            name,
            nameTarget?.mode === "rename" ? nameTarget.category.id : undefined,
          )
        ? DUPLICATE_ERROR
        : undefined;

  const submitName = () => {
    if (nameTarget === null) return;
    /* 이름을 그대로 두고 저장하면 아무 일 없이 닫는다(원본 `v===name`) */
    if (nameTarget.mode === "rename" && name === nameTarget.category.name) {
      closeName();
      return;
    }
    setNameTouched(true);
    if (nameProblem) return;

    toast(
      nameTarget.mode === "root"
        ? addedRootMessage(name)
        : nameTarget.mode === "child"
          ? addedChildMessage(nameTarget.parent.name, name)
          : renamedMessage(nameTarget.category.name, name),
    );
    closeName();
  };

  /** 막히면 창을 열지 않고 이유만 알린다 — 빈 카테고리만 확인 창으로 간다(원본 UI-325) */
  const requestDelete = (category: Category) => {
    const reason = deleteBlockReasonOf(
      rows,
      category,
      productCountOf(category),
    );
    if (reason) toast(reason);
    else setDeleteTarget(category);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    toast(deletedMessage(deleteTarget.name));
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
      header={<PageHeader title="카테고리 관리" />}
    >
      <DataTableShell
        /* 다른 목록 화면과 같은 층(§Card soft) */
        variant="soft"
        /* 트리가 짧을 때 표 아래가 페이지 회색으로 비지 않게 남는 높이를 흡수한다 */
        fill
        className="flex-1"
        bodyClassName={dimWhile(status)}
        aria-busy={isBusy(status)}
        isLoading={status === "loading"}
        loading={loadingTable}
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
          <Button onClick={() => openName({ mode: "root" })}>
            <Plus size={16} strokeWidth={1.2} aria-hidden />
            {domainLabel(domain)} 대분류 추가
          </Button>
        }
        isEmpty={status === "empty" || visible.length === 0}
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
          {COLGROUP}
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
                      onClick={() => setIconTarget(category)}
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
                        "inline-block body-medium-bold",
                        LEVEL_INDENT[category.level],
                      )}
                    >
                      {/* 계층은 단계 배지가 말한다 — 가지 기호는 눈으로만 읽는다 */}
                      {category.parentId !== null && (
                        <span aria-hidden className="text-text-minimal">
                          {"└ "}
                        </span>
                      )}
                      {category.name}
                    </span>
                  </TableTd>
                  {/* 수치는 **등폭**이다(§D6-2) — 자릿수가 세로로 맞아야 비교된다 */}
                  <TableTd className="tabular-nums">
                    {count(productCountOf(category))}
                  </TableTd>
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
                        onClick={() => toast(MOVED_MESSAGE)}
                        icon={<ChevronUp strokeWidth={1.2} aria-hidden />}
                      />
                      <IconButton
                        size="small"
                        variant="secondary"
                        label={`${category.name} 아래로`}
                        disabled={isLastSibling(rows, category)}
                        onClick={() => toast(MOVED_MESSAGE)}
                        icon={<ChevronDown strokeWidth={1.2} aria-hidden />}
                      />
                      {/*
                        소분류(3단계)가 마지막이라 그 아래로는 만들 수 없다. 그래도 **자리는 남긴다** —
                        빠지면 [이름변경][삭제]가 64px 당겨져 행마다 같은 버튼이 다른 세로줄에 선다.
                        같은 버튼을 보이지 않게(`invisible`) 두어 폭을 맞추고, 읽기·포커스에서는 뺀다
                      */}
                      {canAddChild(category) ? (
                        <Button
                          size="small"
                          variant="secondary"
                          aria-label={`${category.name} 하위 추가`}
                          onClick={() =>
                            openName({ mode: "child", parent: category })
                          }
                        >
                          + 하위
                        </Button>
                      ) : (
                        <span aria-hidden className="invisible">
                          <Button size="small" variant="secondary" disabled>
                            + 하위
                          </Button>
                        </span>
                      )}
                      <Button
                        size="small"
                        variant="secondary"
                        aria-label={`${category.name} 이름변경`}
                        onClick={() => openName({ mode: "rename", category })}
                      >
                        이름변경
                      </Button>
                      <Button
                        size="small"
                        variant="criticalTonal"
                        aria-label={`${category.name} 삭제`}
                        onClick={() => requestDelete(category)}
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
            error={nameTouched ? nameProblem : undefined}
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

      {/* 카테고리 삭제 확인 — 빈 카테고리만 여기까지 온다 */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        size="small"
      >
        <ModalHeader closeLabel="대화상자 닫기" title="카테고리 삭제" />
        <ModalBody>
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

      {/*
        아이콘 관리 — 이 모달 자체가 "확대 미리보기"다(원본의 확대 버튼은 두지 않는다).
        등록·교체·삭제는 알림만 띄우고 창은 그대로 둔다(원본도 처리 뒤 닫지 않는다)
      */}
      <Modal
        open={iconTarget !== null}
        onClose={() => setIconTarget(null)}
        size="small"
      >
        <ModalHeader
          closeLabel="대화상자 닫기"
          title={`카테고리 아이콘 · ${iconTarget?.name ?? ""}`}
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
                <Button variant="secondary" onClick={() => toast(ICON_SAVED)}>
                  <RefreshCw size={16} strokeWidth={1.2} aria-hidden />
                  교체
                </Button>
                <Button variant="critical" onClick={() => toast(ICON_REMOVED)}>
                  <Trash2 size={16} strokeWidth={1.2} aria-hidden />
                  삭제
                </Button>
              </div>
            ) : (
              <Button onClick={() => toast(ICON_SAVED)}>
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
            onClick={() => setIconTarget(null)}
          >
            닫기
          </Button>
        </ModalFooter>
      </Modal>
    </AppShell>
  );
}
