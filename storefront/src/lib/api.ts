import {
  CategoryData,
  Product,
  Banner,
  NavItem,
  City,
  ReviewsData,
  FaqItem,
  ExploreSection,
  SeoBlock
} from "@/types";

import categoriesMock from "@/data/categories.json";
import productsMock from "@/data/products.json";
import bannersMock from "@/data/banners.json";
import navMock from "@/data/navigation.json";
import citiesMock from "@/data/cities.json";
import reviewsMock from "@/data/reviews.json";
import faqsMock from "@/data/faqs.json";
import exploreMock from "@/data/exploreLinks.json";
import seoMock from "@/data/seoContent.json";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.giftlaya.com";

async function fetchFromApi<T>(endpoint: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      next: { revalidate: 60 },
      headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) {
      return fallback;
    }
    const data = await res.json();
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getCategories(): Promise<CategoryData> {
  return fetchFromApi<CategoryData>("/categories", categoriesMock as CategoryData);
}

export async function getProducts(): Promise<{
  trending: Product[];
  topSellingCakes: Product[];
  personalizedGifts: Product[];
  plants: Product[];
}> {
  return fetchFromApi<{
    trending: Product[];
    topSellingCakes: Product[];
    personalizedGifts: Product[];
    plants: Product[];
  }>("/products/home", productsMock as {
    trending: Product[];
    topSellingCakes: Product[];
    personalizedGifts: Product[];
    plants: Product[];
  });
}

export async function getBanners(): Promise<{
  heroBanners: Banner[];
  corporateBanner: Banner;
}> {
  return fetchFromApi<{
    heroBanners: Banner[];
    corporateBanner: Banner;
  }>("/banners", bannersMock as {
    heroBanners: Banner[];
    corporateBanner: Banner;
  });
}

export async function getNavigation(): Promise<NavItem[]> {
  return fetchFromApi<NavItem[]>("/navigation", navMock as NavItem[]);
}

export async function getCities(): Promise<{
  popularCities: City[];
  allCities: string[];
}> {
  return fetchFromApi<{
    popularCities: City[];
    allCities: string[];
  }>("/cities", citiesMock as {
    popularCities: City[];
    allCities: string[];
  });
}

export async function getReviews(): Promise<ReviewsData> {
  return fetchFromApi<ReviewsData>("/reviews", reviewsMock as ReviewsData);
}

export async function getFaqs(): Promise<FaqItem[]> {
  return fetchFromApi<FaqItem[]>("/faqs", faqsMock as FaqItem[]);
}

export async function getExploreLinks(): Promise<ExploreSection[]> {
  return fetchFromApi<ExploreSection[]>("/explore-links", exploreMock as ExploreSection[]);
}

export async function getSeoContent(): Promise<SeoBlock[]> {
  return fetchFromApi<SeoBlock[]>("/seo-content", seoMock as SeoBlock[]);
}

export async function syncCart(cartData: unknown) {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cartData)
    });
    return await res.json();
  } catch {
    return null;
  }
}

export async function sendOtp(phone: string) {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080/api/v1/public";
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "whatsapp", target: phone }),
    });
    return await res.json();
  } catch {
    return { success: true, message: "Code sent via WhatsApp" };
  }
}
