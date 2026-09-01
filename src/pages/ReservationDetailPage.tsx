import { CalendarPlus, Printer } from "lucide-react";
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
import {
  RESERVATION,
  itemsTotal,
  total,
  won,
} from "./ReservationDetailPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "./gnbSections";
import { CHARTON_ROUTES } from "./routes";

/* =========================================================================
 * 예약 상세 (S02) — 상세형
 *
 * ## 화면 유형: 상세형
 * **예약 한 건**을 다섯 관점(예약·환자·진료 항목·수납·담당의)으로 나눠 보여준다.
 * 예약 목록에서 행을 열고 들어오는 화면이고, 편집이 아니라 **확인**이 목적이다.
 * 관점 하나 = 카드 하나 — 카드 제목만 읽어도 무슨 화면인지 알 수 있다.
 *
 * ## 이 화면을 따로 만든 이유 (목록의 미리보기 모달로 대신할 수 없다)
 * 예약 목록의 미리보기 모달은 `InfoList` **4항목짜리 미리보기**다.
 * **진료 항목 명세 표**와 **수납 내역(금액 내역 §30-5)** 은 미리보기 모달 폭에 들어가지 않아,
 * 이 화면이 없으면 두 블록이 **어디에도 존재하지 않게 된다.**
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./ReservationDetailPage.data.ts` 에 있다
 *
 * | 갈아끼울 것                | 위치                                                |
 * | -------------------------- | --------------------------------------------------- |
 * | 데이터·금액 포맷·파생 합계 | `ReservationDetailPage.data.ts` **전체**            |
 * | 카드 5개의 제목            | 각 `CardHeader` 의 `title`                          |
 * | 라벨:값 항목               | 각 `InfoList` 안의 `InfoItem label`                 |
 * | 명세 표 컬럼               | 진료 항목 카드의 `colgroup` + `TableHead` + 셀      |
 * | 금액 항목 구성             | 수납 내역 카드의 `dl` 배열 3줄                      |
 * | 화면 제목·상단 액션        | `PageHeader` 의 `title` · `badges` · `actions`      |
 *
 * ## 그대로 두는 것 (도메인 무관 · §30 실측 규격)
 * - **1열 카드 스택**(§30-4). 2열 grid 를 쓰지 않는다
 * - **간격을 직접 주지 않는다.** `AppShell` gap-6 · `CardBody` gap-5 · `InfoList` gap-2 가
 *   이미 규격을 준다 → 이 페이지에 간격 클래스가 없다
 * - **금액 내역은 `InfoList` 가 아니다**(§30-5) — 좌우 대비가 목적이라 `justify-between`
 *   목록으로 따로 짜고, 합계는 `Divider` 아래 `heading-medium-bold`
 * - `labelWidth` 는 **배타 분기**다(§30-3) — 주면 인라인 폭만, 안 주면 `w-20` 만 나온다.
 *   **한 `InfoList` 블록 안에서는 값을 통일한다.** 일부만 넓히면 값 시작선이 갈린다.
 *   여기서는 "보호자 연락처"(7글자) 때문에 **환자 정보 카드만** 96 을 쓴다 —
 *   나머지 세 블록은 라벨이 전부 5글자 이하라 기본값(80)을 **아예 주지 않는다**
 * - 상세는 GNB 항목이 아니다 — 부모 메뉴를 활성으로 세우는 `activeId` 분기(아래 주석)
 * ====================================================================== */

export interface ReservationDetailPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function ReservationDetailPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: ReservationDetailPageProps) {
  const { toast } = useToast();

  return (
    <AppShell
      sidebar={
        <Gnb
          sections={GNB_SECTIONS}
          /*
            `reservation-detail` 은 GNB 항목 id 가 아니다 — 상세는 메뉴가 아니라
            목록의 하위 화면이다. 그대로 넘기면 매칭에 실패해 **어떤 메뉴도 활성으로
            보이지 않는다.** 부모 메뉴(예약 목록)를 활성으로 표시한다.
          */
          activeId={
            activeNav === "reservation-detail" ? "reservation-list" : activeNav
          }
          onSelect={onNavSelect}
          open={navOpen}
          onOpenChange={onNavOpenChange}
          logo={GNB_LOGO_SLOTS.logo}
          collapsedLogo={GNB_LOGO_SLOTS.collapsed}
        />
      }
      header={
        <PageHeader
          title="예약 상세"
          onBack={() => onNavSelect(CHARTON_ROUTES.reservations)}
          badges={
            <Tag tone={RESERVATION.status.tone}>{RESERVATION.status.label}</Tag>
          }
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => toast("진료확인서를 인쇄합니다")}
              >
                <Printer size={16} strokeWidth={1.2} aria-hidden />
                진료확인서
              </Button>
              <Button onClick={() => toast("다음 예약을 등록했습니다")}>
                <CalendarPlus size={16} strokeWidth={1.2} aria-hidden />
                다음 예약 잡기
              </Button>
            </>
          }
        />
      }
    >
      {/* ── 예약 정보 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="예약 정보" />
        <CardBody>
          <InfoList>
            <InfoItem label="예약번호">{RESERVATION.id}</InfoItem>
            <InfoItem label="예약일시">{RESERVATION.reservedAt}</InfoItem>
            <InfoItem label="접수경로">{RESERVATION.channel}</InfoItem>
            <InfoItem label="예약상태">
              <Tag tone={RESERVATION.status.tone} size="small">
                {RESERVATION.status.label}
              </Tag>
            </InfoItem>
          </InfoList>
        </CardBody>
      </Card>

      {/* ── 환자 정보 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="환자 정보" />
        <CardBody>
          {/*
            "보호자 연락처"(7글자)가 기본 80px 을 넘으므로 이 블록만 96 으로 넓힌다.
            ⚠️ **한 InfoList 안에서는 폭을 통일한다.** 일부만 넓히면 값 시작선이
            80 과 96 으로 갈려 "라벨 폭을 고정해 값을 세로로 맞춘다"는 이점이 사라진다.
          */}
          <InfoList>
            <InfoItem label="환자번호" labelWidth={96}>
              {RESERVATION.patient.chartNo}
            </InfoItem>
            <InfoItem label="이름" labelWidth={96}>
              {RESERVATION.patient.name}
            </InfoItem>
            <InfoItem label="생년월일" labelWidth={96}>
              {RESERVATION.patient.birth}
            </InfoItem>
            <InfoItem label="연락처" labelWidth={96}>
              {RESERVATION.patient.phone}
            </InfoItem>
            <InfoItem label="보호자 연락처" labelWidth={96}>
              {RESERVATION.patient.guardianPhone}
            </InfoItem>
            <InfoItem label="보험 유형" labelWidth={96}>
              {RESERVATION.patient.insurance}
            </InfoItem>
          </InfoList>
        </CardBody>
      </Card>

      {/* ── 진료 항목 ───────────────────────────────────── */}
      <Card>
        <CardHeader title={`진료 항목 ${RESERVATION.items.length}건`} />
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
                <TableTh>항목</TableTh>
                <TableTh>구분</TableTh>
                <TableTh>수량</TableTh>
                <TableTh>금액</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {RESERVATION.items.map((item) => (
                <TableRow key={item.name}>
                  <TableTd>
                    <span className="line-clamp-1">{item.name}</span>
                  </TableTd>
                  <TableTd>{item.category}</TableTd>
                  <TableTd>{item.qty}회</TableTd>
                  <TableTd>{won(item.price * item.qty)}</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* ── 수납 내역 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="수납 내역" />
        <CardBody>
          <InfoList>
            <InfoItem label="수납수단">{RESERVATION.payment.method}</InfoItem>
            <InfoItem label="수납일시">{RESERVATION.payment.paidAt}</InfoItem>
          </InfoList>

          {/*
            금액 내역. 표가 아니라 목록이므로 §7 의 "셀 좌측 정렬" 규칙 대상이 아니고,
            숫자를 세로로 비교해야 하므로 값을 우측에 붙인다.
          */}
          <dl className="flex flex-col gap-2">
            {[
              ["진료 항목 합계", won(itemsTotal)],
              ["제증명 수수료", won(RESERVATION.certFee)],
              ["건강보험 공제", `-${won(RESERVATION.insuranceCover)}`],
            ].map(([term, value]) => (
              <div key={term} className="flex items-center justify-between">
                <dt className="label-medium text-text-sub">{term}</dt>
                <dd className="label-medium text-text">{value}</dd>
              </div>
            ))}
          </dl>

          <Divider />

          <div className="flex items-center justify-between">
            <span className="label-medium-bold text-text">총 수납금액</span>
            <strong className="heading-medium-bold text-text">
              {won(total)}
            </strong>
          </div>
        </CardBody>
      </Card>

      {/* ── 담당의 정보 ─────────────────────────────────── */}
      <Card>
        <CardHeader title="담당의 정보" />
        <CardBody>
          <InfoList>
            <InfoItem label="담당의">{RESERVATION.doctor.name}</InfoItem>
            <InfoItem label="진료과">{RESERVATION.doctor.department}</InfoItem>
            <InfoItem label="진료실">{RESERVATION.doctor.room}</InfoItem>
            <InfoItem label="다음 예약">
              {RESERVATION.doctor.nextVisit}
            </InfoItem>
          </InfoList>
        </CardBody>
      </Card>
    </AppShell>
  );
}
