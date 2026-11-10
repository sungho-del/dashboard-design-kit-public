import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  FormField,
  InfoItem,
  InfoList,
  PageHeader,
  Select,
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
import { lastPathSegment, usePathname } from "../../lib/router";
import { CalcBreakdown } from "../babycube/CalcBreakdown";
import { StatusTag } from "./OrderGates";
import {
  BACK_PATH,
  LIST_PATH,
  ORDER_DETAIL_COPY,
  PAY_STATS,
  findPayOrder,
  summaryBlocks,
  unitPathOf,
  unitStatusOf,
  unitsOf,
  won,
} from "./OrderDetailsPage.data";
import type { PayOrder } from "./seed/orders.data";
import { Section, SellerShell, type SellerNavProps } from "./SettleParts";

/* =========================================================================
 * 주문 상세(통합 · SO-ORD-002) — `/order-details/{주문번호}` · 원본 `DETAILS.orderDetail`
 *
 * 주문 상품(처리단위 표 · 상품명 → 처리단위 상세) · 주문 정보(결제상태만 고친다) · 결제 요약(`CalcBreakdown`)
 * 「안내」 구역은 없다(기획 답 2026-11-06 §2 #6 — 본사와 같이 삭제)
 * [목록] … [영수증] [입금확인](입금대기만) [취소] [변경 저장]   ← 주 버튼 하나 맨 오른쪽
 * 퍼블 범위: 결제상태는 이 화면 state 만 · 버튼은 원본 알림 문구만. 도메인 = `./OrderDetailsPage.data.ts`.
 * ====================================================================== */

export function OrderDetailsPage(props: SellerNavProps) {
  const pathname = usePathname();
  const rest = pathname.slice(LIST_PATH.length + 1);
  const o = rest.includes("/")
    ? undefined
    : findPayOrder(lastPathSegment(pathname));
  if (!o) {
    return (
      <SellerShell {...props} header={<PageHeader title="주문 상세(통합)" />}>
        <Card variant="soft">
          <CardBody>
            <EmptyState
              size="page"
              icon={<ShoppingCart strokeWidth={1.2} aria-hidden />}
              title="찾을 수 없는 주문입니다"
              description="주소가 잘못되었거나 없는 주문번호일 수 있습니다."
            >
              <Button
                variant="secondary"
                onClick={() => props.onNavSelect(BACK_PATH)}
              >
                주문 통합 관리로
              </Button>
            </EmptyState>
          </CardBody>
        </Card>
      </SellerShell>
    );
  }
  return <OrderDetailsBody key={o.no} o={o} {...props} />;
}

function OrderDetailsBody({ o, ...props }: SellerNavProps & { o: PayOrder }) {
  const { toast } = useToast();
  const [payStat, setPayStat] = useState(o.payStat);
  const us = unitsOf(o.no);
  const toList = () => props.onNavSelect(BACK_PATH);

  return (
    <SellerShell
      {...props}
      header={
        <PageHeader
          title="주문 상세(통합)"
          description={`${o.no} · ${o.mem} · ${o.paidAt} · ${o.method} · 상품 ${us.length}건`}
          badges={<StatusTag status={o.payStat} />}
        />
      }
    >
      <Section title={ORDER_DETAIL_COPY.unitsTitle}>
        <div className="overflow-x-auto">
          <Table>
            <colgroup>
              <col />
              <col className="w-20" />
              <col className="w-20" />
              <col className="w-32" />
              <col className="w-20" />
              <col className="w-32" />
              <col className="w-32" />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableTh>상품</TableTh>
                <TableTh align="center">담당</TableTh>
                <TableTh align="center">유형</TableTh>
                <TableTh>셀러</TableTh>
                <TableTh>수량</TableTh>
                <TableTh>금액</TableTh>
                <TableTh align="center">상태</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {us.map((u) => (
                <TableRow
                  key={u.id}
                  clickable
                  onClick={() => props.onNavSelect(unitPathOf(u))}
                >
                  <TableTd>
                    <TextButton
                      onClick={() => props.onNavSelect(unitPathOf(u))}
                    >
                      {u.prod}
                    </TextButton>
                  </TableTd>
                  <TableTd align="center">
                    <Tag size="small">{u.owner}</Tag>
                  </TableTd>
                  <TableTd align="center">
                    <Tag size="small">{u.type}</Tag>
                  </TableTd>
                  <TableTd>{u.seller}</TableTd>
                  <TableTd className="tabular-nums">{u.qty}개</TableTd>
                  <TableTd className="tabular-nums">{won(u.amt)}</TableTd>
                  <TableTd align="center">
                    <StatusTag status={unitStatusOf(u)} />
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="주문 정보">
        <InfoList>
          <InfoItem label="주문번호" labelWidth={120}>
            <span className="body-medium-bold">{o.no}</span>
          </InfoItem>
          <InfoItem label="회원" labelWidth={120}>
            {o.mem}
          </InfoItem>
          <InfoItem label="결제일시" labelWidth={120}>
            {o.paidAt}
          </InfoItem>
          <InfoItem label="결제수단" labelWidth={120}>
            {o.method}
          </InfoItem>
        </InfoList>
        <FormField label="결제상태" required>
          <Select
            className="w-40"
            options={PAY_STATS}
            value={payStat}
            onValueChange={setPayStat}
          />
        </FormField>
      </Section>

      <Section title="결제 요약">
        <CalcBreakdown blocks={summaryBlocks(o)} />
      </Section>

      <Card variant="soft" className="sticky bottom-6 z-10">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={toList}>
            목록
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => toast(ORDER_DETAIL_COPY.receipt(o.no))}
            >
              영수증
            </Button>
            {o.payStat === "입금대기" && (
              <Button
                variant="secondary"
                onClick={() => toast(ORDER_DETAIL_COPY.deposit(o.no))}
              >
                입금확인
              </Button>
            )}
            <Button variant="secondary" onClick={toList}>
              취소
            </Button>
            <Button onClick={() => toast(ORDER_DETAIL_COPY.saved)}>
              변경 저장
            </Button>
          </div>
        </div>
      </Card>
    </SellerShell>
  );
}
