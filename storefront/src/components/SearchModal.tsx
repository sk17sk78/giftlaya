"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Product } from "@/types";
import { Search, X, ArrowUpRight, Flower2, CakeSlice, Gift, Sparkles } from "lucide-react";
import productsMock from "@/data/products.json";

export default function SearchModal() {
  const { isSearchOpen, closeSearch } = useApp();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery("");
    }
  }, [isSearchOpen]);

  // Combine products for search
  const allProducts: Product[] = [
    ...productsMock.trending,
    ...productsMock.topSellingCakes,
    ...productsMock.personalizedGifts,
    ...productsMock.plants,
  ];

  const results = query.trim()
    ? allProducts.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const quickLinks = [
    { label: "Flowers", href: "/flowers", icon: <Flower2 className="w-4 h-4 text-[#e15c84]" /> },
    { label: "Cakes", href: "/cakes", icon: <CakeSlice className="w-4 h-4 text-[#f59f00]" /> },
    { label: "Gifts", href: "/gifts", icon: <Gift className="w-4 h-4 text-[#9b1b45]" /> },
    { label: "Decorations", href: "/balloon-decorations", icon: <Sparkles className="w-4 h-4 text-[#845ef7]" /> },
  ];

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={closeSearch}
      />

      {/* Dialog Shell */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search gifts, flowers, cakes"
        className="relative w-full max-w-[640px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 pb-3 border-b border-[#f0e9ec] flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9b1b45]">
              FIND A LITTLE JOY
            </p>
            <h2 className="font-heading text-[18px] sm:text-[20px] font-bold text-[#29232a] mt-0.5">
              What are you looking for?
            </h2>
          </div>
          <button
            type="button"
            onClick={closeSearch}
            aria-label="Close search"
            className="w-8 h-8 rounded-full border border-[#eae3e8] flex items-center justify-center text-[#70636c] hover:bg-[#faf3f6] hover:text-[#9b1b45] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="p-4 bg-[#fffbfd] border-b border-[#f0e9ec]">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-[#8d7b87] absolute left-3.5 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Try roses, chocolate cake, birthday…"
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#faf7f9] border border-[#e4dae0] text-[14px] text-[#29232a] placeholder-[#9a8996] focus:outline-none focus:border-[#9b1b45] focus:bg-white transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {query.trim() === "" ? (
            /* Quick Recommendations */
            <div>
              <div className="mb-3">
                <h3 className="text-[12px] font-bold text-[#29232a] uppercase tracking-wider">
                  A good place to start
                </h3>
                <span className="text-[11px] text-[#9b7d91]">Find your kind of gift</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {quickLinks.map(q => (
                  <Link
                    key={q.label}
                    href={q.href}
                    onClick={closeSearch}
                    className="flex items-center gap-2.5 p-3 rounded-2xl border border-[#f0e8ed] bg-[#faf8f9] hover:bg-white hover:border-[#d9a9bd] hover:shadow-sm transition-all"
                  >
                    <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      {q.icon}
                    </span>
                    <span className="text-[12px] font-bold text-[#34212a]">{q.label}</span>
                  </Link>
                ))}
              </div>

              {/* Popular Searches Tags */}
              <div className="mt-5 pt-4 border-t border-[#f7f2f5]">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#9b7d91] mb-2.5">
                  Popular Searches
                </h4>
                <div className="flex flex-wrap gap-2">
                  {["Red Roses", "Bento Cake", "Photo Mug", "Room Decoration", "Carnations", "Anniversary Cake", "Lucky Bamboo"].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setQuery(tag)}
                      className="px-3 py-1.5 rounded-full bg-[#f8f5f7] border border-[#eae3e8] text-[12px] text-[#554750] hover:text-[#9b1b45] hover:border-[#9b1b45] transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Search Results */
            <div>
              <p className="text-[12px] text-[#70636c] mb-3">
                Found {results.length} results for &quot;<strong className="text-[#29232a]">{query}</strong>&quot;
              </p>

              {results.length > 0 ? (
                <div className="divide-y divide-[#f7f2f5] border border-[#f0e8ed] rounded-2xl overflow-hidden bg-white">
                  {results.map(prod => (
                    <Link
                      key={prod.id}
                      href={prod.href || `/p/${prod.slug}`}
                      onClick={closeSearch}
                      className="flex items-center justify-between p-3 hover:bg-[#faf7f9] transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={prod.image}
                          alt={prod.title}
                          className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-semibold text-[#29232a] group-hover:text-[#9b1b45] transition-colors truncate">
                            {prod.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[12px] font-bold text-[#9b1b45]">
                              ₹{prod.price.toLocaleString("en-IN")}
                            </span>
                            {Boolean(prod.originalPrice && prod.originalPrice > prod.price) && (
                              <del className="text-[10px] text-[#a3979d]">
                                ₹{prod.originalPrice?.toLocaleString("en-IN")}
                              </del>
                            )}
                            <span className="text-[10px] text-[#47816b] font-medium">
                              {prod.discount}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[#9b8b95] group-hover:text-[#9b1b45] shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#70636c]">
                  <p className="text-[14px]">No gifts found matching &quot;{query}&quot;.</p>
                  <p className="text-[12px] text-[#9b8b95] mt-1">Try another search term or browse our categories.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
