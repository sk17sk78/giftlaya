"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OrderRecord } from "@/types";
import { API_BASE_URL } from "@/services/api";
import { getCartItemUnitPrice } from "@/context/CartContext";
import { CheckCircle2, XCircle, MapPin, CreditCard, Package } from "lucide-react";

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || searchParams.get("id") || "";
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    if (!orderId) {
      setChecked(true);
      return;
    }
    try {
      const saved: OrderRecord[] = JSON.parse(localStorage.getItem("giftlaya_orders") || "[]");
      const match = saved.find((o) => o.id === orderId) || null;
      if (match) {
        setOrder(match);
        setChecked(true);
        return;
      }
    } catch {
      // ignore localStorage failure and fall back to backend lookup
    }
    const base = API_BASE_URL || "http://localhost:8080/api/v1/public";
    fetch(`${base}/orders/${encodeURIComponent(orderId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        if (!active || !raw?.order_number) return;
        let addrObj: Record<string, any> = {};
        try {
          addrObj =
            typeof raw.shipping_address_json === "string"
              ? JSON.parse(raw.shipping_address_json)
              : raw.shipping_address_json || {};
        } catch {
          addrObj = {};
        }
        const addrText = [
          addrObj.address_line1,
          addrObj.landmark,
          raw.city_name || addrObj.city,
          addrObj.pincode,
        ]
          .filter(Boolean)
          .join(", ");
        const mappedItems = Array.isArray(raw.items)
          ? raw.items.map((it: any) => {
              let addons: any[] = [];
              try {
                const parsedAddons =
                  typeof it.addons_json === "string" ? JSON.parse(it.addons_json) : it.addons_json;
                if (Array.isArray(parsedAddons)) {
                  addons = parsedAddons.map((a: any) => ({
                    id: Number(a.addon_id || a.id || 0),
                    name: a.name || "Add-on",
                    price: Math.round(Number(a.price_paise || 0) / 100),
                    quantity: Number(a.qty || a.quantity || 1),
                  }));
                }
              } catch {
                addons = [];
              }
              return {
                product: {
                  id: String(it.product_id || it.id || "item"),
                  dbId: Number(it.product_id || 0),
                  title: it.product_title_snapshot || it.product_title || "Giftlaya Order Item",
                  name: it.product_title_snapshot || it.product_title || "Giftlaya Order Item",
                  slug: "",
                  href: "#",
                  image: "",
                  price: Math.round(Number(it.unit_price_paise || 0) / 100),
                  originalPrice: Math.round(Number(it.unit_price_paise || 0) / 100),
                },
                quantity: Number(it.qty || 1),
                selectedAddons: addons,
              };
            })
          : [];
        setOrder({
          id: raw.order_number,
          createdAt: raw.created_at
            ? new Date(raw.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : new Date().toLocaleDateString("en-IN"),
          status: raw.status || "Placed",
          city: raw.city_name || addrObj.city || "",
          recipientName: raw.recipient_name || "Guest",
          recipientPhone: raw.recipient_phone || "",
          address: addrText,
          total: Math.round(Number(raw.total_paise || 0) / 100),
          paymentMethod: String(raw.payment_method || "COD").toUpperCase(),
          items: mappedItems,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecked(true);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (!checked) {
    return (
      <div className="min-h-[65vh] bg-[#f4f5f7] flex items-center justify-center p-6">
        <div className="w-full max-w-[360px] h-[260px] rounded-2xl bg-white border border-[#ece9ee] animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[65vh] bg-[#f4f5f7] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[360px] bg-white rounded-2xl border border-[#ece9ee] shadow-sm p-6 sm:p-7 text-center">
          <div className="w-12 h-12 rounded-full bg-[#fdf1f2] text-[#e14b5a] flex items-center justify-center mx-auto mb-3.5">
            <XCircle className="w-6 h-6" strokeWidth={1.8} />
          </div>
          <h1 className="font-heading text-lg font-bold text-[#292229]">Order not found</h1>
          <p className="text-xs text-[#6e6472] mt-1.5 leading-relaxed">
            No order ID was provided. Please check your confirmation SMS or contact support.
          </p>

          <div className="mt-5 space-y-2.5">
            <Link
              href="/dashboard/orders"
              className="block w-full py-2.5 rounded-xl bg-[#be2c5c] hover:bg-[#9b1b45] text-white text-xs font-bold transition-colors"
            >
              View My Orders
            </Link>
            <Link
              href="/"
              className="block w-full py-2.5 rounded-xl bg-[#f3f3f6] hover:bg-[#e9e8ec] text-[#352a30] text-xs font-semibold transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[65vh] bg-[#faf8fa] py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-3xl border border-[#ece5ea] shadow-sm p-6 sm:p-8 space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[#eaf7f0] text-[#1a8754] flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1a8754]">
            Order Placed Successfully
          </p>
          <h1 className="font-heading text-xl sm:text-2xl font-extrabold text-[#292229] mt-1">
            Thank you for gifting with Giftlaya!
          </h1>
          <p className="text-xs text-[#6d6270] mt-1">
            Order ID: <strong className="text-[#9b1b45]">{order.id}</strong> · {order.createdAt}
          </p>
        </div>

        <div className="border-t border-b border-[#f0e9ec] py-4 space-y-2.5 text-xs text-[#4f4353]">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[#9b1b45] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#292229]">{order.recipientName}</p>
              <p>{order.address} · {order.city}</p>
              <p className="text-[#79717c]">{order.recipientPhone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#9b1b45] shrink-0" />
            <span>Payment Method: <strong>{order.paymentMethod}</strong></span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-[#292229] flex items-center gap-1.5">
            <Package className="w-4 h-4 text-[#9b1b45]" /> Items ({order.items.length})
          </p>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs text-[#4f4353]">
              <span className="truncate pr-2">
                {item.product.title || item.product.name}
                {item.selectedWeight ? ` (${item.selectedWeight})` : ""} × {item.quantity}
              </span>
              <span className="font-semibold shrink-0">
                ₹{(getCartItemUnitPrice(item) * item.quantity).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-extrabold text-[#292229] pt-2 border-t border-[#f0e9ec]">
            <span>Total Paid</span>
            <span>₹{order.total.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            href="/dashboard/orders"
            className="text-center py-2.5 rounded-xl bg-[#9b1b45] hover:bg-[#7d1538] text-white text-xs font-bold transition-colors"
          >
            View My Orders
          </Link>
          <Link
            href="/"
            className="text-center py-2.5 rounded-xl border border-[#e3dce1] text-[#352a30] hover:border-[#9b1b45] text-xs font-semibold transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[65vh] bg-[#f4f5f7] flex items-center justify-center p-6">
          <div className="w-full max-w-[360px] h-[260px] rounded-2xl bg-white border border-[#ece9ee]" />
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}

