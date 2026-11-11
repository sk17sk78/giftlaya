import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TicketPercent, Plus, Trash2, Search } from "lucide-react";
import { adminApi, type Coupon } from "@/api/client";
import { FormModal } from "@/components/ui/FormModal";
import { PermissionGuard } from "@/components/ui/PermissionGuard";
import { useToast } from "@/components/ui/Toast";

export function CouponsPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    id: 0,
    code: "",
    description: "",
    discount_type: "percent" as "flat" | "percent",
    discount_value: 10,
    min_cart_rs: 499,
    max_discount_rs: 500,
    total_usage_limit: "",
    per_user_limit: 1,
    valid_from: new Date().toISOString().slice(0, 10),
    valid_until: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    is_active: true,
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons", search],
    queryFn: () => adminApi.listCoupons(search || undefined),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      const payload: Partial<Coupon> = {
        id: form.id || undefined,
        code: form.code.toUpperCase(),
        description: form.description,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_cart_paise: Math.round(Number(form.min_cart_rs) * 100),
        max_discount_paise: form.max_discount_rs
          ? Math.round(Number(form.max_discount_rs) * 100)
          : undefined,
        total_usage_limit: form.total_usage_limit
          ? Number(form.total_usage_limit)
          : undefined,
        per_user_limit: Number(form.per_user_limit) || 1,
        valid_from: new Date(`${form.valid_from}T00:00:00Z`).toISOString(),
        valid_until: new Date(`${form.valid_until}T23:59:59Z`).toISOString(),
        is_active: form.is_active,
      };
      return adminApi.saveCoupon(payload);
    },
    onSuccess: () => {
      showToast("Coupon saved", "success");
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteCoupon(id),
    onSuccess: () => {
      showToast("Coupon deleted", "success");
      qc.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  return (
    <PermissionGuard module="product">
      <div className="space-y-4 animate-bd-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold flex items-center gap-2">
              <TicketPercent size={20} className="text-[#4f6ef7]" />
              Coupons & Promo Codes
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure flat/percent discounts, minimum cart value, usage limits & validity dates.
            </p>
          </div>
          <PermissionGuard module="product" requireWrite fallback={null}>
            <button
              type="button"
              onClick={() => {
                setForm({
                  id: 0,
                  code: "",
                  description: "",
                  discount_type: "percent",
                  discount_value: 10,
                  min_cart_rs: 499,
                  max_discount_rs: 500,
                  total_usage_limit: "",
                  per_user_limit: 1,
                  valid_from: new Date().toISOString().slice(0, 10),
                  valid_until: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
                  is_active: true,
                });
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white text-xs font-semibold cursor-pointer self-start"
            >
              <Plus size={14} /> New Coupon
            </button>
          </PermissionGuard>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="relative w-60 text-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search promo code..."
              className="pl-8 pr-3 py-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Min Cart</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No coupons created yet.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {c.code}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{c.description}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {c.discount_type === "flat"
                        ? `₹${c.discount_value} OFF`
                        : `${c.discount_value}% OFF`}
                    </td>
                    <td className="px-4 py-3">₹{((c.min_cart_paise ?? 0) / 100).toFixed(0)}</td>
                    <td className="px-4 py-3">
                      {c.used_count ?? 0} / {c.total_usage_limit || "∞"}
                    </td>
                    <td className="px-4 py-3 text-[11px]">
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {c.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteMut.mutate(c.id!)}
                        className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <FormModal
          open={modalOpen}
          title="Create Coupon Code"
          onClose={() => setModalOpen(false)}
          maxWidthClass="max-w-lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate();
            }}
            className="space-y-3 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Code *</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
                  placeholder="GIFT15"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Discount Type</label>
                <select
                  value={form.discount_type}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, discount_type: e.target.value as "flat" | "percent" }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat Amount (INR)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Value *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.discount_value}
                  onChange={(e) => setForm((s) => ({ ...s, discount_value: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Min Cart (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={form.min_cart_rs}
                  onChange={(e) => setForm((s) => ({ ...s, min_cart_rs: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Valid From</label>
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm((s) => ({ ...s, valid_from: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Valid Until</label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm((s) => ({ ...s, valid_until: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
                Save Coupon
              </button>
            </div>
          </form>
        </FormModal>
      </div>
    </PermissionGuard>
  );
}

