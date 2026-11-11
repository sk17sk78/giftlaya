import React from "react";
import Link from "next/link";
import { Banner } from "@/types";

interface CorporateBannerProps {
  banner: Banner;
}

export default function CorporateBanner({ banner }: CorporateBannerProps) {
  if (!banner || !banner.desktopImage) return null;

  return (
    <section className="w-full my-2 sm:my-4">
      <div className="w-full rounded-2xl overflow-hidden bg-gray-100 aspect-square sm:aspect-[3/1] shadow-sm">
        <Link
          href={banner.href || "/corporate-gift"}
          aria-label={banner.label || "Corporate Gift Hampers and Souvenirs"}
          className="block w-full h-full relative group"
        >
          <picture className="block w-full h-full">
            <source media="(max-width: 640px)" srcSet={banner.mobileImage} />
            <img
              src={banner.desktopImage}
              alt={banner.label || "Corporate Gift"}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </picture>
        </Link>
      </div>
    </section>
  );
}
