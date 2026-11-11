"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { CategoryPageData } from "@/types";
import { ProductCard } from "@/components/ui/ProductCard";
import { CustomerReviews } from "@/components/home/CustomerReviews";
import { FaqAccordion } from "@/components/home/FaqAccordion";
import { useCity } from "@/context/CityContext";
import {
  ChevronRight,
  Star,
  MapPin,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";

interface CategoryListingViewProps {
  data: CategoryPageData;
}

export function CategoryListingView({ data }: CategoryListingViewProps) {
  const { selectedCity, openCityModal } = useCity();
  const cfg = data.pageConfig;
  const initialSort =
    cfg?.default_sort === "price_asc"
      ? "price-asc"
      : cfg?.default_sort === "price_desc"
      ? "price-desc"
      : "recommended";
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>(initialSort);
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  const getNumPrice = (p: number | string) =>
    typeof p === "number" ? p : parseInt(String(p).replace(/[^0-9]/g, ""), 10) || 0;

  const filteredAndSorted = useMemo(() => {
    let list = [...data.products];

    if (priceFilter === "under-750") {
      list = list.filter((p) => getNumPrice(p.price) < 750);
    } else if (priceFilter === "750-1500") {
      list = list.filter((p) => {
        const n = getNumPrice(p.price);
        return n >= 750 && n <= 1500;
      });
    } else if (priceFilter === "above-1500") {
      list = list.filter((p) => getNumPrice(p.price) > 1500);
    }

    if (sortBy === "price-asc") {
      list.sort((a, b) => getNumPrice(a.price) - getNumPrice(b.price));
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => getNumPrice(b.price) - getNumPrice(a.price));
    } else if (sortBy === "discount") {
      const discVal = (d?: string) => parseInt(String(d || "0").replace(/[^0-9]/g, ""), 10) || 0;
      list.sort((a, b) => discVal(b.discount) - discVal(a.discount));
    }

    return list;
  }, [data.products, priceFilter, sortBy]);

  return (
    <main className="max-w-[1200px] mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-8 sm:space-y-10">
      {/* Breadcrumb */}
      {cfg?.show_breadcrumbs !== false && (
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-gray-400"
        >
          {data.breadcrumbs.map((bc, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />}
              {bc.href ? (
                <Link href={bc.href} className="hover:text-[#9b1b45] transition-colors">
                  {bc.label}
                </Link>
              ) : (
                <span className="font-medium text-gray-600">{bc.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Section 1: Pink Rounded Hero */}
      <section
        aria-labelledby="category-heading"
        className="relative overflow-hidden rounded-[22px] bg-[#fcf2f6] p-5 sm:p-8"
      >
        <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-[#a25171] mb-2">
          {data.eyebrow}
        </p>
        <h1
          id="category-heading"
          className="font-heading text-[26px] sm:text-[36px] font-extrabold tracking-[-0.04em] leading-[1.15] text-[#512638] max-w-3xl"
        >
          {data.heading}
        </h1>
        <p className="mt-2.5 text-[12px] sm:text-[14px] text-[#896672] leading-relaxed">
          {data.intro}
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] text-[#6d4e5d]">
            <Star className="w-3.5 h-3.5 fill-[#9b1b45] text-[#9b1b45]" />
            <strong className="font-bold text-[#512638]">{data.rating}</strong>
            <span>· {data.ratingsCount.toLocaleString("en-IN")} ratings</span>
          </span>

          {cfg?.show_city_pills !== false && (
            <button
              type="button"
              onClick={openCityModal}
              aria-label="Choose your delivery city"
              className="inline-flex items-center gap-1.5 min-h-[28px] border-b border-[#d7adbd] text-[#9b1b45] text-[11px] sm:text-[12px] font-semibold hover:border-[#9b1b45] transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>
                {selectedCity === "Select your city"
                  ? "Choose city"
                  : `Delivering to ${selectedCity}`}
              </span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
          {cfg?.trust_strip && (
            <span className="text-[11px] text-[#896672] font-medium">
              {cfg.trust_strip}
            </span>
          )}
        </div>
      </section>

      {/* Section 2: Related Quick Tiles */}
      {cfg?.show_related_collections !== false && data.relatedCollections.length > 0 && (
        <section aria-label="Browse related collections">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#856e7b] mb-3">
            Explore more
          </p>
          <div className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-1">
            {data.relatedCollections.map((tile, idx) => (
              <Link
                key={idx}
                href={tile.href}
                className="shrink-0 w-[76px] sm:w-[94px] flex flex-col items-center gap-1.5 text-center group"
              >
                <div className="relative w-full aspect-square rounded-[16px] bg-[#fcf4f7] border border-[#f0e9ed] overflow-hidden p-1.5 group-hover:border-[#9b1b45]/40 transition-colors">
                  <Image
                    src={tile.image}
                    alt={tile.title}
                    fill
                    sizes="94px"
                    className="object-contain p-1 group-hover:scale-105 transition-transform"
                  />
                </div>
                <span className="text-[11px] font-medium text-[#493f49] group-hover:text-[#9b1b45] line-clamp-1">
                  {tile.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Filter & Sort Toolbar + Grid */}
      <div>
        <div className="pt-5 pb-4 mb-5 border-t border-[#eee6eb] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="font-heading text-[19px] sm:text-[21px] font-extrabold tracking-[-0.03em] text-[#3d2933]">
              Explore the collection
            </h2>
            <span className="text-xs text-[#896672] font-medium">
              {filteredAndSorted.length} items
            </span>
          </div>

          {cfg?.show_filters !== false && (
          <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:min-w-[330px]">
            <label className="relative flex items-center bg-[#f8f5f7] border border-[#eee5e9] rounded-xl px-3 py-2 text-xs font-semibold text-[#3d2933]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#9b1b45] mr-1.5 shrink-0" />
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                aria-label="Filter by price"
                className="w-full bg-transparent outline-none cursor-pointer"
              >
                <option value="all">All prices</option>
                <option value="under-750">Under ₹750</option>
                <option value="750-1500">₹750 – ₹1,500</option>
                <option value="above-1500">Above ₹1,500</option>
              </select>
            </label>

            <label className="relative flex items-center bg-[#f8f5f7] border border-[#eee5e9] rounded-xl px-3 py-2 text-xs font-semibold text-[#3d2933]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#9b1b45] mr-1.5 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort products"
                className="w-full bg-transparent outline-none cursor-pointer"
              >
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="discount">Highest Discount</option>
              </select>
            </label>
          </div>
          )}
        </div>

        {filteredAndSorted.length === 0 ? (
          <div className="py-12 text-center border border-[#f0e8ed] rounded-2xl bg-[#fffbfd]">
            <p className="text-sm font-bold text-[#3d2933]">
              No items match the selected price range.
            </p>
            <button
              type="button"
              onClick={() => {
                setPriceFilter("all");
                setSortBy("recommended");
              }}
              className="mt-3 text-xs font-bold text-[#9b1b45] underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredAndSorted.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Customer Reviews */}
      <CustomerReviews
        reviews={data.reviews}
        title="What our customers say"
        subtitle="Little moments, shared"
      />

      {/* Section 4: Collection Guide */}
      <section
        aria-label="Collection guide"
        className="border border-[#ebe5ed] rounded-[18px] bg-white p-5 sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b1b45]">
              About this collection
            </p>
            <h2 className="text-[17px] sm:text-xl font-bold text-[#29232a] mt-0.5">
              {data.guideTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setGuideOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9b1b45] px-3 py-1.5 rounded-xl border border-[#f0dce5] hover:bg-[#fdf2f5]"
          >
            <span>{guideOpen ? "Show less" : "Read collection guide"}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${guideOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {guideOpen && (
          <div className="mt-4 pt-4 border-t border-[#f0e8ed] space-y-3 text-xs sm:text-[13px] text-[#4a3f4e] leading-relaxed">
            {data.seoContentHtml ? (
              <div
                className="prose prose-sm max-w-none prose-headings:text-[#29232a] prose-a:text-[#9b1b45]"
                dangerouslySetInnerHTML={{
                  __html: data.seoContentHtml.replace(/<script[\s\S]*?<\/script>/gi, ""),
                }}
              />
            ) : (
              data.guideParagraphs.map((para, i) => <p key={i}>{para}</p>)
            )}
          </div>
        )}
      </section>

      {/* Section 5: Category FAQs */}
      {cfg?.show_faq_block !== false && (
        <FaqAccordion
          faqs={data.faqs}
          title="Frequently Asked Questions"
          subtitle="A few answers before you choose"
        />
      )}
    </main>
  );
}

