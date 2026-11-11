"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  Search,
  X,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Phone,
  XCircle,
  MessageSquarePlus,
} from "lucide-react";
import { useUI } from "@/context/UIContext";
import { API_BASE_URL, postPublicAPI } from "@/services/api";

interface OrderDetailItem {
  id: number;
  productTitle: string;
  qty: number;
  price: number;
  addons: { id: number; name: string; price: number; qty: number }[];
}

interface OrderViewRecord {
  id: number;
  orderNumber: string;
  createdAt: string;
  rawStatus: string;
  filterGroup: "upcoming" | "completed" | "cancelled";
  paymentStatus: string;
  paymentMethod: string;
  serviceName: string;
  image: string;
  city: string;
  deliveryDate: string;
  deliverySlot: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  specialInstructions: string;
  subtotal: number;
  deliveryFee: number;
  slotSurcharge: number;
  couponDiscount: number;
  coinsDiscount: number;
  total: number;
  items: OrderDetailItem[];
}

function mapApiOrder(raw: any): OrderViewRecord {
  const st = String(raw.status || "placed").toLowerCase();
  const group: OrderViewRecord["filterGroup"] =
    st === "delivered"
      ? "completed"
      : st === "cancelled" || st === "refunded"
      ? "cancelled"
      : "upcoming";
  const rawItems: any[] = Array.isArray(raw.items) ? raw.items : [];
  const mappedItems: OrderDetailItem[] = rawItems.map((it) => {
    const rawAddonSource = Array.isArray(it.addons_json)
      ? it.addons_json
      : Array.isArray(it.addons)
      ? it.addons
      : [];
    return {
      id: Number(it.id || 0),
      productTitle: it.product_title_snapshot || it.product_title || "Gift Item",
      qty: Number(it.qty || 1),
      price: Math.round((it.unit_price_paise || 0) / 100),
      addons: rawAddonSource.map((ad: any) => ({
        id: Number(ad.id || 0),
        name: ad.name || ad.addon_name_snapshot || "Add-on",
        price: Math.round((ad.price_paise ?? ad.unit_price_paise ?? 0) / 100),
        qty: Number(ad.qty || 1),
      })),
    };
  });
  let addrObj: Record<string, any> = {};
  if (raw.shipping_address_json && typeof raw.shipping_address_json === "object") {
    addrObj = raw.shipping_address_json;
  }
  const addressText = [
    addrObj.address_line1,
    addrObj.landmark,
    raw.city_name || addrObj.city,
    addrObj.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: Number(raw.id),
    orderNumber: raw.order_number || `GL-${raw.id}`,
    createdAt: raw.created_at
      ? new Date(raw.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "",
    rawStatus: st,
    filterGroup: group,
    paymentStatus: String(raw.payment_status || "paid").toLowerCase(),
    paymentMethod: String(raw.payment_method || "UPI").toUpperCase(),
    serviceName: mappedItems[0]?.productTitle || `Order ${raw.order_number || ""}`,
    image: raw.primary_image_url || "",
    city: raw.city_name || "India",
    deliveryDate: raw.delivery_date ? String(raw.delivery_date).slice(0, 10) : "",
    deliverySlot:
      raw.slot_label ||
      raw.delivery_slot_label ||
      rawItems[0]?.personalization_json?.delivery_slot ||
      "",
    recipientName: raw.recipient_name || "Customer",
    recipientPhone: raw.recipient_phone || "",
    address: addressText,
    specialInstructions: String(addrObj.special_instructions || ""),
    subtotal: Math.round((raw.subtotal_paise || 0) / 100),
    deliveryFee: Math.round((raw.delivery_fee_paise || 0) / 100),
    slotSurcharge: Math.round((raw.slot_surcharge_paise || 0) / 100),
    couponDiscount: Math.round((raw.coupon_discount_paise || 0) / 100),
    coinsDiscount: Math.round((raw.coins_discount_paise || 0) / 100),
    total: Math.round((raw.total_paise || 0) / 100),
    items: mappedItems,
  };
}

export default function DashboardOrdersPage() {
  const { customer } = useUI();
  const [orders, setOrders] = useState<OrderViewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderViewRecord | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  useEffect(() => {
    setDrawerError(null);
  }, [selectedOrder?.id]);

  const baseUrl = API_BASE_URL || "http://localhost:8080/api/v1/public";

  const loadOrders = useCallback(async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/customers/${customer.id}/orders`);
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json?.items) ? json.items.map(mapApiOrder) : [];
        setOrders(list);
      }
    } catch {
      // ignore offline
    } finally {
      setLoading(false);
    }
  }, [baseUrl, customer?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (tab !== "all" && o.filterGroup !== tab) return false;
      if (!q) return true;
      return (
        o.serviceName.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q)
      );
    });
  }, [orders, tab, query]);

  const handleCancelOrder = async (ord: OrderViewRecord) => {
    setActionMsg(null);
    setDrawerError(null);
    try {
      await postPublicAPI(`/orders/${ord.id}/cancel`, {
        reason: "Cancelled by customer from My Orders",
        order_number: ord.orderNumber,
        phone: ord.recipientPhone || customer?.phone || customer?.target,
        customer_id: customer?.id,
      });
      setActionMsg(`Order ${ord.orderNumber} has been cancelled.`);
      setSelectedOrder(null);
      await loadOrders();
    } catch (err) {
      setDrawerError((err as Error).message || "Unable to cancel this order.");
    }
  };

  const tabs: Array<{ key: typeof tab; label: string }> = [
    { key: "all", label: "All" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const statusMeta = (grp: OrderViewRecord["filterGroup"]) =>
    grp === "completed"
      ? { bg: "bg-emerald-50 border-emerald-200 text-emerald-700", label: "Delivered" }
      : grp === "cancelled"
      ? { bg: "bg-rose-50 border-rose-200 text-rose-700", label: "Cancelled" }
      : { bg: "bg-[#fdf0f6] border-[#f4dbe6] text-[#9b1b45]", label: "Upcoming" };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-[#fdf0f6] flex items-center justify-center shrink-0">
          <Package className="w-[19px] h-[19px] text-[#a72055]" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h1 className="text-[21px] font-extrabold tracking-tight text-gray-900 leading-tight">
            My Orders
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading
              ? "Loading…"
              : `${orders.length} total booking${orders.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2.5 bg-white border border-[#eae3ea] rounded-2xl px-4 py-3 focus-within:border-[#c87d99] transition-colors">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by service or order ID…"
          className="flex-1 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-[#f1edf1] rounded-2xl p-1 flex gap-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          const cnt =
            t.key === "all"
              ? orders.length
              : orders.filter((o) => o.filterGroup === t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? "bg-white text-[#a72055] shadow-xs"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  active ? "bg-[#fceef4] text-[#a72055]" : "bg-white text-gray-400"
                }`}
              >
                {loading ? "–" : cnt}
              </span>
            </button>
          );
        })}
      </div>

      {actionMsg && (
        <div className="px-4 py-3 rounded-xl bg-[#faf5f8] border border-[#f0dce5] text-xs font-medium text-[#4a3f4e]">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="h-24 rounded-3xl bg-white border border-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#e9e2e9] py-14 flex flex-col items-center text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
            <Package className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-sm font-bold text-gray-700">
            No {tab !== "all" ? tab : ""} orders yet
          </p>
          <p className="text-xs text-gray-400 mt-1 mb-5">
            {query ? `No results for "${query}"` : "Your bookings will appear here"}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#a72055] text-white text-[13px] font-bold rounded-xl hover:bg-[#901a48]"
          >
            <span>Browse Decorations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((ord) => {
            const st = statusMeta(ord.filterGroup);
            return (
              <div
                key={ord.id}
                onClick={() => setSelectedOrder(ord)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedOrder(ord);
                }}
                className="bg-white rounded-3xl border border-[#eae3ea] hover:border-[#d59fb5] overflow-hidden cursor-pointer transition-all"
              >
                <div className="flex gap-3.5 p-4 items-center">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#faf7f9] border border-[#f0eaef] shrink-0 flex items-center justify-center">
                    {ord.image ? (
                      <Image
                        src={ord.image}
                        alt={ord.serviceName}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-gray-400">
                        #{ord.orderNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.bg}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    <h3 className="text-[13px] font-bold text-[#292229] truncate mt-0.5">
                      {ord.serviceName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#7c6a76] mt-1">
                      {ord.deliveryDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {ord.deliveryDate}
                        </span>
                      )}
                      {ord.deliverySlot && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {ord.deliverySlot}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <strong className="block text-sm font-extrabold text-[#292229]">
                      ₹{ord.total.toLocaleString("en-IN")}
                    </strong>
                    <span className="text-[10px] text-[#a72055] font-semibold">
                      Details
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over / Modal Order Details Drawer matching live giftlaya.com/dashboard/orders */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Order ${selectedOrder.orderNumber}`}
            className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#f0eaef] flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono text-gray-400">
                  #{selectedOrder.orderNumber} · {selectedOrder.createdAt}
                </p>
                <h2 className="text-base font-extrabold text-[#292229] mt-0.5">
                  {selectedOrder.serviceName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 grid place-items-center cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {selectedOrder.filterGroup === "upcoming" && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-blue-800">
                      Team will coordinate before delivery
                    </p>
                    <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                      On the day of your celebration, our delivery partner calls before heading to your address.
                    </p>
                  </div>
                </div>
              )}

              {/* Items Ordered */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Items Ordered ({selectedOrder.items.length || 1})
                </p>
                {selectedOrder.items.map((it) => (
                  <div
                    key={it.id}
                    className="bg-white border border-gray-100 rounded-2xl p-3.5 space-y-2"
                  >
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-bold text-[#292229]">
                          {it.productTitle}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Qty {it.qty} × ₹{it.price.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <strong className="text-[13px] font-bold text-[#292229]">
                        ₹{(it.price * it.qty).toLocaleString("en-IN")}
                      </strong>
                    </div>
                    {it.addons.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-600">
                        {it.addons.map((ad) => (
                          <div key={ad.id} className="flex justify-between">
                            <span>
                              ↳ {ad.name} × {ad.qty}
                            </span>
                            <span>₹{(ad.price * ad.qty).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Event Date & Address */}
              <div className="bg-[#faf8fa] border border-[#eee6ee] rounded-2xl p-4 space-y-2.5 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Event Date &amp; Address
                </p>
                <div className="flex items-center gap-2 text-[#292229]">
                  <Calendar className="w-3.5 h-3.5 text-[#a72055]" />
                  <span>
                    {selectedOrder.deliveryDate || "Scheduled"}
                    {selectedOrder.deliverySlot ? ` · ${selectedOrder.deliverySlot}` : ""}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-[#4a3f4e]">
                  <MapPin className="w-3.5 h-3.5 text-[#a72055] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#292229]">
                      {selectedOrder.recipientName} (+91 {selectedOrder.recipientPhone})
                    </strong>
                    <span>{selectedOrder.address || selectedOrder.city}</span>
                  </div>
                </div>
                {selectedOrder.specialInstructions && (
                  <p className="text-[11px] text-gray-600 pt-1 border-t border-[#eee6ee]">
                    Your Instructions: {selectedOrder.specialInstructions}
                  </p>
                )}
              </div>

              {/* Payment Summary */}
              <div className="bg-white border border-[#e9e2e9] rounded-2xl p-4 space-y-2 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pb-1">
                  Payment Summary
                </p>
                <div className="flex justify-between text-[#625865]">
                  <span>Subtotal</span>
                  <span>₹{selectedOrder.subtotal.toLocaleString("en-IN")}</span>
                </div>
                {selectedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between text-[#625865]">
                    <span>Convenience Fee</span>
                    <span>₹{selectedOrder.deliveryFee}</span>
                  </div>
                )}
                {selectedOrder.slotSurcharge > 0 && (
                  <div className="flex justify-between text-[#625865]">
                    <span>Slot Surcharge</span>
                    <span>₹{selectedOrder.slotSurcharge}</span>
                  </div>
                )}
                {selectedOrder.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon Discount</span>
                    <span>-₹{selectedOrder.couponDiscount}</span>
                  </div>
                )}
                {selectedOrder.coinsDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Giftlaya Coins</span>
                    <span>-₹{selectedOrder.coinsDiscount}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#f0eaef] flex justify-between text-sm font-extrabold text-[#292229]">
                  <span>Order Total ({selectedOrder.paymentMethod})</span>
                  <span className="text-[#a72055]">
                    ₹{selectedOrder.total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {drawerError && (
              <p
                role="alert"
                className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700"
              >
                {drawerError}
              </p>
            )}

            <div className="p-4 border-t border-[#f0eaef] flex gap-2">
              {selectedOrder.filterGroup === "upcoming" && (
                <button
                  type="button"
                  onClick={() => handleCancelOrder(selectedOrder)}
                  className="flex-1 py-2.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:bg-rose-50 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel Order
                </button>
              )}
              <Link
                href={`/dashboard/support/new?order=${encodeURIComponent(
                  selectedOrder.orderNumber
                )}`}
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#a72055] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" /> Need Help
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
