import React from "react";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo";

const POLICY_CONTENT: Record<
  string,
  { title: string; intro: string; sections: { heading: string; text: string; bullets?: string[] }[] }
> = {
  "privacy-policy": {
    title: "Privacy Policy",
    intro:
      'Giftlaya.com ("we," "our," or "us") is committed to protecting the privacy and security of our users ("you" or "your"). This Privacy Policy outlines how we collect, use, disclose, and protect your personal information when you use our website and services.',
    sections: [
      {
        heading: "1. Information We Collect",
        text: "We collect information you provide directly to us as well as basic usage details to ensure reliable gift delivery and booking coordination.",
        bullets: [
          "Personal Information: Name, email address, phone number, shipping address, and payment details.",
          "Account & Order Information: Preferences, delivery slot choices, recipient notes, and customer support messages.",
          "Device & Usage Data: Pages visited, browser type, city preference, and cookies for cart persistence.",
        ],
      },
      {
        heading: "2. How We Use Your Information",
        text: "We use collected details solely to deliver memorable celebrations.",
        bullets: [
          "To process and deliver flower bouquets, cakes, gifts, and venue setups on time.",
          "To send order status updates, tracking links, and customer support responses.",
          "To improve website performance and city-wise gift availability.",
        ],
      },
      {
        heading: "3. How We Share Your Information",
        text: "We do not sell or rent your personal data to third parties. Limited fulfillment details are shared strictly with verified local florists, bakers, decorators, and payment processors required to complete your order.",
      },
      {
        heading: "4. Contact Us",
        text: "Questions regarding privacy can be addressed to support@giftlaya.com or +91 81002 48353 (1st Floor EC 91, Saltlake Sector 1, Kolkata 700064).",
      },
    ],
  },
  "terms-and-conditions": {
    title: "Terms & Conditions",
    intro:
      "Welcome to Giftlaya.com. By accessing or placing orders on our platform, you agree to be bound by the terms and delivery guidelines set below.",
    sections: [
      {
        heading: "1. Orders & Scheduling",
        text: "Same-day delivery slots and decoration setup timings depend on partner capacity and city coverage. Please verify pincode/city availability before checkout.",
      },
      {
        heading: "2. Perishable & Custom Items",
        text: "Fresh cakes, floral arrangements, and hand-crafted personalized items may carry natural artisan variations compared to showcase imagery while maintaining equivalent stem count, weight, and visual quality.",
      },
      {
        heading: "3. Pricing & Payments",
        text: "All displayed prices are inclusive of standard taxes unless explicitly indicated at checkout. Orders are confirmed upon payment authorization.",
      },
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    intro:
      "The visuals and product photography on Giftlaya.com represent finished bouquets, cakes, gifts, and balloon backdrops assembled by our studio partners.",
    sections: [
      {
        heading: "Visual Representation",
        text: "Seasonal availability of specific foliage or foil balloon shades may occasionally require an equal-value substitute of matching palette so your celebration schedule is never delayed.",
      },
    ],
  },
  "shipping-policy": {
    title: "Shipping Policy",
    intro:
      "Giftlaya delivers cakes, fresh flowers, plants, and event setups across 100+ Indian cities via dedicated local fleets, alongside nationwide courier dispatch for custom gifts.",
    sections: [
      {
        heading: "Same-Day & Midnight Delivery",
        text: "Cakes, bouquets, and balloon decorations are delivered in your chosen 2-hour slot. Midnight slots arrive between 11:00 PM and 12:00 AM.",
      },
      {
        heading: "Courier Dispatch (Personalized Gifts)",
        text: "Personalized mugs, photo frames, cushions, and apparel ship within 24–48 hours and arrive within 4–6 business days across India.",
      },
    ],
  },
  "cancellation-and-return": {
    title: "Cancellation Policy",
    intro: "Plans change! Here is how cancellations and rescheduling work on Giftlaya.",
    sections: [
      {
        heading: "Before Preparation",
        text: "Orders can be cancelled or rescheduled at least 6 hours prior to the chosen delivery or setup slot by contacting support@giftlaya.com or calling +91 81002 48353.",
      },
    ],
  },
  "refund-policy": {
    title: "Refund Policy",
    intro: "Eligible refunds are processed cleanly back to your original payment method.",
    sections: [
      {
        heading: "Refund Timelines",
        text: "Approved refunds are initiated immediately and typically credit to your bank account or UPI within 5–7 business days.",
      },
    ],
  },
  "return-policy": {
    title: "Return Policy",
    intro: "Your happiness matters. If an item arrives damaged or incorrect, let us know right away.",
    sections: [
      {
        heading: "Damaged or Incorrect Orders",
        text: "Please share photos within 4 hours of delivery for fresh flowers/cakes, or within 48 hours for personalized courier gifts at support@giftlaya.com for instant resolution.",
      },
    ],
  },
};

type PolicyDoc = {
  title: string;
  intro: string;
  bodyHtml?: string;
  sections: { heading: string; text: string; bullets?: string[] }[];
};

import { api } from "@/services/api";

export const dynamic = "force-dynamic";

const SLUG_ALIASES: Record<string, string> = {
  "terms-conditions": "terms-and-conditions",
  "cancellation-policy": "cancellation-and-return",
};

async function resolvePolicyPage(slug: string): Promise<PolicyDoc | null> {
  const mappedSlug = SLUG_ALIASES[slug] || slug;
  const live =
    (await api.getPublicPage(slug)) ||
    (mappedSlug !== slug ? await api.getPublicPage(mappedSlug) : null);
  if (live?.title) {
    return {
      title: live.title,
      intro: live.seo_description || "",
      bodyHtml: live.body_html || "",
      sections: [],
    };
  }
  if (POLICY_CONTENT[mappedSlug]) return POLICY_CONTENT[mappedSlug];
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await resolvePolicyPage(slug);
  if (!page) {
    return buildPageMetadata({
      title: "Policy | Giftlaya",
      description: "Giftlaya store policies and terms.",
      index: false,
      follow: false,
    });
  }
  return buildPageMetadata({
    title: `${page.title} | Giftlaya`,
    description: page.intro || page.title,
    path: `/pages/${slug}`,
  });
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await resolvePolicyPage(slug);
  if (!page) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-[65vh]">
      <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-[#292229] mb-6">
        {page.title}
      </h1>

      <div className="space-y-6 text-xs sm:text-sm text-[#4a3f4e] leading-relaxed">
        {page.intro && <p className="font-medium text-[#292229]">{page.intro}</p>}

        {page.bodyHtml && (
          <div
            className="prose prose-sm max-w-none text-[#4a3f4e]"
            dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
          />
        )}

        {page.sections.map((sec) => (
          <section key={sec.heading} className="space-y-2.5">
            <h2 className="text-base sm:text-lg font-bold text-[#292229]">{sec.heading}</h2>
            <p>{sec.text}</p>
            {sec.bullets && (
              <ul className="list-disc pl-5 space-y-1.5">
                {sec.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

