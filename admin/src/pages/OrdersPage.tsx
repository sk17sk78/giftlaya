import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag,
  Plus,
  Download,
  Search,
  Eye,
  Calendar,
  CreditCard,
  FileText,
  Send,
  Truck,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import {
  adminApi,
  type Order,
  type CreateOrderInput,
} from "@/api/client";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { FormModal } from "@/components/ui/FormModal";
import { PermissionGuard } from "@/components/ui/PermissionGuard";
import { useToast } from "@/components/ui/Toast";

function formatINR(paise?: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((paise ?? 0) / 100);
}

const NEXT_TRANSITIONS: Record<string, string[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["assigned", "cancelled"],
  assigned: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

const STATUS_STYLE: Record<string, string> = {
  placed: "bg-sky-50 text-sky-700",
  confirmed: "bg-indigo-50 text-indigo-700",
  assigned: "bg-violet-50 text-violet-700",
  out_for_delivery: "bg-amber-50 text-amber-800",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
  refunded: "bg-slate-100 text-slate-600",
};

export function OrdersPage() {
  const location = useLocation();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const toast = (type: "success" | "error", msg: string) => showToast(msg, type);

  const routeMode = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/cms/calendar")) return "calendar";
    if (p.startsWith("/cms/payment-links")) return "payment_links";
    if (p.startsWith("/cms/invoices")) return "invoices";
    if (p.startsWith("/cms/manual-orders")) return "manual";
    if (p.startsWith("/cms/orders/uploads")) return "uploads";
    if (p.startsWith("/cms/seller-orders")) return "seller_orders";
    return "orders";
  }, [location.pathname]);

  const routeStatus = useMemo(() => {
    const p = location.pathname;
    if (p.endsWith("/new")) return "placed";
    if (p.endsWith("/processing")) return "processing";
    if (p.endsWith("/delivered")) return "delivered";
    if (p.endsWith("/cancelled")) return "cancelled";
    return "";
  }, [location.pathname]);

  const isFailedRoute = location.pathname.endsWith("/failed");

  const [statusFilter, setStatusFilter] = useState(routeStatus);
  const [paymentStatus, setPaymentStatus] = useState(isFailedRoute ? "failed" : "");
  const [cityFilter, setCityFilter] = useState("");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  useEffect(() => {
    setStatusFilter(routeStatus);
    setPaymentStatus(isFailedRoute ? "failed" : "");
    setPage(1);
    setSelectedOrderId(null);
  }, [location.pathname, routeStatus, isFailedRoute]);
  const [statusReason, setStatusReason] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    setStatusFilter(routeStatus);
    setPaymentStatus(isFailedRoute ? "failed" : "");
    setSelectedOrderId(null);
    setManualOpen(false);
    setPage(1);
  }, [location.pathname, routeStatus, isFailedRoute]);

  const [manualForm, setManualForm] = useState({
    city_id: 1,
    pincode: "",
    payment_method: "cod",
    delivery_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    recipient_name: "",
    recipient_phone: "",
    product_id: 1,
    qty: 1,
    coupon_code: "",
    internal_notes: "Phone/WhatsApp manual booking",
  });

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [plPhone, setPlPhone] = useState("");
  const [plAmountRs, setPlAmountRs] = useState("999");

  const activeStatus = routeStatus || statusFilter;
  const activePaymentStatus = isFailedRoute ? "failed" : paymentStatus;
  const isOrdersList = routeMode === "orders" || routeMode === "manual" || routeMode === "seller_orders";

  const { data: citiesList = [] } = useQuery({
    queryKey: ["cities-lite"],
    queryFn: () => adminApi.listCities(),
  });

  const { data: manualProducts } = useQuery({
    queryKey: ["products-lite"],
    queryFn: () => adminApi.listProducts({ status: "published", limit: 100 }),
    enabled: manualOpen,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", routeMode, activeStatus, activePaymentStatus, cityFilter, deliveryTypeFilter, dateFrom, dateTo, search, sortBy, page],
    queryFn: () =>
      adminApi.listOrders({
        status: activeStatus || undefined,
        payment_status: activePaymentStatus || undefined,
        is_manual: routeMode === "manual" ? true : undefined,
        city_id: cityFilter ? Number(cityFilter) : undefined,
        delivery_type: deliveryTypeFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: search || undefined,
        sort_by: sortBy,
        page,
        limit: 20,
      }),
    enabled: isOrdersList,
  });

  const { data: uploadsData, isLoading: uploadsLoading } = useQuery({
    queryKey: ["order-uploads", page],
    queryFn: () => adminApi.listOrderUploads(page, 25),
    enabled: routeMode === "uploads",
  });

  const { data: orderDetail } = useQuery({
    queryKey: ["order-detail", selectedOrderId],
    queryFn: () => adminApi.getOrder(selectedOrderId!),
    enabled: selectedOrderId !== null,
  });

  const { data: calendarRows = [] } = useQuery({
    queryKey: ["order-calendar", month],
    queryFn: () => adminApi.getCalendarBookings(month),
    enabled: routeMode === "calendar",
  });

  const { data: paymentLinksData } = useQuery({
    queryKey: ["payment-links"],
    queryFn: () => adminApi.listPaymentLinks(1, 50),
    enabled: routeMode === "payment_links",
  });

  const { data: invoicesData } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => adminApi.listInvoices(1, 50),
    enabled: routeMode === "invoices",
  });

  const transitionMut = useMutation({
    mutationFn: ({ id, toStatus }: { id: number; toStatus: string }) =>
      adminApi.updateOrderStatus(id, toStatus, statusReason),
    onSuccess: (updated) => {
      toast("success", `Order moved to ${updated.status}`);
      setStatusReason("");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-detail", updated.id] });
      qc.invalidateQueries({ queryKey: ["cms-sidebar-counts"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const assignMut = useMutation({
    mutationFn: (id: number) =>
      adminApi.assignOrder(id, {
        delivery_partner_name: partnerName,
        delivery_partner_phone: partnerPhone,
      }),
    onSuccess: (updated) => {
      toast("success", "Delivery / decorator partner assigned");
      setPartnerName("");
      setPartnerPhone("");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-detail", updated.id] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const notesMut = useMutation({
    mutationFn: (id: number) =>
      adminApi.updateOrderNotes(id, {
        tracking_id: trackingInput,
        internal_notes: notesInput,
      }),
    onSuccess: (updated) => {
      toast("success", "Tracking & notes saved");
      qc.invalidateQueries({ queryKey: ["order-detail", updated.id] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const resendMut = useMutation({
    mutationFn: (id: number) => adminApi.resendOrderNotification(id),
    onSuccess: () => toast("success", "Customer notification queued"),
    onError: (e: Error) => toast("error", e.message),
  });

  const invoiceMut = useMutation({
    mutationFn: (orderId: number) => adminApi.getOrderInvoice(orderId),
    onSuccess: (inv) => {
      toast("success", `Invoice ${inv.invoice_number} ready`);
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const createManualMut = useMutation({
    mutationFn: () => {
      const payload: CreateOrderInput = {
        city_id: Number(manualForm.city_id),
        pincode: manualForm.pincode,
        payment_method: manualForm.payment_method as "cod" | "razorpay" | "payment_link",
        is_manual: true,
        delivery_date: manualForm.delivery_date,
        recipient_name: manualForm.recipient_name,
        recipient_phone: manualForm.recipient_phone,
        coupon_code: manualForm.coupon_code || undefined,
        internal_notes: manualForm.internal_notes,
        items: [{ product_id: Number(manualForm.product_id), qty: Number(manualForm.qty) }],
      };
      return adminApi.createManualOrder(payload);
    },
    onSuccess: (created) => {
      toast("success", `Created manual order ${created.order_number}`);
      setManualOpen(false);
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["cms-sidebar-counts"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const createLinkMut = useMutation({
    mutationFn: () =>
      adminApi.createPaymentLink({
        customer_phone: plPhone,
        amount_paise: Math.round(Number(plAmountRs) * 100),
      }),
    onSuccess: () => {
      toast("success", "Payment link created");
      setPlPhone("");
      qc.invalidateQueries({ queryKey: ["payment-links"] });
    },
    onError: (e: Error) => toast("error", e.message),
  });

  const columns: ColumnDef<Order>[] = [
    {
      key: "order_number",
      header: "Order #",
      render: (o) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{o.order_number}</p>
          <p className="text-[11px] text-slate-400">
            {o.is_manual ? "Manual" : "Web"} · {o.city_name}
          </p>
        </div>
      ),
    },
    {
      key: "recipient",
      header: "Recipient",
      render: (o) => (
        <div>
          <p className="font-semibold">{o.recipient_name}</p>
          <p className="text-[11px] text-slate-400">{o.recipient_phone}</p>
        </div>
      ),
    },
    {
      key: "delivery",
      header: "Delivery Date",
      sortKey: "delivery_date",
      render: (o) => (
        <div>
          <p>{o.delivery_date || "—"}</p>
          <p className="text-[11px] text-slate-400">{o.slot_label || "Standard"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Order Status",
      render: (o) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
            STATUS_STYLE[o.status || "placed"] || "bg-slate-100"
          }`}
        >
          {(o.status || "").replaceAll("_", " ")}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      render: (o) => (
        <div>
          <p className="capitalize font-medium">{o.payment_status}</p>
          <p className="text-[11px] text-slate-400 uppercase">{o.payment_method}</p>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      sortKey: "total_desc",
      render: (o) => <span className="font-bold">{formatINR(o.total_paise)}</span>,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (o) => (
        <button
          type="button"
          onClick={() => {
            setSelectedOrderId(o.id!);
            setTrackingInput(o.tracking_id || "");
            setNotesInput(o.internal_notes || "");
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
        >
          <Eye size={12} /> Manage
        </button>
      ),
    },
  ];

  return (
    <PermissionGuard module="order">
      <div className="space-y-4 animate-bd-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {routeMode === "calendar" ? (
                <Calendar size={20} className="text-[#4f6ef7]" />
              ) : routeMode === "payment_links" ? (
                <CreditCard size={20} className="text-[#4f6ef7]" />
              ) : routeMode === "invoices" ? (
                <FileText size={20} className="text-[#4f6ef7]" />
              ) : routeMode === "uploads" ? (
                <ImageIcon size={20} className="text-[#4f6ef7]" />
              ) : (
                <ShoppingBag size={20} className="text-[#4f6ef7]" />
              )}
              {routeMode === "calendar"
                ? "Booking Calendar"
                : routeMode === "payment_links"
                ? "Payment Links"
                : routeMode === "invoices"
                ? "GST Invoices"
                : routeMode === "uploads"
                ? "Customer Uploads"
                : routeMode === "manual"
                ? "Manual Orders"
                : routeMode === "seller_orders"
                ? "Seller Orders"
                : isFailedRoute
                ? "Failed Payment Orders"
                : routeStatus
                ? `${routeStatus === "placed" ? "New" : routeStatus} Orders`
                : "All Orders & Fulfillment"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {routeMode === "payment_links" && (
              <Link
                to="/cms/payments"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <CreditCard size={13} /> Transactions, Refunds & Settlement
              </Link>
            )}
            {isOrdersList && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    adminApi.exportOrdersCSV({
                      status: activeStatus || undefined,
                      search: search || undefined,
                      date_from: dateFrom || undefined,
                      date_to: dateTo || undefined,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer"
                >
                  <Download size={13} /> Export CSV
                </button>
                <PermissionGuard module="order" requireWrite fallback={null}>
                  <button
                    type="button"
                    onClick={() => setManualOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white text-xs font-semibold cursor-pointer"
                  >
                    <Plus size={14} /> Create Manual Order
                  </button>
                </PermissionGuard>
              </>
            )}
          </div>
        </div>

        {/* Orders Table View */}
        {isOrdersList && (
          <>
            <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Order #, recipient or phone..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-52"
                />
              </div>

              {!routeStatus && !isFailedRoute && (
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">All Statuses</option>
                  <option value="placed">Placed (New)</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="assigned">Assigned</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              )}

              {!isFailedRoute && (
                <select
                  value={paymentStatus}
                  onChange={(e) => {
                    setPaymentStatus(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">All Payment States</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              )}

              <select
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="">All Cities</option>
                {citiesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={deliveryTypeFilter}
                onChange={(e) => {
                  setDeliveryTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="">All Product Types</option>
                <option value="flower">Flowers</option>
                <option value="cake">Cakes</option>
                <option value="plant">Plants</option>
                <option value="chocolate">Chocolates</option>
                <option value="personalised">Personalised</option>
                <option value="decoration_package">Decoration</option>
                <option value="combo">Combos</option>
              </select>

              <label className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="text-[11px] font-medium">From</span>
                <input
                  type="date"
                  aria-label="Filter from delivery date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="text-[11px] font-medium">To</span>
                <input
                  type="date"
                  aria-label="Filter to delivery date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </label>
              {(search || statusFilter || paymentStatus || cityFilter || deliveryTypeFilter || dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setPaymentStatus("");
                    setCityFilter("");
                    setDeliveryTypeFilter("");
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <DataTable
              columns={columns}
              rows={ordersData?.items || []}
              rowKey={(o) => o.id!}
              loading={ordersLoading}
              emptyText="No orders matched your filters"
              page={ordersData?.meta?.page || page}
              totalPages={ordersData?.meta?.total_pages || 1}
              total={ordersData?.meta?.total || 0}
              onPageChange={setPage}
              sortBy={sortBy}
              onSort={(k) => setSortBy(k)}
            />
          </>
        )}

        {/* Booking Calendar View */}
        {routeMode === "calendar" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Daily scheduled & decoration delivery load by date
              </p>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>
            {calendarRows.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">
                No scheduled bookings in {month}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {calendarRows.map((row, idx) => {
                  const orders = Array.isArray(row.orders)
                    ? (row.orders as Array<{ id?: number; order_number?: string; recipient?: string; status?: string; city?: string }>)
                    : [];
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-heading font-bold">{String(row.date || "")}</p>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                          {String(row.count || 0)} orders
                        </span>
                      </div>
                      <p className="text-slate-500">
                        Revenue: {formatINR(Number(row.revenue_paise || 0))}
                      </p>
                      {orders.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-slate-200/70 dark:border-slate-700">
                          {orders.slice(0, 4).map((o, j) => (
                            <button
                              key={j}
                              type="button"
                              onClick={() => o.id && setSelectedOrderId(o.id)}
                              className="w-full text-left flex justify-between text-[11px] hover:text-[#4f6ef7] cursor-pointer"
                            >
                              <span className="font-medium truncate">{o.order_number} · {o.recipient}</span>
                              <span className="text-slate-400 capitalize">{o.city}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Customer Uploads View */}
        {routeMode === "uploads" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-xs">
            {uploadsLoading ? (
              <p className="p-8 text-center text-slate-400">Loading customer personalization uploads...</p>
            ) : (uploadsData?.items || []).length === 0 ? (
              <div className="p-10 text-center space-y-1 text-slate-400">
                <p className="font-semibold text-slate-600 dark:text-slate-300">No customer photo or custom text uploads yet</p>
                <p>Orders with uploaded photos, custom cake messages, or personalised fields appear here automatically.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Customer / Recipient</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Personalization Data & Photos</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(uploadsData?.items || []).map((u) => (
                    <tr key={u.item_id}>
                      <td className="px-4 py-3 font-bold">{u.order_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{u.recipient_name}</p>
                        <p className="text-[11px] text-slate-400">{u.recipient_phone}</p>
                      </td>
                      <td className="px-4 py-3">{u.product_title}</td>
                      <td className="px-4 py-3 font-mono text-[11px] max-w-sm truncate">
                        {JSON.stringify(u.personalization_json)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => u.order_id && setSelectedOrderId(u.order_id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 font-semibold cursor-pointer"
                        >
                          <Eye size={12} /> View Order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Payment Links View */}
        {routeMode === "payment_links" && (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createLinkMut.mutate();
              }}
              className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1">Customer Phone *</label>
                <input
                  required
                  value={plPhone}
                  onChange={(e) => setPlPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Amount (INR) *</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={plAmountRs}
                  onChange={(e) => setPlAmountRs(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-36"
                />
              </div>
              <button
                type="submit"
                disabled={createLinkMut.isPending}
                className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                Generate Payment Link
              </button>
            </form>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Short URL</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(paymentLinksData?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                        No payment links generated yet. Enter a customer phone and amount above.
                      </td>
                    </tr>
                  ) : (
                    (paymentLinksData?.items || []).map((pl) => (
                      <tr key={pl.id}>
                        <td className="px-4 py-3 font-semibold">{pl.customer_phone}</td>
                        <td className="px-4 py-3">{formatINR(pl.amount_paise)}</td>
                        <td className="px-4 py-3 font-mono text-[11px]">{pl.short_url}</td>
                        <td className="px-4 py-3 capitalize">{pl.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoices View */}
        {routeMode === "invoices" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Seller GSTIN</th>
                  <th className="px-4 py-3">Generated At</th>
                  <th className="px-4 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(invoicesData?.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No GST invoices generated yet. Open any order and click &quot;GST Invoice&quot; to generate one.
                    </td>
                  </tr>
                ) : (
                  (invoicesData?.items || []).map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-4 py-3 font-bold">{inv.invoice_number}</td>
                      <td className="px-4 py-3">{inv.order_number || inv.order_id}</td>
                      <td className="px-4 py-3 font-mono">{inv.gstin_seller}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {inv.generated_at ? new Date(inv.generated_at).toLocaleString() : ""}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => adminApi.downloadInvoicePDF(inv.order_id!, inv.order_number)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                        >
                          <Download size={12} /> PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Order Detail Modal */}
        <FormModal
          open={selectedOrderId !== null && Boolean(orderDetail)}
          title={`Order ${orderDetail?.order_number || ""}`}
          subtitle={`${orderDetail?.city_name || ""} · Delivery: ${
            orderDetail?.delivery_date || "—"
          } (${orderDetail?.slot_label || "Standard"})`}
          onClose={() => setSelectedOrderId(null)}
          maxWidthClass="max-w-4xl"
        >
          {orderDetail && (
            <div className="space-y-5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="text-slate-500">Current Status</p>
                  <span
                    className={`inline-block mt-1 px-3 py-1 rounded-full font-bold capitalize ${
                      STATUS_STYLE[orderDetail.status || "placed"] || ""
                    }`}
                  >
                    {(orderDetail.status || "").replaceAll("_", " ")}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Grand Total</p>
                  <p className="font-heading text-lg font-bold">
                    {formatINR(orderDetail.total_paise)}
                  </p>
                  {(orderDetail.cancellation_fee_paise ?? 0) > 0 && (
                    <p className="text-[11px] text-rose-600 font-semibold">
                      Cancellation fee: {formatINR(orderDetail.cancellation_fee_paise)}
                    </p>
                  )}
                </div>
              </div>

              {/* Valid State Machine Actions */}
              <PermissionGuard module="order" requireWrite fallback={null}>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <p className="font-bold">State Machine Transitions</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Optional reason / note for transition..."
                      className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    {(NEXT_TRANSITIONS[orderDetail.status || ""] || []).map((next) => (
                      <button
                        key={next}
                        type="button"
                        onClick={() =>
                          transitionMut.mutate({ id: orderDetail.id!, toStatus: next })
                        }
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold capitalize cursor-pointer ${
                          next === "cancelled" || next === "refunded"
                            ? "bg-rose-600 text-white"
                            : "bg-[#4f6ef7] text-white"
                        }`}
                      >
                        {next === "cancelled" ? (
                          <XCircle size={13} />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                        Mark {next.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </PermissionGuard>

              {/* Items */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(orderDetail.items || []).map((it) => {
                      const rawAddons = it.addons_json as unknown;
                      const parsedAddons = Array.isArray(rawAddons) ? rawAddons : [];
                      const rawPers = it.personalization_json as unknown;
                      const pers =
                        rawPers && typeof rawPers === "object" && !Array.isArray(rawPers)
                          ? (rawPers as Record<string, unknown>)
                          : null;
                      return (
                        <tr key={it.id}>
                          <td className="px-3 py-2">
                            <p className="font-semibold">{it.product_title}</p>
                            <p className="text-[11px] text-slate-400">{it.sku_snapshot}</p>
                            {pers && Object.keys(pers).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(pers)
                                  .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
                                  .map(([k, v]) => (
                                    <span
                                      key={k}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300"
                                    >
                                      {k.replace(/_/g, " ")}: {String(v)}
                                    </span>
                                  ))}
                              </div>
                            )}
                            {parsedAddons.length > 0 && (
                              <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-indigo-200 dark:border-indigo-900">
                                {parsedAddons.map((ad: any, idx: number) => (
                                  <p key={idx} className="text-[11px] text-indigo-600 dark:text-indigo-400">
                                    + {ad.name || `Addon #${ad.id}`} × {ad.qty ?? 1} (
                                    {formatINR((ad.price_paise ?? 0) * (ad.qty ?? 1))})
                                  </p>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 capitalize">{it.item_type}</td>
                          <td className="px-3 py-2">{it.qty}</td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {formatINR(it.line_total_paise)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Assign Partner & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <Truck size={14} /> Assign Decorator / Delivery Partner
                  </p>
                  <input
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="Partner or Team Name"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(e.target.value)}
                    placeholder="Partner Phone"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => assignMut.mutate(orderDetail.id!)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-semibold cursor-pointer"
                  >
                    Assign Partner
                  </button>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="font-bold">Tracking & Internal Notes</p>
                  <input
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="Courier / Live Tracking ID"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <textarea
                    rows={2}
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Internal ops notes"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => notesMut.mutate(orderDetail.id!)}
                      className="px-3 py-1.5 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
                    >
                      Save Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => resendMut.mutate(orderDetail.id!)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                    >
                      <Send size={12} /> Resend Notify
                    </button>
                    <button
                      type="button"
                      onClick={() => invoiceMut.mutate(orderDetail.id!)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                    >
                      <FileText size={12} /> GST Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminApi.downloadInvoicePDF(orderDetail.id!, orderDetail.order_number)
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold cursor-pointer"
                    >
                      <Download size={12} /> PDF Invoice
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </FormModal>

        {/* Manual Order Modal */}
        <FormModal
          open={manualOpen}
          title="Create Manual Order"
          subtitle="Locks product inventory and delivery slot atomically via SELECT ... FOR UPDATE"
          onClose={() => setManualOpen(false)}
          maxWidthClass="max-w-xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createManualMut.mutate();
            }}
            className="space-y-3 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">City *</label>
                <select
                  required
                  value={manualForm.city_id}
                  onChange={(e) => setManualForm((s) => ({ ...s, city_id: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {citiesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (#{c.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Pincode</label>
                <input
                  value={manualForm.pincode}
                  onChange={(e) => setManualForm((s) => ({ ...s, pincode: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Recipient Name *</label>
                <input
                  required
                  value={manualForm.recipient_name}
                  onChange={(e) => setManualForm((s) => ({ ...s, recipient_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Recipient Phone *</label>
                <input
                  required
                  value={manualForm.recipient_phone}
                  onChange={(e) => setManualForm((s) => ({ ...s, recipient_phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Product *</label>
                <select
                  required
                  value={manualForm.product_id}
                  onChange={(e) => setManualForm((s) => ({ ...s, product_id: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {(manualProducts?.items || []).length === 0 ? (
                    <option value={manualForm.product_id}>Product #{manualForm.product_id}</option>
                  ) : (
                    (manualProducts?.items || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{((p.selling_price_paise ?? 0) / 100).toFixed(0)} ({p.sku})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Quantity *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={manualForm.qty}
                  onChange={(e) => setManualForm((s) => ({ ...s, qty: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Delivery Date *</label>
                <input
                  type="date"
                  required
                  value={manualForm.delivery_date}
                  onChange={(e) => setManualForm((s) => ({ ...s, delivery_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Payment Method *</label>
                <select
                  value={manualForm.payment_method}
                  onChange={(e) => setManualForm((s) => ({ ...s, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="cod">COD</option>
                  <option value="payment_link">Payment Link</option>
                  <option value="razorpay">Razorpay</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createManualMut.isPending}
                className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
              >
                {createManualMut.isPending ? "Placing..." : "Place Order"}
              </button>
            </div>
          </form>
        </FormModal>
      </div>
    </PermissionGuard>
  );
}
