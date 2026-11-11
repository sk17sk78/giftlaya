import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  CheckCircle,
  XCircle,
  Wallet,
  Building2,
  Plus,
  Briefcase,
} from "lucide-react";
import { adminApi } from "@/api/client";
import { FormModal } from "@/components/ui/FormModal";
import { PermissionGuard } from "@/components/ui/PermissionGuard";
import { useToast } from "@/components/ui/Toast";

function rs(paise?: number) {
  return `₹${((paise ?? 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export function SellersMarketplacePage() {
  const location = useLocation();
  const qc = useQueryClient();
  const { showToast } = useToast();

  const initialTab = useMemo(() => {
    const p = location.pathname;
    if (p.includes("seller-requests")) return "requests";
    if (p.includes("seller-products")) return "products";
    if (p.includes("seller-payouts")) return "payouts";
    if (p.includes("franchise")) return "franchise";
    if (p.includes("vendor-requests")) return "vendor_requests";
    if (p.includes("vendors")) return "vendors";
    return "sellers";
  }, [location.pathname]);

  type MarketplaceTab = "sellers" | "requests" | "products" | "payouts" | "franchise" | "vendors" | "vendor_requests";
  const [tab, setTab] = useState<MarketplaceTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const [vendorCityId, setVendorCityId] = useState("1");
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorCap, setVendorCap] = useState("8");
  const [newSellerOpen, setNewSellerOpen] = useState(false);
  const [sellerForm, setSellerForm] = useState({
    business_name: "",
    contact_name: "",
    phone: "",
    email: "",
    commission_percent: 15,
  });

  const [payoutSellerId, setPayoutSellerId] = useState("1");
  const [payoutStart, setPayoutStart] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [payoutEnd, setPayoutEnd] = useState(new Date().toISOString().slice(0, 10));

  const { data: sellers = [] } = useQuery({
    queryKey: ["sellers"],
    queryFn: () => adminApi.listSellers(),
  });

  const { data: draftProducts } = useQuery({
    queryKey: ["seller-draft-products"],
    queryFn: () => adminApi.listProducts({ status: "draft", limit: 50 }),
    enabled: tab === "products",
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["seller-payouts"],
    queryFn: () => adminApi.listSellerPayouts(),
    enabled: tab === "payouts",
  });

  const { data: inquiries = [] } = useQuery({
    queryKey: ["marketplace-inquiries"],
    queryFn: () => adminApi.listInquiries(),
    enabled: tab === "requests" || tab === "franchise" || tab === "vendor_requests",
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["decorator-teams"],
    queryFn: () => adminApi.listDecoratorTeams(),
    enabled: tab === "vendors",
  });

  const { data: cities = [] } = useQuery({
    queryKey: ["cities-lite"],
    queryFn: () => adminApi.listCities(),
    enabled: tab === "vendors",
  });

  const saveVendorMut = useMutation({
    mutationFn: () =>
      adminApi.saveDecoratorTeam({
        city_id: Number(vendorCityId) || 1,
        name: vendorName,
        phone: vendorPhone,
        daily_capacity: Number(vendorCap) || 6,
        is_active: true,
      }),
    onSuccess: () => {
      showToast("Vendor / Decorator team added", "success");
      setVendorName("");
      setVendorPhone("");
      qc.invalidateQueries({ queryKey: ["decorator-teams"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const saveSellerMut = useMutation({
    mutationFn: () =>
      adminApi.saveSeller({
        ...sellerForm,
        kyc_status: "verified",
        is_active: true,
      }),
    onSuccess: () => {
      showToast("Seller saved", "success");
      setNewSellerOpen(false);
      qc.invalidateQueries({ queryKey: ["sellers"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const kycMut = useMutation({
    mutationFn: ({ id, status, comm }: { id: number; status: string; comm: number }) =>
      adminApi.updateSellerKYC(id, status, comm),
    onSuccess: () => {
      showToast("Seller KYC updated", "success");
      qc.invalidateQueries({ queryKey: ["sellers"] });
      qc.invalidateQueries({ queryKey: ["cms-sidebar-counts"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const approveProdMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminApi.approveSellerProduct(id, status),
    onSuccess: () => {
      showToast("Product approval updated", "success");
      qc.invalidateQueries({ queryKey: ["seller-draft-products"] });
      qc.invalidateQueries({ queryKey: ["cms-sidebar-counts"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const createPayoutMut = useMutation({
    mutationFn: () =>
      adminApi.createSellerPayout({
        seller_id: Number(payoutSellerId),
        period_start: payoutStart,
        period_end: payoutEnd,
      }),
    onSuccess: () => {
      showToast("Payout statement generated", "success");
      qc.invalidateQueries({ queryKey: ["seller-payouts"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const markPaidMut = useMutation({
    mutationFn: ({ id, utr }: { id: number; utr: string }) =>
      adminApi.markPayoutPaid(id, utr),
    onSuccess: () => {
      showToast("Payout marked as paid", "success");
      qc.invalidateQueries({ queryKey: ["seller-payouts"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const shownSellers =
    tab === "requests" ? sellers.filter((s) => s.kyc_status === "pending") : sellers;

  const isSellerRoute = tab === "sellers" || tab === "requests" || tab === "products" || tab === "payouts";

  const renderInquiriesTable = (rows: typeof inquiries, heading?: string) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-xs">
      {heading && (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200">
          {heading}
        </div>
      )}
      <table className="w-full text-left">
        <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
          <tr>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Applicant</th>
            <th className="px-4 py-3">City / Contact</th>
            <th className="px-4 py-3">Message</th>
            <th className="px-4 py-3 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                No requests in this queue yet.
              </td>
            </tr>
          ) : (
            rows.map((iq) => (
              <tr key={iq.id}>
                <td className="px-4 py-3 font-semibold capitalize">
                  <Building2 size={12} className="inline mr-1" />
                  {(iq.inquiry_type || "").replaceAll("_", " ")}
                </td>
                <td className="px-4 py-3 font-semibold">{iq.name}</td>
                <td className="px-4 py-3">{iq.city} · {iq.phone}</td>
                <td className="px-4 py-3 max-w-xs truncate">{iq.message}</td>
                <td className="px-4 py-3 text-right">
                  <select
                    value={iq.status}
                    onChange={(e) =>
                      adminApi.updateInquiryStatus(iq.id!, e.target.value).then(() => {
                        showToast("Status updated", "success");
                        qc.invalidateQueries({ queryKey: ["marketplace-inquiries"] });
                      })
                    }
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const content = (
    <div className="space-y-4 animate-bd-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold flex items-center gap-2">
            {tab === "vendors" ? (
              <Briefcase size={20} className="text-[#4f6ef7]" />
            ) : tab === "franchise" ? (
              <Building2 size={20} className="text-[#4f6ef7]" />
            ) : (
              <Store size={20} className="text-[#4f6ef7]" />
            )}
            {tab === "franchise"
              ? "Franchise Requests"
              : tab === "vendor_requests"
              ? "Vendor & Decorator Requests"
              : tab === "vendors"
              ? "Vendors & Decorator Teams"
              : tab === "requests"
              ? "Seller KYC Requests"
              : tab === "products"
              ? "Seller Products Approval Queue"
              : tab === "payouts"
              ? "Seller Payouts & Settlements"
              : "Marketplace Sellers"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            KYC verification, commission rates, product approvals, local vendor/decorator teams & franchise requests.
          </p>
        </div>
        {isSellerRoute && (
          <PermissionGuard module="seller" requireWrite fallback={null}>
            <button
              type="button"
              onClick={() => setNewSellerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white text-xs font-semibold cursor-pointer self-start"
            >
              <Plus size={14} /> Add Seller
            </button>
          </PermissionGuard>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
        {(
          [
            ["sellers", "Sellers"],
            ["requests", "Seller Requests"],
            ["products", "Seller Products"],
            ["payouts", "Seller Payouts"],
            ["franchise", "Franchise Requests"],
            ["vendors", "Vendors / Teams"],
            ["vendor_requests", "Vendor Requests"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
              tab === id ? "bg-[#4f6ef7] text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

        {(tab === "sellers" || tab === "requests") && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Business / Contact</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Commission %</th>
                  <th className="px-4 py-3">KYC Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {shownSellers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No sellers in this view.
                    </td>
                  </tr>
                ) : (
                  shownSellers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{s.business_name}</p>
                      <p className="text-[11px] text-slate-400">
                        {s.contact_name} · {s.phone}
                      </p>
                    </td>
                    <td className="px-4 py-3">{s.city_name || "Pan-India"}</td>
                    <td className="px-4 py-3 font-semibold">{s.commission_percent}%</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                          s.kyc_status === "verified"
                            ? "bg-emerald-50 text-emerald-700"
                            : s.kyc_status === "rejected"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {s.kyc_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PermissionGuard module="seller" requireWrite fallback={null}>
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              kycMut.mutate({
                                id: s.id!,
                                status: "verified",
                                comm: s.commission_percent || 15,
                              })
                            }
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded cursor-pointer"
                            title="Verify KYC"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              kycMut.mutate({
                                id: s.id!,
                                status: "rejected",
                                comm: s.commission_percent || 15,
                              })
                            }
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                            title="Reject KYC"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      </PermissionGuard>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "requests" &&
          renderInquiriesTable(
            inquiries.filter((iq) => iq.inquiry_type === "seller_request"),
            "Seller Registration Applications"
          )}

        {tab === "products" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Draft Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Selling Price</th>
                  <th className="px-4 py-3 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(draftProducts?.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No pending seller product submissions.
                    </td>
                  </tr>
                ) : (
                  (draftProducts?.items || []).map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="px-4 py-3">{p.sku}</td>
                    <td className="px-4 py-3">{rs(p.selling_price_paise)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => approveProdMut.mutate({ id: p.id!, status: "published" })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold mr-1.5 cursor-pointer"
                      >
                        Approve & Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => approveProdMut.mutate({ id: p.id!, status: "archived" })}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                      >
                        Archive
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "payouts" && (
          <div className="space-y-4 text-xs">
            <PermissionGuard module="seller" requireWrite fallback={null}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createPayoutMut.mutate();
                }}
                className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
              >
                <div>
                  <label className="block font-semibold mb-1">Seller</label>
                  <select
                    value={payoutSellerId}
                    onChange={(e) => setPayoutSellerId(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200"
                  >
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.business_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">From</label>
                  <input type="date" value={payoutStart} onChange={(e) => setPayoutStart(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">To</label>
                  <input type="date" value={payoutEnd} onChange={(e) => setPayoutEnd(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200" />
                </div>
                <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                  <Wallet size={13} /> Generate Payout
                </button>
              </form>
            </PermissionGuard>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Gross</th>
                    <th className="px-4 py-3">Commission</th>
                    <th className="px-4 py-3">Net Payout</th>
                    <th className="px-4 py-3">Status / UTR</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No seller payouts generated yet.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((po) => (
                      <tr key={po.id}>
                        <td className="px-4 py-3 font-semibold">{po.seller_name}</td>
                        <td className="px-4 py-3">{po.period_start} — {po.period_end}</td>
                        <td className="px-4 py-3">{rs(po.gross_paise)}</td>
                        <td className="px-4 py-3">{rs(po.commission_paise)}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{rs(po.net_payout_paise)}</td>
                        <td className="px-4 py-3 capitalize">{po.status} {po.utr_number ? `· ${po.utr_number}` : ""}</td>
                        <td className="px-4 py-3 text-right">
                          {po.status !== "paid" && (
                            <button
                              type="button"
                              onClick={() =>
                                markPaidMut.mutate({ id: po.id!, utr: `UTR${Date.now()}` })
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "vendors" && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveVendorMut.mutate();
              }}
              className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <label className="block font-semibold mb-1">City</label>
                <select value={vendorCityId} onChange={(e) => setVendorCityId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Vendor / Team Name *</label>
                <input required value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Bloom Craft Decorators" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-52" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Phone *</label>
                <input required value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} placeholder="+91 9876543210" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-40" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Daily Slots Cap</label>
                <input type="number" value={vendorCap} onChange={(e) => setVendorCap(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-24" />
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                Add Vendor Team
              </button>
            </form>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Vendor / Decorator Crew</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Daily Capacity</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No vendor teams added yet.
                      </td>
                    </tr>
                  ) : (
                    vendors.map((v) => (
                      <tr key={v.id}>
                        <td className="px-4 py-3 font-semibold">{v.name}</td>
                        <td className="px-4 py-3">{v.city_name}</td>
                        <td className="px-4 py-3">{v.phone}</td>
                        <td className="px-4 py-3">{v.daily_capacity} jobs/day</td>
                        <td className="px-4 py-3">{v.is_active ? "Active" : "Paused"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(tab === "franchise" || tab === "vendor_requests") &&
          renderInquiriesTable(
            inquiries.filter((iq) =>
              tab === "franchise"
                ? iq.inquiry_type === "franchise"
                : iq.inquiry_type === "vendor_request" || iq.inquiry_type === "seller_request"
            )
          )}

        <FormModal open={newSellerOpen} title="Add Marketplace Seller" onClose={() => setNewSellerOpen(false)} maxWidthClass="max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSellerMut.mutate();
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-semibold mb-1">Business Name *</label>
              <input required value={sellerForm.business_name} onChange={(e) => setSellerForm((s) => ({ ...s, business_name: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Contact Name *</label>
                <input required value={sellerForm.contact_name} onChange={(e) => setSellerForm((s) => ({ ...s, contact_name: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Phone *</label>
                <input required value={sellerForm.phone} onChange={(e) => setSellerForm((s) => ({ ...s, phone: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Email *</label>
                <input type="email" required value={sellerForm.email} onChange={(e) => setSellerForm((s) => ({ ...s, email: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Commission %</label>
                <input type="number" value={sellerForm.commission_percent} onChange={(e) => setSellerForm((s) => ({ ...s, commission_percent: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={() => setNewSellerOpen(false)} className="px-4 py-2 rounded-xl border cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">Save Seller</button>
            </div>
          </form>
        </FormModal>
      </div>
  );

  return isSellerRoute ? <PermissionGuard module="seller">{content}</PermissionGuard> : content;
}

