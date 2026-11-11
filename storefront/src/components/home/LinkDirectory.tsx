"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LinkDirectoryGroup } from "@/types";
import { ChevronDown, ChevronRight, Layers, Sparkles, Cake, Flower } from "lucide-react";

interface LinkDirectoryProps {
  groups: LinkDirectoryGroup[];
  title?: string;
  subtitle?: string;
}

export function LinkDirectory({
  groups,
  title = "Explore more",
  subtitle = "Categories, services & delivery locations",
}: LinkDirectoryProps) {
  const [openGroups, setOpenGroups] = useState<number[]>([]);

  const toggleGroup = (idx: number) => {
    setOpenGroups((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const getGroupIcon = (index: number) => {
    switch (index % 4) {
      case 0:
        return <Sparkles className="w-5 h-5 text-brand" />;
      case 1:
        return <Layers className="w-5 h-5 text-brand" />;
      case 2:
        return <Cake className="w-5 h-5 text-brand" />;
      case 3:
      default:
        return <Flower className="w-5 h-5 text-brand" />;
    }
  };

  if (!groups || groups.length === 0) return null;

  const mid = Math.ceil(groups.length / 2);
  const columns = [groups.slice(0, mid), groups.slice(mid)].filter(
    (col) => col.length > 0
  );

  return (
    <section className="border border-[#ebe5ed] rounded-[18px] bg-white p-5 sm:p-7" aria-label={title}>
      {/* Header */}
      <header className="mb-5 sm:mb-6">
        <h2 className="text-[17px] sm:text-xl font-bold text-[#29232a] tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-[#856e7b] mt-0.5">
          {subtitle}
        </p>
      </header>

      {/* Accordion Columns (independent vertical stacks prevent cross-column stretch) */}
      <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-3.5">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="grid gap-3.5 min-w-0">
            {col.map((group, localIdx) => {
              const idx = colIdx === 0 ? localIdx : mid + localIdx;
              const isOpen = openGroups.includes(idx);

              return (
                <div
                  key={group.title}
                  className="border border-[#f0e8ed] rounded-xl overflow-hidden bg-[#faf8f9]/60 transition-colors"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleGroup(idx)}
                    className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-[#fcf2f6]/50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="p-1.5 rounded-lg bg-white border border-[#f0e8ed] shrink-0">
                        {getGroupIcon(idx)}
                      </span>
                      <span className="text-xs sm:text-[13px] font-bold text-[#29232a] truncate">
                        {group.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#fdf2f5] text-brand text-[10px] font-bold shrink-0">
                        {group.links.length}
                      </span>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-brand" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="p-4 border-t border-[#f0e8ed] bg-white max-h-[300px] overflow-y-auto animate-fade-in">
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {group.links.map((link, lIdx) => (
                          <li key={lIdx}>
                            <Link
                              href={link.href}
                              className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-[#fdf2f5] text-[#4a3f4e] hover:text-brand transition-colors group"
                            >
                              <span className="truncate">{link.label}</span>
                              <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-brand shrink-0 ml-1" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

