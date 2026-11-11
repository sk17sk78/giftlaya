import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Save,
} from "lucide-react";
import {
  adminApi,
  type HeroBanner,
  type HomepageSection,
} from "@/api/client";
import { FormModal } from "@/components/ui/FormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PermissionGuard } from "@/components/ui/PermissionGuard";
import { useToast } from "@/components/ui/Toast";

export function HomepageBuilderPage() {
  const location = useLocation();
  const qc = useQueryClient();
  const { showToast } = useToast();

  const routeView = location.pathname.includes("/header")
    ? "header"
    : location.pathname.includes("/footer")
    ? "footer"
    : "homepage";

  const [tab, setTab] = useState<"sections" | "banners" | "corporate">("sections");
  const [corpCfg, setCorpCfg] = useState({
    desktop_image: "https://cdn.giftlaya.com/images/93/340236a1-9cdf-40b2-9d0e-c2a1d8072cd0.webp",
    mobile_image: "",
    href: "/corporate-gift",
    alt: "Explore corporate gift",
  });
  const [exploreJson, setExploreJson] = useState("[]");
  const [seoGuideTitle, setSeoGuideTitle] = useState("More about gifting with Giftlaya");
  const [seoGuideHtml, setSeoGuideHtml] = useState("");
  const [homeTilesJson, setHomeTilesJson] = useState("{}");
  const [headerCfg, setHeaderCfg] = useState({
    logo_text: "Giftlaya",
    hotline: "+91-9876543210",
    search_placeholder: "Search cakes, flowers, balloon decor...",
    show_city_selector: true,
    top_strip_enabled: true,
  });
  const [footerCfg, setFooterCfg] = useState({
    copyright: "© 2026 Giftlaya. Made for your happy moments.",
    support_email: "support@giftlaya.com",
    address: "Salt Lake Sector V, Kolkata, WB",
    instagram: "https://www.instagram.com/giftlayaofficial/",
    facebook: "https://www.facebook.com/Giftlayaco/",
    youtube: "https://www.youtube.com/channel/UCMnCWe4Mn5AcC5T8Q0Jil4g",
    x_url: "https://x.com/giftlaya",
    linkedin: "https://in.linkedin.com/company/giftlaya-com",
    show_payment_badges: true,
    columns: [
      { title: "Company", links: [{ label: "About Us", href: "/about-us" }] },
    ] as Array<{ title: string; links: Array<{ label: string; href: string }> }>,
  });
  const [navLabel, setNavLabel] = useState("");
  const [navHref, setNavHref] = useState("/");
  const [navBadge, setNavBadge] = useState("");
  const [bannerModal, setBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [deleteBannerId, setDeleteBannerId] = useState<number | null>(null);
  const [deleteSecId, setDeleteSecId] = useState<number | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: "",
    href: "/",
    desktop_image_url: "",
    mobile_image_url: "",
    starts_at: "",
    ends_at: "",
    sort_order: 0,
    is_active: true,
  });

  const [secModal, setSecModal] = useState(false);
  const [editingSec, setEditingSec] = useState<HomepageSection | null>(null);
  const [secForm, setSecForm] = useState({
    section_key: "",
    section_type: "product_row",
    title: "",
    subtitle: "",
    slider_enabled: true,
    mode: "rule",
    category_slug: "",
    product_ids_csv: "",
    limit: 12,
    sort_order: 0,
    is_active: true,
  });

  const { data: banners = [], isLoading: bannersLoading } = useQuery({
    queryKey: ["hero-banners"],
    queryFn: () => adminApi.listHeroBanners(),
  });

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: () => adminApi.listHomepageSections(),
    enabled: routeView === "homepage",
  });

  const { data: navItems = [] } = useQuery({
    queryKey: ["navigation-tree"],
    queryFn: () => adminApi.listNavigation(false),
    enabled: routeView === "header",
  });

  const { data: contentSettings = [] } = useQuery({
    queryKey: ["site-settings-content"],
    queryFn: () => adminApi.listSiteSettings("content"),
    enabled: routeView === "header" || routeView === "footer" || (routeView === "homepage" && tab === "corporate"),
  });

  const { data: publishedProducts } = useQuery({
    queryKey: ["homepage-picker-products"],
    queryFn: () => adminApi.listProducts({ status: "published", limit: 100 }),
    enabled: routeView === "homepage" && secModal,
  });

  useEffect(() => {
    for (const st of contentSettings) {
      const v = (st.value_json || {}) as Record<string, unknown>;
      if (st.key === "header_config") {
        setHeaderCfg({
          logo_text: String(v.logo_text || "Giftlaya"),
          hotline: String(v.hotline || "+91-9876543210"),
          search_placeholder: String(v.search_placeholder || "Search cakes, flowers..."),
          show_city_selector: v.show_city_selector !== false,
          top_strip_enabled: v.top_strip_enabled !== false,
        });
      }
      if (st.key === "footer_config") {
        setFooterCfg({
          copyright: String(v.copyright || ""),
          support_email: String(v.support_email || ""),
          address: String(v.address || ""),
          instagram: String(v.instagram || ""),
          facebook: String(v.facebook || ""),
          youtube: String(v.youtube || ""),
          x_url: String(v.x_url || ""),
          linkedin: String(v.linkedin || ""),
          show_payment_badges: v.show_payment_badges !== false,
          columns: Array.isArray(v.columns)
            ? (v.columns as Array<{ title: string; links: Array<{ label: string; href: string }> }>)
            : [],
        });
      }
      if (st.key === "corporate_banner_config") {
        setCorpCfg({
          desktop_image: String(v.desktopImage || v.desktop_image || v.image || ""),
          mobile_image: String(v.mobileImage || v.mobile_image || ""),
          href: String(v.href || "/corporate-gift"),
          alt: String(v.alt || "Explore corporate gift"),
        });
      }
      if (st.key === "explore_links_config") {
        setExploreJson(JSON.stringify(st.value_json ?? [], null, 2));
      }
      if (st.key === "home_seo_guide") {
        setSeoGuideTitle(String(v.title || "More about gifting with Giftlaya"));
        setSeoGuideHtml(String(v.html || ""));
      }
      if (st.key === "home_tiles_config") {
        setHomeTilesJson(JSON.stringify(st.value_json ?? {}, null, 2));
      }
    }
  }, [contentSettings]);

  const saveBannerMut = useMutation({
    mutationFn: () =>
      adminApi.saveHeroBanner({
        id: editingBanner?.id,
        title: bannerForm.title,
        href: bannerForm.href,
        desktop_image_url: bannerForm.desktop_image_url,
        mobile_image_url: bannerForm.mobile_image_url,
        starts_at: bannerForm.starts_at
          ? new Date(bannerForm.starts_at).toISOString()
          : undefined,
        ends_at: bannerForm.ends_at
          ? new Date(bannerForm.ends_at).toISOString()
          : undefined,
        sort_order: Number(bannerForm.sort_order) || 0,
        is_active: bannerForm.is_active,
      }),
    onSuccess: () => {
      showToast(editingBanner ? "Banner updated" : "Banner created", "success");
      setBannerModal(false);
      qc.invalidateQueries({ queryKey: ["hero-banners"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const deleteBannerMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteHeroBanner(id),
    onSuccess: () => {
      showToast("Banner removed", "success");
      setDeleteBannerId(null);
      qc.invalidateQueries({ queryKey: ["hero-banners"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const saveSecMut = useMutation({
    mutationFn: (payload: Partial<HomepageSection>) =>
      adminApi.saveHomepageSection(payload),
    onSuccess: () => {
      showToast("Homepage section saved", "success");
      setSecModal(false);
      qc.invalidateQueries({ queryKey: ["homepage-sections"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const deleteSecMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteHomepageSection(id),
    onSuccess: () => {
      showToast("Homepage section removed", "success");
      setDeleteSecId(null);
      qc.invalidateQueries({ queryKey: ["homepage-sections"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const toggleSlider = (sec: HomepageSection) => {
    saveSecMut.mutate({
      ...sec,
      slider_enabled: !sec.slider_enabled,
    });
  };

  const toggleActive = (sec: HomepageSection) => {
    saveSecMut.mutate({
      ...sec,
      is_active: !sec.is_active,
    });
  };

  const moveSection = async (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= sections.length) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(nextIdx, 0, moved);
    try {
      await Promise.all(
        reordered.map((sec, i) =>
          sec.sort_order !== i + 1
            ? adminApi.saveHomepageSection({ ...sec, sort_order: i + 1 })
            : Promise.resolve(sec)
        )
      );
      showToast("Section order updated", "success");
      qc.invalidateQueries({ queryKey: ["homepage-sections"] });
    } catch (e) {
      showToast((e as Error).message, "error");
    }
  };

  const openEditSection = (sec: HomepageSection) => {
    setEditingSec(sec);
    const cfg = (sec.rule_config_json || {}) as Record<string, unknown>;
    const ids = Array.isArray(cfg.product_ids) ? cfg.product_ids.join(", ") : "";
    setSecForm({
      section_key: sec.section_key || "",
      section_type: sec.section_type || "product_row",
      title: sec.title || "",
      subtitle: sec.subtitle || "",
      slider_enabled: sec.slider_enabled ?? true,
      mode: String(cfg.mode || "rule"),
      category_slug: String(cfg.category_slug || ""),
      product_ids_csv: ids,
      limit: Number(cfg.limit || 12),
      sort_order: sec.sort_order ?? 0,
      is_active: sec.is_active ?? true,
    });
    setSecModal(true);
  };

  const handleSaveSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productIds = secForm.product_ids_csv
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => n > 0);

    saveSecMut.mutate({
      id: editingSec?.id,
      section_key: secForm.section_key,
      section_type: secForm.section_type,
      title: secForm.title,
      subtitle: secForm.subtitle,
      slider_enabled: secForm.slider_enabled,
      rule_config_json: {
        mode: secForm.mode,
        category_slug: secForm.category_slug,
        product_ids: productIds,
        limit: Number(secForm.limit) || 12,
      } as unknown as HomepageSection["rule_config_json"],
      sort_order: Number(secForm.sort_order) || 0,
      is_active: secForm.is_active,
    });
  };

  const pageTitle =
    routeView === "header"
      ? "Header & Top Navigation Builder"
      : routeView === "footer"
      ? "Footer Links & Contact Builder"
      : "Homepage Builder & Hero Banners";

  return (
    <PermissionGuard module="page">
      <div className="space-y-4 animate-bd-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutTemplate size={20} className="text-[#4f6ef7]" />
              {pageTitle}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {routeView === "header"
                ? "Configure storefront top header bar, logo text, hotline & top-level mega-menu navigation items."
                : routeView === "footer"
                ? "Manage footer columns, links, social URLs, payment badges & copyright notice."
                : "Reorder rows, configure manual picks vs category rules, and toggle slider mode (last card half-visible) vs responsive grid wrap."}
            </p>
          </div>

          {routeView === "homepage" && (
            <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 text-xs self-start">
              <button
                type="button"
                onClick={() => setTab("sections")}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  tab === "sections" ? "bg-white dark:bg-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                Homepage Sections ({sections.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("banners")}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  tab === "banners" ? "bg-white dark:bg-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                Hero Banners ({banners.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("corporate")}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  tab === "corporate" ? "bg-white dark:bg-slate-900 shadow-sm" : "text-slate-600"
                }`}
              >
                Corporate &amp; Explore
              </button>
            </div>
          )}
        </div>

        {routeView === "header" ? (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                adminApi
                  .upsertSiteSetting("header_config", "content", headerCfg)
                  .then(() => showToast("Header settings saved", "success"))
                  .catch((err: Error) => showToast(err.message, "error"));
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-3xl"
            >
              <p className="font-bold text-sm">Header Branding & Controls</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Brand Logo Text</label>
                  <input value={headerCfg.logo_text} onChange={(e) => setHeaderCfg((s) => ({ ...s, logo_text: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Header Hotline</label>
                  <input value={headerCfg.hotline} onChange={(e) => setHeaderCfg((s) => ({ ...s, hotline: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">Search Input Placeholder</label>
                  <input value={headerCfg.search_placeholder} onChange={(e) => setHeaderCfg((s) => ({ ...s, search_placeholder: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
                </div>
              </div>
              <div className="flex flex-wrap gap-5">
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                  <input type="checkbox" checked={headerCfg.show_city_selector} onChange={(e) => setHeaderCfg((s) => ({ ...s, show_city_selector: e.target.checked }))} />
                  Show City Selector in Header
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                  <input type="checkbox" checked={headerCfg.top_strip_enabled} onChange={(e) => setHeaderCfg((s) => ({ ...s, top_strip_enabled: e.target.checked }))} />
                  Show Top Announcement Strip
                </label>
              </div>
              <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                <Save size={13} /> Save Header Configuration
              </button>
            </form>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 max-w-3xl">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-sm">Top Navigation Bar Links ({navItems.length})</p>
                <Link to="/cms/category/category" className="text-[11px] font-semibold text-[#4f6ef7] hover:underline">
                  Manage Full Mega-Menu Tree →
                </Link>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  adminApi
                    .createNavigationItem({
                      column_title: "Main Menu",
                      label: navLabel,
                      href: navHref,
                      badge: navBadge || undefined,
                      sort_order: navItems.length + 1,
                      is_active: true,
                    })
                    .then(() => {
                      showToast("Header link added", "success");
                      setNavLabel("");
                      setNavHref("/");
                      setNavBadge("");
                      qc.invalidateQueries({ queryKey: ["navigation-tree"] });
                    })
                    .catch((err: Error) => showToast(err.message, "error"));
                }}
                className="flex flex-wrap gap-2"
              >
                <input required value={navLabel} onChange={(e) => setNavLabel(e.target.value)} placeholder="Menu label" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 min-w-[140px]" />
                <input required value={navHref} onChange={(e) => setNavHref(e.target.value)} placeholder="/collections/..." className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 min-w-[160px]" />
                <input value={navBadge} onChange={(e) => setNavBadge(e.target.value)} placeholder="Badge (HOT)" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-28" />
                <button type="submit" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                  <Plus size={13} /> Add Link
                </button>
              </form>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {navItems.map((nav) => (
                  <div key={nav.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold">{nav.label}</span>{" "}
                      <span className="text-slate-400 font-mono text-[11px]">{nav.href}</span>
                      {nav.badge && <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-50 text-[#9b1b45] text-[10px] font-bold">{nav.badge}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        adminApi.deleteNavigationItem(nav.id!).then(() => {
                          showToast("Link removed", "success");
                          qc.invalidateQueries({ queryKey: ["navigation-tree"] });
                        })
                      }
                      className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : routeView === "footer" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adminApi
                .upsertSiteSetting("footer_config", "content", footerCfg)
                .then(() => showToast("Footer settings saved", "success"))
                .catch((err: Error) => showToast(err.message, "error"));
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-3xl text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Copyright Line</label>
                <input value={footerCfg.copyright} onChange={(e) => setFooterCfg((s) => ({ ...s, copyright: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Support Email</label>
                <input value={footerCfg.support_email} onChange={(e) => setFooterCfg((s) => ({ ...s, support_email: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Office Address</label>
                <input value={footerCfg.address} onChange={(e) => setFooterCfg((s) => ({ ...s, address: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Instagram URL</label>
                <input value={footerCfg.instagram} onChange={(e) => setFooterCfg((s) => ({ ...s, instagram: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Facebook URL</label>
                <input value={footerCfg.facebook} onChange={(e) => setFooterCfg((s) => ({ ...s, facebook: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">YouTube URL</label>
                <input value={footerCfg.youtube} onChange={(e) => setFooterCfg((s) => ({ ...s, youtube: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
              <div>
                <label className="block font-semibold mb-1">X / LinkedIn URL</label>
                <input value={footerCfg.linkedin} onChange={(e) => setFooterCfg((s) => ({ ...s, linkedin: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700" />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
              <input type="checkbox" checked={footerCfg.show_payment_badges} onChange={(e) => setFooterCfg((s) => ({ ...s, show_payment_badges: e.target.checked }))} />
              Display Visa / Mastercard / UPI / Razorpay Payment Badges
            </label>
            <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between">
                <p className="font-bold">Footer Columns ({footerCfg.columns.length})</p>
                <button
                  type="button"
                  onClick={() => setFooterCfg((s) => ({ ...s, columns: [...s.columns, { title: "New Column", links: [{ label: "Link", href: "/" }] }] }))}
                  className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                >
                  + Add Column
                </button>
              </div>
              {footerCfg.columns.map((col, ci) => (
                <div key={ci} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={col.title}
                      onChange={(e) =>
                        setFooterCfg((s) => ({
                          ...s,
                          columns: s.columns.map((c, j) => (j === ci ? { ...c, title: e.target.value } : c)),
                        }))
                      }
                      placeholder="Column heading"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFooterCfg((s) => ({
                            ...s,
                            columns: s.columns.map((c, j) => (j === ci ? { ...c, links: [...c.links, { label: "New Link", href: "/" }] } : c)),
                          }))
                        }
                        className="text-[#4f6ef7] font-semibold cursor-pointer"
                      >
                        + Link
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFooterCfg((s) => ({
                            ...s,
                            columns: s.columns.filter((_, j) => j !== ci),
                          }))
                        }
                        className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                        aria-label="Remove footer column"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {col.links.map((lk, li) => (
                    <div key={li} className="flex gap-2 items-center">
                      <input
                        value={lk.label}
                        placeholder="Label"
                        onChange={(e) =>
                          setFooterCfg((s) => ({
                            ...s,
                            columns: s.columns.map((c, j) =>
                              j === ci
                                ? { ...c, links: c.links.map((l, k) => (k === li ? { ...l, label: e.target.value } : l)) }
                                : c
                            ),
                          }))
                        }
                        className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200"
                      />
                      <input
                        value={lk.href}
                        placeholder="/slug"
                        onChange={(e) =>
                          setFooterCfg((s) => ({
                            ...s,
                            columns: s.columns.map((c, j) =>
                              j === ci
                                ? { ...c, links: c.links.map((l, k) => (k === li ? { ...l, href: e.target.value } : l)) }
                                : c
                            ),
                          }))
                        }
                        className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFooterCfg((s) => ({
                            ...s,
                            columns: s.columns.map((c, j) =>
                              j === ci ? { ...c, links: c.links.filter((_, k) => k !== li) } : c
                            ),
                          }))
                        }
                        className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                        aria-label="Remove footer link"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
              <Save size={13} /> Save Footer Configuration
            </button>
          </form>
        ) : tab === "sections" ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <PermissionGuard module="page" requireWrite fallback={null}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSec(null);
                    setSecForm({
                      section_key: "",
                      section_type: "product_row",
                      title: "",
                      subtitle: "",
                      slider_enabled: true,
                      mode: "rule",
                      category_slug: "",
                      product_ids_csv: "",
                      limit: 12,
                      sort_order: sections.length + 1,
                      is_active: true,
                    });
                    setSecModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus size={14} /> Add Section
                </button>
              </PermissionGuard>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Section Title / Key</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Layout Mode (Slider)</th>
                    <th className="px-4 py-3">Visibility</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sectionsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Loading homepage sections...
                      </td>
                    </tr>
                  ) : sections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        No homepage sections configured yet.
                      </td>
                    </tr>
                  ) : (
                    sections.map((sec, idx) => (
                      <tr key={sec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <div className="inline-flex items-center gap-1">
                            <span className="font-mono w-5">{sec.sort_order}</span>
                            <button
                              type="button"
                              onClick={() => moveSection(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              aria-label="Move section up"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(idx, 1)}
                              disabled={idx === sections.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              aria-label="Move section down"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {sec.title}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">
                            {sec.section_key}
                          </p>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {(sec.section_type || "").replaceAll("_", " ")}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleSlider(sec)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                              sec.slider_enabled
                                ? "bg-indigo-50 text-indigo-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <SlidersHorizontal size={11} />
                            {sec.slider_enabled
                              ? "Slider ON (Peek last card)"
                              : "Grid Wrap OFF"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleActive(sec)}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer ${
                              sec.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {sec.is_active ? "Enabled" : "Disabled"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditSection(sec)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                              aria-label={`Edit ${sec.title}`}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => sec.id && setDeleteSecId(sec.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                              aria-label={`Delete ${sec.title}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === "banners" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <PermissionGuard module="page" requireWrite fallback={null}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBanner(null);
                    setBannerForm({
                      title: "",
                      href: "/",
                      desktop_image_url: "",
                      mobile_image_url: "",
                      starts_at: "",
                      ends_at: "",
                      sort_order: banners.length + 1,
                      is_active: true,
                    });
                    setBannerModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus size={14} /> Add Hero Banner
                </button>
              </PermissionGuard>
            </div>

            {bannersLoading ? (
              <p className="text-xs text-slate-400 py-8 text-center">Loading banners...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
                  >
                    <div className="aspect-[16/6] bg-slate-100 dark:bg-slate-800 relative">
                      {b.desktop_image_url ? (
                        <img
                          src={b.desktop_image_url}
                          alt={b.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <ImageIcon size={24} />
                        </div>
                      )}
                      <span
                        className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.is_active
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-700 text-white"
                        }`}
                      >
                        {b.is_active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <div className="p-4 flex items-center justify-between text-xs">
                      <div className="min-w-0">
                        <p className="font-bold truncate">{b.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          Link: {b.href} · Sort #{b.sort_order}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBanner(b);
                            setBannerForm({
                              title: b.title || "",
                              href: b.href || "/",
                              desktop_image_url: b.desktop_image_url || "",
                              mobile_image_url: b.mobile_image_url || "",
                              starts_at: b.starts_at ? b.starts_at.slice(0, 16) : "",
                              ends_at: b.ends_at ? b.ends_at.slice(0, 16) : "",
                              sort_order: b.sort_order ?? 0,
                              is_active: b.is_active ?? true,
                            });
                            setBannerModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteBannerId(b.id!)}
                          className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                adminApi
                  .upsertSiteSetting("corporate_banner_config", "content", {
                    image: corpCfg.desktop_image,
                    desktopImage: corpCfg.desktop_image,
                    mobileImage: corpCfg.mobile_image || corpCfg.desktop_image,
                    href: corpCfg.href,
                    alt: corpCfg.alt,
                  })
                  .then(() => {
                    showToast("Corporate banner updated", "success");
                    qc.invalidateQueries({ queryKey: ["site-settings-content"] });
                  })
                  .catch((err: Error) => showToast(err.message, "error"));
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <p className="font-bold text-sm">Corporate Gifting Banner</p>
              <div>
                <label className="block font-semibold mb-1">Desktop Banner URL *</label>
                <input
                  required
                  value={corpCfg.desktop_image}
                  onChange={(e) => setCorpCfg((s) => ({ ...s, desktop_image: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Mobile Banner URL (optional)</label>
                <input
                  value={corpCfg.mobile_image}
                  onChange={(e) => setCorpCfg((s) => ({ ...s, mobile_image: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Target Link (href) *</label>
                  <input
                    required
                    value={corpCfg.href}
                    onChange={(e) => setCorpCfg((s) => ({ ...s, href: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Alt / Aria Label</label>
                  <input
                    value={corpCfg.alt}
                    onChange={(e) => setCorpCfg((s) => ({ ...s, alt: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                <Save size={13} /> Save Corporate Banner
              </button>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const parsed = JSON.parse(exploreJson);
                  if (!Array.isArray(parsed)) throw new Error("Must be a JSON array of groups");
                  adminApi
                    .upsertSiteSetting("explore_links_config", "content", parsed)
                    .then(() => {
                      showToast("Explore link directory saved", "success");
                      qc.invalidateQueries({ queryKey: ["site-settings-content"] });
                    })
                    .catch((err: Error) => showToast(err.message, "error"));
                } catch (err) {
                  showToast((err as Error).message || "Invalid JSON", "error");
                }
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <p className="font-bold text-sm">Explore More Link Directory JSON</p>
              <textarea
                rows={10}
                value={exploreJson}
                onChange={(e) => setExploreJson(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                <Save size={13} /> Save Explore Directory
              </button>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                adminApi
                  .upsertSiteSetting("home_seo_guide", "content", {
                    title: seoGuideTitle,
                    html: seoGuideHtml,
                  })
                  .then(() => {
                    showToast("Home SEO guide saved", "success");
                    qc.invalidateQueries({ queryKey: ["site-settings-content"] });
                  })
                  .catch((err: Error) => showToast(err.message, "error"));
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <p className="font-bold text-sm">Home SEO Guide Accordion</p>
              <div>
                <label className="block font-semibold mb-1">Heading Title</label>
                <input
                  required
                  value={seoGuideTitle}
                  onChange={(e) => setSeoGuideTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Guide HTML Content</label>
                <textarea
                  rows={8}
                  value={seoGuideHtml}
                  onChange={(e) => setSeoGuideHtml(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                <Save size={13} /> Save SEO Guide
              </button>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const parsed = JSON.parse(homeTilesJson);
                  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                    throw new Error("Must be a JSON object mapping tile strip keys");
                  }
                  adminApi
                    .upsertSiteSetting("home_tiles_config", "content", parsed)
                    .then(() => {
                      showToast("Homepage category strips saved", "success");
                      qc.invalidateQueries({ queryKey: ["site-settings-content"] });
                    })
                    .catch((err: Error) => showToast(err.message, "error"));
                } catch (err) {
                  showToast((err as Error).message || "Invalid JSON", "error");
                }
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <p className="font-bold text-sm">Homepage Category &amp; Tile Strips JSON</p>
              <textarea
                rows={10}
                value={homeTilesJson}
                onChange={(e) => setHomeTilesJson(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                <Save size={13} /> Save Tile Strips
              </button>
            </form>
          </div>
        )}

        {/* Section Modal */}
        <FormModal
          open={secModal}
          title={editingSec ? `Edit Section · ${editingSec.title}` : "Add Homepage Section"}
          onClose={() => setSecModal(false)}
          maxWidthClass="max-w-xl"
        >
          <form onSubmit={handleSaveSectionSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Section Title *</label>
                <input
                  required
                  value={secForm.title}
                  onChange={(e) => setSecForm((s) => ({ ...s, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Section Key *</label>
                <input
                  required
                  value={secForm.section_key}
                  onChange={(e) => setSecForm((s) => ({ ...s, section_key: e.target.value }))}
                  placeholder="birthday_decorations"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-semibold mb-1">Subtitle (Shown below section title)</label>
                <input
                  value={secForm.subtitle}
                  onChange={(e) => setSecForm((s) => ({ ...s, subtitle: e.target.value }))}
                  placeholder="Wide Range of Options"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Section Type</label>
                <select
                  value={secForm.section_type}
                  onChange={(e) => setSecForm((s) => ({ ...s, section_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="product_row">Product Row</option>
                  <option value="decor_grid">Decor Cards Row</option>
                  <option value="banner_strip">Promo Banner Strip</option>
                  <option value="category_strip">Category Strip</option>
                  <option value="testimonials">Reviews Strip</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Selection Rule</label>
                <select
                  value={secForm.mode}
                  onChange={(e) => setSecForm((s) => ({ ...s, mode: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="rule">Category / Tag Rule</option>
                  <option value="manual">Manual Product IDs</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Category Slug (Rule Mode)</label>
                <input
                  value={secForm.category_slug}
                  onChange={(e) => setSecForm((s) => ({ ...s, category_slug: e.target.value }))}
                  placeholder="birthday-decoration"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Manual Product IDs (CSV)</label>
                <input
                  value={secForm.product_ids_csv}
                  onChange={(e) => setSecForm((s) => ({ ...s, product_ids_csv: e.target.value }))}
                  placeholder="1, 2, 5, 8"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Items Limit</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={secForm.limit}
                  onChange={(e) => setSecForm((s) => ({ ...s, limit: Number(e.target.value) || 10 }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            {secForm.mode === "manual" && (publishedProducts?.items?.length || 0) > 0 && (
              <div>
                <label className="block font-semibold mb-1">Quick Product Picker (Click to toggle manual picks)</label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  {(publishedProducts?.items || []).slice(0, 40).map((p) => {
                    const selected = secForm.product_ids_csv
                      .split(",")
                      .map((x) => Number(x.trim()))
                      .includes(p.id!);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const current = secForm.product_ids_csv
                            .split(",")
                            .map((x) => Number(x.trim()))
                            .filter((n) => n > 0);
                          const next = selected
                            ? current.filter((n) => n !== p.id)
                            : [...current, p.id!];
                          setSecForm((s) => ({ ...s, product_ids_csv: next.join(", ") }));
                        }}
                        className={`px-2 py-1 rounded-full text-[11px] font-medium cursor-pointer ${
                          selected
                            ? "bg-[#4f6ef7] text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        #{p.id} {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-6 pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={secForm.slider_enabled}
                  onChange={(e) =>
                    setSecForm((s) => ({ ...s, slider_enabled: e.target.checked }))
                  }
                />
                slider_enabled (ON = horizontal slider peeking last item; OFF = grid wrap)
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={secForm.is_active}
                  onChange={(e) =>
                    setSecForm((s) => ({ ...s, is_active: e.target.checked }))
                  }
                />
                Active
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSecModal(false)}
                className="px-4 py-2 rounded-xl border font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                Save Section
              </button>
            </div>
          </form>
        </FormModal>

        {/* Banner Modal */}
        <FormModal
          open={bannerModal}
          title={editingBanner ? "Edit Hero Banner" : "Add Hero Banner"}
          onClose={() => setBannerModal(false)}
          maxWidthClass="max-w-xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveBannerMut.mutate();
            }}
            className="space-y-3 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Title *</label>
                <input
                  required
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm((s) => ({ ...s, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Target Link (href) *</label>
                <input
                  required
                  value={bannerForm.href}
                  onChange={(e) => setBannerForm((s) => ({ ...s, href: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-semibold mb-1">Desktop Image URL *</label>
                <input
                  required
                  value={bannerForm.desktop_image_url}
                  onChange={(e) =>
                    setBannerForm((s) => ({ ...s, desktop_image_url: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-semibold mb-1">Mobile Image URL</label>
                <input
                  value={bannerForm.mobile_image_url}
                  onChange={(e) =>
                    setBannerForm((s) => ({ ...s, mobile_image_url: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Schedule Start</label>
                <input
                  type="datetime-local"
                  value={bannerForm.starts_at}
                  onChange={(e) => setBannerForm((s) => ({ ...s, starts_at: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Schedule End</label>
                <input
                  type="datetime-local"
                  value={bannerForm.ends_at}
                  onChange={(e) => setBannerForm((s) => ({ ...s, ends_at: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBannerModal(false)}
                className="px-4 py-2 rounded-xl border font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                Save Banner
              </button>
            </div>
          </form>
        </FormModal>

        <ConfirmDialog
          open={deleteBannerId !== null}
          title="Delete banner?"
          description="Removes this hero banner from the homepage carousel."
          confirmLabel="Delete"
          onConfirm={() => deleteBannerId && deleteBannerMut.mutate(deleteBannerId)}
          onCancel={() => setDeleteBannerId(null)}
        />
        <ConfirmDialog
          open={deleteSecId !== null}
          title="Delete homepage section?"
          description="Removes this section from the homepage layout."
          confirmLabel="Delete"
          onConfirm={() => deleteSecId && deleteSecMut.mutate(deleteSecId)}
          onCancel={() => setDeleteSecId(null)}
        />
      </div>
    </PermissionGuard>
  );
}
