"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeroBanner } from "@/types";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

interface HeroSliderProps {
  banners: HeroBanner[];
}

export function HeroSlider({ banners }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Autoplay
  useEffect(() => {
    if (isPaused || banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, banners.length]);

  if (!banners || banners.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) handleNext();
    if (diff < -50) handlePrev();
    touchStartX.current = null;
  };

  return (
    <section
      className="relative group w-full"
      aria-label="Featured promotions"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Banner Viewport */}
      <div className="relative overflow-hidden sm:rounded-[16px] bg-[#fcf2f6]">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((b, idx) => {
            const desktopSrc = b.desktopImage || b.image || b.src || "";
            const mobileSrc = b.mobileImage || b.desktopImage || b.image || b.src || "";
            const linkHref = b.href || b.link || "/flowers";
            const altText = b.alt || b.label || b.title || "Featured Giftlaya promotion";

            return (
              <div key={b.id || idx} className="w-full shrink-0" data-idx={idx}>
                <Link href={linkHref} className="block w-full">
                  {/* Mobile Banner (< 640px) */}
                  <div className="relative aspect-[16/9] w-full sm:hidden bg-[#fcf2f6]">
                    {mobileSrc && (
                      <Image
                        src={mobileSrc}
                        alt={altText}
                        fill
                        priority={idx === 0}
                        sizes="100vw"
                        className="object-cover"
                      />
                    )}
                  </div>

                  {/* Tablet & Desktop Banner (>= 640px) */}
                  <div className="hidden sm:block relative aspect-[32/10] w-full bg-[#fcf2f6]">
                    {desktopSrc && (
                      <Image
                        src={desktopSrc}
                        alt={altText}
                        fill
                        priority={idx === 0}
                        sizes="(min-width: 1200px) 1152px, 100vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls Strip Below Banner */}
      {banners.length > 1 && (
        <div className="flex items-center justify-between mt-3 px-4 sm:px-0">
          {/* Indicator Bars on Left */}
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose banner">
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={currentIndex === idx}
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? "w-5 bg-[#9b1b45]"
                    : "w-1.5 bg-[#e2cdd7] hover:bg-[#c8a3b5]"
                }`}
              />
            ))}
          </div>

          {/* Counter, Prev/Next, and Pause/Play on Right */}
          <div className="flex items-center gap-2 text-[#574451]">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous banner"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#fcf2f6] hover:text-[#9b1b45] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-semibold tracking-wider text-[#574451] min-w-[28px] text-center">
              {currentIndex + 1} / {banners.length}
            </span>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next banner"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#fcf2f6] hover:text-[#9b1b45] transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              aria-label={isPaused ? "Play slider" : "Pause slider"}
              className="w-7 h-7 rounded-lg border border-[#eee5ea] bg-[#fcfafb] flex items-center justify-center text-[#70636c] hover:border-[#dcb4c5] hover:text-[#9b1b45] transition-colors ml-1"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default HeroSlider;
