import { useEffect, useRef, useState } from "react";
import type { OrderUnit } from "./seed/orders.data";
import { initialDeductOf, judgmentOf, type Judgment } from "./unitDetail.data";

/* =========================================================================
 * 렌트 상세 화면 안 상태 — 출고·반납 이미지 · 검수 판정 · 차감액 · 수거 송장(`RentSections` 구역들이 같이 본다).
 * 시드는 바꾸지 않는다(퍼블 범위 · GPT 검토 A안). 고른 파일의 미리보기 주소는 화면을 떠나면 놓아 준다
 * ====================================================================== */

/** 상세 화면 안 상태 — 처리단위마다 처음부터(`UnitDetail` 이 key 로 다시 만든다) */
export function useRentDetail(u: OrderUnit) {
  const [shipImages, setShipImages] = useState<string[]>(u.shipImgs ?? []);
  const [returnImages, setReturnImages] = useState<string[]>(
    u.returnImgs ?? [],
  );
  const [judgment, setJudgment] = useState<Judgment | null>(judgmentOf(u));
  const [deduct, setDeduct] = useState(Number(u.deduct) || 0);
  const [collect, setCollect] = useState({
    courier: u.retCourier ?? "",
    invoice: u.retInvoice ?? "",
  });
  /* 고른 파일의 미리보기 주소 — 화면을 떠나면 놓아 준다 */
  const created = useRef<string[]>([]);
  useEffect(() => {
    const urls = created.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const makeUrl = (file: File) => {
    const url = URL.createObjectURL(file);
    created.current.push(url);
    return url;
  };
  return {
    shipImages,
    setShipImages,
    returnImages,
    setReturnImages,
    judgment,
    /** 판정 고르기 — 차감 초깃값도 원본 규칙대로 */
    judge: (j: Judgment) => {
      setJudgment(j);
      setDeduct(initialDeductOf(u, j));
    },
    reset: () => {
      setJudgment(null);
      setDeduct(0);
    },
    deduct,
    setDeduct,
    collect,
    setCollect,
    makeUrl,
  };
}
export type RentDetailState = ReturnType<typeof useRentDetail>;
