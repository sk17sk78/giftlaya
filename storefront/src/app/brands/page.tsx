import React from "react";
import Link from "next/link";
import { Store, ArrowRight } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";
import { api } from "@/services/api";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Our Brand Partners | Giftlaya",
  description: "Independent bakers, florists, decorators and gift makers who sell on Giftlaya.",
  path: "/brands",
});

export default async function BrandsPage() {
  const liveBrands = await api.getPublicPage("brands");

  return (
    <div className="min-h-[65vh] bg-[#f6f5fb]">
      <section className="bg-gradient-to-br from-[#7d1538] via-[#9b1b45] to-[#b52757] px-4 py-12 sm:py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 text-white text-[11.5px] font-semibold px-3.5 py-1.5 rounded-full mb-3">
            <Store className="w-3.5 h-3.5" /> Brand Partners
          </span>
          <h1 className="text-[26px] sm:text-4xl font-heading font-bold text-white leading-tight">
            {liveBrands?.title || "The people behind your gifts"}
          </h1>
          <p className="text-[13.5px] sm:text-[15px] text-white/85 mt-2.5 max-w-xl mx-auto">
            {liveBrands?.seo_description || "Independent bakers, florists, decorators and gift makers who sell on Giftlaya."}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 text-center space-y-6">
        {liveBrands?.body_html && (
          <div
            className="prose prose-sm max-w-3xl mx-auto text-left bg-white border border-[#eae5e9] rounded-2xl p-6 text-[#4a3f4e]"
            dangerouslySetInnerHTML={{ __html: liveBrands.body_html }}
          />
        )}
        <p className="text-sm text-gray-600">
          Want to showcase your studio or artisanal gifting brand to customers across 100+ cities?
        </p>
        <Link
          href="/seller/registration"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#9b1b45] text-white text-xs sm:text-sm font-bold hover:bg-[#7d1538] transition-colors"
        >
          Become a Partner <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

