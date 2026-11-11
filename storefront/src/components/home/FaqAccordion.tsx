"use client";

import React, { useState } from "react";
import { FaqItem } from "@/types";
import { Plus, Minus } from "lucide-react";

interface FaqAccordionProps {
  faqs: FaqItem[];
  title?: string;
  subtitle?: string;
}

export function FaqAccordion({
  faqs,
  title = "Frequently Asked Questions",
  subtitle = "Everything you need to know about Giftlaya",
}: FaqAccordionProps) {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);

  const toggle = (idx: number) => {
    setOpenIndexes((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Build JSON-LD schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="border border-[#ebe5ed] rounded-[18px] bg-white p-5 sm:p-7" aria-label={title}>
      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="flex items-center gap-3.5 pb-4 mb-4 border-b border-[#f0e8ed]">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <path
            d="M8 4h16a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5h-9l-7 4v-4a5 5 0 0 1-5-5V9a5 5 0 0 1 5-5Z"
            fill="#F3EDFB"
            stroke="#AA8AC8"
            strokeWidth="1.5"
          />
          <path
            d="M12.5 12a3.5 3.5 0 1 1 5.7 2.7c-1.2.8-2.2 1.3-2.2 2.8"
            stroke="#8F64B4"
            strokeWidth="1.8"
          />
          <circle cx="16" cy="21" r="1" fill="#8F64B4" />
          <path
            d="m27 2 .7 2.3L30 5l-2.3.7L27 8l-.7-2.3L24 5l2.3-.7L27 2Z"
            fill="#E993AD"
          />
        </svg>
        <div>
          <h2 className="text-[17px] sm:text-xl font-bold text-[#29232a]">
            {title}
          </h2>
          <p className="text-xs text-[#856e7b] mt-0.5">
            {subtitle}
          </p>
        </div>
      </header>

      {/* FAQ items in 2 columns on tablet & desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
        {faqs.map((faq, idx) => {
          const isOpen = openIndexes.includes(idx);

          return (
            <div
              key={idx}
              className="border border-[#f0e8ed] rounded-xl overflow-hidden bg-[#faf8f9]/50 transition-colors"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between p-4 text-left text-xs sm:text-[13px] font-bold text-[#29232a] hover:text-brand transition-colors gap-3 select-none"
              >
                <span>{faq.question}</span>
                <span className="p-1 rounded-md bg-white border border-[#eee5e9] text-gray-500 shrink-0">
                  {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-xs text-[#4a3f4e] leading-relaxed border-t border-[#f0e8ed]/60 bg-white animate-fade-in">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

