"use client";

import React, { useRef } from "react";
import { ReviewsData } from "@/types";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface CustomerReviewsProps {
  data: ReviewsData;
}

export default function CustomerReviews({ data }: CustomerReviewsProps) {
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

  if (!data || !data.reviews || data.reviews.length === 0) return null;

  return (
    <section className="w-full my-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {/* Custom Reviews Badge Icon */}
          <div className="w-9 h-9 rounded-xl bg-[#fff5db] border border-[#d5a64f] flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path
                d="M8 5h16a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H13l-6 4v-4a5 5 0 0 1-4-5V10a5 5 0 0 1 5-5Z"
                fill="#FFF5DB"
                stroke="#D5A64F"
                strokeWidth="1.5"
              />
              <path
                d="m16 9 1.9 3.8 4.2.6-3 3 .7 4.2-3.8-2-3.8 2 .7-4.2-3-3 4.2-.6L16 9Z"
                fill="#F6C256"
                stroke="#D79B2C"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-heading text-[18px] sm:text-[22px] font-bold text-[#29232a] tracking-tight">
              Customer Reviews
            </h2>
            <p className="text-[12px] sm:text-[13px] text-[#7b6d76]">
              Little moments, shared
            </p>
          </div>
        </div>

        {/* Rating summary & Navigation Arrows */}
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="flex items-center gap-2 bg-[#fdf2f5] border border-[#f8c2d2] px-3 py-1.5 rounded-full">
            <strong className="text-[14px] font-bold text-[#9b1b45]">
              {data.rating}
              <small className="text-[11px] font-normal text-[#70636c]"> / 5</small>
            </strong>
            <div className="flex items-center text-[#f6c256]">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < 4 ? "fill-[#f6c256] text-[#f6c256]" : "fill-[#f6c256]/40 text-[#f6c256]"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-[#70636c] font-medium">
              ({data.totalReviews} reviews)
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={scrollLeft}
              aria-label="Scroll reviews left"
              className="w-8 h-8 rounded-full border border-[#e4dae0] bg-white flex items-center justify-center text-[#49333f] hover:border-[#9b1b45] hover:bg-[#fdf2f5] hover:text-[#9b1b45] transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={scrollRight}
              aria-label="Scroll reviews right"
              className="w-8 h-8 rounded-full border border-[#e4dae0] bg-white flex items-center justify-center text-[#49333f] hover:border-[#9b1b45] hover:bg-[#fdf2f5] hover:text-[#9b1b45] transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Slider */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 sm:gap-4 pb-2 no-scrollbar scroll-smooth"
        tabIndex={0}
        aria-label="Customer Reviews Slider"
      >
        {data.reviews.map(review => (
          <div
            key={review.id}
            className="snap-start shrink-0 w-[270px] sm:w-[320px] rounded-2xl bg-white border border-[#f0e8ed] p-4 flex flex-col justify-between shadow-sm hover:border-[#dcb4c5] transition-all duration-200"
          >
            <div>
              {/* Quote mark icon */}
              <div className="text-[#e2b6c7] mb-2">
                <Quote className="w-5 h-5 rotate-180 fill-[#fdf2f5]" />
              </div>

              {/* Rating stars */}
              <div className="flex items-center gap-0.5 text-[#f6c256] mb-2">
                {[...Array(review.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#f6c256]" />
                ))}
              </div>

              {/* Comment */}
              <blockquote className="text-[12px] sm:text-[13px] leading-relaxed text-[#49333f] italic line-clamp-4">
                &ldquo;{review.comment}&rdquo;
              </blockquote>
            </div>

            {/* Reviewer Details */}
            <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-[#f7f2f5]">
              <div className="w-8 h-8 rounded-full bg-[#fdf2f5] border border-[#f8c2d2] text-[#9b1b45] font-bold text-[11px] flex items-center justify-center shrink-0">
                {review.initials}
              </div>
              <div className="min-w-0">
                <strong className="block text-[12px] font-bold text-[#29232a] truncate">
                  {review.name}
                </strong>
                <span className="block text-[10px] text-[#856e7b] truncate">
                  {review.city}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
