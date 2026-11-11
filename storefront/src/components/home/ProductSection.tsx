"use client";

import React, { useRef, useState, useEffect } from "react";
import { Product } from "@/types";
import { ProductCard } from "@/components/ui/ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  enableSlider?: boolean;
  viewAllHref?: string;
}

export function ProductSection({
  title,
  subtitle,
  products,
  enableSlider = true,
}: ProductSectionProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    if (enableSlider) {
      checkScroll();
      const el = trackRef.current;
      if (el) {
        el.addEventListener("scroll", checkScroll, { passive: true });
        window.addEventListener("resize", checkScroll);
        return () => {
          el.removeEventListener("scroll", checkScroll);
          window.removeEventListener("resize", checkScroll);
        };
      }
    }
  }, [enableSlider, products]);

  const scroll = (direction: "left" | "right") => {
    if (!trackRef.current) return;
    const scrollAmount = trackRef.current.clientWidth * 0.8;
    trackRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="min-w-0" aria-label={title}>
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[17px] sm:text-xl font-bold text-[#29232a] tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-[#856e7b] mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Tablet/Desktop Left/Right Arrows (Only in slider mode) */}
        {enableSlider && (
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                aria-label={`Scroll ${title} left`}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-brand/40 hover:bg-[#fcf2f6] disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4 text-[#29232a]" />
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                aria-label={`Scroll ${title} right`}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-brand/40 hover:bg-[#fcf2f6] disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs"
              >
                <ChevronRight className="w-4 h-4 text-[#29232a]" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* CONTENT: EITHER SLIDER (ON) OR GRID (OFF) */}
      {enableSlider ? (
        /* SLIDER ON: Horizontal scroll track with peek effect */
        <div
          ref={trackRef}
          tabIndex={0}
          aria-label={`${title} products`}
          className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto snap-x-mandatory no-scrollbar py-1 -my-1 px-0.5 -mx-0.5"
        >
          {products.map((product, idx) => (
            <div
              key={product.id || idx}
              className="shrink-0 snap-start basis-[46%] sm:basis-[calc((100%-36px)/3.3)] lg:basis-[calc((100%-64px)/5)]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        /* SLIDER OFF: CSS Grid wrap */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {products.map((product, idx) => (
            <div key={product.id || idx}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProductSection;
