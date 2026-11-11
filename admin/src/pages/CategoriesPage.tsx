import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Menu,
  Search,
  ChevronRight,
  Save,
} from "lucide-react";
import { adminApi, type Category, type NavigationItem } from "@/api/client";
import { useToast } from "@/components/ui/Toast";
import { FormModal } from "@/components/ui/FormModal";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PermissionGuard } from "@/components/ui/PermissionGuard";

interface FlatCategoryRow {
  cat: Category;
  depth: number;
}

function flattenTree(items: Category[], depth = 0): FlatCategoryRow[] {
  const out: FlatCategoryRow[] = [];
  for (const item of items) {
    out.push({ cat: item, depth });
    if (item.children?.length) {
      out.push(...flattenTree(item.children, depth + 1));
    }
  }
  return out;
}

export function CategoriesPage() {
  const location = useLocation();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const toast = (type: "success" | "error", msg: string) => showToast(msg, type);

  const routeView = location.pathname.includes("/page/mobile-categories")
    ? "mobile-categories"
    : location.pathname.includes("/page/category")
    ? "page-category"
    : location.pathname.includes("/seller-categories")
    ? "seller-categories"
    : location.pathname.includes("/sub-page")
    ? "sub-page"
    : location.pathname.includes("/addon-category")
    ? "addon-category"
    : location.pathname.includes("/category/page")
    ? "landing-page"
    : "category";

  const defaultKind =
    routeView === "addon-category"
      ? "addon"
      : routeView === "landing-page"
      ? "decoration"
      : "";

  const [tab, setTab] = useState<"categories" | "megamenu">("categories");
  const [kindFilter, setKindFilter] = useState<string>(defaultKind);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setKindFilter(defaultKind);
    setTab("categories");
  }, [location.pathname, defaultKind]);

  const [catPageLayout, setCatPageLayout] = useState({
    show_breadcrumbs: true,
    default_sort: "popular",
    show_faq_block: true,
    show_city_pills: true,
    show_related_collections: true,
    show_filters: true,
    trust_strip: "100% On-Time · Trained Decorators · Fresh Blooms",
  });
  const [mobileTiles, setMobileTiles] = useState<Array<{ title: string; slug: string; badge: string; image?: string }>>([
    { title: "Birthday", slug: "birthday-decoration", badge: "POPULAR" },
    { title: "Anniversary", slug: "anniversary-decoration", badge: "TRENDING" },
    { title: "Flowers", slug: "flowers", badge: "2HR" },
    { title: "Cakes", slug: "cakes", badge: "EGGLESS" },
  ]);
  const [sellerCats, setSellerCats] = useState<Array<{ slug: string; name: string; commission_percent: number; gst_percent: number; is_active: boolean }>>([
    { slug: "flowers", name: "Fresh Flowers & Bouquets", commission_percent: 18, gst_percent: 5, is_active: true },
    { slug: "cakes", name: "Designer & Photo Cakes", commission_percent: 20, gst_percent: 5, is_active: true },
  ]);

  const { data: catSettings = [] } = useQuery({
    queryKey: ["site-settings-cat-all"],
    queryFn: () => adminApi.listSiteSettings(""),
    enabled: routeView === "page-category" || routeView === "mobile-categories" || routeView === "seller-categories",
  });

  useEffect(() => {
    for (const st of catSettings) {
      const v = (st.value_json || {}) as Record<string, unknown>;
      if (st.key === "category_page_config") {
        setCatPageLayout({
          show_breadcrumbs: v.show_breadcrumbs !== false,
          default_sort: String(v.default_sort || "popular"),
          show_faq_block: v.show_faq_block !== false,
          show_city_pills: v.show_city_pills !== false,
          show_related_collections: v.show_related_collections !== false,
          show_filters: v.show_filters !== false,
          trust_strip: String(v.trust_strip || "100% On-Time · Trained Decorators"),
        });
      }
      if (st.key === "mobile_categories_config" && Array.isArray(v.items)) {
        setMobileTiles(v.items as Array<{ title: string; slug: string; badge: string; image?: string }>);
      }
      if (st.key === "seller_categories_config" && Array.isArray(v.items)) {
        setSellerCats(v.items as Array<{ slug: string; name: string; commission_percent: number; gst_percent: number; is_active: boolean }>);
      }
    }
  }, [catSettings]);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);

  const [catForm, setCatForm] = useState({
    name: "",
    slug: "",
    kind: "product",
    parent_id: "",
    image_url: "",
    seo_title: "",
    seo_description: "",
    seo_content_html: "",
    robots_index: true,
    sort_order: 0,
    is_active: true,
  });

  const [navModalOpen, setNavModalOpen] = useState(false);
  const [editingNav, setEditingNav] = useState<NavigationItem | null>(null);
  const [navForm, setNavForm] = useState({
    parent_id: "",
    column_title: "",
    label: "",
    href: "",
    badge: "",
    sort_order: 0,
    is_active: true,
  });

  const { data: catTree = [], isLoading: catLoading } = useQuery({
    queryKey: ["categories", kindFilter, search],
    queryFn: () => adminApi.listCategories(kindFilter || undefined, search || undefined, true),
  });

  const { data: flatCats = [] } = useQuery({
    queryKey: ["categories-flat"],
    queryFn: () => adminApi.listCategories(undefined, undefined, false),
  });

  const { data: navItems = [], isLoading: navLoading } = useQuery({
    queryKey: ["navigation-tree"],
    queryFn: () => adminApi.listNavigation(false),
    enabled: tab === "megamenu",
  });

  const groupedNavRows = useMemo(() => {
    const roots = navItems.filter((n) => !n.parent_id);
    const byParent = new Map<number, NavigationItem[]>();
    const orphans: NavigationItem[] = [];
    const rootIds = new Set(roots.map((r) => r.id));
    for (const item of navItems) {
      if (!item.parent_id) continue;
      if (rootIds.has(item.parent_id)) {
        const list = byParent.get(item.parent_id) ?? [];
        list.push(item);
        byParent.set(item.parent_id, list);
      } else {
        orphans.push(item);
      }
    }
    const out: { nav: NavigationItem; depth: number }[] = [];
    for (const root of roots) {
      out.push({ nav: root, depth: 0 });
      for (const child of byParent.get(root.id!) ?? []) {
        out.push({ nav: child, depth: 1 });
      }
    }
    for (const orph of orphans) out.push({ nav: orph, depth: 1 });
    return out;
  }, [navItems]);

  const flatRows = useMemo(() => {
    const all = flattenTree(catTree);
    if (routeView === "sub-page") {
      return all.filter((r) => Boolean(r.cat.parent_id));
    }
    return all;
  }, [catTree, routeView]);

  const saveCatMut = useMutation({
    mutationFn: () => {
      const payload: Partial<Category> = {
        name: catForm.name,
        slug: catForm.slug,
        kind: catForm.kind,
        parent_id: catForm.parent_id ? Number(catForm.parent_id) : undefined,
        image_url: catForm.image_url,
        seo_title: catForm.seo_title,
        seo_description: catForm.seo_description,
        seo_content_html: catForm.seo_content_html,
        robots_index: catForm.robots_index,
        sort_order: Number(catForm.sort_order) || 0,
        is_active: catForm.is_active,
      };
      return editingCat?.id
        ? adminApi.updateCategory(editingCat.id, payload)
        : adminApi.createCategory(payload);
    },
    onSuccess: () => {
      toast("success", editingCat ? "Category updated" : "Category created");
      setCatModalOpen(false);
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["categories-flat"] });
    },
    onError: (err: Error) => toast("error", err.message),
  });

  const deleteCatMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteCategory(id),
    onSuccess: () => {
      toast("success", "Category deleted");
      setDeleteCatId(null);
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["categories-flat"] });
    },
    onError: (err: Error) => toast("error", err.message),
  });

  const saveNavMut = useMutation({
    mutationFn: () => {
      const payload: Partial<NavigationItem> = {
        parent_id: navForm.parent_id ? Number(navForm.parent_id) : undefined,
        column_title: navForm.column_title,
        label: navForm.label,
        href: navForm.href,
        badge: navForm.badge || undefined,
        sort_order: Number(navForm.sort_order) || 0,
        is_active: navForm.is_active,
      };
      return editingNav?.id
        ? adminApi.updateNavigationItem(editingNav.id, payload)
        : adminApi.createNavigationItem(payload);
    },
    onSuccess: () => {
      toast("success", editingNav ? "Menu item updated" : "Menu item created");
      setNavModalOpen(false);
      qc.invalidateQueries({ queryKey: ["navigation-tree"] });
    },
    onError: (err: Error) => toast("error", err.message),
  });

  const deleteNavMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteNavigationItem(id),
    onSuccess: () => {
      toast("success", "Menu item removed");
      qc.invalidateQueries({ queryKey: ["navigation-tree"] });
    },
    onError: (err: Error) => toast("error", err.message),
  });

  const toggleNavActiveMut = useMutation({
    mutationFn: (nav: NavigationItem) =>
      adminApi.updateNavigationItem(nav.id!, {
        parent_id: nav.parent_id,
        column_title: nav.column_title,
        label: nav.label,
        href: nav.href,
        badge: nav.badge,
        category_id: nav.category_id,
        sort_order: nav.sort_order ?? 0,
        is_active: !(nav.is_active ?? true),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["navigation-tree"] });
    },
    onError: (err: Error) => toast("error", err.message),
  });

  const openNewCat = () => {
    setEditingCat(null);
    const firstParent = flatCats.find((c) => !c.parent_id);
    setCatForm({
      name: "",
      slug: "",
      kind: routeView === "addon-category" ? "addon" : kindFilter || "product",
      parent_id: routeView === "sub-page" && firstParent?.id ? String(firstParent.id) : "",
      image_url: "",
      seo_title: "",
      seo_description: "",
      seo_content_html: "",
      robots_index: true,
      sort_order: 0,
      is_active: true,
    });
    setCatModalOpen(true);
  };

  const openEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name || "",
      slug: cat.slug || "",
      kind: cat.kind || "product",
      parent_id: cat.parent_id ? String(cat.parent_id) : "",
      image_url: cat.image_url || "",
      seo_title: cat.seo_title || "",
      seo_description: cat.seo_description || "",
      seo_content_html: cat.seo_content_html || "",
      robots_index: cat.robots_index ?? true,
      sort_order: cat.sort_order ?? 0,
      is_active: cat.is_active ?? true,
    });
    setCatModalOpen(true);
  };

  return (
    <PermissionGuard module="category">
      <div className="space-y-4 animate-bd-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderTree size={20} className="text-[#4f6ef7]" />
              {routeView === "page-category"
                ? "Category Landing Page Layout & SEO"
                : routeView === "mobile-categories"
                ? "Mobile Categories Strip Builder"
                : routeView === "seller-categories"
                ? "Seller Categories & Commissions"
                : routeView === "sub-page"
                ? "Category Sub-Pages (Child Pages)"
                : routeView === "addon-category"
                ? "Addon Categories"
                : routeView === "landing-page"
                ? "Category Pages"
                : "Categories & Mega-Menu Builder"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Nested categories, occasion SEO pages, mobile horizontal strip, and storefront mega-menu columns.
            </p>
          </div>

          {routeView !== "page-category" && routeView !== "mobile-categories" && routeView !== "seller-categories" && (
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTab("categories")}
                  className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                    tab === "categories"
                      ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Categories & Pages
                </button>
                <button
                  type="button"
                  onClick={() => setTab("megamenu")}
                  className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer inline-flex items-center gap-1.5 ${
                    tab === "megamenu"
                      ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Menu size={13} /> Mega-Menu
                </button>
              </div>
            </div>
          )}
        </div>

        {routeView === "page-category" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adminApi
                .upsertSiteSetting("category_page_config", "content", catPageLayout)
                .then(() => toast("success", "Category page layout config saved"))
                .catch((err: Error) => toast("error", err.message));
            }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl text-xs"
          >
            <p className="font-bold text-sm">Category Page Global Template Settings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Default Product Sort Order</label>
                <select
                  value={catPageLayout.default_sort}
                  onChange={(e) => setCatPageLayout((s) => ({ ...s, default_sort: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <option value="popular">Popular / Featured First</option>
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Trust Strip Banner Text</label>
                <input
                  value={catPageLayout.trust_strip}
                  onChange={(e) => setCatPageLayout((s) => ({ ...s, trust_strip: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={catPageLayout.show_breadcrumbs}
                  onChange={(e) => setCatPageLayout((s) => ({ ...s, show_breadcrumbs: e.target.checked }))}
                />
                Show SEO Breadcrumbs
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={catPageLayout.show_faq_block}
                  onChange={(e) => setCatPageLayout((s) => ({ ...s, show_faq_block: e.target.checked }))}
                />
                Show Bottom FAQ Accordion
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={catPageLayout.show_city_pills}
                  onChange={(e) => setCatPageLayout((s) => ({ ...s, show_city_pills: e.target.checked }))}
                />
                Show Nearby Cities Filter Pills
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={catPageLayout.show_related_collections}
                  onChange={(e) => setCatPageLayout((s) => ({ ...s, show_related_collections: e.target.checked }))}
                />
                Show Related Collection Tiles
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={catPageLayout.show_filters}
                  onChange={(e) => setCatPageLayout((s) => ({ ...s, show_filters: e.target.checked }))}
                />
                Show Price &amp; Sort Filters
              </label>
            </div>
            <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
              <Save size={13} /> Save Category Page Settings
            </button>
          </form>
        ) : routeView === "seller-categories" ? (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-4xl text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">Seller Categories &amp; Marketplace Commissions</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Configure allowed seller catalog categories, platform commission % &amp; GST rates.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSellerCats((prev) => [
                    ...prev,
                    { slug: "", name: "New Seller Category", commission_percent: 18, gst_percent: 18, is_active: true },
                  ])
                }
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                + Add Seller Category
              </button>
            </div>
            <div className="space-y-2">
              {sellerCats.map((sc, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <input
                    value={sc.name}
                    placeholder="Category name"
                    onChange={(e) => setSellerCats((prev) => prev.map((x, j) => (j === idx ? { ...x, name: e.target.value } : x)))}
                    className="sm:col-span-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    value={sc.slug}
                    placeholder="slug"
                    onChange={(e) => setSellerCats((prev) => prev.map((x, j) => (j === idx ? { ...x, slug: e.target.value } : x)))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono"
                  />
                  <input
                    type="number"
                    value={sc.commission_percent}
                    placeholder="Commission %"
                    onChange={(e) => setSellerCats((prev) => prev.map((x, j) => (j === idx ? { ...x, commission_percent: Number(e.target.value) } : x)))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    type="number"
                    value={sc.gst_percent}
                    placeholder="GST %"
                    onChange={(e) => setSellerCats((prev) => prev.map((x, j) => (j === idx ? { ...x, gst_percent: Number(e.target.value) } : x)))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sc.is_active}
                        onChange={(e) => setSellerCats((prev) => prev.map((x, j) => (j === idx ? { ...x, is_active: e.target.checked } : x)))}
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      onClick={() => setSellerCats((prev) => prev.filter((_, j) => j !== idx))}
                      className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                adminApi
                  .upsertSiteSetting("seller_categories_config", "seller", { items: sellerCats })
                  .then(() => toast("success", "Seller category commission rules saved"))
                  .catch((err: Error) => toast("error", err.message))
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
            >
              <Save size={13} /> Save Seller Categories
            </button>
          </div>
        ) : routeView === "mobile-categories" ? (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-3xl text-xs">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">Mobile Horizontal Quick Categories Bar</p>
              <button
                type="button"
                onClick={() => setMobileTiles((t) => [...t, { title: "New Category", slug: "", badge: "" }])}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
              >
                + Add Tile
              </button>
            </div>
            <div className="space-y-2">
                {mobileTiles.map((tile, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                  <input
                    value={tile.title}
                    placeholder="Title"
                    onChange={(e) => setMobileTiles((prev) => prev.map((x, j) => (j === idx ? { ...x, title: e.target.value } : x)))}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    value={tile.slug}
                    placeholder="Category slug"
                    onChange={(e) => setMobileTiles((prev) => prev.map((x, j) => (j === idx ? { ...x, slug: e.target.value } : x)))}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    value={tile.image || ""}
                    placeholder="Icon/Image URL"
                    onChange={(e) => setMobileTiles((prev) => prev.map((x, j) => (j === idx ? { ...x, image: e.target.value } : x)))}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    value={tile.badge}
                    placeholder="Badge (HOT / 2HR)"
                    onChange={(e) => setMobileTiles((prev) => prev.map((x, j) => (j === idx ? { ...x, badge: e.target.value } : x)))}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setMobileTiles((prev) => prev.filter((_, j) => j !== idx))}
                    className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 font-semibold cursor-pointer text-left"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                adminApi
                  .upsertSiteSetting("mobile_categories_config", "content", { items: mobileTiles })
                  .then(() => toast("success", "Mobile categories strip saved"))
                  .catch((err: Error) => toast("error", err.message))
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
            >
              <Save size={13} /> Save Mobile Category Strip
            </button>
          </div>
        ) : tab === "categories" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search category or slug..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs w-56"
                  />
                </div>
                <select
                  value={kindFilter}
                  onChange={(e) => setKindFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="">All Kinds</option>
                  <option value="product">Product</option>
                  <option value="decoration">Decoration</option>
                  <option value="addon">Addon Category</option>
                </select>
              </div>

              <PermissionGuard module="category" requireWrite fallback={null}>
                <button
                  type="button"
                  onClick={openNewCat}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] hover:bg-[#3f5ce0] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus size={14} /> New Category
                </button>
              </PermissionGuard>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                    <th className="px-4 py-3 font-semibold">Name (Nested Hierarchy)</th>
                    <th className="px-4 py-3 font-semibold">Slug</th>
                    <th className="px-4 py-3 font-semibold">Kind</th>
                    <th className="px-4 py-3 font-semibold">Products</th>
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {catLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Loading category hierarchy...
                      </td>
                    </tr>
                  ) : flatRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        No categories yet. Click &quot;New Category&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    flatRows.map(({ cat, depth }) => (
                      <tr key={cat.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <div
                            className="flex items-center gap-2 font-semibold"
                            style={{ paddingLeft: `${depth * 20}px` }}
                          >
                            {depth > 0 && <ChevronRight size={12} className="text-slate-400 shrink-0" />}
                            {cat.image_url && (
                              <img
                                src={cat.image_url}
                                alt={cat.name}
                                className="w-7 h-7 rounded-lg object-cover shrink-0 bg-slate-100"
                              />
                            )}
                            <span>{cat.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">/{cat.slug}</td>
                        <td className="px-4 py-3 capitalize">{cat.kind}</td>
                        <td className="px-4 py-3">{cat.product_count ?? 0}</td>
                        <td className="px-4 py-3">{cat.sort_order}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              cat.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {cat.is_active ? "Active" : "Hidden"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <a
                              href={`${import.meta.env.VITE_STOREFRONT_URL || "http://localhost:3000"}/${cat.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold text-[#4f6ef7] hover:bg-indigo-50"
                              title="Preview on Storefront"
                            >
                              View ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => openEditCat(cat)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer"
                              aria-label={`Edit ${cat.name}`}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteCatId(cat.id!)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 cursor-pointer"
                              aria-label={`Delete ${cat.name}`}
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
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <p className="text-xs text-slate-500">
                Manage top-level header menu nodes and column links shown on desktop mega-menu & mobile drawer.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingNav(null);
                  setNavForm({
                    parent_id: "",
                    column_title: "",
                    label: "",
                    href: "",
                    badge: "",
                    sort_order: 0,
                    is_active: true,
                  });
                  setNavModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white text-xs font-semibold cursor-pointer"
              >
                <Plus size={14} /> Add Menu Link
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                    <th className="px-4 py-3 font-semibold">Label</th>
                    <th className="px-4 py-3 font-semibold">Column / Group</th>
                    <th className="px-4 py-3 font-semibold">Target Href</th>
                    <th className="px-4 py-3 font-semibold">Badge</th>
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {navLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Loading navigation items...
                      </td>
                    </tr>
                  ) : groupedNavRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        No navigation items yet.
                      </td>
                    </tr>
                  ) : (
                    groupedNavRows.map(({ nav, depth }) => (
                      <tr
                        key={nav.id}
                        className={
                          depth === 0
                            ? "bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/60"
                            : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        }
                      >
                        <td className="px-4 py-3">
                          <div
                            className={`flex items-center gap-1.5 ${depth === 0 ? "font-bold text-slate-800 dark:text-slate-100" : "font-medium text-slate-600 dark:text-slate-300"}`}
                            style={{ paddingLeft: `${depth * 22}px` }}
                          >
                            {depth > 0 && <ChevronRight size={12} className="text-slate-400 shrink-0" />}
                            <span>{nav.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{nav.column_title || "Root Menu"}</td>
                        <td className="px-4 py-3 font-mono text-[11px]">{nav.href}</td>
                        <td className="px-4 py-3">
                          {nav.badge ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[#9b1b45] text-[10px] font-semibold">
                              {nav.badge}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">{nav.sort_order}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleNavActiveMut.mutate(nav)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer ${
                              nav.is_active !== false
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {nav.is_active !== false ? "Active" : "Hidden"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNav(nav);
                              setNavForm({
                                parent_id: nav.parent_id ? String(nav.parent_id) : "",
                                column_title: nav.column_title || "",
                                label: nav.label || "",
                                href: nav.href || "",
                                badge: nav.badge || "",
                                sort_order: nav.sort_order ?? 0,
                                is_active: nav.is_active ?? true,
                              });
                              setNavModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                            aria-label={`Edit ${nav.label}`}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteNavMut.mutate(nav.id!)}
                            className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                            aria-label={`Delete ${nav.label}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Category Modal */}
        <FormModal
          open={catModalOpen}
          title={editingCat ? `Edit Category · ${editingCat.name}` : "Create Category"}
          onClose={() => setCatModalOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveCatMut.mutate();
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Name *</label>
                <input
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm((s) => ({ ...s, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Slug (auto if blank)</label>
                <input
                  value={catForm.slug}
                  onChange={(e) => setCatForm((s) => ({ ...s, slug: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Kind</label>
                <select
                  value={catForm.kind}
                  onChange={(e) => setCatForm((s) => ({ ...s, kind: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="product">Product Category</option>
                  <option value="decoration">Decoration Category</option>
                  <option value="addon">Addon Category</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Parent Category</label>
                <select
                  value={catForm.parent_id}
                  onChange={(e) => setCatForm((s) => ({ ...s, parent_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">None (Top Level)</option>
                  {flatCats
                    .filter((c) => c.id !== editingCat?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Thumbnail Image URL</label>
                <input
                  value={catForm.image_url}
                  onChange={(e) => setCatForm((s) => ({ ...s, image_url: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Sort Order</label>
                <input
                  type="number"
                  value={catForm.sort_order}
                  onChange={(e) => setCatForm((s) => ({ ...s, sort_order: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">SEO Title</label>
                <input
                  value={catForm.seo_title}
                  onChange={(e) => setCatForm((s) => ({ ...s, seo_title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">SEO Description</label>
                <input
                  value={catForm.seo_description}
                  onChange={(e) => setCatForm((s) => ({ ...s, seo_description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">SEO Content Block</label>
              <RichTextEditor
                value={catForm.seo_content_html}
                onChange={(html) => setCatForm((s) => ({ ...s, seo_content_html: html }))}
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={catForm.is_active}
                  onChange={(e) => setCatForm((s) => ({ ...s, is_active: e.target.checked }))}
                />
                Active
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={catForm.robots_index}
                  onChange={(e) => setCatForm((s) => ({ ...s, robots_index: e.target.checked }))}
                />
                Allow Search Indexing (index, follow)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveCatMut.isPending}
                className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                {saveCatMut.isPending ? "Saving..." : "Save Category"}
              </button>
            </div>
          </form>
        </FormModal>

        {/* Mega Menu Modal */}
        <FormModal
          open={navModalOpen}
          title={editingNav ? "Edit Mega-Menu Link" : "New Mega-Menu Link"}
          onClose={() => setNavModalOpen(false)}
          maxWidthClass="max-w-lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveNavMut.mutate();
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Parent Node</label>
              <select
                value={navForm.parent_id}
                onChange={(e) => setNavForm((s) => ({ ...s, parent_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="">Top-Level Menu Item</option>
                {navItems
                  .filter((n) => !n.parent_id && n.id !== editingNav?.id)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Column Title (e.g. By Occasion)</label>
              <input
                value={navForm.column_title}
                onChange={(e) => setNavForm((s) => ({ ...s, column_title: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Link Label *</label>
              <input
                required
                value={navForm.label}
                onChange={(e) => setNavForm((s) => ({ ...s, label: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Href *</label>
              <input
                required
                value={navForm.href}
                onChange={(e) => setNavForm((s) => ({ ...s, href: e.target.value }))}
                placeholder="/birthday-decoration"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Optional Badge</label>
                <input
                  value={navForm.badge}
                  onChange={(e) => setNavForm((s) => ({ ...s, badge: e.target.value }))}
                  placeholder="Popular / New"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Sort Order</label>
                <input
                  type="number"
                  value={navForm.sort_order}
                  onChange={(e) => setNavForm((s) => ({ ...s, sort_order: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setNavModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                Save Menu Item
              </button>
            </div>
          </form>
        </FormModal>

        <ConfirmDialog
          open={deleteCatId !== null}
          title="Delete category?"
          description="This soft-deletes the category from storefront navigation."
          confirmLabel="Delete"
          onConfirm={() => deleteCatId && deleteCatMut.mutate(deleteCatId)}
          onCancel={() => setDeleteCatId(null)}
        />
      </div>
    </PermissionGuard>
  );
}
