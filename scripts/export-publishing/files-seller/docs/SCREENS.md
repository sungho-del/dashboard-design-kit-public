# 화면 목록

> 추출 기준 `{{SOURCE_COMMIT}}` · 대조 기준: 이 저장소 `develop` `82eb141`의 `src/app/**/page.tsx`
>
> 퍼블 경로는 **이 저장소의 App Router 경로와 같다.** 화면 코드는 원본 기획 v0.4 `SCREEN_IDS`.
> `npm run dev` 후 아래 경로(B 절은 예시 주소)를 그대로 열면 된다. GNB 맨 아래 「화면 목록」(`/screens`)에도 전부 있다.

## A. 메뉴 화면 27 (원본 메뉴 27항목 전부)

| 화면 코드   | 화면                | 경로                | 퍼블 파일 (`src/pages/`)         |
| ----------- | ------------------- | ------------------- | -------------------------------- |
| SO-SYS-001  | 대시보드            | `/`                 | `seller/SellerDashboardPage.tsx` |
| SO-PRD-001  | 상품 관리           | `/products`         | `seller/ProductsPage.tsx`        |
| SO-PRD-003  | 상품 등록           | `/product-new`      | `seller/ProductFormPage.tsx`     |
| SO-ORD-003  | 주문 통합 관리      | `/sale-orders`      | `seller/SaleOrdersPage.tsx`      |
| SO-ORD-001  | 발주 관리           | `/sale-proc`        | `seller/SaleProcPage.tsx`        |
| SO-DLV-001  | 배송 관리           | `/shipping`         | `seller/ShippingPage.tsx`        |
| SO-RMA-001  | 취소 관리           | `/sale-cancel`      | `seller/SaleClaimPages.tsx`      |
| SO-RMA-003  | 반품 관리           | `/sale-return`      | `seller/SaleClaimPages.tsx`      |
| SO-RMA-005  | 교환 관리           | `/sale-exchange`    | `seller/SaleClaimPages.tsx`      |
| SO-ORD-004  | 렌트 주문 통합 관리 | `/rent-orders`      | `seller/RentOrdersPage.tsx`      |
| SO-RNT-001  | 렌트 발주 관리      | `/rent-list`        | `seller/RentProcessPages.tsx`    |
| SO-DLV-003  | 배송 관리(렌트)     | `/rent-dispatch`    | `seller/RentProcessPages.tsx`    |
| SO-RNT-003  | 대여·연체 관리      | `/rent-use`         | `seller/RentProcessPages.tsx`    |
| SO-INS-001  | 검수·반납 관리      | `/rent-insp-return` | `seller/RentProcessPages.tsx`    |
| SO-RMA-007  | 취소 관리(렌트)     | `/rent-cancel`      | `seller/RentProcessPages.tsx`    |
| SO-RMA-008  | 반품 관리(렌트)     | `/rent-rma`         | `seller/RentProcessPages.tsx`    |
| SO-STL-001  | 매출 정산           | `/settle-own`       | `seller/SettlePages.tsx`         |
| SO-STL-002  | 보증금 내역         | `/rent-deposit`     | `seller/RentDepositPages.tsx`    |
| SO-STL-006  | 정산 내역/명세서    | `/settle-statement` | `seller/SettlePages.tsx`         |
| SO-STL-007  | 세금계산서·증빙     | `/settle-tax`       | `seller/SettlePages.tsx`         |
| SO-MKT-001  | 쿠폰관리            | `/promo`            | `seller/CouponPages.tsx`         |
| SO-CSC-002  | 공지사항            | `/seller-notice`    | `seller/BoardPages.tsx`          |
| SO-CSC-001  | 문의 관리           | `/support`          | `seller/BoardPages.tsx`          |
| SO-CSC-003  | 리뷰 관리           | `/seller-reviews`   | `seller/BoardPages.tsx`          |
| SO-CSC-004  | 1:1 문의            | `/seller-ask`       | `seller/BoardPages.tsx`          |
| SO-SEL-001  | 스토어 정보 · 설정  | `/store`            | `seller/SystemPages.tsx`         |
| (원본 없음) | 공휴일 관리         | `/ops-calendar`     | `seller/SystemPages.tsx`         |

## B. 상세·등록 화면 24

「예시 주소」는 시드에서 상태가 잘 보이는 건이다. 같은 꼴의 다른 id 도 열린다(없는 id 는 「찾을 수 없음」).

| 화면 코드  | 화면                      | 이 저장소 경로             | 예시 주소                            | 퍼블 파일                        |
| ---------- | ------------------------- | -------------------------- | ------------------------------------ | -------------------------------- |
| SO-PRD-002 | 상품 상세 (수정)          | `/products/[id]`           | `/products/P-001`                    | `seller/ProductFormPage.tsx`     |
| SO-ORD-002 | 주문 상세(통합)           | `/order-details/[orderNo]` | `/order-details/20260705880011`      | `seller/OrderDetailsPage.tsx`    |
| SO-ORD-003 | 판매 주문 상세            | `/sale-orders/[id]`        | `/sale-orders/20260623864962-1`      | `seller/SaleOrderDetailPage.tsx` |
| SO-ORD-002 | 발주 관리 상세            | `/sale-proc/[id]`          | `/sale-proc/20260623864962-1`        | `seller/SaleOrderDetailPage.tsx` |
| SO-DLV-002 | 배송 관리 상세            | `/shipping/[id]`           | `/shipping/20260622541158-1`         | `seller/ShippingDetailPage.tsx`  |
| SO-RMA-002 | 취소 상세                 | `/sale-cancel/[id]`        | `/sale-cancel/20260628200061-1`      | `seller/SaleClaimDetailPage.tsx` |
| SO-RMA-004 | 반품 상세                 | `/sale-return/[id]`        | `/sale-return/20260618360510-1`      | `seller/SaleClaimDetailPage.tsx` |
| SO-RMA-006 | 교환 상세                 | `/sale-exchange/[id]`      | `/sale-exchange/20260617540318-1`    | `seller/SaleClaimDetailPage.tsx` |
| SO-RNT-002 | 렌트 발주 관리 상세       | `/rent-list/[id]`          | `/rent-list/20260624225758-1`        | `seller/RentDetailPages.tsx`     |
| SO-ORD-004 | 렌트 주문 상세            | `/rent-orders/[id]`        | `/rent-orders/20260624225758-1`      | `seller/RentDetailPages.tsx`     |
| SO-DLV-004 | 배송 관리 상세(렌트)      | `/rent-dispatch/[id]`      | `/rent-dispatch/20260623452502-1`    | `seller/RentDetailPages.tsx`     |
| SO-RNT-005 | 대여·연체 관리 상세       | `/rent-use/[id]`           | `/rent-use/20260623493905-1`         | `seller/RentDetailPages.tsx`     |
| SO-INS-002 | 검수·반납 관리 상세       | `/rent-insp-return/[id]`   | `/rent-insp-return/20260621138968-1` | `seller/RentDetailPages.tsx`     |
| SO-RMA-010 | 취소 상세(렌트)           | `/rent-cancel/[id]`        | `/rent-cancel/20260623445120-1`      | `seller/RentDetailPages.tsx`     |
| SO-RMA-011 | 반품 상세(렌트)           | `/rent-rma/[id]`           | `/rent-rma/20260620338890-1`         | `seller/RentDetailPages.tsx`     |
| SO-STL-001 | 매출 정산 상세            | `/settle-own/[id]`         | `/settle-own/2026.06`                | `seller/SettlePages.tsx`         |
| SO-STL-003 | 보증금 내역 상세          | `/rent-deposit/[id]`       | `/rent-deposit/20260618360509-1`     | `seller/RentDepositPages.tsx`    |
| SO-STL-006 | 정산 명세서 상세          | `/settle-statement/[id]`   | `/settle-statement/2026.06`          | `seller/SettlePages.tsx`         |
| SO-MKT-002 | 쿠폰 상세 (수정)          | `/promo/[id]`              | `/promo/CP-2608-01`                  | `seller/CouponPages.tsx`         |
| SO-MKT-002 | 쿠폰 등록                 | `/promo/[id]`              | `/promo/new`                         | `seller/CouponPages.tsx`         |
| SO-CSC-006 | 공지 상세                 | `/seller-notice/[id]`      | `/seller-notice/N-S26`               | `seller/BoardDetailPages.tsx`    |
| SO-CSC-005 | 문의 상세                 | `/support/[id]`            | `/support/Q-8842`                    | `seller/BoardDetailPages.tsx`    |
| SO-CSC-007 | 리뷰 상세                 | `/seller-reviews/[id]`     | `/seller-reviews/RV-31`              | `seller/BoardDetailPages.tsx`    |
| SO-CSC-008 | 1:1 문의 상세 (등록/수정) | `/seller-ask/[id]`         | `/seller-ask/SQ-11`                  | `seller/BoardDetailPages.tsx`    |

상태별로 보기 좋은 예시:

| 화면        | 예시                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| 상품 상세   | 반려 `P-300` · 재심사요청 `P-303` · 임시저장 `P-310` · 품절 `P-061` · 판매중지 `P-005` · 방문 수령+공항 픽업 `P-002` |
| 문의 상세   | 주문 문의 `Q-8842` · 비밀글 `Q-8840` · 답변완료 `Q-8835`                                                             |
| 리뷰 상세   | 답글 대기 `RV-31` · 답글 완료 `RV-30`                                                                                |
| 1:1 문의    | 접수(수정 가능) `SQ-11` · 답변완료(읽기) `SQ-12` · 새 문의 `/seller-ask/new`                                         |
| 보증금 상세 | 환급 완료 `20260618360509-1` · 환급 대기 `20260610176468-1`                                                          |
| 정산 명세   | 이번 회차(확인요청) `2026.06` · 지난 회차 `2026.05`                                                                  |
| 쿠폰        | 정액 `CP-2608-01` · 사용중지 `CP-2608-04` · 새 쿠폰 `/promo/new`                                                     |
| 직영 계정   | 아무 주소 뒤에 `?account=direct` (예 `/store?account=direct`)                                                        |

## 인증 화면 4

메뉴 없이 가운데 창 하나다. 본사 퍼블과 같은 화면이고 로그인 머리 글자만 「베이비큐브 입점사 어드민」이다.

| 화면            | 경로                                   | 퍼블 파일                |
| --------------- | -------------------------------------- | ------------------------ |
| 로그인          | `/login`                               | `babycube/AuthPages.tsx` |
| 비밀번호 변경   | `/password`                            | `babycube/AuthPages.tsx` |
| 비밀번호 찾기   | `/password-reset`                      | `babycube/AuthPages.tsx` |
| 비밀번호 재설정 | `/password-reset/confirm?token=sample` | `babycube/AuthPages.tsx` |

## C. 경로 모양이 이 저장소와 다른 곳 · 퍼블 대상이 아닌 곳

| 이 저장소       | 퍼블                        | 비고                                 |
| --------------- | --------------------------- | ------------------------------------ |
| `/products/new` | `/product-new` 와 같은 화면 | 이 저장소도 `/product-new` 로 보낸다 |
| `/dev`          | 없음                        | 개발 화면 — 퍼블 대상 아님           |
| —               | `/screens`                  | 퍼블 전용 화면 목록(원본에 없다)     |
