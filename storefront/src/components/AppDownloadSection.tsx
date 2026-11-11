import React from "react";
import Link from "next/link";
import GiftlayaLogo from "@/components/GiftlayaLogo";

export default function AppDownloadSection() {
  return (
    <section className="w-full my-6" aria-label="Download the Giftlaya app">
      <div className="bg-gradient-to-r from-[#fdf2f5] via-[#faeaef] to-[#fce4eb] border border-[#f8c2d2] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-[#9b1b45] flex items-center justify-center p-2.5 shadow-md shrink-0">
            <svg viewBox="71 49 370 403" role="img" aria-label="Giftlaya" className="w-full h-full">
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
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9b1b45]">
              GIFTLAYA, NOW ON ANDROID
            </p>
            <h3 className="font-heading text-[18px] sm:text-[22px] font-bold text-[#29232a] mt-0.5">
              A little joy. One app away.
            </h3>
            <p className="text-[12px] sm:text-[13px] text-[#70636c] mt-1">
              Order flowers, custom cakes &amp; balloon decor faster with exclusive app discounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Google Play Button */}
          <Link
            href="https://play.google.com/store/apps/details?id=com.giftlaya.app"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download the Giftlaya Android app on Google Play"
            className="flex items-center gap-3 bg-black text-white px-4 py-2.5 rounded-2xl hover:bg-gray-900 transition-all shadow-md"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3.6 2.5C3.3 2.8 3.1 3.3 3.1 3.9V20.1C3.1 20.7 3.3 21.2 3.6 21.5L3.7 21.6L13.1 12.2V11.8L3.7 2.4L3.6 2.5Z" fill="#2196F3" />
              <path d="M16.2 15.3L13.1 12.2V11.8L16.2 8.7L16.3 8.8L20 10.9C21 11.5 21 12.5 20 13.1L16.3 15.2L16.2 15.3Z" fill="#FFC107" />
              <path d="M16.3 15.3L13.1 12.1L3.6 21.6C4 22 4.6 22 5.4 21.6L16.3 15.3Z" fill="#F44336" />
              <path d="M16.3 8.7L5.4 2.4C4.6 2 4 2 3.6 2.4L13.1 11.9L16.3 8.7Z" fill="#4CAF50" />
            </svg>
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase tracking-wider text-gray-300">GET IT ON</span>
              <span className="text-[14px] font-bold leading-tight">Google Play</span>
            </div>
          </Link>

          {/* Desktop QR Code */}
          <div className="hidden lg:flex items-center gap-2.5 bg-white p-2 rounded-2xl border border-[#f0e9ed] shadow-sm">
            {/* Simple Crisp QR Code pattern */}
            <div className="w-14 h-14 bg-gray-100 rounded-lg p-1 flex items-center justify-center">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://play.google.com/store/apps/details?id=com.giftlaya.app"
                alt="Scan QR code to install Giftlaya app"
                width={50}
                height={50}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col pr-1 text-left">
              <span className="text-[10px] font-bold text-[#29232a] leading-tight">Scan to</span>
              <span className="text-[10px] text-[#70636c]">Install app</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
