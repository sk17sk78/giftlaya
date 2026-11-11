"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Banner } from "@/types";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

interface HeroSliderProps {
  banners: Banner[];
}

export default function HeroSlider({ banners }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const nextBanner = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevBanner = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Autoplay
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(nextBanner, 4500);
    return () => clearInterval(interval);
  }, [isPlaying, nextBanner]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      nextBanner();
    } else if (distance < -50) {
      prevBanner();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!banners || banners.length === 0) return null;

  return (
    <div className="w-full relative overflow-hidden" role="region" aria-label="Featured collections" aria-roledescription="carousel">
      {/* Banner Slides */}
      <div
        className="w-full relative aspect-[2/1] sm:aspect-[3/1] bg-gray-100 overflow-hidden sm:rounded-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              index === currentIndex ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <Link href={banner.href || "#"} aria-label={banner.label || "Banner"} className="block w-full h-full relative">
              <picture className="block w-full h-full">
                <source media="(max-width: 640px)" srcSet={banner.mobileImage} />
                <img
                  src={banner.desktopImage}
                  alt={banner.label || "Banner"}
                  loading={index === 0 ? "eager" : "lazy"}
                  className="w-full h-full object-cover"
                />
              </picture>
            </Link>
          </div>
        ))}
      </div>

      {/* Banner Controls (Exact Giftlaya layout: dots on left, counter + chevrons + pause on right) */}
      <div className="max-w-[1168px] mx-auto px-4 py-2 flex items-center justify-between gap-4">
        {/* Banner Dots */}
        <div className="flex items-center gap-1.5">
          {banners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to banner ${idx + 1}`}
              className="p-1 focus:outline-none"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentIndex
                    ? "w-5 bg-[#9b1b45]"
                    : "w-1.5 bg-[#dfd5da] hover:bg-[#bca6b4]"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Counter & Arrows & Play/Pause */}
        <div className="flex items-center gap-1.5 text-[#70636c] text-[11px] font-semibold tabular-nums">
          <button
            type="button"
            onClick={prevBanner}
            aria-label="Previous banner"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span aria-live="off" className="px-1">
            {currentIndex + 1} / {banners.length}
          </span>

          <button
            type="button"
            onClick={nextBanner}
            aria-label="Next banner"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(p => !p)}
            aria-label={isPlaying ? "Pause banners" : "Play banners"}
            className="w-7 h-7 ml-1 rounded-full flex items-center justify-center hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
