import React from "react";
import Link from "next/link";
import { Home, Search, Gift, MessageCircle, ArrowRight } from "lucide-react";

export default function NotFound() {
  const popularPages = [
    {
      label: "Home",
      href: "/",
      icon: <Home className="w-4 h-4 text-white" />,
      bg: "bg-[#9b1b45]",
    },
    {
      label: "Search Decor",
      href: "/balloon-decorations",
      icon: <Search className="w-4 h-4 text-white" />,
      bg: "bg-[#2596f3]",
    },
    {
      label: "About Us",
      href: "/about-us",
      icon: <Gift className="w-4 h-4 text-white" />,
      bg: "bg-[#f5a623]",
    },
    {
      label: "Contact",
      href: "/contact-us",
      icon: <MessageCircle className="w-4 h-4 text-white" />,
      bg: "bg-[#19a966]",
    },
  ];

  return (
    <div className="relative min-h-[72vh] flex flex-col items-center justify-center px-4 py-14 text-center bg-white overflow-hidden">
      {/* Subtle pink radial accent */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#fceef3] blur-3xl opacity-70" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#fdf3f7] blur-3xl opacity-80" />

      <div className="relative z-10 max-w-md w-full mx-auto">
        {/* 404 Panda Illustration */}
        <div className="flex flex-col items-center mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/404-panda.webp"
            alt="A confused panda mascot next to a 404 sign — page not found"
            width={700}
            height={560}
            className="w-64 sm:w-80 h-auto mx-auto drop-shadow-md select-none pointer-events-none"
          />
        </div>

        <h1 className="font-heading text-2xl sm:text-[28px] font-extrabold text-[#221922] tracking-tight">
          Let&apos;s Get You Back to Gifting
        </h1>
        <p className="text-xs sm:text-sm text-[#766a78] mt-2 leading-relaxed max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved. Here&apos;s how to find your way back to the good stuff.
        </p>

        {/* Primary Action Pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#9b1b45] hover:bg-[#7d1538] text-white text-xs sm:text-sm font-bold shadow-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <Link
            href="/contact-us"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-[#e5dce1] bg-white hover:border-[#9b1b45] text-[#292229] text-xs sm:text-sm font-bold shadow-2xs transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-[#70636c]" />
            <span>Contact Support</span>
          </Link>
        </div>

        {/* Popular Pages 2x2 Card */}
        <div className="mt-8 bg-white border border-[#f0e8ed] rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(40,20,35,0.05)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b8a95] mb-3.5">
            Popular Pages
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {popularPages.map((p) => (
              <Link
                key={p.href + p.label}
                href={p.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#f2ecf0] bg-[#fcfbfc] hover:border-[#9b1b45] hover:bg-[#fff9fb] text-left transition-colors group"
              >
                <span className={`w-8 h-8 rounded-lg ${p.bg} grid place-items-center shrink-0`}>
                  {p.icon}
                </span>
                <span className="flex-1 text-xs font-semibold text-[#342834] truncate">
                  {p.label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#c8bcc4] group-hover:text-[#9b1b45] shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-6 text-[11px] text-[#9a8d96]">
          Giftlaya — Delivering across 100+ cities in India
        </p>
      </div>
    </div>
  );
}
