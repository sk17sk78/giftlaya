"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

interface CorporateBannerProps {
  image?: string;
  desktopImage?: string;
  mobileImage?: string;
  href?: string;
  alt?: string;
}

export function CorporateBanner({
  image = "https://cdn.giftlaya.com/images/93/340236a1-9cdf-40b2-9d0e-c2a1d8072cd0.webp",
  desktopImage,
  mobileImage,
  href = "/corporate-gift",
  alt = "Explore corporate gift",
}: CorporateBannerProps) {
  const deskSrc = desktopImage || image;
  const mobSrc = mobileImage || desktopImage || image;

  return (
    <section className="min-w-0" aria-label="Corporate Gifting">
      <Link
        href={href}
        aria-label={alt}
        className="block relative aspect-square sm:aspect-[3/1] w-full rounded-2xl overflow-hidden bg-[#fcf2f6] border border-[#f0e8ed] shadow-2xs hover:shadow-card transition-shadow"
      >
        {/* Mobile Image (< 640px) */}
        <div className="relative w-full h-full sm:hidden">
          <Image
            src={mobSrc}
            alt={alt}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>

        {/* Tablet & Desktop Image (>= 640px) */}
        <div className="hidden sm:block relative w-full h-full">
          <Image
            src={deskSrc}
            alt={alt}
            fill
            sizes="(min-width: 1152px) 1120px, 100vw"
            className="object-cover"
          />
        </div>
      </Link>
    </section>
  );
}

export default CorporateBanner;
