import { Hammer } from "lucide-react";
import {
  AppShell,
  Button,
  EmptyState,
  Gnb,
  PageHeader,
} from "../../components/ui";
import {
  SELLER_GNB_LOGO_SLOTS,
  SELLER_GNB_SECTIONS,
} from "../sellerGnbSections";

/* =========================================================================
 * ⚠️ **임시 자리** — 아직 퍼블하지 않은 셀러 화면이 이것으로 열린다.
 *
 * 골격 단계(GNB·경로·딥링크)를 먼저 검증하려고 둔다. 화면을 하나 만들 때마다
 * `SellerApp.tsx` 의 그 경로를 실제 화면으로 바꾸고, 전부 바뀌면 이 파일을 지운다.
 * ====================================================================== */

interface NavProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

/** 경로마다 제목이 다른 임시 화면을 만든다 — 제목은 GNB 라벨(원본 SCREEN_MAP) */
export function pendingScreen(title: string) {
  function SellerPendingPage({
    navOpen,
    onNavOpenChange,
    activeNav,
    onNavSelect,
  }: NavProps) {
    return (
      <AppShell
        sidebar={
          <Gnb
            sections={SELLER_GNB_SECTIONS}
            activeId={activeNav}
            onSelect={onNavSelect}
            open={navOpen}
            onOpenChange={onNavOpenChange}
            logo={SELLER_GNB_LOGO_SLOTS.logo}
            collapsedLogo={SELLER_GNB_LOGO_SLOTS.collapsed}
          />
        }
        header={<PageHeader title={title} />}
      >
        <EmptyState
          size="page"
          icon={<Hammer strokeWidth={1.2} aria-hidden />}
          title="퍼블 작업 전"
          description="원본 기획 v0.4 와 대조한 뒤 이 자리를 채운다."
        >
          <Button variant="secondary" onClick={() => onNavSelect("/screens")}>
            화면 목록으로
          </Button>
        </EmptyState>
      </AppShell>
    );
  }
  return SellerPendingPage;
}
