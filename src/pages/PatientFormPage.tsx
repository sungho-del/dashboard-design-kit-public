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
import {
  INSURANCE_TYPES,
  PATIENT_TYPES,
  phone,
  phoneDigits,
} from "./PatientFormPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "./gnbSections";
import { CHARTON_ROUTES } from "./routes";

/* =========================================================================
 * 환자 등록 (S04) — 폼형
 *
 * ## 화면 유형: 폼형
 * 신규 환자의 인적사항·연락처·보험·동의 항목을 받아 적는다.
 * 목록·상세가 "보여주는" 화면이라면 이쪽은 "받아 적는" 화면이고,
 * 그래서 이 파일이 실제로 책임지는 건 마크업이 아니라 **연결과 분기**다 —
 * 라벨↔컨트롤 연결, 에러 메시지의 등장·소멸, 조건에 따른 필드 노출.
 *
 * ## ⚠️ 이 유형은 "데이터만 갈아끼우기"가 안 된다
 * 아래 필드 18개는 템플릿(`ProductFormPage`)에서 **복사한 것이 아니라 새로 쓴 것**이다.
 * 필드마다 상태(`useState`)·검증식·조건부 표시·컨트롤 종류가 전부 다르기 때문에
 * 데이터로 뺄 수 없다. `PatientFormPage.data.ts` 로 빠진 건 선택지 2개와 포맷터뿐이다.
 *
 * **템플릿에서 상속한 것은 데이터가 아니라 레이아웃 규칙 6가지다** (§3-4) —
 * 아래 "그대로 두는 것" 항목이 그것이고, 이 화면의 진짜 자산이다.
 *
 * ## 갈아끼울 것
 * | 갈아끼울 것              | 위치                                                  |
 * | ------------------------ | ----------------------------------------------------- |
 * | **필드 정의 전체**       | 이 파일의 JSX — `FormField` + 컨트롤 한 쌍씩          |
 * | 필드 상태                | 컴포넌트 상단의 `useState` 묶음                       |
 * | 검증 규칙                | `nameError` · `birthError` · `mobileError` · `…`      |
 * | 카드 5개 섹션 구성       | 각 `Card` + `CardHeader title`                        |
 * | Select·세그먼트 선택지   | `PatientFormPage.data.ts` 의 `INSURANCE_TYPES` 등     |
 * | 임시저장·등록 동작       | `PageHeader` 의 `actions`                             |
 *
 * ## 그대로 두는 것 — 템플릿에서 상속한 레이아웃 규칙 (§29)
 * - **카드 = 섹션.** 기획서 sections 5개가 그대로 카드 5개다
 * - **간격은 컨테이너가 책임진다.** 이 페이지에 간격 클래스가 **없다**:
 *     카드 간 24 → `AppShell` 의 `gap-6`
 *     필드 간 20 → `CardBody` 의 `gap-5` (진료 동의 카드의 Checkbox 3개도 이걸 받는다)
 *     라벨↔입력↔메시지 6 → `FormField` 의 `gap-1.5`
 * - **`FormField` 의 `group`**: `RadioGroup`(성별)·`SegmentedControl`(환자 구분)은
 *   루트가 `<div role="radiogroup">` 이라 `group` 을 빠뜨리면 **접근가능 이름이 아예 안 붙는다**
 * - **에러가 도움말을 대체한다**(§29-5) — `FormField` 가 `error` 를 받으면 `description` 을 감춘다
 * - **컨트롤 병치는 `flex` + `flex-1 min-w-0`**(§29-4). 2열 grid 를 쓰지 않는다
 * - **`Switch`·`Checkbox` 는 자체 `label`·`description` 을 쓴다** — `FormField` 로 감싸지 않는다
 * - **조건부 필드는 `&&` 로 통째로 붙였다 뗀다** — `hidden` 으로 숨기면 값이 남는다
 * ====================================================================== */

export interface PatientFormPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function PatientFormPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: PatientFormPageProps) {
  const { toast } = useToast();

  /* 기본 정보 */
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [patientType, setPatientType] = useState("new");
  const [birth, setBirth] = useState<Date | undefined>();
  const [gender, setGender] = useState("");

  /* 연락처 */
  const [mobile, setMobile] = useState("");
  const [mobileTouched, setMobileTouched] = useState(false);
  const [guardian, setGuardian] = useState("");

  /* 보험 정보 */
  const [insurance, setInsurance] = useState("");
  const [insuranceNo, setInsuranceNo] = useState("");
  const [insuranceNoTouched, setInsuranceNoTouched] = useState(false);

  /* 진료 동의 */
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeSensitive, setAgreeSensitive] = useState(false);
  const [consentPeriod, setConsentPeriod] = useState<DateRange | undefined>();

  /** 등록을 한 번이라도 눌렀는가 — blur 가 없는 컨트롤(DatePicker·RadioGroup)의 에러 시점 */
  const [submitted, setSubmitted] = useState(false);

  /*
   * 검증. 폼 단위라 필드 하나만 봐서는 판단할 수 없는 것이 섞여 있다 —
   * 증번호는 **보험 유형과의 상호 비교**이고(비급여면 필드 자체가 없다),
   * 동의 두 건은 **버튼을 누르는 순간**에만 본다(체크박스 옆에 빨간 글씨를 상주시키지 않는다).
   */
  const nameError =
    nameTouched && name.trim() === "" ? "환자명을 입력해 주세요" : undefined;

  const birthError =
    submitted && !birth ? "생년월일을 선택해 주세요" : undefined;

  const genderError =
    submitted && gender === "" ? "성별을 선택해 주세요" : undefined;

  const mobileDigitCount = phoneDigits(mobile).length;
  const mobileError = !mobileTouched
    ? undefined
    : mobile.trim() === ""
      ? "휴대전화 번호를 입력해 주세요"
      : mobileDigitCount < 10
        ? "휴대전화 번호를 자릿수에 맞게 입력해 주세요"
        : undefined;

  /** 비급여 환자는 증번호가 존재하지 않는다 — 필드 자체를 붙였다 뗀다 */
  const needsInsuranceNo = insurance !== "" && insurance !== "self";
  const insuranceNoError =
    needsInsuranceNo && insuranceNoTouched && insuranceNo.trim() === ""
      ? "선택한 보험 유형에는 증번호가 필요합니다"
      : undefined;

  const submit = () => {
    setSubmitted(true);
    setNameTouched(true);
    setMobileTouched(true);
    setInsuranceNoTouched(true);

    const missingRequired =
      name.trim() === "" ||
      !birth ||
      gender === "" ||
      mobileDigitCount < 10 ||
      (needsInsuranceNo && insuranceNo.trim() === "");

    if (missingRequired) {
      toast({
        message: "입력하지 않은 필수 항목이 있습니다",
        tone: "critical",
      });
      return;
    }

    if (!agreePrivacy || !agreeSensitive) {
      toast({
        message: "필수 동의 두 건에 모두 동의해야 등록할 수 있습니다",
        tone: "critical",
      });
      return;
    }

    toast("환자를 등록했습니다");
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
      header={
        <PageHeader
          title="환자 등록"
          onBack={() => onNavSelect(CHARTON_ROUTES.reservations)}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => toast("임시저장했습니다")}
              >
                임시저장
              </Button>
              <Button onClick={submit}>등록</Button>
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
            label="환자명"
            required
            description="신분증에 적힌 이름과 동일하게 입력합니다"
            error={nameError}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="예) 최유나"
            />
          </FormField>

          <FormField
            label="환자번호"
            labelDescription="미입력 시 자동으로 생성됩니다"
          >
            <Input placeholder="예) P-2026-0001" />
          </FormField>

          {/* SegmentedControl 루트는 `<div role="radiogroup">` 이라 group 이 필요하다 */}
          <FormField label="환자 구분" group>
            <SegmentedControl
              items={PATIENT_TYPES}
              value={patientType}
              onValueChange={setPatientType}
            />
          </FormField>

          <FormField label="생년월일" required error={birthError}>
            <DatePicker
              value={birth}
              onChange={setBirth}
              placeholder="생년월일 선택"
            />
          </FormField>

          {/* RadioGroup 도 루트가 `<div role="radiogroup">` — group 필수 */}
          <FormField label="성별" required group error={genderError}>
            <RadioGroup
              value={gender}
              onValueChange={setGender}
              orientation="horizontal"
            >
              <Radio value="male" label="남" />
              <Radio value="female" label="여" />
            </RadioGroup>
          </FormField>
        </CardBody>
      </Card>

      {/* ── 연락처 ──────────────────────────────────────── */}
      <Card>
        <CardHeader title="연락처" />
        <CardBody>
          {/*
            원본은 폼을 2열 grid 로 짜지 않는다(§29-4). 짧은 컨트롤을 나란히 둘 때는
            래퍼 flex + 각 항목 `flex-1 min-w-0` 을 쓴다.
            `Input` 래퍼의 `min-w-60`(240) 때문에 이 병치에는 240×2+8 = **488px** 이상이 필요하다.
          */}
          <div className="flex gap-2">
            <FormField
              label="휴대전화"
              required
              className="min-w-0 flex-1"
              description="예약 확정·리마인드 안내를 이 번호로 보냅니다"
              error={mobileError}
            >
              <Input
                value={mobile}
                onChange={(e) => setMobile(phone(e.target.value))}
                onBlur={() => setMobileTouched(true)}
                placeholder="010-0000-0000"
                inputMode="numeric"
              />
            </FormField>

            <FormField
              label="보호자 연락처"
              className="min-w-0 flex-1"
              description="미성년·고령 환자는 입력을 권장합니다"
            >
              <Input
                value={guardian}
                onChange={(e) => setGuardian(phone(e.target.value))}
                placeholder="010-0000-0000"
                inputMode="numeric"
              />
            </FormField>
          </div>

          <FormField label="주소">
            <Input placeholder="예) 서울특별시 성동구 왕십리로 100" />
          </FormField>

          {/* Switch 는 자체 label·description 을 쓴다 — FormField 로 감싸지 않는다 */}
          <Switch
            label="예약 안내 문자 수신"
            description="예약 확정·전날 리마인드 문자를 보냅니다"
            defaultChecked
          />
        </CardBody>
      </Card>

      {/* ── 보험 정보 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="보험 정보" />
        <CardBody>
          <FormField
            label="보험 유형"
            required
            labelAction={
              <TextButton
                size="small"
                onClick={() => toast("보험 자격 조회는 준비 중입니다")}
              >
                보험 자격 조회
              </TextButton>
            }
          >
            <Select
              options={INSURANCE_TYPES}
              value={insurance}
              onValueChange={setInsurance}
              placeholder="보험 유형을 선택하세요"
            />
          </FormField>

          {/* 비급여 환자는 증번호가 없다 — 필드를 통째로 붙였다 뗀다 */}
          {needsInsuranceNo && (
            <FormField
              label="증번호"
              required
              description={
                insurance === "medicaid"
                  ? "의료급여는 종별(1종·2종)을 함께 적습니다"
                  : undefined
              }
              error={insuranceNoError}
            >
              <Input
                value={insuranceNo}
                onChange={(e) => setInsuranceNo(e.target.value)}
                onBlur={() => setInsuranceNoTouched(true)}
                placeholder="예) 1-2345678901"
              />
            </FormField>
          )}

          <Checkbox
            label="산정특례 대상"
            description="등록번호가 있으면 본인부담률이 달라집니다"
          />
        </CardBody>
      </Card>

      {/* ── 진료 동의 ───────────────────────────────────── */}
      <Card>
        <CardHeader title="진료 동의" />
        <CardBody>
          {/*
            Checkbox 3개는 CardBody 의 gap-5(20)를 그대로 받는다.
            묶어서 다시 감싸면 간격이 두 번 붙는다 — 페이지에 간격 클래스를 쓰지 않는다.
          */}
          <Checkbox
            label="개인정보 수집·이용 동의 (필수)"
            description="진료 접수와 예약 안내에만 사용합니다"
            checked={agreePrivacy}
            onChange={(e) => setAgreePrivacy(e.target.checked)}
          />

          <Checkbox
            label="민감정보(진료기록) 처리 동의 (필수)"
            description="진단·처방 기록을 보관하고 재진 시 조회합니다"
            checked={agreeSensitive}
            onChange={(e) => setAgreeSensitive(e.target.checked)}
          />

          <Checkbox
            label="진료 목적 외 활용 동의 (선택)"
            description="동의하지 않아도 진료를 받을 수 있습니다"
          />

          <FormField
            label="동의 유효기간"
            labelDescription="비워두면 철회 시까지 유지됩니다"
          >
            <DatePicker
              mode="range"
              value={consentPeriod}
              onChange={setConsentPeriod}
              startPlaceholder="시작일"
              endPlaceholder="종료일"
            />
          </FormField>
        </CardBody>
      </Card>

      {/* ── 메모 ────────────────────────────────────────── */}
      <Card>
        <CardHeader title="메모" />
        <CardBody>
          <FormField
            label="특이사항"
            description="알레르기·복용 중인 약·과거력 등을 적습니다"
          >
            <Textarea
              minRows={4}
              placeholder="예) 페니실린 알레르기, 고혈압약 복용 중"
            />
          </FormField>

          <FormField
            label="내부 메모"
            labelDescription="환자에게는 보이지 않습니다"
          >
            <Textarea minRows={3} placeholder="데스크 인계 사항을 적어주세요" />
          </FormField>
        </CardBody>
      </Card>
    </AppShell>
  );
}
