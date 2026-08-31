import { ArrowDownToLine, Printer } from "lucide-react";
import {
  AppShell,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Gnb,
  InfoItem,
  InfoList,
  PageHeader,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
  Tag,
  useToast,
} from "../components/ui";
import { ORDER, itemsTotal, total, won } from "./OrderDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "./gnbSections";
import { TEMPLATE_ROUTES } from "./routes";

/* =========================================================================
 * 상세형 화면 템플릿 — 뼈대
 *
 * ## 화면 유형: 상세형
 * **한 건의 레코드**를 여러 관점(요약·명세·금액·부가정보)으로 나눠 보여준다.
 * 목록에서 행을 열고 들어오는 화면이고, 편집이 아니라 **확인**이 목적이다.
 * 관점 하나 = 카드 하나 — 그래서 카드 제목만 읽어도 무슨 화면인지 알 수 있다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./OrderDetailPage.data.ts` 에 있다
 *
 * | 갈아끼울 것              | 위치                                             |
 * | ------------------------ | ------------------------------------------------ |
 * | 데이터·금액 포맷·파생 합계 | `OrderDetailPage.data.ts` **전체**              |
 * | 카드 5개의 제목           | 각 `CardHeader` 의 `title`                       |
 * | 라벨:값 항목             | 각 `InfoList` 안의 `InfoItem label`              |
 * | 명세 표 컬럼             | 주문 상품 카드의 `colgroup` + `TableHead` + 셀   |
 * | 금액 항목 구성           | 결제 정보 카드의 `dl` 배열 3줄                   |
 * | 화면 제목·상단 액션       | `PageHeader` 의 `title` · `badges` · `actions`   |
 *
 * 카드 개수도 도메인이다 — 관점이 늘거나 줄면 `Card` 를 더하거나 뺀다.
 * 데이터에 키를 추가한다고 카드가 저절로 생기지는 않는다.
 *
 * ## 그대로 두는 것 (도메인 무관 · §30 실측 규격)
 * - **1열 카드 스택**(§30-4). 2열 grid 를 쓰지 않는다 — 폼(§29-4)의 결정과 같은 이유
 * - **간격을 직접 주지 않는다.** `AppShell` gap-6(카드 24) · `CardBody` gap-5(20) ·
 *   `InfoList` gap-2(항목 8) 가 이미 규격을 준다 → 페이지에 간격 클래스가 없다
 * - `InfoList` 규격(§30-1 실측): padding **16** · 항목 gap **8** · 라벨↔값 **10** ·
 *   라벨 폭 **80** · `surface-sub` 회색 박스. `dl` 을 손으로 짜지 말고 컴포넌트를 쓴다
 * - **금액 내역은 `InfoList` 가 아니다**(§30-5) — 라벨:값이 아니라 **좌우 대비**가 목적이라
 *   `justify-between` 목록으로 따로 짜고, 합계는 `Divider` 아래 `heading-medium-bold`
 * - `labelWidth` 는 **배타 분기**다(§30-3) — 주면 인라인 폭만, 안 주면 `w-20` 만 나온다.
 *   `cn()` 이 클래스를 병합하지 않아 둘 다 방출하면 순서가 승자를 정한다.
 *   기본 80 에 라벨이 안 들어갈 때(대략 6글자 이상)만 쓴다
 * - 상세는 GNB 항목이 아니다 — 부모 메뉴를 활성으로 세우는 `activeId` 분기(아래 주석)
 *
 * > **근거는 `infoList` 실측 3줄뿐이고 페이지 레이아웃 근거는 없다**(§30-4 `[확장]`).
 * > 1열 스택은 Clay 원본이 전부 flex column 인 데서 정한 결정이다.
 * ====================================================================== */

export interface OrderDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function OrderDetailPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: OrderDetailPageProps) {
  const { toast } = useToast();

  return (
    <AppShell
      sidebar={
        <Gnb
          sections={GNB_SECTIONS}
          /*
            `order-detail` 은 GNB 항목 id 가 아니다 — 상세는 메뉴가 아니라 목록의 하위 화면이다.
            그대로 넘기면 매칭에 실패해 **어떤 메뉴도 활성으로 보이지 않는다.**
            부모 메뉴(주문 목록)를 활성으로 표시한다 — 관리자 화면의 일반적 동작.
          */
          activeId={activeNav === "order-detail" ? "order-list" : activeNav}
          onSelect={onNavSelect}
          open={navOpen}
          onOpenChange={onNavOpenChange}
          logo={GNB_LOGO_SLOTS.logo}
          collapsedLogo={GNB_LOGO_SLOTS.collapsed}
        />
      }
      header={
        <PageHeader
          title="주문 상세"
          onBack={() => onNavSelect(TEMPLATE_ROUTES.orders)}
          badges={<Tag tone={ORDER.status.tone}>{ORDER.status.label}</Tag>}
          actions={
            <>
              <Button variant="secondary" onClick={() => toast("인쇄 준비 중")}>
                <Printer size={16} strokeWidth={1.2} aria-hidden />
                거래명세서
              </Button>
              <Button onClick={() => toast("송장번호를 등록했습니다")}>
                <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
                송장 등록
              </Button>
            </>
          }
        />
      }
    >
      {/* ── 주문 정보 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="주문 정보" />
        <CardBody>
          <InfoList>
            <InfoItem label="주문번호">{ORDER.id}</InfoItem>
            <InfoItem label="주문일시">{ORDER.placedAt}</InfoItem>
            <InfoItem label="주문경로">{ORDER.payment.channel}</InfoItem>
            <InfoItem label="주문상태">
              <Tag tone={ORDER.status.tone} size="small">
                {ORDER.status.label}
              </Tag>
            </InfoItem>
          </InfoList>
        </CardBody>
      </Card>

      {/* ── 주문 상품 ───────────────────────────────────── */}
      <Card>
        <CardHeader title={`주문 상품 ${ORDER.items.length}건`} />
        <CardBody>
          <Table>
            <colgroup>
              <col className="w-[44%]" />
              <col className="w-[24%]" />
              <col className="w-[12%]" />
              <col className="w-[20%]" />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableTh>상품명</TableTh>
                <TableTh>옵션</TableTh>
                <TableTh>수량</TableTh>
                <TableTh>금액</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {ORDER.items.map((item) => (
                <TableRow key={item.name}>
                  <TableTd>
                    <span className="line-clamp-1">{item.name}</span>
                  </TableTd>
                  <TableTd>{item.option}</TableTd>
                  <TableTd>{item.qty}개</TableTd>
                  <TableTd>{won(item.price * item.qty)}</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* ── 결제 정보 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="결제 정보" />
        <CardBody>
          <InfoList>
            <InfoItem label="결제수단">{ORDER.payment.method}</InfoItem>
            <InfoItem label="결제일시">{ORDER.payment.approvedAt}</InfoItem>
          </InfoList>

          {/*
            금액 내역. 표가 아니라 목록이므로 §7 의 "셀 좌측 정렬" 규칙 대상이 아니고,
            숫자를 세로로 비교해야 하므로 값을 우측에 붙인다.
          */}
          <dl className="flex flex-col gap-2">
            {[
              ["상품 금액", won(itemsTotal)],
              ["배송비", won(ORDER.shippingFee)],
              ["할인", `-${won(ORDER.discount)}`],
            ].map(([term, value]) => (
              <div key={term} className="flex items-center justify-between">
                <dt className="label-medium text-text-sub">{term}</dt>
                <dd className="label-medium text-text">{value}</dd>
              </div>
            ))}
          </dl>

          <Divider />

          <div className="flex items-center justify-between">
            <span className="label-medium-bold text-text">총 결제금액</span>
            <strong className="heading-medium-bold text-text">
              {won(total)}
            </strong>
          </div>
        </CardBody>
      </Card>

      {/* ── 배송 정보 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="배송 정보" />
        <CardBody>
          {/*
            "배송 메시지"(6글자)가 기본 80px 을 넘으므로 이 블록만 96 으로 넓힌다.
            ⚠️ **한 InfoList 안에서는 폭을 통일한다.** 일부만 넓히면 값 시작선이
            80 과 96 으로 갈려 "라벨 폭을 고정해 값을 세로로 맞춘다"는 이점이 사라진다.
            (`InfoList.stories.tsx` 의 "❌ 항목마다 다른 labelWidth" 와 같은 규칙)
          */}
          <InfoList>
            <InfoItem label="수령인" labelWidth={96}>
              {ORDER.shipping.receiver}
            </InfoItem>
            <InfoItem label="연락처" labelWidth={96}>
              {ORDER.shipping.phone}
            </InfoItem>
            <InfoItem label="주소" labelWidth={96}>
              {ORDER.shipping.address}
            </InfoItem>
            <InfoItem label="배송 메시지" labelWidth={96}>
              {ORDER.shipping.message}
            </InfoItem>
            <InfoItem label="송장번호" labelWidth={96}>
              {ORDER.shipping.courier}
            </InfoItem>
          </InfoList>
        </CardBody>
      </Card>

      {/* ── 주문자 정보 ─────────────────────────────────── */}
      <Card>
        <CardHeader title="주문자 정보" />
        <CardBody>
          <InfoList>
            <InfoItem label="이름">{ORDER.buyer.name}</InfoItem>
            <InfoItem label="연락처">{ORDER.buyer.phone}</InfoItem>
            <InfoItem label="이메일">{ORDER.buyer.email}</InfoItem>
          </InfoList>
        </CardBody>
      </Card>
    </AppShell>
  );
}
