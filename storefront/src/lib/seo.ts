import type { Metadata } from "next";

export const SITE_NAME = "Giftlaya";
export const SITE_TWITTER = "@giftlaya";
export const DEFAULT_DESCRIPTION =
  "Fresh flowers, custom cakes, event decorations & personalized gifts delivered across 100+ cities in India.";
export const HOME_TITLE =
  "Online Gift Delivery in India | Cakes & Flowers | Giftlaya";
export const HOME_DESCRIPTION =
  "Send cakes, flowers, personalised gifts & balloon decoration anywhere in India. Same-day and midnight delivery in 100+ cities, starting ₹299.";
export const HOME_OG_IMAGE =
  "https://placehold.co/1200x630/FDF2F5/9B1B45?text=Giftlaya";

export const GIFTLAYA_SOCIAL_LINKS = [
  "https://www.instagram.com/giftlayaofficial",
  "https://www.facebook.com/Giftlayaco",
  "https://www.linkedin.com/company/giftlaya-com",
  "https://www.youtube.com/channel/UCMnCWe4Mn5AcC5T8Q0Jil4g",
  "https://x.com/giftlaya",
];

export function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://giftlaya.com").replace(
    /\/+$/,
    ""
  );
}

export function buildCanonicalUrl(path = "/"): string {
  const base = getBaseUrl();
  if (!path || path === "/") return base;
  return path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function toAbsoluteImageUrl(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return buildCanonicalUrl(src);
}

export function toIsoDate(value?: string): string {
  if (value) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date().toISOString();
}

export function buildLocalBusinessJsonLd() {
  const siteUrl = getBaseUrl();
  const logoUrl = `${siteUrl}/apple-icon.png`;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: siteUrl,
    logo: logoUrl,
    image: logoUrl,
    telephone: "+918100248353",
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "1st Floor EC 91, Saltlake Sector 1",
      addressLocality: "Kolkata",
      addressRegion: "West Bengal",
      postalCode: "700064",
      addressCountry: "IN",
    },
    sameAs: GIFTLAYA_SOCIAL_LINKS,
    priceRange: "₹₹",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "10:00",
      closes: "19:30",
    },
  };
}

export function buildWebSiteJsonLd() {
  const siteUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildOrganizationJsonLd() {
  const siteUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/apple-icon.png`,
    description:
      "India's Complete Celebration Platform for Every Occasion, Every City, Every Person You Love — fresh flowers, custom cakes, event decorations, personalized gifts & more, delivered across 100+ cities.",
    sameAs: GIFTLAYA_SOCIAL_LINKS,
  };
}

export interface BreadcrumbSchemaInput {
  name: string;
  path?: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbSchemaInput[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      ...(item.path ? { item: buildCanonicalUrl(item.path) } : {}),
    })),
  };
}

export function buildFaqJsonLd(qna: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qna.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export interface PageMetadataOptions {
  title: string;
  description: string;
  path?: string;
  image?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  } | null;
  type?: "website" | "article";
  publishedTime?: string;
  authors?: string[];
  index?: boolean;
  follow?: boolean;
  includeOpenGraph?: boolean;
}

export function buildPageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  authors,
  index = true,
  follow = true,
  includeOpenGraph = true,
}: PageMetadataOptions): Metadata {
  const canonicalUrl = path !== undefined ? buildCanonicalUrl(path) : undefined;
  const imageUrl = toAbsoluteImageUrl(image?.url);

  const openGraph: Metadata["openGraph"] = includeOpenGraph
    ? {
        title,
        description,
        ...(canonicalUrl ? { url: canonicalUrl } : {}),
        siteName: SITE_NAME,
        locale: "en_IN",
        type,
        ...(type === "article" && publishedTime ? { publishedTime } : {}),
        ...(type === "article" && authors?.length ? { authors } : {}),
        ...(imageUrl
          ? {
              images: [
                {
                  url: imageUrl,
                  ...(image?.width ? { width: image.width } : {}),
                  ...(image?.height ? { height: image.height } : {}),
                  ...(image?.alt ? { alt: image.alt } : {}),
                },
              ],
            }
          : {}),
      }
    : undefined;

  const twitter: Metadata["twitter"] = {
    card: imageUrl ? "summary_large_image" : "summary",
    site: SITE_TWITTER,
    title,
    description,
    ...(imageUrl ? { images: [imageUrl] } : {}),
  };

  return {
    title,
    description,
    ...(canonicalUrl ? { alternates: { canonical: canonicalUrl } } : {}),
    robots: { index, follow },
    ...(openGraph ? { openGraph } : {}),
    twitter,
  };
}
