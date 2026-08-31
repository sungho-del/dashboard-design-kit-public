import { useState } from "react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  DatePicker,
  FormField,
  Gnb,
  Input,
  PageHeader,
  Radio,
  RadioGroup,
  SegmentedControl,
  Select,
  Switch,
  Textarea,
  TextButton,
  useToast,
  type DateRange,
} from "../components/ui";
import { CATEGORIES, SALE_STATES, won } from "./ProductFormPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "./gnbSections";
import { TEMPLATE_ROUTES } from "./routes";

/* =========================================================================
 * 폼형 화면 템플릿 — 뼈대
 *
 * ## 화면 유형: 폼형
 * 여러 섹션으로 나눈 입력 폼. **검증과 조건부 필드**를 포함한다.
 * 목록·상세가 "보여주는" 화면이라면 이쪽은 "받아 적는" 화면이고,
 * 그래서 이 파일이 실제로 책임지는 건 마크업이 아니라 **연결과 분기**다 —
 * 라벨↔컨트롤 연결, 에러 메시지의 등장·소멸, 조건에 따른 필드 노출.
 *
 * ## ⚠️ 이 유형은 "데이터만 갈아끼우기"가 안 된다 — 솔직히 적어 둔다
 * 목록형은 `ROWS` 를 바꾸면 화면이 바뀌고, 상세형은 `ORDER` 를 바꾸면 화면이 바뀐다.
 * **폼은 필드 목록 자체가 도메인이라 JSX 에 박혀 있고, 데이터로 뺄 수 없다.**
 * 필드마다 상태(`useState`)·검증식·조건부 표시·컨트롤 종류가 전부 다르기 때문이다.
 * 억지로 스키마 배열로 뽑으면 "모든 폼을 표현하는 DSL"을 만들게 되는데,
 * 그건 폼 하나를 손으로 쓰는 것보다 훨씬 비싸고 읽기 어렵다.
 *
 * 그래서 여기서 재사용하는 건 **데이터가 아니라 레이아웃 규칙**이다.
 * `ProductFormPage.data.ts` 로 빠진 건 선택지 목록과 포맷터 같은 "값의 나열"뿐이다.
 * 다른 서비스에 쓸 때는 **필드를 다시 쓰되, 아래 "그대로 두는 것"을 지키면 된다.**
 *
 * ## 갈아끼울 것
 * | 갈아끼울 것            | 위치                                              |
 * | ---------------------- | ------------------------------------------------- |
 * | **필드 정의 전체**      | 이 파일의 JSX — `FormField` + 컨트롤 한 쌍씩       |
 * | 필드 상태              | 컴포넌트 상단의 `useState` 묶음                    |
 * | 검증 규칙              | `nameError` · `salePriceError` (그 아래 주석 참고) |
 * | 카드 5개 섹션 구성      | 각 `Card` + `CardHeader title`                     |
 * | Select·세그먼트 선택지  | `ProductFormPage.data.ts` 의 `CATEGORIES`/`SALE_STATES` |
 * | 저장·임시저장 동작      | `PageHeader` 의 `actions`                          |
 *
 * ## 그대로 두는 것 — **이게 이 파일의 진짜 자산이다** (§29)
 * - **카드 = 섹션.** 필드를 의미 단위로 묶고 제목을 붙인다. 긴 폼일수록 이게 전부다
 * - **간격은 컨테이너가 책임진다.** 페이지는 간격 클래스를 **쓰지 않는다**:
 *     카드 간 24 → `AppShell` 의 `gap-6`
 *     필드 간 20 → `CardBody` 의 `gap-5`
 *     라벨↔입력↔메시지 6 → `FormField` 의 `gap-1.5`
 *   (필드를 `<div className="flex flex-col gap-5">` 로 또 감싸면 간격이 두 번 붙는다)
 * - **`FormField` 의 `group`**: `<label for>` 는 labelable 요소만 가리킨다.
 *   `RadioGroup`·`SegmentedControl` 은 루트가 `<div role="radiogroup">` 이라
 *   `group` 을 빠뜨리면 **접근가능 이름이 아예 안 붙는다** → 그룹 컨트롤엔 항상 `group`
 * - **에러가 도움말을 대체한다**(§29-5). 둘을 동시에 띄우지 않는다 —
 *   같은 자리에 두 줄이 겹치면 레이아웃이 밀리고 시선이 흩어진다.
 *   `FormField` 가 `error` 를 받으면 `description` 을 알아서 감춘다
 * - **컨트롤 병치는 `flex` + `flex-1 min-w-0`**(§29-4). 2열 grid 를 쓰지 않는다.
 *   자식 `Input` 래퍼의 `min-w-60`(240) 때문에 **한 줄에 두 칸이면 488px 이상** 필요하다
 * - **`Switch`·`Checkbox` 는 자체 `label`·`description` 을 쓴다** — 라벨이 컨트롤 옆에
 *   붙는 형태라 `FormField` 의 세로 라벨과 역할이 겹친다.
 *   (`FormField(row)` 로 감싸도 **라벨 중첩 문제는 없다** — 라벨 블록과 컨트롤이 형제로
 *    렌더된다. 다만 그때는 컨트롤 쪽 `label` 을 비워 라벨이 둘이 되지 않게 한다.)
 * - **조건부 필드는 `&&` 로 통째로 붙였다 뗀다** — `hidden` 으로 숨기면 값이 남는다
 * ====================================================================== */

export interface ProductFormPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function ProductFormPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: ProductFormPageProps) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [category, setCategory] = useState("");
  const [saleState, setSaleState] = useState("selling");

  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("");

  const [shipping, setShipping] = useState("free");
  const [period, setPeriod] = useState<DateRange | undefined>();

  // 폼 검증은 두 가지만 — FormField 의 error 가 실제로 동작하는지 보이기 위한 최소 예시
  const nameError =
    nameTouched && name.trim() === "" ? "상품명을 입력해 주세요" : undefined;
  const salePriceError =
    price !== "" &&
    salePrice !== "" &&
    Number(salePrice.replace(/,/g, "")) >= Number(price.replace(/,/g, ""))
      ? "할인가는 판매가보다 낮아야 합니다"
      : undefined;

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
        <PageHeader
          title="상품 등록"
          onBack={() => onNavSelect(TEMPLATE_ROUTES.dashboard)}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => toast("임시저장했습니다")}
              >
                임시저장
              </Button>
              <Button
                onClick={() => {
                  setNameTouched(true);
                  if (name.trim() === "") {
                    toast({
                      message: "입력하지 않은 필수 항목이 있습니다",
                      tone: "critical",
                    });
                    return;
                  }
                  toast("상품을 등록했습니다");
                }}
              >
                등록
              </Button>
            </>
          }
        />
      }
    >
      {/* ── 기본 정보 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="기본 정보" />
        <CardBody>
          <FormField
            label="상품명"
            required
            description="검색 결과와 주문서에 그대로 노출됩니다"
            error={nameError}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="예) 오버핏 코튼 셔츠"
            />
          </FormField>

          <FormField
            label="상품 코드"
            labelDescription="미입력 시 자동으로 생성됩니다"
          >
            <Input placeholder="예) P-2026-0001" />
          </FormField>

          <FormField
            label="카테고리"
            required
            labelAction={
              <TextButton size="small" onClick={() => toast("준비 중입니다")}>
                카테고리 관리
              </TextButton>
            }
          >
            <Select
              options={CATEGORIES}
              value={category}
              onValueChange={setCategory}
              placeholder="카테고리를 선택하세요"
            />
          </FormField>

          {/* SegmentedControl 루트는 `<div role="radiogroup">` 이라 group 이 필요하다 */}
          <FormField label="판매 상태" group>
            <SegmentedControl
              items={SALE_STATES}
              value={saleState}
              onValueChange={setSaleState}
            />
          </FormField>
        </CardBody>
      </Card>

      {/* ── 판매 정보 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="판매 정보" />
        <CardBody>
          {/*
            원본은 폼을 2열 grid 로 짜지 않는다(§29-4). 짧은 컨트롤을 나란히 둘 때는
            래퍼 flex + 각 항목 `flex-1 min-w-0` 을 쓴다 — 원본 `dateWrapper`/`dateItem` 패턴.

            `min-w-0` 은 **FormField 자신**의 flex 자동 최소 크기(min-width:auto)를 없애는 것이다.
            이것만으로 무한히 줄어들지는 않는다 — 자식 `Input` 의 래퍼가 `min-w-60`(240)을
            갖고 있어 **각 칸의 실질 최소 폭이 240** 이고, 따라서 이 병치에는 240×2+8 = **488px**
            이상이 필요하다. 우리 셸(콘텐츠 폭 최소 ~670)에서는 여유가 있다.
          */}
          <div className="flex gap-2">
            <FormField label="판매가" required className="min-w-0 flex-1">
              <Input
                value={price}
                onChange={(e) => setPrice(won(e.target.value))}
                placeholder="0"
                inputMode="numeric"
                rightIcon={
                  <span className="body-medium text-text-sub">원</span>
                }
              />
            </FormField>

            <FormField
              label="할인가"
              className="min-w-0 flex-1"
              error={salePriceError}
            >
              <Input
                value={salePrice}
                onChange={(e) => setSalePrice(won(e.target.value))}
                placeholder="0"
                inputMode="numeric"
                rightIcon={
                  <span className="body-medium text-text-sub">원</span>
                }
              />
            </FormField>
          </div>

          <FormField
            label="재고 수량"
            required
            description="0으로 두면 품절로 표시됩니다"
          >
            <Input
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="0"
              inputMode="numeric"
              rightIcon={<span className="body-medium text-text-sub">개</span>}
            />
          </FormField>

          <Switch
            label="재고 관리 사용"
            description="주문이 들어오면 재고를 자동으로 차감합니다"
            defaultChecked
          />
        </CardBody>
      </Card>

      {/* ── 상세 설명 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="상세 설명" />
        <CardBody>
          <FormField
            label="상품 설명"
            description="상품 상세 페이지 상단에 표시됩니다"
          >
            <Textarea
              minRows={5}
              placeholder="소재, 사이즈, 관리 방법 등을 적어주세요"
            />
          </FormField>

          <FormField
            label="검색 태그"
            labelDescription="쉼표로 구분해 최대 10개까지"
          >
            <Input placeholder="예) 셔츠, 오버핏, 코튼" />
          </FormField>
        </CardBody>
      </Card>

      {/* ── 배송 ────────────────────────────────────────── */}
      <Card>
        <CardHeader title="배송" />
        <CardBody>
          <FormField label="배송비 유형" group>
            <RadioGroup
              value={shipping}
              onValueChange={setShipping}
              orientation="horizontal"
            >
              <Radio value="free" label="무료배송" />
              <Radio value="paid" label="유료배송" />
              <Radio value="conditional" label="조건부 무료" />
            </RadioGroup>
          </FormField>

          {shipping !== "free" && (
            <FormField
              label="배송비"
              required
              description={
                shipping === "conditional"
                  ? "설정한 금액 미만 주문에만 부과됩니다"
                  : undefined
              }
            >
              <Input
                placeholder="0"
                inputMode="numeric"
                rightIcon={
                  <span className="body-medium text-text-sub">원</span>
                }
              />
            </FormField>
          )}

          <Checkbox
            label="묶음배송 사용"
            description="같은 주문의 다른 상품과 함께 배송합니다"
            defaultChecked
          />
        </CardBody>
      </Card>

      {/* ── 노출 설정 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="노출 설정" />
        <CardBody>
          <FormField
            label="판매 기간"
            labelDescription="비워두면 등록 즉시 무기한 판매합니다"
          >
            <DatePicker
              mode="range"
              value={period}
              onChange={setPeriod}
              startPlaceholder="시작일"
              endPlaceholder="종료일"
            />
          </FormField>

          <Switch
            label="상품 진열"
            description="끄면 직접 링크로만 접근할 수 있습니다"
            defaultChecked
          />

          <Checkbox
            label="검색 엔진 노출 허용"
            description="네이버·구글 등 외부 검색에 상품이 노출됩니다"
            defaultChecked
          />
        </CardBody>
      </Card>
    </AppShell>
  );
}
