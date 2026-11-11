"use client";

import React, { useState } from "react";
import { FaqItem } from "@/types";
import { Plus, Minus } from "lucide-react";

interface FaqAccordionProps {
  items: FaqItem[];
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<number | string | null>(null);

  const toggle = (id: number | string) => {
    setOpenId(prev => (prev === id ? null : id));
  };

  // FAQ Schema JSON-LD for rich snippets
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="w-full my-4" aria-label="Frequently Asked Questions">
      {/* JSON-LD Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#f3edfb] border border-[#aa8ac8] flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
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
          </svg>
        </div>
        <div>
          <h2 className="font-heading text-[18px] sm:text-[22px] font-bold text-[#29232a] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-[12px] sm:text-[13px] text-[#7b6d76]">
            Everything you need to know about Giftlaya
          </p>
        </div>
      </div>

      {/* FAQ Grid: 2 columns on tablet/desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {items.map(item => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className="border border-[#ebe5e9] rounded-2xl bg-white overflow-hidden shadow-sm transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[#fdf7fa] transition-colors"
                aria-expanded={isOpen}
              >
                <span className="text-[13px] font-semibold text-[#34212a] leading-snug">
                  {item.question}
                </span>
                <span
                  className="w-6 h-6 rounded-full bg-[#f8edf2] text-[#9b1b45] flex items-center justify-center shrink-0 transition-transform duration-200"
                  aria-hidden="true"
                >
                  {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-[#f7f2f5] animate-in fade-in-50 duration-200">
                  <p className="text-[12px] sm:text-[13px] leading-relaxed text-[#554750]">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
