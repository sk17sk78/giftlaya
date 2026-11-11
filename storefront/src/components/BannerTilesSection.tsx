"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { CategoryItem } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BannerTilesSectionProps {
  title: string;
  subtitle?: string;
  items: CategoryItem[];
  enableSlider?: boolean;
}

export default function BannerTilesSection({
  title,
  subtitle,
  items,
  enableSlider = true,
}: BannerTilesSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -360, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 360, behavior: "smooth" });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-3 sm:mb-4">
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

        {/* Desktop Chevron Controls */}
        {enableSlider && items.length > 4 && (
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
          className="flex overflow-x-auto snap-x snap-mandatory gap-3 sm:gap-4 pb-2 no-scrollbar scroll-smooth"
          tabIndex={0}
          aria-label={title}
        >
          {items.map((item, idx) => (
            <Link
              key={`${item.title}-${idx}`}
              href={item.href || "#"}
              aria-label={item.title || `${title} banner ${idx + 1}`}
              className="snap-start shrink-0 w-[140px] sm:w-[180px] md:w-[200px] lg:w-[215px] group block rounded-[18px] overflow-hidden border border-[#f0e8ed] bg-white hover:border-[#d9a9bd] shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#faf8f9]">
                <img
                  src={item.image}
                  alt={item.title || title}
                  width={360}
                  height={480}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
          {items.map((item, idx) => (
            <Link
              key={`${item.title}-${idx}`}
              href={item.href || "#"}
              aria-label={item.title || `${title} banner ${idx + 1}`}
              className="group block rounded-[18px] overflow-hidden border border-[#f0e8ed] bg-white hover:border-[#d9a9bd] shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#faf8f9]">
                <img
                  src={item.image}
                  alt={item.title || title}
                  width={360}
                  height={480}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
