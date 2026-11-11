import type { Metadata } from "next";
import { api } from "@/services/api";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  HOME_DESCRIPTION,
  HOME_OG_IMAGE,
  HOME_TITLE,
  SITE_NAME,
  SITE_TWITTER,
  buildCanonicalUrl,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo";
import { HeroSlider } from "@/components/home/HeroSlider";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { ProductSection } from "@/components/home/ProductSection";
import { TilesSection } from "@/components/home/TilesSection";
import { CorporateBanner } from "@/components/home/CorporateBanner";
import { CustomerReviews } from "@/components/home/CustomerReviews";
import { SeoGuide } from "@/components/home/SeoGuide";
import { FaqAccordion } from "@/components/home/FaqAccordion";
import { LinkDirectory } from "@/components/home/LinkDirectory";

import type { HomepageSectionData, Product, TileItem } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: buildCanonicalUrl("/"),
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: buildCanonicalUrl("/"),
    siteName: SITE_NAME,
    images: [
      {
        url: HOME_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary",
    site: SITE_TWITTER,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [HOME_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function HomePage() {
  // Fetch data dynamically from API service (connected to backend or fallback)
  const [
    homeConfig,
    sections,
    siteSettings,
    heroBanners,
    shopByCategory,
    trendingGifts,
    freshFlowers,
    cakeDelivery,
    bestDecorations,
    topCakes,
    bestSellerCategories,
    personalizedCards,
    personalizedTiles,
    plants,
    corporateBanner,
    reviews,
    faqs,
    linkDirectory,
  ] = await Promise.all([
    api.getHomeConfig(),
    api.getHomepageSections(),
    api.getPublicSettings(),
    api.getHeroBanners(),
    api.getShopByCategoryTiles(),
    api.getTrendingGifts(),
    api.getFreshFlowersTiles(),
    api.getCakeDeliveryTiles(),
    api.getBestDecorationsTiles(),
    api.getTopCakes(),
    api.getBestSellerCategories(),
    api.getPersonalizedCards(),
    api.getPersonalizedTiles(),
    api.getPlants(),
    api.getCorporateBanner(),
    api.getReviews(),
    api.getFaqs(),
    api.getLinkDirectory(),
  ]);

  const mergedShopByCategory: TileItem[] =
    siteSettings.mobile_categories_config?.items?.length &&
    siteSettings.mobile_categories_config.items.some((i) => i.image)
      ? siteSettings.mobile_categories_config.items.map((item, idx) => ({
          id: idx + 1,
          title: item.title,
          name: item.title,
          href: `/${String(item.slug || "").replace(/^\/+/, "")}`,
          image: item.image || shopByCategory[idx]?.image || "/images/placeholder.webp",
          badge: item.badge || undefined,
        }))
      : shopByCategory;

  const fallbackSections: HomepageSectionData[] = [
    { id: 1, section_key: "shop_by_category", section_type: "category_strip", title: "Shop by category", subtitle: "Find a little joy for every occasion.", slider_enabled: false, sort_order: 1, is_active: true },
    { id: 2, section_key: "trending_gifts", section_type: "product_row", title: "Trending Gifts on Giftlaya", subtitle: "Wide Range of Options", slider_enabled: homeConfig.trendingSlider, sort_order: 2, is_active: true },
    { id: 3, section_key: "fresh_flowers_row", section_type: "category_strip", title: "Fresh Flower Delivery in India", subtitle: "Make their day bloom with joy", slider_enabled: false, sort_order: 3, is_active: true },
    { id: 4, section_key: "cake_delivery_row", section_type: "category_strip", title: "30 Mins Cake Delivery in India", subtitle: "Fresh Cake Doorstep Delivery", slider_enabled: true, sort_order: 4, is_active: true },
    { id: 5, section_key: "best_decorations", section_type: "decor_grid", title: "Try Our Best Decoration", subtitle: "Decoration you will love", slider_enabled: true, sort_order: 5, is_active: true },
    { id: 6, section_key: "top_selling_cakes", section_type: "product_row", title: "Top-Selling Cakes", subtitle: "Same-day delivery", slider_enabled: homeConfig.cakesSlider, sort_order: 6, is_active: true },
    { id: 7, section_key: "best_sellers_cakes", section_type: "banner_strip", title: "Try Our Best Sellers Categories", subtitle: "Cakes you will love", slider_enabled: true, sort_order: 7, is_active: true },
    { id: 8, section_key: "personalized_gifts", section_type: "product_row", title: "Personalized Gifts That Feel Special", subtitle: "Custom mugs, T-shirts, frames, LED lamps, and more", slider_enabled: homeConfig.personalizedSlider, sort_order: 8, is_active: true },
    { id: 9, section_key: "personalized_occasions", section_type: "category_strip", title: "Personalized Gifts for Every Occasion", subtitle: "Crafted Just for You", slider_enabled: true, sort_order: 9, is_active: true },
    { id: 10, section_key: "green_plants", section_type: "product_row", title: "Indoor & Outdoor Plants Online in India", subtitle: "Fresh Air Always", slider_enabled: homeConfig.plantsSlider, sort_order: 10, is_active: true },
    { id: 11, section_key: "corporate_banner", section_type: "banner_strip", title: "Corporate Gifting", subtitle: "Thoughtful Gifts, Stronger Relationships.", slider_enabled: false, sort_order: 11, is_active: true },
    { id: 12, section_key: "customer_reviews", section_type: "testimonials", title: "Customer Reviews", subtitle: "Little moments, shared", slider_enabled: true, sort_order: 12, is_active: true },
  ];

  const orderedSections = sections.length > 0 ? sections : fallbackSections;

  const fallbackProductsByKey: Record<string, { items: Product[]; viewAllHref: string }> = {
    trending_gifts: { items: trendingGifts, viewAllHref: "/gifts" },
    top_selling_cakes: { items: topCakes, viewAllHref: "/cakes" },
    personalized_gifts: { items: personalizedCards, viewAllHref: "/personalized-gifts" },
    green_plants: { items: plants, viewAllHref: "/plants" },
  };

  const renderDynamicSection = (sec: HomepageSectionData) => {
    switch (sec.section_key) {
      case "shop_by_category":
        return (
          <CategoryTiles
            tiles={mergedShopByCategory}
            title={sec.title || "Shop by category"}
            subtitle={sec.subtitle || "Find a little joy for every occasion."}
          />
        );
      case "fresh_flowers_row":
        return (
          <TilesSection
            title={sec.title || "Fresh Flower Delivery in India"}
            subtitle={sec.subtitle || "Make their day bloom with joy"}
            tiles={freshFlowers}
            variant="category"
            isSlider={sec.slider_enabled}
            columnsMobile={3}
            columnsDesktop={6}
          />
        );
      case "cake_delivery_row":
        return (
          <TilesSection
            title={sec.title || "30 Mins Cake Delivery in India"}
            subtitle={sec.subtitle || "Fresh Cake Doorstep Delivery"}
            tiles={cakeDelivery}
            variant="category"
            isSlider={sec.slider_enabled !== false}
            columnsMobile={4}
            columnsDesktop={8}
          />
        );
      case "best_decorations":
        return (
          <TilesSection
            title={sec.title || "Try Our Best Decoration"}
            subtitle={sec.subtitle || "Decoration you will love"}
            tiles={bestDecorations}
            variant="portrait"
            isSlider={sec.slider_enabled !== false}
            columnsMobile={2.5}
            columnsDesktop={5.5}
          />
        );
      case "best_sellers_cakes":
        return (
          <TilesSection
            title={sec.title || "Try Our Best Sellers Categories"}
            subtitle={sec.subtitle || "Cakes you will love"}
            tiles={bestSellerCategories}
            variant="rectangle"
            isSlider={sec.slider_enabled !== false}
            columnsMobile={1.5}
            columnsDesktop={3.5}
          />
        );
      case "personalized_occasions":
        return (
          <TilesSection
            title={sec.title || "Personalized Gifts for Every Occasion"}
            subtitle={sec.subtitle || "Crafted Just for You"}
            tiles={personalizedTiles}
            variant="circle"
            isSlider={sec.slider_enabled !== false}
            columnsMobile={4}
            columnsDesktop={8}
          />
        );
      case "corporate_banner":
        return (
          <CorporateBanner
            image={corporateBanner?.image}
            desktopImage={corporateBanner?.desktopImage}
            mobileImage={corporateBanner?.mobileImage}
            href={corporateBanner?.href || "/corporate-gift"}
            alt={corporateBanner?.alt}
          />
        );
      case "customer_reviews":
        return (
          <CustomerReviews
            reviews={reviews}
            title={sec.title || "Customer Reviews"}
            subtitle={sec.subtitle || "Little moments, shared"}
          />
        );
      default: {
        if (sec.section_type === "testimonials") {
          return (
            <CustomerReviews
              reviews={reviews}
              title={sec.title || "Customer Reviews"}
              subtitle={sec.subtitle || "Little moments, shared"}
            />
          );
        }
        const customTiles = (sec.rule_config_json as any)?.tiles;
        if (Array.isArray(customTiles) && customTiles.length > 0) {
          return (
            <TilesSection
              title={sec.title}
              subtitle={sec.subtitle || undefined}
              tiles={customTiles}
              variant={((sec.rule_config_json as any)?.variant as any) || "category"}
              isSlider={sec.slider_enabled}
            />
          );
        }
        const fb = fallbackProductsByKey[sec.section_key];
        const items = sec.products && sec.products.length > 0 ? sec.products : fb?.items || [];
        if (items.length === 0) return null;
        const catSlug = sec.rule_config_json?.category_slug;
        const viewAllHref = fb?.viewAllHref || (catSlug ? `/${String(catSlug).replace(/^\/+/, "")}` : undefined);
        return (
          <ProductSection
            title={sec.title}
            subtitle={sec.subtitle || undefined}
            products={items}
            enableSlider={sec.slider_enabled}
            viewAllHref={viewAllHref}
          />
        );
      }
    }
  };

  return (
    <main className="w-full">
      <JsonLd data={[buildWebSiteJsonLd(), buildOrganizationJsonLd()]} />
      <div className="grid grid-cols-[minmax(16px,1fr)_minmax(0,1152px)_minmax(16px,1fr)] sm:grid-cols-[minmax(24px,1fr)_minmax(0,1152px)_minmax(24px,1fr)] gap-y-8 sm:gap-y-11 py-3.5 sm:py-6">
        {/* SECTION 4: HERO BANNER SLIDER */}
        <div className="col-span-full sm:col-start-2 sm:col-end-3 -mt-3.5 sm:mt-0">
          <HeroSlider banners={heroBanners} />
        </div>

        {/* ORDERED HOMEPAGE SECTIONS (Dynamic via Giftlaya Admin CMS) */}
        {orderedSections.map((sec) => {
          const content = renderDynamicSection(sec);
          if (!content) return null;
          return (
            <div key={sec.section_key || sec.id} className="col-start-2 col-end-3 min-w-0">
              {content}
            </div>
          );
        })}

        {/* SECTION 17: SEO CONTENT BLOCK "More about gifting with Giftlaya" */}
        <div className="col-start-2 col-end-3 min-w-0">
          <SeoGuide
            title={siteSettings.home_seo_guide?.title}
            html={siteSettings.home_seo_guide?.html}
          />
        </div>

        {/* SECTION 18: FAQ ACCORDION */}
        <div className="col-start-2 col-end-3 min-w-0">
          <FaqAccordion faqs={faqs} />
        </div>

        {/* SECTION 19: "Explore more - Categories, services & delivery locations" */}
        <div className="col-start-2 col-end-3 min-w-0">
          <LinkDirectory groups={linkDirectory} />
        </div>
      </div>
    </main>
  );
}
