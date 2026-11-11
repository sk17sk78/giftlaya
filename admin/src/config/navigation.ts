import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Bell,
  ShoppingBag,
  PenTool,
  Calendar,
  CreditCard,
  RotateCcw,
  FileText,
  Users,
  MessageCircle,
  Mail,
  HelpCircle,
  LifeBuoy,
  Megaphone,
  Package,
  FolderTree,
  Sliders,
  TicketPercent,
  Store,
  UserCheck,
  Briefcase,
  Boxes,
  Wallet,
  ShieldAlert,
  Tags,
  Building2,
  FileCode2,
  BookOpen,
  Sparkles,
  Image as ImageIcon,
  Network,
  Smartphone,
  Shield,
  Settings,
} from "lucide-react";
import type { SidebarCounts } from "@/api/client";

export interface CmsNavChild {
  label: string;
  href: string;
}

export interface CmsNavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  permission: string | null;
  children?: CmsNavChild[];
}

export interface CmsNavSection {
  label: string;
  items: CmsNavItem[];
}

// Mirrors live https://giftlaya.com/cms sidebar sections & routes 1:1
export const CMS_NAV_SECTIONS: CmsNavSection[] = [
  {
    label: "Main",
    items: [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/cms",
        permission: null,
      },
      {
        icon: Bell,
        label: "Push Notifications",
        href: "/cms/settings/push-notifications",
        permission: null,
      },
    ],
  },
  {
    label: "Commerce",
    items: [
      {
        icon: ShoppingBag,
        label: "Orders",
        href: "/cms/orders",
        permission: "order",
        children: [
          { label: "All Orders", href: "/cms/orders/all" },
          { label: "New", href: "/cms/orders/new" },
          { label: "Processing", href: "/cms/orders/processing" },
          { label: "Delivered", href: "/cms/orders/delivered" },
          { label: "Failed", href: "/cms/orders/failed" },
          { label: "Cancelled", href: "/cms/orders/cancelled" },
          { label: "Customer Uploads", href: "/cms/orders/uploads" },
        ],
      },
      {
        icon: PenTool,
        label: "Manual Orders",
        href: "/cms/manual-orders",
        permission: "order",
      },
      {
        icon: Calendar,
        label: "Booking Calendar",
        href: "/cms/calendar",
        permission: "order",
      },
      {
        icon: CreditCard,
        label: "Payment Links",
        href: "/cms/payment-links",
        permission: "order",
      },
      {
        icon: FileText,
        label: "Invoices",
        href: "/cms/invoices",
        permission: "order",
      },
      {
        icon: RotateCcw,
        label: "Payments & Refunds",
        href: "/cms/payments",
        permission: "order",
      },
      {
        icon: Users,
        label: "Customers",
        href: "/cms/customers",
        permission: "user",
      },
      {
        icon: MessageCircle,
        label: "WhatsApp",
        href: "/cms/whatsapp",
        permission: null,
        children: [
          { label: "Inbox", href: "/cms/whatsapp" },
          { label: "Contacts", href: "/cms/whatsapp/contacts" },
          { label: "Images", href: "/cms/whatsapp/images" },
          { label: "Templates", href: "/cms/whatsapp/templates" },
          { label: "Quick Replies", href: "/cms/whatsapp/quick-replies" },
        ],
      },
      {
        icon: Mail,
        label: "Contact Us",
        href: "/cms/user/contact-forms",
        permission: null,
      },
      {
        icon: HelpCircle,
        label: "Product Inquiries",
        href: "/cms/product-inquiries",
        permission: null,
      },
      {
        icon: LifeBuoy,
        label: "Support Tickets",
        href: "/cms/support",
        permission: null,
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      {
        icon: Megaphone,
        label: "Meta Ads",
        href: "/cms/ads",
        permission: "superuser",
        children: [
          { label: "Dashboard", href: "/cms/ads" },
          { label: "Campaigns", href: "/cms/ads/campaigns" },
          { label: "Audiences", href: "/cms/ads/audiences" },
          { label: "Catalog Ads", href: "/cms/ads/catalog" },
          { label: "Reports", href: "/cms/ads/reports" },
          { label: "Rules", href: "/cms/ads/rules" },
        ],
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        icon: Package,
        label: "Services",
        href: "/cms/services",
        permission: "product",
        children: [
          { label: "Products", href: "/cms/services/product" },
          { label: "Addons", href: "/cms/services/addon" },
          { label: "Product Options", href: "/cms/services/option-group" },
          {
            label: "Information Field Group",
            href: "/cms/services/info-field-group",
          },
        ],
      },
      {
        icon: FolderTree,
        label: "Category",
        href: "/cms/category",
        permission: "category",
        children: [
          { label: "Category", href: "/cms/category/category" },
          { label: "Page", href: "/cms/category/page" },
          { label: "Sub Page", href: "/cms/category/sub-page" },
          { label: "Addon Category", href: "/cms/category/addon-category" },
        ],
      },
      {
        icon: Sliders,
        label: "Presets",
        href: "/cms/presets",
        permission: "preset",
        children: [
          { label: "Advance Payment", href: "/cms/presets/advance-payment" },
          { label: "AI Tag", href: "/cms/presets/ai-tags" },
          { label: "Balloon Color", href: "/cms/presets/balloon-color" },
          {
            label: "Cancellation Policy",
            href: "/cms/presets/cancellation-policy",
          },
          { label: "CareInfo", href: "/cms/presets/care-info" },
          { label: "City", href: "/cms/presets/city" },
          { label: "Color", href: "/cms/presets/color" },
          { label: "Coupon", href: "/cms/presets/coupon" },
          { label: "Delivery Info", href: "/cms/presets/delivery-info" },
          { label: "Delivery Type", href: "/cms/presets/delivery-type" },
          { label: "FAQ", href: "/cms/presets/faq" },
          { label: "GST", href: "/cms/presets/gst" },
          { label: "Label", href: "/cms/presets/label" },
          {
            label: "Meta Title Template",
            href: "/cms/presets/meta-title-template",
          },
          {
            label: "Meta Description",
            href: "/cms/presets/meta-description-template",
          },
          { label: "Occasion", href: "/cms/presets/occasion" },
          { label: "Processing Time", href: "/cms/presets/processing-time" },
          { label: "Promotion Tag", href: "/cms/presets/promotion-tags" },
          { label: "Quick Links", href: "/cms/presets/quick-links" },
          { label: "Relation", href: "/cms/presets/relation" },
          { label: "State", href: "/cms/presets/state" },
          { label: "Trending Searches", href: "/cms/presets/trending-searches" },
          { label: "Venue", href: "/cms/presets/venue" },
          { label: "Unit", href: "/cms/presets/unit" },
          { label: "Enhancement", href: "/cms/presets/enhancement" },
          { label: "Flavour", href: "/cms/presets/flavour" },
        ],
      },
      {
        icon: TicketPercent,
        label: "Coupons",
        href: "/cms/coupons",
        permission: "product",
      },
    ],
  },
  {
    label: "Marketplace",
    items: [
      {
        icon: Building2,
        label: "Franchise Requests",
        href: "/cms/franchise",
        permission: null,
      },
      {
        icon: Store,
        label: "Sellers",
        href: "/cms/sellers",
        permission: "seller",
      },
      {
        icon: UserCheck,
        label: "Seller Requests",
        href: "/cms/seller-requests",
        permission: "seller",
      },
      {
        icon: Boxes,
        label: "Seller Products",
        href: "/cms/seller-products",
        permission: "seller",
      },
      {
        icon: ShoppingBag,
        label: "Seller Orders",
        href: "/cms/seller-orders",
        permission: "seller",
      },
      {
        icon: Wallet,
        label: "Seller Payouts",
        href: "/cms/seller-payouts",
        permission: "seller",
      },
      {
        icon: LifeBuoy,
        label: "Seller Tickets",
        href: "/cms/seller-tickets",
        permission: "seller",
      },
      {
        icon: ShieldAlert,
        label: "Seller Audit Log",
        href: "/cms/seller-audit",
        permission: "seller",
      },
      {
        icon: Tags,
        label: "Seller Categories",
        href: "/cms/seller-categories",
        permission: "seller",
      },
      {
        icon: Briefcase,
        label: "Vendors",
        href: "/cms/vendors",
        permission: null,
      },
      {
        icon: UserCheck,
        label: "Vendor Requests",
        href: "/cms/vendor-requests",
        permission: null,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        icon: FileCode2,
        label: "Pages",
        href: "/cms/page",
        permission: "page",
        children: [
          { label: "Homepage", href: "/cms/page/homepage" },
          { label: "Header", href: "/cms/page/header" },
          { label: "Footer", href: "/cms/page/footer" },
          { label: "Category", href: "/cms/page/category" },
          { label: "Mobile Categories", href: "/cms/page/mobile-categories" },
          { label: "Dynamic Page", href: "/cms/page/dynamic-page" },
        ],
      },
      {
        icon: BookOpen,
        label: "Blog",
        href: "/cms/blog",
        permission: "blog",
        children: [
          { label: "Blogs", href: "/cms/blog/blogs" },
          { label: "Categories", href: "/cms/blog/categories" },
        ],
      },
      {
        icon: Sparkles,
        label: "Recent Work",
        href: "/cms/recent-work",
        permission: "page",
        children: [
          { label: "All Works", href: "/cms/recent-work/all-works" },
          { label: "Categories", href: "/cms/recent-work/categories" },
        ],
      },
      {
        icon: ImageIcon,
        label: "Images",
        href: "/cms/images",
        permission: "image",
      },
      {
        icon: Network,
        label: "Sitemap",
        href: "/cms/sitemap",
        permission: null,
      },
      {
        icon: Mail,
        label: "Email Management",
        href: "/cms/email-management",
        permission: null,
      },
    ],
  },
  {
    label: "Mobile App",
    items: [
      {
        icon: Smartphone,
        label: "App Management",
        href: "/cms/app",
        permission: null,
        children: [
          { label: "App Home", href: "/cms/app/home" },
          { label: "App Categories", href: "/cms/app/categories" },
          { label: "Notifications", href: "/cms/app/notifications" },
          { label: "App Settings", href: "/cms/app/settings" },
        ],
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        icon: Shield,
        label: "Admin",
        href: "/cms/admin-settings",
        permission: "superuser",
      },
      {
        icon: Settings,
        label: "Settings",
        href: "/cms/settings",
        permission: "superuser",
        children: [
          { label: "Login Methods", href: "/cms/settings/login-methods" },
          { label: "Phone Number", href: "/cms/settings/phone-number" },
          { label: "Meta Setup", href: "/cms/settings/meta-pixel" },
          {
            label: "Website Announcement",
            href: "/cms/settings/website-announcement",
          },
          {
            label: "Universal Product Image",
            href: "/cms/settings/universal-product-image",
          },
          {
            label: "Universal Banner",
            href: "/cms/settings/universal-banner",
          },
          { label: "Database Backup", href: "/cms/settings/database-backup" },
          { label: "Settings", href: "/cms/settings/settings" },
        ],
      },
    ],
  },
];

export const ROUTE_PERMISSIONS: Array<{ prefix: string; permission: string }> = [
  { prefix: "/cms/orders", permission: "order" },
  { prefix: "/cms/manual-orders", permission: "order" },
  { prefix: "/cms/calendar", permission: "order" },
  { prefix: "/cms/payment-links", permission: "order" },
  { prefix: "/cms/payments", permission: "order" },
  { prefix: "/cms/invoices", permission: "order" },
  { prefix: "/cms/customers", permission: "user" },
  { prefix: "/cms/services", permission: "product" },
  { prefix: "/cms/coupons", permission: "product" },
  { prefix: "/cms/category", permission: "category" },
  { prefix: "/cms/presets", permission: "preset" },
  { prefix: "/cms/page", permission: "page" },
  { prefix: "/cms/blog", permission: "blog" },
  { prefix: "/cms/recent-work", permission: "page" },
  { prefix: "/cms/images", permission: "image" },
  { prefix: "/cms/sellers", permission: "seller" },
  { prefix: "/cms/seller-products", permission: "seller" },
  { prefix: "/cms/seller-orders", permission: "seller" },
  { prefix: "/cms/seller-payouts", permission: "seller" },
  { prefix: "/cms/seller-tickets", permission: "seller" },
  { prefix: "/cms/seller-audit", permission: "seller" },
  { prefix: "/cms/seller-requests", permission: "seller" },
  { prefix: "/cms/seller-categories", permission: "seller" },
  { prefix: "/cms/ads", permission: "superuser" },
  { prefix: "/cms/admin-settings", permission: "superuser" },
  { prefix: "/cms/settings", permission: "superuser" },
];

export const MOBILE_BOTTOM_TABS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/cms", exact: true, permission: null },
  { icon: ShoppingBag, label: "Orders", href: "/cms/orders", exact: false, permission: "order" },
  { icon: Calendar, label: "Calendar", href: "/cms/calendar", exact: false, permission: "order" },
  { icon: Package, label: "Products", href: "/cms/services/product", exact: false, permission: "product" },
  { icon: Users, label: "Customers", href: "/cms/customers", exact: false, permission: "user" },
];

export function requiredPermissionForPath(pathname: string): string | null {
  const match = ROUTE_PERMISSIONS.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );
  return match ? match.permission : null;
}

export function getSidebarBadge(
  href: string,
  counts?: SidebarCounts
): number | null {
  if (!counts) return null;
  const o = counts.orders;
  switch (href) {
    case "/cms/orders":
    case "/cms/orders/all":
      return o?.total || null;
    case "/cms/orders/new":
      return o?.new || null;
    case "/cms/orders/processing":
      return o?.processing || null;
    case "/cms/orders/delivered":
      return o?.delivered || null;
    case "/cms/orders/failed":
      return o?.failed || null;
    case "/cms/orders/cancelled":
      return o?.cancelled || null;
    case "/cms/customers":
      return counts.customers || null;
    case "/cms/user/contact-forms":
      return (counts.contact?.new || counts.contact?.total) || null;
    case "/cms/product-inquiries":
      return (counts.productInquiry?.new || counts.productInquiry?.total) || null;
    case "/cms/whatsapp":
      return counts.whatsapp || null;
    case "/cms/seller-requests":
      return counts.sellers?.requests || null;
    case "/cms/seller-products":
      return counts.sellers?.products || null;
    case "/cms/seller-payouts":
      return counts.sellers?.payouts || null;
    case "/cms/seller-tickets":
      return counts.sellers?.tickets || null;
    case "/cms/support":
      return (counts.support?.open || counts.support?.total) || null;
    default:
      return null;
  }
}

export function hasUrgentBadge(href: string, counts?: SidebarCounts): boolean {
  if (!counts) return false;
  if (href === "/cms/user/contact-forms") return (counts.contact?.new ?? 0) > 0;
  if (href === "/cms/product-inquiries")
    return (counts.productInquiry?.new ?? 0) > 0;
  if (href === "/cms/whatsapp") return (counts.whatsapp ?? 0) > 0;
  if (href === "/cms/support") return (counts.support?.open ?? 0) > 0;
  return false;
}

