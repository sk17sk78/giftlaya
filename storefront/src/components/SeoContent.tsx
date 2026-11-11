"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { rawSeoHtml } from "@/data/seoContentRaw";

export default function SeoContent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="w-full my-2">
      <div className="border border-[#ebe5e9] rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="w-full flex items-center justify-between gap-4 min-h-[52px] px-4 sm:px-5 py-3.5 text-left text-[13px] font-semibold text-[#29232a] hover:bg-[#faf8f9] transition-colors"
          aria-expanded={isOpen}
        >
          <span>More about gifting with Giftlaya</span>
          <ChevronDown
            className={`w-4 h-4 text-[#978893] transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180 text-[#9b1b45]" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-[#f7f2f5]">
            <div
              className="seo-content text-[13px] leading-[1.8] text-[#554750] [&_h1]:text-[17px] [&_h1]:font-bold [&_h1]:text-[#302636] [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:text-[#302636] [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:pt-4 [&_h2]:border-t [&_h2]:border-[#eee8f0] [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-[#302636] [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:mb-4 [&_li]:mb-1.5 [&_a]:text-[#9b1b45] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#7d1538] [&_strong]:text-[#3e3445] [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: rawSeoHtml }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
