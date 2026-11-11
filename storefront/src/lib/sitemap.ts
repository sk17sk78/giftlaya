import { api } from "@/services/api";

export const SITEMAP_SECTIONS = [
  "category",
  "page",
  "sub-page",
  "product",
  "service",
  "blog",
  "brand",
  "images",
] as const;

export type SitemapSection = (typeof SITEMAP_SECTIONS)[number];

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  images?: { loc: string; caption?: string }[];
}

const NRI_SLUGS = [
  "send-flowers-to-india-from-usa",
  "send-flowers-to-india-from-uk",
  "send-flowers-to-india-from-canada",
  "send-flowers-to-india-from-uae",
  "send-flowers-to-india-from-australia",
  "send-flowers-to-india-from-singapore",
  "send-flowers-to-india-from-saudi-arabia",
  "send-flowers-to-india-from-qatar",
  "send-flowers-to-india-from-kuwait",
  "send-flowers-to-india-from-new-zealand",
];

const POLICY_AND_INFO_SLUGS = [
  "pages/terms-and-conditions",
  "pages/privacy-policy",
  "pages/shipping-policy",
  "pages/cancellation-and-return",
  "pages/return-policy",
  "pages/disclaimer",
  "pages/refund-policy",
  "pages/faqs",
];

const CATEGORY_SLUGS = [
  "1st-birthday-cakes",
  "annaprashan-decorations",
  "anniversary-decoration",
  "baby-shower-cakes",
  "baby-shower-decoration",
  "baby-welcome-decoration",
  "balloon-bouquets",
  "balloon-decorations",
  "bento-cakes",
  "birthday-decoration",
  "bride-to-be-decoration",
  "bride-welcome-decoration",
  "cabana-decoration",
  "cakes",
  "candle-light-dinner",
  "canopy-decorations",
  "car-boot-decoration",
  "carnations",
  "ceremony-decoration",
  "chocolates",
  "christening-decorations",
  "christmas-decorations",
  "combos",
  "cradle-ceremony-decoration",
  "custom",
  "decoration-for-kids",
  "dohale-jevan",
  "engagement-ring-platter",
  "festival-decorations",
  "first-night-decorations",
  "flower-decoration",
  "flowers",
  "gerberas",
  "gift-hampers",
  "gifts",
  "haldi-decoration",
  "lily",
  "mehndi-decoration",
  "mixed-flowers",
  "naming-ceremony-decoration",
  "office-decorations",
  "orchids",
  "plants",
  "proposal-decoration",
  "romantic-decoration",
  "room-decorations",
  "roses",
  "stage-decorations",
  "terrace-decorations",
  "theme-cakes",
  "trays",
  "valentines-day",
  "wedding-car-decoration",
  "mundan-ceremony-decoration",
  "kids-activities",
  "name-reveal-boards",
  "personalized-mugs",
  "personalized-cushions",
  "personalised-photo-frames",
  "personalised-keychains",
  "personalised-water-bottles",
  "custom-t-shirts",
  "corporate-gift",
  "personalized-caricatures",
  "rakhi-gifts",
];

const SUB_PAGE_PATHS = [
  ...["ahmedabad", "bangalore", "bhopal", "chennai", "delhi", "gurgaon", "hyderabad", "indore", "mumbai", "noida", "pune", "surat"].map(
    (c) => `/combos/flower-n-cakes/${c}`
  ),
  "/cakes/anniversary/for-25th",
  "/cakes/anniversary/for-parents",
  "/valentines-day/flowers/kolkata",
  ...["bannerghatta-road", "btm-layout", "electronic-city", "hosur", "hsr-layout", "indiranagar", "jayanagar", "jp-nagar", "kengeri", "koramangala", "malleshwaram", "richmond-town", "whitefield"].map(
    (a) => `/balloon-decorations/bangalore/${a}`
  ),
  ...["banjara-hills", "begumpet", "boduppal", "gachibowli", "hitec-city", "jubilee-hills", "kompally", "kondapur", "kukatpally", "madhapur", "manikonda", "miyapur", "narsingi", "pragathi-nagar"].map(
    (a) => `/balloon-decorations/hyderabad/${a}`
  ),
  ...["bandra-east-west", "borivali-east-west", "chembur-east-west", "churchgate", "dadar", "goregaon-east-west", "jogeshwari-east-west", "kandivali-east-west", "lokhandwala", "andheri-east-west", "malad-east-west", "mulund", "nalasopara", "powai", "santacruz", "vikhroli"].map(
    (a) => `/balloon-decorations/mumbai/${a}`
  ),
  ...["defence-colony", "dwarka", "greater-kailash", "janakpuri", "karol-bagh", "laxmi-nagar", "malviya-nagar", "patel-nagar", "pitampura", "rohini", "shahdara", "vasant-kunj"].map(
    (a) => `/balloon-decorations/delhi/${a}`
  ),
  ...["ballygunge", "bangur-lake-town", "bhowanipore", "garia", "jadavpur", "new-alipore", "new-town-rajarhat", "phool-bagan-kankurgachi", "salt-lake", "santoshpur"].map(
    (a) => `/balloon-decorations/kolkata/${a}`
  ),
];

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toAbsUrl(baseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return pathOrUrl ? `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}` : baseUrl;
}

export function buildSitemapIndexXml(baseUrl: string): string {
  const lastmod = todayIsoDate();
  const rows = SITEMAP_SECTIONS.map(
    (section) =>
      `<sitemap><loc>${escapeXml(`${baseUrl}/${section}/sitemap.xml`)}</loc><lastmod>${lastmod}</lastmod></sitemap>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</sitemapindex>`;
}

export function buildUrlsetXml(entries: SitemapUrlEntry[], includeImages = false): string {
  const ns = includeImages
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

  const rows = entries
    .map((e) => {
      const parts = [`<loc>${escapeXml(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`<lastmod>${escapeXml(e.lastmod)}</lastmod>`);
      if (e.changefreq) parts.push(`<changefreq>${escapeXml(e.changefreq)}</changefreq>`);
      if (e.priority) parts.push(`<priority>${escapeXml(e.priority)}</priority>`);
      if (includeImages && e.images) {
        for (const img of e.images) {
          parts.push(
            `<image:image><image:loc>${escapeXml(img.loc)}</image:loc>${
              img.caption ? `<image:caption>${escapeXml(img.caption)}</image:caption>` : ""
            }</image:image>`
          );
        }
      }
      return `<url>${parts.join("")}</url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${ns}>\n${rows}\n</urlset>`;
}

async function getFallbackEntries(section: SitemapSection, baseUrl: string): Promise<SitemapUrlEntry[]> {
  const today = todayIsoDate();

  switch (section) {
    case "category": {
      return [
        { loc: baseUrl, changefreq: "daily", priority: "1.0" },
        { loc: `${baseUrl}/contact-us`, changefreq: "monthly", priority: "0.5" },
        ...NRI_SLUGS.map((s) => ({ loc: `${baseUrl}/${s}`, changefreq: "weekly", priority: "0.8" })),
        ...POLICY_AND_INFO_SLUGS.map((s) => ({ loc: `${baseUrl}/${s}`, changefreq: "monthly", priority: "0.6" })),
        ...CATEGORY_SLUGS.map((s) => ({
          loc: `${baseUrl}/${s}`,
          lastmod: today,
          changefreq: "weekly",
          priority: "0.8",
        })),
      ];
    }

    case "page": {
      const { popularCities, allCities } = await api.getCities();
      const citySlugs = Array.from(
        new Set([
          ...popularCities.map((c) => c.slug),
          ...allCities.map((c) => c.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
        ])
      ).slice(0, 40);

      const entries: SitemapUrlEntry[] = [];
      for (const cat of CATEGORY_SLUGS) {
        for (const city of citySlugs) {
          if (entries.length >= 500) break;
          entries.push({
            loc: `${baseUrl}/${cat}/${city}`,
            lastmod: today,
            changefreq: "weekly",
            priority: "0.8",
          });
        }
        if (entries.length >= 500) break;
      }
      return entries;
    }

    case "sub-page": {
      return SUB_PAGE_PATHS.map((p) => ({
        loc: `${baseUrl}${p}`,
        lastmod: today,
        changefreq: "weekly",
        priority: "0.8",
      }));
    }

    case "product": {
      const products = await api.getAllProducts();
      const seen = new Set<string>();
      const entries: SitemapUrlEntry[] = [];
      for (const p of products) {
        if (p.href?.startsWith("/s/") || seen.has(p.slug)) continue;
        seen.add(p.slug);
        entries.push({
          loc: `${baseUrl}${p.href?.startsWith("/p/") ? p.href : `/p/${p.slug}`}`,
          lastmod: today,
          changefreq: "weekly",
          priority: "0.8",
        });
      }
      return entries;
    }

    case "service": {
      const services = await api.getAllServices();
      const seen = new Set<string>();
      const entries: SitemapUrlEntry[] = [];
      for (const s of services) {
        if (seen.has(s.slug)) continue;
        seen.add(s.slug);
        entries.push({
          loc: `${baseUrl}${s.href?.startsWith("/s/") ? s.href : `/s/${s.slug}`}`,
          lastmod: today,
          changefreq: "weekly",
          priority: "0.8",
        });
      }
      return entries;
    }

    case "blog": {
      const { topics, articles } = await api.getBlogData();
      return [
        { loc: `${baseUrl}/blog`, changefreq: "daily", priority: "0.7" },
        ...topics.map((t) => ({
          loc: `${baseUrl}/blog/category/${t.slug}`,
          lastmod: today,
          changefreq: "weekly",
          priority: "0.6",
        })),
        ...articles.map((a) => ({
          loc: `${baseUrl}/blog/${a.slug}`,
          lastmod: today,
          changefreq: "weekly",
          priority: "0.6",
        })),
      ];
    }

    case "brand": {
      return [{ loc: `${baseUrl}/brands`, changefreq: "weekly", priority: "0.6" }];
    }

    case "images": {
      const [products, services] = await Promise.all([api.getAllProducts(), api.getAllServices()]);
      const combined = [...products, ...services];
      const seen = new Set<string>();
      const entries: SitemapUrlEntry[] = [];
      for (const item of combined) {
        const path = item.href || `/p/${item.slug}`;
        if (seen.has(path) || !item.image) continue;
        seen.add(path);
        entries.push({
          loc: `${baseUrl}${path}`,
          images: [{ loc: item.image, caption: item.title }],
        });
      }
      return entries;
    }
  }
}

export async function getSubSitemapXml(section: SitemapSection): Promise<string> {
  const baseUrl = getSiteUrl();
  const fallback = await getFallbackEntries(section, baseUrl);
  const rawEntries = await api.getSitemapEntries<SitemapUrlEntry[]>(section, fallback);
  const normalized = rawEntries.map((entry) => ({
    ...entry,
    loc: toAbsUrl(baseUrl, entry.loc),
  }));
  return buildUrlsetXml(normalized, section === "images");
}

