import { notFound, permanentRedirect, redirect } from "next/navigation";
import { api, resolveCategoryRoute } from "@/services/api";

export const dynamic = "force-dynamic";

function normalizeRedirectPath(p: string): string {
  const s = "/" + String(p || "").trim().replace(/^\/+|\/+$/g, "");
  return s === "/" ? "/" : s.toLowerCase();
}

async function findMatchingRedirect(segments: string[]) {
  const reqPath = normalizeRedirectPath(segments.join("/"));
  const redirects = await api.getPublicRedirects();
  return redirects.find(
    (rd) => rd.is_active !== false && normalizeRedirectPath(rd.from_path) === reqPath && rd.to_path
  );
}
import { CategoryListingView } from "@/components/category/CategoryListingView";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  SITE_NAME,
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildPageMetadata,
  getBaseUrl,
  toAbsoluteImageUrl,
} from "@/lib/seo";

const NOINDEX_CATEGORY_SLUGS = new Set([
  "flowers",
  "decoration",
  "personalized",
]);

interface CatchAllCategoryProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: CatchAllCategoryProps) {
  const { slug } = await params;
  if (!(await resolveCategoryRoute(slug))) {
    const rdMatch = await findMatchingRedirect(slug);
    if (rdMatch) {
      return buildPageMetadata({
        title: "Redirecting | Giftlaya",
        description: "Redirecting to updated page on Giftlaya.",
        index: false,
        follow: true,
      });
    }
    const cmsPage = slug.length === 1 ? await api.getPublicPage(slug[0]) : null;
    if (cmsPage && cmsPage.is_published !== false) {
      return buildPageMetadata({
        title: cmsPage.seo_title || `${cmsPage.title} | Giftlaya`,
        description: cmsPage.seo_description || cmsPage.title,
        path: `/${cmsPage.slug}`,
        index: cmsPage.robots_index !== false,
        follow: true,
      });
    }
    return buildPageMetadata({
      title: "Page Not Found | Giftlaya",
      description: "The requested page could not be found on Giftlaya.",
      index: false,
      follow: false,
    });
  }
  const data = await api.getCategoryPage(slug);
  const firstImage = data.products[0]?.image;
  const robots = data.robots ?? {
    index: !NOINDEX_CATEGORY_SLUGS.has(data.slug),
    follow: true,
  };

  return buildPageMetadata({
    title: data.seoTitle || `${data.heading} | Giftlaya`,
    description:
      data.seoDescription ||
      `${data.intro} Order ${data.title.toLowerCase()} online with same-day and midnight delivery across 100+ cities in India.`,
    path: `/${slug.join("/")}`,
    image: firstImage
      ? {
          url: firstImage,
          width: 800,
          height: 600,
          alt: data.heading,
        }
      : null,
    index: robots.index,
    follow: robots.follow,
  });
}

export default async function CategoryCatchAllPage({ params }: CatchAllCategoryProps) {
  const { slug } = await params;
  if (!(await resolveCategoryRoute(slug))) {
    const rdMatch = await findMatchingRedirect(slug);
    if (rdMatch) {
      if (rdMatch.status_code === 301 || rdMatch.status_code === 308) {
        permanentRedirect(rdMatch.to_path);
      }
      redirect(rdMatch.to_path);
    }
    const cmsPage = slug.length === 1 ? await api.getPublicPage(slug[0]) : null;
    if (cmsPage && cmsPage.is_published !== false) {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-h-[65vh]">
          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-[#292229] mb-6">
            {cmsPage.title}
          </h1>
          <div
            className="prose prose-sm max-w-none text-[#4a3f4e] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: cmsPage.body_html || "" }}
          />
        </div>
      );
    }
    notFound();
  }
  const data = await api.getCategoryPage(slug);
  const canonicalUrl = buildCanonicalUrl(`/${data.slug}`);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    data.breadcrumbs.map((b) => ({
      name: b.label,
      path: b.href,
    }))
  );

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: data.products.slice(0, 10).map((p, idx) => {
      const productUrl = buildCanonicalUrl(p.href || `/p/${p.slug}`);
      const numericPrice =
        typeof p.price === "number"
          ? p.price
          : parseInt(String(p.price).replace(/[^0-9]/g, ""), 10) || 0;
      return {
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "Product",
          name: p.title,
          url: productUrl,
          image: toAbsoluteImageUrl(p.image),
          offers: {
            "@type": "Offer",
            price: numericPrice,
            priceCurrency: "INR",
            availability: "https://schema.org/InStock",
            url: productUrl,
          },
        },
      };
    }),
  };

  const serviceJsonLd = data.cityName
    ? {
        "@context": "https://schema.org",
        "@type": "Service",
        name: data.heading,
        serviceType: data.serviceType || data.title,
        provider: {
          "@type": "LocalBusiness",
          name: SITE_NAME,
          url: getBaseUrl(),
        },
        areaServed: {
          "@type": "City",
          name: data.cityName,
        },
        url: canonicalUrl,
      }
    : null;

  const schemas = [
    breadcrumbJsonLd,
    ...(data.products.length > 0 ? [itemListJsonLd] : []),
    ...(serviceJsonLd ? [serviceJsonLd] : []),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <CategoryListingView data={data} />
    </>
  );
}

