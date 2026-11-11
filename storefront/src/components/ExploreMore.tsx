"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ExploreSection } from "@/types";
import { ChevronDown, MapPin } from "lucide-react";

interface ExploreMoreProps {
  sections: ExploreSection[];
}

export default function ExploreMore({ sections }: ExploreMoreProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(prev => (prev === idx ? null : idx));
  };

  if (!sections || sections.length === 0) return null;

  return (
    <section className="w-full my-4" aria-label="Explore more categories and locations">
      <div className="mb-4">
        <h2 className="font-heading text-[18px] sm:text-[22px] font-bold text-[#29232a] tracking-tight">
          Explore more
        </h2>
        <p className="text-[12px] sm:text-[13px] text-[#7b6d76]">
          Categories, services &amp; delivery locations
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {sections.map((sec, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={sec.title}
              className="border border-[#ebe5e9] rounded-2xl bg-white overflow-hidden shadow-sm transition-all"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-[#fdf8fa] transition-colors"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] sm:text-[14px] font-bold text-[#34212a]">
                    {sec.title}
                  </span>
                  <span className="text-[11px] font-semibold text-[#9b1b45] bg-[#f8edf2] px-2 py-0.5 rounded-full">
                    {sec.links.length}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#8d7b87] transition-transform duration-200 shrink-0 ${
                    isOpen ? "rotate-180 text-[#9b1b45]" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-5 pt-1 border-t border-[#f7f2f5] animate-in fade-in-50 duration-200">
                  <div className="flex flex-wrap gap-2 pt-2">
                    {sec.links.map(link => (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf7f9] border border-[#f0e9ed] text-[12px] text-[#554750] hover:text-[#9b1b45] hover:border-[#d9a9bd] hover:bg-[#fdf2f5] transition-all"
                      >
                        {sec.title.includes("Cities") && (
                          <MapPin className="w-3 h-3 text-[#9b1b45] shrink-0" />
                        )}
                        <span>{link.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
