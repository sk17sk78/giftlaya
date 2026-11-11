"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Header } from "@/components/layout/Header";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import type { City, NavItem, PublicSiteSettings } from "@/types";

interface SiteChromeProps {
  topStripEnabled?: boolean;
  headerConfig?: PublicSiteSettings["header_config"];
  footerConfig?: PublicSiteSettings["footer_config"];
  megaMenu: NavItem[];
  cities: { popularCities: City[]; allCities: string[] };
  children: React.ReactNode;
}

export function SiteChrome({
  topStripEnabled,
  headerConfig,
  footerConfig,
  megaMenu,
  children,
}: SiteChromeProps) {
  const pathname = usePathname();
  const isCheckoutChrome =
    pathname === "/cart" ||
    pathname?.startsWith("/cart/") ||
    pathname === "/checkout" ||
    pathname?.startsWith("/checkout/");

  if (isCheckoutChrome) {
    return <div className="flex-1 min-h-screen bg-[#faf9fb]">{children}</div>;
  }

  return (
    <>
      {/* SECTION 1: TOP APP BAR */}
      <TopAppBar topStripEnabled={topStripEnabled} />

      {/* SECTION 2: HEADER (Sticky) */}
      <Header config={headerConfig} />

      {/* SECTION 3: MEGA MENU */}
      <MegaMenu items={megaMenu} />

      {/* Mobile Accordion Sidebar Drawer */}
      <MobileSidebar items={megaMenu} />

      {/* Main Homepage / Page Content */}
      <div className="flex-1">{children}</div>

      {/* SECTIONS 20, 21, 22, 23: FOOTER */}
      <Footer config={footerConfig} />

      {/* SECTION 24: MOBILE BOTTOM NAVIGATION (Fixed) */}
      <MobileBottomNav />
    </>
  );
}

