"use client";

import React from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import GiftlayaLogo from "@/components/GiftlayaLogo";
import { Menu, Search, Headphones, ShoppingBag, UserRound, ChevronDown } from "lucide-react";

export default function Header() {
  const {
    selectedCity,
    openCityModal,
    openSearch,
    openAuth,
    openMobileMenu,
    openCartDrawer,
    cartCount
  } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#f0e9ec] shadow-sm">
      {/* MOBILE HEADER (< 1024px) */}
      <div className="lg:hidden px-3.5 pb-2.5">
        <div className="flex items-center justify-between gap-2 h-14">
          {/* Hamburger Menu */}
          <button
            type="button"
            onClick={openMobileMenu}
            aria-label="Open menu"
            className="flex items-center justify-center w-9 h-10 bg-[#f6f4f5] rounded-xl text-[#352a30] hover:bg-[#f0e9ec] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link href="/" aria-label="Giftlaya — gifting you can trust" className="flex items-center">
            <GiftlayaLogo className="h-[27px] w-auto" />
          </Link>

          {/* City Selector */}
          <button
            type="button"
            onClick={openCityModal}
            aria-label="Select delivery city"
            className="flex items-center gap-1 text-right max-w-[130px] sm:max-w-[160px] truncate"
          >
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-[#856e7b] leading-tight font-medium">Deliver to</span>
              <span className="text-[12px] font-semibold text-[#34212a] truncate">{selectedCity}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#856e7b] shrink-0" />
          </button>

          {/* Cart Icon */}
          <button
            type="button"
            onClick={openCartDrawer}
            aria-label="Cart"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl text-[#352a30] hover:bg-[#faf3f6] transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute right-1 top-1 min-w-[16px] h-4 px-1 rounded-full bg-[#9b1b45] text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_0_2px_#fff]">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Search Bar Trigger */}
        <button
          type="button"
          onClick={openSearch}
          aria-label="Open search"
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#f6f4f5] text-[#856e7b] text-[13px] border border-transparent hover:border-[#e9dfe6] transition-all"
        >
          <Search className="w-4 h-4 text-[#856e7b] shrink-0" />
          <span className="truncate">Search gifts, flowers & cakes</span>
        </button>
      </div>

      {/* DESKTOP HEADER (>= 1024px) */}
      <div className="hidden lg:block max-w-[1168px] mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" aria-label="Giftlaya — gifting you can trust" className="flex items-center shrink-0">
            <GiftlayaLogo className="h-[32px] w-auto" />
          </Link>

          {/* Search Bar Input / Trigger */}
          <div className="flex-1 max-w-[480px]">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Open search"
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#f8f6f7] border border-[#eee8ec] text-[#70636c] text-[13px] hover:border-[#dcb4c5] hover:bg-white transition-all shadow-inner"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-[#8d7b87]" />
                <span className="font-normal">Search gifts, flowers &amp; cakes</span>
              </div>
              <kbd className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-[#e4dae0] text-[10px] font-medium text-[#70636c] shadow-sm">
                ⌘ K
              </kbd>
            </button>
          </div>

          {/* Deliver to - City Selector */}
          <button
            type="button"
            onClick={openCityModal}
            aria-label="Select delivery city"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#eee8ec] hover:border-[#dcb4c5] hover:bg-[#fdf2f5] transition-all shrink-0 text-left"
          >
            {/* Custom location map pin SVG */}
            <span className="w-6 h-6 flex items-center justify-center shrink-0" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <path d="m4 15 8-3 8 3 8-3v14l-8 3-8-3-8 3V15Z" fill="#f8e4ec" stroke="#9b1b45" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M12 19v7m8-6v9" stroke="#9b1b45" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
                <path d="M22 9c0 4.5-6 10-6 10S10 13.5 10 9a6 6 0 1 1 12 0Z" fill="white" stroke="#9b1b45" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="16" cy="9" r="2" fill="#9b1b45" />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] text-[#856e7b] leading-tight font-medium">Deliver to</span>
              <span className="text-[13px] font-bold text-[#34212a] max-w-[120px] truncate">{selectedCity}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#856e7b] ml-1" />
          </button>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Support / Help */}
            <Link
              href="/contact-us"
              aria-label="Support"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#352a30] hover:bg-[#faf3f6] hover:text-[#9b1b45] text-[13px] font-semibold transition-colors"
            >
              <Headphones className="w-4 h-4 text-[#70636c]" />
              <span>Help</span>
            </Link>

            {/* Cart Button */}
            <button
              type="button"
              onClick={openCartDrawer}
              aria-label="Cart"
              className="relative flex items-center justify-center w-10 h-10 rounded-xl text-[#352a30] hover:bg-[#faf3f6] transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-[#352a30]" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 min-w-[16px] h-4 px-1 rounded-full bg-[#9b1b45] text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_0_2px_#fff]">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Sign in Button */}
            <button
              type="button"
              onClick={openAuth}
              aria-label="Sign in"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#352a30] hover:bg-[#faf3f6] hover:text-[#9b1b45] text-[13px] font-semibold transition-colors"
            >
              <UserRound className="w-4 h-4 text-[#70636c]" />
              <span>Sign in</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
