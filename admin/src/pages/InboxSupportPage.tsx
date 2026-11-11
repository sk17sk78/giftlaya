import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Mail, LifeBuoy, Send, Bell, Plus, Users, Image as ImageIcon, Zap } from "lucide-react";
import { adminApi } from "@/api/client";
import { useToast } from "@/components/ui/Toast";

export function InboxSupportPage() {
  const location = useLocation();
  const qc = useQueryClient();
  const { showToast } = useToast();

  type InboxMode =
    | "contact"
    | "product_inquiries"
    | "tickets"
    | "seller_tickets"
    | "wa_inbox"
    | "wa_contacts"
    | "wa_images"
    | "wa_templates"
    | "wa_quick_replies"
    | "email_templates";

  const initialTab = useMemo<InboxMode>(() => {
    const p = location.pathname;
    if (p.includes("/whatsapp/contacts")) return "wa_contacts";
    if (p.includes("/whatsapp/images")) return "wa_images";
    if (p.includes("/whatsapp/templates")) return "wa_templates";
    if (p.includes("/whatsapp/quick-replies")) return "wa_quick_replies";
    if (p.includes("/whatsapp")) return "wa_inbox";
    if (p.includes("/product-inquiries")) return "product_inquiries";
    if (p.includes("/seller-tickets")) return "seller_tickets";
    if (p.includes("/support")) return "tickets";
    if (p.includes("/email-management")) return "email_templates";
    return "contact";
  }, [location.pathname]);

  const [tab, setTab] = useState<InboxMode>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const [selectedWaId, setSelectedWaId] = useState<number | null>(null);
  const [waInput, setWaInput] = useState("");
  const [waContactName, setWaContactName] = useState("");
  const [waContactPhone, setWaContactPhone] = useState("");
  const [qrShortcut, setQrShortcut] = useState("/hello");
  const [qrBody, setQrBody] = useState("");
  const [ticketReply, setTicketReply] = useState<Record<number, string>>({});
  const [ticketNextStatus, setTicketNextStatus] = useState<Record<number, string>>({});

  const [tplEvent, setTplEvent] = useState("order.confirmed");
  const [tplChannel, setTplChannel] = useState<"whatsapp" | "email" | "sms" | "push">(
    initialTab === "wa_templates" ? "whatsapp" : "email"
  );
  const [tplSubject, setTplSubject] = useState("Order {{order_id}} Confirmed");
  const [tplBody, setTplBody] = useState("Hi {{name}}, your order {{order_id}} for slot {{slot}} is confirmed!");

  useEffect(() => {
    if (tab === "wa_templates") setTplChannel("whatsapp");
    else if (tab === "email_templates") setTplChannel("email");
  }, [tab]);

  const { data: inquiries = [] } = useQuery({
    queryKey: ["inquiries"],
    queryFn: () => adminApi.listInquiries(),
    enabled: tab === "contact" || tab === "product_inquiries",
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => adminApi.listSupportTickets(),
    enabled: tab === "tickets" || tab === "seller_tickets",
  });

  const { data: waContacts = [] } = useQuery({
    queryKey: ["wa-contacts"],
    queryFn: () => adminApi.listWhatsappContacts(),
    enabled: tab === "wa_inbox" || tab === "wa_contacts",
  });

  useEffect(() => {
    if (tab === "wa_inbox" && selectedWaId === null && waContacts.length > 0 && waContacts[0].id) {
      setSelectedWaId(waContacts[0].id);
    }
  }, [tab, selectedWaId, waContacts]);

  const { data: waMessages = [] } = useQuery({
    queryKey: ["wa-messages", selectedWaId],
    queryFn: () => adminApi.listWhatsappMessages(selectedWaId!),
    enabled: tab === "wa_inbox" && selectedWaId !== null,
  });

  const { data: waMedia } = useQuery({
    queryKey: ["wa-media"],
    queryFn: () => adminApi.listMediaAssets(undefined, undefined, 1),
    enabled: tab === "wa_images",
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["notification-templates"],
    queryFn: () => adminApi.listNotificationTemplates(),
    enabled: tab === "email_templates" || tab === "wa_templates",
  });

  const { data: waSettings = [] } = useQuery({
    queryKey: ["site-settings-whatsapp"],
    queryFn: () => adminApi.listSiteSettings("whatsapp"),
    enabled: tab === "wa_quick_replies" || tab === "wa_inbox",
  });

  const quickReplies = useMemo(() => {
    const found = waSettings.find((s) => s.key === "whatsapp_quick_replies");
    const items = (found?.value_json as { items?: Array<{ id?: number; shortcut: string; title?: string; body: string }> } | undefined)?.items;
    return Array.isArray(items) ? items : [];
  }, [waSettings]);

  const waSendMut = useMutation({
    mutationFn: () => adminApi.sendWhatsappMessage(selectedWaId!, waInput),
    onSuccess: () => {
      setWaInput("");
      qc.invalidateQueries({ queryKey: ["wa-messages", selectedWaId] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const saveTplMut = useMutation({
    mutationFn: () =>
      adminApi.saveNotificationTemplate({
        event_key: tplEvent,
        channel: tplChannel,
        subject: tplSubject,
        body_template: tplBody,
        is_active: true,
      }),
    onSuccess: () => {
      showToast("Notification template saved", "success");
      qc.invalidateQueries({ queryKey: ["notification-templates"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  return (
    <div className="space-y-4 animate-bd-fade-up">
      <div>
        <h1 className="font-heading text-xl font-bold flex items-center gap-2">
          <MessageCircle size={20} className="text-[#4f6ef7]" />
          {tab === "wa_contacts"
            ? "WhatsApp Contacts Directory"
            : tab === "wa_images"
            ? "WhatsApp Media Images"
            : tab === "wa_templates"
            ? "WhatsApp Message Templates"
            : tab === "wa_quick_replies"
            ? "WhatsApp Quick Replies"
            : tab === "wa_inbox"
            ? "WhatsApp Support Inbox"
            : tab === "product_inquiries"
            ? "Product Inquiries"
            : tab === "seller_tickets"
            ? "Seller Support Tickets"
            : tab === "tickets"
            ? "Customer Support Tickets"
            : tab === "email_templates"
            ? "Email & Notification Templates"
            : "Contact Us Submissions"}
        </h1>
      </div>

      <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
        {(
          [
            ["wa_inbox", "WA Inbox", MessageCircle],
            ["wa_contacts", "WA Contacts", Users],
            ["wa_images", "WA Images", ImageIcon],
            ["wa_templates", "WA Templates", Bell],
            ["wa_quick_replies", "Quick Replies", Zap],
            ["contact", "Contact Us", Mail],
            ["product_inquiries", "Product Inquiries", Mail],
            ["tickets", "Support Tickets", LifeBuoy],
            ["seller_tickets", "Seller Tickets", LifeBuoy],
            ["email_templates", "Email Templates", Bell],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
              tab === id ? "bg-[#4f6ef7] text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {(tab === "contact" || tab === "product_inquiries") && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {inquiries
            .filter((iq) =>
              tab === "product_inquiries"
                ? iq.inquiry_type === "product_inquiry"
                : iq.inquiry_type === "contact" || iq.inquiry_type === "callback"
            )
            .map((iq) => (
              <div key={iq.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold capitalize">
                    [{(iq.inquiry_type || "").replaceAll("_", " ")}] {iq.name} · {iq.phone} {iq.city ? `· ${iq.city}` : ""}
                  </p>
                  <p className="text-slate-600 mt-0.5">{iq.subject || iq.message}</p>
                  {iq.subject && iq.message && <p className="text-[11px] text-slate-400 mt-0.5">{iq.message}</p>}
                </div>
                <select
                  value={iq.status}
                  onChange={(e) =>
                    adminApi.updateInquiryStatus(iq.id!, e.target.value).then(() => {
                      showToast("Updated status", "success");
                      qc.invalidateQueries({ queryKey: ["inquiries"] });
                    })
                  }
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            ))}
        </div>
      )}

      {(tab === "tickets" || tab === "seller_tickets") && (
        <div className="space-y-3 text-xs">
          {tickets
            .filter((tk) =>
              tab === "seller_tickets" ? tk.source_type === "seller" : tk.source_type !== "seller"
            )
            .map((tk) => {
              const rawMsgs = tk.messages_json as unknown;
              const msgs = Array.isArray(rawMsgs)
                ? (rawMsgs as Array<{ sender?: string; body?: string; email?: string; sent_at?: string }>)
                : [];
              const replyText = (ticketReply[tk.id!] || "").trim();
              const nextStatus = ticketNextStatus[tk.id!] || "in_progress";
              return (
                <div key={tk.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">
                      #{tk.ticket_number} · {tk.subject}
                      {tk.order_id ? ` · Order #${tk.order_id}` : ""}
                    </p>
                    <span className="capitalize px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                      {(tk.status || "open").replaceAll("_", " ")}
                    </span>
                  </div>
                  {msgs.length > 0 && (
                    <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 max-h-48 overflow-y-auto">
                      {msgs.map((m, idx) => (
                        <div key={idx} className="text-[11px] leading-relaxed">
                          <span className="font-bold capitalize text-slate-700 dark:text-slate-200">
                            {m.sender === "admin" ? "Support" : m.sender || "Customer"}:
                          </span>{" "}
                          <span className="text-slate-600 dark:text-slate-300">{m.body}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={ticketReply[tk.id!] || ""}
                      onChange={(e) => setTicketReply((s) => ({ ...s, [tk.id!]: e.target.value }))}
                      placeholder="Write reply..."
                      className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700"
                    />
                    <select
                      value={nextStatus}
                      onChange={(e) => setTicketNextStatus((s) => ({ ...s, [tk.id!]: e.target.value }))}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button
                      type="button"
                      disabled={!replyText}
                      onClick={() =>
                        adminApi.replySupportTicket(tk.id!, replyText, nextStatus).then(() => {
                          showToast("Reply sent", "success");
                          setTicketReply((s) => ({ ...s, [tk.id!]: "" }));
                          qc.invalidateQueries({ queryKey: ["support-tickets"] });
                        })
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-[#4f6ef7] disabled:opacity-50 text-white font-semibold cursor-pointer"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {tab === "wa_inbox" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {waContacts.length === 0 ? (
              <p className="p-6 text-center text-slate-400">No WhatsApp contacts yet.</p>
            ) : (
              waContacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedWaId(c.id!)}
                  className={`w-full text-left px-4 py-3 cursor-pointer ${
                    selectedWaId === c.id ? "bg-indigo-50 dark:bg-indigo-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <p className="font-bold">{c.name || c.phone}</p>
                  <p className="text-[11px] text-slate-400">{c.phone}</p>
                </button>
              ))
            )}
          </div>
          <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between min-h-[280px]">
            {!selectedWaId ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-center py-8">
                Select a conversation on the left to view or send WhatsApp messages.
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {waMessages.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">
                      No messages in this thread yet. Send a quick reply below to start the conversation.
                    </p>
                  ) : (
                    waMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-xl max-w-[75%] ${
                          m.direction === "out" ? "ml-auto bg-[#4f6ef7] text-white" : "bg-slate-100 dark:bg-slate-800"
                        }`}
                      >
                        {m.body}
                      </div>
                    ))
                  )}
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {quickReplies.map((qr, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setWaInput(qr.body)}
                          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          {qr.shortcut}
                        </button>
                      ))}
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      waSendMut.mutate();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      required
                      value={waInput}
                      onChange={(e) => setWaInput(e.target.value)}
                      placeholder="Send WhatsApp message..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                    />
                    <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold cursor-pointer">
                      <Send size={13} />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "wa_contacts" && (
        <div className="space-y-4 text-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              adminApi
                .saveWhatsappContact({ phone: waContactPhone, name: waContactName })
                .then(() => {
                  showToast("WhatsApp contact saved", "success");
                  setWaContactPhone("");
                  setWaContactName("");
                  qc.invalidateQueries({ queryKey: ["wa-contacts"] });
                })
                .catch((err: Error) => showToast(err.message, "error"));
            }}
            className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
          >
            <input required value={waContactPhone} onChange={(e) => setWaContactPhone(e.target.value)} placeholder="Phone (+9198...)" className="px-3 py-2 rounded-xl border border-slate-200 w-48" />
            <input value={waContactName} onChange={(e) => setWaContactName(e.target.value)} placeholder="Contact Name" className="px-3 py-2 rounded-xl border border-slate-200 flex-1 min-w-[180px]" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
              <Plus size={13} className="inline mr-1" /> Add Contact
            </button>
          </form>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {waContacts.map((c) => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold">{c.name || "Customer"}</p>
                  <p className="text-[11px] text-slate-400">{c.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWaId(c.id!);
                    setTab("wa_inbox");
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold cursor-pointer"
                >
                  Open Chat
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "wa_images" && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">WhatsApp Media Assets Gallery</p>
            <label className="px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
              Upload WA Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    adminApi.uploadMedia(f, "whatsapp", f.name).then(() => {
                      showToast("Uploaded image for WhatsApp", "success");
                      qc.invalidateQueries({ queryKey: ["wa-media"] });
                    });
                  }
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(waMedia?.items || []).map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-200 overflow-hidden p-2 space-y-1">
                <img src={m.cdn_url} alt={m.alt_text || "WA Asset"} className="w-full h-28 object-cover rounded-lg bg-slate-100" />
                <p className="text-[10px] font-mono truncate text-slate-500">{m.cdn_url}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "wa_quick_replies" && (
        <div className="space-y-4 text-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const next = [...quickReplies, { id: Date.now(), shortcut: qrShortcut, title: qrShortcut, body: qrBody }];
              adminApi.upsertSiteSetting("whatsapp_quick_replies", "whatsapp", { items: next }).then(() => {
                showToast("Quick reply added", "success");
                setQrBody("");
                qc.invalidateQueries({ queryKey: ["site-settings-whatsapp"] });
              });
            }}
            className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
          >
            <input required value={qrShortcut} onChange={(e) => setQrShortcut(e.target.value)} placeholder="/shortcut" className="px-3 py-2 rounded-xl border border-slate-200 w-36 font-mono" />
            <input required value={qrBody} onChange={(e) => setQrBody(e.target.value)} placeholder="Quick reply message..." className="flex-1 min-w-[240px] px-3 py-2 rounded-xl border border-slate-200" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">Save Shortcut</button>
          </form>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {quickReplies.map((qr, i) => (
              <div key={i} className="p-4 flex justify-between gap-3">
                <div>
                  <p className="font-mono font-bold text-[#4f6ef7]">{qr.shortcut}</p>
                  <p className="text-slate-600 mt-0.5">{qr.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = quickReplies.filter((_, j) => j !== i);
                    adminApi.upsertSiteSetting("whatsapp_quick_replies", "whatsapp", { items: next }).then(() => qc.invalidateQueries({ queryKey: ["site-settings-whatsapp"] }));
                  }}
                  className="text-rose-500 font-semibold cursor-pointer"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(tab === "email_templates" || tab === "wa_templates") && (
        <div className="space-y-4 text-xs">
          <form onSubmit={(e) => { e.preventDefault(); saveTplMut.mutate(); }} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input required value={tplEvent} onChange={(e) => setTplEvent(e.target.value)} placeholder="Event key (order.confirmed)" className="px-3 py-2 rounded-xl border border-slate-200" />
              <select value={tplChannel} onChange={(e) => setTplChannel(e.target.value as "whatsapp" | "email" | "sms" | "push")} className="px-3 py-2 rounded-xl border border-slate-200">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
              </select>
              <input value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} placeholder="Subject" className="px-3 py-2 rounded-xl border border-slate-200" />
            </div>
            <textarea required rows={3} value={tplBody} onChange={(e) => setTplBody(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
              Save Notification Template
            </button>
          </form>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {templates
              .filter((t) => (tab === "wa_templates" ? t.channel === "whatsapp" : true))
              .map((t) => (
                <div key={t.id} className="p-4">
                  <p className="font-bold">
                    {t.event_key} · <span className="uppercase text-[#4f6ef7]">{t.channel}</span>
                  </p>
                  <p className="text-slate-600 mt-1">{t.body_template}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

