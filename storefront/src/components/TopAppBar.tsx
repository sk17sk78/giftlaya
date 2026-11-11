"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

export default function TopAppBar() {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("giftlaya_topbar_dismissed");
    if (!dismissed) {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("giftlaya_topbar_dismissed", "true");
  };

  if (isDismissed) return null;

  return (
    <aside
      className="bg-[#9b1b45] text-white text-[12px] py-1.5 px-3 z-50 transition-all duration-200"
      aria-label="Giftlaya Android app"
    >
      <div className="max-w-[1168px] mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 flex items-center justify-center w-7 h-7 bg-[#ffffff1f] rounded-lg p-1" aria-hidden="true">
            <svg viewBox="71 49 370 403" role="img" aria-label="Giftlaya" className="w-5 h-5">
              <path fill="#ffffff" d="M252 204C213 201 142 183 132 144C120 99 157 77 192 97C228 118 244 166 252 204Z" />
              <path fill="#F6BDCE" d="M222 178C202 171 167 158 163 142C158 126 170 119 183 128C199 139 213 160 222 178Z" />
              <path fill="#ffffff" d="M251 204C261 156 287 95 326 89C367 82 390 115 367 149C345 180 290 198 251 204Z" />
              <path fill="#F6BDCE" d="M282 174C294 150 313 124 329 121C344 118 348 129 338 140C326 153 302 166 282 174Z" />
              <path fill="#ffffff" d="M116 255H396L387 373C385 404 365 424 334 424H178C147 424 127 404 125 373L116 255Z" />
              <path fill="#F6BDCE" d="M231 268H281V424H231V268Z" />
              <rect fill="#ffffff" x="99" y="197" width="314" height="79" rx="26" />
              <path fill="#F6BDCE" d="M231 197H281V276H231V197Z" />
              <rect fill="#ffffff" x="233" y="177" width="46" height="38" rx="17" />
            </svg>
          </span>
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-white">Get the Giftlaya app</span>
            <span className="hidden sm:inline text-[#f8c2d2] text-[11px]">— Now on Google Play</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="https://play.google.com/store/apps/details?id=com.giftlaya.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-white text-[#9b1b45] font-semibold text-[11px] px-3 py-1 rounded-full hover:bg-[#fdf2f5] transition-colors"
          >
            <span>Get app</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss app banner"
            className="p-1 text-[#f8c2d2] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
