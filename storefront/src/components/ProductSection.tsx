"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { Product } from "@/types";
import ProductCard from "@/components/ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  enableSlider?: boolean;
  viewAllHref?: string;
}

export default function ProductSection({
  title,
  subtitle,
  products,
  enableSlider = true,
  viewAllHref,
}: ProductSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -460, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 460, behavior: "smooth" });
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="w-full">
      {/* Section Header */}
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

        {/* Section Actions: Arrows for slider or View All link */}
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-[12px] font-semibold text-[#9b1b45] hover:underline"
            >
              View all
            </Link>
          )}

          {enableSlider && (
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
      </div>

      {/* Content: Slider vs Grid */}
      {enableSlider ? (
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-3 sm:gap-4 pb-2 no-scrollbar scroll-smooth"
          tabIndex={0}
          aria-label={title}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="snap-start shrink-0 w-[155px] sm:w-[195px] md:w-[215px] lg:w-[220px]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {products.map((product) => (
            <div key={product.id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
