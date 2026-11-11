import type { components } from "./schema";

export type AdminProfile =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.AdminProfile"];
export type PermissionAccess =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.PermissionAccess"];
export type PermissionItem =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Permission"];
export type SidebarCounts =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.SidebarCounts"];
export type AuditEntry =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.AuditEntry"];
export type LoginResponse =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_service.LoginResponse"];
export type RoleWithPermissions =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_service.RoleWithPermissions"];
export type UsersListResponse =
  components["schemas"]["internal_handler_admin.UsersListResponse"];
export type AuditListResponse =
  components["schemas"]["internal_handler_admin.AuditListResponse"];
export type TOTPSetupResponse =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_service.TOTPSetupResponse"];
export type CreateUserInput =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_service.CreateUserInput"];
export type UpdateUserInput =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_service.UpdateUserInput"];
export type RolePermissionInput =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_service.RolePermissionInput"];
export type DashboardStats =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.DashboardStats"];
export type ProductImage =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.ProductImage"];
export type ProductVariant =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.ProductVariant"];
export type ProductOptionGroup =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.ProductOptionGroup"];
export type ProductCityOverride =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.ProductCityOverride"];
export type PersonalizationField =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.PersonalizationField"];
export type DecorationInclusion =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.DecorationInclusion"];
export type Product =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Product"] & {
    cancellation_policy_preset_id?: number;
    addons?: ProductAddon[];
  };
export interface DeliveryTypeOption {
  id: number;
  slug: string;
  name: string;
  lead_time_days: number;
  cutoff_time?: string | null;
}
export type ProductsListResponse =
  components["schemas"]["internal_handler_admin.ProductsListResponse"];
export type BulkProductUpdateItem =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.BulkProductUpdateItem"];
export type CSVImportSummary =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_service.CSVImportSummary"];
export type ProductAddon =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.ProductAddon"];
export type AddonsListResponse =
  components["schemas"]["internal_handler_admin.AddonsListResponse"];
export type Category =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Category"];
export type NavigationItem =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.NavigationItem"];
export type Order =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Order"];
export type OrdersListResponse =
  components["schemas"]["internal_handler_admin.OrdersListResponse"];
export type OrderUploadEntry =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.OrderUploadEntry"];
export type OrderUploadsResponse =
  components["schemas"]["internal_handler_admin.OrderUploadsResponse"];
export type CreateOrderInput =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.CreateOrderInput"];
export type PaymentLink =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.PaymentLink"];
export type PaymentLinksListResponse =
  components["schemas"]["internal_handler_admin.PaymentLinksListResponse"];
export type Invoice =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Invoice"];
export type InvoicesListResponse =
  components["schemas"]["internal_handler_admin.InvoicesListResponse"];
export type HeroBanner =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.HeroBanner"];
export type HomepageSection =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.HomepageSection"];
export type GeoState =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.State"];
export type City =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.City"];
export type Pincode =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Pincode"];
export type PincodesListResponse =
  components["schemas"]["internal_handler_admin.PincodesListResponse"];
export type TimeSlotTemplate =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.TimeSlotTemplate"];
export type SlotCapacityOverride =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.SlotCapacityOverride"];
export type BlackoutDate =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.BlackoutDate"];
export type DecoratorTeam =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.DecoratorTeam"];
export type Preset =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Preset"];
export type Customer =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Customer"];
export type CustomersListResponse =
  components["schemas"]["internal_handler_admin.CustomersListResponse"];
export type Coupon =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Coupon"];
export type PaymentTransaction =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.PaymentTransaction"];
export type PaymentsListResponse =
  components["schemas"]["internal_handler_admin.PaymentsListResponse"];
export type Refund =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Refund"];
export type RefundsListResponse =
  components["schemas"]["internal_handler_admin.RefundsListResponse"];
export type SettlementReport =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.SettlementReport"];
export type Review =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Review"];
export type ReviewsListResponse =
  components["schemas"]["internal_handler_admin.ReviewsListResponse"];
export type Seller =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.Seller"];
export type SellerPayout =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.SellerPayout"];
export type CMSPage =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.CMSPage"];
export type FAQ =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.FAQ"];
export type BlogCategory =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.BlogCategory"];
export type BlogPost =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.BlogPost"];
export type RecentWork =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.RecentWork"];
export type SEORedirect =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.SEORedirect"];
export type MediaFolder =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.MediaFolder"];
export type MediaAsset =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.MediaAsset"];
export type MediaListResponse =
  components["schemas"]["internal_handler_admin.MediaListResponse"];
export type ContactInquiry =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.ContactInquiry"];
export type SupportTicket =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.SupportTicket"];
export type NotificationTemplate =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.NotificationTemplate"];
export type WhatsappContact =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.WhatsappContact"];
export type WhatsappMessage =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.WhatsappMessage"];
export type MetaAdsCampaign =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.MetaAdsCampaign"];
export type SiteSetting =
  components["schemas"]["github_com_giftlaya_giftlaya-api_internal_domain.SiteSetting"];

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/+$/, "");

const TOKEN_STORAGE_KEY = "giftlaya_cms_tokens";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export function getStoredTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTokens;
    return parsed?.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: StoredTokens | null) {
  try {
    if (!tokens) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } else {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    }
  } catch {
    // ignore storage failures
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let onUnauthorizedCallback: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorizedCallback = fn;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: tokens.refreshToken }),
      });
      if (!res.ok) {
        setStoredTokens(null);
        return null;
      }
      const data = (await res.json()) as LoginResponse;
      const nextAccess = data.tokens?.access_token;
      const nextRefresh = data.tokens?.refresh_token;
      if (!nextAccess || !nextRefresh) {
        setStoredTokens(null);
        return null;
      }
      setStoredTokens({ accessToken: nextAccess, refreshToken: nextRefresh });
      return nextAccess;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { skipAuthRetry?: boolean } = {}
): Promise<T> {
  const { skipAuthRetry = false, headers, ...rest } = options;
  const tokens = getStoredTokens();

  const mergedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  if (tokens?.accessToken && !mergedHeaders.Authorization) {
    mergedHeaders.Authorization = `Bearer ${tokens.accessToken}`;
  }

  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: mergedHeaders,
  });

  if (res.status === 401 && !skipAuthRetry) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      res = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: {
          ...mergedHeaders,
          Authorization: `Bearer ${renewed}`,
        },
      });
    } else {
      setStoredTokens(null);
      onUnauthorizedCallback?.();
    }
  }

  if (res.status === 401 && !skipAuthRetry) {
    setStoredTokens(null);
    onUnauthorizedCallback?.();
  }

  const text = await res.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const errMsg =
      (payload as { error?: string; message?: string } | null)?.error ||
      (payload as { message?: string } | null)?.message ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, errMsg);
  }

  return payload as T;
}

export async function apiDownload(path: string, filename: string) {
  const tokens = getStoredTokens();
  const headers: Record<string, string> = {};
  if (tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!res.ok) throw new ApiError(res.status, `Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function apiUploadForm<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const tokens = getStoredTokens();
  const headers: Record<string, string> = {};
  if (tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  const text = await res.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const errMsg =
      (payload as { error?: string } | null)?.error ||
      `Upload failed (${res.status})`;
    throw new ApiError(res.status, errMsg);
  }
  return payload as T;
}

export const adminApi = {
  login: (body: { username: string; password: string; code: string }) =>
    apiRequest<LoginResponse>("/api/v1/admin/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      skipAuthRetry: true,
    }),

  logout: (refreshToken?: string) =>
    apiRequest<{ message?: string }>("/api/v1/admin/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken || "" }),
      skipAuthRetry: true,
    }),

  me: () => apiRequest<AdminProfile>("/api/v1/admin/auth/me"),

  changePassword: (body: { current_password: string; new_password: string }) =>
    apiRequest<{ message?: string }>("/api/v1/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  forgotPassword: (email: string) =>
    apiRequest<{ message?: string }>("/api/v1/admin/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipAuthRetry: true,
    }),

  setupTOTP: () =>
    apiRequest<TOTPSetupResponse>("/api/v1/admin/auth/totp/setup", {
      method: "POST",
    }),

  enableTOTP: (code: string) =>
    apiRequest<{ message?: string }>("/api/v1/admin/auth/totp/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  sidebarCounts: () =>
    apiRequest<SidebarCounts>("/api/v1/admin/dashboard/sidebar-counts"),

  listUsers: (params: { search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return apiRequest<UsersListResponse>(`/api/v1/admin/users?${qs.toString()}`);
  },

  createUser: (body: CreateUserInput) =>
    apiRequest<AdminProfile>("/api/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateUser: (id: number, body: UpdateUserInput) =>
    apiRequest<AdminProfile>(`/api/v1/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteUser: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/users/${id}`, {
      method: "DELETE",
    }),

  listRoles: () => apiRequest<RoleWithPermissions[]>("/api/v1/admin/roles"),

  listPermissions: () =>
    apiRequest<PermissionItem[]>("/api/v1/admin/permissions"),

  updateRolePermissions: (
    roleId: number,
    permissions: RolePermissionInput[]
  ) =>
    apiRequest<{ message?: string }>(
      `/api/v1/admin/roles/${roleId}/permissions`,
      {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      }
    ),

  listAuditLogs: (params: {
    module?: string;
    actor_id?: number;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.module) qs.set("module", params.module);
    if (params.actor_id) qs.set("actor_id", String(params.actor_id));
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return apiRequest<AuditListResponse>(
      `/api/v1/admin/audit-logs?${qs.toString()}`
    );
  },

  dashboardStats: (from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return apiRequest<DashboardStats>(
      `/api/v1/admin/dashboard/stats?${qs.toString()}`
    );
  },

  listProducts: (params: {
    search?: string;
    product_type?: string;
    status?: string;
    category_id?: number;
    sort_by?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.product_type) qs.set("product_type", params.product_type);
    if (params.status) qs.set("status", params.status);
    if (params.category_id) qs.set("category_id", String(params.category_id));
    if (params.sort_by) qs.set("sort_by", params.sort_by);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return apiRequest<ProductsListResponse>(
      `/api/v1/admin/products?${qs.toString()}`
    );
  },

  getProduct: (id: number) =>
    apiRequest<Product>(`/api/v1/admin/products/${id}`),

  createProduct: (body: Partial<Product>) =>
    apiRequest<Product>("/api/v1/admin/products", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateProduct: (id: number, body: Partial<Product>) =>
    apiRequest<Product>(`/api/v1/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteProduct: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/products/${id}`, {
      method: "DELETE",
    }),

  duplicateProduct: (id: number) =>
    apiRequest<Product>(`/api/v1/admin/products/${id}/duplicate`, {
      method: "POST",
    }),

  bulkUpdateProducts: (items: BulkProductUpdateItem[]) =>
    apiRequest<{ message?: string }>("/api/v1/admin/products/bulk-update", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),

  exportProductsCSV: (params?: { search?: string; product_type?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.product_type) qs.set("product_type", params.product_type);
    if (params?.status) qs.set("status", params.status);
    return apiDownload(
      `/api/v1/admin/products/export-csv?${qs.toString()}`,
      "giftlaya-products.csv"
    );
  },

  importProductsCSV: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiUploadForm<CSVImportSummary>("/api/v1/admin/products/import-csv", fd);
  },

  listAddons: (search?: string, page = 1, limit = 25) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) qs.set("search", search);
    return apiRequest<AddonsListResponse>(`/api/v1/admin/addons?${qs.toString()}`);
  },

  createAddon: (body: Partial<ProductAddon>) =>
    apiRequest<ProductAddon>("/api/v1/admin/addons", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateAddon: (id: number, body: Partial<ProductAddon>) =>
    apiRequest<ProductAddon>(`/api/v1/admin/addons/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteAddon: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/addons/${id}`, {
      method: "DELETE",
    }),

  listCategories: (kind?: string, search?: string, tree = true) => {
    const qs = new URLSearchParams();
    if (kind) qs.set("kind", kind);
    if (search) qs.set("search", search);
    qs.set("tree", String(tree));
    return apiRequest<Category[]>(`/api/v1/admin/categories?${qs.toString()}`);
  },

  createCategory: (body: Partial<Category>) =>
    apiRequest<Category>("/api/v1/admin/categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateCategory: (id: number, body: Partial<Category>) =>
    apiRequest<Category>(`/api/v1/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteCategory: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/categories/${id}`, {
      method: "DELETE",
    }),

  listNavigation: (tree = true) =>
    apiRequest<NavigationItem[]>(`/api/v1/admin/navigation?tree=${tree}`),

  createNavigationItem: (body: Partial<NavigationItem>) =>
    apiRequest<NavigationItem>("/api/v1/admin/navigation", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateNavigationItem: (id: number, body: Partial<NavigationItem>) =>
    apiRequest<NavigationItem>(`/api/v1/admin/navigation/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteNavigationItem: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/navigation/${id}`, {
      method: "DELETE",
    }),

  listOrders: (params: {
    status?: string;
    payment_status?: string;
    payment_method?: string;
    is_manual?: boolean;
    city_id?: number;
    category_id?: number;
    delivery_type?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    sort_by?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.payment_status) qs.set("payment_status", params.payment_status);
    if (params.payment_method) qs.set("payment_method", params.payment_method);
    if (typeof params.is_manual === "boolean") qs.set("is_manual", String(params.is_manual));
    if (params.city_id) qs.set("city_id", String(params.city_id));
    if (params.category_id) qs.set("category_id", String(params.category_id));
    if (params.delivery_type) qs.set("delivery_type", params.delivery_type);
    if (params.date_from) qs.set("date_from", params.date_from);
    if (params.date_to) qs.set("date_to", params.date_to);
    if (params.search) qs.set("search", params.search);
    if (params.sort_by) qs.set("sort_by", params.sort_by);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    return apiRequest<OrdersListResponse>(
      `/api/v1/admin/orders?${qs.toString()}`
    );
  },

  listOrderUploads: (page = 1, limit = 25) =>
    apiRequest<OrderUploadsResponse>(
      `/api/v1/admin/orders/uploads?page=${page}&limit=${limit}`
    ),

  getOrder: (idOrNumber: string | number) =>
    apiRequest<Order>(`/api/v1/admin/orders/${idOrNumber}`),

  createManualOrder: (body: CreateOrderInput) =>
    apiRequest<Order>("/api/v1/admin/orders/manual", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateOrderStatus: (id: number, status: string, reason?: string) =>
    apiRequest<Order>(`/api/v1/admin/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, reason: reason || "" }),
    }),

  assignOrder: (
    id: number,
    body: {
      decorator_team_id?: number;
      delivery_partner_name?: string;
      delivery_partner_phone?: string;
    }
  ) =>
    apiRequest<Order>(`/api/v1/admin/orders/${id}/assign`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateOrderNotes: (
    id: number,
    body: { tracking_id: string; internal_notes: string }
  ) =>
    apiRequest<Order>(`/api/v1/admin/orders/${id}/notes`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  resendOrderNotification: (id: number, event?: string) =>
    apiRequest<{ message?: string }>(
      `/api/v1/admin/orders/${id}/resend-notification`,
      {
        method: "POST",
        body: JSON.stringify({ event: event || "" }),
      }
    ),

  exportOrdersCSV: (params?: { status?: string; search?: string; date_from?: string; date_to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    return apiDownload(
      `/api/v1/admin/orders/export-csv?${qs.toString()}`,
      "giftlaya-orders.csv"
    );
  },

  getCalendarBookings: (month?: string, cityId?: number) => {
    const qs = new URLSearchParams();
    if (month) qs.set("month", month);
    if (cityId) qs.set("city_id", String(cityId));
    return apiRequest<Array<Record<string, unknown>>>(
      `/api/v1/admin/orders/calendar?${qs.toString()}`
    );
  },

  listPaymentLinks: (page = 1, limit = 25) =>
    apiRequest<PaymentLinksListResponse>(
      `/api/v1/admin/payment-links?page=${page}&limit=${limit}`
    ),

  createPaymentLink: (body: Partial<PaymentLink>) =>
    apiRequest<PaymentLink>("/api/v1/admin/payment-links", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listInvoices: (page = 1, limit = 25) =>
    apiRequest<InvoicesListResponse>(
      `/api/v1/admin/invoices?page=${page}&limit=${limit}`
    ),

  getOrderInvoice: (orderId: number) =>
    apiRequest<Invoice>(`/api/v1/admin/orders/${orderId}/invoice`),

  downloadInvoicePDF: (orderId: number, orderNumber?: string) =>
    apiDownload(
      `/api/v1/admin/orders/${orderId}/invoice/pdf`,
      `${orderNumber || `invoice-${orderId}`}.pdf`
    ),

  listHeroBanners: () =>
    apiRequest<HeroBanner[]>("/api/v1/admin/hero-banners"),

  saveHeroBanner: (body: Partial<HeroBanner>) =>
    apiRequest<HeroBanner>("/api/v1/admin/hero-banners", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteHeroBanner: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/hero-banners/${id}`, {
      method: "DELETE",
    }),

  listHomepageSections: () =>
    apiRequest<HomepageSection[]>("/api/v1/admin/homepage-sections"),

  saveHomepageSection: (body: Partial<HomepageSection>) =>
    apiRequest<HomepageSection>("/api/v1/admin/homepage-sections", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteHomepageSection: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/homepage-sections/${id}`, {
      method: "DELETE",
    }),

  listStates: () => apiRequest<GeoState[]>("/api/v1/admin/states"),
  saveState: (body: Partial<GeoState>) =>
    apiRequest<GeoState>("/api/v1/admin/states", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listCities: (search?: string) =>
    apiRequest<City[]>(
      `/api/v1/admin/cities${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),

  listDeliveryTypes: () =>
    apiRequest<DeliveryTypeOption[]>("/api/v1/public/delivery-types"),

  saveCity: (body: Partial<City>) =>
    apiRequest<City>("/api/v1/admin/cities", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listPincodes: (cityId?: number, search?: string, page = 1) => {
    const qs = new URLSearchParams({ page: String(page), limit: "50" });
    if (cityId) qs.set("city_id", String(cityId));
    if (search) qs.set("search", search);
    return apiRequest<PincodesListResponse>(
      `/api/v1/admin/pincodes?${qs.toString()}`
    );
  },

  savePincode: (body: Partial<Pincode>) =>
    apiRequest<Pincode>("/api/v1/admin/pincodes", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deletePincode: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/pincodes/${id}`, {
      method: "DELETE",
    }),

  listTimeSlots: () => apiRequest<TimeSlotTemplate[]>("/api/v1/admin/time-slots"),
  saveTimeSlot: (body: Partial<TimeSlotTemplate>) =>
    apiRequest<TimeSlotTemplate>("/api/v1/admin/time-slots", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listSlotCapacity: (cityId: number, date: string) =>
    apiRequest<SlotCapacityOverride[]>(
      `/api/v1/admin/slot-capacity?city_id=${cityId}&date=${encodeURIComponent(date)}`
    ),

  upsertSlotCapacity: (body: Partial<SlotCapacityOverride>) =>
    apiRequest<SlotCapacityOverride>("/api/v1/admin/slot-capacity", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listBlackoutDates: (cityId?: number) =>
    apiRequest<BlackoutDate[]>(
      `/api/v1/admin/blackout-dates${cityId ? `?city_id=${cityId}` : ""}`
    ),

  saveBlackoutDate: (body: Partial<BlackoutDate>) =>
    apiRequest<BlackoutDate>("/api/v1/admin/blackout-dates", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteBlackoutDate: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/blackout-dates/${id}`, {
      method: "DELETE",
    }),

  listDecoratorTeams: (cityId?: number) =>
    apiRequest<DecoratorTeam[]>(
      `/api/v1/admin/decorator-teams${cityId ? `?city_id=${cityId}` : ""}`
    ),

  saveDecoratorTeam: (body: Partial<DecoratorTeam>) =>
    apiRequest<DecoratorTeam>("/api/v1/admin/decorator-teams", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listPresets: (type?: string, search?: string) => {
    const qs = new URLSearchParams();
    if (type) qs.set("type", type);
    if (search) qs.set("search", search);
    return apiRequest<Preset[]>(`/api/v1/admin/presets?${qs.toString()}`);
  },

  savePreset: (body: Partial<Preset>) =>
    apiRequest<Preset>("/api/v1/admin/presets", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deletePreset: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/presets/${id}`, {
      method: "DELETE",
    }),

  listCustomers: (search?: string, page = 1, limit = 25) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) qs.set("search", search);
    return apiRequest<CustomersListResponse>(
      `/api/v1/admin/customers?${qs.toString()}`
    );
  },

  getCustomer: (id: number) =>
    apiRequest<Customer>(`/api/v1/admin/customers/${id}`),

  blockCustomer: (id: number, is_blocked: boolean) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/customers/${id}/block`, {
      method: "PUT",
      body: JSON.stringify({ is_blocked }),
    }),

  adjustCustomerCoins: (id: number, delta: number, note: string) =>
    apiRequest<{ balance_coins: number }>(`/api/v1/admin/customers/${id}/coins`, {
      method: "POST",
      body: JSON.stringify({ delta, note }),
    }),

  listCoupons: (search?: string) =>
    apiRequest<Coupon[]>(
      `/api/v1/admin/coupons${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),

  saveCoupon: (body: Partial<Coupon>) =>
    apiRequest<Coupon>("/api/v1/admin/coupons", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteCoupon: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/coupons/${id}`, {
      method: "DELETE",
    }),

  listPayments: (status?: string, page = 1) => {
    const qs = new URLSearchParams({ page: String(page), limit: "25" });
    if (status) qs.set("status", status);
    return apiRequest<PaymentsListResponse>(
      `/api/v1/admin/payments?${qs.toString()}`
    );
  },

  listRefunds: (page = 1) =>
    apiRequest<RefundsListResponse>(
      `/api/v1/admin/refunds?page=${page}&limit=25`
    ),

  createRefund: (body: { order_id: number; amount_paise?: number; reason: string }) =>
    apiRequest<Refund>("/api/v1/admin/refunds", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getSettlementReport: (from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return apiRequest<SettlementReport>(
      `/api/v1/admin/payments/settlement?${qs.toString()}`
    );
  },

  listReviews: (status?: string, page = 1) => {
    const qs = new URLSearchParams({ page: String(page), limit: "25" });
    if (status) qs.set("status", status);
    return apiRequest<ReviewsListResponse>(
      `/api/v1/admin/reviews?${qs.toString()}`
    );
  },

  moderateReview: (
    id: number,
    body: { status: string; admin_reply?: string; is_featured_home: boolean }
  ) =>
    apiRequest<Review>(`/api/v1/admin/reviews/${id}/moderate`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  listSellers: (kycStatus?: string) =>
    apiRequest<Seller[]>(
      `/api/v1/admin/sellers${kycStatus ? `?kyc_status=${kycStatus}` : ""}`
    ),

  saveSeller: (body: Partial<Seller>) =>
    apiRequest<Seller>("/api/v1/admin/sellers", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateSellerKYC: (id: number, kyc_status: string, commission_percent: number) =>
    apiRequest<Seller>(`/api/v1/admin/sellers/${id}/kyc`, {
      method: "PUT",
      body: JSON.stringify({ kyc_status, commission_percent }),
    }),

  approveSellerProduct: (productId: number, status: string) =>
    apiRequest<{ message?: string }>(
      `/api/v1/admin/sellers/products/${productId}/approve?status=${encodeURIComponent(status)}`,
      { method: "PUT" }
    ),

  listSellerPayouts: (sellerId?: number) =>
    apiRequest<SellerPayout[]>(
      `/api/v1/admin/seller-payouts${sellerId ? `?seller_id=${sellerId}` : ""}`
    ),

  createSellerPayout: (body: Partial<SellerPayout>) =>
    apiRequest<SellerPayout>("/api/v1/admin/seller-payouts", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  markPayoutPaid: (id: number, utr_number: string) =>
    apiRequest<SellerPayout>(`/api/v1/admin/seller-payouts/${id}/pay`, {
      method: "PUT",
      body: JSON.stringify({ utr_number }),
    }),

  listCMSPages: (pageType?: string) =>
    apiRequest<CMSPage[]>(
      `/api/v1/admin/cms-pages${pageType ? `?page_type=${pageType}` : ""}`
    ),

  saveCMSPage: (body: Partial<CMSPage>) =>
    apiRequest<CMSPage>("/api/v1/admin/cms-pages", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listFAQs: (scope?: string) =>
    apiRequest<FAQ[]>(`/api/v1/admin/faqs${scope ? `?scope_type=${scope}` : ""}`),

  saveFAQ: (body: Partial<FAQ>) =>
    apiRequest<FAQ>("/api/v1/admin/faqs", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listBlogCategories: () => apiRequest<BlogCategory[]>("/api/v1/admin/blog/categories"),
  saveBlogCategory: (body: Partial<BlogCategory>) =>
    apiRequest<BlogCategory>("/api/v1/admin/blog/categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listBlogPosts: (status?: string) =>
    apiRequest<BlogPost[]>(`/api/v1/admin/blog/posts${status ? `?status=${status}` : ""}`),

  saveBlogPost: (body: Partial<BlogPost>) =>
    apiRequest<BlogPost>("/api/v1/admin/blog/posts", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteBlogPost: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/blog/posts/${id}`, {
      method: "DELETE",
    }),

  deleteCMSPage: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/cms-pages/${id}`, {
      method: "DELETE",
    }),

  deleteFAQ: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/faqs/${id}`, {
      method: "DELETE",
    }),

  deleteRecentWork: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/recent-works/${id}`, {
      method: "DELETE",
    }),

  createReview: (body: Partial<Review>) =>
    apiRequest<Review>("/api/v1/admin/reviews", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteReview: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/reviews/${id}`, {
      method: "DELETE",
    }),

  listRecentWorks: (categorySlug?: string) =>
    apiRequest<RecentWork[]>(
      `/api/v1/admin/recent-works${categorySlug ? `?category_slug=${categorySlug}` : ""}`
    ),

  saveRecentWork: (body: Partial<RecentWork>) =>
    apiRequest<RecentWork>("/api/v1/admin/recent-works", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listSEORedirects: () => apiRequest<SEORedirect[]>("/api/v1/admin/seo-redirects"),
  saveSEORedirect: (body: Partial<SEORedirect>) =>
    apiRequest<SEORedirect>("/api/v1/admin/seo-redirects", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteSEORedirect: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/seo-redirects/${id}`, {
      method: "DELETE",
    }),

  listMediaAssets: (folderId?: number, search?: string, page = 1) => {
    const qs = new URLSearchParams({ page: String(page), limit: "30" });
    if (folderId) qs.set("folder_id", String(folderId));
    if (search) qs.set("search", search);
    return apiRequest<MediaListResponse>(`/api/v1/admin/media?${qs.toString()}`);
  },

  uploadMedia: (file: File, folder = "general", altText = "") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    fd.append("alt_text", altText);
    return apiUploadForm<MediaAsset>("/api/v1/admin/media/upload", fd);
  },

  deleteMediaAsset: (id: number) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/media/${id}`, {
      method: "DELETE",
    }),

  listInquiries: (type?: string, status?: string) => {
    const qs = new URLSearchParams();
    if (type) qs.set("type", type);
    if (status) qs.set("status", status);
    return apiRequest<ContactInquiry[]>(`/api/v1/admin/inquiries?${qs.toString()}`);
  },

  updateInquiryStatus: (id: number, status: string) =>
    apiRequest<{ message?: string }>(`/api/v1/admin/inquiries/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  listSupportTickets: (status?: string) =>
    apiRequest<SupportTicket[]>(
      `/api/v1/admin/support-tickets${status ? `?status=${status}` : ""}`
    ),

  replySupportTicket: (id: number, text: string, status = "in_progress") =>
    apiRequest<SupportTicket>(`/api/v1/admin/support-tickets/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ text, status }),
    }),

  listWhatsappContacts: () =>
    apiRequest<WhatsappContact[]>("/api/v1/admin/whatsapp/contacts"),

  saveWhatsappContact: (body: { phone: string; name?: string }) =>
    apiRequest<WhatsappContact>("/api/v1/admin/whatsapp/contacts", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listWhatsappMessages: (contactId: number) =>
    apiRequest<WhatsappMessage[]>(
      `/api/v1/admin/whatsapp/contacts/${contactId}/messages`
    ),

  sendWhatsappMessage: (contactId: number, body: string) =>
    apiRequest<WhatsappMessage>(
      `/api/v1/admin/whatsapp/contacts/${contactId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ body }),
      }
    ),

  listNotificationTemplates: () =>
    apiRequest<NotificationTemplate[]>("/api/v1/admin/notification-templates"),

  saveNotificationTemplate: (body: Partial<NotificationTemplate>) =>
    apiRequest<NotificationTemplate>("/api/v1/admin/notification-templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listMetaAds: () => apiRequest<MetaAdsCampaign[]>("/api/v1/admin/meta-ads"),
  saveMetaAds: (body: Partial<MetaAdsCampaign>) =>
    apiRequest<MetaAdsCampaign>("/api/v1/admin/meta-ads", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listSiteSettings: (group?: string) =>
    apiRequest<SiteSetting[]>(
      `/api/v1/admin/settings${group ? `?group=${group}` : ""}`
    ),

  upsertSiteSetting: (key: string, group_name: string, value_json: unknown) =>
    apiRequest<SiteSetting>("/api/v1/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ key, group_name, value_json }),
    }),

  downloadBackupJSON: () =>
    apiDownload("/api/v1/admin/settings/backup", "giftlaya-backup.json"),
};

