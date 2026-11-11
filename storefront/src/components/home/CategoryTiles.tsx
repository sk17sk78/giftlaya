"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { TileItem } from "@/types";

interface CategoryTilesProps {
  tiles: TileItem[];
  title?: string;
  subtitle?: string;
}

export function CategoryTiles({
  tiles,
  title = "Shop by category",
  subtitle = "Find a little joy for every occasion.",
}: CategoryTilesProps) {
  if (!tiles || tiles.length === 0) return null;

  return (
    <section className="pb-6 border-b border-[#f0e9ed] sm:p-6 sm:border sm:border-[#eee6eb] sm:rounded-[22px] sm:bg-white sm:shadow-[0_2px_12px_rgba(40,20,35,0.02)]" aria-label={title}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <h2 className="text-[17px] sm:text-xl font-bold text-[#29232a] tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-[#856e7b] mt-1">
            {subtitle}
          </p>
        </div>

        {/* Gift Box SVG Illustration */}
        <div className="shrink-0 hidden xs:block">
          <svg
            className="w-10 h-10 sm:w-11 sm:h-11"
            viewBox="0 0 44 44"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="22" cy="22" r="21" fill="#fff5ed" />
            <path
              d="M11 21h22v13a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V21Z"
              fill="#ffd7e4"
              stroke="#c53c70"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <rect
              x="9"
              y="16"
              width="26"
              height="7"
              rx="2.5"
              fill="#fff"
              stroke="#c53c70"
              strokeWidth="1.5"
            />
            <path
              d="M22 16v21m0-21c-12 0-11-11-5-8 3 2 5 8 5 8Zm0 0c12 0 11-11 5-8-3 2-5 8-5 8Z"
              stroke="#c53c70"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="m35 7 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"
              fill="#f7b53b"
            />
          </svg>
        </div>
      </div>

      {/* Grid: 4 cols on mobile, 8 cols on desktop */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-x-2.5 gap-y-4 sm:gap-x-4 sm:gap-y-5">
        {tiles.map((tile, idx) => {
          const tileName = tile.name || tile.title || "Category";
          return (
            <Link
              key={tile.id || idx}
              href={tile.href || "#"}
              aria-label={tileName}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <div className="relative w-full aspect-square rounded-[18px] bg-[#faf8f9] border border-[#f0e9ed] overflow-hidden p-2 transition-all duration-200 group-hover:border-brand/40 group-hover:shadow-card group-hover:bg-white">
                {tile.image ? (
                  <Image
                    src={tile.image}
                    alt={tileName}
                    fill
                    sizes="(min-width: 1024px) 120px, 22vw"
                    className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-brand font-medium">
                    {tileName}
                  </div>
                )}
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-[#493f49] group-hover:text-brand line-clamp-1 transition-colors">
                {tileName}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
