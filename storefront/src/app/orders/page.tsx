"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OrderRecord } from "@/types";
import { useUI } from "@/context/UIContext";
import { postPublicAPI } from "@/services/api";
import { Package, CheckCircle2, MessageCircle, ShoppingBag, XCircle } from "lucide-react";

interface LiveOrder extends Omit<OrderRecord, "status"> {
  dbId?: number;
  status: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1/public";

function mapApiOrder(o: any, existing?: LiveOrder): LiveOrder {
  const statusRaw = String(o.status || "placed").replaceAll("_", " ");
  const statusLabel = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
  return {
    dbId: o.id,
    id: o.order_number,
    createdAt: o.created_at
      ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : existing?.createdAt || "",
    status: statusLabel,
    city: o.city_name || existing?.city || "India",
    recipientName: o.recipient_name || existing?.recipientName || "Customer",
    recipientPhone: o.recipient_phone || existing?.recipientPhone || "",
    address: existing?.address || "",
    total: o.total_paise ? Math.round(o.total_paise / 100) : existing?.total || 0,
    paymentMethod: String(o.payment_method || existing?.paymentMethod || "UPI").toUpperCase(),
    items: (o.items && o.items.length > 0 ? o.items : null)
      ? o.items.map((it: any) => {
          const rawAddons = Array.isArray(it.addons_json)
            ? it.addons_json
            : Array.isArray(it.addons)
            ? it.addons
            : [];
          return {
            product: {
              id: String(it.product_id || it.id || ""),
              title: it.product_title_snapshot || it.product_title || "Gift Item",
              name: it.product_title_snapshot || it.product_title || "Gift Item",
              slug: "",
              image: "",
              price: Math.round((it.unit_price_paise || 0) / 100),
            },
            quantity: it.qty || 1,
            selectedAddons: rawAddons.map((ad: any) => ({
              id: ad.id || 0,
              name: ad.name || ad.addon_name_snapshot || "Add-on",
              price: Math.round((ad.price_paise ?? ad.unit_price_paise ?? 0) / 100),
              quantity: ad.qty || 1,
            })),
            addons: [],
            deliveryTimeSlot:
              o.slot_label || it.personalization_json?.delivery_slot || "",
            deliveryDate: o.delivery_date ? String(o.delivery_date).slice(0, 10) : "Scheduled",
          };
        })
      : existing?.items || [],
  };
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get("placed");
  const { customer } = useUI();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    let local: LiveOrder[] = [];
    try {
      const saved = localStorage.getItem("giftlaya_orders");
      if (saved) local = JSON.parse(saved);
    } catch {
      // ignore
    }

    const byNumber = new Map<string, LiveOrder>();
    for (const o of local) {
      if (o?.id) byNumber.set(o.id, o);
    }

    if (customer?.id) {
      try {
        const res = await fetch(`${API_BASE}/customers/${customer.id}/orders`);
        if (res.ok) {
          const json = await res.json();
          for (const raw of json?.items || []) {
            const mapped = mapApiOrder(raw, byNumber.get(raw.order_number));
            if (mapped.id) byNumber.set(mapped.id, mapped);
          }
        }
      } catch {
        // offline fallback
      }
    }

    // Refresh recent local order statuses directly from backend
    await Promise.all(
      local.slice(0, 8).map(async (lo) => {
        if (!lo?.id?.startsWith("GL-")) return;
        try {
          const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(lo.id)}`);
          if (res.ok) {
            const raw = await res.json();
            if (raw?.order_number) byNumber.set(raw.order_number, mapApiOrder(raw, byNumber.get(raw.order_number)));
          }
        } catch {
          // ignore
        }
      })
    );

    setOrders(Array.from(byNumber.values()));
  }, [customer?.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleCancelOrder = async (ord: LiveOrder) => {
    if (!ord.dbId) return;
    setActionMsg(null);
    try {
      await postPublicAPI(`/orders/${ord.dbId}/cancel`, {
        reason: "Cancelled by customer from My Orders",
        order_number: ord.id,
        phone: ord.recipientPhone || customer?.phone || customer?.target,
        customer_id: customer?.id,
      });
      setActionMsg(`Order ${ord.id} has been cancelled.`);
      await loadOrders();
    } catch (err) {
      setActionMsg((err as Error).message || "Cancellation not allowed within cutoff window.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-8 sm:py-12 min-h-[65vh]">
      {justPlaced && (
        <div className="mb-6 p-5 rounded-2xl bg-[#edf8f2] border border-[#b9e2cb] flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-[#246448] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-[#194c35]">
              Order {justPlaced} Confirmed!
            </h2>
            <p className="text-xs sm:text-sm text-[#246448] mt-1">
              Thank you for celebrating with Giftlaya. Order confirmation details have been queued for your phone.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-[#29232a]">
            My Orders
          </h1>
          <p className="text-xs text-[#79717c] mt-0.5">
            Track deliveries, upcoming setups, and past gifts
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-[#fcf2f6] text-[#9b1b45] text-xs font-bold border border-[#f0dce5]"
        >
          Continue Shopping
        </Link>
      </div>

      {actionMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[#faf5f8] border border-[#f0dce5] text-xs font-medium text-[#4a3f4e]">
          {actionMsg}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-14 px-4 rounded-2xl border border-[#eae5e9] bg-white">
          <div className="w-14 h-14 rounded-2xl bg-[#fcf2f6] text-[#9b1b45] grid place-items-center mx-auto mb-3">
            <Package className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-[#292229]">No orders placed yet</h2>
          <p className="text-xs text-[#79717c] mt-1 max-w-xs mx-auto">
            Once you order a cake, bouquet, or balloon setup, you can track it right here.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#9b1b45] text-white text-xs font-semibold"
          >
            <ShoppingBag className="w-4 h-4" /> Explore Gifts
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-[#eae5e9] rounded-[18px] p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#f0edf0]">
                <div>
                  <span className="text-sm font-extrabold text-[#292229]">{order.id}</span>
                  <span className="text-xs text-[#79717c] ml-2">· {order.createdAt}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#edf8f2] text-[#246448] text-[11px] font-bold">
                  {order.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-[#4a3f4e]">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {item.product.title || item.product.name} × {item.quantity}
                    </span>
                    <span className="text-[#79717c]">{item.deliveryDate || "Scheduled"}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#f0edf0] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-[#79717c]">
                  To: <strong className="text-[#292229]">{order.recipientName}</strong> ({order.city})
                </div>
                <div className="flex items-center gap-3">
                  <strong className="text-sm text-[#292229]">
                    Total: ₹{order.total.toLocaleString("en-IN")}
                  </strong>
                  {order.dbId && !/cancel|deliver/i.test(order.status) && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order)}
                      className="inline-flex items-center gap-1 text-rose-600 font-semibold hover:underline cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}
                  <a
                    href={`https://wa.me/918100248353?text=Track%20Order%20${order.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#16805a] font-semibold hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Support
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-gray-500">Loading orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}

