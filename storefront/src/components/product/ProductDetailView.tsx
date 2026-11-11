"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductDetail, CartAddonItem, PublicAddonCatalog } from "@/types";
import { useCart } from "@/context/CartContext";
import { useCity } from "@/context/CityContext";
import { api, postPublicAPI, API_BASE_URL } from "@/services/api";
import { ProductSection } from "@/components/home/ProductSection";
import { AddonsModal } from "@/components/product/AddonsModal";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildFaqJsonLd,
  toAbsoluteImageUrl,
} from "@/lib/seo";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Clock,
  Check,
  Calendar,
  ShoppingBag,
  ArrowRight,
  PenLine,
  Tag,
  Truck,
  Upload,
  Sparkles,
  XCircle,
  Coins,
} from "lucide-react";

interface ProductDetailViewProps {
  product: ProductDetail;
}

interface SubmittedReview {
  name: string;
  rating: number;
  text: string;
  date: string;
}

function formatLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getNextDates() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const list = [];
  const base = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : days[d.getDay()];
    list.push({
      iso: formatLocalISO(d),
      topLabel: label,
      dayNum: String(d.getDate()).padStart(2, "0"),
      month: months[d.getMonth()],
      full: `${label}, ${d.getDate()} ${months[d.getMonth()]}`,
    });
  }
  return list;
}

interface LiveSlotOption {
  slot_template_id?: number;
  label: string;
  start_time?: string;
  end_time?: string;
  is_available: boolean;
  is_midnight?: boolean;
  extra_charge_paise?: number;
  remaining_capacity?: number;
}

const TIME_SLOT_GROUPS = [
  {
    group: "Morning & Afternoon",
    slots: ["09:00 AM - 11:00 AM", "11:00 AM - 01:00 PM", "01:00 PM - 03:00 PM", "03:00 PM - 05:00 PM"],
  },
  {
    group: "Evening & Midnight",
    slots: ["05:00 PM - 07:00 PM", "07:00 PM - 09:00 PM", "09:00 PM - 11:00 PM", "11:00 PM - 12:00 AM"],
  },
];

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { selectedCity, openCityModal } = useCity();

  const isService = product.type === "service";
  const images = product.images?.length ? product.images : [product.image];

  // Gallery state
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  // Personalization, variants, option groups & add-ons modal state
  const [dietPref, setDietPref] = useState<"Veg" | "Non-Veg" | undefined>(undefined);
  const [selectedWeight, setSelectedWeight] = useState("0.5 Kg");
  const [selectedVariantId, setSelectedVariantId] = useState<number | string | null>(
    () => product.variants?.[0]?.id ?? null
  );
  const [selectedOptionChoices, setSelectedOptionChoices] = useState<Record<string, string[]>>({});
  const [addonsModalOpen, setAddonsModalOpen] = useState(false);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonsCatalog, setAddonsCatalog] = useState<PublicAddonCatalog>(() => ({
    addons: (product.addons || []).map((a) => ({ ...a, isPopular: true })),
    categories: [],
    popularIds: (product.addons || []).map((a) => a.id),
  }));
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [customText, setCustomText] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | undefined>(undefined);

  // Delivery date/time state
  const quickDates = useMemo(() => getNextDates(), []);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedIsoDate, setSelectedIsoDate] = useState<string>("");
  const [customDate, setCustomDate] = useState<string>("");
  const [showMoreDates, setShowMoreDates] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<number | undefined>(undefined);
  const [selectedSlotSurcharge, setSelectedSlotSurcharge] = useState<number>(0);
  const [liveSlots, setLiveSlots] = useState<LiveSlotOption[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsNotice, setSlotsNotice] = useState<string | null>(null);

  const activeIsoDate = customDate || selectedIsoDate;

  useEffect(() => {
    if (product.deliveryMode === "courier" || !activeIsoDate) {
      setLiveSlots(null);
      setSlotsNotice(null);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsNotice(null);
    const base = API_BASE_URL || "http://localhost:8080/api/v1/public";
    const cityParam =
      selectedCity && selectedCity !== "Select your city"
        ? `&city=${encodeURIComponent(selectedCity)}`
        : "";
    fetch(`${base}/slots?date=${encodeURIComponent(activeIsoDate)}${cityParam}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.slots) || data.slots.length === 0) {
          return;
        }
        setLiveSlots(data.slots);
        if (data.blackout_reason) {
          setSlotsNotice(String(data.blackout_reason));
        } else if (
          data.slots.every((s: LiveSlotOption) => !s.is_available) &&
          data.cutoff_time
        ) {
          setSlotsNotice(
            `Same-day delivery cutoff (${data.cutoff_time}) has passed. Please pick Tomorrow or a future date.`
          );
        }
      })
      .catch(() => {
        if (!cancelled) setLiveSlots(null);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeIsoDate, selectedCity, product.deliveryMode]);

  const slotGroups = useMemo((): { group: string; slots: LiveSlotOption[] }[] => {
    if (liveSlots && liveSlots.length > 0) {
      const morning: LiveSlotOption[] = [];
      const evening: LiveSlotOption[] = [];
      for (const s of liveSlots) {
        const hour = s.start_time ? parseInt(s.start_time.split(":")[0], 10) : 12;
        if (s.is_midnight || (!Number.isNaN(hour) && hour >= 17)) {
          evening.push(s);
        } else {
          morning.push(s);
        }
      }
      return [
        ...(morning.length > 0 ? [{ group: "Morning & Afternoon", slots: morning }] : []),
        ...(evening.length > 0 ? [{ group: "Evening & Midnight", slots: evening }] : []),
      ];
    }
    return TIME_SLOT_GROUPS.map((g) => ({
      group: g.group,
      slots: g.slots.map((lbl): LiveSlotOption => ({
        label: lbl,
        is_available: true,
        is_midnight: lbl.includes("12:00 AM"),
        extra_charge_paise: lbl.includes("12:00 AM") ? 14900 : 0,
      })),
    }));
  }, [liveSlots]);

  // Validation highlight
  const [validationError, setValidationError] = useState<string | null>(null);

  // Accordions
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    included: true,
    qna: false,
    delivery: false,
    care: false,
    seller: false,
  });

  // Review composer
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [userReviews, setUserReviews] = useState<SubmittedReview[]>([]);

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Price calculation
  const rawBasePrice =
    typeof product.price === "number"
      ? product.price
      : parseInt(String(product.price).replace(/[^0-9]/g, ""), 10) || 999;
  const rawMrpPrice =
    typeof product.originalPrice === "number"
      ? product.originalPrice
      : parseInt(String(product.originalPrice || product.mrp || rawBasePrice).replace(/[^0-9]/g, ""), 10) || rawBasePrice;

  const activeVariant =
    product.variants?.find((v) => v.id === selectedVariantId) ?? null;
  const basePrice = activeVariant ? activeVariant.price : rawBasePrice;
  const mrpPrice =
    activeVariant?.originalPrice && activeVariant.originalPrice > 0
      ? activeVariant.originalPrice
      : rawMrpPrice;

  const weightExtra =
    !activeVariant && product.personalize?.hasWeightOptions && selectedWeight === "1 Kg"
      ? 400
      : !activeVariant && product.personalize?.hasWeightOptions && selectedWeight === "2 Kg"
      ? 1100
      : 0;
  const dietExtra = dietPref === "Non-Veg" ? (product.personalize?.nonVegPriceDelta ?? 149) : 0;

  const optionGroupExtra = useMemo(() => {
    if (!product.optionGroups?.length) return 0;
    let extra = 0;
    for (const og of product.optionGroups) {
      const picked = selectedOptionChoices[String(og.id)] || [];
      for (const opt of og.options) {
        if (picked.includes(opt.label)) extra += opt.priceDelta || 0;
      }
    }
    return extra;
  }, [product.optionGroups, selectedOptionChoices]);

  const finalPrice = basePrice + weightExtra + dietExtra + optionGroupExtra;
  const finalMrp = mrpPrice + weightExtra + dietExtra + optionGroupExtra;
  const savings = Math.max(0, finalMrp - finalPrice);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const commitAddToCart = (pickedAddons: CartAddonItem[]) => {
    const activeDate = customDate || selectedIsoDate || selectedDate;
    const customSummary = Object.entries(customFields)
      .filter(([, val]) => Boolean(val?.trim()))
      .map(([, val]) => val.trim())
      .join(" · ");

    addToCart(product, 1, {
      selectedCity: selectedCity !== "Select your city" ? selectedCity : undefined,
      variantId: activeVariant && Number(activeVariant.id) > 0 ? Number(activeVariant.id) : undefined,
      selectedWeight:
        activeVariant?.variantName ||
        (product.personalize?.hasWeightOptions ? selectedWeight : undefined),
      dietPreference: dietPref,
      deliveryDate: activeDate || "Express 5-day shipping",
      deliveryTimeSlot: selectedTimeSlot || "Standard courier",
      slotTemplateId: selectedSlotId,
      slotSurcharge: selectedSlotSurcharge,
      message: customSummary || customText || undefined,
      referencePhotoName: photoName,
      selectedAddons: pickedAddons.length > 0 ? pickedAddons : undefined,
      customInputs: Object.keys(customFields).length > 0 ? customFields : undefined,
      unitPriceOverride: finalPrice,
      openDrawer: false,
    });
    setAddonsModalOpen(false);
    router.push("/cart");
  };

  const handlePrimaryAction = async () => {
    // Require Veg/Non-Veg selection if product requires it
    if (product.personalize?.hasVegNonVeg && !dietPref) {
      setValidationError("Please choose Veg or Non-Veg before continuing.");
      document.getElementById("personalize-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Validate required option groups
    if (product.optionGroups?.length) {
      const missingGroup = product.optionGroups.find(
        (og) => og.isRequired && !(selectedOptionChoices[String(og.id)]?.length)
      );
      if (missingGroup) {
        setValidationError(`Please select ${missingGroup.name} before continuing.`);
        document.getElementById("personalize-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    // Validate required DB personalization fields
    if (product.personalizationFields?.length) {
      const missingField = product.personalizationFields.find(
        (pf) => pf.required && pf.type !== "photo" && !customFields[pf.key]?.trim()
      );
      if (missingField) {
        setValidationError(`Please fill "${missingField.label}" before continuing.`);
        document.getElementById("personalize-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    // Require date & slot for slot/setup items
    const activeDate = customDate || selectedDate;
    if (product.deliveryMode !== "courier" && (!activeDate || !selectedTimeSlot)) {
      setValidationError(
        !activeDate
          ? "Please select a delivery date."
          : "Please select a 2-hour delivery time window."
      );
      document.getElementById("schedule-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setValidationError(null);
    setAddonsModalOpen(true);
    setAddonsLoading(true);
    try {
      const cat = await api.getAddonsCatalog(product.slug);
      if (cat.addons.length > 0) {
        setAddonsCatalog(cat);
      }
    } finally {
      setAddonsLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    const cleanName = reviewName.trim() || "Verified Customer";
    const cleanText = reviewText.trim();
    try {
      await postPublicAPI("/reviews", {
        product_slug: product.slug,
        reviewer_name: cleanName,
        city_name: selectedCity !== "Select your city" ? selectedCity : "",
        rating: reviewRating,
        comment: cleanText,
      });
    } catch {
      // keep optimistic local confirmation
    }
    setUserReviews((prev) => [
      {
        name: cleanName,
        rating: reviewRating,
        text: cleanText,
        date: "Just now",
      },
      ...prev,
    ]);
    setReviewText("");
    setReviewName("");
    setIsWritingReview(false);
  };

  const whatsappText = encodeURIComponent(
    `Hello Giftlaya Team,\n\nI would like to enquire about:\nPackage: ${product.title}\nPrice: ₹${finalPrice}\n\nPlease share availability details.`
  );

  // Courier estimated delivery date (+5 days)
  const courierEta = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  }, []);

  // JSON-LD Schemas
  const itemPath =
    product.type === "service" ? `/s/${product.slug}` : `/p/${product.slug}`;
  const canonicalUrl = buildCanonicalUrl(itemPath);
  const sku =
    product.sku ||
    `GL-${String(product.id || product.slug)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase()}`;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description:
      product.description ||
      (product.type === "service"
        ? `Book ${product.title} from ₹${finalPrice}. Set up at your venue by a trained decorator. Material, setup and cleanup included.`
        : `Buy ${product.title} from ₹${finalPrice}. Same-day and midnight delivery in 100+ cities. Order online in a couple of minutes.`),
    image: images.map((img) => toAbsoluteImageUrl(img) || img),
    brand: { "@type": "Brand", name: product.sellerName },
    sku,
    offers: {
      "@type": "Offer",
      price: finalPrice,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      priceValidUntil: "2027-12-31",
      url: canonicalUrl,
      seller: {
        "@type": "Organization",
        name: product.sellerName,
      },
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: product.categoryName, path: product.categoryHref },
    { name: product.title },
  ]);

  const faqJsonLd =
    product.qna && product.qna.length > 0 ? buildFaqJsonLd(product.qna) : null;

  return (
    <div className="bg-white min-h-screen">
      {/* Structured Data */}
      <JsonLd
        data={[
          productJsonLd,
          breadcrumbJsonLd,
          ...(faqJsonLd ? [faqJsonLd] : []),
        ]}
      />

      <main className="max-w-[1200px] mx-auto px-3 sm:px-6 pt-2.5 sm:pt-[18px] pb-24 sm:pb-28">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-[10px] sm:text-[12px] text-[#79717a] mb-2.5 sm:mb-[18px] whitespace-nowrap overflow-hidden"
        >
          <Link href="/" className="hover:text-[#a7194b] shrink-0">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 shrink-0 text-gray-400" />
          <Link href={product.categoryHref || "/gifts"} className="hover:text-[#a7194b] shrink-0">
            {product.categoryName}
          </Link>
          <ChevronRight className="w-3 h-3 shrink-0 text-gray-400" />
          <span className="truncate text-[#554750]">{product.title}</span>
        </nav>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-5 lg:gap-10 items-start">
          {/* LEFT COLUMN: Sticky Image Gallery */}
          <div className="lg:sticky lg:top-[132px] min-w-0">
            {/* Main Gallery Viewport */}
            <div className="relative w-[calc(100%+24px)] -mx-3 sm:w-full sm:mx-0 aspect-square overflow-hidden sm:rounded-[20px] bg-[#f6f3f5] sm:border border-[#0000000d] group">
              <Image
                src={images[activeImgIdx] || product.image}
                alt={product.title}
                fill
                priority
                sizes="(min-width: 1024px) 580px, 100vw"
                className="object-cover"
              />

              {/* Gallery Prev/Next Buttons */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveImgIdx((i) => (i - 1 + images.length) % images.length)}
                    aria-label="Previous image"
                    className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-[#352a30] shadow-md items-center justify-center hover:bg-white transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImgIdx((i) => (i + 1) % images.length)}
                    aria-label="Next image"
                    className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-[#352a30] shadow-md items-center justify-center hover:bg-white transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Counter Pill Bottom-Left */}
              <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-xs text-white text-[11px] font-semibold">
                {activeImgIdx + 1} / {images.length}
              </span>

              {/* Similar Scroll Button Bottom-Right */}
              <button
                type="button"
                onClick={() =>
                  document.getElementById("similar-section")?.scrollIntoView({ behavior: "smooth" })
                }
                className="absolute bottom-3 right-3 flex items-center gap-1.5 h-8 px-2.5 border border-[#eae4e9] rounded-[10px] bg-white/95 text-[#493442] text-[10px] font-semibold hover:bg-white hover:border-[#d6b4c3] shadow-sm transition-all"
              >
                <Sparkles className="w-3 h-3 text-[#9b1b45]" />
                <span>Similar</span>
              </button>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex items-center gap-2.5 mt-3 px-0.5 overflow-x-auto no-scrollbar">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIdx(idx)}
                    aria-label={`View image ${idx + 1}`}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 shrink-0 bg-[#faf5f8] transition-all ${
                      activeImgIdx === idx
                        ? "border-[#a7194b] shadow-sm"
                        : "border-[#eae4e9] opacity-75 hover:opacity-100"
                    }`}
                  >
                    <Image src={imgUrl} alt="" fill sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Product Details Card Stack */}
          <div className="flex flex-col gap-4 sm:gap-[18px] min-w-0">
            {/* Validation Banner if needed */}
            {validationError && (
              <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-[#fff0f3] border border-[#f5c2cd] text-[#a31f38] text-[13px] font-medium">
                <span>{validationError}</span>
                <button
                  type="button"
                  onClick={() => setValidationError(null)}
                  className="text-xs underline shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* SECTION 1: PRODUCT OVERVIEW CARD */}
            <section
              aria-label="Product overview"
              className="bg-white border border-[#eae5e9] rounded-[20px] overflow-hidden shadow-[0_3px_16px_rgba(53,32,44,0.03)]"
            >
              {/* Title + Rating */}
              <div className="p-4 sm:px-5 sm:pt-[18px] sm:pb-3.5">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[11px] font-semibold text-[#67616a] bg-[#f5f4f5] rounded-[6px] px-2 py-1 leading-none">
                    {product.categoryName}
                  </span>
                </div>

                <h1 className="text-[18px] sm:text-[20px] font-bold leading-[1.4] tracking-[-0.3px] text-[#292229]">
                  {product.title}
                </h1>

                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="inline-flex items-center gap-2 mt-2.5 text-[12px] text-[#576079] hover:text-[#a7194b] transition-colors"
                >
                  <strong className="inline-flex items-center gap-1 text-[#39333b] bg-[#f7f6f7] px-2 py-1 rounded-[7px] font-bold">
                    <Star className="w-3.5 h-3.5 fill-[#eb9a00] text-[#eb9a00]" />
                    <span>{product.rating}</span>
                  </strong>
                  <span>{product.ratingsCount} reviews →</span>
                </button>
              </div>

              {/* Pricing + Coins */}
              <div className="p-4 sm:px-5 sm:py-4 border-t border-[#eeebee]">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[24px] sm:text-[26px] font-bold tracking-[-0.6px] leading-none text-[#292229]">
                      ₹{finalPrice.toLocaleString("en-IN")}
                    </span>
                    {finalMrp > finalPrice && (
                      <del className="text-[13px] text-[#92848d]">
                        ₹{finalMrp.toLocaleString("en-IN")}
                      </del>
                    )}
                  </div>

                  {product.discount && (
                    <span className="inline-flex items-center gap-1.5 border border-[#e6e9e7] rounded-[7px] bg-white text-[#404c45] px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
                      <Tag className="w-3 h-3 text-[#159861]" />
                      <span>{product.discount}</span>
                    </span>
                  )}
                </div>

                {savings > 0 && (
                  <p className="text-[11px] font-medium text-[#59655e] mt-1.5">
                    You save ₹{savings.toLocaleString("en-IN")}
                  </p>
                )}

                {/* Rewards Coins Banner */}
                <div className="flex items-center gap-2.5 border border-[#f4e5b7] rounded-[12px] bg-[linear-gradient(110deg,#fff3cb,#fffdf6)] px-3 py-2 mt-3 text-[12px] text-[#885006]">
                  <span className="w-5 h-5 rounded-full bg-[#fef3c7] border border-[#f59e0b]/40 text-[#d97706] grid place-items-center shrink-0">
                    <Coins className="w-3.5 h-3.5" />
                  </span>
                  <p className="leading-snug">
                    Earn <strong className="font-bold text-[#874200]">{product.coins} coins</strong> on this order
                  </p>
                  <span className="hidden sm:inline ml-auto text-[10px] font-semibold text-[#8f7346]">
                    Rewards
                  </span>
                </div>
              </div>

              {/* Deliver to / Setup location City Selector */}
              <button
                type="button"
                onClick={openCityModal}
                className="w-[calc(100%-32px)] sm:w-[calc(100%-40px)] flex items-center gap-3 mx-4 mb-4 sm:mx-5 sm:mb-[18px] p-3 min-h-[68px] border border-[#e8e5e9] rounded-[14px] bg-white hover:bg-[#fcfbfc] hover:border-[#d4c5cf] text-left transition-all"
              >
                <span className="w-[42px] h-[42px] rounded-[12px] bg-[#fdf2f5] grid place-items-center shrink-0">
                  <MapPin className="w-5 h-5 text-[#9b1b45]" />
                </span>
                <span className="flex-1 min-w-0">
                  <small className="block text-[11px] text-[#78727b] mb-0.5">
                    {isService ? "Setup location" : "Deliver to"}
                  </small>
                  <strong className="block text-[14px] font-semibold text-[#332e36] truncate">
                    {selectedCity === "Select your city" ? "Choose your city" : selectedCity}
                  </strong>
                </span>
                <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[#9b1b45] shrink-0">
                  <span>{selectedCity === "Select your city" ? "Select" : "Change"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </section>

            {/* SECTION 2 (CONDITIONAL): PERSONALIZE YOUR ORDER */}
            {(Boolean(product.personalize?.hasVegNonVeg) ||
              (product.variants?.length ?? 0) > 0 ||
              Boolean(product.personalize?.hasWeightOptions) ||
              (product.optionGroups?.length ?? 0) > 0 ||
              (product.personalizationFields?.length ?? 0) > 0 ||
              Boolean(product.personalize?.hasCakeMessage) ||
              Boolean(product.personalize?.hasTextField) ||
              Boolean(product.personalize?.hasPhotoUpload)) && (
              <section
                id="personalize-section"
                aria-label="Personalize your order"
                className="border border-[#e8e5e9] rounded-[18px] bg-white overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4 border-b border-[#efedef]">
                  <span className="w-10 h-10 rounded-xl bg-[#fdf2f5] grid place-items-center shrink-0">
                    <Sparkles className="w-5 h-5 text-[#cb4c7b]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[14px] font-bold text-[#2f2931]">
                      Personalize your order
                    </h2>
                    <p className="text-[11px] text-[#79717c] mt-0.5">
                      Little details. Made for you.
                    </p>
                  </div>
                  {product.personalize?.requiredCount && (
                    <span
                      data-complete={Boolean(dietPref)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-[7px] border ${
                        dietPref
                          ? "border-[#cde5d8] text-[#247257] bg-[#edf8f2]"
                          : "border-[#eae5e9] text-[#685d69] bg-white"
                      }`}
                    >
                      {dietPref ? "Done" : `${product.personalize.requiredCount} required`}
                    </span>
                  )}
                </div>

                <div className="px-4 divide-y divide-[#f0edf0]">
                  {/* Veg / Non-Veg Option (for Cakes) */}
                  {product.personalize?.hasVegNonVeg && (
                    <div className="py-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[13px] font-semibold text-[#35303a]">
                          Veg / Non-Veg
                        </p>
                        <span className="text-[10px] font-medium text-[#8f4661]">Required</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "Veg" as const, sub: "Included", color: "#4f9d32" },
                          {
                            key: "Non-Veg" as const,
                            sub: `+₹${product.personalize.nonVegPriceDelta ?? 149}`,
                            color: "#c83c58",
                          },
                        ].map((opt) => {
                          const pressed = dietPref === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              aria-pressed={pressed}
                              onClick={() => {
                                setDietPref(opt.key);
                                setValidationError(null);
                              }}
                              className={`flex items-center gap-2.5 min-h-[62px] p-2.5 rounded-[12px] border text-left transition-all ${
                                pressed
                                  ? "border-[#b12b60] bg-[#fff5f8] shadow-[inset_0_0_0_0.5px_#b12b60]"
                                  : "border-[#e3dee6] bg-white hover:border-[#cbb8c6]"
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-xs border flex items-center justify-center shrink-0"
                                style={{ borderColor: opt.color }}
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: opt.color }}
                                />
                              </span>
                              <span className="flex-1 min-w-0">
                                <strong className="block text-[12px] font-semibold text-[#34303a]">
                                  {opt.key}
                                </strong>
                                <small className="block text-[10px] text-[#817583]">
                                  {opt.sub}
                                </small>
                              </span>
                              <span
                                className={`w-4 h-4 rounded-full shrink-0 ${
                                  pressed
                                    ? "border-[4px] border-[#ad2459]"
                                    : "border-[1.5px] border-[#d7cfda]"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* DB Variants OR Weight Options */}
                  {product.variants && product.variants.length > 0 ? (
                    <div className="py-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[13px] font-semibold text-[#35303a]">Select Variant</p>
                        <span className="text-[10px] text-[#8b818b]">Choose option</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.map((v) => {
                          const isSelected = selectedVariantId === v.id;
                          return (
                            <button
                              key={String(v.id)}
                              type="button"
                              onClick={() => setSelectedVariantId(v.id)}
                              className={`px-3.5 py-2 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? "border-[#b12b60] bg-[#fff5f8] text-[#8c1740]"
                                  : "border-[#e3dee6] bg-white text-[#34303a] hover:border-[#cbb8c6]"
                              }`}
                            >
                              <span className="block text-[12px] font-bold">{v.variantName}</span>
                              <span className="block text-[10px] text-[#817583]">₹{v.price.toLocaleString("en-IN")}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : product.personalize?.hasWeightOptions && (
                    <div className="py-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[13px] font-semibold text-[#35303a]">Weight</p>
                        <span className="text-[10px] text-[#8b818b]">Select size</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "0.5 Kg", note: "Included" },
                          { label: "1 Kg", note: "+₹400" },
                          { label: "2 Kg", note: "+₹1,100" },
                        ].map((w) => (
                          <button
                            key={w.label}
                            type="button"
                            onClick={() => setSelectedWeight(w.label)}
                            className={`px-3.5 py-2 rounded-xl border text-left transition-all ${
                              selectedWeight === w.label
                                ? "border-[#b12b60] bg-[#fff5f8] text-[#8c1740]"
                                : "border-[#e3dee6] bg-white text-[#34303a] hover:border-[#cbb8c6]"
                            }`}
                          >
                            <span className="block text-[12px] font-bold">{w.label}</span>
                            <span className="block text-[10px] text-[#817583]">{w.note}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DB Option Groups */}
                  {product.optionGroups && product.optionGroups.length > 0 && product.optionGroups.map((og) => {
                    const key = String(og.id);
                    const selected = selectedOptionChoices[key] || [];
                    return (
                      <div key={key} className="py-4">
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-[13px] font-semibold text-[#35303a]">{og.name}</p>
                          <span className="text-[10px] font-medium text-[#8f4661]">
                            {og.isRequired ? "Required" : "Optional"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {og.options.map((opt) => {
                            const active = selected.includes(opt.label);
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => {
                                  setValidationError(null);
                                  setSelectedOptionChoices((prev) => {
                                    const cur = prev[key] || [];
                                    if (og.selectionType === "checkbox") {
                                      return {
                                        ...prev,
                                        [key]: cur.includes(opt.label)
                                          ? cur.filter((x) => x !== opt.label)
                                          : [...cur, opt.label],
                                      };
                                    }
                                    return { ...prev, [key]: [opt.label] };
                                  });
                                }}
                                className={`px-3 py-2 rounded-xl border text-left transition-all ${
                                  active
                                    ? "border-[#b12b60] bg-[#fff5f8] text-[#8c1740]"
                                    : "border-[#e3dee6] bg-white text-[#34303a] hover:border-[#cbb8c6]"
                                }`}
                              >
                                <span className="block text-[12px] font-semibold">{opt.label}</span>
                                <span className="block text-[10px] text-[#817583]">
                                  {opt.priceDelta > 0 ? `+₹${opt.priceDelta}` : "Included"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* DB Dynamic Personalization Fields OR Default Message */}
                  {product.personalizationFields && product.personalizationFields.filter((f) => f.type !== "photo").length > 0 ? (
                    product.personalizationFields
                      .filter((f) => f.type !== "photo")
                      .map((pf) => {
                        const val = customFields[pf.key] || "";
                        return (
                          <div key={pf.key} className="py-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[13px] font-semibold text-[#35303a]">{pf.label}</p>
                              <span className="text-[10px] text-[#8b818b]">
                                {pf.required ? "Required" : "Optional"}
                              </span>
                            </div>
                            <div className="border border-[#ddd8e0] rounded-[11px] px-3 py-2.5 bg-white focus-within:border-[#af2860] focus-within:ring-2 focus-within:ring-[#ac19530c]">
                              <input
                                type="text"
                                maxLength={35}
                                value={val}
                                onChange={(e) => {
                                  setValidationError(null);
                                  setCustomFields((prev) => ({ ...prev, [pf.key]: e.target.value }));
                                }}
                                placeholder={pf.placeholder || `Enter ${pf.label.toLowerCase()}...`}
                                className="w-full text-[13px] text-[#36303b] placeholder-[#9b929e] bg-transparent outline-none"
                              />
                              <p className="text-[10px] text-[#938998] text-right mt-1">
                                {val.length} / 35
                              </p>
                            </div>
                          </div>
                        );
                      })
                  ) : (product.personalize?.hasCakeMessage || product.personalize?.hasTextField) && (
                    <div className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-semibold text-[#35303a]">
                          {product.personalize?.textLabel || "Message on Cake"}
                        </p>
                        <span className="text-[10px] text-[#8b818b]">Optional</span>
                      </div>
                      <div className="border border-[#ddd8e0] rounded-[11px] px-3 py-2.5 bg-white focus-within:border-[#af2860] focus-within:ring-2 focus-within:ring-[#ac19530c]">
                        <input
                          type="text"
                          maxLength={35}
                          value={customText}
                          onChange={(e) => setCustomText(e.target.value)}
                          placeholder={
                            product.personalize?.textPlaceholder ||
                            "Happy Birthday, Happy Anniversary..."
                          }
                          className="w-full text-[13px] text-[#36303b] placeholder-[#9b929e] bg-transparent outline-none"
                        />
                        <p className="text-[10px] text-[#938998] text-right mt-1">
                          {customText.length} / 35
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Upload Reference Photo */}
                  {product.personalize?.hasPhotoUpload && (
                    <div className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-semibold text-[#35303a]">
                          Upload Reference Photo
                        </p>
                        <span className="text-[10px] text-[#8b818b]">Optional</span>
                      </div>

                      {photoPreview && (
                        <div className="flex items-center gap-3 mb-2.5 p-2 rounded-xl bg-[#faf7f9] border border-[#eae2e8]">
                          <img
                            src={photoPreview}
                            alt="Uploaded reference"
                            className="w-12 h-12 rounded-lg object-cover border border-[#ddd2da]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-[#34212a] truncate">
                              {photoName}
                            </p>
                            <p className="text-[10px] text-[#247257]">Ready for print</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoPreview(null);
                              setPhotoName(undefined);
                            }}
                            className="text-xs text-[#9b1b45] font-semibold px-2"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      <label className="flex items-center gap-3 min-h-[72px] p-3 border border-dashed border-[#d5cedb] rounded-[12px] bg-[#fdfcfd] hover:border-[#af2860] cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="sr-only"
                        />
                        <span className="w-9 h-9 rounded-xl bg-[#fdf2f5] grid place-items-center text-[#9b1b45] shrink-0">
                          <Upload className="w-4 h-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <strong className="block text-[12px] font-semibold text-[#3c3440]">
                            Add a reference photo
                          </strong>
                          <small className="block text-[10px] text-[#827786] mt-0.5">
                            JPG, PNG up to 10MB for best print quality
                          </small>
                        </span>
                        <span className="w-7 h-7 rounded-lg border border-[#e4dfe7] bg-white text-[#a21d54] grid place-items-center font-bold">
                          +
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* SECTION 3: DELIVERY DATE & TIME / COURIER ETA */}
            {product.deliveryMode === "courier" ? (
              <section
                aria-label="Estimated courier delivery"
                className="border border-[#e8e5e9] rounded-[18px] bg-white p-4 flex items-center gap-3"
              >
                <span className="w-10 h-10 rounded-xl bg-[#fdf2f5] text-[#9b1b45] grid place-items-center shrink-0">
                  <Truck className="w-5 h-5" />
                </span>
                <div>
                  <strong className="block text-[13px] font-bold text-[#241d29]">
                    Estimated delivery by {courierEta}
                  </strong>
                  <p className="text-[11px] text-[#625865] mt-0.5">
                    Shipped from our warehouse · delivers all over India
                  </p>
                </div>
              </section>
            ) : (
              <section
                id="schedule-section"
                aria-label={isService ? "Schedule your setup" : "Delivery date and time"}
                className="border border-[#e1d9e0] rounded-[18px] bg-white overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-[#eee8ed]">
                  <span className="w-9 h-9 rounded-xl bg-[#f7f4fb] text-[#8f64b4] grid place-items-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] sm:text-[16px] font-bold text-[#241d29] leading-snug">
                      {isService ? "Schedule your setup" : "Delivery date & time"}
                    </h2>
                    <p className="text-[11px] sm:text-[12px] text-[#625865] mt-0.5">
                      {isService ? "Choose when we should set up" : "Choose when your order arrives"}
                    </p>
                  </div>
                  {(selectedDate || customDate) && selectedTimeSlot && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#246448] bg-[#edf8f2] px-2 py-1 rounded-[7px]">
                      <Check className="w-3 h-3" /> Selected
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="px-3.5 sm:px-4 pb-4">
                  {/* Step 1: Choose Date */}
                  <div className="flex items-center gap-2 min-h-[54px]">
                    <span className="w-[23px] h-[23px] rounded-[8px] bg-[#f8edf2] grid place-items-center text-[12px] font-bold text-[#9b1b45] shrink-0">
                      1
                    </span>
                    <h3 className="flex-1 text-[14px] font-bold text-[#302634]">
                      Choose a date
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowMoreDates((v) => !v)}
                      className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-[#9b1b45] px-2.5 py-1.5 border border-[#e9dce3] rounded-[10px] bg-white hover:bg-[#fcf5f8]"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{showMoreDates ? "Quick dates" : "More dates"}</span>
                    </button>
                  </div>

                  {showMoreDates ? (
                    <div className="p-3 rounded-xl border border-[#dcd3dd] bg-[#fffafd]">
                      <label className="block text-[11px] font-semibold text-[#514554] mb-1.5">
                        Pick any future date:
                      </label>
                      <input
                        type="date"
                        min={formatLocalISO(new Date())}
                        value={customDate}
                        onChange={(e) => {
                          setCustomDate(e.target.value);
                          setSelectedDate("");
                          setSelectedIsoDate("");
                          setSelectedTimeSlot("");
                          setSelectedSlotId(undefined);
                          setSelectedSlotSurcharge(0);
                          setValidationError(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-[#d6ced8] text-[13px] text-[#241d29] focus:outline-none focus:border-[#a7194b]"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {quickDates.map((d) => {
                        const pressed = selectedDate === d.full;
                        return (
                          <button
                            key={d.iso}
                            type="button"
                            aria-pressed={pressed}
                            onClick={() => {
                              setSelectedDate(d.full);
                              setSelectedIsoDate(d.iso);
                              setCustomDate("");
                              setSelectedTimeSlot("");
                              setSelectedSlotId(undefined);
                              setSelectedSlotSurcharge(0);
                              setValidationError(null);
                            }}
                            className={`relative min-h-[78px] py-2.5 px-1.5 rounded-[12px] border flex flex-col items-center justify-center gap-1 transition-all ${
                              pressed
                                ? "border-[#a7194b] bg-[#fff3f7] shadow-[inset_0_0_0_1px_#a7194b]"
                                : "border-[#dcd3dd] bg-white hover:border-[#b394a5] hover:bg-[#fcf8fa]"
                            }`}
                          >
                            {pressed && (
                              <span className="absolute -top-1.5 right-2 w-[18px] h-[18px] rounded-full bg-[#a7194b] text-white grid place-items-center shadow-[0_0_0_3px_#fff]">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                            <span
                              className={`text-[11px] font-medium ${
                                pressed ? "text-[#8c1740]" : "text-[#514554]"
                              }`}
                            >
                              {d.topLabel}
                            </span>
                            <strong
                              className={`flex items-baseline gap-1 text-[21px] font-bold leading-none ${
                                pressed ? "text-[#8c1740]" : "text-[#241d29]"
                              }`}
                            >
                              {d.dayNum}
                              <small
                                className={`text-[11px] font-medium ${
                                  pressed ? "text-[#8c1740]" : "text-[#514554]"
                                }`}
                              >
                                {d.month}
                              </small>
                            </strong>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Step 2: Choose Time */}
                  <div className="mt-4 pt-1 border-t border-[#eee8ed]">
                    <div className="flex items-center gap-2 min-h-[50px]">
                      <span className="w-[23px] h-[23px] rounded-[8px] bg-[#f8edf2] grid place-items-center text-[12px] font-bold text-[#9b1b45] shrink-0">
                        2
                      </span>
                      <h3 className="flex-1 text-[14px] font-bold text-[#302634]">
                        Choose a time
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#625567]">
                        <Clock className="w-3.5 h-3.5" /> 2-hour window
                      </span>
                    </div>

                    {!selectedDate && !customDate ? (
                      <div className="flex items-center gap-2.5 p-3 rounded-[12px] border border-[#e8e3ea] bg-[#faf9fb] text-[12px] text-[#625865]">
                        <Clock className="w-4 h-4 text-[#8c7e90] shrink-0" />
                        <span>Select a day above to see available times.</span>
                      </div>
                    ) : slotsLoading ? (
                      <div className="flex items-center gap-2.5 p-3 rounded-[12px] border border-[#e8e3ea] bg-[#faf9fb] text-[12px] text-[#625865]">
                        <Clock className="w-4 h-4 text-[#8c7e90] shrink-0 animate-pulse" />
                        <span>Checking live delivery slots for {selectedCity === "Select your city" ? "your city" : selectedCity}...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {slotsNotice && (
                          <p className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
                            {slotsNotice}
                          </p>
                        )}
                        {slotGroups.map((grp) => (
                          <div key={grp.group}>
                            <p className="text-[11px] font-semibold text-[#58485f] mb-1.5">
                              {grp.group}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {grp.slots.map((slot) => {
                                const pressed = selectedTimeSlot === slot.label;
                                const surchargeRs = Math.round((slot.extra_charge_paise || 0) / 100);
                                return (
                                  <button
                                    key={slot.label}
                                    type="button"
                                    disabled={!slot.is_available}
                                    aria-pressed={pressed}
                                    onClick={() => {
                                      setSelectedTimeSlot(slot.label);
                                      setSelectedSlotId(slot.slot_template_id);
                                      setSelectedSlotSurcharge(surchargeRs);
                                      setValidationError(null);
                                    }}
                                    className={`flex items-center justify-between gap-2 min-h-[46px] px-2.5 py-2 rounded-[11px] border text-[12px] font-semibold text-left transition-all ${
                                      !slot.is_available
                                        ? "border-[#ece7ed] bg-[#f8f6f8] text-[#a59aa8] cursor-not-allowed line-through"
                                        : pressed
                                        ? "border-[#a7194b] bg-[#fff3f7] text-[#8c1740] shadow-[inset_0_0_0_1px_#a7194b]"
                                        : "border-[#dcd3df] bg-white text-[#302335] hover:border-[#b394a5]"
                                    }`}
                                  >
                                    <span className="truncate">
                                      {slot.label}
                                      {surchargeRs > 0 ? ` (+₹${surchargeRs})` : ""}
                                    </span>
                                    <span
                                      className={`w-4 h-4 rounded-full grid place-items-center shrink-0 ${
                                        pressed
                                          ? "bg-[#a7194b] text-white"
                                          : "border-[1.5px] border-[#c8bece]"
                                      }`}
                                    >
                                      {pressed && <Check className="w-2.5 h-2.5" />}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Guarantee note */}
                  <p className="flex items-center gap-1.5 text-[11px] text-[#59655e] mt-3.5">
                    <Check className="w-3.5 h-3.5 text-[#159861] shrink-0" />
                    <span>
                      {isService
                        ? "Our team arrives and completes the setup within your chosen time window."
                        : "Your order will arrive within your chosen time window."}
                    </span>
                  </p>
                </div>
              </section>
            )}

            {/* SECTION 4: PRODUCT DETAILS ACCORDION STACK */}
            <div className="space-y-3" role="region" aria-label="Product information">
              {/* 4.1 What's included (Open by default) */}
              <div className="border border-[#e8e5e9] rounded-[18px] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion("included")}
                  aria-expanded={openAccordions.included}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#fcfafd] transition-colors"
                >
                  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="m5 9 11-5 11 5v15l-11 5-11-5V9Z" fill="#F2ECFF" stroke="#9471C8" />
                    <path d="m5 9 11 5 11-5M16 14v15M11 6l11 5v6" stroke="#9471C8" />
                    <circle cx="24" cy="24" r="6" fill="#E6F7EE" stroke="#4C9C78" />
                    <path d="m21 24 2 2 4-4" stroke="#368860" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[14px] font-bold text-[#2f2931]">
                      What&apos;s included
                    </h2>
                    <p className="text-[11px] text-[#79717c]">
                      {isService ? "The details of your setup" : "A closer look at your order"}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#79717c] transition-transform ${
                      openAccordions.included ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordions.included && (
                  <div className="px-4 pb-4 border-t border-[#f0edf0]">
                    <ul className="divide-y divide-[#f5f2f5]">
                      {product.whatsIncluded.map((item, i) => (
                        <li key={i} className="flex items-center gap-2.5 py-2.5 text-[12px] sm:text-[13px] text-[#3a323e]">
                          <span className="w-5 h-5 rounded-full bg-[#e6f7ee] text-[#368860] grid place-items-center shrink-0">
                            <Check className="w-3 h-3" />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {product.notIncluded && product.notIncluded.length > 0 && (
                      <div className="mt-2 p-3 rounded-xl bg-[#faf8fa] border border-[#eee9ef]">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#675b6b] mb-1.5">
                          <XCircle className="w-3.5 h-3.5 text-[#9a8996]" /> Not included
                        </p>
                        <ul className="space-y-1 text-[12px] text-[#6d6170] pl-5 list-disc">
                          {product.notIncluded.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4.2 Questions & answers */}
              <div className="border border-[#e8e5e9] rounded-[18px] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion("qna")}
                  aria-expanded={openAccordions.qna}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#fcfafd] transition-colors"
                >
                  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M5 8a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H13l-7 5v-6a4 4 0 0 1-1-3V8Z" fill="#E9F4FF" stroke="#6A9BCD" />
                    <path d="M13 11a3 3 0 1 1 5 2c-1.5 1-2 1.5-2 3" stroke="#4D82B6" />
                    <circle cx="16" cy="19" r=".9" fill="#4D82B6" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[14px] font-bold text-[#2f2931]">
                      Questions &amp; answers
                    </h2>
                    <p className="text-[11px] text-[#79717c]">
                      {product.qna.length} helpful answers before you {isService ? "book" : "order"}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#79717c] transition-transform ${
                      openAccordions.qna ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordions.qna && (
                  <div className="px-4 pb-4 border-t border-[#f0edf0] divide-y divide-[#f5f2f5]">
                    {product.qna.map((qa, idx) => (
                      <div key={idx} className="py-3">
                        <p className="text-[12px] font-bold text-[#292229]">{qa.q}</p>
                        <p className="text-[12px] text-[#625865] mt-1 leading-relaxed">{qa.a}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4.3 Delivery information */}
              <div className="border border-[#e8e5e9] rounded-[18px] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion("delivery")}
                  aria-expanded={openAccordions.delivery}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#fcfafd] transition-colors"
                >
                  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M4 8a3 3 0 0 1 3-3h12v18H4V8Z" fill="#FFF0DB" stroke="#C39755" />
                    <path d="M19 12h5l5 6v5H19V12Z" fill="#FFF8EC" stroke="#C39755" />
                    <path d="M22 15h2l3 4h-5v-4Z" fill="#B8E5F4" stroke="#7FAFC2" />
                    <circle cx="10" cy="24" r="3" fill="#FFF" stroke="#987F76" />
                    <circle cx="24" cy="24" r="3" fill="#FFF" stroke="#987F76" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[14px] font-bold text-[#2f2931]">
                      {isService ? "Delivery & setup" : "Delivery information"}
                    </h2>
                    <p className="text-[11px] text-[#79717c]">
                      {isService ? "How your celebration comes together" : "What to expect at your doorstep"}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#79717c] transition-transform ${
                      openAccordions.delivery ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordions.delivery && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#f0edf0]">
                    <ul className="list-disc pl-5 space-y-1.5 text-[12px] text-[#625865] leading-relaxed">
                      {product.deliveryInfo.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 4.4 Care instructions */}
              <div className="border border-[#e8e5e9] rounded-[18px] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion("care")}
                  aria-expanded={openAccordions.care}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#fcfafd] transition-colors"
                >
                  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M16 25S4 18 4 10a6 6 0 0 1 12-1 6 6 0 0 1 12 1c0 8-12 15-12 15Z" fill="#FFE8EF" stroke="#D27898" />
                    <path d="m12 15 3 3 6-6" stroke="#C45880" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[14px] font-bold text-[#2f2931]">
                      Care instructions
                    </h2>
                    <p className="text-[11px] text-[#79717c]">
                      {isService ? "Keep your decor looking its best" : "Simple tips for a little extra care"}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#79717c] transition-transform ${
                      openAccordions.care ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordions.care && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#f0edf0]">
                    <ul className="list-disc pl-5 space-y-1.5 text-[12px] text-[#625865] leading-relaxed">
                      {product.careInstructions.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 4.5 Seller details / Service provider */}
              <div className="border border-[#e8e5e9] rounded-[18px] bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion("seller")}
                  aria-expanded={openAccordions.seller}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#fcfafd] transition-colors"
                >
                  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <rect x="5" y="13" width="22" height="15" rx="3" fill="#F1EBFB" stroke="#9880BD" />
                    <path d="m5 5-2 8a4 4 0 0 0 7 2 4 4 0 0 0 6 0 4 4 0 0 0 6 0 4 4 0 0 0 7-2l-2-8H5Z" fill="#D9CCEE" stroke="#9880BD" />
                    <path d="M12 28V20h8v8" fill="#FFF" stroke="#9880BD" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[14px] font-bold text-[#2f2931]">
                      {isService ? "Service provider" : "Seller details"}
                    </h2>
                    <p className="text-[11px] text-[#79717c]">
                      {isService ? "The team behind your setup" : "The people behind your order"}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#79717c] transition-transform ${
                      openAccordions.seller ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordions.seller && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#f0edf0] text-[12px] text-[#625865] space-y-1.5">
                    <p className="font-bold text-[#292229]">{product.sellerName}</p>
                    <p className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-[#edf8f2] text-[#247257]">
                      {product.sellerBadge}
                    </p>
                    <p className="leading-relaxed">{product.sellerDesc}</p>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 5: NEED GIFTING HELP WHATSAPP & PRODUCT INQUIRY CARDS */}
            <div className="space-y-2.5">
              <a
                href={`https://wa.me/918100248353?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3.5 rounded-3xl bg-white border border-gray-100 p-4 hover:border-emerald-200 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 leading-tight">
                    Need gifting help?
                  </p>
                  <p className="text-[12px] text-gray-500 mt-1 leading-snug">
                    Chat with our experts for personalized recommendations
                  </p>
                </div>
                <span className="shrink-0 w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-sm">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                  </svg>
                </span>
              </a>
            </div>

            {/* SECTION 6: RATINGS & REVIEWS CARD */}
            <section
              id="reviews-section"
              aria-label="Ratings and reviews"
              className="border border-[#e8e5e9] rounded-[18px] bg-white overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4 border-b border-[#efedef]">
                <svg width="30" height="30" viewBox="0 0 32 32" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M8 5h16a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H13l-6 4v-4a5 5 0 0 1-4-5V10a5 5 0 0 1 5-5Z" fill="#FFF5DB" stroke="#D5A64F" />
                  <path d="m16 9 1.9 3.8 4.2.6-3 3 .7 4.2-3.8-2-3.8 2 .7-4.2-3-3 4.2-.6L16 9Z" fill="#F9C55D" stroke="#CA8D28" />
                </svg>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[14px] font-bold text-[#2f2931]">Ratings &amp; reviews</h2>
                  <p className="text-[11px] text-[#79717c]">Little moments, shared</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWritingReview((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e5dce2] bg-white text-[12px] font-semibold text-[#34212a] hover:border-[#9b1b45] hover:text-[#9b1b45] transition-colors"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  <span>Write</span>
                </button>
              </div>

              <div className="p-4 sm:p-5">
                {/* Inline Write Review Form */}
                {isWritingReview && (
                  <form
                    onSubmit={handleReviewSubmit}
                    className="mb-5 p-4 rounded-2xl border border-[#f0dce5] bg-[#fffafd] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-[#292229]">
                        Share your experience
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setReviewRating(r)}
                            className="p-0.5"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                r <= reviewRating
                                  ? "fill-[#efab18] text-[#efab18]"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#ddd8e0] text-[12px] bg-white outline-none focus:border-[#9b1b45]"
                    />
                    <textarea
                      rows={3}
                      required
                      placeholder="Tell us about the freshness, quality, and delivery..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#ddd8e0] text-[12px] bg-white outline-none focus:border-[#9b1b45]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsWritingReview(false)}
                        className="px-3 py-1.5 rounded-lg text-[12px] text-[#79717c] hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-[#9b1b45] text-white text-[12px] font-semibold"
                      >
                        Submit review
                      </button>
                    </div>
                  </form>
                )}

                <div className="flex items-start gap-6 pb-4">
                  <div>
                    <strong className="text-[28px] font-bold text-[#292229] leading-none">
                      {product.rating}
                    </strong>
                    <span className="text-[13px] text-[#856e7b]"> /5</span>
                    <div className="flex items-center gap-0.5 text-[#efab18] mt-1.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-[#efab18] text-[#efab18]" />
                      ))}
                    </div>
                    <p className="text-[11px] text-[#79717c] mt-1">
                      {product.ratingsCount + userReviews.length} ratings
                    </p>
                  </div>
                  <div className="flex-1 text-[12px] text-[#79717c] pt-2">
                    Verified buyer feedback appears below.
                  </div>
                </div>

                {(() => {
                  const combinedReviews: SubmittedReview[] = [
                    ...(product.reviews || []).map((rv) => ({
                      name: rv.name || "Giftlaya Customer",
                      rating: rv.rating || 5,
                      text: rv.comment || rv.text || "",
                      date: rv.city ? `${rv.city} · Verified` : "Verified customer",
                    })),
                    ...userReviews,
                  ];
                  if (combinedReviews.length === 0) {
                    return (
                      <div className="text-center py-6 px-4 rounded-2xl border border-[#f2edf2] bg-[#fcfbfd]">
                        <div className="w-9 h-9 rounded-xl bg-[#fff5db] text-[#d99623] grid place-items-center mx-auto mb-2">
                          <Star className="w-4 h-4 fill-[#d99623]" />
                        </div>
                        <h3 className="text-[13px] font-bold text-[#292229]">No written reviews yet</h3>
                        <p className="text-[11px] text-[#79717c] mt-1 mb-3">
                          Ordered this? We&apos;d love to hear about it.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsWritingReview(true)}
                          className="px-4 py-1.5 rounded-xl border border-[#e5dce2] bg-white text-[12px] font-semibold text-[#34212a] hover:border-[#9b1b45] hover:text-[#9b1b45] transition-colors"
                        >
                          Write the first review
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3 pt-3 border-t border-[#f0edf0]">
                      {combinedReviews.map((rev, i) => (
                        <div key={i} className="p-3 rounded-xl bg-[#faf8fa] border border-[#eee9ef]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-bold text-[#292229]">{rev.name}</span>
                            <span className="text-[10px] text-[#856e7b]">{rev.date}</span>
                          </div>
                          <p className="text-[12px] text-[#4a3f4e]">{rev.text}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </section>
          </div>
        </div>

        {/* FULL-WIDTH SLIDERS BELOW (Sections: More like this & You May Also Like) */}
        <div id="similar-section" className="mt-10 sm:mt-14 space-y-10">
          <ProductSection
            title={isService ? "Similar experiences" : "More like this"}
            products={product.similarProducts}
            enableSlider={true}
          />

          <ProductSection
            title="You May Also Like"
            products={product.youMayAlsoLike}
            enableSlider={true}
          />
        </div>
      </main>

      {/* FIXED BOTTOM PURCHASE BAR (Matches .ProductDetail_purchaseBar) */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white border-t border-[#e7dfe6] shadow-[0_-5px_24px_rgba(57,32,51,0.06)]">
        <div
          role="region"
          aria-label="Product purchase"
          className={`max-w-[1200px] mx-auto px-3 py-2.5 sm:px-6 sm:py-3.5 ${
            isService
              ? "grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 sm:gap-4"
              : "grid grid-cols-[minmax(0,1fr)_44px_minmax(140px,1.4fr)] sm:flex sm:items-center sm:justify-between gap-2 sm:gap-4"
          }`}
        >
          {/* Price Summary */}
          <div className={isService ? "col-span-2 sm:col-auto flex items-baseline gap-2 sm:block" : ""}>
            <small className="block text-[10px] sm:text-[11px] text-[#79717a] leading-tight">
              Total{product.discount ? ` · ${product.discount.toLowerCase()}` : ""}
            </small>
            <div className="flex items-baseline gap-2">
              <strong className="text-[20px] sm:text-[22px] font-bold text-[#292229] leading-tight">
                ₹{(finalPrice + selectedSlotSurcharge).toLocaleString("en-IN")}
              </strong>
              {finalMrp > finalPrice && (
                <del className="hidden sm:inline text-[12px] text-[#92848d]">
                  ₹{finalMrp.toLocaleString("en-IN")}
                </del>
              )}
              {selectedSlotSurcharge > 0 && (
                <span className="text-[10px] font-semibold text-[#9b1b45]">
                  (+₹{selectedSlotSurcharge} slot)
                </span>
              )}
            </div>
          </div>

          {/* Right Actions (WhatsApp + Add to Cart / Book now) */}
          <div className={isService ? "contents sm:flex sm:items-center sm:gap-2.5" : "contents sm:flex sm:items-center sm:gap-2.5"}>
            <a
              href={`https://wa.me/918100248353?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className={`flex items-center justify-center gap-2 rounded-[12px] border transition-colors ${
                isService
                  ? "min-h-[48px] px-4 bg-[#16805a] border-[#16805a] text-white hover:bg-[#116b4a] font-semibold text-[13px]"
                  : "w-11 sm:w-12 h-[48px] border-[#dce7e0] bg-white text-[#44836b] hover:bg-[#f3faf6]"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
              </svg>
              {isService && <span>WhatsApp</span>}
            </a>

            <button
              type="button"
              onClick={handlePrimaryAction}
              className="flex items-center justify-center gap-2 min-h-[48px] px-4 sm:px-7 rounded-[12px] bg-[#a7194b] hover:bg-[#89113b] text-white text-[13px] sm:text-[14px] font-semibold transition-colors"
            >
              {isService ? (
                <Calendar className="w-4 h-4 shrink-0" />
              ) : (
                <ShoppingBag className="w-4 h-4 shrink-0" />
              )}
              <span>{isService ? "Book now" : "Add to cart"}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Add-ons Finishing Touches Modal (Giftlaya flow after Add to cart / Book now) */}
      <AddonsModal
        open={addonsModalOpen}
        onClose={() => setAddonsModalOpen(false)}
        productName={product.title || product.name || "Product"}
        basePrice={finalPrice}
        addons={addonsCatalog.addons}
        categories={addonsCatalog.categories}
        loading={addonsLoading}
        onContinue={commitAddToCart}
      />
    </div>
  );
}

