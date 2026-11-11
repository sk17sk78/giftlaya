import React from "react";
import Link from "next/link";
import { ArrowRight, Check, Star, Heart, ShieldCheck, Zap, Award } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";
import { api } from "@/services/api";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "About Giftlaya | Online Gifts, Cakes & Decoration Brand",
  description:
    "Founded in 2021 by Vishal Gupta — Giftlaya delivers fresh flowers, cakes, personalised gifts & balloon decorations across 100+ cities in India.",
  path: "/about-us",
});

export default async function AboutUsPage() {
  const liveAbout = await api.getPublicPage("about-us");
  const hasCustomCmsHtml =
    Boolean(liveAbout?.body_html?.trim()) &&
    !String(liveAbout?.body_html || "").includes(
      "Founded in 2021 by Vishal Gupta, Giftlaya delivers fresh flowers, designer cakes, personalised keepsakes"
    );

  const stats = [
    { val: "2,00,000+", label: "Happy Customers" },
    { val: "100+", label: "Cities Served" },
    { val: "4.8 ★", label: "Average Rating" },
    { val: "96,000+", label: "Birthday Setups Done" },
    { val: "Fresh", label: "Prepared Same-Day" },
    { val: "Fixed", label: "Transparent Pricing" },
  ];

  const categories = [
    { title: "Fresh Flowers", sub: "Roses, lilies & more", href: "/flowers" },
    { title: "Custom Cakes", sub: "Eggless & photo cakes", href: "/cakes" },
    { title: "Decorations", sub: "96,000+ setups done", href: "/balloon-decorations" },
    { title: "Personalised Gifts", sub: "Mugs, frames & more", href: "/personalized-gifts" },
    { title: "Hampers & Chocolates", sub: "Curated gift boxes", href: "/chocolates" },
    { title: "Candlelight Dinners", sub: "At-home experiences", href: "/cabana-decoration" },
  ];

  const timeline = [
    { tag: "2021", title: "Giftlaya Is Founded", desc: "Vishal Gupta starts Giftlaya with a simple mission — making celebrating the people you love in India effortless, joyful, and always on time." },
    { tag: "Reach", title: "100+ Cities Across India", desc: "From metros to smaller towns, Giftlaya delivers fresh flowers, cakes, gifts and decorations on time, every time." },
    { tag: "Freshness", title: "Prepared Fresh, On the Day", desc: "Every bouquet, cake and hamper is prepared fresh on the day of delivery — never from cold storage." },
    { tag: "Team", title: "Trained & Verified Decorators", desc: "Every decorator on our platform is background-verified and trained, so you can welcome them into your home with confidence." },
    { tag: "Customers", title: "2,00,000+ Happy Customers", desc: "From birthdays to anniversaries, families across India trust Giftlaya with their most special moments." },
    { tag: "Rating", title: "4.8/5 Average Rating", desc: "Rated by real customers across India, on every order — one more reason gifting starts here." },
  ];

  return (
    <div className="bg-white">
      {/* Maroon Hero */}
      <section className="bg-gradient-to-br from-[#6e1231] via-[#9b1b45] to-[#b52757] text-white px-4 py-12 sm:py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 text-[11px] font-semibold px-3.5 py-1 rounded-full mb-4">
            India&apos;s Complete Celebration Platform
          </span>
          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold leading-tight">
            About Giftlaya
            <br />
            Every Occasion, Every City
          </h1>
          <p className="text-xs sm:text-sm text-white/90 mt-4 max-w-xl mx-auto leading-relaxed">
            Fresh flowers, custom cakes, personalised gifts and celebration décor — <strong>Giftlaya</strong> brings every occasion to life for every person you love, in 100+ cities across India.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-5 text-[11px]">
            {["Since 2021", "2,00,000+ Customers", "100+ Cities", "4.8/5 Rated"].map((pill) => (
              <span key={pill} className="px-3 py-1 rounded-full bg-white/15 border border-white/20 font-semibold">
                {pill}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <Link
              href="/flowers"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-white text-[#9b1b45] text-xs sm:text-sm font-bold hover:bg-[#fcf2f6]"
            >
              Start Gifting <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full border border-white/40 text-white text-xs sm:text-sm font-bold hover:bg-white/10"
            >
              Get in Touch <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="bg-white border-b border-[#f0e8ed] py-6 px-4">
        <div className="max-w-[1152px] mx-auto grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <strong className="block text-base sm:text-xl font-extrabold text-[#292229]">{s.val}</strong>
              <span className="text-[10px] sm:text-[11px] text-[#79717c]">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-[1152px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-14">
        {/* Our Story */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-4">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#9b1b45] bg-[#fcf2f6] px-3 py-1 rounded-full">
              Our Story
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#292229]">
              Founded in 2021, Built on a Simple Belief
            </h2>
            <p className="text-xs sm:text-sm text-[#4a3f4e] leading-relaxed">
              <strong>Giftlaya was founded in 2021 by Vishal Gupta</strong> with a simple idea: celebrating the people you love in India should be effortless, joyful, and always on time.
            </p>
            <p className="text-xs sm:text-sm text-[#4a3f4e] leading-relaxed">
              What began as a focused mission to make gifting and celebration setups reliable has grown into Giftlaya — a platform for fresh flowers, custom cakes, personalised gifts and event décor, delivered with care.
            </p>
            <blockquote className="p-4 rounded-2xl bg-[#fff5f8] border border-[#f5d5e1] text-xs sm:text-sm italic text-[#512638]">
              &ldquo;We don&apos;t just want to deliver gifts. We want to deliver feelings. Every order is someone&apos;s special moment.&rdquo;
              <footer className="not-italic font-bold mt-2 text-[#9b1b45]">— Vishal Gupta, Founder, Giftlaya</footer>
            </blockquote>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.title}
                href={cat.href}
                className="p-4 rounded-2xl border border-[#eee5e9] bg-white hover:border-[#9b1b45] hover:shadow-card transition-all text-center"
              >
                <strong className="block text-xs sm:text-sm font-bold text-[#292229]">{cat.title}</strong>
                <span className="block text-[11px] text-[#79717c] mt-0.5">{cat.sub}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Quality Banner */}
        <section className="text-center space-y-5">
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#9b1b45] bg-[#fcf2f6] px-3 py-1 rounded-full">
              Our Promise
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#292229] mt-2">
              What You Can Always Expect From Us
            </h2>
            <p className="text-xs text-[#79717c] mt-1">Every order, every city, every time — built one celebration at a time.</p>
          </div>

          <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-[#fff5f8] border border-[#f5d5e1] text-left space-y-3">
            <h3 className="text-base font-bold text-[#292229]">Quality You Can Count On</h3>
            <p className="text-xs sm:text-sm text-[#512638] leading-relaxed">
              From the flowers we source to the decorators we train, everything on Giftlaya is chosen with care. Products are prepared fresh on the day of delivery, every decorator is background-verified, and every price is fixed with no hidden charges.
            </p>
          </div>
        </section>

        {/* Everything We Stand For */}
        <section className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#9b1b45] bg-[#fcf2f6] px-3 py-1 rounded-full">
              Why Giftlaya
            </span>
            <h2 className="font-heading text-2xl font-extrabold text-[#292229] mt-2">
              Everything We Stand For, At a Glance
            </h2>
          </div>

          <div className="space-y-4">
            {timeline.map((item) => (
              <div key={item.title} className="flex gap-3.5 items-start p-4 rounded-2xl border border-[#eee5e9] bg-white">
                <span className="px-2.5 py-1 rounded-full bg-[#fcf2f6] text-[#9b1b45] text-[10px] font-bold shrink-0">
                  {item.tag}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#292229]">{item.title}</h3>
                  <p className="text-xs text-[#625865] mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Our Values */}
        {hasCustomCmsHtml && liveAbout?.body_html && (
          <section className="max-w-3xl mx-auto p-6 rounded-3xl bg-[#fff5f8] border border-[#f5d5e1]">
            <div
              className="prose prose-sm max-w-none text-[#512638] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: liveAbout.body_html }}
            />
          </section>
        )}

        <section className="space-y-6">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-extrabold text-[#292229]">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Heart className="w-5 h-5 text-[#9b1b45]" />, title: "Celebration First", desc: "Every product, decorator, and florist is chosen to elevate your celebration." },
              { icon: <ShieldCheck className="w-5 h-5 text-blue-600" />, title: "Trust Above All", desc: "Background-verified teams and clear fixed prices with no surprises." },
              { icon: <Zap className="w-5 h-5 text-amber-500" />, title: "Speed & Reliability", desc: "Same-day and midnight delivery available across 100+ cities in India." },
              { icon: <Award className="w-5 h-5 text-emerald-600" />, title: "Quality Without Compromise", desc: "Fresh blooms, quality bakes, and thoughtfully chosen gifts prepared daily." },
            ].map((v) => (
              <div key={v.title} className="p-5 rounded-2xl border border-[#eee5e9] bg-white space-y-2">
                <div className="w-9 h-9 rounded-xl bg-[#faf7f9] grid place-items-center">{v.icon}</div>
                <h3 className="text-sm font-bold text-[#292229]">{v.title}</h3>
                <p className="text-xs text-[#625865] leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Maroon CTA */}
        <section className="rounded-3xl bg-gradient-to-br from-[#7d1538] via-[#9b1b45] to-[#b52757] text-white p-8 sm:p-12 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold">
            Ready to Make It Magical?
          </h2>
          <p className="text-xs sm:text-sm text-white/85 mt-2 max-w-lg mx-auto">
            Join 2,00,000+ customers who trust Giftlaya for their most special moments.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link
              href="/flowers"
              className="px-6 py-2.5 rounded-full bg-white text-[#9b1b45] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
            >
              Start Gifting <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact-us"
              className="px-6 py-2.5 rounded-full border border-white/40 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
            >
              Talk to Us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

