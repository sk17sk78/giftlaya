"use client";

import React from "react";
import Link from "next/link";
import { Product } from "@/types";
import { ArrowUpRight, Clock3 } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group block min-w-0 border border-[#f0e8ed] rounded-[17px] bg-white overflow-hidden hover:border-[#dcb4c5] transition-all duration-200 shadow-sm hover:shadow-md">
      <Link href={product.href || `/p/${product.slug}`} className="block">
        {/* Product Image Box */}
        <div className="relative aspect-square overflow-hidden bg-[#faf3f6]">
          <img
            src={product.image}
            alt={product.title}
            width={400}
            height={400}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Arrow View Product Floating Button */}
          <span
            className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white text-[#693c50] flex items-center justify-center shadow-md opacity-90 group-hover:opacity-100 group-hover:bg-[#9b1b45] group-hover:text-white transition-all duration-200"
            aria-hidden="true"
          >
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>

        {/* Product Info */}
        <div className="p-2.5 sm:p-3.5 flex flex-col justify-between">
          <h3 className="line-clamp-2 min-h-[36px] sm:min-h-[38px] text-[12px] sm:text-[13px] font-semibold leading-[18px] sm:leading-[19px] text-[#49333f] group-hover:text-[#9b1b45] transition-colors">
            {product.title}
          </h3>

          {/* Pricing */}
          <div className="flex items-baseline flex-wrap gap-1.5 mt-2">
            <strong className="text-[14px] sm:text-[17px] font-extrabold tracking-tight text-[#34212a]">
              ₹{product.price.toLocaleString("en-IN")}
            </strong>
            {Boolean(product.originalPrice && product.originalPrice > product.price) && (
              <del className="text-[10px] sm:text-[11px] text-[#a3979d]">
                ₹{product.originalPrice?.toLocaleString("en-IN")}
              </del>
            )}
            {product.discount && (
              <span className="text-[9px] sm:text-[10px] font-bold text-[#47816b] whitespace-nowrap">
                {product.discount}
              </span>
            )}
          </div>

          {/* Delivery Tag */}
          <p className="flex items-center gap-1 mt-2 text-[9px] sm:text-[10px] text-[#856e7b] truncate">
            <Clock3 className="w-3 h-3 shrink-0 text-[#856e7b]" />
            <span className="truncate">{product.deliveryTag || "Same-day delivery"}</span>
          </p>
        </div>
      </Link>
    </div>
  );
}
