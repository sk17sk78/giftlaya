"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Product, TileItem } from "@/types";
import { api, searchCatalogLocal } from "@/services/api";
import {
  Search,
  X,
  ArrowRight,
  ArrowUpLeft,
  Flower2,
  CakeSlice,
  Gift,
  Sparkles,
  LayoutGrid,
  History,
  Loader2,
} from "lucide-react";

const RECENT_STORAGE_KEY = "giftlaya_recent_searches";

const STARTER_COLLECTIONS = [
  {
    label: "Flowers",
    href: "/flowers",
    cardClass: "bg-[#fdf8fa] border-[#eee2e8] text-[#775666]",
    icon: <Flower2 className="w-6 h-6" strokeWidth={1.4} />,
  },
  {
    label: "Cakes",
    href: "/cakes",
    cardClass: "bg-[#fff9f0] border-[#efe6d8] text-[#9c7951]",
    icon: <CakeSlice className="w-6 h-6" strokeWidth={1.4} />,
  },
  {
    label: "Gifts",
    href: "/gifts",
    cardClass: "bg-[#f8f6fd] border-[#e9e2f1] text-[#867099]",
    icon: <Gift className="w-6 h-6" strokeWidth={1.4} />,
  },
  {
    label: "Decorations",
    href: "/balloon-decorations",
    cardClass: "bg-[#f4faf7] border-[#e0ece6] text-[#638778]",
    icon: <Sparkles className="w-6 h-6" strokeWidth={1.4} />,
  },
];

const INSPIRATION_CHIPS = [
  "Birthday flowers",
  "Chocolate cake",
  "Personalized gifts",
  "Anniversary decoration",
  "Gift hampers",
  "Plants",
];

function formatPrice(val: number | string | undefined): string {
  if (val === undefined || val === null || val === "") return "";
  if (typeof val === "number") return `₹${val.toLocaleString("en-IN")}`;
  return String(val).startsWith("₹") ? String(val) : `₹${val}`;
}

export function SearchModal() {
  const { isSearchOpen, closeSearch } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ products: Product[]; categories: TileItem[] }>({
    products: [],
    categories: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const router = useRouter();

  // Load recent searches on open & manage body scroll + focus
  useEffect(() => {
    if (!isSearchOpen) {
      setQuery("");
      setActiveIdx(-1);
      setIsLoading(false);
      return;
    }

    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5));
    } catch {
      // ignore storage errors
    }

    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [isSearchOpen]);

  const trimmed = query.trim();

  // Live catalog search (instant local match + remote API update when configured)
  useEffect(() => {
    if (!isSearchOpen || !trimmed) {
      setResults({ products: [], categories: [] });
      setActiveIdx(-1);
      setIsLoading(false);
      return;
    }

    const local = searchCatalogLocal(trimmed);
    setResults(local);
    setActiveIdx(-1);

    let cancelled = false;
    setIsLoading(true);
    const debounce = setTimeout(async () => {
      try {
        const remote = await api.searchCatalog(trimmed);
        if (!cancelled) setResults(remote);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [trimmed, isSearchOpen]);

  const visibleCategories = useMemo(() => results.categories.slice(0, 4), [results.categories]);
  const visibleProducts = useMemo(() => results.products.slice(0, 6), [results.products]);
  const totalSuggestions = visibleCategories.length + visibleProducts.length;

  const flatTargets = useMemo(
    () => [
      ...visibleCategories.map((c) => ({ href: c.href, title: c.title })),
      ...visibleProducts.map((p) => ({
        href: p.href || `/p/${p.slug}`,
        title: p.title || (p as any).name,
      })),
    ],
    [visibleCategories, visibleProducts]
  );

  const saveRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const navigateToHref = useCallback(
    (href: string, searchTermToSave?: string) => {
      if (searchTermToSave) saveRecentSearch(searchTermToSave);
      closeSearch();
      router.push(href);
    },
    [closeSearch, router, saveRecentSearch]
  );

  const handleViewAll = useCallback(
    (term = trimmed) => {
      if (!term) return;
      saveRecentSearch(term);
      closeSearch();
      router.push(`/search?q=${encodeURIComponent(term)}`);
    },
    [trimmed, saveRecentSearch, closeSearch, router]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (totalSuggestions === 0) return;
      e.preventDefault();
      setActiveIdx((prev) => {
        const next = prev + 1 >= totalSuggestions ? 0 : prev + 1;
        optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      if (totalSuggestions === 0) return;
      e.preventDefault();
      setActiveIdx((prev) => {
        const next = prev - 1 < 0 ? totalSuggestions - 1 : prev - 1;
        optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && flatTargets[activeIdx]) {
        navigateToHref(flatTargets[activeIdx].href, trimmed);
      } else if (trimmed.length >= 1) {
        handleViewAll(trimmed);
      }
    }
  };

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop matching rgba(37, 23, 35, 0.5) backdrop-filter: blur(5px) */}
      <div
        className="fixed inset-0 bg-[rgba(37,23,35,0.5)] backdrop-blur-[5px]"
        onClick={closeSearch}
        aria-hidden="true"
      />

      {/* Search Dialog Shell */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-dialog-title"
        className="relative z-10 flex flex-col w-full h-[100dvh] max-h-[100dvh] rounded-none border-0 bg-white text-[#3f303a] overflow-hidden sm:w-[calc(100%-40px)] sm:max-w-[660px] sm:h-[min(740px,86dvh)] sm:max-h-[86dvh] sm:rounded-[23px] sm:border sm:border-[#eae0e6] sm:shadow-[0_24px_90px_rgba(42,19,45,0.15)]"
      >
        {/* Header */}
        <header className="flex justify-between items-center gap-[14px] px-[18px] pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-[18px] shrink-0">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#a77d90] mb-1.5">
              FIND A LITTLE JOY
            </p>
            <h2
              id="search-dialog-title"
              className="font-heading text-[20px] sm:text-[22px] font-semibold tracking-[-0.5px] leading-[1.3] text-[#3f303a]"
            >
              What are you looking for?
            </h2>
          </div>
          <button
            type="button"
            onClick={closeSearch}
            aria-label="Close search"
            className="grid place-items-center w-10 h-10 shrink-0 rounded-full border border-[#eae1e6] text-[#8c7582] hover:bg-[#fcf2f6] transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a3194d] focus-visible:outline-offset-[3px]"
          >
            <X className="w-[19px] h-[19px]" strokeWidth={2} />
          </button>
        </header>

        {/* Search Input Box */}
        <div className="flex items-center gap-2 sm:gap-3 mx-[18px] sm:mx-6 mb-4 sm:mb-[18px] pl-3 sm:pl-4 pr-2 py-[5px] min-h-[54px] border border-[#dac6d0] focus-within:border-[#a3194d] focus-within:shadow-[0_0_0_3px_rgba(163,25,77,0.08)] rounded-[13px] bg-[#fffcfd] text-[#a3194d] shrink-0">
          <Search className="w-[21px] h-[21px] shrink-0" strokeWidth={2} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label="Search gifts, flowers, cakes and decorations"
            aria-autocomplete="list"
            aria-expanded={Boolean(trimmed)}
            aria-controls="search-dialog-results"
            aria-activedescendant={activeIdx >= 0 ? `search-option-${activeIdx}` : undefined}
            autoComplete="off"
            inputMode="search"
            enterKeyHint="search"
            maxLength={100}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Try roses, chocolate cake, birthday…"
            className="flex-1 min-w-0 w-full h-[42px] outline-none border-0 bg-transparent text-[16px] text-[#47333e] placeholder:text-[#a18b97] placeholder:text-[12px] sm:placeholder:text-[13px] [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="grid place-items-center w-9 h-9 shrink-0 rounded-full text-[#8c7582] hover:bg-[#fcf2f6] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain border-t border-[#f0e9ed]">
          <p className="sr-only" role="status">
            {trimmed
              ? `${totalSuggestions} suggestions found`
              : "Search for gifts, flowers, cakes and decorations"}
          </p>

          {!trimmed ? (
            <div className="px-[18px] py-[22px] sm:px-6 sm:pt-[23px] sm:pb-[30px] space-y-[26px]">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <section>
                  <div className="flex justify-between items-center gap-3 mb-[10px]">
                    <h3 className="text-[13px] font-semibold text-[#3f303a]">Recent searches</h3>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-[11px] font-medium text-[#9b1b45] min-h-[32px] px-1 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid gap-0.5">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="flex items-center gap-3 min-h-[42px] px-2 -mx-2 rounded-lg text-[#997f8d] hover:bg-[#fcf2f6] text-left transition-colors cursor-pointer"
                      >
                        <History className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                        <span className="flex-1 text-[12px] text-[#79636e] break-words">{term}</span>
                        <ArrowUpLeft className="w-3.5 h-3.5 text-[#b397a5] shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* A good place to start */}
              <section>
                <div className="flex justify-between items-center gap-3 mb-[14px]">
                  <h3 className="text-[13px] font-semibold text-[#3f303a]">
                    A good place to start
                  </h3>
                  <span className="hidden sm:inline text-[10px] text-[#a08895]">
                    Find your kind of gift
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:gap-[10px]">
                  {STARTER_COLLECTIONS.map((col) => (
                    <button
                      key={col.label}
                      type="button"
                      onClick={() => navigateToHref(col.href)}
                      className={`flex flex-col items-center gap-[10px] px-[3px] py-[14px] sm:px-[5px] sm:py-4 border rounded-[14px] text-[10px] sm:text-[11px] hover:border-[#b28d9e] transition-colors cursor-pointer ${col.cardClass}`}
                    >
                      <span className="grid place-items-center w-10 h-[35px]">
                        {col.icon}
                      </span>
                      <span>{col.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* A little inspiration */}
              <section>
                <div className="flex justify-between items-center gap-3 mb-[14px]">
                  <h3 className="text-[13px] font-semibold text-[#3f303a]">
                    A little inspiration
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {INSPIRATION_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setQuery(chip);
                        inputRef.current?.focus();
                      }}
                      className="flex items-center justify-center gap-[9px] min-h-[40px] px-3 py-2 border border-[#e9dfe5] rounded-[24px] text-[11px] text-[#806673] bg-white hover:bg-[#fcf3f7] hover:border-[#d6b6c4] transition-colors cursor-pointer"
                    >
                      <span>{chip}</span>
                      <ArrowUpLeft className="w-[13px] h-[13px] text-[#b397a5]" strokeWidth={2} />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : isLoading && totalSuggestions === 0 ? (
            <div className="p-6">
              <span className="flex items-center gap-[9px] text-[#a17d8d] text-[12px] mb-5">
                <Loader2 className="w-4 h-4 motion-safe:animate-spin" />
                Searching Giftlaya…
              </span>
              {[0, 1, 2].map((skeleton) => (
                <div key={skeleton} className="flex items-center gap-[14px] my-[18px]">
                  <div className="w-[60px] h-[60px] rounded-[12px] bg-[#f5eff2]" />
                  <div className="flex-1">
                    <div className="w-3/4 h-3 rounded-[5px] bg-[#f5eff2]" />
                    <div className="w-[35%] h-3 rounded-[5px] bg-[#f5eff2] mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : totalSuggestions === 0 ? (
            <div className="min-h-[290px] flex flex-col items-center justify-center px-6 py-[30px] text-center text-[#b08b9d]">
              <Search className="w-9 h-9 opacity-60" strokeWidth={1.5} />
              <h3 className="text-[17px] font-medium text-[#644a57] mt-[18px] mb-2 max-w-full break-words">
                No gifts found for &ldquo;{trimmed}&rdquo;
              </h3>
              <p className="text-[12px] text-[#9d8390] leading-[1.8] max-w-[300px] mb-5">
                Try another word like &ldquo;roses&rdquo;, &ldquo;chocolate cake&rdquo;, or &ldquo;birthday decoration&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 text-[#9b1b45] border border-[#e4cbd6] rounded-[10px] text-[12px] hover:bg-[#fcf2f6] transition-colors cursor-pointer"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div id="search-dialog-results" role="listbox" aria-label="Search suggestions" className="pb-[14px]">
              {/* Categories Group */}
              {visibleCategories.length > 0 && (
                <div role="group" aria-labelledby="search-categories-heading">
                  <h3
                    id="search-categories-heading"
                    className="flex items-center justify-between gap-3 text-[11px] font-semibold text-[#9e7c8c] px-[18px] sm:px-6 pt-[18px] pb-[9px]"
                  >
                    <span>Categories</span>
                    <span className="text-[10px] font-normal text-[#aa929e]">
                      {visibleCategories.length}
                    </span>
                  </h3>
                  {visibleCategories.map((cat, idx) => {
                    const isSelected = activeIdx === idx;
                    return (
                      <button
                        key={cat.href}
                        ref={(el) => {
                          optionRefs.current[idx] = el;
                        }}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        id={`search-option-${idx}`}
                        onClick={() => navigateToHref(cat.href, trimmed)}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={`flex items-center gap-3 sm:gap-[14px] w-full text-left px-[18px] sm:px-6 py-[11px] text-[#a58a98] transition-colors cursor-pointer ${
                          isSelected ? "bg-[#fcf1f6]" : "hover:bg-[#fcf2f6]"
                        }`}
                      >
                        <span className="w-[44px] h-[44px] grid place-items-center rounded-[12px] bg-[#fbf3f7] border border-[#eddee5] text-[#a4778b] shrink-0">
                          <LayoutGrid className="w-5 h-5" strokeWidth={1.5} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <strong className="block text-[#493641] text-[13px] leading-[1.6] font-medium break-words">
                            {cat.title}
                          </strong>
                          <small className="block text-[10px] text-[#a38a96] mt-[3px]">
                            Explore collection
                          </small>
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2} />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Gifts & Celebrations Group */}
              {visibleProducts.length > 0 && (
                <div role="group" aria-labelledby="search-products-heading">
                  <h3
                    id="search-products-heading"
                    className="flex items-center justify-between gap-3 text-[11px] font-semibold text-[#9e7c8c] px-[18px] sm:px-6 pt-[18px] pb-[9px]"
                  >
                    <span>Gifts &amp; celebrations</span>
                    <span className="text-[10px] font-normal text-[#aa929e]">
                      {visibleProducts.length} suggestions
                    </span>
                  </h3>
                  {visibleProducts.map((product, pIdx) => {
                    const optionIdx = visibleCategories.length + pIdx;
                    const isSelected = activeIdx === optionIdx;
                    const href = product.href || `/p/${product.slug}`;
                    const title = product.title || (product as any).name;
                    const mrp = product.mrp || product.originalPrice;

                    return (
                      <button
                        key={product.slug || product.id}
                        ref={(el) => {
                          optionRefs.current[optionIdx] = el;
                        }}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        id={`search-option-${optionIdx}`}
                        onClick={() => navigateToHref(href, trimmed)}
                        onMouseEnter={() => setActiveIdx(optionIdx)}
                        className={`flex items-center gap-3 sm:gap-[14px] w-full text-left px-[18px] sm:px-6 py-[11px] text-[#a58a98] transition-colors cursor-pointer ${
                          isSelected ? "bg-[#fcf1f6]" : "hover:bg-[#fcf2f6]"
                        }`}
                      >
                        <Image
                          src={product.image}
                          alt=""
                          width={60}
                          height={60}
                          className="w-[60px] h-[60px] object-cover shrink-0 rounded-[12px] bg-[#f5eef2] border border-[#eee5ea]"
                        />
                        <span className="flex-1 min-w-0">
                          <strong className="block text-[#493641] text-[13px] leading-[1.6] font-medium break-words">
                            {title}
                          </strong>
                          <span className="flex items-center gap-[9px] mt-1 text-[13px] font-semibold text-[#9b1b45]">
                            <span>{formatPrice(product.price)}</span>
                            {mrp && (
                              <del className="text-[10px] text-[#a38c98] font-normal">
                                {formatPrice(mrp)}
                              </del>
                            )}
                          </span>
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Maroon "View all results for..." CTA */}
        {trimmed && totalSuggestions > 0 && (
          <button
            type="button"
            onClick={() => handleViewAll(trimmed)}
            className="flex items-center justify-between gap-[14px] mx-[18px] mt-3 mb-4 sm:mx-6 sm:my-3 px-4 py-[13px] min-h-[48px] bg-[#a3194d] hover:bg-[#891640] rounded-[11px] text-white text-[12px] font-medium text-left shrink-0 transition-colors cursor-pointer"
          >
            <span className="truncate">View all results for &ldquo;{trimmed}&rdquo;</span>
            <ArrowRight className="w-[17px] h-[17px] shrink-0" strokeWidth={2} />
          </button>
        )}

        {/* Footer Keyboard Hints (Desktop only) */}
        <footer className="hidden sm:flex items-center gap-[18px] px-6 py-3 text-[10px] text-[#a18a96] border-t border-[#eee5ea] bg-[#fcfafb] shrink-0">
          <span className="flex items-center gap-[5px]">
            <kbd className="px-1 py-0.5 text-[9px] border border-[#e7dfe3] rounded-[4px] bg-white text-[#8c7581]">
              ↑
            </kbd>
            <kbd className="px-1 py-0.5 text-[9px] border border-[#e7dfe3] rounded-[4px] bg-white text-[#8c7581]">
              ↓
            </kbd>
            to explore
          </span>
          <span className="flex items-center gap-[5px]">
            <kbd className="px-1 py-0.5 text-[9px] border border-[#e7dfe3] rounded-[4px] bg-white text-[#8c7581]">
              Enter
            </kbd>
            to open
          </span>
          <span className="flex items-center gap-[5px] ml-auto">
            <kbd className="px-1 py-0.5 text-[9px] border border-[#e7dfe3] rounded-[4px] bg-white text-[#8c7581]">
              Esc
            </kbd>
            to close
          </span>
        </footer>
      </div>
    </div>
  );
}

export default SearchModal;
