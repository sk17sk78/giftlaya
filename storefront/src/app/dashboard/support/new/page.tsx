"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Send } from "lucide-react";
import { useUI } from "@/context/UIContext";
import { API_BASE_URL, postPublicAPI } from "@/services/api";

interface CustomerOrderSummary {
  id: number;
  order_number: string;
  status: string;
  total_paise: number;
  delivery_date?: string;
  items?: Array<{ product_title?: string }>;
}

const CATEGORIES = [
  { key: "order", label: "Order issue" },
  { key: "delivery", label: "Delivery timing" },
  { key: "cancellation", label: "Cancellation" },
  { key: "refund", label: "Refund" },
  { key: "reschedule", label: "Reschedule" },
  { key: "quality", label: "Quality" },
  { key: "changes", label: "Order changes" },
  { key: "decoration", label: "Decoration details" },
  { key: "payment", label: "Payment" },
  { key: "other", label: "Other" },
];

export default function NewSupportTicketPage() {
  const router = useRouter();
  const { customer } = useUI();
  const baseUrl = API_BASE_URL || "http://localhost:8080/api/v1/public";

  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [orderNumber, setOrderNumber] = useState("");
  const [category, setCategory] = useState("order");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(customer?.email || "");
  const [ackCancel, setAckCancel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const paramOrder = new URLSearchParams(window.location.search).get("order");
      if (paramOrder) setOrderNumber(paramOrder);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (customer?.email && !email) {
      setEmail(customer.email);
    }
  }, [customer?.email, email]);

  useEffect(() => {
    if (!customer?.id) return;
    fetch(`${baseUrl}/customers/${customer.id}/orders`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        const list = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        setOrders(list);
      })
      .catch(() => setOrders([]));
  }, [baseUrl, customer?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!customer?.id) return;

    const cleanMessage = message.trim();
    if (cleanMessage.length < 5) {
      setError("Please share at least a few words describing how we can help.");
      return;
    }
    if (category === "cancellation" && !ackCancel) {
      setError("Please confirm that you understand the cancellation policy.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await postPublicAPI<{ id: number }>(
        `/customers/${customer.id}/tickets`,
        {
          category,
          message: cleanMessage,
          order_number: orderNumber || undefined,
          email: email.trim() || undefined,
        }
      );
      router.push(`/dashboard/support/${created.id}?new=1`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit your ticket. Please try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4 max-w-2xl">
      <div>
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#876680] hover:text-[#a72055] min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Help &amp; Support</span>
        </Link>
        <h1 className="text-[21px] font-extrabold tracking-tight text-[#292229] leading-tight">
          Raise a ticket
        </h1>
        <p className="text-xs text-[#7b6f7d] mt-0.5">
          Share the details below and our support team will reply here.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#e9e2e9] rounded-[20px] p-4 sm:p-6 space-y-5"
      >
        <div>
          <label
            htmlFor="ticket-order-select"
            className="block text-xs font-semibold text-[#352c36] mb-1.5"
          >
            Related booking
          </label>
          <select
            id="ticket-order-select"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl border border-[#e4d9e4] bg-white text-[#292229] outline-none focus:border-[#a72055] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#a72055]"
          >
            <option value="">Not about a specific order</option>
            {orders.map((o) => {
              const title = o.items?.[0]?.product_title;
              const rupees = Math.round((o.total_paise || 0) / 100);
              return (
                <option key={o.id} value={o.order_number}>
                  {o.order_number}
                  {title ? ` · ${title}` : ""}
                  {rupees > 0 ? ` · ₹${rupees.toLocaleString("en-IN")}` : ""}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <span className="block text-xs font-semibold text-[#352c36] mb-2">
            What can we help you with?
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const selected = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCategory(c.key)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055] ${
                    selected
                      ? "bg-[#fdf0f6] border-[#a72055] text-[#a72055] font-semibold"
                      : "bg-white border-[#e4d9e4] text-[#5c505e] hover:border-[#dcb9cd]"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {category === "cancellation" && (
          <div className="rounded-xl bg-[#fff8ef] border border-[#f5dfc0] p-3.5 space-y-2.5">
            <p className="text-xs text-[#69481f] leading-relaxed">
              Cancellation charges depend on how many hours remain before your scheduled slot. Read the full{" "}
              <Link
                href="/pages/cancellation-and-return"
                className="font-semibold underline text-[#a72055]"
              >
                Cancellation &amp; Return Policy
              </Link>
              .
            </p>
            <label className="flex items-start gap-2.5 text-xs text-[#514254] cursor-pointer">
              <input
                type="checkbox"
                checked={ackCancel}
                onChange={(e) => setAckCancel(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#a72055] rounded cursor-pointer"
              />
              <span>I understand that cancellation policy terms apply to this request.</span>
            </label>
          </div>
        )}

        <div>
          <label
            htmlFor="ticket-message"
            className="block text-xs font-semibold text-[#352c36] mb-1.5"
          >
            Tell us what happened *
          </label>
          <textarea
            id="ticket-message"
            rows={4}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your question, preferred timing, or request clearly..."
            className="w-full px-3.5 py-3 text-xs rounded-xl border border-[#e4d9e4] text-[#292229] outline-none focus:border-[#a72055] resize-y"
          />
          <p className="text-[11px] text-[#7b6f7d] mt-1">
            Minimum 5 characters.
          </p>
        </div>

        <div>
          <label
            htmlFor="ticket-email"
            className="block text-xs font-semibold text-[#352c36] mb-1.5"
          >
            Email for updates{" "}
            <span className="text-[11px] font-normal text-[#7b6f7d]">(Optional)</span>
          </label>
          <input
            id="ticket-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl border border-[#e4d9e4] text-[#292229] outline-none focus:border-[#a72055]"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/dashboard/support"
            className="min-h-[44px] px-4 rounded-[11px] bg-white border border-[#e4d9e4] text-[#6f6371] hover:border-[#dcb9cd] text-xs font-semibold inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] px-5 rounded-[11px] bg-[#a72055] hover:bg-[#901a48] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? "Submitting..." : "Submit ticket"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

