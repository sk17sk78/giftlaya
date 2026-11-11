"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useUI } from "@/context/UIContext";

export function TopAppBar({ topStripEnabled = true }: { topStripEnabled?: boolean }) {
  const { isTopAppBarDismissed, dismissTopAppBar } = useUI();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isTopAppBarDismissed || topStripEnabled === false) return null;

  return (
    <aside
      className="bg-[#fcf2f6] border-b border-[#f0dce5] text-[#3b2432] z-50 transition-all duration-200"
      aria-label="Giftlaya Android app"
    >
      <div className="max-w-[1200px] mx-auto flex items-center gap-2.5 sm:gap-3 min-h-[56px] px-3.5 sm:px-6 py-1.5">
        <span className="shrink-0 flex items-center justify-center w-9 h-9 bg-white border border-[#f0dfe7] rounded-xl p-1.5 shadow-2xs" aria-hidden="true">
          <svg viewBox="71 49 370 403" role="img" aria-label="Giftlaya" className="w-6 h-6">
            <path fill="#9B1B45" d="M252 204C213 201 142 183 132 144C120 99 157 77 192 97C228 118 244 166 252 204Z" />
            <path fill="#F6BDCE" d="M222 178C202 171 167 158 163 142C158 126 170 119 183 128C199 139 213 160 222 178Z" />
            <path fill="#9B1B45" d="M251 204C261 156 287 95 326 89C367 82 390 115 367 149C345 180 290 198 251 204Z" />
            <path fill="#F6BDCE" d="M282 174C294 150 313 124 329 121C344 118 348 129 338 140C326 153 302 166 282 174Z" />
            <path fill="#9B1B45" d="M116 255H396L387 373C385 404 365 424 334 424H178C147 424 127 404 125 373L116 255Z" />
            <path fill="#F6BDCE" d="M231 268H281V424H231V268Z" />
            <path fill="#7E1538" d="M117 268H395L393 287H119L117 268Z" />
            <rect fill="#9B1B45" x="99" y="197" width="314" height="79" rx="26" />
            <path fill="#F6BDCE" d="M231 197H281V276H231V197Z" />
            <rect fill="#9B1B45" x="233" y="177" width="46" height="38" rx="17" />
          </svg>
        </span>

        <div className="flex-1 min-w-0 sm:flex sm:items-baseline sm:gap-3">
          <p className="text-[13px] font-semibold leading-snug text-[#402233] truncate">
            Get the Giftlaya app
          </p>
          <span className="block sm:inline text-[11px] sm:text-[12px] text-[#745565]">
            Now on Google Play
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="https://play.google.com/store/apps/details?id=com.giftlaya.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-2 rounded-[10px] bg-[#9b1b45] text-white text-[12px] font-semibold hover:bg-[#801239] transition-colors"
          >
            <span>Get app</span>
            <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
          </Link>
          <button
            type="button"
            onClick={dismissTopAppBar}
            aria-label="Dismiss app banner"
            className="p-1.5 text-[#745565] hover:text-[#402233] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default TopAppBar;
