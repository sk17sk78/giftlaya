"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Logo } from "@/components/ui/Logo";
import type { PublicSiteSettings } from "@/types";
import {
  Menu,
  Search,
  Headphones,
  ShoppingBag,
  UserRound,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  MapPin,
} from "lucide-react";

export function Header({ config }: { config?: PublicSiteSettings["header_config"] }) {
  const pathname = usePathname();
  const router = useRouter();
  const showCitySelector = config?.show_city_selector !== false;
  const searchPlaceholder = config?.search_placeholder || "Search gifts, flowers & cakes";
  const brandLabel = config?.logo_text || "Giftlaya";
  const {
    selectedCity,
    openCityModal,
    openSearch,
    openAuth,
    openMobileMenu,
    openCartDrawer,
    cartCount,
    customer,
  } = useApp();

  const isDetailPage =
    pathname?.startsWith("/p/") || pathname?.startsWith("/s/");

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#f0e9ec]">
      {/* MOBILE HEADER (< 640px) */}
      <div className="sm:hidden">
        {isDetailPage ? (
          /* Compact Product / Service Mobile Header matching Giftlaya PDP */
          <div className="flex items-center justify-between gap-2 h-14 px-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex items-center justify-center w-9 h-9 rounded-xl text-[#352a30] hover:bg-[#faf3f6] transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={openCityModal}
              aria-label="Select delivery city"
              className="flex-1 flex items-center gap-2 min-w-0 px-2 py-1 rounded-xl hover:bg-[#fdf2f5] transition-colors text-left"
            >
              <span className="w-8 h-8 rounded-xl bg-[#fdf2f5] border border-[#f5d5e1] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#9b1b45]" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] text-[#856e7b] leading-tight font-medium">
                  Deliver to
                </span>
                <span className="block text-[12px] font-bold text-[#292229] truncate">
                  {selectedCity}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#856e7b] shrink-0" />
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={openSearch}
                aria-label="Open search"
                className="flex items-center justify-center w-9 h-9 rounded-xl text-[#352a30] hover:bg-[#faf3f6] transition-colors"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
              <button
                type="button"
                onClick={openCartDrawer}
                aria-label="Cart"
                className="relative flex items-center justify-center w-9 h-9 rounded-xl text-[#352a30] hover:bg-[#faf3f6] transition-colors"
              >
                <ShoppingBag className="w-[18px] h-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#9b1b45] text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_0_2px_#fff]">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Standard Mobile Header + Search Bar */
          <div className="px-3.5 pb-2.5">
            <div className="flex items-center justify-between gap-2 h-14">
              {/* Hamburger Menu */}
              <button
                type="button"
                onClick={openMobileMenu}
                aria-label="Open menu"
                className="flex items-center justify-center w-9 h-10 bg-[#f6f4f5] rounded-xl text-[#352a30] hover:bg-[#f0e9ec] transition-colors shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Logo */}
              <Link href="/" aria-label={`${brandLabel} — gifting you can trust`} className="flex items-center shrink-0">
                <Logo className="h-[27px] w-auto" />
              </Link>

              {/* City Selector */}
              {showCitySelector ? (
                <button
                  type="button"
                  onClick={openCityModal}
                  aria-label="Select delivery city"
                  className="ml-auto flex items-center justify-end gap-1 text-left max-w-[150px] truncate"
                >
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] text-[#856e7b] leading-[12px] font-medium">Deliver to</span>
                    <span className="text-[11px] leading-[16px] font-semibold text-[#34212a] truncate">
                      {selectedCity}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#856e7b] shrink-0" />
                </button>
              ) : (
                <div className="ml-auto" />
              )}

              {/* Cart Icon */}
              <button
                type="button"
                onClick={openCartDrawer}
                aria-label="Cart"
                className="relative flex items-center justify-center w-9 h-10 rounded-xl text-[#352a30] hover:bg-[#faf3f6] transition-colors shrink-0"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute right-0.5 top-1 min-w-[16px] h-4 px-1 rounded-full bg-[#9b1b45] text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_0_2px_#fff]">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Search Bar Trigger */}
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search gifts, flowers and cakes"
              className="w-full flex items-center gap-[10px] h-[42px] pl-[14px] pr-[11px] rounded-[14px] bg-[#f8f5f7] border border-[#eee5e9] text-[#9b1b45] text-left hover:border-[#d9b6c6] transition-colors cursor-pointer"
            >
              <Search className="w-[19px] h-[19px] shrink-0" strokeWidth={1.8} />
              <span className="flex-1 min-w-0 truncate text-[12px] text-[#82727b]">
                {config?.search_placeholder ? (
                  config.search_placeholder
                ) : (
                  <>
                    Search <strong className="font-medium text-[#4e3c45]">gifts, flowers &amp; cakes</strong>
                  </>
                )}
              </span>
              <span
                className="grid place-items-center shrink-0 w-[26px] h-[26px] rounded-[9px] bg-white text-[#8c6e7c]"
                aria-hidden="true"
              >
                <ArrowRight className="w-[14px] h-[14px]" strokeWidth={1.8} />
              </span>
            </button>
          </div>
        )}
      </div>

      {/* DESKTOP & TABLET HEADER (>= 640px) */}
      <div className="hidden sm:block max-w-[1200px] mx-auto px-5 lg:px-6">
        <div className="flex items-center justify-between gap-3 lg:gap-5 h-[72px]">
          {/* Left: Hamburger (tablet < 1024px only) + Brand Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openMobileMenu}
              aria-label="Open menu"
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl text-[#352a30] hover:bg-[#f6f4f5] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" aria-label={`${brandLabel} — gifting you can trust`} className="flex items-center shrink-0">
              <Logo className="h-[29px] lg:h-[32px] w-auto" />
            </Link>
          </div>

          {/* Search Bar Input / Trigger */}
          <div className="flex-1 min-w-[90px]">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Open search"
              aria-haspopup="dialog"
              className="w-full flex items-center gap-[12px] h-[44px] px-[15px] rounded-[14px] bg-[#f8f5f7] border border-[#eee5e9] text-[#9b1b45] hover:border-[#d9b6c6] transition-colors cursor-pointer"
            >
              <Search className="w-[19px] h-[19px] shrink-0" strokeWidth={1.8} />
              <span className="flex-1 min-w-0 truncate text-left text-[12px] font-normal text-[#766570]">
                {searchPlaceholder}
              </span>
              <kbd
                aria-hidden="true"
                className="hidden min-[1200px]:inline-flex items-center px-[5px] py-[3px] rounded-[5px] bg-white border border-[#eae0e5] text-[10px] font-medium text-[#927b88] whitespace-nowrap shrink-0"
              >
                ⌘ K
              </kbd>
            </button>
          </div>

          {/* Deliver to - City Selector */}
          {showCitySelector && (
          <button
            type="button"
            onClick={openCityModal}
            aria-label="Select delivery city"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[#fdf2f5] transition-all shrink-0 text-left basis-auto lg:basis-[178px]"
          >
            {/* Custom location map pin SVG (hidden on narrow tablet, shown on desktop) */}
            <span className="hidden lg:grid place-items-center w-7 h-7 shrink-0" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <path d="m4 15 8-3 8 3 8-3v14l-8 3-8-3-8 3V15Z" fill="#f8e4ec" stroke="#9b1b45" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M12 19v7m8-6v9" stroke="#9b1b45" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
                <path d="M22 9c0 4.5-6 10-6 10S10 13.5 10 9a6 6 0 1 1 12 0Z" fill="white" stroke="#9b1b45" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="16" cy="9" r="2" fill="#9b1b45" />
              </svg>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-[#856e7b] leading-tight font-medium">Deliver to</span>
              <span className="text-[12px] lg:text-[13px] font-bold text-[#34212a] max-w-[110px] lg:max-w-[125px] truncate">
                {selectedCity}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#856e7b] shrink-0" />
          </button>
          )}

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Support / Help */}
            <Link
              href="/contact-us"
              title={config?.hotline ? `Support (${config.hotline})` : "Support"}
              aria-label="Support"
              className="inline-flex items-center justify-center w-11 h-11 rounded-[14px] text-[#352a30] hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
            >
              <Headphones className="w-[21px] h-[21px] text-[#352a30]" strokeWidth={1.8} />
              <span className="sr-only">Help</span>
            </Link>

            {/* Cart Button */}
            <button
              type="button"
              onClick={openCartDrawer}
              aria-label="Cart"
              className="relative inline-flex items-center justify-center w-11 h-11 rounded-[14px] text-[#352a30] hover:bg-[#faf3f6] transition-colors"
            >
              <ShoppingBag className="w-[21px] h-[21px] text-[#352a30]" strokeWidth={1.8} />
              {cartCount > 0 && (
                <span className="absolute right-1.5 top-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#9b1b45] text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_0_2px_#fff]">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Account / Sign in Button */}
            {customer ? (
              <Link
                href="/dashboard"
                aria-label="Customer account"
                className="inline-flex items-center justify-center gap-2 w-10 h-10 lg:w-auto lg:h-10 lg:px-4 rounded-[13px] bg-[#fcf2f6] border border-[#f0dce5] text-[#9b1b45] hover:bg-[#f7e3ec] text-[12px] font-semibold transition-colors ml-0.5"
              >
                <UserRound className="w-[18px] h-[18px]" />
                <span className="hidden lg:inline truncate max-w-[100px]">
                  {customer.name || customer.phone || customer.target || "My Account"}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={openAuth}
                aria-label="Sign in"
                className="inline-flex items-center justify-center gap-2 w-10 h-10 lg:w-auto lg:h-10 lg:px-4 rounded-[13px] bg-[#9b1b45] text-white hover:bg-[#7d1538] text-[12px] font-semibold transition-colors ml-0.5"
              >
                <UserRound className="w-[18px] h-[18px]" />
                <span className="hidden lg:inline">Sign in</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
