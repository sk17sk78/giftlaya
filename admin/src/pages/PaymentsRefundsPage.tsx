import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, RotateCcw, BarChart3 } from "lucide-react";
import { adminApi } from "@/api/client";
import { PermissionGuard } from "@/components/ui/PermissionGuard";
import { useToast } from "@/components/ui/Toast";

function rs(paise?: number) {
  return `₹${((paise ?? 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export function PaymentsRefundsPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState<"transactions" | "refunds" | "settlement">("transactions");
  const [refundOrderId, setRefundOrderId] = useState("");
  const [refundAmountRs, setRefundAmountRs] = useState("");
  const [refundReason, setRefundReason] = useState("Customer cancelled > 24h before event");

  const { data: payments } = useQuery({
    queryKey: ["payments"],
    queryFn: () => adminApi.listPayments(undefined, 1),
    enabled: tab === "transactions",
  });

  const { data: refunds } = useQuery({
    queryKey: ["refunds"],
    queryFn: () => adminApi.listRefunds(1),
    enabled: tab === "refunds",
  });

  const { data: settlement } = useQuery({
    queryKey: ["settlement"],
    queryFn: () => adminApi.getSettlementReport(),
    enabled: tab === "settlement",
  });

  const refundMut = useMutation({
    mutationFn: () =>
      adminApi.createRefund({
        order_id: Number(refundOrderId),
        amount_paise: refundAmountRs ? Math.round(Number(refundAmountRs) * 100) : undefined,
        reason: refundReason,
      }),
    onSuccess: (rf) => {
      showToast(`Refund ${rf.gateway_refund_id} processed`, "success");
      setRefundOrderId("");
      setRefundAmountRs("");
      qc.invalidateQueries({ queryKey: ["refunds"] });
      qc.invalidateQueries({ queryKey: ["settlement"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  return (
    <PermissionGuard module="order">
      <div className="space-y-4 animate-bd-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold flex items-center gap-2">
              <CreditCard size={20} className="text-[#4f6ef7]" />
              Payments, Refunds & GST Settlement
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gateway transactions, idempotent refunds, and net settlement reconciliation.
            </p>
          </div>
          <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 text-xs self-start">
            <button type="button" onClick={() => setTab("transactions")} className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${tab === "transactions" ? "bg-white shadow-sm" : ""}`}>
              Transactions
            </button>
            <button type="button" onClick={() => setTab("refunds")} className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${tab === "refunds" ? "bg-white shadow-sm" : ""}`}>
              Refunds
            </button>
            <button type="button" onClick={() => setTab("settlement")} className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${tab === "settlement" ? "bg-white shadow-sm" : ""}`}>
              Settlement Report
            </button>
          </div>
        </div>

        {tab === "transactions" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Gateway Event</th>
                  <th className="px-4 py-3">Payment ID</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(payments?.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No payment transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  (payments?.items || []).map((pt) => (
                    <tr key={pt.id}>
                      <td className="px-4 py-3 font-bold">{pt.order_number}</td>
                      <td className="px-4 py-3 font-mono text-[11px]">{pt.gateway_event_id}</td>
                      <td className="px-4 py-3 font-mono text-[11px]">{pt.gateway_payment_id}</td>
                      <td className="px-4 py-3 font-semibold">{rs(pt.amount_paise)}</td>
                      <td className="px-4 py-3 capitalize">{pt.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "refunds" && (
          <div className="space-y-4 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                refundMut.mutate();
              }}
              className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800"
            >
              <div>
                <label className="block font-semibold mb-1">Order ID *</label>
                <input required type="number" value={refundOrderId} onChange={(e) => setRefundOrderId(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 w-32" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Amount INR (blank = full minus fee)</label>
                <input type="number" value={refundAmountRs} onChange={(e) => setRefundAmountRs(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 w-44" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block font-semibold mb-1">Reason *</label>
                <input required value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
              </div>
              <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold cursor-pointer">
                <RotateCcw size={13} /> Issue Refund
              </button>
            </form>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Refund Amount</th>
                    <th className="px-4 py-3">Cancellation Fee Kept</th>
                    <th className="px-4 py-3">Gateway ID</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(refunds?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No refunds issued yet.
                      </td>
                    </tr>
                  ) : (
                    (refunds?.items || []).map((rf) => (
                      <tr key={rf.id}>
                        <td className="px-4 py-3 font-bold">{rf.order_number}</td>
                        <td className="px-4 py-3 font-semibold">{rs(rf.amount_paise)}</td>
                        <td className="px-4 py-3">{rs(rf.cancellation_fee_paise)}</td>
                        <td className="px-4 py-3 font-mono text-[11px]">{rf.gateway_refund_id}</td>
                        <td className="px-4 py-3 capitalize">{rf.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "settlement" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <p className="text-slate-500 flex items-center gap-1.5"><BarChart3 size={13} /> Gross Captured</p>
              <p className="font-heading text-xl font-bold mt-1">{rs(settlement?.gross_captured_paise)}</p>
              <p className="text-[11px] text-slate-400 mt-1">{settlement?.captured_count ?? 0} orders</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <p className="text-slate-500">Refunds Issued</p>
              <p className="font-heading text-xl font-bold mt-1 text-rose-600">{rs(settlement?.total_refunded_paise)}</p>
              <p className="text-[11px] text-slate-400 mt-1">{settlement?.refund_count ?? 0} refunds</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <p className="text-slate-500">Total GST Collected</p>
              <p className="font-heading text-xl font-bold mt-1">{rs(settlement?.total_gst_paise)}</p>
              <p className="text-[11px] text-slate-400 mt-1">Included in gross</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <p className="text-slate-500">Net Settlement</p>
              <p className="font-heading text-xl font-bold mt-1 text-emerald-600">{rs(settlement?.net_settlement_paise)}</p>
              <p className="text-[11px] text-slate-400 mt-1">After refunds</p>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

