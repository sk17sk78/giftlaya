"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { TileItem } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TilesSectionProps {
  title: string;
  subtitle?: string;
  tiles: TileItem[];
  variant?: "category" | "circle" | "portrait" | "rectangle" | "banner";
  isSlider?: boolean;
  columnsMobile?: number;
  columnsDesktop?: number;
  showArrows?: boolean;
}

export function TilesSection({
  title,
  subtitle,
  tiles,
  variant = "category",
  isSlider = false,
  columnsMobile = 4,
  columnsDesktop = 8,
  showArrows,
}: TilesSectionProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const isPortrait = variant === "portrait" || variant === "banner";
  const isRectangle = variant === "rectangle";
  const isBannerLike = isPortrait || isRectangle;
  const isCircle = variant === "circle";
  const displayArrows = showArrows ?? isBannerLike;

  const checkScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    if (isSlider) {
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
  }, [isSlider, tiles]);

  const scroll = (direction: "left" | "right") => {
    if (!trackRef.current) return;
    const scrollAmount = trackRef.current.clientWidth * 0.75;
    trackRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!tiles || tiles.length === 0) return null;

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

        {/* Navigation Arrows (for banner/portrait/rectangle slider sections on sm+) */}
        {isSlider && displayArrows && (
          <div className="hidden sm:flex items-center gap-1.5">
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
          </div>
        )}
      </div>

      {isSlider ? (
        /* Scrollable Tile Track using exact Giftlaya --m and --d ratios */
        <div
          ref={trackRef}
          tabIndex={0}
          aria-label={`${title} categories`}
          className="giftlaya-tile-track"
          style={
            {
              "--m": columnsMobile,
              "--d": columnsDesktop,
            } as React.CSSProperties
          }
        >
          {tiles.map((tile, idx) => {
            const tileTitle = tile.title || tile.name || "";
            const shapeClass = isRectangle
              ? "aspect-video rounded-[16px]"
              : isPortrait
              ? "aspect-[3/4] rounded-[16px]"
              : isCircle
              ? "aspect-square rounded-full p-2.5"
              : "aspect-square rounded-[18px] p-1.5";

            return (
              <Link
                key={tile.id || idx}
                href={tile.href || "#"}
                aria-label={tileTitle || title}
                className="group flex flex-col items-center gap-2 text-center min-w-0"
              >
                <div
                  className={`relative w-full bg-[#fcf4f7] border border-[#f0e9ed] overflow-hidden transition-all duration-200 group-hover:border-brand/40 group-hover:shadow-card ${shapeClass}`}
                >
                  {tile.image && (
                    <Image
                      src={tile.image}
                      alt={tileTitle || (tile as any).alt || ""}
                      fill
                      sizes={
                        isRectangle
                          ? "(min-width: 640px) 30vw, 68vw"
                          : isPortrait
                          ? "(min-width: 640px) 20vw, 42vw"
                          : "(min-width: 640px) 15vw, 25vw"
                      }
                      className={`${
                        isBannerLike || isCircle
                          ? "object-cover"
                          : "object-contain p-1"
                      } ${isCircle ? "rounded-full" : ""} transition-transform duration-300 group-hover:scale-105`}
                    />
                  )}
                </div>
                {!isBannerLike && tileTitle && (
                  <span className="text-[11px] sm:text-xs font-medium text-[#493f49] group-hover:text-brand line-clamp-1 transition-colors">
                    {tileTitle}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        /* Tile Grid (e.g. Fresh Flowers --m:3;--d:6) */
        <div
          className="giftlaya-tile-grid"
          style={
            {
              "--m": columnsMobile,
              "--d": columnsDesktop,
            } as React.CSSProperties
          }
        >
          {tiles.map((tile, idx) => {
            const tileTitle = tile.title || tile.name || "";
            return (
              <Link
                key={tile.id || idx}
                href={tile.href || "#"}
                aria-label={tileTitle}
                className="group flex flex-col items-center gap-2 text-center min-w-0"
              >
                <div
                  className={`relative w-full aspect-square bg-[#fcf4f7] border border-[#f0e9ed] overflow-hidden transition-all duration-200 group-hover:border-brand/40 group-hover:shadow-card group-hover:bg-white ${
                    isCircle ? "rounded-full p-2.5" : "rounded-[18px] p-1.5"
                  }`}
                >
                  {tile.image && (
                    <Image
                      src={tile.image}
                      alt={tileTitle}
                      fill
                      sizes="(min-width: 640px) 15vw, 33vw"
                      className={`${
                        isCircle ? "object-cover rounded-full" : "object-contain p-1"
                      } transition-transform duration-300 group-hover:scale-105`}
                    />
                  )}
                </div>
                {tileTitle && (
                  <span className="text-[11px] sm:text-xs font-medium text-[#493f49] group-hover:text-brand line-clamp-1 transition-colors">
                    {tileTitle}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default TilesSection;
