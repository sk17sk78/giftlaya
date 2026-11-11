"use client";

import React, { useRef, useState, useEffect } from "react";
import { ReviewItem } from "@/types";
import { Star, ChevronLeft, ChevronRight, MessageSquareQuote } from "lucide-react";

interface CustomerReviewsProps {
  reviews: ReviewItem[];
  title?: string;
  subtitle?: string;
}

export function CustomerReviews({
  reviews,
  title = "Customer Reviews",
  subtitle = "Little moments, shared",
}: CustomerReviewsProps) {
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
  }, [reviews]);

  const scroll = (direction: "left" | "right") => {
    if (!trackRef.current) return;
    const amount = trackRef.current.clientWidth * 0.75;
    trackRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="min-w-0" aria-label={title}>
      {/* Header */}
      <header className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-2xl bg-[#fff5db] text-[#efab18] shrink-0 border border-[#f5e4be]">
          <MessageSquareQuote className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-[17px] sm:text-xl font-bold text-[#29232a] tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-[#856e7b] mt-0.5">
            {subtitle}
          </p>
        </div>
      </header>

      {/* Rating Summary & Slider Arrows Bar */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <strong className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#29232a] leading-none">
            4.3 <small className="text-xs font-medium text-[#856e7b]">/ 5</small>
          </strong>
          <div>
            <div className="flex items-center gap-0.5 text-[#efab18]" role="img" aria-label="4.3 out of 5 stars">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-[#efab18] text-[#efab18]" />
              ))}
            </div>
            <span className="block text-[11px] text-[#856e7b] mt-1 font-medium">
              {reviews.length} reviews
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll reviews left"
            className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-brand/40 hover:bg-[#fcf2f6] disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4 text-[#29232a]" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll reviews right"
            className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-brand/40 hover:bg-[#fcf2f6] disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs"
          >
            <ChevronRight className="w-4 h-4 text-[#29232a]" />
          </button>
        </div>
      </div>

      {/* Reviews Slider Track */}
      <div
        ref={trackRef}
        tabIndex={0}
        aria-label="Customer review cards"
        className="flex items-stretch gap-3.5 overflow-x-auto snap-x-mandatory no-scrollbar py-1 -my-1 px-0.5 -mx-0.5"
      >
        {reviews.map((rev, idx) => (
          <article
            key={rev.id || idx}
            className="shrink-0 snap-start basis-[82%] sm:basis-[calc((100%-14px)/2)] lg:basis-[calc((100%-28px)/3)] p-5 rounded-[18px] bg-white border border-[#f0e8ed] shadow-2xs flex flex-col justify-between"
          >
            <div>
              {/* Stars & Quote */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center text-[#efab18]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#efab18] text-[#efab18]" />
                  ))}
                </div>
                <span className="text-2xl font-serif text-brand/30 leading-none select-none">
                  “
                </span>
              </div>

              {/* Review Text */}
              <p className="text-xs sm:text-[13px] text-[#4a3f4e] leading-relaxed line-clamp-4">
                {rev.comment || rev.text}
              </p>
            </div>

            {/* Author */}
            <footer className="flex items-center gap-2.5 mt-4 pt-3.5 border-t border-gray-100">
              <span className="w-8 h-8 rounded-full bg-[#fdf2f5] text-brand font-bold text-xs flex items-center justify-center shrink-0 border border-[#f6bdce]">
                {rev.initials}
              </span>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-[#29232a] truncate">
                  {rev.name}
                </h3>
                <p className="text-[11px] text-[#856e7b] truncate">
                  {rev.city}
                </p>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
