"use client";

import React, { useState } from "react";
import Link from "next/link";
import { NavItem } from "@/types";
import { ChevronDown } from "lucide-react";

interface MegaMenuProps {
  items: NavItem[];
}

export function MegaMenu({ items }: MegaMenuProps) {
  const [activeItem, setActiveItem] = useState<string | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Categories navigation"
      className="hidden lg:block relative bg-white border-b border-[#f0e9ec] z-30"
    >
      <div className="max-w-[1200px] mx-auto px-4 lg:px-6">
        <ul className="flex items-center justify-between gap-0.5 py-1">
          {items.map((item, itemIdx) => {
            const colsCount = item.columns?.length || 0;
            const hasDropdown = colsCount > 0;
            const isCompact = colsCount === 1;
            const isNearRight = itemIdx >= items.length - 3;
            const isOpen = activeItem === item.title;

            return (
              <li
                key={item.title}
                className={isCompact || colsCount === 3 && itemIdx === items.length - 1 ? "relative group" : "static group"}
                onMouseEnter={() => hasDropdown && setActiveItem(item.title)}
                onMouseLeave={() => setActiveItem(null)}
              >
                <Link
                  href={item.href || "/"}
                  onClick={() => setActiveItem(null)}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg text-[12px] font-semibold tracking-tight whitespace-nowrap transition-colors ${
                    isOpen
                      ? "text-[#9b1b45] bg-[#f8edf2]"
                      : "text-[#49333f] hover:text-[#9b1b45] hover:bg-[#faf3f6]"
                  }`}
                >
                  <span>{item.title}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#9b1b45] text-white">
                      {item.badge}
                    </span>
                  )}
                  {hasDropdown && (
                    <ChevronDown
                      className={`w-3 h-3 text-[#8d7b87] transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#9b1b45]" : ""
                      }`}
                    />
                  )}
                </Link>

                {/* Mega Menu Dropdown */}
                {hasDropdown && isOpen && (
                  <div
                    className={`absolute top-full pt-1.5 z-50 ${
                      isCompact
                        ? `${isNearRight ? "right-0" : "left-0"} w-[260px]`
                        : isNearRight
                        ? "right-0 w-[680px] max-w-[92vw]"
                        : "left-1/2 -translate-x-1/2 w-[1080px] max-w-[94vw]"
                    }`}
                    onMouseEnter={() => setActiveItem(item.title)}
                    onMouseLeave={() => setActiveItem(null)}
                  >
                    <div className="bg-white border border-[#e9dfe6] rounded-2xl shadow-[0_12px_36px_rgba(57,32,51,0.14)] p-5 max-h-[calc(100vh-140px)] overflow-y-auto">
                      <div
                        className="grid gap-6 items-start"
                        style={{
                          gridTemplateColumns: `repeat(${Math.min(colsCount, 4)}, minmax(0, 1fr))`,
                        }}
                      >
                        {item.columns?.map((col) => (
                          <div key={col.title} className="flex flex-col gap-2.5 min-w-0">
                            <h4 className="text-[11px] font-bold text-[#29232a] tracking-tight uppercase border-b border-[#f0e9ec] pb-1.5">
                              {col.title}
                            </h4>
                            <ul className="flex flex-col gap-1.5">
                              {col.links.map((link) => (
                                <li key={link.label}>
                                  <Link
                                    href={link.href}
                                    onClick={() => setActiveItem(null)}
                                    className="group/link flex items-center gap-2 text-[12px] text-[#554750] hover:text-[#9b1b45] hover:translate-x-0.5 transition-all py-0.5"
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full bg-[#dfd5da] group-hover/link:bg-[#9b1b45] transition-colors shrink-0"
                                      aria-hidden="true"
                                    />
                                    <span className="truncate">{link.label}</span>
                                    {link.badge && (
                                      <span className="text-[9px] font-semibold text-[#9b1b45] bg-[#f8edf2] px-1 py-0.5 rounded shrink-0">
                                        {link.badge}
                                      </span>
                                    )}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export default MegaMenu;
