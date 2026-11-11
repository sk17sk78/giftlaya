"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  MessageSquarePlus,
  Ticket as TicketIcon,
} from "lucide-react";
import { useUI } from "@/context/UIContext";
import { API_BASE_URL } from "@/services/api";
import { DashboardSvgIcon } from "@/components/dashboard/DashboardIcons";

interface TicketMessage {
  sender: string;
  body: string;
  email?: string;
  sent_at?: string;
}

interface SupportTicket {
  id: number;
  ticket_number: string;
  order_number?: string;
  subject: string;
  status: string;
  priority?: string;
  messages_json: TicketMessage[];
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  order: "Order issue",
  delivery: "Delivery timing",
  cancellation: "Cancellation request",
  refund: "Refund",
  reschedule: "Reschedule",
  quality: "Quality concern",
  changes: "Order changes",
  decoration: "Decoration details",
  payment: "Payment",
  other: "Other enquiry",
};

const FAQS = [
  {
    q: "How do I reschedule or change my decoration slot?",
    a: "Raise a ticket under Reschedule or Order changes at least 12 hours before your scheduled slot and our operations team will confirm the updated timing.",
  },
  {
    q: "When are Giftlaya Coins credited for my booking?",
    a: "Pending coins show on your Rewards page as soon as your booking is placed and are credited to your wallet once the order is marked completed.",
  },
  {
    q: "How do cancellations and refunds work?",
    a: "Refund eligibility depends on how early a request is raised before the event slot. You can review full rules in our Cancellation & Return Policy before requesting a cancellation.",
  },
  {
    q: "Where can I check who is assigned to my decoration?",
    a: "Open My orders and select any booking to view event date, slot timing, delivery address, and live status updates.",
  },
];

function statusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case "resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "closed":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "in_progress":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-[#fdf0f6] text-[#a72055] border-[#f4dbe6]";
  }
}

function formatStatus(status: string) {
  const s = (status || "open").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DashboardSupportPage() {
  const { customer } = useUI();
  const baseUrl = API_BASE_URL || "http://localhost:8080/api/v1/public";

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  useEffect(() => {
    if (!customer?.id) return;
    setLoading(true);
    fetch(`${baseUrl}/customers/${customer.id}/tickets`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setTickets(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setTickets([]);
      })
      .finally(() => setLoading(false));
  }, [baseUrl, customer?.id]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <DashboardSvgIcon kind="support" size={44} />
          <div className="min-w-0">
            <h1 className="text-[21px] font-extrabold tracking-tight text-[#292229] leading-tight">
              Help &amp; Support
            </h1>
            <p className="text-xs text-[#7b6f7d] mt-0.5">
              Track your support tickets or start a conversation with us
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/support/new"
          className="min-h-[44px] px-4 rounded-[12px] bg-[#a72055] hover:bg-[#901a48] text-white text-xs font-semibold inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055]"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Raise a ticket</span>
        </Link>
      </div>

      {/* Need help banner */}
      <section className="bg-white border border-[#e9e2e9] rounded-[20px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-bold text-[#292229]">
            Need help with an order?
          </h2>
          <p className="text-xs text-[#6f6371] mt-1 leading-relaxed max-w-[60ch]">
            Select your booking and topic to reach our celebration support desk. Replies appear here directly.
          </p>
        </div>
        <Link
          href="/dashboard/support/new"
          className="shrink-0 min-h-[44px] px-4 rounded-[11px] bg-[#fdf0f6] border border-[#f4dbe6] text-[#a72055] hover:bg-[#fae2ee] text-xs font-semibold inline-flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055]"
        >
          <span>Raise a ticket</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* My tickets */}
      <section className="bg-white border border-[#e9e2e9] rounded-[20px] overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#f0e9ef] flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-[#292229]">My tickets</h2>
          {!loading && tickets.length > 0 && (
            <span className="text-[11px] text-[#7b6f7d]">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-[#f2edf1]">
            {[1, 2].map((k) => (
              <div key={k} className="p-4 sm:p-5 animate-pulse space-y-2">
                <div className="h-3.5 w-1/3 bg-[#f3edf3] rounded" />
                <div className="h-3 w-2/3 bg-[#f7f3f7] rounded" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-10 px-6 text-center flex flex-col items-center">
            <span className="w-12 h-12 rounded-2xl bg-[#fdf0f6] border border-[#f4dbe6] grid place-items-center mb-3 text-[#a72055]">
              <TicketIcon className="w-5 h-5" />
            </span>
            <p className="text-sm font-bold text-[#292229]">No tickets yet</p>
            <p className="text-xs text-[#7b6f7d] mt-1 max-w-[42ch] leading-relaxed">
              Whenever you have a question about a decoration, reschedule, payment, or refund, raise a ticket here.
            </p>
            <Link
              href="/dashboard/support/new"
              className="mt-4 min-h-[44px] px-5 rounded-[11px] bg-[#a72055] hover:bg-[#901a48] text-white text-xs font-semibold inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055]"
            >
              Raise a ticket
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#f2edf1]">
            {tickets.map((t) => {
              const msgs = Array.isArray(t.messages_json) ? t.messages_json : [];
              const lastMsg = msgs[msgs.length - 1];
              const title = CATEGORY_LABELS[t.subject] || t.subject || "Support request";
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/support/${t.id}`}
                  className="flex items-start justify-between gap-3 p-4 sm:p-5 hover:bg-[#fcf9fc] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#a72055]"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold text-[#292229]">
                        {title}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle(
                          t.status
                        )}`}
                      >
                        {formatStatus(t.status)}
                      </span>
                      {t.order_number && (
                        <span className="text-[11px] text-[#7b6f7d] bg-[#faf6f9] border border-[#ece3ec] rounded-md px-2 py-0.5">
                          Order {t.order_number}
                        </span>
                      )}
                    </div>
                    {lastMsg?.body && (
                      <p className="text-xs text-[#6f6371] line-clamp-1">
                        {lastMsg.body}
                      </p>
                    )}
                    <p className="text-[11px] text-[#8d7d8f]">
                      {t.ticket_number} · Updated {formatDate(t.updated_at || t.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9a879b] shrink-0 mt-1" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Common questions */}
      <section className="bg-white border border-[#e9e2e9] rounded-[20px] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-[14px] font-bold text-[#292229]">Common questions</h2>
          <div className="flex items-center gap-3 text-[11px] font-medium text-[#a72055]">
            <Link
              href="/pages/cancellation-and-return"
              className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055]"
            >
              Cancellation &amp; Return Policy
            </Link>
            <Link
              href="/pages/terms-and-conditions"
              className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055]"
            >
              Terms &amp; Conditions
            </Link>
          </div>
        </div>

        <div className="divide-y divide-[#f2edf1]">
          {FAQS.map((item, idx) => {
            const expanded = openFaqIdx === idx;
            return (
              <div key={item.q} className="py-2.5 first:pt-1 last:pb-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpenFaqIdx(expanded ? null : idx)}
                  className="w-full min-h-[44px] flex items-center justify-between gap-3 text-left text-[13px] font-semibold text-[#352c36] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055]"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#8d778f] shrink-0 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expanded && (
                  <p className="text-xs text-[#665b68] leading-relaxed pb-2 pr-6 max-w-[68ch]">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

