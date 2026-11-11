import { cache } from "react";
import {
  Product,
  ProductDetail,
  TileItem,
  HeroBanner,
  NavItem,
  NavColumn,
  City,
  ReviewItem,
  FaqItem,
  LinkDirectoryGroup,
  CategoryPageData,
  HomepageSectionData,
  PublicSiteSettings,
  PublicAddonCatalog,
  PublicCouponItem,
  BlogTopic,
  BlogPost,
} from "@/types";

import categoriesMock from "@/data/categories.json";
import productsMock from "@/data/products.json";
import bannersMock from "@/data/banners.json";
import navMock from "@/data/navigation.json";
import citiesMock from "@/data/cities.json";
import reviewsMock from "@/data/reviews.json";
import faqsMock from "@/data/faqs.json";
import exploreMock from "@/data/exploreLinks.json";
import extraCatalogMock from "@/data/extraCatalog.json";
import blogDataMock from "@/data/blogData.json";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "";

async function fetchWithFallback<T>(endpoint: string, fallback: T): Promise<T> {
  if (!API_BASE_URL) return fallback;

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      next: { revalidate: 30 },
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

async function fetchNoStore<T>(endpoint: string, fallback: T): Promise<T> {
  if (!API_BASE_URL) return fallback;

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

const fetchHomePayload = cache(async (): Promise<Record<string, any> | null> => {
  return fetchNoStore<Record<string, any> | null>("/home", null);
});

const fetchPublicSettingsPayload = cache(async (): Promise<PublicSiteSettings> => {
  return fetchNoStore<PublicSiteSettings>("/settings", {});
});

function mapGoProduct(gp: any): Product {
  const price = Math.round((gp.selling_price_paise ?? 0) / 100) || gp.price || 999;
  const orig = Math.round((gp.mrp_paise ?? 0) / 100) || gp.originalPrice || price;
  const pct = gp.discount_percent ?? (orig > price ? Math.round(((orig - price) * 100) / orig) : 0);
  const tag =
    gp.product_type === "decoration_package"
      ? "Trained decorator setup"
      : (gp.lead_time_days ?? 0) === 0
      ? "Same-day delivery"
      : `Ships in ${gp.lead_time_days} days`;

  return {
    id: String(gp.id || gp.slug),
    dbId: typeof gp.id === "number" ? gp.id : undefined,
    title: gp.name || gp.title || "",
    name: gp.name || gp.title || "",
    slug: gp.slug,
    href: `/p/${gp.slug}`,
    image: gp.primary_image_url || gp.images?.[0]?.url || "",
    price,
    originalPrice: orig,
    mrp: orig,
    discount: pct > 0 ? `${pct}% off` : "",
    deliveryTag: tag,
    rating: gp.rating_avg || 4.8,
    reviewsCount: gp.ratings_count || 24,
  } as Product;
}

export async function postPublicAPI<T>(path: string, body: unknown): Promise<T> {
  const base = API_BASE_URL || "http://localhost:8080/api/v1/public";
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function putPublicAPI<T>(path: string, body: unknown): Promise<T> {
  const base = API_BASE_URL || "http://localhost:8080/api/v1/public";
  const res = await fetch(`${base}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function deletePublicAPI<T>(path: string): Promise<T> {
  const base = API_BASE_URL || "http://localhost:8080/api/v1/public";
  const res = await fetch(`${base}${path}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function submitStorefrontOrder(params: {
  cart: Array<{
    product: { id: number | string; dbId?: number; slug?: string };
    variantId?: number;
    quantity: number;
    dietPreference?: string;
    selectedWeight?: string;
    message?: string;
    referencePhotoName?: string;
    deliveryTimeSlot?: string;
    deliveryDate?: string;
    slotTemplateId?: number;
    customInputs?: Record<string, string>;
    selectedAddons?: Array<{ id: number | string; quantity?: number }>;
  }>;
  cityName: string;
  pincode: string;
  paymentMethod: "UPI" | "Card" | "COD";
  couponCode?: string;
  coinsToRedeem?: number;
  recipientName: string;
  recipientPhone: string;
  shippingAddressJson: Record<string, unknown>;
  fallbackTotal: number;
}): Promise<{ orderNumber: string }> {
  const baseUrl = API_BASE_URL || "http://localhost:8080/api/v1/public";
  let createdOrderNumber = `GL-${Math.floor(100000 + Math.random() * 900000)}`;

  const citiesRes = await fetch(`${baseUrl}/cities`);
  const citiesList: Array<{ id: number; name: string }> = citiesRes.ok
    ? await citiesRes.json()
    : [];
  const matchedCity = citiesList.find(
    (c) => c.name.toLowerCase() === (params.cityName || "").toLowerCase()
  );
  const cityId = matchedCity?.id || citiesList[0]?.id || 1;

  const apiItems: Array<{
    product_id: number;
    variant_id?: number;
    qty: number;
    diet_preference?: string;
    addons?: Array<{ addon_id: number; qty: number }>;
    personalization_json?: Record<string, unknown>;
  }> = [];

  for (const item of params.cart) {
    let resolvedProdId = Number(item.product.dbId || item.product.id);
    if (!Number.isInteger(resolvedProdId) || resolvedProdId <= 0) {
      if (item.product.slug) {
        const pRes = await fetch(`${baseUrl}/products/${encodeURIComponent(item.product.slug)}`);
        if (pRes.ok) {
          const pJson = await pRes.json();
          if (pJson?.id) resolvedProdId = Number(pJson.id);
        }
      }
    }
    if (Number.isInteger(resolvedProdId) && resolvedProdId > 0) {
      const itemAddons = (item.selectedAddons || [])
        .filter((a) => Number(a.id) > 0)
        .map((a) => ({ addon_id: Number(a.id), qty: a.quantity || 1 }));
      apiItems.push({
        product_id: resolvedProdId,
        variant_id: item.variantId && item.variantId > 0 ? item.variantId : undefined,
        qty: item.quantity,
        diet_preference: item.dietPreference,
        addons: itemAddons.length > 0 ? itemAddons : undefined,
        personalization_json: {
          weight: item.selectedWeight,
          message: item.message,
          reference_photo: item.referencePhotoName,
          delivery_slot: item.deliveryTimeSlot,
          ...(item.customInputs || {}),
        },
      });
    }
  }

  if (apiItems.length > 0) {
    let custId: number | undefined;
    try {
      const custRaw = localStorage.getItem("giftlaya_customer");
      custId = custRaw ? Number(JSON.parse(custRaw)?.id) || undefined : undefined;
    } catch {
      custId = undefined;
    }
    const rawDate = params.cart[0]?.deliveryDate;
    const delivDate =
      rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? rawDate
        : new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const slotTemplateId = params.cart.find(
      (it) => it.slotTemplateId && it.slotTemplateId > 0
    )?.slotTemplateId;

    const created = await postPublicAPI<{ order_number: string }>("/orders", {
      customer_id: custId,
      city_id: cityId,
      pincode: params.pincode || undefined,
      payment_method: params.paymentMethod === "COD" ? "cod" : "razorpay",
      coupon_code: params.couponCode || undefined,
      coins_to_redeem: params.coinsToRedeem && params.coinsToRedeem > 0 ? params.coinsToRedeem : undefined,
      slot_template_id: slotTemplateId,
      delivery_date: delivDate,
      recipient_name: params.recipientName,
      recipient_phone: params.recipientPhone,
      shipping_address_json: params.shippingAddressJson,
      items: apiItems,
    });
    if (created?.order_number) {
      createdOrderNumber = created.order_number;
    }
  }

  return { orderNumber: createdOrderNumber };
}

function normalizeProducts(items: any[]): Product[] {
  return items.map((item) => ({
    ...item,
    name: item.name || item.title,
    title: item.title || item.name,
    mrp: item.mrp || item.originalPrice,
    originalPrice: item.originalPrice || item.mrp,
    href: item.href || `/p/${item.slug}`,
  }));
}

function getAllCatalogItems(): Product[] {
  const rawAll = [
    ...productsMock.trending,
    ...productsMock.topSellingCakes,
    ...productsMock.personalizedGifts,
    ...productsMock.plants,
    ...(extraCatalogMock.flowers || []),
    ...(extraCatalogMock.decorations || []),
  ];
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const item of rawAll) {
    const slug = item.slug || item.id;
    if (!seen.has(slug)) {
      seen.add(slug);
      unique.push(item);
    }
  }
  return normalizeProducts(unique);
}

function parseNumPrice(val: number | string | undefined, fallback = 999): number {
  if (typeof val === "number") return val;
  if (!val) return fallback;
  const n = parseInt(String(val).replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(n) ? fallback : n;
}

function formatSlugTitle(slug: string): string {
  const UPPER = new Set(["usa", "uk", "uae", "bts", "ca", "led"]);
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (UPPER.has(w.toLowerCase()) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

function buildProductDetailFallback(
  slug: string,
  forceType?: "product" | "service"
): ProductDetail {
  const all = getAllCatalogItems();
  const exact = all.find((p) => p.slug === slug || p.id === slug);
  const lowerSlug = slug.toLowerCase();

  const keywordPool =
    forceType === "service" || lowerSlug.includes("decor") || lowerSlug.includes("arch") || lowerSlug.includes("balloon")
      ? normalizeProducts(extraCatalogMock.decorations || [])
      : lowerSlug.includes("cake") || lowerSlug.includes("bento")
      ? normalizeProducts(productsMock.topSellingCakes || [])
      : lowerSlug.includes("rose") || lowerSlug.includes("lily") || lowerSlug.includes("orchid") || lowerSlug.includes("gerbera") || lowerSlug.includes("carnation") || lowerSlug.includes("bouquet")
      ? normalizeProducts(extraCatalogMock.flowers || [])
      : lowerSlug.includes("plant")
      ? normalizeProducts(productsMock.plants || [])
      : lowerSlug.includes("mug") || lowerSlug.includes("frame") || lowerSlug.includes("tee") || lowerSlug.includes("cushion") || lowerSlug.includes("bottle")
      ? normalizeProducts(productsMock.personalizedGifts || [])
      : all;

  const base = exact || keywordPool[0] || all[0];
  const resolvedTitle = exact
    ? slug === "pastel-rice-ceremony-arch"
      ? "Pastel Rice Ceremony Arch"
      : base.title
    : formatSlugTitle(slug);

  const isService = forceType === "service" || (!exact && lowerSlug.includes("decor")) || Boolean(exact && base.href?.startsWith("/s/"));
  const isCombo =
    !isService &&
    (lowerSlug.includes("combo") ||
      (lowerSlug.includes("rose") && lowerSlug.includes("cake")) ||
      lowerSlug.includes("bouquet"));
  const isCake =
    !isService &&
    !isCombo &&
    (lowerSlug.includes("cake") || lowerSlug.includes("bento") || resolvedTitle.toLowerCase().includes("cake"));
  const isCustom =
    !isService &&
    (lowerSlug.includes("custom") ||
      lowerSlug.includes("mug") ||
      lowerSlug.includes("frame") ||
      lowerSlug.includes("tee") ||
      lowerSlug.includes("caricature") ||
      lowerSlug.includes("bottle") ||
      lowerSlug.includes("cushion") ||
      Boolean(exact && (base.deliveryTag || "").toLowerCase().includes("ships in")));

  const priceNum =
    slug === "pastel-rice-ceremony-arch" ? 2199 : parseNumPrice(base.price, 1999);
  const mrpNum =
    slug === "pastel-rice-ceremony-arch"
      ? 2499
      : parseNumPrice(base.originalPrice || base.mrp, Math.round(priceNum * 1.18));
  const saveNum = Math.max(0, mrpNum - priceNum);
  const coins = Math.max(20, Math.round(priceNum * 0.1));

  // Choose contextual recommendations
  const sameCategoryPool = isService
    ? normalizeProducts(extraCatalogMock.decorations)
    : isCake
    ? normalizeProducts(productsMock.topSellingCakes)
    : isCustom
    ? normalizeProducts(productsMock.personalizedGifts)
    : normalizeProducts([...(extraCatalogMock.flowers || []), ...productsMock.trending]);

  const similarProducts = sameCategoryPool
    .filter((p) => p.slug !== base.slug)
    .slice(0, 8);
  const youMayAlsoLike = all
    .filter((p) => p.slug !== base.slug)
    .slice(0, 8);

  const galleryImages =
    slug === "pastel-rice-ceremony-arch"
      ? [
          "https://cdn.giftlaya.com/32/pastel-rice-ceremony-arch-1791027277995-676571.webp",
          "https://cdn.giftlaya.com/32/pastel-rice-ceremony-arch-1791027276641-892406.webp",
          "https://cdn.giftlaya.com/32/pastel-rice-ceremony-arch-1791027275422-123998.webp",
        ]
      : slug === "chocolate-fruity-cake"
      ? [
          "https://cdn.giftlaya.com/images/59/5c1916f9-b4c7-4960-9cf9-67f637b51f45.webp",
          "https://cdn.giftlaya.com/images/59/8507b617-56c6-4aea-bedc-0e968dc703b0.webp",
        ]
      : slug === "custom-photo-printed-mug"
      ? [
          "https://cdn.giftlaya.com/images/27/625442f7-7c35-4d3c-ac08-3c42dd2264bd.webp",
          "https://cdn.giftlaya.com/images/27/640b8f81-e6aa-4ebc-9e62-c7dc348c315e.webp",
        ]
      : slug === "yellow-roses-with-cake"
      ? [
          "https://cdn.giftlaya.com/images/23/80465938-3259-4be2-98d2-91d49863bf9c.webp",
          "https://cdn.giftlaya.com/images/23/60ceaa59-46b6-46c1-8773-c5029002d93e.webp",
        ]
      : base.images && base.images.length > 0
      ? base.images
      : [base.image, similarProducts[0]?.image || base.image];

  const isMug = lowerSlug.includes("mug");
  const ratingOverride =
    slug === "chocolate-fruity-cake"
      ? { rating: 4.8, ratingsCount: 99 }
      : slug === "custom-photo-printed-mug"
      ? { rating: 5.0, ratingsCount: 70 }
      : slug === "yellow-roses-with-cake"
      ? { rating: 4.9, ratingsCount: 70 }
      : slug === "pastel-rice-ceremony-arch"
      ? { rating: 4.7, ratingsCount: 174 }
      : null;

  const categoryName = isService
    ? "Annaprashan Decorations"
    : isCake
    ? "Cakes"
    : isCustom
    ? "Personalized Gifts"
    : slug.includes("roses-with-cake") || slug.includes("combo")
    ? "Combos"
    : slug.includes("plant")
    ? "Plants"
    : "Flowers";

  const categoryHref = isService
    ? "/balloon-decorations"
    : isCake
    ? "/cakes"
    : isCustom
    ? "/personalized-gifts"
    : slug.includes("plant")
    ? "/plants"
    : "/flowers";

  const whatsIncluded =
    slug === "chocolate-fruity-cake"
      ? [
          "Cake Flavor - Chocolate",
          "Type of Cake - Cream",
          "Weight - Half Kg",
          "Serves - 4-6 People",
          "Toppings - Fresh Fruits",
        ]
      : slug === "custom-photo-printed-mug"
      ? [
          "Ceramic Coffee mug",
          "Custom Text & Image for Print",
          "Color - Yellow",
          "Capacity - 300 ml",
        ]
      : isService
      ? [
          "Balloon Arch of 170+ Balloons",
          "30 Balloons on the Floor",
          "Backdrop & Theme Bunting Setup",
          "Complete On-Site Decoration & Removal Support",
        ]
      : isCake
      ? [
          `Cake Flavor - ${resolvedTitle.replace(/\s*Cake$/i, "")}`,
          "Type of Cake - Cream",
          "Weight - Half Kg",
          "Serves - 4-6 People",
          "Includes Free Message Card & Knife",
        ]
      : isCustom
      ? isMug
        ? [
            "Ceramic Coffee mug",
            "Custom Text & Image for Print",
            "High-Definition Sublimation Finish",
            "Capacity - 300 ml",
          ]
        : [
            `Custom ${resolvedTitle}`,
            "High-Definition Permanent Print Finish",
            "Protective Gift-Ready Box Packaging",
            "Safe Pan-India Courier Dispatch",
          ]
      : slug === "yellow-roses-with-cake"
      ? [
          "10 Yellow Roses",
          "Black Forest Cake (500gm)",
          "Serves - 4–6 people",
          "Black & White Wrapping Paper",
          "White Ribbon",
        ]
      : [
          `Handcrafted ${resolvedTitle}`,
          "Fresh Seasonal Blooms / Handpicked Materials",
          "Includes Free Greeting Card",
          "Signature Giftlaya Wrapping",
        ];

  const notIncluded = isService ? ["Window Curtain", "Table"] : undefined;

  return {
    ...base,
    id: exact ? base.id || slug : slug,
    slug,
    title: resolvedTitle,
    name: resolvedTitle,
    type: isService ? "service" : "product",
    price: priceNum,
    originalPrice: mrpNum,
    mrp: mrpNum,
    discount: base.discount || `${Math.max(10, Math.round((saveNum / mrpNum) * 100))}% OFF`,
    images: galleryImages,
    categoryName,
    categoryHref,
    rating: ratingOverride ? ratingOverride.rating : base.rating || (isCake ? 4.8 : isService ? 4.7 : 4.9),
    ratingsCount: ratingOverride ? ratingOverride.ratingsCount : base.reviewsCount || (isCake ? 99 : isService ? 174 : 70),
    savingsText: saveNum > 0 ? `You save ₹${saveNum.toLocaleString("en-IN")}` : undefined,
    coins,
    deliveryMode: isService ? "setup" : isCustom ? "courier" : "slot",
    whatsIncluded,
    notIncluded,
    personalize: isCake
      ? {
          hasVegNonVeg: true,
          vegPriceDelta: 0,
          nonVegPriceDelta: 149,
          hasWeightOptions: true,
          hasCakeMessage: true,
          requiredCount: 1,
        }
      : isCustom
      ? {
          hasTextField: true,
          textLabel: isMug ? "Text on Mug" : "Text on Gift",
          textPlaceholder: isMug ? "Enter text on mug" : "Enter custom name or short text",
          hasPhotoUpload: true,
        }
      : undefined,
    qna: isService
      ? [
          {
            q: "How much does annaprashan decoration cost in India?",
            a: "On Giftlaya, annaprashan decoration at home starts at ₹2,199 for a pastel arch with a banner and the baby's name. Theme and hall setups cost ₹5,499 to ₹11,999 including material, decorator travel, setup and clean-up.",
          },
          {
            q: "What is included in an annaprashan decoration package?",
            a: "Everything shown in the design photo: the backdrop or arch, balloons or fresh flowers in your colours, banner and name where pictured, fairy lights, damage-free tape, setup and clean-up.",
          },
          {
            q: "What are simple annaprashan decoration ideas for a small flat?",
            a: "One backdrop on the widest clear wall behind the feeding seat with a two-colour pastel balloon arch takes about an hour and fits cleanly in a 1BHK living room.",
          },
          {
            q: "Which theme is best for a baby boy or baby girl annaprashan?",
            a: "Blue and white, sage green or jungle setups are popular for boys; blush pink, peach and lavender pastels for girls. Gold and white suits either.",
          },
          {
            q: "Can I book same-day annaprashan decoration at home?",
            a: "Yes, balloon designs can usually be set up the same day in 68+ cities with 3 to 4 hours' notice.",
          },
          {
            q: "What is the difference between annaprashan, mukhe bhaat, annaprasana and choroonu decoration?",
            a: "They are regional names for the baby's first rice ceremony. Tell us the ceremony style and our decorator adapts the backdrop and floral details.",
          },
          {
            q: "How long does the annaprashan decoration setup take?",
            a: "Simple home designs take about an hour; theme, floral and hall setups take one to two hours before your muhurat.",
          },
          {
            q: "Can the decoration be done at a banquet hall or society clubhouse?",
            a: "Yes, our decorators build freestanding setups that work smoothly in banquet halls and clubhouses with no-drilling rules.",
          },
        ]
      : isCake
      ? [
          {
            q: "How much does a cake cost on Giftlaya?",
            a: "Our classic half-kilo cream cakes start at ₹649 and go up to ₹899. Truffle, fruit, rasmalai, photo and heart-shaped cakes cost ₹949 to ₹1,999; delivery is charged by slot from ₹99 standard to ₹249 midnight.",
          },
          {
            q: "Can I get same-day cake delivery?",
            a: "Yes, across our 86+ cities. Classic cakes need about two hours from order to door, while theme and character cakes need about six hours.",
          },
          {
            q: "Do you deliver cakes at midnight?",
            a: "Yes. Choose the midnight slot at checkout so your cake arrives right as the celebration begins.",
          },
          {
            q: "Are eggless cakes available?",
            a: "Yes, choose Veg on the product page to have your cake baked completely eggless at no extra cost.",
          },
          {
            q: "Can I put a photo or a message on the cake?",
            a: "Yes, every cake accepts up to a 35-character message at no extra cost, and photo cakes support same-day edible ink printing.",
          },
          {
            q: "How many people does a half-kilo cake serve?",
            a: "A half-kilo cake serves four to six people comfortably; larger 1kg+ cakes serve eight to twelve.",
          },
          {
            q: "How should I store the cake, and how long does it keep?",
            a: "Refrigerate cream cakes immediately and consume within 24 hours; take out 20–30 minutes before cutting.",
          },
          {
            q: "Can I cancel a cake order?",
            a: "Cake orders are baked fresh immediately upon confirmation and cannot be cancelled once preparation starts; if we fail to deliver, you receive a full refund.",
          },
        ]
      : isCustom
      ? [
          {
            q: "Can I add a photo to a personalized mug?",
            a: "Yes! You can upload any photo and we'll print it directly onto the mug with vibrant, long-lasting colors. Both single and collage photo options are available.",
          },
          {
            q: "Is the print on personalized mugs dishwasher safe?",
            a: "Our mugs are printed using high-quality sublimation technology. We recommend hand washing to maintain print quality and longevity over time.",
          },
          {
            q: "How long does it take to deliver a personalized mug?",
            a: "Standard delivery takes 3–5 business days. Express delivery options are also available for urgent gifting needs.",
          },
          {
            q: "Can I customize mugs for corporate gifting?",
            a: "Absolutely. We offer bulk corporate orders with logo printing, employee name personalization, and custom packaging.",
          },
          {
            q: "What type of mugs do you offer for personalization?",
            a: "We offer ceramic mugs, magic/color-changing mugs, travel mugs, and latte mugs — all available for customization with names, photos, or quotes.",
          },
        ]
      : [
          {
            q: "Do you offer same-day or midnight delivery for combos?",
            a: "We recommend placing your order in advance, and we also provide same-day and midnight delivery slots across 100+ cities.",
          },
          {
            q: "Can I customize my gift combo?",
            a: "Yes, you can add a personalized message note during ordering and select preferred options where available.",
          },
          {
            q: "How do I place an order?",
            a: "Select your delivery city, date and slot on the product page, add to cart, and complete checkout in under a minute.",
          },
          {
            q: "Do the combos come gift-wrapped or include a personalized note?",
            a: "Yes, every combo is gift-wrapped and includes a complimentary printed message card.",
          },
          {
            q: "Can I customise a combo (change cake flavour or flowers)?",
            a: "On most products you can switch flavours or add special delivery instructions from the product page.",
          },
        ],
    deliveryInfo: isService
      ? [
          "Trained & background-checked decorators arrive during your chosen 2-hour arrival slot.",
          "Please ensure basic wall/ceiling access and power socket availability at the venue.",
          "Setup duration: approximately 60–90 minutes.",
        ]
      : isCustom
      ? [
          "Crafted fresh to order within 24–48 hours and dispatched via express pan-India courier.",
          "Tracking link shared over WhatsApp & SMS once shipped.",
        ]
      : [
          "Hand-delivered by Giftlaya's dedicated delivery fleet within your selected 2-hour window.",
          "Delivered in protective temperature-safe packaging.",
        ],
    careInstructions: isService
      ? [
          "Keep foil & latex balloons away from sharp objects and direct harsh sunlight.",
          "Indoor AC rooms keep balloon shine intact for 48+ hours.",
        ]
      : isCake
      ? [
          "Refrigerate upon delivery and serve at room temperature after 15 minutes.",
          "Consume within 24 hours for peak freshness and taste.",
        ]
      : [
          "Keep fresh stems away from direct sunlight and warm air vents.",
          "Trim stems slightly and refresh water in vase every 2 days.",
        ],
    sellerName: "M/S Giftlaya",
    sellerBadge: "Verified Partner",
    sellerDesc:
      "Every item is fulfilled by Giftlaya's quality-verified studio partners across 100+ Indian cities.",
    similarProducts,
    youMayAlsoLike,
  };
}

function formatCatTitle(raw: string): string {
  if (!raw) return "";
  if (raw === raw.toLowerCase()) {
    return raw.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return raw;
}

export function searchCatalogLocal(query: string): {
  products: Product[];
  categories: TileItem[];
} {
  const q = query.trim().toLowerCase();
  const allProducts = getAllCatalogItems();

  const navCatTiles: TileItem[] = [];
  for (const item of navMock as NavItem[]) {
    if (item.title !== "More" && item.title !== "Sell with Us" && item.title !== "Blog" && item.href) {
      navCatTiles.push({ title: item.title, href: item.href, image: "" });
    }
    for (const col of item.columns || []) {
      if (item.title === "More" || item.title === "Sell with Us") continue;
      for (const link of col.links || []) {
        if (link.href) {
          navCatTiles.push({ title: link.label, href: link.href, image: "" });
        }
      }
    }
  }

  const allCats: TileItem[] = [
    ...(categoriesMock.shopByCategory as TileItem[]),
    ...(categoriesMock.bestSellerCakes as TileItem[]),
    ...(categoriesMock.cakes30Mins as TileItem[]),
    ...(categoriesMock.freshFlowers as TileItem[]),
    ...(categoriesMock.bestDecorations as TileItem[]),
    ...(categoriesMock.personalizedOccasions as TileItem[]),
    ...navCatTiles,
  ].map((c) => ({ ...c, title: formatCatTitle(c.title) }));

  const matchingProducts = q
    ? allProducts.filter((p) =>
        `${p.title} ${p.category || ""} ${p.slug || ""}`.toLowerCase().includes(q)
      )
    : allProducts.slice(0, 12);

  const seenHref = new Set<string>();
  const seenTitle = new Set<string>();
  const matchingCategories = allCats
    .filter((c) => {
      const keyHref = c.href.toLowerCase();
      const keyTitle = c.title.toLowerCase();
      if (seenHref.has(keyHref) || seenTitle.has(keyTitle)) return false;
      if (!q || keyTitle.includes(q) || keyHref.includes(q)) {
        seenHref.add(keyHref);
        seenTitle.add(keyTitle);
        return true;
      }
      return false;
    })
    .sort((a, b) => {
      if (!q) return 0;
      return Number(b.title.toLowerCase().includes(q)) - Number(a.title.toLowerCase().includes(q));
    })
    .slice(0, 8);

  return {
    products: matchingProducts,
    categories: matchingCategories,
  };
}

const KNOWN_CATEGORY_ROOTS: Set<string> = (() => {
  const roots = new Set<string>([
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
    "corporate-gift",
    "cradle-ceremony-decoration",
    "custom",
    "custom-t-shirts",
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
    "kids-activities",
    "lily",
    "mehndi-decoration",
    "mixed-flowers",
    "mundan-ceremony-decoration",
    "name-reveal-boards",
    "naming-ceremony-decoration",
    "office-decorations",
    "orchids",
    "personalised-keychains",
    "personalised-photo-frames",
    "personalised-water-bottles",
    "personalized-caricatures",
    "personalized-cushions",
    "personalized-gifts",
    "personalized-mugs",
    "personalized-photo-frames",
    "plants",
    "proposal-decoration",
    "rakhi-gifts",
    "romantic-decoration",
    "room-decorations",
    "roses",
    "stage-decorations",
    "terrace-decorations",
    "theme-cakes",
    "trays",
    "valentines-day",
    "wedding-car-decoration",
  ]);
  const nonCatRoots = new Set(["about-us", "blog", "brands", "cart", "checkout", "contact-us", "dashboard", "franchise", "pages", "search", "seller", "sitemap.xml"]);
  for (const item of navMock as NavItem[]) {
    for (const col of item.columns || []) {
      for (const l of col.links || []) {
        const seg = (l.href || "").split("/").filter(Boolean)[0];
        if (seg && !nonCatRoots.has(seg)) roots.add(seg);
      }
    }
  }
  return roots;
})();

export function isValidCategoryRoute(segments: string[]): boolean {
  if (!segments || segments.length === 0 || segments.length > 3) return false;
  const first = segments[0]?.toLowerCase();
  if (!first) return false;
  if (segments.length === 1) {
    return KNOWN_CATEGORY_ROOTS.has(first) || first.startsWith("send-flowers-to-india-from-");
  }
  return KNOWN_CATEGORY_ROOTS.has(first);
}

const RESERVED_APP_ROUTES = new Set([
  "about-us",
  "api",
  "blog",
  "brands",
  "cart",
  "checkout",
  "contact-us",
  "dashboard",
  "franchise",
  "pages",
  "p",
  "s",
  "search",
  "seller",
  "sitemap.xml",
]);

function mapGoReview(rv: any): ReviewItem {
  const name = rv.reviewer_name || rv.name || "Giftlaya Customer";
  return {
    id: rv.id ?? name,
    name,
    city: rv.city_name || rv.city || "",
    initials: String(name)
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "GL",
    rating: Number(rv.rating || 5),
    comment: rv.comment || rv.text || "",
  };
}

async function fetchTilesSafe(endpoint: string, fallback: TileItem[]): Promise<TileItem[]> {
  const tileKey = endpoint.replace(/^\/categories\//, "").replace(/^\/+/, "").toLowerCase();
  const home = await fetchHomePayload();
  const fromSettings = home?.settings?.home_tiles_config?.[tileKey];
  if (Array.isArray(fromSettings) && fromSettings.length > 0) return fromSettings;

  const res = await fetchNoStore<any>(endpoint, fallback);
  if (Array.isArray(res) && res.length > 0) return res;
  if (Array.isArray(res?.related) && res.related.length > 0) return res.related;
  return fallback;
}

function hydrateProductFromApi(gp: any, fallback: ProductDetail): ProductDetail {
  const mapped = mapGoProduct(gp);
  const rawImgs: string[] = Array.isArray(gp.images)
    ? gp.images.map((im: any) => (typeof im === "string" ? im : im?.url)).filter(Boolean)
    : [];
  const primaryImg = gp.primary_image_url ? [gp.primary_image_url] : [];
  const dbImages = Array.from(new Set([...primaryImg, ...rawImgs])).filter(Boolean);

  const rawIncs = Array.isArray(gp.decoration_inclusions) ? gp.decoration_inclusions : [];
  const dbIncluded = rawIncs
    .filter((inc: any) => inc?.kind !== "not_included" && inc?.is_included !== false)
    .map((inc: any) => inc?.item_text || inc?.label)
    .filter(Boolean);
  const dbNotIncluded = rawIncs
    .filter((inc: any) => inc?.kind === "not_included")
    .map((inc: any) => inc?.item_text || inc?.label)
    .filter(Boolean);

  const variants = Array.isArray(gp.variants)
    ? gp.variants.map((v: any) => ({
        id: v.id,
        variantName: v.label || v.variant_name || v.name || "Standard",
        price: Math.round((v.price_paise ?? v.selling_price_paise ?? 0) / 100),
        originalPrice: v.mrp_paise ? Math.round(v.mrp_paise / 100) : undefined,
        skuSuffix: v.sku_suffix || "",
        stockQty: v.stock_qty ?? 0,
      }))
    : undefined;

  const optionGroups = Array.isArray(gp.option_groups)
    ? gp.option_groups.map((og: any) => {
        let parsedOpts: any[] = [];
        try {
          const raw =
            typeof og.options_json === "string"
              ? JSON.parse(og.options_json)
              : og.options_json;
          if (Array.isArray(raw)) parsedOpts = raw;
        } catch {
          parsedOpts = [];
        }
        return {
          id: og.id,
          name: og.name || "Option",
          selectionType: og.selection_type || "radio",
          isRequired: Boolean(og.is_required),
          options: parsedOpts.map((o: any) => ({
            label: o?.label || String(o),
            priceDelta:
              o?.price_delta_paise != null
                ? Math.round(Number(o.price_delta_paise) / 100)
                : Number(o?.price_delta || o?.priceDelta || 0),
          })),
        };
      })
    : undefined;

  const personalizationFields = Array.isArray(gp.personalization_fields)
    ? gp.personalization_fields.map((pf: any) => ({
        key: pf.field_key || `field_${pf.id}`,
        label: pf.label || "Custom Note",
        type: pf.field_type || "text",
        required: Boolean(pf.is_required),
        placeholder: pf.placeholder || "",
      }))
    : undefined;

  const firstTextPf = personalizationFields?.find((f: any) => f.type !== "photo");
  const hasPhotoPf = personalizationFields?.some((f: any) => f.type === "photo");

  const addons = Array.isArray(gp.addons)
    ? gp.addons.map((a: any) => ({
        id: a.addon_product_id || a.id,
        name: a.addon_name || a.name || "Add-on",
        slug: a.addon_slug || a.slug || "",
        price: Math.round((a.price_paise ?? a.addon_price_paise ?? a.selling_price_paise ?? 0) / 100),
        originalPrice: a.addon_mrp_paise ? Math.round(a.addon_mrp_paise / 100) : undefined,
        image: a.addon_image_url || a.image_url || "",
      }))
    : undefined;

  const dbReviews =
    Array.isArray(gp.reviews) && gp.reviews.length > 0
      ? gp.reviews.map(mapGoReview)
      : undefined;

  const cityOverrides = Array.isArray(gp.city_overrides)
    ? gp.city_overrides.map((co: any) => ({
        cityId: Number(co.city_id),
        price: Math.round((co.selling_price_paise ?? 0) / 100),
        originalPrice: co.mrp_paise ? Math.round(co.mrp_paise / 100) : undefined,
        isAvailable: co.is_available !== false,
      }))
    : undefined;

  const similarProducts: Product[] =
    Array.isArray(gp.similar_products) && gp.similar_products.length > 0
      ? gp.similar_products.map(mapGoProduct)
      : fallback.similarProducts || [];

  const similarSlugs = new Set(similarProducts.map((x: Product) => x.slug));
  const rawAlso: Product[] =
    Array.isArray(gp.you_may_also_like) && gp.you_may_also_like.length > 0
      ? gp.you_may_also_like.map(mapGoProduct)
      : (fallback.youMayAlsoLike || []).filter((x: Product) => !similarSlugs.has(x.slug));
  const youMayAlsoLike = rawAlso.length > 0 ? rawAlso : fallback.youMayAlsoLike;

  const mergedPersonalize = {
    ...(fallback.personalize || {}),
    hasVegNonVeg:
      gp.has_veg_nonveg != null ? Boolean(gp.has_veg_nonveg) : fallback.personalize?.hasVegNonVeg,
    nonVegPriceDelta:
      gp.nonveg_delta_paise != null
        ? Math.round(Number(gp.nonveg_delta_paise) / 100)
        : fallback.personalize?.nonVegPriceDelta,
    ...(firstTextPf
      ? {
          hasTextField: true,
          textLabel: firstTextPf.label,
          textPlaceholder: firstTextPf.placeholder || fallback.personalize?.textPlaceholder,
        }
      : {}),
    ...(hasPhotoPf ? { hasPhotoUpload: true } : {}),
  };
  const hasAnyPersonalize = Boolean(
    mergedPersonalize.hasVegNonVeg ||
      mergedPersonalize.hasWeightOptions ||
      mergedPersonalize.hasCakeMessage ||
      mergedPersonalize.hasTextField ||
      mergedPersonalize.hasPhotoUpload
  );

  return {
    ...fallback,
    ...mapped,
    images: dbImages.length > 0 ? dbImages : fallback.images,
    rating: gp.rating_avg ? Number(gp.rating_avg) : fallback.rating,
    ratingsCount: gp.ratings_count ? Number(gp.ratings_count) : fallback.ratingsCount,
    whatsIncluded: dbIncluded.length > 0 ? dbIncluded : fallback.whatsIncluded,
    notIncluded: dbNotIncluded.length > 0 ? dbNotIncluded : fallback.notIncluded,
    description: gp.description ? gp.description.replace(/<[^>]+>/g, "") : fallback.description,
    personalize: hasAnyPersonalize ? mergedPersonalize : undefined,
    variants,
    optionGroups,
    personalizationFields,
    addons,
    reviews: dbReviews,
    cityOverrides,
    similarProducts,
    youMayAlsoLike,
  };
}

export async function resolveCategoryRoute(segments: string[]): Promise<boolean> {
  if (!segments || segments.length === 0 || segments.length > 3) return false;
  const first = segments[0]?.toLowerCase();
  if (!first || RESERVED_APP_ROUTES.has(first)) return false;
  if (isValidCategoryRoute(segments)) return true;
  const slugPath = segments.join("/");
  const live = await fetchNoStore<any>(`/categories/${slugPath}`, null);
  return Boolean(live?.category?.id);
}

export const api = {
  // Hero Banners (Section 4)
  async getHeroBanners(): Promise<HeroBanner[]> {
    const home = await fetchHomePayload();
    if (home?.banners?.length) {
      return home.banners.map((b: any) => ({
        id: b.id,
        href: b.href || "/",
        label: b.title || "Explore",
        desktopImage: b.desktop_image_url,
        mobileImage: b.mobile_image_url || b.desktop_image_url,
      }));
    }
    return bannersMock.heroBanners as HeroBanner[];
  },

  // Shop by Category circular tiles (Section 5)
  async getShopByCategoryTiles(): Promise<TileItem[]> {
    return fetchTilesSafe("/categories/shop-by-category", categoriesMock.shopByCategory as TileItem[]);
  },

  // Trending Gifts product cards (Section 6)
  async getTrendingGifts(): Promise<Product[]> {
    const res = await fetchWithFallback<{ items?: any[] }>("/products?category_slug=trending&limit=12", {});
    if (res?.items?.length) return res.items.map(mapGoProduct);
    return normalizeProducts(productsMock.trending as Product[]);
  },

  // Fresh Flowers tiles (Section 7)
  async getFreshFlowersTiles(): Promise<TileItem[]> {
    return fetchTilesSafe("/categories/fresh-flowers", categoriesMock.freshFlowers as TileItem[]);
  },

  // 30 Mins Cake Delivery tiles (Section 8)
  async getCakeDeliveryTiles(): Promise<TileItem[]> {
    return fetchTilesSafe("/categories/cake-delivery", categoriesMock.cakes30Mins as TileItem[]);
  },

  // Try Our Best Decoration tiles (Section 9)
  async getBestDecorationsTiles(): Promise<TileItem[]> {
    return fetchTilesSafe("/categories/best-decorations", categoriesMock.bestDecorations as TileItem[]);
  },

  // Top-Selling Cakes product cards (Section 10)
  async getTopCakes(): Promise<Product[]> {
    const res = await fetchWithFallback<{ items?: any[] }>("/products?category_slug=cakes&limit=12", {});
    if (res?.items?.length) return res.items.map(mapGoProduct);
    return normalizeProducts(productsMock.topSellingCakes as Product[]);
  },

  // Best Sellers Categories cake tiles (Section 11)
  async getBestSellerCategories(): Promise<TileItem[]> {
    return fetchTilesSafe("/categories/best-sellers-cakes", categoriesMock.bestSellerCakes as TileItem[]);
  },

  // Personalized Gifts product cards (Section 12)
  async getPersonalizedCards(): Promise<Product[]> {
    const res = await fetchWithFallback<{ items?: any[] }>("/products?category_slug=custom&limit=12", {});
    if (res?.items?.length) return res.items.map(mapGoProduct);
    return normalizeProducts(productsMock.personalizedGifts as Product[]);
  },

  // Personalized Gifts For Every Occasion tiles (Section 13)
  async getPersonalizedTiles(): Promise<TileItem[]> {
    return fetchTilesSafe("/categories/personalized-occasions", categoriesMock.personalizedOccasions as TileItem[]);
  },

  // Plants product cards (Section 14)
  async getPlants(): Promise<Product[]> {
    const res = await fetchWithFallback<{ items?: any[] }>("/products?category_slug=plants&limit=12", {});
    if (res?.items?.length) return res.items.map(mapGoProduct);
    return normalizeProducts(productsMock.plants as Product[]);
  },

  // Corporate Banner (Section 15)
  async getCorporateBanner(): Promise<{
    image: string;
    desktopImage: string;
    mobileImage: string;
    href: string;
    alt?: string;
  }> {
    const raw = bannersMock.corporateBanner as any;
    const fallback = {
      image: raw.image || raw.desktopImage || "",
      desktopImage: raw.desktopImage || raw.image || "",
      mobileImage: raw.mobileImage || raw.desktopImage || raw.image || "",
      href: raw.href || "/corporate-gift",
      alt: raw.alt || raw.label || "Corporate Gifting by Giftlaya",
    };
    return fetchWithFallback("/banners/corporate", fallback);
  },

  // Customer Reviews (Section 16)
  async getReviews(): Promise<ReviewItem[]> {
    const home = await fetchHomePayload();
    if (home?.reviews?.length) {
      return home.reviews.map(mapGoReview);
    }
    return (reviewsMock as { reviews: ReviewItem[] }).reviews || [];
  },

  // FAQs (Section 18)
  async getFaqs(): Promise<FaqItem[]> {
    const home = await fetchHomePayload();
    if (home?.faqs?.length) {
      return home.faqs.map((f: any) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
      }));
    }
    return faqsMock as FaqItem[];
  },

  // Explore More Link Directory (Section 19)
  async getLinkDirectory(): Promise<LinkDirectoryGroup[]> {
    return fetchWithFallback<LinkDirectoryGroup[]>(
      "/explore-links",
      exploreMock as LinkDirectoryGroup[]
    );
  },

  // Mega Menu Navigation (Section 3)
  async getMegaMenu(): Promise<NavItem[]> {
    const live = await fetchNoStore<any[]>("/navigation", []);
    if (Array.isArray(live) && live.length > 0) {
      const mapped = live
        .filter((item) => item.is_active !== false)
        .map((item) => {
          let columns: NavColumn[] = [];
          if (Array.isArray(item.columns) && item.columns.length > 0) {
            columns = item.columns;
          } else if (Array.isArray(item.children) && item.children.length > 0) {
            const byCol = new Map<string, NavColumn["links"]>();
            for (const ch of item.children) {
              if (ch?.is_active === false) continue;
              const colTitle = ch.column_title || "Explore";
              const links = byCol.get(colTitle) ?? [];
              links.push({
                label: ch.label || "",
                href: ch.href || "/",
                badge: ch.badge || null,
              });
              byCol.set(colTitle, links);
            }
            columns = Array.from(byCol.entries()).map(([title, links]) => ({
              title,
              links,
            }));
          }
          return {
            title: item.title || item.label || "",
            href: item.href || "/",
            badge: item.badge || null,
            columns,
          };
        });
      if (mapped.some((m) => m.columns.length > 0) || mapped.length >= 4) {
        return mapped;
      }
    }
    return navMock as NavItem[];
  },

  // Cities for Modal & Header
  async getCities(): Promise<{ popularCities: City[]; allCities: string[] }> {
    const live = await fetchWithFallback<any[]>("/cities", []);
    if (Array.isArray(live) && live.length > 0) {
      return {
        popularCities: live
          .filter((c) => c.is_popular)
          .map((c) => ({ name: c.name, slug: c.slug, state: c.state_name || "" })),
        allCities: live.filter((c) => !c.is_popular).map((c) => c.name),
      };
    }
    return citiesMock as { popularCities: City[]; allCities: string[] };
  },

  // Rich Product Detail (For /p/[slug])
  async getProductDetail(slug: string): Promise<ProductDetail> {
    const fallback = buildProductDetailFallback(slug, "product");
    const gp = await fetchNoStore<any>(`/products/${slug}`, null);
    if (!gp || !gp.slug) return fallback;
    return hydrateProductFromApi(gp, fallback);
  },

  // Rich Service Detail (For /s/[slug])
  async getServiceDetail(slug: string): Promise<ProductDetail> {
    const fallback = buildProductDetailFallback(slug, "service");
    const gp = await fetchNoStore<any>(`/products/${slug}`, null);
    if (!gp || !gp.slug) return fallback;
    return hydrateProductFromApi(gp, fallback);
  },

  // Legacy single product lookup
  async getProductBySlug(slug: string): Promise<Product | null> {
    return this.getProductDetail(slug);
  },

  // Dynamic Multi-Segment Category Page (For /[...slug])
  async getCategoryPage(segments: string[], sortBy?: string): Promise<CategoryPageData> {
    const slugPath = segments.join("/");
    const lastSeg = segments[segments.length - 1] || "gifts";

    const formatted = formatSlugTitle(lastSeg);
    const parentFormatted =
      segments.length > 1 ? formatSlugTitle(segments[0]) : undefined;

    const all = getAllCatalogItems();
    const isDecor =
      slugPath.includes("decoration") ||
      slugPath.includes("cabana") ||
      slugPath.includes("canopy") ||
      slugPath.includes("car-boot") ||
      slugPath.includes("haldi");
    const isCake = slugPath.includes("cake") || slugPath.includes("bento");
    const isFlower =
      slugPath.includes("flower") ||
      slugPath.includes("rose") ||
      slugPath.includes("lily") ||
      slugPath.includes("orchid") ||
      slugPath.includes("gerbera") ||
      slugPath.includes("carnation");
    const isPlant = slugPath.includes("plant");
    const isCustom =
      slugPath.includes("custom") ||
      slugPath.includes("personalized") ||
      slugPath.includes("personalised") ||
      slugPath.includes("mug") ||
      slugPath.includes("keychain") ||
      slugPath.includes("frame") ||
      slugPath.includes("cushion") ||
      slugPath.includes("bottle");

    let filteredProducts: Product[] = [];
    if (isDecor) {
      filteredProducts = normalizeProducts(extraCatalogMock.decorations);
    } else if (isCake) {
      filteredProducts = normalizeProducts([
        ...productsMock.topSellingCakes,
        ...productsMock.trending.filter((p) => p.title.toLowerCase().includes("cake")),
      ]);
    } else if (isFlower) {
      filteredProducts = normalizeProducts([
        ...(extraCatalogMock.flowers || []),
        ...productsMock.trending.slice(0, 4),
      ]);
    } else if (isPlant) {
      filteredProducts = normalizeProducts(productsMock.plants);
    } else if (isCustom) {
      filteredProducts = normalizeProducts(productsMock.personalizedGifts);
    } else {
      filteredProducts = all.slice(0, 16);
    }

    // Build breadcrumbs
    const breadcrumbs: { label: string; href?: string }[] = [{ label: "Home", href: "/" }];
    segments.forEach((seg, idx) => {
      const label = formatSlugTitle(seg);
      if (idx === segments.length - 1) {
        breadcrumbs.push({ label });
      } else {
        breadcrumbs.push({
          label,
          href: "/" + segments.slice(0, idx + 1).join("/"),
        });
      }
    });

    const relatedCollections: TileItem[] = isCake
      ? (categoriesMock.cakes30Mins as TileItem[])
      : isCustom
      ? (categoriesMock.personalizedOccasions as TileItem[])
      : isDecor
      ? (categoriesMock.bestDecorations as TileItem[])
      : (categoriesMock.freshFlowers as TileItem[]);

    const NON_CITY_SECOND = new Set([
      "red-velvet",
      "chocolate-cake",
      "rasmalai-cake",
      "fruit-cake",
      "vanilla-cakes",
      "butterscotch",
      "truffle-cakes",
      "sugarfree",
      "eggless",
      "for-couples",
      "flower-n-cakes",
      "birthday",
      "anniversary",
      "weddings",
      "pink",
      "red",
      "white",
      "yellow",
      "flowers",
      "mundan",
    ]);

    let heading: string;
    let displayTitle = formatted;

    if (slugPath.startsWith("send-flowers-to-india-from-")) {
      const country = formatSlugTitle(slugPath.replace("send-flowers-to-india-from-", ""));
      heading = `Send Flowers to India from ${country}`;
      displayTitle = heading;
    } else if (segments.length === 3) {
      if (segments[0] === "combos" && segments[1] === "flower-n-cakes") {
        heading = `Flower & Cakes Combos in ${formatted}`;
      } else if (segments[0] === "cakes" && segments[2].startsWith("for-")) {
        heading = `${formatSlugTitle(segments[1])} Cakes ${formatted}`;
      } else if (segments[0] === "valentines-day") {
        heading = `Valentine's Day Flowers in ${formatted}`;
      } else {
        heading = `${formatSlugTitle(segments[0])} in ${formatted}, ${formatSlugTitle(segments[1])}`;
      }
    } else if (segments.length === 2) {
      if (lastSeg.startsWith("for-")) {
        heading = `${parentFormatted} ${formatted}`;
      } else if (NON_CITY_SECOND.has(lastSeg)) {
        heading = `${formatted} ${parentFormatted}`;
      } else {
        heading = `${parentFormatted} in ${formatted}`;
      }
    } else {
      heading = `Online ${formatted} Delivery in India`;
    }

    const isCityRoute =
      !slugPath.startsWith("send-flowers-to-india-from-") &&
      segments.length >= 2 &&
      !lastSeg.startsWith("for-") &&
      !NON_CITY_SECOND.has(lastSeg);

    const fallback: CategoryPageData = {
      slug: slugPath,
      title: displayTitle,
      eyebrow: "MADE FOR YOUR MOMENTS",
      heading,
      intro: "Thoughtful choices for every celebration.",
      rating: 4.6,
      ratingsCount: isDecor ? 18420 : 37404,
      ...(isCityRoute
        ? {
            cityName: formatted,
            serviceType: parentFormatted || formatted,
          }
        : {}),
      breadcrumbs,
      products: filteredProducts,
      relatedCollections,
      reviews: (reviewsMock.reviews || []) as ReviewItem[],
      guideTitle: heading,
      guideParagraphs: [
        `Send handcrafted ${formatted.toLowerCase()} online across 100+ Indian cities with Giftlaya. Every item is curated fresh on the day of delivery so your celebration feels effortless and special.`,
        `Whether you're ordering a same-day surprise, planning a midnight celebration, or booking a custom setup at home, Giftlaya guarantees transparent pricing, quality-checked items, and dedicated customer support.`,
      ],
      faqs: faqsMock as FaqItem[],
    };

    const qs = sortBy ? `?sort_by=${encodeURIComponent(sortBy)}` : "";
    const live = await fetchNoStore<any>(`/categories/${slugPath}${qs}`, null);
    if (!live?.category) return fallback;

    const cat = live.category;
    const isExactCat = String(cat.slug || "").toLowerCase() === slugPath.toLowerCase();
    const mappedProducts = Array.isArray(live.products) ? live.products.map(mapGoProduct) : [];
    const mappedRelated: TileItem[] =
      Array.isArray(live.related) && live.related.length > 0
        ? live.related.map((rc: any) => ({
            id: rc.id,
            title: rc.name,
            name: rc.name,
            href: `/${String(rc.slug || "").replace(/^\/+/, "")}`,
            image: rc.image_url || "/images/placeholder.webp",
          }))
        : fallback.relatedCollections;
    const mappedReviews: ReviewItem[] =
      Array.isArray(live.reviews) && live.reviews.length > 0
        ? live.reviews.map(mapGoReview)
        : fallback.reviews;
    const mappedFaqs: FaqItem[] =
      Array.isArray(live.faqs) && live.faqs.length > 0
        ? live.faqs.map((f: any) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
          }))
        : fallback.faqs;

    const seoTextIntro = cat.seo_description ? String(cat.seo_description).trim() : "";

    const liveCity = live.city?.name ? String(live.city.name) : "";
    const liveLocality = live.locality ? formatSlugTitle(String(live.locality)) : "";
    const resolvedHeading = liveCity && liveLocality
      ? `${cat.name || fallback.title} in ${liveLocality}, ${liveCity}`
      : liveCity
      ? `${cat.name || fallback.title} in ${liveCity}`
      : isExactCat || !isCityRoute
        ? cat.name || fallback.heading
        : fallback.heading;

    return {
      ...fallback,
      ...(liveCity
        ? { cityName: liveCity, serviceType: cat.name || fallback.title }
        : isExactCat
          ? { cityName: undefined, serviceType: undefined }
          : {}),
      title: cat.name || fallback.title,
      heading: resolvedHeading,
      intro: seoTextIntro || fallback.intro,
      seoTitle: cat.seo_title || fallback.seoTitle,
      seoDescription: cat.seo_description || fallback.seoDescription,
      seoContentHtml: cat.seo_content_html || undefined,
      robots: {
        index: cat.robots_index !== false,
        follow: true,
      },
      products:
        mappedProducts.length > 0 || isExactCat
          ? mappedProducts
          : fallback.products,
      relatedCollections: mappedRelated,
      reviews: mappedReviews,
      guideTitle: liveCity || isExactCat ? resolvedHeading : fallback.guideTitle,
      guideParagraphs:
        liveCity || isExactCat
          ? [
              `Explore curated ${resolvedHeading.toLowerCase()} online across 100+ Indian cities with Giftlaya. Every item is crafted fresh for timely delivery and hassle-free celebration.`,
              fallback.guideParagraphs[1],
            ]
          : fallback.guideParagraphs,
      faqs: mappedFaqs,
      pageConfig: live.page_config || undefined,
    };
  },

  // Search Products & Categories (For /search & SearchModal)
  async searchCatalog(query: string): Promise<{
    products: Product[];
    categories: TileItem[];
  }> {
    const local = searchCatalogLocal(query);
    const live = await fetchWithFallback<{ products?: any[]; categories?: any[] }>(
      `/search?q=${encodeURIComponent(query)}`,
      {}
    );
    const liveProducts = Array.isArray(live?.products) && live.products.length > 0
      ? live.products.map(mapGoProduct)
      : local.products;
    const liveCategories = Array.isArray(live?.categories) && live.categories.length > 0
      ? live.categories.map((c: any) => ({
          id: String(c.id || c.slug),
          title: c.name || c.title || "",
          name: c.name || c.title || "",
          slug: c.slug,
          href: `/${c.slug}`,
          image: c.image_url || c.image || "",
        }))
      : local.categories;
    return { products: liveProducts, categories: liveCategories };
  },

  // Blog Data (For /blog & /blog/[slug])
  async getBlogData(): Promise<{ topics: BlogTopic[]; articles: BlogPost[] }> {
    const raw = blogDataMock as { topics: BlogTopic[]; articles: any[] };
    const articles: BlogPost[] = raw.articles.map((a) => ({
      ...a,
      sections: a.sections || [
        {
          heading: `Why ${a.title} Matters for Modern Celebrations`,
          paragraphs: [
            a.excerpt ||
              "Planning a memorable celebration begins with choosing details that reflect the occasion, venue space, and your loved one's personality.",
            "Whether decorating a cozy living room, booking a terrace cabana, or ordering a fresh floral bouquet with a custom cake, thoughtful coordination ensures everything arrives on time and looks camera-ready.",
          ],
          bullets: [
            "Pick cohesive color palettes (pastel blush, champagne gold, or warm ivory).",
            "Schedule delivery/setup at least 2 hours prior to guest arrival.",
            "Pair centerpiece items with warm fairy lighting or a personalized keepsake.",
          ],
        },
        {
          heading: "Expert Tips from Giftlaya Decorators & Gifting Stylists",
          paragraphs: [
            "Keep delicate floral arrangements cool and away from direct sunlight until display time. For balloon arches and backdrop setups, allow an indoor flat wall near a power outlet so neon signage and LED curtains shine cleanly.",
          ],
        },
      ],
    }));

    const live = await fetchNoStore<{ posts?: any[]; categories?: any[] }>("/blogs", {});
    if (Array.isArray(live?.posts) && live.posts.length > 0) {
      const catById = new Map<number, { name: string; slug: string; image?: string }>();
      const mergedTopics: BlogTopic[] = [...raw.topics];
      if (Array.isArray(live.categories)) {
        for (const c of live.categories) {
          if (c?.id) {
            catById.set(Number(c.id), { name: c.name || "Giftlaya Guides", slug: c.slug || "gifting-guides", image: c.image_url });
          }
          if (c?.slug && !mergedTopics.some((t) => t.slug === c.slug)) {
            mergedTopics.push({
              slug: c.slug,
              title: c.name || c.slug,
              image: c.image_url || raw.topics[0]?.image || "https://cdn.giftlaya.com/images/4/3fef7955-87df-4e55-9d0b-79a683145b79.webp",
            });
          }
        }
      }
      const mappedLive: BlogPost[] = live.posts
        .filter((p) => p?.slug && !articles.some((a) => a.slug === p.slug))
        .map((p) => {
          const cat = p.category_id ? catById.get(Number(p.category_id)) : undefined;
          return {
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt || "",
            category: cat?.name || p.category_name || "Giftlaya Guides",
            categorySlug: cat?.slug || "gifting-guides",
            image: p.featured_image_url || p.cover_image_url || "https://cdn.giftlaya.com/images/4/3fef7955-87df-4e55-9d0b-79a683145b79.webp",
            author: p.author_name || "Giftlaya Team",
            publishedAt: p.published_at ? String(p.published_at).slice(0, 10) : "2026-11-10",
            readTime: p.read_time || "4 min read",
            contentHtml: p.content_html || undefined,
            sections: p.content_html
              ? []
              : [
                  {
                    heading: p.title,
                    paragraphs: [String(p.excerpt || "").trim()].filter(Boolean),
                  },
                ],
          } as BlogPost;
        });
      return {
        topics: mergedTopics,
        articles: [articles[0], ...mappedLive, ...articles.slice(1)].filter(Boolean),
      };
    }

    return {
      topics: raw.topics,
      articles,
    };
  },

  // Catalog lists & dynamic sitemap entries (with live backend endpoint hooks)
  async getAllProducts(): Promise<Product[]> {
    const raw = [
      ...productsMock.trending,
      ...productsMock.topSellingCakes,
      ...productsMock.personalizedGifts,
      ...productsMock.plants,
      ...(extraCatalogMock.flowers || []),
    ];
    const res = await fetchWithFallback<{ items?: any[] }>("/products?limit=100", {});
    if (res?.items?.length) return res.items.map(mapGoProduct);
    return normalizeProducts(raw);
  },

  async getAllServices(): Promise<Product[]> {
    const res = await fetchWithFallback<{ items?: any[] }>("/products?product_type=decoration_package&limit=100", {});
    if (res?.items?.length) return res.items.map(mapGoProduct);
    return normalizeProducts(extraCatalogMock.decorations || []);
  },

  async getSitemapEntries<T>(type: string, fallback: T): Promise<T> {
    const res = await fetchWithFallback<T>(`/sitemap/${type}`, fallback);
    return Array.isArray(res) && res.length > 0 ? res : fallback;
  },

  async getPublicSettings(): Promise<PublicSiteSettings> {
    return fetchPublicSettingsPayload();
  },

  async getPublicPage(slug: string): Promise<{
    id: number;
    slug: string;
    page_type?: string;
    title: string;
    body_html?: string;
    seo_title?: string;
    seo_description?: string;
    robots_index?: boolean;
    is_published?: boolean;
  } | null> {
    return fetchNoStore(`/pages/${encodeURIComponent(slug)}`, null);
  },

  async getPublicRedirects(): Promise<
    { id: number; from_path: string; to_path: string; status_code: number; is_active?: boolean }[]
  > {
    const res = await fetchNoStore<any[]>("/redirects", []);
    return Array.isArray(res) ? res : [];
  },

  async getAddonsCatalog(productSlug?: string): Promise<PublicAddonCatalog> {
    const qs = productSlug ? `?product_slug=${encodeURIComponent(productSlug)}` : "";
    const live = await fetchNoStore<any>(`/addons${qs}`, null);
    if (!live || !Array.isArray(live.addons)) {
      return { addons: [], categories: [], popularIds: [] };
    }
    const popularSet = new Set((live.popular_ids || []).map((x: any) => String(x)));
    const addons = live.addons.map((a: any) => ({
      id: a.id,
      addonCategoryId: a.addon_category_id ?? null,
      name: a.name || "Add-on",
      slug: a.slug || "",
      price: Math.round((a.price_paise ?? 0) / 100),
      image: a.image_url || "",
      isPopular: popularSet.has(String(a.id)),
    }));
    const categories = Array.isArray(live.categories)
      ? live.categories.map((c: any) => ({
          id: Number(c.id),
          name: c.name || "Category",
          slug: c.slug || "",
        }))
      : [];
    return {
      addons,
      categories,
      popularIds: live.popular_ids || [],
    };
  },

  async getPublicCoupons(): Promise<PublicCouponItem[]> {
    const live = await fetchNoStore<any[]>("/coupons", []);
    return Array.isArray(live) ? live : [];
  },

  async getHomepageSections(): Promise<HomepageSectionData[]> {
    const home = await fetchHomePayload();
    if (!Array.isArray(home?.sections)) return [];
    return home.sections
      .filter((s: any) => s && s.is_active !== false)
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((s: any) => ({
        id: Number(s.id),
        section_key: s.section_key || "",
        section_type: s.section_type || "product_row",
        title: s.title || "",
        subtitle: s.subtitle || "",
        slider_enabled: Boolean(s.slider_enabled),
        sort_order: Number(s.sort_order ?? 0),
        is_active: s.is_active !== false,
        rule_config_json: s.rule_config_json || {},
        products: Array.isArray(s.products) ? s.products.map(mapGoProduct) : [],
      }));
  },

  async getHomeConfig(): Promise<{
    trendingSlider: boolean;
    cakesSlider: boolean;
    personalizedSlider: boolean;
    plantsSlider: boolean;
  }> {
    const defaultEnabled = process.env.NEXT_PUBLIC_ENABLE_SLIDER !== "false";
    const home = await fetchHomePayload();
    if (home?.sections?.length) {
      const byKey = new Map<string, boolean>();
      for (const s of home.sections) {
        byKey.set(s.section_key, Boolean(s.slider_enabled));
      }
      return {
        trendingSlider: byKey.get("trending_gifts") ?? defaultEnabled,
        cakesSlider: byKey.get("top_selling_cakes") ?? defaultEnabled,
        personalizedSlider: byKey.get("personalized_gifts") ?? defaultEnabled,
        plantsSlider: byKey.get("green_plants") ?? false,
      };
    }
    return {
      trendingSlider: defaultEnabled,
      cakesSlider: defaultEnabled,
      personalizedSlider: defaultEnabled,
      plantsSlider: defaultEnabled,
    };
  },
};
