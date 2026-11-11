"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Send, AlertCircle } from "lucide-react";
import { useUI } from "@/context/UIContext";
import { API_BASE_URL, postPublicAPI } from "@/services/api";

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

function formatDateTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(status: string) {
  const s = (status || "open").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SupportTicketThreadPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params?.id;
  const { customer } = useUI();
  const baseUrl = API_BASE_URL || "http://localhost:8080/api/v1/public";

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setIsNew(new URLSearchParams(window.location.search).get("new") === "1");
    } catch {
      // ignore
    }
  }, []);

  const loadTicket = useCallback(async () => {
    if (!customer?.id || !ticketId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/customers/${customer.id}/tickets/${ticketId}`);
      if (!res.ok) {
        setError("We could not load this support ticket.");
        setTicket(null);
      } else {
        const data = await res.json();
        setTicket(data);
      }
    } catch {
      setError("Network error while loading ticket.");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, customer?.id, ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id || !ticketId) return;
    const text = reply.trim();
    if (!text) return;

    setSending(true);
    setError("");
    try {
      const updated = await postPublicAPI<{
        id: number;
        status: string;
        messages_json: TicketMessage[];
      }>(`/customers/${customer.id}/tickets/${ticketId}/reply`, {
        message: text,
      });
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status || prev.status,
              messages_json: Array.isArray(updated.messages_json)
                ? updated.messages_json
                : prev.messages_json,
              updated_at: new Date().toISOString(),
            }
          : prev
      );
      setReply("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reply.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 max-w-2xl">
        <div className="h-6 w-36 bg-[#f3edf3] rounded animate-pulse" />
        <div className="h-44 bg-white border border-[#e9e2e9] rounded-[20px] animate-pulse" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-2xl bg-white border border-[#e9e2e9] rounded-[20px] p-6 text-center space-y-3">
        <p className="text-sm font-bold text-[#292229]">Ticket not found</p>
        <p className="text-xs text-[#7b6f7d]">{error || "It may belong to another account."}</p>
        <Link
          href="/dashboard/support"
          className="inline-flex min-h-[44px] px-4 rounded-[11px] bg-[#a72055] text-white text-xs font-semibold items-center justify-center"
        >
          Back to Help &amp; Support
        </Link>
      </div>
    );
  }

  const messages = Array.isArray(ticket.messages_json) ? ticket.messages_json : [];
  const title = CATEGORY_LABELS[ticket.subject] || ticket.subject || "Support request";

  return (
    <div className="grid gap-4 max-w-2xl">
      <div>
        <Link
          href="/dashboard/support"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#876680] hover:text-[#a72055] min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Help &amp; Support</span>
        </Link>
      </div>

      {isNew && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-[16px] bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <strong className="font-semibold">Ticket created!</strong> Our team has received your message and will reply here shortly.
          </div>
        </div>
      )}

      {/* Header card */}
      <section className="bg-white border border-[#e9e2e9] rounded-[20px] p-4 sm:p-5 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="text-lg font-extrabold text-[#292229] leading-tight">
            {title}
          </h1>
          <p className="text-xs text-[#7b6f7d]">
            {ticket.ticket_number}
            {ticket.order_number ? ` · Order ${ticket.order_number}` : ""}
            {ticket.created_at ? ` · Created ${formatDateTime(ticket.created_at)}` : ""}
          </p>
        </div>
        <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#fdf0f6] border border-[#f4dbe6] text-[#a72055]">
          {formatStatus(ticket.status)}
        </span>
      </section>

      {/* Conversation thread */}
      <section className="bg-white border border-[#e9e2e9] rounded-[20px] p-4 sm:p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#7b6f7d]">
          Conversation
        </h2>
        <div className="space-y-3">
          {messages.map((msg, idx) => {
            const fromCustomer = msg.sender === "customer";
            return (
              <div
                key={`${msg.sent_at || idx}-${idx}`}
                className={`flex ${fromCustomer ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs space-y-1 ${
                    fromCustomer
                      ? "bg-[#fdf0f6] border border-[#f4dbe6] text-[#292229]"
                      : "bg-[#faf8fa] border border-[#e9e2e9] text-[#292229]"
                  }`}
                >
                  <p className="text-[10px] font-semibold text-[#7b6f7d]">
                    {fromCustomer ? "You" : "Giftlaya Support"}
                  </p>
                  <p className="leading-relaxed whitespace-pre-wrap break-words">
                    {msg.body}
                  </p>
                  {msg.sent_at && (
                    <p className="text-[10px] text-[#8d7d8f]">
                      {formatDateTime(msg.sent_at)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Reply composer */}
      <form
        onSubmit={handleReply}
        className="bg-white border border-[#e9e2e9] rounded-[20px] p-4 sm:p-5 space-y-3"
      >
        <label
          htmlFor="ticket-reply"
          className="block text-xs font-semibold text-[#352c36]"
        >
          Send a reply
        </label>
        <textarea
          id="ticket-reply"
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Add more details or reply to our support team..."
          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#e4d9e4] text-[#292229] outline-none focus:border-[#a72055] resize-y"
        />

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            className="min-h-[44px] px-5 rounded-[11px] bg-[#a72055] hover:bg-[#901a48] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a72055]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? "Sending..." : "Send reply"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

