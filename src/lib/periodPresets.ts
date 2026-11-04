import type { DatePickerPreset, DateRange } from "../components/ui";

/* =========================================================================
 * 기간 빠른 선택 — 원본 어드민 `quickRanges`
 *
 * 원본은 **모든 목록 화면에서 같은 7종**을 쓴다(오늘·1주일·1개월·3개월·6개월·1년·전체).
 * 회원·셀러·입점 심사가 같은 어휘를 그대로 복사하고 있어 여기로 모았다.
 *
 * ## 왜 `.data.ts`(도메인)가 아니라 `lib` 인가
 * 단위 포맷터(`won`·`people`)를 화면마다 복사하는 것은 **의도된 중복**이다 — 단위가
 * 도메인이라 서비스를 갈아끼우면 값이 달라진다(원·kg·시간). 반면 이 7종은 **무엇을
 * 세는 화면이든 뜻이 같고**, 원본도 공용 설정으로 둔다. 도메인이 아니라 공용 어휘다.
 *
 * ⚠️ 기준 날짜가 "가입일"인지 "입점일"인지는 **화면이 정한다** — 이 목록은
 * "얼마나 거슬러 올라갈지"만 말한다.
 * ====================================================================== */

/**
 * 오늘을 **포함해** N일 전까지. 포함 범위라 `N - 1` 을 뺀다 —
 * "1주일"이 오늘 포함 7일이지 8일이 아니다.
 */
const lastDays = (days: number, today: () => Date): DateRange => {
  const to = today();
  const from = today();
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
};

/** 오늘을 포함해 N개월 전까지 (달마다 길이가 달라 일수로 세지 않는다) */
const lastMonths = (months: number, today: () => Date): DateRange => {
  const to = today();
  const from = today();
  from.setMonth(from.getMonth() - months);
  from.setDate(from.getDate() + 1);
  return { from, to };
};

/**
 * 「오늘」을 정해 7종을 만든다 — 샘플이 고정 날짜인 화면용(셀러 원본은 데모 기준일 `FB_TODAY`
 * 2026-06-29 에서 센다. 실제 오늘을 쓰면 「1주일」이 시드를 벗어나 빈 목록이 된다).
 * `today` 는 부를 때마다 **새 Date** 를 돌려줘야 한다(위에서 고쳐 쓴다).
 */
export const periodPresetsFrom = (today: () => Date): DatePickerPreset[] => [
  { label: "오늘", getRange: () => lastDays(1, today) },
  { label: "1주일", getRange: () => lastDays(7, today) },
  { label: "1개월", getRange: () => lastMonths(1, today) },
  { label: "3개월", getRange: () => lastMonths(3, today) },
  { label: "6개월", getRange: () => lastMonths(6, today) },
  { label: "1년", getRange: () => lastMonths(12, today) },
  { label: "전체", getRange: () => undefined },
];

/**
 * 원본 어휘 7종 그대로. **"전체"는 기간을 해제한다**(`undefined`) —
 * 아주 넓은 기간을 넣는 것과 다르다. 넣어 버리면 **기준 날짜가 없는 행**
 * (퇴점하지 않은 셀러의 퇴점일 등)이 통째로 빠진다.
 */
export const PERIOD_PRESETS: DatePickerPreset[] = periodPresetsFrom(
  () => new Date(),
);
