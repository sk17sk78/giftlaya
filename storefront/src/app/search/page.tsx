import React from "react";
import Link from "next/link";
import { api } from "@/services/api";
import { ProductCard } from "@/components/ui/ProductCard";
import { Search, Tag } from "lucide-react";
import { DEFAULT_DESCRIPTION, buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  return buildPageMetadata({
    title: q ? `Results for "${q}" | Search | Giftlaya` : "Search | Giftlaya",
    description: DEFAULT_DESCRIPTION,
    index: false,
    follow: true,
    includeOpenGraph: false,
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { products, categories } = await api.searchCatalog(q);

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-5 py-6 sm:py-8 min-h-[65vh]">
      <h1 className="text-xl sm:text-2xl font-heading font-bold text-gray-900 leading-tight">
        {q ? (
          <>
            Results for &ldquo;<span className="text-[#9b1b45]">{q}</span>&rdquo;
          </>
        ) : (
          "Search Gifts, Cakes & Flowers"
        )}
      </h1>

      {/* Search Form */}
      <form
        role="search"
        action="/search"
        method="get"
        className="mt-5 mb-5 flex items-center gap-3 rounded-2xl border border-[#e5d5dd] bg-white p-2 pl-4 max-w-2xl focus-within:border-[#9b1b45] shadow-2xs"
      >
        <Search className="w-5 h-5 text-[#9b1b45] shrink-0" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          minLength={2}
          maxLength={100}
          required
          aria-label="Search gifts, flowers, cakes and decorations"
          placeholder="Search gifts, flowers, cakes…"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-gray-900 placeholder-gray-400 outline-none"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-[#9b1b45] hover:bg-[#7d1538] text-white text-[13px] font-semibold transition-colors shrink-0"
        >
          Search
        </button>
      </form>

      <p className="text-xs text-[#79717a] mb-6">
        {products.length} products · {categories.length} categories
      </p>

      {/* Matching Categories Chips */}
      {categories.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#856e7b] mb-2.5">
            Categories
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, i) => (
              <Link
                key={i}
                href={cat.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fcf2f6] border border-[#f0dce5] text-xs font-semibold text-[#512638] hover:border-[#9b1b45] hover:text-[#9b1b45] transition-colors"
              >
                <Tag className="w-3.5 h-3.5 text-[#9b1b45]" />
                <span>{cat.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#856e7b] mb-3">
          Products
        </p>
        {products.length === 0 ? (
          <div className="py-14 text-center rounded-2xl border border-[#f0e8ed] bg-[#fffbfd]">
            <p className="text-sm font-bold text-[#29232a]">
              No matching gifts found for &ldquo;{q}&rdquo;
            </p>
            <p className="text-xs text-[#856e7b] mt-1">
              Try searching for &ldquo;Cake&rdquo;, &ldquo;Roses&rdquo;, &ldquo;Decoration&rdquo; or &ldquo;Mug&rdquo;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

