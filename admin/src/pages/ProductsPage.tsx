import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Search,
  Copy,
  Pencil,
  Trash2,
  Download,
  Upload,
  SlidersHorizontal,
} from "lucide-react";
import {
  adminApi,
  type Product,
  type ProductAddon,
  type ProductVariant,
  type ProductOptionGroup,
  type ProductCityOverride,
  type PersonalizationField,
  type DecorationInclusion,
  type Preset,
} from "@/api/client";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { FormModal } from "@/components/ui/FormModal";
import { ImageUploader, type ImageItem } from "@/components/ui/ImageUploader";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PermissionGuard } from "@/components/ui/PermissionGuard";
import { useToast } from "@/components/ui/Toast";
import {
  useUnsavedChangesWarning,
  loadDraft,
  saveDraft,
  clearDraft,
} from "@/hooks/useUnsavedChanges";

const PRODUCT_TYPES = [
  "flower",
  "cake",
  "plant",
  "chocolate",
  "personalised",
  "hamper",
  "decoration_package",
  "combo",
];

function rs(paise?: number) {
  return `₹${((paise ?? 0) / 100).toFixed(0)}`;
}

interface ProductDraft {
  name: string;
  slug: string;
  sku: string;
  product_type: string;
  mrp_rupees: number;
  selling_price_rupees: number;
  stock_qty: number;
  lead_time_days: number;
  is_eggless: boolean;
  has_veg_nonveg: boolean;
  nonveg_delta_rupees: number;
  gst_rate_percent: number;
  delivery_type_id?: number;
  cutoff_time: string;
  cancellation_policy_preset_id?: number;
  rating_avg: number;
  ratings_count: number;
  available_all_cities: boolean;
  is_featured: boolean;
  is_trending: boolean;
  status: string;
  description: string;
  seo_title: string;
  seo_description: string;
  images: ImageItem[];
  variants: ProductVariant[];
  option_groups: ProductOptionGroup[];
  personalization: PersonalizationField[];
  inclusions: DecorationInclusion[];
  category_ids: number[];
  preset_ids: number[];
  addon_ids: number[];
  city_overrides: ProductCityOverride[];
}

const DEFAULT_DRAFT: ProductDraft = {
  name: "",
  slug: "",
  sku: "",
  product_type: "decoration_package",
  mrp_rupees: 2499,
  selling_price_rupees: 1999,
  stock_qty: 25,
  lead_time_days: 0,
  is_eggless: false,
  has_veg_nonveg: false,
  nonveg_delta_rupees: 149,
  gst_rate_percent: 18,
  delivery_type_id: undefined,
  cutoff_time: "",
  cancellation_policy_preset_id: undefined,
  rating_avg: 4.8,
  ratings_count: 24,
  available_all_cities: true,
  is_featured: false,
  is_trending: false,
  status: "draft",
  description: "",
  seo_title: "",
  seo_description: "",
  images: [],
  variants: [],
  option_groups: [],
  personalization: [],
  inclusions: [],
  category_ids: [],
  preset_ids: [],
  addon_ids: [],
  city_overrides: [],
};

const DRAFT_KEY = "giftlaya_cms_product_draft";

export function ProductsPage() {
  const location = useLocation();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const toast = (type: "success" | "error", msg: string) => showToast(msg, type);

  const routeTab = location.pathname.includes("/option-group")
    ? "option-group"
    : location.pathname.includes("/info-field-group")
    ? "info-field-group"
    : location.pathname.includes("/addon")
    ? "addons"
    : "products";

  const [tab, setTab] = useState<"products" | "addons" | "option-group" | "info-field-group">(
    routeTab
  );

  useEffect(() => {
    setTab(routeTab);
  }, [routeTab]);

  const [editingOptId, setEditingOptId] = useState<number | null>(null);
  const [optName, setOptName] = useState("");
  const [optType, setOptType] = useState<"radio" | "checkbox" | "select">("radio");
  const [optChoices, setOptChoices] = useState<Array<{ label: string; price_delta_paise: number }>>([
    { label: "500g", price_delta_paise: 0 },
    { label: "1 Kg", price_delta_paise: 50000 },
  ]);

  const [editingIfgId, setEditingIfgId] = useState<number | null>(null);
  const [ifgName, setIfgName] = useState("");
  const [ifgFields, setIfgFields] = useState<Array<{ key: string; label: string; type: string; required: boolean }>>([
    { key: "cake_message", label: "Message on Cake", type: "text", required: false },
  ]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addonCatFilter, setAddonCatFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriceRs, setBulkPriceRs] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderTab, setBuilderTab] = useState<"basic" | "media" | "variants" | "custom" | "seo">("basic");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(DEFAULT_DRAFT);
  const [dirty, setDirty] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ProductAddon | null>(null);
  const [addonForm, setAddonForm] = useState({ name: "", slug: "", image_url: "", price_rs: 299, addon_category_id: "", is_active: true });

  useUnsavedChangesWarning(builderOpen && dirty);

  useEffect(() => {
    if (builderOpen && editingId === null && dirty) {
      saveDraft(DRAFT_KEY, draft);
    }
  }, [builderOpen, editingId, dirty, draft]);

  const { data: prodData, isLoading: prodLoading } = useQuery({
    queryKey: ["products", search, typeFilter, statusFilter, sortBy, page],
    queryFn: () =>
      adminApi.listProducts({
        search: search || undefined,
        product_type: typeFilter || undefined,
        status: statusFilter || undefined,
        sort_by: sortBy,
        page,
        limit: 20,
      }),
    enabled: tab === "products",
  });

  const { data: addonsData, isLoading: addonsLoading } = useQuery({
    queryKey: ["addons", search],
    queryFn: () => adminApi.listAddons(search || undefined, 1, 100),
  });

  const { data: flatCats = [] } = useQuery({
    queryKey: ["categories-flat"],
    queryFn: () => adminApi.listCategories(undefined, undefined, false),
  });

  const { data: optionGroups = [] } = useQuery({
    queryKey: ["presets", "option_group"],
    queryFn: () => adminApi.listPresets("option_group"),
  });

  const { data: infoFieldGroups = [] } = useQuery({
    queryKey: ["presets", "info_field_group"],
    queryFn: () => adminApi.listPresets("info_field_group"),
  });

  const { data: deliveryTypes = [] } = useQuery({
    queryKey: ["delivery-types"],
    queryFn: () => adminApi.listDeliveryTypes(),
  });

  const { data: allPresets = [] } = useQuery({
    queryKey: ["presets-all"],
    queryFn: () => adminApi.listPresets(),
  });

  const { data: cities = [] } = useQuery({
    queryKey: ["cities-list"],
    queryFn: () => adminApi.listCities(),
  });

  const cancellationPolicies = allPresets.filter((pr) => pr.preset_type === "cancellation-policy");
  const filterPresets = allPresets.filter((pr) =>
    ["occasion", "flavour", "color", "label", "relation", "promotion-tags", "venue"].includes(pr.preset_type || "")
  );

  const saveOptionGroupMut = useMutation({
    mutationFn: () =>
      adminApi.savePreset({
        id: editingOptId ?? undefined,
        preset_type: "option_group",
        name: optName,
        slug: optName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        metadata: { type: optType, options: optChoices } as unknown as Preset["metadata"],
        is_active: true,
      }),
    onSuccess: () => {
      toast("success", editingOptId ? "Product Option Group updated" : "Product Option Group saved");
      setEditingOptId(null);
      setOptName("");
      qc.invalidateQueries({ queryKey: ["presets", "option_group"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const saveInfoFieldGroupMut = useMutation({
    mutationFn: () =>
      adminApi.savePreset({
        id: editingIfgId ?? undefined,
        preset_type: "info_field_group",
        name: ifgName,
        slug: ifgName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        metadata: { fields: ifgFields } as unknown as Preset["metadata"],
        is_active: true,
      }),
    onSuccess: () => {
      toast("success", editingIfgId ? "Information Field Group updated" : "Information Field Group saved");
      setEditingIfgId(null);
      setIfgName("");
      qc.invalidateQueries({ queryKey: ["presets", "info_field_group"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const computedDiscount =
    draft.mrp_rupees > 0 && draft.selling_price_rupees < draft.mrp_rupees
      ? Math.round(((draft.mrp_rupees - draft.selling_price_rupees) * 100) / draft.mrp_rupees)
      : 0;

  const updateDraft = (patch: Partial<ProductDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const openNewProduct = () => {
    const saved = loadDraft<ProductDraft>(DRAFT_KEY);
    setEditingId(null);
    setDraft(saved || DEFAULT_DRAFT);
    setBuilderTab("basic");
    setDirty(Boolean(saved));
    setBuilderOpen(true);
  };

  const openEditProduct = async (id: number) => {
    try {
      const full = await adminApi.getProduct(id);
      setEditingId(id);
      setDraft({
        name: full.name || "",
        slug: full.slug || "",
        sku: full.sku || "",
        product_type: full.product_type || "flower",
        mrp_rupees: (full.mrp_paise ?? 0) / 100,
        selling_price_rupees: (full.selling_price_paise ?? 0) / 100,
        stock_qty: full.stock_qty ?? 0,
        lead_time_days: full.lead_time_days ?? 0,
        is_eggless: Boolean(full.is_eggless),
        has_veg_nonveg: Boolean(full.has_veg_nonveg),
        nonveg_delta_rupees: Math.round((full.nonveg_delta_paise ?? 14900) / 100),
        gst_rate_percent: full.gst_rate_percent ?? 18,
        delivery_type_id: full.delivery_type_id,
        cutoff_time: full.cutoff_time || "",
        cancellation_policy_preset_id: full.cancellation_policy_preset_id,
        rating_avg: full.rating_avg ?? 4.8,
        ratings_count: full.ratings_count ?? 24,
        available_all_cities: full.available_all_cities ?? true,
        is_featured: Boolean(full.is_featured),
        is_trending: Boolean(full.is_trending),
        status: full.status || "draft",
        description: full.description || "",
        seo_title: full.seo_title || "",
        seo_description: full.seo_description || "",
        images: (full.images || []).map((im, idx) => ({
          url: im.url || "",
          alt_text: im.alt_text || "",
          sort_order: im.sort_order ?? idx,
          is_primary: Boolean(im.is_primary),
        })),
        variants: full.variants || [],
        option_groups: full.option_groups || [],
        personalization: full.personalization_fields || [],
        inclusions: full.decoration_inclusions || [],
        category_ids: full.category_ids || [],
        preset_ids: full.preset_ids || [],
        addon_ids: full.addon_ids || [],
        city_overrides: full.city_overrides || [],
      });
      setBuilderTab("basic");
      setDirty(false);
      setBuilderOpen(true);
    } catch (e) {
      toast("error", (e as Error).message);
    }
  };

  const saveProductMut = useMutation({
    mutationFn: () => {
      const payload: Partial<Product> = {
        name: draft.name,
        slug: draft.slug,
        sku: draft.sku,
        product_type: draft.product_type,
        mrp_paise: Math.round(draft.mrp_rupees * 100),
        selling_price_paise: Math.round(draft.selling_price_rupees * 100),
        stock_qty: Number(draft.stock_qty),
        track_stock: true,
        lead_time_days: Number(draft.lead_time_days),
        is_eggless: draft.is_eggless,
        has_veg_nonveg: draft.has_veg_nonveg,
        nonveg_delta_paise: Math.round((draft.nonveg_delta_rupees || 0) * 100),
        delivery_type_id: draft.delivery_type_id || undefined,
        cutoff_time: draft.cutoff_time ? draft.cutoff_time : undefined,
        cancellation_policy_preset_id: draft.cancellation_policy_preset_id || undefined,
        rating_avg: Number(draft.rating_avg) || 4.8,
        ratings_count: Number(draft.ratings_count) || 0,
        available_all_cities: draft.available_all_cities,
        is_featured: draft.is_featured,
        is_trending: draft.is_trending,
        status: draft.status,
        description: draft.description,
        seo_title: draft.seo_title,
        seo_description: draft.seo_description,
        gst_rate_percent: Number(draft.gst_rate_percent) || 18,
        images: draft.images,
        variants: draft.variants,
        option_groups: draft.option_groups,
        personalization_fields: draft.personalization,
        decoration_inclusions: draft.inclusions,
        category_ids: draft.category_ids,
        preset_ids: draft.preset_ids,
        addon_ids: draft.addon_ids,
        city_overrides: draft.city_overrides,
      };
      return editingId
        ? adminApi.updateProduct(editingId, payload)
        : adminApi.createProduct(payload);
    },
    onSuccess: () => {
      toast("success", editingId ? "Product updated" : "Product created");
      clearDraft(DRAFT_KEY);
      setDirty(false);
      setBuilderOpen(false);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const duplicateMut = useMutation({
    mutationFn: (id: number) => adminApi.duplicateProduct(id),
    onSuccess: (dup) => {
      toast("success", `Duplicated as ${dup.sku}`);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteProduct(id),
    onSuccess: () => {
      toast("success", "Product deleted");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const bulkMut = useMutation({
    mutationFn: () => {
      const items = Array.from(selectedIds).map((id) => ({
        product_id: Number(id),
        status: bulkStatus || undefined,
        selling_price_paise: bulkPriceRs ? Math.round(Number(bulkPriceRs) * 100) : undefined,
        stock_qty: bulkStock !== "" ? Number(bulkStock) : undefined,
      }));
      return adminApi.bulkUpdateProducts(items);
    },
    onSuccess: () => {
      toast("success", "Bulk updates applied");
      setBulkOpen(false);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const importCsvMut = useMutation({
    mutationFn: (file: File) => adminApi.importProductsCSV(file),
    onSuccess: (sum) => {
      toast("success", `Imported ${sum.imported} products (${sum.errors?.length || 0} skipped)`);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const saveAddonMut = useMutation({
    mutationFn: () => {
      const payload: Partial<ProductAddon> = {
        name: addonForm.name,
        slug: addonForm.slug,
        image_url: addonForm.image_url,
        price_paise: Math.round(addonForm.price_rs * 100),
        addon_category_id: addonForm.addon_category_id ? Number(addonForm.addon_category_id) : undefined,
        is_active: addonForm.is_active,
      };
      return editingAddon?.id
        ? adminApi.updateAddon(editingAddon.id, payload)
        : adminApi.createAddon(payload);
    },
    onSuccess: () => {
      toast("success", editingAddon ? "Addon updated" : "Addon created");
      setAddonModalOpen(false);
      qc.invalidateQueries({ queryKey: ["addons"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const columns: ColumnDef<Product>[] = [
    {
      key: "product",
      header: "Product",
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
            {p.primary_image_url ? (
              <img src={p.primary_image_url} alt={p.name} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]">
              {p.name}
            </p>
            <p className="text-[11px] text-slate-400">
              {p.sku} · <span className="capitalize">{(p.product_type || "").replaceAll("_", " ")}</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price / Discount",
      sortKey: "price_asc",
      render: (p) => (
        <div>
          <span className="font-bold">{rs(p.selling_price_paise)}</span>{" "}
          <span className="line-through text-slate-400 text-[11px]">{rs(p.mrp_paise)}</span>
          {(p.discount_percent ?? 0) > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              {p.discount_percent}% OFF
            </span>
          )}
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            (p.stock_qty ?? 0) <= 5
              ? "bg-amber-50 text-amber-800"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          }`}
        >
          {p.stock_qty} units
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
            p.status === "published"
              ? "bg-emerald-50 text-emerald-700"
              : p.status === "archived"
              ? "bg-slate-100 text-slate-500"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {p.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (p) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEditProduct(p.id!)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 cursor-pointer"
            title="Edit"
            aria-label={`Edit ${p.name}`}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => duplicateMut.mutate(p.id!)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 cursor-pointer"
            title="Duplicate"
            aria-label={`Duplicate ${p.name}`}
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteId(p.id!)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 cursor-pointer"
            title="Delete"
            aria-label={`Delete ${p.name}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard module="product">
      <div className="space-y-4 animate-bd-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package size={20} className="text-[#4f6ef7]" />
              {tab === "addons"
                ? "Catalog Addons"
                : tab === "option-group"
                ? "Product Options & Choice Groups"
                : tab === "info-field-group"
                ? "Information Field Groups"
                : "Products & Decoration Services"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Flowers, cakes, plants, chocolates, personalised gifts, hampers, addons & reusable option groups.
            </p>
          </div>

          <div className="inline-flex flex-wrap rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 text-xs self-start gap-0.5">
            {(
              [
                ["products", "Products & Decor"],
                ["addons", `Addons (${addonsData?.meta?.total ?? 0})`],
                ["option-group", `Product Options (${optionGroups.length})`],
                ["info-field-group", `Info Field Groups (${infoFieldGroups.length})`],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  tab === k ? "bg-white dark:bg-slate-900 shadow-sm" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {tab === "option-group" ? (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveOptionGroupMut.mutate();
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <p className="font-bold text-sm">Create Reusable Product Option Group</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Group Name *</label>
                  <input
                    required
                    value={optName}
                    onChange={(e) => setOptName(e.target.value)}
                    placeholder="e.g. Cake Weight Tiers"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Selection Type</label>
                  <select
                    value={optType}
                    onChange={(e) => setOptType(e.target.value as "radio" | "checkbox" | "select")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <option value="radio">Single Choice (Radio)</option>
                    <option value="select">Dropdown Select</option>
                    <option value="checkbox">Multi Select</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Option Choices</span>
                  <button
                    type="button"
                    onClick={() => setOptChoices((c) => [...c, { label: "", price_delta_paise: 0 }])}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                  >
                    + Add Choice
                  </button>
                </div>
                {optChoices.map((ch, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={ch.label}
                      placeholder="Choice label (e.g. 1 Kg)"
                      onChange={(e) =>
                        setOptChoices((prev) =>
                          prev.map((x, j) => (j === idx ? { ...x, label: e.target.value } : x))
                        )
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="number"
                      value={ch.price_delta_paise / 100}
                      placeholder="Extra INR"
                      onChange={(e) =>
                        setOptChoices((prev) =>
                          prev.map((x, j) =>
                            j === idx ? { ...x, price_delta_paise: Math.round(Number(e.target.value) * 100) } : x
                          )
                        )
                      }
                      className="w-32 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saveOptionGroupMut.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
                >
                  <Plus size={13} /> {editingOptId ? "Update Option Group" : "Save Option Group"}
                </button>
                {editingOptId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOptId(null);
                      setOptName("");
                      setOptType("radio");
                      setOptChoices([
                        { label: "500g", price_delta_paise: 0 },
                        { label: "1 Kg", price_delta_paise: 50000 },
                      ]);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {optionGroups.map((og) => {
                const meta = (og.metadata || {}) as { type?: string; options?: Array<{ label?: string; price_delta_paise?: number }> };
                return (
                  <div key={og.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{og.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Type: {meta.type || "radio"} ·{" "}
                        {(meta.options || []).map((o) => `${o.label} (+₹${((o.price_delta_paise || 0) / 100).toFixed(0)})`).join(", ")}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOptId(og.id ?? null);
                          setOptName(og.name || "");
                          setOptType((meta.type as "radio" | "checkbox" | "select") || "radio");
                          setOptChoices(
                            (meta.options || []).length > 0
                              ? (meta.options || []).map((o) => ({
                                  label: o.label || "",
                                  price_delta_paise: o.price_delta_paise || 0,
                                }))
                              : [{ label: "Default", price_delta_paise: 0 }]
                          );
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                        aria-label={`Edit ${og.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminApi.deletePreset(og.id!).then(() => {
                            toast("success", "Option group removed");
                            qc.invalidateQueries({ queryKey: ["presets", "option_group"] });
                          })
                        }
                        className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                        aria-label={`Delete ${og.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : tab === "info-field-group" ? (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveInfoFieldGroupMut.mutate();
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <p className="font-bold text-sm">Create Reusable Personalization Information Field Group</p>
              <div>
                <label className="block font-semibold mb-1">Group Title *</label>
                <input
                  required
                  value={ifgName}
                  onChange={(e) => setIfgName(e.target.value)}
                  placeholder="e.g. Cake Message & Photo Upload"
                  className="w-full sm:w-96 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Fields in Group</span>
                  <button
                    type="button"
                    onClick={() =>
                      setIfgFields((f) => [
                        ...f,
                        { key: `field_${f.length + 1}`, label: "", type: "text", required: false },
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                  >
                    + Add Input Field
                  </button>
                </div>
                {ifgFields.map((fld, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      value={fld.label}
                      placeholder="Field Label"
                      onChange={(e) =>
                        setIfgFields((prev) =>
                          prev.map((x, j) => (j === idx ? { ...x, label: e.target.value } : x))
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    <select
                      value={fld.type}
                      onChange={(e) =>
                        setIfgFields((prev) =>
                          prev.map((x, j) => (j === idx ? { ...x, type: e.target.value } : x))
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <option value="text">Text Input</option>
                      <option value="photo">Photo Upload</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="colour">Color Swatch</option>
                    </select>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={fld.required}
                        onChange={(e) =>
                          setIfgFields((prev) =>
                            prev.map((x, j) => (j === idx ? { ...x, required: e.target.checked } : x))
                          )
                        }
                      />
                      Required on Storefront
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saveInfoFieldGroupMut.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
                >
                  <Plus size={13} /> {editingIfgId ? "Update Field Group" : "Save Field Group"}
                </button>
                {editingIfgId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingIfgId(null);
                      setIfgName("");
                      setIfgFields([{ key: "cake_message", label: "Message on Cake", type: "text", required: false }]);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {infoFieldGroups.map((fg) => {
                const meta = (fg.metadata || {}) as { fields?: Array<{ key?: string; label?: string; type?: string; required?: boolean }> };
                return (
                  <div key={fg.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{fg.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Fields: {(meta.fields || []).map((f) => `${f.label} (${f.type})`).join(", ") || "—"}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingIfgId(fg.id ?? null);
                          setIfgName(fg.name || "");
                          setIfgFields(
                            (meta.fields || []).length > 0
                              ? (meta.fields || []).map((f, idx) => ({
                                  key: f.key || `field_${idx + 1}`,
                                  label: f.label || "",
                                  type: f.type || "text",
                                  required: Boolean(f.required),
                                }))
                              : [{ key: "field_1", label: "", type: "text", required: false }]
                          );
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                        aria-label={`Edit ${fg.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminApi.deletePreset(fg.id!).then(() => {
                            toast("success", "Field group removed");
                            qc.invalidateQueries({ queryKey: ["presets", "info_field_group"] });
                          })
                        }
                        className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                        aria-label={`Delete ${fg.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : tab === "products" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search name or SKU..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-52"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">All Types</option>
                  {PRODUCT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setBulkOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-white font-semibold cursor-pointer"
                  >
                    <SlidersHorizontal size={12} /> Bulk Edit ({selectedIds.size})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    adminApi.exportProductsCSV({
                      search: search || undefined,
                      product_type: typeFilter || undefined,
                      status: statusFilter || undefined,
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  <Download size={12} /> Export
                </button>
                <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer">
                  <Upload size={12} /> Import CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) importCsvMut.mutate(f);
                    }}
                  />
                </label>
                <PermissionGuard module="product" requireWrite fallback={null}>
                  <button
                    type="button"
                    onClick={openNewProduct}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
                  >
                    <Plus size={14} /> Add Product
                  </button>
                </PermissionGuard>
              </div>
            </div>

            <DataTable
              columns={columns}
              rows={prodData?.items || []}
              rowKey={(p) => p.id!}
              loading={prodLoading}
              emptyText="No products found"
              page={prodData?.meta?.page || page}
              totalPages={prodData?.meta?.total_pages || 1}
              total={prodData?.meta?.total || 0}
              onPageChange={setPage}
              sortBy={sortBy}
              onSort={(k) => setSortBy(k)}
              selectable
              selectedKeys={selectedIds}
              onToggleRow={(k) =>
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(k)) next.delete(k);
                  else next.add(k);
                  return next;
                })
              }
              onToggleAll={(checked) =>
                setSelectedIds(
                  checked
                    ? new Set((prodData?.items || []).map((p) => p.id!))
                    : new Set()
                )
              }
            />
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search addons..."
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-52"
                />
                <select
                  value={addonCatFilter}
                  onChange={(e) => setAddonCatFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="">All Addon Categories</option>
                  {flatCats
                    .filter((c) => c.kind === "addon")
                    .map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingAddon(null);
                  setAddonForm({ name: "", slug: "", image_url: "", price_rs: 299, addon_category_id: addonCatFilter, is_active: true });
                  setAddonModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white text-xs font-semibold cursor-pointer"
              >
                <Plus size={14} /> Add Addon
              </button>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">Addon</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {addonsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        Loading addons...
                      </td>
                    </tr>
                  ) : (
                    (addonsData?.items || [])
                      .filter((a) => !addonCatFilter || String(a.addon_category_id || "") === addonCatFilter)
                      .map((a) => {
                        const catName = flatCats.find((c) => c.id === a.addon_category_id)?.name;
                        return (
                          <tr key={a.id}>
                            <td className="px-4 py-3 font-semibold">
                              <div className="flex items-center gap-2.5">
                                {a.image_url ? (
                                  <img
                                    src={a.image_url}
                                    alt={a.name}
                                    className="w-8 h-8 rounded-lg object-cover bg-slate-100 shrink-0"
                                  />
                                ) : null}
                                <div>
                                  <p>{a.name}</p>
                                  <p className="text-[10px] font-normal text-slate-400 font-mono">{a.slug}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {catName ? (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                  {catName}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">{rs(a.price_paise)}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  a.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {a.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddon(a);
                                setAddonForm({
                                  name: a.name || "",
                                  slug: a.slug || "",
                                  image_url: a.image_url || "",
                                  price_rs: (a.price_paise ?? 0) / 100,
                                  addon_category_id: a.addon_category_id ? String(a.addon_category_id) : "",
                                  is_active: a.is_active ?? true,
                                });
                                setAddonModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                adminApi.deleteAddon(a.id!).then(() => {
                                  toast("success", "Addon deleted");
                                  qc.invalidateQueries({ queryKey: ["addons"] });
                                })
                              }
                              className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Multi-tab Product Builder Modal */}
        <FormModal
          open={builderOpen}
          title={editingId ? `Edit Product · ${draft.name}` : "Add New Product / Service"}
          subtitle="Includes autosaved local drafts, auto-computed discount %, variants, personalization & inclusions"
          onClose={() => setBuilderOpen(false)}
          maxWidthClass="max-w-4xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveProductMut.mutate();
            }}
            className="space-y-4 text-xs"
          >
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              {(["basic", "media", "variants", "custom", "seo"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBuilderTab(t)}
                  className={`px-3 py-1.5 rounded-lg font-semibold capitalize cursor-pointer ${
                    builderTab === t
                      ? "bg-[#4f6ef7] text-white"
                      : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {t === "custom" ? "Personalization & Decor" : t === "seo" ? "Categories & SEO" : t}
                </button>
              ))}
            </div>

            {builderTab === "basic" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Product Name *</label>
                    <input
                      required
                      value={draft.name}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">SKU *</label>
                    <input
                      required
                      value={draft.sku}
                      onChange={(e) => updateDraft({ sku: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Product Type</label>
                    <select
                      value={draft.product_type}
                      onChange={(e) => updateDraft({ product_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      {PRODUCT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Status</label>
                    <select
                      value={draft.status}
                      onChange={(e) => updateDraft({ status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">MRP (INR) *</label>
                    <input
                      type="number"
                      min={1}
                      value={draft.mrp_rupees}
                      onChange={(e) => updateDraft({ mrp_rupees: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      Selling Price (INR) · Auto Discount:{" "}
                      <span className="text-emerald-600">{computedDiscount}% OFF</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={draft.selling_price_rupees}
                      onChange={(e) =>
                        updateDraft({ selling_price_rupees: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Stock Qty</label>
                    <input
                      type="number"
                      min={0}
                      value={draft.stock_qty}
                      onChange={(e) => updateDraft({ stock_qty: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      Lead Time Days (0 = Same Day)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={draft.lead_time_days}
                      onChange={(e) =>
                        updateDraft({ lead_time_days: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Delivery Type</label>
                    <select
                      value={draft.delivery_type_id ?? ""}
                      onChange={(e) =>
                        updateDraft({ delivery_type_id: e.target.value ? Number(e.target.value) : undefined })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="">Default Slot</option>
                      {deliveryTypes.map((dt) => (
                        <option key={dt.id} value={dt.id}>
                          {dt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Same-Day Cutoff Time</label>
                    <input
                      type="time"
                      value={draft.cutoff_time}
                      onChange={(e) => updateDraft({ cutoff_time: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">GST Rate (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={28}
                      value={draft.gst_rate_percent}
                      onChange={(e) => updateDraft({ gst_rate_percent: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Cancellation Policy</label>
                    <select
                      value={draft.cancellation_policy_preset_id ?? ""}
                      onChange={(e) =>
                        updateDraft({
                          cancellation_policy_preset_id: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="">Default Policy</option>
                      {cancellationPolicies.map((cp) => (
                        <option key={cp.id} value={cp.id}>
                          {cp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Rating Avg (1.0 - 5.0)</label>
                    <input
                      type="number"
                      step="0.1"
                      min={1}
                      max={5}
                      value={draft.rating_avg}
                      onChange={(e) => updateDraft({ rating_avg: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Ratings Count</label>
                    <input
                      type="number"
                      min={0}
                      value={draft.ratings_count}
                      onChange={(e) => updateDraft({ ratings_count: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 pt-1">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.is_eggless}
                      onChange={(e) => updateDraft({ is_eggless: e.target.checked })}
                    />
                    Eggless
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.has_veg_nonveg}
                      onChange={(e) => updateDraft({ has_veg_nonveg: e.target.checked })}
                    />
                    Show Veg / Non-Veg Selector
                  </label>
                  {draft.has_veg_nonveg && (
                    <div className="inline-flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold">Non-Veg +₹:</span>
                      <input
                        type="number"
                        min={0}
                        value={draft.nonveg_delta_rupees}
                        onChange={(e) => updateDraft({ nonveg_delta_rupees: Number(e.target.value) })}
                        className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  )}
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.is_featured}
                      onChange={(e) => updateDraft({ is_featured: e.target.checked })}
                    />
                    Featured
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.is_trending}
                      onChange={(e) => updateDraft({ is_trending: e.target.checked })}
                    />
                    Trending
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.available_all_cities}
                      onChange={(e) =>
                        updateDraft({ available_all_cities: e.target.checked })
                      }
                    />
                    Available All Cities
                  </label>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Description</label>
                  <RichTextEditor
                    value={draft.description}
                    onChange={(html) => updateDraft({ description: html })}
                  />
                </div>
              </div>
            )}

            {builderTab === "media" && (
              <ImageUploader
                value={draft.images}
                onChange={(images) => updateDraft({ images })}
              />
            )}

            {builderTab === "variants" && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">Weight / Size Variants</p>
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft({
                          variants: [
                            ...draft.variants,
                            {
                              label: "1 Kg",
                              sku_suffix: "1KG",
                              mrp_paise: Math.round(draft.mrp_rupees * 100),
                              price_paise: Math.round(draft.selling_price_rupees * 100),
                              stock_qty: 20,
                              sort_order: draft.variants.length,
                              is_active: true,
                            },
                          ],
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                    >
                      + Add Variant
                    </button>
                  </div>
                  {draft.variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-6 gap-2 items-center">
                      <input
                        value={v.label}
                        placeholder="Label (500g)"
                        onChange={(e) => {
                          const next = [...draft.variants];
                          next[i] = { ...next[i], label: e.target.value };
                          updateDraft({ variants: next });
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                      <input
                        value={v.sku_suffix}
                        placeholder="SKU Suffix"
                        onChange={(e) => {
                          const next = [...draft.variants];
                          next[i] = { ...next[i], sku_suffix: e.target.value };
                          updateDraft({ variants: next });
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                      <input
                        type="number"
                        value={(v.mrp_paise ?? 0) / 100}
                        placeholder="MRP (INR)"
                        onChange={(e) => {
                          const next = [...draft.variants];
                          next[i] = { ...next[i], mrp_paise: Math.round(Number(e.target.value) * 100) };
                          updateDraft({ variants: next });
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                      <input
                        type="number"
                        value={(v.price_paise ?? 0) / 100}
                        placeholder="Selling (INR)"
                        onChange={(e) => {
                          const next = [...draft.variants];
                          next[i] = { ...next[i], price_paise: Math.round(Number(e.target.value) * 100) };
                          updateDraft({ variants: next });
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                      <input
                        type="number"
                        value={v.stock_qty}
                        placeholder="Stock"
                        onChange={(e) => {
                          const next = [...draft.variants];
                          next[i] = { ...next[i], stock_qty: Number(e.target.value) };
                          updateDraft({ variants: next });
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft({
                            variants: draft.variants.filter((_, idx) => idx !== i),
                          })
                        }
                        className="text-red-500 font-semibold cursor-pointer text-left"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Product Option Groups (e.g. Weight Tiers, Rose Stems) */}
                <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <p className="font-semibold">Product Option Groups (Linked to Storefront Options)</p>
                    <div className="flex items-center gap-2">
                      {optionGroups.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const og = optionGroups.find((x) => String(x.id) === e.target.value);
                            if (!og) return;
                            const meta = (og.metadata || {}) as { type?: string; required?: boolean; options?: unknown[] };
                            updateDraft({
                              option_groups: [
                                ...draft.option_groups,
                                {
                                  name: og.name || "",
                                  selection_type: meta.type || "radio",
                                  options_json: (meta.options || []) as unknown as ProductOptionGroup["options_json"],
                                  is_required: Boolean(meta.required),
                                  sort_order: draft.option_groups.length,
                                },
                              ],
                            });
                            e.target.value = "";
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <option value="">Import Reusable Option Group...</option>
                          {optionGroups.map((og) => (
                            <option key={og.id} value={og.id}>
                              + {og.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft({
                            option_groups: [
                              ...draft.option_groups,
                              {
                                name: "Custom Choice",
                                selection_type: "radio",
                                options_json: [{ label: "Standard", price_delta_paise: 0 }] as unknown as ProductOptionGroup["options_json"],
                                is_required: false,
                                sort_order: draft.option_groups.length,
                              },
                            ],
                          })
                        }
                        className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                      >
                        + Add Option Group
                      </button>
                    </div>
                  </div>
                  {draft.option_groups.map((og, idx) => {
                    const opts = Array.isArray(og.options_json) ? (og.options_json as Array<{ label?: string; price_delta_paise?: number }>) : [];
                    return (
                      <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex gap-2 items-center">
                          <input
                            value={og.name || ""}
                            placeholder="Group title (e.g. Cake Weight)"
                            onChange={(e) => {
                              const next = [...draft.option_groups];
                              next[idx] = { ...next[idx], name: e.target.value };
                              updateDraft({ option_groups: next });
                            }}
                            className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 font-semibold"
                          />
                          <select
                            value={og.selection_type || "radio"}
                            onChange={(e) => {
                              const next = [...draft.option_groups];
                              next[idx] = { ...next[idx], selection_type: e.target.value };
                              updateDraft({ option_groups: next });
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200"
                          >
                            <option value="radio">Radio</option>
                            <option value="select">Select</option>
                            <option value="checkbox">Checkbox</option>
                          </select>
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={Boolean(og.is_required)}
                              onChange={(e) => {
                                const next = [...draft.option_groups];
                                next[idx] = { ...next[idx], is_required: e.target.checked };
                                updateDraft({ option_groups: next });
                              }}
                            />
                            Required
                          </label>
                          <button
                            type="button"
                            onClick={() => updateDraft({ option_groups: draft.option_groups.filter((_, j) => j !== idx) })}
                            className="text-red-500 font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Choices: {opts.map((o) => `${o.label} (+₹${((o.price_delta_paise || 0) / 100).toFixed(0)})`).join(", ") || "None"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {builderTab === "custom" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <p className="font-semibold">Personalization Fields (Text / Photo / Color)</p>
                    <div className="flex items-center gap-2">
                      {infoFieldGroups.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const fg = infoFieldGroups.find((x) => String(x.id) === e.target.value);
                            if (!fg) return;
                            const meta = (fg.metadata || {}) as {
                              fields?: Array<{ key?: string; label?: string; type?: string; required?: boolean; placeholder?: string }>;
                            };
                            const added = (meta.fields || []).map((f, idx) => ({
                              field_key: f.key || `field_${draft.personalization.length + idx + 1}`,
                              label: f.label || "",
                              field_type: f.type || "text",
                              placeholder: f.placeholder || "",
                              is_required: Boolean(f.required),
                              extra_price_paise: 0,
                              sort_order: draft.personalization.length + idx,
                            }));
                            updateDraft({ personalization: [...draft.personalization, ...added] });
                            e.target.value = "";
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200"
                        >
                          <option value="">Apply Info Field Group...</option>
                          {infoFieldGroups.map((fg) => (
                            <option key={fg.id} value={fg.id}>
                              + {fg.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft({
                            personalization: [
                              ...draft.personalization,
                              {
                                field_key: `field_${draft.personalization.length + 1}`,
                                label: "Cake Message",
                                field_type: "text",
                                placeholder: "Happy Birthday!",
                                is_required: false,
                                extra_price_paise: 0,
                                sort_order: draft.personalization.length,
                              },
                            ],
                          })
                        }
                        className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                      >
                        + Add Field
                      </button>
                    </div>
                  </div>
                  {draft.personalization.map((pf, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2 items-center">
                      <input
                        value={pf.label}
                        placeholder="Label"
                        onChange={(e) => {
                          const next = [...draft.personalization];
                          next[i] = { ...next[i], label: e.target.value };
                          updateDraft({ personalization: next });
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200"
                      />
                      <input
                        value={pf.placeholder || ""}
                        placeholder="Placeholder"
                        onChange={(e) => {
                          const next = [...draft.personalization];
                          next[i] = { ...next[i], placeholder: e.target.value };
                          updateDraft({ personalization: next });
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200"
                      />
                      <select
                        value={pf.field_type}
                        onChange={(e) => {
                          const next = [...draft.personalization];
                          next[i] = { ...next[i], field_type: e.target.value };
                          updateDraft({ personalization: next });
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200"
                      >
                        <option value="text">Text</option>
                        <option value="photo">Photo Upload</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="colour">Balloon Color</option>
                      </select>
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={Boolean(pf.is_required)}
                          onChange={(e) => {
                            const next = [...draft.personalization];
                            next[i] = { ...next[i], is_required: e.target.checked };
                            updateDraft({ personalization: next });
                          }}
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft({
                            personalization: draft.personalization.filter((_, idx) => idx !== i),
                          })
                        }
                        className="text-red-500 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">Decoration Inclusions / What&apos;s Included</p>
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft({
                          inclusions: [
                            ...draft.inclusions,
                            {
                              kind: "included",
                              item_text: "100 Metallic Balloons with Arch",
                              sort_order: draft.inclusions.length,
                            },
                          ],
                        })
                      }
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                    >
                      + Add Inclusion Row
                    </button>
                  </div>
                  {draft.inclusions.map((inc, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={inc.kind}
                        onChange={(e) => {
                          const next = [...draft.inclusions];
                          next[i] = { ...next[i], kind: e.target.value };
                          updateDraft({ inclusions: next });
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200"
                      >
                        <option value="included">Included</option>
                        <option value="not_included">Not Included</option>
                      </select>
                      <input
                        value={inc.item_text}
                        onChange={(e) => {
                          const next = [...draft.inclusions];
                          next[i] = { ...next[i], item_text: e.target.value };
                          updateDraft({ inclusions: next });
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft({
                            inclusions: draft.inclusions.filter((_, idx) => idx !== i),
                          })
                        }
                        className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                        aria-label="Remove inclusion row"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {builderTab === "seo" && (
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1">Assign Categories</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    {flatCats.filter((c) => c.kind !== "addon").map((c) => {
                      const active = draft.category_ids.includes(c.id!);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            updateDraft({
                              category_ids: active
                                ? draft.category_ids.filter((id) => id !== c.id)
                                : [...draft.category_ids, c.id!],
                            })
                          }
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                            active
                              ? "bg-[#4f6ef7] text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Link Checkout Addons</label>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    {(addonsData?.items || []).map((a) => {
                      const active = draft.addon_ids.includes(a.id!);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() =>
                            updateDraft({
                              addon_ids: active
                                ? draft.addon_ids.filter((id) => id !== a.id)
                                : [...draft.addon_ids, a.id!],
                            })
                          }
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                            active
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                          }`}
                        >
                          + {a.name} ({rs(a.price_paise)})
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Filter Attributes / Presets (Occasion, Flavour, Color, Label)</label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    {filterPresets.map((pr) => {
                      const active = draft.preset_ids.includes(pr.id!);
                      return (
                        <button
                          key={pr.id}
                          type="button"
                          onClick={() =>
                            updateDraft({
                              preset_ids: active
                                ? draft.preset_ids.filter((id) => id !== pr.id)
                                : [...draft.preset_ids, pr.id!],
                            })
                          }
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                            active
                              ? "bg-amber-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                          }`}
                        >
                          {pr.preset_type}: {pr.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold">Per-City Availability &amp; Price Overrides</label>
                    <button
                      type="button"
                      onClick={() => {
                        const firstCity = cities[0];
                        if (!firstCity?.id) return;
                        updateDraft({
                          city_overrides: [
                            ...draft.city_overrides,
                            { city_id: firstCity.id, is_available: true },
                          ],
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold cursor-pointer"
                    >
                      + Add City Override
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {draft.city_overrides.map((ov, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                        <select
                          value={ov.city_id}
                          onChange={(e) => {
                            const next = [...draft.city_overrides];
                            next[idx] = { ...next[idx], city_id: Number(e.target.value) };
                            updateDraft({ city_overrides: next });
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-200"
                        >
                          {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Custom Price INR"
                          value={ov.price_override_paise ? Math.round(ov.price_override_paise / 100) : ""}
                          onChange={(e) => {
                            const next = [...draft.city_overrides];
                            next[idx] = {
                              ...next[idx],
                              price_override_paise: e.target.value ? Math.round(Number(e.target.value) * 100) : undefined,
                            };
                            updateDraft({ city_overrides: next });
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-200"
                        />
                        <input
                          type="number"
                          placeholder="Delivery Fee INR"
                          value={ov.delivery_charge_paise ? Math.round(ov.delivery_charge_paise / 100) : ""}
                          onChange={(e) => {
                            const next = [...draft.city_overrides];
                            next[idx] = {
                              ...next[idx],
                              delivery_charge_paise: e.target.value ? Math.round(Number(e.target.value) * 100) : undefined,
                            };
                            updateDraft({ city_overrides: next });
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-200"
                        />
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={Boolean(ov.is_available)}
                            onChange={(e) => {
                              const next = [...draft.city_overrides];
                              next[idx] = { ...next[idx], is_available: e.target.checked };
                              updateDraft({ city_overrides: next });
                            }}
                          />
                          Available
                        </label>
                        <button
                          type="button"
                          onClick={() => updateDraft({ city_overrides: draft.city_overrides.filter((_, j) => j !== idx) })}
                          className="text-red-500 font-semibold cursor-pointer text-left"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Slug</label>
                  <input
                    value={draft.slug}
                    onChange={(e) => updateDraft({ slug: e.target.value })}
                    placeholder="Auto-generated from title if empty"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">SEO Title</label>
                  <input
                    value={draft.seo_title}
                    onChange={(e) => updateDraft({ seo_title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">SEO Meta Description</label>
                  <textarea
                    rows={3}
                    value={draft.seo_description}
                    onChange={(e) => updateDraft({ seo_description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBuilderOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveProductMut.isPending}
                className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                {saveProductMut.isPending ? "Saving..." : "Save Product"}
              </button>
            </div>
          </form>
        </FormModal>

        {/* Bulk Update Modal */}
        <FormModal
          open={bulkOpen}
          title={`Bulk Update ${selectedIds.size} Products`}
          onClose={() => setBulkOpen(false)}
          maxWidthClass="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              bulkMut.mutate();
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Change Status (optional)</label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="">Keep unchanged</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Set Selling Price INR (optional)</label>
              <input
                type="number"
                value={bulkPriceRs}
                onChange={(e) => setBulkPriceRs(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Set Stock Qty (optional)</label>
              <input
                type="number"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setBulkOpen(false)} className="px-4 py-2 rounded-xl border cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                Apply to {selectedIds.size} items
              </button>
            </div>
          </form>
        </FormModal>

        {/* Addon Modal */}
        <FormModal
          open={addonModalOpen}
          title={editingAddon ? "Edit Addon" : "Create Addon"}
          onClose={() => setAddonModalOpen(false)}
          maxWidthClass="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveAddonMut.mutate();
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Name *</label>
              <input
                required
                value={addonForm.name}
                onChange={(e) => setAddonForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Price (INR) *</label>
              <input
                type="number"
                required
                value={addonForm.price_rs}
                onChange={(e) => setAddonForm((s) => ({ ...s, price_rs: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Addon Category</label>
              <select
                value={addonForm.addon_category_id}
                onChange={(e) => setAddonForm((s) => ({ ...s, addon_category_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              >
                <option value="">Uncategorized</option>
                {flatCats
                  .filter((c) => c.kind === "addon")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Image URL</label>
              <input
                value={addonForm.image_url}
                onChange={(e) => setAddonForm((s) => ({ ...s, image_url: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={() => setAddonModalOpen(false)} className="px-4 py-2 rounded-xl border cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                Save Addon
              </button>
            </div>
          </form>
        </FormModal>

        <ConfirmDialog
          open={deleteId !== null}
          title="Delete product?"
          description="This soft-deletes the product from storefront catalog."
          confirmLabel="Delete"
          onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      </div>
    </PermissionGuard>
  );
}
