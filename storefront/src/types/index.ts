export interface Product {
  id: string;
  sku?: string;
  title: string;
  name?: string;
  slug: string;
  href?: string;
  image: string;
  images?: string[];
  price: number | string;
  originalPrice?: number | string;
  mrp?: number | string;
  discount?: string;
  deliveryTag?: string;
  category?: string;
  categoryHref?: string;
  rating?: number;
  reviewsCount?: number;
  description?: string;
}

export interface ProductQnA {
  q: string;
  a: string;
}

export interface ProductPersonalizeOption {
  hasVegNonVeg?: boolean;
  vegPriceDelta?: number;
  nonVegPriceDelta?: number;
  hasCakeMessage?: boolean;
  hasWeightOptions?: boolean;
  hasTextField?: boolean;
  textLabel?: string;
  textPlaceholder?: string;
  hasPhotoUpload?: boolean;
  requiredCount?: number;
}

export interface ProductVariantOption {
  id: number | string;
  variantName: string;
  price: number;
  originalPrice?: number;
  skuSuffix?: string;
  stockQty?: number;
}

export interface ProductAddonOption {
  id: number | string;
  addonCategoryId?: number | null;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image?: string;
  isPopular?: boolean;
}

export interface CartAddonItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface PublicAddonCatalog {
  addons: ProductAddonOption[];
  categories: { id: number; name: string; slug: string }[];
  popularIds: (number | string)[];
}

export interface PublicCouponItem {
  id?: number;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  min_cart_paise: number;
  max_discount_paise?: number | null;
}

export interface ProductOptionGroupChoice {
  label: string;
  priceDelta: number;
}

export interface ProductOptionGroup {
  id: number | string;
  name: string;
  selectionType: "radio" | "checkbox" | "select";
  isRequired: boolean;
  options: ProductOptionGroupChoice[];
}

export interface ProductPersonalizeField {
  key: string;
  label: string;
  type: "text" | "textarea" | "photo";
  required?: boolean;
  placeholder?: string;
}

export interface ProductCityOverride {
  cityId: number;
  price: number;
  originalPrice?: number;
  isAvailable: boolean;
}

export interface ProductDetail extends Product {
  type: "product" | "service";
  images: string[];
  categoryName: string;
  categoryHref: string;
  rating: number;
  ratingsCount: number;
  savingsText?: string;
  coins: number;
  deliveryMode: "slot" | "courier" | "setup";
  whatsIncluded: string[];
  notIncluded?: string[];
  qna: ProductQnA[];
  deliveryInfo: string[];
  careInstructions: string[];
  sellerName: string;
  sellerBadge: string;
  sellerDesc: string;
  personalize?: ProductPersonalizeOption;
  variants?: ProductVariantOption[];
  optionGroups?: ProductOptionGroup[];
  personalizationFields?: ProductPersonalizeField[];
  addons?: ProductAddonOption[];
  reviews?: Review[];
  cityOverrides?: ProductCityOverride[];
  similarProducts: Product[];
  youMayAlsoLike: Product[];
}

export interface TileItem {
  id?: string | number;
  title: string;
  name?: string;
  label?: string;
  href: string;
  image: string;
  imageUrl?: string;
  tag?: string;
  badge?: string;
}

export type CategoryItem = TileItem;

export interface CategoryData {
  shopByCategory: CategoryItem[];
  freshFlowers: CategoryItem[];
  cakes30Mins: CategoryItem[];
  bestDecorations: CategoryItem[];
  bestSellerCakes: CategoryItem[];
  personalizedOccasions: CategoryItem[];
}

export interface CategoryPageConfig {
  show_breadcrumbs?: boolean;
  default_sort?: string;
  show_faq_block?: boolean;
  show_city_pills?: boolean;
  show_related_collections?: boolean;
  show_filters?: boolean;
  trust_strip?: string;
}

export interface CategoryPageData {
  slug: string;
  title: string;
  eyebrow: string;
  heading: string;
  intro: string;
  rating: number;
  ratingsCount: number;
  cityName?: string;
  serviceType?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoContentHtml?: string;
  robots?: { index: boolean; follow: boolean };
  breadcrumbs: { label: string; href?: string }[];
  products: Product[];
  relatedCollections: TileItem[];
  reviews: Review[];
  guideTitle: string;
  guideParagraphs: string[];
  faqs: FaqItem[];
  pageConfig?: CategoryPageConfig;
}

export interface HomepageSectionData {
  id: number;
  section_key: string;
  section_type: string;
  title: string;
  subtitle: string;
  slider_enabled: boolean;
  sort_order: number;
  is_active: boolean;
  rule_config_json?: Record<string, any>;
  products?: Product[];
}

export interface PublicSiteSettings {
  header_config?: {
    logo_text?: string;
    show_city_selector?: boolean;
    search_placeholder?: string;
    hotline?: string;
    top_strip_enabled?: boolean;
  };
  announcement_config?: {
    enabled?: boolean;
    bg_color?: string;
    text_color?: string;
    text?: string;
    cta_label?: string;
    cta_url?: string;
  };
  footer_config?: {
    copyright?: string;
    support_email?: string;
    address?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    x_url?: string;
    linkedin?: string;
    show_payment_badges?: boolean;
    columns?: { title: string; links: { label: string; href: string }[] }[];
  };
  category_page_config?: CategoryPageConfig;
  mobile_categories_config?: {
    items?: { title: string; slug: string; badge?: string; image?: string }[];
  };
  home_tiles_config?: Record<string, TileItem[]>;
  home_seo_guide?: {
    title?: string;
    html?: string;
  };
}

export interface HeroBanner {
  id: number | string;
  href: string;
  link?: string;
  label?: string;
  title?: string;
  desktopImage?: string;
  mobileImage?: string;
  image?: string;
  src?: string;
  alt?: string;
}

export type Banner = HeroBanner;

export interface NavLink {
  label: string;
  href: string;
  badge?: string | null;
}

export interface NavColumn {
  title: string;
  links: NavLink[];
}

export interface NavItem {
  title: string;
  href: string;
  badge?: string | null;
  columns?: NavColumn[];
}

export type MegaMenuItem = NavItem;

export interface City {
  name: string;
  slug: string;
  state?: string;
  popular?: boolean;
}

export type CityItem = City;

export interface Review {
  id: number | string;
  comment?: string;
  text?: string;
  name: string;
  city: string;
  initials?: string;
  rating: number;
  date?: string;
}

export type ReviewItem = Review;

export interface ReviewsData {
  rating: number;
  totalReviews: number;
  reviews: Review[];
}

export interface FaqItem {
  id: number | string;
  question: string;
  answer: string;
}

export interface LinkDirectoryGroup {
  title: string;
  count?: number;
  links: {
    label: string;
    href: string;
  }[];
}

export type ExploreSection = LinkDirectoryGroup;

export interface SeoBlock {
  level: string;
  title: string;
  content: (string | string[])[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedCity?: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  slotTemplateId?: number;
  slotSurcharge?: number;
  variantId?: number;
  selectedWeight?: string;
  dietPreference?: "Veg" | "Non-Veg";
  message?: string;
  referencePhotoName?: string;
  selectedAddons?: CartAddonItem[];
  customInputs?: Record<string, string>;
  unitPriceOverride?: number;
}

export interface BlogTopic {
  slug: string;
  title: string;
  image: string;
  count?: number;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categorySlug: string;
  image: string;
  author: string;
  readTime: string;
  publishedAt: string;
  updatedAt?: string;
  featured?: boolean;
  contentHtml?: string;
  faqs?: { q: string; a: string }[];
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
}

export interface OrderRecord {
  id: string;
  createdAt: string;
  status: "Confirmed" | "Preparing" | "Out for Delivery" | "Delivered";
  city: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  total: number;
  paymentMethod: string;
  items: CartItem[];
}
