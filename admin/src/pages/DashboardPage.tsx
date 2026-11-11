import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  IndianRupee,
  TrendingUp,
  Users,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  MapPin,
  Calendar,
} from "lucide-react";
import { adminApi, API_BASE_URL } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

function formatINR(paise: number | undefined): string {
  const rs = (paise ?? 0) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rs);
}

const STATUS_BADGE: Record<string, string> = {
  placed: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300",
  confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300",
  assigned: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300",
  out_for_delivery: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300",
  refunded: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
};

export function DashboardPage() {
  const { currentUser } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const thirtyAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(thirtyAgo);
  const [dateTo, setDateTo] = useState(today);

  const { data: counts } = useQuery({
    queryKey: ["cms-sidebar-counts"],
    queryFn: () => adminApi.sidebarCounts(),
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", dateFrom, dateTo],
    queryFn: () => adminApi.dashboardStats(dateFrom, dateTo),
  });

  const revenueSeries = stats?.revenue_series || [];
  const maxDailyRev = Math.max(
    1,
    ...revenueSeries.map((pt) => pt.revenue_paise || 0)
  );

  const kpiCards = [
    {
      label: "Today's Orders",
      value: String(stats?.today_orders ?? 0),
      sub: `${formatINR(stats?.today_revenue_paise)} revenue today`,
      icon: ShoppingBag,
      href: "/cms/orders/new",
    },
    {
      label: "Period Revenue",
      value: formatINR(stats?.total_revenue_paise),
      sub: `${stats?.total_orders ?? 0} orders in selected range`,
      icon: IndianRupee,
      href: "/cms/orders/all",
    },
    {
      label: "Customers",
      value: String(counts?.customers ?? 0),
      sub: `${counts?.whatsapp ?? 0} unread WhatsApp · ${counts?.support?.open ?? 0} tickets`,
      icon: Users,
      href: "/cms/customers",
    },
    {
      label: "Low Stock Alerts",
      value: String(stats?.low_stock_items?.length ?? 0),
      sub: "Products with stock <= 10 units",
      icon: AlertTriangle,
      href: "/cms/services/product",
    },
  ];

  const storefrontUrl =
    import.meta.env.VITE_STOREFRONT_URL || "http://localhost:3000";

  return (
    <div className="space-y-6 animate-bd-fade-up">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#07080d] via-[#131126] to-[#1e1b4b] text-white p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold">
            Welcome back, {currentUser?.full_name || currentUser?.username}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Role: <strong>{currentUser?.role_name || "Admin"}</strong> · Go API{" "}
            <code className="text-violet-300 bg-white/10 px-1.5 py-0.5 rounded">{API_BASE_URL}</code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar size={13} className="text-violet-300" />
            <input
              type="date"
              aria-label="Dashboard from date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark]"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              aria-label="Dashboard to date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark]"
            />
          </div>
          <a
            href={`${API_BASE_URL}/swagger/index.html`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold transition-colors"
          >
            Swagger API <ExternalLink size={12} />
          </a>
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold transition-colors"
          >
            Storefront <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((st) => {
          const Icon = st.icon;
          return (
            <Link
              key={st.label}
              to={st.href}
              className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 hover:border-[#4f6ef7]/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{st.label}</p>
                  <p className="font-heading text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                    {isLoading ? "…" : st.value}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#4f6ef7] group-hover:bg-[#4f6ef7] group-hover:text-white transition-colors">
                  <Icon size={18} />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 flex items-center justify-between">
                <span className="truncate">{st.sub}</span>
                <ArrowRight size={12} className="shrink-0" />
              </p>
            </Link>
          );
        })}
      </div>

      {/* Revenue Trend + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-sm font-bold flex items-center gap-2">
              <TrendingUp size={15} className="text-[#4f6ef7]" />
              Daily Revenue Trend
            </h2>
            <span className="text-[11px] text-slate-400">
              {dateFrom} — {dateTo}
            </span>
          </div>

          {revenueSeries.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No completed revenue entries in selected window yet
            </div>
          ) : (
            <div className="h-44 flex items-end gap-2.5 pt-4 overflow-x-auto">
              {revenueSeries.map((pt) => {
                const pct = Math.max(
                  10,
                  Math.round(((pt.revenue_paise || 0) / maxDailyRev) * 100)
                );
                return (
                  <div
                    key={pt.date}
                    className="w-10 shrink-0 flex flex-col items-center gap-1 group"
                    title={`${pt.date}: ${formatINR(pt.revenue_paise)} (${pt.orders} orders)`}
                  >
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {formatINR(pt.revenue_paise)}
                    </span>
                    <div className="w-full flex items-end h-28 bg-slate-100/70 dark:bg-slate-800/40 rounded-t-md overflow-hidden">
                      <div
                        style={{ height: `${pct}%` }}
                        className="w-full rounded-t-md bg-[#4f6ef7] group-hover:bg-[#9b1b45] transition-colors"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {(pt.date || "").slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5">
          <h2 className="font-heading text-sm font-bold mb-3">
            Order Status Breakdown
          </h2>
          {(stats?.status_counts?.length ?? 0) === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              No orders in range
            </p>
          ) : (
            <div className="space-y-2">
              {stats?.status_counts?.map((sc) => (
                <div
                  key={sc.status}
                  className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800"
                >
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                      STATUS_BADGE[sc.status || ""] ||
                      "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {(sc.status || "").replaceAll("_", " ")}
                  </span>
                  <span className="font-heading font-bold text-sm">
                    {sc.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Top Products, Top Cities, Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-sm font-bold">Top Products</h2>
            <Link to="/cms/services/product" className="text-[11px] text-[#4f6ef7] font-semibold">
              Manage
            </Link>
          </div>
          {(stats?.top_products?.length ?? 0) === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No sales data yet</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {stats?.top_products?.map((tp) => (
                <div key={tp.product_id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{tp.title}</p>
                    <p className="text-[11px] text-slate-400">{tp.sku} · {tp.units_sold} sold</p>
                  </div>
                  <span className="font-semibold shrink-0">{formatINR(tp.revenue_paise)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-sm font-bold flex items-center gap-1.5">
              <MapPin size={14} className="text-[#9b1b45]" /> Top Cities
            </h2>
            <Link to="/cms/presets/city" className="text-[11px] text-[#4f6ef7] font-semibold">
              Cities
            </Link>
          </div>
          {(stats?.top_cities?.length ?? 0) === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No city orders yet</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {stats?.top_cities?.map((tc) => (
                <div key={tc.city_id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{tc.name}</p>
                    <p className="text-[11px] text-slate-400">{tc.orders} orders</p>
                  </div>
                  <span className="font-semibold">{formatINR(tc.revenue_paise)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-sm font-bold">Low Stock Inventory</h2>
            <Link to="/cms/services/product" className="text-[11px] text-[#4f6ef7] font-semibold">
              Restock
            </Link>
          </div>
          {(stats?.low_stock_items?.length ?? 0) === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">All products healthy in stock</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {stats?.low_stock_items?.map((ls) => (
                <div key={ls.product_id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{ls.name}</p>
                    <p className="text-[11px] text-slate-400">{ls.sku}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                      (ls.stock_qty ?? 0) === 0
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {ls.stock_qty} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
