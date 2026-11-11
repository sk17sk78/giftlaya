import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Coins, Ban, CheckCircle, Eye } from "lucide-react";
import { adminApi, type Customer } from "@/api/client";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { FormModal } from "@/components/ui/FormModal";
import { PermissionGuard } from "@/components/ui/PermissionGuard";
import { useToast } from "@/components/ui/Toast";

export function CustomersPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [coinDelta, setCoinDelta] = useState("100");
  const [coinNote, setCoinNote] = useState("Loyalty goodwill credit");

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, page],
    queryFn: () => adminApi.listCustomers(search || undefined, page, 25),
  });

  const { data: detail } = useQuery({
    queryKey: ["customer-detail", selectedId],
    queryFn: () => adminApi.getCustomer(selectedId!),
    enabled: selectedId !== null,
  });

  const blockMut = useMutation({
    mutationFn: ({ id, blocked }: { id: number; blocked: boolean }) =>
      adminApi.blockCustomer(id, blocked),
    onSuccess: () => {
      showToast("Customer status updated", "success");
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer-detail", selectedId] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const coinsMut = useMutation({
    mutationFn: () =>
      adminApi.adjustCustomerCoins(selectedId!, Number(coinDelta), coinNote),
    onSuccess: (res) => {
      showToast(`Updated coin balance: ${res.balance_coins}`, "success");
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer-detail", selectedId] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const columns: ColumnDef<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      render: (c) => (
        <div>
          <p className="font-semibold">{c.name || "Guest Customer"}</p>
          <p className="text-[11px] text-slate-400">
            {c.phone || "—"} {c.email ? `· ${c.email}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "orders",
      header: "Orders / LTV",
      render: (c) => (
        <div>
          <p className="font-semibold">{c.orders_count ?? 0} orders</p>
          <p className="text-[11px] text-slate-400">
            ₹{((c.total_spent_paise ?? 0) / 100).toFixed(0)} spent
          </p>
        </div>
      ),
    },
    {
      key: "coins",
      header: "Giftlaya Coins",
      render: (c) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold">
          <Coins size={11} /> {c.coins_balance ?? 0}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            c.is_blocked ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {c.is_blocked ? "Blocked" : "Active"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (c) => (
        <button
          type="button"
          onClick={() => setSelectedId(c.id!)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
        >
          <Eye size={12} /> Profile & Wallet
        </button>
      ),
    },
  ];

  return (
    <PermissionGuard module="user">
      <div className="space-y-4 animate-bd-fade-up">
        <div>
          <h1 className="font-heading text-xl font-bold flex items-center gap-2">
            <Users size={20} className="text-[#4f6ef7]" />
            Customers & Coins Wallet
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search customers, view saved addresses, toggle block state, and adjust reward coin balances with audit logs.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, phone or email..."
              className="pl-8 pr-3 py-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={data?.items || []}
          rowKey={(c) => c.id!}
          loading={isLoading}
          page={data?.meta?.page || page}
          totalPages={data?.meta?.total_pages || 1}
          total={data?.meta?.total || 0}
          onPageChange={setPage}
        />

        <FormModal
          open={selectedId !== null && Boolean(detail)}
          title={detail?.name || "Customer Profile"}
          subtitle={`${detail?.phone || ""} · ${detail?.email || ""}`}
          onClose={() => setSelectedId(null)}
          maxWidthClass="max-w-2xl"
        >
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="text-slate-500">Current Coins Balance</p>
                  <p className="font-heading text-xl font-bold text-amber-600">
                    {detail.coins_balance} Coins
                  </p>
                </div>
                <PermissionGuard module="user" requireWrite fallback={null}>
                  <button
                    type="button"
                    onClick={() =>
                      blockMut.mutate({ id: detail.id!, blocked: !detail.is_blocked })
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold cursor-pointer ${
                      detail.is_blocked
                        ? "bg-emerald-600 text-white"
                        : "bg-rose-600 text-white"
                    }`}
                  >
                    {detail.is_blocked ? <CheckCircle size={13} /> : <Ban size={13} />}
                    {detail.is_blocked ? "Unblock Customer" : "Block Customer"}
                  </button>
                </PermissionGuard>
              </div>

              <PermissionGuard module="user" requireWrite fallback={null}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    coinsMut.mutate();
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-2"
                >
                  <div>
                    <label className="block font-semibold mb-1">Adjust Delta (+/-)</label>
                    <input
                      type="number"
                      required
                      value={coinDelta}
                      onChange={(e) => setCoinDelta(e.target.value)}
                      className="w-28 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="block font-semibold mb-1">Audit Reason</label>
                    <input
                      required
                      value={coinNote}
                      onChange={(e) => setCoinNote(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer"
                  >
                    Update Wallet
                  </button>
                </form>
              </PermissionGuard>

              <div>
                <p className="font-bold mb-1.5">Saved Addresses ({detail.addresses?.length || 0})</p>
                <div className="space-y-1.5">
                  {(detail.addresses || []).map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800"
                    >
                      <span className="font-semibold">{a.label}</span> — {a.recipient_name},{" "}
                      {a.address_line1}, {a.city_name} {a.pincode}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-bold mb-1.5">Coins Ledger</p>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
                  {(detail.coin_history || []).map((tx) => (
                    <div key={tx.id} className="px-3 py-2 flex justify-between">
                      <span>
                        <strong className="uppercase">{tx.tx_type}</strong> · {tx.note}
                      </span>
                      <span
                        className={`font-bold ${
                          (tx.delta ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {(tx.delta ?? 0) >= 0 ? `+${tx.delta}` : tx.delta}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </FormModal>
      </div>
    </PermissionGuard>
  );
}

