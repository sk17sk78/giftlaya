"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PromiseCelebrationsIcon,
  PromiseDecoratorsIcon,
  PromiseOnTimeIcon,
  PromiseSecureIcon,
  AppCardIcon,
  GooglePlayBadgeIcon,
  SupportHeadsetIllustration,
} from "@/components/ui/Icons";
import type { PublicSiteSettings } from "@/types";
import { Logo } from "@/components/ui/Logo";
import {
  ChevronDown,
  ArrowUpRight,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
} from "lucide-react";

const DEFAULT_FOOTER_COLUMNS = [
  {
    title: "Policy Info",
    links: [
      { label: "Terms & Conditions", href: "/pages/terms-and-conditions" },
      { label: "Privacy Policy", href: "/pages/privacy-policy" },
      { label: "Disclaimer", href: "/pages/disclaimer" },
      { label: "Shipping Policy", href: "/pages/shipping-policy" },
      { label: "Cancellation Policy", href: "/pages/cancellation-and-return" },
      { label: "Refund Policy", href: "/pages/refund-policy" },
      { label: "Return Policy", href: "/pages/return-policy" },
    ],
  },
  {
    title: "About Company",
    links: [
      { label: "About Us", href: "/about-us" },
      { label: "Latest Blogs", href: "/blog" },
      { label: "Contact Us", href: "/contact-us" },
      { label: "Sitemap", href: "/sitemap.xml" },
      { label: "Giftlaya UAE", href: "https://giftlaya.ae/" },
    ],
  },
];

export function Footer({ config }: { config?: PublicSiteSettings["footer_config"] }) {
  const [openAcc, setOpenAcc] = useState<Record<number, boolean>>({});
  const columns = config?.columns?.length ? config.columns : DEFAULT_FOOTER_COLUMNS;
  const supportEmail = config?.support_email || "support@giftlaya.com";
  const copyrightText = config?.copyright || "© 2026 Giftlaya. Made for your happy moments.";
  const instagramUrl = config?.instagram ?? "https://www.instagram.com/giftlayaofficial/";
  const facebookUrl = config?.facebook ?? "https://www.facebook.com/Giftlayaco/";
  const youtubeUrl = config?.youtube ?? "https://www.youtube.com/channel/UCMnCWe4Mn5AcC5T8Q0Jil4g";
  const xUrl = config?.x_url ?? "https://x.com/giftlaya";
  const linkedinUrl = config?.linkedin ?? "https://in.linkedin.com/company/giftlaya-com";

  return (
    <footer className="bg-white border-t border-[#eee8ef] text-[#29232a]">
      {/* SECTION 20: THE GIFTLAYA PROMISE */}
      <section className="bg-white border-b border-[#eee8ef]" aria-labelledby="footer-trust-heading">
        <div className="max-w-[1152px] mx-auto px-4 sm:px-6 py-7 sm:py-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center lg:gap-6">
          <div className="text-center lg:text-left mb-5 lg:mb-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#a12d55] mb-1.5">
              THE GIFTLAYA PROMISE
            </p>
            <h2
              id="footer-trust-heading"
              className="text-[18px] sm:text-[20px] font-semibold leading-[1.4] tracking-[-0.02em] text-[#392d40] lg:max-w-[18ch]"
            >
              Big moments. Little worries.
            </h2>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 m-0 p-0 list-none">
            {/* Card 1 */}
            <li className="min-w-0 py-3.5 px-2.5 sm:py-4 sm:px-3 lg:py-0 lg:px-2.5 rounded-[14px] lg:rounded-none border border-[#eee8ef] lg:border-0 bg-white text-center">
              <div className="flex justify-center mb-2">
                <PromiseCelebrationsIcon className="w-[44px] h-[48px]" />
              </div>
              <h3 className="text-[11px] sm:text-[12px] font-semibold leading-[16px] sm:leading-[18px] text-[#46334d]">
                10L+ Celebrations
              </h3>
              <p className="max-w-[23ch] mx-auto mt-1.5 text-[10px] leading-[15px] text-[#83718c]">
                Loved by customers across India
              </p>
            </li>

            {/* Card 2 */}
            <li className="min-w-0 py-3.5 px-2.5 sm:py-4 sm:px-3 lg:py-0 lg:px-2.5 rounded-[14px] lg:rounded-none border border-[#eee8ef] lg:border-0 lg:border-l lg:border-[#eee8ef] bg-white text-center">
              <div className="flex justify-center mb-2">
                <PromiseDecoratorsIcon className="w-[44px] h-[48px]" />
              </div>
              <h3 className="text-[11px] sm:text-[12px] font-semibold leading-[16px] sm:leading-[18px] text-[#46334d]">
                Verified Decorators
              </h3>
              <p className="max-w-[23ch] mx-auto mt-1.5 text-[10px] leading-[15px] text-[#83718c]">
                Trained &amp; background-checked
              </p>
            </li>

            {/* Card 3 */}
            <li className="min-w-0 py-3.5 px-2.5 sm:py-4 sm:px-3 lg:py-0 lg:px-2.5 rounded-[14px] lg:rounded-none border border-[#eee8ef] lg:border-0 lg:border-l lg:border-[#eee8ef] bg-white text-center">
              <div className="flex justify-center mb-2">
                <PromiseOnTimeIcon className="w-[44px] h-[48px]" />
              </div>
              <h3 className="text-[11px] sm:text-[12px] font-semibold leading-[16px] sm:leading-[18px] text-[#46334d]">
                On-Time, Guaranteed
              </h3>
              <p className="max-w-[23ch] mx-auto mt-1.5 text-[10px] leading-[15px] text-[#83718c]">
                Setup within your chosen time slot
              </p>
            </li>

            {/* Card 4 */}
            <li className="min-w-0 py-3.5 px-2.5 sm:py-4 sm:px-3 lg:py-0 lg:px-2.5 rounded-[14px] lg:rounded-none border border-[#eee8ef] lg:border-0 lg:border-l lg:border-[#eee8ef] bg-white text-center">
              <div className="flex justify-center mb-2">
                <PromiseSecureIcon className="w-[44px] h-[48px]" />
              </div>
              <h3 className="text-[11px] sm:text-[12px] font-semibold leading-[16px] sm:leading-[18px] text-[#46334d]">
                100% Secure Payments
              </h3>
              <p className="max-w-[23ch] mx-auto mt-1.5 text-[10px] leading-[15px] text-[#83718c]">
                Easy refunds. No hidden charges.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* SECTION 21: GIFTLAYA, NOW ON ANDROID */}
      <section className="max-w-[1152px] mx-auto px-4 sm:px-6 pt-6 pb-2" aria-label="Giftlaya Android App">
        <div className="rounded-[18px] border border-[#efdee7] bg-[linear-gradient(110deg,#fff5f8,#fff_65%,#faf5ff)] px-4 py-5 sm:px-6 sm:py-6 flex flex-wrap items-center justify-between gap-4 sm:gap-6">
          {/* Left copy */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-[240px]">
            <div className="grid place-items-center w-12 h-[52px] sm:w-[62px] sm:h-[62px] rounded-[14px] sm:rounded-[18px] bg-white border border-[#f0dfe7] shrink-0">
              <AppCardIcon className="w-7 h-7 sm:w-9 sm:h-9" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-[#a12d55] mb-1">
                GIFTLAYA, NOW ON ANDROID
              </p>
              <h2 className="text-[17px] sm:text-[21px] font-semibold leading-[1.3] tracking-[-0.35px] text-[#352137]">
                A little joy. One app away.
              </h2>
              <p className="text-[12px] leading-[1.6] text-[#756074] mt-1.5">
                Flowers, cakes, gifts &amp; celebrations. Take Giftlaya with you.
              </p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-5 shrink-0">
            <div className="flex flex-col items-start sm:items-center gap-1.5">
              <a
                href="https://play.google.com/store/apps/details?id=com.giftlaya.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition-colors shadow-sm"
              >
                <GooglePlayBadgeIcon className="w-6 h-6" />
                <div className="text-left">
                  <span className="block text-[9px] uppercase tracking-wider text-gray-300 leading-none">
                    GET IT ON
                  </span>
                  <span className="block text-[15px] font-bold leading-tight mt-0.5">
                    Google Play
                  </span>
                </div>
              </a>
              <span className="text-[10px] text-[#856e7b] font-medium">
                The Giftlaya app for Android
              </span>
            </div>

            {/* Desktop QR code */}
            <div className="hidden lg:flex flex-col items-center gap-1.5 pl-6 border-l border-[#f0dce5]">
              <div className="w-[78px] h-[78px] p-1.5 bg-white border border-[#e6d5df] rounded-xl flex items-center justify-center">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://play.google.com/store/apps/details?id=com.giftlaya.app"
                  alt="Scan QR code to download Giftlaya app"
                  width={68}
                  height={68}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[10px] font-medium text-[#756074]">
                Scan to download
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 22: A LITTLE HELP FOR YOUR BIG MOMENT */}
      <section className="py-8 sm:py-10 border-b border-[#f0e8ed]" aria-label="Support contacts">
        <div className="max-w-[1152px] mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-5">
            <SupportHeadsetIllustration className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
            <div>
              <h2 className="text-[17px] sm:text-xl font-bold text-[#29232a]">
                A little help for your big moment
              </h2>
              <p className="text-xs text-[#856e7b] mt-0.5">
                Questions, ideas or a little guidance. We’re here.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* WhatsApp */}
            <a
              href="https://wa.me/918100248353"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-2.5 px-3 py-3 sm:p-4 rounded-[13px] border border-[#e9e2ec] bg-white hover:border-[#d8b4c7] hover:bg-[#fdfbfe] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-[30px] h-[30px] grid place-items-center rounded-[10px] bg-[#ecf8f1] text-[#26845f] shrink-0" aria-hidden="true">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <strong className="block text-[11px] sm:text-[12px] font-semibold leading-[1.4] text-[#29232a]">
                    Chat with us
                  </strong>
                  <small className="block text-[10px] sm:text-[11px] text-[#7e6e87] leading-[1.5] truncate">
                    On WhatsApp
                  </small>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#9d8da6] shrink-0 hidden sm:block group-hover:text-brand" />
            </a>

            {/* Call */}
            <a
              href="tel:+918100248353"
              className="group flex items-center justify-between gap-2.5 px-3 py-3 sm:p-4 rounded-[13px] border border-[#e9e2ec] bg-white hover:border-[#d8b4c7] hover:bg-[#fdfbfe] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-[30px] h-[30px] grid place-items-center rounded-[10px] bg-[#f3edfb] text-[#9670b3] shrink-0" aria-hidden="true">
                  <Phone className="w-[17px] h-[17px]" strokeWidth={1.7} />
                </span>
                <div className="min-w-0">
                  <strong className="block text-[11px] sm:text-[12px] font-semibold leading-[1.4] text-[#29232a]">
                    Give us a call
                  </strong>
                  <small className="block text-[10px] sm:text-[11px] text-[#7e6e87] leading-[1.5] truncate">
                    +91 81002 48353
                  </small>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#9d8da6] shrink-0 hidden sm:block group-hover:text-brand" />
            </a>

            {/* Email (borderless centered link on mobile matching Giftlaya, card on sm+) */}
            <a
              href={`mailto:${supportEmail}`}
              className="group col-span-2 sm:col-span-1 flex items-center justify-center sm:justify-between gap-2.5 px-3 py-2.5 sm:p-4 rounded-[13px] border-0 sm:border sm:border-[#e9e2ec] bg-transparent sm:bg-white hover:border-[#d8b4c7] sm:hover:bg-[#fdfbfe] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-[30px] h-[30px] grid place-items-center rounded-[10px] bg-[#fff2e2] text-[#b4833e] shrink-0" aria-hidden="true">
                  <Mail className="w-[17px] h-[17px]" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 text-left">
                  <strong className="hidden sm:block text-[11px] sm:text-[12px] font-semibold leading-[1.4] text-[#29232a]">
                    Drop us a note
                  </strong>
                  <small className="block text-[11px] text-[#7e6e87] leading-[1.5] truncate">
                    {supportEmail}
                  </small>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#9d8da6] shrink-0 hidden sm:block group-hover:text-brand" />
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 23: MAIN FOOTER LINKS & DETAILS */}
      <div className="max-w-[1152px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-8 lg:gap-12">
          {/* Brand info */}
          <div className="sm:col-span-5 space-y-3">
            <Logo className="h-8 w-auto" />
            <p className="text-xs sm:text-[13px] text-[#745565] leading-relaxed max-w-sm">
              Flowers, cakes, gifts &amp; decorations.<br />
              Thoughtful surprises for the people you love.
            </p>
            {config?.address && (
              <p className="text-[11px] text-[#856e7b]">{config.address}</p>
            )}
            <Link
              href="/about-us"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline pt-1"
            >
              <span>A little about Giftlaya</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Dynamic Footer Link Columns */}
          <div className="sm:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {columns.map((col, colIdx) => (
              <div key={`${col.title}-${colIdx}`}>
                <div className="hidden sm:block">
                  <h3 className="text-[12px] font-bold text-[#29232a] mb-3 tracking-tight">
                    {col.title}
                  </h3>
                  <ul className="space-y-2 text-xs text-[#745565]">
                    {col.links.map((lk, lIdx) => {
                      const ext = lk.href.startsWith("http");
                      return (
                        <li key={`${lk.href}-${lIdx}`}>
                          {ext ? (
                            <a href={lk.href} target="_blank" rel="noopener noreferrer" className="hover:text-brand">
                              {lk.label}
                            </a>
                          ) : (
                            <Link href={lk.href || "/"} className="hover:text-brand">
                              {lk.label}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="sm:hidden border-b border-[#f0e8ed] pb-2">
                  <button
                    type="button"
                    onClick={() => setOpenAcc((prev) => ({ ...prev, [colIdx]: !prev[colIdx] }))}
                    className="w-full flex items-center justify-between py-2 text-sm font-bold text-[#29232a]"
                  >
                    <span>{col.title}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${openAcc[colIdx] ? "rotate-180" : ""}`} />
                  </button>
                  {openAcc[colIdx] && (
                    <ul className="space-y-2 text-xs text-[#745565] py-2 pl-2 animate-fade-in">
                      {col.links.map((lk, lIdx) => {
                        const ext = lk.href.startsWith("http");
                        return (
                          <li key={`${lk.href}-${lIdx}`}>
                            {ext ? (
                              <a href={lk.href} target="_blank" rel="noopener noreferrer" className="hover:text-brand">
                                {lk.label}
                              </a>
                            ) : (
                              <Link href={lk.href || "/"} className="hover:text-brand">
                                {lk.label}
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Row */}
        <div className="mt-8 pt-6 border-t border-[#f0e8ed] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="text-sm font-bold text-[#29232a]">A little inspiration, every day</h4>
            <p className="text-xs text-[#856e7b]">Ideas and celebrations from the Giftlaya community.</p>
          </div>

          <div className="flex items-center gap-2.5">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="p-2 rounded-xl border border-[#e9e2ec] text-gray-600 hover:text-brand hover:border-[#d8b4c7] hover:bg-[#fdfbfe] transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="p-2 rounded-xl border border-[#e9e2ec] text-gray-600 hover:text-brand hover:border-[#d8b4c7] hover:bg-[#fdfbfe] transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            )}
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="p-2 rounded-xl border border-[#e9e2ec] text-gray-600 hover:text-brand hover:border-[#d8b4c7] hover:bg-[#fdfbfe] transition-colors"
              >
                <Youtube className="w-4 h-4" />
              </a>
            )}
            {xUrl && (
              <a
                href={xUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X"
                className="p-2 rounded-xl border border-[#e9e2ec] text-gray-600 hover:text-brand hover:border-[#d8b4c7] hover:bg-[#fdfbfe] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            )}
            {linkedinUrl && (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="p-2 rounded-xl border border-[#e9e2ec] text-gray-600 hover:text-brand hover:border-[#d8b4c7] hover:bg-[#fdfbfe] transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Bottom copyright & legal */}
        <div className="mt-8 pt-6 border-t border-[#f0e8ed] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#856e7b]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p>{copyrightText}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pages/privacy-policy" className="hover:text-brand">Privacy</Link>
            <Link href="/pages/terms-and-conditions" className="hover:text-brand">Terms</Link>
            <Link href="/pages/cancellation-and-return" className="hover:text-brand">Returns &amp; refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
