import React from "react";
import { api } from "@/services/api";
import { FaqAccordion } from "@/components/home/FaqAccordion";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Frequently Asked Questions | Giftlaya",
  description:
    "Answers to common Giftlaya questions on orders, same-day delivery, decoration setup, customisation, payments, cancellations and refunds.",
  path: "/pages/faqs",
  includeOpenGraph: false,
});

export default async function PagesFaqsPage() {
  const [faqs, livePage] = await Promise.all([api.getFaqs(), api.getPublicPage("faqs")]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-[65vh] space-y-6">
      <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-[#292229]">
        {livePage?.title || "Frequently Asked Questions"}
      </h1>

      {livePage?.body_html ? (
        <div
          className="prose prose-sm max-w-none text-[#4a3f4e] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: livePage.body_html }}
        />
      ) : (
        <div className="space-y-3 text-xs sm:text-sm text-[#4a3f4e] leading-relaxed">
          <p>
            Giftlaya is your one-stop destination for gifting and home celebration setups. Whether you&apos;re celebrating a birthday, anniversary, baby shower, or special milestone, our platform brings fresh flowers, custom cakes, personalised keepsakes, and balloon backdrops to 100+ cities across India.
          </p>
          <p>
            Browse answers below on delivery timings, midnight options, customization requests, payment methods, and cancellation guidelines.
          </p>
        </div>
      )}

      <FaqAccordion
        faqs={faqs}
        title="Frequently Asked Questions"
        subtitle="Everything you need to know about Giftlaya"
      />
    </div>
  );
}

