"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { CategoryItem } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryCircleSectionProps {
  title: string;
  subtitle?: string;
  items: CategoryItem[];
  enableSlider?: boolean;
  showIllustration?: boolean;
}

export default function CategoryCircleSection({
  title,
  subtitle,
  items,
  enableSlider = true,
  showIllustration = false,
}: CategoryCircleSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-3 sm:mb-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-heading text-[18px] sm:text-[22px] font-bold text-[#29232a] tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[12px] sm:text-[13px] text-[#7b6d76] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {showIllustration && (
            <svg
              className="w-10 h-10 hidden sm:block shrink-0"
              viewBox="0 0 44 44"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="22" cy="22" r="21" fill="#fff5ed" />
              <path
                d="M11 21h22v13a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V21Z"
                fill="#ffcca6"
              />
              <path
                d="M17 21v-4a5 5 0 0 1 10 0v4"
                stroke="#ff844b"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path d="M11 21h22" stroke="#ff844b" strokeWidth="2" />
            </svg>
          )}
        </div>

        {/* Desktop Chevron Controls */}
        {enableSlider && items.length > 5 && (
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={scrollLeft}
              aria-label={`Scroll ${title} left`}
              className="w-8 h-8 rounded-full border border-[#e4dae0] bg-white flex items-center justify-center text-[#49333f] hover:border-[#9b1b45] hover:bg-[#fdf2f5] hover:text-[#9b1b45] transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={scrollRight}
              aria-label={`Scroll ${title} right`}
              className="w-8 h-8 rounded-full border border-[#e4dae0] bg-white flex items-center justify-center text-[#49333f] hover:border-[#9b1b45] hover:bg-[#fdf2f5] hover:text-[#9b1b45] transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tiles Display (Slider vs Grid) */}
      {enableSlider ? (
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-2 sm:gap-4 pb-2 no-scrollbar scroll-smooth"
          tabIndex={0}
          aria-label={title}
        >
          {items.map((item, idx) => (
            <Link
              key={`${item.title}-${idx}`}
              href={item.href || "#"}
              aria-label={item.title}
              className="snap-start shrink-0 flex flex-col items-center gap-2 text-center group p-1.5 rounded-2xl hover:bg-[#fdf7fa] transition-colors w-[82px] sm:w-[104px] md:w-[116px]"
            >
              <div className="w-[68px] sm:w-[84px] md:w-[94px] aspect-square rounded-full bg-[#faf7f9] border border-[#f0e9ed] overflow-hidden p-1 flex items-center justify-center group-hover:border-[#d9a9bd] group-hover:scale-105 transition-all duration-200">
                <img
                  src={item.image}
                  alt={item.title}
                  width={150}
                  height={150}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-full scale-110"
                />
              </div>
              <span className="text-[11px] sm:text-[12px] font-semibold text-[#3e333c] group-hover:text-[#9b1b45] transition-colors line-clamp-2 max-w-full">
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4">
          {items.map((item, idx) => (
            <Link
              key={`${item.title}-${idx}`}
              href={item.href || "#"}
              aria-label={item.title}
              className="flex flex-col items-center gap-2 text-center group p-1.5 rounded-2xl hover:bg-[#fdf7fa] transition-colors"
            >
              <div className="w-[68px] sm:w-[84px] md:w-[94px] aspect-square rounded-full bg-[#faf7f9] border border-[#f0e9ed] overflow-hidden p-1 flex items-center justify-center group-hover:border-[#d9a9bd] group-hover:scale-105 transition-all duration-200">
                <img
                  src={item.image}
                  alt={item.title}
                  width={150}
                  height={150}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-full scale-110"
                />
              </div>
              <span className="text-[11px] sm:text-[12px] font-semibold text-[#3e333c] group-hover:text-[#9b1b45] transition-colors line-clamp-2 max-w-full">
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
